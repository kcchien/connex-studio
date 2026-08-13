/**
 * BridgeManager Persistence Unit Tests
 *
 * Tests for loading bridges from userData storage and debounced writes.
 */

import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// Mocked userData directory, resolved per test
let userDataDir: string

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => userDataDir)
  }
}))

jest.mock('electron-log/main.js', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}))

import { BridgeManager } from '../../../src/main/services/BridgeManager'
import type { Bridge } from '../../../src/shared/types'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

function makeBridge(overrides: Partial<Bridge> = {}): Bridge {
  return {
    id: 'bridge-1',
    name: 'Persisted Bridge',
    sourceConnectionId: 'modbus-1',
    sourceTags: ['tag-1'],
    targetConnectionId: 'mqtt-1',
    targetConfig: {
      topicTemplate: 'data/{{tagName}}',
      payloadTemplate: '{"value": {{value}}}',
      qos: 1,
      retain: false
    },
    options: {
      interval: 1000,
      changeOnly: false,
      bufferSize: 100
    },
    status: 'idle',
    createdAt: Date.now(),
    ...overrides
  } as Bridge
}

describe('BridgeManager persistence', () => {
  let storagePath: string

  beforeEach(async () => {
    // Persistence is disabled under NODE_ENV=test; enable it for these tests
    process.env.NODE_ENV = 'development'
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'connex-bridge-'))
    storagePath = path.join(userDataDir, 'bridges.json')
  })

  afterEach(async () => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    await fs.rm(userDataDir, { recursive: true, force: true })
  })

  it('loads bridges from storage on initialize', async () => {
    const bridge = makeBridge()
    await fs.writeFile(storagePath, JSON.stringify([bridge]), 'utf-8')

    const manager = new BridgeManager()
    await manager.initialize()

    expect(manager.list()).toHaveLength(1)
    expect(manager.get(bridge.id)?.name).toBe('Persisted Bridge')

    await manager.dispose()
  })

  it('resets runtime status to idle on load', async () => {
    const bridge = makeBridge({ status: 'active' })
    await fs.writeFile(storagePath, JSON.stringify([bridge]), 'utf-8')

    const manager = new BridgeManager()
    await manager.initialize()

    expect(manager.get(bridge.id)?.status).toBe('idle')

    await manager.dispose()
  })

  it('starts empty when storage file does not exist', async () => {
    const manager = new BridgeManager()
    await manager.initialize()

    expect(manager.list()).toHaveLength(0)

    await manager.dispose()
  })

  it('starts empty when storage file is corrupted', async () => {
    await fs.writeFile(storagePath, 'not json at all', 'utf-8')

    const manager = new BridgeManager()
    await expect(manager.initialize()).resolves.toBeUndefined()
    expect(manager.list()).toHaveLength(0)

    await manager.dispose()
  })

  it('persists changes with debounce after create', async () => {
    const manager = new BridgeManager()
    await manager.initialize()

    const created = await manager.create({
      name: 'New Bridge',
      sourceConnectionId: 'modbus-1',
      sourceTags: ['tag-1'],
      targetConnectionId: 'mqtt-1',
      targetConfig: {
        topicTemplate: 'data/{{tagName}}',
        payloadTemplate: '{"value": {{value}}}',
        qos: 1,
        retain: false
      }
    })

    // Not written immediately (debounced)
    await expect(fs.access(storagePath)).rejects.toThrow()

    // Written after debounce window
    await new Promise((resolve) => setTimeout(resolve, 700))
    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as Bridge[]
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe(created.id)

    await manager.dispose()
  })

  it('flushes pending write on dispose and persists deletions', async () => {
    const manager = new BridgeManager()
    await manager.initialize()

    const created = await manager.create({
      name: 'Temp Bridge',
      sourceConnectionId: 'modbus-1',
      sourceTags: ['tag-1'],
      targetConnectionId: 'mqtt-1',
      targetConfig: {
        topicTemplate: 'data/{{tagName}}',
        payloadTemplate: '{"value": {{value}}}',
        qos: 0,
        retain: false
      }
    })
    await manager.delete(created.id)
    await manager.dispose()

    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as Bridge[]
    expect(saved).toHaveLength(0)
  })
})
