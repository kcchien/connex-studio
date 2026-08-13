/**
 * macOS deep verification driver (wayfinder ticket #11).
 * Drives the real app through window.electronAPI against local simulators.
 *
 * Prereqs (all local):
 *   node scripts/sim/modbus-sim.mjs 5020
 *   /opt/homebrew/opt/mosquitto/sbin/mosquitto -p 1883
 *   node scripts/sim/opcua-sim.mjs 4840
 *
 * Run: pnpm exec playwright test --config scripts/verify/playwright.verify.config.ts
 */
import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let app: ElectronApplication
let page: Page

test.describe.configure({ mode: 'serial', timeout: 120000 })

async function api<T>(script: string): Promise<T> {
  return page.evaluate(`(async () => { const api = window.electronAPI; return ${script} })()`) as Promise<T>
}

test.beforeAll(async () => {
  const electronPath = path.join(__dirname, '../../node_modules/.bin/electron')
  const appPath = path.join(__dirname, '../..')
  app = await electron.launch({
    executablePath: electronPath,
    args: [appPath],
    env: { ...process.env, NODE_ENV: 'development' }
  })
  // 開發模式會另開 DevTools 視窗，明確挑應用本體（index.html）
  page = await app.firstWindow()
  const deadline = Date.now() + 30000
  while (!page.url().includes('index.html') && Date.now() < deadline) {
    const appWindow = app.windows().find((w) => w.url().includes('index.html'))
    if (appWindow) { page = appWindow; break }
    await new Promise((r) => setTimeout(r, 500))
  }
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => (window as never as { electronAPI?: unknown }).electronAPI !== undefined, undefined, { timeout: 30000 })
  await page.waitForTimeout(2000)
  // 清掉前次執行殘留（含 session 自動還原）的連線，確保驗證從乾淨狀態開始
  await page.evaluate(async () => {
    const api = (window as never as { electronAPI: any }).electronAPI
    const { connections } = await api.connection.list()
    for (const c of connections) {
      await api.connection.delete(c.id)
    }
  })
})

test.afterAll(async () => {
  await app?.close()
})

let modbusConnId: string
let mqttConnId: string
let opcuaConnId: string
let counterTagId: string

test('Modbus TCP：建立連線並成功連上模擬器', async () => {
  const created = await api<{ success: boolean; connection: { id: string } }>(
    `api.connection.create({ name: 'Verify Modbus', protocol: 'modbus-tcp', config: { host: '127.0.0.1', port: 5020, unitId: 1, timeout: 3000 } })`
  )
  expect(created.success).toBe(true)
  modbusConnId = created.connection.id

  const conn = await api<{ success: boolean }>(`api.connection.connect('${modbusConnId}')`)
  expect(conn.success).toBe(true)

  const list = await api<{ connections: Array<{ id: string; status: string }> }>(`api.connection.list()`)
  expect(list.connections.find((c) => c.id === modbusConnId)?.status).toBe('connected')
})

test('Modbus：單次讀取 holding registers（常數 1234）', async () => {
  const read = await api<{ success: boolean; value: number }>(
    `api.connection.readOnce({ connectionId: '${modbusConnId}', address: { type: 'modbus', registerType: 'holding', address: 4, length: 1 }, dataType: 'uint16' })`
  )
  expect(read.success).toBe(true)
  expect(read.value).toBe(1234)
})

test('Modbus：寫入 holding register 後讀回', async () => {
  const write = await api<{ success: boolean }>(
    `api.modbus.write({ connectionId: '${modbusConnId}', address: { type: 'modbus', registerType: 'holding', address: 10, length: 1 }, dataType: 'uint16', value: 4321 })`
  )
  expect(write.success).toBe(true)
  const read = await api<{ success: boolean; value: number }>(
    `api.connection.readOnce({ connectionId: '${modbusConnId}', address: { type: 'modbus', registerType: 'holding', address: 10, length: 1 }, dataType: 'uint16' })`
  )
  expect(read.value).toBe(4321)
})

test('Modbus：標籤輪詢收到變動值', async () => {
  const tag = await api<{ success: boolean; tag: { id: string } }>(
    `api.tag.create({ connectionId: '${modbusConnId}', name: 'counter', address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 }, dataType: 'uint16' })`
  )
  expect(tag.success).toBe(true)
  counterTagId = tag.tag.id

  const values = await page.evaluate(
    ([connId, tagId]) =>
      new Promise<number[]>((resolve) => {
        const api = (window as never as { electronAPI: any }).electronAPI
        const seen: number[] = []
        const off = api.polling.onData((payload: { values: Array<{ tagId: string; value: number }> }) => {
          for (const v of payload.values) {
            if (v.tagId === tagId) seen.push(v.value)
          }
        })
        api.polling.start({ connectionId: connId, tagIds: [tagId], intervalMs: 500 })
        // 固定收 6 秒（計數器每秒 +1，期間必有變化）
        setTimeout(() => { off(); resolve(seen) }, 6000)
      }),
    [modbusConnId, counterTagId]
  )
  expect(values.length).toBeGreaterThanOrEqual(5)
  // 計數器遞增，值必須有變化
  expect(new Set(values).size).toBeGreaterThan(1)
})

