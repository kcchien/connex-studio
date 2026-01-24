/**
 * PlaybackControls Component
 *
 * Controls for DVR playback including Live/Historical toggle,
 * step forward/backward, and go-to-live button.
 */

import React, { useCallback, memo } from 'react'
import { Play, Pause, SkipBack, SkipForward, Radio, History } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface PlaybackControlsProps {
  /** Whether currently showing live data */
  isLive: boolean
  /** Current playback timestamp */
  playbackTimestamp: number
  /** End of available range (now) */
  bufferEnd: number
  /** Start of available range */
  bufferStart: number
  /** Callback to go to live mode */
  onGoLive: () => void
  /** Callback to seek to a timestamp */
  onSeek: (timestamp: number) => void
  /** Step size in milliseconds for skip buttons */
  stepMs?: number
  /** Whether controls are disabled */
  disabled?: boolean
  /** Optional additional className */
  className?: string
}

const DEFAULT_STEP_MS = 10000 // 10 seconds

/**
 * PlaybackControls for DVR time-travel.
 */
export const PlaybackControls = memo(function PlaybackControls({
  isLive,
  playbackTimestamp,
  bufferEnd,
  bufferStart,
  onGoLive,
  onSeek,
  stepMs = DEFAULT_STEP_MS,
  disabled = false,
  className
}: PlaybackControlsProps): React.ReactElement {
  const hasData = bufferEnd > bufferStart

  // Step backward
  const handleStepBack = useCallback(() => {
    if (!hasData) return
    const newTimestamp = Math.max(playbackTimestamp - stepMs, bufferStart)
    onSeek(newTimestamp)
  }, [hasData, playbackTimestamp, stepMs, bufferStart, onSeek])

  // Step forward
  const handleStepForward = useCallback(() => {
    if (!hasData) return
    const newTimestamp = Math.min(playbackTimestamp + stepMs, bufferEnd)

    // If stepping to end, go live
    if (newTimestamp >= bufferEnd - 1000) {
      onGoLive()
    } else {
      onSeek(newTimestamp)
    }
  }, [hasData, playbackTimestamp, stepMs, bufferEnd, onSeek, onGoLive])

  // Enter historical mode at current position
  const handleEnterHistorical = useCallback(() => {
    if (!hasData) return
    onSeek(bufferEnd - stepMs) // Start 10s in the past
  }, [hasData, bufferEnd, stepMs, onSeek])

  // Can step backward?
  const canStepBack = hasData && !isLive && playbackTimestamp > bufferStart

  // Can step forward?
  const canStepForward = hasData && !isLive && playbackTimestamp < bufferEnd

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mode indicator and toggle */}
      <button
        onClick={isLive ? handleEnterHistorical : onGoLive}
        disabled={disabled || !hasData}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isLive
            ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
            : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
        )}
        title={isLive ? 'Switch to historical mode' : 'Go to live'}
      >
        {isLive ? (
          <>
            <Radio className="h-4 w-4" />
            <span>LIVE</span>
          </>
        ) : (
          <>
            <History className="h-4 w-4" />
            <span>HISTORICAL</span>
          </>
        )}
      </button>

      {/* Skip controls - only show in historical mode */}
      {!isLive && (
        <div className="flex items-center gap-1">
          <button
            onClick={handleStepBack}
            disabled={disabled || !canStepBack}
            className={cn(
              'p-2 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={`Skip back ${stepMs / 1000}s`}
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={handleStepForward}
            disabled={disabled || !canStepForward}
            className={cn(
              'p-2 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={`Skip forward ${stepMs / 1000}s`}
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Go to Live button - only show in historical mode */}
      {!isLive && (
        <button
          onClick={onGoLive}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium',
            'bg-green-500 text-white',
            'hover:bg-green-600 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Play className="h-3.5 w-3.5" />
          <span>Go Live</span>
        </button>
      )}
    </div>
  )
})
