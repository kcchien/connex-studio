/**
 * WorkspaceExporter Service
 *
 * Exports workspace configuration to YAML format for backup,
 * version control, and team sharing.
 *
 * Features:
 * - Selective export (choose items to include)
 * - Credential exclusion for security
 * - Stable YAML output with sorted keys
 * - Schema version embedding
 */

import * as yaml from 'js-yaml'
import { app } from 'electron'
import { getConnectionManager } from './ConnectionManager'
import { getEnvironmentManager } from './EnvironmentManager'
import { getBridgeManager } from './BridgeManager'
import { getDashboardService } from './DashboardService'
import { getAlertEngine } from './AlertEngine'
import { log } from './LogService'
import {
  type ExportWorkspaceRequest,
  type WorkspaceDocument,
  type WorkspaceMeta,
  type WorkspaceEnvironment,
  type WorkspaceConnection,
  type WorkspaceTag,
  type WorkspaceBridge,
  type WorkspaceDashboard,
  type WorkspaceWidget,
  type WorkspaceAlertRule,
  type ExportMappings,
  WORKSPACE_SCHEMA_VERSION
} from '../../shared/types/workspace'
import type { Connection, ModbusTcpConfig, MqttConfig, OpcUaConfig } from '../../shared/types/connection'
import type { Tag, ModbusAddress, MqttAddress, OpcUaAddress } from '../../shared/types/tag'
import type { Environment } from '../../shared/types/environment'
import type { Bridge } from '../../shared/types/bridge'
import type { Dashboard, DashboardWidget } from '../../shared/types/dashboard'
import type { AlertRule } from '../../shared/types/alert'

// -----------------------------------------------------------------------------
// WorkspaceExporter Class
// -----------------------------------------------------------------------------

export class WorkspaceExporter {
  private static instance: WorkspaceExporter | null = null

  private constructor() {}

  static getInstance(): WorkspaceExporter {
    if (!WorkspaceExporter.instance) {
      WorkspaceExporter.instance = new WorkspaceExporter()
    }
    return WorkspaceExporter.instance
  }

  /**
   * Export workspace to YAML string
   */
  async export(request: ExportWorkspaceRequest): Promise<string> {
    log.info('[WorkspaceExporter] Starting export', request)

    try {
      // Build ID to Name mappings for reference resolution
      const mappings = await this.buildExportMappings()

      // Build workspace document
      const document = await this.buildDocument(request, mappings)

      // Convert to YAML with stable output
      const yamlContent = this.toYaml(document)

      log.info('[WorkspaceExporter] Export completed', {
        environments: document.environments?.length ?? 0,
        connections: document.connections?.length ?? 0,
        tags: document.tags?.length ?? 0,
        bridges: document.bridges?.length ?? 0,
        dashboards: document.dashboards?.length ?? 0,
        alertRules: document.alertRules?.length ?? 0
      })

      return yamlContent
    } catch (error) {
      log.error('[WorkspaceExporter] Export failed', error)
      throw error
    }
  }

  /**
   * Build ID to Name mappings for resolving references
   */
  private async buildExportMappings(): Promise<ExportMappings> {
    const connectionManager = getConnectionManager()
    const connections = connectionManager.getAllConnections()

    const connectionMap = new Map<string, string>()
    for (const conn of connections) {
      connectionMap.set(conn.id, conn.name)
    }

    const tagMap = new Map<string, string>()
    for (const conn of connections) {
      const tags = connectionManager.getTags(conn.id)
      for (const tag of tags) {
        tagMap.set(tag.id, tag.name)
      }
    }

    const environmentManager = getEnvironmentManager()
    const environments = await environmentManager.list()

    const environmentMap = new Map<string, string>()
    for (const env of environments) {
      environmentMap.set(env.id, env.name)
    }

    return {
      connections: connectionMap,
      tags: tagMap,
      environments: environmentMap
    }
  }

