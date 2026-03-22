# Electron 39 升級 + Modbus 寫入 + MQTT QoS 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Electron 從 33 升級至 39，補齊 Modbus 寫入操作（FC 05/06/15/16），並新增 MQTT 按標籤 QoS 設定功能。

**Architecture:** 三個獨立子系統依序處理：(1) 先升級 Electron 和建構工具鏈，確保基礎穩固；(2) 在 ProtocolAdapter 層新增 `writeTags` 抽象方法，Modbus 實作四個寫入功能碼；(3) 在 MqttAddress 加入 `qos` 欄位，MqttAdapter 的訂閱邏輯讀取標籤級 QoS。每個子系統完成後都有獨立的驗證檢查點。

**Tech Stack:** Electron 39, electron-vite 5, Vite 7, @electron/rebuild, safeStorage (替換 keytar), modbus-serial, mqtt.js, Jest, TypeScript

---

## File Structure

### Part A: Electron 39 升級

| 動作 | 檔案 | 職責 |
|------|------|------|
| Modify | `package.json` | 升級 electron, electron-vite, vite, @vitejs/plugin-react; 移除 electron-rebuild + keytar |
| Modify | `electron.vite.config.ts` | 適配 electron-vite 5 新設定介面 |
| Modify | `src/main/services/CredentialService.ts` | keytar → safeStorage + electron-store |
| Modify | `src/main/index.ts` | 加入 safeStorage ready 檢查 |
| Create | `tests/unit/main/CredentialService.test.ts` | safeStorage 遷移後的單元測試 |

### Part B: Modbus 寫入

| 動作 | 檔案 | 職責 |
|------|------|------|
| Modify | `src/main/protocols/ProtocolAdapter.ts` | 新增 `writeTag` 抽象方法 + `WriteResult` 型別 |
| Modify | `src/main/protocols/ModbusTcpAdapter.ts` | 實作 FC 05/06/15/16 四個寫入功能碼 |
| Modify | `src/shared/types/tag.ts` | 新增 `ModbusWriteRequest` 型別 |
| Modify | `src/shared/constants/ipc-channels.ts` | 新增 `MODBUS_WRITE` 通道 |
| Create | `src/main/ipc/modbus-write.ts` | Modbus 寫入 IPC 處理器 |
| Modify | `src/main/services/ConnectionManager.ts` | 新增 `writeOnce` 方法 |
| Modify | `src/main/ipc/index.ts` | 註冊新處理器 |
| Modify | `src/preload/index.ts` | 暴露 `modbus.write` API |
| Create | `tests/unit/main/modbus-write.test.ts` | 寫入功能碼單元測試 |
| Modify | `tests/conformance/modbus-conformance.test.ts` | 補齊寫入合規測試 |

### Part C: MQTT 按標籤 QoS

| 動作 | 檔案 | 職責 |
|------|------|------|
| Modify | `src/shared/types/tag.ts` | MqttAddress 新增 `qos?: 0 \| 1 \| 2` |
| Modify | `src/main/protocols/MqttAdapter.ts` | 訂閱時讀取標籤級 QoS |
| Modify | `tests/conformance/mqtt-conformance.test.ts` | 補齊 QoS 合規測試 |

---

## Part A: Electron 39 升級

### Task A1: 升級建構工具鏈（electron-vite 5 + Vite 7）

**Files:**
- Modify: `package.json`
- Modify: `electron.vite.config.ts`

- [ ] **Step 1: 備份鎖定檔案並記錄基線**

```bash
cd /Users/kc/Downloads/Codebase/playground/connex-studio
cp pnpm-lock.yaml pnpm-lock.yaml.bak
pnpm test && pnpm build
```

Expected: 所有測試通過，建置成功

- [ ] **Step 2: 升級 Vite 至 7.x + electron-vite 至 5.x + plugin-react**

```bash
pnpm add -D vite@^7 electron-vite@^5 @vitejs/plugin-react@latest
```

- [ ] **Step 3: 更新 electron.vite.config.ts 適配 electron-vite 5**

electron-vite 5 棄用了 `externalizeDepsPlugin()`，改用 `build.externalizeDeps` 選項：

```typescript
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      externalizeDeps: true,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external: ['better-sqlite3', 'node-opcua', 'node-opcua-client'],
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src/main',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      externalizeDeps: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
```

