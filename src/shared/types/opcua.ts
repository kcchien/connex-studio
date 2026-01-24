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
  dataTypeId?: number
  statusCode: number
  statusCodeName?: string
  statusCodeSeverity?: 'good' | 'uncertain' | 'bad'
  sourceTimestamp?: number
  serverTimestamp?: number
  // For array values
  arrayDimensions?: number[]
  isArray?: boolean
}

export interface OpcUaWriteRequest {
  connectionId: string
  nodes: OpcUaWriteNode[]
}

export interface OpcUaWriteNode {
  nodeId: string
  value: unknown
  dataType?: string
  dataTypeId?: number
  indexRange?: string
}

export interface OpcUaWriteValidation {
  nodeId: string
  writable: boolean
  accessLevel: number
  userAccessLevel: number
  expectedDataType: string
  expectedDataTypeId?: number
}

export interface OpcUaWriteResult {
  results: OpcUaWriteNodeResult[]
}

export interface OpcUaWriteNodeResult {
  nodeId: string
  statusCode: number
  statusCodeName?: string
  success: boolean
  error?: string
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

export interface SetPublishingModeRequest {
  connectionId: string
  subscriptionId: string
  publishingEnabled: boolean
}

export interface DeleteSubscriptionRequest {
  connectionId: string
  subscriptionId: string
}

export interface RemoveMonitoredItemRequest {
  connectionId: string
  subscriptionId: string
  itemId: string
}

export interface SubscriptionState {
  id: string
  publishingEnabled: boolean
  keepAliveCount: number
  lifetimeCount: number
  currentSequenceNumber: number
  lastPublishTime?: number
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

export interface CertificateValidationResult {
  valid: boolean
  expired: boolean
  notYetValid: boolean
  selfSigned: boolean
  trusted: boolean
  errors: string[]
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
// StatusCode Utilities
// -----------------------------------------------------------------------------

/**
 * OPC UA StatusCode definitions for human-readable display.
 * Based on OPC UA Specification Part 4.
 */
export const OpcUaStatusCodes: Record<number, { name: string; description: string }> = {
  0: { name: 'Good', description: 'The operation completed successfully' },
  0x80000000: { name: 'Bad', description: 'The operation failed' },
  0x80010000: { name: 'BadUnexpectedError', description: 'An unexpected error occurred' },
  0x80020000: { name: 'BadInternalError', description: 'An internal error occurred' },
  0x80030000: { name: 'BadOutOfMemory', description: 'Not enough memory to complete the operation' },
  0x80040000: { name: 'BadResourceUnavailable', description: 'A required resource was not available' },
  0x80050000: { name: 'BadCommunicationError', description: 'A low level communication error occurred' },
  0x80060000: { name: 'BadEncodingError', description: 'Encoding error' },
  0x80070000: { name: 'BadDecodingError', description: 'Decoding error' },
  0x80080000: { name: 'BadEncodingLimitsExceeded', description: 'Encoding limits exceeded' },
  0x80090000: { name: 'BadRequestTooLarge', description: 'The request message size exceeds limits' },
  0x800A0000: { name: 'BadResponseTooLarge', description: 'The response message size exceeds limits' },
  0x800B0000: { name: 'BadUnknownResponse', description: 'Unknown response from server' },
  0x800C0000: { name: 'BadTimeout', description: 'The operation timed out' },
  0x800D0000: { name: 'BadServiceUnsupported', description: 'The server does not support this service' },
  0x800E0000: { name: 'BadShutdown', description: 'The operation was cancelled because the application is shutting down' },
  0x800F0000: { name: 'BadServerNotConnected', description: 'The server is not connected' },
  0x80100000: { name: 'BadServerHalted', description: 'The server has halted' },
  0x80110000: { name: 'BadNothingToDo', description: 'Nothing to do' },
  0x80120000: { name: 'BadTooManyOperations', description: 'Too many operations' },
  0x80130000: { name: 'BadTooManyMonitoredItems', description: 'Too many monitored items' },
  0x80140000: { name: 'BadDataTypeIdUnknown', description: 'The data type is not known' },
  0x80150000: { name: 'BadCertificateInvalid', description: 'The certificate is invalid' },
  0x80160000: { name: 'BadSecurityChecksFailed', description: 'Security checks failed' },
  0x80170000: { name: 'BadCertificateTimeInvalid', description: 'Certificate time invalid' },
  0x80180000: { name: 'BadCertificateIssuerTimeInvalid', description: 'Certificate issuer time invalid' },
  0x80190000: { name: 'BadCertificateHostNameInvalid', description: 'Certificate host name invalid' },
  0x801A0000: { name: 'BadCertificateUriInvalid', description: 'Certificate URI invalid' },
  0x801B0000: { name: 'BadCertificateUseNotAllowed', description: 'Certificate use not allowed' },
  0x801C0000: { name: 'BadCertificateIssuerUseNotAllowed', description: 'Certificate issuer use not allowed' },
  0x801D0000: { name: 'BadCertificateUntrusted', description: 'Certificate is not trusted' },
  0x801E0000: { name: 'BadCertificateRevocationUnknown', description: 'Certificate revocation status unknown' },
  0x801F0000: { name: 'BadCertificateIssuerRevocationUnknown', description: 'Certificate issuer revocation unknown' },
  0x80200000: { name: 'BadCertificateRevoked', description: 'Certificate has been revoked' },
  0x80210000: { name: 'BadCertificateIssuerRevoked', description: 'Certificate issuer has been revoked' },
  0x80220000: { name: 'BadCertificateChainIncomplete', description: 'Certificate chain incomplete' },
  0x80230000: { name: 'BadUserAccessDenied', description: 'User access denied' },
  0x80240000: { name: 'BadIdentityTokenInvalid', description: 'Identity token invalid' },
  0x80250000: { name: 'BadIdentityTokenRejected', description: 'Identity token rejected' },
  0x80260000: { name: 'BadSecureChannelIdInvalid', description: 'Secure channel ID invalid' },
  0x80270000: { name: 'BadInvalidTimestamp', description: 'Invalid timestamp' },
  0x80280000: { name: 'BadNonceInvalid', description: 'Nonce invalid' },
  0x80290000: { name: 'BadSessionIdInvalid', description: 'Session ID invalid' },
  0x802A0000: { name: 'BadSessionClosed', description: 'Session has been closed' },
  0x802B0000: { name: 'BadSessionNotActivated', description: 'Session not activated' },
  0x802C0000: { name: 'BadSubscriptionIdInvalid', description: 'Subscription ID invalid' },
  0x802D0000: { name: 'BadRequestHeaderInvalid', description: 'Request header invalid' },
  0x802E0000: { name: 'BadTimestampsToReturnInvalid', description: 'Timestamps to return invalid' },
  0x802F0000: { name: 'BadRequestCancelledByClient', description: 'Request cancelled by client' },
  0x80300000: { name: 'BadTooManyArguments', description: 'Too many arguments' },
  0x80310000: { name: 'BadLicenseExpired', description: 'License expired' },
  0x80320000: { name: 'BadLicenseLimitsExceeded', description: 'License limits exceeded' },
  0x80330000: { name: 'BadLicenseNotAvailable', description: 'License not available' },
  // Node-related status codes
  0x80340000: { name: 'BadNodeIdInvalid', description: 'The node ID is not valid' },
  0x80350000: { name: 'BadNodeIdUnknown', description: 'The node ID is unknown' },
  0x80360000: { name: 'BadAttributeIdInvalid', description: 'The attribute ID is not valid' },
  0x80370000: { name: 'BadIndexRangeInvalid', description: 'The index range is invalid' },
  0x80380000: { name: 'BadIndexRangeNoData', description: 'No data within the index range' },
  0x80390000: { name: 'BadDataEncodingInvalid', description: 'Data encoding invalid' },
  0x803A0000: { name: 'BadDataEncodingUnsupported', description: 'Data encoding unsupported' },
  0x803B0000: { name: 'BadNotReadable', description: 'The variable source is not readable' },
  0x803C0000: { name: 'BadNotWritable', description: 'The variable source is not writable' },
  0x803D0000: { name: 'BadOutOfRange', description: 'The value is out of range' },
  0x803E0000: { name: 'BadNotSupported', description: 'The operation is not supported' },
  0x803F0000: { name: 'BadNotFound', description: 'The requested item was not found' },
  0x80400000: { name: 'BadObjectDeleted', description: 'The object has been deleted' },
  0x80410000: { name: 'BadNotImplemented', description: 'The operation is not implemented' },
  0x80420000: { name: 'BadMonitoringModeInvalid', description: 'Monitoring mode invalid' },
  0x80430000: { name: 'BadMonitoredItemIdInvalid', description: 'Monitored item ID invalid' },
  0x80440000: { name: 'BadMonitoredItemFilterInvalid', description: 'Monitored item filter invalid' },
  0x80450000: { name: 'BadMonitoredItemFilterUnsupported', description: 'Monitored item filter unsupported' },
  0x80460000: { name: 'BadFilterNotAllowed', description: 'Filter not allowed' },
  0x80470000: { name: 'BadStructureMissing', description: 'Structure missing' },
  0x80480000: { name: 'BadEventFilterInvalid', description: 'Event filter invalid' },
  0x80490000: { name: 'BadContentFilterInvalid', description: 'Content filter invalid' },
  0x804A0000: { name: 'BadFilterOperatorInvalid', description: 'Filter operator invalid' },
  0x804B0000: { name: 'BadFilterOperatorUnsupported', description: 'Filter operator unsupported' },
  0x804C0000: { name: 'BadFilterOperandCountMismatch', description: 'Filter operand count mismatch' },
  0x804D0000: { name: 'BadFilterOperandInvalid', description: 'Filter operand invalid' },
  0x804E0000: { name: 'BadFilterElementInvalid', description: 'Filter element invalid' },
  0x804F0000: { name: 'BadFilterLiteralInvalid', description: 'Filter literal invalid' },
  0x80500000: { name: 'BadContinuationPointInvalid', description: 'Continuation point invalid' },
  0x80510000: { name: 'BadNoContinuationPoints', description: 'No continuation points available' },
  0x80520000: { name: 'BadReferenceTypeIdInvalid', description: 'Reference type ID invalid' },
  0x80530000: { name: 'BadBrowseDirectionInvalid', description: 'Browse direction invalid' },
  0x80540000: { name: 'BadNodeNotInView', description: 'Node not in view' },
  0x80550000: { name: 'BadServerUriInvalid', description: 'Server URI invalid' },
  0x80560000: { name: 'BadServerNameMissing', description: 'Server name missing' },
  0x80570000: { name: 'BadDiscoveryUrlMissing', description: 'Discovery URL missing' },
  0x80580000: { name: 'BadSempahoreFileMissing', description: 'Semaphore file missing' },
  0x80590000: { name: 'BadRequestTypeInvalid', description: 'Request type invalid' },
  0x805A0000: { name: 'BadSecurityModeRejected', description: 'Security mode rejected' },
  0x805B0000: { name: 'BadSecurityPolicyRejected', description: 'Security policy rejected' },
  0x805C0000: { name: 'BadTooManySessions', description: 'Too many sessions' },
  0x805D0000: { name: 'BadUserSignatureInvalid', description: 'User signature invalid' },
  0x805E0000: { name: 'BadApplicationSignatureInvalid', description: 'Application signature invalid' },
  0x805F0000: { name: 'BadNoValidCertificates', description: 'No valid certificates' },
  0x80600000: { name: 'BadIdentityChangeNotSupported', description: 'Identity change not supported' },
  0x80610000: { name: 'BadRequestCancelledByRequest', description: 'Request cancelled by request' },
  0x80620000: { name: 'BadParentNodeIdInvalid', description: 'Parent node ID invalid' },
  0x80630000: { name: 'BadReferenceNotAllowed', description: 'Reference not allowed' },
  0x80640000: { name: 'BadNodeIdRejected', description: 'Node ID rejected' },
  0x80650000: { name: 'BadNodeIdExists', description: 'Node ID already exists' },
  0x80660000: { name: 'BadNodeClassInvalid', description: 'Node class invalid' },
  0x80670000: { name: 'BadBrowseNameInvalid', description: 'Browse name invalid' },
  0x80680000: { name: 'BadBrowseNameDuplicated', description: 'Browse name duplicated' },
  0x80690000: { name: 'BadNodeAttributesInvalid', description: 'Node attributes invalid' },
  0x806A0000: { name: 'BadTypeDefinitionInvalid', description: 'Type definition invalid' },
  0x806B0000: { name: 'BadSourceNodeIdInvalid', description: 'Source node ID invalid' },
  0x806C0000: { name: 'BadTargetNodeIdInvalid', description: 'Target node ID invalid' },
  0x806D0000: { name: 'BadDuplicateReferenceNotAllowed', description: 'Duplicate reference not allowed' },
  0x806E0000: { name: 'BadInvalidSelfReference', description: 'Invalid self reference' },
  0x806F0000: { name: 'BadReferenceLocalOnly', description: 'Reference local only' },
  0x80700000: { name: 'BadNoDeleteRights', description: 'No delete rights' },
  0x80710000: { name: 'UncertainReferenceNotDeleted', description: 'Reference not deleted' },
  0x80720000: { name: 'BadServerIndexInvalid', description: 'Server index invalid' },
  0x80730000: { name: 'BadViewIdUnknown', description: 'View ID unknown' },
  0x80740000: { name: 'BadViewTimestampInvalid', description: 'View timestamp invalid' },
  0x80750000: { name: 'BadViewParameterMismatch', description: 'View parameter mismatch' },
  0x80760000: { name: 'BadViewVersionInvalid', description: 'View version invalid' },
  0x80770000: { name: 'UncertainNotAllNodesAvailable', description: 'Not all nodes available' },
  0x40780000: { name: 'GoodResultsMayBeIncomplete', description: 'Results may be incomplete' },
  0x80790000: { name: 'BadNotTypeDefinition', description: 'Not a type definition' },
  0x807A0000: { name: 'UncertainReferenceOutOfServer', description: 'Reference out of server' },
  0x807B0000: { name: 'BadTooManyMatches', description: 'Too many matches' },
  0x807C0000: { name: 'BadQueryTooComplex', description: 'Query too complex' },
  0x807D0000: { name: 'BadNoMatch', description: 'No match found' },
  0x807E0000: { name: 'BadMaxAgeInvalid', description: 'Max age invalid' },
  0x807F0000: { name: 'BadSecurityModeInsufficient', description: 'Security mode insufficient' },
  0x80800000: { name: 'BadHistoryOperationInvalid', description: 'History operation invalid' },
  0x80810000: { name: 'BadHistoryOperationUnsupported', description: 'History operation unsupported' },
  0x80820000: { name: 'BadInvalidTimestampArgument', description: 'Invalid timestamp argument' },
  0x80830000: { name: 'BadWriteNotSupported', description: 'Write not supported' },
  0x80840000: { name: 'BadTypeMismatch', description: 'Type mismatch' },
  0x80850000: { name: 'BadMethodInvalid', description: 'Method invalid' },
  0x80860000: { name: 'BadArgumentsMissing', description: 'Arguments missing' },
  0x80870000: { name: 'BadNotExecutable', description: 'Not executable' },
  0x80880000: { name: 'BadTooManySubscriptions', description: 'Too many subscriptions' },
  0x80890000: { name: 'BadTooManyPublishRequests', description: 'Too many publish requests' },
  0x808A0000: { name: 'BadNoSubscription', description: 'No subscription' },
  0x808B0000: { name: 'BadSequenceNumberUnknown', description: 'Sequence number unknown' },
  0x808C0000: { name: 'BadMessageNotAvailable', description: 'Message not available' },
  0x808D0000: { name: 'BadInsufficientClientProfile', description: 'Insufficient client profile' },
  0x808E0000: { name: 'BadStateNotActive', description: 'State not active' },
  0x808F0000: { name: 'BadAlreadyExists', description: 'Already exists' },
  0x80900000: { name: 'BadTcpServerTooBusy', description: 'TCP server too busy' },
  0x80910000: { name: 'BadTcpMessageTypeInvalid', description: 'TCP message type invalid' },
  0x80920000: { name: 'BadTcpSecureChannelUnknown', description: 'TCP secure channel unknown' },
  0x80930000: { name: 'BadTcpMessageTooLarge', description: 'TCP message too large' },
  0x80940000: { name: 'BadTcpNotEnoughResources', description: 'TCP not enough resources' },
  0x80950000: { name: 'BadTcpInternalError', description: 'TCP internal error' },
  0x80960000: { name: 'BadTcpEndpointUrlInvalid', description: 'TCP endpoint URL invalid' },
  0x80970000: { name: 'BadRequestInterrupted', description: 'Request interrupted' },
  0x80980000: { name: 'BadRequestTimeout', description: 'Request timeout' },
  0x80990000: { name: 'BadSecureChannelClosed', description: 'Secure channel closed' },
  0x809A0000: { name: 'BadSecureChannelTokenUnknown', description: 'Secure channel token unknown' },
  0x809B0000: { name: 'BadSequenceNumberInvalid', description: 'Sequence number invalid' },
  0x809C0000: { name: 'BadProtocolVersionUnsupported', description: 'Protocol version unsupported' },
  0x80C80000: { name: 'BadConfigurationError', description: 'Configuration error' },
  0x80C90000: { name: 'BadNotConnected', description: 'Not connected' },
  0x80CA0000: { name: 'BadDeviceFailure', description: 'Device failure' },
  0x80CB0000: { name: 'BadSensorFailure', description: 'Sensor failure' },
  0x80CC0000: { name: 'BadOutOfService', description: 'Out of service' },
  0x80CD0000: { name: 'BadDeadbandFilterInvalid', description: 'Deadband filter invalid' },
  // Uncertain status codes
  0x40A50000: { name: 'UncertainNoCommunicationLastUsableValue', description: 'No communication, last usable value' },
  0x40A60000: { name: 'UncertainLastUsableValue', description: 'Last usable value' },
  0x40A70000: { name: 'UncertainSubstituteValue', description: 'Substitute value' },
  0x40A80000: { name: 'UncertainInitialValue', description: 'Initial value' },
  0x40A90000: { name: 'UncertainSensorNotAccurate', description: 'Sensor not accurate' },
  0x40AA0000: { name: 'UncertainEngineeringUnitsExceeded', description: 'Engineering units exceeded' },
  0x40AB0000: { name: 'UncertainSubNormal', description: 'Sub normal' },
  // Good status codes with additional info
  0x00A00000: { name: 'GoodLocalOverride', description: 'Local override active' },
  0x00AB0000: { name: 'GoodSubNormal', description: 'Sub normal value' },
  0x00AC0000: { name: 'GoodClamped', description: 'Value clamped to limits' }
}

/**
 * Get human-readable StatusCode information.
 */
export function getStatusCodeInfo(statusCode: number): { name: string; description: string; severity: 'good' | 'uncertain' | 'bad' } {
  // Check for exact match first
  if (OpcUaStatusCodes[statusCode]) {
    const info = OpcUaStatusCodes[statusCode]
    const severity = (statusCode & 0xC0000000) === 0 ? 'good' :
                     (statusCode & 0x40000000) !== 0 ? 'uncertain' : 'bad'
    return { ...info, severity }
  }

  // Determine severity from high bits
  const highBits = statusCode & 0xC0000000
  if (highBits === 0) {
    return { name: 'Good', description: 'The operation completed successfully', severity: 'good' }
  } else if (highBits === 0x40000000) {
    return { name: 'Uncertain', description: 'The value is uncertain', severity: 'uncertain' }
  } else {
    return { name: 'Bad', description: 'The operation failed', severity: 'bad' }
  }
}

/**
 * Check if a StatusCode indicates success.
 */
export function isGoodStatusCode(statusCode: number): boolean {
  return (statusCode & 0xC0000000) === 0
}

/**
 * Check if a StatusCode indicates uncertain.
 */
export function isUncertainStatusCode(statusCode: number): boolean {
  return (statusCode & 0x40000000) !== 0 && (statusCode & 0x80000000) === 0
}

/**
 * Check if a StatusCode indicates failure.
 */
export function isBadStatusCode(statusCode: number): boolean {
  return (statusCode & 0x80000000) !== 0
}

// -----------------------------------------------------------------------------
// OPC UA Built-in Data Types
// -----------------------------------------------------------------------------

/**
 * OPC UA Built-in DataType identifiers.
 */
export const OpcUaDataTypeIds = {
  Boolean: 1,
  SByte: 2,
  Byte: 3,
  Int16: 4,
  UInt16: 5,
  Int32: 6,
  UInt32: 7,
  Int64: 8,
  UInt64: 9,
  Float: 10,
  Double: 11,
  String: 12,
  DateTime: 13,
  Guid: 14,
  ByteString: 15,
  XmlElement: 16,
  NodeId: 17,
  ExpandedNodeId: 18,
  StatusCode: 19,
  QualifiedName: 20,
  LocalizedText: 21,
  ExtensionObject: 22,
  DataValue: 23,
  Variant: 24,
  DiagnosticInfo: 25
} as const

export type OpcUaDataTypeId = typeof OpcUaDataTypeIds[keyof typeof OpcUaDataTypeIds]

/**
 * Map DataType ID to human-readable name.
 */
export const DataTypeNames: Record<number, string> = {
  1: 'Boolean',
  2: 'SByte',
  3: 'Byte',
  4: 'Int16',
  5: 'UInt16',
  6: 'Int32',
  7: 'UInt32',
  8: 'Int64',
  9: 'UInt64',
  10: 'Float',
  11: 'Double',
  12: 'String',
  13: 'DateTime',
  14: 'Guid',
  15: 'ByteString',
  16: 'XmlElement',
  17: 'NodeId',
  18: 'ExpandedNodeId',
  19: 'StatusCode',
  20: 'QualifiedName',
  21: 'LocalizedText',
  22: 'ExtensionObject',
  23: 'DataValue',
  24: 'Variant',
  25: 'DiagnosticInfo'
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
