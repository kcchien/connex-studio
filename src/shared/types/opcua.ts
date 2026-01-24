/**
 * OPC UA type definitions for full OPC UA client functionality.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Security Types
// -----------------------------------------------------------------------------

export type SecurityPolicy =
  | 'None'
  | 'Basic256Sha256'
  | 'Aes128_Sha256_RsaOaep'
  | 'Aes256_Sha256_RsaPss'

export type MessageSecurityMode = 'None' | 'Sign' | 'SignAndEncrypt'

export type OpcUaAuthType = 'anonymous' | 'username' | 'certificate'

export interface OpcUaAuth {
  type: OpcUaAuthType
  username?: string
  password?: string
  certificateId?: string
}

// -----------------------------------------------------------------------------
// Connection Types
// -----------------------------------------------------------------------------

export interface OpcUaConnectRequest {
  endpointUrl: string
  securityPolicy: SecurityPolicy
  securityMode: MessageSecurityMode
  authentication: OpcUaAuth
  sessionTimeout?: number
  applicationName?: string
  certificateId?: string
}

export interface OpcUaConnectResult {
  connectionId: string
  serverInfo: OpcUaServerInfo
  sessionId: string
  revisedSessionTimeout: number
}

export interface OpcUaServerInfo {
  applicationName: string
  productUri: string
  buildInfo?: OpcUaBuildInfo
}

export interface OpcUaBuildInfo {
  productName: string
  softwareVersion: string
  buildNumber: string
}

export interface OpcUaEndpoint {
  endpointUrl: string
  securityMode: MessageSecurityMode
  securityPolicy: SecurityPolicy
  userTokenPolicies: UserTokenPolicy[]
  serverCertificate?: string
  securityLevel: number
}

export interface UserTokenPolicy {
  policyId: string
  tokenType: 'anonymous' | 'username' | 'certificate' | 'issuedToken'
  securityPolicy?: string
}

// -----------------------------------------------------------------------------
// Browse Types
// -----------------------------------------------------------------------------

export type NodeClass =
  | 'Object'
  | 'Variable'
  | 'Method'
  | 'ObjectType'
  | 'VariableType'
  | 'ReferenceType'
  | 'DataType'
  | 'View'

export type BrowseDirection = 'Forward' | 'Inverse' | 'Both'

export interface OpcUaNode {
  nodeId: string
  displayName: string
  browseName: string
  nodeClass: NodeClass
  dataType?: string
  accessLevel?: number
  historizing?: boolean
  description?: string
  hasChildren?: boolean
}

export interface OpcUaBrowseRequest {
  connectionId: string
  nodeId: string
  browseDirection?: BrowseDirection
  referenceType?: string
  nodeClassMask?: NodeClass[]
  maxReferences?: number
}

export interface OpcUaBrowseResult {
  nodes: OpcUaNode[]
  continuationPoint?: string
  hasMore: boolean
}

export interface OpcUaBrowseNextRequest {
  connectionId: string
  continuationPoint: string
  releaseContinuationPoints?: boolean
}

export interface OpcUaBrowsePathRequest {
  connectionId: string
  startingNode: string
  relativePath: string[]
}

export interface OpcUaBrowsePathResult {
  nodeId: string | null
  statusCode: number
  remainingPathIndex?: number
}

export interface OpcUaSearchNodesRequest {
  connectionId: string
  startNodeId: string
  searchPattern: string
  maxDepth?: number
  maxResults?: number
  nodeClassFilter?: NodeClass[]
}

export interface OpcUaSearchResult {
  nodes: OpcUaNode[]
  truncated: boolean
}

export interface OpcUaNodeAttributesRequest {
  connectionId: string
  nodeId: string
}

export interface OpcUaNodeAttributes {
  nodeId: string
  nodeClass: NodeClass
  browseName: string
  displayName: string
  description?: string
  writeMask?: number
  userWriteMask?: number
  // Variable/VariableType specific
  value?: unknown
  dataType?: string
  valueRank?: number
  arrayDimensions?: number[]
  accessLevel?: number
  userAccessLevel?: number
  minimumSamplingInterval?: number
  historizing?: boolean
  // Method specific
  executable?: boolean
  userExecutable?: boolean
}

// -----------------------------------------------------------------------------
// Read/Write Types
// -----------------------------------------------------------------------------

export interface OpcUaReadRequest {
  connectionId: string
  nodes: OpcUaReadNode[]
  maxAge?: number
}

export interface OpcUaReadNode {
  nodeId: string
  attributeId?: number
}

export interface OpcUaReadResult {
  values: OpcUaReadValue[]
}

export interface OpcUaReadValue {
  nodeId: string
  value: unknown
  dataType: string
  statusCode: number
  sourceTimestamp?: number
  serverTimestamp?: number
}

export interface OpcUaWriteRequest {
  connectionId: string
  nodes: OpcUaWriteNode[]
}

export interface OpcUaWriteNode {
  nodeId: string
  value: unknown
  dataType?: string
}

export interface OpcUaWriteResult {
  results: OpcUaWriteNodeResult[]
}

export interface OpcUaWriteNodeResult {
  nodeId: string
  statusCode: number
  success: boolean
}

export interface OpcUaReadAttributesRequest {
  connectionId: string
  nodeId: string
  attributeIds: number[]
}

export interface OpcUaAttributeResult {
  attributeId: number
  value: unknown
  statusCode: number
}

// -----------------------------------------------------------------------------
// Subscription Types
// -----------------------------------------------------------------------------

export type DeadbandType = 'None' | 'Absolute' | 'Percent'

export interface OpcUaSubscription {
  id: string
  subscriptionId: number
  connectionId: string
  publishingInterval: number
  lifetimeCount: number
  maxKeepAliveCount: number
  maxNotificationsPerPublish: number
  priority: number
  monitoredItems: MonitoredItem[]
}

export interface MonitoredItem {
  id: string
  monitoredItemId: number
  nodeId: string
  attributeId: number
  samplingInterval: number
  queueSize: number
  discardOldest: boolean
  deadbandType: DeadbandType
  deadbandValue?: number
}

export interface CreateSubscriptionRequest {
  connectionId: string
  publishingInterval?: number
  lifetimeCount?: number
  maxKeepAliveCount?: number
  maxNotificationsPerPublish?: number
  priority?: number
}

export interface AddMonitoredItemRequest {
  subscriptionId: string
  nodeId: string
  attributeId?: number
  samplingInterval?: number
  queueSize?: number
  discardOldest?: boolean
  deadbandType?: DeadbandType
  deadbandValue?: number
}

export interface ModifyMonitoredItemRequest {
  subscriptionId: string
  itemId: string
  samplingInterval?: number
  queueSize?: number
  discardOldest?: boolean
  deadbandType?: DeadbandType
  deadbandValue?: number
}

export interface OpcUaDataChange {
  subscriptionId: string
  items: OpcUaDataChangeItem[]
}

export interface OpcUaDataChangeItem {
  itemId: string
  nodeId: string
  value: unknown
  dataType: string
  statusCode: number
  sourceTimestamp: number
  serverTimestamp: number
}

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

export interface OpcUaEvent {
  eventId: string
  eventType: string
  sourceNodeId: string
  sourceName: string
  time: number
  receiveTime: number
  message: string
  severity: number
  conditionId?: string
  acknowledged?: boolean
  confirmed?: boolean
}

export interface SubscribeEventsRequest {
  connectionId: string
  sourceNodeId: string
  eventTypes?: string[]
  selectClauses?: string[]
  whereClause?: EventFilter
}

export type EventFilterOperator = 'And' | 'Or' | 'Not' | 'Equals' | 'GreaterThan' | 'LessThan'

export interface EventFilter {
  operator: EventFilterOperator
  operands: Array<EventFilter | EventOperand>
}

export type EventOperandType = 'literal' | 'attribute' | 'simpleAttribute'

export interface EventOperand {
  type: EventOperandType
  value: unknown
}

export interface AcknowledgeConditionRequest {
  connectionId: string
  conditionId: string
  eventId: string
  comment?: string
}

export interface ConfirmConditionRequest {
  connectionId: string
  conditionId: string
  eventId: string
  comment?: string
}

// -----------------------------------------------------------------------------
// Method Types
// -----------------------------------------------------------------------------

export interface OpcUaCallMethodRequest {
  connectionId: string
  objectId: string
  methodId: string
  inputArguments?: unknown[]
}

export interface OpcUaCallMethodResult {
  statusCode: number
  outputArguments: unknown[]
  inputArgumentResults?: number[]
}

export interface OpcUaMethodArguments {
  inputArguments: MethodArgument[]
  outputArguments: MethodArgument[]
}

export interface MethodArgument {
  name: string
  dataType: string
  valueRank: number
  arrayDimensions?: number[]
  description?: string
}

// -----------------------------------------------------------------------------
// History Types
// -----------------------------------------------------------------------------

export interface OpcUaHistoryReadRequest {
  connectionId: string
  nodeIds: string[]
  startTime: number
  endTime: number
  numValuesPerNode?: number
  returnBounds?: boolean
}

export interface OpcUaHistoryReadResult {
  results: OpcUaHistoryNodeResult[]
}

export interface OpcUaHistoryNodeResult {
  nodeId: string
  values: OpcUaHistoryValue[]
  continuationPoint?: string
}

export interface OpcUaHistoryValue {
  value: unknown
  statusCode: number
  sourceTimestamp: number
  serverTimestamp: number
}

export interface OpcUaHistoryEventsRequest {
  connectionId: string
  nodeId: string
  startTime: number
  endTime: number
  numEventsPerNode?: number
  filter?: EventFilter
}

export interface OpcUaHistoryEventsResult {
  events: OpcUaEvent[]
  continuationPoint?: string
}

// -----------------------------------------------------------------------------
// Certificate Types
// -----------------------------------------------------------------------------

export interface OpcUaCertificate {
  id: string
  subject: string
  issuer: string
  serialNumber: string
  validFrom: number
  validTo: number
  thumbprint: string
  path: string
  privateKeyPath?: string
  trusted: boolean
  isApplicationCert: boolean
}

export interface ImportCertificateRequest {
  certificatePath: string
  privateKeyPath?: string
  password?: string
}

export interface GenerateCertificateRequest {
  subject: string
  applicationUri: string
  validityDays?: number
  keySize?: 2048 | 4096
}

// -----------------------------------------------------------------------------
// Discovery Types
// -----------------------------------------------------------------------------

export type OpcUaApplicationType = 'Server' | 'Client' | 'ClientAndServer' | 'DiscoveryServer'

export interface OpcUaServer {
  applicationUri: string
  productUri: string
  applicationName: string
  applicationType: OpcUaApplicationType
  discoveryUrls: string[]
}

export interface DiscoverServersRequest {
  discoveryUrl?: string
  localeIds?: string[]
  serverUris?: string[]
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_SESSION_TIMEOUT = 60000 // 60 seconds
export const DEFAULT_PUBLISHING_INTERVAL = 1000 // 1 second
export const DEFAULT_SAMPLING_INTERVAL = 500 // 500ms
export const DEFAULT_QUEUE_SIZE = 10
export const DEFAULT_LIFETIME_COUNT = 1000
export const DEFAULT_MAX_KEEPALIVE_COUNT = 10

// Standard Root NodeIds
export const ROOT_FOLDER_NODE_ID = 'i=84'
export const OBJECTS_FOLDER_NODE_ID = 'i=85'
export const TYPES_FOLDER_NODE_ID = 'i=86'
export const VIEWS_FOLDER_NODE_ID = 'i=87'
export const SERVER_NODE_ID = 'i=2253'
