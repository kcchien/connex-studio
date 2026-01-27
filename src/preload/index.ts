import { contextBridge, ipcRenderer } from 'electron'
import type { IpcResult } from '@shared/types/common'
import type { Connection, ModbusTcpConfig, MqttConfig, OpcUaConfig, ConnectionMetrics } from '@shared/types/connection'
import type { Tag, ModbusAddress, MqttAddress, OpcUaAddress, DataType } from '@shared/types/tag'
import type { PollingStatus, PollingDataPayload } from '@shared/types/polling'
import type { Profile, ProfileSummary } from '@shared/types/profile'
import type { DvrRange, DvrSnapshot, SparklineData } from '@shared/types/dvr'
import type { ExportResult } from '@shared/types/export'
import type { LogEntry, LogLevel } from '@shared/types/log'
import type {
  Environment,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  ResolutionResult
} from '@shared/types/environment'
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionRunResult,
  CollectionProgress
} from '@shared/types/collection'
import type {
  Bridge,
  CreateBridgeRequest,
  UpdateBridgeRequest,
  BridgeStatus,
  BridgeStats
} from '@shared/types/bridge'
import type {
  Dashboard,
  DashboardWidget,
  WidgetLayout,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  AddWidgetRequest,
  UpdateWidgetRequest,
  UpdateLayoutRequest
} from '@shared/types/dashboard'
import type {
  AlertRule,
  AlertEvent,
  AlertEventPage,
  AlertEventQuery,
  AlertSeverity,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest
} from '@shared/types/alert'
import type {
  OpcUaEndpoint,
  OpcUaNode,
  OpcUaBrowseRequest,
  OpcUaBrowseResult,
  OpcUaBrowseNextRequest,
  OpcUaBrowsePathRequest,
  OpcUaBrowsePathResult,
  OpcUaSearchNodesRequest,
  OpcUaSearchResult,
  OpcUaNodeAttributesRequest,
  OpcUaNodeAttributes,
  OpcUaReadRequest,
  OpcUaReadResult,
  OpcUaWriteRequest,
  OpcUaWriteResult,
  OpcUaSubscription,
  CreateSubscriptionRequest,
  AddMonitoredItemRequest,
  MonitoredItem,
  OpcUaDataChange,
  OpcUaServerInfo,
  OpcUaCertificate,
  ImportCertificateRequest,
  GenerateCertificateRequest,
  CertificateValidationResult,
  // Event types
  OpcUaEvent,
  SubscribeEventsRequest,
  AcknowledgeConditionRequest,
  ConfirmConditionRequest,
  // Method types
  OpcUaCallMethodRequest,
  OpcUaCallMethodResult,
  OpcUaMethodArguments,
  // History types
  HistorizingCheckRequest,
  HistorizingCheckResult,
  HistoryReadRawRequest,
  HistoryReadRawResult,
  HistoryReadProcessedRequest,
  HistoryReadProcessedResult,
  // Discovery types
  DiscoverServersRequest,
  DiscoverServersResult,
  GetEndpointsRequest,
  GetEndpointsResult,
  OpcUaDiscoveredServer
} from '@shared/types/opcua'
import type {
  CrcResult,
  LrcResult,
  FloatDecodeResult,
  FloatEncodeResult,
  ByteSwapResult,
  CalculatorByteOrder,
  ModbusAddressInfo,
  PacketAnalysis
} from '@shared/types/calculator'
import type {
  ExportWorkspaceRequest,
  ImportWorkspaceRequest,
  ImportWorkspaceResult,
  ValidationResult,
  SaveFileResult,
  LoadFileResult
} from '@shared/types/workspace'

