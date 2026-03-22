# Modbus 地址計算修復設計

**日期**: 2026-01-27
**狀態**: 待實作
**相關元件**: GenerateTab, ScanTab, tagGenerator
**版本**: v2 (審查後更新)

---

## 問題摘要

### 問題 1：GenerateTab 沒有解析傳統地址 (嚴重)

**位置**: `GenerateTab.tsx`

使用者輸入傳統地址 `40001`，程式直接將其作為 protocol address 儲存，導致：
- 儲存 `address: 40001` (應為 `address: 0`)
- 顯示時計算為 `40001 + 40001 = 80002`

### 問題 2：GenerateTab 地址遞增沒考慮資料型態 (中等)

**位置**: `GenerateTab.tsx` 第 44 行

不論資料型態，地址都只 +1。FLOAT32 佔用 2 registers，應該 +2。

### 問題 3：GenerateTab 預覽地址遞增錯誤 (輕微)

**位置**: `GenerateTab.tsx` 第 156-160 行

預覽顯示的地址遞增邏輯與問題 2 相同。

### 問題 4：ScanTab 地址遞增沒考慮資料型態 (中等)

**位置**: `ScanTab.tsx` 第 100 行、第 142 行

Range Create 和 Live Scan 模式都有相同問題。

---

## 資料型態 Register 對照表

| 資料型態 | Registers | 地址遞增量 |
|----------|-----------|------------|
| INT16 / UINT16 | 1 | +1 |
| INT32 / UINT32 | 2 | +2 |
| FLOAT32 | 2 | +2 |
| FLOAT64 | 4 | +4 |
| BOOLEAN | 1 | +1 |
| STRING | 1 | +1 |

---

## 解決方案：重構共用邏輯

### 新增檔案

**`src/shared/utils/tagGenerator.ts`**

提供統一的 tag 生成邏輯。

---

## 實作細節

### tagGenerator.ts 完整實作

