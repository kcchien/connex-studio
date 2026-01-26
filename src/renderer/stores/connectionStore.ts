/**
 * Zustand store for connection state management.
 * Manages connections and syncs with Main process via IPC.
 */

import { create } from 'zustand'
import type { Connection, ConnectionStatus, ConnectionMetrics } from '@shared/types/connection'
import { showDisconnectionToast } from './toastStore'

// Auto-reconnect configuration
const RECONNECT_INTERVAL_MS = 5000 // 5 seconds between attempts
const MAX_RECONNECT_ATTEMPTS = 3

// Track reconnection state per connection
interface ReconnectState {
  attempts: number
  timerId: ReturnType<typeof setTimeout> | null
  isReconnecting: boolean
}

// Store reconnect state outside Zustand to avoid re-renders
const reconnectStates = new Map<string, ReconnectState>()

export interface ConnectionState {
  connections: Connection[]
  selectedConnectionId: string | null
  metrics: Map<string, ConnectionMetrics>

  // Actions
  addConnection: (conn: Connection) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
  removeConnection: (id: string) => void
  setSelected: (id: string | null) => void
  setConnections: (connections: Connection[]) => void

  // Internal action for status updates from main process
  handleStatusChanged: (
    connectionId: string,
    status: ConnectionStatus,
    error?: string,
    userInitiated?: boolean
  ) => void

  // Reconnection actions
  reconnect: (connectionId: string) => Promise<void>
  cancelReconnect: (connectionId: string) => void
  getReconnectAttempt: (connectionId: string) => number

  // Metrics actions
  setMetrics: (connectionId: string, metrics: ConnectionMetrics) => void
  clearMetrics: (connectionId: string) => void
  getMetrics: (connectionId: string) => ConnectionMetrics | undefined
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  selectedConnectionId: null,
  metrics: new Map<string, ConnectionMetrics>(),

  addConnection: (conn: Connection) => {
    set((state) => ({
      connections: [...state.connections, conn]
    }))
  },