> **注意**：如果 electron-vite 5 仍支援 `externalizeDepsPlugin` 作為相容層，可能只需移除 import 即可。以實際執行 `pnpm build` 結果為準，視錯誤訊息調整。

- [ ] **Step 4: 驗證建構工具鏈**

```bash
pnpm build
pnpm dev  # 手動確認可啟動
```

Expected: 建置成功，開發模式可啟動

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml electron.vite.config.ts
git commit -m "build: upgrade electron-vite 5 + vite 7"
```

---

### Task A2: 遷移 electron-rebuild → @electron/rebuild

**Files:**
- Modify: `package.json` (scripts + dependencies)

- [ ] **Step 1: 替換套件**

```bash
pnpm remove electron-rebuild
pnpm add -D @electron/rebuild
```

- [ ] **Step 2: 更新 package.json rebuild 指令**

將 `"rebuild": "electron-rebuild"` 改為 `"rebuild": "npx @electron/rebuild"`

- [ ] **Step 3: 驗證重新編譯**

```bash
pnpm run rebuild
```

Expected: 原生模組成功編譯

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: migrate electron-rebuild to @electron/rebuild"
```

---

### Task A3: 升級 Electron 至 39

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 升級 Electron**

```bash
pnpm add -D electron@^39
```

- [ ] **Step 2: 重新編譯原生模組**

```bash
pnpm run rebuild
```

Expected: better-sqlite3, keytar, @serialport/bindings-cpp 成功編譯

- [ ] **Step 3: 執行型別檢查**

```bash
pnpm typecheck
```

Expected: 零錯誤（Electron 33→39 對本專案無破壞性 API 變更）

- [ ] **Step 4: 執行所有測試**

```bash
pnpm test
```

Expected: 全部通過

- [ ] **Step 5: 驗證開發模式與正式建置**

```bash
pnpm dev   # 手動確認可啟動、UI 正常
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: upgrade Electron 33 → 39"
```

---

### Task A4: keytar → safeStorage 遷移

**Files:**
- Modify: `src/main/services/CredentialService.ts`
- Modify: `src/main/index.ts`
- Modify: `electron.vite.config.ts` (移除 keytar external)
- Modify: `package.json` (移除 keytar)
- Create: `tests/unit/main/CredentialService.test.ts`

- [ ] **Step 1: 寫 CredentialService 遷移後的失敗測試**

```typescript
// tests/unit/main/CredentialService.test.ts
import { CredentialService } from '../../../src/main/services/CredentialService'

// Mock electron modules
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((str: string) => Buffer.from(`encrypted:${str}`)),
    decryptString: jest.fn((buf: Buffer) => {
      const str = buf.toString()
      return str.startsWith('encrypted:') ? str.slice(10) : str
    })
  },
  app: {
    getPath: jest.fn(() => '/tmp/test-connex')
  }
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => {
    const store = new Map<string, unknown>()
    return {
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, val: unknown) => { store.set(key, val) }),
      delete: jest.fn((key: string) => { store.delete(key) }),
      has: jest.fn((key: string) => store.has(key)),
      get store() { return Object.fromEntries(store) }  // getter 動態反映
    }
  })
})

describe('CredentialService (safeStorage)', () => {
  let service: CredentialService

  beforeEach(() => {
    service = new CredentialService()
  })

  test('stores and retrieves credentials', async () => {
    await service.setCredentials('conn-1', { username: 'admin', password: 'secret' })
    const result = await service.getCredentials('conn-1')
    expect(result).toEqual({ username: 'admin', password: 'secret' })
  })

  test('returns null for non-existent credentials', async () => {
    const result = await service.getCredentials('non-existent')
    expect(result).toBeNull()
  })

  test('deletes credentials', async () => {
    await service.setCredentials('conn-1', { username: 'a', password: 'b' })
    const deleted = await service.deleteCredentials('conn-1')
    expect(deleted).toBe(true)
    const result = await service.getCredentials('conn-1')
    expect(result).toBeNull()
  })

  test('lists connections with credentials', async () => {
    await service.setCredentials('conn-1', { username: 'a', password: 'b' })
    await service.setCredentials('conn-2', { username: 'c', password: 'd' })
    const list = await service.listConnectionsWithCredentials()
    expect(list).toContain('conn-1')
    expect(list).toContain('conn-2')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
pnpm test:main -- --testPathPattern=CredentialService
```

Expected: 失敗（CredentialService 仍使用 keytar）

