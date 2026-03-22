import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// i18n mock — load the actual English translation files so that components
// render their human-readable strings instead of raw translation keys.
// ---------------------------------------------------------------------------
import enCommon from '../../../src/renderer/i18n/locales/en/common.json'
import enConnection from '../../../src/renderer/i18n/locales/en/connection.json'
import enModbus from '../../../src/renderer/i18n/locales/en/modbus.json'
import enMqtt from '../../../src/renderer/i18n/locales/en/mqtt.json'
import enOpcua from '../../../src/renderer/i18n/locales/en/opcua.json'
import enDashboard from '../../../src/renderer/i18n/locales/en/dashboard.json'
import enAlert from '../../../src/renderer/i18n/locales/en/alert.json'
import enCollection from '../../../src/renderer/i18n/locales/en/collection.json'
import enCalculator from '../../../src/renderer/i18n/locales/en/calculator.json'
import enDvr from '../../../src/renderer/i18n/locales/en/dvr.json'
import enBridge from '../../../src/renderer/i18n/locales/en/bridge.json'
import enDiagnostics from '../../../src/renderer/i18n/locales/en/diagnostics.json'
import enExport from '../../../src/renderer/i18n/locales/en/export.json'
import enLayout from '../../../src/renderer/i18n/locales/en/layout.json'
import enHelp from '../../../src/renderer/i18n/locales/en/help.json'

// Flat record mapping namespace → (key → translated string).
// All translation JSON files use flat keys with dot notation (e.g. "status.connected").
const translations: Record<string, Record<string, string>> = {
  common: enCommon as Record<string, string>,
  connection: enConnection as Record<string, string>,
  modbus: enModbus as Record<string, string>,
  mqtt: enMqtt as Record<string, string>,
  opcua: enOpcua as Record<string, string>,
  dashboard: enDashboard as Record<string, string>,
  alert: enAlert as Record<string, string>,
  collection: enCollection as Record<string, string>,
  calculator: enCalculator as Record<string, string>,
  dvr: enDvr as Record<string, string>,
  bridge: enBridge as Record<string, string>,
  diagnostics: enDiagnostics as Record<string, string>,
  export: enExport as Record<string, string>,
  layout: enLayout as Record<string, string>,
  help: enHelp as Record<string, string>,
}

/**
 * Resolve a translation key, handling cross-namespace syntax "ns:key" and
 * simple {{variable}} interpolation.
 */
function resolveTKey(
  key: string,
  defaultNs: string,
  options?: Record<string, unknown>
): string {
  let namespace = defaultNs
  let lookupKey = key

  // Handle "namespace:key" cross-namespace syntax
  if (key.includes(':')) {
    const colonIdx = key.indexOf(':')
    namespace = key.slice(0, colonIdx)
    lookupKey = key.slice(colonIdx + 1)
  }

  let result = translations[namespace]?.[lookupKey] ?? lookupKey

  // Simple {{variable}} interpolation
  if (options) {
    for (const [k, v] of Object.entries(options)) {
      if (k !== 'count' || typeof v !== 'undefined') {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
      }
    }
  }

  return result
}

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string | string[]) => {
    const defaultNs = Array.isArray(ns) ? (ns[0] ?? 'common') : (ns ?? 'common')
    return {
      t: (key: string, options?: Record<string, unknown>) =>
        resolveTKey(key, defaultNs, options),
      i18n: {
        language: 'en',
        changeLanguage: vi.fn(),
      },
    }
  },
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// Mock the i18n initialisation module so tests don't trigger the real i18next
// setup (which tries to load locale files asynchronously).
// ErrorBoundary imports the default `i18n` instance directly and calls i18n.t(),
// so the default export must expose a `t` function with the same resolution logic.
vi.mock('@renderer/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => resolveTKey(key, 'common', options),
    language: 'en',
    changeLanguage: vi.fn(),
  },
}))

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
