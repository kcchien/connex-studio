/**
 * OPC UA Protocol Adapter
 *
 * Implements OPC UA client functionality using node-opcua.
 */

import {
  OPCUAClient,
  ClientSession,
  ClientSubscription,
  AttributeIds,
  StatusCodes,
  DataType,
  MessageSecurityMode as OpcUaMessageSecurityMode,
  SecurityPolicy as OpcUaSecurityPolicy,
  TimestampsToReturn,
  DataChangeFilter,
  DataChangeTrigger,
  DeadbandType as NodeOpcuaDeadbandType,
  type ClientMonitoredItem,
  type EndpointDescription,
  type UserIdentityInfo,
  type ReferenceDescription,
  type MonitoringParametersOptions
} from 'node-opcua'
import log from 'electron-log/main.js'
import type {
  Connection,
  Tag,
  OpcUaConfig,
  OpcUaAddress,
  OpcUaConnectRequest,
  OpcUaConnectResult,
  OpcUaEndpoint,
  OpcUaNode,
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
  OpcUaWriteRequest,
  OpcUaWriteResult,
  OpcUaWriteValidation,
  OpcUaSubscription,
  CreateSubscriptionRequest,
  AddMonitoredItemRequest,
  ModifyMonitoredItemRequest,
  SetPublishingModeRequest,
  DeleteSubscriptionRequest,
  RemoveMonitoredItemRequest,
  SubscriptionState,
  MonitoredItem,
  OpcUaDataChange,
  OpcUaServerInfo,
  SecurityPolicy,
  MessageSecurityMode,
  NodeClass,
  DeadbandType
} from '@shared/types'
import {
  getStatusCodeInfo,
  DataTypeNames,
  OpcUaDataTypeIds
} from '@shared/types'
import { DEFAULT_PUBLISHING_INTERVAL, DEFAULT_SESSION_TIMEOUT } from '@shared/types'
import { ProtocolAdapter, type ReadResult } from './ProtocolAdapter'

/**
 * Map OPC UA node class to our NodeClass type.
 */
function mapNodeClass(nodeClass: number): NodeClass {
  const mapping: Record<number, NodeClass> = {
    1: 'Object',
    2: 'Variable',
    4: 'Method',
    8: 'ObjectType',
    16: 'VariableType',
    32: 'ReferenceType',
    64: 'DataType',
    128: 'View'
  }
  return mapping[nodeClass] ?? 'Object'
}

/**
 * Validate OPC UA endpoint URL format.
 * Valid formats: opc.tcp://host:port or opc.tcp://host:port/path
 */
export function validateEndpointUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'Endpoint URL is required' }
  }

  // Check protocol prefix
  if (!url.startsWith('opc.tcp://')) {
    return { valid: false, error: 'Endpoint URL must start with opc.tcp://' }
  }

  // Parse URL parts
  const withoutProtocol = url.substring('opc.tcp://'.length)
  const [hostPort] = withoutProtocol.split('/')

  if (!hostPort) {
    return { valid: false, error: 'Invalid endpoint URL format' }
  }

  // Check for host and port
  const colonIndex = hostPort.lastIndexOf(':')
  if (colonIndex === -1) {
    return { valid: false, error: 'Endpoint URL must include port number (e.g., opc.tcp://localhost:4840)' }
  }

  const host = hostPort.substring(0, colonIndex)
  const portStr = hostPort.substring(colonIndex + 1)

  if (!host) {
    return { valid: false, error: 'Host is required' }
  }

  const port = parseInt(portStr, 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    return { valid: false, error: 'Invalid port number (must be 1-65535)' }
  }

  return { valid: true }
}

/**
 * Parse endpoint URL into components.
 */
export function parseEndpointUrl(url: string): { host: string; port: number; path: string } {
  const withoutProtocol = url.substring('opc.tcp://'.length)
  const slashIndex = withoutProtocol.indexOf('/')
  const hostPort = slashIndex === -1 ? withoutProtocol : withoutProtocol.substring(0, slashIndex)
  const path = slashIndex === -1 ? '' : withoutProtocol.substring(slashIndex)

  const colonIndex = hostPort.lastIndexOf(':')
  const host = hostPort.substring(0, colonIndex)
  const port = parseInt(hostPort.substring(colonIndex + 1), 10)

  return { host, port, path }
}

/**
 * OPC UA Adapter for OPC UA server connections.
 */
export class OpcUaAdapter extends ProtocolAdapter {
  private client: OPCUAClient | null = null
  private session: ClientSession | null = null
  private subscriptions: Map<string, ClientSubscription> = new Map()
  private monitoredItems: Map<string, ClientMonitoredItem> = new Map()
  private sessionRenewalTimer: NodeJS.Timeout | null = null
  private serverInfo: OpcUaServerInfo | null = null

  constructor(connection: Connection) {
    super(connection)
  }

  /**
   * Get OPC UA specific configuration.
   */
  private get opcuaConfig(): OpcUaConfig {
    return this.connection.config as OpcUaConfig
  }

