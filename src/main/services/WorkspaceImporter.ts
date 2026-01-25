/**
 * WorkspaceImporter Service
 *
 * Imports workspace configuration from YAML format.
 *
 * Features:
 * - Schema validation before import
 * - Conflict detection and resolution
 * - Reference resolution (name to ID)
 * - Dry-run mode for preview
 */

import * as yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'
import { getConnectionManager } from './ConnectionManager'
import { getEnvironmentManager } from './EnvironmentManager'
import { getBridgeManager } from './BridgeManager'
import { getDashboardService } from './DashboardService'
import { getAlertEngine } from './AlertEngine'
import { log } from './LogService'
import {
  type ImportWorkspaceRequest,
  type ImportWorkspaceResult,
  type ValidationResult,
  type ValidationError,
  type ImportPreview,
  type ConflictItem,
  type ImportedCounts,
  type ImportMappings,
  type WorkspaceDocument,
  type WorkspaceEnvironment,
  type WorkspaceConnection,
  type WorkspaceTag,
  type WorkspaceBridge,
  type WorkspaceDashboard,
  type WorkspaceAlertRule,
  WORKSPACE_SCHEMA_VERSION
} from '../../shared/types/workspace'
import {
  type Connection,
  type ModbusTcpConfig,
  type MqttConfig,
  type OpcUaConfig,
  DEFAULT_MODBUS_CONFIG,
  DEFAULT_MQTT_CONFIG,
  DEFAULT_OPCUA_CONFIG
} from '../../shared/types/connection'
import {
  type Tag,
  DEFAULT_DISPLAY_FORMAT,
  DEFAULT_THRESHOLDS
} from '../../shared/types/tag'
import type { Environment } from '../../shared/types/environment'
import type { Bridge, BridgeTargetConfig, BridgeOptions, DEFAULT_BRIDGE_OPTIONS, DEFAULT_BRIDGE_TARGET_CONFIG } from '../../shared/types/bridge'
import type { Dashboard, DashboardWidget, WidgetLayout, WidgetConfig } from '../../shared/types/dashboard'
import type { AlertRule, AlertCondition } from '../../shared/types/alert'

// -----------------------------------------------------------------------------
// WorkspaceImporter Class
// -----------------------------------------------------------------------------

export class WorkspaceImporter {
  private static instance: WorkspaceImporter | null = null

  private constructor() {}

  static getInstance(): WorkspaceImporter {
    if (!WorkspaceImporter.instance) {
      WorkspaceImporter.instance = new WorkspaceImporter()
    }
    return WorkspaceImporter.instance
  }

