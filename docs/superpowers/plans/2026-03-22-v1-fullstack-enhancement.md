# Connex Studio v1.0 全面強化實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 v1.0 商用發布前的全部剩餘工作——lint 修復、合規矩陣 100%、Sentry 錯誤回報、完整雙語國際化、無障礙強化、應用內說明文件。

**Architecture:** 三批次子代理驅動，按檔案歸屬分組避免合併衝突。先行批（A lint + C Sentry）→ 主力批（B 合規矩陣 + D i18n）→ 收尾批（E a11y → F help）→ G 推送。

**Tech Stack:** Electron 39, React 19, TypeScript, react-i18next, @sentry/electron, Zustand, Radix UI

**Spec:** `docs/superpowers/specs/2026-03-22-v1-fullstack-enhancement-design.md`

---

## File Map

### 先行批（A + C）
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `tests/integration/ipc/connection.integration.test.ts` | 修復 3 個 `Function` 型別 lint 錯誤 |
| Modify | `package.json` | 新增 `@sentry/electron` 依賴 |
| Modify | `src/main/index.ts` | Sentry 主行程初始化 |
| Modify | `src/renderer/main.tsx` | Sentry 渲染行程初始化 |

### 主力批——B 合規矩陣
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/main/protocols/byteOrderUtils.ts` | 新增 float64 轉換函式 |
| Modify | `src/main/protocols/ModbusTcpAdapter.ts` | float64 讀寫 + 位址驗證 |
| Modify | `src/shared/types/connection.ts` | MqttConfig + OpcUaConfig 型別擴充 |
| Modify | `src/shared/types/tag.ts` | TagValue 新增 isRetained |
| Modify | `src/main/protocols/MqttAdapter.ts` | 保留訊息 + 遺囑 + 乾淨連線 |
| Modify | `src/main/protocols/OpcUaAdapter.ts` | 憑證驗證啟用 |
| Create | `tests/unit/main/byteOrderUtils.float64.test.ts` | float64 轉換測試 |
| Create | `tests/unit/main/modbus-address-validation.test.ts` | 位址驗證測試 |
| Create | `tests/unit/main/mqtt-config.test.ts` | MQTT 設定測試 |
| Create | `tests/unit/main/opcua-cert.test.ts` | OPC UA 憑證測試 |

### 主力批——D 國際化
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/renderer/i18n/index.ts` | i18next 初始化 |
| Create | `src/renderer/i18n/locales/en/*.json` (14 files) | 英文翻譯檔 |
| Create | `src/renderer/i18n/locales/zh-TW/*.json` (14 files) | 繁體中文翻譯檔 |
| Modify | `src/renderer/main.tsx` | 掛載 I18nextProvider |
| Modify | `src/renderer/stores/uiStore.ts` | 新增 language 狀態 |
| Modify | `src/renderer/components/**/*.tsx` (84 files) | 硬編碼字串改為 t() 呼叫 |

### 收尾批（E + F）
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/renderer/components/**/*.tsx` | 語意化 HTML + ARIA 標記 |
| Create | `src/renderer/components/help/HelpPanel.tsx` | 說明面板元件 |
| Modify | `src/renderer/App.tsx` | 掛載 HelpPanel |
| Modify | `src/renderer/components/layout/SidebarV2.tsx` | 說明按鈕 + 語言切換器 |

---

## 先行批

### Task 1: 修復 lint 錯誤（子專案 A）

**Files:**
- Modify: `tests/integration/ipc/connection.integration.test.ts:46,48,50`

- [ ] **Step 1: 修復 3 個 `Function` 型別**

第 46 行（`handlers` 物件的型別）：
```typescript
// Before:
const handlers: Record<string, Function> = {}
// After:
const handlers: Record<string, (...args: unknown[]) => unknown> = {}
```

第 48 行（`connect` 回呼）：
```typescript
// Before:
connect: jest.fn((_port: number, _host: string, cb: Function) => cb()),
// After:
connect: jest.fn((_port: number, _host: string, cb: () => void) => cb()),
```

第 50 行（`on` 回呼）：
```typescript
// Before:
on: jest.fn((event: string, handler: Function) => {
// After:
on: jest.fn((event: string, handler: (...args: unknown[]) => unknown) => {
```

- [ ] **Step 2: 驗證 lint 通過**

Run: `pnpm lint`
Expected: 零錯誤（或不比修改前多）

- [ ] **Step 3: 驗證測試通過**

Run: `pnpm test:main`
Expected: 所有測試通過

- [ ] **Step 4: 提交**

```bash
git add tests/integration/ipc/connection.integration.test.ts
git commit -m "fix: 修復整合測試中的 Function 型別 lint 錯誤"
```

---

### Task 2: Sentry 整合（子專案 C）

**Files:**
- Modify: `package.json`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: 安裝依賴**

```bash
pnpm add @sentry/electron
```

若 `@sentry/electron` 不支援 Electron 39，退而使用：
```bash
pnpm add @sentry/node @sentry/browser
```

- [ ] **Step 2: 主行程初始化**

在 `src/main/index.ts` 的 `log.initialize()` 之後、全域錯誤處理器之前，加入：

```typescript
import * as Sentry from '@sentry/electron/main'

// Sentry error reporting — only in production with DSN configured
const SENTRY_DSN = process.env.SENTRY_DSN || ''
if (SENTRY_DSN && !is.dev) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    release: `connex-studio@${app.getVersion()}`,
  })
}
```

若使用退案（`@sentry/node`）：
```typescript
import * as Sentry from '@sentry/node'
```

- [ ] **Step 3: 渲染行程初始化**

在 `src/renderer/main.tsx` 的 imports 之後、`window.onerror` 之前，加入：

```typescript
import * as Sentry from '@sentry/electron/renderer'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
if (SENTRY_DSN && !import.meta.env.DEV) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    release: `connex-studio@${__APP_VERSION__}`,  // 需在 vite 設定中定義 define: { __APP_VERSION__: ... }
  })
}
```

> 註：渲染行程無法使用 `@electron-toolkit/utils` 的 `is.dev`（Node.js 模組），改用 Vite 的 `import.meta.env.DEV`。版本號透過 Vite `define` 注入（或透過 preload bridge 取得）。

若使用退案（`@sentry/browser`）：
```typescript
import * as Sentry from '@sentry/browser'
```

- [ ] **Step 4: 驗證建置通過**

Run: `pnpm typecheck && pnpm build`
Expected: 無型別錯誤、建置成功

- [ ] **Step 5: 驗證測試通過**

Run: `pnpm test`
Expected: 所有測試通過（Sentry 在測試環境中因為無 DSN 而自動停用）

- [ ] **Step 6: 提交**

```bash
git add package.json pnpm-lock.yaml src/main/index.ts src/renderer/main.tsx
git commit -m "feat: 整合 Sentry 錯誤回報（生產模式啟用、開發模式停用）"
```

---

## 主力批——合規矩陣

### Task 3: Modbus float64 轉換函式（B1 基礎設施）

**Files:**
- Modify: `src/main/protocols/byteOrderUtils.ts`
- Create: `tests/unit/main/byteOrderUtils.float64.test.ts`

- [ ] **Step 1: 寫失敗測試**

建立 `tests/unit/main/byteOrderUtils.float64.test.ts`：

```typescript
import { decodeFloat64, encodeFloat64, reorderRegisters64 } from '@main/protocols/byteOrderUtils'

