/**
 * AlertNotification Component
 *
 * Toast notification for displaying triggered alerts in-app.
 * Auto-dismisses after timeout and supports acknowledgement.
 */

import React, { useEffect, memo, useState, useCallback } from 'react'
import { AlertCircle, AlertTriangle, Info, X, Check, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { AlertEvent, AlertSeverity } from '@shared/types'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@shared/types'

interface AlertNotificationProps {
  /** Alert event to display */
  event: AlertEvent | null
  /** Whether sound is enabled */
  soundEnabled: boolean
  /** Callback when notification is dismissed */
  onDismiss: () => void
  /** Callback to acknowledge the alert */
  onAcknowledge: (eventId: number) => void
  /** Callback to toggle sound */
  onToggleSound: (enabled: boolean) => void
  /** Auto-dismiss timeout in ms (0 to disable) */
  autoDismissMs?: number
  /** Optional additional className */
  className?: string
}

const SEVERITY_ICONS: Record<AlertSeverity, React.ReactNode> = {
  critical: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />
}

/**
 * Default auto-dismiss timeout per severity.
 */
const DEFAULT_DISMISS_MS: Record<AlertSeverity, number> = {
  critical: 0, // Don't auto-dismiss critical alerts
  warning: 10000, // 10 seconds
  info: 5000 // 5 seconds
}

/**
 * AlertNotification displays in-app toast for triggered alerts.
 */
export const AlertNotification = memo(function AlertNotification({
  event,
  soundEnabled,
  onDismiss,
  onAcknowledge,
  onToggleSound,
  autoDismissMs,
  className
}: AlertNotificationProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Handle entry/exit animations
  useEffect(() => {
    if (event) {
      setIsLeaving(false)
      // Small delay for animation
      const enterTimeout = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(enterTimeout)
    } else {
      setIsVisible(false)
    }
  }, [event])

  // Auto-dismiss
  useEffect(() => {
    if (!event) return

    const dismissTime = autoDismissMs ?? DEFAULT_DISMISS_MS[event.severity]
    if (dismissTime <= 0) return

    const timeout = setTimeout(() => {
      handleDismiss()
    }, dismissTime)

    return () => clearTimeout(timeout)
  }, [event, autoDismissMs])

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 200)
  }, [onDismiss])

  // Handle acknowledge
  const handleAcknowledge = useCallback(() => {
    if (event) {
      onAcknowledge(event.id)
      handleDismiss()
    }
  }, [event, onAcknowledge, handleDismiss])

  if (!event) return null

  const severityColor = SEVERITY_COLORS[event.severity]

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'transition-all duration-200 ease-out',
        isVisible && !isLeaving
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col w-80 max-w-[calc(100vw-2rem)]',
          'bg-card border-l-4 rounded-lg shadow-lg overflow-hidden'
        )}
        style={{ borderLeftColor: severityColor }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
          <div className="flex items-center gap-2">
            <span style={{ color: severityColor }}>{SEVERITY_ICONS[event.severity]}</span>
            <span
              className="text-sm font-semibold"
              style={{ color: severityColor }}
            >
              {SEVERITY_LABELS[event.severity]} Alert
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Sound toggle */}
            <button
              onClick={() => onToggleSound(!soundEnabled)}
              className={cn(
                'p-1 rounded hover:bg-muted transition-colors',
                'text-muted-foreground'
              )}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            {/* Close */}
            <button
              onClick={handleDismiss}
              className={cn(
                'p-1 rounded hover:bg-muted transition-colors',
                'text-muted-foreground hover:text-foreground'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-snug">{event.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Tag: {event.tagRef}</span>
            <span className="opacity-50">|</span>
            <span>Value: {event.triggerValue}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t border-border">
          <button
            onClick={handleDismiss}
            className={cn(
              'px-3 py-1.5 rounded text-sm',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors'
            )}
          >
            Dismiss
          </button>
          <button
            onClick={handleAcknowledge}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Check className="h-4 w-4" />
            Acknowledge
          </button>
        </div>

        {/* Auto-dismiss progress bar (for non-critical) */}
        {(autoDismissMs ?? DEFAULT_DISMISS_MS[event.severity]) > 0 && (
          <div className="h-1 bg-muted">
            <div
              className="h-full transition-all ease-linear"
              style={{
                backgroundColor: severityColor,
                animation: `shrink ${autoDismissMs ?? DEFAULT_DISMISS_MS[event.severity]}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      {/* CSS for progress animation */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
})

/**
 * AlertNotificationStack manages multiple notifications.
 * Shows the most recent alert with a count badge if there are more.
 */
interface AlertNotificationStackProps {
  /** Alert events to display (newest first) */
  events: AlertEvent[]
  /** Whether sound is enabled */
  soundEnabled: boolean
  /** Callback when an event is dismissed */
  onDismiss: (eventId: number) => void
  /** Callback to acknowledge an alert */
  onAcknowledge: (eventId: number) => void
  /** Callback to dismiss all */
  onDismissAll: () => void
  /** Callback to toggle sound */
  onToggleSound: (enabled: boolean) => void
  /** Max number of notifications to show */
  maxVisible?: number
  /** Optional additional className */
  className?: string
}

/**
 * AlertNotificationStack shows stacked alert notifications.
 */
export const AlertNotificationStack = memo(function AlertNotificationStack({
  events,
  soundEnabled,
  onDismiss,
  onAcknowledge,
  onDismissAll,
  onToggleSound,
  maxVisible = 3,
  className
}: AlertNotificationStackProps): React.ReactElement | null {
  const visibleEvents = events.slice(0, maxVisible)
  const hiddenCount = events.length - maxVisible

  if (events.length === 0) return null

  return (
    <div className={cn('fixed bottom-4 right-4 z-50 space-y-2', className)}>
      {/* Hidden count badge */}
      {hiddenCount > 0 && (
        <div className="flex justify-end">
          <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
            +{hiddenCount} more alerts
          </span>
        </div>
      )}

      {/* Visible notifications */}
      {visibleEvents.map((event, index) => (
        <AlertNotification
          key={event.id}
          event={event}
          soundEnabled={soundEnabled}
          onDismiss={() => onDismiss(event.id)}
          onAcknowledge={onAcknowledge}
          onToggleSound={onToggleSound}
          className={cn(
            // Stack effect
            index > 0 && 'opacity-90 scale-95 origin-bottom-right'
          )}
        />
      ))}

      {/* Dismiss all button (when multiple) */}
      {events.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={onDismissAll}
            className={cn(
              'px-3 py-1.5 rounded text-sm',
              'bg-muted text-muted-foreground hover:text-foreground',
              'transition-colors'
            )}
          >
            Dismiss All ({events.length})
          </button>
        </div>
      )}
    </div>
  )
})
