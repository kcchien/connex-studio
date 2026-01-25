# Feature Specification: Phase 2 Professional Features with Full OPC UA

**Feature Branch**: `003-pro-features-opcua`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "Phase 2 Professional Features with Full OPC UA: Bridge protocol bridging, Collections/Environment system, Dashboard gauges, Alerts, Protocol Calculator, Config Export/Import, plus comprehensive OPC UA client (subscriptions, browsing, events, methods, history, discovery, virtual server)"

**Prerequisites**: Depends on `002-iiot-protocol-studio` (MVP complete with Modbus/MQTT connections, Tag monitoring, DVR, Virtual Server, Profile management, Export)

---

## User Scenarios & Testing *(mandatory)*

<!--
本規格包含兩大功能群組：
Part A: Professional Features (US-001 ~ US-006) - 專業工作流程功能
Part B: OPC UA Full Client (US-007 ~ US-017) - 完整 OPC UA 協定支援
-->

---

## Part A: Professional Features

---

### User Story 1 - The Bridge Protocol Bridging (Priority: P1)

使用者想要將 Modbus 設備的數據即時轉發到 MQTT Broker，無需購買額外的 Gateway 硬體。使用者透過拖曳方式建立 Tag 與 Topic 的對應關係，系統自動進行協定轉換與數據轉發。

**Why this priority**: 這是 Connex Studio 的殺手級功能，讓軟體瞬間變身為軟體 Gateway。測試雲端平台、快速原型、臨時 Gateway 都需要此功能，能大幅提升產品競爭力。

**Independent Test**: 建立 Modbus 連線讀取溫度 Tag，建立 MQTT 連線，拖曳建立 Bridge 對應，啟動轉發，在 MQTT Broker 端確認收到正確的 JSON 訊息。

**Acceptance Scenarios**:

1. **Given** 已建立 Modbus 連線並定義 Tag「Temperature」讀取 HR:40001，以及 MQTT 連線到 Broker，**When** 使用者將 Temperature Tag 拖曳到 MQTT 目標區並設定 Topic `/factory/line1/temp`，**Then** 系統建立 Bridge 對應，顯示對應關係圖
2. **Given** 已建立 Bridge 對應且 Modbus 連線輪詢中，**When** 使用者點擊「啟動轉發」，**Then** 系統將 Modbus 讀取的數值即時發布到 MQTT Topic，延遲低於 100ms
3. **Given** Bridge 轉發進行中，**When** Modbus 連線中斷，**Then** 系統暫停該來源的轉發，MQTT 端收到連線狀態訊息，連線恢復後自動恢復轉發
4. **Given** 使用者需要自訂 JSON 格式，**When** 使用者編輯 Payload Template，**Then** 系統依照模板格式產生 JSON，支援 `${tags.name.value}`、`${$isoTimestamp}` 等變數

---

### User Story 2 - Collections & Environment System (Priority: P1)

使用者需要管理多個測試環境（開發、測試、生產），希望能一鍵切換環境變數而不需逐一修改連線參數。同時希望將相關的測試請求組織成 Collection，便於重複執行與團隊共享。

**Why this priority**: 專業工作流程的核心功能，能大幅提升日常工作效率，避免手動修改參數的錯誤風險，也便於團隊協作。

**Independent Test**: 建立「Development」與「Production」兩個環境，定義 `${FACTORY_IP}` 變數，建立使用該變數的連線，切換環境後確認連線參數自動更新。

**Acceptance Scenarios**:

1. **Given** 使用者在 Environment 管理介面，**When** 使用者建立環境「Development」並定義變數 `FACTORY_IP=127.0.0.1` 和 `MQTT_BROKER=localhost`，**Then** 系統儲存環境設定，可在連線設定中使用 `${FACTORY_IP}` 語法引用
2. **Given** 已定義 Development 和 Production 兩個環境，連線設定使用 `${FACTORY_IP}` 變數，**When** 使用者從環境選擇器切換到 Production，**Then** 所有連線的 IP 自動替換為 Production 環境的值，無需手動修改
3. **Given** 使用者建立 Collection「產線A每日檢查」並加入 5 個測試請求，**When** 使用者點擊「執行 Collection」，**Then** 系統依序執行所有請求，顯示執行結果與統計摘要
4. **Given** Collection 包含預設斷言規則，**When** 某個請求回傳值不符合預期，**Then** 系統標記該項目為失敗，顯示失敗原因

---

### User Story 3 - Dashboard View with Gauges (Priority: P1)

使用者想要建立自訂的監控儀表板，以直覺的 Gauge、LED 指示燈、數值大字卡等方式顯示關鍵數據，提供現場監控人員一目了然的視覺化介面。

