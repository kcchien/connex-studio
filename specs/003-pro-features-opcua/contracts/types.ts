/**
 * Type Contracts: Phase 2 Professional Features with Full OPC UA
 *
 * Branch: 003-pro-features-opcua | Date: 2026-01-24
 * Purpose: Shared TypeScript types for IPC communication.
 */

// =============================================================================
// Part A: Professional Features Types
// =============================================================================

// -----------------------------------------------------------------------------
// Environment Types
// -----------------------------------------------------------------------------

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateEnvironmentRequest {
  name: string;
  variables?: Record<string, string>;
  isDefault?: boolean;
}

export interface UpdateEnvironmentRequest {
  id: string;
  name?: string;
  variables?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Collection Types
// -----------------------------------------------------------------------------

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: CollectionRequest[];
  executionMode: 'sequential';
  createdAt: number;
  updatedAt: number;
}

export interface CollectionRequest {
  id: string;
  connectionId: string;
  operation: 'read' | 'write';
  parameters: Record<string, unknown>;
  assertions: Assertion[];
  timeout: number;
}

export interface Assertion {
  type: 'equals' | 'contains' | 'range' | 'regex';
  target: 'value' | 'status' | 'latency';
  expected: unknown;
  message?: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  requests?: CollectionRequest[];
}

export interface UpdateCollectionRequest {
  id: string;
  name?: string;
  description?: string;
  requests?: CollectionRequest[];
}

