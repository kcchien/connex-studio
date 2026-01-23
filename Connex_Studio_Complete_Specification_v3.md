# Connex Studio

## The "Postman" for Industrial IoT

**Connect. Visualize. Bridge. Record.**

---

# Part I: Product Requirements Document

## Version 3.0 | Complete Edition

---

# 1. Executive Summary

## 1.1 Product Vision

> *「讓每一次的工業協定測試，都像發送一個 HTTP Request 一樣簡單。」*

Connex Studio 不是「另一個通訊測試軟體」，而是為解決工程師在現場「查修慢、設定煩、數據難以視覺化」的痛點而生。我們融合 **Postman 的易用性**與 **LabVIEW 的儀控專業感**，打造物聯網工程師的瑞士刀。

## 1.2 Core Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Unified Abstraction** | 無論 Modbus Register、OPC UA Node 或 MQTT Topic，在 UI 上都是統一的「Tag (點位)」概念 |
| **Instant Gratification** | 連線 → 數據上屏 → 圖表呈現，必須在 **3 次點擊內**完成 |
| **Developer First** | Dark Mode、JSON 語法高亮、Regex 搜尋、Command Palette、TypeScript 腳本 |
| **Data-Centric** | 數據不只是看看，更要能記錄、查詢、分析、匯出 |

## 1.3 Target Users

- **物聯網/工業自動化工程師**：快速驗證 PLC、感測器通訊
- **系統整合商**：測試多廠牌設備的協定相容性
- **軟體開發者**：IIoT 應用程式開發前的協定驗證與 Mock 測試
- **設備製造商**：產品出廠前的通訊功能測試
- **數據分析師**：採集現場數據進行離線分析

## 1.4 Competitive Advantage

| Capability | Traditional Tools | Connex Studio |
|------------|-------------------|---------------|
| 連線設定 | 手動輸入 IP、反覆嘗試參數 | Smart Probe 自動偵測設備與參數 |
| 數據呈現 | 純數字表格，無法看趨勢 | Sparklines 微趨勢 + 即時圖表 |
| 異常追蹤 | 錯過就沒了 | Data DVR 時光回溯，隨時回放 |
| 協定轉換 | 需要額外 Gateway 硬體 | The Bridge 拖曳即轉發 |
| 無硬體測試 | 無法進行 | Virtual Server 模擬任意設備 |
| 環境切換 | 手動修改所有 IP | Environment 一鍵切換 |
| **自動化** | 無或需外部工具 | 內建 TypeScript 腳本引擎 |
| **數據存檔** | 無或需另外寫程式 | **一鍵錄製 + DuckDB 時序儲存** |
| **數據匯出** | 手動複製貼上 | **CSV/Excel/Parquet 一鍵匯出** |
| **設定備份** | 手動記錄或截圖 | **YAML/JSON 完整匯出入，Git 友善** |

---

# 2. Feature Modules

## 2.1 Module 1: Smart Connection Manager

> **解決痛點**：現場有幾十台設備，IP 不同、協定不同，切換測試環境很痛苦。

### 2.1.1 Environment System

借鑑 Postman 的 Environment 概念，一鍵切換測試/生產環境。

| Feature | Description |
|---------|-------------|
| 變數定義 | 定義 `${Factory_IP}`、`${Device_ID}`、`${MQTT_Broker}` 等變數 |
| 環境切換 | 從「辦公室 Localhost」切換到「案場 VPN IP」，所有設定自動套用 |
| 加密儲存 | 密碼、憑證等敏感資訊 AES-256 加密保存 |
| 匯出分享 | 環境配置可匯出 JSON，團隊成員一鍵匯入 |

### 2.1.2 Smart Probe Auto-Detection

不再手動猜測設備參數，讓軟體自動探索。

**Modbus Auto-Scan**
- Unit ID 掃描：自動嘗試 1-247，找出回應的設備
- Baudrate 偵測：(Serial) 自動嘗試常見速率 9600/19200/38400/115200
- 網段掃描：掃描指定網段內所有 Modbus TCP 設備

**OPC UA Smart Connect**
- Endpoint 列舉：自動列出所有可用 Endpoint
- 安全策略標示：以顏色區分 None / Sign / SignAndEncrypt
- 憑證一鍵信任：Self-signed Certificate 自動處理

**MQTT Connection Helper**
- Broker 連線測試：驗證連線並顯示支援的 MQTT 版本
- Topic 探索：訂閱 `#` 萬用字元，列出活躍 Topic 清單

### 2.1.3 Connection Templates

內建常見設備的連線範本：
- **PLC**：Siemens S7-1200/1500、Allen-Bradley、Schneider Modicon、Mitsubishi
- **能源**：電表 (IEC 62056)、電力監控
- **樓控**：BACnet/IP 基礎支援規劃

### 2.1.4 Connection Health Monitor (NEW)

| Feature | Description |
|---------|-------------|
| 心跳監測 | 定期發送測試請求，監控連線存活狀態 |
| 延遲統計 | 即時顯示 RTT (Round-Trip Time)，Min/Avg/Max |
| 重連機制 | 斷線後自動重連，可設定重試次數與間隔 |
| 連線日誌 | 記錄所有連線/斷線事件，便於事後分析 |

---

## 2.2 Module 2: Data Workbench

> **解決痛點**：傳統軟體只能看數字，看不出變化趨勢；Modbus 只有 Address，沒有人看得懂。

### 2.2.1 Super Grid ⭐

不只是 Excel 表格，而是即時監控面板。

| Feature | Description |
|---------|-------------|
| **Sparklines** ⭐ | 數值欄位旁直接顯示過去 30 秒的微型波形圖，一眼看出哪個值在跳動 |
| 熱切換格式 | 同一個 Register，下拉即時切換 Int16 / Float32 / Hex / Binary / ASCII |
| Traffic Light | Boolean 或 Enum 值顯示自定義燈號 (1=綠燈運轉, 0=紅燈停止) |
| 數值縮放 | 套用公式 `raw × 0.1 + offset`，自動附加工程單位 (°C, bar, m/s) |
| 告警規則 | 數值超出範圍時列變色 + 聲音提示 |
| **欄位自訂** | 拖曳調整欄位順序、寬度、顯示/隱藏 |
| **群組摺疊** | 將 Tag 分組，可展開/摺疊，如「溫度感測器」群組 |

### 2.2.2 Request Builder

如同 Postman 的請求編輯器，針對工業協定最佳化。

