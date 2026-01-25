# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Build 配置修復 - electron-vite/esbuild 編譯錯誤** (`electron.vite.config.ts`)
  - 問題：Build 時出現 `Unterminated string literal` 錯誤
    - esbuild 將 CommonJS shims 注入到錯誤位置（字串字面值中間）
    - 當所有模組打包成單一檔案時發生衝突
  - 解決方案：
    - 新增 `preserveModules: true` - 保持模組分離，避免打包衝突
    - 新增 `preserveModulesRoot: 'src/main'` - 修正輸出檔案路徑結構
    - 新增 `entryFileNames: '[name].js'` - 確保正確的入口檔案命名
  - 結果：Main process 編譯正常，E2E 測試框架可執行

### Added

- **Phase 16: Polish & Cross-Cutting Concerns** (T164-T178) - `003-pro-features-opcua`
  - **Unit Tests** (T169-T174)
    - `tests/unit/main/AlertEngine.test.ts` - 警報引擎單元測試
      - 規則 CRUD、啟用/停用、靜音/取消靜音
      - 條件評估 (>, <, =, !=, range)
      - ROC 警報測試 (絕對值、百分比模式)
      - 連線狀態警報測試 (disconnect, timeout)
    - `tests/unit/main/DashboardService.test.ts` - Dashboard 服務單元測試
      - Dashboard CRUD 操作
      - Widget 新增/更新/移除
      - 孤兒 Widget 清理 (handleTagDeleted, handleConnectionDeleted)
    - `tests/unit/main/EnvironmentManager.test.ts` - 環境管理器單元測試
      - 環境 CRUD、預設環境、變數
      - 切換處理 (事件、處理器註冊、並發防護)
    - `tests/unit/main/BridgeManager.test.ts` - Bridge 管理器單元測試
      - Bridge CRUD、Start/Stop/Pause/Resume、統計、事件
    - `tests/unit/main/OpcUaAdapter.test.ts` - OPC UA Adapter 單元測試
      - URL 驗證、解析、安全模式、資料類型
    - `tests/unit/renderer/dashboard/WidgetBase.test.ts` - Widget 工具函數測試
      - getColorForValue, formatValue, getPrimaryValue, toNumericValue
    - `tests/unit/renderer/opcua/OpcUaHelpers.test.ts` - OPC UA 工具函數測試
      - 存取等級格式化、值格式化、Node ID 解析、資料類型強制轉換

  - **E2E Tests** (T175-T178)
    - `tests/e2e/bridge.spec.ts` - Bridge 數據轉發 E2E 測試
    - `tests/e2e/dashboard.spec.ts` - Dashboard Widget 管理 E2E 測試
    - `tests/e2e/alert.spec.ts` - 警報系統 E2E 測試
    - `tests/e2e/opcua.spec.ts` - OPC UA 功能 E2E 測試


  - **Main Process - AlertEngine 擴展** (`src/main/services/AlertEngine.ts`) (T164, T165)
    - **連線狀態警報** (T164)
      - 新增 'disconnect' 與 'timeout' 警報運算子
      - 新增 ConnectionAlertSource 型別 ('connection' | 'tag')
      - processConnectionStatus() 方法處理連線狀態變更
      - triggerConnectionAlert() 觸發連線類型警報
      - AlertRule 擴展 source 與 connectionId 欄位
    - **變化率警報** (T165)
      - 新增 'roc' (rate-of-change) 警報運算子
      - AlertCondition 擴展 rocWindow 與 rocType 欄位
      - ConditionState 新增 valueHistory 陣列追蹤歷史值
      - evaluateRateOfChange() 計算時間窗口內的變化率
      - 支援百分比與絕對值變化率計算
      - ROC_HISTORY_MAX_LENGTH = 100, DEFAULT_ROC_WINDOW = 60s

  - **Main Process - DashboardService 孤兒 Widget 清理** (`src/main/services/DashboardService.ts`) (T166)
    - handleTagDeleted() - 處理 Tag 刪除時的 Widget 清理
      - 單一 Tag 的 Widget 直接移除
      - 多 Tag 的 Widget 移除該 Tag 參考
    - handleConnectionDeleted() - 處理 Connection 刪除時的 Widget 清理
    - getWidgetsByTagRef() - 查詢參考特定 Tag 的 Widget
    - 新增 'orphaned-widgets-cleaned' 事件

  - **Main Process - EnvironmentManager 切換處理** (`src/main/services/EnvironmentManager.ts`) (T167)
    - 新增 'environment-switching' 與 'environment-switched' 事件
    - EnvironmentSwitchHandler 型別定義
    - registerSwitchHandler() - 註冊切換處理器
    - isEnvironmentSwitching() - 檢查是否正在切換
    - switchEnvironment() - 帶選項的環境切換
      - force 選項強制切換
      - onActiveConnections 回呼處理活躍連線
    - 防止並發切換機制 (isSwitching 旗標)

  - **Main Process - OPC UA Session 超時處理** (`src/main/protocols/OpcUaAdapter.ts`) (T168)
    - 指數退避重連機制
      - baseReconnectDelay = 1000ms, 最大 30000ms
      - maxReconnectAttempts = 5
    - 訂閱狀態保存與恢復
      - subscriptionConfigs Map 儲存訂閱配置
      - monitoredItemConfigs Map 儲存監控項目配置
    - scheduleRecoveryAttempt() - 排程延遲恢復
    - attemptSessionRecovery() - 嘗試 Session 恢復
    - storeSubscriptionStates() - 儲存訂閱狀態
    - restoreSubscriptions() - 恢復訂閱
    - restoreMonitoredItemsForSubscription() - 恢復監控項目
    - isSessionValid() - 檢查 Session 有效性
    - getRecoveryState() - 取得恢復狀態資訊
    - triggerManualRecovery() - 手動觸發恢復

  - **共享型別更新** (`src/shared/types/alert.ts`)
    - AlertOperator 擴展 'disconnect' | 'timeout' | 'roc'
    - ConnectionAlertSource 新型別
    - AlertCondition 新增 rocWindow, rocType 欄位
    - AlertRule 新增 source, connectionId 欄位

  - **共享型別更新** (`src/shared/types/workspace.ts`)
    - WorkspaceAlertRule.condition.operator 擴展新運算子
    - 新增 rocWindow, rocType, source, connectionName 欄位

  - **Main Process - WorkspaceExporter 更新** (`src/main/services/WorkspaceExporter.ts`)
    - convertAlertRule() 支援連線警報匯出
    - 處理 ROC 相關欄位

- **Phase 15: US16 OPC UA Discovery** (T159-T163) - `003-pro-features-opcua`
  - **共享型別定義** (`src/shared/types/opcua.ts`) (T159-T161)
    - OpcUaDiscoveredServer - 已發現伺服器資訊
      - applicationUri, productUri, applicationName
      - applicationType (Server, Client, ClientAndServer, DiscoveryServer)
      - discoveryUrls - 伺服器發現端點 URL 列表
      - serverCapabilities, gatewayServerUri, discoveryProfileUri
    - DiscoverServersRequest - FindServers 請求參數
      - discoveryUrl - LDS 或伺服器端點 URL
      - localeIds - 語系 ID 過濾
      - serverUris - 伺服器 URI 過濾
    - DiscoverServersResult - FindServers 結果
      - servers - OpcUaDiscoveredServer 陣列
      - discoveryUrl, timestamp, error
    - GetEndpointsRequest - GetEndpoints 請求參數
      - endpointUrl - 伺服器端點 URL
      - localeIds, profileUris - 選項參數
    - GetEndpointsResult - GetEndpoints 結果
      - endpoints - OpcUaEndpoint 陣列
      - endpointUrl, timestamp, error
    - DiscoveryCacheEntry - 發現結果快取條目 (5 分鐘 TTL)

  - **Main Process - OpcUaAdapter 發現功能** (`src/main/protocols/OpcUaAdapter.ts`) (T159-T161)
    - findServers(request) - 透過 LDS 發現伺服器 (T159)
      - 使用 OPCUAClient.findServers() API
      - 支援 localeIds, serverUris 過濾
      - 映射 ApplicationType 枚舉
      - 過濾 null discoveryUrls
    - getServerEndpoints(request) - 取得伺服器端點 (T160)
      - 使用 OPCUAClient.getEndpoints() API
      - 映射 SecurityPolicy, MessageSecurityMode
      - 映射 UserTokenPolicy 陣列
    - Discovery Cache 機制 (T161)
      - discoveryCache Map 儲存
      - DISCOVERY_CACHE_TTL = 5 分鐘
      - getCachedDiscovery<T>() 快取讀取
      - cacheDiscoveryResult() 快取寫入
      - clearDiscoveryCache() 清除快取
      - getDiscoveryCacheStats() 取得快取統計

  - **IPC 通道定義** (`src/shared/constants/ipc-channels.ts`)
    - OPCUA_DISCOVER_SERVERS - 發現伺服器
    - OPCUA_FIND_SERVERS - 取得端點 (GetEndpoints)

  - **Main Process - Discovery IPC 處理器** (`src/main/ipc/opcua.ts`) (T162)
    - opcua:discover-servers - FindServers IPC 處理器
    - opcua:find-servers - GetEndpoints IPC 處理器

  - **Preload API 擴展** (`src/preload/index.ts`)
    - discoverServers(request) - 發現伺服器
    - getServerEndpoints(request) - 取得端點

  - **Renderer - OpcUaDiscovery UI** (`src/renderer/components/opcua/OpcUaDiscovery.tsx`) (T163)
    - Discovery URL 輸入
      - 預設值 opc.tcp://localhost:4840
      - Discover 按鈕觸發發現
    - 已發現伺服器列表
      - 可展開式 Accordion 介面
      - ApplicationTypeBadge 顯示伺服器類型
      - Server Details 顯示 Product URI
      - Discovery URLs 列表
      - Get Endpoints 按鈕
    - 端點列表表格
      - URL 欄位
      - SecurityModeBadge (None, Sign, SignAndEncrypt)
      - SecurityPolicyBadge (顏色標示安全等級)
      - Auth 欄位 (UserTokenPolicy 類型)
      - Select 按鈕選擇端點
    - 已選擇設定摘要
      - 顯示選擇的伺服器和端點資訊
      - Security Mode 和 Policy 徽章
    - Dialog 模式支援
      - asDialog prop 切換對話框模式
      - DiscoveryDialog 元件封裝
    - 自訂 UI 元件
      - Badge, Button, Input 簡化元件
      - ServerAccordionItem 可展開項目
      - DiscoveryStatus 狀態指示器

