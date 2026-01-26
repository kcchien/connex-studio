# Modbus TCP UX Redesign

> 日期：2026-01-26
> 狀態：已確認，待實作

## 背景

Modbus TCP 功能已完成基礎實作，但存在多項 UX 問題影響 IIoT 工程師的使用體驗。本設計將問題整理為三個階段，按用戶旅程逐步改善。

## 問題清單

1. New Connection 時，Address 和 Port 應分開
2. Test 按鈕沒作用
3. Add Tags 的 Modbus 地址慣例不清楚（40001 vs 1）
4. 無法批次刪除 Tags
5. Tag 編輯面板顯示空白
6. 編輯 Tag 需額外點擊 Configure 按鈕
7. 地址輸入框卡住無法輸入
8. Scan Tags 固定建立 10 個，不依輸入範圍
9. 新增 Tag 後不知道如何連線讀值
10. 斷線時無通知或狀態指示

---

## Phase 1: 建立連線流程

### 1.1 連線表單重新設計

**現狀**：單一 Address 欄位要求 `host:port` 格式

**改善**：
- Host 和 Port 分開為獨立欄位
- Port 依協定自動填入預設值：
  - Modbus TCP → 502
  - MQTT → 1883
  - OPC UA → 4840
- 用戶切換協定時自動帶入預設 Port（可覆蓋）

```
┌─────────────────────────────────────────────┐
│  Host                    Port               │
│  ┌───────────────────┐   ┌─────────────┐   │
│  │ 192.168.1.100     │   │ 502        │   │
│  └───────────────────┘   └─────────────┘   │
└─────────────────────────────────────────────┘
```

### 1.2 輸入驗證規則

**Host 欄位**：
- 必填，不可為空
- 支援 IP 格式 (`192.168.1.100`) 或 hostname (`plc-01.local`)
- IP 驗證：每段 0-255，共 4 段
- Hostname：允許字母、數字、`-`、`.`，不可以 `-` 開頭

**Port 欄位**：
- 必填，數值範圍 1 - 65535
- 即時驗證，超出範圍顯示紅框 + 錯誤提示

**驗證時機**：
- 即時驗證：輸入時 debounce 300ms 後檢查
- 離開欄位時：完整驗證並顯示錯誤訊息
- 按下按鈕時：Test / Connect 前再次驗證

### 1.3 Test Connection 按鈕

**功能**：只測試連線，不建立持久連線

**流程**：
1. 點擊 Test → 按鈕變為 "Testing..." + Loading
2. Main Process 嘗試 TCP 連線（timeout: 5秒）
3. 成功 → 立即斷開 → 顯示 ✓ "Connection successful"（綠色）
4. 失敗 → 顯示 ✗ "Connection failed: [原因]"（紅色）

**失敗訊息轉換**：
- `Connection refused` → "連線被拒絕，請確認裝置是否開啟"
- `Timeout` → "連線逾時，請檢查網路或 IP 位址"
- `EHOSTUNREACH` → "無法連接主機，請確認網路設定"

### 1.4 連線狀態指示與斷線通知

**狀態指示器**（主畫面頂部）：
| 狀態 | 顏色 | 說明 |
|------|------|------|
| Connected | 綠色 | 連線正常 |
| Connecting | 黃色 + 動畫 | 連線中 |
| Disconnected | 灰色 | 已斷開 |
| Error | 紅色 | 連線錯誤/裝置斷線 |

**斷線 Toast 通知**：
- 當連線從 Connected 變成 Error（非用戶主動）時顯示
- 包含連線名稱、IP、錯誤原因
- 提供 [Reconnect] 按鈕

**自動重連**：
- 斷線後自動嘗試重連，間隔 5 秒
- 最多重試 3 次
- 重連期間顯示 "Reconnecting (1/3)..."
- 重連失敗則保持 Error 狀態

---

## Phase 2: 管理標籤流程

### 2.1 傳統地址輸入支援

**設計**：用戶直接輸入傳統地址（如 40001），系統自動解析

```
┌─────────────────────────────────────────────┐
│  Start Address: [40001]   End Address: [40100]
│  ✓ Holding Register, 地址 0-99（共 100 個） │
└─────────────────────────────────────────────┘
```

**解析邏輯**：
| 輸入 | 解析結果 |
|------|----------|
| `40001` | Holding Register, 地址 0 |
| `30001` | Input Register, 地址 0 |
| `00001` 或 `1` | Coil, 地址 0 |
| `10001` | Discrete Input, 地址 0 |

**驗證**：
- Start 必須 ≤ End
- Start 和 End 必須屬於同一 Register Type
- 超出範圍顯示錯誤提示

