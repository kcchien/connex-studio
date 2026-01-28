/**
 * Custom hook for polling operations with loading/error state management.
 * Wraps IPC calls and manages polling lifecycle.
 */

import { useState, useCallback, useEffect } from 'react'
import type { PollingStatus, PollingDataPayload, PollingStatusChangedPayload } from '@shared/types/polling'
import { useTagStore } from '../stores/tagStore'

export interface UsePollingReturn {
  // State
  isPolling: boolean
  intervalMs: number
  lastPollTimestamp: number
  tagCount: number
  isLoading: boolean
  error: string | null

  // Operations
  start: (connectionId: string, tagIds?: string[], intervalMs?: number) => Promise<boolean>
  stop: (connectionId: string) => Promise<boolean>
  refreshStatus: (connectionId: string) => Promise<void>
  clearError: () => void
}

const DEFAULT_INTERVAL_MS = 1000

export function usePolling(connectionId?: string): UsePollingReturn {
  const [status, setStatus] = useState<PollingStatus>({
    isPolling: false,
    intervalMs: 0,
    lastPollTimestamp: 0,
    tagCount: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePollingData = useTagStore((state) => state.handlePollingData)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Refresh polling status for a connection.
   */
  const refreshStatus = useCallback(async (connId: string) => {
    try {
      const result = await window.electronAPI.polling.status(connId)
      setStatus(result)
    } catch (err) {
      console.error('Failed to get polling status:', err)
    }
  }, [])

  /**
   * Start polling for a connection.
   */
  const start = useCallback(
    async (
      connId: string,
      tagIds: string[] = [],
      intervalMs: number = DEFAULT_INTERVAL_MS
    ): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await window.electronAPI.polling.start({
          connectionId: connId,
          tagIds,
          intervalMs
        })

        if (!result.success) {
          setError(result.error || 'Failed to start polling')
          return false
        }

        // Refresh status
        await refreshStatus(connId)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start polling'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [refreshStatus]
  )

  /**
   * Stop polling for a connection.
   */
  const stop = useCallback(
    async (connId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await window.electronAPI.polling.stop(connId)

        if (!result.success) {
          setError(result.error || 'Failed to stop polling')
          return false
        }

        // Refresh status
        await refreshStatus(connId)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to stop polling'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [refreshStatus]
  )

  // Subscribe to polling data events
  useEffect(() => {
    const unsubscribe = window.electronAPI.polling.onData((payload: PollingDataPayload) => {
      // Only handle data for our connection
      if (!connectionId || payload.connectionId === connectionId) {
        handlePollingData(payload)

        // Update local status
        setStatus((prev) => ({
          ...prev,
          lastPollTimestamp: payload.timestamp,
          tagCount: payload.values.length
        }))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [connectionId, handlePollingData])

  // Subscribe to polling status change events (handles passive stops like disconnect)
  useEffect(() => {
    const unsubscribe = window.electronAPI.polling.onStatusChanged((payload: PollingStatusChangedPayload) => {
      // Only handle status for our connection
      if (!connectionId || payload.connectionId === connectionId) {
        setStatus({
          isPolling: payload.isPolling,
          intervalMs: payload.intervalMs,
          lastPollTimestamp: payload.lastPollTimestamp,
          tagCount: payload.tagCount
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [connectionId])

  // Fetch initial status when connectionId changes
  useEffect(() => {
    if (connectionId) {
      refreshStatus(connectionId)
    }
  }, [connectionId, refreshStatus])

  return {
    isPolling: status.isPolling,
    intervalMs: status.intervalMs,
    lastPollTimestamp: status.lastPollTimestamp,
    tagCount: status.tagCount,
    isLoading,
    error,
    start,
    stop,
    refreshStatus,
    clearError
  }
}
