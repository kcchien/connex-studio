# Modbus TCP UX Redesign - Implementation Tasks

> 設計文件: `docs/plans/2026-01-26-modbus-ux-redesign.md`

## Task 狀態說明

- [ ] 待開始
- [x] 已完成

---

## Phase 1: 建立連線流程

### P1-1: 連線表單欄位分離

**目標**: 將 Address 欄位拆分為 Host 和 Port 兩個獨立欄位

**修改檔案**:

- `src/renderer/components/connection/NewConnectionDialog.tsx`

**具體變更**:

1. 移除現有的 `address` 單一欄位
2. 新增 `host` 欄位 (text input)
3. 新增 `port` 欄位 (text input, 非 number type)
4. 更新 form state 結構
5. 更新 `parseHostPort()` 邏輯或移除（不再需要解析）

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- NewConnectionDialog

# 手動驗證
1. 開啟 New Connection Dialog
2. 確認 Host 和 Port 為獨立欄位
3. 確認可分別輸入值
```

---

### P1-2: Port 預設值依協定自動填入

**目標**: 切換協定時自動帶入對應的預設 Port

**修改檔案**:

- `src/renderer/components/connection/NewConnectionDialog.tsx`

**具體變更**:

1. 新增 `DEFAULT_PORTS` 常數：
   ```typescript
   const DEFAULT_PORTS: Record<Protocol, number> = {
     modbus: 502,
     mqtt: 1883,
     opcua: 4840,
   }
   ```
2. 在 protocol 選擇 onChange 時，若 port 為空或為上一個協定的預設值，則更新為新協定預設值
3. 若用戶已手動輸入非預設值，則保留用戶輸入

**驗證方式**:

```bash
# 手動驗證
1. 開啟 New Connection Dialog
2. 選擇 Modbus → Port 顯示 502
3. 切換到 MQTT → Port 顯示 1883
4. 手動改 Port 為 1234
5. 切換到 OPC UA → Port 保持 1234（用戶已修改，不覆蓋）
```

---

### P1-3: Host 輸入驗證

**目標**: 即時驗證 Host 欄位格式

**修改檔案**:

- `src/renderer/components/connection/NewConnectionDialog.tsx`
- `src/shared/utils/validation.ts` (新增)

**具體變更**:

1. 建立 `validation.ts` 工具模組：
   ```typescript
   export function validateHost(value: string): { valid: boolean; error?: string }
   export function validatePort(value: string): { valid: boolean; error?: string }
   export function isValidIPv4(ip: string): boolean
   export function isValidHostname(hostname: string): boolean
   ```
2. Host 驗證規則：
   - 不可為空
   - IPv4: 每段 0-255，共 4 段
   - Hostname: 字母、數字、`-`、`.`，不可 `-` 開頭
3. 輸入時 debounce 300ms 後驗證
4. 錯誤時顯示紅框 + 錯誤訊息

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- validation

# 手動驗證
1. 輸入 "192.168.1.100" → 通過
2. 輸入 "192.168.1.999" → 錯誤 "IP 位址格式無效"
3. 輸入 "plc-01.local" → 通過
4. 輸入 "-invalid" → 錯誤 "Hostname 不可以 - 開頭"
5. 清空欄位 → 錯誤 "Host 為必填"
```

---

### P1-4: Port 輸入驗證

**目標**: 即時驗證 Port 欄位範圍

**修改檔案**:

- `src/renderer/components/connection/NewConnectionDialog.tsx`
- `src/shared/utils/validation.ts`

**具體變更**:

1. Port 驗證規則：
   - 不可為空
   - 只允許數字
   - 範圍 1-65535
2. 使用 `type="text"` + `inputMode="numeric"` 避免 number input 問題
3. 即時過濾非數字字元
4. 錯誤時顯示紅框 + 錯誤訊息

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- validation