  /**
   * Build the workspace document
   */
  private async buildDocument(
    request: ExportWorkspaceRequest,
    mappings: ExportMappings
  ): Promise<WorkspaceDocument> {
    const meta = this.buildMeta(request)
    const document: WorkspaceDocument = {
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      meta
    }

    // Export environments
    if (request.includeEnvironments !== false) {
      document.environments = await this.exportEnvironments(request.environmentIds)
    }

    // Export connections
    if (request.includeConnections !== false) {
      document.connections = await this.exportConnections(request.connectionIds)
    }

    // Export tags (requires connections)
    if (request.includeTags !== false) {
      document.tags = await this.exportTags(request.connectionIds, mappings)
    }

    // Export bridges
    if (request.includeBridges !== false) {
      document.bridges = await this.exportBridges(request.bridgeIds, mappings)
    }

    // Export dashboards
    if (request.includeDashboards !== false) {
      document.dashboards = await this.exportDashboards(request.dashboardIds, mappings)
    }

    // Export alert rules
    if (request.includeAlertRules !== false) {
      document.alertRules = await this.exportAlertRules(request.alertRuleIds, mappings)
    }

    return document
  }

  /**
   * Build workspace metadata
   */
  private buildMeta(request: ExportWorkspaceRequest): WorkspaceMeta {
    return {
      name: request.name || 'Connex Studio Workspace',
      author: request.author,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      connexVersion: app.getVersion(),
      schemaVersion: WORKSPACE_SCHEMA_VERSION
    }
  }

  /**
   * Export environments
   */
  private async exportEnvironments(
    environmentIds?: string[]
  ): Promise<WorkspaceEnvironment[]> {
    const environmentManager = getEnvironmentManager()
    let environments = await environmentManager.list()

    // Filter by IDs if specified
    if (environmentIds && environmentIds.length > 0) {
      environments = environments.filter(env => environmentIds.includes(env.id))
    }

    // Sort by name for stable output
    environments.sort((a, b) => a.name.localeCompare(b.name))

    return environments.map(env => this.convertEnvironment(env))
  }

  /**
   * Convert environment to export format
   */
  private convertEnvironment(env: Environment): WorkspaceEnvironment {
    // Sort variables for stable output
    const sortedVariables: Record<string, string> = {}
    const keys = Object.keys(env.variables).sort()
    for (const key of keys) {
      sortedVariables[key] = env.variables[key]
    }

    return {
      name: env.name,
      variables: sortedVariables,
      isDefault: env.isDefault || undefined
    }
  }

  /**
   * Export connections (credentials excluded)
   */
  private async exportConnections(
    connectionIds?: string[]
  ): Promise<WorkspaceConnection[]> {
    const connectionManager = getConnectionManager()
    let connections = connectionManager.getAllConnections()

    // Filter by IDs if specified
    if (connectionIds && connectionIds.length > 0) {
      connections = connections.filter(conn => connectionIds.includes(conn.id))
    }

    // Sort by name for stable output
    connections.sort((a, b) => a.name.localeCompare(b.name))

    return connections.map(conn => this.convertConnection(conn))
  }

  /**
   * Convert connection to export format (exclude credentials)
   */
  private convertConnection(conn: Connection): WorkspaceConnection {
    const result: WorkspaceConnection = {
      name: conn.name,
      protocol: conn.protocol,
      config: this.convertConnectionConfig(conn)
    }

    // Check if connection has credentials
    if (conn.protocol === 'mqtt') {
      const mqttConfig = conn.config as MqttConfig
      if (mqttConfig.username) {
        result.hasCredentials = true
      }
    } else if (conn.protocol === 'opcua') {
      const opcuaConfig = conn.config as OpcUaConfig
      if (opcuaConfig.username) {
        result.hasCredentials = true
      }
    }

    return result
  }

  /**
   * Convert connection config (exclude credentials)
   */
  private convertConnectionConfig(conn: Connection) {
    switch (conn.protocol) {
      case 'modbus-tcp': {
        const config = conn.config as ModbusTcpConfig
        return {
          host: config.host,
          port: config.port,
          unitId: config.unitId,
          timeout: config.timeout
        }
      }
      case 'mqtt': {
        const config = conn.config as MqttConfig
        return {
          brokerUrl: config.brokerUrl,
          clientId: config.clientId,
          useTls: config.useTls,
          caCert: config.caCert,
          hasCredentials: !!config.username || undefined
        }
      }
      case 'opcua': {
        const config = conn.config as OpcUaConfig
        return {
          endpointUrl: config.endpointUrl,
          securityMode: config.securityMode,
          securityPolicy: config.securityPolicy,
          hasCredentials: !!config.username || undefined
        }
      }
      default:
        throw new Error(`Unknown protocol: ${conn.protocol}`)
    }
  }

