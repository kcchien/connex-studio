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
  OPCUA_BROWSE_NEXT,
  OPCUA_BROWSE_PATH,
  OPCUA_SEARCH_NODES,
  OPCUA_READ_NODE_ATTRIBUTES,
  OPCUA_READ,
  OPCUA_WRITE,
  OPCUA_VALIDATE_WRITE_ACCESS,
  OPCUA_CREATE_SUBSCRIPTION,
  OPCUA_DELETE_SUBSCRIPTION,
  OPCUA_ADD_MONITORED_ITEM,
  OPCUA_MODIFY_MONITORED_ITEM,
  OPCUA_REMOVE_MONITORED_ITEM,
  OPCUA_SET_PUBLISHING_MODE,
  OPCUA_GET_SUBSCRIPTION_STATE,
  OPCUA_GET_SUBSCRIPTIONS,
  OPCUA_DATA_CHANGE,
  OPCUA_SESSION_STATUS,
  OPCUA_TEST_CONNECTION,
  OPCUA_LIST_CERTIFICATES,
  OPCUA_IMPORT_CERTIFICATE,
  OPCUA_EXPORT_CERTIFICATE,
  OPCUA_DELETE_CERTIFICATE,
  OPCUA_GENERATE_CERTIFICATE,
  OPCUA_TRUST_CERTIFICATE,
  OPCUA_REJECT_CERTIFICATE,
  OPCUA_GET_SERVER_CERTIFICATE,
  // Event channels (T136)
  OPCUA_SUBSCRIBE_EVENTS,
  OPCUA_UNSUBSCRIBE_EVENTS,
  OPCUA_ACKNOWLEDGE_CONDITION,
  OPCUA_CONFIRM_CONDITION,
  OPCUA_EVENT,
  // Method channels (T141)
  OPCUA_CALL_METHOD,
  OPCUA_GET_METHOD_ARGS,
  // History channels (T157)
  OPCUA_CHECK_HISTORIZING,
  OPCUA_READ_HISTORY_RAW,
  OPCUA_READ_HISTORY_PROCESSED,
  OPCUA_RELEASE_CONTINUATION_POINTS,
  // Discovery channels (T162)
  OPCUA_DISCOVER_SERVERS,
  OPCUA_FIND_SERVERS
} from '@shared/constants/ipc-channels'
import { getConnectionManager } from '../services/ConnectionManager'
import { getOpcUaCertificateStore } from '../services/OpcUaCertificateStore'
import {
  OpcUaAdapter,
  validateEndpointUrl,
  findServers,
  getServerEndpoints,
  clearDiscoveryCache,
  getDiscoveryCacheStats
} from '../protocols/OpcUaAdapter'
import type {
  OpcUaEndpoint,
  OpcUaBrowseRequest,
  OpcUaBrowseResult,
  OpcUaBrowseNextRequest,
  OpcUaBrowsePathRequest,
  OpcUaBrowsePathResult,
  OpcUaSearchNodesRequest,
  OpcUaSearchResult,
  OpcUaNodeAttributesRequest,
  OpcUaNodeAttributes,
  OpcUaReadRequest,
  OpcUaReadResult,
  OpcUaCertificate,
  ImportCertificateRequest,
  GenerateCertificateRequest,
  CertificateValidationResult,
  OpcUaWriteRequest,
  OpcUaWriteResult,
  OpcUaWriteValidation,
  CreateSubscriptionRequest,
  OpcUaSubscription,
  AddMonitoredItemRequest,
  ModifyMonitoredItemRequest,
  SetPublishingModeRequest,
  DeleteSubscriptionRequest,
  RemoveMonitoredItemRequest,
  SubscriptionState,
  MonitoredItem,
  OpcUaDataChange,
  // Event types (T136)
  SubscribeEventsRequest,
  AcknowledgeConditionRequest,
  ConfirmConditionRequest,
  OpcUaEvent,
  OpcUaNode,
  // Method types (T141)
  OpcUaCallMethodRequest,
  OpcUaCallMethodResult,
  OpcUaMethodArguments,
  // History types (T157)
  HistorizingCheckRequest,
  HistorizingCheckResult,
  HistoryReadRawRequest,
  HistoryReadRawResult,
  HistoryReadProcessedRequest,
  HistoryReadProcessedResult,
  // Discovery types (T162)
  DiscoverServersRequest,
  DiscoverServersResult,
  GetEndpointsRequest,
  GetEndpointsResult
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
  // Browse Operations (T091)
  // ==========================================================================

  /**
   * Browse child nodes with lazy loading support.
   */
  ipcMain.handle(
    OPCUA_BROWSE,
    async (_, request: OpcUaBrowseRequest): Promise<OpcUaBrowseResult> => {
      log.debug(`[OpcUaIPC] Browsing node: ${request.nodeId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.browse(request)

      log.debug(`[OpcUaIPC] Found ${result.nodes.length} child nodes, hasMore: ${result.hasMore}`)
      return result
    }
  )

  /**
   * Continue browsing with continuation point.
   */
  ipcMain.handle(
    OPCUA_BROWSE_NEXT,
    async (_, request: OpcUaBrowseNextRequest): Promise<OpcUaBrowseResult> => {
      log.debug('[OpcUaIPC] Continuing browse with continuation point')

      const adapter = getOpcUaAdapter(request.connectionId)
      return adapter.browseNext(request)
    }
  )

  /**
   * Translate browse path to node ID.
   */
  ipcMain.handle(
    OPCUA_BROWSE_PATH,
    async (_, request: OpcUaBrowsePathRequest): Promise<OpcUaBrowsePathResult> => {
      log.debug(`[OpcUaIPC] Translating browse path from: ${request.startingNode}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      return adapter.translateBrowsePath(request)
    }
  )

  /**
   * Search for nodes by DisplayName pattern.
   */
  ipcMain.handle(
    OPCUA_SEARCH_NODES,
    async (_, request: OpcUaSearchNodesRequest): Promise<OpcUaSearchResult> => {
      log.debug(`[OpcUaIPC] Searching nodes with pattern: ${request.searchPattern}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.searchNodes(request)

      log.debug(`[OpcUaIPC] Found ${result.nodes.length} matching nodes`)
      return result
    }
  )

  /**
   * Read comprehensive node attributes.
   */
  ipcMain.handle(
    OPCUA_READ_NODE_ATTRIBUTES,
    async (_, request: OpcUaNodeAttributesRequest): Promise<OpcUaNodeAttributes> => {
      log.debug(`[OpcUaIPC] Reading attributes for: ${request.nodeId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      return adapter.readNodeAttributes(request)
    }
  )

  // ==========================================================================
  // Read/Write Operations (T095-T103)
  // ==========================================================================

  /**
   * Read node values (T095, T096, T097, T098, T099).
   * Supports single and batch read with data type handling and StatusCode display.
   */
  ipcMain.handle(
    OPCUA_READ,
    async (_, request: OpcUaReadRequest): Promise<OpcUaReadResult> => {
      log.debug(`[OpcUaIPC] Reading ${request.nodes.length} nodes`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.read(request)

      log.debug(`[OpcUaIPC] Read complete: ${result.values.length} values`)
      return result
    }
  )

  /**
   * Validate write access for nodes (T102, T103).
   * Checks AccessLevel before write attempt.
   */
  ipcMain.handle(
    OPCUA_VALIDATE_WRITE_ACCESS,
    async (
      _,
      params: { connectionId: string; nodeIds: string[] }
    ): Promise<OpcUaWriteValidation[]> => {
      log.debug(`[OpcUaIPC] Validating write access for ${params.nodeIds.length} nodes`)

      const adapter = getOpcUaAdapter(params.connectionId)
      return adapter.validateWriteAccess(params.nodeIds)
    }
  )

  /**
   * Write node values (T100, T101, T103).
   * Supports single and batch write with data type validation.
   */
  ipcMain.handle(
    OPCUA_WRITE,
    async (_, request: OpcUaWriteRequest): Promise<OpcUaWriteResult> => {
      log.debug(`[OpcUaIPC] Writing ${request.nodes.length} nodes`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.write(request)

      const successCount = result.results.filter(r => r.success).length
      log.info(`[OpcUaIPC] Write complete: ${successCount}/${result.results.length} successful`)
      return result
    }
  )

  // ==========================================================================
  // Subscription Operations (T105-T112)
  // ==========================================================================

  /**
   * Create a subscription (T105).
   * Supports configurable publishing interval, lifetime, and keep-alive.
   */
  ipcMain.handle(
    OPCUA_CREATE_SUBSCRIPTION,
    async (_, request: CreateSubscriptionRequest): Promise<OpcUaSubscription> => {
      log.debug(`[OpcUaIPC] Creating subscription for connection: ${request.connectionId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const subscription = await adapter.createSubscription(request)

      // Set up data change forwarding to renderer
      adapter.on('data-received', (change: OpcUaDataChange) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(OPCUA_DATA_CHANGE, change)
        }
      })

      log.info(`[OpcUaIPC] Subscription created: ${subscription.id}, interval: ${subscription.publishingInterval}ms`)
      return subscription
    }
  )

  /**
   * Delete a subscription (T109).
   */
  ipcMain.handle(
    OPCUA_DELETE_SUBSCRIPTION,
    async (_, request: DeleteSubscriptionRequest): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Deleting subscription: ${request.subscriptionId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      await adapter.deleteSubscription(request)

      log.info(`[OpcUaIPC] Subscription deleted: ${request.subscriptionId}`)
      return true
    }
  )

  /**
   * Add monitored item to subscription (T106, T107, T108).
   * Supports deadband filtering (None, Absolute, Percent).
   */
  ipcMain.handle(
    OPCUA_ADD_MONITORED_ITEM,
    async (
      _,
      params: { connectionId: string } & AddMonitoredItemRequest
    ): Promise<MonitoredItem> => {
      log.debug(`[OpcUaIPC] Adding monitored item: ${params.nodeId}`)

      const adapter = getOpcUaAdapter(params.connectionId)
      const item = await adapter.addMonitoredItem(params)

      log.info(`[OpcUaIPC] Monitored item added: ${item.id}, deadband: ${item.deadbandType}`)
      return item
    }
  )

  /**
   * Modify monitored item parameters (T106).
   */
  ipcMain.handle(
    OPCUA_MODIFY_MONITORED_ITEM,
    async (
      _,
      params: { connectionId: string } & ModifyMonitoredItemRequest
    ): Promise<MonitoredItem> => {
      log.debug(`[OpcUaIPC] Modifying monitored item: ${params.itemId}`)

      const adapter = getOpcUaAdapter(params.connectionId)
      const item = await adapter.modifyMonitoredItem(params)

      log.info(`[OpcUaIPC] Monitored item modified: ${item.id}`)
      return item
    }
  )

  /**
   * Remove monitored item from subscription.
   */
  ipcMain.handle(
    OPCUA_REMOVE_MONITORED_ITEM,
    async (_, request: RemoveMonitoredItemRequest): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Removing monitored item: ${request.itemId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      await adapter.removeMonitoredItem(request)

      log.info(`[OpcUaIPC] Monitored item removed: ${request.itemId}`)
      return true
    }
  )

  /**
   * Set publishing mode for subscription (T110).
   * Enables pause/resume functionality.
   */
  ipcMain.handle(
    OPCUA_SET_PUBLISHING_MODE,
    async (_, request: SetPublishingModeRequest): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Setting publishing mode: ${request.publishingEnabled} for subscription: ${request.subscriptionId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.setPublishingMode(request)

      log.info(`[OpcUaIPC] Publishing mode set to: ${result}`)
      return result
    }
  )

  /**
   * Get subscription state (T109).
   */
  ipcMain.handle(
    OPCUA_GET_SUBSCRIPTION_STATE,
    async (
      _,
      params: { connectionId: string; subscriptionId: string }
    ): Promise<SubscriptionState> => {
      log.debug(`[OpcUaIPC] Getting subscription state: ${params.subscriptionId}`)

      const adapter = getOpcUaAdapter(params.connectionId)
      return adapter.getSubscriptionState(params.subscriptionId)
    }
  )

  /**
   * Get all subscriptions for a connection.
   */
  ipcMain.handle(
    OPCUA_GET_SUBSCRIPTIONS,
    async (_, connectionId: string): Promise<OpcUaSubscription[]> => {
      log.debug(`[OpcUaIPC] Getting subscriptions for connection: ${connectionId}`)

      const adapter = getOpcUaAdapter(connectionId)
      return adapter.getSubscriptions()
    }
  )

  // ==========================================================================
  // Certificate Management (T124-T131)
  // ==========================================================================

  /**
   * List all certificates in the store.
   */
  ipcMain.handle(
    OPCUA_LIST_CERTIFICATES,
    async (): Promise<OpcUaCertificate[]> => {
      log.debug('[OpcUaIPC] Listing certificates')

      const store = getOpcUaCertificateStore()
      await store.initialize()
      return store.list()
    }
  )

  /**
   * Import a certificate from file.
   */
  ipcMain.handle(
    OPCUA_IMPORT_CERTIFICATE,
    async (_, request: ImportCertificateRequest): Promise<OpcUaCertificate> => {
      log.debug(`[OpcUaIPC] Importing certificate from: ${request.certificatePath}`)

      const store = getOpcUaCertificateStore()
      await store.initialize()
      const cert = await store.import(request)

      log.info(`[OpcUaIPC] Certificate imported: ${cert.subject}`)
      return cert
    }
  )

  /**
   * Export a certificate to file.
   */
  ipcMain.handle(
    OPCUA_EXPORT_CERTIFICATE,
    async (_, params: { id: string; exportPath: string }): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Exporting certificate: ${params.id}`)

      const store = getOpcUaCertificateStore()
      await store.initialize()
      const result = await store.export(params.id, params.exportPath)

      if (result) {
        log.info(`[OpcUaIPC] Certificate exported to: ${params.exportPath}`)
      }
      return result
    }
  )

  /**
   * Delete a certificate from the store.
   */
  ipcMain.handle(
    OPCUA_DELETE_CERTIFICATE,
    async (_, id: string): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Deleting certificate: ${id}`)

      const store = getOpcUaCertificateStore()
      await store.initialize()
      const result = await store.delete(id)

      if (result) {
        log.info(`[OpcUaIPC] Certificate deleted: ${id}`)
      }
      return result
    }
  )

  /**
   * Generate a self-signed certificate.
   */
  ipcMain.handle(
    OPCUA_GENERATE_CERTIFICATE,
    async (_, request: GenerateCertificateRequest): Promise<OpcUaCertificate> => {
      log.debug('[OpcUaIPC] Generating self-signed certificate')

      const store = getOpcUaCertificateStore()
      await store.initialize()
      const cert = await store.generate(request)

      log.info(`[OpcUaIPC] Certificate generated: ${cert.subject}`)
      return cert
    }
  )

  /**
   * Trust a certificate.
   */
  ipcMain.handle(
    OPCUA_TRUST_CERTIFICATE,
    async (_, id: string): Promise<OpcUaCertificate> => {
      log.debug(`[OpcUaIPC] Trusting certificate: ${id}`)

      const store = getOpcUaCertificateStore()
      await store.initialize()
      const cert = await store.trust(id)

      log.info(`[OpcUaIPC] Certificate trusted: ${cert.subject}`)
      return cert
    }
  )

  /**
   * Reject a certificate.
   */
  ipcMain.handle(
    OPCUA_REJECT_CERTIFICATE,
    async (_, id: string): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Rejecting certificate: ${id}`)

      const store = getOpcUaCertificateStore()
      await store.initialize()
      const result = await store.reject(id)

      if (result) {
        log.info(`[OpcUaIPC] Certificate rejected: ${id}`)
      }
      return result
    }
  )

  /**
   * Get server certificate from endpoint URL.
   */
  ipcMain.handle(
    OPCUA_GET_SERVER_CERTIFICATE,
    async (_, endpointUrl: string): Promise<OpcUaCertificate | null> => {
      log.debug(`[OpcUaIPC] Getting server certificate from: ${endpointUrl}`)

      const store = getOpcUaCertificateStore()
      await store.initialize()
      return store.getServerCertificate(endpointUrl)
    }
  )

  // ==========================================================================
  // Event Operations (T132-T136)
  // ==========================================================================

  /**
   * Subscribe to events from a source node.
   */
  ipcMain.handle(
    OPCUA_SUBSCRIBE_EVENTS,
    async (_, request: SubscribeEventsRequest): Promise<string> => {
      log.debug(`[OpcUaIPC] Subscribing to events from: ${request.sourceNodeId}`)

      const adapter = getOpcUaAdapter(request.connectionId)

      // Set up event forwarding to renderer
      adapter.on('opcua-event', (eventData: { eventSubscriptionId: string; sourceNodeId: string; event: OpcUaEvent }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(OPCUA_EVENT, eventData)
        }
      })

      const subscriptionId = await adapter.subscribeEvents(request)

      log.info(`[OpcUaIPC] Event subscription created: ${subscriptionId}`)
      return subscriptionId
    }
  )

  /**
   * Unsubscribe from events.
   */
  ipcMain.handle(
    OPCUA_UNSUBSCRIBE_EVENTS,
    async (
      _,
      params: { connectionId: string; eventSubscriptionId: string }
    ): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Unsubscribing from events: ${params.eventSubscriptionId}`)

      const adapter = getOpcUaAdapter(params.connectionId)
      await adapter.unsubscribeEvents(params.eventSubscriptionId)

      log.info(`[OpcUaIPC] Event subscription removed: ${params.eventSubscriptionId}`)
      return true
    }
  )

  /**
   * Acknowledge a condition/alarm.
   */
  ipcMain.handle(
    OPCUA_ACKNOWLEDGE_CONDITION,
    async (_, request: AcknowledgeConditionRequest): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Acknowledging condition: ${request.conditionId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      await adapter.acknowledgeCondition(request)

      log.info(`[OpcUaIPC] Condition acknowledged: ${request.conditionId}`)
      return true
    }
  )

  /**
   * Confirm a condition/alarm.
   */
  ipcMain.handle(
    OPCUA_CONFIRM_CONDITION,
    async (_, request: ConfirmConditionRequest): Promise<boolean> => {
      log.debug(`[OpcUaIPC] Confirming condition: ${request.conditionId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      await adapter.confirmCondition(request)

      log.info(`[OpcUaIPC] Condition confirmed: ${request.conditionId}`)
      return true
    }
  )

  // ==========================================================================
  // Method Operations (T138-T141)
  // ==========================================================================

  /**
   * Get method arguments definition.
   */
  ipcMain.handle(
    OPCUA_GET_METHOD_ARGS,
    async (
      _,
      params: { connectionId: string; objectId: string; methodId: string }
    ): Promise<OpcUaMethodArguments> => {
      log.debug(`[OpcUaIPC] Getting method arguments for: ${params.methodId}`)

      const adapter = getOpcUaAdapter(params.connectionId)
      const args = await adapter.getMethodArguments(params.objectId, params.methodId)

      log.debug(`[OpcUaIPC] Method has ${args.inputArguments.length} inputs, ${args.outputArguments.length} outputs`)
      return args
    }
  )

  /**
   * Call a method on an object.
   */
  ipcMain.handle(
    OPCUA_CALL_METHOD,
    async (_, request: OpcUaCallMethodRequest): Promise<OpcUaCallMethodResult> => {
      log.debug(`[OpcUaIPC] Calling method: ${request.methodId} on ${request.objectId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.callMethod(request)

      log.info(`[OpcUaIPC] Method call completed with status: ${result.statusCode}`)
      return result
    }
  )

  // ==========================================================================
  // Historical Access Operations (T157)
  // ==========================================================================

  /**
   * Check if a node supports historizing.
   */
  ipcMain.handle(
    OPCUA_CHECK_HISTORIZING,
    async (_, request: HistorizingCheckRequest): Promise<HistorizingCheckResult> => {
      log.debug(`[OpcUaIPC] Checking historizing for node: ${request.nodeId}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.checkHistorizing(request)

      log.info(`[OpcUaIPC] Node ${request.nodeId} historizing: ${result.historizing}`)
      return result
    }
  )

  /**
   * Read raw historical data.
   */
  ipcMain.handle(
    OPCUA_READ_HISTORY_RAW,
    async (_, request: HistoryReadRawRequest): Promise<HistoryReadRawResult> => {
      log.debug(`[OpcUaIPC] Reading raw history for ${request.nodeIds.length} nodes`)
      log.debug(`[OpcUaIPC] Time range: ${request.startTime} to ${request.endTime}`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.readHistoryRaw(request)

      const totalValues = result.results.reduce((sum, r) => sum + r.dataValues.length, 0)
      log.info(`[OpcUaIPC] Read ${totalValues} raw history values`)
      return result
    }
  )

  /**
   * Read processed/aggregated historical data.
   */
  ipcMain.handle(
    OPCUA_READ_HISTORY_PROCESSED,
    async (_, request: HistoryReadProcessedRequest): Promise<HistoryReadProcessedResult> => {
      log.debug(`[OpcUaIPC] Reading processed history for ${request.nodeIds.length} nodes`)
      log.debug(`[OpcUaIPC] Aggregate: ${request.aggregateType}, interval: ${request.processingInterval}ms`)

      const adapter = getOpcUaAdapter(request.connectionId)
      const result = await adapter.readHistoryProcessed(request)

      const totalValues = result.results.reduce((sum, r) => sum + r.dataValues.length, 0)
      log.info(`[OpcUaIPC] Read ${totalValues} processed history values`)
      return result
    }
  )

  /**
   * Release continuation points.
   */
  ipcMain.handle(
    OPCUA_RELEASE_CONTINUATION_POINTS,
    async (
      _,
      params: { connectionId: string; continuationPoints: string[] }
    ): Promise<void> => {
      log.debug(`[OpcUaIPC] Releasing ${params.continuationPoints.length} continuation points`)

      const adapter = getOpcUaAdapter(params.connectionId)
      await adapter.releaseContinuationPoints(params.continuationPoints)

      log.info(`[OpcUaIPC] Released continuation points`)
    }
  )

  // ==========================================================================
  // Discovery Methods (T159-T162)
  // ==========================================================================

  /**
   * Discover OPC UA servers via LDS or direct endpoint (T159).
   */
  ipcMain.handle(
    OPCUA_DISCOVER_SERVERS,
    async (_, request: DiscoverServersRequest): Promise<DiscoverServersResult> => {
      const discoveryUrl = request.discoveryUrl ?? 'opc.tcp://localhost:4840'
      log.info(`[OpcUaIPC] Discovering servers at ${discoveryUrl}`)

      const result = await findServers(request)

      if (result.error) {
        log.warn(`[OpcUaIPC] Discovery error: ${result.error}`)
      } else {
        log.info(`[OpcUaIPC] Discovered ${result.servers.length} servers`)
      }

      return result
    }
  )

  /**
   * Get endpoints from a discovered server (T160).
   */
  ipcMain.handle(
    OPCUA_FIND_SERVERS,
    async (_, request: GetEndpointsRequest): Promise<GetEndpointsResult> => {
      log.info(`[OpcUaIPC] Getting endpoints from ${request.endpointUrl}`)

      const result = await getServerEndpoints(request)

      if (result.error) {
        log.warn(`[OpcUaIPC] GetEndpoints error: ${result.error}`)
      } else {
        log.info(`[OpcUaIPC] Found ${result.endpoints.length} endpoints`)
      }

      return result
    }
  )

  log.info('[OpcUaIPC] OPC UA handlers registered')
}
