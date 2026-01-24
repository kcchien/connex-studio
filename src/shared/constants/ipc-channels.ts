/**
 * IPC Channel constants for type-safe IPC communication.
 * Channel naming convention: {domain}:{action}
 */

// Connection channels
export const CONNECTION_CREATE = 'connection:create'
export const CONNECTION_CONNECT = 'connection:connect'
export const CONNECTION_DISCONNECT = 'connection:disconnect'
export const CONNECTION_DELETE = 'connection:delete'
export const CONNECTION_LIST = 'connection:list'
export const CONNECTION_READ_ONCE = 'connection:read-once'
export const CONNECTION_STATUS_CHANGED = 'connection:status-changed'

// Tag channels
export const TAG_CREATE = 'tag:create'
export const TAG_UPDATE = 'tag:update'
export const TAG_DELETE = 'tag:delete'
export const TAG_LIST = 'tag:list'
export const TAG_IMPORT_CSV = 'tag:import-csv'

// Polling channels
export const POLLING_START = 'polling:start'
export const POLLING_STOP = 'polling:stop'
export const POLLING_STATUS = 'polling:status'
export const POLLING_DATA = 'polling:data'

// DVR channels
export const DVR_GET_RANGE = 'dvr:get-range'
export const DVR_SEEK = 'dvr:seek'
export const DVR_GET_SPARKLINE = 'dvr:get-sparkline'

// Profile channels
export const PROFILE_SAVE = 'profile:save'
export const PROFILE_LOAD = 'profile:load'
export const PROFILE_LIST = 'profile:list'
export const PROFILE_DELETE = 'profile:delete'
export const PROFILE_IMPORT = 'profile:import'
export const PROFILE_EXPORT = 'profile:export'

// Export channels
export const EXPORT_CSV = 'export:csv'
export const EXPORT_HTML_REPORT = 'export:html-report'

// Virtual Server channels
export const VIRTUAL_SERVER_START = 'virtual-server:start'
export const VIRTUAL_SERVER_STOP = 'virtual-server:stop'
export const VIRTUAL_SERVER_STATUS = 'virtual-server:status'

// Log channels
export const LOG_GET_LOGS = 'log:get-logs'
export const LOG_ADD = 'log:add'
export const LOG_CLEAR = 'log:clear'
export const LOG_EXPORT = 'log:export'
export const LOG_OPEN_FOLDER = 'log:open-folder'
export const LOG_GET_CONFIG = 'log:get-config'
export const LOG_SET_LEVEL = 'log:set-level'

// App lifecycle channels
export const APP_CHECK_UNSAVED = 'app:check-unsaved'
export const APP_FORCE_QUIT = 'app:force-quit'

// =============================================================================
// Phase 2: Professional Features Channels
// =============================================================================

// Environment channels
export const ENVIRONMENT_LIST = 'environment:list'
export const ENVIRONMENT_GET = 'environment:get'
export const ENVIRONMENT_CREATE = 'environment:create'
export const ENVIRONMENT_UPDATE = 'environment:update'
export const ENVIRONMENT_DELETE = 'environment:delete'
export const ENVIRONMENT_SET_DEFAULT = 'environment:set-default'
export const ENVIRONMENT_GET_DEFAULT = 'environment:get-default'
export const ENVIRONMENT_RESOLVE = 'environment:resolve'

// Collection channels
export const COLLECTION_LIST = 'collection:list'
export const COLLECTION_GET = 'collection:get'
export const COLLECTION_CREATE = 'collection:create'
export const COLLECTION_UPDATE = 'collection:update'
export const COLLECTION_DELETE = 'collection:delete'
export const COLLECTION_RUN = 'collection:run'
export const COLLECTION_STOP = 'collection:stop'
export const COLLECTION_PROGRESS = 'collection:progress'
export const COLLECTION_RESULT = 'collection:result'

// Bridge channels
export const BRIDGE_LIST = 'bridge:list'
export const BRIDGE_GET = 'bridge:get'
export const BRIDGE_CREATE = 'bridge:create'
export const BRIDGE_UPDATE = 'bridge:update'
export const BRIDGE_DELETE = 'bridge:delete'
export const BRIDGE_START = 'bridge:start'
export const BRIDGE_STOP = 'bridge:stop'
export const BRIDGE_PAUSE = 'bridge:pause'
export const BRIDGE_RESUME = 'bridge:resume'
export const BRIDGE_GET_STATS = 'bridge:get-stats'
export const BRIDGE_STATUS_CHANGED = 'bridge:status-changed'
export const BRIDGE_ERROR = 'bridge:error'
export const BRIDGE_STATS = 'bridge:stats'