**Why this priority**: 數據視覺化是工業監控的核心需求，儀表板提供比 Super Grid 更直覺的呈現方式，適合現場監控與報告展示。

**Independent Test**: 建立 Dashboard，新增一個 Gauge 元件綁定溫度 Tag，設定門檻顏色，輪詢時確認 Gauge 即時更新並正確變色。

**Acceptance Scenarios**:

1. **Given** 使用者在 Dashboard 編輯模式，**When** 使用者從元件面板拖曳 Gauge 到畫布並綁定 Tag「Temperature」，**Then** 系統建立 Gauge 元件，顯示即時數值
2. **Given** Gauge 已設定門檻（0-60:綠, 60-80:黃, 80-100:紅），**When** 溫度值從 55 變化到 75，**Then** Gauge 顏色從綠色漸變為黃色
3. **Given** Dashboard 包含多個元件，**When** 使用者拖曳調整元件位置和大小，**Then** 系統記住佈局，重新開啟時恢復相同配置
4. **Given** 使用者建立多個 Dashboard，**When** 使用者透過頁籤切換 Dashboard，**Then** 各 Dashboard 獨立運作，切換時保持各自狀態

---

### User Story 4 - Alert & Notification System (Priority: P1)

使用者需要在數值超出範圍或連線異常時收到即時通知，包括聲音提示、桌面通知、以及告警歷史記錄，以便追蹤異常事件。

**Why this priority**: 告警是工業監控的必備功能，使用者無法持續盯著螢幕，需要系統主動提醒異常狀況。

**Independent Test**: 設定溫度 Tag 上限告警為 80 度，模擬數值超過 80 度，確認系統發出桌面通知、播放告警音效、並記錄告警歷史。

**Acceptance Scenarios**:

1. **Given** 使用者為 Tag「Temperature」設定告警規則：值 > 80 為 Warning、值 > 95 為 Critical，**When** 溫度值達到 85，**Then** 系統觸發 Warning 告警，顯示桌面通知並播放提示音
2. **Given** 告警規則設定持續時間條件（5 秒），**When** 數值瞬間超標後立即恢復正常，**Then** 系統不觸發告警（濾除雜訊）
3. **Given** 告警已觸發，**When** 使用者開啟告警歷史面板，**Then** 系統顯示所有告警事件，包含時間戳、Tag 名稱、告警類型、觸發值
4. **Given** 告警持續響起，**When** 使用者點擊「確認」或「靜音」，**Then** 系統停止該告警的聲音提示，但持續記錄狀態

---

### User Story 5 - Protocol Calculator & Tools (Priority: P2)

使用者在調試協定時經常需要進行 Modbus CRC 計算、Byte Order 轉換、IEEE 754 浮點數解析等操作，希望有內建工具箱避免使用外部軟體。

**Why this priority**: 實用工具箱雖非核心功能，但能顯著提升使用者黏著度，減少工作流程中的工具切換。

**Independent Test**: 開啟 Protocol Calculator，輸入 Hex 封包，確認系統正確解析 Modbus RTU 封包結構與 CRC 校驗。

**Acceptance Scenarios**:

1. **Given** 使用者開啟 Protocol Calculator 的 Modbus CRC 工具，**When** 使用者輸入 Hex 資料 `01 03 00 00 00 0A`，**Then** 系統計算並顯示 CRC-16 結果 `C5 CD`
2. **Given** 使用者開啟 Byte Order 轉換工具，**When** 使用者輸入 Big-Endian 十六進位 `41 20 00 00`，**Then** 系統顯示轉換後的 Float32 值 `10.0`
3. **Given** 使用者開啟 Packet Analyzer，**When** 使用者貼上完整 Modbus RTU 封包，**Then** 系統解析並標示各欄位：Unit ID、Function Code、Address、Quantity、CRC 並驗證 CRC 正確性
4. **Given** 使用者開啟 Modbus Address 轉換工具，**When** 使用者輸入 `40001`，**Then** 系統顯示等效表示：`HR:0`、`%MW0`、Hex `0x0000`

---

### User Story 6 - Configuration Export/Import (Priority: P2)

使用者想要將完整的工作環境設定（連線、Tags、環境變數、Dashboard、告警規則）匯出為 YAML 檔案，便於備份、版本控制、團隊共享、以及在新機器上快速還原。

**Why this priority**: 設定可攜性是專業工具的標準功能，支援 Git 版本控制與團隊協作的現代化工作流程。

**Independent Test**: 完整設定應用程式後匯出 YAML，刪除本地設定，匯入該 YAML，確認所有設定完整還原（密碼除外）。

**Acceptance Scenarios**:

1. **Given** 使用者已設定 2 個連線、10 個 Tags、2 個環境、1 個 Dashboard，**When** 使用者點擊「匯出工作區」並選擇 YAML 格式，**Then** 系統產生結構化 YAML 檔案，包含所有設定（敏感資料如密碼不包含）
2. **Given** 使用者收到同事分享的 YAML 設定檔，**When** 使用者點擊「匯入工作區」並選擇該檔案，**Then** 系統顯示匯入預覽，列出將載入的項目數量與衝突項目
3. **Given** 匯入的設定與現有設定有衝突（相同名稱的連線），**When** 系統提示衝突處理選項，**Then** 使用者可選擇「覆蓋」、「略過」或「重新命名」
4. **Given** YAML 檔案包含 `${FACTORY_IP}` 變數引用，**When** 使用者匯入後選擇環境，**Then** 變數自動解析為該環境的值

---

## Part B: OPC UA Full Client

---

### User Story 7 - OPC UA Connection (Priority: P1)

作為 IIoT 工程師，我想要連接到各種安全配置的 OPC UA 伺服器，以便與工業設備進行安全通訊。

**Why this priority**: OPC UA 是工業自動化的標準協定，完整的連線支援是基礎功能。

**Independent Test**: 連接到 Prosys OPC UA Simulation Server，使用 Basic256Sha256 安全策略，確認連線成功並顯示伺服器資訊。

**Acceptance Scenarios**:

1. **Given** 使用者在連線設定介面，**When** 使用者輸入 `opc.tcp://localhost:53530/OPCUA/SimulationServer` 並選擇安全策略 None，**Then** 系統建立連線並顯示連線狀態為「已連線」
2. **Given** 使用者選擇 Basic256Sha256 安全策略，**When** 伺服器憑證未受信任，**Then** 系統顯示憑證詳細資訊並詢問是否信任
3. **Given** 連線已建立，**When** 網路中斷，**Then** 系統顯示連線狀態為「已斷線」並自動嘗試重新連線
4. **Given** 伺服器支援多種驗證方式，**When** 使用者選擇帳號密碼驗證並輸入認證資訊，**Then** 系統使用該認證建立 Session

---

### User Story 8 - OPC UA Node Browsing (Priority: P1)

作為 IIoT 工程師，我想要階層式瀏覽 OPC UA 伺服器的位址空間，以便發現可用的節點及其關係。

**Why this priority**: 瀏覽是 OPC UA 的核心操作，使用者需要探索伺服器結構來找到所需的資料節點。

**Independent Test**: 連接到伺服器後，展開 Objects 節點，瀏覽到 Server > ServerStatus > CurrentTime，確認顯示節點屬性。

**Acceptance Scenarios**:

1. **Given** 已連接到 OPC UA 伺服器，**When** 使用者展開根節點「Objects」，**Then** 系統顯示子節點列表，包含節點圖示、DisplayName
2. **Given** 瀏覽樹顯示大量節點（1000+），**When** 使用者展開深層節點，**Then** UI 保持 60 FPS 響應，使用延遲載入
3. **Given** 使用者找到想要監控的 Variable 節點，**When** 使用者將節點拖曳到 Tag 列表，**Then** 系統自動建立 Tag 配置並填入 NodeId
4. **Given** 使用者需要快速找到特定節點，**When** 使用者在搜尋框輸入 DisplayName 關鍵字，**Then** 系統過濾顯示匹配的節點

---

### User Story 9 - OPC UA Node Reading (Priority: P1)

作為 IIoT 工程師，我想要讀取 OPC UA 節點的值，以便監控工業過程數據。

**Why this priority**: 讀取是資料擷取的基本操作，所有監控功能都依賴於此。

**Independent Test**: 選取多個 Variable 節點，執行批次讀取，確認顯示值、狀態碼和時間戳。

**Acceptance Scenarios**:

1. **Given** 使用者已選取 Variable 節點，**When** 使用者點擊「讀取」，**Then** 系統顯示目前值、StatusCode 和 ServerTimestamp
2. **Given** 使用者選取多個節點（10個），**When** 使用者執行批次讀取，**Then** 系統在單一請求中讀取所有節點，顯示所有結果
3. **Given** 節點值為複雜結構（ExtensionObject），**When** 系統讀取該節點，**Then** 系統解碼並以樹狀結構顯示結構內容
4. **Given** 節點 StatusCode 為 Bad（如 BadNodeIdUnknown），**When** 顯示讀取結果，**Then** 系統以紅色標示並顯示人類可讀的錯誤訊息

---

### User Story 10 - OPC UA Node Writing (Priority: P1)

作為 IIoT 工程師，我想要寫入值到 OPC UA 節點，以便控制工業設備和設定點。

**Why this priority**: 寫入使雙向控制成為可能，是完整 IIoT 解決方案的必要功能。