**Smart Address Input**
- 多格式解析：支援 `40001`、`HR0`、`%MW0` 自動轉換
- 批次輸入：支援 CSV/JSON 匯入多筆測試點位
- 歷史建議：根據使用紀錄，智慧推薦常用地址
- **位址計算機**：輸入公式自動計算，如 `40001 + 10*n`

**Request Modes**
- 單次請求：手動觸發單筆讀寫
- 輪詢模式：設定間隔 (100ms ~ 60s) 自動重複讀取
- 監聽模式：被動接收 OPC UA Subscription / MQTT Subscribe
- 序列執行：依序執行多個請求，支援前置條件判斷

### 2.2.3 Write Operations Panel (NEW)

| Feature | Description |
|---------|-------------|
| 單值寫入 | 選擇 Tag，輸入值，一鍵寫入 |
| 批次寫入 | 同時寫入多個 Tag，支援 CSV 匯入 |
| 寫入確認 | 可開啟二次確認，防止誤操作 |
| 寫入歷史 | 記錄所有寫入操作，可追溯 |
| **安全鎖定** | 重要 Tag 可設定鎖定，需解鎖才能寫入 |

### 2.2.4 Response Viewer

| View Mode | Description |
|-----------|-------------|
| 表格視圖 | 結構化顯示，支援排序、篩選、欄位自訂、凍結欄 |
| 原始視圖 | 顯示 Hex 封包內容，便於協定層除錯 |
| 比較視圖 | 並排比較兩次請求結果，高亮差異項目 |
| JSON 視圖 | MQTT Payload 自動格式化，支援語法高亮與摺疊 |
| **樹狀視圖** | OPC UA 節點以樹狀結構呈現 |

---

## 2.3 Module 3: Visualizer & Debugger

> **解決痛點**：數值瞬間跳變抓不到，或是想知道「剛剛發生了什麼」。

### 2.3.1 Data DVR (Time Travel) ⭐⭐

> *永遠在記憶體中保留最後 5 分鐘的數據 (Circular Buffer)，看到異常時按下暫停，拖動時間軸回到過去。*

| Feature | Description |
|---------|-------------|
| **環形緩衝區** ⭐ | 自動保留最近 5 分鐘數據，零配置即可使用 |
| 時間軸滑桿 | 拖動 Slider 回到任意時間點，查看該瞬間的完整數據快照 |
| 波形同步 | 回溯時，所有圖表同步顯示對應時間的波形 |
| 快照匯出 | 將特定時間點的數據匯出為 CSV/JSON |
| **書籤標記** | 在時間軸上標記重要時刻，便於快速跳轉 |

### 2.3.2 Oscilloscope Mode

**Multi-Axis Overlay**

將溫度、壓力、電流等不同來源的 Tag 拖進同一個圖表，自動正規化座標軸以比較趨勢相關性。

**Advanced Analysis**
- 觸發模式：當數值超過門檻時自動開始錄製
- 游標測量：雙游標測量時間差、數值差
- FFT 頻譜：(進階) 針對震動數據提供簡易頻譜分析
- **XY 繪圖**：以一個 Tag 為 X 軸、另一個為 Y 軸，觀察相關性

### 2.3.3 Dashboard View

- 即時 Gauge：圓形/半圓形儀表，適合顯示溫度、壓力等
- LED 指示燈：多色狀態燈，對應設備運轉/停止/異常
- 數值大字卡：單一重要數值的醒目顯示
- 自由佈局：拖曳排列，儲存為自訂 Dashboard
- **多頁面 Dashboard**：建立多個 Dashboard，頁籤切換

### 2.3.4 Alert & Notification System (NEW)

| Feature | Description |
|---------|-------------|
| 數值告警 | 設定上下限，超出時觸發告警 |
| 變化率告警 | 數值變化速度過快時告警 |
| 連線告警 | 連線中斷、逾時時告警 |
| 告警動作 | 聲音提示、桌面通知、寫入日誌、執行腳本 |
| 告警歷史 | 記錄所有告警事件，可查詢、匯出 |
| **告警靜音** | 暫時靜音特定告警，避免干擾 |

---

## 2.4 Module 4: The Bridge ⭐⭐⭐

> **⭐ Killer Feature — 讓 Connex Studio 瞬間變身軟體 Gateway**

### 2.4.1 Core Concept

> **解決痛點**：測試雲端平台時，需要額外購買 Gateway 硬體將地端數據轉發上雲。

| Feature | Description |
|---------|-------------|
| **拖曳對應** ⭐ | 左側 Modbus Read 視窗，右側 MQTT Publish 視窗，拖曳建立對應關係 |
| 即時轉發 | Modbus `40001 (Temp)` → MQTT `/factory/line1/temp`，毫秒級轉發 |
| 數據轉換 | 轉發時可套用公式、改變資料型別、重組 JSON 結構 |
| 雙向橋接 | 支援 MQTT → Modbus 寫入，雲端下控到地端設備 |

### 2.4.2 Use Cases

- **雲端平台測試**：驗證 AWS IoT / Azure IoT Hub 是否正確接收數據
- **快速原型**：不需寫程式，5 分鐘內建立 Modbus-to-MQTT 數據流
- **臨時 Gateway**：正式 Gateway 故障時的應急替代方案
- **數據格式驗證**：確認 JSON Payload 結構符合雲端期望

### 2.4.3 Bridge Configuration

- 輪詢間隔：設定來源端讀取頻率 (100ms ~ 60s)
- 變化觸發：僅在數值變化時才轉發 (減少流量)
- 批次打包：多個點位合併為單一 JSON 訊息
- 斷線處理：來源斷線時的行為設定 (保持最後值 / 發送 null / 停止)

### 2.4.4 Payload Template Engine (NEW)

自訂 JSON Payload 格式，支援模板語法：

```json
{
  "deviceId": "${env:DEVICE_ID}",
  "timestamp": "${$isoTimestamp}",
  "data": {
    "temperature": ${tags.temp.value},
    "pressure": ${tags.press.value},
    "status": "${tags.status.value == 1 ? 'running' : 'stopped'}"
  }
}
```

---

## 2.5 Module 5: Simulation & Automation

> **解決痛點**：硬體還沒來，軟體無法開發；或是需要製造「異常數據」來測試警報。

### 2.5.1 Virtual Server Mode

Connex Studio 不只是 Client，也能一鍵變身 Server。

