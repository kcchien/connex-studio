/**
 * AlertHistory Component
 *
 * Displays alert event history with filtering, pagination, and acknowledgement.
 * Shows severity badges, timestamps, and acknowledgement status.
 */

import React, { useState, useCallback, memo } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Filter,
  ChevronDown
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { AlertEvent, AlertSeverity, AlertEventQuery } from '@shared/types'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@shared/types'

interface AlertHistoryProps {
  /** Alert events to display */
  events: AlertEvent[]
  /** Total number of events */
  total: number
  /** Whether there are more events to load */
  hasMore: boolean
  /** Whether data is loading */
  isLoading: boolean
  /** Unacknowledged counts by severity */
  unacknowledgedCounts: Record<AlertSeverity, number>
  /** Callback to acknowledge single event */
  onAcknowledge: (eventId: number) => void
  /** Callback to acknowledge all events */
  onAcknowledgeAll: (severity?: AlertSeverity) => void
  /** Callback to load more events */
  onLoadMore: () => void
  /** Callback to refresh/query events */
  onQuery: (query: AlertEventQuery) => void
  /** Callback to clear history */
  onClearHistory: (before?: number) => void
  /** Optional additional className */
  className?: string
}

const SEVERITY_ICONS: Record<AlertSeverity, React.ReactNode> = {
  critical: <AlertCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />
}

/**
 * Format timestamp to readable string.
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString()
  }
  return date.toLocaleString()
}

/**
 * Format relative time.
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * AlertHistory displays and manages alert event history.
 */
export const AlertHistory = memo(function AlertHistory({
  events,
  total,
  hasMore,
  isLoading,
  unacknowledgedCounts,
  onAcknowledge,
  onAcknowledgeAll,
  onLoadMore,
  onQuery,
  onClearHistory,
  className
}: AlertHistoryProps): React.ReactElement {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | null>(null)
  const [showAcknowledged, setShowAcknowledged] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const totalUnacknowledged =
    unacknowledgedCounts.critical +
    unacknowledgedCounts.warning +
    unacknowledgedCounts.info

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    const query: AlertEventQuery = {
      limit: 50,
      offset: 0
    }
    if (severityFilter) {
      query.severity = severityFilter
    }
    if (!showAcknowledged) {
      query.acknowledged = false
    }
    onQuery(query)
    setIsFilterOpen(false)
  }, [severityFilter, showAcknowledged, onQuery])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSeverityFilter(null)
    setShowAcknowledged(true)
    onQuery({ limit: 50, offset: 0 })
    setIsFilterOpen(false)
  }, [onQuery])

  // Handle clear history
  const handleClearHistory = useCallback(() => {
    if (window.confirm('Clear all alert history? This cannot be undone.')) {
      onClearHistory()
    }
  }, [onClearHistory])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-foreground">Alert History</h3>
          {totalUnacknowledged > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
              {totalUnacknowledged} unread
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
                'border border-border hover:bg-muted transition-colors',
                (severityFilter || !showAcknowledged) && 'border-primary'
              )}
            >
              <Filter className="h-4 w-4" />
              Filter
              <ChevronDown className="h-3 w-3" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-md shadow-lg z-10">
                <div className="p-3 space-y-3">
                  {/* Severity filter */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Severity
                    </label>
                    <select
                      value={severityFilter ?? ''}
                      onChange={(e) =>
                        setSeverityFilter(
                          e.target.value ? (e.target.value as AlertSeverity) : null
                        )
                      }
                      className={cn(
                        'w-full px-2 py-1 rounded text-sm',
                        'bg-background border border-input'
                      )}
                    >
                      <option value="">All severities</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>

                  {/* Show acknowledged */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAcknowledged}
                      onChange={(e) => setShowAcknowledged(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">Show acknowledged</span>
                  </label>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button
                      onClick={handleClearFilters}
                      className="flex-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Acknowledge all */}
          {totalUnacknowledged > 0 && (
            <button
              onClick={() => onAcknowledgeAll()}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <CheckCheck className="h-4 w-4" />
              Ack All
            </button>
          )}

          {/* Clear history */}
          <button
            onClick={handleClearHistory}
            className={cn(
              'p-1.5 rounded-md',
              'text-muted-foreground hover:text-destructive',
              'hover:bg-muted transition-colors'
            )}
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={() => onQuery({ limit: 50, offset: 0 })}
            disabled={isLoading}
            className={cn(
              'p-1.5 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors',
              'disabled:opacity-50'
            )}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Severity quick filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        {(['critical', 'warning', 'info'] as AlertSeverity[]).map((sev) => (
          <button
            key={sev}
            onClick={() => {
              setSeverityFilter(severityFilter === sev ? null : sev)
              onQuery({
                limit: 50,
                offset: 0,
                severity: severityFilter === sev ? undefined : sev,
                acknowledged: showAcknowledged ? undefined : false
              })
            }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
              'transition-colors',
              severityFilter === sev ? 'ring-2 ring-offset-1' : 'hover:bg-muted'
            )}
            style={{
              backgroundColor: `${SEVERITY_COLORS[sev]}15`,
              color: SEVERITY_COLORS[sev],
              ...(severityFilter === sev && { ringColor: SEVERITY_COLORS[sev] })
            }}
          >
            {SEVERITY_ICONS[sev]}
            {SEVERITY_LABELS[sev]}
            {unacknowledgedCounts[sev] > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-black/10 rounded-full">
                {unacknowledgedCounts[sev]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-2 opacity-30" />
            <p>No alert events</p>
            {(severityFilter || !showAcknowledged) && (
              <button
                onClick={handleClearFilters}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 transition-colors',
                  !event.acknowledged && 'bg-muted/30'
                )}
              >
                {/* Severity icon */}
                <div
                  className="mt-0.5"
                  style={{ color: SEVERITY_COLORS[event.severity] }}
                >
                  {SEVERITY_ICONS[event.severity]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span title={formatTimestamp(event.timestamp)}>
                      {formatRelativeTime(event.timestamp)}
                    </span>
                    <span className="opacity-50">|</span>
                    <span>Value: {event.triggerValue}</span>
                    {event.acknowledged && event.acknowledgedAt && (
                      <>
                        <span className="opacity-50">|</span>
                        <span className="text-green-600">
                          Ack'd {formatRelativeTime(event.acknowledgedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Acknowledge button */}
                {!event.acknowledged && (
                  <button
                    onClick={() => onAcknowledge(event.id)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs',
                      'bg-muted hover:bg-primary hover:text-primary-foreground',
                      'transition-colors'
                    )}
                    title="Acknowledge"
                  >
                    <Check className="h-3 w-3" />
                    Ack
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load more / pagination info */}
      {events.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>
            Showing {events.length} of {total} events
          </span>
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className={cn(
                'px-3 py-1 rounded text-sm',
                'bg-muted hover:bg-muted/80',
                'disabled:opacity-50'
              )}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  )
})