// Dashboard channels
export const DASHBOARD_LIST = 'dashboard:list'
export const DASHBOARD_GET = 'dashboard:get'
export const DASHBOARD_CREATE = 'dashboard:create'
export const DASHBOARD_UPDATE = 'dashboard:update'
export const DASHBOARD_DELETE = 'dashboard:delete'
export const DASHBOARD_SET_DEFAULT = 'dashboard:set-default'
export const DASHBOARD_ADD_WIDGET = 'dashboard:add-widget'
export const DASHBOARD_UPDATE_WIDGET = 'dashboard:update-widget'
export const DASHBOARD_REMOVE_WIDGET = 'dashboard:remove-widget'
export const DASHBOARD_UPDATE_LAYOUT = 'dashboard:update-layout'

// Alert channels
export const ALERT_LIST_RULES = 'alert:list-rules'
export const ALERT_GET_RULE = 'alert:get-rule'
export const ALERT_CREATE_RULE = 'alert:create-rule'
export const ALERT_UPDATE_RULE = 'alert:update-rule'
export const ALERT_DELETE_RULE = 'alert:delete-rule'
export const ALERT_ENABLE_RULE = 'alert:enable-rule'
export const ALERT_DISABLE_RULE = 'alert:disable-rule'
export const ALERT_LIST_EVENTS = 'alert:list-events'
export const ALERT_ACKNOWLEDGE = 'alert:acknowledge'
export const ALERT_ACKNOWLEDGE_ALL = 'alert:acknowledge-all'
export const ALERT_CLEAR_HISTORY = 'alert:clear-history'
export const ALERT_TRIGGERED = 'alert:triggered'
export const ALERT_ACKNOWLEDGED = 'alert:acknowledged'

// Calculator channels
export const CALCULATOR_CRC16_MODBUS = 'calculator:crc16-modbus'
export const CALCULATOR_LRC = 'calculator:lrc'
export const CALCULATOR_DECODE_FLOAT32 = 'calculator:decode-float32'
export const CALCULATOR_ENCODE_FLOAT32 = 'calculator:encode-float32'
export const CALCULATOR_SWAP_BYTES = 'calculator:swap-bytes'

// Workspace channels
export const WORKSPACE_EXPORT = 'workspace:export'
export const WORKSPACE_IMPORT = 'workspace:import'
export const WORKSPACE_VALIDATE = 'workspace:validate'
export const WORKSPACE_SAVE_FILE = 'workspace:save-file'
export const WORKSPACE_LOAD_FILE = 'workspace:load-file'

// =============================================================================
// Phase 2: OPC UA Full Client Channels
// =============================================================================

// OPC UA Connection channels
export const OPCUA_CONNECT = 'opcua:connect'
export const OPCUA_DISCONNECT = 'opcua:disconnect'
export const OPCUA_GET_ENDPOINTS = 'opcua:get-endpoints'
export const OPCUA_TEST_CONNECTION = 'opcua:test-connection'
export const OPCUA_SESSION_STATUS = 'opcua:session-status'
export const OPCUA_SESSION_ERROR = 'opcua:session-error'

// OPC UA Browse channels
export const OPCUA_BROWSE = 'opcua:browse'
export const OPCUA_BROWSE_PATH = 'opcua:browse-path'
export const OPCUA_GET_NODE = 'opcua:get-node'

// OPC UA Read/Write channels
export const OPCUA_READ = 'opcua:read'
export const OPCUA_WRITE = 'opcua:write'
export const OPCUA_READ_ATTRIBUTES = 'opcua:read-attributes'

// OPC UA Subscription channels
export const OPCUA_CREATE_SUBSCRIPTION = 'opcua:create-subscription'
export const OPCUA_DELETE_SUBSCRIPTION = 'opcua:delete-subscription'
export const OPCUA_ADD_MONITORED_ITEM = 'opcua:add-monitored-item'
export const OPCUA_REMOVE_MONITORED_ITEM = 'opcua:remove-monitored-item'
export const OPCUA_MODIFY_MONITORED_ITEM = 'opcua:modify-monitored-item'
export const OPCUA_DATA_CHANGE = 'opcua:data-change'
export const OPCUA_SUBSCRIPTION_STATUS = 'opcua:subscription-status'

// OPC UA Event channels
export const OPCUA_SUBSCRIBE_EVENTS = 'opcua:subscribe-events'
export const OPCUA_UNSUBSCRIBE_EVENTS = 'opcua:unsubscribe-events'
export const OPCUA_ACKNOWLEDGE_CONDITION = 'opcua:acknowledge-condition'
export const OPCUA_CONFIRM_CONDITION = 'opcua:confirm-condition'
export const OPCUA_EVENT = 'opcua:event'