```typescript
import type { Tag, DataType, ModbusAddress } from '@shared/types/tag'
import { DATA_TYPE_INFO } from '@shared/types/tag'
import { toTraditionalAddress } from './modbusAddress'

// ============================================================================
// Types
// ============================================================================

export type GenerateMode = 'sequential' | 'range'

export interface GenerateTagsOptions {
  connectionId: string
  registerType: ModbusAddress['registerType']
  startAddress: number      // 0-based protocol address
  dataType: DataType
  quantity: number
  mode: GenerateMode
  namingPattern?: string    // 預設 'Tag_{n}'，支援 {n}, {addr}, {type}
  startIndex?: number       // {n} 起始值，預設 1
  byteOrder?: ModbusAddress['byteOrder']  // 多 register 類型的位元組順序
}

export interface TagAddressInfo {
  name: string
  address: number              // protocol address (0-based)
  traditionalAddress: number   // 傳統地址 (40001-based)
  addressRange: [number, number] // 傳統地址佔用範圍 [start, end]
}

export interface PreviewInfo {
  firstTag: TagAddressInfo
  lastTag: TagAddressInfo
  sampleTags: TagAddressInfo[]  // 前 3 個 + 最後 1 個，供 UI 顯示
  totalTags: number
  addressStep: number
  registerType: ModbusAddress['registerType']
  dataType: DataType
}

export interface ValidationResult {
  valid: boolean
  error?: string
  endAddress?: number
}

export interface OverlapConflict {
  newTagName: string
  newTagRange: [number, number]
  existingTagName: string
  existingTagRange: [number, number]
}

export interface OverlapCheckResult {
  hasOverlap: boolean
  conflicts: OverlapConflict[]
}

// ============================================================================
// Constants
// ============================================================================

/** 各 register type 的最大 protocol address */
const MAX_PROTOCOL_ADDRESS: Record<ModbusAddress['registerType'], number> = {
  coil: 9998,       // 傳統 1-9999
  discrete: 9998,   // 傳統 10001-19999
  input: 9998,      // 傳統 30001-39999
  holding: 9998,    // 傳統 40001-49999
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * 取得資料型態的地址步進值（register 數量）
 */
export function getAddressStep(dataType: DataType): number {
  return DATA_TYPE_INFO[dataType]?.registers ?? 1
}

/**
 * 產生 tag 名稱
 * 支援變數：{n} 序號, {addr} 傳統地址, {type} register 類型
 */
function formatTagName(
  pattern: string,
  index: number,
  traditionalAddress: number,
  registerType: string
): string {
  return pattern
    .replace('{n}', String(index).padStart(2, '0'))
    .replace('{addr}', String(traditionalAddress))
    .replace('{type}', registerType)
}

/**
 * 建立單一 tag 的地址資訊
 */
function createTagAddressInfo(
  name: string,
  protocolAddress: number,
  registerType: ModbusAddress['registerType'],
  dataType: DataType
): TagAddressInfo {
  const step = getAddressStep(dataType)
  const traditionalAddress = toTraditionalAddress(registerType, protocolAddress)

  return {
    name,
    address: protocolAddress,
    traditionalAddress,
    addressRange: [traditionalAddress, traditionalAddress + step - 1],
  }
}

/**
 * 產生 tags
 */
export function generateTags(options: GenerateTagsOptions): Partial<Tag>[] {
  const {
    connectionId,
    registerType,
    startAddress,
    dataType,
    quantity,
    mode,
    namingPattern = 'Tag_{n}',
    startIndex = 1,
    byteOrder,
  } = options

  const step = mode === 'sequential' ? getAddressStep(dataType) : 1
  const registerLength = DATA_TYPE_INFO[dataType]?.registers ?? 1
  const tags: Partial<Tag>[] = []

  for (let i = 0; i < quantity; i++) {
    const protocolAddress = startAddress + (i * step)
    const traditionalAddress = toTraditionalAddress(registerType, protocolAddress)
    const index = startIndex + i
    const name = formatTagName(namingPattern, index, traditionalAddress, registerType)

    const tag: Partial<Tag> = {
      connectionId,
      name,
      address: {
        type: 'modbus',
        registerType,
        address: protocolAddress,
        length: registerLength,
      } as ModbusAddress,
      dataType,
      displayFormat: {
        decimals: dataType.includes('float') ? 2 : 0,
        unit: '',
      },
      thresholds: {},
      enabled: true,
    }

    // 多 register 類型加上 byte order
    if (registerLength > 1 && byteOrder) {
      (tag.address as ModbusAddress).byteOrder = byteOrder
    }

    tags.push(tag)
  }

  return tags
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * 驗證地址範圍是否合法
 */
export function validateRange(
  startAddress: number,
  quantity: number,
  dataType: DataType,
  registerType: ModbusAddress['registerType']
): ValidationResult {
  if (quantity < 1) {
    return { valid: false, error: '數量必須至少為 1' }
  }
  if (startAddress < 0) {
    return { valid: false, error: '起始地址不能為負數' }
  }

  const step = getAddressStep(dataType)
  const lastTagStart = startAddress + (quantity - 1) * step
  const lastTagEnd = lastTagStart + step - 1
  const maxAddr = MAX_PROTOCOL_ADDRESS[registerType]

  if (lastTagEnd > maxAddr) {
    const maxTraditional = toTraditionalAddress(registerType, maxAddr)
    return {
      valid: false,
      error: `超出 ${registerType} register 最大地址 (${maxTraditional})`,
      endAddress: lastTagEnd,
    }
  }

  return { valid: true, endAddress: lastTagEnd }
}

/**
 * 檢測地址重疊
 */
export function detectAddressOverlap(
  newTags: Partial<Tag>[],
  existingTags: Tag[]
): OverlapCheckResult {
  const conflicts: OverlapConflict[] = []

  for (const newTag of newTags) {
    if (newTag.address?.type !== 'modbus') continue

    const newAddr = newTag.address as ModbusAddress
    const newStep = getAddressStep(newTag.dataType ?? 'int16')
    const newStart = newAddr.address
    const newEnd = newStart + newStep - 1
    const newTraditionalStart = toTraditionalAddress(newAddr.registerType, newStart)
    const newTraditionalEnd = toTraditionalAddress(newAddr.registerType, newEnd)

    for (const existingTag of existingTags) {
      if (existingTag.address?.type !== 'modbus') continue

      const existingAddr = existingTag.address as ModbusAddress

      // 不同 register type 不會重疊
      if (existingAddr.registerType !== newAddr.registerType) continue

      const existingStep = getAddressStep(existingTag.dataType)
      const existingStart = existingAddr.address
      const existingEnd = existingStart + existingStep - 1
      const existingTraditionalStart = toTraditionalAddress(existingAddr.registerType, existingStart)
      const existingTraditionalEnd = toTraditionalAddress(existingAddr.registerType, existingEnd)

      // 檢查範圍是否重疊
      const hasOverlap = !(newEnd < existingStart || newStart > existingEnd)

      if (hasOverlap) {
        conflicts.push({
          newTagName: newTag.name ?? 'Unknown',
          newTagRange: [newTraditionalStart, newTraditionalEnd],
          existingTagName: existingTag.name,
          existingTagRange: [existingTraditionalStart, existingTraditionalEnd],
        })
      }
    }
  }

  return {
    hasOverlap: conflicts.length > 0,
    conflicts,
  }
}

// ============================================================================
// Preview Functions
// ============================================================================

/**
 * 計算預覽資訊（給 UI 顯示用）
 */
export function getPreviewInfo(options: GenerateTagsOptions): PreviewInfo {
  const {
    startAddress,
    quantity,
    dataType,
    namingPattern = 'Tag_{n}',
    startIndex = 1,
    registerType,
  } = options

  const step = getAddressStep(dataType)
  const sampleTags: TagAddressInfo[] = []

  // 產生範例 tags：前 3 個 + 最後 1 個
  const sampleIndices = quantity <= 4
    ? Array.from({ length: quantity }, (_, i) => i)
    : [0, 1, 2, quantity - 1]

  for (const i of sampleIndices) {
    const protocolAddress = startAddress + (i * step)
    const traditionalAddress = toTraditionalAddress(registerType, protocolAddress)
    const index = startIndex + i
    const name = formatTagName(namingPattern, index, traditionalAddress, registerType)

    sampleTags.push(createTagAddressInfo(name, protocolAddress, registerType, dataType))
  }

  const firstTag = sampleTags[0]
  const lastTag = sampleTags[sampleTags.length - 1]

  return {
    firstTag,
    lastTag,
    sampleTags,
    totalTags: quantity,
    addressStep: step,
    registerType,
    dataType,
  }
}

/**
 * 從地址範圍計算可建立的 tag 數量
 * （用於 ScanTab Range Create 模式）
 */
export function calculateTagCountFromRange(
  startAddress: number,
  endAddress: number,
  dataType: DataType
): number {
  if (endAddress < startAddress) return 0

  const step = getAddressStep(dataType)
  const rangeSize = endAddress - startAddress + 1

  // 計算可容納幾個完整的 tags
  let count = 0
  for (let addr = startAddress; addr <= endAddress; addr += step) {
    if (addr + step - 1 <= endAddress) {
      count++
    }
  }

  return count
}
```