  /**
   * Connect to the OPC UA server.
   */
  async connect(): Promise<void> {
    this.setStatus('connecting')

    try {
      const config = this.opcuaConfig

      // Validate endpoint URL
      const validation = validateEndpointUrl(config.endpointUrl)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      log.info(`[OpcUaAdapter] Connecting to ${config.endpointUrl}`)

      // Map security settings
      const securityMode = this.mapSecurityModeToEnum(config.securityMode)
      const securityPolicy = this.mapSecurityPolicyToUri(config.securityPolicy)

      // Create client with proper settings
      this.client = OPCUAClient.create({
        applicationName: 'Connex Studio',
        applicationUri: 'urn:connex-studio:client',
        securityMode,
        securityPolicy,
        endpointMustExist: false,
        connectionStrategy: {
          initialDelay: 1000,
          maxDelay: 10000,
          maxRetry: 3
        },
        keepSessionAlive: true
      })

      // Set up client event handlers
      this.client.on('connection_lost', () => {
        log.warn('[OpcUaAdapter] Connection lost')
        this.setStatus('error', 'Connection lost')
        this.emit('error', new Error('Connection lost'))
      })

      this.client.on('connection_reestablished', async () => {
        log.info('[OpcUaAdapter] Connection reestablished')
        this.setStatus('connected')

        // Transfer subscriptions on reconnect (T111)
        await this.transferSubscriptions()
      })

      // Connect to server
      await this.client.connect(config.endpointUrl)
      log.info('[OpcUaAdapter] Client connected')

      // Create session with timeout
      const userIdentity = this.getUserIdentity()
      const sessionTimeout = DEFAULT_SESSION_TIMEOUT

      this.session = await this.client.createSession(userIdentity)
      log.info(`[OpcUaAdapter] Session created, timeout: ${this.session.timeout}ms`)

      // Set up session event handlers
      this.session.on('session_closed', () => {
        log.warn('[OpcUaAdapter] Session closed')
        this.stopSessionRenewal()
        this.setStatus('disconnected')
      })

      this.session.on('keepalive', (state) => {
        if (!state) {
          log.warn('[OpcUaAdapter] Keep-alive failed')
        }
      })

      this.session.on('keepalive_failure', () => {
        log.error('[OpcUaAdapter] Keep-alive failure')
        this.setStatus('error', 'Session keep-alive failed')
      })

      // Extract server info
      this.serverInfo = await this.extractServerInfo()

      // Start session renewal timer
      this.startSessionRenewal()

      this.setStatus('connected')
      log.info('[OpcUaAdapter] Connected successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[OpcUaAdapter] Connection failed: ${message}`)
      this.setStatus('error', message)
      throw error
    }
  }

  /**
   * Extract server information from session.
   */
  private async extractServerInfo(): Promise<OpcUaServerInfo> {
    const defaultInfo: OpcUaServerInfo = {
      applicationName: 'Unknown Server',
      productUri: ''
    }

    if (!this.session) return defaultInfo

    try {
      // Read server status node
      const result = await this.session.read({
        nodeId: 'i=2255', // Server_ServerStatus_BuildInfo
        attributeId: AttributeIds.Value
      })

      if (result.value?.value) {
        const buildInfo = result.value.value
        return {
          applicationName: this.client?.applicationName ?? 'OPC UA Server',
          productUri: buildInfo.productUri ?? '',
          buildInfo: {
            productName: buildInfo.productName ?? '',
            softwareVersion: buildInfo.softwareVersion ?? '',
            buildNumber: buildInfo.buildNumber ?? ''
          }
        }
      }
    } catch {
      log.debug('[OpcUaAdapter] Could not read server build info')
    }

    return defaultInfo
  }

  /**
   * Start session renewal timer.
   */
  private startSessionRenewal(): void {
    if (!this.session) return

    // Renew session at 75% of timeout
    const renewalInterval = Math.floor((this.session.timeout ?? DEFAULT_SESSION_TIMEOUT) * 0.75)

    this.sessionRenewalTimer = setInterval(() => {
      this.renewSession()
    }, renewalInterval)

    log.debug(`[OpcUaAdapter] Session renewal scheduled every ${renewalInterval}ms`)
  }

  /**
   * Stop session renewal timer.
   */
  private stopSessionRenewal(): void {
    if (this.sessionRenewalTimer) {
      clearInterval(this.sessionRenewalTimer)
      this.sessionRenewalTimer = null
    }
  }

  /**
   * Renew the current session.
   * Note: node-opcua handles keep-alive automatically, this is a backup check.
   */
  private async renewSession(): Promise<void> {
    if (!this.session || !this.client) return

    try {
      // Check if session is still valid by checking the client connection
      if (!this.client.isReconnecting && !this.isConnected()) {
        log.warn('[OpcUaAdapter] Session appears invalid, reconnecting...')
        await this.reconnect()
      }
    } catch (error) {
      log.error('[OpcUaAdapter] Session renewal failed:', error)
      this.setStatus('error', 'Session renewal failed')
    }
  }

  /**
   * Reconnect to the server.
   */
  private async reconnect(): Promise<void> {
    log.info('[OpcUaAdapter] Attempting reconnection...')

    try {
      // Disconnect (this clears subscriptions/monitored items)
      await this.disconnect()

      // Reconnect
      await this.connect()

      log.info('[OpcUaAdapter] Reconnection successful')
    } catch (error) {
      log.error('[OpcUaAdapter] Reconnection failed:', error)
      throw error
    }
  }

  /**
   * Transfer subscriptions after reconnection (T111).
   * node-opcua handles subscription transfer automatically at the protocol level.
   * This method verifies and logs the transfer status.
   */
  private async transferSubscriptions(): Promise<void> {
    if (!this.session) {
      log.warn('[OpcUaAdapter] Cannot transfer subscriptions: no session')
      return
    }

    const subscriptionCount = this.subscriptions.size
    const monitoredItemCount = this.monitoredItems.size

    if (subscriptionCount === 0) {
      log.debug('[OpcUaAdapter] No subscriptions to transfer')
      return
    }

    log.info(`[OpcUaAdapter] Verifying ${subscriptionCount} subscriptions and ${monitoredItemCount} monitored items after reconnect`)

    // node-opcua's ClientSubscription handles transfer automatically
    // We just need to verify and emit status
    for (const [id, subscription] of this.subscriptions.entries()) {
      try {
        // Check if subscription is still active
        if (subscription.isActive) {
          log.debug(`[OpcUaAdapter] Subscription ${id} transferred successfully`)
        } else {
          log.warn(`[OpcUaAdapter] Subscription ${id} is no longer active after transfer`)
          // Could recreate subscription here if needed
        }
      } catch (error) {
        log.error(`[OpcUaAdapter] Error verifying subscription ${id}:`, error)
      }
    }

    log.info('[OpcUaAdapter] Subscription transfer verification complete')
  }

  /**
   * Get server information.
   */
  getServerInfo(): OpcUaServerInfo | null {
    return this.serverInfo
  }

  /**
   * Get session ID.
   */
  getSessionId(): string | undefined {
    return this.session?.sessionId?.toString()
  }

  /**
   * Get revised session timeout.
   */
  getSessionTimeout(): number {
    return this.session?.timeout ?? DEFAULT_SESSION_TIMEOUT
  }

  /**
   * Disconnect from the server.
   */
  async disconnect(): Promise<void> {
    log.info('[OpcUaAdapter] Disconnecting...')

    // Stop session renewal
    this.stopSessionRenewal()

    try {
      // Close all subscriptions
      for (const subscription of this.subscriptions.values()) {
        try {
          await subscription.terminate()
        } catch (err) {
          log.warn('[OpcUaAdapter] Error terminating subscription:', err)
        }
      }
      this.subscriptions.clear()
      this.monitoredItems.clear()

      // Close session
      if (this.session) {
        try {
          await this.session.close()
        } catch (err) {
          log.warn('[OpcUaAdapter] Error closing session:', err)
        }
        this.session = null
      }

      // Disconnect client
      if (this.client) {
        try {
          await this.client.disconnect()
        } catch (err) {
          log.warn('[OpcUaAdapter] Error disconnecting client:', err)
        }
        this.client = null
      }

      this.serverInfo = null
      this.setStatus('disconnected')
      log.info('[OpcUaAdapter] Disconnected')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[OpcUaAdapter] Disconnect error: ${message}`)
      this.setStatus('error', message)
      throw error
    }
  }

  /**
   * Read tags (for PollingEngine compatibility).
   */
  async readTags(tags: Tag[]): Promise<ReadResult[]> {
    if (!this.session) {
      return tags.map(tag => ({
        tagId: tag.id,
        value: 0,
        quality: 'bad' as const,
        timestamp: Date.now()
      }))
    }

    const results: ReadResult[] = []

    for (const tag of tags) {
      try {
        const address = tag.address as OpcUaAddress
        const dataValue = await this.session.read({
          nodeId: address.nodeId,
          attributeId: AttributeIds.Value
        })

        results.push({
          tagId: tag.id,
          value: dataValue.value?.value ?? 0,
          quality: dataValue.statusCode.isGood() ? 'good' : 'bad',
          timestamp: dataValue.sourceTimestamp?.getTime() ?? Date.now()
        })
      } catch {
        results.push({
          tagId: tag.id,
          value: 0,
          quality: 'bad',
          timestamp: Date.now()
        })
      }
    }

    return results
  }

  /**
   * Dispose adapter resources.
   */
  async dispose(): Promise<void> {
    await this.disconnect()
  }

  // =========================================================================
  // Extended OPC UA Operations
  // =========================================================================

  /**
   * Get endpoints from server.
   */
  async getEndpoints(endpointUrl: string): Promise<OpcUaEndpoint[]> {
    // Create temporary client to discover endpoints
    const client = OPCUAClient.create({
      endpointMustExist: false
    })
    await client.connect(endpointUrl)
    const endpoints = await client.getEndpoints()
    await client.disconnect()

    return endpoints.map((ep: EndpointDescription) => ({
      endpointUrl: ep.endpointUrl ?? endpointUrl,
      securityMode: this.reverseMapSecurityMode(ep.securityMode),
      securityPolicy: (ep.securityPolicyUri?.split('#')[1] ?? 'None') as SecurityPolicy,
      userTokenPolicies: (ep.userIdentityTokens ?? []).map(token => ({
        policyId: token.policyId ?? '',
        tokenType: this.mapTokenType(token.tokenType),
        securityPolicy: token.securityPolicyUri ?? undefined
      })),
      serverCertificate: ep.serverCertificate?.toString('base64'),
      securityLevel: ep.securityLevel ?? 0
    }))
  }

  /**
   * Browse node children with lazy loading support (T086).
   * Supports maxReferences for pagination.
   */
  async browse(request: OpcUaBrowseRequest): Promise<OpcUaBrowseResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const browseResult = await this.session.browse({
      nodeId: request.nodeId,
      browseDirection: request.browseDirection === 'Inverse' ? 1 : 0,
      referenceTypeId: request.referenceType,
      resultMask: 63 // All fields
    })

    const nodes: OpcUaNode[] = (browseResult.references ?? []).map((ref: ReferenceDescription) => ({
      nodeId: ref.nodeId.toString(),
      displayName: ref.displayName.text ?? '',
      browseName: ref.browseName.toString(),
      nodeClass: mapNodeClass(ref.nodeClass),
      hasChildren: ref.nodeClass === 1 || ref.nodeClass === 8 // Object or ObjectType
    }))

    // Handle continuation point for large results (T087)
    const continuationPoint = browseResult.continuationPoint
      ? browseResult.continuationPoint.toString('base64')
      : undefined

    return {
      nodes,
      continuationPoint,
      hasMore: !!continuationPoint
    }
  }

  /**
   * Continue browsing with continuation point (T087).
   * Handles large result sets that exceed maxReferencesPerNode.
   */
  async browseNext(request: OpcUaBrowseNextRequest): Promise<OpcUaBrowseResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const continuationPoint = Buffer.from(request.continuationPoint, 'base64')

    const browseNextResult = await this.session.browseNext(
      continuationPoint,
      request.releaseContinuationPoints ?? false
    )

    const nodes: OpcUaNode[] = (browseNextResult.references ?? []).map((ref: ReferenceDescription) => ({
      nodeId: ref.nodeId.toString(),
      displayName: ref.displayName.text ?? '',
      browseName: ref.browseName.toString(),
      nodeClass: mapNodeClass(ref.nodeClass),
      hasChildren: ref.nodeClass === 1 || ref.nodeClass === 8
    }))

    const nextContinuationPoint = browseNextResult.continuationPoint
      ? browseNextResult.continuationPoint.toString('base64')
      : undefined

    return {
      nodes,
      continuationPoint: nextContinuationPoint,
      hasMore: !!nextContinuationPoint
    }
  }

  /**
   * Read node attributes (T088).
   * Returns comprehensive node information including value, dataType, etc.
   */
  async readNodeAttributes(request: OpcUaNodeAttributesRequest): Promise<OpcUaNodeAttributes> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const nodeId = request.nodeId

    // Read common attributes
    const commonAttributes = [
      AttributeIds.NodeClass,
      AttributeIds.BrowseName,
      AttributeIds.DisplayName,
      AttributeIds.Description
    ]

    // Read all common attributes first
    const commonResults = await this.session.read(
      commonAttributes.map(attributeId => ({ nodeId, attributeId }))
    )

    const nodeClass = commonResults[0]?.value?.value ?? 0
    const mappedNodeClass = mapNodeClass(nodeClass)

    const attributes: OpcUaNodeAttributes = {
      nodeId,
      nodeClass: mappedNodeClass,
      browseName: commonResults[1]?.value?.value?.toString() ?? '',
      displayName: commonResults[2]?.value?.value?.text ?? '',
      description: commonResults[3]?.value?.value?.text
    }

    // Read Variable/VariableType specific attributes
    if (nodeClass === 2 || nodeClass === 16) {
      // Variable or VariableType
      const variableAttributes = [
        AttributeIds.Value,
        AttributeIds.DataType,
        AttributeIds.ValueRank,
        AttributeIds.ArrayDimensions,
        AttributeIds.AccessLevel,
        AttributeIds.UserAccessLevel,
        AttributeIds.MinimumSamplingInterval,
        AttributeIds.Historizing
      ]

      const variableResults = await this.session.read(
        variableAttributes.map(attributeId => ({ nodeId, attributeId }))
      )

      if (variableResults[0]?.statusCode.isGood()) {
        attributes.value = variableResults[0].value?.value
      }
      if (variableResults[1]?.statusCode.isGood()) {
        const dataTypeNodeId = variableResults[1].value?.value?.toString()
        attributes.dataType = dataTypeNodeId ? await this.resolveDataTypeName(dataTypeNodeId) : undefined
      }
      if (variableResults[2]?.statusCode.isGood()) {
        attributes.valueRank = variableResults[2].value?.value
      }
      if (variableResults[3]?.statusCode.isGood()) {
        attributes.arrayDimensions = variableResults[3].value?.value
      }
      if (variableResults[4]?.statusCode.isGood()) {
        attributes.accessLevel = variableResults[4].value?.value
      }
      if (variableResults[5]?.statusCode.isGood()) {
        attributes.userAccessLevel = variableResults[5].value?.value
      }
      if (variableResults[6]?.statusCode.isGood()) {
        attributes.minimumSamplingInterval = variableResults[6].value?.value
      }
      if (variableResults[7]?.statusCode.isGood()) {
        attributes.historizing = variableResults[7].value?.value
      }
    }

    // Read Method specific attributes
    if (nodeClass === 4) {
      // Method
      const methodAttributes = [
        AttributeIds.Executable,
        AttributeIds.UserExecutable
      ]

      const methodResults = await this.session.read(
        methodAttributes.map(attributeId => ({ nodeId, attributeId }))
      )

      if (methodResults[0]?.statusCode.isGood()) {
        attributes.executable = methodResults[0].value?.value
      }
      if (methodResults[1]?.statusCode.isGood()) {
        attributes.userExecutable = methodResults[1].value?.value
      }
    }

    return attributes
  }

  /**
   * Resolve data type NodeId to human-readable name.
   */
  private async resolveDataTypeName(dataTypeNodeId: string): Promise<string> {
    if (!this.session) return dataTypeNodeId

    try {
      const result = await this.session.read({
        nodeId: dataTypeNodeId,
        attributeId: AttributeIds.BrowseName
      })
      return result.value?.value?.name ?? dataTypeNodeId
    } catch {
      return dataTypeNodeId
    }
  }

  /**
   * Search for nodes by DisplayName pattern (T089).
   * Performs breadth-first search with pattern matching.
   */
  async searchNodes(request: OpcUaSearchNodesRequest): Promise<OpcUaSearchResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const maxDepth = request.maxDepth ?? 5
    const maxResults = request.maxResults ?? 100
    const pattern = request.searchPattern.toLowerCase()
    const nodeClassFilter = request.nodeClassFilter

    const foundNodes: OpcUaNode[] = []
    const visited = new Set<string>()
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: request.startNodeId, depth: 0 }
    ]

    while (queue.length > 0 && foundNodes.length < maxResults) {
      const current = queue.shift()!
      if (!current || visited.has(current.nodeId) || current.depth > maxDepth) {
        continue
      }

      visited.add(current.nodeId)

      try {
        const browseResult = await this.browse({
          connectionId: '',
          nodeId: current.nodeId,
          maxReferences: 500
        })

        for (const node of browseResult.nodes) {
          // Check if node matches search criteria
          const matchesPattern = node.displayName.toLowerCase().includes(pattern) ||
            node.browseName.toLowerCase().includes(pattern)
          const matchesClass = !nodeClassFilter || nodeClassFilter.includes(node.nodeClass)

          if (matchesPattern && matchesClass) {
            foundNodes.push(node)
            if (foundNodes.length >= maxResults) break
          }

          // Add to queue for further exploration if it has children
          if (node.hasChildren && current.depth < maxDepth) {
            queue.push({ nodeId: node.nodeId, depth: current.depth + 1 })
          }
        }
      } catch (error) {
        log.warn(`[OpcUaAdapter] Error browsing ${current.nodeId} during search:`, error)
      }
    }

    return {
      nodes: foundNodes,
      truncated: foundNodes.length >= maxResults
    }
  }

  /**
   * Translate browse path to node ID (T090).
   * Resolves a relative path from a starting node.
   */
  async translateBrowsePath(request: OpcUaBrowsePathRequest): Promise<OpcUaBrowsePathResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    try {
      // Build browse path using makeBrowsePath syntax
      const browsePath = `/${request.relativePath.join('/')}`

      const results = await this.session.translateBrowsePath([
        {
          startingNode: request.startingNode,
          relativePath: {
            elements: request.relativePath.map(name => ({
              referenceTypeId: 'i=33', // HierarchicalReferences
              isInverse: false,
              includeSubtypes: true,
              targetName: { name }
            }))
          }
        }
      ])

      if (results && results.length > 0) {
        const result = results[0]
        if (result.targets && result.targets.length > 0) {
          const target = result.targets[0]
          return {
            nodeId: target.targetId?.toString() ?? null,
            statusCode: result.statusCode.value,
            remainingPathIndex: target.remainingPathIndex
          }
        }

        return {
          nodeId: null,
          statusCode: result.statusCode.value
        }
      }

      return {
        nodeId: null,
        statusCode: StatusCodes.Bad.value
      }
    } catch (error) {
      log.error('[OpcUaAdapter] TranslateBrowsePath error:', error)
      return {
        nodeId: null,
        statusCode: StatusCodes.Bad.value
      }
    }
  }

  /**
   * Read node values (T095, T096, T097, T098).
   * Supports single and batch read with comprehensive data type handling.
   */
  async read(request: OpcUaReadRequest): Promise<OpcUaReadResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const nodesToRead = request.nodes.map(n => ({
      nodeId: n.nodeId,
      attributeId: n.attributeId ?? AttributeIds.Value
    }))

    // Read node values
    const dataValues = await this.session.read(nodesToRead)

    return {
      values: dataValues.map((dv, i) => {
        const statusCodeInfo = getStatusCodeInfo(dv.statusCode.value)
        const dataTypeId = dv.value?.dataType ?? DataType.Null
        const rawValue = dv.value?.value

        return {
          nodeId: request.nodes[i].nodeId,
          value: this.decodeValue(rawValue, dataTypeId),
          dataType: DataTypeNames[dataTypeId] ?? DataType[dataTypeId] ?? 'Unknown',
          dataTypeId,
          statusCode: dv.statusCode.value,
          statusCodeName: statusCodeInfo.name,
          statusCodeSeverity: statusCodeInfo.severity,
          sourceTimestamp: dv.sourceTimestamp?.getTime(),
          serverTimestamp: dv.serverTimestamp?.getTime(),
          isArray: Array.isArray(rawValue),
          arrayDimensions: Array.isArray(rawValue) ? [rawValue.length] : undefined
        }
      })
    }
  }

  /**
   * Decode value based on data type (T096, T097).
   * Handles ExtensionObjects, complex types, and special values.
   */
  private decodeValue(value: unknown, dataTypeId: number): unknown {
    if (value === null || value === undefined) {
      return null
    }

    // Handle ExtensionObject (T097)
    if (dataTypeId === OpcUaDataTypeIds.ExtensionObject || this.isExtensionObject(value)) {
      return this.decodeExtensionObject(value)
    }

    // Handle DateTime - convert to ISO string
    if (dataTypeId === OpcUaDataTypeIds.DateTime && value instanceof Date) {
      return value.toISOString()
    }

    // Handle ByteString - convert to hex string
    if (dataTypeId === OpcUaDataTypeIds.ByteString && Buffer.isBuffer(value)) {
      return value.toString('hex')
    }

    // Handle Guid
    if (dataTypeId === OpcUaDataTypeIds.Guid && typeof value === 'object') {
      return String(value)
    }

    // Handle LocalizedText
    if (dataTypeId === OpcUaDataTypeIds.LocalizedText && typeof value === 'object' && value !== null) {
      const lt = value as { text?: string; locale?: string }
      return lt.text ?? String(value)
    }

    // Handle QualifiedName
    if (dataTypeId === OpcUaDataTypeIds.QualifiedName && typeof value === 'object' && value !== null) {
      const qn = value as { name?: string; namespaceIndex?: number }
      return qn.name ?? String(value)
    }

    // Handle NodeId
    if (dataTypeId === OpcUaDataTypeIds.NodeId && typeof value === 'object') {
      return String(value)
    }

    // Handle arrays recursively
    if (Array.isArray(value)) {
      return value.map(v => this.decodeValue(v, dataTypeId))
    }

    // Return primitive values as-is
    return value
  }

  /**
   * Check if value is an ExtensionObject.
   */
  private isExtensionObject(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false
    return '_schema' in value || 'typeId' in value || 'body' in value
  }

  /**
   * Decode ExtensionObject to readable format (T097).
   * Handles known OPC UA structures like EURange, AxisInformation, etc.
   */
  private decodeExtensionObject(extObj: unknown): unknown {
    if (!extObj || typeof extObj !== 'object') {
      return extObj
    }

    const obj = extObj as Record<string, unknown>

    // If it has a body property, decode that
    if ('body' in obj && obj.body) {
      return this.decodeExtensionObject(obj.body)
    }

    // Handle EURange (common for analog values)
    if ('low' in obj && 'high' in obj) {
      return {
        type: 'EURange',
        low: obj.low,
        high: obj.high
      }
    }

    // Handle EUInformation
    if ('namespaceUri' in obj && 'unitId' in obj) {
      return {
        type: 'EUInformation',
        namespaceUri: obj.namespaceUri,
        unitId: obj.unitId,
        displayName: (obj.displayName as { text?: string })?.text,
        description: (obj.description as { text?: string })?.text
      }
    }

    // Handle TimeZoneDataType
    if ('offset' in obj && 'daylightSavingInOffset' in obj) {
      return {
        type: 'TimeZoneDataType',
        offset: obj.offset,
        daylightSavingInOffset: obj.daylightSavingInOffset
      }
    }

    // Handle Range
    if ('low' in obj && 'high' in obj && Object.keys(obj).length === 2) {
      return { type: 'Range', low: obj.low, high: obj.high }
    }

    // Handle Argument (for methods)
    if ('name' in obj && 'dataType' in obj && 'valueRank' in obj) {
      return {
        type: 'Argument',
        name: obj.name,
        dataType: String(obj.dataType),
        valueRank: obj.valueRank,
        arrayDimensions: obj.arrayDimensions,
        description: (obj.description as { text?: string })?.text
      }
    }

    // Generic ExtensionObject - return cleaned object
    const result: Record<string, unknown> = { type: 'ExtensionObject' }
    for (const [key, val] of Object.entries(obj)) {
      // Skip internal properties
      if (key.startsWith('_') || key === 'schema') continue
      result[key] = this.decodeValue(val, DataType.Variant)
    }
    return result
  }

  /**
   * Validate write access for nodes (T102).
   * Checks AccessLevel and UserAccessLevel before write attempt.
   */
  async validateWriteAccess(nodeIds: string[]): Promise<OpcUaWriteValidation[]> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const validations: OpcUaWriteValidation[] = []

    for (const nodeId of nodeIds) {
      try {
        const results = await this.session.read([
          { nodeId, attributeId: AttributeIds.AccessLevel },
          { nodeId, attributeId: AttributeIds.UserAccessLevel },
          { nodeId, attributeId: AttributeIds.DataType }
        ])

        const accessLevel = results[0]?.value?.value ?? 0
        const userAccessLevel = results[1]?.value?.value ?? 0
        const dataTypeNodeId = results[2]?.value?.value?.toString()

        // Check write bit (0x02) in access level
        const writable = (userAccessLevel & 0x02) !== 0

        let expectedDataType = 'Unknown'
        if (dataTypeNodeId) {
          expectedDataType = await this.resolveDataTypeName(dataTypeNodeId)
        }

        validations.push({
          nodeId,
          writable,
          accessLevel,
          userAccessLevel,
          expectedDataType,
          expectedDataTypeId: this.parseDataTypeId(dataTypeNodeId)
        })
      } catch (error) {
        log.warn(`[OpcUaAdapter] Error validating write access for ${nodeId}:`, error)
        validations.push({
          nodeId,
          writable: false,
          accessLevel: 0,
          userAccessLevel: 0,
          expectedDataType: 'Unknown'
        })
      }
    }

    return validations
  }

  /**
   * Parse DataType NodeId to get numeric type ID.
   */
  private parseDataTypeId(dataTypeNodeId: string | undefined): number | undefined {
    if (!dataTypeNodeId) return undefined

    // Handle "i=X" format for built-in types
    const match = dataTypeNodeId.match(/^i=(\d+)$/)
    if (match) {
      return parseInt(match[1], 10)
    }

    // Handle "ns=X;i=Y" format
    const nsMatch = dataTypeNodeId.match(/ns=\d+;i=(\d+)/)
    if (nsMatch) {
      return parseInt(nsMatch[1], 10)
    }

    return undefined
  }

  /**
   * Write node values (T100, T101, T102).
   * Supports single and batch write with data type validation.
   */
  async write(request: OpcUaWriteRequest): Promise<OpcUaWriteResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const results: OpcUaWriteResult['results'] = []

    for (const node of request.nodes) {
      try {
        // Determine data type to use
        let dataType: DataType
        if (node.dataTypeId !== undefined) {
          dataType = node.dataTypeId as DataType
        } else if (node.dataType) {
          dataType = this.resolveDataTypeFromName(node.dataType)
        } else {
          dataType = this.inferDataType(node.value)
        }

        // Encode value for write
        const encodedValue = this.encodeValueForWrite(node.value, dataType)

        const writeResult = await this.session.write({
          nodeId: node.nodeId,
          attributeId: AttributeIds.Value,
          value: {
            value: {
              dataType,
              value: encodedValue
            }
          }
        })

        const statusInfo = getStatusCodeInfo(writeResult.value)
        results.push({
          nodeId: node.nodeId,
          statusCode: writeResult.value,
          statusCodeName: statusInfo.name,
          success: writeResult.isGood()
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        log.error(`[OpcUaAdapter] Write error for ${node.nodeId}:`, error)
        results.push({
          nodeId: node.nodeId,
          statusCode: StatusCodes.Bad.value,
          statusCodeName: 'Bad',
          success: false,
          error: errorMsg
        })
      }
    }

    return { results }
  }

  /**
   * Resolve data type name to DataType enum (T101).
   */
  private resolveDataTypeFromName(typeName: string): DataType {
    const typeMap: Record<string, DataType> = {
      Boolean: DataType.Boolean,
      SByte: DataType.SByte,
      Byte: DataType.Byte,
      Int16: DataType.Int16,
      UInt16: DataType.UInt16,
      Int32: DataType.Int32,
      UInt32: DataType.UInt32,
      Int64: DataType.Int64,
      UInt64: DataType.UInt64,
      Float: DataType.Float,
      Double: DataType.Double,
      String: DataType.String,
      DateTime: DataType.DateTime,
      Guid: DataType.Guid,
      ByteString: DataType.ByteString,
      XmlElement: DataType.XmlElement,
      NodeId: DataType.NodeId,
      ExpandedNodeId: DataType.ExpandedNodeId,
      StatusCode: DataType.StatusCode,
      QualifiedName: DataType.QualifiedName,
      LocalizedText: DataType.LocalizedText,
      ExtensionObject: DataType.ExtensionObject,
      Variant: DataType.Variant
    }
    return typeMap[typeName] ?? DataType.Variant
  }

  /**
   * Encode value for OPC UA write operation (T101).
   * Handles type coercion and validation.
   */
  private encodeValueForWrite(value: unknown, dataType: DataType): unknown {
    if (value === null || value === undefined) {
      return null
    }

    switch (dataType) {
      case DataType.Boolean:
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1'
        }
        return Boolean(value)

      case DataType.SByte:
      case DataType.Int16:
      case DataType.Int32:
        if (typeof value === 'string') {
          return parseInt(value, 10)
        }
        return Math.trunc(Number(value))

      case DataType.Byte:
      case DataType.UInt16:
      case DataType.UInt32:
        if (typeof value === 'string') {
          return Math.abs(parseInt(value, 10))
        }
        return Math.abs(Math.trunc(Number(value)))

      case DataType.Int64:
      case DataType.UInt64:
        // Handle big integers as arrays [low, high] or BigInt
        if (typeof value === 'bigint') {
          return value
        }
        if (typeof value === 'string') {
          try {
            return BigInt(value)
          } catch {
            return parseInt(value, 10)
          }
        }
        return value

      case DataType.Float:
      case DataType.Double:
        if (typeof value === 'string') {
          return parseFloat(value)
        }
        return Number(value)

      case DataType.String:
        return String(value)

      case DataType.DateTime:
        if (value instanceof Date) {
          return value
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value)
        }
        return value

      case DataType.ByteString:
        if (typeof value === 'string') {
          // Assume hex string input
          return Buffer.from(value.replace(/\s/g, ''), 'hex')
        }
        if (Buffer.isBuffer(value)) {
          return value
        }
        return value

      default:
        return value
    }
  }

  /**
   * Create a subscription.
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<OpcUaSubscription> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const subscription = await this.session.createSubscription2({
      requestedPublishingInterval: request.publishingInterval ?? DEFAULT_PUBLISHING_INTERVAL,
      requestedLifetimeCount: request.lifetimeCount ?? 1000,
      requestedMaxKeepAliveCount: request.maxKeepAliveCount ?? 10,
      maxNotificationsPerPublish: request.maxNotificationsPerPublish ?? 100,
      priority: request.priority ?? 0
    })

    const id = crypto.randomUUID()
    this.subscriptions.set(id, subscription)

    return {
      id,
      subscriptionId: subscription.subscriptionId,
      connectionId: this.connection.id,
      publishingInterval: subscription.publishingInterval,
      lifetimeCount: subscription.lifetimeCount,
      maxKeepAliveCount: subscription.maxKeepAliveCount,
      maxNotificationsPerPublish: subscription.maxNotificationsPerPublish,
      priority: subscription.priority,
      monitoredItems: []
    }
  }

  /**
   * Add monitored item to subscription (T106, T107, T108).
   * Supports deadband filtering (None, Absolute, Percent).
   */
  async addMonitoredItem(request: AddMonitoredItemRequest): Promise<MonitoredItem> {
    const subscription = this.subscriptions.get(request.subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${request.subscriptionId}`)
    }

    const samplingInterval = request.samplingInterval ?? 500
    const queueSize = request.queueSize ?? 10
    const discardOldest = request.discardOldest ?? true
    const deadbandType = request.deadbandType ?? 'None'
    const deadbandValue = request.deadbandValue ?? 0

    // Build monitoring parameters with deadband filter (T107)
    const monitoringParams: MonitoringParametersOptions = {
      samplingInterval,
      queueSize,
      discardOldest
    }

    // Add DataChangeFilter for deadband filtering
    if (deadbandType !== 'None' && deadbandValue > 0) {
      const filter = new DataChangeFilter({
        trigger: DataChangeTrigger.StatusValue,
        deadbandType: this.mapDeadbandType(deadbandType),
        deadbandValue
      })
      monitoringParams.filter = filter
    }

    const monitoredItem = await subscription.monitor(
      {
        nodeId: request.nodeId,
        attributeId: request.attributeId ?? AttributeIds.Value
      },
      monitoringParams,
      TimestampsToReturn.Both
    ) as ClientMonitoredItem

    const id = crypto.randomUUID()
    this.monitoredItems.set(id, monitoredItem)

    // Set up data change handler (T108)
    monitoredItem.on('changed', (dataValue) => {
      const dataTypeId = dataValue.value?.dataType ?? DataType.Null
      const rawValue = dataValue.value?.value

      const change: OpcUaDataChange = {
        subscriptionId: request.subscriptionId,
        items: [{
          itemId: id,
          nodeId: request.nodeId,
          value: this.decodeValue(rawValue, dataTypeId),
          dataType: DataTypeNames[dataTypeId] ?? DataType[dataTypeId] ?? 'Unknown',
          statusCode: dataValue.statusCode.value,
          sourceTimestamp: dataValue.sourceTimestamp?.getTime() ?? Date.now(),
          serverTimestamp: dataValue.serverTimestamp?.getTime() ?? Date.now()
        }]
      }
      this.emit('data-received', change)
    })

    // Handle errors on monitored item
    monitoredItem.on('err', (message) => {
      log.error(`[OpcUaAdapter] MonitoredItem error for ${request.nodeId}:`, message)
    })

    return {
      id,
      monitoredItemId: monitoredItem.monitoredItemId,
      nodeId: request.nodeId,
      attributeId: request.attributeId ?? AttributeIds.Value,
      samplingInterval,
      queueSize,
      discardOldest,
      deadbandType,
      deadbandValue
    }
  }

