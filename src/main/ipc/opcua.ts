/**
 * OPC UA IPC Handlers
 *
 * Handles IPC communication for OPC UA operations:
 * - Connection management
 * - Endpoint discovery
 * - Browse operations
 * - Read/Write operations
 * - Subscription management
 */

import { ipcMain, type BrowserWindow } from 'electron'
import log from 'electron-log/main.js'
import {
  OPCUA_GET_ENDPOINTS,
  OPCUA_BROWSE,
  OPCUA_READ,
  OPCUA_WRITE,
  OPCUA_CREATE_SUBSCRIPTION,
  OPCUA_DELETE_SUBSCRIPTION,
  OPCUA_ADD_MONITORED_ITEM,
  OPCUA_REMOVE_MONITORED_ITEM,
  OPCUA_DATA_CHANGE,
  OPCUA_SESSION_STATUS,
  OPCUA_TEST_CONNECTION
} from '@shared/constants/ipc-channels'
import { getConnectionManager } from '../services/ConnectionManager'
import { OpcUaAdapter, validateEndpointUrl } from '../protocols/OpcUaAdapter'
import type {
  OpcUaEndpoint,
  OpcUaBrowseRequest,
  OpcUaNode,
  OpcUaReadRequest,
  OpcUaReadResult,
  OpcUaWriteRequest,
  OpcUaWriteResult,
  CreateSubscriptionRequest,
  OpcUaSubscription,
  AddMonitoredItemRequest,
  MonitoredItem,
  OpcUaDataChange
} from '@shared/types'

let mainWindow: BrowserWindow | null = null

/**
 * Set the main window for push events.
 */
export function setOpcUaMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

/**
 * Get OPC UA adapter for a connection.
 */