**Independent Test**: 選取可寫入的節點，輸入新值，確認寫入成功並在重新讀取時反映新值。

**Acceptance Scenarios**:

1. **Given** 使用者選取 AccessLevel 允許寫入的節點，**When** 使用者輸入新值並點擊「寫入」，**Then** 系統發送寫入請求並顯示成功狀態
2. **Given** 節點資料型別為 Double，**When** 使用者輸入字串 "abc"，**Then** 系統在發送前驗證失敗並顯示型別錯誤提示
3. **Given** 使用者完成寫入操作，**When** 使用者點擊「復原」，**Then** 系統將節點恢復為先前的值
4. **Given** 節點標記為關鍵控制點，**When** 使用者嘗試寫入，**Then** 系統顯示確認對話框要求二次確認

---

### User Story 11 - OPC UA Subscriptions (Priority: P1)

作為 IIoT 工程師，我想要訂閱節點值變更，以便在無需持續輪詢的情況下接收即時更新。

**Why this priority**: 訂閱是 OPC UA 效率優勢的關鍵，減少網路流量並提供即時通知。

**Independent Test**: 訂閱溫度節點，在伺服器端改變值，確認客戶端在 200ms 內收到更新。

**Acceptance Scenarios**:

1. **Given** 使用者建立 Tag 並設定 OPC UA 來源，**When** 使用者啟用訂閱（PublishingInterval=500ms），**Then** 系統建立訂閱並開始接收通知
2. **Given** 訂閱已啟用且值在伺服器端改變，**When** 變更發生，**Then** 客戶端在 PublishingInterval + 網路延遲內收到通知並更新 UI
3. **Given** 使用者設定 Deadband（Absolute=0.5），**When** 值從 10.0 變為 10.3，**Then** 系統不產生通知（變化量小於 Deadband）
4. **Given** 訂閱進行中，**When** 使用者點擊「暫停」，**Then** 系統設定 PublishingEnabled=false，保留訂閱但停止通知

---

### User Story 12 - OPC UA Certificate Management (Priority: P2)

作為系統管理員，我想要管理 X.509 憑證，以便建立具有適當驗證的安全 OPC UA 連線。

**Why this priority**: 安全連線在生產環境中是必要的，憑證管理是其基礎。

**Independent Test**: 產生自簽憑證，匯出給伺服器，成功建立 SignAndEncrypt 連線。

**Acceptance Scenarios**:

1. **Given** 使用者首次啟動應用程式，**When** 系統初始化，**Then** 自動產生應用程式憑證（2048 bit RSA，有效期 2 年）
2. **Given** 使用者需要自訂憑證，**When** 使用者匯入 PFX 檔案並輸入密碼，**Then** 系統載入憑證和私鑰並設為預設
3. **Given** 伺服器憑證不受信任，**When** 使用者點擊「信任」，**Then** 系統將憑證加入信任存放區，後續連線自動信任
4. **Given** 憑證即將到期（30天內），**When** 使用者開啟應用程式，**Then** 系統顯示到期警告並建議更新

---

### User Story 13 - OPC UA Event Subscriptions (Priority: P2)

作為 IIoT 工程師，我想要訂閱 OPC UA 事件，以便監控工業設備的告警和狀態。

**Why this priority**: 事件監控對於異常處理和生產追蹤至關重要。

**Independent Test**: 訂閱 Server 物件的事件，觸發測試事件，確認收到事件通知。

**Acceptance Scenarios**:

1. **Given** 使用者選取事件通知器節點，**When** 使用者建立事件訂閱並選擇感興趣的欄位，**Then** 系統開始接收事件通知
2. **Given** 事件訂閱已啟用，**When** 伺服器發出 Alarm 事件，**Then** 系統顯示事件詳情（時間、來源、訊息、嚴重度）
3. **Given** 收到 AcknowledgeableCondition，**When** 使用者點擊「確認」，**Then** 系統發送 Acknowledge 方法呼叫並更新狀態
4. **Given** 累積大量事件，**When** 使用者開啟事件歷史，**Then** 系統顯示可搜尋、可匯出的事件列表

---

### User Story 14 - OPC UA Method Calls (Priority: P2)

作為 IIoT 工程師，我想要呼叫 OPC UA 方法，以便在伺服器物件上執行操作。

**Why this priority**: 方法呼叫擴展了控制能力，支援複雜操作和工作流程。

**Independent Test**: 瀏覽到含有方法的物件，填入輸入參數，執行方法，確認收到輸出結果。

**Acceptance Scenarios**:

1. **Given** 使用者瀏覽到含有方法的物件，**When** 使用者展開方法列表，**Then** 系統顯示可用方法及其輸入/輸出參數定義
2. **Given** 使用者選取方法，**When** 系統顯示參數表單，**Then** 表單依據 DataType 提供適當的輸入控制項
3. **Given** 使用者填入所有必要參數，**When** 使用者點擊「執行」，**Then** 系統呼叫方法並顯示輸出參數或錯誤訊息
4. **Given** 方法呼叫歷史，**When** 使用者需要重複執行，**Then** 可從歷史選取並重新執行相同參數

---

### User Story 15 - OPC UA Historical Access (Priority: P3)

作為 IIoT 工程師，我想要從 OPC UA 伺服器讀取歷史資料，以便分析過去的過程值。

**Why this priority**: 歷史資料對於趨勢分析和問題診斷很重要，但不是即時監控的必要條件。

**Independent Test**: 選取支援歷史的節點，查詢過去 1 小時的資料，以圖表顯示結果。

**Acceptance Scenarios**:

1. **Given** 使用者選取節點，**When** 系統檢查 Historizing 屬性，**Then** 顯示該節點是否支援歷史存取
2. **Given** 節點支援歷史，**When** 使用者設定時間範圍並點擊查詢，**Then** 系統擷取原始歷史值並以表格顯示
3. **Given** 使用者需要聚合資料，**When** 使用者選擇聚合函數（Average、Min、Max）和間隔，**Then** 系統查詢處理過的歷史值
4. **Given** 歷史結果顯示中，**When** 使用者點擊「匯出」，**Then** 系統將資料匯出為 CSV 檔案

---

### User Story 16 - OPC UA Discovery (Priority: P3)

作為 IIoT 工程師，我想要在網路上探索 OPC UA 伺服器，以便無需手動配置即可找到可用的端點。

**Why this priority**: 探索簡化初始設定，但手動輸入 URL 也可運作。

**Independent Test**: 執行網路探索，確認找到本機和區網內的 OPC UA 伺服器。

**Acceptance Scenarios**:

1. **Given** 使用者點擊「探索伺服器」，**When** 系統查詢 Local Discovery Server，**Then** 顯示已註冊的伺服器列表
2. **Given** 探索結果顯示多個伺服器，**When** 使用者選取伺服器，**Then** 系統擷取並顯示所有可用端點
3. **Given** 使用者需要掃描特定 IP 範圍，**When** 使用者輸入範圍並執行，**Then** 系統探測各 IP 的預設 OPC UA 埠
4. **Given** 使用者找到想要的伺服器，**When** 使用者點擊「加入連線」，**Then** 系統自動填入連線設定

---

### ~~User Story 17 - OPC UA Virtual Server~~ [DEFERRED TO PHASE 3]

> **延遲原因**: 過度工程 - 市面有免費 OPC UA 模擬器 (Prosys, UAExpert) 可用於測試，不需要內建。6 個 FR 的開發成本過高。

---

### Edge Cases

#### Part A: Professional Features
- **Bridge 來源連線中斷**? System MUST pause forwarding for that source, send connection status to target if configured, and auto-resume when connection recovers
- **Bridge 目標 MQTT Broker 無法連線**? System MUST buffer messages locally (up to configurable limit), retry connection with exponential backoff, and alert user
- **Environment 切換時有連線進行中**? System MUST prompt user to disconnect first or auto-disconnect with confirmation
- **Collection 執行中途失敗**? System MUST log failure, continue with remaining requests if configured, and show summary with failed items highlighted
- **Dashboard 元件綁定的 Tag 被刪除**? System MUST show placeholder with warning, allow user to rebind or remove the orphaned widget
- **告警規則引用的 Tag 連線中斷**? System MUST trigger a connection-type alert and pause value-based alerts until connection recovers
- **匯入的 YAML 版本較新（未來版本）**? System MUST detect version mismatch, warn user about potential compatibility issues, and attempt graceful degradation
- **匯入的 YAML 包含不支援的協定或功能**? System MUST skip unsupported items with warnings, import supported items, and provide detailed report

#### Part B: OPC UA
- **OPC UA Session 逾時**? System MUST automatically renew session before expiration, or establish new session if renewal fails
- **訂閱過多 Monitored Items（超過 1000）**? System MUST warn user about potential performance impact and suggest splitting into multiple subscriptions
- **伺服器憑證變更**? System MUST prompt user to re-validate and trust the new certificate
- **方法呼叫逾時**? System MUST display timeout error with option to cancel or retry
- **歷史查詢結果過大**? System MUST use continuation points and pagination, limiting initial result to 1000 records
- ~~**虛擬伺服器埠被佔用**? System MUST display clear error and suggest alternative port~~ [DEFERRED - Virtual Server 延遲]

---

## Requirements *(mandatory)*

### Functional Requirements

#### Part A: Professional Features

