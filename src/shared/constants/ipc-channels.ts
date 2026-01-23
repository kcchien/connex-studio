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
  }
} as const