  /**
   * Validate YAML content without importing
   */
  async validate(yamlContent: string): Promise<ValidationResult> {
    log.info('[WorkspaceImporter] Validating workspace YAML')

    const errors: ValidationError[] = []
    const warnings: string[] = []

    try {
      // Parse YAML
      const document = yaml.load(yamlContent) as WorkspaceDocument

      if (!document || typeof document !== 'object') {
        errors.push({
          path: '/',
          message: 'Invalid YAML: expected an object'
        })
        return { valid: false, errors, warnings }
      }

      // Validate schema version
      if (!document.schemaVersion) {
        errors.push({
          path: '/schemaVersion',
          message: 'Missing required field: schemaVersion'
        })
      } else if (document.schemaVersion > WORKSPACE_SCHEMA_VERSION) {
        errors.push({
          path: '/schemaVersion',
          message: `Unsupported schema version: ${document.schemaVersion} (max: ${WORKSPACE_SCHEMA_VERSION})`
        })
      } else if (document.schemaVersion < WORKSPACE_SCHEMA_VERSION) {
        warnings.push(`Schema version ${document.schemaVersion} may have limited compatibility`)
      }

      // Validate meta
      if (!document.meta) {
        errors.push({
          path: '/meta',
          message: 'Missing required field: meta'
        })
      } else {
        if (!document.meta.name) {
          warnings.push('Workspace name is not specified')
        }
      }

      // Validate environments
      if (document.environments) {
        this.validateEnvironments(document.environments, errors, warnings)
      }

      // Validate connections
      if (document.connections) {
        this.validateConnections(document.connections, errors, warnings)
      }

      // Validate tags (requires connection references)
      if (document.tags) {
        const connectionNames = new Set(document.connections?.map(c => c.name) || [])
        this.validateTags(document.tags, connectionNames, errors, warnings)
      }

      // Validate bridges
      if (document.bridges) {
        const connectionNames = new Set(document.connections?.map(c => c.name) || [])
        const tagNames = new Set(document.tags?.map(t => t.name) || [])
        this.validateBridges(document.bridges, connectionNames, tagNames, errors, warnings)
      }

      // Validate dashboards
      if (document.dashboards) {
        const tagNames = new Set(document.tags?.map(t => t.name) || [])
        this.validateDashboards(document.dashboards, tagNames, errors, warnings)
      }

      // Validate alert rules
      if (document.alertRules) {
        const tagNames = new Set(document.tags?.map(t => t.name) || [])
        this.validateAlertRules(document.alertRules, tagNames, errors, warnings)
      }

      // Build preview if valid
      let preview: ImportPreview | undefined
      if (errors.length === 0) {
        preview = await this.buildPreview(document)
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        preview
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        path: '/',
        message: `Failed to parse YAML: ${message}`
      })
      return { valid: false, errors, warnings }
    }
  }

  /**
   * Import workspace from YAML
   */
  async import(request: ImportWorkspaceRequest): Promise<ImportWorkspaceResult> {
    log.info('[WorkspaceImporter] Starting import', {
      conflictResolution: request.conflictResolution,
      dryRun: request.dryRun
    })

    const result: ImportWorkspaceResult = {
      success: false,
      imported: this.emptyCount(),
      skipped: this.emptyCount(),
      conflicts: [],
      warnings: [],
      errors: []
    }

    try {
      // Validate first
      const validation = await this.validate(request.yaml)
      if (!validation.valid) {
        result.errors = validation.errors.map(e => `${e.path}: ${e.message}`)
        return result
      }
      result.warnings = validation.warnings

      if (request.dryRun) {
        // For dry run, just return the preview counts
        if (validation.preview) {
          result.imported = validation.preview.counts
          result.conflicts = validation.preview.conflicts
        }
        result.success = true
        return result
      }

      // Parse document
      const document = yaml.load(request.yaml) as WorkspaceDocument

      // Build name to ID mappings for existing items
      const existingMappings = await this.buildExistingMappings()

      // Import in order: environments -> connections -> tags -> bridges/dashboards/alerts
      // This ensures references can be resolved

      // Import environments
      if (document.environments) {
        const envResult = await this.importEnvironments(
          document.environments,
          existingMappings,
          request.conflictResolution
        )
        result.imported.environments = envResult.imported
        result.skipped.environments = envResult.skipped
        result.conflicts.push(...envResult.conflicts)
        result.warnings.push(...envResult.warnings)
      }

      // Refresh mappings after environments
      const updatedMappings = await this.buildExistingMappings()

      // Import connections
      if (document.connections) {
        const connResult = await this.importConnections(
          document.connections,
          updatedMappings,
          request.conflictResolution
        )
        result.imported.connections = connResult.imported
        result.skipped.connections = connResult.skipped
        result.conflicts.push(...connResult.conflicts)
        result.warnings.push(...connResult.warnings)
      }

      // Refresh mappings after connections
      const finalMappings = await this.buildExistingMappings()

      // Import tags
      if (document.tags) {
        const tagResult = await this.importTags(
          document.tags,
          finalMappings,
          request.conflictResolution
        )
        result.imported.tags = tagResult.imported
        result.skipped.tags = tagResult.skipped
        result.conflicts.push(...tagResult.conflicts)
        result.warnings.push(...tagResult.warnings)
      }

      // Refresh mappings with tags
      const tagMappings = await this.buildExistingMappings()

      // Import bridges
      if (document.bridges) {
        const bridgeResult = await this.importBridges(
          document.bridges,
          tagMappings,
          request.conflictResolution
        )
        result.imported.bridges = bridgeResult.imported
        result.skipped.bridges = bridgeResult.skipped
        result.conflicts.push(...bridgeResult.conflicts)
        result.warnings.push(...bridgeResult.warnings)
      }

      // Import dashboards
      if (document.dashboards) {
        const dashResult = await this.importDashboards(
          document.dashboards,
          tagMappings,
          request.conflictResolution
        )
        result.imported.dashboards = dashResult.imported
        result.skipped.dashboards = dashResult.skipped
        result.conflicts.push(...dashResult.conflicts)
        result.warnings.push(...dashResult.warnings)
      }

      // Import alert rules
      if (document.alertRules) {
        const alertResult = await this.importAlertRules(
          document.alertRules,
          tagMappings,
          request.conflictResolution
        )
        result.imported.alertRules = alertResult.imported
        result.skipped.alertRules = alertResult.skipped
        result.conflicts.push(...alertResult.conflicts)
        result.warnings.push(...alertResult.warnings)
      }

      result.success = result.errors.length === 0

      log.info('[WorkspaceImporter] Import completed', result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Import failed: ${message}`)
      log.error('[WorkspaceImporter] Import failed', error)
      return result
    }
  }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------

  private validateEnvironments(
    environments: WorkspaceEnvironment[],
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const names = new Set<string>()
    environments.forEach((env, index) => {
      const path = `/environments[${index}]`

      if (!env.name) {
        errors.push({ path: `${path}/name`, message: 'Missing required field: name' })
      } else if (names.has(env.name)) {
        errors.push({ path: `${path}/name`, message: `Duplicate environment name: ${env.name}` })
      } else {
        names.add(env.name)
      }

      if (!env.variables || typeof env.variables !== 'object') {
        errors.push({ path: `${path}/variables`, message: 'Missing required field: variables' })
      }
    })
  }

  private validateConnections(
    connections: WorkspaceConnection[],
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const names = new Set<string>()
    connections.forEach((conn, index) => {
      const path = `/connections[${index}]`

      if (!conn.name) {
        errors.push({ path: `${path}/name`, message: 'Missing required field: name' })
      } else if (names.has(conn.name)) {
        errors.push({ path: `${path}/name`, message: `Duplicate connection name: ${conn.name}` })
      } else {
        names.add(conn.name)
      }

      if (!conn.protocol) {
        errors.push({ path: `${path}/protocol`, message: 'Missing required field: protocol' })
      } else if (!['modbus-tcp', 'mqtt', 'opcua'].includes(conn.protocol)) {
        errors.push({ path: `${path}/protocol`, message: `Invalid protocol: ${conn.protocol}` })
      }

      if (!conn.config) {
        errors.push({ path: `${path}/config`, message: 'Missing required field: config' })
      }

      if (conn.hasCredentials) {
        warnings.push(`Connection "${conn.name}" requires credentials after import`)
      }
    })
  }

  private validateTags(
    tags: WorkspaceTag[],
    connectionNames: Set<string>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const names = new Set<string>()
    tags.forEach((tag, index) => {
      const path = `/tags[${index}]`

      if (!tag.name) {
        errors.push({ path: `${path}/name`, message: 'Missing required field: name' })
      } else if (names.has(tag.name)) {
        errors.push({ path: `${path}/name`, message: `Duplicate tag name: ${tag.name}` })
      } else {
        names.add(tag.name)
      }

      if (!tag.connectionName) {
        errors.push({ path: `${path}/connectionName`, message: 'Missing required field: connectionName' })
      } else if (!connectionNames.has(tag.connectionName)) {
        errors.push({ path: `${path}/connectionName`, message: `Referenced connection not found: ${tag.connectionName}` })
      }

      if (!tag.address) {
        errors.push({ path: `${path}/address`, message: 'Missing required field: address' })
      }
    })
  }

  private validateBridges(
    bridges: WorkspaceBridge[],
    connectionNames: Set<string>,
    tagNames: Set<string>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const names = new Set<string>()
    bridges.forEach((bridge, index) => {
      const path = `/bridges[${index}]`

      if (!bridge.name) {
        errors.push({ path: `${path}/name`, message: 'Missing required field: name' })
      } else if (names.has(bridge.name)) {
        errors.push({ path: `${path}/name`, message: `Duplicate bridge name: ${bridge.name}` })
      } else {
        names.add(bridge.name)
      }

      if (!bridge.sourceConnectionName) {
        errors.push({ path: `${path}/sourceConnectionName`, message: 'Missing required field: sourceConnectionName' })
      } else if (!connectionNames.has(bridge.sourceConnectionName)) {
        errors.push({ path: `${path}/sourceConnectionName`, message: `Referenced connection not found: ${bridge.sourceConnectionName}` })
      }

      if (!bridge.targetConnectionName) {
        errors.push({ path: `${path}/targetConnectionName`, message: 'Missing required field: targetConnectionName' })
      } else if (!connectionNames.has(bridge.targetConnectionName)) {
        errors.push({ path: `${path}/targetConnectionName`, message: `Referenced connection not found: ${bridge.targetConnectionName}` })
      }

      bridge.sourceTagNames?.forEach((tagName, tagIndex) => {
        if (!tagNames.has(tagName)) {
          warnings.push(`Bridge "${bridge.name}" references unknown tag: ${tagName}`)
        }
      })
    })
  }

  private validateDashboards(
    dashboards: WorkspaceDashboard[],
    tagNames: Set<string>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const names = new Set<string>()
    dashboards.forEach((dash, index) => {
      const path = `/dashboards[${index}]`

      if (!dash.name) {
        errors.push({ path: `${path}/name`, message: 'Missing required field: name' })
      } else if (names.has(dash.name)) {
        errors.push({ path: `${path}/name`, message: `Duplicate dashboard name: ${dash.name}` })
      } else {
        names.add(dash.name)
      }

      dash.widgets?.forEach((widget, widgetIndex) => {
        widget.tagNames?.forEach(tagName => {
          if (!tagNames.has(tagName)) {
            warnings.push(`Dashboard "${dash.name}" widget references unknown tag: ${tagName}`)
          }
        })
      })
    })
  }

  private validateAlertRules(
    rules: WorkspaceAlertRule[],
    tagNames: Set<string>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const names = new Set<string>()
    rules.forEach((rule, index) => {
      const path = `/alertRules[${index}]`

      if (!rule.name) {
        errors.push({ path: `${path}/name`, message: 'Missing required field: name' })
      } else if (names.has(rule.name)) {
        errors.push({ path: `${path}/name`, message: `Duplicate alert rule name: ${rule.name}` })
      } else {
        names.add(rule.name)
      }

      if (!rule.tagName) {
        errors.push({ path: `${path}/tagName`, message: 'Missing required field: tagName' })
      } else if (!tagNames.has(rule.tagName)) {
        warnings.push(`Alert rule "${rule.name}" references unknown tag: ${rule.tagName}`)
      }

      if (!rule.condition) {
        errors.push({ path: `${path}/condition`, message: 'Missing required field: condition' })
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Import Helpers
  // ---------------------------------------------------------------------------

  private async buildExistingMappings(): Promise<ImportMappings> {
    const connectionManager = getConnectionManager()
    const connections = connectionManager.getAllConnections()

    const connectionMap = new Map<string, string>()
    for (const conn of connections) {
      connectionMap.set(conn.name, conn.id)
    }

    const tagMap = new Map<string, string>()
    for (const conn of connections) {
      const tags = connectionManager.getTags(conn.id)
      for (const tag of tags) {
        tagMap.set(tag.name, tag.id)
      }
    }

    const environmentManager = getEnvironmentManager()
    const environments = await environmentManager.list()

    const environmentMap = new Map<string, string>()
    for (const env of environments) {
      environmentMap.set(env.name, env.id)
    }

    return {
      connections: connectionMap,
      tags: tagMap,
      environments: environmentMap
    }
  }

  private async buildPreview(document: WorkspaceDocument): Promise<ImportPreview> {
    const existingMappings = await this.buildExistingMappings()
    const conflicts: ConflictItem[] = []

    // Check for conflicts
    document.environments?.forEach(env => {
      const existingId = existingMappings.environments.get(env.name)
      if (existingId) {
        conflicts.push({
          type: 'environment',
          name: env.name,
          existingId
        })
      }
    })

    document.connections?.forEach(conn => {
      const existingId = existingMappings.connections.get(conn.name)
      if (existingId) {
        conflicts.push({
          type: 'connection',
          name: conn.name,
          existingId
        })
      }
    })

    document.tags?.forEach(tag => {
      const existingId = existingMappings.tags.get(tag.name)
      if (existingId) {
        conflicts.push({
          type: 'tag',
          name: tag.name,
          existingId
        })
      }
    })

    // Count items
    const counts: ImportedCounts = {
      environments: document.environments?.length || 0,
      connections: document.connections?.length || 0,
      tags: document.tags?.length || 0,
      bridges: document.bridges?.length || 0,
      dashboards: document.dashboards?.length || 0,
      alertRules: document.alertRules?.length || 0
    }

    return {
      meta: document.meta,
      counts,
      conflicts,
      items: {
        environments: document.environments || [],
        connections: document.connections || [],
        tags: document.tags || [],
        bridges: document.bridges || [],
        dashboards: document.dashboards || [],
        alertRules: document.alertRules || []
      }
    }
  }

  private emptyCount(): ImportedCounts {
    return {
      environments: 0,
      connections: 0,
      tags: 0,
      bridges: 0,
      dashboards: 0,
      alertRules: 0
    }
  }

  // ---------------------------------------------------------------------------
  // Entity Import Methods
  // ---------------------------------------------------------------------------

  private async importEnvironments(
    environments: WorkspaceEnvironment[],
    mappings: ImportMappings,
    conflictResolution: string
  ): Promise<{ imported: number; skipped: number; conflicts: ConflictItem[]; warnings: string[] }> {
    const environmentManager = getEnvironmentManager()
    let imported = 0
    let skipped = 0
    const conflicts: ConflictItem[] = []
    const warnings: string[] = []

    for (const env of environments) {
      const existingId = mappings.environments.get(env.name)

      if (existingId) {
        if (conflictResolution === 'skip') {
          skipped++
          continue
        } else if (conflictResolution === 'overwrite') {
          await environmentManager.update({
            id: existingId,
            name: env.name,
            variables: env.variables
          })
          if (env.isDefault) {
            await environmentManager.setDefault(existingId)
          }
          imported++
        } else if (conflictResolution === 'rename') {
          const newName = this.generateUniqueName(env.name, mappings.environments)
          await environmentManager.create({
            name: newName,
            variables: env.variables,
            isDefault: env.isDefault
          })
          warnings.push(`Environment renamed from "${env.name}" to "${newName}"`)
          imported++
        }
        conflicts.push({
          type: 'environment',
          name: env.name,
          existingId,
          resolution: conflictResolution as any
        })
      } else {
        await environmentManager.create({
          name: env.name,
          variables: env.variables,
          isDefault: env.isDefault
        })
        imported++
      }
    }

    return { imported, skipped, conflicts, warnings }
  }

  private async importConnections(
    connections: WorkspaceConnection[],
    mappings: ImportMappings,
    conflictResolution: string
  ): Promise<{ imported: number; skipped: number; conflicts: ConflictItem[]; warnings: string[] }> {
    const connectionManager = getConnectionManager()
    let imported = 0
    let skipped = 0
    const conflicts: ConflictItem[] = []
    const warnings: string[] = []

    for (const conn of connections) {
      const existingId = mappings.connections.get(conn.name)

      if (existingId) {
        if (conflictResolution === 'skip') {
          skipped++
          continue
        } else if (conflictResolution === 'overwrite') {
          // Delete and recreate
          await connectionManager.deleteConnection(existingId)
        } else if (conflictResolution === 'rename') {
          conn.name = this.generateUniqueName(conn.name, mappings.connections)
          warnings.push(`Connection renamed to "${conn.name}"`)
        }
        conflicts.push({
          type: 'connection',
          name: conn.name,
          existingId,
          resolution: conflictResolution as any
        })
      }

      if (conflictResolution !== 'skip' || !existingId) {
        const config = this.buildConnectionConfig(conn)
        await connectionManager.createConnection(conn.name, conn.protocol, config)

        if (conn.hasCredentials) {
          warnings.push(`Connection "${conn.name}" requires credentials to be set manually`)
        }
        imported++
      }
    }

    return { imported, skipped, conflicts, warnings }
  }

  private buildConnectionConfig(conn: WorkspaceConnection): ModbusTcpConfig | MqttConfig | OpcUaConfig {
    switch (conn.protocol) {
      case 'modbus-tcp':
        return {
          ...DEFAULT_MODBUS_CONFIG,
          ...conn.config
        } as ModbusTcpConfig
      case 'mqtt':
        return {
          ...DEFAULT_MQTT_CONFIG,
          ...conn.config
        } as MqttConfig
      case 'opcua':
        return {
          ...DEFAULT_OPCUA_CONFIG,
          ...conn.config
        } as OpcUaConfig
      default:
        throw new Error(`Unknown protocol: ${conn.protocol}`)
    }
  }

  private async importTags(
    tags: WorkspaceTag[],
    mappings: ImportMappings,
    conflictResolution: string
  ): Promise<{ imported: number; skipped: number; conflicts: ConflictItem[]; warnings: string[] }> {
    const connectionManager = getConnectionManager()
    let imported = 0
    let skipped = 0
    const conflicts: ConflictItem[] = []
    const warnings: string[] = []

    // Refresh connection mappings
    const connections = connectionManager.getAllConnections()
    const connNameToId = new Map<string, string>()
    for (const conn of connections) {
      connNameToId.set(conn.name, conn.id)
    }

    for (const tag of tags) {
      const connectionId = connNameToId.get(tag.connectionName)
      if (!connectionId) {
        warnings.push(`Tag "${tag.name}" skipped: connection "${tag.connectionName}" not found`)
        skipped++
        continue
      }

      const existingId = mappings.tags.get(tag.name)

      if (existingId) {
        if (conflictResolution === 'skip') {
          skipped++
          continue
        }
        conflicts.push({
          type: 'tag',
          name: tag.name,
          existingId,
          resolution: conflictResolution as any
        })

        if (conflictResolution === 'rename') {
          tag.name = this.generateUniqueName(tag.name, mappings.tags)
          warnings.push(`Tag renamed to "${tag.name}"`)
        }
      }

      const tagData: Tag = {
        id: uuidv4(),
        connectionId,
        name: tag.name,
        address: tag.address as any,
        dataType: tag.dataType as any,
        displayFormat: {
          ...DEFAULT_DISPLAY_FORMAT,
          ...tag.displayFormat
        },
        thresholds: {
          ...DEFAULT_THRESHOLDS,
          ...tag.thresholds
        },
        enabled: tag.enabled !== false
      }

      connectionManager.addTag(tagData)
      imported++
    }

    return { imported, skipped, conflicts, warnings }
  }

  private async importBridges(
    bridges: WorkspaceBridge[],
    mappings: ImportMappings,
    conflictResolution: string
  ): Promise<{ imported: number; skipped: number; conflicts: ConflictItem[]; warnings: string[] }> {
    const bridgeManager = getBridgeManager()
    const connectionManager = getConnectionManager()
    let imported = 0
    let skipped = 0
    const conflicts: ConflictItem[] = []
    const warnings: string[] = []

    // Build name to ID maps
    const connections = connectionManager.getAllConnections()
    const connNameToId = new Map<string, string>()
    for (const conn of connections) {
      connNameToId.set(conn.name, conn.id)
    }

    const tagNameToId = new Map<string, string>()
    for (const conn of connections) {
      const tags = connectionManager.getTags(conn.id)
      for (const tag of tags) {
        tagNameToId.set(tag.name, tag.id)
      }
    }

    for (const bridge of bridges) {
      const sourceConnId = connNameToId.get(bridge.sourceConnectionName)
      const targetConnId = connNameToId.get(bridge.targetConnectionName)

      if (!sourceConnId || !targetConnId) {
        warnings.push(`Bridge "${bridge.name}" skipped: connection not found`)
        skipped++
        continue
      }

      const sourceTagIds = bridge.sourceTagNames
        ?.map(name => tagNameToId.get(name))
        .filter(Boolean) as string[]

      if (!sourceTagIds || sourceTagIds.length === 0) {
        warnings.push(`Bridge "${bridge.name}" skipped: no valid source tags`)
        skipped++
        continue
      }

      await bridgeManager.create({
        name: bridge.name,
        sourceConnectionId: sourceConnId,
        sourceTags: sourceTagIds,
        targetConnectionId: targetConnId,
        targetConfig: bridge.targetConfig as BridgeTargetConfig,
        options: bridge.options as Partial<BridgeOptions>
      })
      imported++
    }

    return { imported, skipped, conflicts, warnings }
  }

  private async importDashboards(
    dashboards: WorkspaceDashboard[],
    mappings: ImportMappings,
    conflictResolution: string
  ): Promise<{ imported: number; skipped: number; conflicts: ConflictItem[]; warnings: string[] }> {
    const dashboardService = getDashboardService()
    const connectionManager = getConnectionManager()
    let imported = 0
    let skipped = 0
    const conflicts: ConflictItem[] = []
    const warnings: string[] = []

    // Build tag name to ID map
    const tagNameToId = new Map<string, string>()
    const connections = connectionManager.getAllConnections()
    for (const conn of connections) {
      const tags = connectionManager.getTags(conn.id)
      for (const tag of tags) {
        tagNameToId.set(tag.name, tag.id)
      }
    }

    for (const dash of dashboards) {
      // Create dashboard
      const dashboard = await dashboardService.create({
        name: dash.name,
        isDefault: dash.isDefault
      })

      // Create widget name to ID map
      const widgetNameToId = new Map<string, string>()

      // Add widgets
      for (const widget of dash.widgets || []) {
        const tagRefs = widget.tagNames
          ?.map(name => tagNameToId.get(name))
          .filter(Boolean) as string[]

        const widgetResult = await dashboardService.addWidget({
          dashboardId: dashboard.id,
          type: widget.type,
          tagRefs: tagRefs || [],
          config: widget.config as unknown as WidgetConfig
        })

        widgetNameToId.set(widget.name, widgetResult.id)
      }

      // Update layout with resolved widget IDs
      if (dash.layout && dash.layout.length > 0) {
        const layout: WidgetLayout[] = dash.layout.map(l => ({
          i: widgetNameToId.get(l.widgetName) || l.widgetName,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h
        }))

        await dashboardService.updateLayout({
          dashboardId: dashboard.id,
          layout
        })
      }

      imported++
    }

    return { imported, skipped, conflicts, warnings }
  }

  private async importAlertRules(
    rules: WorkspaceAlertRule[],
    mappings: ImportMappings,
    conflictResolution: string
  ): Promise<{ imported: number; skipped: number; conflicts: ConflictItem[]; warnings: string[] }> {
    const alertEngine = getAlertEngine()
    const connectionManager = getConnectionManager()
    let imported = 0
    let skipped = 0
    const conflicts: ConflictItem[] = []
    const warnings: string[] = []

    // Build tag name to ID map
    const tagNameToId = new Map<string, string>()
    const connections = connectionManager.getAllConnections()
    for (const conn of connections) {
      const tags = connectionManager.getTags(conn.id)
      for (const tag of tags) {
        tagNameToId.set(tag.name, tag.id)
      }
    }

    for (const rule of rules) {
      const tagRef = tagNameToId.get(rule.tagName)
      if (!tagRef) {
        warnings.push(`Alert rule "${rule.name}" skipped: tag "${rule.tagName}" not found`)
        skipped++
        continue
      }

      await alertEngine.createRule({
        name: rule.name,
        tagRef,
        condition: rule.condition as AlertCondition,
        severity: rule.severity,
        actions: rule.actions,
        cooldown: rule.cooldown
      })

      // Enable/disable as needed
      const createdRules = await alertEngine.listRules()
      const created = createdRules.find(r => r.name === rule.name)
      if (created && rule.enabled === false) {
        await alertEngine.disableRule(created.id)
      }

      imported++
    }

    return { imported, skipped, conflicts, warnings }
  }

  /**
   * Generate unique name by appending suffix
   */
  private generateUniqueName(baseName: string, existing: Map<string, string>): string {
    let counter = 1
    let newName = `${baseName}_${counter}`
    while (existing.has(newName)) {
      counter++
      newName = `${baseName}_${counter}`
    }
    return newName
  }
}

// -----------------------------------------------------------------------------
// Singleton Access
// -----------------------------------------------------------------------------

let instance: WorkspaceImporter | null = null

export function getWorkspaceImporter(): WorkspaceImporter {
  if (!instance) {
    instance = WorkspaceImporter.getInstance()
  }
  return instance
}

export function disposeWorkspaceImporter(): void {
  instance = null
}