### 2.2 Scan Tags 邏輯修正

**兩種模式**：

**Live Scan（探測模式）**：
- 實際連線到設備，逐一讀取地址
- 只建立「有回應」的地址作為 Tag
- 顯示進度：「Scanning 40001... (15/100)」

**Range Create（範圍建立）**：
- 不實際連線，直接依輸入範圍建立所有 Tag
- 輸入 `40001-40100` → 建立 100 個 Tag

**UI 調整**：
- 顯示「✓ 100 tags ready to create」
- 按鈕文字簡化為 `[Create]`

### 2.3 地址輸入框修正

**問題**：HTML `type="number"` 導致輸入卡住

**解決**：改用 `type="text"` + 自訂驗證

```tsx
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  onChange={handleAddressInput}
/>
```

**行為**：
- 只允許輸入數字
- 即時過濾非數字字元
- 支援全選、刪除、貼上
- 前導零自動清除

### 2.4 Tag 列表批次操作

**功能**：
- 每個 Tag 前增加 Checkbox
- 列表標題 Checkbox 可「全選 / 取消全選」
- 選取後底部出現操作列：`[Delete] [Export] [Cancel]`
- `Shift + Click` 支援範圍選取

**刪除確認**：
- 彈出對話框確認刪除數量
- 提示「This action cannot be undone.」

### 2.5 Tag 編輯面板重新設計

**改善**：改用側邊面板直接編輯

**行為**：
- 點擊 Tag → 側邊面板滑出
- 欄位可直接編輯，不需額外按鈕
- 列表保持可見，可快速切換
- 手動儲存：修改後點 `[Save]` 儲存

### 2.6 Modbus Data Type 選擇器

**Data Type 選項**：
- INT16 (Signed) ← 預設
- UINT16 (Unsigned)
- INT32 (2 registers)
- UINT32 (2 registers)
- FLOAT32 (2 registers)
- FLOAT64 (4 registers)
- BOOL (Bit)
- STRING (ASCII)

**多暫存器類型**：
- 選擇 INT32/FLOAT32 等時，顯示提示「將讀取 40001-40002（2 個暫存器）」
- 提供 Byte Order 選擇：AB CD / CD AB / BA DC / DC BA

---

## Phase 3: 監控與讀值流程

### 3.1 連線與讀值時機

**模式**：連線後自動輪詢

| 狀態 | 行為 |
|------|------|
| Disconnected | 不讀取，數值顯示 `--` |
| Connected + 有 Tags | 自動開始輪詢 |
| Connected + 無 Tags | 等待新增 Tag 後開始 |

**輪詢控制**：
- `▶ Start`：開始輪詢
- `⏸ Pause`：暫停輪詢（保持連線）
- 可調整輪詢間隔

### 3.2 Tag 讀取錯誤處理

**狀態顯示**：
| 狀態 | 圖示 | 顏色 | 說明 |
|------|------|------|------|
| Normal | ● | 綠色 | 讀取成功 |
| Timeout | ⚠ | 黃色 | 讀取逾時 |
| Error | ✕ | 紅色 | 讀取失敗 |
| Stale | ○ | 灰色 | 數據過期 |

**錯誤詳情**：
- 點擊錯誤 Tag，側邊面板顯示詳細錯誤碼與說明
- 提供人類可讀的錯誤描述

**重試策略**：
- 錯誤 Tag 仍持續輪詢
- 連續失敗 5 次後降低輪詢頻率
- 可手動「Retry Now」

### 3.3 輪詢頻率設定

**預設選項**：250ms / 500ms / 1s / 5s

**自訂輸入**：
- 範圍：100ms - 60000ms (1 分鐘)
- 最小值 100ms：避免過度頻繁造成設備負擔
- 最大值 60000ms：超過此值監控意義不大

**驗證**：超出範圍顯示警告提示

---

## 實作順序

1. **Phase 1** - 建立連線流程
2. **Phase 2** - 管理標籤流程
3. **Phase 3** - 監控與讀值流程

每個 Phase 完成後即為可用的完整體驗，可獨立測試驗證。

---

## 相關檔案

- `src/renderer/components/connection/NewConnectionDialog.tsx`
- `src/renderer/components/connection/ConnectionCard.tsx`
- `src/renderer/components/tags/TagEditor.tsx`
- `src/renderer/components/tags/ScanTab.tsx`
- `src/renderer/components/tags/BatchTagDialog.tsx`
- `src/renderer/components/tags/TagGrid.tsx`
- `src/renderer/stores/connectionStore.ts`
- `src/renderer/stores/tagStore.ts`
