/**
 * TimelineSlider Component
 *
 * A draggable timeline for scrubbing through historical data.
 * Shows the available time range and current playback position.
 */

import React, { useCallback, useMemo, memo } from 'react'
import { cn } from '@renderer/lib/utils'

interface TimelineSliderProps {
  /** Start of available range (timestamp ms) */
  rangeStart: number
  /** End of available range (timestamp ms) */
  rangeEnd: number
  /** Current playback position (timestamp ms) */
  value: number
  /** Whether currently in live mode */
  isLive: boolean
  /** Callback when user drags to a new position */
  onChange: (timestamp: number) => void
  /** Callback when user finishes dragging */
  onChangeEnd?: (timestamp: number) => void
  /** Optional additional className */
  className?: string
}

/**
 * Format timestamp as time string (HH:MM:SS).
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format duration as relative time (e.g., "2m 30s ago").
 */
function formatRelative(timestamp: number, now: number): string {
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s ago`
  }
  return `${seconds}s ago`
}

/**
 * TimelineSlider for DVR time-travel functionality.
 */
export const TimelineSlider = memo(function TimelineSlider({
  rangeStart,
  rangeEnd,
  value,
  isLive,
  onChange,
  onChangeEnd,
  className
}: TimelineSliderProps): React.ReactElement {
  const duration = rangeEnd - rangeStart
  const hasData = duration > 0

  // Calculate percentage position
  const percentage = useMemo(() => {
    if (!hasData) return 100
    return ((value - rangeStart) / duration) * 100
  }, [value, rangeStart, duration, hasData])

  // Handle slider change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!hasData) return

      const percent = parseFloat(e.target.value)
      const timestamp = rangeStart + (percent / 100) * duration
      onChange(Math.round(timestamp))
    },
    [rangeStart, duration, hasData, onChange]
  )

  // Handle change end (mouse up / touch end)
  const handleChangeEnd = useCallback(
    (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      if (!hasData || !onChangeEnd) return

      const target = e.target as HTMLInputElement
      const percent = parseFloat(target.value)
      const timestamp = rangeStart + (percent / 100) * duration
      onChangeEnd(Math.round(timestamp))
    },
    [rangeStart, duration, hasData, onChangeEnd]
  )

  if (!hasData) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex items-center justify-center h-8 text-sm text-muted-foreground">
          No historical data available
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Time labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatTime(rangeStart)}</span>
        <span
          className={cn(
            'font-medium',
            isLive ? 'text-green-500' : 'text-amber-500'
          )}
        >
          {isLive ? 'LIVE' : formatTime(value)}
        </span>
        <span>{formatTime(rangeEnd)}</span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={percentage}
          onChange={handleChange}
          onMouseUp={handleChangeEnd}
          onTouchEnd={handleChangeEnd}
          disabled={!hasData}
          className={cn(
            'w-full h-2 appearance-none rounded-full cursor-pointer',
            'bg-muted',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            isLive
              ? '[&::-webkit-slider-thumb]:bg-green-500'
              : '[&::-webkit-slider-thumb]:bg-amber-500',
            '[&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:cursor-pointer',
            isLive
              ? '[&::-moz-range-thumb]:bg-green-500'
              : '[&::-moz-range-thumb]:bg-amber-500',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        />

        {/* Progress fill */}
        <div
          className={cn(
            'absolute top-0 left-0 h-2 rounded-full pointer-events-none',
            isLive ? 'bg-green-500/30' : 'bg-amber-500/30'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Relative time */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatRelative(rangeStart, rangeEnd)}</span>
        <span>Now</span>
      </div>
    </div>
  )
})
