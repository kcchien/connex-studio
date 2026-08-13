/**
 * AlertEngine Persistence Unit Tests
 *
 * Tests for loading alert rules from userData storage and debounced writes.
 * Only rules are persisted - event history is managed by AlertHistoryStore.
 */

import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// Mocked userData directory, resolved per test
let userDataDir: string

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => userDataDir)
  },
  Notification: jest.fn().mockImplementation(() => ({
    show: jest.fn()
  }))
}))

jest.mock('electron-log/main.js', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}))

jest.mock('../../../src/main/services/AlertHistoryStore', () => ({
  getAlertHistoryStore: () => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn((event) => ({ ...event, id: 1 })),
    query: jest.fn().mockReturnValue({ events: [], totalCount: 0, hasMore: false }),
    acknowledge: jest.fn().mockReturnValue(true),
    acknowledgeAll: jest.fn().mockReturnValue(0),
    getUnacknowledgedCounts: jest.fn().mockReturnValue({ info: 0, warning: 0, critical: 0 }),
    clearHistory: jest.fn().mockReturnValue(0)
  })
}))

jest.mock('../../../src/main/services/AlertSoundPlayer', () => ({
  getAlertSoundPlayer: () => ({
    play: jest.fn()
  })
}))

import { AlertEngine } from '../../../src/main/services/AlertEngine'
import type { AlertRule } from '../../../src/shared/types'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

function makeRule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'rule-1',
    name: 'Persisted Rule',
    tagRef: 'tag-1',
    condition: { operator: '>', value: 100 },
    severity: 'warning',
    actions: ['log'],
    enabled: true,
    cooldown: 60,
    createdAt: Date.now(),
    ...overrides
  }
}

describe('AlertEngine rule persistence', () => {
  let storagePath: string

  beforeEach(async () => {
    // Persistence is disabled under NODE_ENV=test; enable it for these tests
    process.env.NODE_ENV = 'development'
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'connex-alert-'))
    storagePath = path.join(userDataDir, 'alert-rules.json')
  })

  afterEach(async () => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    await fs.rm(userDataDir, { recursive: true, force: true })
  })

  it('loads rules from storage on initialize', async () => {
    const rule = makeRule()
    await fs.writeFile(storagePath, JSON.stringify([rule]), 'utf-8')

    const engine = new AlertEngine()
    await engine.initialize()

    expect(engine.listRules()).toHaveLength(1)
    expect(engine.getRule(rule.id)?.name).toBe('Persisted Rule')

    await engine.dispose()
  })

  it('rebuilds condition state for loaded rules', async () => {
    const rule = makeRule({ cooldown: 0 })
    await fs.writeFile(storagePath, JSON.stringify([rule]), 'utf-8')

    const engine = new AlertEngine()
    await engine.initialize()

    // Loaded rule should be evaluable immediately
    const handler = jest.fn()
    engine.on('alert-triggered', handler)
    engine.processTagValue('tag-1', 150)

    expect(handler).toHaveBeenCalled()

    await engine.dispose()
  })

  it('starts empty when storage file does not exist', async () => {
    const engine = new AlertEngine()
    await engine.initialize()

    expect(engine.listRules()).toHaveLength(0)

    await engine.dispose()
  })

  it('starts empty when storage file is corrupted', async () => {
    await fs.writeFile(storagePath, '<<garbage>>', 'utf-8')

    const engine = new AlertEngine()
    await expect(engine.initialize()).resolves.toBeUndefined()
    expect(engine.listRules()).toHaveLength(0)

    await engine.dispose()
  })

  it('persists rule changes with debounce after create', async () => {
    const engine = new AlertEngine()
    await engine.initialize()

    const created = await engine.createRule({
      name: 'New Rule',
      tagRef: 'tag-1',
      condition: { operator: '>', value: 50 },
      severity: 'info'
    })

    // Not written immediately (debounced)
    await expect(fs.access(storagePath)).rejects.toThrow()

    // Written after debounce window
    await new Promise((resolve) => setTimeout(resolve, 700))
    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as AlertRule[]
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe(created.id)

    await engine.dispose()
  })

  it('flushes pending write on dispose and persists deletions', async () => {
    const engine = new AlertEngine()
    await engine.initialize()

    const created = await engine.createRule({
      name: 'Temp Rule',
      tagRef: 'tag-1',
      condition: { operator: '<', value: 10 },
      severity: 'critical'
    })
    await engine.deleteRule(created.id)
    await engine.dispose()

    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as AlertRule[]
    expect(saved).toHaveLength(0)
  })
})