# 手動驗證
1. 輸入 "502" → 通過
2. 輸入 "70000" → 錯誤 "Port 範圍應為 1-65535"
3. 輸入 "abc" → 自動過濾為空
4. 輸入 "0" → 錯誤 "Port 範圍應為 1-65535"
```

---

### P1-5: Test Connection 按鈕功能

**目標**: 實作 Test 按鈕，只測試連線不建立持久連線

**修改檔案**:

- `src/renderer/components/connection/NewConnectionDialog.tsx`
- `src/main/ipc/connection.ts`
- `src/shared/types/ipc.ts`
- `src/preload/index.ts`

**具體變更**:

1. 新增 IPC channel `connection:test`
2. Main process handler：
   - 嘗試 TCP 連線 (timeout 5 秒)
   - 成功後立即斷開
   - 回傳 `{ success: true }` 或 `{ success: false, error: string }`
3. Renderer：
   - 點擊時禁用按鈕，顯示 "Testing..."
   - 成功：顯示 ✓ "Connection successful" (綠色)
   - 失敗：顯示 ✗ + 錯誤訊息 (紅色)
4. 錯誤訊息轉換為人類可讀

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- NewConnectionDialog
pnpm test:main -- connection

# 手動驗證（需要實際 Modbus 設備或模擬器）
1. 輸入有效的 Host/Port
2. 點擊 Test → 顯示 Testing...
3. 成功 → 顯示綠色成功訊息
4. 輸入無效的 Host
5. 點擊 Test → 顯示紅色錯誤訊息
```

---

### P1-6: 連線狀態指示器元件

**目標**: 建立可重用的連線狀態指示器元件

**修改檔案**:

- `src/renderer/components/connection/ConnectionStatusIndicator.tsx` (新增)
- `src/renderer/components/connection/index.ts`

**具體變更**:

1. 建立 `ConnectionStatusIndicator` 元件：
   ```typescript
   type Status = 'connected' | 'connecting' | 'disconnected' | 'error'

   interface Props {
     status: Status
     showLabel?: boolean
   }
   ```
2. 狀態顏色：
   - connected: 綠色
   - connecting: 黃色 + 旋轉動畫
   - disconnected: 灰色
   - error: 紅色
3. 支援純圖示或圖示+文字兩種模式

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- ConnectionStatusIndicator

# 手動驗證
1. 在 Storybook 或測試頁面檢視四種狀態
2. 確認顏色和動畫正確
```

---

### P1-7: 主畫面顯示連線狀態

**目標**: 在主畫面頂部顯示當前連線狀態

**修改檔案**:

- `src/renderer/components/connection/ConnectionHeader.tsx` (或現有 header 元件)

**具體變更**:

1. 整合 `ConnectionStatusIndicator`
2. 從 `connectionStore` 讀取當前連線狀態
3. 顯示格式：`[Connection Name] ● [Status]`

**驗證方式**:

```bash
# 手動驗證
1. 未連線時顯示 "Disconnected" (灰色)
2. 連線中顯示 "Connecting" (黃色動畫)
3. 連線成功顯示 "Connected" (綠色)
4. 斷線顯示 "Error" 或 "Disconnected"
```

---

### P1-8: 斷線 Toast 通知

**目標**: 非預期斷線時顯示 Toast 通知

**修改檔案**:

- `src/renderer/stores/connectionStore.ts`
- `src/renderer/components/layout/ToastProvider.tsx` (若無則新增)

**具體變更**:

1. 在 `handleStatusChanged` 中偵測非用戶主動斷線
2. 觸發 Toast 通知：
   - 標題：Connection Lost
   - 內容：連線名稱 + IP + 錯誤原因
   - 動作：[Reconnect] 按鈕
3. Toast 停留 10 秒或用戶關閉

**驗證方式**:

```bash
# 手動驗證（需要模擬斷線）
1. 建立連線後，中斷網路或關閉 Modbus 設備
2. 觀察 Toast 通知出現
3. 確認內容正確
4. 點擊 Reconnect 嘗試重連
```

---

### P1-9: 自動重連機制

**目標**: 斷線後自動嘗試重連

**修改檔案**:

- `src/main/protocols/BaseProtocolClient.ts` (或 ModbusTcpAdapter)
- `src/renderer/stores/connectionStore.ts`

**具體變更**:

1. 斷線偵測後啟動重連計時器
2. 重連邏輯：
   - 間隔 5 秒
   - 最多 3 次
   - 顯示 "Reconnecting (1/3)..."
3. 重連成功：恢復正常狀態
4. 重連失敗：停止，保持 Error 狀態
5. 用戶手動斷線不觸發自動重連

**驗證方式**:

```bash
# 手動驗證
1. 建立連線
2. 中斷網路
3. 觀察狀態變為 "Reconnecting (1/3)"
4. 恢復網路 → 連線恢復
5. 或等待 3 次失敗 → 狀態變為 Error
```

---

## Phase 2: 管理標籤流程

### P2-1: 傳統地址解析器

**目標**: 建立傳統 Modbus 地址 (40001) 解析工具

**修改檔案**:

- `src/shared/utils/modbusAddress.ts` (新增)

**具體變更**:

1. 建立解析函數：
   ```typescript
   interface ParsedAddress {
     registerType: 'holding' | 'input' | 'coil' | 'discrete'
     address: number  // 0-based protocol address
     traditional: number  // 原始輸入的傳統地址
   }

   export function parseTraditionalAddress(input: string): ParsedAddress | null
   export function toTraditionalAddress(registerType: string, address: number): number
   ```
2. 解析邏輯：
   - 40001-49999 → Holding, address 0-9998
   - 30001-39999 → Input, address 0-9998
   - 00001-09999 或 1-9999 → Coil, address 0-9998
   - 10001-19999 → Discrete, address 0-9998

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- modbusAddress

# 測試案例
parseTraditionalAddress("40001") → { registerType: "holding", address: 0, traditional: 40001 }
parseTraditionalAddress("30050") → { registerType: "input", address: 49, traditional: 30050 }
parseTraditionalAddress("1") → { registerType: "coil", address: 0, traditional: 1 }
```