##### The Bridge
- **FR-001**: System MUST support drag-and-drop mapping between source Tags and target destinations (MQTT Topic, OPC UA Node)
- **FR-002**: System MUST support configurable forwarding interval (100ms - 60000ms)
- **FR-003**: System MUST support change-only forwarding (publish only when value changes beyond threshold)
- **FR-004**: System MUST support Payload Template Engine with variable syntax `${tags.name.value}`, `${$isoTimestamp}`, `${env:VAR_NAME}`
- ~~**FR-005**: System MUST support bidirectional bridging (e.g., MQTT → Modbus write)~~ [DEFERRED TO PHASE 3 - 過度工程，Phase 2 聚焦單向 Modbus→MQTT]
- **FR-006**: Bridge mapping configurations MUST be persistable and restorable

##### Collections & Environment
- **FR-007**: System MUST support creating, editing, deleting Environments with named variables
- **FR-008**: System MUST support variable reference syntax `${VAR_NAME}` in connection configurations
- **FR-009**: System MUST support default value syntax `${VAR_NAME:default}`
- **FR-010**: System MUST support one-click environment switching with automatic variable substitution
- **FR-011**: System MUST support creating Collections containing ordered sets of requests
- **FR-012**: Collections MUST support pre-request and post-request assertions
- **FR-013**: Collections MUST support sequential or parallel execution modes

##### Dashboard
- **FR-014**: System MUST provide Gauge widget (circular/semi-circular) with configurable min/max/thresholds
- **FR-015**: System MUST provide LED indicator widget with configurable state colors
- **FR-016**: System MUST provide Number Card widget for single value display with unit
- **FR-017**: System MUST provide Time-series Chart widget ~~with multi-axis support~~ by integrating existing DVR Chart component [SIMPLIFIED - 整合現有 DVR Chart 功能，避免重複開發]
- **FR-018**: Dashboard layout MUST support drag-and-drop positioning with grid snapping
- **FR-019**: Dashboard configurations MUST be persistable and support multiple pages
- **FR-020**: Dashboard MUST support edit mode vs view mode toggle

##### Alert & Notification
- **FR-021**: System MUST support threshold-based alerts (>, <, =, !=, range)
- **FR-022**: System MUST support rate-of-change alerts (value changes too fast)
- **FR-023**: System MUST support connection status alerts (disconnect, timeout)
- **FR-024**: System MUST support duration conditions (value must exceed threshold for N seconds before triggering)
- **FR-025**: Alert actions MUST include: desktop notification, sound, log entry ~~, script execution~~ [SIMPLIFIED - 移除腳本執行，降低安全風險]
- **FR-026**: System MUST maintain alert history with search and export capabilities
- **FR-027**: System MUST support alert acknowledgement and muting

##### Protocol Calculator
- **FR-028**: System MUST provide Modbus CRC-16 calculator
- **FR-029**: System MUST provide Byte Order converter (Big/Little Endian, Byte Swap)
- **FR-030**: System MUST provide IEEE 754 Float encoder/decoder
- **FR-031**: System MUST provide Modbus address format converter (decimal, HR notation, IEC notation)
- **FR-032**: System MUST provide Packet Analyzer with auto-detection of Modbus RTU/TCP format

##### Configuration Management
- **FR-033**: System MUST export full workspace to YAML or JSON format
- **FR-034**: System MUST support selective export (choose which items to include)
- **FR-035**: Exported configurations MUST include schema version for compatibility checking
- **FR-036**: System MUST NOT export sensitive credentials in plain text
- **FR-037**: System MUST support import with conflict resolution (overwrite, skip, rename)
- **FR-038**: System MUST validate imported configuration schema before applying
- **FR-039**: YAML export MUST produce stable, sorted output for Git-friendly diffs

---

#### Part B: OPC UA Full Client