---

## UI 改進設計

### GenerateTab 預覽區塊

```tsx
{/* Preview - 顯示傳統地址和範圍 */}
{preview && (
  <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
      </div>
      {preview.addressStep > 1 && (
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {preview.dataType} = {preview.addressStep} registers/tag
        </span>
      )}
    </div>

    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 font-mono">
      {preview.sampleTags.map((tag, idx) => (
        <React.Fragment key={tag.address}>
          {/* 如果是第 4 個且總數 > 4，顯示省略號 */}
          {idx === 3 && preview.totalTags > 4 && (
            <p className="text-gray-400 dark:text-gray-600 pl-4">...</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-900 dark:text-white">{tag.name}</span>
            <span className="text-gray-400">→</span>
            <span>
              {tag.addressRange[0] === tag.addressRange[1]
                ? tag.addressRange[0]
                : `${tag.addressRange[0]}-${tag.addressRange[1]}`
              }
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>
)}
```

### ScanTab 數量提示

```tsx
{/* Tag Count Preview - 顯示詳細資訊 */}
{validation.valid && actualTagCount > 0 && (
  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
    <p className="text-sm text-blue-600 dark:text-blue-400">
      將建立 <strong>{actualTagCount}</strong> 個 tags
    </p>

    {getAddressStep(dataType) > 1 && (
      <div className="text-xs text-blue-500/80 dark:text-blue-400/80 space-y-1">
        <p>
          ⚠️ {DATA_TYPE_INFO[dataType].label} 每個 tag 佔用 {getAddressStep(dataType)} 個 registers
        </p>
        <p>
          地址範圍 {startParsed?.traditional}-{endParsed?.traditional}
          共 {endParsed!.address - startParsed!.address + 1} 個 registers
          → 可建立 {actualTagCount} 個 tags
        </p>
      </div>
    )}
  </div>
)}
```