---

### P2-2: 地址輸入元件（支援傳統地址）

**目標**: 建立支援傳統地址輸入的元件

**修改檔案**:

- `src/renderer/components/tags/ModbusAddressInput.tsx` (新增)

**具體變更**:

1. 建立元件 props：
   ```typescript
   interface Props {
     value: string
     onChange: (value: string, parsed: ParsedAddress | null) => void
     error?: string
   }
   ```
2. 使用 `type="text"` + `inputMode="numeric"`
3. 即時解析並顯示結果：
   - 輸入 "40001" → 顯示 "✓ Holding Register, 地址 0"
4. 解析失敗顯示錯誤

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- ModbusAddressInput

# 手動驗證
1. 輸入 "40001" → 顯示 Holding Register 提示
2. 輸入 "30001" → 顯示 Input Register 提示
3. 輸入 "99999" → 顯示錯誤
```

---

### P2-3: Scan Tab 地址範圍驗證

**目標**: 驗證 Start/End 地址屬於同一 Register Type

**修改檔案**:

- `src/renderer/components/tags/ScanTab.tsx`

**具體變更**:

1. 替換現有 address input 為 `ModbusAddressInput`
2. 驗證 Start ≤ End
3. 驗證兩者 registerType 相同
4. 計算並顯示將建立的 Tag 數量
5. 錯誤時禁用 Scan/Create 按鈕

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- ScanTab

# 手動驗證
1. 輸入 Start=40001, End=40100 → 顯示 "100 tags"
2. 輸入 Start=40001, End=30050 → 錯誤 "必須屬於同一類型"
3. 輸入 Start=40100, End=40001 → 錯誤 "Start 必須 ≤ End"
```

---

### P2-4: Scan Tab 模式切換 (Live Scan / Range Create)

**目標**: 提供兩種 Scan 模式選擇

**修改檔案**:

- `src/renderer/components/tags/ScanTab.tsx`

**具體變更**:

1. 新增模式選擇 UI (兩個按鈕或 radio)
2. Live Scan 模式：
   - 需要已連線
   - 實際讀取每個地址
   - 只建立有回應的 Tag
   - 顯示進度
3. Range Create 模式：
   - 不需連線
   - 直接依範圍建立所有 Tag
4. 按鈕文字簡化為 "Create"

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- ScanTab