- **Phase 14: US15 OPC UA Historical Access** (T153-T158) - `003-pro-features-opcua`
  - **共享型別定義** (`src/shared/types/opcua.ts`) (T153)
    - HistoryAggregateType - 19 種聚合函數類型
      - Average, TimeAverage, Count, Minimum, Maximum
      - MinimumActualTime, MaximumActualTime, Range, Total
      - Interpolative, Start, End, Delta
      - PercentBad, PercentGood, DurationBad, DurationGood
      - StandardDeviation, Variance
    - TimestampsToReturn - 時間戳記選項 (Source, Server, Both, Neither)
    - HistorizingCheckRequest/Result - 節點歷史化屬性檢查
    - HistoryReadRawRequest/Result - 原始歷史資料讀取
    - HistoryReadProcessedRequest/Result - 聚合歷史資料讀取
    - HistoryDataValue - 歷史資料值結構
    - HistoryNodeResult - 節點歷史查詢結果
    - HistoryAggregateNodeIds - OPC UA 聚合函數 NodeId 對應表

  - **Main Process - OpcUaAdapter 歷史方法** (`src/main/protocols/OpcUaAdapter.ts`) (T153-T156)
    - checkHistorizing(request) - 檢查節點 Historizing 屬性
      - 讀取 Historizing, AccessLevel, UserAccessLevel, MinimumSamplingInterval 屬性
      - 回傳 HistorizingCheckResult
    - readHistoryRaw(request) - 讀取原始歷史資料
      - 使用 ReadRawModifiedDetails 指定時間範圍
      - 支援 numValuesPerNode 限制
      - 支援 returnBounds 選項
      - 支援 continuation point 分頁
    - readHistoryProcessed(request) - 讀取聚合歷史資料
      - 使用 ReadProcessedDetails 指定聚合類型
      - 支援 processingInterval 處理間隔
      - 支援 AggregateConfiguration (percentDataGood/Bad, useSlopedExtrapolation)
    - releaseContinuationPoints(points) - 釋放伺服器端分頁資源
    - mapTimestampsToReturn(option) - 映射時間戳記選項

  - **IPC 通道定義** (`src/shared/constants/ipc-channels.ts`)
    - OPCUA_CHECK_HISTORIZING - 檢查歷史化屬性
    - OPCUA_READ_HISTORY_RAW - 讀取原始歷史
    - OPCUA_READ_HISTORY_PROCESSED - 讀取聚合歷史
    - OPCUA_RELEASE_CONTINUATION_POINTS - 釋放分頁點

  - **Main Process - History IPC 處理器** (`src/main/ipc/opcua.ts`) (T157)
    - opcua:check-historizing - 檢查節點歷史化支援
    - opcua:read-history-raw - 原始歷史讀取
    - opcua:read-history-processed - 聚合歷史讀取
    - opcua:release-continuation-points - 釋放分頁資源

  - **Preload API 擴展** (`src/preload/index.ts`)
    - checkHistorizing(request) - 檢查歷史化屬性
    - readHistoryRaw(request) - 原始歷史讀取
    - readHistoryProcessed(request) - 聚合歷史讀取
    - releaseContinuationPoints(params) - 釋放分頁點

  - **Renderer - OpcUaHistoryQuery UI** (`src/renderer/components/opcua/OpcUaHistoryQuery.tsx`) (T158)
    - 查詢模式選擇
      - Raw Data - 原始歷史資料查詢
      - Processed - 聚合資料查詢
    - 時間範圍設定
      - Start Time / End Time datetime-local 輸入
    - 原始查詢選項
      - Max Values 限制
      - Return Bounds 選項
    - 聚合查詢選項
      - Aggregate Type 下拉選單 (19 種聚合函數)
      - Processing Interval 設定 (毫秒)
    - Timestamps to Return 選項
    - 結果顯示
      - Table 視圖 - 時間戳記、值、狀態碼表格
      - Chart 視圖 - SVG 折線圖顯示
    - 分頁支援
      - Load More 按鈕 (continuation point)
      - Release 按鈕釋放伺服器資源
    - CSV 匯出功能
    - HistoryAvailabilityBadge 顯示節點歷史化支援狀態

- **Phase 13: US6 Configuration Export/Import** (T143-T152) - `003-pro-features-opcua`
  - **Main Process - WorkspaceExporter 服務** (`src/main/services/WorkspaceExporter.ts`)
    - 選擇性匯出功能 (T144-T147)
      - 支援選擇性匯出：環境、連線、標籤、橋接、儀表板、警報規則
      - 憑證安全排除機制 (僅標記 hasCredentials 旗標)
      - 名稱參考解析 (ID → 人類可讀名稱)
      - 穩定 YAML 輸出 (排序鍵值)
    - YAML 序列化
      - 使用 js-yaml 套件
      - Schema 版本控制 (WORKSPACE_SCHEMA_VERSION = 2)
      - 元資料嵌入 (名稱、描述、作者、版本、匯出時間)

  - **Main Process - WorkspaceImporter 服務** (`src/main/services/WorkspaceImporter.ts`)
    - YAML 驗證與匯入 (T148-T149)
      - 完整 YAML 結構驗證
      - Schema 版本相容性檢查
      - 參考完整性驗證
    - 衝突偵測與解決
      - 支援三種策略：skip (跳過)、overwrite (覆蓋)、rename (重命名)
      - 衝突項目清單回報
    - 名稱反向解析 (名稱 → ID)
    - 乾跑模式 (dry-run) 預覽功能
    - 依序匯入保證參考完整性
      - 匯入順序：環境 → 連線 → 標籤 → 橋接/儀表板/警報

  - **Main Process - Workspace IPC 處理器** (`src/main/ipc/workspace.ts`) (T150)
    - `workspace:export` - 匯出組態為 YAML 字串
    - `workspace:import` - 從 YAML 匯入組態
    - `workspace:validate` - 驗證 YAML 內容 (不執行匯入)
    - `workspace:save-file` - 儲存檔案對話框
    - `workspace:load-file` - 載入檔案對話框

  - **Renderer - ExportWorkspace UI** (`src/renderer/components/workspace/ExportWorkspace.tsx`) (T151)
    - 匯出對話框
      - 項目選擇 (環境、連線、標籤、橋接、儀表板、警報)
      - 元資料輸入 (名稱、描述、作者、版本)
      - 即時 YAML 預覽
    - 匯出操作
      - 產生 YAML 按鈕
      - 儲存至檔案按鈕
      - 複製到剪貼簿功能

  - **Renderer - ImportPreview UI** (`src/renderer/components/workspace/ImportPreview.tsx`) (T152)
    - 匯入預覽對話框
      - 驗證結果顯示 (錯誤、警告)
      - 匯入項目預覽 (計數與清單)
      - 衝突項目顯示
    - 衝突解決選項
      - Skip - 跳過衝突項目
      - Overwrite - 覆蓋現有項目
      - Rename - 自動重命名
    - 匯入結果摘要
      - 已匯入/已跳過計數
      - 警告訊息列表

  - **Renderer - useWorkspace Hook** (`src/renderer/hooks/useWorkspace.ts`)
    - 狀態管理 (isLoading, error)
    - 匯出操作 (exportWorkspace, saveFile)
    - 匯入操作 (loadFile, validateWorkspace, importWorkspace)
    - 錯誤處理 (clearError)

  - **共享型別更新** (`src/shared/types/workspace.ts`) (T143)
    - WorkspaceDocument 主文件結構
    - WorkspaceMeta 元資料介面
    - WorkspaceEnvironment, WorkspaceConnection, WorkspaceTag
    - WorkspaceBridge, WorkspaceDashboard, WorkspaceWidget, WorkspaceAlertRule
    - ExportWorkspaceRequest, ImportWorkspaceRequest
    - ImportWorkspaceResult, ValidationResult, ImportPreview
    - ConflictItem, ImportedCounts, ExportMappings, ImportMappings
    - WORKSPACE_SCHEMA_VERSION 常數

  - **Preload 更新** (`src/preload/index.ts`)
    - ElectronAPI.workspace 新增
      - export, import, validate
      - saveFile, loadFile

