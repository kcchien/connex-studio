/**
 * PollingControls Component
 *
 * Controls for starting/stopping continuous polling with interval configuration.
 * Displays current polling status and statistics.
 */

import React, { useState, useCallback, memo } from 'react'
import { Play, Pause, Settings, Loader2, RefreshCw } from 'lucide-react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@renderer/lib/utils'
import { usePolling } from '@renderer/hooks/usePolling'
import {
  MIN_POLLING_INTERVAL_MS,
  MAX_POLLING_INTERVAL_MS,
  DEFAULT_POLLING_INTERVAL_MS
} from '@shared/types/polling'

interface PollingControlsProps {
  /** Connection ID to control polling for */
  connectionId: string
  /** Tag IDs to poll (empty = all enabled tags) */
  tagIds?: string[]
  /** Optional additional className */
  className?: string
  /** Whether the controls are disabled (e.g., when not connected) */
  disabled?: boolean
  /** Message to show when disabled */
  disabledMessage?: string
}

// Preset intervals for quick selection
const INTERVAL_PRESETS = [
  { label: '100ms', value: 100 },
  { label: '250ms', value: 250 },
  { label: '500ms', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 }
]

/**
 * Format timestamp as relative time (e.g., "2s ago")
 */
function formatRelativeTime(timestamp: number): string {
  if (timestamp === 0) return 'Never'

  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 1) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

/**
 * PollingControls component for managing continuous tag polling.
 */
export const PollingControls = memo(function PollingControls({
  connectionId,
  tagIds = [],
  className,
  disabled = false,
  disabledMessage = 'Connect to enable polling'
}: PollingControlsProps): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_POLLING_INTERVAL_MS)

  const {
    isPolling,
    intervalMs: currentInterval,
    lastPollTimestamp,
    tagCount,
    isLoading,
    error,
    start,
    stop,
    clearError
  } = usePolling(connectionId)

  const handleStart = useCallback(async () => {
    clearError()
    await start(connectionId, tagIds, intervalMs)
  }, [connectionId, tagIds, intervalMs, start, clearError])

  const handleStop = useCallback(async () => {
    clearError()
    await stop(connectionId)
  }, [connectionId, stop, clearError])

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  const handleIntervalChange = useCallback((value: number) => {
    setIntervalMs(Math.min(Math.max(value, MIN_POLLING_INTERVAL_MS), MAX_POLLING_INTERVAL_MS))
  }, [])

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      {/* Main controls */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Start/Stop button */}
        <button
          onClick={isPolling ? handleStop : handleStart}
          disabled={isLoading || disabled}
          className={cn(
            'h-8 px-3 text-sm font-medium rounded-md',
            'flex items-center gap-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            isPolling
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPolling ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>{isPolling ? 'Stop' : 'Start'}</span>
        </button>

        {/* Status display */}
        <div className="flex-1 flex items-center gap-4 text-sm">
          {isPolling && (
            <>
              {/* Polling indicator */}
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-green-500 animate-spin" />
                <span className="text-muted-foreground">Polling</span>
              </div>

              {/* Interval */}
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{currentInterval}ms</span> interval
              </div>

              {/* Tag count */}
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{tagCount}</span> tags
              </div>

              {/* Last poll */}
              <div className="text-muted-foreground">
                Last: <span className="font-medium text-foreground">{formatRelativeTime(lastPollTimestamp)}</span>
              </div>
            </>
          )}

          {!isPolling && !disabled && (
            <span className="text-muted-foreground">Polling stopped</span>
          )}

          {disabled && (
            <span className="text-muted-foreground">{disabledMessage}</span>
          )}
        </div>

        {/* Settings toggle */}
        <button
          onClick={toggleSettings}
          disabled={disabled}
          className={cn(
            'p-2 rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            showSettings && 'bg-muted text-foreground'
          )}
          title="Polling settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 pb-2">
          <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && !isPolling && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <div className="space-y-3">
            {/* Interval selection */}
            <div className="space-y-1.5">
              <Label.Root className="text-xs font-medium text-muted-foreground">
                Polling Interval
              </Label.Root>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1">
                {INTERVAL_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleIntervalChange(preset.value)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md',
                      'transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      intervalMs === preset.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={intervalMs}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  min={MIN_POLLING_INTERVAL_MS}
                  max={MAX_POLLING_INTERVAL_MS}
                  step={100}
                  className={cn(
                    'w-24 h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                />
                <span className="text-xs text-muted-foreground">ms</span>
                <span className="text-xs text-muted-foreground">
                  (min: {MIN_POLLING_INTERVAL_MS}ms, max: {MAX_POLLING_INTERVAL_MS / 1000}s)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info when polling is active */}
      {showSettings && isPolling && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Stop polling to change settings
          </p>
        </div>
      )}
    </div>
  )
})