| Server Type | Description |
|-------------|-------------|
| Modbus Server | 啟動虛擬 Modbus TCP Slave，可自訂 Holding/Input Register 數量與初始值 |
| MQTT Broker | 啟動輕量 MQTT Broker，無需安裝 Mosquitto 即可測試 |
| OPC UA Server | 啟動基礎 OPC UA Server，可自訂節點結構 |

### 2.5.2 Waveform Generator ⭐

> *指定任意 Address 的值依照預設波形自動變化，測試 UI 反應與告警邏輯的神器。*

- **Sine Wave**：正弦波，可設定振幅、頻率、偏移
- **Random**：隨機值，可設定範圍
- **Sawtooth**：鋸齒波，模擬累計值
- **Step**：階梯變化，模擬狀態切換
- **CSV Replay**：載入歷史數據 CSV，重播真實場景
- **自訂公式**：輸入數學公式，如 `sin(t) * 10 + noise(0.5)`

### 2.5.3 Collections Management

借鑑 Postman Collections，將相關請求組織成可重複使用的測試集。

**Three-Layer Structure**
- **專案 (Project)**：最上層，對應一個廠區或系統
- **集合 (Collection)**：一組相關請求，如「產線 A 感測器測試」
- **請求 (Request)**：單一測試動作，可設定 Pre/Post Script

**Variable Chain**
- 環境變數：`${host}`、`${port}`，切換環境時自動替換
- 動態變數：`${$timestamp}`、`${$randomInt}`，每次執行自動產生
- 鏈式傳遞：前一請求的回應值作為下一請求的輸入

### 2.5.4 TypeScript Scripting Engine

利用 TypeScript 編譯器與 Node.js 運行時，允許使用者寫 TS 腳本控制測試邏輯。

```typescript
if (tags['Temp'].value > 50) {
  await modbus.write('Reset_Coil', true);
  log.info('Overheat protection triggered!');
}
```

- **Pre-request Script**：請求發送前執行，動態修改參數
- **Post-request Script**：請求完成後執行，驗證回應
- **斷言 (Assertions)**：`assert.inRange(value, 0, 100)` 自動判斷通過/失敗
- **排程執行**：設定 Cron 表達式，自動定時執行測試集
- **Monaco Editor**：腳本編輯器使用 VS Code 同款編輯器，支援智慧提示

---

## 2.6 Module 6: AI Copilot

> **解決痛點**：手動輸入 100 個 Modbus 點位是最浪費生命的行為。

### 2.6.1 OCR Tag Table Recognition

| Feature | Description |
|---------|-------------|
| 影像輸入 | 手機拍紙本 Modbus 表、截圖 PDF、Excel 表格皆可 |
| AI 解析 | 自動辨識 Address、Data Type、Description 欄位 |
| Profile 生成 | 輸出可直接匯入的 JSON/CSV Profile |
| 人工校驗 | AI 結果可手動修正，持續優化辨識準確度 |

### 2.6.2 Natural Language Operation

> *「幫我讀取 Holding Register 100-110 的溫度值，每秒更新一次，超過 80 度時提醒我。」*

系統自動轉換為：建立 Modbus 讀取請求 → 設定 1 秒輪詢 → 建立告警規則 → 開始執行。

### 2.6.3 Anomaly Detection Assistant

- **趨勢分析**：「過去 10 分鐘的數據有沒有異常？」
- **突波偵測**：自動分析標準差，標出 Spike 時間點
- **相關性分析**：「溫度和電流有關聯嗎？」— 計算相關係數

### 2.6.4 Error Diagnosis

- 錯誤碼解析：自動解讀 Modbus Exception、OPC UA StatusCode
- 解決建議：根據錯誤類型提供可能原因與排除步驟
- 知識庫連結：連結到相關設備手冊或常見問題

---

## 2.7 Module 7: Data Acquisition & Storage ⭐⭐ (NEW)

> **解決痛點**：測試時想記錄一段時間的數據做分析，卻沒有好用的存檔功能；事後想查數據，卻發現沒存到。

### 2.7.1 Data Logger 數據記錄器

一鍵啟動數據採集，自動存入本地資料庫。

| Feature | Description |
|---------|-------------|
| **一鍵錄製** ⭐ | 點擊 ● REC 按鈕，立即開始記錄所有訂閱的 Tag 數據 |
| 採集設定 | 可選擇記錄哪些 Tag、採樣間隔 (10ms ~ 60s)、記錄時長 |
| 觸發式採集 | 條件觸發：當某值超過門檻時自動開始/停止記錄 |
| 預錄緩衝 | Pre-trigger Buffer：觸發前 N 秒的數據也一併保留 |
| 採集狀態 | 即時顯示：記錄時長、數據筆數、檔案大小、寫入速率 |

### 2.7.2 DuckDB 時序資料庫

選用 DuckDB 作為本地儲存引擎，專為分析型查詢優化。

**為何選擇 DuckDB？**
- **列式儲存**：時序數據壓縮率高，查詢速度快
- **嵌入式**：單一檔案，無需安裝資料庫服務
- **SQL 支援**：標準 SQL 查詢，工程師熟悉
- **高效能**：百萬筆數據秒級查詢
- **跨平台**：Windows/macOS/Linux 完美支援
- **.NET 支援**：DuckDB.NET 官方套件

**資料表結構**

```sql
-- 時序數據主表
CREATE TABLE timeseries (
    id              BIGINT PRIMARY KEY,
    timestamp       TIMESTAMP WITH TIME ZONE,
    session_id      UUID,           -- 採集 Session 識別
    connection_id   VARCHAR,        -- 連線識別
    tag_name        VARCHAR,        -- Tag 名稱
    tag_address     VARCHAR,        -- 原始地址
    protocol        VARCHAR,        -- modbus/opcua/mqtt
    value_raw       BLOB,           -- 原始二進位值
    value_number    DOUBLE,         -- 數值型轉換值
    value_string    VARCHAR,        -- 字串型值
    value_bool      BOOLEAN,        -- 布林值
    quality         VARCHAR,        -- Good/Bad/Uncertain
    metadata        JSON            -- 擴充欄位
);

-- 建立時間索引加速查詢
CREATE INDEX idx_ts_time ON timeseries(timestamp);
CREATE INDEX idx_ts_session ON timeseries(session_id, timestamp);
CREATE INDEX idx_ts_tag ON timeseries(tag_name, timestamp);

-- 採集 Session 記錄
CREATE TABLE acquisition_sessions (
    session_id      UUID PRIMARY KEY,
    name            VARCHAR,
    description     VARCHAR,
    started_at      TIMESTAMP,
    ended_at        TIMESTAMP,
    tag_count       INTEGER,
    record_count    BIGINT,
    file_size_bytes BIGINT,
    settings        JSON
);
```