- **Phase 12: US13 & US14 OPC UA Events & Methods** (T132-T142) - `003-pro-features-opcua`
  - **Main Process - OPC UA 事件訂閱 (US13)**
    - OpcUaAdapter 事件功能增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - `subscribeToEvents()` 事件訂閱 (T132)
        - 支援 EventNotifier 節點監控
        - 可配置發布間隔與取樣間隔
      - EventFilter 建構 (T133)
        - Select Clause 定義擷取欄位
        - 支援欄位：EventId, EventType, SourceName, Time, Message, Severity
      - 事件通知處理 (T134)
        - 'event' 事件發射至 Renderer
        - 事件格式化為 OpcUaEvent 結構
      - Alarms & Conditions 支援 (T135)
        - `acknowledgeCondition()` - 確認警報
        - `confirmCondition()` - 確認條件
        - 支援 Comment 與 AcknowledgeableConditionType
      - 事件 IPC 處理器 (`src/main/ipc/opcua.ts`) (T136)
        - `opcua:subscribe-events` - 訂閱事件
        - `opcua:unsubscribe-events` - 取消訂閱
        - `opcua:acknowledge-condition` - 確認警報
        - `opcua:confirm-condition` - 確認條件
        - `opcua:event` - 事件推送

  - **Main Process - OPC UA 方法呼叫 (US14)**
    - OpcUaAdapter 方法功能增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - 方法瀏覽 (T138)
        - 瀏覽 Method 節點類別
        - 識別 HasComponent 與 HasOrderedComponent 參考
      - 方法參數讀取 (T139)
        - `getMethodArguments()` - 讀取 InputArguments 與 OutputArguments
        - 支援 Argument 結構：Name, DataType, ValueRank, ArrayDimensions, Description
      - 方法呼叫 (T140)
        - `callMethod()` - 呼叫方法
        - 支援多個輸入參數
        - 返回輸出參數與 StatusCode
      - 方法 IPC 處理器 (`src/main/ipc/opcua.ts`) (T141)
        - `opcua:get-method-args` - 取得方法參數
        - `opcua:call-method` - 呼叫方法

  - **Renderer - OPC UA 事件檢視器 UI** (`src/renderer/components/opcua/OpcUaEventViewer.tsx`) (T137)
    - 即時事件顯示列表
      - 依嚴重程度色彩標示 (info/warning/critical)
      - 時間戳顯示
      - 事件來源與訊息
    - 事件篩選功能
      - 依事件類型篩選
      - 依嚴重程度篩選
    - 警報操作
      - Acknowledge 按鈕
      - Confirm 按鈕
      - 操作註解輸入
    - 事件詳情展開
      - EventId、EventType、SourceNode
      - 完整事件屬性顯示
    - 訂閱控制
      - Subscribe/Unsubscribe 切換
      - 連線狀態顯示

  - **Renderer - OPC UA 方法呼叫 UI** (`src/renderer/components/opcua/OpcUaMethodCall.tsx`) (T142)
    - 方法選擇
      - 從瀏覽器拖曳 Method 節點
      - 顯示方法 DisplayName
    - 輸入參數表單
      - 依參數型別動態產生輸入欄位
      - 支援 Boolean、數值、字串等型別
      - 參數說明提示
    - 輸出結果顯示
      - 輸出參數列表
      - 執行 StatusCode
      - StatusCode 人類可讀說明
    - 方法執行
      - Call 按鈕執行方法
      - 執行中狀態指示
      - 錯誤訊息顯示

  - **Preload 更新** (`src/preload/index.ts`)
    - ElectronAPI.opcua 新增事件方法
      - subscribeEvents, unsubscribeEvents
      - acknowledgeCondition, confirmCondition
      - onEvent 事件監聽
    - ElectronAPI.opcua 新增方法呼叫
      - getMethodArgs, callMethod

  - **useOpcUa Hook 擴展** (`src/renderer/hooks/useOpcUa.ts`)
    - 事件狀態管理 (events, clearEvents)
    - 事件訂閱監聽 (自動訂閱/取消訂閱)
    - 事件操作 (subscribeEvents, unsubscribeEvents, acknowledgeCondition, confirmCondition)
    - 方法操作 (getMethodArgs, callMethod)

  - **共享型別更新** (`src/shared/types/opcua.ts`)
    - OpcUaEvent 介面
      - eventId, eventType, sourceNode, sourceName
      - time, message, severity
      - receiveTime, conditionId, acknowledgeableState
    - SubscribeEventsRequest, AcknowledgeConditionRequest, ConfirmConditionRequest
    - OpcUaMethodArguments 介面 (inputArguments, outputArguments)
    - OpcUaCallMethodRequest, OpcUaCallMethodResult

- **Phase 11: US12 OPC UA Certificate Management** (T124-T131) - `003-pro-features-opcua`
  - **Main Process - OpcUaCertificateStore 服務**
    - OpcUaCertificateStore 完整實作 (`src/main/services/OpcUaCertificateStore.ts`)
      - 使用 node-opcua OPCUACertificateManager 管理 PKI 資料夾
      - PKI 結構：own/cert、own/private、trusted/certs、rejected/certs、issuers/certs
      - CRUD 操作 (T124)
        - `list()` - 列出所有憑證 (應用程式/受信任/已拒絕)
        - `get(id)` - 取得單一憑證
        - `getByThumbprint()` - 依指紋取得憑證
        - `getApplicationCertificate()` - 取得應用程式憑證
        - `delete(id)` - 刪除憑證
      - 自簽憑證產生 (T125)
        - 支援 2048/3072/4096 key size
        - 可配置 subject、applicationUri、validity
        - 自動加入 DNS 與 IP SAN
      - 憑證匯入 (T126)
        - 支援 PEM (.pem, .crt, .cer) 格式
        - 支援 DER (.der) 格式
        - 支援 PFX/PKCS#12 (.pfx, .p12) 格式 (含密碼)
      - 信任管理 (T127)
        - `trust(id)` - 信任憑證 (移至 trusted/certs)
        - `reject(id)` - 拒絕憑證 (移至 rejected/certs)
        - `listTrusted()` - 列出受信任憑證
        - `listRejected()` - 列出已拒絕憑證
      - 憑證驗證 (T128)
        - `validate(id)` - 驗證憑證有效性
        - `validateFile(path)` - 驗證外部憑證檔案
        - 檢查：有效期、自簽狀態、信任狀態
        - 回傳 CertificateValidationResult 結構
      - 憑證匯出
        - `export(id, path)` - 匯出憑證至指定路徑

  - **Main Process - Certificate IPC 處理器** (`src/main/ipc/opcua.ts`) (T130)
    - `opcua:certificate:list` - 列出所有憑證
    - `opcua:certificate:import` - 匯入憑證
    - `opcua:certificate:export` - 匯出憑證
    - `opcua:certificate:delete` - 刪除憑證
    - `opcua:certificate:generate` - 產生自簽憑證
    - `opcua:certificate:trust` - 信任憑證
    - `opcua:certificate:reject` - 拒絕憑證
    - `opcua:certificate:getServerCertificate` - 取得伺服器憑證

  - **Renderer - CertificateManager UI** (`src/renderer/components/opcua/CertificateManager.tsx`) (T131)
    - 分頁顯示：應用程式憑證、受信任憑證、已拒絕憑證
    - 憑證卡片顯示：
      - Subject (Common Name)
      - 發行者
      - 有效期限與到期狀態
      - 指紋 (SHA-1 thumbprint)
    - 憑證詳細資訊對話框
      - 完整 Subject 與 Issuer 資訊
      - Serial Number
      - 有效期間
      - 憑證用途
    - 產生自簽憑證對話框 (T129)
      - 組織名稱輸入
      - Key Size 選擇 (2048/3072/4096)
      - 有效天數設定
    - 操作按鈕：
      - Trust - 信任憑證
      - Reject - 拒絕憑證
      - Delete - 刪除憑證
      - Export - 匯出憑證
    - 憑證匯入功能

  - **共享型別更新** (`src/shared/types/opcua.ts`)
    - CertificateValidationResult 介面
      - valid: boolean
      - expired: boolean
      - notYetValid: boolean
      - selfSigned: boolean
      - trusted: boolean
      - errors: string[]

  - **Preload 更新** (`src/preload/index.ts`)
    - ElectronAPI.opcua 新增 certificate 相關方法

- **Phase 10: US5 Protocol Calculator & Tools** (T113-T123) - `003-pro-features-opcua`
  - **Main Process - Protocol Calculator Service**
    - ProtocolCalculator 服務 (`src/main/services/ProtocolCalculator.ts`)
      - CRC-16/Modbus 計算 (T113)
        - 預先計算 CRC 查找表 (0xA001 多項式)
        - 支援 hex 字串與 byte 陣列輸入
        - 輸出: crc, hex, hexSwapped, bytes
      - LRC (Longitudinal Redundancy Check) 計算 (T114)
        - 二補數計算
        - 用於 Modbus ASCII 模式
      - Byte Order 轉換 (T115)
        - Big-Endian (ABCD), Little-Endian (DCBA)
        - Mid-Big (CDAB), Mid-Little (BADC)
        - swapBytes(), swapWords(), convertByteOrder()
      - IEEE 754 Float 編解碼 (T116)
        - Float32 與 Float64 解碼
        - Float32 編碼
        - 支援多種 byte order
        - 輸出: value, sign, exponent, mantissa, binary, hex
        - 特殊值處理: NaN, Infinity, Zero
      - Modbus 位址格式轉換 (T117)
        - Modicon 5-digit 格式 (0xxxx, 1xxxx, 3xxxx, 4xxxx)
        - IEC 格式 (HR100, IR100, DI100, CO100)
        - 原始位址解析
        - 輸出: registerType, address, modiconAddress, iecAddress, functionCodes
      - Modbus 封包分析 (T118)
        - 自動偵測 RTU 或 TCP 協定
        - RTU: Slave ID, Function Code, Data, CRC 驗證
        - TCP: Transaction ID, Protocol ID, Length, Unit ID, FC, Data
        - Function Code 名稱對應 (FC01-FC23)

  - **Main Process - Calculator IPC Handlers** (`src/main/ipc/calculator.ts`) (T119)
    - `calculator:crc16-modbus` - CRC-16/Modbus 計算
    - `calculator:lrc` - LRC 計算
    - `calculator:decode-float32` - Float32 解碼
    - `calculator:encode-float32` - Float32 編碼
    - `calculator:decode-float64` - Float64 解碼
    - `calculator:swap-bytes` - Byte 交換
    - `calculator:swap-words` - Word 交換
    - `calculator:convert-byte-order` - Byte Order 轉換
    - `calculator:parse-modbus-address` - Modbus 位址解析
    - `calculator:analyze-packet` - 封包分析
    - `calculator:hex-to-bytes` - Hex 轉 Bytes
    - `calculator:bytes-to-hex` - Bytes 轉 Hex

  - **Renderer - Calculator UI Components**
    - CrcCalculator 元件 (`src/renderer/components/calculator/CrcCalculator.tsx`) (T120)
      - Hex 輸入驗證
      - CRC-16/Modbus 與 LRC 計算
      - 多格式輸出顯示 (decimal, hex, swapped)
      - 複製到剪貼簿功能
    - ByteOrderConverter 元件 (`src/renderer/components/calculator/ByteOrderConverter.tsx`) (T121)
      - Byte/Word 交換快捷按鈕
      - 4 種 byte order 轉換
      - 視覺化 byte 顯示 (藍色/綠色區分)
    - FloatDecoder 元件 (`src/renderer/components/calculator/FloatDecoder.tsx`) (T122)
      - 解碼/編碼模式切換
      - Float32/Float64 支援
      - 多種 byte order 選項
      - Binary 分解顯示 (sign/exponent/mantissa 色彩區分)
    - PacketAnalyzer 元件 (`src/renderer/components/calculator/PacketAnalyzer.tsx`) (T123)
      - RTU/TCP 自動偵測
      - 視覺化封包結構 (色彩區分各欄位)
      - CRC 驗證狀態顯示
      - 範例資料快速載入

  - **共享型別更新** (`src/shared/types/calculator.ts`)
    - ByteOrder 型別 (big-endian, little-endian, mid-big, mid-little)
    - CrcResult, LrcResult 介面
    - FloatDecodeResult, FloatEncodeResult 介面
    - ByteSwapResult 介面
    - ModbusAddressInfo, RegisterType 介面
    - PacketAnalysis, ModbusRtuAnalysis, ModbusTcpAnalysis 介面

  - **Preload 更新** (`src/preload/index.ts`)
    - ElectronAPI.calculator 介面與實作

