# Stability Soak Test

Connex Studio 的長時間穩定性測試，用來驗證應用程式能在持續運行數小時甚至數天後，不會出現記憶體洩漏（memory leak）、介面凍結、或程序崩潰。

## 快速開始

### 執行預設的一小時測試

```bash
# 確保已安裝依賴
pnpm install

# 執行浸泡測試（soak test），預設 60 分鐘
pnpm exec playwright test tests/stability/soak-test.spec.ts

# 測試結束後，分析記憶體記錄
pnpm exec tsx tests/stability/memory-report.ts
```

### 手動長時間測試（72 小時）

```bash
SOAK_DURATION_MINUTES=4320 \
SOAK_SAMPLE_INTERVAL_S=60 \
  pnpm exec playwright test tests/stability/soak-test.spec.ts
```

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `SOAK_DURATION_MINUTES` | `60` | 測試持續時間（分鐘）。在 CI 中建議 60 分鐘；手動測試可設為 4320（72 小時）。 |
| `SOAK_SAMPLE_INTERVAL_S` | `30` | 每次取樣記憶體的間隔秒數。間隔越短，記錄越密集，但對效能的觀測干擾也略大。 |
| `SOAK_MEMORY_CEILING_MB` | `500` | 當常駐記憶體（RSS）超過此值，測試立即中止並判定失敗。 |
| `SOAK_LOG_DIR` | `test-results/stability` | 記錄檔與截圖的輸出目錄。 |
| `SOAK_LEAK_THRESHOLD_MB_PER_HOUR` | `10` | 記憶體成長速率超過此閾值（MB/小時）時，判定為疑似洩漏。 |

## 輸出檔案

測試結束後，會在 `test-results/stability/` 目錄產生以下檔案：

| 檔案 | 內容 |
|------|------|
| `soak-memory-<timestamp>.jsonl` | 原始記憶體樣本，每行一筆 JSON 記錄 |
| `soak-memory-<timestamp>-report.json` | 分析報告的 JSON 格式 |
| `soak-initial-state.png` | 測試開始時的應用程式截圖 |
| `soak-final-state.png` | 測試結束時的應用程式截圖 |
| `soak-console-errors.log` | 瀏覽器主控台的錯誤訊息（如果有的話） |

### 記憶體樣本格式

每行 JSONL 記錄包含：

```json
{
  "timestamp": "2026-03-21T10:30:00.000Z",
  "elapsedMinutes": 15.5,
  "heapUsedMB": 82.4,
  "heapTotalMB": 120.0,
  "rssMB": 195.3,
  "externalMB": 12.1,
  "uiResponsive": true,
  "note": ""
}
```

## 如何解讀結果

### 記憶體分析報告

執行 `memory-report.ts` 後會在終端輸出摘要，包含以下指標：

| 指標 | 健康標準 | 說明 |
|------|----------|------|
| **常駐記憶體峰值**（Peak RSS） | < 500 MB | 整個測試期間的最高常駐記憶體。超過此值代表記憶體用量失控。 |
| **堆積記憶體峰值**（Peak Heap） | < 300 MB | JS 堆積的峰值。若堆積持續成長且不回收，幾乎可確認有洩漏。 |
| **成長速率**（Growth Rate） | < 10 MB/hr | 以線性回歸計算的記憶體成長速度。超過閾值表示可能有洩漏。 |
| **洩漏信心度**（Leak Confidence） | `none` or `low` | 綜合成長速率和回歸擬合度（R-squared）的判斷。 |
| **介面無回應次數** | 0 | 如果大於零，代表應用程式曾經凍結。 |

### 洩漏信心度分級

- **none** — 成長速率低於閾值，未偵測到洩漏
- **low** — 成長速率超過閾值，但趨勢不穩定（R^2 < 0.5），多半是垃圾回收（GC）波動造成的假陽性
- **medium** — 有明確的上升趨勢（R^2 介於 0.5 ~ 0.8），建議延長測試時間或用堆積快照（heap snapshot）進一步排查
- **high** — 非常線性的持續成長（R^2 > 0.8），幾乎確定有記憶體洩漏，必須修復

### 判定結果

| 結果 | 條件 |
|------|------|
| **PASS** | 未偵測到洩漏，或信心度為 `low`（判定為雜訊） |
| **FAIL** | 信心度為 `medium` 或 `high`，且成長速率超過閾值 |

## 注意事項

1. **不需要真實工業設備**：浸泡測試會建立連線，但連線失敗是預期的。測試的目的是驗證應用程式本身的穩定性，不是驗證設備連通性。

2. **冷啟動時間**：測試會量測應用程式從啟動到介面可用的時間，必須在 5 秒以內。

3. **CI 環境**：在 CI 中建議用預設的 60 分鐘，搭配 30 秒取樣間隔。72 小時版本適合在專用測試機上手動執行。

4. **閾值調整**：如果你的測試場景有大量標籤（tag）或高頻率輪詢（polling），記憶體的基線會比較高，可以適度調高 `SOAK_MEMORY_CEILING_MB`。但成長速率閾值應保持在 10 MB/hr 以下。

5. **與 Playwright 設定的關係**：浸泡測試放在 `tests/stability/` 目錄，不在 `tests/e2e/` 中，因此不會被預設的 `pnpm test:e2e` 執行到。需要時可在 `package.json` 加入獨立的指令。
