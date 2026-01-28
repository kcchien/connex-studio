/**
 * ConnectionStatusBar - Display connection health metrics.
 *
 * Features:
 * - Latency display with color coding (green/yellow/red)
 * - Average latency tracking
 * - Request count with comma formatting
 * - Conditional error count display
 */

import React from 'react'
import { cn } from '@renderer/lib/utils'
import { Clock, Activity, CheckCircle, AlertTriangle } from 'lucide-react'
import type { ConnectionMetrics } from '@shared/types'
import { METRIC_THRESHOLDS } from '@shared/types'

export interface ConnectionStatusBarProps {
  metrics: ConnectionMetrics
  className?: string
}

/**
 * Get the color class based on latency value and thresholds.
 */
function getLatencyColorClass(latencyMs: number): string {
  if (latencyMs >= METRIC_THRESHOLDS.latency.alarm) {
    return 'text-red-500'
  }
  if (latencyMs >= METRIC_THRESHOLDS.latency.warning) {
    return 'text-yellow-500'
  }
  return 'text-green-500'
}

/**
 * Get the color class based on error rate and thresholds.
 */
function getErrorColorClass(errorRate: number): string {
  if (errorRate >= METRIC_THRESHOLDS.errorRate.alarm) {
    return 'text-red-500'
  }
  if (errorRate >= METRIC_THRESHOLDS.errorRate.warning) {
    return 'text-yellow-500'
  }
  return 'text-green-500'
}

export function ConnectionStatusBar({
  metrics,
  className
}: ConnectionStatusBarProps): React.ReactElement {
  const latencyColorClass = getLatencyColorClass(metrics.latencyMs)
  const errorColorClass = getErrorColorClass(metrics.errorRate)

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-2',
        'bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700',
        'text-sm',
        className
      )}
      data-testid="connection-status-bar"
    >
      {/* Response Time - Current */}
      <div className="flex items-center gap-1.5" data-testid="latency-display">
        <Clock className={cn('w-4 h-4', latencyColorClass)} />
        <span className="text-gray-500 dark:text-gray-400">Response:</span>
        <span className={latencyColorClass}>
          {metrics.latencyMs}ms
        </span>
      </div>

      {/* Response Time - Average */}
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <Activity className="w-4 h-4" />
        <span>Avg: {metrics.latencyAvgMs}ms</span>
      </div>

      {/* Request Count */}
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span>{metrics.requestCount.toLocaleString()} requests</span>
      </div>

      {/* Error Count (conditional) */}
      {metrics.errorCount > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className={cn('w-4 h-4', errorColorClass)} />
          <span className={errorColorClass}>
            {metrics.errorCount} errors ({(metrics.errorRate * 100).toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}