# 手動驗證
1. 選擇 Range Create → 直接建立指定範圍的 Tag
2. 選擇 Live Scan（需連線）→ 顯示掃描進度，只建立有回應的 Tag
```

---

### P2-5: Tag 列表 Checkbox 多選

**目標**: 在 Tag 列表加入 Checkbox 支援多選

**修改檔案**:

- `src/renderer/components/tags/TagGrid.tsx`
- `src/renderer/stores/tagStore.ts`

**具體變更**:

1. 每個 Tag 項目前加入 Checkbox
2. Store 新增 `selectedTagIds: Set<string>`
3. 標題列 Checkbox 支援全選/取消全選
4. `Shift + Click` 支援範圍選取
5. 選取時視覺回饋（背景色變化）

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- TagGrid

# 手動驗證
1. 點擊 Checkbox 選取單一 Tag
2. 點擊標題 Checkbox 全選
3. 再點一次取消全選
4. Shift + Click 範圍選取
```

---

### P2-6: 批次操作列

**目標**: 選取 Tag 後顯示批次操作列

**修改檔案**:

- `src/renderer/components/tags/TagBatchActions.tsx` (新增)
- `src/renderer/components/tags/TagGrid.tsx`

**具體變更**:

1. 建立 `TagBatchActions` 元件
2. 顯示條件：`selectedTagIds.size > 0`
3. 內容：
   - 已選取數量：`☑ 3 selected`
   - 操作按鈕：`[Delete] [Export] [Cancel]`
4. Cancel 清空選取
5. Delete 彈出確認對話框

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- TagBatchActions

# 手動驗證
1. 選取多個 Tag → 底部出現操作列
2. 顯示選取數量
3. 點擊 Cancel → 取消選取，操作列消失
4. 點擊 Delete → 彈出確認對話框
```

---

### P2-7: 批次刪除確認對話框

**目標**: 刪除前顯示確認對話框

**修改檔案**:

- `src/renderer/components/tags/DeleteTagsDialog.tsx` (新增)

**具體變更**:

1. 建立確認對話框：
   - 標題：Delete X tags?
   - 內容：This action cannot be undone.
   - 按鈕：[Cancel] [Delete]
2. 確認後呼叫批次刪除 API
3. 刪除成功後清空選取、關閉對話框

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- DeleteTagsDialog

# 手動驗證
1. 選取 3 個 Tag，點擊 Delete
2. 對話框顯示 "Delete 3 tags?"
3. 點擊 Cancel → 關閉，Tag 保留
4. 點擊 Delete → Tag 被刪除
```

---

### P2-8: Tag 側邊編輯面板

**目標**: 點擊 Tag 時顯示側邊編輯面板

**修改檔案**:

- `src/renderer/components/tags/TagDetailPanel.tsx` (新增或重構 TagEditor)
- `src/renderer/stores/tagStore.ts`

**具體變更**:

1. 建立側邊面板元件（slide-in 動畫）
2. Store 新增 `editingTagId: string | null`
3. 顯示 Tag 詳細資訊：
   - 當前值
   - 狀態
   - Name (可編輯)
   - Address (可編輯)
   - Data Type (可編輯)
4. 底部：[Delete] [Save] 按鈕
5. 點擊 ✕ 或列表空白處關閉

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- TagDetailPanel

# 手動驗證
1. 點擊 Tag → 側邊面板滑出
2. 顯示 Tag 資訊
3. 修改 Name → Save 按鈕變為 enabled
4. 點擊 Save → 儲存變更
5. 點擊 ✕ → 面板關閉
```

---

### P2-9: Tag 編輯手動儲存邏輯

**目標**: 追蹤變更狀態，手動儲存

**修改檔案**:

- `src/renderer/components/tags/TagDetailPanel.tsx`

**具體變更**:

1. 追蹤 `isDirty` 狀態（是否有未儲存變更）
2. 有變更時 Save 按鈕 enabled
3. 儲存成功後重置 `isDirty`
4. 關閉面板時若有未儲存變更，提示確認
5. 切換到其他 Tag 時若有未儲存變更，提示確認

**驗證方式**:

```bash
# 手動驗證
1. 修改欄位 → Save 按鈕變為可點擊
2. 點擊 Save → 儲存，按鈕變回 disabled
3. 修改後點擊 ✕ → 提示 "有未儲存變更，確定關閉？"
4. 修改後點擊其他 Tag → 提示確認
```

---

### P2-10: Data Type 選擇器

**目標**: 在 Tag 編輯面板加入 Data Type 下拉選單

**修改檔案**:

- `src/renderer/components/tags/TagDetailPanel.tsx`
- `src/shared/types/tag.ts`

**具體變更**:

1. 新增 `dataType` 欄位到 Tag 類型
2. 下拉選項：
   - INT16 (Signed) - 預設
   - UINT16 (Unsigned)
   - INT32 (2 registers)
   - UINT32 (2 registers)
   - FLOAT32 (2 registers)
   - FLOAT64 (4 registers)
   - BOOL (Bit)
   - STRING (ASCII)
3. 選擇多暫存器類型時顯示提示
4. 多暫存器類型時顯示 Byte Order 選擇

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- TagDetailPanel

# 手動驗證
1. 開啟 Tag 編輯面板
2. 點擊 Data Type 下拉選單
3. 選擇 FLOAT32 → 顯示 "將讀取 2 個暫存器"
4. 顯示 Byte Order 選項
```

