/**
 * Virtual Server Store
 *
 * Zustand store for managing virtual server state in the Renderer process.
 */

import { create } from 'zustand'
import type { VirtualServer, Waveform } from '@shared/types/virtual-server'

interface VirtualServerState {
  // State
  servers: VirtualServer[]
  isLoading: boolean
  error: string | null

  // Actions
  setServers: (servers: VirtualServer[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async operations
  startServer: (params: {
    port: number
    registers: Array<{
      address: number
      length: number
      waveform: Waveform
    }>
  }) => Promise<{ success: boolean; serverId?: string; error?: string; suggestedPort?: number }>
  stopServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  refreshStatus: () => Promise<void>
}

export const useVirtualServerStore = create<VirtualServerState>((set, get) => ({
  // Initial state
  servers: [],
  isLoading: false,
  error: null,

  // Setters
  setServers: (servers) => set({ servers }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Start a virtual server
  startServer: async (params) => {
    set({ isLoading: true, error: null })

    try {
      const result = await window.electronAPI.virtualServer.start({
        protocol: 'modbus-tcp',
        port: params.port,
        registers: params.registers
      })

      if (result.success) {
        // Refresh status to get updated server list
        await get().refreshStatus()
        set({ isLoading: false })
        return { success: true, serverId: result.serverId }
      } else {
        const errorResult = result as { success: false; error?: string; suggestedPort?: number }
        set({ isLoading: false, error: errorResult.error || 'Unknown error' })
        return {
          success: false,
          error: errorResult.error,
          suggestedPort: errorResult.suggestedPort
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start server'
      set({ isLoading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Stop a virtual server
  stopServer: async (serverId) => {
    set({ isLoading: true, error: null })

    try {
      const result = await window.electronAPI.virtualServer.stop(serverId)

      if (result.success) {
        // Refresh status to get updated server list
        await get().refreshStatus()
        set({ isLoading: false })
        return { success: true }
      } else {
        set({ isLoading: false, error: result.error })
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop server'
      set({ isLoading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Refresh server status
  refreshStatus: async () => {
    try {
      const result = await window.electronAPI.virtualServer.status()
      set({ servers: result.servers })
    } catch (err) {
      console.error('Failed to refresh virtual server status:', err)
    }
  }
}))
