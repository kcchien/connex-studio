# Feature Specification: MVP Protocol Clients

**Feature Branch**: `001-mvp-protocol-clients`  
**Created**: 2026-01-21  
**Status**: Draft  
**Input**: User description: "跨平台工業通訊協定測試工具 MVP，支援 OPC UA, Modbus TCP, MQTT 三協定客戶端，具備現代化 UI 與流暢使用體驗"
**Reference**: `Connex_Studio_Complete_Specification_v3.md` - Phase 1 MVP

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modbus TCP 連線與數據讀取 (Priority: P1)

身為一位工業自動化工程師，我想要快速連線到 Modbus TCP 設備並讀取 Holding Registers 數據，以便驗證 PLC 通訊是否正常運作。

**Why this priority**: Modbus TCP 是最廣泛使用的工業協定，佔目標用戶 80% 以上的使用場景。這是驗證產品核心價值的最小功能集。

**Independent Test**: 可透過連線到任意 Modbus TCP Slave（或內建 Virtual Server）讀取 Register 值來完整測試，無需其他協定功能。

**Acceptance Scenarios**:

1. **Given** 應用程式已啟動且無任何連線，**When** 用戶輸入 IP 地址 (如 `192.168.1.100`) 與 Port (如 `502`) 並點擊「連線」，**Then** 系統在 3 秒內顯示連線成功狀態，並顯示連線健康指示燈為綠色
2. **Given** Modbus TCP 連線已建立，**When** 用戶指定讀取 Holding Register 地址 40001-40010，**Then** 系統在 1 秒內返回 10 個 Register 的數值並顯示於 Super Grid 表格
3. **Given** Modbus TCP 連線已建立且正在輪詢，**When** 用戶設定 500ms 輪詢間隔，**Then** Super Grid 每 500ms 自動更新數值，且 Sparklines 微趨勢圖即時顯示過去 30 秒的變化
4. **Given** 目標設備不存在或網路異常，**When** 用戶嘗試連線，**Then** 系統在逾時後 (預設 3 秒) 顯示明確錯誤訊息「連線逾時：無法連線到 192.168.1.100:502」

---

### User Story 2 - Virtual Modbus Server 模擬器 (Priority: P1)

身為一位軟體開發者，我想要在沒有實體 PLC 的情況下啟動虛擬 Modbus Server，以便開發和測試我的 IIoT 應用程式。

**Why this priority**: 讓無硬體用戶也能完整體驗產品價值，是 MVP 差異化的關鍵。與 User Story 1 搭配可形成完整的自給自足測試環境。

**Independent Test**: 可獨立啟動 Virtual Server 並使用任意 Modbus 客戶端工具連線測試，無需依賴 User Story 1。

**Acceptance Scenarios**:

1. **Given** 應用程式已啟動，**When** 用戶點擊「啟動 Virtual Server」並選擇 Modbus TCP 類型，**Then** 系統在本機 `localhost:502` 啟動虛擬 Slave，狀態列顯示「Virtual Server 運行中」
2. **Given** Virtual Modbus Server 已啟動，**When** 外部 Modbus 客戶端發送讀取 Holding Register 請求，**Then** Server 返回對應 Register 的當前值
3. **Given** Virtual Server 已啟動，**When** 用戶設定 Waveform Generator 產生正弦波於地址 40001，**Then** 該 Register 值依正弦函數自動變化，週期與振幅符合用戶設定

---

### User Story 3 - MQTT 客戶端連線與訂閱 (Priority: P2)

身為一位系統整合商，我想要連線到 MQTT Broker 並訂閱特定 Topic，以便監控設備發送的即時訊息。

**Why this priority**: MQTT 是 IIoT 雲端整合的主流協定，但優先級略低於 Modbus 因為許多用戶優先驗證地端設備。

**Independent Test**: 可透過連線到公開 MQTT Broker（如 `test.mosquitto.org`）或內建 Virtual Broker 獨立測試訂閱功能。

**Acceptance Scenarios**:

1. **Given** 應用程式已啟動，**When** 用戶輸入 MQTT Broker 地址與連線資訊並點擊連線，**Then** 系統建立連線並顯示連線成功狀態
2. **Given** MQTT 連線已建立，**When** 用戶訂閱 Topic `factory/+/temperature`，**Then** 系統即時接收並顯示符合該 Topic 模式的所有訊息
3. **Given** MQTT 連線已建立且有訂閱，**When** 收到 JSON 格式的 Payload，**Then** Response Viewer 以 JSON 視圖模式顯示格式化內容，支援語法高亮與摺疊

---

### User Story 4 - OPC UA 客戶端連線與節點瀏覽 (Priority: P2)

身為一位自動化工程師，我想要連線到 OPC UA Server 並瀏覽節點結構，以便找到需要監控的數據點。

**Why this priority**: OPC UA 是工業 4.0 標準協定，重要但實作複雜度高，安排於 MQTT 之後。

**Independent Test**: 可透過連線到公開 OPC UA Server 或使用內建 Virtual OPC UA Server 獨立測試瀏覽功能。

**Acceptance Scenarios**:

