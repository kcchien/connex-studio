/**
 * OpcUaEventViewer - Display and manage OPC UA events (alarms & conditions).
 *
 * Features:
 * - Subscribe to events from a source node (T132)
 * - Event filter configuration (T133)
 * - Real-time event display (T134)
 * - Acknowledge/Confirm conditions (T135)
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  AlertCircle,
  Loader2,
  Trash2,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useOpcUa } from '@renderer/hooks/useOpcUa'
import type { OpcUaEvent, SubscribeEventsRequest, EventFilter } from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface OpcUaEventViewerProps {
  connectionId: string
  sourceNodeId?: string
  className?: string
}

interface EventSubscriptionState {
  subscriptionId: string | null
  isSubscribed: boolean
  sourceNodeId: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSeverityIcon(severity: number): React.ReactNode {
  if (severity >= 800) {
    return <AlertCircle className="h-4 w-4 text-red-500" />
  } else if (severity >= 500) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  } else if (severity >= 200) {
    return <Info className="h-4 w-4 text-blue-500" />
  }
  return <Info className="h-4 w-4 text-gray-500" />
}

function getSeverityLabel(severity: number): string {
  if (severity >= 800) return 'Critical'
  if (severity >= 500) return 'Warning'
  if (severity >= 200) return 'Info'
  return 'Low'
}

function getSeverityColor(severity: number): string {
  if (severity >= 800) return 'bg-red-500/10 text-red-700 border-red-500/20'
  if (severity >= 500) return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  if (severity >= 200) return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
  return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

// =============================================================================
// Badge Component
// =============================================================================

function Badge({
  children,
  variant = 'default',
  className
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'
  className?: string
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border text-foreground',
        variant === 'success' && 'bg-green-500/10 text-green-700',
        variant === 'warning' && 'bg-amber-500/10 text-amber-700',
        variant === 'danger' && 'bg-red-500/10 text-red-700',
        className
      )}
    >
      {children}
    </span>
  )
}

// =============================================================================
// EventRow Component
// =============================================================================

interface EventRowProps {
  event: OpcUaEvent
  onAcknowledge: (event: OpcUaEvent) => void
  onConfirm: (event: OpcUaEvent) => void
  isLoading: boolean
}

function EventRow({
  event,
  onAcknowledge,
  onConfirm,
  isLoading
}: EventRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('border-b border-border', getSeverityColor(event.severity))}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="p-0.5">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {getSeverityIcon(event.severity)}
        <span className="text-sm font-medium flex-1 truncate">{event.message}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTimestamp(event.time)}
        </span>
        {event.conditionId && (
          <div className="flex items-center gap-1">
            {!event.acknowledged && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAcknowledge(event)
                }}
                disabled={isLoading}
                className="p-1 rounded hover:bg-muted disabled:opacity-50"
                title="Acknowledge"
              >
                <Check className="h-4 w-4 text-amber-500" />
              </button>
            )}
            {event.acknowledged && !event.confirmed && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm(event)
                }}
                disabled={isLoading}
                className="p-1 rounded hover:bg-muted disabled:opacity-50"
                title="Confirm"
              >
                <CheckCheck className="h-4 w-4 text-green-500" />
              </button>
            )}
            {event.confirmed && (
              <Badge variant="success">Confirmed</Badge>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-10 py-2 bg-muted/30 text-sm space-y-1">
          <div className="flex gap-4">
            <span className="text-muted-foreground w-24">Event ID:</span>
            <span className="font-mono text-xs">{event.eventId}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-muted-foreground w-24">Event Type:</span>
            <span>{event.eventType}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-muted-foreground w-24">Source:</span>
            <span className="font-mono text-xs">{event.sourceNodeId}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-muted-foreground w-24">Source Name:</span>
            <span>{event.sourceName}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-muted-foreground w-24">Severity:</span>
            <Badge className={getSeverityColor(event.severity)}>
              {event.severity} ({getSeverityLabel(event.severity)})
            </Badge>
          </div>
          <div className="flex gap-4">
            <span className="text-muted-foreground w-24">Receive Time:</span>
            <span>{formatTimestamp(event.receiveTime)}</span>
          </div>
          {event.conditionId && (
            <>
              <div className="flex gap-4">
                <span className="text-muted-foreground w-24">Condition ID:</span>
                <span className="font-mono text-xs">{event.conditionId}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-muted-foreground w-24">Status:</span>
                <div className="flex gap-1">
                  <Badge variant={event.acknowledged ? 'success' : 'warning'}>
                    {event.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
                  </Badge>
                  {event.acknowledged && (
                    <Badge variant={event.confirmed ? 'success' : 'secondary'}>
                      {event.confirmed ? 'Confirmed' : 'Unconfirmed'}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// FilterPanel Component
// =============================================================================

interface FilterPanelProps {
  onApply: (eventTypes?: string[], minSeverity?: number) => void
  onClose: () => void
}

function FilterPanel({ onApply, onClose }: FilterPanelProps): React.ReactElement {
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [minSeverity, setMinSeverity] = useState<number>(0)
  const [eventTypeInput, setEventTypeInput] = useState('')

  const handleAddEventType = useCallback(() => {
    if (eventTypeInput && !eventTypes.includes(eventTypeInput)) {
      setEventTypes([...eventTypes, eventTypeInput])
      setEventTypeInput('')
    }
  }, [eventTypeInput, eventTypes])

  const handleRemoveEventType = useCallback((type: string) => {
    setEventTypes(eventTypes.filter((t) => t !== type))
  }, [eventTypes])

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4">
      <h4 className="text-sm font-medium">Event Filters</h4>

      <div>
        <label className="text-xs text-muted-foreground">Event Types (optional)</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={eventTypeInput}
            onChange={(e) => setEventTypeInput(e.target.value)}
            placeholder="e.g., AlarmConditionType"
            className="flex-1 px-2 py-1 text-sm border rounded"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEventType()}
          />
          <button
            onClick={handleAddEventType}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Add
          </button>
        </div>
        {eventTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {eventTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {type}
                <button
                  onClick={() => handleRemoveEventType(type)}
                  className="ml-1 hover:text-destructive"
                >
                  &times;
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Minimum Severity</label>
        <select
          value={minSeverity}
          onChange={(e) => setMinSeverity(Number(e.target.value))}
          className="w-full px-2 py-1 text-sm border rounded mt-1"
        >
          <option value={0}>All Events</option>
          <option value={200}>Info and above (200+)</option>
          <option value={500}>Warning and above (500+)</option>
          <option value={800}>Critical only (800+)</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onApply(eventTypes.length > 0 ? eventTypes : undefined, minSeverity || undefined)
            onClose()
          }}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// OpcUaEventViewer Component
// =============================================================================

export function OpcUaEventViewer({
  connectionId,
  sourceNodeId: initialSourceNodeId,
  className
}: OpcUaEventViewerProps): React.ReactElement {
  const {
    subscribeEvents,
    unsubscribeEvents,
    acknowledgeCondition,
    confirmCondition,
    events,
    clearEvents,
    isLoading,
    error
  } = useOpcUa()

  const [subscription, setSubscription] = useState<EventSubscriptionState>({
    subscriptionId: null,
    isSubscribed: false,
    sourceNodeId: initialSourceNodeId || 'i=2253' // Server node by default
  })
  const [showFilter, setShowFilter] = useState(false)
  const [filterConfig, setFilterConfig] = useState<{
    eventTypes?: string[]
    minSeverity?: number
  }>({})

  // Filter events based on current config
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterConfig.minSeverity && event.severity < filterConfig.minSeverity) {
        return false
      }
      if (filterConfig.eventTypes && filterConfig.eventTypes.length > 0) {
        if (!filterConfig.eventTypes.includes(event.eventType)) {
          return false
        }
      }
      return true
    })
  }, [events, filterConfig])

  const handleSubscribe = useCallback(async () => {
    const request: SubscribeEventsRequest = {
      connectionId,
      sourceNodeId: subscription.sourceNodeId,
      eventTypes: filterConfig.eventTypes
    }

    const result = await subscribeEvents(request)
    if (result) {
      setSubscription((prev) => ({
        ...prev,
        subscriptionId: result.subscriptionId,
        isSubscribed: true
      }))
    }
  }, [connectionId, subscription.sourceNodeId, filterConfig.eventTypes, subscribeEvents])

  const handleUnsubscribe = useCallback(async () => {
    if (subscription.subscriptionId) {
      const success = await unsubscribeEvents(connectionId, subscription.subscriptionId)
      if (success) {
        setSubscription((prev) => ({
          ...prev,
          subscriptionId: null,
          isSubscribed: false
        }))
      }
    }
  }, [connectionId, subscription.subscriptionId, unsubscribeEvents])

  const handleAcknowledge = useCallback(
    async (event: OpcUaEvent) => {
      if (!event.conditionId) return
      await acknowledgeCondition({
        connectionId,
        conditionId: event.conditionId,
        eventId: event.eventId
      })
    },
    [connectionId, acknowledgeCondition]
  )

  const handleConfirm = useCallback(
    async (event: OpcUaEvent) => {
      if (!event.conditionId) return
      await confirmCondition({
        connectionId,
        conditionId: event.conditionId,
        eventId: event.eventId
      })
    },
    [connectionId, confirmCondition]
  )

  const handleApplyFilter = useCallback((eventTypes?: string[], minSeverity?: number) => {
    setFilterConfig({ eventTypes, minSeverity })
  }, [])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-medium">OPC UA Events</h3>
          {subscription.isSubscribed && (
            <Badge variant="success">Subscribed</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              'p-1.5 rounded hover:bg-muted',
              showFilter && 'bg-muted'
            )}
            title="Filter Events"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={clearEvents}
            className="p-1.5 rounded hover:bg-muted"
            title="Clear Events"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {subscription.isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Unsubscribe
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Subscribe
            </button>
          )}
        </div>
      </div>

      {/* Source Node Input */}
      {!subscription.isSubscribed && (
        <div className="p-3 border-b bg-muted/30">
          <label className="text-xs text-muted-foreground">Source Node ID</label>
          <input
            type="text"
            value={subscription.sourceNodeId}
            onChange={(e) =>
              setSubscription((prev) => ({ ...prev, sourceNodeId: e.target.value }))
            }
            placeholder="e.g., i=2253 (Server)"
            className="w-full px-2 py-1 text-sm border rounded mt-1 font-mono"
          />
        </div>
      )}

      {/* Filter Panel */}
      {showFilter && (
        <div className="p-3 border-b">
          <FilterPanel
            onApply={handleApplyFilter}
            onClose={() => setShowFilter(false)}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm border-b">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Clock className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No events received</p>
            {!subscription.isSubscribed && (
              <p className="text-xs mt-1">Subscribe to start receiving events</p>
            )}
          </div>
        ) : (
          <div>
            {filteredEvents
              .slice()
              .reverse()
              .map((event, index) => (
                <EventRow
                  key={`${event.eventId}-${index}`}
                  event={event}
                  onAcknowledge={handleAcknowledge}
                  onConfirm={handleConfirm}
                  isLoading={isLoading}
                />
              ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>{filteredEvents.length} events</span>
        {filterConfig.eventTypes?.length || filterConfig.minSeverity ? (
          <span className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Filters active
          </span>
        ) : null}
      </div>
    </div>
  )
}