// Type-safe API exposed to renderer
export interface ElectronAPI {
  // Connection operations
  connection: {
    create: (params: {
      name: string
      protocol: 'modbus-tcp' | 'mqtt' | 'opcua'
      config: ModbusTcpConfig | MqttConfig | OpcUaConfig
    }) => Promise<IpcResult<{ connection: Connection }>>
    connect: (connectionId: string) => Promise<IpcResult<void>>
    disconnect: (connectionId: string) => Promise<IpcResult<void>>
    delete: (connectionId: string) => Promise<IpcResult<void>>
    update: (params: {
      connectionId: string
      updates: {
        name?: string
        config?: Partial<ModbusTcpConfig> | Partial<MqttConfig> | Partial<OpcUaConfig>
      }
    }) => Promise<IpcResult<{ connection: Connection }>>
    list: () => Promise<{ connections: Connection[] }>
    readOnce: (params: {
      connectionId: string
      address: ModbusAddress | MqttAddress | OpcUaAddress
      dataType?: DataType
    }) => Promise<IpcResult<{ value: number | boolean | string; quality: string }>>
    onStatusChanged: (callback: (payload: {
      connectionId: string
      status: string
      error?: string
    }) => void) => () => void
    getMetrics: (connectionId: string) => Promise<IpcResult<{ metrics?: ConnectionMetrics }>>
    onMetricsChanged: (callback: (payload: {
      connectionId: string
      metrics: ConnectionMetrics
    }) => void) => () => void
    testConnection: (params: {
      protocol: 'modbus-tcp' | 'mqtt' | 'opcua'
      host: string
      port: number
    }) => Promise<{ success: boolean; error?: string }>
  }

  // Tag operations
  tag: {
    create: (params: {
      connectionId: string
      name: string
      address: ModbusAddress | MqttAddress | OpcUaAddress
      dataType: DataType
    }) => Promise<IpcResult<{ tag: Tag }>>
    update: (params: {
      tagId: string
      updates: Partial<Tag>
    }) => Promise<IpcResult<{ tag: Tag }>>
    delete: (tagId: string) => Promise<IpcResult<void>>
    list: (connectionId: string) => Promise<{ tags: Tag[] }>
    importCsv: (params: {
      connectionId: string
      csvContent: string
    }) => Promise<IpcResult<{ imported: number; errors: string[] }>>
  }

  // Polling operations
  polling: {
    start: (params: {
      connectionId: string
      tagIds: string[]
      intervalMs: number
    }) => Promise<IpcResult<void>>
    stop: (connectionId: string) => Promise<IpcResult<void>>
    status: (connectionId: string) => Promise<PollingStatus>
    onData: (callback: (payload: PollingDataPayload) => void) => () => void
  }

  // DVR operations
  dvr: {
    getRange: () => Promise<DvrRange>
    seek: (params: {
      timestamp: number
      tagIds?: string[]
    }) => Promise<DvrSnapshot>
    getSparkline: (params: {
      tagId: string
      startTimestamp: number
      endTimestamp: number
      maxPoints?: number
    }) => Promise<SparklineData>
  }

  // Profile operations
  profile: {
    save: (params: {
      name: string
      connectionIds: string[]
    }) => Promise<IpcResult<{ path: string }>>
    load: (name: string) => Promise<IpcResult<{
      connections: Connection[]
      tags: Tag[]
      credentialsRequired: string[]
    }>>
    list: () => Promise<{ profiles: ProfileSummary[] }>
    delete: (name: string) => Promise<IpcResult<void>>
    import: (filePath?: string) => Promise<IpcResult<{ name: string; cancelled?: boolean }>>
    export: (name: string) => Promise<IpcResult<{ path: string; cancelled?: boolean }>>
  }

  // Export operations
  export: {
    csv: (params: {
      tagIds: string[]
      startTimestamp: number
      endTimestamp: number
    }) => Promise<ExportResult>
    htmlReport: (params: {
      tagIds: string[]
      startTimestamp: number
      endTimestamp: number
      includeCharts: boolean
    }) => Promise<ExportResult>
  }

  // Log operations
  log: {
    getRecent: (params: {
      limit?: number
      level?: LogLevel
    }) => Promise<{ entries: LogEntry[] }>
    openFolder: () => Promise<IpcResult<void>>
  }

  // App lifecycle
  app: {
    checkUnsaved: () => Promise<{
      hasUnsavedChanges: boolean
      pollingActive: boolean
    }>
    forceQuit: () => void
  }

