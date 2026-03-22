import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@renderer/lib/utils'
import {
  Plus,
  Server,
  Radio,
  Cable,
  ChevronDown,
  ChevronRight,
  Shuffle,
  Calculator,
  HardDrive,
  Settings,
  Sun,
  Moon,
  Monitor,
  Globe,
  HelpCircle
} from 'lucide-react'
import { Logo } from '@renderer/components/common'
import { ConnectionMenu } from '@renderer/components/connection'
import { useUIStore, type Theme } from '@renderer/stores/uiStore'
import type { Protocol, ConnectionStatus, Connection as FullConnection } from '@shared/types/connection'

export interface Connection {
  id: string
  name: string
  protocol: Protocol
  status: ConnectionStatus
}

export interface SidebarV2Props {
  connections: Connection[]
  /** Full connection objects for edit/delete operations */
  fullConnections?: FullConnection[]
  selectedConnectionId?: string | null
  onNewConnection: () => void
  onSelectConnection: (id: string) => void
  onEditConnection?: (connection: FullConnection) => void
  onDeleteConnection?: (connection: FullConnection) => void
  userName?: string
}

const protocolConfig: Record<Protocol, { label: string; icon: typeof Cable; color: string }> = {
  'modbus-tcp': { label: 'Modbus', icon: Server, color: 'text-teal-400' },
  'mqtt': { label: 'MQTT', icon: Radio, color: 'text-green-400' },
  'opcua': { label: 'OPC UA', icon: Cable, color: 'text-purple-400' },
}

const statusColors: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500',
}

const toolItemDefs = [
  { id: 'bridge', labelKey: 'sidebar.bridge', icon: Shuffle },
  { id: 'calculator', labelKey: 'sidebar.calculator', icon: Calculator },
  { id: 'dvr', labelKey: 'sidebar.dvr', icon: HardDrive },
]

/**
 * SidebarV2 - Connection-centric navigation sidebar
 * Displays connections directly in the sidebar for quick access.
 */
const themeIcons: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const themeLabels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function SidebarV2({
  connections,
  fullConnections = [],
  selectedConnectionId,
  onNewConnection,
  onSelectConnection,
  onEditConnection,
  onDeleteConnection,
  userName = 'User',
}: SidebarV2Props): React.ReactElement {
  const { t } = useTranslation('layout')
  const { t: tCommon } = useTranslation('common')
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const language = useUIStore((state) => state.language)
  const setLanguage = useUIStore((state) => state.setLanguage)
  const toggleHelpPanel = useUIStore((state) => state.toggleHelpPanel)
  const ThemeIcon = themeIcons[theme]

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className={cn(
        'w-[280px] min-w-[280px] h-full',
        'bg-white dark:bg-[#0A0E14] border-r border-gray-200 dark:border-gray-800',
        'flex flex-col overflow-hidden'
      )}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-800 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-gray-900 dark:text-white font-semibold text-lg">ConneX Studio</span>
        </div>
      </div>

      {/* New Connection Button */}
      <div className="p-4">
        <button
          onClick={onNewConnection}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg',
            'bg-gradient-to-r from-blue-500 to-teal-400',
            'text-white font-medium text-sm',
            'flex items-center justify-center gap-2',
            'hover:shadow-lg hover:shadow-blue-500/25',
            'transition-all duration-200',
            'hover:-translate-y-0.5'
          )}
        >
          <Plus className="w-4 h-4" />
          {t('sidebar.newConnection')}
        </button>
      </div>

      {/* Navigation: Connections + Tools */}
      <nav aria-label={tCommon('nav.sidebar')} className="flex-1 overflow-y-auto px-2 flex flex-col">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
          {t('sidebar.myConnections')}
        </div>

        {connections.length === 0 ? (
          <div className="px-2 py-4 text-center text-gray-500 text-sm">
            {t('sidebar.noConnections')}
          </div>
        ) : (
          <ul className="space-y-1" role="list">
            {connections.map((conn) => {
              const protocol = protocolConfig[conn.protocol]
              const Icon = protocol.icon
              const isSelected = selectedConnectionId === conn.id
              const fullConn = fullConnections.find(fc => fc.id === conn.id)

              return (
                <li key={conn.id}>
                  <button
                    type="button"
                    className={cn(
                      'group w-full px-3 py-2 rounded-lg',
                      'flex items-center gap-3',
                      'text-left transition-colors',
                      isSelected
                        ? 'bg-blue-500/15 text-white'
                        : 'hover:bg-gray-800 text-gray-300'
                    )}
                    onClick={() => onSelectConnection(conn.id)}
                    aria-pressed={isSelected}
                    aria-label={tCommon('a11y.connectionItem', { name: conn.name, status: conn.status, protocol: protocol.label })}
                  >
                    {/* Status Indicator */}
                    <div
                      data-testid={`status-${conn.id}`}
                      className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[conn.status])}
                      aria-label={tCommon('a11y.connectionStatus', { status: conn.status })}
                      role="img"
                    />

                    {/* Connection Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{conn.name}</div>
                      <div className={cn('text-xs', protocol.color)}>{protocol.label}</div>
                    </div>

                    {/* Connection Menu (Edit/Delete) - show on hover or when selected */}
                    {fullConn && (onEditConnection || onDeleteConnection) && (
                      <div className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        isSelected && 'opacity-100'
                      )}>
                        <ConnectionMenu
                          connection={fullConn}
                          onEdit={() => onEditConnection?.(fullConn)}
                          onDelete={() => onDeleteConnection?.(fullConn)}
                        />
                      </div>
                    )}

                    {/* Protocol Icon - hide when menu is visible */}
                    <Icon className={cn(
                      'w-4 h-4 transition-opacity',
                      protocol.color,
                      fullConn && (onEditConnection || onDeleteConnection) && 'group-hover:hidden'
                    )} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Tools Section */}
        <div className="mt-4">
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full px-2 py-1.5 flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-expanded={toolsExpanded}
          >
            {toolsExpanded ? (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider">{t('sidebar.tools')}</span>
          </button>

          {toolsExpanded && (
            <ul className="mt-1 space-y-1" role="list">
              {toolItemDefs.map((tool) => {
                const Icon = tool.icon
                return (
                  <li key={tool.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full px-3 py-2 rounded-lg',
                        'flex items-center gap-3',
                        'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                        'transition-colors'
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm">{t(tool.labelKey)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* Footer - User Section */}
      <div className="p-4 border-t border-gray-800 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center" aria-hidden="true">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{userName}</div>
          </div>
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={`${tCommon('language.en')} / ${tCommon('language.zh-TW')}`}
            title={`${tCommon('language.en')} / ${tCommon('language.zh-TW')}`}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
          </button>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon('a11y.theme', { theme: themeLabels[theme] })}
            title={`Theme: ${themeLabels[theme]}`}
          >
            <ThemeIcon className="w-4 h-4" aria-hidden="true" />
          </button>
          {/* Help Button */}
          <button
            onClick={toggleHelpPanel}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon('action.help')}
            title={tCommon('action.help')}
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon('action.settings')}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}