- **Phase 9: US9, US10, US11 OPC UA Read/Write & Subscriptions** (T095-T112) - `003-pro-features-opcua`
  - **Main Process - OPC UA 讀取操作 (US9)**
    - OpcUaAdapter 讀取功能增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - `read()` 單一與批次讀取 (T095)
      - OPC UA Built-in 資料型別完整處理 (T096)
        - Boolean, SByte, Byte, Int16-64, UInt16-64
        - Float, Double, String, DateTime, Guid
        - ByteString, LocalizedText, QualifiedName, NodeId
      - ExtensionObject 解碼 (T097)
        - EURange, EUInformation, Argument
        - Range, EnumValueType, OptionSet
        - 遞迴解碼巢狀結構
      - StatusCode 人類可讀顯示 (T098)
        - 名稱映射 (Good, BadNodeIdUnknown, UncertainInitialValue 等)
        - 嚴重程度分類 (good/uncertain/bad)
      - 陣列維度與型別資訊

  - **Main Process - OPC UA 寫入操作 (US10)**
    - OpcUaAdapter 寫入功能增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - `write()` 單一與批次寫入 (T100)
      - 資料型別驗證 (T101)
        - DataType 名稱對應 node-opcua DataType enum
        - 自動型別轉換與編碼
      - `validateWriteAccess()` AccessLevel 檢查 (T102)
        - 讀取 AccessLevel, UserAccessLevel, DataType 屬性
        - 檢查寫入權限位元 (0x02)
      - 寫入 IPC 處理器 (`src/main/ipc/opcua.ts`) (T103)
        - `opcua:write` - 寫入節點值
        - `opcua:validate-write-access` - 驗證寫入權限

  - **Renderer - OPC UA 寫入確認 UI**
    - OpcUaWriteConfirm 元件 (`src/renderer/components/opcua/OpcUaWriteConfirm.tsx`) (T104)
      - 當前值與新值比較顯示
      - 節點資訊展示 (NodeId, DataType, AccessLevel)
      - Critical/Non-critical 模式區分
      - useWriteConfirm Hook 狀態管理
      - 「本次會話不再詢問」選項

  - **Main Process - OPC UA 訂閱管理 (US11)**
    - OpcUaAdapter 訂閱功能增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - `createSubscription()` 可配置發布間隔 (T105)
        - requestedPublishingInterval
        - requestedLifetimeCount
        - requestedMaxKeepAliveCount
      - `addMonitoredItem()` 監控項目建立 (T106)
        - 可配置 samplingInterval, queueSize
        - discardOldest 策略
      - Deadband 過濾支援 (T107)
        - None - 所有變化
        - Absolute - 絕對值差異
        - Percent - 百分比差異
        - DataChangeFilter 與 DataChangeTrigger 整合
      - 資料變更通知處理 (T108)
        - 'changed' 事件監聽
        - 'data-received' 事件發射至 Renderer
      - 訂閱生命週期管理 (T109)
        - `deleteSubscription()` 刪除訂閱
        - `getSubscriptionState()` 取得訂閱狀態
        - `getSubscriptions()` 列出所有訂閱
      - `setPublishingMode()` 暫停/恢復發布 (T110)
      - `transferSubscriptions()` 重連時訂閱轉移 (T111)
      - 訂閱 IPC 處理器擴展 (`src/main/ipc/opcua.ts`) (T112)
        - `opcua:set-publishing-mode` - 設定發布模式
        - `opcua:get-subscription-state` - 取得訂閱狀態
        - `opcua:get-subscriptions` - 列出所有訂閱
        - `opcua:modify-monitored-item` - 修改監控項目

  - **共享型別更新** (`src/shared/types/opcua.ts`)
    - OpcUaReadValue 增強 (dataTypeId, statusCodeName, statusCodeSeverity, isArray, arrayDimensions)
    - OpcUaWriteValidation 介面
    - SetPublishingModeRequest 介面
    - DeleteSubscriptionRequest 介面
    - RemoveMonitoredItemRequest 介面
    - SubscriptionState 介面

  - **IPC 通道擴展** (`src/shared/constants/ipc-channels.ts`)
    - OPCUA_VALIDATE_WRITE_ACCESS
    - OPCUA_SET_PUBLISHING_MODE
    - OPCUA_GET_SUBSCRIPTION_STATE
    - OPCUA_GET_SUBSCRIPTIONS

- **Phase 8: US8 OPC UA Node Browsing** (T086-T094) - `003-pro-features-opcua`
  - **Main Process - OPC UA 地址空間瀏覽**
    - OpcUaAdapter 瀏覽功能增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - `browse()` 返回 OpcUaBrowseResult 含 continuationPoint 支援分頁
      - `browseNext()` 續點瀏覽大量子節點 (T087)
      - `readNodeAttributes()` 讀取完整節點屬性 (T088)
        - Variable 專屬：value, dataType, valueRank, accessLevel, historizing
        - Method 專屬：executable, userExecutable
      - `searchNodes()` 依 DisplayName 模式搜尋 (T089)
        - 廣度優先搜尋演算法
        - 支援 maxDepth, maxResults, nodeClassFilter
      - `translateBrowsePath()` 相對路徑轉換為 NodeId (T090)

  - **Main Process - OPC UA IPC 處理器擴展**
    - 新增 IPC 通道 (`src/main/ipc/opcua.ts`)
      - `opcua:browse` - 返回 OpcUaBrowseResult 含分頁資訊
      - `opcua:browse-next` - 續點瀏覽
      - `opcua:browse-path` - 路徑轉換
      - `opcua:search-nodes` - 節點搜尋
      - `opcua:read-node-attributes` - 讀取節點屬性

  - **Renderer - OPC UA 瀏覽器 UI**
    - useOpcUa Hook 擴展 (`src/renderer/hooks/useOpcUa.ts`)
      - 新增：browseNext(), browsePath(), searchNodes(), readNodeAttributes()
    - OpcUaBrowser 樹狀瀏覽器元件 (`src/renderer/components/opcua/OpcUaBrowser.tsx`)
      - 階層式節點展開/折疊 (lazy loading)
      - 續點處理「載入更多」按鈕
      - DisplayName 搜尋功能
      - 拖放支援 (Variable 節點可拖曳建立 Tag)
      - 節點類別圖示 (Object/Variable/Method/ObjectType 等)
    - OpcUaNodeDetails 節點屬性檢視器 (`src/renderer/components/opcua/OpcUaNodeDetails.tsx`)
      - 基本屬性：NodeId, NodeClass, BrowseName, DisplayName
      - Variable 專屬：Value, DataType, AccessLevel, Historizing
      - Method 專屬：Executable, UserExecutable
      - 自動重新整理功能 (可配置間隔)
      - 複製到剪貼簿功能

  - **Preload API 擴展**
    - 新增 browseNext, browsePath, searchNodes, readNodeAttributes 至 opcua 區段

  - **共享型別更新** (`src/shared/types/opcua.ts`)
    - OpcUaBrowseResult (nodes + continuationPoint + hasMore)
    - OpcUaBrowseNextRequest
    - OpcUaBrowsePathResult
    - OpcUaSearchNodesRequest / OpcUaSearchResult
    - OpcUaNodeAttributesRequest / OpcUaNodeAttributes

