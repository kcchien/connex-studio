/**
 * ModeIndicator Component
 *
 * Visual indicator showing whether the app is displaying
 * live data or historical data from the DVR buffer.
 */

import React, { memo } from 'react'
import { Radio, History, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface ModeIndicatorProps {
  /** Whether currently in live mode */
  isLive: boolean
  /** Current playback timestamp (for historical mode) */
  playbackTimestamp?: number
  /** Whether there's an error */
  hasError?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * Format timestamp as readable date/time string.
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * ModeIndicator shows the current DVR mode (Live or Historical).
 */
export const ModeIndicator = memo(function ModeIndicator({
  isLive,
  playbackTimestamp,
  hasError = false,
  className
}: ModeIndicatorProps): React.ReactElement {
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          'bg-red-500/20 text-red-500',
          className
        )}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Error</span>
      </div>
    )
  }

  if (isLive) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          'bg-green-500/20 text-green-500',
          className
        )}
      >
        <Radio className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-medium">LIVE</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-amber-500/20 text-amber-500',
        className
      )}
    >
      <History className="h-4 w-4" />
      <div className="flex flex-col">
        <span className="text-sm font-medium">HISTORICAL</span>
        {playbackTimestamp && (
          <span className="text-xs opacity-80">
            {formatTimestamp(playbackTimestamp)}
          </span>
        )}
      </div>
    </div>
  )
})
