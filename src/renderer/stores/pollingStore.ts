/**
 * Zustand store for polling state management.
 * Controls auto-polling behavior based on connection status and tag availability.
 */

import { create } from 'zustand'

export type PollingStatus = 'running' | 'paused' | 'stopped'

interface TagPollingState {
  consecutiveFailures: number
  isThrottled: boolean
  lastErrorAt?: number
  lastErrorMessage?: string
  lastErrorCode?: string
}

interface PollingState {
  // Overall polling status
  status: PollingStatus

  // Polling interval in milliseconds
  interval: number

  // Per-tag polling state for error tracking and throttling
  tagStates: Map<string, TagPollingState>

  // Timer ID for cleanup
  timerId: ReturnType<typeof setInterval> | null

  // Actions
  startPolling: () => void
  pausePolling: () => void
  stopPolling: () => void
  setInterval: (ms: number) => void

  // Tag state management
  recordTagSuccess: (tagId: string) => void
  recordTagFailure: (tagId: string, errorMessage?: string, errorCode?: string) => void
  clearTagState: (tagId: string) => void
  clearAllTagStates: () => void

  // Get tag state
  getTagState: (tagId: string) => TagPollingState | undefined
  isTagThrottled: (tagId: string) => boolean
}

// Configuration
const DEFAULT_INTERVAL = 500 // 500ms default
const MIN_INTERVAL = 100 // 100ms minimum
const MAX_INTERVAL = 60000 // 60s maximum
const THROTTLE_AFTER_FAILURES = 5 // Throttle after 5 consecutive failures
const THROTTLE_MULTIPLIER = 5 // Throttled tags poll 5x slower

export const usePollingStore = create<PollingState>((set, get) => ({
  status: 'stopped',
  interval: DEFAULT_INTERVAL,
  tagStates: new Map(),
  timerId: null,

  startPolling: () => {
    set({ status: 'running' })
  },

  pausePolling: () => {
    set({ status: 'paused' })
  },

  stopPolling: () => {
    const { timerId } = get()
    if (timerId) {
      clearInterval(timerId)
    }
    set({ status: 'stopped', timerId: null })
  },

  setInterval: (ms: number) => {
    // Clamp to valid range
    const clampedInterval = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, ms))
    set({ interval: clampedInterval })
  },

  recordTagSuccess: (tagId: string) => {
    set((state) => {
      const newTagStates = new Map(state.tagStates)
      const existing = newTagStates.get(tagId)

      // Reset consecutive failures on success
      newTagStates.set(tagId, {
        consecutiveFailures: 0,
        isThrottled: false,
        lastErrorAt: existing?.lastErrorAt,
        lastErrorMessage: existing?.lastErrorMessage,
        lastErrorCode: existing?.lastErrorCode,
      })

      return { tagStates: newTagStates }
    })
  },

  recordTagFailure: (tagId: string, errorMessage?: string, errorCode?: string) => {
    set((state) => {
      const newTagStates = new Map(state.tagStates)
      const existing = newTagStates.get(tagId) ?? {
        consecutiveFailures: 0,
        isThrottled: false,
      }

      const newFailures = existing.consecutiveFailures + 1
      const shouldThrottle = newFailures >= THROTTLE_AFTER_FAILURES

      newTagStates.set(tagId, {
        consecutiveFailures: newFailures,
        isThrottled: shouldThrottle,
        lastErrorAt: Date.now(),
        lastErrorMessage: errorMessage,
        lastErrorCode: errorCode,
      })

      return { tagStates: newTagStates }
    })
  },

  clearTagState: (tagId: string) => {
    set((state) => {
      const newTagStates = new Map(state.tagStates)
      newTagStates.delete(tagId)
      return { tagStates: newTagStates }
    })
  },

  clearAllTagStates: () => {
    set({ tagStates: new Map() })
  },

  getTagState: (tagId: string) => {
    return get().tagStates.get(tagId)
  },

  isTagThrottled: (tagId: string) => {
    const state = get().tagStates.get(tagId)
    return state?.isThrottled ?? false
  },
}))

// Selector helpers
export const selectPollingStatus = (state: PollingState) => state.status
export const selectPollingInterval = (state: PollingState) => state.interval
export const selectTagPollingState = (tagId: string) => (state: PollingState) =>
  state.tagStates.get(tagId)

// Configuration exports
export const POLLING_CONFIG = {
  DEFAULT_INTERVAL,
  MIN_INTERVAL,
  MAX_INTERVAL,
  THROTTLE_AFTER_FAILURES,
  THROTTLE_MULTIPLIER,
}