- **Phase 7: US7 OPC UA Connection** (T075-T085) - `003-pro-features-opcua`
  - **Main Process - OPC UA 協定適配器**
    - OpcUaAdapter 連線邏輯增強 (`src/main/protocols/OpcUaAdapter.ts`)
      - 端點 URL 驗證函式 `validateEndpointUrl()`
      - 端點 URL 解析函式 `parseEndpointUrl()`
      - 安全模式對應：None, Sign, SignAndEncrypt
      - 安全策略對應：None, Basic256Sha256, Aes128_Sha256_RsaOaep, Aes256_Sha256_RsaPss
    - Session 管理增強
      - Session 超時與續約機制 (75% timeout 時自動續約)
      - Session 事件處理：session_closed, keepalive, keepalive_failure
      - Client 事件處理：connection_lost, connection_reestablished
      - 自動重連機制 `reconnect()`
    - 認證方法支援
      - Anonymous 認證
      - Username/Password 認證
      - Certificate 認證預留介面
    - GetEndpoints 服務端點發現
    - 伺服器資訊擷取 `extractServerInfo()`
    - 新增 getter 方法：getServerInfo(), getSessionId(), getSessionTimeout()

  - **Main Process - OPC UA IPC 處理器**
    - 完整 OPC UA IPC 處理器 (`src/main/ipc/opcua.ts`)
      - `opcua:get-endpoints` - 取得伺服器端點清單
      - `opcua:test-connection` - 測試連線 (不建立持久連線)
      - `opcua:session-status` - 取得 Session 狀態
      - `opcua:browse` - 瀏覽子節點
      - `opcua:read` - 讀取節點值
      - `opcua:write` - 寫入節點值
      - `opcua:create-subscription` - 建立訂閱
      - `opcua:delete-subscription` - 刪除訂閱
      - `opcua:add-monitored-item` - 新增監控項目
      - `opcua:remove-monitored-item` - 移除監控項目
      - `opcua:data-change` - 資料變更推送事件

  - **Renderer - OPC UA UI**
    - useOpcUa Hook (`src/renderer/hooks/useOpcUa.ts`)
      - 端點發現：getEndpoints(), testConnection()
      - Session 狀態：getSessionStatus()
      - 瀏覽操作：browse()
      - 讀寫操作：read(), write()
      - 訂閱管理：createSubscription(), deleteSubscription(), addMonitoredItem(), removeMonitoredItem()
      - 資料變更訂閱：onDataChange 即時事件
      - 狀態管理：isLoading, error, dataChanges
    - ConnectionForm OPC UA 支援 (`src/renderer/components/connection/ConnectionForm.tsx`)
      - 三協定選擇器：Modbus TCP / MQTT / OPC UA
      - OPC UA 設定欄位：Endpoint URL、Security Mode、Security Policy
      - OPC UA 認證欄位：Username、Password (選填)
      - 端點 URL 驗證

  - **Preload API 擴展**
    - 新增 opcua API 區段
    - 完整型別定義與 IPC 橋接

- **Phase 6: US4 Alert & Notification System** (T062-T074) - `003-pro-features-opcua`
  - **Main Process - AlertEngine 整合**
    - AlertEngine 與 AlertHistoryStore 整合 (`src/main/services/AlertEngine.ts`)
      - SQLite 事件持久化儲存
      - 閾值警報觸發：支援 >, <, =, !=, range 運算子
      - Duration 條件 (debounce) - 條件持續時間檢查
      - Cooldown 機制 - 防止重複警報
      - Mute/Unmute 規則功能 - 靜音警報但繼續記錄
      - Desktop notification (Electron Notification API)
    - AlertSoundPlayer 服務 (`src/main/services/AlertSoundPlayer.ts`)
      - 依嚴重程度播放不同音效模式
      - 支援自訂音效檔案
      - 音量控制與啟用/停用開關
      - 跨平台支援 (macOS/Windows/Linux)
    - 完整 Alert IPC 處理器 (`src/main/ipc/alert.ts`)
      - 規則 CRUD：list-rules/get-rule/create-rule/update-rule/delete-rule
      - 規則控制：enable-rule/disable-rule/mute-rule/unmute-rule
      - 事件查詢：query-events/acknowledge/acknowledge-all/clear-history
      - 音效控制：test-sound/set-sound-enabled/get-sound-enabled
      - 即時推送：event-triggered/event-acknowledged

  - **Renderer - Alert UI**
    - useAlert Hook (`src/renderer/hooks/useAlert.ts`)
      - 警報規則狀態管理 (rules, mutedRules)
      - 事件歷史狀態 (events, totalEvents, hasMoreEvents)
      - 未確認計數 (unacknowledgedCounts by severity)
      - 音效設定 (soundEnabled)
      - 即時事件訂閱 (recentEvent for toast)
      - CRUD 操作與事件確認功能
    - AlertRuleEditor 元件 (`src/renderer/components/alert/AlertRuleEditor.tsx`)
      - 規則名稱與標籤選擇
      - 條件設定：運算子、閾值、範圍、duration
      - 嚴重程度選擇 (info/warning/critical)
      - 動作配置：notification/sound/log
      - Cooldown 設定
      - 音效測試按鈕
    - AlertHistory 元件 (`src/renderer/components/alert/AlertHistory.tsx`)
      - 事件列表顯示 (嚴重程度圖示、訊息、時間)
      - 嚴重程度快速篩選
      - 確認狀態篩選
      - 單一/批次確認功能
      - 分頁載入 (Load More)
      - 清除歷史功能
    - AlertNotification 元件 (`src/renderer/components/alert/AlertNotification.tsx`)
      - Toast 風格警報通知
      - 依嚴重程度自動消失時間 (critical 不消失)
      - 確認與關閉按鈕
      - 音效開關快捷按鈕
      - 進度條動畫
      - AlertNotificationStack 多通知堆疊管理
    - Preload API 擴展 - Alert 相關操作

- **Phase 5: US3 Dashboard View with Gauges** (T050-T061) - `003-pro-features-opcua`
  - **Main Process - Dashboard IPC 處理器**
    - Dashboard IPC handlers 完整實作 (`src/main/ipc/dashboard.ts`)
      - `dashboard:list` - 列出所有 Dashboard
      - `dashboard:get` - 取得單一 Dashboard
      - `dashboard:create` - 建立新 Dashboard
      - `dashboard:update` - 更新 Dashboard 設定
      - `dashboard:delete` - 刪除 Dashboard
      - `dashboard:set-default` - 設為預設 Dashboard
      - `dashboard:get-default` - 取得預設 Dashboard
      - `dashboard:add-widget` - 新增 Widget 至 Dashboard
      - `dashboard:update-widget` - 更新 Widget 設定
      - `dashboard:remove-widget` - 移除 Widget
      - `dashboard:update-layout` - 更新 Widget 佈局
    - Preload API 擴展 - Dashboard 相關操作

  - **Renderer - Dashboard Widgets**
    - useDashboard Hook (`src/renderer/hooks/useDashboard.ts`)
      - Dashboard 狀態管理 (dashboards, currentDashboard, isLoading, error)
      - CRUD 操作 (createDashboard/updateDashboard/deleteDashboard)
      - Widget 操作 (addWidget/updateWidget/removeWidget)
      - 佈局操作 (updateLayout)
      - IPC 事件監聽自動訂閱
    - WidgetBase 介面 (`src/renderer/components/dashboard/WidgetBase.tsx`)
      - WidgetContainer 共用容器元件
      - 工具函式：getColorForValue, formatValue, getPrimaryValue, toNumericValue
      - 常數定義：WIDGET_TYPE_LABELS, WIDGET_TYPE_ICONS, WIDGET_MIN_SIZES, WIDGET_DEFAULT_SIZES
    - GaugeWidget 元件 (`src/renderer/components/dashboard/widgets/GaugeWidget.tsx`)
      - SVG 圓弧儀表板
      - 支援 semicircle/full 模式
      - 可配置 min/max、unit、thresholds、showValue
      - 閾值色彩變化 (normal/warning/critical)
    - LEDWidget 元件 (`src/renderer/components/dashboard/widgets/LEDWidget.tsx`)
      - On/Off LED 指示燈
      - circle/square 形狀切換
      - 可配置 onColor/offColor、onValue 匹配值
      - 發光效果 (glow)
    - NumberCardWidget 元件 (`src/renderer/components/dashboard/widgets/NumberCardWidget.tsx`)
      - 大字體數值顯示
      - title、unit、decimals 配置
      - fontSize 選項 (small/medium/large)
      - 閾值色彩支援
    - ChartWidget 元件 (`src/renderer/components/dashboard/widgets/ChartWidget.tsx`)
      - SVG 時間序列折線圖
      - 整合 DVR sparkline 資料
      - 可配置 timeRange、showGrid、showLegend
      - 多標籤支援

  - **Renderer - Dashboard Canvas**
    - DashboardCanvas 元件 (`src/renderer/components/dashboard/DashboardCanvas.tsx`)
      - react-grid-layout v2 整合
      - 12 欄網格系統、80px 列高
      - Edit/View 模式切換
      - Widget 拖放與調整大小
      - GridConfig/DragConfig/ResizeConfig 配置
    - WidgetPalette 元件 (`src/renderer/components/dashboard/WidgetPalette.tsx`)
      - Widget 類型選擇對話框
      - 視覺預覽 (Gauge/LED/NumberCard/Chart)
      - 預設尺寸提示
    - WidgetConfig 元件 (`src/renderer/components/dashboard/WidgetConfig.tsx`)
      - Widget 屬性編輯對話框
      - 依 Widget 類型顯示對應設定
      - Gauge：min/max/unit/thresholds/gaugeType
      - LED：shape/onColor/offColor/onValue
      - NumberCard：title/unit/decimals/fontSize
      - Chart：timeRange/showGrid/showLegend

