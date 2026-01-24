import { contextBridge, ipcRenderer } from 'electron'
import type { IpcResult } from '@shared/types/common'
import type { Connection, ModbusTcpConfig, MqttConfig, OpcUaConfig } from '@shared/types/connection'
import type { Tag, ModbusAddress, MqttAddress, OpcUaAddress, DataType } from '@shared/types/tag'
import type { PollingStatus, PollingDataPayload } from '@shared/types/polling'
import type { Profile, ProfileSummary } from '@shared/types/profile'
import type { DvrRange, DvrSnapshot, SparklineData } from '@shared/types/dvr'
import type { ExportResult } from '@shared/types/export'
import type { VirtualServer } from '@shared/types/virtual-server'
import type { LogEntry, LogLevel } from '@shared/types/log'

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

  // Virtual Server operations
  virtualServer: {
    start: (params: {
      protocol: 'modbus-tcp'
      port: number
      registers: Array<{
        address: number
        length: number
        waveform: {
          type: 'constant' | 'sine' | 'square' | 'triangle' | 'random'
          amplitude: number
          offset: number
          period: number
          min?: number
          max?: number
        }
      }>
    }) => Promise<IpcResult<{ serverId: string }>>
    stop: (serverId: string) => Promise<IpcResult<void>>
    status: () => Promise<{ servers: VirtualServer[] }>
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
}

// Implement the API
const electronAPI: ElectronAPI = {
  connection: {
    create: (params) => ipcRenderer.invoke('connection:create', params),
    connect: (connectionId) => ipcRenderer.invoke('connection:connect', { connectionId }),
    disconnect: (connectionId) => ipcRenderer.invoke('connection:disconnect', { connectionId }),
    delete: (connectionId) => ipcRenderer.invoke('connection:delete', { connectionId }),
    list: () => ipcRenderer.invoke('connection:list'),
    readOnce: (params) => ipcRenderer.invoke('connection:read-once', params),
    onStatusChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on('connection:status-changed', handler)
      return () => ipcRenderer.removeListener('connection:status-changed', handler)
    }
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

  virtualServer: {
    start: (params) => ipcRenderer.invoke('virtual-server:start', params),
    stop: (serverId) => ipcRenderer.invoke('virtual-server:stop', { serverId }),
    status: () => ipcRenderer.invoke('virtual-server:status')
  },

  log: {
    getRecent: (params) => ipcRenderer.invoke('log:get-recent', params),
    openFolder: () => ipcRenderer.invoke('log:open-folder')
  },

  app: {
    checkUnsaved: () => ipcRenderer.invoke('app:check-unsaved'),
    forceQuit: () => ipcRenderer.send('app:force-quit')
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
