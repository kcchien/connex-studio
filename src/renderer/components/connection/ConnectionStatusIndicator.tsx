import React from 'react'
import { cn } from '@renderer/lib/utils'
import { Loader2 } from 'lucide-react'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig: Record<ConnectionStatus, {
  color: string
  bgColor: string
  label: string
  pulseColor?: string
}> = {
  connected: {
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Connected',
  },
  connecting: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    label: 'Connecting',
    pulseColor: 'animate-pulse',
  },
  disconnected: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Disconnected',
  },
  error: {
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    label: 'Error',
  },
}

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    text: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    dot: 'w-3 h-3',
    text: 'text-base',
    gap: 'gap-2.5',
  },
}

/**
 * ConnectionStatusIndicator - Visual indicator for connection state
 *
 * Displays a colored dot with optional label showing connection status:
 * - Connected: Green dot
 * - Connecting: Yellow dot with pulse animation
 * - Disconnected: Gray dot
 * - Error: Red dot
 */
export function ConnectionStatusIndicator({
  status,
  showLabel = false,
  size = 'md',
  className,
}: ConnectionStatusIndicatorProps): React.ReactElement {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]

  return (
    <div
      className={cn(
        'flex items-center',
        sizeStyles.gap,
        className
      )}
      data-testid="connection-status-indicator"
      data-status={status}
    >
      {status === 'connecting' ? (
        <Loader2
          className={cn(
            'animate-spin',
            config.color,
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
          )}
        />
      ) : (
        <span
          className={cn(
            'rounded-full',
            sizeStyles.dot,
            config.bgColor,
            config.pulseColor
          )}
        />
      )}
      {showLabel && (
        <span
          className={cn(
            'font-medium',
            sizeStyles.text,
            config.color
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  )
}

export default ConnectionStatusIndicator
