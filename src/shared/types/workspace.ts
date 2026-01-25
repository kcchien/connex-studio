/**
 * Workspace type definitions for configuration export/import.
 * Shared between Main and Renderer processes.
 */

import type { Connection, ModbusTcpConfig, MqttConfig, OpcUaConfig } from './connection'
import type { Tag } from './tag'
import type { Environment } from './environment'
import type { Bridge } from './bridge'
import type { Dashboard } from './dashboard'
import type { AlertRule } from './alert'

// -----------------------------------------------------------------------------
// Current Schema Version
// -----------------------------------------------------------------------------

export const WORKSPACE_SCHEMA_VERSION = 2

// -----------------------------------------------------------------------------
// Export/Import Request Types
// -----------------------------------------------------------------------------

export interface ExportWorkspaceRequest {
  /** Workspace name for metadata */
  name?: string
  /** Author name for metadata */
  author?: string
  /** Include connections in export */
  includeConnections?: boolean
  /** Include environments in export */
  includeEnvironments?: boolean
  /** Include bridges in export */
  includeBridges?: boolean
  /** Include dashboards in export */
  includeDashboards?: boolean
  /** Include alert rules in export */
  includeAlertRules?: boolean
  /** Include tags in export */
  includeTags?: boolean
  /** Specific connection IDs to export (if empty, exports all) */
  connectionIds?: string[]
  /** Specific environment IDs to export (if empty, exports all) */
  environmentIds?: string[]
  /** Specific bridge IDs to export (if empty, exports all) */
  bridgeIds?: string[]
  /** Specific dashboard IDs to export (if empty, exports all) */
  dashboardIds?: string[]
  /** Specific alert rule IDs to export (if empty, exports all) */
  alertRuleIds?: string[]
}

export interface ImportWorkspaceRequest {
  /** YAML content to import */
  yaml: string
  /** Conflict resolution strategy */
  conflictResolution: ConflictResolution
  /** Validate only without importing */
  dryRun?: boolean
}

export type ConflictResolution = 'skip' | 'overwrite' | 'rename'

export interface ImportWorkspaceResult {
  success: boolean
  imported: ImportedCounts
  skipped: ImportedCounts
  conflicts: ConflictItem[]
  warnings: string[]
  errors: string[]
}

export interface ImportedCounts {
  environments: number
  connections: number
  tags: number
  bridges: number
  dashboards: number
  alertRules: number
}

export interface ConflictItem {
  type: 'environment' | 'connection' | 'tag' | 'bridge' | 'dashboard' | 'alertRule'
  name: string
  existingId: string
  resolution?: ConflictResolution
}

// -----------------------------------------------------------------------------
// Validation Types
// -----------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
  preview?: ImportPreview
}

export interface ValidationError {
  path: string
  message: string
  severity?: 'error' | 'warning'
}

export interface ImportPreview {
  meta: WorkspaceMeta
  counts: ImportedCounts
  conflicts: ConflictItem[]
  /** Items that would be imported */
  items: {
    environments: WorkspaceEnvironment[]
    connections: WorkspaceConnection[]
    tags: WorkspaceTag[]
    bridges: WorkspaceBridge[]
    dashboards: WorkspaceDashboard[]
    alertRules: WorkspaceAlertRule[]
  }
}

// -----------------------------------------------------------------------------
// Workspace YAML Schema Types
// -----------------------------------------------------------------------------

/**
 * Root workspace document structure (YAML format)
 */
export interface WorkspaceDocument {
  /** Schema version for compatibility checking */
  schemaVersion: number
  /** Workspace metadata */
  meta: WorkspaceMeta
  /** Environment definitions */
  environments?: WorkspaceEnvironment[]
  /** Connection configurations (credentials excluded) */
  connections?: WorkspaceConnection[]
  /** Tag definitions */
  tags?: WorkspaceTag[]
  /** Bridge configurations */
  bridges?: WorkspaceBridge[]
  /** Dashboard configurations */
  dashboards?: WorkspaceDashboard[]
  /** Alert rule definitions */
  alertRules?: WorkspaceAlertRule[]
}

// -----------------------------------------------------------------------------
// Workspace Metadata
// -----------------------------------------------------------------------------

export interface WorkspaceMeta {
  /** Workspace name */
  name: string
  /** Author name */
  author?: string
  /** Workspace version (user-defined) */
  version?: string
  /** Export timestamp (ISO 8601) */
  exportedAt: string
  /** Connex Studio version */
  connexVersion: string
  /** Schema version */
  schemaVersion: number
  /** Description */
  description?: string
}

// -----------------------------------------------------------------------------
// Workspace Entity Types (for YAML serialization)
// -----------------------------------------------------------------------------

/**
 * Environment for YAML export (excludes runtime fields)
 */
export interface WorkspaceEnvironment {
  /** Unique name (used as identifier in YAML) */
  name: string
  /** Variable definitions */
  variables: Record<string, string>
  /** Whether this is the default environment */
  isDefault?: boolean
}