### 2.7.3 數據查詢與分析

**內建查詢介面**

```
┌─────────────────────────────────────────────────────────────────┐
│  Query Builder                                           [SQL] │
├─────────────────────────────────────────────────────────────────┤
│  Session: [2025-01-18 Production Test ▼]                       │
│  Tags:    [☑ Temp] [☑ Pressure] [☐ Flow]      [Select All]    │
│  Time:    [2025-01-18 09:00] to [2025-01-18 17:00]  [Last 1h] │
├─────────────────────────────────────────────────────────────────┤
│  Aggregation: [None ▼]  Interval: [1 minute ▼]                 │
├─────────────────────────────────────────────────────────────────┤
│  Preview (showing 100 of 12,345 rows)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Timestamp           │ Tag    │ Value  │ Quality        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 2025-01-18 09:00:01 │ Temp   │ 25.4   │ Good           │   │
│  │ 2025-01-18 09:00:01 │ Press  │ 1.21   │ Good           │   │
│  │ 2025-01-18 09:00:02 │ Temp   │ 25.5   │ Good           │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  [Show Chart]  [Statistics]        [Execute] [Export ▼]        │
└─────────────────────────────────────────────────────────────────┘
```

**SQL 模式**

```sql
-- 進階使用者可直接撰寫 SQL
SELECT
    time_bucket('1 minute', timestamp) as bucket,
    tag_name,
    AVG(value_number) as avg_value,
    MAX(value_number) as max_value,
    MIN(value_number) as min_value
FROM timeseries
WHERE session_id = '...'
  AND timestamp BETWEEN '2025-01-18 09:00' AND '2025-01-18 17:00'
GROUP BY bucket, tag_name
ORDER BY bucket, tag_name
```

**分析功能**
- 統計摘要：Min / Max / Avg / Std Dev / Count
- 時間聚合：按秒/分/時/日聚合，支援 SUM/AVG/MAX/MIN
- 趨勢比較：同一 Tag 不同時段的疊圖比較
- 異常標記：自動標記超出 N 個標準差的異常點

### 2.7.4 匯出功能 ⭐

| Format | Description | Use Case |
|--------|-------------|----------|
| **CSV** | 標準逗號分隔，可選時間格式、數值精度 | Excel、通用分析 |
| **Excel (.xlsx)** | 多工作表匯出，含統計摘要頁、圖表 | 報告、分享 |
| **JSON** | 結構化 JSON，支援 nested 或 flat | 程式處理 |
| **Parquet** | 列式壓縮格式 | 大數據分析 (Pandas/Spark) |
| **InfluxDB Line Protocol** | 時序資料庫標準格式 | 匯入 InfluxDB/QuestDB |

**匯出設定**
- 時間範圍篩選：起訖時間、最近 N 分鐘/小時
- 數據降採樣：原始 / 每秒 / 每分鐘 / 每小時
- 欄位選擇：自選要匯出的 Tag 與欄位
- 格式選項：時間格式 (ISO8601/Unix/Excel)、小數位數、空值處理

### 2.7.5 儲存空間管理

| Feature | Description |
|---------|-------------|
| 自動清理 | 設定保留天數，自動刪除過期數據 |
| 壓縮歸檔 | 舊數據自動壓縮 (Parquet 歸檔)，節省 70%+ 空間 |
| 空間監控 | 顯示各 Session 佔用空間，一鍵清理 |
| 匯出備份 | 將 Session 匯出為獨立 .duckdb 或 .parquet 檔案 |
| 資料庫位置 | 可自訂儲存路徑，支援外接硬碟/NAS |

---

## 2.8 Module 8: Collaboration & Export

### 2.8.1 Team Sync

| Feature | Description |
|---------|-------------|
| Collection 共享 | 匯出/匯入 JSON，支援 Git 版本控制 |
| 即時共享 | 產生連結，遠端同事可即時觀看你的連線狀態 |
| Session 錄製 | 錄製完整測試過程，可回放重現問題 |
| 註解標記 | 在數據點上加入註解，便於團隊討論 |

### 2.8.2 Report Generation (NEW)

| Report Type | Description |
|-------------|-------------|
| 測試報告 | 自動產生 PDF，含測試項目、結果、統計圖表 |
| 數據報告 | 採集數據摘要，含趨勢圖、異常標記 |
| 連線診斷 | 連線健康狀態報告，含延遲統計、錯誤分析 |
| 自訂範本 | 支援自訂報告範本 (Markdown/HTML) |

### 2.8.3 Code Generation

將請求轉換為程式碼片段：

| Language | Library |
|----------|---------|
| TypeScript/JavaScript | modbus-serial / node-opcua / mqtt.js |
| Python | pymodbus / opcua / paho-mqtt |
| Go | go-modbus / opcua / paho.mqtt.golang |
| C# | FluentModbus / OPC UA .NET / MQTTnet |
| Rust | tokio-modbus / opcua / rumqtt |

### 2.8.4 History Management

- 請求歷史：自動記錄所有請求，可搜尋、重新執行
- 數據日誌：DuckDB 本地儲存，支援離線檢視
- 變更追蹤：記錄設定變更，可還原先前版本

---

## 2.9 Module 9: Utilities & Tools (NEW)

> **實用工具箱**：工程師日常會用到的小工具，不用再開其他軟體。

### 2.9.1 Protocol Calculator

| Tool | Description |
|------|-------------|
| Modbus CRC | 計算 Modbus RTU CRC-16 校驗碼 |
| Byte Order | Big/Little Endian 轉換，Byte Swap |
| Data Type | IEEE 754 Float 解析、BCD 轉換 |
| Address | Modbus 地址格式轉換 (40001 ↔ HR:0 ↔ %MW0) |

### 2.9.2 Packet Analyzer

