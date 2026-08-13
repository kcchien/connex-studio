/**
 * DashboardService Persistence Unit Tests
 *
 * Tests for loading dashboards from userData storage and debounced writes.
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

import { DashboardService } from '../../../src/main/services/DashboardService'
import type { Dashboard } from '../../../src/shared/types'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  const now = Date.now()
  return {
    id: 'dash-1',
    name: 'Persisted Dashboard',
    isDefault: false,
    layout: [],
    widgets: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('DashboardService persistence', () => {
  let storagePath: string

  beforeEach(async () => {
    // Persistence is disabled under NODE_ENV=test; enable it for these tests
    process.env.NODE_ENV = 'development'
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'connex-dash-'))
    storagePath = path.join(userDataDir, 'dashboards.json')
  })

  afterEach(async () => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    await fs.rm(userDataDir, { recursive: true, force: true })
  })

  it('loads dashboards from storage on initialize', async () => {
    const dashboard = makeDashboard()
    await fs.writeFile(storagePath, JSON.stringify([dashboard]), 'utf-8')

    const service = new DashboardService()
    await service.initialize()

    expect(service.list()).toHaveLength(1)
    expect(service.get(dashboard.id)?.name).toBe('Persisted Dashboard')

    await service.dispose()
  })

  it('starts empty when storage file does not exist', async () => {
    const service = new DashboardService()
    await service.initialize()

    expect(service.list()).toHaveLength(0)

    await service.dispose()
  })

  it('starts empty when storage file is corrupted', async () => {
    await fs.writeFile(storagePath, '{not valid json', 'utf-8')

    const service = new DashboardService()
    await expect(service.initialize()).resolves.toBeUndefined()
    expect(service.list()).toHaveLength(0)

    await service.dispose()
  })

  it('persists changes with debounce after create', async () => {
    const service = new DashboardService()
    await service.initialize()

    const created = await service.create({ name: 'New Dashboard' })

    // Not written immediately (debounced)
    await expect(fs.access(storagePath)).rejects.toThrow()

    // Written after debounce window
    await new Promise((resolve) => setTimeout(resolve, 700))
    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as Dashboard[]
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe(created.id)

    await service.dispose()
  })

  it('flushes pending write on dispose', async () => {
    const service = new DashboardService()
    await service.initialize()

    await service.create({ name: 'Flush Me' })
    await service.dispose()

    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as Dashboard[]
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Flush Me')
  })

  it('persists deletions', async () => {
    const service = new DashboardService()
    await service.initialize()

    const created = await service.create({ name: 'Temp' })
    await service.delete(created.id)
    await service.dispose()

    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as Dashboard[]
    expect(saved).toHaveLength(0)
  })
})
