import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import zhTWCommon from './locales/zh-TW/common.json'

const resources = {
  en: { common: enCommon },
  'zh-TW': { common: zhTWCommon },
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