  // Environment operations
  environment: {
    list: () => Promise<IpcResult<{ environments: Environment[] }>>
    get: (id: string) => Promise<IpcResult<{ environment: Environment }>>
    create: (params: CreateEnvironmentRequest) => Promise<IpcResult<{ environment: Environment }>>
    update: (params: UpdateEnvironmentRequest) => Promise<IpcResult<{ environment: Environment }>>
    delete: (id: string) => Promise<IpcResult<void>>
    setDefault: (id: string) => Promise<IpcResult<{ environment: Environment }>>
    getDefault: () => Promise<IpcResult<{ environment: Environment | null }>>
    resolve: (template: string, customVariables?: Record<string, string>) => Promise<IpcResult<{ result: ResolutionResult }>>
  }

  // Collection operations
  collection: {
    list: () => Promise<IpcResult<{ collections: Collection[] }>>
    get: (id: string) => Promise<IpcResult<{ collection: Collection }>>
    create: (params: CreateCollectionRequest) => Promise<IpcResult<{ collection: Collection }>>
    update: (params: UpdateCollectionRequest) => Promise<IpcResult<{ collection: Collection }>>
    delete: (id: string) => Promise<IpcResult<void>>
    run: (id: string) => Promise<IpcResult<{ result: CollectionRunResult }>>
    stop: (runId: string) => Promise<IpcResult<void>>
    onProgress: (callback: (progress: CollectionProgress) => void) => () => void
    onResult: (callback: (result: CollectionRunResult) => void) => () => void
  }

  // Bridge operations
  bridge: {
    list: () => Promise<IpcResult<{ bridges: Bridge[] }>>
    get: (id: string) => Promise<IpcResult<{ bridge: Bridge }>>
    create: (params: CreateBridgeRequest) => Promise<IpcResult<{ bridge: Bridge }>>
    update: (params: UpdateBridgeRequest) => Promise<IpcResult<{ bridge: Bridge }>>
    delete: (id: string) => Promise<IpcResult<void>>
    start: (id: string) => Promise<IpcResult<void>>
    stop: (id: string) => Promise<IpcResult<void>>
    pause: (id: string) => Promise<IpcResult<void>>
    resume: (id: string) => Promise<IpcResult<void>>
    getStats: (id: string) => Promise<IpcResult<{ stats: BridgeStats }>>
    onStatusChanged: (callback: (payload: { bridgeId: string; status: BridgeStatus }) => void) => () => void
    onError: (callback: (payload: { bridgeId: string; error: string }) => void) => () => void
    onStats: (callback: (stats: BridgeStats) => void) => () => void
  }

  // Dashboard operations
  dashboard: {
    list: () => Promise<Dashboard[]>
    get: (id: string) => Promise<Dashboard | null>
    create: (params: CreateDashboardRequest) => Promise<Dashboard>
    update: (params: UpdateDashboardRequest) => Promise<Dashboard>
    delete: (id: string) => Promise<boolean>
    setDefault: (id: string) => Promise<Dashboard>
    getDefault: () => Promise<Dashboard | null>
    addWidget: (params: AddWidgetRequest) => Promise<DashboardWidget>
    updateWidget: (params: UpdateWidgetRequest) => Promise<DashboardWidget>
    removeWidget: (dashboardId: string, widgetId: string) => Promise<boolean>
    updateLayout: (params: UpdateLayoutRequest) => Promise<boolean>
  }

  // Alert operations
  alert: {
    // Rule CRUD
    listRules: () => Promise<AlertRule[]>
    getRule: (id: string) => Promise<AlertRule | null>
    createRule: (params: CreateAlertRuleRequest) => Promise<AlertRule>
    updateRule: (params: UpdateAlertRuleRequest) => Promise<AlertRule>
    deleteRule: (id: string) => Promise<boolean>
    enableRule: (id: string) => Promise<AlertRule>
    disableRule: (id: string) => Promise<AlertRule>
    muteRule: (id: string) => Promise<boolean>
    unmuteRule: (id: string) => Promise<boolean>
    getMutedRules: () => Promise<string[]>

    // Events
    queryEvents: (query: AlertEventQuery) => Promise<AlertEventPage>
    acknowledge: (eventId: number, acknowledgedBy?: string) => Promise<boolean>
    acknowledgeAll: (severity?: AlertSeverity) => Promise<number>
    getUnacknowledgedCounts: () => Promise<Record<AlertSeverity, number>>
    clearHistory: (before?: number) => Promise<number>

    // Sound
    testSound: (severity: AlertSeverity) => Promise<void>
    setSoundEnabled: (enabled: boolean) => Promise<void>
    getSoundEnabled: () => Promise<boolean>

    // Real-time events
    onEventTriggered: (callback: (event: AlertEvent) => void) => () => void
    onEventAcknowledged: (callback: (eventId: number) => void) => () => void
  }

