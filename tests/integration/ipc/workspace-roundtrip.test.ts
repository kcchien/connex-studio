/**
 * Workspace export → import round-trip integration test.
 *
 * Populates the real services, exports to YAML, wipes all state,
 * imports the YAML back, and verifies every entity survived intact.
 */
import os from 'os'
import path from 'path'
import { promises as fs } from 'fs'

let userDataDir: string

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => userDataDir), getVersion: jest.fn(() => '1.0.0-test') },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  }
}))

jest.mock('electron-log/main.js', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}))

// uuid v13 is ESM-only and breaks under ts-jest CJS transform
jest.mock('uuid', () => ({ v4: () => require('crypto').randomUUID() }))

import { getConnectionManager, disposeConnectionManager } from '../../../src/main/services/ConnectionManager'
import { getEnvironmentManager, disposeEnvironmentManager } from '../../../src/main/services/EnvironmentManager'
import { getBridgeManager, disposeBridgeManager } from '../../../src/main/services/BridgeManager'
import { getDashboardService, disposeDashboardService } from '../../../src/main/services/DashboardService'
import { getAlertEngine, disposeAlertEngine } from '../../../src/main/services/AlertEngine'
import { getWorkspaceExporter, disposeWorkspaceExporter } from '../../../src/main/services/WorkspaceExporter'
import { getWorkspaceImporter, disposeWorkspaceImporter } from '../../../src/main/services/WorkspaceImporter'
import type { ModbusTcpConfig } from '../../../src/shared/types/connection'
import type { Tag } from '../../../src/shared/types/tag'

function disposeAll(): void {
  disposeWorkspaceImporter()
  disposeWorkspaceExporter()
  disposeAlertEngine()
  disposeDashboardService()
  disposeBridgeManager()
  disposeEnvironmentManager()
  disposeConnectionManager()
}

describe('Workspace round-trip (export → wipe → import)', () => {
  beforeAll(async () => {
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'connex-roundtrip-'))
  })

  afterAll(async () => {
    disposeAll()
    await fs.rm(userDataDir, { recursive: true, force: true })
  })

  it('preserves environments, connections, tags, bridges, dashboards and alert rules', async () => {
    disposeAll()

    // --- Populate state ---
    const connectionManager = getConnectionManager()
    const modbusConfig: ModbusTcpConfig = {
      host: '127.0.0.1',
      port: 5020,
      unitId: 1,
      timeout: 3000,
      defaultByteOrder: 'ABCD'
    }
    const conn = connectionManager.createConnection('RT Modbus', 'modbus-tcp', modbusConfig)
    const mqttConn = connectionManager.createConnection('RT MQTT', 'mqtt', {
      brokerUrl: 'mqtt://localhost:1883',
      clientId: 'rt-client'
    } as never)

    const tag: Tag = {
      id: 'rt-tag-1',
      connectionId: conn.id,
      name: 'counter',
      address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
      dataType: 'uint16',
      displayFormat: { decimals: 0, unit: '' },
      thresholds: {},
      enabled: true
    }
    connectionManager.addTag(tag)

    const environmentManager = getEnvironmentManager()
    const env = await environmentManager.create({
      name: 'RT Env',
      variables: { HOST: '127.0.0.1' },
      isDefault: true
    })

    const dashboardService = getDashboardService()
    const dashboard = await dashboardService.create({ name: 'RT Dashboard' })

    const bridgeManager = getBridgeManager()
    const bridge = await bridgeManager.create({
      name: 'RT Bridge',
      sourceConnectionId: conn.id,
      sourceTags: [tag.id],
      targetConnectionId: mqttConn.id,
      targetConfig: {
        topicTemplate: 'rt/{{tag}}',
        payloadTemplate: '{{value}}',
        qos: 0,
        retain: false
      }
    })

    const alertEngine = getAlertEngine()
    const rule = await alertEngine.createRule({
      name: 'RT Alert',
      tagRef: tag.id,
      condition: { type: 'threshold', operator: 'gt', value: 100 } as never,
      severity: 'warning',
      actions: ['notification']
    })

    // --- Export ---
    const yaml = await getWorkspaceExporter().export({
      name: 'roundtrip-test',
      includeConnections: true,
      includeEnvironments: true,
      includeBridges: true,
      includeDashboards: true,
      includeAlertRules: true,
      includeTags: true
    } as never)

    expect(yaml).toContain('RT Modbus')
    expect(yaml).toContain('RT Env')
    expect(yaml).toContain('RT Dashboard')
    expect(yaml).toContain('RT Bridge')
    expect(yaml).toContain('RT Alert')

    // --- Wipe all state ---
    disposeAll()
    expect(getConnectionManager().getAllConnections()).toHaveLength(0)
    expect(getEnvironmentManager().list()).toHaveLength(0)

    // --- Import ---
    const result = await getWorkspaceImporter().import({
      yaml,
      conflictResolution: 'overwrite'
    })

    expect(result.errors).toEqual([])
    expect(result.success).toBe(true)

    // --- Verify round-trip fidelity ---
    const connections = getConnectionManager().getAllConnections()
    expect(connections.map((c) => c.name).sort()).toEqual(['RT MQTT', 'RT Modbus'])
    const importedModbus = connections.find((c) => c.name === 'RT Modbus')!
    expect(importedModbus.protocol).toBe('modbus-tcp')
    expect((importedModbus.config as ModbusTcpConfig).host).toBe('127.0.0.1')
    expect((importedModbus.config as ModbusTcpConfig).port).toBe(5020)

    const importedTags = getConnectionManager().getTags(importedModbus.id)
    expect(importedTags).toHaveLength(1)
    expect(importedTags[0].name).toBe('counter')
    expect(importedTags[0].dataType).toBe('uint16')

    const environments = getEnvironmentManager().list()
    expect(environments).toHaveLength(1)
    expect(environments[0].name).toBe(env.name)
    expect(environments[0].variables).toEqual({ HOST: '127.0.0.1' })

    const dashboards = getDashboardService().list()
    expect(dashboards.map((d) => d.name)).toContain(dashboard.name)

    const bridges = getBridgeManager().list()
    expect(bridges).toHaveLength(1)
    expect(bridges[0].name).toBe(bridge.name)
    expect(bridges[0].targetConfig.topicTemplate).toBe('rt/{{tag}}')

    const rules = getAlertEngine().listRules()
    expect(rules).toHaveLength(1)
    expect(rules[0].name).toBe(rule.name)
    expect(rules[0].severity).toBe('warning')
  })

  it('rejects malformed YAML without corrupting state', async () => {
    const importer = getWorkspaceImporter()
    const before = getConnectionManager().getAllConnections().length

    const garbage = await importer.import({ yaml: '{{{{not yaml', conflictResolution: 'skip' })
    expect(garbage.success).toBe(false)

    const wrongShape = await importer.import({ yaml: 'foo: bar', conflictResolution: 'skip' })
    expect(wrongShape.success).toBe(false)

    expect(getConnectionManager().getAllConnections().length).toBe(before)
  })
})
