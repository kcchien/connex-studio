/**
 * HelpPanel - Slide-in help panel from the right side
 *
 * Sections:
 * - Quick Start (numbered steps)
 * - Protocol Guides (collapsible sections)
 * - Keyboard Shortcuts (table)
 * - About (version + links)
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useUIStore } from '@renderer/stores/uiStore'

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl'

interface ShortcutRow {
  key: string
  labelKey: string
}

const shortcuts: ShortcutRow[] = [
  { key: `${mod}+N`, labelKey: 'shortcuts.newConnection' },
  { key: `${mod}+Enter`, labelKey: 'shortcuts.connectDisconnect' },
  { key: 'F5', labelKey: 'shortcuts.startPolling' },
  { key: 'Shift+F5', labelKey: 'shortcuts.stopPolling' },
  { key: `${mod}+D`, labelKey: 'shortcuts.toggleTheme' },
  { key: `${mod}+B`, labelKey: 'shortcuts.toggleSidebar' },
  { key: `${mod}+L`, labelKey: 'shortcuts.toggleLogs' },
  { key: `${mod}+?`, labelKey: 'shortcuts.help' },
]

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'text-sm font-medium text-gray-700 dark:text-gray-300',
          'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
          'transition-colors'
        )}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * HelpPanel component - renders as a fixed overlay panel on the right side.
 * Reads open state from uiStore and calls setHelpPanelOpen to close.
 */
export function HelpPanel(): React.ReactElement | null {
  const { t } = useTranslation(['help', 'common'])
  const helpPanelOpen = useUIStore((state) => state.helpPanelOpen)
  const setHelpPanelOpen = useUIStore((state) => state.setHelpPanelOpen)

  // Get version — try electronAPI if available, otherwise fall back
  const version = (typeof window !== 'undefined' && (window as Window & typeof globalThis & { electronAPI?: { app?: { version?: string } } }).electronAPI?.app?.version) || '1.0.0'

  if (!helpPanelOpen) return null

  return (
    <>
      {/* Backdrop - clicking outside closes the panel */}
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
        aria-hidden="true"
        onClick={() => setHelpPanelOpen(false)}
      />

      {/* Panel */}
      <aside
        role="complementary"
        aria-label={t('panel.title')}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[400px]',
          'bg-white dark:bg-[#0D1117]',
          'border-l border-gray-200 dark:border-gray-800',
          'flex flex-col shadow-xl',
          'overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('panel.title')}
          </h2>
          <button
            type="button"
            onClick={() => setHelpPanelOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={t('common:action.close')}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Quick Start */}
          <section aria-labelledby="help-quickstart">
            <h3
              id="help-quickstart"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3"
            >
              {t('quickstart.title')}
            </h3>
            <ol className="space-y-3">
              {(['step1', 'step2', 'step3'] as const).map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                      'text-xs font-bold',
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    )}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(`quickstart.${step}`)}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Protocol Guides */}
          <section aria-labelledby="help-protocols">
            <h3
              id="help-protocols"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3"
            >
              {t('protocols.title')}
            </h3>
            <div className="space-y-2">
              <CollapsibleSection title={t('protocols.modbus.title')} defaultOpen>
                <p className="leading-relaxed">{t('protocols.modbus.desc')}</p>
              </CollapsibleSection>
              <CollapsibleSection title={t('protocols.mqtt.title')}>
                <p className="leading-relaxed">{t('protocols.mqtt.desc')}</p>
              </CollapsibleSection>
              <CollapsibleSection title={t('protocols.opcua.title')}>
                <p className="leading-relaxed">{t('protocols.opcua.desc')}</p>
              </CollapsibleSection>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section aria-labelledby="help-shortcuts">
            <h3
              id="help-shortcuts"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3"
            >
              {t('shortcuts.title')}
            </h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {shortcuts.map(({ key, labelKey }) => (
                  <tr key={key}>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                      {t(labelKey)}
                    </td>
                    <td className="py-2 text-right">
                      <kbd className={cn(
                        'inline-block px-2 py-0.5 rounded text-xs font-mono',
                        'bg-gray-100 dark:bg-gray-800',
                        'text-gray-700 dark:text-gray-300',
                        'border border-gray-300 dark:border-gray-600'
                      )}>
                        {key}
                      </kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* About */}
          <section aria-labelledby="help-about">
            <h3
              id="help-about"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3"
            >
              {t('about.title')}
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>{t('about.version', { version })}</p>
              <p>{t('about.license')}</p>
              <a
                href="https://github.com/kcchien/connex-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('about.github')}
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </section>

        </div>
      </aside>
    </>
  )
}