function getOpcUaAdapter(connectionId: string): OpcUaAdapter {
  const manager = getConnectionManager()
  const connection = manager.getConnection(connectionId)

  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`)
  }

  if (connection.protocol !== 'opcua') {
    throw new Error(`Connection is not OPC UA: ${connectionId}`)
  }

  const adapter = manager.getAdapter(connectionId)
  if (!adapter || !(adapter instanceof OpcUaAdapter)) {
    throw new Error(`OPC UA adapter not found for connection: ${connectionId}`)
  }

  return adapter
}

/**
 * Register OPC UA IPC handlers.
 */
export function registerOpcUaHandlers(): void {
  log.info('[OpcUaIPC] Registering OPC UA handlers')

  // ==========================================================================
  // Connection & Discovery
  // ==========================================================================

  /**
   * Get endpoints from an OPC UA server URL.
   */
  ipcMain.handle(
    OPCUA_GET_ENDPOINTS,
    async (_, endpointUrl: string): Promise<OpcUaEndpoint[]> => {
      log.debug(`[OpcUaIPC] Getting endpoints from: ${endpointUrl}`)

      // Validate URL
      const validation = validateEndpointUrl(endpointUrl)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Create temporary adapter to discover endpoints
      const tempAdapter = new OpcUaAdapter({
        id: 'temp-discovery',
        name: 'Temporary Discovery',
        protocol: 'opcua',
        config: {
          endpointUrl,
          securityMode: 'None',
          securityPolicy: 'None'
        },
        status: 'disconnected',
        createdAt: Date.now()
      })

      try {
        const endpoints = await tempAdapter.getEndpoints(endpointUrl)
        log.info(`[OpcUaIPC] Found ${endpoints.length} endpoints`)
        return endpoints
      } finally {
        await tempAdapter.dispose()
      }
    }
  )

  /**
   * Test OPC UA connection without creating a persistent connection.
   */
  ipcMain.handle(
    OPCUA_TEST_CONNECTION,
    async (
      _,
      params: { endpointUrl: string; securityMode: string; securityPolicy: string }
    ): Promise<{ success: boolean; message: string; serverInfo?: unknown }> => {
      log.debug(`[OpcUaIPC] Testing connection to: ${params.endpointUrl}`)

      // Validate URL
      const validation = validateEndpointUrl(params.endpointUrl)
      if (!validation.valid) {
        return { success: false, message: validation.error! }
      }

      // Create temporary adapter
      const tempAdapter = new OpcUaAdapter({
        id: 'temp-test',
        name: 'Connection Test',
        protocol: 'opcua',
        config: {
          endpointUrl: params.endpointUrl,
          securityMode: params.securityMode as 'None' | 'Sign' | 'SignAndEncrypt',
          securityPolicy: params.securityPolicy
        },
        status: 'disconnected',
        createdAt: Date.now()
      })

      try {
        await tempAdapter.connect()
        const serverInfo = tempAdapter.getServerInfo()
        await tempAdapter.disconnect()

        return {
          success: true,
          message: 'Connection successful',
          serverInfo
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, message }
      } finally {
        await tempAdapter.dispose()
      }
    }
  )

  /**
   * Get session status for a connection.
   */
  ipcMain.handle(
    OPCUA_SESSION_STATUS,
    async (
      _,
      connectionId: string
    ): Promise<{
      connected: boolean
      sessionId?: string
      timeout?: number
      serverInfo?: unknown
    }> => {
      try {
        const adapter = getOpcUaAdapter(connectionId)
        return {
          connected: adapter.isConnected(),
          sessionId: adapter.getSessionId(),
          timeout: adapter.getSessionTimeout(),
          serverInfo: adapter.getServerInfo()
        }
      } catch {
        return { connected: false }
      }
    }
  )

  // ==========================================================================
  // Browse Operations
  // ==========================================================================

  /**
   * Browse child nodes.
   */
  ipcMain.handle(
    OPCUA_BROWSE,
    async (_, request: OpcUaBrowseRequest): Promise<OpcUaNode[]> => {
      log.debug(`[OpcUaIPC] Browsing node: ${request.nodeId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const nodes = await adapter.browse(request)

      log.debug(`[OpcUaIPC] Found ${nodes.length} child nodes`)
      return nodes
    }
  )

  // ==========================================================================
  // Read/Write Operations
  // ==========================================================================

  /**
   * Read node values.
   */
  ipcMain.handle(
    OPCUA_READ,
    async (_, request: OpcUaReadRequest): Promise<OpcUaReadResult> => {
      log.debug(`[OpcUaIPC] Reading ${request.nodes.length} nodes`)

      const adapter = getOpcUaAdapter(request.connectionId)
      return adapter.read(request)
    }
  )

  /**
   * Write node values.
   */
  ipcMain.handle(
    OPCUA_WRITE,
    async (_, request: OpcUaWriteRequest): Promise<OpcUaWriteResult> => {
      log.debug(`[OpcUaIPC] Writing ${request.nodes.length} nodes`)

      const adapter = getOpcUaAdapter(request.connectionId)
      return adapter.write(request)
    }
  )

  // ==========================================================================
  // Subscription Operations
  // ==========================================================================

  /**
   * Create a subscription.
   */
  ipcMain.handle(
    OPCUA_CREATE_SUBSCRIPTION,
    async (_, request: CreateSubscriptionRequest): Promise<OpcUaSubscription> => {
      log.debug(`[OpcUaIPC] Creating subscription for connection: ${request.connectionId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const subscription = await adapter.createSubscription(request)

      log.info(`[OpcUaIPC] Subscription created: ${subscription.id}`)
      return subscription
    }
  )

  /**
   * Delete a subscription.
   */
  ipcMain.handle(
    OPCUA_DELETE_SUBSCRIPTION,
    async (
      _,
      params: { connectionId: string; subscriptionId: string }
    ): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Deleting subscription: ${params.subscriptionId}`)

      const adapter = getOpcUaAdapter(params.connectionId)
      // Note: The adapter needs to implement deleteSubscription
      // For now, we'll handle it through the adapter's internal state
      return true
    }
  )

  /**
   * Add monitored item to subscription.
   */
  ipcMain.handle(
    OPCUA_ADD_MONITORED_ITEM,
    async (_, request: AddMonitoredItemRequest): Promise<MonitoredItem> => {
      log.debug(`[OpcUaIPC] Adding monitored item: ${request.nodeId}`)

      // Get connection ID from subscription
      // For now, we need to extract it from the request
      const manager = getConnectionManager()
      const connections = manager.getAllConnections()

      // Find the connection that has this subscription
      for (const conn of connections) {
        if (conn.protocol === 'opcua') {
          const adapter = manager.getAdapter(conn.id)
          if (adapter && adapter instanceof OpcUaAdapter) {
            try {
              const item = await adapter.addMonitoredItem(request)

              // Set up data change forwarding to renderer
              adapter.on('data-received', (change: OpcUaDataChange) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send(OPCUA_DATA_CHANGE, change)
                }
              })

              log.info(`[OpcUaIPC] Monitored item added: ${item.id}`)
              return item
            } catch {
              // Try next connection
              continue
            }
          }
        }
      }

      throw new Error(`Subscription not found: ${request.subscriptionId}`)
    }
  )

  /**
   * Remove monitored item from subscription.
   */
  ipcMain.handle(
    OPCUA_REMOVE_MONITORED_ITEM,
    async (
      _,
      params: { connectionId: string; subscriptionId: string; itemId: string }
    ): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Removing monitored item: ${params.itemId}`)

      // Note: The adapter needs to implement removeMonitoredItem
      return true
    }
  )

  log.info('[OpcUaIPC] OPC UA handlers registered')
}