  // OPC UA operations
  opcua: {
    // Discovery
    getEndpoints: (endpointUrl: string) => Promise<OpcUaEndpoint[]>
    testConnection: (params: {
      endpointUrl: string
      securityMode: string
      securityPolicy: string
    }) => Promise<{ success: boolean; message: string; serverInfo?: OpcUaServerInfo }>

    // Session
    getSessionStatus: (connectionId: string) => Promise<{
      connected: boolean
      sessionId?: string
      timeout?: number
      serverInfo?: OpcUaServerInfo
    }>

    // Browse
    browse: (request: OpcUaBrowseRequest) => Promise<OpcUaBrowseResult>
    browseNext: (request: OpcUaBrowseNextRequest) => Promise<OpcUaBrowseResult>
    browsePath: (request: OpcUaBrowsePathRequest) => Promise<OpcUaBrowsePathResult>
    searchNodes: (request: OpcUaSearchNodesRequest) => Promise<OpcUaSearchResult>
    readNodeAttributes: (request: OpcUaNodeAttributesRequest) => Promise<OpcUaNodeAttributes>

    // Read/Write
    read: (request: OpcUaReadRequest) => Promise<OpcUaReadResult>
    write: (request: OpcUaWriteRequest) => Promise<OpcUaWriteResult>

    // Subscriptions
    createSubscription: (request: CreateSubscriptionRequest) => Promise<OpcUaSubscription>
    deleteSubscription: (params: {
      connectionId: string
      subscriptionId: string
    }) => Promise<boolean>
    addMonitoredItem: (request: AddMonitoredItemRequest) => Promise<MonitoredItem>
    removeMonitoredItem: (params: {
      connectionId: string
      subscriptionId: string
      itemId: string
    }) => Promise<boolean>

    // Real-time events
    onDataChange: (callback: (change: OpcUaDataChange) => void) => () => void

    // Certificate Management
    listCertificates: () => Promise<OpcUaCertificate[]>
    importCertificate: (request: ImportCertificateRequest) => Promise<OpcUaCertificate>
    exportCertificate: (params: { id: string; exportPath: string }) => Promise<boolean>
    deleteCertificate: (id: string) => Promise<boolean>
    generateCertificate: (request: GenerateCertificateRequest) => Promise<OpcUaCertificate>
    trustCertificate: (id: string) => Promise<OpcUaCertificate>
    rejectCertificate: (id: string) => Promise<boolean>
    getServerCertificate: (endpointUrl: string) => Promise<OpcUaCertificate | null>

    // Events (Alarms & Conditions)
    subscribeEvents: (request: SubscribeEventsRequest) => Promise<{ subscriptionId: string }>
    unsubscribeEvents: (params: {
      connectionId: string
      subscriptionId: string
    }) => Promise<boolean>
    acknowledgeCondition: (request: AcknowledgeConditionRequest) => Promise<boolean>
    confirmCondition: (request: ConfirmConditionRequest) => Promise<boolean>
    onEvent: (callback: (event: OpcUaEvent) => void) => () => void

    // Methods
    getMethodArgs: (params: {
      connectionId: string
      objectId: string
      methodId: string
    }) => Promise<OpcUaMethodArguments>
    callMethod: (request: OpcUaCallMethodRequest) => Promise<OpcUaCallMethodResult>

    // Historical Access
    checkHistorizing: (request: HistorizingCheckRequest) => Promise<HistorizingCheckResult>
    readHistoryRaw: (request: HistoryReadRawRequest) => Promise<HistoryReadRawResult>
    readHistoryProcessed: (request: HistoryReadProcessedRequest) => Promise<HistoryReadProcessedResult>
    releaseContinuationPoints: (params: {
      connectionId: string
      continuationPoints: string[]
    }) => Promise<void>

    // Discovery (T159-T162)
    discoverServers: (request?: DiscoverServersRequest) => Promise<DiscoverServersResult>
    getServerEndpoints: (request: GetEndpointsRequest) => Promise<GetEndpointsResult>
  }

