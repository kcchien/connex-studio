# Feature Specification: IIoT Protocol Studio

**Feature Branch**: `002-iiot-protocol-studio`
**Created**: 2025-01-23
**Status**: Draft
**Input**: User description: "建立一個以 Electron 為主的跨平台 GUI，支援主流 Modbus TCP, OPC UA, MQTT 的 Application，讓連接工業通訊設備、測試等作業可以絲滑流暢的進行"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Connection Test (Priority: P1)

使用者想要快速測試一台新的 Modbus TCP 設備是否能正常連線與讀取資料。使用者輸入 IP 與 Port，按下連線按鈕，系統建立連線並顯示連線狀態。使用者可以立即手動讀取指定的暫存器位址，確認設備回應正確。

**Why this priority**: 這是最基本的功能，沒有連線能力就無法進行任何其他操作。快速驗證連線是工程師日常最常執行的動作。

**Independent Test**: 可透過實際連接 Modbus Simulator 或真實設備，輸入連線參數並執行單次讀取來完整測試此故事。

**Acceptance Scenarios**:

1. **Given** 應用程式已啟動且無任何連線，**When** 使用者輸入有效的 Modbus TCP 參數 (IP: 192.168.1.100, Port: 502, Unit ID: 1) 並點擊「連線」，**Then** 系統顯示「已連線」狀態，連線卡片變為綠色指示燈
2. **Given** 已建立 Modbus TCP 連線，**When** 使用者輸入暫存器位址 (Address: 40001, Length: 10) 並點擊「讀取」，**Then** 系統顯示讀取的數值陣列，並記錄此次操作於活動日誌
3. **Given** 輸入了無效的 IP 位址或設備離線，**When** 使用者點擊「連線」，**Then** 系統在 5 秒內顯示連線失敗訊息，並提供錯誤詳情

---

### User Story 2 - Tag-Based Continuous Monitoring (Priority: P1)

使用者需要持續監控多個資料點 (Tags)，並希望以視覺化方式即時觀察數值變化趨勢。使用者定義 Tag 清單後啟動輪詢，系統以 Super Grid + Sparklines 顯示即時數據。

**Why this priority**: 這是工業監控的核心需求，工程師需要同時觀察多個變數的變化趨勢來診斷問題。

**Independent Test**: 建立連線後，新增 3-5 個 Tags，啟動輪詢，觀察 Grid 中 Sparkline 是否正確繪製趨勢線，數值是否即時更新。

**Acceptance Scenarios**:

1. **Given** 已建立連線且定義了 5 個 Tags，**When** 使用者點擊「開始輪詢」並設定間隔 1000ms，**Then** 系統每秒更新所有 Tag 數值，Grid 中的 Sparklines 顯示最近 60 秒的趨勢
2. **Given** 輪詢進行中，**When** 某個 Tag 數值超出使用者定義的警戒範圍，**Then** 該 Tag 列以黃色或紅色高亮顯示
3. **Given** 輪詢進行中，**When** 使用者點擊「停止輪詢」，**Then** 系統停止資料擷取，最後的數值保留在畫面上

---

### User Story 3 - Data DVR Time-Travel (Priority: P1)

使用者想要回顧剛才發生的異常，需要能夠「倒帶」查看過去一段時間的資料快照。系統使用 Circular Buffer 保存歷史資料，使用者可拖動時間軸回溯。

**Why this priority**: 異常經常是瞬間發生的，工程師需要回顧歷史資料來分析根因，這是區別於傳統工具的關鍵功能。

**Independent Test**: 啟動輪詢 2 分鐘後，使用時間軸滑桿回到 1 分鐘前，確認顯示的數值與當時擷取的數據一致。

**Acceptance Scenarios**:

1. **Given** 系統已輪詢 5 分鐘並累積歷史資料，**When** 使用者將 DVR 時間軸拖動到 3 分鐘前，**Then** Grid 顯示該時刻的資料快照，Sparklines 顯示對應時段的歷史趨勢
2. **Given** DVR 處於回溯模式，**When** 使用者點擊「返回即時」按鈕，**Then** 系統恢復顯示即時資料，輪詢繼續
3. **Given** Circular Buffer 已滿 (預設 5 分鐘)，**When** 新資料進入，**Then** 最舊的資料被覆蓋，使用者無法回溯超過 5 分鐘