describe('float64 byte order utilities', () => {
  // IEEE 754: 1.0 = 0x3FF0000000000000
  // As 4 registers (ABCD): [0x3FF0, 0x0000, 0x0000, 0x0000]
  const ONE_REGS: [number, number, number, number] = [0x3FF0, 0x0000, 0x0000, 0x0000]

  describe('reorderRegisters64', () => {
    it('ABCD returns registers unchanged', () => {
      expect(reorderRegisters64(0x3FF0, 0x0000, 0x0000, 0x0000, 'ABCD'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('DCBA reverses register order', () => {
      expect(reorderRegisters64(0x0000, 0x0000, 0x0000, 0x3FF0, 'DCBA'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('BADC swaps bytes within each word', () => {
      expect(reorderRegisters64(0xF03F, 0x0000, 0x0000, 0x0000, 'BADC'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('CDAB swaps bytes and reverses words', () => {
      expect(reorderRegisters64(0x0000, 0x0000, 0x0000, 0xF03F, 'CDAB'))
        .toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })
  })

  describe('decodeFloat64', () => {
    it('decodes 1.0 with ABCD byte order', () => {
      expect(decodeFloat64([0x3FF0, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(1.0)
    })

    it('decodes -1.0 with ABCD byte order', () => {
      // -1.0 = 0xBFF0000000000000
      expect(decodeFloat64([0xBFF0, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(-1.0)
    })

    it('decodes 0.0', () => {
      expect(decodeFloat64([0x0000, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(0.0)
    })

    it('decodes NaN', () => {
      // NaN = 0x7FF8000000000000
      expect(decodeFloat64([0x7FF8, 0x0000, 0x0000, 0x0000], 'ABCD')).toBeNaN()
    })

    it('decodes Infinity', () => {
      // +Infinity = 0x7FF0000000000000
      expect(decodeFloat64([0x7FF0, 0x0000, 0x0000, 0x0000], 'ABCD')).toBe(Infinity)
    })
  })

  describe('encodeFloat64', () => {
    it('encodes 1.0 with ABCD byte order', () => {
      expect(encodeFloat64(1.0, 'ABCD')).toEqual([0x3FF0, 0x0000, 0x0000, 0x0000])
    })

    it('round-trips through decode/encode for all byte orders', () => {
      const value = 3.14159265358979
      for (const order of ['ABCD', 'DCBA', 'BADC', 'CDAB'] as const) {
        const encoded = encodeFloat64(value, order)
        const decoded = decodeFloat64(encoded, order)
        expect(decoded).toBeCloseTo(value, 10)
      }
    })
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `pnpm test:main -- --testPathPattern=byteOrderUtils.float64`
Expected: FAIL（函式不存在）

- [ ] **Step 3: 實作 float64 函式**

在 `src/main/protocols/byteOrderUtils.ts` 底部新增：

```typescript
/**
 * Reorder four 16-bit registers based on byte order (for 64-bit values).
 * Returns [R0, R1, R2, R3] in big-endian order for IEEE 754 interpretation.
 */
export function reorderRegisters64(
  reg0: number, reg1: number, reg2: number, reg3: number,
  byteOrder: ByteOrder
): [number, number, number, number] {
  switch (byteOrder) {
    case 'ABCD':
      return [reg0, reg1, reg2, reg3]
    case 'DCBA':
      return [reg3, reg2, reg1, reg0]
    case 'BADC':
      return [swapBytes(reg0), swapBytes(reg1), swapBytes(reg2), swapBytes(reg3)]
    case 'CDAB':
      return [swapBytes(reg3), swapBytes(reg2), swapBytes(reg1), swapBytes(reg0)]
    default:
      console.warn(`[byteOrderUtils] Invalid byteOrder "${byteOrder}", defaulting to ABCD`)
      return [reg0, reg1, reg2, reg3]
  }
}

/**
 * Decode four 16-bit registers to a 64-bit float (IEEE 754 double).
 */
export function decodeFloat64(registers: number[], byteOrder: ByteOrder): number {
  const [r0, r1, r2, r3] = reorderRegisters64(
    registers[0], registers[1], registers[2], registers[3], byteOrder
  )
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setUint16(0, r0, false)
  view.setUint16(2, r1, false)
  view.setUint16(4, r2, false)
  view.setUint16(6, r3, false)
  return view.getFloat64(0, false)
}

/**
 * Encode a 64-bit float to four 16-bit registers.
 */
export function encodeFloat64(value: number, byteOrder: ByteOrder): [number, number, number, number] {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, value, false)
  const r0 = view.getUint16(0, false)
  const r1 = view.getUint16(2, false)
  const r2 = view.getUint16(4, false)
  const r3 = view.getUint16(6, false)
  // 先產生大端序暫存器，再依 byteOrder 反向排列
  switch (byteOrder) {
    case 'ABCD': return [r0, r1, r2, r3]
    case 'DCBA': return [r3, r2, r1, r0]
    case 'BADC': return [swapBytes(r0), swapBytes(r1), swapBytes(r2), swapBytes(r3)]
    case 'CDAB': return [swapBytes(r3), swapBytes(r2), swapBytes(r1), swapBytes(r0)]
    default: return [r0, r1, r2, r3]
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `pnpm test:main -- --testPathPattern=byteOrderUtils.float64`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/main/protocols/byteOrderUtils.ts tests/unit/main/byteOrderUtils.float64.test.ts
git commit -m "feat(modbus): 新增 float64 位元組順序轉換函式"
```

---

### Task 4: Modbus float64 讀寫整合 + 位址驗證（B1 + B2）

**Files:**
- Modify: `src/main/protocols/ModbusTcpAdapter.ts`
- Create: `tests/unit/main/modbus-address-validation.test.ts`

- [ ] **Step 1: 寫位址驗證失敗測試**

建立 `tests/unit/main/modbus-address-validation.test.ts`：

```typescript
describe('parseModbusAddress range validation', () => {
  it('accepts plain address 0 with registerType', () => {
    expect(() => parseModbusAddress('0', 'holding')).not.toThrow()
  })

  it('accepts plain address 65535 with registerType', () => {
    expect(() => parseModbusAddress('65535', 'holding')).not.toThrow()
  })

  it('rejects plain address 65536 with registerType', () => {
    expect(() => parseModbusAddress('65536', 'holding')).toThrow(/out of range/)
  })

  it('rejects IEC format with out-of-range address', () => {
    expect(() => parseModbusAddress('HR65536')).toThrow(/out of range/)
  })

  // 註：負數位址（如 -1）不會匹配任何合法格式的正則，
  // 會被 "Invalid Modbus address format" 攔截，不需要額外的 out-of-range 測試。
})
```

注意：需根據 `parseModbusAddress` 的實際匯出方式調整 import。若函式未匯出，先將其改為 `export`。

- [ ] **Step 2: 執行測試確認失敗**

Run: `pnpm test:main -- --testPathPattern=modbus-address-validation`
Expected: FAIL（目前不會拋出 out of range 錯誤）

- [ ] **Step 3: 在 `ModbusTcpAdapter.ts` 中實作修改**

**float64 讀取**（`convertValue()` 函式，在 `float32` case 之後加入）：
```typescript
case 'float64': {
  if (registers.length < 4) return registers[0]
  return decodeFloat64(registers, byteOrder ?? 'ABCD')
}
```

記得在檔案頂部 import：
```typescript
import { decodeFloat64, encodeFloat64 } from './byteOrderUtils'
```

**float64 寫入**（`writeHoldingValue()` 函式，在 `uint32` case 之後加入）：
```typescript
case 'float64': {
  const regs = encodeFloat64(Number(value), byteOrder ?? 'ABCD')
  await this.client.writeRegisters(address.address, regs)
  return
}
```

**位址驗證**（`parseModbusAddress()` 函式）：
- 在 IEC 格式解析的位址賦值後加入邊界檢查
- 在純數字格式的 `parseInt` 之後加入邊界檢查

```typescript
// 加在每個解析路徑的 address 賦值之後
if (address < 0 || address > 65535) {
  throw new Error(`Modbus address out of range: ${address} (valid: 0-65535)`)
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `pnpm test:main -- --testPathPattern="modbus-address-validation|byteOrderUtils"`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add src/main/protocols/ModbusTcpAdapter.ts tests/unit/main/modbus-address-validation.test.ts
git commit -m "feat(modbus): float64 讀寫整合 + 位址範圍驗證（MOD-035, MOD-047）"
```

---

### Task 5: MQTT 設定暴露——保留訊息 + 遺囑 + 乾淨連線（B3 + B4 + B5）

**Files:**
- Modify: `src/shared/types/connection.ts`
- Modify: `src/shared/types/tag.ts`
- Modify: `src/main/protocols/MqttAdapter.ts`
- Create: `tests/unit/main/mqtt-config.test.ts`

- [ ] **Step 1: 擴充型別定義**

`src/shared/types/connection.ts` — `MqttConfig` 介面新增：
```typescript
export interface MqttConfig {
  brokerUrl: string
  clientId: string
  username?: string
  password?: string
  useTls: boolean
  caCert?: string
  // 新增
  cleanSession?: boolean       // 預設 true
  willTopic?: string
  willPayload?: string
  willQos?: 0 | 1 | 2
  willRetain?: boolean
}
```

`src/shared/types/tag.ts` — 在 `TagValue` 或對等介面（若存在）新增：
```typescript
isRetained?: boolean
```

若 `TagValue` 不存在，在 `Tag` 介面下方新增：
```typescript
export interface TagReading {
  tagId: string
  value: unknown
  quality: 'good' | 'bad' | 'uncertain'
  timestamp: number
  isRetained?: boolean  // MQTT: 此值來自保留訊息
}
```

- [ ] **Step 2: 寫失敗測試**

建立 `tests/unit/main/mqtt-config.test.ts`：

```typescript
// mock mqtt.js connect
jest.mock('mqtt', () => {
  const mockClient = {
    on: jest.fn(),
    subscribe: jest.fn(),
    end: jest.fn(),
    connected: true,
  }
  return { connect: jest.fn(() => mockClient), __mockClient: mockClient }
})

import mqtt from 'mqtt'

describe('MQTT config extensions', () => {
  it('passes cleanSession=false to mqtt.js connect options', () => {
    const config = { brokerUrl: 'mqtt://localhost', clientId: 'test', useTls: false, cleanSession: false }
    // 建構 adapter 並呼叫 connect()
    // 驗證 mqtt.connect 被呼叫時 options.clean === false
    expect((mqtt.connect as jest.Mock).mock.calls[0][1]).toMatchObject({ clean: false })
  })

  it('defaults cleanSession to true when not specified', () => {
    const config = { brokerUrl: 'mqtt://localhost', clientId: 'test', useTls: false }
    // 驗證 mqtt.connect 被呼叫時 options.clean === true
    expect((mqtt.connect as jest.Mock).mock.calls[0][1]).toMatchObject({ clean: true })
  })

  it('passes will message to mqtt.js connect options', () => {
    const config = {
      brokerUrl: 'mqtt://localhost', clientId: 'test', useTls: false,
      willTopic: 'device/offline', willPayload: 'bye', willQos: 1 as const, willRetain: true,
    }
    const callOpts = (mqtt.connect as jest.Mock).mock.calls[0][1]
    expect(callOpts.will).toMatchObject({
      topic: 'device/offline',
      qos: 1,
      retain: true,
    })
  })

  it('marks retained messages via packet.retain in message callback', () => {
    // 觸發 mockClient 的 'message' 事件，傳入 packet.retain = true
    // 驗證 handleMessage 輸出的標籤讀取結果中 isRetained === true
  })
})
```

> 註：具體的 `MqttAdapter` 建構和事件觸發方式需根據實際類別結構調整。上方提供的是 mock 骨架，實作代理應根據 `MqttAdapter` 的 constructor 和 `connect()` 方法完善細節。

- [ ] **Step 3: 實作 MqttAdapter 修改**

`src/main/protocols/MqttAdapter.ts`：

**`connect()` 方法**（建立連線選項處）：
```typescript
const options: IClientOptions = {
  clientId: this.config.clientId,
  clean: this.config.cleanSession ?? true,  // 原本硬寫 true
  connectTimeout: 10000,
  reconnectPeriod: 5000,
  rejectUnauthorized: this.config.useTls,
}

// 遺囑訊息
if (this.config.willTopic) {
  options.will = {
    topic: this.config.willTopic,
    payload: Buffer.from(this.config.willPayload || ''),
    qos: this.config.willQos ?? 0,
    retain: this.config.willRetain ?? false,
  }
}
```

**`setupEventHandlers()` 中的 `message` 回呼**（加入第三參數）：
```typescript
// Before:
this.client.on('message', (topic: string, payload: Buffer) => {
  this.handleMessage(topic, payload)
})

// After:
this.client.on('message', (topic: string, payload: Buffer, packet: IPublishPacket) => {
  this.handleMessage(topic, payload, packet)
})
```

**`handleMessage()` 方法**（加入 packet 參數並標記 isRetained）：
```typescript
// 在訊息處理中，將 packet.retain 標記到標籤讀取結果
const isRetained = packet?.retain ?? false
```

**`isRetained` 資料傳遞路徑**：
1. `message` 回呼接收 `packet.retain` → 傳入 `handleMessage()`
2. `handleMessage()` 將 `isRetained` 標記到 `this.topicCache` 的對應 entry
3. `readTags()` 從 cache 讀取時，將 `isRetained` 附加到回傳的 `ReadResult.tags[].meta` 上
4. 渲染行程的標籤顯示元件讀取 `meta.isRetained`，若為 true 顯示保留訊息圖示

需要在檔案頂部新增 import：
```typescript
import type { IPublishPacket } from 'mqtt'
```

- [ ] **Step 4: 執行測試確認通過**

Run: `pnpm test:main -- --testPathPattern=mqtt-config`
Expected: PASS

- [ ] **Step 5: 型別檢查**

Run: `pnpm typecheck`
Expected: 無錯誤

- [ ] **Step 6: 提交**

```bash
git add src/shared/types/connection.ts src/shared/types/tag.ts src/main/protocols/MqttAdapter.ts tests/unit/main/mqtt-config.test.ts
git commit -m "feat(mqtt): 暴露乾淨連線、遺囑訊息、保留訊息旗標（MQT-010/011/012）"
```

---

### Task 6: OPC UA 憑證驗證（B6 + B7）

**Files:**
- Modify: `src/shared/types/connection.ts`
- Modify: `src/main/protocols/OpcUaAdapter.ts`
- Create: `tests/unit/main/opcua-cert.test.ts`

- [ ] **Step 1: 擴充 OpcUaConfig 型別**

`src/shared/types/connection.ts`：
```typescript
export interface OpcUaConfig {
  endpointUrl: string
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt'
  securityPolicy: string
  username?: string
  password?: string
  // 新增
  authCertificatePath?: string   // PEM 憑證檔案絕對路徑
  authPrivateKeyPath?: string    // PEM 私鑰檔案絕對路徑
}
```

- [ ] **Step 2: 寫失敗測試**

建立 `tests/unit/main/opcua-cert.test.ts`：

```typescript
import os from 'os'
import path from 'path'

// Mock Electron app（Jest 環境下 app 未初始化）
jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => path.join(os.homedir(), '.connex-studio')) }
}))

import { validateCertificatePath, validatePemFormat } from '@main/protocols/OpcUaAdapter'

describe('OPC UA certificate validation', () => {
  it('accepts path under home directory', () => {
    const certPath = path.join(os.homedir(), 'certs', 'client.pem')
    expect(() => validateCertificatePath(certPath)).not.toThrow()
  })

  it('rejects path traversal attempt', () => {
    expect(() => validateCertificatePath('/etc/passwd')).toThrow(/not in allowed directory/)
  })

  it('rejects relative path', () => {
    expect(() => validateCertificatePath('../../../etc/passwd')).toThrow()
  })

  it('validates PEM certificate format', () => {
    const validPem = '-----BEGIN CERTIFICATE-----\nMIIBxx...\n-----END CERTIFICATE-----'
    expect(validatePemFormat(validPem, 'certificate')).toBe(true)
  })

  it('rejects invalid PEM format', () => {
    expect(validatePemFormat('not a certificate', 'certificate')).toBe(false)
  })

  it('validates PEM private key format', () => {
    const validKey = '-----BEGIN PRIVATE KEY-----\nMIIBxx...\n-----END PRIVATE KEY-----'
    expect(validatePemFormat(validKey, 'privateKey')).toBe(true)
  })
})
```

- [ ] **Step 3: 實作憑證驗證**

在 `src/main/protocols/OpcUaAdapter.ts` 中：

1. **刪除**被註解的 `certificateId` + `certStore` 程式碼區塊
2. **新增**匯出的驗證函式：

```typescript
import { app } from 'electron'
import os from 'os'
import path from 'path'
import fs from 'fs'

export function validateCertificatePath(filePath: string): string {
  const resolved = path.resolve(filePath)
  const homeDir = os.homedir()
  const userDataDir = app.getPath('userData')

  if (!resolved.startsWith(homeDir) && !resolved.startsWith(userDataDir)) {
    throw new Error(`Certificate path not in allowed directory: ${resolved}`)
  }
  return resolved
}

export function validatePemFormat(content: string, type: 'certificate' | 'privateKey'): boolean {
  if (type === 'certificate') {
    return content.includes('-----BEGIN CERTIFICATE-----')
  }
  return content.includes('-----BEGIN PRIVATE KEY-----') ||
         content.includes('-----BEGIN RSA PRIVATE KEY-----')
}
```

3. **修改 `getUserIdentity()`**，在原本被註解的位置插入：

```typescript
if (config.authCertificatePath && config.authPrivateKeyPath) {
  const certPath = validateCertificatePath(config.authCertificatePath)
  const keyPath = validateCertificatePath(config.authPrivateKeyPath)

  const certData = fs.readFileSync(certPath, 'utf-8')
  const keyData = fs.readFileSync(keyPath, 'utf-8')

  if (!validatePemFormat(certData, 'certificate')) {
    throw new Error('Invalid certificate format: expected PEM')
  }
  if (!validatePemFormat(keyData, 'privateKey')) {
    throw new Error('Invalid private key format: expected PEM')
  }

  return {
    type: UserTokenType.Certificate,
    certificateData: Buffer.from(certData),
    privateKey: keyData,
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `pnpm test:main -- --testPathPattern=opcua-cert`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/shared/types/connection.ts src/main/protocols/OpcUaAdapter.ts tests/unit/main/opcua-cert.test.ts
git commit -m "feat(opcua): 啟用憑證驗證（OPC-008/012）——路徑白名單 + PEM 格式驗證"
```

---

### Task 7: 合規矩陣 UI 修改（B3/B4/B5/B6-B7 前端）

**Files:**
- Modify: `src/renderer/components/connection/MqttConnectionForm.tsx`（或對等的 MQTT 表單元件）
- Modify: `src/renderer/components/connection/OpcUaConnectionForm.tsx`（或對等的 OPC UA 表單元件）
- Modify: 標籤值顯示元件（`TagValueCell.tsx` 或對等）

- [ ] **Step 1: MQTT 連線表單——新增乾淨連線勾選框**

在 MQTT 表單中新增：
```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={config.cleanSession ?? true}
    onChange={(e) => updateConfig({ cleanSession: e.target.checked })}
  />
  {t('mqtt.cleanSession')}
</label>
```

- [ ] **Step 2: MQTT 連線表單——新增遺囑訊息可摺疊區段**

```tsx
<details className="border rounded p-3">
  <summary className="cursor-pointer font-medium">{t('mqtt.willMessage.title')}</summary>
  <div className="mt-3 space-y-2">
    <input placeholder={t('mqtt.willMessage.topic')} value={config.willTopic || ''} ... />
    <textarea placeholder={t('mqtt.willMessage.payload')} value={config.willPayload || ''} ... />
    <select value={config.willQos ?? 0} ...>
      <option value={0}>QoS 0</option>
      <option value={1}>QoS 1</option>
      <option value={2}>QoS 2</option>
    </select>
    <label><input type="checkbox" checked={config.willRetain ?? false} ... /> {t('mqtt.willMessage.retain')}</label>
  </div>
</details>
```

- [ ] **Step 3: MQTT 標籤值——保留訊息圖示**

在標籤值顯示元件中，若 `meta.isRetained` 為 true，顯示小圖示：
```tsx
{tag.meta?.isRetained && (
  <span className="text-xs text-amber-500" title={t('mqtt.retained')} aria-label={t('mqtt.retained')}>📌</span>
)}
```

- [ ] **Step 4: OPC UA 連線表單——新增憑證驗證選項**

在 OPC UA 表單的驗證方式下拉中新增「憑證」選項，選中時顯示檔案選擇器：
```tsx
{config.authMode === 'certificate' && (
  <div className="space-y-2">
    <button onClick={() => selectFile('authCertificatePath', ['.pem', '.crt'])}>
      {config.authCertificatePath || t('opcua.cert.selectCertificate')}
    </button>
    <button onClick={() => selectFile('authPrivateKeyPath', ['.pem', '.key'])}>
      {config.authPrivateKeyPath || t('opcua.cert.selectPrivateKey')}
    </button>
  </div>
)}
```

檔案選擇器透過 IPC 呼叫 `dialog.showOpenDialog`。

- [ ] **Step 5: 新增對應翻譯鍵到 mqtt.json 和 opcua.json**

- [ ] **Step 6: 型別檢查**

Run: `pnpm typecheck`

- [ ] **Step 7: 提交**

```bash
git commit -m "feat: 合規矩陣 UI——MQTT 遺囑/乾淨連線/保留訊息 + OPC UA 憑證選擇器"
```

---

### Task 8: 更新合規矩陣

**Files:**
- Modify: `docs/protocol-conformance-matrix.md`

- [ ] **Step 1: 更新 7 項為「已實作」**

將以下項目的狀態從 N/A 或 Partial 改為 Implemented：
- MOD-035 (float64)
- MOD-047 (address validation)
- MQT-010 (retained messages)
- MQT-011 (will messages)
- MQT-012 (clean session)
- OPC-008 (certificate auth)
- OPC-012 (certificate validation)

- [ ] **Step 2: 提交**

```bash
git add docs/protocol-conformance-matrix.md
git commit -m "docs: 合規矩陣更新至 85/85（100%）"
```

---

## 主力批——國際化

### Task 8: i18n 基礎設施

**Files:**
- Create: `src/renderer/i18n/index.ts`
- Modify: `src/renderer/main.tsx`
- Modify: `src/renderer/stores/uiStore.ts`
- Modify: `package.json`

- [ ] **Step 1: 安裝依賴**

```bash
pnpm add i18next react-i18next
```

- [ ] **Step 2: 建立 i18n 初始化**

建立 `src/renderer/i18n/index.ts`：

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Eager-import all locale files
import enCommon from './locales/en/common.json'
import zhTWCommon from './locales/zh-TW/common.json'

// 後續翻譯檔在各 Task 中逐步新增 import

const resources = {
  en: { common: enCommon },
  'zh-TW': { common: zhTWCommon },
}

// 從 localStorage 讀取語言設定（與 uiStore 同步）
function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem('connex-ui-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.state?.language) return parsed.state.language
    }
  } catch { /* ignore */ }
  // 偵測系統語言
  const nav = navigator.language
  if (nav.startsWith('zh')) return 'zh-TW'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: import.meta.env.DEV
    ? (_lngs, _ns, key) => console.warn(`[i18n] Missing key: ${key}`)
    : undefined,
})

export default i18n
```

- [ ] **Step 3: 建立初始翻譯檔**

建立 `src/renderer/i18n/locales/en/common.json`：
```json
{
  "app.name": "Connex Studio",
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.delete": "Delete",
  "action.edit": "Edit",
  "action.add": "Add",
  "action.close": "Close",
  "action.confirm": "Confirm",
  "action.copy": "Copy",
  "action.refresh": "Refresh",
  "action.connect": "Connect",
  "action.disconnect": "Disconnect",
  "action.start": "Start",
  "action.stop": "Stop",
  "action.export": "Export",
  "action.import": "Import",
  "status.connected": "Connected",
  "status.disconnected": "Disconnected",
  "status.connecting": "Connecting...",
  "status.error": "Error",
  "language.en": "English",
  "language.zh-TW": "繁體中文",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System"
}
```

建立 `src/renderer/i18n/locales/zh-TW/common.json`：
```json
{
  "app.name": "Connex Studio",
  "action.save": "儲存",
  "action.cancel": "取消",
  "action.delete": "刪除",
  "action.edit": "編輯",
  "action.add": "新增",
  "action.close": "關閉",
  "action.confirm": "確認",
  "action.copy": "複製",
  "action.refresh": "重新整理",
  "action.connect": "連線",
  "action.disconnect": "中斷連線",
  "action.start": "開始",
  "action.stop": "停止",
  "action.export": "匯出",
  "action.import": "匯入",
  "status.connected": "已連線",
  "status.disconnected": "未連線",
  "status.connecting": "連線中...",
  "status.error": "錯誤",
  "language.en": "English",
  "language.zh-TW": "繁體中文",
  "theme.light": "亮色",
  "theme.dark": "暗色",
  "theme.system": "系統"
}
```

- [ ] **Step 4: 掛載 I18nextProvider**

修改 `src/renderer/main.tsx`：

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from '@renderer/components/common'
import './i18n'  // 初始化 i18n（必須在 App 之前）
import './styles/globals.css'

// ... 既有的 window.onerror 和 Sentry 初始化 ...

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

注意：react-i18next v14+ 不需要顯式的 `<I18nextProvider>`，只要在掛載前 import 初始化即可。

- [ ] **Step 5: 擴充 uiStore 語言狀態**

修改 `src/renderer/stores/uiStore.ts`，在介面和初始化中新增：

```typescript
// 介面新增
language: 'en' | 'zh-TW'
setLanguage: (lang: 'en' | 'zh-TW') => void

// 初始值
language: (navigator.language.startsWith('zh') ? 'zh-TW' : 'en') as 'en' | 'zh-TW',

// 動作
// 使用動態 import 避免 uiStore ↔ i18n 循環依賴
setLanguage: (lang) => {
  import('i18next').then(({ default: i18n }) => i18n.changeLanguage(lang))
  set({ language: lang })
},

// partialize 新增
language: state.language,
```

- [ ] **Step 6: 驗證建置通過**

Run: `pnpm typecheck && pnpm build`
Expected: 無錯誤

- [ ] **Step 7: 提交**

```bash
git add package.json pnpm-lock.yaml src/renderer/i18n/ src/renderer/main.tsx src/renderer/stores/uiStore.ts
git commit -m "feat(i18n): 建立國際化基礎設施——i18next + 語言狀態 + 共用翻譯檔"
```

---

### Task 9: i18n 翻譯檔——核心模組（connection, modbus, mqtt, opcua）

**Files:**
- Create: `src/renderer/i18n/locales/en/connection.json`
- Create: `src/renderer/i18n/locales/en/modbus.json`
- Create: `src/renderer/i18n/locales/en/mqtt.json`
- Create: `src/renderer/i18n/locales/en/opcua.json`
- Create: `src/renderer/i18n/locales/zh-TW/connection.json`
- Create: `src/renderer/i18n/locales/zh-TW/modbus.json`
- Create: `src/renderer/i18n/locales/zh-TW/mqtt.json`
- Create: `src/renderer/i18n/locales/zh-TW/opcua.json`
- Modify: `src/renderer/i18n/index.ts` (新增 import)
- Modify: `src/renderer/components/connection/**/*.tsx` (替換硬編碼)
- Modify: `src/renderer/components/modbus/**/*.tsx` (替換硬編碼)
- Modify: `src/renderer/components/tags/**/*.tsx` (替換硬編碼)

- [ ] **Step 1: 掃描核心模組元件，提取所有硬編碼字串**

逐一讀取 `src/renderer/components/connection/`、`modbus/`、`tags/` 下所有 `.tsx` 檔案，列出所有需要翻譯的字串。

- [ ] **Step 2: 建立 en + zh-TW 翻譯 JSON**

每個命名空間一對 JSON 檔案。鍵名使用點分隔的語義化命名（如 `connection.form.host.label`）。

- [ ] **Step 3: 在 i18n/index.ts 中新增 import 並註冊**

```typescript
import enConnection from './locales/en/connection.json'
import zhTWConnection from './locales/zh-TW/connection.json'
// ... 其他

const resources = {
  en: { common: enCommon, connection: enConnection, ... },
  'zh-TW': { common: zhTWCommon, connection: zhTWConnection, ... },
}
```

- [ ] **Step 4: 替換元件中的硬編碼字串**

在每個元件檔案頂部加入：
```typescript
import { useTranslation } from 'react-i18next'
```

在元件函式內：
```typescript
const { t } = useTranslation('connection')
```

替換所有硬編碼字串，例如：
```typescript
// Before:
<label>Host</label>
// After:
<label>{t('form.host.label')}</label>
```

- [ ] **Step 5: 型別檢查**

Run: `pnpm typecheck`
Expected: 無錯誤

- [ ] **Step 6: 提交**

```bash
git add src/renderer/i18n/ src/renderer/components/connection/ src/renderer/components/modbus/ src/renderer/components/tags/
git commit -m "feat(i18n): 核心模組翻譯——connection、modbus、mqtt、opcua"
```

---

### Task 10: i18n 翻譯檔——功能模組（dashboard, alert, collection, calculator）

**Files:**
- Create: en + zh-TW JSON for dashboard, alert, collection, calculator
- Modify: `src/renderer/i18n/index.ts`
- Modify: `src/renderer/components/dashboard/**/*.tsx`
- Modify: `src/renderer/components/alert/**/*.tsx`
- Modify: `src/renderer/components/collection/**/*.tsx`
- Modify: `src/renderer/components/calculator/**/*.tsx`

流程同 Task 9：掃描 → 建立翻譯 JSON → 註冊 → 替換 → 驗證 → 提交。

- [ ] **Step 1: 掃描功能模組元件，提取硬編碼字串**
- [ ] **Step 2: 建立 en + zh-TW 翻譯 JSON**
- [ ] **Step 3: 在 i18n/index.ts 中註冊**
- [ ] **Step 4: 替換元件硬編碼**
- [ ] **Step 5: 型別檢查 `pnpm typecheck`**
- [ ] **Step 6: 提交**

```bash
git commit -m "feat(i18n): 功能模組翻譯——dashboard、alert、collection、calculator"
```

---

### Task 11: i18n 翻譯檔——輔助模組 + 語言切換 UI

**Files:**
- Create: en + zh-TW JSON for dvr, bridge, diagnostics, export, help
- Modify: `src/renderer/i18n/index.ts`
- Modify: 剩餘元件檔案
- Modify: `src/renderer/components/layout/SidebarV2.tsx` (語言切換器)
- Modify: `src/renderer/App.tsx` (歡迎區段翻譯)

- [ ] **Step 1: 掃描輔助模組元件 + App.tsx，提取硬編碼字串**
- [ ] **Step 2: 建立 en + zh-TW 翻譯 JSON**
- [ ] **Step 3: 在 i18n/index.ts 中註冊所有剩餘命名空間**
- [ ] **Step 4: 替換元件硬編碼**
- [ ] **Step 5: 在 SidebarV2 新增語言切換下拉**

在主題切換旁新增語言切換器：
```tsx
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@renderer/stores/uiStore'

// 在主題切換 UI 附近：
const { i18n, t } = useTranslation()
const { language, setLanguage } = useUIStore()

<select
  value={language}
  onChange={(e) => setLanguage(e.target.value as 'en' | 'zh-TW')}
  className="..."
>
  <option value="en">{t('language.en')}</option>
  <option value="zh-TW">{t('language.zh-TW')}</option>
</select>
```

- [ ] **Step 6: 型別檢查 + 建置**

Run: `pnpm typecheck && pnpm build`

- [ ] **Step 7: 提交**

```bash
git commit -m "feat(i18n): 輔助模組翻譯 + 語言切換 UI——完成完整雙語支援"
```

---

## 收尾批

### Task 13: 無障礙強化（子專案 E）

**Files:**
- Modify: `src/renderer/components/layout/SidebarV2.tsx` — 包裹 `<nav>`、連線項改 `<button>`、加 `aria-label`
- Modify: `src/renderer/App.tsx` — 主內容區包裹 `<main>`
- Modify: `src/renderer/components/connection/ConnectionList.tsx` — `<ul role="list">` + `<li>`
- Modify: `src/renderer/components/tags/TagGrid.tsx` — 表格加 `role`、狀態儲存格加 `aria-live`
- Modify: `src/renderer/components/tags/TagStatusIcon.tsx` — 補齊 `aria-label`
- Modify: `src/renderer/components/common/ErrorBoundary.tsx` — 加 `role="alert"`
- Modify: `src/renderer/components/alert/AlertNotification.tsx` — 加 `aria-live="assertive"`
- Modify: `src/renderer/components/dashboard/DashboardCanvas.tsx` — widget 加 `aria-label`
- Modify: `src/renderer/components/modbus/ModbusWriteDialog.tsx` — 表單加 `aria-describedby`
- Modify: `src/renderer/components/common/UpdateBanner.tsx` — 加 `role="status"` + `aria-live`

- [ ] **Step 1: 語意化 HTML**

具體替換規則：
- `SidebarV2.tsx`：最外層導航區包裹 `<nav aria-label={t('common:nav.sidebar')}>`，所有 `<div onClick>` 連線項改為 `<button>`
- `App.tsx`：`DataExplorer` 所在的容器改為 `<main>`
- `ConnectionList.tsx`：連線清單容器改為 `<ul role="list">`，每個連線改為 `<li role="listitem">`

- [ ] **Step 2: ARIA 標記**

具體標記：
- 所有圖示按鈕加 `aria-label={t('對應動作')}`
- `TagGrid.tsx`：狀態欄加 `aria-live="polite"`，值變化會被螢幕助讀器播報
- `AlertNotification.tsx`：加 `aria-live="assertive"`（告警需立即播報）
- `UpdateBanner.tsx`：加 `role="status"` + `aria-live="polite"`

- [ ] **Step 3: 鍵盤導航驗證**

驗證以下操作鏈全部可純鍵盤完成：
- Tab → SidebarV2 連線清單 → Enter 選中連線
- Tab → 標籤表格 → Enter 編輯標籤
- Ctrl+N → 新增連線對話框 → Tab 填表 → Enter 儲存
- Escape → 關閉所有對話框（Radix UI Dialog 已內建焦點陷阱）

- [ ] **Step 4: 在翻譯檔中新增 a11y 專用鍵**

在 `common.json` 中新增：
```json
{
  "nav.sidebar": "Sidebar navigation",
  "nav.main": "Main content",
  "status.tagValue": "Tag value: {{value}}",
  "alert.notification": "Alert notification"
}
```
（zh-TW 同步翻譯）

- [ ] **Step 5: 型別檢查**

Run: `pnpm typecheck`

- [ ] **Step 6: 提交**

```bash
git commit -m "feat(a11y): 語意化 HTML + ARIA 標記 + 鍵盤導航強化"
```

---

### Task 14: 應用內說明文件（子專案 F）

**Files:**
- Create: `src/renderer/components/help/HelpPanel.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/layout/SidebarV2.tsx`
- Modify: en/help.json + zh-TW/help.json（已在 Task 11 建立基礎）

- [ ] **Step 1: 建立 HelpPanel 元件**

```tsx
// src/renderer/components/help/HelpPanel.tsx
import { useTranslation } from 'react-i18next'

interface HelpPanelProps {
  open: boolean
  onClose: () => void
}

export function HelpPanel({ open, onClose }: HelpPanelProps) {
  const { t } = useTranslation('help')

  if (!open) return null

  return (
    <aside
      className="fixed right-0 top-0 h-full w-[400px] bg-background border-l shadow-lg z-50 overflow-y-auto p-6"
      role="complementary"
      aria-label={t('panel.title')}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">{t('panel.title')}</h2>
        <button onClick={onClose} aria-label={t('action.close')}>✕</button>
      </div>

      {/* 快速入門 */}
      <section className="mb-8">
        <h3 className="font-medium mb-3">{t('quickstart.title')}</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t('quickstart.step1')}</li>
          <li>{t('quickstart.step2')}</li>
          <li>{t('quickstart.step3')}</li>
        </ol>
      </section>

      {/* 協定指南 */}
      <section className="mb-8">
        <h3 className="font-medium mb-3">{t('protocols.title')}</h3>
        {/* Modbus / MQTT / OPC UA 各一個可摺疊區段 */}
      </section>

      {/* 快捷鍵 */}
      <section className="mb-8">
        <h3 className="font-medium mb-3">{t('shortcuts.title')}</h3>
        {/* 從 useKeyboardShortcuts 提取快捷鍵列表 */}
      </section>

      {/* 關於 */}
      <section>
        <h3 className="font-medium mb-3">{t('about.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('about.version', { version: window.electronAPI?.getAppVersion?.() ?? '1.0.0' })}</p>
        <p className="text-sm text-muted-foreground">{t('about.license')}</p>
      </section>
    </aside>
  )
}
```

- [ ] **Step 2: 補充 help.json 翻譯內容**

在已建立的 `en/help.json` 和 `zh-TW/help.json` 中填入快速入門、協定指南、快捷鍵、關於的完整內容。

- [ ] **Step 3: 在 SidebarV2 加入說明按鈕**

```tsx
// 在 SidebarV2 底部（主題切換和語言切換旁邊）
<button
  onClick={() => useUIStore.getState().setHelpPanelOpen(true)}
  aria-label={t('common:action.help')}
>
  <HelpCircle className="h-4 w-4" />
</button>
```

- [ ] **Step 4: 在 App.tsx 掛載 HelpPanel**

```tsx
import { HelpPanel } from '@renderer/components/help/HelpPanel'

// 在 App 元件的 JSX 中：
<HelpPanel
  open={helpPanelOpen}
  onClose={() => setHelpPanelOpen(false)}
/>
```

在 `uiStore` 新增：
```typescript
// UIState 介面新增
helpPanelOpen: boolean
setHelpPanelOpen: (open: boolean) => void
toggleHelpPanel: () => void

// 初始值
helpPanelOpen: false,

// 動作
setHelpPanelOpen: (open) => set({ helpPanelOpen: open }),
toggleHelpPanel: () => set((state) => ({ helpPanelOpen: !state.helpPanelOpen })),
// 不需要持久化（每次啟動都關閉）
```

- [ ] **Step 5: 新增快捷鍵 Ctrl+? / Cmd+?**

在 `useKeyboardShortcuts` hook 中新增：
```typescript
{ key: '?', ctrl: true, handler: () => toggleHelpPanel() }
```

- [ ] **Step 6: 型別檢查 + 建置**

Run: `pnpm typecheck && pnpm build`

- [ ] **Step 7: 提交**

```bash
git commit -m "feat: 新增應用內說明面板——快速入門、協定指南、快捷鍵、關於"
```

---

## 最終驗證 + 推送

### Task 15: 全面驗證 + 推送（子專案 G）

- [ ] **Step 1: 完整測試**

Run: `pnpm test`
Expected: 所有測試通過

- [ ] **Step 2: 型別檢查**

Run: `pnpm typecheck`
Expected: 零錯誤

- [ ] **Step 3: Lint 檢查**

Run: `pnpm lint`
Expected: 零錯誤

- [ ] **Step 4: 建置**

Run: `pnpm build`
Expected: 建置成功

- [ ] **Step 5: 推送**

```bash
git push origin main
```

---

## 檢查點

| 完成 Task | 驗證項目 |
|-----------|---------|
| Task 1-2 | `pnpm lint` 零錯誤、`pnpm build` 成功 |
| Task 3-8 | `pnpm test:main` 全部通過、合規矩陣 85/85、UI 表單功能正確 |
| Task 9-12 | `pnpm typecheck` 通過、雙語切換可正常運作 |
| Task 13-14 | 鍵盤導航可操作核心功能、說明面板可開關 |
| Task 15 | 全部通過 + 推送成功 |