  /**
   * Export tags
   */
  private async exportTags(
    connectionIds: string[] | undefined,
    mappings: ExportMappings
  ): Promise<WorkspaceTag[]> {
    const connectionManager = getConnectionManager()
    const connections = connectionManager.getAllConnections()

    const tags: WorkspaceTag[] = []

    for (const conn of connections) {
      // Skip if filtering by connection IDs
      if (connectionIds && connectionIds.length > 0 && !connectionIds.includes(conn.id)) {
        continue
      }

      const connTags = connectionManager.getTags(conn.id)
      for (const tag of connTags) {
        tags.push(this.convertTag(tag, mappings))
      }
    }

    // Sort by connection name then tag name for stable output
    tags.sort((a, b) => {
      const connCompare = a.connectionName.localeCompare(b.connectionName)
      if (connCompare !== 0) return connCompare
      return a.name.localeCompare(b.name)
    })

    return tags
  }

  /**
   * Convert tag to export format
   */
  private convertTag(tag: Tag, mappings: ExportMappings): WorkspaceTag {
    const connectionName = mappings.connections.get(tag.connectionId) || tag.connectionId

    const result: WorkspaceTag = {
      name: tag.name,
      connectionName,
      address: this.convertTagAddress(tag.address),
      dataType: tag.dataType
    }

    // Only include optional fields if they have values
    if (tag.displayFormat.decimals !== 2 || tag.displayFormat.unit) {
      result.displayFormat = {
        decimals: tag.displayFormat.decimals,
        unit: tag.displayFormat.unit || undefined,
        prefix: tag.displayFormat.prefix || undefined,
        suffix: tag.displayFormat.suffix || undefined
      }
    }

    const thresholds = tag.thresholds
    if (thresholds.warningLow !== undefined ||
        thresholds.warningHigh !== undefined ||
        thresholds.alarmLow !== undefined ||
        thresholds.alarmHigh !== undefined) {
      result.thresholds = {
        warningLow: thresholds.warningLow,
        warningHigh: thresholds.warningHigh,
        alarmLow: thresholds.alarmLow,
        alarmHigh: thresholds.alarmHigh
      }
    }

    if (!tag.enabled) {
      result.enabled = false
    }

    return result
  }

  /**
   * Convert tag address to export format
   */
  private convertTagAddress(address: ModbusAddress | MqttAddress | OpcUaAddress) {
    switch (address.type) {
      case 'modbus':
        return {
          type: 'modbus' as const,
          registerType: address.registerType,
          address: address.address,
          length: address.length
        }
      case 'mqtt':
        return {
          type: 'mqtt' as const,
          topic: address.topic,
          jsonPath: address.jsonPath || undefined
        }
      case 'opcua':
        return {
          type: 'opcua' as const,
          nodeId: address.nodeId
        }
    }
  }

  /**
   * Export bridges
   */
  private async exportBridges(
    bridgeIds: string[] | undefined,
    mappings: ExportMappings
  ): Promise<WorkspaceBridge[]> {
    const bridgeManager = getBridgeManager()
    let bridges = await bridgeManager.list()

    // Filter by IDs if specified
    if (bridgeIds && bridgeIds.length > 0) {
      bridges = bridges.filter(b => bridgeIds.includes(b.id))
    }

    // Sort by name for stable output
    bridges.sort((a, b) => a.name.localeCompare(b.name))

    return bridges.map(bridge => this.convertBridge(bridge, mappings))
  }

  /**
   * Convert bridge to export format
   */
  private convertBridge(bridge: Bridge, mappings: ExportMappings): WorkspaceBridge {
    const sourceConnectionName = mappings.connections.get(bridge.sourceConnectionId) || bridge.sourceConnectionId
    const targetConnectionName = mappings.connections.get(bridge.targetConnectionId) || bridge.targetConnectionId

    // Resolve tag names
    const sourceTagNames = bridge.sourceTags.map(
      tagId => mappings.tags.get(tagId) || tagId
    )

    return {
      name: bridge.name,
      sourceConnectionName,
      sourceTagNames,
      targetConnectionName,
      targetConfig: {
        topicTemplate: bridge.targetConfig.topicTemplate,
        payloadTemplate: bridge.targetConfig.payloadTemplate,
        qos: bridge.targetConfig.qos,
        retain: bridge.targetConfig.retain
      },
      options: {
        interval: bridge.options.interval,
        changeOnly: bridge.options.changeOnly,
        changeThreshold: bridge.options.changeThreshold,
        bufferSize: bridge.options.bufferSize
      }
    }
  }

