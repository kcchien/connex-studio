/**
 * Zustand store for connection state management.
 * Manages connections and syncs with Main process via IPC.
 */

import { create } from 'zustand'
import type { Connection, ConnectionStatus } from '@shared/types/connection'

export interface ConnectionState {
  connections: Connection[]
  selectedConnectionId: string | null

  // Actions
  addConnection: (conn: Connection) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
  removeConnection: (id: string) => void
  setSelected: (id: string | null) => void
  setConnections: (connections: Connection[]) => void

  // Internal action for status updates from main process
  handleStatusChanged: (connectionId: string, status: ConnectionStatus, error?: string) => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  selectedConnectionId: null,

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

  handleStatusChanged: (connectionId: string, status: ConnectionStatus, error?: string) => {
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