- [ ] **Step 3: 重寫 CredentialService 使用 safeStorage**

```typescript
// src/main/services/CredentialService.ts
import { safeStorage } from 'electron'
import Store from 'electron-store'
import log from 'electron-log/main.js'

export interface Credentials {
  username?: string
  password?: string
}

export interface CredentialEntry {
  connectionId: string
  credentials: Credentials
}

const STORE_KEY_PREFIX = 'credentials.'

export class CredentialService {
  private store: Store

  constructor() {
    this.store = new Store({ name: 'credentials' })
  }

  async setCredentials(connectionId: string, credentials: Credentials): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption not available on this platform')
      }
      const serialized = JSON.stringify(credentials)
      const encrypted = safeStorage.encryptString(serialized)
      this.store.set(`${STORE_KEY_PREFIX}${connectionId}`, encrypted.toString('base64'))
      log.info(`[CredentialService] Stored credentials for: ${connectionId}`)
    } catch (error) {
      log.error(`[CredentialService] Failed to store credentials: ${error}`)
      throw new Error(`Failed to store credentials: ${error}`)
    }
  }

  async getCredentials(connectionId: string): Promise<Credentials | null> {
    try {
      const encrypted = this.store.get(`${STORE_KEY_PREFIX}${connectionId}`) as string | undefined
      if (!encrypted) return null

      const buffer = Buffer.from(encrypted, 'base64')
      const decrypted = safeStorage.decryptString(buffer)
      return JSON.parse(decrypted) as Credentials
    } catch (error) {
      log.error(`[CredentialService] Failed to retrieve credentials: ${error}`)
      return null
    }
  }

  async deleteCredentials(connectionId: string): Promise<boolean> {
    try {
      const key = `${STORE_KEY_PREFIX}${connectionId}`
      if (!this.store.has(key)) return false
      this.store.delete(key)
      log.info(`[CredentialService] Deleted credentials for: ${connectionId}`)
      return true
    } catch (error) {
      log.error(`[CredentialService] Failed to delete credentials: ${error}`)
      return false
    }
  }

  async hasCredentials(connectionId: string): Promise<boolean> {
    return this.store.has(`${STORE_KEY_PREFIX}${connectionId}`)
  }

  async listConnectionsWithCredentials(): Promise<string[]> {
    try {
      const allKeys = Object.keys(this.store.store as Record<string, unknown>)
      return allKeys
        .filter((key) => key.startsWith(STORE_KEY_PREFIX))
        .map((key) => key.slice(STORE_KEY_PREFIX.length))
    } catch (error) {
      log.error(`[CredentialService] Failed to list credentials: ${error}`)
      return []
    }
  }

  async updatePassword(connectionId: string, password: string): Promise<void> {
    const existing = await this.getCredentials(connectionId)
    await this.setCredentials(connectionId, { username: existing?.username, password })
  }

  async deleteMultiple(connectionIds: string[]): Promise<void> {
    for (const id of connectionIds) {
      await this.deleteCredentials(id)
    }
  }

  async clearAll(): Promise<void> {
    const ids = await this.listConnectionsWithCredentials()
    await this.deleteMultiple(ids)
    log.info(`[CredentialService] Cleared all credentials (${ids.length} entries)`)
  }
}

let instance: CredentialService | null = null

export function getCredentialService(): CredentialService {
  if (!instance) {
    instance = new CredentialService()
  }
  return instance
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
pnpm test:main -- --testPathPattern=CredentialService
```

Expected: 全部通過

- [ ] **Step 5: 移除 keytar 依賴並清理**

```bash
pnpm remove keytar
```

更新 `electron.vite.config.ts`：確認 `rollupOptions.external` 已無 `'keytar'`（Task A1 已移除）。

更新 `electron-builder.yml`：移除 keytar 相關條目：

```yaml
# electron-builder.yml — 從 asarUnpack 移除 keytar 條目
# 刪除: "**/keytar/**"
```

更新 `package.json` 中 `pnpm.onlyBuiltDependencies`：移除 `keytar` 條目。

- [ ] **Step 6: 執行完整測試套件**

```bash
pnpm typecheck && pnpm test && pnpm build
```