  /**
   * Export dashboards
   */
  private async exportDashboards(
    dashboardIds: string[] | undefined,
    mappings: ExportMappings
  ): Promise<WorkspaceDashboard[]> {
    const dashboardService = getDashboardService()
    let dashboards = await dashboardService.list()

    // Filter by IDs if specified
    if (dashboardIds && dashboardIds.length > 0) {
      dashboards = dashboards.filter(d => dashboardIds.includes(d.id))
    }

    // Sort by name for stable output
    dashboards.sort((a, b) => a.name.localeCompare(b.name))

    return dashboards.map(dashboard => this.convertDashboard(dashboard, mappings))
  }

  /**
   * Convert dashboard to export format
   */
  private convertDashboard(dashboard: Dashboard, mappings: ExportMappings): WorkspaceDashboard {
    // Create widget name map (id -> name)
    const widgetNameMap = new Map<string, string>()
    dashboard.widgets.forEach((widget, index) => {
      widgetNameMap.set(widget.id, `widget_${index + 1}`)
    })

    return {
      name: dashboard.name,
      isDefault: dashboard.isDefault || undefined,
      layout: dashboard.layout.map(l => ({
        widgetName: widgetNameMap.get(l.i) || l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h
      })),
      widgets: dashboard.widgets.map((widget, index) =>
        this.convertWidget(widget, `widget_${index + 1}`, mappings)
      )
    }
  }

  /**
   * Convert widget to export format
   */
  private convertWidget(
    widget: DashboardWidget,
    name: string,
    mappings: ExportMappings
  ): WorkspaceWidget {
    // Resolve tag names
    const tagNames = widget.tagRefs.map(
      tagId => mappings.tags.get(tagId) || tagId
    )

    return {
      name,
      type: widget.type,
      tagNames,
      config: widget.config as unknown as Record<string, unknown>
    }
  }

  /**
   * Export alert rules
   */
  private async exportAlertRules(
    ruleIds: string[] | undefined,
    mappings: ExportMappings
  ): Promise<WorkspaceAlertRule[]> {
    const alertEngine = getAlertEngine()
    let rules = await alertEngine.listRules()

    // Filter by IDs if specified
    if (ruleIds && ruleIds.length > 0) {
      rules = rules.filter(r => ruleIds.includes(r.id))
    }

    // Sort by name for stable output
    rules.sort((a, b) => a.name.localeCompare(b.name))

    return rules.map(rule => this.convertAlertRule(rule, mappings))
  }

  /**
   * Convert alert rule to export format
   */
  private convertAlertRule(rule: AlertRule, mappings: ExportMappings): WorkspaceAlertRule {
    const tagName = mappings.tags.get(rule.tagRef) || rule.tagRef

    return {
      name: rule.name,
      tagName,
      condition: {
        operator: rule.condition.operator,
        value: rule.condition.value,
        value2: rule.condition.value2,
        duration: rule.condition.duration
      },
      severity: rule.severity,
      actions: rule.actions,
      enabled: rule.enabled ? undefined : false, // Only include if false
      cooldown: rule.cooldown
    }
  }

  /**
   * Convert document to YAML with stable output
   */
  private toYaml(document: WorkspaceDocument): string {
    // Use js-yaml with custom options for stable output
    const options: yaml.DumpOptions = {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: true, // Sort keys for stable output
      quotingType: '"',
      forceQuotes: false
    }

    return yaml.dump(document, options)
  }
}

// -----------------------------------------------------------------------------
// Singleton Access
// -----------------------------------------------------------------------------

let instance: WorkspaceExporter | null = null

export function getWorkspaceExporter(): WorkspaceExporter {
  if (!instance) {
    instance = WorkspaceExporter.getInstance()
  }
  return instance
}

export function disposeWorkspaceExporter(): void {
  instance = null
}