```
┌─────────────────────────────────────────────────────────────────┐
│  Packet Analyzer                                                │
├─────────────────────────────────────────────────────────────────┤
│  Raw Hex:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 01 03 00 00 00 0A C5 CD                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Decoded:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Unit ID:       0x01 (1)                                 │   │
│  │ Function:      0x03 (Read Holding Registers)            │   │
│  │ Start Addr:    0x0000 (0)                               │   │
│  │ Quantity:      0x000A (10)                              │   │
│  │ CRC:           0xCDC5 ✓ Valid                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.9.3 Network Tools

| Tool | Description |
|------|-------------|
| Ping | 測試目標主機連通性 |
| Port Scan | 掃描目標主機開放的通訊埠 |
| TCP Test | 建立 TCP 連線測試，發送自訂數據 |
| DNS Lookup | 解析主機名稱 |

### 2.9.4 Timestamp Tools

| Tool | Description |
|------|-------------|
| 時間轉換 | Unix Timestamp ↔ ISO 8601 ↔ 本地時間 |
| 時區轉換 | 不同時區時間轉換 |
| 時間計算 | 計算兩個時間點的差距 |

### 2.9.5 Import/Export Tag Profiles

| Format | Description |
|--------|-------------|
| CSV | 簡易點位表匯入匯出 |
| Kepware CSV | 相容 Kepware 匯出格式 |
| Ignition JSON | 相容 Ignition 標籤格式 |

---

## 2.10 Module 10: Configuration Management ⭐ (NEW)

> **解決痛點**：辛苦設定好的連線、點位、Dashboard，換台電腦又要重來；想分享給同事也很麻煩。

### 2.10.1 Workspace Export/Import

**一鍵匯出整個工作環境，換台電腦立即重現。**

```
┌─────────────────────────────────────────────────────────────────┐
│  Export Workspace                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Export Name: [Production_Line_A_Config    ]                   │
│                                                                 │
│  Include:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [☑] Connections (5 items)                               │   │
│  │     [☑] PLC-Line-A (Modbus)                             │   │
│  │     [☑] SCADA-Server (OPC UA)                           │   │
│  │     [☑] MQTT-Broker (MQTT)                              │   │
│  │     [☑] Simulator-1 (Modbus)                            │   │
│  │     [☐] Test-Connection (exclude)                       │   │
│  │                                                         │   │
│  │ [☑] Tag Definitions (127 tags)                          │   │
│  │ [☑] Collections & Requests (3 collections)              │   │
│  │ [☑] Environments (3 environments)                       │   │
│  │ [☑] Dashboards (2 layouts)                              │   │
│  │ [☑] Alert Rules (12 rules)                              │   │
│  │ [☑] Bridge Mappings (5 mappings)                        │   │
│  │ [☑] Scripts (8 scripts)                                 │   │
│  │ [☐] Credentials (passwords, certificates)               │   │
│  │ [☐] Historical Data                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Format: [YAML ▼]  ○ JSON  ○ YAML  ○ Connex Binary (.cxpkg)   │
│                                                                 │
│  Options:                                                       │
│  [☑] Include comments & descriptions                           │
│  [☐] Encrypt sensitive data (requires password)                │
│  [☐] Compress output (.zip)                                    │
│                                                                 │
│                              [Cancel]  [Export]                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.10.2 Export Formats

| Format | Extension | Use Case | Human Readable |
|--------|-----------|----------|----------------|
| **YAML** | `.yaml` | 版本控制、手動編輯、團隊協作 | ✅ 最佳 |
| **JSON** | `.json` | 程式處理、API 整合 | ✅ 好 |
| **Connex Package** | `.cxpkg` | 完整備份、含二進位資源 | ❌ |

### 2.10.3 YAML Configuration Schema

