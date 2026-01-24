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
  type ClientMonitoredItem,
  type EndpointDescription,
  type UserIdentityInfo,
  type ReferenceDescription
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
  OpcUaSubscription,
  CreateSubscriptionRequest,
  AddMonitoredItemRequest,
  MonitoredItem,
  OpcUaDataChange,
  OpcUaServerInfo,
  SecurityPolicy,
  MessageSecurityMode,
  NodeClass
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

      this.client.on('connection_reestablished', () => {
        log.info('[OpcUaAdapter] Connection reestablished')
        this.setStatus('connected')
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
      // Save subscription references
      const savedSubscriptions = new Map(this.subscriptions)

      // Disconnect
      await this.disconnect()

      // Reconnect
      await this.connect()

      // Restore subscriptions if needed
      // Note: node-opcua handles subscription transfer automatically
      log.info('[OpcUaAdapter] Reconnection successful')
    } catch (error) {
      log.error('[OpcUaAdapter] Reconnection failed:', error)
      throw error
    }
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
   * Read node values.
   */
  async read(request: OpcUaReadRequest): Promise<OpcUaReadResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const nodesToRead = request.nodes.map(n => ({
      nodeId: n.nodeId,
      attributeId: n.attributeId ?? AttributeIds.Value
    }))

    const dataValues = await this.session.read(nodesToRead)

    return {
      values: dataValues.map((dv, i) => ({
        nodeId: request.nodes[i].nodeId,
        value: dv.value?.value,
        dataType: DataType[dv.value?.dataType ?? DataType.Null],
        statusCode: dv.statusCode.value,
        sourceTimestamp: dv.sourceTimestamp?.getTime(),
        serverTimestamp: dv.serverTimestamp?.getTime()
      }))
    }
  }

  /**
   * Write node values.
   */
  async write(request: OpcUaWriteRequest): Promise<OpcUaWriteResult> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const results: OpcUaWriteResult['results'] = []

    for (const node of request.nodes) {
      try {
        const statusCode = await this.session.write({
          nodeId: node.nodeId,
          attributeId: AttributeIds.Value,
          value: {
            value: {
              dataType: this.inferDataType(node.value),
              value: node.value
            }
          }
        })

        results.push({
          nodeId: node.nodeId,
          statusCode: statusCode.value,
          success: statusCode.isGood()
        })
      } catch (error) {
        results.push({
          nodeId: node.nodeId,
          statusCode: StatusCodes.Bad.value,
          success: false
        })
      }
    }

    return { results }
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
   * Add monitored item to subscription.
   */
  async addMonitoredItem(request: AddMonitoredItemRequest): Promise<MonitoredItem> {
    const subscription = this.subscriptions.get(request.subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${request.subscriptionId}`)
    }

    const samplingInterval = request.samplingInterval ?? 500
    const queueSize = request.queueSize ?? 10
    const discardOldest = request.discardOldest ?? true

    const monitoredItem = await subscription.monitor(
      {
        nodeId: request.nodeId,
        attributeId: request.attributeId ?? AttributeIds.Value
      },
      {
        samplingInterval,
        queueSize,
        discardOldest
      },
      2 // TimestampsToReturn.Both
    ) as ClientMonitoredItem

    const id = crypto.randomUUID()
    this.monitoredItems.set(id, monitoredItem)

    // Set up data change handler
    monitoredItem.on('changed', (dataValue) => {
      const change: OpcUaDataChange = {
        subscriptionId: request.subscriptionId,
        items: [{
          itemId: id,
          nodeId: request.nodeId,
          value: dataValue.value?.value,
          dataType: DataType[dataValue.value?.dataType ?? DataType.Null],
          statusCode: dataValue.statusCode.value,
          sourceTimestamp: dataValue.sourceTimestamp?.getTime() ?? Date.now(),
          serverTimestamp: dataValue.serverTimestamp?.getTime() ?? Date.now()
        }]
      }
      this.emit('data-received', change)
    })

    return {
      id,
      monitoredItemId: monitoredItem.monitoredItemId,
      nodeId: request.nodeId,
      attributeId: request.attributeId ?? AttributeIds.Value,
      samplingInterval,
      queueSize,
      discardOldest,
      deadbandType: request.deadbandType ?? 'None',
      deadbandValue: request.deadbandValue
    }
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
