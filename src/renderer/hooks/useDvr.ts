/**
 * Custom hook for DVR (Data Video Recorder) operations.
 * Wraps IPC calls and manages DVR state for time-travel functionality.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDvrStore } from '../stores/dvrStore'
import type { DvrRange, DvrSnapshot, SparklineData } from '@shared/types'

export interface UseDvrReturn {
  // State
  isLive: boolean
  playbackTimestamp: number
  bufferStartTimestamp: number
  bufferEndTimestamp: number
  dataPointCount: number
  isLoading: boolean
  error: string | null

  // Actions
  goLive: () => void
  seek: (timestamp: number, tagIds?: string[]) => Promise<DvrSnapshot | null>
  refreshRange: () => Promise<DvrRange | null>
  getSparkline: (
    tagId: string,
    startTimestamp: number,
    endTimestamp: number,
    maxPoints?: number
  ) => Promise<SparklineData | null>
  clearError: () => void
}

const RANGE_REFRESH_INTERVAL_MS = 5000 // Refresh range every 5 seconds when live

export function useDvr(): UseDvrReturn {
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const isLive = useDvrStore((state) => state.isLive)
  const playbackTimestamp = useDvrStore((state) => state.playbackTimestamp)
  const bufferStartTimestamp = useDvrStore((state) => state.bufferStartTimestamp)
  const bufferEndTimestamp = useDvrStore((state) => state.bufferEndTimestamp)
  const dataPointCount = useDvrStore((state) => state.dataPointCount)

  const setLive = useDvrStore((state) => state.setLive)
  const setRange = useDvrStore((state) => state.setRange)
  const setHistoricalValues = useDvrStore((state) => state.setHistoricalValues)
  const setPlaybackTimestamp = useDvrStore((state) => state.setPlaybackTimestamp)

  const rangeRefreshRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Clear error state.
   */
  const clearError = useCallback(() => {
    setLocalError(null)
  }, [])

  /**
   * Refresh the available data range from the buffer.
   */
  const refreshRange = useCallback(async (): Promise<DvrRange | null> => {
    try {
      const range = await window.electronAPI.dvr.getRange()
      setRange(range)
      return range
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get DVR range'
      console.error('DVR range error:', message)
      return null
    }
  }, [setRange])

  /**
   * Go back to live mode (showing real-time data).
   */
  const goLive = useCallback(() => {
    setLive(true)
    setPlaybackTimestamp(Date.now())
    clearError()
  }, [setLive, setPlaybackTimestamp, clearError])

  /**
   * Seek to a specific timestamp and get the data snapshot.
   */
  const seek = useCallback(
    async (timestamp: number, tagIds?: string[]): Promise<DvrSnapshot | null> => {
      setLocalLoading(true)
      setLocalError(null)

      try {
        const snapshot = await window.electronAPI.dvr.seek({
          timestamp,
          tagIds
        })

        setHistoricalValues(snapshot)
        setLive(false)

        return snapshot
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to seek'
        setLocalError(message)
        return null
      } finally {
        setLocalLoading(false)
      }
    },
    [setHistoricalValues, setLive]
  )

  /**
   * Get sparkline data for a tag within a time range.
   */
  const getSparkline = useCallback(
    async (
      tagId: string,
      startTimestamp: number,
      endTimestamp: number,
      maxPoints = 60
    ): Promise<SparklineData | null> => {
      try {
        const data = await window.electronAPI.dvr.getSparkline({
          tagId,
          startTimestamp,
          endTimestamp,
          maxPoints
        })
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get sparkline'
        console.error('Sparkline error:', message)
        return null
      }
    },
    []
  )

  // Initial range fetch
  useEffect(() => {
    refreshRange()
  }, [refreshRange])

  // Periodic range refresh when in live mode
  useEffect(() => {
    if (isLive) {
      rangeRefreshRef.current = setInterval(() => {
        refreshRange()
      }, RANGE_REFRESH_INTERVAL_MS)
    } else {
      if (rangeRefreshRef.current) {
        clearInterval(rangeRefreshRef.current)
        rangeRefreshRef.current = null
      }
    }

    return () => {
      if (rangeRefreshRef.current) {
        clearInterval(rangeRefreshRef.current)
        rangeRefreshRef.current = null
      }
    }
  }, [isLive, refreshRange])

  return {
    isLive,
    playbackTimestamp,
    bufferStartTimestamp,
    bufferEndTimestamp,
    dataPointCount,
    isLoading: localLoading,
    error: localError,
    goLive,
    seek,
    refreshRange,
    getSparkline,
    clearError
  }
}
