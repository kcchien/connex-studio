/**
 * SettingsDialog — Application settings for IIoT protocol testing.
 *
 * Categories:
 * - Connection: default timeout, auto-reconnect, max retries
 * - Polling: default interval, max concurrent sessions
 * - Display: number format, timestamp format
 * - Application: language, theme, auto-update
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useUIStore, type Theme } from '@renderer/stores/uiStore'

export interface AppSettings {
  connectionTimeoutMs: number
  autoReconnect: boolean
  maxReconnectAttempts: number
  defaultPollIntervalMs: number
  maxConcurrentPolls: number
  numberDecimalPlaces: number
  timestampFormat: '24h' | '12h'
  csvSeparator: ',' | ';' | '\t'
}

const DEFAULT_SETTINGS: AppSettings = {
  connectionTimeoutMs: 5000,
  autoReconnect: true,
  maxReconnectAttempts: 3,
  defaultPollIntervalMs: 1000,
  maxConcurrentPolls: 10,
  numberDecimalPlaces: 2,
  timestampFormat: '24h',
  csvSeparator: ',',
}

const STORAGE_KEY = 'connex-app-settings'

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'connection' | 'polling' | 'display' | 'application'

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps): React.ReactElement | null {
  const { t } = useTranslation('layout')
  const [activeTab, setActiveTab] = useState<Tab>('connection')
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [dirty, setDirty] = useState(false)

  const theme = useUIStore((state) => state.theme)
  const setTheme = useUIStore((state) => state.setTheme)
  const language = useUIStore((state) => state.language)
  const setLanguage = useUIStore((state) => state.setLanguage)

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings())
      setDirty(false)
    }
  }, [isOpen])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    saveSettings(settings)
    setDirty(false)
    onClose()
  }, [settings, onClose])

  if (!isOpen) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'connection', label: t('settings.tabConnection') },
    { id: 'polling', label: t('settings.tabPolling') },
    { id: 'display', label: t('settings.tabDisplay') },
    { id: 'application', label: t('settings.tabApplication') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-[600px] max-h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tab nav */}
          <div className="w-40 border-r border-gray-200 dark:border-gray-800 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {activeTab === 'connection' && (
              <>
                <SettingRow label={t('settings.connectionTimeout')} hint={t('settings.connectionTimeoutHint')}>
                  <NumberInput value={settings.connectionTimeoutMs} onChange={(v) => update('connectionTimeoutMs', v)} min={1000} max={30000} step={1000} suffix="ms" />
                </SettingRow>
                <SettingRow label={t('settings.autoReconnect')}>
                  <Toggle checked={settings.autoReconnect} onChange={(v) => update('autoReconnect', v)} />
                </SettingRow>
                {settings.autoReconnect && (
                  <SettingRow label={t('settings.maxReconnectAttempts')}>
                    <NumberInput value={settings.maxReconnectAttempts} onChange={(v) => update('maxReconnectAttempts', v)} min={1} max={10} step={1} />
                  </SettingRow>
                )}
              </>
            )}

            {activeTab === 'polling' && (
              <>
                <SettingRow label={t('settings.defaultPollInterval')} hint={t('settings.defaultPollIntervalHint')}>
                  <NumberInput value={settings.defaultPollIntervalMs} onChange={(v) => update('defaultPollIntervalMs', v)} min={100} max={60000} step={100} suffix="ms" />
                </SettingRow>
                <SettingRow label={t('settings.maxConcurrentPolls')}>
                  <NumberInput value={settings.maxConcurrentPolls} onChange={(v) => update('maxConcurrentPolls', v)} min={1} max={50} step={1} />
                </SettingRow>
              </>
            )}

            {activeTab === 'display' && (
              <>
                <SettingRow label={t('settings.decimalPlaces')}>
                  <NumberInput value={settings.numberDecimalPlaces} onChange={(v) => update('numberDecimalPlaces', v)} min={0} max={8} step={1} />
                </SettingRow>
                <SettingRow label={t('settings.timestampFormat')}>
                  <SelectInput
                    value={settings.timestampFormat}
                    onChange={(v) => update('timestampFormat', v as '24h' | '12h')}
                    options={[
                      { value: '24h', label: '24H (14:30:00)' },
                      { value: '12h', label: '12H (2:30:00 PM)' },
                    ]}
                  />
                </SettingRow>
                <SettingRow label={t('settings.csvSeparator')}>
                  <SelectInput
                    value={settings.csvSeparator}
                    onChange={(v) => update('csvSeparator', v as ',' | ';' | '\t')}
                    options={[
                      { value: ',', label: t('settings.comma') },
                      { value: ';', label: t('settings.semicolon') },
                      { value: '\t', label: t('settings.tab') },
                    ]}
                  />
                </SettingRow>
              </>
            )}

            {activeTab === 'application' && (
              <>
                <SettingRow label={t('settings.language')}>
                  <SelectInput
                    value={language}
                    onChange={(v) => setLanguage(v as 'en' | 'zh-TW')}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'zh-TW', label: '繁體中文' },
                    ]}
                  />
                </SettingRow>
                <SettingRow label={t('settings.theme')}>
                  <SelectInput
                    value={theme}
                    onChange={(v) => setTheme(v as Theme)}
                    options={[
                      { value: 'light', label: t('settings.themeLight') },
                      { value: 'dark', label: t('settings.themeDark') },
                      { value: 'system', label: t('settings.themeSystem') },
                    ]}
                  />
                </SettingRow>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={cn(
              'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
              dirty
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
            )}
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Primitive input components ──

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{label}</div>
        {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function NumberInput({ value, onChange, min, max, step, suffix }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (v >= min && v <= max) onChange(v)
        }}
        min={min}
        max={max}
        step={step}
        className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-10 h-5 rounded-full transition-colors relative',
        checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
