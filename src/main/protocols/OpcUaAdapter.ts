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
  type ClientMonitoredItem,
  type EndpointDescription,
  type UserIdentityInfo,
  type ReferenceDescription
} from 'node-opcua'
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
  OpcUaReadRequest,
  OpcUaReadResult,
  OpcUaWriteRequest,
  OpcUaWriteResult,
  OpcUaSubscription,
  CreateSubscriptionRequest,
  AddMonitoredItemRequest,
  MonitoredItem,
  OpcUaDataChange,
  SecurityPolicy,
  MessageSecurityMode,
  NodeClass
} from '@shared/types'
import { DEFAULT_PUBLISHING_INTERVAL } from '@shared/types'
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
 * OPC UA Adapter for OPC UA server connections.
 */
export class OpcUaAdapter extends ProtocolAdapter {
  private client: OPCUAClient | null = null
  private session: ClientSession | null = null
  private subscriptions: Map<string, ClientSubscription> = new Map()
  private monitoredItems: Map<string, ClientMonitoredItem> = new Map()

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

      // Create client
      this.client = OPCUAClient.create({
        applicationName: 'Connex Studio',
        securityMode: this.mapSecurityMode(config.securityMode),
        securityPolicy: config.securityPolicy,
        endpointMustExist: false
      })

      // Connect to server
      await this.client.connect(config.endpointUrl)

      // Create session
      const userIdentity = this.getUserIdentity()
      this.session = await this.client.createSession(userIdentity)

      this.setStatus('connected')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.setStatus('error', message)
      throw error
    }
  }

  /**
   * Disconnect from the server.
   */
  async disconnect(): Promise<void> {
    try {
      // Close all subscriptions
      for (const subscription of this.subscriptions.values()) {
        await subscription.terminate()
      }
      this.subscriptions.clear()
      this.monitoredItems.clear()

      // Close session
      if (this.session) {
        await this.session.close()
        this.session = null
      }

      // Disconnect client
      if (this.client) {
        await this.client.disconnect()
        this.client = null
      }

      this.setStatus('disconnected')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
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
   * Browse node children.
   */
  async browse(request: OpcUaBrowseRequest): Promise<OpcUaNode[]> {
    if (!this.session) {
      throw new Error('Not connected')
    }

    const browseResult = await this.session.browse({
      nodeId: request.nodeId,
      browseDirection: request.browseDirection === 'Inverse' ? 1 : 0,
      referenceTypeId: request.referenceType,
      resultMask: 63 // All fields
    })

    if (!browseResult.references) {
      return []
    }

    return browseResult.references.map((ref: ReferenceDescription) => ({
      nodeId: ref.nodeId.toString(),
      displayName: ref.displayName.text ?? '',
      browseName: ref.browseName.toString(),
      nodeClass: mapNodeClass(ref.nodeClass),
      hasChildren: ref.nodeClass === 1 || ref.nodeClass === 8 // Object or ObjectType
    }))
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

  private getUserIdentity(): UserIdentityInfo {
    const config = this.opcuaConfig
    if (config.username && config.password) {
      return {
        type: 1, // UserTokenType.UserName
        userName: config.username,
        password: config.password
      } as UserIdentityInfo
    }
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