---

### User Story 4 - Connection Profile Management (Priority: P1)

使用者經常需要連接同一組設備，希望能儲存連線設定為 Profile，下次直接載入。系統將 Profile 存為 JSON 檔案，支援匯入匯出。

**Why this priority**: 提升日常工作效率，避免重複輸入相同的連線參數，也便於團隊共享設定。

**Independent Test**: 建立連線並定義 Tags 後，儲存為 Profile，關閉應用程式，重新開啟後載入該 Profile，確認連線參數與 Tags 完全還原。

**Acceptance Scenarios**:

1. **Given** 已設定連線參數與 10 個 Tags，**When** 使用者點擊「儲存 Profile」並輸入名稱「PLC-A」，**Then** 系統將設定存為 `profiles/PLC-A.json`，顯示儲存成功訊息
2. **Given** 存在多個 Profiles，**When** 使用者在 Profile 清單選擇「PLC-A」並點擊「載入」，**Then** 系統自動填入所有連線參數與 Tags，使用者可直接點擊連線
3. **Given** 使用者收到同事分享的 Profile 檔案，**When** 使用者點擊「匯入 Profile」並選擇該檔案，**Then** 系統驗證格式後加入 Profile 清單

---

### User Story 5 - Virtual Server for Testing (Priority: P2)

使用者沒有實體設備可測試，希望系統內建模擬伺服器。啟動 Virtual Server 後，可模擬 Modbus Slave 回應特定波形資料。

**Why this priority**: 開發與測試階段不一定有實體設備，Virtual Server 讓使用者可以驗證應用程式功能而不依賴外部設備。

**Independent Test**: 啟動 Virtual Server (Modbus TCP, Port 5020)，建立 Client 連線到 localhost:5020，設定 Tags 並輪詢，確認收到模擬資料。

**Acceptance Scenarios**:

1. **Given** 無實體設備可用，**When** 使用者點擊「啟動 Virtual Server」選擇 Modbus TCP 協定與 Port 5020，**Then** 系統啟動本地模擬伺服器，狀態顯示「Virtual Server Running on :5020」
2. **Given** Virtual Server 執行中，**When** 使用者設定 Register 40001-40010 輸出 Sine Wave (Amplitude: 100, Period: 10s)，**Then** 連線到該 Server 的 Client 讀取到正弦波形資料
3. **Given** Virtual Server 執行中且有 Client 連線，**When** 使用者點擊「停止 Virtual Server」，**Then** 系統關閉伺服器，Client 端顯示連線中斷

---

### User Story 6 - Multi-Protocol Support (Priority: P2)

使用者需要同時連接 Modbus TCP 與 MQTT Broker，在同一畫面監控來自不同協定的資料。

**Why this priority**: 現代工廠通常混用多種協定，整合監控能力是進階使用情境。

**Independent Test**: 建立一個 Modbus TCP 連線與一個 MQTT 連線，各定義 2 個 Tags，同時輪詢，確認 Grid 正確顯示混合來源的資料。

**Acceptance Scenarios**:

1. **Given** 系統支援多協定，**When** 使用者建立一個 Modbus TCP 連線與一個 MQTT 連線，**Then** 兩個連線同時顯示在連線清單，各自獨立管理
2. **Given** 兩個不同協定的連線都已啟動輪詢，**When** 使用者查看 Tag Grid，**Then** Grid 以不同圖示或顏色區分協定來源，資料同步更新
3. **Given** MQTT 連線已建立，**When** 使用者訂閱 Topic `factory/sensor/+/value`，**Then** 系統自動建立對應的 Tags，收到訊息時更新數值

---

### User Story 7 - Session Export & Report (Priority: P1)

使用者完成測試後，需要匯出資料紀錄作為報告依據。系統支援匯出 CSV 與簡易 HTML 報告。