test('DVR：輪詢資料進入環形緩衝，可查詢範圍與 sparkline', async () => {
  await page.waitForTimeout(2000)
  const range = await api<{ startTimestamp: number; endTimestamp: number }>(`api.dvr.getRange()`)
  expect(range.endTimestamp).toBeGreaterThan(0)
  const spark = await api<{ timestamps: number[]; values: number[] }>(
    `api.dvr.getSparkline({ tagId: '${counterTagId}', startTimestamp: ${Date.now() - 60000}, endTimestamp: ${Date.now() + 1000}, maxPoints: 100 })`
  )
  expect(spark.values.length).toBeGreaterThan(0)
  await api(`api.polling.stop('${modbusConnId}')`)
})

test('MQTT：連上本機 mosquitto 並收到發布的訊息', async () => {
  const created = await api<{ success: boolean; connection: { id: string } }>(
    `api.connection.create({ name: 'Verify MQTT', protocol: 'mqtt', config: { brokerUrl: 'mqtt://127.0.0.1:1884', clientId: 'connex-verify', useTls: false } })`
  )
  expect(created.success).toBe(true)
  mqttConnId = created.connection.id
  const conn = await api<{ success: boolean }>(`api.connection.connect('${mqttConnId}')`)
  expect(conn.success).toBe(true)

  const tag = await api<{ success: boolean; tag: { id: string } }>(
    `api.tag.create({ connectionId: '${mqttConnId}', name: 'verify-topic', address: { type: 'mqtt', topic: 'connex/verify' }, dataType: 'float64' })`
  )
  expect(tag.success).toBe(true)
  const mqttTagId = tag.tag.id

  const received = page.evaluate(
    ([connId, tagId]) =>
      new Promise<number | null>((resolve) => {
        const api = (window as never as { electronAPI: any }).electronAPI
        const off = api.polling.onData((payload: { values: Array<{ tagId: string; value: number; quality: string }> }) => {
          const hit = payload.values.find((v) => v.tagId === tagId && v.quality === 'good')
          if (hit) {
            off()
            resolve(hit.value)
          }
        })
        api.polling.start({ connectionId: connId, tagIds: [tagId], intervalMs: 500 })
        setTimeout(() => { off(); resolve(null) }, 15000)
      }),
    [mqttConnId, mqttTagId]
  )
  await page.waitForTimeout(1500)
  execSync('/opt/homebrew/bin/mosquitto_pub -h 127.0.0.1 -p 1884 -t connex/verify -m 42.5')
  const value = await received
  expect(value).toBe(42.5)
  await api(`api.polling.stop('${mqttConnId}')`)
})

test('OPC UA：連上模擬器並讀取 Temperature 節點', async () => {
  const created = await api<{ success: boolean; connection: { id: string } }>(
    `api.connection.create({ name: 'Verify OPCUA', protocol: 'opcua', config: { endpointUrl: 'opc.tcp://127.0.0.1:4842/UA/ConnexSim', securityMode: 'None', securityPolicy: 'None' } })`
  )
  expect(created.success).toBe(true)
  opcuaConnId = created.connection.id
  const conn = await api<{ success: boolean; error?: string }>(`api.connection.connect('${opcuaConnId}')`)
  if (!conn.success) console.log('OPCUA connect error:', conn.error)
  expect(conn.success).toBe(true)

  const read = await api<{ success: boolean; value: number }>(
    `api.connection.readOnce({ connectionId: '${opcuaConnId}', address: { type: 'opcua', nodeId: 'ns=1;s=Temperature' }, dataType: 'float64' })`
  )
  expect(read.success).toBe(true)
  expect(read.value).toBeGreaterThan(15)
  expect(read.value).toBeLessThan(35)
})

test('Profile：儲存後載入還原連線與標籤', async () => {
  const save = await api<{ success: boolean }>(
    `api.profile.save({ name: 'verify-profile', connectionIds: ['${modbusConnId}', '${mqttConnId}'] })`
  )
  expect(save.success).toBe(true)
  const load = await api<{ success: boolean; connections: unknown[]; tags: unknown[] }>(
    `api.profile.load('verify-profile')`
  )
  expect(load.success).toBe(true)
  expect(load.connections.length).toBe(2)
  expect(load.tags.length).toBeGreaterThanOrEqual(2)
  await api(`api.profile.delete('verify-profile')`)
})

test('清理：斷線並截圖存證', async () => {
  await api(`api.connection.disconnect('${opcuaConnId}')`)
  await api(`api.connection.disconnect('${mqttConnId}')`)
  await api(`api.connection.disconnect('${modbusConnId}')`)
  await page.screenshot({ path: 'scripts/verify/deep-verify-final.png' })
})
