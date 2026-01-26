# Modbus TCP Industrial Features Design

**Created**: 2026-01-26
**Status**: Approved
**Branch**: `feat/ui-ux-redesign`

## Overview

為 Connex Studio 的 Modbus TCP 連線增加工業級功能，確保與各廠商 PLC 的相容性。

## Feature 1: Byte Order Support

### 問題

現有 `ModbusTcpAdapter` hardcoded Big-Endian，無法處理不同廠商的 byte order 慣例。

### 解決方案

支援 4 種 byte order，可在 Connection 層級設定預設，Tag 層級可覆寫。

### Byte Order 類型

| 名稱 | 別名 | Register 排列 (0x12345678) | 常見廠商 |
|------|------|---------------------------|----------|
| Big-Endian | ABCD | `[0x1234, 0x5678]` | Siemens S7、ABB |
| Little-Endian | DCBA | `[0x5678, 0x1234]` | 部分 Allen-Bradley |
| Mid-Big | BADC | `[0x3412, 0x7856]` | Schneider Modicon |
| Mid-Little | CDAB | `[0x7856, 0x3412]` | GE Fanuc |

### Type 定義

```typescript
// src/shared/types/modbus.ts
export type ByteOrder = 'ABCD' | 'DCBA' | 'BADC' | 'CDAB'

// 擴充 ModbusTcpConfig
export interface ModbusTcpConfig {
  host: string
  port: number
  unitId: number
  timeout: number
  defaultByteOrder: ByteOrder  // 新增
}

// 擴充 ModbusAddress
export interface ModbusAddress {
  type: 'modbus'
  registerType: 'holding' | 'input' | 'coil' | 'discrete'
  address: number
  length: number
  byteOrder?: ByteOrder  // 新增：覆寫連線預設
}
```

### UI 設計

#### 連線對話框

在 Advanced Options 新增 Byte Order 選擇器，附帶視覺化範例：
- 顯示 FLOAT32 值 123.456 的 bytes 排列
- 標示常見廠商
- 提示「不確定？用工具 > Byte Order 轉換器判斷」

#### Tag 編輯器

- 32-bit 資料型別（INT32、UINT32、FLOAT32）顯示 Byte Order 下拉選單
- 預設選項為「連線預設」
- Tag Grid 中非預設 Byte Order 顯示小標籤

---

## Feature 2: Connection Health Monitoring

### Metrics 定義

```typescript
export interface ConnectionMetrics {
  latencyMs: number           // 最近一次請求往返時間
  latencyAvgMs: number        // 最近 10 次平均延遲
  requestCount: number        // 總請求次數
  errorCount: number          // 錯誤次數
  errorRate: number           // 錯誤率 (0-1)
  lastSuccessAt: number       // 最後成功時間戳
  lastErrorAt?: number        // 最後錯誤時間戳
  lastErrorMessage?: string   // 最後錯誤訊息
  reconnectAttempts: number   // 重連嘗試次數
}
```

### UI 呈現

#### 狀態列（DataExplorer 頂部）

```
🟢 PLC-01 (Modbus TCP)
⏱ 12ms │ 📊 Avg: 15ms │ ✓ 1,234 req │ ⚠ 2 errors (0.1%)
```

#### 狀態顏色規則

| 指標 | 🟢 正常 | 🟡 警告 | 🔴 異常 |
|------|--------|--------|--------|
| Latency | < 100ms | 100-500ms | > 500ms |
| Error Rate | < 1% | 1-5% | > 5% |
| 最後成功 | < 10s | 10-30s | > 30s |

#### 展開詳細面板

點擊狀態列展開：即時延遲圖、平均延遲、成功/失敗統計、連線時間、重連次數。

---

## Feature 3: Batch Read Optimization

### 問題

逐個 Tag 讀取造成大量網路請求，100 Tags = 100 次往返。

### 解決方案

合併相鄰地址為單一請求：

```
優化前：HR100, HR101, HR102 → 3 requests
優化後：HR100-102 → 1 request
```

### 合併規則

```typescript
interface BatchReadConfig {
  enabled: boolean       // 預設 true
  maxGap: number         // 允許最大地址間隙（預設: 10）
  maxRegisters: number   // 單次最大 register 數（預設: 125）
}
```

- 地址連續或間隙 ≤ maxGap → 合併
- 間隙 > maxGap → 分開請求
- 總長度 > 125 → 拆分（Modbus 規範限制）
- 不同 Unit ID → 不合併

### UI 設定

連線進階選項中的「讀取優化」區塊：
- 啟用/停用開關
- 最大地址間隙輸入框

---

## Feature 4: Raw Frame Diagnostics

### 用途

除錯時需要查看原始 Modbus 封包。

### 資料結構

```typescript
export interface FrameLog {
  id: string
  timestamp: number
  direction: 'tx' | 'rx'
  rawHex: string
  parsed: ParsedFrame
  tagId?: string
  latencyMs?: number
}

export interface ParsedFrame {
  transactionId: number
  protocolId: number
  unitId: number
  functionCode: number
  data: string
}
```

### UI 設計

DataExplorer 底部可展開的診斷面板：
- 啟用開關（預設關閉，影響效能）
- 顯示 TX/RX 封包，hex bytes 著色區分欄位
- Hover 顯示欄位說明 tooltip
- 最多保留 500 筆（Ring Buffer）
- 可匯出 .log/.csv

---

## Feature 5: Multi Unit ID Support

### 使用場景

Modbus Gateway 後面連接多個 RTU 設備，每個設備不同 Unit ID。

### 解決方案

Tag 層級可覆寫 Unit ID：

```typescript
export interface ModbusAddress {
  // ... existing fields
  unitId?: number  // 覆寫連線預設
}
```

### UI 設計

- Tag 編輯器新增 Unit ID 欄位
- Tag Grid 中非預設 Unit ID 顯示 `#N` 標籤
- 批次讀取按 Unit ID 分組

---

## Implementation Priority

### Phase 1: 核心資料流打通
1. Type 定義擴充（ByteOrder, unitId, ConnectionMetrics）
2. ModbusTcpAdapter 支援 configurable Byte Order
3. UI 連接到真實 IPC（NewConnectionDialog, DataExplorer）

### Phase 2: 工業級功能
1. 批次讀取優化
2. 連線健康監控
3. 多 Unit ID 支援

### Phase 3: 診斷工具
1. Raw Frame 診斷面板

---

## Files to Modify/Create

### Types (shared)
- `src/shared/types/connection.ts` - 擴充 ModbusTcpConfig, 新增 ConnectionMetrics
- `src/shared/types/tag.ts` - 擴充 ModbusAddress
- `src/shared/types/modbus.ts` - 新增 ByteOrder, BatchReadConfig
- `src/shared/types/diagnostics.ts` - 新增 FrameLog, ParsedFrame

### Main Process
- `src/main/protocols/ModbusTcpAdapter.ts` - Byte Order, batch read, metrics
- `src/main/services/ConnectionManager.ts` - metrics tracking
- `src/main/ipc/connection.ts` - metrics IPC channel

### Renderer
- `src/renderer/components/connection/NewConnectionDialog.tsx` - Byte Order UI
- `src/renderer/components/explorer/DataExplorer.tsx` - metrics status bar
- `src/renderer/components/tags/TagEditor.tsx` - Byte Order, Unit ID fields
- `src/renderer/components/diagnostics/FrameDiagnostics.tsx` - 新元件