// OPC UA Method channels
export const OPCUA_CALL_METHOD = 'opcua:call-method'
export const OPCUA_GET_METHOD_ARGS = 'opcua:get-method-args'

// OPC UA History channels
export const OPCUA_READ_HISTORY = 'opcua:read-history'
export const OPCUA_READ_HISTORY_EVENTS = 'opcua:read-history-events'

// OPC UA Certificate channels
export const OPCUA_LIST_CERTIFICATES = 'opcua:list-certificates'
export const OPCUA_IMPORT_CERTIFICATE = 'opcua:import-certificate'
export const OPCUA_EXPORT_CERTIFICATE = 'opcua:export-certificate'
export const OPCUA_DELETE_CERTIFICATE = 'opcua:delete-certificate'
export const OPCUA_GENERATE_CERTIFICATE = 'opcua:generate-certificate'
export const OPCUA_TRUST_CERTIFICATE = 'opcua:trust-certificate'
export const OPCUA_REJECT_CERTIFICATE = 'opcua:reject-certificate'
export const OPCUA_GET_SERVER_CERTIFICATE = 'opcua:get-server-certificate'

// OPC UA Discovery channels
export const OPCUA_DISCOVER_SERVERS = 'opcua:discover-servers'
export const OPCUA_FIND_SERVERS = 'opcua:find-servers'

