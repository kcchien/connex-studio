/**
 * Zustand store for alert state management.
 * Manages alert rules and events.
 */

import { create } from 'zustand'
import type { AlertRule, AlertEvent, AlertSeverity } from '@shared/types'

export interface AlertState {
  rules: AlertRule[]
  recentEvents: AlertEvent[]
  unacknowledgedCounts: Record<AlertSeverity, number>
  selectedRuleId: string | null

  // Actions
  addRule: (rule: AlertRule) => void
  updateRule: (id: string, updates: Partial<AlertRule>) => void
  removeRule: (id: string) => void
  setRules: (rules: AlertRule[]) => void
  setSelectedRule: (id: string | null) => void

  // Event actions
  addEvent: (event: AlertEvent) => void
  acknowledgeEvent: (eventId: number) => void
  setRecentEvents: (events: AlertEvent[]) => void
  setUnacknowledgedCounts: (counts: Record<AlertSeverity, number>) => void
  clearEvents: () => void
}

export const useAlertStore = create<AlertState>((set) => ({
  rules: [],
  recentEvents: [],
  unacknowledgedCounts: { info: 0, warning: 0, critical: 0 },
  selectedRuleId: null,

  addRule: (rule: AlertRule) => {
    set((state) => ({
      rules: [...state.rules, rule]
    }))
  },

  updateRule: (id: string, updates: Partial<AlertRule>) => {
    set((state) => ({
      rules: state.rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    }))
  },

  removeRule: (id: string) => {
    set((state) => {
      const newRules = state.rules.filter((rule) => rule.id !== id)
      const newSelectedId = state.selectedRuleId === id ? null : state.selectedRuleId
      return {
        rules: newRules,
        selectedRuleId: newSelectedId
      }
    })
  },

  setRules: (rules: AlertRule[]) => {
    set((state) => {
      const newSelectedId =
        state.selectedRuleId && rules.some((r) => r.id === state.selectedRuleId)
          ? state.selectedRuleId
          : null
      return {
        rules,
        selectedRuleId: newSelectedId
      }
    })
  },

  setSelectedRule: (id: string | null) => {
    set({ selectedRuleId: id })
  },

  addEvent: (event: AlertEvent) => {
    set((state) => {
      // Keep only the most recent 100 events in renderer
      const newEvents = [event, ...state.recentEvents].slice(0, 100)
      // Update unacknowledged counts
      const newCounts = { ...state.unacknowledgedCounts }
      if (!event.acknowledged) {
        newCounts[event.severity]++
      }
      return {
        recentEvents: newEvents,
        unacknowledgedCounts: newCounts
      }
    })
  },

  acknowledgeEvent: (eventId: number) => {
    set((state) => {
      const event = state.recentEvents.find((e) => e.id === eventId)
      if (!event || event.acknowledged) return state

      const newEvents = state.recentEvents.map((e) =>
        e.id === eventId ? { ...e, acknowledged: true, acknowledgedAt: Date.now() } : e
      )
      const newCounts = { ...state.unacknowledgedCounts }
      newCounts[event.severity] = Math.max(0, newCounts[event.severity] - 1)

      return {
        recentEvents: newEvents,
        unacknowledgedCounts: newCounts
      }
    })
  },

  setRecentEvents: (events: AlertEvent[]) => {
    set({ recentEvents: events })
  },

  setUnacknowledgedCounts: (counts: Record<AlertSeverity, number>) => {
    set({ unacknowledgedCounts: counts })
  },

  clearEvents: () => {
    set({
      recentEvents: [],
      unacknowledgedCounts: { info: 0, warning: 0, critical: 0 }
    })
  }
}))

// Selector helpers
export const selectRules = (state: AlertState) => state.rules
export const selectEnabledRules = (state: AlertState) => state.rules.filter((r) => r.enabled)
export const selectSelectedRuleId = (state: AlertState) => state.selectedRuleId
export const selectSelectedRule = (state: AlertState) =>
  state.rules.find((r) => r.id === state.selectedRuleId)
export const selectRuleById = (id: string) => (state: AlertState) =>
  state.rules.find((r) => r.id === id)
export const selectRecentEvents = (state: AlertState) => state.recentEvents
export const selectUnacknowledgedCounts = (state: AlertState) => state.unacknowledgedCounts
export const selectTotalUnacknowledged = (state: AlertState) =>
  state.unacknowledgedCounts.info +
  state.unacknowledgedCounts.warning +
  state.unacknowledgedCounts.critical
export const selectEventsBySeverity = (severity: AlertSeverity) => (state: AlertState) =>
  state.recentEvents.filter((e) => e.severity === severity)