---

## Phase 3: 監控與讀值流程

### P3-1: 自動輪詢狀態管理

**目標**: 連線後自動開始輪詢

**修改檔案**:

- `src/renderer/stores/connectionStore.ts`
- `src/renderer/stores/tagStore.ts`

**具體變更**:

1. 連線狀態變為 connected 且有 Tag 時，自動啟動輪詢
2. 新增輪詢狀態：`polling: 'running' | 'paused' | 'stopped'`
3. 斷線時停止輪詢
4. 無 Tag 時不啟動輪詢

**驗證方式**:

```bash
# 手動驗證
1. 新增 Tag 後連線 → 自動開始輪詢
2. 斷線 → 輪詢停止
3. 刪除所有 Tag → 輪詢停止
```

---

### P3-2: 輪詢控制 UI

**目標**: 提供輪詢開始/暫停控制

**修改檔案**:

- `src/renderer/components/connection/PollingControls.tsx` (新增或修改現有)

**具體變更**:

1. 顯示當前輪詢狀態指示
2. Start/Pause 按鈕切換
3. 狀態顯示：
   - ▶ Polling (綠色) - 運行中
   - ⏸ Paused (黃色) - 已暫停
4. 暫停時保持連線，只停止讀值

**驗證方式**:

```bash
# 手動驗證
1. 連線後顯示 "▶ Polling"
2. 點擊 Pause → 顯示 "⏸ Paused"，數值停止更新
3. 點擊 Start → 恢復輪詢
```

---

### P3-3: 輪詢頻率設定 UI

**目標**: 提供輪詢間隔調整介面

**修改檔案**:

- `src/renderer/components/connection/PollingControls.tsx`

**具體變更**:

1. 預設選項按鈕：250ms / 500ms / 1s / 5s
2. 自訂輸入欄位
3. 驗證範圍：100ms - 60000ms
4. 超出範圍顯示警告
5. 變更後即時生效

**驗證方式**:

```bash
# 手動驗證
1. 點擊 500ms → 輪詢間隔變為 500ms
2. 輸入自訂值 750 → 生效
3. 輸入 50 → 警告 "最小 100ms"
4. 輸入 90000 → 警告 "最大 60000ms"
```

---

### P3-4: Tag 狀態圖示元件

**目標**: 建立可重用的 Tag 狀態圖示元件

**修改檔案**:

- `src/renderer/components/tags/TagStatusIcon.tsx` (新增)

**具體變更**:

1. 狀態類型：
   ```typescript
   type TagStatus = 'normal' | 'timeout' | 'error' | 'stale'
   ```
2. 圖示對應：
   - normal: ● 綠色
   - timeout: ⚠ 黃色
   - error: ✕ 紅色
   - stale: ○ 灰色
3. 支援 tooltip 顯示詳細狀態

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- TagStatusIcon

