import React, { useState } from 'react'
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
  User
} from 'lucide-react'
import type { Protocol, ConnectionStatus } from '@shared/types/connection'

interface ConnectionItem {
  id: string
  name: string
  protocol: Protocol
  status: ConnectionStatus
}

interface SidebarV2Props {
  connections: ConnectionItem[]
  selectedConnectionId?: string | null
  onNewConnection: () => void
  onSelectConnection: (id: string) => void
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

const toolItems = [
  { id: 'bridge', label: 'Bridge', icon: Shuffle },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'dvr', label: 'DVR', icon: HardDrive },
]

/**
 * SidebarV2 - Connection-centric navigation sidebar
 * Displays connections directly in the sidebar for quick access.
 */
export function SidebarV2({
  connections,
  selectedConnectionId,
  onNewConnection,
  onSelectConnection,
  userName = 'User',
}: SidebarV2Props): React.ReactElement {
  const [toolsExpanded, setToolsExpanded] = useState(false)

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
        'bg-[#0A0E14] border-r border-gray-800',
        'flex flex-col overflow-hidden'
      )}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
            <span className="text-white font-bold text-sm">CX</span>
          </div>
          <span className="text-white font-semibold text-lg">ConneX Studio</span>
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
          New Connection
        </button>
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
          My Connections
        </div>

        {connections.length === 0 ? (
          <div className="px-2 py-4 text-center text-gray-500 text-sm">
            No connections yet
          </div>
        ) : (
          <div className="space-y-1">
            {connections.map((conn) => {
              const protocol = protocolConfig[conn.protocol]
              const Icon = protocol.icon
              const isSelected = selectedConnectionId === conn.id

              return (
                <button
                  key={conn.id}
                  onClick={() => onSelectConnection(conn.id)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'flex items-center gap-3',
                    'text-left transition-colors',
                    isSelected
                      ? 'bg-blue-500/15 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  )}
                >
                  {/* Status Indicator */}
                  <div
                    data-testid={`status-${conn.id}`}
                    className={cn('w-2 h-2 rounded-full', statusColors[conn.status])}
                  />

                  {/* Connection Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{conn.name}</div>
                    <div className={cn('text-xs', protocol.color)}>{protocol.label}</div>
                  </div>

                  {/* Protocol Icon */}
                  <Icon className={cn('w-4 h-4', protocol.color)} />
                </button>
              )
            })}
          </div>
        )}

        {/* Tools Section */}
        <div className="mt-4">
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full px-2 py-1.5 flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {toolsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider">Tools</span>
          </button>

          {toolsExpanded && (
            <div className="mt-1 space-y-1">
              {toolItems.map((tool) => {
                const Icon = tool.icon
                return (
                  <button
                    key={tool.id}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg',
                      'flex items-center gap-3',
                      'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                      'transition-colors'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{tool.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - User Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-300">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-300 truncate">{userName}</div>
          </div>
          <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