/**
 * Connection for YAML export (excludes credentials)
 */
export interface WorkspaceConnection {
  /** Unique name (used as identifier in YAML) */
  name: string
  /** Protocol type */
  protocol: 'modbus-tcp' | 'mqtt' | 'opcua'
  /** Protocol-specific configuration (credentials excluded) */
  config: WorkspaceModbusConfig | WorkspaceMqttConfig | WorkspaceOpcUaConfig
  /** Whether connection has stored credentials (import will prompt) */
  hasCredentials?: boolean
}

export interface WorkspaceModbusConfig {
  host: string
  port: number
  unitId: number
  timeout: number
}

export interface WorkspaceMqttConfig {
  brokerUrl: string
  clientId: string
  useTls: boolean
  caCert?: string
  /** Flag indicating credentials exist (not exported) */
  hasCredentials?: boolean
}

export interface WorkspaceOpcUaConfig {
  endpointUrl: string
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt'
  securityPolicy: string
  /** Flag indicating credentials exist (not exported) */
  hasCredentials?: boolean
}

/**
 * Tag for YAML export
 */
export interface WorkspaceTag {
  /** Tag name */
  name: string
  /** Connection name reference (not ID) */
  connectionName: string
  /** Address configuration */
  address: WorkspaceModbusAddress | WorkspaceMqttAddress | WorkspaceOpcUaAddress
  /** Data type */
  dataType: string
  /** Display format */
  displayFormat?: {
    decimals?: number
    unit?: string
    prefix?: string
    suffix?: string
  }
  /** Thresholds */
  thresholds?: {
    warningLow?: number
    warningHigh?: number
    alarmLow?: number
    alarmHigh?: number
  }
  /** Whether tag is enabled */
  enabled?: boolean
}

export interface WorkspaceModbusAddress {
  type: 'modbus'
  registerType: 'holding' | 'input' | 'coil' | 'discrete'
  address: number
  length: number
}

export interface WorkspaceMqttAddress {
  type: 'mqtt'
  topic: string
  jsonPath?: string
}

export interface WorkspaceOpcUaAddress {
  type: 'opcua'
  nodeId: string
}

/**
 * Bridge for YAML export
 */
export interface WorkspaceBridge {
  /** Bridge name */
  name: string
  /** Source connection name reference */
  sourceConnectionName: string
  /** Source tag names */
  sourceTagNames: string[]
  /** Target connection name reference */
  targetConnectionName: string
  /** Target configuration */
  targetConfig: {
    topicTemplate: string
    payloadTemplate: string
    qos: 0 | 1 | 2
    retain: boolean
  }
  /** Bridge options */
  options?: {
    interval?: number
    changeOnly?: boolean
    changeThreshold?: number
    bufferSize?: number
  }
}

/**
 * Dashboard for YAML export
 */
export interface WorkspaceDashboard {
  /** Dashboard name */
  name: string
  /** Whether this is the default dashboard */
  isDefault?: boolean
  /** Widget layout */
  layout: Array<{
    widgetName: string
    x: number
    y: number
    w: number
    h: number
  }>
  /** Widget definitions */
  widgets: WorkspaceWidget[]
}

export interface WorkspaceWidget {
  /** Widget name (unique within dashboard) */
  name: string
  /** Widget type */
  type: 'gauge' | 'led' | 'numberCard' | 'chart'
  /** Tag name references */
  tagNames: string[]
  /** Widget configuration */
  config: Record<string, unknown>
}

/**
 * Alert rule for YAML export
 */
export interface WorkspaceAlertRule {
  /** Rule name */
  name: string
  /** Tag name reference */
  tagName: string
  /** Condition configuration */
  condition: {
    operator: '>' | '<' | '=' | '!=' | 'range' | 'roc'
    value: number
    value2?: number
    duration?: number
  }
  /** Severity level */
  severity: 'info' | 'warning' | 'critical'
  /** Alert actions */
  actions: Array<'notification' | 'sound' | 'log'>
  /** Whether rule is enabled */
  enabled?: boolean
  /** Cooldown in seconds */
  cooldown?: number
}

// -----------------------------------------------------------------------------
// Conversion Utilities Types
// -----------------------------------------------------------------------------

/**
 * ID to Name mapping for export
 */
export interface ExportMappings {
  connections: Map<string, string> // id -> name
  tags: Map<string, string>        // id -> name
  environments: Map<string, string> // id -> name
}

/**
 * Name to ID mapping for import
 */
export interface ImportMappings {
  connections: Map<string, string> // name -> id
  tags: Map<string, string>        // name -> id
  environments: Map<string, string> // name -> id
}

// -----------------------------------------------------------------------------
// File Operations Types
// -----------------------------------------------------------------------------

export interface SaveFileRequest {
  yaml: string
  defaultPath?: string
}

export interface SaveFileResult {
  success: boolean
  path?: string
  error?: string
}

export interface LoadFileRequest {
  path?: string
}

export interface LoadFileResult {
  success: boolean
  yaml?: string
  path?: string
  error?: string
}