1. **Given** 應用程式已啟動，**When** 用戶輸入 OPC UA Endpoint URL 並選擇安全策略後點擊連線，**Then** 系統建立連線並於樹狀視圖顯示根節點
2. **Given** OPC UA 連線已建立，**When** 用戶展開節點樹並點選某個 Variable 節點，**Then** 系統顯示該節點的當前值、資料型別、時間戳與品質狀態
3. **Given** OPC UA 連線已建立，**When** 用戶訂閱多個節點變數，**Then** 系統透過 Subscription 機制即時更新數值至 Super Grid

---

### User Story 5 - Super Grid 即時數據呈現與 Sparklines (Priority: P1)

身為一位工程師，我想要在表格中看到每個數據點的即時數值與微型趨勢圖，以便一眼識別哪些值正在變動或異常。

**Why this priority**: Super Grid 與 Sparklines 是產品核心差異化功能，直接影響用戶「Wow」體驗。

**Independent Test**: 可透過任一協定連線後觀察 Super Grid 表格呈現，驗證 Sparklines 是否即時更新。

**Acceptance Scenarios**:

1. **Given** 任一協定連線已建立並有數據流入，**When** 數據更新頻率 ≤ 500ms，**Then** Super Grid 每個數值欄位旁的 Sparkline 微趨勢圖顯示過去 30 秒的波形變化
2. **Given** Super Grid 顯示多個 Tag，**When** 用戶點擊數值格式下拉選單，**Then** 可即時切換顯示格式 (Int16 / Float32 / Hex / Binary / ASCII)
3. **Given** Super Grid 顯示數據，**When** 某數值超出用戶設定的告警範圍，**Then** 該列以警示色 (黃色/紅色) 高亮顯示

---

### User Story 6 - Data DVR 時光回溯 (Priority: P1)

身為一位工程師，我想要在看到異常瞬間後，能夠暫停並回溯過去幾分鐘的數據，以便分析異常發生的完整過程。

**Why this priority**: Data DVR 是核心差異化功能，解決傳統工具「錯過就沒了」的痛點。

**Independent Test**: 可透過任一協定連線後，在任意時間點暫停並拖動時間軸驗證回溯功能。

**Acceptance Scenarios**:

1. **Given** 任一協定連線已建立且持續接收數據，**When** 數據流持續 5 分鐘以上，**Then** 系統自動保留最近 5 分鐘的數據於環形緩衝區
2. **Given** 數據正在即時更新，**When** 用戶點擊「暫停」按鈕，**Then** Super Grid 凍結於當前時刻，時間軸滑桿出現並可拖動
3. **Given** 數據已暫停，**When** 用戶拖動時間軸滑桿至 2 分鐘前，**Then** Super Grid 與所有圖表同步顯示該時刻的數據快照
4. **Given** 正在回溯某時間點，**When** 用戶點擊「繼續」按鈕，**Then** 系統恢復即時更新模式

---

### User Story 7 - 跨平台桌面應用體驗 (Priority: P1)

身為一位工程師，我想要在 Windows、macOS 和 Linux 上都能使用相同的應用程式，並獲得流暢的原生桌面體驗。

**Why this priority**: 跨平台是產品基礎架構需求，影響所有用戶。

**Independent Test**: 在三個作業系統上分別啟動應用程式並執行基本連線操作。

**Acceptance Scenarios**:

1. **Given** 用戶在 Windows 10+ / macOS 12+ / Ubuntu 20.04+ 上安裝應用程式，**When** 點擊應用程式圖示，**Then** 應用程式在 5 秒內完成啟動並顯示主介面
2. **Given** 應用程式已啟動，**When** 用戶操作介面（視窗縮放、側邊欄展開收合、頁面切換），**Then** 所有動畫流暢無卡頓 (≥ 60 fps)
3. **Given** 應用程式在 macOS 上執行，**When** 側邊欄顯示時，**Then** 可選啟用毛玻璃 (Glassmorphism) 視覺效果

---

### Edge Cases

- 當目標設備在輪詢過程中突然斷線時，系統如何處理？
  - 預期：顯示連線中斷警告，自動嘗試重連（可設定重試次數與間隔）
- 當 Modbus 地址超出設備支援範圍時，系統如何處理？
  - 預期：顯示 Modbus Exception 錯誤碼與人類可讀的說明
- 當 MQTT Payload 非 JSON 格式時，系統如何顯示？
  - 預期：自動偵測並以原始文字或 Hex 視圖顯示
- 當 OPC UA Server 要求憑證驗證時，系統如何處理？
  - 預期：提示用戶是否信任該憑證，可選擇「信任一次」或「永久信任」
- 當環形緩衝區達到 5 分鐘上限時，系統如何處理新數據？
  - 預期：自動覆寫最舊的數據，維持固定記憶體用量

---

## Requirements *(mandatory)*

### Functional Requirements