// All channels grouped by domain
export const IPC_CHANNELS = {
  connection: {
    create: CONNECTION_CREATE,
    connect: CONNECTION_CONNECT,
    disconnect: CONNECTION_DISCONNECT,
    delete: CONNECTION_DELETE,
    list: CONNECTION_LIST,
    readOnce: CONNECTION_READ_ONCE,
    statusChanged: CONNECTION_STATUS_CHANGED
  },
  tag: {
    create: TAG_CREATE,
    update: TAG_UPDATE,
    delete: TAG_DELETE,
    list: TAG_LIST,
    importCsv: TAG_IMPORT_CSV
  },
  polling: {
    start: POLLING_START,
    stop: POLLING_STOP,
    status: POLLING_STATUS,
    data: POLLING_DATA
  },
  dvr: {
    getRange: DVR_GET_RANGE,
    seek: DVR_SEEK,
    getSparkline: DVR_GET_SPARKLINE
  },
  profile: {
    save: PROFILE_SAVE,
    load: PROFILE_LOAD,
    list: PROFILE_LIST,
    delete: PROFILE_DELETE,
    import: PROFILE_IMPORT,
    export: PROFILE_EXPORT
  },
  export: {
    csv: EXPORT_CSV,
    htmlReport: EXPORT_HTML_REPORT
  },
  virtualServer: {
    start: VIRTUAL_SERVER_START,
    stop: VIRTUAL_SERVER_STOP,
    status: VIRTUAL_SERVER_STATUS
  },
  log: {
    getLogs: LOG_GET_LOGS,
    add: LOG_ADD,
    clear: LOG_CLEAR,
    export: LOG_EXPORT,
    openFolder: LOG_OPEN_FOLDER,
    getConfig: LOG_GET_CONFIG,
    setLevel: LOG_SET_LEVEL
  },
  app: {
    checkUnsaved: APP_CHECK_UNSAVED,
    forceQuit: APP_FORCE_QUIT
  },

  // Phase 2: Professional Features
  environment: {
    list: ENVIRONMENT_LIST,
    get: ENVIRONMENT_GET,
    create: ENVIRONMENT_CREATE,
    update: ENVIRONMENT_UPDATE,
    delete: ENVIRONMENT_DELETE,
    setDefault: ENVIRONMENT_SET_DEFAULT,
    getDefault: ENVIRONMENT_GET_DEFAULT,
    resolve: ENVIRONMENT_RESOLVE
  },
  collection: {
    list: COLLECTION_LIST,
    get: COLLECTION_GET,
    create: COLLECTION_CREATE,
    update: COLLECTION_UPDATE,
    delete: COLLECTION_DELETE,
    run: COLLECTION_RUN,
    stop: COLLECTION_STOP,
    progress: COLLECTION_PROGRESS,
    result: COLLECTION_RESULT
  },
  bridge: {
    list: BRIDGE_LIST,
    get: BRIDGE_GET,
    create: BRIDGE_CREATE,
    update: BRIDGE_UPDATE,
    delete: BRIDGE_DELETE,
    start: BRIDGE_START,
    stop: BRIDGE_STOP,
    pause: BRIDGE_PAUSE,
    resume: BRIDGE_RESUME,
    getStats: BRIDGE_GET_STATS,
    statusChanged: BRIDGE_STATUS_CHANGED,
    error: BRIDGE_ERROR,
    stats: BRIDGE_STATS
  },
  dashboard: {
    list: DASHBOARD_LIST,
    get: DASHBOARD_GET,
    create: DASHBOARD_CREATE,
    update: DASHBOARD_UPDATE,
    delete: DASHBOARD_DELETE,
    setDefault: DASHBOARD_SET_DEFAULT,
    addWidget: DASHBOARD_ADD_WIDGET,
    updateWidget: DASHBOARD_UPDATE_WIDGET,
    removeWidget: DASHBOARD_REMOVE_WIDGET,
    updateLayout: DASHBOARD_UPDATE_LAYOUT
  },
  alert: {
    listRules: ALERT_LIST_RULES,
    getRule: ALERT_GET_RULE,
    createRule: ALERT_CREATE_RULE,
    updateRule: ALERT_UPDATE_RULE,
    deleteRule: ALERT_DELETE_RULE,
    enableRule: ALERT_ENABLE_RULE,
    disableRule: ALERT_DISABLE_RULE,
    listEvents: ALERT_LIST_EVENTS,
    acknowledge: ALERT_ACKNOWLEDGE,
    acknowledgeAll: ALERT_ACKNOWLEDGE_ALL,
    clearHistory: ALERT_CLEAR_HISTORY,
    triggered: ALERT_TRIGGERED,
    acknowledged: ALERT_ACKNOWLEDGED
  },
  calculator: {
    crc16Modbus: CALCULATOR_CRC16_MODBUS,
    lrc: CALCULATOR_LRC,
    decodeFloat32: CALCULATOR_DECODE_FLOAT32,
    encodeFloat32: CALCULATOR_ENCODE_FLOAT32,
    swapBytes: CALCULATOR_SWAP_BYTES
  },
  workspace: {
    export: WORKSPACE_EXPORT,
    import: WORKSPACE_IMPORT,
    validate: WORKSPACE_VALIDATE,
    saveFile: WORKSPACE_SAVE_FILE,
    loadFile: WORKSPACE_LOAD_FILE
  },

  // Phase 2: OPC UA Full Client
  opcua: {
    // Connection
    connect: OPCUA_CONNECT,
    disconnect: OPCUA_DISCONNECT,
    getEndpoints: OPCUA_GET_ENDPOINTS,
    testConnection: OPCUA_TEST_CONNECTION,
    sessionStatus: OPCUA_SESSION_STATUS,
    sessionError: OPCUA_SESSION_ERROR,
    // Browse
    browse: OPCUA_BROWSE,
    browsePath: OPCUA_BROWSE_PATH,
    getNode: OPCUA_GET_NODE,
    // Read/Write
    read: OPCUA_READ,
    write: OPCUA_WRITE,
    readAttributes: OPCUA_READ_ATTRIBUTES,
    // Subscription
    createSubscription: OPCUA_CREATE_SUBSCRIPTION,
    deleteSubscription: OPCUA_DELETE_SUBSCRIPTION,
    addMonitoredItem: OPCUA_ADD_MONITORED_ITEM,
    removeMonitoredItem: OPCUA_REMOVE_MONITORED_ITEM,
    modifyMonitoredItem: OPCUA_MODIFY_MONITORED_ITEM,
    dataChange: OPCUA_DATA_CHANGE,
    subscriptionStatus: OPCUA_SUBSCRIPTION_STATUS,
    // Events
    subscribeEvents: OPCUA_SUBSCRIBE_EVENTS,
    unsubscribeEvents: OPCUA_UNSUBSCRIBE_EVENTS,
    acknowledgeCondition: OPCUA_ACKNOWLEDGE_CONDITION,
    confirmCondition: OPCUA_CONFIRM_CONDITION,
    event: OPCUA_EVENT,
    // Methods
    callMethod: OPCUA_CALL_METHOD,
    getMethodArgs: OPCUA_GET_METHOD_ARGS,
    // History
    readHistory: OPCUA_READ_HISTORY,
    readHistoryEvents: OPCUA_READ_HISTORY_EVENTS,
    // Certificates
    listCertificates: OPCUA_LIST_CERTIFICATES,
    importCertificate: OPCUA_IMPORT_CERTIFICATE,
    exportCertificate: OPCUA_EXPORT_CERTIFICATE,
    deleteCertificate: OPCUA_DELETE_CERTIFICATE,
    generateCertificate: OPCUA_GENERATE_CERTIFICATE,
    trustCertificate: OPCUA_TRUST_CERTIFICATE,
    rejectCertificate: OPCUA_REJECT_CERTIFICATE,
    getServerCertificate: OPCUA_GET_SERVER_CERTIFICATE,
    // Discovery
    discoverServers: OPCUA_DISCOVER_SERVERS,
    findServers: OPCUA_FIND_SERVERS
  }
} as const