##### Connection & Security
- **FR-040**: System MUST support OPC UA TCP binary protocol
- **FR-041**: System MUST parse and validate endpoint URLs (opc.tcp://host:port/path)
- **FR-042**: System MUST retrieve endpoint descriptions from server
- **FR-043**: System MUST support SecurityPolicy: None, Basic256Sha256, Aes128_Sha256_RsaOaep, Aes256_Sha256_RsaPss
- **FR-044**: System MUST support MessageSecurityMode: None, Sign, SignAndEncrypt
- **FR-045**: System MUST implement session management (Create, Activate, Close)
- **FR-046**: System MUST handle session timeout and renewal

##### Authentication
- **FR-047**: System MUST support Anonymous authentication
- **FR-048**: System MUST support Username/Password authentication
- **FR-049**: System MUST support X.509 Certificate authentication
- **FR-050**: System MUST store credentials encrypted (AES-256)

##### Node Browsing
- **FR-051**: System MUST browse starting from root nodes (Objects, Types, Views)
- **FR-052**: System MUST browse with reference type filter
- **FR-053**: System MUST support browse direction (Forward, Inverse, Both)
- **FR-054**: System MUST handle continuation points for large browse results
- **FR-055**: System MUST read node attributes (NodeClass, BrowseName, DisplayName, DataType)
- **FR-056**: System MUST support node search by DisplayName pattern
- **FR-057**: System MUST translate browse paths to NodeIds

##### Read/Write Operations
- **FR-058**: System MUST read single and multiple node values (batch)
- **FR-059**: System MUST handle all OPC UA Built-in DataTypes
- **FR-060**: System MUST decode structured types (ExtensionObjects)
- **FR-061**: System MUST display StatusCode with human-readable text
- **FR-062**: System MUST write single and multiple node values (batch)
- **FR-063**: System MUST validate data type before write
- **FR-064**: System MUST check AccessLevel before write attempt

##### Subscriptions
- **FR-065**: System MUST create subscriptions with configurable publishing interval
- **FR-066**: System MUST create monitored items for data changes
- **FR-067**: System MUST configure sampling interval per monitored item
- **FR-068**: System MUST support DeadbandType: None, Absolute, Percent
- **FR-069**: System MUST handle data change notifications
- **FR-070**: System MUST manage subscription lifetime and keep-alive
- **FR-071**: System MUST support publishing enable/disable (pause/resume)
- **FR-072**: System MUST transfer subscriptions on reconnect

##### Certificate Management
- **FR-073**: System MUST generate self-signed application certificates
- **FR-074**: System MUST import certificates from PEM/DER/PFX formats
- **FR-075**: System MUST manage trusted certificate store
- **FR-076**: System MUST validate server certificates
- **FR-077**: System MUST handle certificate trust prompts

##### Events
- **FR-078**: System MUST create monitored items for event subscriptions
- **FR-079**: System MUST configure event filter with select/where clauses
- **FR-080**: System MUST handle event notifications and parse standard fields
- **FR-081**: System MUST support Acknowledge/Confirm for alarm conditions

##### Method Calls
- **FR-082**: System MUST browse methods on objects
- **FR-083**: System MUST read method argument definitions
- **FR-084**: System MUST call methods with input arguments and handle output

##### Historical Access
- **FR-085**: System MUST check HistorizedAttribute on nodes
- **FR-086**: System MUST read raw historical values with time range
- **FR-087**: System MUST read processed historical values with aggregate functions
- **FR-088**: System MUST handle continuation points for large result sets

##### Discovery
- **FR-089**: System MUST FindServers via LDS endpoint
- **FR-090**: System MUST GetEndpoints from discovered servers
- **FR-091**: System MUST cache discovered servers

##### ~~Virtual Server~~ [DEFERRED TO PHASE 3]
> FR-092 ~ FR-097 延遲至 Phase 3。使用外部 OPC UA 模擬器進行測試。

---

### Key Entities

#### Part A: Professional Features
- **Bridge**: Protocol-to-protocol forwarding rule. Attributes: id, name, sourceConnectionId, sourceTags[], targetConnectionId, targetConfig (topic template, payload template), options (interval, changeOnly, threshold), status (active/paused/error)
- **Environment**: Named set of variables for configuration substitution. Attributes: id, name, variables (key-value map), isDefault
- **Collection**: Organized group of test requests. Attributes: id, name, description, requests[], assertions[], executionMode (sequential/parallel)
- **CollectionRequest**: Single test action within a collection. Attributes: id, connectionId, operation, parameters, preScript, postScript, expectedResult
- **Dashboard**: Custom visualization layout. Attributes: id, name, isDefault, layout (grid config), widgets[]
- **DashboardWidget**: Visual component on dashboard. Attributes: id, type (gauge/led/numberCard/chart), position (x, y, w, h), tagRefs[], config (widget-specific options)
- **AlertRule**: Condition-based notification rule. Attributes: id, name, tagRef, condition (operator, value, duration), severity (info/warning/critical), actions[], enabled
- **AlertEvent**: Historical record of triggered alert. Attributes: id, ruleId, timestamp, triggerValue, acknowledged, acknowledgedAt, acknowledgedBy
- **Workspace**: Complete exportable configuration. Attributes: meta (name, author, version), environments[], connections[], tags[], bridges[], collections[], dashboards[], alertRules[]

#### Part B: OPC UA
- **OpcUaConnection**: OPC UA server connection instance. Attributes: id, endpointUrl, securityPolicy, securityMode, authentication, sessionTimeout, status
- **OpcUaNode**: Reference to an OPC UA node. Attributes: nodeId, displayName, nodeClass, dataType, browseHistory
- **OpcUaSubscription**: Active subscription to server. Attributes: id, connectionId, publishingInterval, lifetimeCount, monitoredItems[]
- **MonitoredItem**: Single monitored item in subscription. Attributes: id, nodeId, samplingInterval, queueSize, deadbandType, deadbandValue
- **OpcUaCertificate**: X.509 certificate. Attributes: id, subject, issuer, validFrom, validTo, thumbprint, path, trusted
- **OpcUaEvent**: Captured event from server. Attributes: eventId, eventType, sourceNodeId, time, message, severity, acknowledged

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Part A: Professional Features
- **SC-001**: Users can set up a Modbus-to-MQTT bridge and see data forwarded within 2 minutes from starting configuration
- **SC-002**: Environment switching applies to all connections within 1 second, with no manual intervention required
- **SC-003**: Dashboard widgets update in real-time (within 100ms of data change) at 10+ FPS
- **SC-004**: Alert notifications appear within 500ms of condition being met
- **SC-005**: Configuration export/import round-trip preserves 100% of settings (excluding credentials)
- **SC-006**: Protocol Calculator tools produce results within 50ms of input
- **SC-007**: System supports 10 concurrent Bridge mappings without performance degradation
- **SC-008**: 90% of target users can create their first Dashboard without documentation
- **SC-009**: Alert history can store and query 10,000+ events with sub-second response time
- **SC-010**: YAML export produces identical output for identical configurations (deterministic for version control)

#### Part B: OPC UA
- **SC-011**: Connect to any OPC UA server with supported security modes within 2 seconds
- **SC-012**: Browse complete address space with 1000+ nodes within 3 seconds
- **SC-013**: Read/write nodes with response time under 100ms (p95)
- **SC-014**: Subscriptions deliver updates within 200ms of source change
- **SC-015**: Certificate-based authentication works with standard PKI (enterprise CA-signed certificates)
- **SC-016**: Events captured and displayed within 500ms of occurrence
- **SC-017**: Method calls support complex input/output arguments
- **SC-018**: Historical queries return accurate time-series data
- **SC-019**: Discovery finds all LAN OPC UA servers within 5 seconds
- ~~**SC-020**: Virtual Server supports 100+ concurrent client connections~~ [DEFERRED TO PHASE 3]

---

## Clarifications

### 2026-01-24: 過度工程簡化

經過分析確認以下項目為過度工程，已調整規格：

| 項目 | 原狀態 | 調整後 | 理由 |
|------|--------|--------|------|
| US-17 OPC UA Virtual Server | P3 | **DEFERRED** | 市面有免費模擬器 (Prosys, UAExpert)，6 個 FR 開發成本過高 |
| FR-005 雙向 Bridge | P1 | **DEFERRED** | Phase 2 聚焦單向 Modbus→MQTT，降低複雜度 |
| FR-025 Alert Script Execution | P1 | **REMOVED** | 安全風險，Desktop Notification + Sound + Log 足夠 |
| FR-017 Multi-axis Chart | P1 | **SIMPLIFIED** | 整合現有 DVR Chart 功能，避免重複開發 |
| FR-092~097 Virtual Server FRs | P3 | **DEFERRED** | 隨 US-17 延遲 |
| SC-020 100+ connections | P3 | **DEFERRED** | 隨 US-17 延遲 |

**精簡後規格摘要:**
- User Stories: 17 → 16 (1 延遲)
- Functional Requirements: 97 → 90 (7 延遲/移除)
- 預估開發時間減少約 15-20%

**DVR 說明** (回應用戶詢問): DVR 是 002-iiot-protocol-studio MVP 中的資料記錄功能，使用 Ring Buffer 儲存歷史資料，已有 Sparkline 圖表顯示趨勢。Dashboard Chart 將整合此現有功能。

---

## Assumptions

- Phase 1 MVP (002-iiot-protocol-studio) is complete and stable, providing the foundation for these features
- Users are familiar with basic IIoT concepts (protocols, tags, data types)
- Network environment allows bidirectional communication between protocols
- Target platforms remain Windows 10+, macOS 11+, Ubuntu 20.04+
- No cloud sync required - all data remains local
- node-opcua library (v2.160.0+) provides required OPC UA functionality

---

## Out of Scope (This Phase)

- TypeScript Scripting Engine - planned for Phase 3
- AI Copilot (OCR, Natural Language) - planned for Phase 3
- Team Sync (real-time collaboration) - planned for Phase 3
- Advanced Analytics (FFT, statistical analysis) - planned for Phase 3
- Mobile companion app
- Cloud-based configuration backup
- OPC UA PubSub
- Global Discovery Server (GDS) integration
- OPC UA server implementation (production use)