```yaml
# Connex Studio Workspace Configuration
# Version: 1.0
# Exported: 2025-01-18T14:30:00+08:00
# Application: Connex Studio 1.0.0

meta:
  name: "Production Line A"
  description: "廠區A產線監控設定"
  author: "KC Chien"
  created: "2025-01-15"
  modified: "2025-01-18"
  tags: ["production", "line-a", "plc"]

# ═══════════════════════════════════════════════════════════════
# 環境變數定義
# ═══════════════════════════════════════════════════════════════
environments:
  - name: "Development"
    isDefault: true
    variables:
      FACTORY_IP: "127.0.0.1"
      PLC_PORT: "502"
      MQTT_BROKER: "localhost"
      MQTT_PORT: "1883"

  - name: "Production"
    variables:
      FACTORY_IP: "192.168.1.100"
      PLC_PORT: "502"
      MQTT_BROKER: "mqtt.factory.local"
      MQTT_PORT: "8883"
      MQTT_USE_TLS: "true"

# ═══════════════════════════════════════════════════════════════
# 連線設定
# ═══════════════════════════════════════════════════════════════
connections:
  - id: "conn-plc-01"
    name: "PLC-Production-Line-A"
    protocol: "modbus-tcp"
    enabled: true
    settings:
      host: "${FACTORY_IP}"
      port: "${PLC_PORT}"
      unitId: 1
      timeout: 3000
      retryCount: 3
      retryInterval: 1000
    polling:
      enabled: true
      interval: 500
    tags:
      - name: "Temperature_Zone1"
        address: "HR:40001"
        dataType: "float32"
        byteOrder: "big-endian"
        scale: 0.1
        offset: 0
        unit: "°C"
        description: "Zone 1 溫度感測器"
        alerts:
          - type: "high"
            threshold: 80
            severity: "warning"
          - type: "high"
            threshold: 95
            severity: "critical"

      - name: "Pressure_Main"
        address: "HR:40003"
        dataType: "float32"
        byteOrder: "big-endian"
        scale: 0.01
        unit: "bar"

      - name: "Motor_Status"
        address: "COIL:00001"
        dataType: "boolean"
        displayAs: "trafficLight"
        trueLabel: "運轉"
        falseLabel: "停止"

  - id: "conn-mqtt-01"
    name: "Cloud-MQTT-Broker"
    protocol: "mqtt"
    enabled: true
    settings:
      host: "${MQTT_BROKER}"
      port: "${MQTT_PORT}"
      clientId: "connex-${$randomHex:8}"
      useTls: "${MQTT_USE_TLS:false}"
      username: "${MQTT_USER:}"
      # password 不匯出，需手動輸入
    subscriptions:
      - topic: "factory/+/temperature"
        qos: 1
      - topic: "factory/+/status"
        qos: 0

# ═══════════════════════════════════════════════════════════════
# Bridge 對應設定
# ═══════════════════════════════════════════════════════════════
bridges:
  - name: "PLC to Cloud"
    enabled: true
    source:
      connectionId: "conn-plc-01"
      tags: ["Temperature_Zone1", "Pressure_Main", "Motor_Status"]
    target:
      connectionId: "conn-mqtt-01"
      topicTemplate: "factory/line-a/${tagName}"
    options:
      publishInterval: 1000
      publishOnChange: true
      changeThreshold: 0.1
    payloadTemplate: |
      {
        "timestamp": "${$isoTimestamp}",
        "value": ${value},
        "unit": "${unit}",
        "quality": "${quality}"
      }

# ═══════════════════════════════════════════════════════════════
# Collections (測試集)
# ═══════════════════════════════════════════════════════════════
collections:
  - name: "Daily Health Check"
    description: "每日設備健康檢查"
    requests:
      - name: "Read All Temperatures"
        connectionId: "conn-plc-01"
        operation: "read"
        addresses: ["HR:40001", "HR:40010", "HR:40020"]
        assertions:
          - type: "range"
            min: 0
            max: 100
            message: "溫度超出合理範圍"

      - name: "Check Motor Status"
        connectionId: "conn-plc-01"
        operation: "read"
        addresses: ["COIL:00001", "COIL:00002"]

# ═══════════════════════════════════════════════════════════════
# Dashboard 佈局
# ═══════════════════════════════════════════════════════════════
dashboards:
  - name: "Main Overview"
    isDefault: true
    layout:
      columns: 12
      rowHeight: 60
    widgets:
      - type: "gauge"
        title: "Zone 1 Temperature"
        tagRef: "conn-plc-01/Temperature_Zone1"
        position: { x: 0, y: 0, w: 3, h: 4 }
        config:
          min: 0
          max: 100
          thresholds: [60, 80, 95]
          colors: ["green", "yellow", "orange", "red"]

      - type: "chart"
        title: "Temperature Trend"
        tagRefs:
          - "conn-plc-01/Temperature_Zone1"
          - "conn-plc-01/Temperature_Zone2"
        position: { x: 3, y: 0, w: 6, h: 4 }
        config:
          timeRange: "5m"
          refreshInterval: 1000

# ═══════════════════════════════════════════════════════════════
# 告警規則
# ═══════════════════════════════════════════════════════════════
alerts:
  globalSettings:
    soundEnabled: true
    desktopNotification: true

  rules:
    - name: "High Temperature Alert"
      enabled: true
      condition:
        tagRef: "conn-plc-01/Temperature_Zone1"
        operator: ">"
        value: 80
        duration: "5s"  # 持續 5 秒才觸發
      actions:
        - type: "notification"
          title: "溫度過高警報"
          message: "Zone 1 溫度已達 ${value}°C"
        - type: "sound"
          soundFile: "alert-warning.wav"
        - type: "log"
          level: "warning"

# ═══════════════════════════════════════════════════════════════
# 數據採集設定
# ═══════════════════════════════════════════════════════════════
dataAcquisition:
  defaultSettings:
    sampleInterval: 1000
    bufferSize: 5000
    autoSave: true

  profiles:
    - name: "High Speed Capture"
      sampleInterval: 100
      maxDuration: "10m"

    - name: "Long Term Recording"
      sampleInterval: 5000
      maxDuration: "24h"
      downsample: true

# ═══════════════════════════════════════════════════════════════
# 腳本
# ═══════════════════════════════════════════════════════════════
scripts:
  - name: "Overheat Protection"
    trigger: "onTagChange"
    tagRef: "conn-plc-01/Temperature_Zone1"
    language: "csharp"
    code: |
      if (Tag.Value > 95)
      {
          await Modbus.WriteAsync("conn-plc-01", "COIL:00010", true);
          Log.Warning($"Overheat protection triggered: {Tag.Value}°C");
          Alert.Send("Emergency", "溫度過高，已啟動保護機制");
      }
```

### 2.10.4 Import Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Import Configuration                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  File: [Production_Line_A_Config.yaml        ] [Browse...]     │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  Preview:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Meta Information                                      │   │
│  │   Name: Production Line A                               │   │
│  │   Author: KC Chien                                      │   │
│  │                                                         │   │
│  │ ✓ 2 Environments                                        │   │
│  │ ✓ 2 Connections                                         │   │
│  │   ⚠ Connection "PLC-Line-A" already exists             │   │
│  │ ✓ 127 Tag Definitions                                   │   │
│  │ ✓ 1 Collection (3 requests)                             │   │
│  │ ✓ 1 Dashboard                                           │   │
│  │ ✓ 5 Alert Rules                                         │   │
│  │ ✓ 1 Bridge Mapping                                      │   │
│  │ ✓ 1 Script                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Conflict Resolution:                                          │
│  ○ Skip existing items                                         │
│  ● Overwrite existing items                                    │
│  ○ Rename imported items (add suffix)                          │
│  ○ Ask for each conflict                                       │
│                                                                 │
│  [☑] Validate configuration before import                      │
│  [☑] Create backup of current settings                         │
│                                                                 │
│                    [Cancel]  [Preview Changes]  [Import]       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.10.5 Configuration Features

| Feature | Description |
|---------|-------------|
| **變數引用** | 使用 `${VAR_NAME}` 引用環境變數，切換環境自動替換 |
| **預設值** | 使用 `${VAR:default}` 語法設定預設值 |
| **動態變數** | `${$timestamp}`, `${$randomHex:8}` 等動態產生 |
| **敏感資料處理** | 密碼、憑證預設不匯出，匯入時提示輸入 |
| **版本相容** | 自動偵測版本，提示不相容的設定項 |
| **差異比較** | 匯入前可預覽與現有設定的差異 |
| **選擇性匯入** | 可只匯入部分項目 (如只要 Dashboards) |
| **備份還原** | 匯入前自動備份，可一鍵還原 |

### 2.10.6 CLI Support

```bash
# 命令列匯出
connex-studio export --output config.yaml --format yaml

# 命令列匯入
connex-studio import config.yaml --conflict overwrite

# 驗證設定檔
connex-studio validate config.yaml

# 比較兩個設定檔
connex-studio diff config-v1.yaml config-v2.yaml

# 合併設定檔
connex-studio merge base.yaml override.yaml --output merged.yaml
```

### 2.10.7 Git-Friendly Features

| Feature | Description |
|---------|-------------|
| **YAML 格式** | 人類可讀、Git diff 友善 |
| **排序穩定** | 每次匯出欄位順序一致，減少無意義的 diff |
| **註解保留** | 匯入時保留 YAML 註解 |
| **ID 穩定** | 物件 ID 不隨機產生，便於追蹤變更 |
| **.gitignore 範本** | 提供建議的 gitignore 設定 |