export interface CollectionRunResult {
  runId: string;
  collectionId: string;
  status: 'success' | 'partial' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt: number;
  results: RequestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface RequestResult {
  requestId: string;
  status: 'passed' | 'failed' | 'skipped';
  value?: unknown;
  latency: number;
  assertions: AssertionResult[];
  error?: string;
}

export interface AssertionResult {
  passed: boolean;
  message?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface CollectionProgress {
  runId: string;
  currentIndex: number;
  total: number;
  currentRequest: string;
  status: 'running' | 'completed' | 'failed';
}

// -----------------------------------------------------------------------------
// Bridge Types
// -----------------------------------------------------------------------------

export type BridgeStatus = 'idle' | 'active' | 'paused' | 'error';

export interface Bridge {
  id: string;
  name: string;
  sourceConnectionId: string;
  sourceTags: string[];
  targetConnectionId: string;
  targetConfig: BridgeTargetConfig;
  options: BridgeOptions;
  status: BridgeStatus;
  createdAt: number;
}

export interface BridgeTargetConfig {
  topicTemplate: string;
  payloadTemplate: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}

export interface BridgeOptions {
  interval: number;
  changeOnly: boolean;
  changeThreshold?: number;
  bufferSize: number;
}

export interface CreateBridgeRequest {
  name: string;
  sourceConnectionId: string;
  sourceTags: string[];
  targetConnectionId: string;
  targetConfig: BridgeTargetConfig;
  options?: Partial<BridgeOptions>;
}

export interface UpdateBridgeRequest {
  id: string;
  name?: string;
  sourceTags?: string[];
  targetConfig?: Partial<BridgeTargetConfig>;
  options?: Partial<BridgeOptions>;
}

export interface BridgeStats {
  bridgeId: string;
  status: BridgeStatus;
  messagesForwarded: number;
  messagesDropped: number;
  bytesTransferred: number;
  lastForwardedAt?: number;
  errorCount: number;
  lastError?: string;
  uptime: number;
}

// -----------------------------------------------------------------------------
// Dashboard Types
// -----------------------------------------------------------------------------

export type WidgetType = 'gauge' | 'led' | 'numberCard' | 'chart';

export interface Dashboard {
  id: string;
  name: string;
  isDefault: boolean;
  layout: WidgetLayout[];
  widgets: DashboardWidget[];
  createdAt: number;
  updatedAt: number;
}

export interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  tagRefs: string[];
  config: GaugeConfig | LEDConfig | NumberCardConfig | ChartConfig;
}

export interface Threshold {
  value: number;
  color: string;
  label?: string;
}

export interface GaugeConfig {
  style: 'circular' | 'semi';
  min: number;
  max: number;
  unit?: string;
  thresholds: Threshold[];
  showValue: boolean;
}

export interface LEDConfig {
  shape: 'circle' | 'square';
  onValue: number | boolean;
  onColor: string;
  offColor: string;
  label?: string;
}

export interface NumberCardConfig {
  title?: string;
  unit?: string;
  decimals: number;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  thresholds: Threshold[];
}

export interface ChartConfig {
  timeRange: number;
  showGrid: boolean;
  showLegend: boolean;
}

export interface CreateDashboardRequest {
  name: string;
  isDefault?: boolean;
}

export interface UpdateDashboardRequest {
  id: string;
  name?: string;
  isDefault?: boolean;
}

export interface AddWidgetRequest {
  dashboardId: string;
  type: WidgetType;
  tagRefs: string[];
  config: GaugeConfig | LEDConfig | NumberCardConfig | ChartConfig;
  layout?: Partial<WidgetLayout>;
}

export interface UpdateWidgetRequest {
  dashboardId: string;
  widgetId: string;
  tagRefs?: string[];
  config?: Partial<GaugeConfig | LEDConfig | NumberCardConfig | ChartConfig>;
}

export interface UpdateLayoutRequest {
  dashboardId: string;
  layout: WidgetLayout[];
}

// -----------------------------------------------------------------------------
// Alert Types
// -----------------------------------------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertOperator = '>' | '<' | '=' | '!=' | 'range' | 'roc';
export type AlertActionType = 'notification' | 'sound' | 'log';

export interface AlertRule {
  id: string;
  name: string;
  tagRef: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  actions: AlertActionType[];
  enabled: boolean;
  cooldown: number;
  createdAt: number;
}

export interface AlertCondition {
  operator: AlertOperator;
  value: number;
  value2?: number;
  duration?: number;
}

export interface CreateAlertRuleRequest {
  name: string;
  tagRef: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  actions: AlertActionType[];
  cooldown?: number;
}

export interface UpdateAlertRuleRequest {
  id: string;
  name?: string;
  tagRef?: string;
  condition?: AlertCondition;
  severity?: AlertSeverity;
  actions?: AlertActionType[];
  cooldown?: number;
}

export interface AlertEvent {
  id: number;
  ruleId: string;
  timestamp: number;
  tagRef: string;
  triggerValue: number;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

export interface AlertEventQuery {
  severity?: AlertSeverity;
  acknowledged?: boolean;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface AlertEventPage {
  events: AlertEvent[];
  total: number;
  hasMore: boolean;
}

// -----------------------------------------------------------------------------
// Calculator Types
// -----------------------------------------------------------------------------

export interface DecodeFloat32Request {
  hex: string;
  byteOrder: 'BE' | 'LE';
  wordOrder?: 'BE' | 'LE';
}

export interface EncodeFloat32Request {
  value: number;
  byteOrder: 'BE' | 'LE';
  wordOrder?: 'BE' | 'LE';
}

export interface SwapBytesRequest {
  hex: string;
  operation: 'swap16' | 'swap32' | 'swap64';
}

// -----------------------------------------------------------------------------
// Workspace Types
// -----------------------------------------------------------------------------

export interface ExportWorkspaceRequest {
  includeConnections?: boolean;
  includeEnvironments?: boolean;
  includeBridges?: boolean;
  includeDashboards?: boolean;
  includeAlertRules?: boolean;
  includeTags?: boolean;
}

export interface ImportWorkspaceResult {
  success: boolean;
  imported: {
    environments: number;
    connections: number;
    tags: number;
    bridges: number;
    dashboards: number;
    alertRules: number;
  };
  warnings: string[];
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
}

// =============================================================================
// Part B: OPC UA Types
// =============================================================================

// -----------------------------------------------------------------------------
// Connection Types
// -----------------------------------------------------------------------------

export type SecurityPolicy =
  | 'None'
  | 'Basic256Sha256'
  | 'Aes128_Sha256_RsaOaep'
  | 'Aes256_Sha256_RsaPss';

export type MessageSecurityMode = 'None' | 'Sign' | 'SignAndEncrypt';

export type OpcUaAuthType = 'anonymous' | 'username' | 'certificate';

export interface OpcUaAuth {
  type: OpcUaAuthType;
  username?: string;
  password?: string;
  certificateId?: string;
}

export interface OpcUaConnectRequest {
  endpointUrl: string;
  securityPolicy: SecurityPolicy;
  securityMode: MessageSecurityMode;
  authentication: OpcUaAuth;
  sessionTimeout?: number;
  applicationName?: string;
  certificateId?: string;
}

export interface OpcUaConnectResult {
  connectionId: string;
  serverInfo: {
    applicationName: string;
    productUri: string;
    buildInfo?: {
      productName: string;
      softwareVersion: string;
      buildNumber: string;
    };
  };
  sessionId: string;
  revisedSessionTimeout: number;
}

export interface OpcUaEndpoint {
  endpointUrl: string;
  securityMode: MessageSecurityMode;
  securityPolicy: SecurityPolicy;
  userTokenPolicies: UserTokenPolicy[];
  serverCertificate?: string;
  securityLevel: number;
}

export interface UserTokenPolicy {
  policyId: string;
  tokenType: 'anonymous' | 'username' | 'certificate' | 'issuedToken';
  securityPolicy?: string;
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
  | 'View';

export interface OpcUaNode {
  nodeId: string;
  displayName: string;
  browseName: string;
  nodeClass: NodeClass;
  dataType?: string;
  accessLevel?: number;
  historizing?: boolean;
  description?: string;
  hasChildren?: boolean;
}

export interface OpcUaBrowseRequest {
  connectionId: string;
  nodeId: string;
  browseDirection?: 'Forward' | 'Inverse' | 'Both';
  referenceType?: string;
  nodeClassMask?: NodeClass[];
  maxReferences?: number;
}

export interface OpcUaBrowsePathRequest {
  connectionId: string;
  startingNode: string;
  relativePath: string[];
}

// -----------------------------------------------------------------------------
// Read/Write Types
// -----------------------------------------------------------------------------

export interface OpcUaReadRequest {
  connectionId: string;
  nodes: Array<{
    nodeId: string;
    attributeId?: number;
  }>;
  maxAge?: number;
}

export interface OpcUaReadResult {
  values: Array<{
    nodeId: string;
    value: unknown;
    dataType: string;
    statusCode: number;
    sourceTimestamp?: number;
    serverTimestamp?: number;
  }>;
}

export interface OpcUaWriteRequest {
  connectionId: string;
  nodes: Array<{
    nodeId: string;
    value: unknown;
    dataType?: string;
  }>;
}

export interface OpcUaWriteResult {
  results: Array<{
    nodeId: string;
    statusCode: number;
    success: boolean;
  }>;
}

export interface OpcUaReadAttributesRequest {
  connectionId: string;
  nodeId: string;
  attributeIds: number[];
}

export interface OpcUaAttributeResult {
  attributeId: number;
  value: unknown;
  statusCode: number;
}

// -----------------------------------------------------------------------------
// Subscription Types
// -----------------------------------------------------------------------------

export type DeadbandType = 'None' | 'Absolute' | 'Percent';

export interface OpcUaSubscription {
  id: string;
  subscriptionId: number;
  connectionId: string;
  publishingInterval: number;
  lifetimeCount: number;
  maxKeepAliveCount: number;
  maxNotificationsPerPublish: number;
  priority: number;
  monitoredItems: MonitoredItem[];
}

export interface MonitoredItem {
  id: string;
  monitoredItemId: number;
  nodeId: string;
  attributeId: number;
  samplingInterval: number;
  queueSize: number;
  discardOldest: boolean;
  deadbandType: DeadbandType;
  deadbandValue?: number;
}

export interface CreateSubscriptionRequest {
  connectionId: string;
  publishingInterval?: number;
  lifetimeCount?: number;
  maxKeepAliveCount?: number;
  maxNotificationsPerPublish?: number;
  priority?: number;
}

export interface AddMonitoredItemRequest {
  subscriptionId: string;
  nodeId: string;
  attributeId?: number;
  samplingInterval?: number;
  queueSize?: number;
  discardOldest?: boolean;
  deadbandType?: DeadbandType;
  deadbandValue?: number;
}

export interface ModifyMonitoredItemRequest {
  subscriptionId: string;
  itemId: string;
  samplingInterval?: number;
  queueSize?: number;
  discardOldest?: boolean;
  deadbandType?: DeadbandType;
  deadbandValue?: number;
}

export interface OpcUaDataChange {
  subscriptionId: string;
  items: Array<{
    itemId: string;
    nodeId: string;
    value: unknown;
    dataType: string;
    statusCode: number;
    sourceTimestamp: number;
    serverTimestamp: number;
  }>;
}

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

export interface OpcUaEvent {
  eventId: string;
  eventType: string;
  sourceNodeId: string;
  sourceName: string;
  time: number;
  receiveTime: number;
  message: string;
  severity: number;
  conditionId?: string;
  acknowledged?: boolean;
  confirmed?: boolean;
}

export interface SubscribeEventsRequest {
  connectionId: string;
  sourceNodeId: string;
  eventTypes?: string[];
  selectClauses?: string[];
  whereClause?: EventFilter;
}

export interface EventFilter {
  operator: 'And' | 'Or' | 'Not' | 'Equals' | 'GreaterThan' | 'LessThan';
  operands: Array<EventFilter | EventOperand>;
}

export interface EventOperand {
  type: 'literal' | 'attribute' | 'simpleAttribute';
  value: unknown;
}

export interface AcknowledgeConditionRequest {
  connectionId: string;
  conditionId: string;
  eventId: string;
  comment?: string;
}

export interface ConfirmConditionRequest {
  connectionId: string;
  conditionId: string;
  eventId: string;
  comment?: string;
}

// -----------------------------------------------------------------------------
// Method Types
// -----------------------------------------------------------------------------

export interface OpcUaCallMethodRequest {
  connectionId: string;
  objectId: string;
  methodId: string;
  inputArguments?: unknown[];
}

export interface OpcUaCallMethodResult {
  statusCode: number;
  outputArguments: unknown[];
  inputArgumentResults?: number[];
}

export interface OpcUaMethodArguments {
  inputArguments: MethodArgument[];
  outputArguments: MethodArgument[];
}

export interface MethodArgument {
  name: string;
  dataType: string;
  valueRank: number;
  arrayDimensions?: number[];
  description?: string;
}

// -----------------------------------------------------------------------------
// History Types
// -----------------------------------------------------------------------------

export interface OpcUaHistoryReadRequest {
  connectionId: string;
  nodeIds: string[];
  startTime: number;
  endTime: number;
  numValuesPerNode?: number;
  returnBounds?: boolean;
}

export interface OpcUaHistoryReadResult {
  results: Array<{
    nodeId: string;
    values: Array<{
      value: unknown;
      statusCode: number;
      sourceTimestamp: number;
      serverTimestamp: number;
    }>;
    continuationPoint?: string;
  }>;
}

export interface OpcUaHistoryEventsRequest {
  connectionId: string;
  nodeId: string;
  startTime: number;
  endTime: number;
  numEventsPerNode?: number;
  filter?: EventFilter;
}

export interface OpcUaHistoryEventsResult {
  events: OpcUaEvent[];
  continuationPoint?: string;
}

// -----------------------------------------------------------------------------
// Certificate Types
// -----------------------------------------------------------------------------

export interface OpcUaCertificate {
  id: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: number;
  validTo: number;
  thumbprint: string;
  path: string;
  privateKeyPath?: string;
  trusted: boolean;
  isApplicationCert: boolean;
}

export interface ImportCertificateRequest {
  certificatePath: string;
  privateKeyPath?: string;
  password?: string;
}

export interface GenerateCertificateRequest {
  subject: string;
  applicationUri: string;
  validityDays?: number;
  keySize?: 2048 | 4096;
}

// -----------------------------------------------------------------------------
// Discovery Types
// -----------------------------------------------------------------------------

export interface OpcUaServer {
  applicationUri: string;
  productUri: string;
  applicationName: string;
  applicationType: 'Server' | 'Client' | 'ClientAndServer' | 'DiscoveryServer';
  discoveryUrls: string[];
}

export interface DiscoverServersRequest {
  discoveryUrl?: string;
  localeIds?: string[];
  serverUris?: string[];
}

// =============================================================================
// Common Types
// =============================================================================

export interface IpcError {
  code: string;
  message: string;
  details?: unknown;
}

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: IpcError;
}