  // Calculator operations
  calculator: {
    crc16Modbus: (data: number[] | string) => Promise<CrcResult>
    lrc: (data: number[] | string) => Promise<LrcResult>
    decodeFloat32: (params: { data: number[] | string; byteOrder?: CalculatorByteOrder }) => Promise<FloatDecodeResult>
    encodeFloat32: (params: { value: number; byteOrder?: CalculatorByteOrder }) => Promise<FloatEncodeResult>
    decodeFloat64: (params: { data: number[] | string; byteOrder?: CalculatorByteOrder }) => Promise<FloatDecodeResult>
    swapBytes: (data: number[] | string) => Promise<ByteSwapResult>
    swapWords: (data: number[] | string) => Promise<ByteSwapResult>
    convertByteOrder: (params: { data: number[] | string; from: CalculatorByteOrder; to: CalculatorByteOrder }) => Promise<ByteSwapResult>
    parseModbusAddress: (params: { address: string; registerType?: string }) => Promise<ModbusAddressInfo>
    analyzePacket: (data: number[] | string) => Promise<PacketAnalysis>
    hexToBytes: (hex: string) => Promise<number[]>
    bytesToHex: (params: { bytes: number[]; separator?: string }) => Promise<string>
  }

  // Workspace operations
  workspace: {
    export: (params: ExportWorkspaceRequest) => Promise<{ success: true; yaml: string } | { success: false; error: string }>
    import: (params: ImportWorkspaceRequest) => Promise<ImportWorkspaceResult>
    validate: (yamlContent: string) => Promise<ValidationResult>
    saveFile: (params: { yaml: string; defaultPath?: string }) => Promise<SaveFileResult>
    loadFile: (path?: string) => Promise<LoadFileResult>
  }
}