**連線管理**
- **FR-001**: System MUST 支援 Modbus TCP 客戶端連線，包含 IP、Port、Unit ID 參數設定
- **FR-002**: System MUST 支援 MQTT 客戶端連線，包含 Broker URL、Port、ClientID、用戶名/密碼、TLS 設定
- **FR-003**: System MUST 支援 OPC UA 客戶端連線，包含 Endpoint URL、安全策略選擇、憑證處理
- **FR-004**: System MUST 顯示每個連線的健康狀態（已連線/斷線/重連中）
- **FR-005**: System MUST 支援斷線後自動重連，可設定重試次數與間隔

**數據讀取**
- **FR-006**: System MUST 支援 Modbus 讀取功能碼：Read Holding Registers (FC03)、Read Input Registers (FC04)、Read Coils (FC01)、Read Discrete Inputs (FC02)
- **FR-007**: System MUST 支援 MQTT 訂閱單一 Topic 與 Wildcard Topic (+, #)
- **FR-008**: System MUST 支援 OPC UA 節點瀏覽與變數訂閱 (Subscription)
- **FR-009**: System MUST 支援輪詢模式，可設定間隔 100ms ~ 60s

**數據呈現**
- **FR-010**: System MUST 以 Super Grid 表格呈現所有訂閱的數據點
- **FR-011**: System MUST 於每個數值欄位旁顯示 Sparklines 微趨勢圖（過去 30 秒）
- **FR-012**: System MUST 支援數值格式即時切換（Int16 / Float32 / Hex / Binary / ASCII）
- **FR-012a**: System MUST 支援 Modbus 多位元組數據 Byte Order 設定
  - 預設：Big-Endian（Modbus 標準字序）
  - 每個 Tag 可覆寫為：Big-Endian / Little-Endian / Mid-Big (CDAB) / Mid-Little (DCBA)
  - Connection 層級預設值，Tag 層級可覆寫
  - 適用於 Float32、Float64、Int32、Int64 數據類型
  - 設定變更後即時生效，不需重新連線
- **FR-013**: System MUST 支援 JSON Payload 的語法高亮與摺疊顯示
- **FR-014**: System MUST 支援 OPC UA 節點的樹狀結構瀏覽

**時光回溯**
- **FR-015**: System MUST 維護最近 5 分鐘數據的環形緩衝區
- **FR-016**: System MUST 支援暫停即時更新並拖動時間軸回溯
- **FR-017**: System MUST 於回溯時同步更新所有數據視圖

**虛擬伺服器**
- **FR-018**: System MUST 支援啟動 Virtual Modbus TCP Slave
- **FR-019**: System MUST 支援 Waveform Generator 產生模擬數據（正弦波、隨機值、鋸齒波、階梯波）
- **FR-020**: Virtual Server MUST 可設定 Holding/Input Register 數量與初始值

**平台與介面**
- **FR-021**: System MUST 支援 Windows 10+、macOS 12+、Ubuntu 20.04+
- **FR-022**: System MUST 提供 Dark Mode 介面
- **FR-023**: System MUST 所有頁面切換與動畫達到 60 fps 流暢度

### Key Entities

- **Connection（連線）**: 代表一個協定連線實例，包含協定類型、連線參數、健康狀態、重連策略
- **Tag（點位）**: 統一抽象的數據點，包含名稱、地址、資料型別、當前值、品質狀態、時間戳
- **DataPoint（數據點）**: 單一時刻的 Tag 值快照，用於環形緩衝區儲存
- **VirtualServer（虛擬伺服器）**: 模擬伺服器實例，包含類型、埠號、Register 定義、Waveform 設定

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用戶從啟動應用程式到成功讀取第一筆 Modbus 數據，可在 3 次點擊內完成
- **SC-002**: Super Grid 在 100+ 個 Tag 的情況下，輪詢更新仍維持 ≤ 50ms 的 UI 響應時間
- **SC-003**: Sparklines 微趨勢圖可渲染 30 秒內 ≤ 1000 個數據點而不影響主執行緒效能
- **SC-004**: Data DVR 環形緩衝區在 100 個 Tag、500ms 輪詢的情況下，記憶體佔用 ≤ 200MB
- **SC-005**: 應用程式冷啟動時間 ≤ 5 秒（Windows/macOS/Linux）
- **SC-006**: 在目標用戶（工業自動化工程師）測試中，80% 用戶可在無說明書情況下完成首次連線
- **SC-007**: Virtual Server 可支援同時 5 個外部客戶端連線而不影響效能

---

## Assumptions

- 用戶具備基本的工業通訊協定知識（了解 Modbus 地址、MQTT Topic 概念）
- 目標設備或 Broker 在網路上可達，用戶能提供正確的連線參數
- 首次安裝時網路連線可用（用於驗證，非必須）
- 系統滿足最低硬體需求：2 核 CPU、4GB RAM、500MB 儲存空間

---

## Clarifications

### Session 2026-01-21

- Q: Modbus Float32 數據的 Byte Order 處理策略？ → A: 預設 Big-Endian，每個 Tag 可個別設定 (Big-Endian / Little-Endian / Mid-Big / Mid-Little)
- Q: 可用性 (Availability) 目標？ → A: 無明確可用性目標，視為一般桌面應用（當機後手動重啟即可）