  updateConnection: (id: string, updates: Partial<Connection>) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.id === id ? { ...conn, ...updates } : conn
      )
    }))
  },

  removeConnection: (id: string) => {
    set((state) => {
      const newConnections = state.connections.filter((conn) => conn.id !== id)
      // Clear selection if the removed connection was selected
      const newSelectedId = state.selectedConnectionId === id ? null : state.selectedConnectionId
      return {
        connections: newConnections,
        selectedConnectionId: newSelectedId
      }
    })
  },

  setSelected: (id: string | null) => {
    set({ selectedConnectionId: id })
  },

  setConnections: (connections: Connection[]) => {
    set((state) => {
      // Preserve selection if still valid, otherwise clear it
      const newSelectedId =
        state.selectedConnectionId && connections.some((c) => c.id === state.selectedConnectionId)
          ? state.selectedConnectionId
          : null
      return {
        connections,
        selectedConnectionId: newSelectedId
      }
    })
  },

  handleStatusChanged: (
    connectionId: string,
    status: ConnectionStatus,
    error?: string,
    userInitiated = false
  ) => {
    const state = get()
    const connection = state.connections.find((c) => c.id === connectionId)
    const previousStatus = connection?.status

    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.id === connectionId
          ? {
              ...conn,
              status,
              lastError: error
            }
          : conn
      )
    }))

    // Handle unexpected disconnections (not user-initiated)
    if (
      connection &&
      !userInitiated &&
      previousStatus === 'connected' &&
      (status === 'disconnected' || status === 'error')
    ) {
      // Extract host from config based on protocol type
      let host = 'unknown'
      if (connection.config) {
        if ('host' in connection.config) {
          host = connection.config.host
        } else if ('brokerUrl' in connection.config) {
          host = connection.config.brokerUrl
        } else if ('endpointUrl' in connection.config) {
          host = connection.config.endpointUrl
        }
      }
      const errorMessage = error || 'Connection lost'

      // Show toast notification
      showDisconnectionToast(connection.name, host, errorMessage, () => {
        // Manual reconnect from toast button
        get().reconnect(connectionId)
      })

      // Start auto-reconnect (unless user manually disconnected)
      // Reset reconnect state and start attempting
      const reconnectState = reconnectStates.get(connectionId)
      if (reconnectState) {
        reconnectState.attempts = 0
        if (reconnectState.timerId) {
          clearTimeout(reconnectState.timerId)
          reconnectState.timerId = null
        }
      }

      // Schedule first reconnect attempt after interval
      const newReconnectState: ReconnectState = {
        attempts: 0,
        timerId: setTimeout(() => {
          get().reconnect(connectionId)
        }, RECONNECT_INTERVAL_MS),
        isReconnecting: false
      }
      reconnectStates.set(connectionId, newReconnectState)
    }
  },

  setMetrics: (connectionId: string, metrics: ConnectionMetrics) => {
    set((state) => {
      const newMetrics = new Map(state.metrics)
      newMetrics.set(connectionId, metrics)
      return { metrics: newMetrics }
    })
  },

  clearMetrics: (connectionId: string) => {
    set((state) => {
      const newMetrics = new Map(state.metrics)
      newMetrics.delete(connectionId)
      return { metrics: newMetrics }
    })
  },

  getMetrics: (connectionId: string) => {
    return get().metrics.get(connectionId)
  },

  reconnect: async (connectionId: string) => {
    const state = get()
    const connection = state.connections.find((c) => c.id === connectionId)
    if (!connection) return

    // Get or initialize reconnect state
    let reconnectState = reconnectStates.get(connectionId)
    if (!reconnectState) {
      reconnectState = { attempts: 0, timerId: null, isReconnecting: false }
      reconnectStates.set(connectionId, reconnectState)
    }

    // If already at max attempts, don't retry
    if (reconnectState.attempts >= MAX_RECONNECT_ATTEMPTS) {
      return
    }

    // Cancel any existing timer
    if (reconnectState.timerId) {
      clearTimeout(reconnectState.timerId)
      reconnectState.timerId = null
    }

    reconnectState.attempts++
    reconnectState.isReconnecting = true

    // Update status to show reconnecting
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.id === connectionId
          ? {
              ...conn,
              status: 'connecting' as ConnectionStatus,
              lastError: `Reconnecting (${reconnectState!.attempts}/${MAX_RECONNECT_ATTEMPTS})...`
            }
          : conn
      )
    }))

    try {
      // Attempt to reconnect via IPC
      const result = await window.electronAPI?.connection?.connect(connectionId)

      if (result?.success) {
        // Success - reset reconnect state
        reconnectState.attempts = 0
        reconnectState.isReconnecting = false
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === connectionId
              ? { ...conn, status: 'connected' as ConnectionStatus, lastError: undefined }
              : conn
          )
        }))
      } else {
        // Failed - schedule next attempt if not at max
        reconnectState.isReconnecting = false
        if (reconnectState.attempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectState.timerId = setTimeout(() => {
            get().reconnect(connectionId)
          }, RECONNECT_INTERVAL_MS)
        } else {
          // Max attempts reached - set error status
          set((state) => ({
            connections: state.connections.map((conn) =>
              conn.id === connectionId
                ? {
                    ...conn,
                    status: 'error' as ConnectionStatus,
                    lastError: result?.error || 'Reconnection failed after 3 attempts'
                  }
                : conn
            )
          }))
        }
      }
    } catch (error) {
      // Handle unexpected errors
      reconnectState.isReconnecting = false
      if (reconnectState.attempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectState.timerId = setTimeout(() => {
          get().reconnect(connectionId)
        }, RECONNECT_INTERVAL_MS)
      } else {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === connectionId
              ? {
                  ...conn,
                  status: 'error' as ConnectionStatus,
                  lastError: error instanceof Error ? error.message : 'Reconnection failed'
                }
              : conn
          )
        }))
      }
    }
  },

  cancelReconnect: (connectionId: string) => {
    const reconnectState = reconnectStates.get(connectionId)
    if (reconnectState) {
      if (reconnectState.timerId) {
        clearTimeout(reconnectState.timerId)
        reconnectState.timerId = null
      }
      reconnectState.attempts = 0
      reconnectState.isReconnecting = false
    }
  },

  getReconnectAttempt: (connectionId: string) => {
    return reconnectStates.get(connectionId)?.attempts || 0
  }
}))

// Selector helpers for common access patterns
export const selectConnections = (state: ConnectionState) => state.connections
export const selectSelectedConnectionId = (state: ConnectionState) => state.selectedConnectionId
export const selectSelectedConnection = (state: ConnectionState) =>
  state.connections.find((c) => c.id === state.selectedConnectionId)
export const selectConnectionById = (id: string) => (state: ConnectionState) =>
  state.connections.find((c) => c.id === id)
export const selectConnectionsByProtocol = (protocol: Connection['protocol']) => (state: ConnectionState) =>
  state.connections.filter((c) => c.protocol === protocol)
export const selectMetrics = (state: ConnectionState) => state.metrics
export const selectMetricsById = (connectionId: string) => (state: ConnectionState) =>
  state.metrics.get(connectionId)