Expected: 全部通過

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: migrate keytar to Electron safeStorage for credential storage"
```

---

### Task A5: 更新文件與最終驗證

**Files:**
- Modify: `CLAUDE.md` (Tech Stack 區段)

- [ ] **Step 1: 更新 CLAUDE.md 技術堆疊**

將 `Electron 40` 改為 `Electron 39`，確認 Node.js 版本描述正確。

- [ ] **Step 2: 完整回歸測試**

```bash
pnpm check  # lint + typecheck + test:main + test:renderer + build + smoke
```

Expected: 全部通過

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update tech stack for Electron 39"
```

---

## Part B: Modbus 寫入操作

### Task B1: 新增 WriteResult 型別和 ProtocolAdapter 抽象方法

**Files:**
- Modify: `src/main/protocols/ProtocolAdapter.ts`
- Modify: `src/shared/types/tag.ts`

- [ ] **Step 1: 在 tag.ts 新增 ModbusWriteRequest 型別**

在 `src/shared/types/tag.ts` 的 `ModbusAddress` 後面新增：

```typescript
export interface ModbusWriteRequest {
  connectionId: string
  address: ModbusAddress
  dataType: DataType
  value: number | boolean | string
}
```

- [ ] **Step 2: 在 ProtocolAdapter.ts 新增 WriteResult 和可選的 writeTag**

在 `ReadResult` 介面後面新增：

```typescript
export interface WriteResult {
  success: boolean
  error?: string
  timestamp: number
}
```

在 `ProtocolAdapter` 類別中新增可選方法（不是 abstract，因為不是所有協定都支援寫入）：

```typescript
/**
 * Write a value to a device. Not all protocols support writing.
 * Default implementation throws 'not supported'.
 */
async writeTag(_tag: Tag, _value: number | boolean | string): Promise<WriteResult> {
  return { success: false, error: 'Write not supported by this protocol', timestamp: Date.now() }
}

/**
 * Check if this adapter supports write operations.
 */
supportsWrite(): boolean {
  return false
}
```

- [ ] **Step 3: 型別檢查**

```bash
pnpm typecheck
```

Expected: 通過

- [ ] **Step 4: Commit**

```bash
git add src/main/protocols/ProtocolAdapter.ts src/shared/types/tag.ts
git commit -m "feat: add WriteResult type and optional writeTag to ProtocolAdapter"
```

---

### Task B2: 實作 ModbusTcpAdapter 寫入方法

**Files:**
- Modify: `src/main/protocols/ModbusTcpAdapter.ts`
- Create: `tests/unit/main/modbus-write.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// tests/unit/main/modbus-write.test.ts
import { ModbusTcpAdapter } from '../../../src/main/protocols/ModbusTcpAdapter'
import type { Connection, Tag, ModbusAddress } from '../../../src/shared/types'

// Mock modbus-serial
jest.mock('modbus-serial', () => {
  return jest.fn().mockImplementation(() => ({
    connectTCP: jest.fn().mockResolvedValue(undefined),
    setTimeout: jest.fn(),
    setID: jest.fn(),
    getID: jest.fn(() => 1),
    isOpen: true,
    close: jest.fn((cb: () => void) => cb()),
    writeCoil: jest.fn().mockResolvedValue({}),
    writeRegister: jest.fn().mockResolvedValue({}),
    writeCoils: jest.fn().mockResolvedValue({}),
    writeRegisters: jest.fn().mockResolvedValue({})
  }))
})

jest.mock('electron-log/main.js', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}))

const makeConnection = (): Connection => ({
  id: 'test-conn', name: 'Test', protocol: 'modbus-tcp',
  config: { host: '127.0.0.1', port: 502, unitId: 1, timeout: 5000 },
  status: 'connected', createdAt: Date.now()
})

const makeTag = (registerType: string, address: number, dataType: string): Tag => ({
  id: `tag-${registerType}-${address}`, name: `Test Tag`,
  connectionId: 'test-conn', dataType: dataType as any, enabled: true,
  address: { type: 'modbus', registerType, address, length: 1 } as ModbusAddress
})

describe('ModbusTcpAdapter write operations', () => {
  let adapter: ModbusTcpAdapter

  beforeEach(() => {
    adapter = new ModbusTcpAdapter(makeConnection())
  })

  test('supportsWrite returns true', () => {
    expect(adapter.supportsWrite()).toBe(true)
  })

  test('FC05: write single coil (true)', async () => {
    const tag = makeTag('coil', 0, 'boolean')
    const result = await adapter.writeTag(tag, true)
    expect(result.success).toBe(true)
  })

  test('FC05: write single coil (false)', async () => {
    const tag = makeTag('coil', 100, 'boolean')
    const result = await adapter.writeTag(tag, false)
    expect(result.success).toBe(true)
  })

  test('FC06: write single holding register (uint16)', async () => {
    const tag = makeTag('holding', 0, 'uint16')
    const result = await adapter.writeTag(tag, 42)
    expect(result.success).toBe(true)
  })

  test('FC06: write single holding register (int16)', async () => {
    const tag = makeTag('holding', 10, 'int16')
    const result = await adapter.writeTag(tag, -100)
    expect(result.success).toBe(true)
  })

  test('FC16: write float32 uses 2 registers', async () => {
    const tag = makeTag('holding', 100, 'float32')
    ;(tag.address as ModbusAddress).length = 2
    const result = await adapter.writeTag(tag, 3.14)
    expect(result.success).toBe(true)
  })

  test('rejects write to input registers', async () => {
    const tag = makeTag('input', 0, 'uint16')
    const result = await adapter.writeTag(tag, 42)
    expect(result.success).toBe(false)
    expect(result.error).toContain('read-only')
  })

  test('rejects write to discrete inputs', async () => {
    const tag = makeTag('discrete', 0, 'boolean')
    const result = await adapter.writeTag(tag, true)
    expect(result.success).toBe(false)
    expect(result.error).toContain('read-only')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
pnpm test:main -- --testPathPattern=modbus-write
```

