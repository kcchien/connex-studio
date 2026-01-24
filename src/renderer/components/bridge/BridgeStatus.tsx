/**
 * BridgeStatus Component
 *
 * Displays real-time status and statistics for a bridge.
 * Shows status indicator, message counts, and error information.
 */

import React, { memo, useMemo } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  XCircle,
  Zap
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Bridge, BridgeStatus as BridgeStatusType, BridgeStats } from '@shared/types'

interface BridgeStatusProps {
  /** The bridge to display */
  bridge: Bridge
  /** Bridge statistics (optional) */
  stats?: BridgeStats
  /** Whether to show detailed view */
  detailed?: boolean
  /** Optional additional className */
  className?: string
}

interface StatusBadgeProps {
  status: BridgeStatusType
  size?: 'sm' | 'md'
}

const StatusBadge = memo(function StatusBadge({
  status,
  size = 'md'
}: StatusBadgeProps): React.ReactElement {
  const config = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          icon: PlayCircle,
          label: 'Active',
          className: 'text-green-500 bg-green-500/10'
        }
      case 'paused':
        return {
          icon: PauseCircle,
          label: 'Paused',
          className: 'text-yellow-500 bg-yellow-500/10'
        }
      case 'error':
        return {
          icon: XCircle,
          label: 'Error',
          className: 'text-destructive bg-destructive/10'
        }
      case 'idle':
      default:
        return {
          icon: Clock,
          label: 'Idle',
          className: 'text-muted-foreground bg-muted'
        }
    }
  }, [status])

  const Icon = config.icon
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        padding,
        textSize,
        'font-medium',
        config.className
      )}
    >
      <Icon className={iconSize} />
      <span>{config.label}</span>
    </div>
  )
})

interface StatItemProps {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const StatItem = memo(function StatItem({
  icon: Icon,
  label,
  value,
  subValue,
  variant = 'default'
}: StatItemProps): React.ReactElement {
  const variantClasses = {
    default: 'text-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-destructive'
  }

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-sm font-medium', variantClasses[variant])}>
          {value}
          {subValue && (
            <span className="text-xs text-muted-foreground ml-1">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format uptime to human readable string.
 */
function formatUptime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

/**
 * BridgeStatus for displaying bridge state and statistics.
 */
export const BridgeStatus = memo(function BridgeStatus({
  bridge,
  stats,
  detailed = false,
  className
}: BridgeStatusProps): React.ReactElement {
  const displayStats = stats ?? {
    bridgeId: bridge.id,
    status: bridge.status,
    messagesForwarded: 0,
    messagesDropped: 0,
    bytesTransferred: 0,
    errorCount: 0,
    uptime: 0
  }

  // Compact view
  if (!detailed) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <StatusBadge status={bridge.status} size="sm" />
        {bridge.status === 'active' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRightLeft className="h-3 w-3" />
            <span>{displayStats.messagesForwarded} msgs</span>
          </div>
        )}
        {displayStats.errorCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{displayStats.errorCount}</span>
          </div>
        )}
      </div>
    )
  }

  // Detailed view
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">{bridge.name}</h4>
          <div className="text-xs text-muted-foreground">
            {bridge.sourceTags.length} tags mapped
          </div>
        </div>
        <StatusBadge status={bridge.status} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatItem
          icon={ArrowRightLeft}
          label="Messages Forwarded"
          value={displayStats.messagesForwarded.toLocaleString()}
          variant="success"
        />

        <StatItem
          icon={Zap}
          label="Data Transferred"
          value={formatBytes(displayStats.bytesTransferred)}
        />

        <StatItem
          icon={Activity}
          label="Uptime"
          value={formatUptime(displayStats.uptime)}
        />

        <StatItem
          icon={AlertCircle}
          label="Errors"
          value={displayStats.errorCount}
          variant={displayStats.errorCount > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Dropped messages warning */}
      {displayStats.messagesDropped > 0 && (
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-md',
          'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
        )}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            {displayStats.messagesDropped} messages dropped (buffer overflow)
          </span>
        </div>
      )}

      {/* Last error */}
      {displayStats.lastError && (
        <div className={cn(
          'flex items-start gap-2 p-2 rounded-md',
          'bg-destructive/10 text-destructive'
        )}>
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Last Error</div>
            <div className="text-xs break-words">{displayStats.lastError}</div>
          </div>
        </div>
      )}

      {/* Last forwarded */}
      {displayStats.lastForwardedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          <span>
            Last forwarded:{' '}
            {new Date(displayStats.lastForwardedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
})

/**
 * BridgeStatusCard - Card wrapper for BridgeStatus.
 */
export const BridgeStatusCard = memo(function BridgeStatusCard({
  bridge,
  stats,
  onClick,
  className
}: BridgeStatusProps & {
  onClick?: () => void
}): React.ReactElement {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border border-border bg-card',
        onClick && 'cursor-pointer hover:border-primary/50 transition-colors',
        className
      )}
    >
      <BridgeStatus bridge={bridge} stats={stats} detailed />
    </div>
  )
})