- **Phase 4: US1 Bridge Protocol Bridging** (T040-T049) - `003-pro-features-opcua`
  - **Main Process - BridgeManager 服務**
    - BridgeManager 完整實作 (`src/main/services/BridgeManager.ts`)
      - Bridge 生命週期管理 (create/update/delete/start/stop/pause/resume)
      - Change-only 轉發模式 (僅值變化時轉發)
      - 數值閾值支援 (deadband 過濾)
      - 本地緩衝機制 (目標連線不可用時)
      - 自動重連恢復轉發
      - 統計追蹤 (messagesForwarded/messagesDropped/bytesTransferred/uptime)
    - PayloadTemplateEngine 範本引擎 (`src/main/services/PayloadTemplateEngine.ts`)
      - 變數解析：`${value}`, `${timestamp}`, `${isoTimestamp}`, `${tagName}`, `${connectionId}`, `${quality}`
      - 巢狀變數支援：`${tags.NAME.value}`, `${tags.NAME.quality}`, `${tag.property}`
      - Topic 與 Payload 範本處理
    - 完整 Bridge IPC 處理器 (`src/main/ipc/bridge.ts`)
      - `bridge:list` - 列出所有 Bridge
      - `bridge:get` - 取得單一 Bridge
      - `bridge:create` - 建立新 Bridge
      - `bridge:update` - 更新 Bridge 設定
      - `bridge:delete` - 刪除 Bridge
      - `bridge:start` / `bridge:stop` / `bridge:pause` / `bridge:resume` - 生命週期控制
      - `bridge:get-stats` - 取得 Bridge 統計資料
    - Bridge 事件訂閱
      - `bridge:status-changed` - 狀態變更推送
      - `bridge:error` - 錯誤事件推送
      - `bridge:stats` - 統計更新推送

  - **Renderer - Bridge UI**
    - useBridge Hook (`src/renderer/hooks/useBridge.ts`)
      - Bridge 狀態管理 (bridges, stats, isLoading, error)
      - CRUD 操作 (createBridge/updateBridge/deleteBridge)
      - 生命週期操作 (startBridge/stopBridge/pauseBridge/resumeBridge)
      - 事件監聽器自動訂閱/取消訂閱
    - BridgeMapper 元件 (`src/renderer/components/bridge/BridgeMapper.tsx`)
      - 來源/目標連線顯示
      - 可用標籤清單 (多選)
      - Tag-to-Topic 對應編輯
      - 全域目標設定 (QoS Level、Retain)
    - BridgeStatus 元件 (`src/renderer/components/bridge/BridgeStatus.tsx`)
      - 狀態徽章 (Active/Paused/Error/Idle)
      - 統計資訊顯示 (Messages Forwarded/Data Transferred/Uptime/Errors)
      - 最後錯誤訊息
      - 最後轉發時間
    - PayloadEditor 元件 (`src/renderer/components/bridge/PayloadEditor.tsx`)
      - 範本編輯器 (語法高亮)
      - 變數插入面板 (點擊插入)
      - JSON 結構驗證
      - 複製到剪貼簿功能
    - TopicEditor 元件 - 簡化版主題範本編輯器
    - BridgeStatusCard 元件 - 卡片式狀態顯示

- **Phase 1-3: 基礎建設** (T001-T039) - `003-pro-features-opcua`
  - **Phase 1 Setup**: 共享類型定義
    - Bridge 相關型別 (`src/shared/types/bridge.ts`)
    - Environment/Collection 型別 (`src/shared/types/environment.ts`, `collection.ts`)
    - Dashboard/Alert/OPC UA 型別
    - IPC 通道常數擴展
  - **Phase 2 Foundational**: 服務骨架與狀態管理
    - BridgeManager 骨架
    - EnvironmentManager 服務
    - CollectionRunner 服務
    - Zustand stores (bridgeStore, environmentStore, collectionStore)
  - **Phase 3 US2**: Environment & Collections
    - 環境變數切換功能
    - Collection 執行引擎
    - 完整 IPC 處理器

- **Phase 2 Professional Features + Full OPC UA 規格文件** (`specs/003-pro-features-opcua/`)
  - **spec.md** - 完整功能規格
    - 16 個使用者故事 (Part A: 專業功能 US-001~US-006, Part B: OPC UA US-007~US-016)
    - 90 個功能需求 (FR-001~FR-091)
    - 20 個成功標準 (SC-001~SC-019)
    - Edge Cases 定義與 Clarifications 章節
    - 過度工程簡化：Virtual Server 延遲至 Phase 3、雙向 Bridge 延遲、Script Execution 移除

  - **plan.md** - 實作計畫
    - 15 個實作階段，按優先級排序
    - 技術上下文：Electron 40, React 19, node-opcua 2.160.0
    - Constitution 檢查點 (10/10 原則通過)
    - 完整目錄結構與服務對應表
    - User Story → Phase 對應圖

  - **research.md** - 技術研究與決策
    - react-grid-layout 評估 (Dashboard 拖放佈局)
    - node-opcua 安全策略分析
    - SQLite 告警歷史儲存策略
    - js-yaml 穩定輸出配置

  - **data-model.md** - 資料模型定義
    - Part A: Environment, Collection, Bridge, Dashboard, Alert 實體
    - Part B: OpcUaConnection, OpcUaNode, OpcUaSubscription, OpcUaCertificate 實體
    - 狀態轉換圖 (Bridge, Alert, OPC UA Session)
    - SQLite 索引策略

  - **contracts/ipc-channels.md** - IPC 通道規格
    - 70+ IPC 通道定義
    - 8 個功能域：environment, collection, bridge, dashboard, alert, calculator, workspace, opcua
    - 事件訂閱定義 (M→R 推送)

  - **contracts/types.ts** - TypeScript 型別合約
    - 完整請求/回應型別定義
    - OPC UA 專用型別 (SecurityPolicy, MessageSecurityMode, NodeClass 等)
    - 與 data-model.md 保持一致

  - **quickstart.md** - 開發環境設定
    - 10 個測試場景 (環境切換、Collection 執行、Bridge 轉發、Dashboard、Alert、OPC UA 連線等)
    - Mock Server 配置 (Modbus TCP、OPC UA、MQTT)
    - 效能基準目標

  - **tasks.md** - 任務分解
    - 180 個實作任務 (T001~T180)
    - 16 個執行階段 (Setup → Foundational → User Stories → Polish)
    - 依賴圖與平行執行機會標示
    - MVP 策略：US1 (Bridge) + US2 (Environment/Collection) 優先

- **規格分析報告**
  - 100% 需求覆蓋率 (90 FR → 180 Tasks)
  - 0 個 Constitution 違規
  - 5 個警告 (Phase 編號偏移、Story 標籤格式等)
  - 8 個改善建議

## [0.8.0] - 2025-01-24

### Added

- **Phase 10: Polish & Cross-Cutting Concerns** (T130-T145)
  - **Main Process - App Lifecycle Handlers**
    - App lifecycle IPC handlers (`src/main/ipc/app.ts`)
      - `app:check-unsaved` - 檢查是否有未儲存的變更或進行中的輪詢
      - `app:force-quit` - 強制關閉應用程式
      - `app:confirm-close` - 從選單觸發的關閉確認
    - Window close 確認對話框
      - 偵測進行中的輪詢會話
      - 優雅停止所有輪詢再關閉
    - `handleWindowClose()` 整合至 main/index.ts

  - **Main Process - 自動重連機制**
    - ConnectionManager 指數退避重連 (`src/main/services/ConnectionManager.ts`)
      - 基礎延遲 1 秒，最大延遲 30 秒
      - 最多嘗試 5 次重連
      - 網路斷線偵測 (3 秒逾時)
    - 新增方法：
      - `connectWithTimeout()` - 帶逾時的連線
      - `scheduleReconnect()` - 排程重連
      - `setAutoReconnect()` - 開啟/關閉自動重連
      - `cancelReconnect()` - 取消待處理重連

  - **Renderer - UI Polish**
    - uiStore Zustand 狀態管理 (`src/renderer/stores/uiStore.ts`)
      - Theme 管理 (light/dark/system)
      - 自動偵測系統主題變更
      - 側邊欄折疊狀態
      - Log viewer 開關狀態
      - 使用 localStorage 持久化
    - ThemeToggle 元件 (`src/renderer/components/common/ThemeToggle.tsx`)
      - 循環切換 light → dark → system
      - 各主題專屬圖示
    - LogViewer 元件 (`src/renderer/components/common/LogViewer.tsx`)
      - 顯示應用程式日誌
      - 等級篩選器 (debug/info/warn/error/verbose)
      - 自動重整 (5 秒間隔)
      - 自動捲動至最新
      - 開啟日誌資料夾按鈕
    - useKeyboardShortcuts Hook (`src/renderer/hooks/useKeyboardShortcuts.ts`)
      - `Ctrl+Enter` (Mac: `Cmd+Enter`) - 連線/斷線
      - `F5` - 開始輪詢
      - `Shift+F5` - 停止輪詢
      - `Ctrl+L` (Mac: `Cmd+L`) - 切換日誌檢視器
    - App.tsx 整合
      - 鍵盤快捷鍵啟用
      - 側邊欄 Theme Toggle
      - 側邊欄 Log Viewer 切換按鈕
      - 主內容區底部 Log Viewer 面板

  - **E2E Tests**
    - monitoring.spec.ts - US2 標籤監控測試
    - dvr.spec.ts - US3 DVR 時光旅行測試
    - profile.spec.ts - US4 組態管理測試
    - 測試採用彈性設計，伺服器不可用時優雅跳過

### Changed

- `src/main/index.ts` 整合 app lifecycle handlers
- `src/main/ipc/index.ts` 註冊 App lifecycle IPC 處理器
- `src/main/services/ConnectionManager.ts` 新增自動重連邏輯
- `src/renderer/App.tsx` 整合 UI polish 功能

### Technical Details

- 自動重連使用指數退避演算法：delay = min(base * 2^attempts, max)
- Theme provider 監聽 `prefers-color-scheme` media query
- 日誌檢視器使用分頁載入，每次最多 200 筆
- E2E 測試使用 Playwright + Electron 整合
- 鍵盤快捷鍵跨平台支援 (Windows/Mac)

## [0.7.0] - 2025-01-24

### Added