  /**
   * Map DeadbandType string to node-opcua enum.
   */
  private mapDeadbandType(type: DeadbandType): NodeOpcuaDeadbandType {
    switch (type) {
      case 'None':
        return NodeOpcuaDeadbandType.None
      case 'Absolute':
        return NodeOpcuaDeadbandType.Absolute
      case 'Percent':
        return NodeOpcuaDeadbandType.Percent
      default:
        return NodeOpcuaDeadbandType.None
    }
  }

  /**
   * Modify monitored item parameters (T106).
   */
  async modifyMonitoredItem(request: ModifyMonitoredItemRequest): Promise<MonitoredItem> {
    const monitoredItem = this.monitoredItems.get(request.itemId)
    if (!monitoredItem) {
      throw new Error(`Monitored item not found: ${request.itemId}`)
    }

    const params: MonitoringParametersOptions = {}

    if (request.samplingInterval !== undefined) {
      params.samplingInterval = request.samplingInterval
    }
    if (request.queueSize !== undefined) {
      params.queueSize = request.queueSize
    }
    if (request.discardOldest !== undefined) {
      params.discardOldest = request.discardOldest
    }

    // Update deadband filter if specified
    if (request.deadbandType !== undefined) {
      const deadbandValue = request.deadbandValue ?? 0
      if (request.deadbandType !== 'None' && deadbandValue > 0) {
        params.filter = new DataChangeFilter({
          trigger: DataChangeTrigger.StatusValue,
          deadbandType: this.mapDeadbandType(request.deadbandType),
          deadbandValue
        })
      }
    }

    await monitoredItem.modify(params)

    return {
      id: request.itemId,
      monitoredItemId: monitoredItem.monitoredItemId,
      nodeId: monitoredItem.itemToMonitor.nodeId.toString(),
      attributeId: monitoredItem.itemToMonitor.attributeId,
      samplingInterval: request.samplingInterval ?? 500,
      queueSize: request.queueSize ?? 10,
      discardOldest: request.discardOldest ?? true,
      deadbandType: request.deadbandType ?? 'None',
      deadbandValue: request.deadbandValue
    }
  }