```gitignore
# Connex Studio .gitignore
# 建議納入版控
*.yaml
*.json
!secrets.yaml  # 排除機密檔

# 建議排除
*.cxpkg        # 二進位包
*.duckdb       # 時序資料庫
*.duckdb.wal   # WAL 檔
/logs/         # 日誌
/backups/      # 備份
credentials.yaml  # 機密設定
```

### 2.10.8 Quick Setup Scenarios

| Scenario | Description |
|----------|-------------|
| **新機器部署** | 匯入 YAML → 輸入密碼 → 開始使用 |
| **團隊協作** | Git clone → connex-studio import → Ready |
| **客戶交接** | 匯出設定 (不含密碼) → 交付 → 客戶輸入自己的密碼 |
| **災難復原** | 從備份匯入 → 選擇還原點 → 完整還原 |
| **A/B 測試** | 匯出兩份設定 → 分別測試 → 比較結果 |

---

# 3. Development Roadmap

## 3.1 Priority Matrix

| Module | Priority | Phase | Estimate |
|--------|----------|-------|----------|
| 連線管理 + Smart Probe | P0 | Phase 1 | 2 週 |
| Modbus TCP Client | P0 | Phase 1 | 1.5 週 |
| OPC UA Client | P0 | Phase 1 | 2 週 |
| MQTT Client | P0 | Phase 1 | 1.5 週 |
| Super Grid + Sparklines ⭐ | P0 | Phase 1 | 2 週 |
| Data DVR 時光回溯 ⭐ | P0 | Phase 1 | 1.5 週 |
| Virtual Server (Mock) | P0 | Phase 1 | 2 週 |
| **Data Logger + DuckDB** ⭐ | **P0** | **Phase 1** | **2 週** |
| **匯出 CSV/Excel** | **P0** | **Phase 1** | **1 週** |
| 示波器圖表 | P1 | Phase 2 | 2 週 |
| The Bridge 協定橋接 ⭐ | P1 | Phase 2 | 2.5 週 |
| Collections + Environment | P1 | Phase 2 | 2 週 |
| 告警系統 | P1 | Phase 2 | 1.5 週 |
| 程式碼生成 | P1 | Phase 2 | 1 週 |
| 報告生成 | P1 | Phase 2 | 1.5 週 |
| Protocol Calculator | P1 | Phase 2 | 1 週 |
| **Config Export/Import** | **P1** | **Phase 2** | **1.5 週** |
| TypeScript 腳本引擎 | P2 | Phase 3 | 2.5 週 |
| AI Copilot (OCR) | P2 | Phase 3 | 3 週 |
| AI 異常檢測 | P2 | Phase 3 | 2 週 |
| Team Sync 協作 | P2 | Phase 3 | 2.5 週 |

## 3.2 Milestones

### Phase 1: MVP (12 weeks)

**Goal**: 一個讓人「Wow」的最小可行產品，具備完整的採集-檢視-存檔-匯出流程。

- ✅ 三協定基本連線 + Smart Probe 自動偵測
- ✅ Super Grid + Sparklines 微趨勢圖 (差異化關鍵)
- ✅ Data DVR 時光回溯 (差異化關鍵)
- ✅ Virtual Server 讓無硬體用戶也能完整體驗
- ✅ **Data Logger + DuckDB 數據存檔** (核心功能)
- ✅ **CSV/Excel 匯出** (核心功能)

### Phase 2: Professional (10 weeks)

**Goal**: 具備完整工作流程的專業工具。

- ✅ The Bridge 協定橋接 (Killer Feature)
- ✅ Collections + Environment 完整支援
- ✅ 示波器多軸疊圖 + 儀表板
- ✅ 告警與通知系統
- ✅ 報告生成
- ✅ Protocol Calculator 工具箱

### Phase 3: Advanced (10 weeks)

**Goal**: 建立競爭壁壘與進階功能。

- ✅ TypeScript 腳本引擎 + 自動化測試
- ✅ AI Copilot 智慧輔助
- ✅ Team Sync 團隊協作

---

# 4. Technical Specifications

## 4.1 Technology Stack

為了確保在工業應用中仍有足夠的穩定性，我們採用 **Electron + Native Node Modules** 的混合架構，在保有 Web 開發的彈性同時，也能存取底層系統資源。

| 層級 | 技術選型 | 版本 | 理由 |
|------|----------|------|------|
| **App Shell** | Electron | 34+ | 跨平台桌面容器，擁有最強大的視窗管理與系統整合能力 |
| **Frontend UI** | React | 19 | React 生態系最豐富，元件複用性高 |
| **Build Tool** | Vite | 6.x | 秒級熱更新 (HMR)，開發體驗極佳 |
| **UI Framework** | Shadcn/ui + Tailwind CSS | Latest | 頂級新創質感，完全可客製化的 UI 源碼 |
| **Backend Logic** | Node.js (Main Process) | 22 LTS | 通訊邏輯跑在 Electron 主進程，避免渲染進程卡頓 |
| **Language** | TypeScript | 5.x | 強制要求，處理 Modbus Buffer 或 MQTT 複雜物件時，型別安全是底線 |
| **Modbus** | modbus-serial | 8.x | Node.js 界下載量最大、最穩定的庫，支援 RTU/TCP，Promise-based |
| **OPC UA** | node-opcua | 2.x | Node.js 界唯一完整 OPC UA 實作，支援 Client/Server, Security Policies |
| **MQTT** | MQTT.js | 5.x | MQTT 官方推薦的 JS 客戶端，支援 MQTT 5.0 |
| **時序圖表** | uPlot | 1.6.x | Web 界效能最強的 Canvas 繪圖庫，專為 Time-series 優化 |
| **豐富圖表** | ECharts | 5.x | 百度開源，漂亮且互動豐富 |
| **時序資料庫** | better-sqlite3 | 11.x | 同步 API，C++ Addon 效能極佳，適合寫入 Modbus Log |
| **前後端通訊** | electron-trpc | Latest | 型別安全的 IPC，前端呼叫後端像呼叫 function 一樣簡單 |
| **設定儲存** | YAML (js-yaml) | 4.x | Git 友善，人類可讀 |
| **程式碼編輯器** | Monaco Editor | Latest | VS Code 編輯器核心，語法高亮、錯誤提示 |
| **Excel 匯出** | ExcelJS | 4.x | 完整 Excel 支援，多工作表、圖表 |
| **PDF 報告** | pdfmake | 0.2.x | 純 JavaScript PDF 生成 |