### 地址重疊警告

```tsx
{/* Overlap Warning */}
{overlapResult?.hasOverlap && (
  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          偵測到地址重疊
        </p>
        <ul className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80 space-y-0.5">
          {overlapResult.conflicts.slice(0, 3).map((conflict, idx) => (
            <li key={idx}>
              {conflict.newTagName} ({conflict.newTagRange[0]}-{conflict.newTagRange[1]})
              與現有 {conflict.existingTagName} ({conflict.existingTagRange[0]}-{conflict.existingTagRange[1]}) 重疊
            </li>
          ))}
          {overlapResult.conflicts.length > 3 && (
            <li>...還有 {overlapResult.conflicts.length - 3} 個重疊</li>
          )}
        </ul>
      </div>
    </div>
  </div>
)}
```

---

## 測試計畫

### 單元測試 (tagGenerator.test.ts)

```typescript
import {
  getAddressStep,
  generateTags,
  validateRange,
  detectAddressOverlap,
  getPreviewInfo,
  calculateTagCountFromRange,
} from './tagGenerator'

describe('getAddressStep', () => {
  test.each([
    ['int16', 1],
    ['uint16', 1],
    ['int32', 2],
    ['uint32', 2],
    ['float32', 2],
    ['float64', 4],
    ['boolean', 1],
    ['string', 1],
  ])('%s 應返回 %i', (dataType, expected) => {
    expect(getAddressStep(dataType as any)).toBe(expected)
  })
})

describe('generateTags', () => {
  test('sequential mode: FLOAT32 地址應每次 +2', () => {
    const tags = generateTags({
      connectionId: 'test',
      registerType: 'holding',
      startAddress: 0,
      dataType: 'float32',
      quantity: 3,
      mode: 'sequential',
    })

    expect(tags).toHaveLength(3)
    expect((tags[0].address as any).address).toBe(0)
    expect((tags[1].address as any).address).toBe(2)
    expect((tags[2].address as any).address).toBe(4)
  })

  test('應包含 byteOrder（多 register 類型）', () => {
    const tags = generateTags({
      connectionId: 'test',
      registerType: 'holding',
      startAddress: 0,
      dataType: 'float32',
      quantity: 1,
      mode: 'sequential',
      byteOrder: 'little-endian',
    })

    expect((tags[0].address as any).byteOrder).toBe('little-endian')
  })

  test('名稱格式化應正確', () => {
    const tags = generateTags({
      connectionId: 'test',
      registerType: 'holding',
      startAddress: 0,
      dataType: 'int16',
      quantity: 2,
      mode: 'sequential',
      namingPattern: 'Sensor_{n}_{addr}',
      startIndex: 5,
    })

    expect(tags[0].name).toBe('Sensor_05_40001')
    expect(tags[1].name).toBe('Sensor_06_40002')
  })
})

describe('validateRange', () => {
  test('數量為 0 應失敗', () => {
    const result = validateRange(0, 0, 'int16', 'holding')
    expect(result.valid).toBe(false)
  })

  test('負數地址應失敗', () => {
    const result = validateRange(-1, 1, 'int16', 'holding')
    expect(result.valid).toBe(false)
  })

  test('超出最大地址應失敗', () => {
    // holding max protocol address = 9998
    // FLOAT32 需要 2 registers，從 9998 開始會超出
    const result = validateRange(9998, 2, 'float32', 'holding')
    expect(result.valid).toBe(false)
  })

  test('邊界值應成功', () => {
    // 從 9996 開始，2 個 FLOAT32
    // 9996 + (1 * 2) = 9998, 最後一個用 9998-9999 ❌ 超出
    // 從 9995 開始
    // 9995 + (1 * 2) = 9997, 最後一個用 9997-9998 ✓
    const result = validateRange(9995, 2, 'float32', 'holding')
    expect(result.valid).toBe(true)
  })
})

describe('detectAddressOverlap', () => {
  test('應偵測重疊地址', () => {
    const existingTags = [{
      id: '1',
      connectionId: 'test',
      name: 'Existing',
      address: { type: 'modbus', registerType: 'holding', address: 0, length: 2 },
      dataType: 'float32',
    }] as any[]

    const newTags = [{
      name: 'New',
      address: { type: 'modbus', registerType: 'holding', address: 1, length: 2 },
      dataType: 'float32',
    }] as any[]

    const result = detectAddressOverlap(newTags, existingTags)
    expect(result.hasOverlap).toBe(true)
    expect(result.conflicts).toHaveLength(1)
  })

  test('不同 register type 不應重疊', () => {
    const existingTags = [{
      id: '1',
      connectionId: 'test',
      name: 'Existing',
      address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
      dataType: 'int16',
    }] as any[]

    const newTags = [{
      name: 'New',
      address: { type: 'modbus', registerType: 'input', address: 0, length: 1 },
      dataType: 'int16',
    }] as any[]

    const result = detectAddressOverlap(newTags, existingTags)
    expect(result.hasOverlap).toBe(false)
  })
})

describe('calculateTagCountFromRange', () => {
  test('INT16 範圍 0-9 應返回 10', () => {
    expect(calculateTagCountFromRange(0, 9, 'int16')).toBe(10)
  })

  test('FLOAT32 範圍 0-9 應返回 5', () => {
    // 0-1, 2-3, 4-5, 6-7, 8-9
    expect(calculateTagCountFromRange(0, 9, 'float32')).toBe(5)
  })

  test('FLOAT64 範圍 0-9 應返回 2', () => {
    // 0-3, 4-7 (8-9 不足 4 個)
    expect(calculateTagCountFromRange(0, 9, 'float64')).toBe(2)
  })

  test('範圍不足一個 tag 應返回 0', () => {
    // FLOAT32 需要 2 個 registers，範圍 0-0 只有 1 個
    expect(calculateTagCountFromRange(0, 0, 'float32')).toBe(0)
  })
})

describe('getPreviewInfo', () => {
  test('應返回正確的傳統地址', () => {
    const preview = getPreviewInfo({
      connectionId: 'test',
      registerType: 'holding',
      startAddress: 0,
      dataType: 'float32',
      quantity: 5,
      mode: 'sequential',
    })

    expect(preview.firstTag.traditionalAddress).toBe(40001)
    expect(preview.firstTag.addressRange).toEqual([40001, 40002])
    expect(preview.lastTag.traditionalAddress).toBe(40009) // 0 + 4*2 = 8 → 40009
    expect(preview.lastTag.addressRange).toEqual([40009, 40010])
  })

  test('sampleTags 數量 <= 4 時應全部顯示', () => {
    const preview = getPreviewInfo({
      connectionId: 'test',
      registerType: 'holding',
      startAddress: 0,
      dataType: 'int16',
      quantity: 3,
      mode: 'sequential',
    })

    expect(preview.sampleTags).toHaveLength(3)
  })

  test('sampleTags 數量 > 4 時應顯示前 3 + 最後 1', () => {
    const preview = getPreviewInfo({
      connectionId: 'test',
      registerType: 'holding',
      startAddress: 0,
      dataType: 'int16',
      quantity: 10,
      mode: 'sequential',
    })

    expect(preview.sampleTags).toHaveLength(4)
    expect(preview.sampleTags[3].address).toBe(9) // 最後一個
  })
})
```