# 手動驗證
1. 正常讀取的 Tag 顯示綠色
2. 逾時的 Tag 顯示黃色
3. 錯誤的 Tag 顯示紅色
4. hover 顯示詳細狀態
```

---

### P3-5: Tag 讀取錯誤狀態追蹤

**目標**: 追蹤每個 Tag 的讀取狀態和錯誤

**修改檔案**:

- `src/renderer/stores/tagStore.ts`
- `src/shared/types/tag.ts`

**具體變更**:

1. 擴充 Tag 狀態：
   ```typescript
   interface TagState {
     value: number | null
     status: 'normal' | 'timeout' | 'error' | 'stale'
     lastError?: string
     lastErrorCode?: string
     lastSuccessAt?: number
     consecutiveFailures: number
   }
   ```
2. 輪詢結果更新狀態
3. 連續失敗 5 次標記為降頻

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- tagStore

# 手動驗證
1. 正常讀取 → status = normal
2. 讀取逾時 → status = timeout, lastError 填入
3. 地址不存在 → status = error
```

---

### P3-6: 錯誤 Tag 降頻輪詢

**目標**: 連續失敗的 Tag 降低輪詢頻率

**修改檔案**:

- `src/main/ipc/polling.ts` (或相關輪詢邏輯)

**具體變更**:

1. 追蹤每個 Tag 的連續失敗次數
2. 連續失敗 5 次後，該 Tag 輪詢頻率降為原本的 1/5
3. 一旦成功，恢復正常頻率
4. 降頻狀態可在 UI 顯示提示

**驗證方式**:

```bash
# 手動驗證（需要設定一個無效地址的 Tag）
1. 建立有效和無效地址的 Tag
2. 觀察無效 Tag 連續失敗 5 次後降頻
3. 修正地址 → 恢復正常頻率
```

---

### P3-7: Tag 錯誤詳情面板

**目標**: 在側邊面板顯示錯誤詳情

**修改檔案**:

- `src/renderer/components/tags/TagDetailPanel.tsx`

**具體變更**:

1. 當 Tag 狀態為 error/timeout 時，顯示錯誤區塊
2. 顯示內容：
   - 錯誤類型
   - 錯誤碼 (如 Modbus Exception Code)
   - 人類可讀的說明
   - 最後嘗試時間
3. 提供 "Retry Now" 按鈕

**驗證方式**:

```bash
# 手動驗證
1. 建立無效地址的 Tag
2. 點擊該 Tag 開啟側邊面板
3. 顯示錯誤詳情區塊
4. 點擊 Retry Now → 立即重試
```

---

### P3-8: Modbus Exception Code 轉換

**目標**: 將 Modbus 錯誤碼轉換為可讀說明

**修改檔案**:

- `src/shared/utils/modbusErrors.ts` (新增)

**具體變更**:

1. 建立錯誤碼對照表：
   ```typescript
   const MODBUS_EXCEPTIONS: Record<number, { name: string, description: string }> = {
     0x01: { name: 'Illegal Function', description: '不支援的功能碼' },
     0x02: { name: 'Illegal Data Address', description: '地址不存在於此設備' },
     0x03: { name: 'Illegal Data Value', description: '資料值無效' },
     // ...
   }
   ```
2. 提供轉換函數

**驗證方式**:

```bash
# 單元測試
pnpm test:unit -- modbusErrors

# 測試案例
getExceptionMessage(0x02) → { name: "Illegal Data Address", description: "地址不存在於此設備" }
```

---

## 驗收標準

### Phase 1 完成條件

- [ ] Host/Port 分開輸入，Port 自動帶入預設值
- [ ] 輸入驗證即時回饋
- [ ] Test 按鈕可正常測試連線
- [ ] 主畫面顯示連線狀態
- [ ] 斷線時顯示 Toast 通知
- [ ] 自動重連機制運作正常

### Phase 2 完成條件

- [ ] 可輸入傳統地址 (40001) 並正確解析
- [ ] Scan Tab 支援 Live Scan / Range Create 模式
- [ ] 地址輸入框可正常輸入（無卡住問題）
- [ ] 可多選 Tag 並批次刪除
- [ ] 側邊編輯面板可正常編輯 Tag
- [ ] 可選擇 Data Type 和 Byte Order

### Phase 3 完成條件

- [ ] 連線後自動開始輪詢
- [ ] 可暫停/繼續輪詢
- [ ] 可調整輪詢頻率 (100ms - 60s)
- [ ] 錯誤 Tag 顯示正確狀態圖示
- [ ] 錯誤詳情可在面板查看
- [ ] 連續失敗的 Tag 自動降頻
