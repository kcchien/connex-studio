/**
 * Custom hook for connection operations with loading/error state management.
 * Wraps IPC calls and updates connectionStore on success.
 */

import { useState, useCallback } from 'react'
import { useConnectionStore } from '../stores/connectionStore'
import { connectionApi, invokeWithError } from '../lib/ipc'
import type {
  Protocol,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  ConnectionStatus
} from '@shared/types/connection'
import type { ModbusAddress, MqttAddress, OpcUaAddress, DataType } from '@shared/types/tag'

export interface UseConnectionReturn {
  // Operations
  create: (
    name: string,
    protocol: Protocol,
    config: ModbusTcpConfig | MqttConfig | OpcUaConfig
  ) => Promise<string | null>
  connect: (connectionId: string) => Promise<boolean>
  disconnect: (connectionId: string) => Promise<boolean>
  remove: (connectionId: string) => Promise<boolean>
  readOnce: (
    connectionId: string,
    address: ModbusAddress | MqttAddress | OpcUaAddress,
    dataType: DataType
  ) => Promise<{ value: number | boolean | string; quality: string } | null>

  // State
  isLoading: boolean
  error: string | null

  // Actions
  clearError: () => void
}

export function useConnection(): UseConnectionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addConnection, updateConnection, removeConnection } = useConnectionStore()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Create a new connection.
   * @returns The new connection ID on success, null on failure.
   */
  const create = useCallback(
    async (
      name: string,
      protocol: Protocol,
      config: ModbusTcpConfig | MqttConfig | OpcUaConfig
    ): Promise<string | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(
          connectionApi.create({ name, protocol, config })
        )
        // Add the new connection to the store
        addConnection(result.connection)
        return result.connection.id
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create connection'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [addConnection]
  )

  /**
   * Connect to a device.
   * @returns true on success, false on failure.
   */
  const connect = useCallback(
    async (connectionId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // Optimistically update status to 'connecting'
        updateConnection(connectionId, { status: 'connecting' as ConnectionStatus })

        await invokeWithError(connectionApi.connect(connectionId))

        // Note: The actual 'connected' status will be updated via
        // the onStatusChanged event from main process
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect'
        setError(message)
        // Revert status on error
        updateConnection(connectionId, {
          status: 'error' as ConnectionStatus,
          lastError: message
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [updateConnection]
  )

  /**
   * Disconnect from a device.
   * @returns true on success, false on failure.
   */
  const disconnect = useCallback(
    async (connectionId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await invokeWithError(connectionApi.disconnect(connectionId))

        // Update status to disconnected
        updateConnection(connectionId, {
          status: 'disconnected' as ConnectionStatus,
          lastError: undefined
        })
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to disconnect'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [updateConnection]
  )

  /**
   * Remove/delete a connection.
   * @returns true on success, false on failure.
   */
  const remove = useCallback(
    async (connectionId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await invokeWithError(connectionApi.delete(connectionId))

        // Remove from store
        removeConnection(connectionId)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete connection'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [removeConnection]
  )

  /**
   * Perform a single read operation.
   * @returns The read result on success, null on failure.
   */
  const readOnce = useCallback(
    async (
      connectionId: string,
      address: ModbusAddress | MqttAddress | OpcUaAddress,
      dataType: DataType
    ): Promise<{ value: number | boolean | string; quality: string } | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(
          connectionApi.readOnce({ connectionId, address, dataType })
        )
        return { value: result.value, quality: result.quality }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to read value'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    create,
    connect,
    disconnect,
    remove,
    readOnce,
    isLoading,
    error,
    clearError
  }
}
