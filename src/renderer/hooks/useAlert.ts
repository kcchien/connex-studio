/**
 * useAlert Hook
 *
 * React hook for alert management including rules, events, and real-time notifications.
 * Provides state management for alert rules and event history with IPC communication.
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import type {
  AlertRule,
  AlertEvent,
  AlertEventPage,
  AlertEventQuery,
  AlertSeverity,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest
} from '@shared/types'

const { alert: alertApi } = window.electronAPI

/**
 * Alert state.
 */
interface AlertState {
  rules: AlertRule[]
  mutedRules: Set<string>
  events: AlertEvent[]
  totalEvents: number
  hasMoreEvents: boolean
  unacknowledgedCounts: Record<AlertSeverity, number>
  soundEnabled: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook return type.
 */
interface UseAlertReturn {
  // State
  rules: AlertRule[]
  mutedRules: Set<string>
  events: AlertEvent[]
  totalEvents: number
  hasMoreEvents: boolean
  unacknowledgedCounts: Record<AlertSeverity, number>
  soundEnabled: boolean
  isLoading: boolean
  error: string | null

  // Recent triggered event (for toast notifications)
  recentEvent: AlertEvent | null
  clearRecentEvent: () => void

  // Rule CRUD
  createRule: (request: CreateAlertRuleRequest) => Promise<AlertRule | null>
  updateRule: (request: UpdateAlertRuleRequest) => Promise<AlertRule | null>
  deleteRule: (id: string) => Promise<boolean>
  enableRule: (id: string) => Promise<AlertRule | null>
  disableRule: (id: string) => Promise<AlertRule | null>
  muteRule: (id: string) => Promise<boolean>
  unmuteRule: (id: string) => Promise<boolean>

  // Event operations
  queryEvents: (query: AlertEventQuery) => Promise<void>
  loadMoreEvents: () => Promise<void>
  acknowledge: (eventId: number) => Promise<boolean>
  acknowledgeAll: (severity?: AlertSeverity) => Promise<number>
  clearHistory: (before?: number) => Promise<number>

  // Sound
  testSound: (severity: AlertSeverity) => Promise<void>
  setSoundEnabled: (enabled: boolean) => Promise<void>

