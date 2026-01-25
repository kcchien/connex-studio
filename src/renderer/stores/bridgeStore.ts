/**
 * Zustand store for bridge state management.
 * Manages protocol bridges and syncs with Main process via IPC.
 */

import { create } from 'zustand'
import type { Bridge, BridgeStatus, BridgeStats } from '@shared/types'

export interface BridgeState {
  bridges: Bridge[]
  selectedBridgeId: string | null
  bridgeStats: Map<string, BridgeStats>

  // Actions
  addBridge: (bridge: Bridge) => void
  updateBridge: (id: string, updates: Partial<Bridge>) => void
  removeBridge: (id: string) => void
  setSelected: (id: string | null) => void
  setBridges: (bridges: Bridge[]) => void

  // Status updates from main process
  handleStatusChanged: (bridgeId: string, status: BridgeStatus, error?: string) => void
  handleStatsUpdated: (bridgeId: string, stats: BridgeStats) => void
}

export const useBridgeStore = create<BridgeState>((set) => ({
  bridges: [],
  selectedBridgeId: null,
  bridgeStats: new Map(),

  addBridge: (bridge: Bridge) => {
    set((state) => ({
      bridges: [...state.bridges, bridge]
    }))
  },

  updateBridge: (id: string, updates: Partial<Bridge>) => {
    set((state) => ({
      bridges: state.bridges.map((bridge) =>
        bridge.id === id ? { ...bridge, ...updates } : bridge
      )
    }))
  },

  removeBridge: (id: string) => {
    set((state) => {
      const newBridges = state.bridges.filter((bridge) => bridge.id !== id)
      const newSelectedId = state.selectedBridgeId === id ? null : state.selectedBridgeId
      const newStats = new Map(state.bridgeStats)
      newStats.delete(id)
      return {
        bridges: newBridges,
        selectedBridgeId: newSelectedId,
        bridgeStats: newStats
      }
    })
  },

  setSelected: (id: string | null) => {
    set({ selectedBridgeId: id })
  },

  setBridges: (bridges: Bridge[]) => {
    set((state) => {
      const newSelectedId =
        state.selectedBridgeId && bridges.some((b) => b.id === state.selectedBridgeId)
          ? state.selectedBridgeId
          : null
      return {
        bridges,
        selectedBridgeId: newSelectedId
      }
    })
  },

  handleStatusChanged: (bridgeId: string, status: BridgeStatus, error?: string) => {
    set((state) => ({
      bridges: state.bridges.map((bridge) =>
        bridge.id === bridgeId
          ? {
              ...bridge,
              status,
              lastError: error
            }
          : bridge
      )
    }))
  },

  handleStatsUpdated: (bridgeId: string, stats: BridgeStats) => {
    set((state) => {
      const newStats = new Map(state.bridgeStats)
      newStats.set(bridgeId, stats)
      return { bridgeStats: newStats }
    })
  }
}))

// Selector helpers
export const selectBridges = (state: BridgeState) => state.bridges
export const selectSelectedBridgeId = (state: BridgeState) => state.selectedBridgeId
export const selectSelectedBridge = (state: BridgeState) =>
  state.bridges.find((b) => b.id === state.selectedBridgeId)
export const selectBridgeById = (id: string) => (state: BridgeState) =>
  state.bridges.find((b) => b.id === id)
export const selectActiveBridges = (state: BridgeState) =>
  state.bridges.filter((b) => b.status === 'active')
export const selectBridgeStats = (id: string) => (state: BridgeState) =>
  state.bridgeStats.get(id)