**Why this priority**: 測試結果需要存檔或分享給其他人，匯出功能是完成測試流程的最後一哩路。

**Independent Test**: 輪詢 1 分鐘後，點擊匯出 CSV，確認檔案包含所有 Tags 的時間序列資料，格式正確可被 Excel 開啟。

**Acceptance Scenarios**:

1. **Given** 輪詢已進行並累積資料，**When** 使用者點擊「匯出 CSV」並選擇儲存路徑，**Then** 系統產生 CSV 檔案，包含 Timestamp, Tag Name, Value 欄位
2. **Given** 輪詢已進行，**When** 使用者點擊「產生報告」，**Then** 系統產生 HTML 報告，包含連線資訊、Tag 清單、統計摘要 (Min, Max, Avg) 與趨勢圖
3. **Given** 匯出進行中，**When** 資料量超過 10000 筆，**Then** 系統顯示進度條，匯出完成後通知使用者

---

### Edge Cases

- What happens when **網路中斷** during polling? System MUST detect disconnection within 3 seconds, pause polling, show reconnection UI, and auto-retry with exponential backoff
- What happens when **Circular Buffer 記憶體不足**? System MUST enforce configurable max buffer size (default 5 min × tags × sample rate), drop oldest data gracefully
- What happens when **使用者輸入非法參數** (e.g., Port > 65535, negative address)? System MUST validate inputs before sending, show inline validation errors
- How does system handle **MQTT Broker requires authentication**? System MUST support username/password and certificate-based auth in connection dialog
- What happens when **匯入的 Profile 版本不相容**? System MUST validate schema version, show migration dialog or reject with clear error
- How does system handle **Virtual Server port already in use**? System MUST detect EADDRINUSE error and suggest alternative port
- What happens when **user closes app while polling or with unsaved changes**? System MUST prompt user with options to save Profile, discard changes, or cancel close; polling MUST stop gracefully before exit

## Requirements *(mandatory)*

### Functional Requirements

#### Connection Management
- **FR-001**: System MUST support Modbus TCP protocol with configurable IP, Port (1-65535), Unit ID (0-255)
- **FR-002**: System MUST support MQTT protocol with configurable Broker URL, Port, Client ID, Username/Password, TLS options
- **FR-003**: System MUST support OPC UA protocol with Endpoint URL, Security Mode, Authentication [Phase 2 - basic support first]
- **FR-004**: System MUST allow multiple simultaneous connections (up to 10 connections)
- **FR-005**: System MUST persist connection state across app restarts via Profile system

#### Tag Management
- **FR-006**: System MUST allow users to define Tags with: Name, Protocol Reference (Address/Topic/NodeId), Data Type, Display Format
- **FR-007**: System MUST support Modbus data types: INT16, UINT16, INT32, UINT32, FLOAT32, BOOLEAN (Coil/Discrete)
- **FR-008**: System MUST support batch tag import from CSV format
- **FR-009**: System MUST validate Tag definitions and show errors before enabling polling

#### Real-Time Monitoring
- **FR-010**: System MUST poll Tags at configurable intervals (100ms - 60000ms)
- **FR-011**: System MUST display real-time values in Super Grid with Sparkline trend visualization
- **FR-012**: System MUST support threshold alerts with visual highlighting (Warning: Yellow, Alarm: Red)
- **FR-013**: System MUST update UI at minimum 10 FPS for smooth visualization

#### Data DVR
- **FR-014**: System MUST maintain Circular Buffer storing last N minutes of data (configurable, default 5 min)
- **FR-015**: System MUST provide time-travel UI allowing users to scrub through historical data
- **FR-016**: System MUST clearly indicate when viewing historical vs live data

#### Virtual Server
- **FR-017**: System MUST provide built-in Modbus TCP Slave simulator
- **FR-018**: Virtual Server MUST support waveform generation: Constant, Sine, Square, Triangle, Random
- **FR-019**: Virtual Server MUST allow configuring register values and waveform parameters