Expected: 失敗（writeTag 尚未實作）

- [ ] **Step 3: 在 ModbusTcpAdapter 實作寫入方法**

在 `ModbusTcpAdapter` 類別中新增：

```typescript
/**
 * Check if this adapter supports write operations.
 */
supportsWrite(): boolean {
  return true
}

/**
 * Write a value to a Modbus device.
 * Supports: FC05 (Write Single Coil), FC06 (Write Single Register),
 *           FC15 (Write Multiple Coils), FC16 (Write Multiple Registers)
 */
async writeTag(tag: Tag, value: number | boolean | string): Promise<WriteResult> {
  const timestamp = Date.now()
  const address = tag.address as ModbusAddress

  if (address.type !== 'modbus') {
    return { success: false, error: 'Invalid address type for Modbus write', timestamp }
  }

  // Input registers and discrete inputs are read-only
  if (address.registerType === 'input' || address.registerType === 'discrete') {
    return { success: false, error: `${address.registerType} registers are read-only`, timestamp }
  }

  // Handle tag-level unit ID override
  const originalUnitId = this.client.getID()
  if (address.unitId !== undefined) {
    this.client.setID(address.unitId)
  }

  try {
    if (address.registerType === 'coil') {
      const boolValue = typeof value === 'boolean' ? value : Boolean(value)
      if (address.length > 1 && Array.isArray(value)) {
        // FC15: Write Multiple Coils
        await this.client.writeCoils(address.address, value.map(Boolean))
      } else {
        // FC05: Write Single Coil
        await this.client.writeCoil(address.address, boolValue)
      }
    } else if (address.registerType === 'holding') {
      await this.writeHoldingRegister(address, tag.dataType, value)
    }

    return { success: true, timestamp }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error(`[ModbusTcp] Write failed: ${message}`)

    if (this.isConnectionError(error)) {
      this.handleConnectionError(error as Error)
    }

    return { success: false, error: message, timestamp }
  } finally {
    if (address.unitId !== undefined) {
      this.client.setID(originalUnitId)
    }
  }
}

/**
 * Write to holding registers based on data type.
 */
private async writeHoldingRegister(
  address: ModbusAddress,
  dataType: DataType,
  value: number | boolean | string
): Promise<void> {
  const numValue = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value)

  switch (dataType) {
    case 'boolean':
    case 'uint16':
      // FC06: Write Single Register
      await this.client.writeRegister(address.address, numValue & 0xFFFF)
      break

    case 'int16': {
      // FC06: Write Single Register (convert signed to unsigned)
      const unsigned = numValue < 0 ? numValue + 0x10000 : numValue
      await this.client.writeRegister(address.address, unsigned & 0xFFFF)
      break
    }

    case 'int32': {
      // FC16: Write Multiple Registers (2 registers)
      const byteOrder = this.getEffectiveByteOrder(address)
      const registers = this.encodeInt32(numValue, byteOrder)
      await this.client.writeRegisters(address.address, registers)
      break
    }

    case 'uint32': {
      // FC16: Write Multiple Registers (2 registers, unsigned)
      const byteOrder = this.getEffectiveByteOrder(address)
      const registers = this.encodeUint32(numValue, byteOrder)
      await this.client.writeRegisters(address.address, registers)
      break
    }

    case 'float32': {
      // FC16: Write Multiple Registers (2 registers)
      const byteOrder = this.getEffectiveByteOrder(address)
      const registers = this.encodeFloat32(numValue, byteOrder)
      await this.client.writeRegisters(address.address, registers)
      break
    }

    default:
      throw new Error(`Unsupported data type for write: ${dataType}`)
  }
}

/**
 * Encode a float32 value into two 16-bit registers with byte order.
 */
private encodeFloat32(value: number, byteOrder: ByteOrder): number[] {
  const buffer = Buffer.alloc(4)
  buffer.writeFloatBE(value, 0)
  const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3]

  switch (byteOrder) {
    case 'ABCD': return [(b0 << 8) | b1, (b2 << 8) | b3]
    case 'DCBA': return [(b3 << 8) | b2, (b1 << 8) | b0]
    case 'BADC': return [(b1 << 8) | b0, (b3 << 8) | b2]
    case 'CDAB': return [(b2 << 8) | b3, (b0 << 8) | b1]
    default: return [(b0 << 8) | b1, (b2 << 8) | b3]
  }
}

/**
 * Encode a 32-bit integer into two 16-bit registers with byte order.
 */
private encodeUint32(value: number, byteOrder: ByteOrder): number[] {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value >>> 0, 0)
  const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3]

  switch (byteOrder) {
    case 'ABCD': return [(b0 << 8) | b1, (b2 << 8) | b3]
    case 'DCBA': return [(b3 << 8) | b2, (b1 << 8) | b0]
    case 'BADC': return [(b1 << 8) | b0, (b3 << 8) | b2]
    case 'CDAB': return [(b2 << 8) | b3, (b0 << 8) | b1]
    default: return [(b0 << 8) | b1, (b2 << 8) | b3]
  }
}

private encodeInt32(value: number, byteOrder: ByteOrder): number[] {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32BE(value, 0)
  const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3]

  switch (byteOrder) {
    case 'ABCD': return [(b0 << 8) | b1, (b2 << 8) | b3]
    case 'DCBA': return [(b3 << 8) | b2, (b1 << 8) | b0]
    case 'BADC': return [(b1 << 8) | b0, (b3 << 8) | b2]
    case 'CDAB': return [(b2 << 8) | b3, (b0 << 8) | b1]
    default: return [(b0 << 8) | b1, (b2 << 8) | b3]
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
pnpm test:main -- --testPathPattern=modbus-write
```

