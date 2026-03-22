import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

const unsubscribe = vi.fn()
const noopListener = vi.fn(() => unsubscribe)

// Baseline Electron API mock for renderer unit tests.
// Individual tests can override specific methods as needed.
Object.defineProperty(window, 'electronAPI', {
  writable: true,
  value: {
    connection: {
      create: vi.fn(async () => ({ success: true, connection: null })),
      connect: vi.fn(async () => ({ success: true })),
      disconnect: vi.fn(async () => ({ success: true })),
      delete: vi.fn(async () => ({ success: true })),
      update: vi.fn(async () => ({ success: true, connection: null })),
      list: vi.fn(async () => ({ connections: [] })),
      readOnce: vi.fn(async () => ({ success: true, value: 0, quality: 'good' })),
      onStatusChanged: noopListener,
      getMetrics: vi.fn(async () => ({ success: true })),
      onMetricsChanged: noopListener,
      testConnection: vi.fn(async () => ({ success: true }))
    },
    tag: {
      create: vi.fn(async () => ({ success: true, tag: null })),
      update: vi.fn(async () => ({ success: true, tag: null })),
      delete: vi.fn(async () => ({ success: true })),
      list: vi.fn(async () => ({ tags: [] })),
      importCsv: vi.fn(async () => ({ success: true, imported: 0, errors: [] }))
    },
    polling: {
      start: vi.fn(async () => ({ success: true })),
      stop: vi.fn(async () => ({ success: true })),
      status: vi.fn(async () => ({
        isPolling: false,
        intervalMs: 1000,
        lastPollTimestamp: 0,
        tagCount: 0
      })),
      onData: noopListener,
      onStatusChanged: noopListener
    },
    dvr: {
      getRange: vi.fn(async () => ({ startTimestamp: 0, endTimestamp: 0 })),
      seek: vi.fn(async () => ({ timestamp: 0, values: [] })),
      getSparkline: vi.fn(async () => ({ points: [] }))
    },
    profile: {
      save: vi.fn(async () => ({ success: true, path: '' })),
      load: vi.fn(async () => ({ success: true, connections: [], tags: [], credentialsRequired: [] })),
      list: vi.fn(async () => ({ profiles: [] })),
      delete: vi.fn(async () => ({ success: true })),
      import: vi.fn(async () => ({ success: true, name: '' })),
      export: vi.fn(async () => ({ success: true, path: '' }))
    },
    export: {
      csv: vi.fn(async () => ({ success: true, path: '' })),
      htmlReport: vi.fn(async () => ({ success: true, path: '' }))
    },
    log: {
      getRecent: vi.fn(async () => ({ entries: [] })),
      openFolder: vi.fn(async () => ({ success: true }))
    },
    app: {
      checkUnsaved: vi.fn(async () => ({ hasUnsavedChanges: false, pollingActive: false })),
      forceQuit: vi.fn()
    },
    environment: {
      list: vi.fn(async () => ({ success: true, environments: [] })),
      get: vi.fn(async () => ({ success: false, error: 'not found' })),
      create: vi.fn(async () => ({ success: true, environment: null })),
      update: vi.fn(async () => ({ success: true, environment: null })),
      delete: vi.fn(async () => ({ success: true })),
      setDefault: vi.fn(async () => ({ success: true, environment: null })),
      getDefault: vi.fn(async () => ({ success: true, environment: null })),
      resolve: vi.fn(async () => ({ success: true, result: { resolved: '' } }))
    },
    collection: {
      list: vi.fn(async () => ({ success: true, collections: [] })),
      get: vi.fn(async () => ({ success: false, error: 'not found' })),
      create: vi.fn(async () => ({ success: true, collection: null })),
      update: vi.fn(async () => ({ success: true, collection: null })),
      delete: vi.fn(async () => ({ success: true })),
      run: vi.fn(async () => ({ success: true, result: null })),
      stop: vi.fn(async () => ({ success: true })),
      onProgress: noopListener,
      onResult: noopListener
    },
    bridge: {
      list: vi.fn(async () => ({ success: true, bridges: [] })),
      get: vi.fn(async () => ({ success: false, error: 'not found' })),
      create: vi.fn(async () => ({ success: true, bridge: null })),
      update: vi.fn(async () => ({ success: true, bridge: null })),
      delete: vi.fn(async () => ({ success: true })),
      start: vi.fn(async () => ({ success: true })),
      stop: vi.fn(async () => ({ success: true })),
      pause: vi.fn(async () => ({ success: true })),
      resume: vi.fn(async () => ({ success: true })),
      getStats: vi.fn(async () => ({ success: true, stats: null })),
      onStatusChanged: noopListener,
      onError: noopListener,
      onStats: noopListener
    },
    dashboard: {
      list: vi.fn(async () => []),
      get: vi.fn(async () => null),
      create: vi.fn(async () => null),
      update: vi.fn(async () => null),
      delete: vi.fn(async () => true),
      setDefault: vi.fn(async () => null),
      getDefault: vi.fn(async () => null),
      addWidget: vi.fn(async () => null),
      updateWidget: vi.fn(async () => null),
      removeWidget: vi.fn(async () => true),
      updateLayout: vi.fn(async () => true)
    },
    alert: {
      listRules: vi.fn(async () => []),
      getRule: vi.fn(async () => null),
      createRule: vi.fn(async () => null),
      updateRule: vi.fn(async () => null),
      deleteRule: vi.fn(async () => true),
      enableRule: vi.fn(async () => null),
      disableRule: vi.fn(async () => null),
      muteRule: vi.fn(async () => true),
      unmuteRule: vi.fn(async () => true),
      getMutedRules: vi.fn(async () => []),
      queryEvents: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 50 })),
      acknowledge: vi.fn(async () => true),
      acknowledgeAll: vi.fn(async () => 0),
      getUnacknowledgedCounts: vi.fn(async () => ({ low: 0, medium: 0, high: 0, critical: 0 })),
      clearHistory: vi.fn(async () => 0),
      testSound: vi.fn(async () => {}),
      setSoundEnabled: vi.fn(async () => {}),
      getSoundEnabled: vi.fn(async () => true),
      onEventTriggered: noopListener,
      onEventAcknowledged: noopListener
    },
    opcua: {},
    calculator: {},
    workspace: {
      export: vi.fn(async () => ({ success: true, yaml: '' })),
      import: vi.fn(async () => ({ success: true })),
      validate: vi.fn(async () => ({ valid: true, errors: [], warnings: [] })),
      saveFile: vi.fn(async () => ({ success: true, path: '' })),
      loadFile: vi.fn(async () => ({ success: true, yaml: '', path: '' }))
    }
  }
})
