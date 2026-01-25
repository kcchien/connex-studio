/**
 * useBridge Hook
 *
 * React hook for bridge CRUD, start/stop/pause/resume, and stats monitoring.
 * Provides bridge state management and IPC communication.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  Bridge,
  BridgeStatus,
  BridgeStats,
  CreateBridgeRequest,
  UpdateBridgeRequest
} from '@shared/types'

const { bridge: bridgeApi } = window.electronAPI

/**
 * Bridge state with UI enhancements.
 */
interface BridgeState {
  bridges: Bridge[]
  stats: Map<string, BridgeStats>
  isLoading: boolean
  error: string | null
}

/**
 * Hook return type.
 */
interface UseBridgeReturn {
  // State
  bridges: Bridge[]
  stats: Map<string, BridgeStats>
  isLoading: boolean
  error: string | null

  // CRUD operations
  createBridge: (request: CreateBridgeRequest) => Promise<Bridge | null>
  updateBridge: (request: UpdateBridgeRequest) => Promise<Bridge | null>
  deleteBridge: (id: string) => Promise<boolean>

  // Lifecycle operations
  startBridge: (id: string) => Promise<boolean>
  stopBridge: (id: string) => Promise<boolean>
  pauseBridge: (id: string) => Promise<boolean>
  resumeBridge: (id: string) => Promise<boolean>

  // Utility
  refreshBridges: () => Promise<void>
  getBridgeById: (id: string) => Bridge | undefined
  getStats: (id: string) => BridgeStats | undefined
  clearError: () => void
}

/**
 * Hook for bridge management.
 */
export function useBridge(): UseBridgeReturn {
  const [state, setState] = useState<BridgeState>({
    bridges: [],
    stats: new Map(),
    isLoading: false,
    error: null
  })

  // Load bridges on mount
  useEffect(() => {
    refreshBridges()

    // Set up event listeners
    const unsubStatus = bridgeApi.onStatusChanged(({ bridgeId, status }) => {
      setState((prev) => ({
        ...prev,
        bridges: prev.bridges.map((b) =>
          b.id === bridgeId ? { ...b, status } : b
        )
      }))
    })

    const unsubError = bridgeApi.onError(({ bridgeId, error }) => {
      setState((prev) => {
        const newStats = new Map(prev.stats)
        const existingStats = newStats.get(bridgeId)
        if (existingStats) {
          newStats.set(bridgeId, { ...existingStats, lastError: error })
        }
        return { ...prev, stats: newStats }
      })
    })

    const unsubStats = bridgeApi.onStats((stats) => {
      setState((prev) => {
        const newStats = new Map(prev.stats)
        newStats.set(stats.bridgeId, stats)
        return { ...prev, stats: newStats }
      })
    })

    return () => {
      unsubStatus()
      unsubError()
      unsubStats()
    }
  }, [])

  /**
   * Refresh bridges from server.
   */
  const refreshBridges = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await bridgeApi.list()
      if (result.success) {
        setState((prev) => ({
          ...prev,
          bridges: result.bridges ?? [],
          isLoading: false
        }))
      } else {
        const errorMsg = !result.success ? result.error : 'Failed to load bridges'
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isLoading: false
        }))
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
    }
  }, [])

  /**
   * Create a new bridge.
   */
  const createBridge = useCallback(
    async (request: CreateBridgeRequest): Promise<Bridge | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await bridgeApi.create(request)
        if (result.success && result.bridge) {
          setState((prev) => ({
            ...prev,
            bridges: [...prev.bridges, result.bridge!],
            isLoading: false
          }))
          return result.bridge
        } else {
          const errorMsg = !result.success ? result.error : 'Failed to create bridge'
          setState((prev) => ({
            ...prev,
            error: errorMsg,
            isLoading: false
          }))
          return null
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error),
          isLoading: false
        }))
        return null
      }
    },
    []
  )

  /**
   * Update an existing bridge.
   */
  const updateBridge = useCallback(
    async (request: UpdateBridgeRequest): Promise<Bridge | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await bridgeApi.update(request)
        if (result.success && result.bridge) {
          setState((prev) => ({
            ...prev,
            bridges: prev.bridges.map((b) =>
              b.id === request.id ? result.bridge! : b
            ),
            isLoading: false
          }))
          return result.bridge
        } else {
          const errorMsg = !result.success ? result.error : 'Failed to update bridge'
          setState((prev) => ({
            ...prev,
            error: errorMsg,
            isLoading: false
          }))
          return null
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error),
          isLoading: false
        }))
        return null
      }
    },
    []
  )

  /**
   * Delete a bridge.
   */
  const deleteBridge = useCallback(async (id: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await bridgeApi.delete(id)
      if (result.success) {
        setState((prev) => ({
          ...prev,
          bridges: prev.bridges.filter((b) => b.id !== id),
          isLoading: false
        }))
        return true
      } else {
        const errorMsg = !result.success ? result.error : 'Failed to delete bridge'
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isLoading: false
        }))
        return false
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
      return false
    }
  }, [])

  /**
   * Start a bridge.
   */
  const startBridge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await bridgeApi.start(id)
      return result.success === true
    } catch {
      return false
    }
  }, [])

  /**
   * Stop a bridge.
   */
  const stopBridge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await bridgeApi.stop(id)
      return result.success === true
    } catch {
      return false
    }
  }, [])

  /**
   * Pause a bridge.
   */
  const pauseBridge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await bridgeApi.pause(id)
      return result.success === true
    } catch {
      return false
    }
  }, [])

  /**
   * Resume a bridge.
   */
  const resumeBridge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await bridgeApi.resume(id)
      return result.success === true
    } catch {
      return false
    }
  }, [])

  /**
   * Get bridge by ID.
   */
  const getBridgeById = useCallback(
    (id: string): Bridge | undefined => {
      return state.bridges.find((b) => b.id === id)
    },
    [state.bridges]
  )

  /**
   * Get stats for a bridge.
   */
  const getStats = useCallback(
    (id: string): BridgeStats | undefined => {
      return state.stats.get(id)
    },
    [state.stats]
  )

  /**
   * Clear error.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    bridges: state.bridges,
    stats: state.stats,
    isLoading: state.isLoading,
    error: state.error,
    createBridge,
    updateBridge,
    deleteBridge,
    startBridge,
    stopBridge,
    pauseBridge,
    resumeBridge,
    refreshBridges,
    getBridgeById,
    getStats,
    clearError
  }
}