- **Phase 9: US6 多協定支援** (T121-T129)
  - **Main Process - MQTT 協定適配器**
    - MqttAdapter 完整實作 (`src/main/protocols/MqttAdapter.ts`)
      - 使用 mqtt.js 5.x 函式庫
      - Topic 訂閱與值快取機制
      - JSON payload 解析與 jsonPath 擷取
      - 支援 MQTT wildcard 訂閱 (`+` 單層、`#` 多層)
      - TLS 加密連線支援
      - 使用者名稱/密碼驗證
      - 自動重連機制
    - parseMqttAddress 工具函式
      - 支援格式：`topic` 或 `topic::jsonPath`
      - JSON path 支援點記法與陣列索引 (e.g., `data.values[0].temp`)
    - 協定註冊擴展 (`src/main/protocols/index.ts`)
      - initializeProtocols() 註冊 MQTT 適配器
      - 工廠模式支援多協定實例化

  - **Renderer - 多協定 UI**
    - ConnectionForm 協定選擇器 (`src/renderer/components/connection/ConnectionForm.tsx`)
      - 協定切換按鈕 (Modbus TCP / MQTT)
      - Modbus TCP 設定欄位：Host、Port、Unit ID
      - MQTT 設定欄位：Broker URL、Client ID、Username、Password、TLS
      - 依協定動態顯示對應欄位
    - TagGrid 協定圖示 (`src/renderer/components/tags/TagGrid.tsx`)
      - Modbus TCP：藍色 Radio 圖示
      - MQTT：綠色 Wifi 圖示
      - OPC UA：紫色 Network 圖示 (預留)
      - 支援兩種協定的位址格式顯示
    - TagEditor 多協定支援 (`src/renderer/components/tags/TagEditor.tsx`)
      - Modbus 位址欄位：Register Type、Address、Length
      - MQTT 位址欄位：Topic、JSON Path (選填)
      - 標頭顯示協定類型指示器

  - **測試**
    - MqttAdapter 單元測試 (`tests/unit/main/MqttAdapter.test.ts`)
      - 位址解析測試 (9 tests)
      - 適配器生命週期測試 (8 tests)
      - JSON path 擷取測試 (2 tests)
      - Topic wildcard 匹配測試 (8 tests)
      - Payload 解析測試 (13 tests)
      - 共 40 個測試案例

### Changed

- `src/main/protocols/index.ts` 註冊 MQTT 協定工廠
- `src/shared/types/tag.ts` 新增 DEFAULT_MQTT_ADDRESS 常數
- `src/renderer/components/connection/ConnectionForm.tsx` 重寫為多協定表單
- `src/renderer/components/tags/TagGrid.tsx` 新增 ProtocolIcon 元件
- `src/renderer/components/tags/TagEditor.tsx` 重寫為多協定編輯器

### Technical Details

- MQTT 採用發布/訂閱模式，與 Modbus TCP 輪詢模式不同
- MqttAdapter 透過 topicCache 快取最新值供 readTags() 返回
- 支援 QoS 1 確保訊息至少送達一次
- 協定適配器繼承 ProtocolAdapter 抽象類別，確保統一介面
- 測試總數：63 個 (ModbusTcpAdapter: 23, MqttAdapter: 40)

## [0.6.0] - 2025-01-24

### Added

- **Phase 8: US5 虛擬伺服器** (T110-T120)
  - **Main Process - VirtualServer 服務**
    - VirtualServerManager 完整實作 (`src/main/services/VirtualServer.ts`)
      - 內建 Modbus TCP 伺服器模擬器
      - 支援 FC3/FC4 讀取暫存器、FC6 寫入單一、FC16 寫入多筆
      - 多伺服器實例管理
      - 客戶端連線追蹤
    - 波形產生器實作
      - constant：固定值輸出
      - sine：正弦波振盪
      - square：方波切換
      - triangle：三角波線性漸變
      - random：隨機值 (可設定範圍)
    - 週期性數值更新 (100ms 間隔) 確保平滑波形模擬
    - EADDRINUSE 錯誤處理與自動埠號建議
    - 完整 Virtual Server IPC 處理器 (`src/main/ipc/virtual-server.ts`)
      - `virtual-server:start` - 啟動虛擬伺服器
      - `virtual-server:stop` - 停止虛擬伺服器
      - `virtual-server:status` - 取得所有伺服器狀態

  - **Renderer - Virtual Server UI**
    - virtualServerStore Zustand 狀態管理 (`src/renderer/stores/virtualServerStore.ts`)
    - VirtualServerPanel 元件 (`src/renderer/components/virtual-server/VirtualServerPanel.tsx`)
      - 埠號設定
      - 伺服器啟動/停止控制
      - 執行中伺服器清單與狀態顯示
      - 客戶端連線數顯示
    - RegisterConfigForm 元件 (`src/renderer/components/virtual-server/RegisterConfigForm.tsx`)
      - 虛擬暫存器範圍設定
      - 起始位址與長度配置
      - 波形選擇與參數調整
    - WaveformSelector 元件 (`src/renderer/components/virtual-server/WaveformSelector.tsx`)
      - 波形類型選擇器
      - 參數配置 (振幅、偏移、週期、最大/最小值)
      - 即時波形預覽 SVG 視覺化
    - App.tsx 側邊欄整合 VirtualServerPanel

### Changed

- `src/main/ipc/index.ts` 註冊 Virtual Server IPC 處理器
- `src/main/services/index.ts` 匯出 VirtualServerManager
- `src/renderer/App.tsx` 側邊欄新增 Virtual Server 管理面板
- `specs/002-iiot-protocol-studio/tasks.md` 更新 T110-T120 完成狀態

### Technical Details

- 使用 Node.js `net` 模組實作原生 Modbus TCP 伺服器
- 支援標準 Modbus TCP 協議 (MBAP Header + PDU)
- 波形更新頻率 100ms，確保測試時數據變化可見
- 自動偵測埠號衝突並建議可用埠號
- 單例模式管理多伺服器實例

## [0.5.0] - 2025-01-24

### Added

- **Phase 7: US7 Session 匯出與報告** (T100-T109)
  - **Main Process - Export 服務**
    - ExportService 完整實作 (`src/main/services/ExportService.ts`)
      - CSV 匯出：Timestamp, DateTime, TagName, Value, Quality 欄位
      - HTML 報告產生器：連線摘要、統計數據、趨勢圖
      - 大量資料 (>10,000 筆) 進度追蹤與回報
      - 整合 DataBuffer.getDataForExport() 取得時間範圍資料
      - ECharts 圖表整合 (CDN 載入)
    - 完整 Export IPC 處理器 (`src/main/ipc/export.ts`)
      - `export:csv` - 匯出 CSV 檔案 (含檔案對話框)
      - `export:html-report` - 產生 HTML 報告 (含檔案對話框)
      - 大量匯出時透過 `export:progress` 事件回報進度

  - **Renderer - Export UI**
    - ExportDialog 元件 (`src/renderer/components/export/ExportDialog.tsx`)
      - 格式選擇 (CSV / HTML Report)
      - 時間範圍選擇器 (datetime-local)
      - 標籤多選器 (全選/取消全選)
      - HTML 報告選項：是否包含趨勢圖
    - ExportProgress 元件 (`src/renderer/components/export/ExportProgress.tsx`)
      - 進度條顯示
      - 已處理/總筆數
      - 完成狀態指示
    - ReportPreview 元件 (`src/renderer/components/export/ReportPreview.tsx`)
      - 匯出預覽資訊
      - 預估資料筆數
      - 欄位/區段說明
    - App.tsx DVR 區塊新增「Export Data」按鈕

### Changed

- `src/main/ipc/index.ts` 註冊 Export IPC 處理器
- `src/main/services/index.ts` 匯出 ExportService
- `src/renderer/App.tsx` 整合 ExportDialog 與匯出回呼
- `specs/002-iiot-protocol-studio/tasks.md` 更新 T100-T109 完成狀態

### Technical Details

- CSV 匯出效能：10,000 筆資料 < 5 秒 (符合 SC-006 規格)
- HTML 報告包含統計摘要：Min, Max, Avg, 品質計數
- 圖表資料降採樣：每序列最多 1,000 點防止效能問題
- 使用 Electron dialog API 確保安全的檔案存取

## [0.4.0] - 2025-01-24

### Added

- **Phase 6: US4 連線組態管理** (T086-T099)
  - **Main Process - Profile 服務**
    - ProfileService 完整實作 (`src/main/services/ProfileService.ts`)
      - JSON 序列化儲存至 `{userData}/profiles/` 目錄
      - Schema 版本驗證 (v1.0.0)
      - 支援 save/load/import/export 操作
      - 整合 ConnectionManager 與 CredentialService
    - 完整 Profile IPC 處理器 (`src/main/ipc/profile.ts`)
      - `profile:save` - 儲存當前設定為組態檔
      - `profile:load` - 載入組態並還原連線與標籤
      - `profile:list` - 列出所有已儲存組態
      - `profile:delete` - 刪除指定組態
      - `profile:import` - 從檔案匯入組態 (含檔案對話框)
      - `profile:export` - 匯出組態至檔案 (含檔案對話框)
    - ConnectionManager 新增 `addTag()` 方法支援組態載入

  - **Renderer - Profile UI**
    - ProfileList 元件 (`src/renderer/components/profile/ProfileList.tsx`)
      - 列出已儲存組態
      - 支援載入/匯出/刪除操作
    - ProfileDialog 元件 (`src/renderer/components/profile/ProfileDialog.tsx`)
      - 儲存新組態對話框
      - 連線選擇器 (全選/取消全選)
    - ImportExportButtons 元件 (`src/renderer/components/profile/ImportExportButtons.tsx`)
      - Save Profile 按鈕
      - Import 按鈕 (含載入狀態)
    - App.tsx 整合 Profile 管理功能至側邊欄

### Changed

- `src/main/services/ConnectionManager.ts` 新增 `addTag()` 方法
- `src/main/ipc/index.ts` 註冊 Profile IPC 處理器
- `src/main/services/index.ts` 匯出 ProfileService
- `src/preload/index.ts` 擴展 profile API 型別定義
- `src/renderer/App.tsx` 整合 Profile 元件與回呼函式
- `specs/002-iiot-protocol-studio/tasks.md` 更新 T086-T099 完成狀態

### Security