// Implement the API
const electronAPI: ElectronAPI = {
  connection: {
    create: (params) => ipcRenderer.invoke('connection:create', params),
    connect: (connectionId) => ipcRenderer.invoke('connection:connect', { connectionId }),
    disconnect: (connectionId) => ipcRenderer.invoke('connection:disconnect', { connectionId }),
    delete: (connectionId) => ipcRenderer.invoke('connection:delete', { connectionId }),
    update: (params) => ipcRenderer.invoke('connection:update', params),
    list: () => ipcRenderer.invoke('connection:list'),
    readOnce: (params) => ipcRenderer.invoke('connection:read-once', params),
    onStatusChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on('connection:status-changed', handler)
      return () => ipcRenderer.removeListener('connection:status-changed', handler)
    },
    getMetrics: (connectionId) => ipcRenderer.invoke('connection:metrics', { connectionId }),
    onMetricsChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: { connectionId: string; metrics: ConnectionMetrics }) => callback(payload)
      ipcRenderer.on('connection:metrics-changed', handler)
      return () => ipcRenderer.removeListener('connection:metrics-changed', handler)
    },
    testConnection: (params) => ipcRenderer.invoke('connection:test', params)
  },

  tag: {
    create: (params) => ipcRenderer.invoke('tag:create', params),
    update: (params) => ipcRenderer.invoke('tag:update', params),
    delete: (tagId) => ipcRenderer.invoke('tag:delete', { tagId }),
    list: (connectionId) => ipcRenderer.invoke('tag:list', { connectionId }),
    importCsv: (params) => ipcRenderer.invoke('tag:import-csv', params)
  },

  polling: {
    start: (params) => ipcRenderer.invoke('polling:start', params),
    stop: (connectionId) => ipcRenderer.invoke('polling:stop', { connectionId }),
    status: (connectionId) => ipcRenderer.invoke('polling:status', { connectionId }),
    onData: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on('polling:data', handler)
      return () => ipcRenderer.removeListener('polling:data', handler)
    }
  },

  dvr: {
    getRange: () => ipcRenderer.invoke('dvr:get-range'),
    seek: (params) => ipcRenderer.invoke('dvr:seek', params),
    getSparkline: (params) => ipcRenderer.invoke('dvr:get-sparkline', params)
  },

  profile: {
    save: (params) => ipcRenderer.invoke('profile:save', params),
    load: (name) => ipcRenderer.invoke('profile:load', { name }),
    list: () => ipcRenderer.invoke('profile:list'),
    delete: (name) => ipcRenderer.invoke('profile:delete', { name }),
    import: (filePath) => ipcRenderer.invoke('profile:import', filePath ? { filePath } : {}),
    export: (name) => ipcRenderer.invoke('profile:export', { name })
  },

  export: {
    csv: (params) => ipcRenderer.invoke('export:csv', params),
    htmlReport: (params) => ipcRenderer.invoke('export:html-report', params)
  },

  log: {
    getRecent: (params) => ipcRenderer.invoke('log:get-recent', params),
    openFolder: () => ipcRenderer.invoke('log:open-folder')
  },

  app: {
    checkUnsaved: () => ipcRenderer.invoke('app:check-unsaved'),
    forceQuit: () => ipcRenderer.send('app:force-quit')
  },

  environment: {
    list: () => ipcRenderer.invoke('environment:list'),
    get: (id) => ipcRenderer.invoke('environment:get', { id }),
    create: (params) => ipcRenderer.invoke('environment:create', params),
    update: (params) => ipcRenderer.invoke('environment:update', params),
    delete: (id) => ipcRenderer.invoke('environment:delete', { id }),
    setDefault: (id) => ipcRenderer.invoke('environment:set-default', { id }),
    getDefault: () => ipcRenderer.invoke('environment:get-default'),
    resolve: (template, customVariables) =>
      ipcRenderer.invoke('environment:resolve', { template, customVariables })
  },

  collection: {
    list: () => ipcRenderer.invoke('collection:list'),
    get: (id) => ipcRenderer.invoke('collection:get', { id }),
    create: (params) => ipcRenderer.invoke('collection:create', params),
    update: (params) => ipcRenderer.invoke('collection:update', params),
    delete: (id) => ipcRenderer.invoke('collection:delete', { id }),
    run: (id) => ipcRenderer.invoke('collection:run', { id }),
    stop: (runId) => ipcRenderer.invoke('collection:stop', { runId }),
    onProgress: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: CollectionProgress) =>
        callback(payload)
      ipcRenderer.on('collection:progress', handler)
      return () => ipcRenderer.removeListener('collection:progress', handler)
    },
    onResult: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: CollectionRunResult) =>
        callback(payload)
      ipcRenderer.on('collection:result', handler)
      return () => ipcRenderer.removeListener('collection:result', handler)
    }
  },

  bridge: {
    list: () => ipcRenderer.invoke('bridge:list'),
    get: (id) => ipcRenderer.invoke('bridge:get', { id }),
    create: (params) => ipcRenderer.invoke('bridge:create', params),
    update: (params) => ipcRenderer.invoke('bridge:update', params),
    delete: (id) => ipcRenderer.invoke('bridge:delete', { id }),
    start: (id) => ipcRenderer.invoke('bridge:start', { id }),
    stop: (id) => ipcRenderer.invoke('bridge:stop', { id }),
    pause: (id) => ipcRenderer.invoke('bridge:pause', { id }),
    resume: (id) => ipcRenderer.invoke('bridge:resume', { id }),
    getStats: (id) => ipcRenderer.invoke('bridge:get-stats', { id }),
    onStatusChanged: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: { bridgeId: string; status: BridgeStatus }
      ) => callback(payload)
      ipcRenderer.on('bridge:status-changed', handler)
      return () => ipcRenderer.removeListener('bridge:status-changed', handler)
    },
    onError: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        payload: { bridgeId: string; error: string }
      ) => callback(payload)
      ipcRenderer.on('bridge:error', handler)
      return () => ipcRenderer.removeListener('bridge:error', handler)
    },
    onStats: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, stats: BridgeStats) => callback(stats)
      ipcRenderer.on('bridge:stats', handler)
      return () => ipcRenderer.removeListener('bridge:stats', handler)
    }
  },

  dashboard: {
    list: () => ipcRenderer.invoke('dashboard:list'),
    get: (id) => ipcRenderer.invoke('dashboard:get', id),
    create: (params) => ipcRenderer.invoke('dashboard:create', params),
    update: (params) => ipcRenderer.invoke('dashboard:update', params),
    delete: (id) => ipcRenderer.invoke('dashboard:delete', id),
    setDefault: (id) => ipcRenderer.invoke('dashboard:set-default', id),
    getDefault: () => ipcRenderer.invoke('dashboard:get-default'),
    addWidget: (params) => ipcRenderer.invoke('dashboard:add-widget', params),
    updateWidget: (params) => ipcRenderer.invoke('dashboard:update-widget', params),
    removeWidget: (dashboardId, widgetId) =>
      ipcRenderer.invoke('dashboard:remove-widget', { dashboardId, widgetId }),
    updateLayout: (params) => ipcRenderer.invoke('dashboard:update-layout', params)
  },

  alert: {
    // Rule CRUD
    listRules: () => ipcRenderer.invoke('alert:list-rules'),
    getRule: (id) => ipcRenderer.invoke('alert:get-rule', id),
    createRule: (params) => ipcRenderer.invoke('alert:create-rule', params),
    updateRule: (params) => ipcRenderer.invoke('alert:update-rule', params),
    deleteRule: (id) => ipcRenderer.invoke('alert:delete-rule', id),
    enableRule: (id) => ipcRenderer.invoke('alert:enable-rule', id),
    disableRule: (id) => ipcRenderer.invoke('alert:disable-rule', id),
    muteRule: (id) => ipcRenderer.invoke('alert:mute-rule', id),
    unmuteRule: (id) => ipcRenderer.invoke('alert:unmute-rule', id),
    getMutedRules: () => ipcRenderer.invoke('alert:get-muted-rules'),

    // Events
    queryEvents: (query) => ipcRenderer.invoke('alert:query-events', query),
    acknowledge: (eventId, acknowledgedBy) =>
      ipcRenderer.invoke('alert:acknowledge', { eventId, acknowledgedBy }),
    acknowledgeAll: (severity) => ipcRenderer.invoke('alert:acknowledge-all', severity),
    getUnacknowledgedCounts: () => ipcRenderer.invoke('alert:get-unacknowledged-counts'),
    clearHistory: (before) => ipcRenderer.invoke('alert:clear-history', before),

    // Sound
    testSound: (severity) => ipcRenderer.invoke('alert:test-sound', severity),
    setSoundEnabled: (enabled) => ipcRenderer.invoke('alert:set-sound-enabled', enabled),
    getSoundEnabled: () => ipcRenderer.invoke('alert:get-sound-enabled'),

    // Real-time events
    onEventTriggered: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, alertEvent: AlertEvent) =>
        callback(alertEvent)
      ipcRenderer.on('alert:event-triggered', handler)
      return () => ipcRenderer.removeListener('alert:event-triggered', handler)
    },
    onEventAcknowledged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, eventId: number) =>
        callback(eventId)
      ipcRenderer.on('alert:event-acknowledged', handler)
      return () => ipcRenderer.removeListener('alert:event-acknowledged', handler)
    }
  },

  opcua: {
    // Discovery
    getEndpoints: (endpointUrl) => ipcRenderer.invoke('opcua:get-endpoints', endpointUrl),
    testConnection: (params) => ipcRenderer.invoke('opcua:test-connection', params),

    // Session
    getSessionStatus: (connectionId) => ipcRenderer.invoke('opcua:session-status', connectionId),

    // Browse
    browse: (request) => ipcRenderer.invoke('opcua:browse', request),
    browseNext: (request) => ipcRenderer.invoke('opcua:browse-next', request),
    browsePath: (request) => ipcRenderer.invoke('opcua:browse-path', request),
    searchNodes: (request) => ipcRenderer.invoke('opcua:search-nodes', request),
    readNodeAttributes: (request) => ipcRenderer.invoke('opcua:read-node-attributes', request),

    // Read/Write
    read: (request) => ipcRenderer.invoke('opcua:read', request),
    write: (request) => ipcRenderer.invoke('opcua:write', request),

    // Subscriptions
    createSubscription: (request) => ipcRenderer.invoke('opcua:create-subscription', request),
    deleteSubscription: (params) => ipcRenderer.invoke('opcua:delete-subscription', params),
    addMonitoredItem: (request) => ipcRenderer.invoke('opcua:add-monitored-item', request),
    removeMonitoredItem: (params) => ipcRenderer.invoke('opcua:remove-monitored-item', params),

    // Real-time events
    onDataChange: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, change: OpcUaDataChange) =>
        callback(change)
      ipcRenderer.on('opcua:data-change', handler)
      return () => ipcRenderer.removeListener('opcua:data-change', handler)
    },

    // Certificate Management
    listCertificates: () => ipcRenderer.invoke('opcua:list-certificates'),
    importCertificate: (request) => ipcRenderer.invoke('opcua:import-certificate', request),
    exportCertificate: (params) => ipcRenderer.invoke('opcua:export-certificate', params),
    deleteCertificate: (id) => ipcRenderer.invoke('opcua:delete-certificate', id),
    generateCertificate: (request) => ipcRenderer.invoke('opcua:generate-certificate', request),
    trustCertificate: (id) => ipcRenderer.invoke('opcua:trust-certificate', id),
    rejectCertificate: (id) => ipcRenderer.invoke('opcua:reject-certificate', id),
    getServerCertificate: (endpointUrl) =>
      ipcRenderer.invoke('opcua:get-server-certificate', endpointUrl),

    // Events (Alarms & Conditions)
    subscribeEvents: (request) => ipcRenderer.invoke('opcua:subscribe-events', request),
    unsubscribeEvents: (params) => ipcRenderer.invoke('opcua:unsubscribe-events', params),
    acknowledgeCondition: (request) => ipcRenderer.invoke('opcua:acknowledge-condition', request),
    confirmCondition: (request) => ipcRenderer.invoke('opcua:confirm-condition', request),
    onEvent: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, opcuaEvent: OpcUaEvent) =>
        callback(opcuaEvent)
      ipcRenderer.on('opcua:event', handler)
      return () => ipcRenderer.removeListener('opcua:event', handler)
    },

    // Methods
    getMethodArgs: (params) => ipcRenderer.invoke('opcua:get-method-args', params),
    callMethod: (request) => ipcRenderer.invoke('opcua:call-method', request),

    // Historical Access
    checkHistorizing: (request) => ipcRenderer.invoke('opcua:check-historizing', request),
    readHistoryRaw: (request) => ipcRenderer.invoke('opcua:read-history-raw', request),
    readHistoryProcessed: (request) => ipcRenderer.invoke('opcua:read-history-processed', request),
    releaseContinuationPoints: (params) =>
      ipcRenderer.invoke('opcua:release-continuation-points', params),

    // Discovery (T159-T162)
    discoverServers: (request) => ipcRenderer.invoke('opcua:discover-servers', request ?? {}),
    getServerEndpoints: (request) => ipcRenderer.invoke('opcua:find-servers', request)
  },

  calculator: {
    crc16Modbus: (data) => ipcRenderer.invoke('calculator:crc16-modbus', data),
    lrc: (data) => ipcRenderer.invoke('calculator:lrc', data),
    decodeFloat32: (params) => ipcRenderer.invoke('calculator:decode-float32', params),
    encodeFloat32: (params) => ipcRenderer.invoke('calculator:encode-float32', params),
    decodeFloat64: (params) => ipcRenderer.invoke('calculator:decode-float64', params),
    swapBytes: (data) => ipcRenderer.invoke('calculator:swap-bytes', data),
    swapWords: (data) => ipcRenderer.invoke('calculator:swap-words', data),
    convertByteOrder: (params) => ipcRenderer.invoke('calculator:convert-byte-order', params),
    parseModbusAddress: (params) => ipcRenderer.invoke('calculator:parse-modbus-address', params),
    analyzePacket: (data) => ipcRenderer.invoke('calculator:analyze-packet', data),
    hexToBytes: (hex) => ipcRenderer.invoke('calculator:hex-to-bytes', hex),
    bytesToHex: (params) => ipcRenderer.invoke('calculator:bytes-to-hex', params)
  },

  workspace: {
    export: (params) => ipcRenderer.invoke('workspace:export', params),
    import: (params) => ipcRenderer.invoke('workspace:import', params),
    validate: (yamlContent) => ipcRenderer.invoke('workspace:validate', yamlContent),
    saveFile: (params) => ipcRenderer.invoke('workspace:save-file', params),
    loadFile: (path) => ipcRenderer.invoke('workspace:load-file', path ? { path } : undefined)
  }
}

// Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// TypeScript declaration for window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