  // Utility
  refreshRules: () => Promise<void>
  refreshCounts: () => Promise<void>
  getRuleById: (id: string) => AlertRule | undefined
  clearError: () => void
}

/**
 * Default event query.
 */
const DEFAULT_QUERY: AlertEventQuery = {
  limit: 50,
  offset: 0
}

/**
 * Hook for alert management.
 */
export function useAlert(): UseAlertReturn {
  const [state, setState] = useState<AlertState>({
    rules: [],
    mutedRules: new Set(),
    events: [],
    totalEvents: 0,
    hasMoreEvents: false,
    unacknowledgedCounts: { info: 0, warning: 0, critical: 0 },
    soundEnabled: true,
    isLoading: false,
    error: null
  })

  const [recentEvent, setRecentEvent] = useState<AlertEvent | null>(null)
  const currentQuery = useRef<AlertEventQuery>(DEFAULT_QUERY)

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Load initial data
    refreshRules()
    refreshCounts()
    queryEvents(DEFAULT_QUERY)
    loadSoundEnabled()

    // Subscribe to real-time events
    const unsubTriggered = alertApi.onEventTriggered((event) => {
      // Add to events list
      setState((prev) => ({
        ...prev,
        events: [event, ...prev.events],
        totalEvents: prev.totalEvents + 1,
        unacknowledgedCounts: {
          ...prev.unacknowledgedCounts,
          [event.severity]: prev.unacknowledgedCounts[event.severity] + 1
        }
      }))

      // Set as recent event for toast
      setRecentEvent(event)
    })

    const unsubAcknowledged = alertApi.onEventAcknowledged((eventId) => {
      setState((prev) => {
        const event = prev.events.find((e) => e.id === eventId)
        if (!event || event.acknowledged) return prev

        return {
          ...prev,
          events: prev.events.map((e) =>
            e.id === eventId ? { ...e, acknowledged: true, acknowledgedAt: Date.now() } : e
          ),
          unacknowledgedCounts: {
            ...prev.unacknowledgedCounts,
            [event.severity]: Math.max(0, prev.unacknowledgedCounts[event.severity] - 1)
          }
        }
      })
    })

    return () => {
      unsubTriggered()
      unsubAcknowledged()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  const loadSoundEnabled = useCallback(async () => {
    try {
      const enabled = await alertApi.getSoundEnabled()
      setState((prev) => ({ ...prev, soundEnabled: enabled }))
    } catch {
      // Ignore
    }
  }, [])

  const refreshRules = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const [rules, mutedRuleIds] = await Promise.all([
        alertApi.listRules(),
        alertApi.getMutedRules()
      ])

      setState((prev) => ({
        ...prev,
        rules,
        mutedRules: new Set(mutedRuleIds),
        isLoading: false
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
    }
  }, [])

  const refreshCounts = useCallback(async () => {
    try {
      const counts = await alertApi.getUnacknowledgedCounts()
      setState((prev) => ({ ...prev, unacknowledgedCounts: counts }))
    } catch {
      // Ignore
    }
  }, [])

  const queryEvents = useCallback(async (query: AlertEventQuery) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    currentQuery.current = query

    try {
      const page = await alertApi.queryEvents(query)

      setState((prev) => ({
        ...prev,
        events: query.offset === 0 ? page.events : [...prev.events, ...page.events],
        totalEvents: page.total,
        hasMoreEvents: page.hasMore,
        isLoading: false
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
    }
  }, [])

  const loadMoreEvents = useCallback(async () => {
    if (!state.hasMoreEvents || state.isLoading) return

    const nextQuery: AlertEventQuery = {
      ...currentQuery.current,
      offset: (currentQuery.current.offset ?? 0) + (currentQuery.current.limit ?? 50)
    }

    await queryEvents(nextQuery)
  }, [state.hasMoreEvents, state.isLoading, queryEvents])

  // ---------------------------------------------------------------------------
  // Rule CRUD
  // ---------------------------------------------------------------------------

  const createRule = useCallback(
    async (request: CreateAlertRuleRequest): Promise<AlertRule | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const rule = await alertApi.createRule(request)
        setState((prev) => ({
          ...prev,
          rules: [...prev.rules, rule],
          isLoading: false
        }))
        return rule
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

  const updateRule = useCallback(
    async (request: UpdateAlertRuleRequest): Promise<AlertRule | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const rule = await alertApi.updateRule(request)
        setState((prev) => ({
          ...prev,
          rules: prev.rules.map((r) => (r.id === request.id ? rule : r)),
          isLoading: false
        }))
        return rule
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

  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const success = await alertApi.deleteRule(id)
      if (success) {
        setState((prev) => ({
          ...prev,
          rules: prev.rules.filter((r) => r.id !== id),
          mutedRules: new Set([...prev.mutedRules].filter((rid) => rid !== id)),
          isLoading: false
        }))
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
      return success
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
      return false
    }
  }, [])

  const enableRule = useCallback(async (id: string): Promise<AlertRule | null> => {
    try {
      const rule = await alertApi.enableRule(id)
      setState((prev) => ({
        ...prev,
        rules: prev.rules.map((r) => (r.id === id ? rule : r))
      }))
      return rule
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }))
      return null
    }
  }, [])

  const disableRule = useCallback(async (id: string): Promise<AlertRule | null> => {
    try {
      const rule = await alertApi.disableRule(id)
      setState((prev) => ({
        ...prev,
        rules: prev.rules.map((r) => (r.id === id ? rule : r))
      }))
      return rule
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }))
      return null
    }
  }, [])

  const muteRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await alertApi.muteRule(id)
      if (success) {
        setState((prev) => ({
          ...prev,
          mutedRules: new Set([...prev.mutedRules, id])
        }))
      }
      return success
    } catch {
      return false
    }
  }, [])

  const unmuteRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await alertApi.unmuteRule(id)
      if (success) {
        setState((prev) => ({
          ...prev,
          mutedRules: new Set([...prev.mutedRules].filter((rid) => rid !== id))
        }))
      }
      return success
    } catch {
      return false
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Event Operations
  // ---------------------------------------------------------------------------

  const acknowledge = useCallback(async (eventId: number): Promise<boolean> => {
    try {
      const success = await alertApi.acknowledge(eventId)
      // State update happens via real-time event
      return success
    } catch {
      return false
    }
  }, [])

  const acknowledgeAll = useCallback(
    async (severity?: AlertSeverity): Promise<number> => {
      try {
        const count = await alertApi.acknowledgeAll(severity)

        // Update local state
        setState((prev) => ({
          ...prev,
          events: prev.events.map((e) => {
            if (!severity || e.severity === severity) {
              return { ...e, acknowledged: true, acknowledgedAt: Date.now() }
            }
            return e
          }),
          unacknowledgedCounts: severity
            ? { ...prev.unacknowledgedCounts, [severity]: 0 }
            : { info: 0, warning: 0, critical: 0 }
        }))

        return count
      } catch {
        return 0
      }
    },
    []
  )

  const clearHistory = useCallback(async (before?: number): Promise<number> => {
    try {
      const count = await alertApi.clearHistory(before)

      // Refresh events
      await queryEvents(DEFAULT_QUERY)
      await refreshCounts()

      return count
    } catch {
      return 0
    }
  }, [queryEvents, refreshCounts])

  // ---------------------------------------------------------------------------
  // Sound
  // ---------------------------------------------------------------------------

  const testSound = useCallback(async (severity: AlertSeverity): Promise<void> => {
    await alertApi.testSound(severity)
  }, [])

  const setSoundEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    await alertApi.setSoundEnabled(enabled)
    setState((prev) => ({ ...prev, soundEnabled: enabled }))
  }, [])

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  const getRuleById = useCallback(
    (id: string): AlertRule | undefined => {
      return state.rules.find((r) => r.id === id)
    },
    [state.rules]
  )

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const clearRecentEvent = useCallback(() => {
    setRecentEvent(null)
  }, [])

  return {
    // State
    rules: state.rules,
    mutedRules: state.mutedRules,
    events: state.events,
    totalEvents: state.totalEvents,
    hasMoreEvents: state.hasMoreEvents,
    unacknowledgedCounts: state.unacknowledgedCounts,
    soundEnabled: state.soundEnabled,
    isLoading: state.isLoading,
    error: state.error,

    // Recent event
    recentEvent,
    clearRecentEvent,

    // Rule CRUD
    createRule,
    updateRule,
    deleteRule,
    enableRule,
    disableRule,
    muteRule,
    unmuteRule,

    // Event operations
    queryEvents,
    loadMoreEvents,
    acknowledge,
    acknowledgeAll,
    clearHistory,

    // Sound
    testSound,
    setSoundEnabled,

    // Utility
    refreshRules,
    refreshCounts,
    getRuleById,
    clearError
  }
}
