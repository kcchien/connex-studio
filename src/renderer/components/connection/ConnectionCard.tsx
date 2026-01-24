/**
 * ConnectionCard component displays a single connection with status indicator and actions.
 * Shows connection name, protocol badge, host:port info, and connect/disconnect/delete buttons.
 */

import React from 'react'
import { Plug, Unplug, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useConnection } from '@renderer/hooks/useConnection'
import type { Connection, ConnectionStatus, ModbusTcpConfig, MqttConfig, OpcUaConfig } from '@shared/types/connection'

interface ConnectionCardProps {
  /** The connection to display */
  connection: Connection
  /** Whether this card is currently selected */
  selected?: boolean
  /** Callback when the card is clicked for selection */
  onClick?: () => void
}

/**
 * Maps connection status to Tailwind background color class.
 */
function getStatusColorClass(status: ConnectionStatus): string {
  const statusColors: Record<ConnectionStatus, string> = {
    connected: 'bg-status-connected',
    connecting: 'bg-status-connecting',
    disconnected: 'bg-status-disconnected',
    error: 'bg-status-error'
  }
  return statusColors[status]
}

/**
 * Maps connection status to human-readable label.
 */
function getStatusLabel(status: ConnectionStatus): string {
  const labels: Record<ConnectionStatus, string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Error'
  }
  return labels[status]
}

/**
 * Extracts host:port string from connection config based on protocol.
 */
function getHostPortString(connection: Connection): string {
  const { protocol, config } = connection

  switch (protocol) {
    case 'modbus-tcp': {
      const modbusConfig = config as ModbusTcpConfig
      return `${modbusConfig.host}:${modbusConfig.port}`
    }
    case 'mqtt': {
      const mqttConfig = config as MqttConfig
      // Extract host:port from broker URL (e.g., "mqtt://localhost:1883")
      try {
        const url = new URL(mqttConfig.brokerUrl)
        return `${url.hostname}:${url.port || '1883'}`
      } catch {
        return mqttConfig.brokerUrl
      }
    }
    case 'opcua': {
      const opcuaConfig = config as OpcUaConfig
      // Extract host:port from endpoint URL (e.g., "opc.tcp://localhost:4840")
      try {
        const urlString = opcuaConfig.endpointUrl.replace('opc.tcp://', 'http://')
        const url = new URL(urlString)
        return `${url.hostname}:${url.port || '4840'}`
      } catch {
        return opcuaConfig.endpointUrl
      }
    }
    default:
      return 'Unknown'
  }
}

/**
 * Formats protocol for display in badge.
 */
function getProtocolLabel(protocol: Connection['protocol']): string {
  const labels: Record<Connection['protocol'], string> = {
    'modbus-tcp': 'Modbus TCP',
    mqtt: 'MQTT',
    opcua: 'OPC UA'
  }
  return labels[protocol]
}

export function ConnectionCard({
  connection,
  selected = false,
  onClick
}: ConnectionCardProps): React.ReactElement {
  const { connect, disconnect, remove, isLoading } = useConnection()

  const { id, name, protocol, status, lastError } = connection
  const isDisconnected = status === 'disconnected'
  const isConnectedOrConnecting = status === 'connected' || status === 'connecting'
  const canDelete = isDisconnected

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await connect(id)
  }

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await disconnect(id)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canDelete) {
      await remove(id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.()
        }
      }}
      className={cn(
        'p-3 rounded-lg border transition-colors cursor-pointer',
        'bg-card hover:bg-accent/50',
        selected && 'border-primary bg-accent/30',
        !selected && 'border-border'
      )}
    >
      {/* Header row: Name and Status */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-foreground truncate flex-1 mr-2">{name}</h3>
        <div className="flex items-center gap-2">
          {/* Status indicator dot */}
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full shrink-0',
              getStatusColorClass(status),
              status === 'connecting' && 'animate-pulse'
            )}
            title={getStatusLabel(status)}
          />
        </div>
      </div>

      {/* Protocol badge and host:port */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-secondary text-secondary-foreground">
          {getProtocolLabel(protocol)}
        </span>
        <span className="text-sm text-muted-foreground truncate">
          {getHostPortString(connection)}
        </span>
      </div>

      {/* Error message if present */}
      {status === 'error' && lastError && (
        <p className="text-xs text-destructive mb-2 truncate" title={lastError}>
          {lastError}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-2">
        {/* Connect button - shown when disconnected or error */}
        {(isDisconnected || status === 'error') && (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Connect"
          >
            <Plug className="w-4 h-4" />
            Connect
          </button>
        )}

        {/* Disconnect button - shown when connected or connecting */}
        {isConnectedOrConnecting && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Disconnect"
          >
            <Unplug className="w-4 h-4" />
            Disconnect
          </button>
        )}

        {/* Delete button - only enabled when disconnected */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={!canDelete || isLoading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            'hover:bg-destructive hover:text-destructive-foreground',
            canDelete
              ? 'text-destructive border border-destructive/30'
              : 'text-muted-foreground border border-transparent cursor-not-allowed opacity-50'
          )}
          title={canDelete ? 'Delete connection' : 'Disconnect before deleting'}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  )
}
