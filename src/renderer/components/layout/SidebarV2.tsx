import React, { useState, useCallback, useRef, useEffect } from 'react'
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
  HelpCircle,
  Save,
  FolderOpen,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  Bell
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

export type ToolId = 'bridge' | 'calculator' | 'dvr' | 'dashboard' | 'alerts'

export interface SidebarV2Props {
  connections: Connection[]
  fullConnections?: FullConnection[]
  selectedConnectionId?: string | null
  selectedTool?: ToolId | null
  onNewConnection: () => void
  onSelectConnection: (id: string) => void
  onSelectTool?: (tool: ToolId | null) => void
  onEditConnection?: (connection: FullConnection) => void
  onDeleteConnection?: (connection: FullConnection) => void
  onSaveProfile?: () => void
  onLoadProfile?: () => void
  onOpenSettings?: () => void
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

const toolItemDefs: { id: ToolId; labelKey: string; icon: typeof Shuffle }[] = [
  { id: 'dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { id: 'alerts', labelKey: 'sidebar.alerts', icon: Bell },
  { id: 'bridge', labelKey: 'sidebar.bridge', icon: Shuffle },
  { id: 'calculator', labelKey: 'sidebar.calculator', icon: Calculator },
  { id: 'dvr', labelKey: 'sidebar.dvr', icon: HardDrive },
]

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
  onSaveProfile,
  onLoadProfile,
  onOpenSettings,
  selectedTool,
  onSelectTool,
}: SidebarV2Props): React.ReactElement {
  const { t } = useTranslation('layout')
  const { t: tCommon } = useTranslation('common')
  const [toolsExpanded, setToolsExpanded] = useState(true)

  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const sidebarWidth = useUIStore((state) => state.sidebarWidth)
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth)
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const language = useUIStore((state) => state.language)
  const setLanguage = useUIStore((state) => state.setLanguage)
  const toggleHelpPanel = useUIStore((state) => state.toggleHelpPanel)
  const ThemeIcon = themeIcons[theme]

  // Drag-to-resize
  const resizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const delta = e.clientX - startX.current
      setSidebarWidth(startWidth.current + delta)
    }
    const onMouseUp = () => {
      if (!resizing.current) return
      resizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [setSidebarWidth])

  const width = collapsed ? 56 : sidebarWidth

  // Collapsed mode: icon-only sidebar
  if (collapsed) {
    return (
      <aside
        className={cn(
          'h-full flex flex-col items-center py-3 gap-2',
          'bg-white dark:bg-[#0A0E14] border-r border-gray-200 dark:border-gray-800'
        )}
        style={{ width: 56, minWidth: 56 }}
      >
        <button onClick={toggleSidebar} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-300 transition-colors" title="Expand sidebar">
          <PanelLeft className="w-4 h-4" />
        </button>
        <button onClick={onNewConnection} className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-teal-400 text-white" title={t('sidebar.newConnection')}>
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" title={`${tCommon('language.en')} / ${tCommon('language.zh-TW')}`}>
          <Globe className="w-4 h-4" />
        </button>
        <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" title={`Theme: ${themeLabels[theme]}`}>
          <ThemeIcon className="w-4 h-4" />
        </button>
        <button onClick={toggleHelpPanel} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" title={tCommon('action.help')}>
          <HelpCircle className="w-4 h-4" />
        </button>
        <button onClick={onOpenSettings} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" title={tCommon('action.settings')}>
          <Settings className="w-4 h-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        'h-full relative',
        'bg-white dark:bg-[#0A0E14] border-r border-gray-200 dark:border-gray-800',
        'flex flex-col overflow-hidden'
      )}
      style={{ width, minWidth: 200, maxWidth: 480 }}
    >
      {/* Logo + Collapse Toggle */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-gray-900 dark:text-white font-semibold text-lg flex-1">ConneX Studio</span>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-300 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
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

      {/* Navigation: Connections + Profiles + Tools */}
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
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'group w-full px-3 py-2 rounded-lg cursor-pointer',
                      'flex items-center gap-3',
                      'text-left transition-colors',
                      isSelected
                        ? 'bg-blue-500/15 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                    onClick={() => onSelectConnection(conn.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectConnection(conn.id) }}
                    aria-pressed={isSelected}
                    aria-label={tCommon('a11y.connectionItem', { name: conn.name, status: conn.status, protocol: protocol.label })}
                  >
                    <div
                      data-testid={`status-${conn.id}`}
                      className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[conn.status])}
                      aria-label={tCommon('a11y.connectionStatus', { status: conn.status })}
                      role="img"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{conn.name}</div>
                      <div className={cn('text-xs', protocol.color)}>{protocol.label}</div>
                    </div>
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
                    <Icon className={cn(
                      'w-4 h-4 transition-opacity',
                      protocol.color,
                      fullConn && (onEditConnection || onDeleteConnection) && 'group-hover:hidden'
                    )} aria-hidden="true" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Profiles Section */}
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
            {t('sidebar.profiles')}
          </div>
          <ul className="space-y-1" role="list">
            <li>
              <button
                type="button"
                onClick={onSaveProfile}
                disabled={connections.length === 0}
                className={cn(
                  'w-full px-3 py-2 rounded-lg',
                  'flex items-center gap-3',
                  'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                  'transition-colors',
                  connections.length === 0 && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">{t('sidebar.saveProfile')}</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={onLoadProfile}
                className={cn(
                  'w-full px-3 py-2 rounded-lg',
                  'flex items-center gap-3',
                  'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                  'transition-colors'
                )}
              >
                <FolderOpen className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">{t('sidebar.loadProfile')}</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Tools Section */}
        <div className="mt-4">
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full px-2 py-1.5 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
                const isActive = selectedTool === tool.id
                return (
                  <li key={tool.id}>
                    <button
                      type="button"
                      onClick={() => onSelectTool?.(isActive ? null : tool.id)}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg',
                        'flex items-center gap-3',
                        'transition-colors',
                        isActive
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
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

      {/* Footer — action buttons only, no user name */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={`${tCommon('language.en')} / ${tCommon('language.zh-TW')}`}
            title={language === 'en' ? '切換為中文' : 'Switch to English'}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon('a11y.theme', { theme: themeLabels[theme] })}
            title={`Theme: ${themeLabels[theme]}`}
          >
            <ThemeIcon className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={toggleHelpPanel}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon('action.help')}
            title={tCommon('action.help')}
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon('action.settings')}
            title={tCommon('action.settings')}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors"
        onMouseDown={onResizeStart}
      />
    </aside>
  )
}
