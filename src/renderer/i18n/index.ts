import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enConnection from './locales/en/connection.json'
import enModbus from './locales/en/modbus.json'
import enMqtt from './locales/en/mqtt.json'
import enOpcua from './locales/en/opcua.json'
import enDashboard from './locales/en/dashboard.json'
import enAlert from './locales/en/alert.json'
import enCollection from './locales/en/collection.json'
import enCalculator from './locales/en/calculator.json'
import enDvr from './locales/en/dvr.json'
import enBridge from './locales/en/bridge.json'
import enDiagnostics from './locales/en/diagnostics.json'
import enExport from './locales/en/export.json'
import enLayout from './locales/en/layout.json'
import zhTWCommon from './locales/zh-TW/common.json'
import zhTWConnection from './locales/zh-TW/connection.json'
import zhTWModbus from './locales/zh-TW/modbus.json'
import zhTWMqtt from './locales/zh-TW/mqtt.json'
import zhTWOpcua from './locales/zh-TW/opcua.json'
import zhTWDashboard from './locales/zh-TW/dashboard.json'
import zhTWAlert from './locales/zh-TW/alert.json'
import zhTWCollection from './locales/zh-TW/collection.json'
import zhTWCalculator from './locales/zh-TW/calculator.json'
import zhTWDvr from './locales/zh-TW/dvr.json'
import zhTWBridge from './locales/zh-TW/bridge.json'
import zhTWDiagnostics from './locales/zh-TW/diagnostics.json'
import zhTWExport from './locales/zh-TW/export.json'
import zhTWLayout from './locales/zh-TW/layout.json'

const resources = {
  en: {
    common: enCommon,
    connection: enConnection,
    modbus: enModbus,
    mqtt: enMqtt,
    opcua: enOpcua,
    dashboard: enDashboard,
    alert: enAlert,
    collection: enCollection,
    calculator: enCalculator,
    dvr: enDvr,
    bridge: enBridge,
    diagnostics: enDiagnostics,
    export: enExport,
    layout: enLayout,
  },
  'zh-TW': {
    common: zhTWCommon,
    connection: zhTWConnection,
    modbus: zhTWModbus,
    mqtt: zhTWMqtt,
    opcua: zhTWOpcua,
    dashboard: zhTWDashboard,
    alert: zhTWAlert,
    collection: zhTWCollection,
    calculator: zhTWCalculator,
    dvr: zhTWDvr,
    bridge: zhTWBridge,
    diagnostics: zhTWDiagnostics,
    export: zhTWExport,
    layout: zhTWLayout,
  },
}

function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem('connex-ui-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.state?.language) return parsed.state.language
    }
  } catch { /* ignore */ }
  const nav = navigator.language
  if (nav.startsWith('zh')) return 'zh-TW'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: import.meta.env.DEV
    ? (_lngs: readonly string[], _ns: string, key: string) => console.warn(`[i18n] Missing key: ${key}`)
    : undefined,
})

export default i18n
