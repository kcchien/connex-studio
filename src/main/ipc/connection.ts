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
  CONNECTION_READ_ONCE
} from '@shared/constants/ipc-channels'
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

  log.info('[IPC] Connection handlers registered')
}