#### Profile & Export
- **FR-020**: System MUST save/load connection profiles as JSON files
- **FR-021**: System MUST export collected data to CSV format
- **FR-022**: System MUST generate HTML summary reports with statistics and charts
- **FR-023**: Profile format MUST include schema version for forward compatibility
- **FR-024**: System MUST store sensitive credentials (MQTT username/password, certificates) in OS secure credential store (macOS Keychain, Windows Credential Manager) rather than plaintext in Profile JSON

#### User Interface
- **FR-025**: System MUST provide responsive layout supporting 1280x720 minimum resolution
- **FR-026**: System MUST support Light and Dark themes
- **FR-027**: System MUST provide keyboard shortcuts for common operations (Connect: Ctrl+Enter, Start Poll: F5, Stop: Shift+F5)

#### Observability
- **FR-028**: System MUST write application logs to rotating log files (5 files × 10MB max each)
- **FR-029**: System MUST log connection events (connect, disconnect, errors), polling operations, and user actions with timestamps
- **FR-030**: System MUST provide UI access to view recent log entries and open log file location

### Key Entities

- **Connection**: Represents a protocol client session. Attributes: id, name, protocol (modbus-tcp|mqtt|opcua), config (protocol-specific), status (disconnected|connecting|connected|error), lastError, createdAt
- **Tag**: A monitored data point. Attributes: id, connectionId, name, address (protocol-specific reference), dataType, displayFormat, thresholds {warning, alarm}, enabled
- **DataPoint**: A single sampled value. Attributes: tagId, timestamp, value (number|boolean|string), quality (good|bad|uncertain)
- **Profile**: Saved configuration bundle. Attributes: id, name, version, connections[], tags[], settings, exportedAt
- **VirtualServer**: Simulated protocol server. Attributes: id, protocol, port, status, registers[] (for Modbus)
- **Waveform**: Data generator for Virtual Server. Attributes: type (constant|sine|square|triangle|random), amplitude, offset, period

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者可在 30 秒內完成從啟動應用到讀取第一筆 Modbus 資料 (First Connection Time < 30s)
- **SC-002**: 系統可穩定輪詢 100 個 Tags，間隔 500ms，持續 1 小時無崩潰或記憶體洩漏 (Heap growth < 50MB/hr)
- **SC-003**: Data DVR 時間軸操作回應時間 < 100ms，確保流暢的時間旅行體驗
- **SC-004**: Profile 載入時間 < 2 秒 (包含 50 個 Tags 的設定檔)
- **SC-005**: Virtual Server 啟動時間 < 1 秒，可同時服務 5 個 Client 連線
- **SC-006**: CSV 匯出 10000 筆資料完成時間 < 5 秒
- **SC-007**: 應用程式冷啟動時間 < 3 秒 (Windows/macOS)
- **SC-008**: 90% 的目標使用者 (工業自動化工程師) 在首次使用無需說明文件即可完成基本連線測試

## Clarifications

### Session 2025-01-23

- Q: How should sensitive credentials (MQTT username/password) be stored locally between sessions? → A: Credentials stored in OS secure credential store (Keychain/Credential Manager)
- Q: What logging strategy should be used for activity logs and diagnostics? → A: File-based application log with rotation (5 files × 10MB)
- Q: What happens when user closes app while polling is active or with unsaved changes? → A: Prompt user with save/discard options before closing

## Assumptions

- 目標使用者具備基本的工業通訊協定知識 (了解 Modbus 暫存器、MQTT Topic 概念)
- 網路環境允許應用程式存取目標設備 (無防火牆阻擋)
- 使用者作業系統為 Windows 10+, macOS 11+, 或 Ubuntu 20.04+
- 第一版專注於 Modbus TCP，MQTT 與 OPC UA 可在後續迭代加入

## Out of Scope (Phase 1)

- Modbus RTU/ASCII (Serial Port) - 需要額外的 Serial Port 存取層
- OPC UA 完整支援 - 僅提供基本讀取，不含 Subscription, Event, Method Call
- 資料持久化到資料庫 - Phase 1 僅使用記憶體 Circular Buffer
- 多語系 UI - Phase 1 僅提供英文介面
- 雲端同步 - 所有資料儲存於本機