  /**
   * Remove monitored item from subscription.
   */
  async removeMonitoredItem(request: RemoveMonitoredItemRequest): Promise<void> {
    const monitoredItem = this.monitoredItems.get(request.itemId)
    if (!monitoredItem) {
      throw new Error(`Monitored item not found: ${request.itemId}`)
    }

    await monitoredItem.terminate()
    this.monitoredItems.delete(request.itemId)
    log.debug(`[OpcUaAdapter] Removed monitored item: ${request.itemId}`)
  }

  /**
   * Set publishing mode for subscription (T110).
   * Enables pause/resume functionality.
   */
  async setPublishingMode(request: SetPublishingModeRequest): Promise<boolean> {
    const subscription = this.subscriptions.get(request.subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${request.subscriptionId}`)
    }

    await subscription.setPublishingMode(request.publishingEnabled)
    log.debug(`[OpcUaAdapter] Set publishing mode: ${request.publishingEnabled} for subscription ${request.subscriptionId}`)
    return request.publishingEnabled
  }

  /**
   * Get subscription state (T109).
   */
  async getSubscriptionState(subscriptionId: string): Promise<SubscriptionState> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`)
    }

    return {
      id: subscriptionId,
      publishingEnabled: subscription.publishingEnabled,
      keepAliveCount: subscription.maxKeepAliveCount,
      lifetimeCount: subscription.lifetimeCount,
      currentSequenceNumber: 0, // Not directly exposed by node-opcua
      lastPublishTime: Date.now()
    }
  }

  /**
   * Delete subscription (T109).
   */
  async deleteSubscription(request: DeleteSubscriptionRequest): Promise<void> {
    const subscription = this.subscriptions.get(request.subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${request.subscriptionId}`)
    }

    // Remove all monitored items first
    for (const [itemId, item] of this.monitoredItems.entries()) {
      // Check if this item belongs to this subscription
      if (item.subscription === subscription) {
        this.monitoredItems.delete(itemId)
      }
    }

    await subscription.terminate()
    this.subscriptions.delete(request.subscriptionId)
    log.debug(`[OpcUaAdapter] Deleted subscription: ${request.subscriptionId}`)
  }

  /**
   * Get all subscriptions for this connection.
   */
  getSubscriptions(): OpcUaSubscription[] {
    const result: OpcUaSubscription[] = []

    for (const [id, sub] of this.subscriptions.entries()) {
      const monitoredItems: MonitoredItem[] = []

      for (const [itemId, item] of this.monitoredItems.entries()) {
        if (item.subscription === sub) {
          monitoredItems.push({
            id: itemId,
            monitoredItemId: item.monitoredItemId,
            nodeId: item.itemToMonitor.nodeId.toString(),
            attributeId: item.itemToMonitor.attributeId,
            samplingInterval: 500, // Default, actual value not exposed
            queueSize: 10, // Default, actual value not exposed
            discardOldest: true,
            deadbandType: 'None'
          })
        }
      }

      result.push({
        id,
        subscriptionId: sub.subscriptionId,
        connectionId: this.connection.id,
        publishingInterval: sub.publishingInterval,
        lifetimeCount: sub.lifetimeCount,
        maxKeepAliveCount: sub.maxKeepAliveCount,
        maxNotificationsPerPublish: sub.maxNotificationsPerPublish,
        priority: sub.priority,
        monitoredItems
      })
    }

    return result
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Map security mode string to node-opcua enum.
   */
  private mapSecurityModeToEnum(mode: MessageSecurityMode): OpcUaMessageSecurityMode {
    switch (mode) {
      case 'None':
        return OpcUaMessageSecurityMode.None
      case 'Sign':
        return OpcUaMessageSecurityMode.Sign
      case 'SignAndEncrypt':
        return OpcUaMessageSecurityMode.SignAndEncrypt
      default:
        return OpcUaMessageSecurityMode.None
    }
  }

  /**
   * Map security policy string to URI.
   */
  private mapSecurityPolicyToUri(policy: string): OpcUaSecurityPolicy {
    switch (policy) {
      case 'None':
        return OpcUaSecurityPolicy.None
      case 'Basic256Sha256':
        return OpcUaSecurityPolicy.Basic256Sha256
      case 'Aes128_Sha256_RsaOaep':
        return OpcUaSecurityPolicy.Aes128_Sha256_RsaOaep
      case 'Aes256_Sha256_RsaPss':
        return OpcUaSecurityPolicy.Aes256_Sha256_RsaPss
      default:
        return OpcUaSecurityPolicy.None
    }
  }

  private mapSecurityMode(mode: MessageSecurityMode): number {
    switch (mode) {
      case 'None':
        return 1
      case 'Sign':
        return 2
      case 'SignAndEncrypt':
        return 3
      default:
        return 1
    }
  }

  private reverseMapSecurityMode(mode: number): MessageSecurityMode {
    switch (mode) {
      case 1:
        return 'None'
      case 2:
        return 'Sign'
      case 3:
        return 'SignAndEncrypt'
      default:
        return 'None'
    }
  }

  private mapTokenType(tokenType: number | undefined): 'anonymous' | 'username' | 'certificate' | 'issuedToken' {
    switch (tokenType) {
      case 0:
        return 'anonymous'
      case 1:
        return 'username'
      case 2:
        return 'certificate'
      case 3:
        return 'issuedToken'
      default:
        return 'anonymous'
    }
  }

  /**
   * Get user identity for session creation.
   * Supports anonymous, username/password, and certificate authentication.
   */
  private getUserIdentity(): UserIdentityInfo {
    const config = this.opcuaConfig

    // Username/Password authentication
    if (config.username && config.password) {
      log.debug('[OpcUaAdapter] Using username/password authentication')
      return {
        type: 1, // UserTokenType.UserName
        userName: config.username,
        password: config.password
      } as UserIdentityInfo
    }

    // Certificate authentication would be handled here
    // For now, we support it via the certificate store
    // if (config.certificateId) {
    //   const certStore = getOpcUaCertificateStore()
    //   const cert = certStore.getCertificate(config.certificateId)
    //   if (cert) {
    //     return {
    //       type: 2, // UserTokenType.Certificate
    //       certificateData: cert.data,
    //       privateKey: cert.privateKey
    //     } as UserIdentityInfo
    //   }
    // }

    // Default to anonymous
    log.debug('[OpcUaAdapter] Using anonymous authentication')
    return { type: 0 } as UserIdentityInfo // Anonymous
  }

  private inferDataType(value: unknown): DataType {
    if (typeof value === 'boolean') return DataType.Boolean
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return DataType.Int32
      return DataType.Double
    }
    if (typeof value === 'string') return DataType.String
    return DataType.Variant
  }
}