- Profile 檔案不儲存敏感憑證，僅記錄需要憑證的連線 ID
- 載入組態時透過 keytar 從 OS 金鑰鏈取得憑證
- 匯出/匯入使用標準檔案對話框，避免任意路徑存取

## [0.3.0] - 2025-01-24

### Added

- **Phase 3: US1 快速連線測試** (T031-T048)
  - **Main Process - 連線管理**
    - ConnectionManager 單例服務 (`src/main/services/ConnectionManager.ts`)
    - 狀態機實作 (disconnected → connecting → connected → error)
    - 完整連線 IPC 處理器 (`src/main/ipc/connection.ts`)
      - `connection:create` - 建立新連線
      - `connection:connect` / `connection:disconnect` - 連線控制
      - `connection:delete` / `connection:list` - 連線管理
      - `connection:read-once` - 單次讀取測試
    - `connection:status-changed` 推送事件

  - **Renderer - 連線 UI**
    - connectionStore Zustand 狀態管理 (`src/renderer/stores/connectionStore.ts`)
    - AppShell 版面配置 (`src/renderer/components/layout/`)
    - ConnectionForm 元件 (Modbus TCP 設定)
    - ConnectionCard 含狀態指示器
    - ConnectionList 連線清單
    - QuickReadPanel 快速讀取面板

- **Phase 4: US2 標籤式持續監控** (T049-T073)
  - **Main Process - 標籤管理**
    - Tag 儲存與驗證規則
    - 完整標籤 IPC 處理器 (`src/main/ipc/tag.ts`)
      - `tag:create` / `tag:update` / `tag:delete` / `tag:list`
      - `tag:import-csv` CSV 匯入支援

  - **Main Process - 輪詢引擎**
    - PollingEngine 服務 (`src/main/services/PollingEngine.ts`)
    - 整合 ProtocolAdapter.read() 與 DataBuffer
    - 完整輪詢 IPC 處理器 (`src/main/ipc/polling.ts`)
      - `polling:start` / `polling:stop` / `polling:status`
    - `polling:data` 推送事件

  - **Renderer - 標籤格線與迷你圖**
    - tagStore Zustand 狀態管理 (`src/renderer/stores/tagStore.ts`)
    - usePolling Hook (`src/renderer/hooks/usePolling.ts`)
    - TagEditor 標籤編輯器元件
    - Sparkline 迷你圖元件 (uPlot 實作，1000 點無掉幀)
    - TagGrid 虛擬化格線 (支援 100+ 標籤 @ 60 FPS)
    - 閾值式列高亮 (warning/alarm 狀態)
    - PollingControls 輪詢控制面板

- **Phase 5: US3 資料 DVR 時光旅行** (T074-T085)
  - **Main Process - DVR IPC**
    - 完整 DVR IPC 處理器 (`src/main/ipc/dvr.ts`)
      - `dvr:get-range` - 取得緩衝區時間範圍
      - `dvr:seek` - 跳轉至指定時間戳
      - `dvr:get-sparkline` - 取得降採樣迷你圖資料 (LTTB 演算法)

  - **Renderer - DVR UI**
    - dvrStore Zustand 狀態管理 (`src/renderer/stores/dvrStore.ts`)
    - useDvr Hook (`src/renderer/hooks/useDvr.ts`)
    - TimelineSlider 時間軸滑桿元件
    - PlaybackControls 播放控制元件 (Live/Historical 切換、前進/後退)
    - ModeIndicator 模式指示器 (LIVE 綠色脈動 / HISTORICAL 琥珀色)
    - TagGrid 整合 DVR 歷史模式顯示

### Changed

- `src/renderer/App.tsx` 整合連線、標籤、DVR 元件
- `src/main/ipc/index.ts` 註冊所有 IPC 處理器
- `src/preload/index.ts` 擴展 contextBridge API
- `specs/002-iiot-protocol-studio/tasks.md` 更新任務完成狀態 (T001-T085)

## [0.2.0] - 2025-01-24

### Added

- **Phase 1: 專案鷹架** (T001-T010)
  - Electron 33 + Vite 5 + React 19 專案初始化
  - TypeScript 設定與路徑別名 (`@main/*`, `@renderer/*`, `@shared/*`)
  - Tailwind CSS 配置含 IIoT 狀態顏色 (connected/connecting/error)
  - Shadcn/ui 元件庫整合準備
  - 完整目錄結構建立
  - Preload 腳本含完整型別安全 contextBridge API
  - electron-log 日誌系統初始化
  - Jest (Main)、Vitest (Renderer)、Playwright (E2E) 測試配置

- **Phase 2: 基礎設施層** (T011-T030)
  - **共用型別系統** (`src/shared/types/`)
    - Connection、Tag、DataPoint、Profile 等核心實體型別
    - IPC 通道常數定義 (`src/shared/constants/ipc-channels.ts`)
    - 型別安全 IPC 包裝器 (`src/renderer/lib/ipc.ts`)

  - **資料層 (SQLite + 憑證儲存)**
    - SQLite 環形緩衝區架構 (`src/main/db/schema.sql`)
    - DataBuffer 服務：ROWID 驅動的資料淘汰、WAL 模式、LTTB 降採樣
    - CredentialService：keytar 整合 OS 原生金鑰鏈

  - **協議適配器介面**
    - ProtocolAdapter 抽象基類與工廠註冊機制
    - ModbusTcpAdapter 完整實作
      - 支援 Modicon 與 IEC 位址格式解析
      - 資料型別轉換 (INT16/UINT16/INT32/UINT32/FLOAT32/BOOLEAN/STRING)
    - ModbusTcpAdapter 單元測試

  - **日誌基礎設施**
    - LogService：檔案輪替、記憶體日誌緩衝、Renderer 日誌捕獲
    - 完整 Log IPC 處理器 (getLogs/add/clear/export/openFolder/setLevel)

- **IIoT Protocol Studio 規格文件** (`specs/002-iiot-protocol-studio/`)
  - `spec.md` - 7 個使用者故事 (P1/P2 優先級)
  - `plan.md` - 15 階段實作計畫
  - `research.md` - 技術選型與效能基準
  - `data-model.md` - 實體關聯與 SQLite 架構
  - `contracts/ipc-channels.md` - 完整 IPC 通道規格
  - `contracts/types.ts` - TypeScript 型別合約
  - `quickstart.md` - 開發與測試快速指南
  - `tasks.md` - 145 項任務分解 (30 項已完成)

### Changed

- `package.json` 更新相依套件版本
  - Vite 6 → 5.4.11 (相容 electron-vite)
  - Electron 33.2.0 → 33.4.11
  - 新增 @electron-toolkit/utils
- `electron.vite.config.ts` 移除內嵌 PostCSS 設定，改用外部 postcss.config.js
- `tsconfig.json` 新增 `jsx: "react-jsx"` 支援 React 19

### Fixed

- 修正 electron-log ESM 匯入路徑 (`electron-log/main.js`)
- 修正 IpcResult<void> 型別定義問題
- 修正 React 19 JSX.Element → React.ReactElement 型別

## [0.1.0] - 2025-01-23

### Added

- **專案治理框架**
  - 建立 `.specify/memory/constitution.md` v2.0.0 專案憲法
  - 定義 7 大原則類別、16+ 子原則
  - 包含 AI 助理行為準則與安全執行規則

- **開發者指南**
  - 新增 `CLAUDE.md` 提供 Claude Code 操作指引
  - 涵蓋開發指令、架構概覽、IPC 模式範例
  - 整合效能目標與技術堆疊說明

- **MVP 規格文件** (`specs/001-mvp-protocol-clients/`)
  - `spec.md` - 7 個使用者故事與驗收條件
  - `plan.md` - 5 階段實作計畫與依賴圖
  - `data-model.md` - 實體定義與狀態轉換
  - `contracts/ipc-channels.md` - IPC 通道合約
  - `contracts/types.md` - TypeScript 型別定義
  - `quickstart.md` - 開發環境設定指南
  - `tasks.md` - 任務分解與執行順序
  - `research.md` - 技術研究與選型依據

- **Speckit 範本系統** (`.specify/templates/`)
  - `spec-template.md` - 功能規格範本
  - `plan-template.md` - 實作計畫範本
  - `tasks-template.md` - 任務清單範本
  - `checklist-template.md` - 檢查清單範本

### Changed

- 更新 `README.md` 加入專案架構圖與開發進度
- Constitution 從範本佔位符升級為完整原則定義

### Fixed

- 無

---

## Version History

| 版本 | 日期 | 說明 |
|------|------|------|
| 0.8.0 | 2025-01-24 | Phase 10 實作：Polish & Cross-Cutting (App lifecycle、自動重連、UI polish、E2E tests) |
| 0.7.0 | 2025-01-24 | Phase 9 實作：US6 多協定支援 (MQTT 適配器、多協定 UI) |
| 0.6.0 | 2025-01-24 | Phase 8 實作：US5 虛擬伺服器 (內建 Modbus TCP 模擬器) |
| 0.5.0 | 2025-01-24 | Phase 7 實作：US7 Session 匯出與報告 (CSV/HTML Report) |
| 0.4.0 | 2025-01-24 | Phase 6 實作：US4 連線組態管理 (Profile save/load/import/export) |
| 0.3.0 | 2025-01-24 | Phase 3-5 實作：US1 連線測試、US2 標籤監控、US3 DVR 時光旅行 |
| 0.2.0 | 2025-01-24 | Phase 1-2 實作：專案鷹架與基礎設施層 |
| 0.1.0 | 2025-01-23 | 初始專案結構與 MVP 規格 |

[Unreleased]: https://github.com/kcchien/connex-studio/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/kcchien/connex-studio/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/kcchien/connex-studio/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kcchien/connex-studio/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/kcchien/connex-studio/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/kcchien/connex-studio/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kcchien/connex-studio/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kcchien/connex-studio/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kcchien/connex-studio/releases/tag/v0.1.0