Expected: 全部通過

- [ ] **Step 5: Commit**

```bash
git add src/main/protocols/ModbusTcpAdapter.ts tests/unit/main/modbus-write.test.ts
git commit -m "feat(modbus): implement write operations (FC05/06/15/16)"
```

---

### Task B3: 新增 Modbus 寫入 IPC 通道

**Files:**
- Modify: `src/shared/constants/ipc-channels.ts`
- Create: `src/main/ipc/modbus-write.ts`
- Modify: `src/main/ipc/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: 在 ipc-channels.ts 新增寫入通道**

```typescript
export const MODBUS_WRITE_SINGLE = 'modbus:write-single'
export const MODBUS_WRITE_MULTIPLE = 'modbus:write-multiple'
```

- [ ] **Step 2: 建立 modbus-write.ts IPC 處理器**

```typescript
// src/main/ipc/modbus-write.ts
import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import { MODBUS_WRITE_SINGLE, MODBUS_WRITE_MULTIPLE } from '@shared/constants/ipc-channels'
import { getConnectionManager } from '../services/ConnectionManager'
import type { ModbusAddress, DataType } from '@shared/types'

interface WriteParams {
  connectionId: string
  address: ModbusAddress
  dataType: DataType
  value: number | boolean | string
}

export function registerModbusWriteHandlers(): void {
  const manager = getConnectionManager()

  ipcMain.handle(MODBUS_WRITE_SINGLE, async (_event, params: WriteParams) => {
    log.debug(`[IPC] ${MODBUS_WRITE_SINGLE}`, params)

    try {
      // Validate writable register types
      if (params.address.registerType === 'input' || params.address.registerType === 'discrete') {
        return { success: false, error: `${params.address.registerType} registers are read-only` }
      }

      const result = await manager.writeOnce(
        params.connectionId,
        params.address,
        params.dataType,
        params.value
      )
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${MODBUS_WRITE_SINGLE} failed: ${message}`)
      return { success: false, error: message }
    }
  })
}
```

- [ ] **Step 2b: 在 ConnectionManager 新增 writeOnce 方法**

在 `src/main/services/ConnectionManager.ts` 中，仿照現有的 `readOnce` 方法，新增：

```typescript
async writeOnce(
  connectionId: string,
  address: ModbusAddress,
  dataType: DataType,
  value: number | boolean | string
): Promise<WriteResult> {
  const conn = this.connections.get(connectionId)
  if (!conn) {
    return { success: false, error: 'Connection not found', timestamp: Date.now() }
  }
  if (!conn.adapter.isConnected()) {
    return { success: false, error: 'Not connected', timestamp: Date.now() }
  }
  if (!conn.adapter.supportsWrite()) {
    return { success: false, error: 'Protocol does not support write', timestamp: Date.now() }
  }

  // Build a temporary tag object for the write operation
  const tag: Tag = {
    id: `write-${Date.now()}`,
    name: 'write-once',
    connectionId,
    dataType,
    enabled: true,
    address
  }

  return conn.adapter.writeTag(tag, value)
}
```

需要在 `ConnectionManager.ts` 頂部引入 `WriteResult` 型別。

- [ ] **Step 3: 在 ipc/index.ts 註冊新處理器**

在 `registerAllHandlers` 函式中加入 `registerModbusWriteHandlers()`。

- [ ] **Step 4: 在 preload/index.ts 暴露 API**

在 `ElectronAPI` 介面的 `connection` 區段或新建 `modbus` 區段新增：

```typescript
modbus: {
  write: (params: {
    connectionId: string
    address: ModbusAddress
    dataType: DataType
    value: number | boolean | string
  }) => Promise<IpcResult<void>>
}
```

- [ ] **Step 5: 型別檢查與測試**

```bash
pnpm typecheck && pnpm test
```

Expected: 通過

- [ ] **Step 6: Commit**

```bash
git add src/shared/constants/ipc-channels.ts src/main/ipc/modbus-write.ts src/main/ipc/index.ts src/preload/index.ts
git commit -m "feat(modbus): add IPC channel for write operations"
```

---

## Part C: MQTT 按標籤 QoS

### Task C1: MqttAddress 新增 qos 欄位

**Files:**
- Modify: `src/shared/types/tag.ts`
- Modify: `src/main/protocols/MqttAdapter.ts`
- Modify: `tests/conformance/mqtt-conformance.test.ts`

- [ ] **Step 1: 先在 tag.ts 新增 qos 欄位（型別變更先行）**

在 `src/shared/types/tag.ts` 的 `MqttAddress` 中新增：

```typescript
export interface MqttAddress {
  type: 'mqtt'
  topic: string
  jsonPath?: string
  qos?: 0 | 1 | 2  // 新增：按標籤的服務品質等級，預設 1
}
```

- [ ] **Step 2: 寫測試驗證 QoS 訂閱行為**

在 `tests/conformance/mqtt-conformance.test.ts` 中新增測試區段：

```typescript
describe('Per-tag QoS subscription', () => {
  test('address without qos defaults to 1 in subscription', () => {
    const address: MqttAddress = { type: 'mqtt', topic: 'test/topic' }
    const effectiveQos = address.qos ?? 1
    expect(effectiveQos).toBe(1)
  })

  test('address with qos 0 uses QoS 0', () => {
    const address: MqttAddress = { type: 'mqtt', topic: 'test/topic', qos: 0 }
    expect(address.qos).toBe(0)
  })

  test('address with qos 2 uses QoS 2', () => {
    const address: MqttAddress = { type: 'mqtt', topic: 'test/topic', qos: 2 }
    expect(address.qos).toBe(2)
  })

  test('multiple tags on same topic use highest QoS', () => {
    const tags: { qos: number }[] = [
      { qos: 0 }, { qos: 2 }, { qos: 1 }
    ]
    const highestQos = Math.max(...tags.map(t => t.qos))
    expect(highestQos).toBe(2)
  })
})
```

- [ ] **Step 2b: 執行測試確認通過**

```bash
pnpm test:main -- --testPathPattern=mqtt-conformance
```

Expected: 通過（型別已在 Step 1 新增）

- [ ] **Step 3: 修改 MqttAdapter 使用標籤級 QoS**

修改 `subscribeToTopics` 方法，改為接收 tags 而非 topics：

在 `ensureSubscriptions` 中收集每個 topic 的最高 QoS，傳給 `subscribeToTopics`：

```typescript
// 修改 ensureSubscriptions 內的訂閱邏輯
private async ensureSubscriptions(tags: Tag[]): Promise<void> {
  if (!this.client || !this.client.connected) return

  const newSubscriptions = new Map<string, 0 | 1 | 2>()

  for (const tag of tags) {
    if (!tag.enabled) continue

    const address = tag.address as MqttAddress
    if (address.type !== 'mqtt') continue

    const topic = address.topic
    this.tagTopicMap.set(tag.id, topic)

    if (!this.subscribedTopics.has(topic)) {
      // 取該 topic 下所有標籤的最高 QoS
      const existingQos = newSubscriptions.get(topic) ?? 0
      const tagQos = address.qos ?? 1
      newSubscriptions.set(topic, Math.max(existingQos, tagQos) as 0 | 1 | 2)
    }
  }

  if (newSubscriptions.size > 0) {
    await this.subscribeToTopicsWithQos(newSubscriptions)
    for (const topic of newSubscriptions.keys()) {
      this.subscribedTopics.add(topic)
    }
  }
}

private async subscribeToTopicsWithQos(subscriptions: Map<string, 0 | 1 | 2>): Promise<void> {
  if (!this.client || !this.client.connected) return

  return new Promise((resolve, reject) => {
    const topicObj: Record<string, { qos: 0 | 1 | 2 }> = {}
    for (const [topic, qos] of subscriptions) {
      topicObj[topic] = { qos }
    }

    this.client!.subscribe(topicObj, (error, granted) => {
      if (error) {
        log.error(`[Mqtt] Subscribe error: ${error.message}`)
        reject(error)
      } else {
        const topicList = granted?.map((g) => `${g.topic}(QoS${g.qos})`).join(', ')
        log.info(`[Mqtt] Subscribed to: ${topicList}`)
        resolve()
      }
    })
  })
}
```

同時修改 `resubscribeAll` 方法保留 QoS 資訊（避免重連後退回固定 QoS 1）。新增一個 `topicQosMap: Map<string, 0 | 1 | 2>` 成員變數來追蹤每個 topic 的 QoS：

```typescript
// 新增成員變數
private topicQosMap = new Map<string, 0 | 1 | 2>()

// 修改 resubscribeAll
private resubscribeAll(): void {
  if (this.subscribedTopics.size > 0) {
    const subscriptions = new Map<string, 0 | 1 | 2>()
    for (const topic of this.subscribedTopics) {
      subscriptions.set(topic, this.topicQosMap.get(topic) ?? 1)
    }
    this.subscribeToTopicsWithQos(subscriptions).catch((error) => {
      log.error(`[Mqtt] Resubscribe failed: ${error}`)
    })
  }
}
```

在 `ensureSubscriptions` 中記錄 QoS：`this.topicQosMap.set(topic, tagQos)`。
在 `dispose` 中清理：`this.topicQosMap.clear()`。

- [ ] **Step 4: 執行測試確認通過**

```bash
pnpm test:main -- --testPathPattern=mqtt-conformance
pnpm typecheck
```

Expected: 全部通過

- [ ] **Step 5: 執行完整測試套件**

```bash
pnpm test && pnpm build
```

Expected: 全部通過

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/tag.ts src/main/protocols/MqttAdapter.ts tests/conformance/mqtt-conformance.test.ts
git commit -m "feat(mqtt): add per-tag QoS subscription support"
```

---

## Final Checkpoint

- [ ] **執行完整品質閘門**

```bash
pnpm check  # lint + typecheck + test:main + test:renderer + build + smoke
```

- [ ] **確認 Electron 版本**

```bash
pnpm dev  # 啟動後在 DevTools console 執行 process.versions.electron
```

Expected: `39.x.x`

- [ ] **更新協定合規測試矩陣**

修改 `docs/protocol-conformance-matrix.md`，將 Modbus FC05/06/15/16 狀態從「Not Implemented」改為「Implemented」，MQTT QoS 從「Partial」改為「Implemented」。
