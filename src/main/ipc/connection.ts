/**
 * Connection IPC Handlers
 *
 * Handles all connection-related IPC communication between Main and Renderer.
 * Implements: connection:create, connection:connect, connection:disconnect,
 *             connection:delete, connection:list, connection:read-once
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import {
  CONNECTION_CREATE,
  CONNECTION_CONNECT,
  CONNECTION_DISCONNECT,
  CONNECTION_DELETE,
  CONNECTION_LIST,
  CONNECTION_READ_ONCE,
  CONNECTION_METRICS,
  CONNECTION_TEST
} from '@shared/constants/ipc-channels'
import * as net from 'net'
import { getConnectionManager } from '../services/ConnectionManager'
import type {
  Connection,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  ModbusAddress,
  MqttAddress,
  OpcUaAddress,
  DataType
} from '@shared/types'

type Protocol = 'modbus-tcp' | 'mqtt' | 'opcua'

interface CreateConnectionParams {
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
}

interface ConnectParams {
  connectionId: string
}

interface DisconnectParams {
  connectionId: string
}

interface DeleteParams {
  connectionId: string
}

interface ReadOnceParams {
  connectionId: string
  address: ModbusAddress | MqttAddress | OpcUaAddress
  dataType?: DataType
}

interface GetMetricsParams {
  connectionId: string
}

interface TestConnectionParams {
  protocol: Protocol
  host: string
  port: number
}

/**
 * Register all connection IPC handlers.
 */
export function registerConnectionHandlers(): void {
  const manager = getConnectionManager()

  // connection:create
  ipcMain.handle(CONNECTION_CREATE, async (_event, params: CreateConnectionParams) => {
    log.debug(`[IPC] ${CONNECTION_CREATE}`, params)

    try {
      const connection = manager.createConnection(params.name, params.protocol, params.config)
      return { success: true, connection }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_CREATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // connection:connect
  ipcMain.handle(CONNECTION_CONNECT, async (_event, params: ConnectParams) => {
    log.debug(`[IPC] ${CONNECTION_CONNECT}`, params)

    try {
      await manager.connect(params.connectionId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_CONNECT} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // connection:disconnect
  ipcMain.handle(CONNECTION_DISCONNECT, async (_event, params: DisconnectParams) => {
    log.debug(`[IPC] ${CONNECTION_DISCONNECT}`, params)

    try {
      await manager.disconnect(params.connectionId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_DISCONNECT} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // connection:delete
  ipcMain.handle(CONNECTION_DELETE, async (_event, params: DeleteParams) => {
    log.debug(`[IPC] ${CONNECTION_DELETE}`, params)

    try {
      manager.deleteConnection(params.connectionId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_DELETE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // connection:list
  ipcMain.handle(CONNECTION_LIST, async () => {
    log.debug(`[IPC] ${CONNECTION_LIST}`)

    const connections = manager.getAllConnections()
    return { connections }
  })

  // connection:read-once
  ipcMain.handle(CONNECTION_READ_ONCE, async (_event, params: ReadOnceParams) => {
    log.debug(`[IPC] ${CONNECTION_READ_ONCE}`, params)

    try {
      const result = await manager.readOnce(
        params.connectionId,
        params.address,
        params.dataType ?? 'uint16'
      )
      return {
        success: true,
        value: result.value,
        quality: result.quality
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_READ_ONCE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // connection:metrics
  ipcMain.handle(CONNECTION_METRICS, async (_event, params: GetMetricsParams) => {
    log.debug(`[IPC] ${CONNECTION_METRICS}`, params)

    try {
      const metrics = manager.getConnectionMetrics(params.connectionId)
      return { success: true, metrics }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_METRICS} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // connection:test - Test TCP connection without creating a persistent connection
  ipcMain.handle(CONNECTION_TEST, async (_event, params: TestConnectionParams) => {
    log.debug(`[IPC] ${CONNECTION_TEST}`, params)

    const { protocol, host, port } = params
    const timeout = 5000 // 5 seconds

    // For now, we only support TCP-based protocols (Modbus TCP)
    if (protocol === 'modbus-tcp') {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        const socket = new net.Socket()

        const timer = setTimeout(() => {
          socket.destroy()
          resolve({ success: false, error: 'Connection timeout (5s)' })
        }, timeout)

        socket.connect(port, host, () => {
          clearTimeout(timer)
          socket.destroy()
          log.info(`[IPC] ${CONNECTION_TEST} success: ${host}:${port}`)
          resolve({ success: true })
        })

        socket.on('error', (err) => {
          clearTimeout(timer)
          socket.destroy()
          const errorMessage = translateConnectionError(err)
          log.warn(`[IPC] ${CONNECTION_TEST} failed: ${errorMessage}`)
          resolve({ success: false, error: errorMessage })
        })
      })
    }

    // For other protocols, return not implemented
    return { success: false, error: `Test connection not implemented for ${protocol}` }
  })

  log.info('[IPC] Connection handlers registered')
}

/**
 * Translate Node.js socket errors to human-readable messages
 */
function translateConnectionError(err: Error & { code?: string }): string {
  switch (err.code) {
    case 'ECONNREFUSED':
      return 'Connection refused - no device listening at this address'
    case 'ETIMEDOUT':
      return 'Connection timeout - device not responding'
    case 'ENOTFOUND':
      return 'Host not found - check the hostname or IP address'
    case 'ENETUNREACH':
      return 'Network unreachable - check your network connection'
    case 'EHOSTUNREACH':
      return 'Host unreachable - device may be offline'
    case 'ECONNRESET':
      return 'Connection reset by device'
    case 'EADDRINUSE':
      return 'Address already in use'
    default:
      return err.message || 'Unknown connection error'
  }
}