## 4.2 Data Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Connex Studio Data Layer                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   YAML Files    │    │  better-sqlite3 │                    │
│  │   (settings)    │    │   (timeseries)  │                    │
│  ├─────────────────┤    ├─────────────────┤                    │
│  │ • Connections   │    │ • Timeseries    │                    │
│  │ • Collections   │    │ • Sessions      │                    │
│  │ • Environments  │    │ • Alerts Log    │                    │
│  │ • Dashboards    │    │                 │                    │
│  │ • Preferences   │    │                 │                    │
│  └─────────────────┘    └─────────────────┘                    │
│         │                       │                               │
│         └───────────┬───────────┘                               │
│                     │                                           │
│            ┌────────▼────────┐                                  │
│            │   tRPC Router   │                                  │
│            │  (Main Process) │                                  │
│            └─────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### IPC 架構 (Electron tRPC)

```typescript
// Main Process (後端)
const appRouter = router({
  modbus: modbusRouter,
  mqtt: mqttRouter,
  opcua: opcuaRouter,
  database: databaseRouter,
  config: configRouter,
});

// Renderer Process (前端)
const result = await trpc.modbus.readHoldingRegisters.query({
  connectionId: 'conn-1',
  address: 40001,
  count: 10
});
```

## 4.3 Performance Optimization

- **Main Process 處理 I/O**：所有通訊邏輯在 Electron 主進程，透過 IPC 與 Renderer 溝通，避免 UI 卡頓
- **Worker Threads**：CPU 密集型操作 (如 CRC 計算、大量數據解析) 使用 Node.js Worker Threads
- **高效序列化**：使用 `Buffer` 和 `TypedArray` 處理二進位協定數據
- **環形緩衝區**：Data DVR 使用固定大小 Circular Buffer，記憶體用量可控
- **Canvas 繪圖**：uPlot 使用 Canvas 2D，單一圖表可渲染數萬點
- **批次寫入**：SQLite 採用批次寫入 (每 1000 筆或每秒)，減少 I/O 次數
- **索引最佳化**：時間戳、Session ID、Tag Name 建立複合索引
- **React 虛擬化**：大列表使用 `react-window` 或 `@tanstack/react-virtual`

## 4.4 System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| 作業系統 | Windows 10 / macOS 12 / Ubuntu 20.04 | Latest |
| CPU | 2 cores | 4+ cores |
| 記憶體 | 4GB | 8GB+ |
| 儲存空間 | 500MB (不含數據) | SSD 推薦 |
| 網路 | TCP/IP | Gigabit Ethernet |
| Node.js | 22 LTS (開發環境) | Latest LTS |

## 4.5 UI/UX Design Highlights (Electron 優勢)

### Glassmorphism 毛玻璃特效
在 macOS 上啟用 Electron 的 `vibrancy: 'under-window'`，讓側邊欄透出桌布的模糊色調，質感瞬間超越原生 App。

### Monaco Editor 整合
在腳本編輯、JSON 檢視功能中，直接嵌入 `@monaco-editor/react`。這是 VS Code 的編輯器核心，支援：
- TypeScript/JavaScript 語法高亮
- 錯誤提示與自動補全
- 自訂主題 (Connex Dark)

### 現代 Web 動畫
使用 Framer Motion 實現流暢的：
- 頁面轉場動畫
- 側邊欄展開/收合
- 數值變化動畫
- 拖曳排序回饋

---

# Part II: UI/UX Design System

## Industrial Precision Design Language

*(保持原有 UI/UX 設計系統內容，此處省略以縮減篇幅)*

---

# 5. Design Philosophy

> *工業級的精準，消費級的優雅。*

*(詳細內容見 v2.0 文件)*

---

# Appendix D: Missing Features Analysis (NEW)

## 經過審視後發現的遺漏功能

| Category | Feature | Priority | Status |
|----------|---------|----------|--------|
| **數據管理** | 數據採集存檔 | P0 | ✅ Added |
| **數據管理** | DuckDB 時序儲存 | P0 | ✅ Added |
| **數據管理** | CSV/Excel 匯出 | P0 | ✅ Added |
| **數據管理** | Parquet 匯出 | P1 | ✅ Added |
| **連線管理** | 連線健康監測 | P1 | ✅ Added |
| **連線管理** | 自動重連機制 | P1 | ✅ Added |
| **數據操作** | 寫入操作面板 | P1 | ✅ Added |
| **數據操作** | 寫入安全鎖定 | P1 | ✅ Added |
| **告警系統** | 完整告警功能 | P1 | ✅ Added |
| **告警系統** | 告警歷史記錄 | P1 | ✅ Added |
| **工具箱** | Protocol Calculator | P1 | ✅ Added |
| **工具箱** | Packet Analyzer | P1 | ✅ Added |
| **工具箱** | Network Tools | P2 | ✅ Added |
| **橋接功能** | Payload Template | P1 | ✅ Added |
| **視覺化** | XY 繪圖模式 | P2 | ✅ Added |
| **視覺化** | 書籤標記功能 | P2 | ✅ Added |
| **匯入匯出** | 相容第三方格式 | P2 | ✅ Added |
| **設定管理** | YAML/JSON 完整設定匯出入 | P1 | ✅ Added |
| **設定管理** | CLI 命令列支援 | P2 | ✅ Added |
| **設定管理** | Git 友善設計 | P1 | ✅ Added |
| **報告** | 自動報告生成 | P1 | ✅ Added |

---

# Appendix E: Glossary (Updated)

| Term | Definition |
|------|------------|
| **Tag** | Unified abstraction for any data point (Modbus Register, OPC UA Node, MQTT Topic) |
| **Sparkline** | Miniature inline chart showing recent value trend |
| **Data DVR** | Feature allowing time-travel through recent data |
| **The Bridge** | Protocol-to-protocol data forwarding feature |
| **Super Grid** | Enhanced data table with inline visualizations |
| **Collection** | Organized group of saved requests/configurations |
| **Environment** | Set of variables for different deployment contexts |
| **DuckDB** | Embedded analytical database for time-series storage |
| **Data Logger** | Feature to record tag values to database |
| **Session** | A recording session with defined start/end time |
| **Pre-trigger Buffer** | Data captured before trigger condition is met |
| **Workspace** | Complete exportable configuration package |
| **Profile** | A saved configuration that can be imported |

---

**Document Version**: 3.0
**Last Updated**: January 2025
**Status**: Complete Draft

---

*「簡單的事情保持簡單，複雜的事情變得可能。」*

**— Connex Studio Design Philosophy**