---

## 檔案變更清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/shared/utils/tagGenerator.ts` | 新增 | 共用 tag 生成邏輯 |
| `src/shared/utils/tagGenerator.test.ts` | 新增 | 單元測試 |
| `src/renderer/components/tags/GenerateTab.tsx` | 修改 | 使用共用函數 + ModbusAddressInput + 新預覽 UI |
| `src/renderer/components/tags/ScanTab.tsx` | 修改 | 使用共用函數 + 地址重疊檢測 + 數量提示優化 |

---

## 實作優先級

| 優先級 | 項目 | 狀態 |
|--------|------|------|
| P0 | tagGenerator.ts 核心邏輯 | 待實作 |
| P0 | GenerateTab 使用 ModbusAddressInput | 待實作 |
| P0 | 預覽顯示傳統地址 + 範圍 | 待實作 |
| P0 | ScanTab 地址步進修正 | 待實作 |
| P1 | 地址重疊檢測 | 待實作 |
| P1 | ScanTab 數量提示優化 | 待實作 |
| P2 | 單元測試 | 待實作 |

---

## 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 現有 tags 地址錯誤 | 中 | 中 | 文檔說明，使用者需手動修正 |
| 預覽與實際不符 | 低 | 低 | 共用同一函數 |
| 效能問題 | 低 | 低 | 生成邏輯簡單 |
