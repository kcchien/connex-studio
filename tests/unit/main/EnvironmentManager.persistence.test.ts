/**
 * EnvironmentManager Persistence Unit Tests
 *
 * Tests for loading environments (including defaultEnvironmentId) from
 * userData storage and debounced writes.
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

import { EnvironmentManager } from '../../../src/main/services/EnvironmentManager'
import type { Environment } from '../../../src/shared/types'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

interface EnvironmentStorageFile {
  defaultEnvironmentId: string | null
  environments: Environment[]
}

function makeEnvironment(overrides: Partial<Environment> = {}): Environment {
  const now = Date.now()
  return {
    id: 'env-1',
    name: 'Persisted Env',
    variables: { HOST: 'localhost' },
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('EnvironmentManager persistence', () => {
  let storagePath: string

  beforeEach(async () => {
    // Persistence is disabled under NODE_ENV=test; enable it for these tests
    process.env.NODE_ENV = 'development'
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'connex-env-'))
    storagePath = path.join(userDataDir, 'environments.json')
  })

  afterEach(async () => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    await fs.rm(userDataDir, { recursive: true, force: true })
  })

  it('loads environments and default id from storage on initialize', async () => {
    const env = makeEnvironment({ isDefault: true })
    const file: EnvironmentStorageFile = {
      defaultEnvironmentId: env.id,
      environments: [env]
    }
    await fs.writeFile(storagePath, JSON.stringify(file), 'utf-8')

    const manager = new EnvironmentManager()
    await manager.initialize()

    expect(manager.list()).toHaveLength(1)
    expect(manager.getDefault()?.id).toBe(env.id)
    expect(manager.getVariables()).toEqual({ HOST: 'localhost' })

    await manager.dispose()
  })

  it('ignores default id pointing to a missing environment', async () => {
    const file: EnvironmentStorageFile = {
      defaultEnvironmentId: 'gone',
      environments: [makeEnvironment()]
    }
    await fs.writeFile(storagePath, JSON.stringify(file), 'utf-8')

    const manager = new EnvironmentManager()
    await manager.initialize()

    expect(manager.getDefault()).toBeNull()

    await manager.dispose()
  })

  it('starts empty when storage file does not exist', async () => {
    const manager = new EnvironmentManager()
    await manager.initialize()

    expect(manager.list()).toHaveLength(0)
    expect(manager.getDefault()).toBeNull()

    await manager.dispose()
  })

  it('starts empty when storage file is corrupted', async () => {
    await fs.writeFile(storagePath, '][', 'utf-8')

    const manager = new EnvironmentManager()
    await expect(manager.initialize()).resolves.toBeUndefined()
    expect(manager.list()).toHaveLength(0)

    await manager.dispose()
  })

  it('persists changes with debounce after create', async () => {
    const manager = new EnvironmentManager()
    await manager.initialize()

    const created = await manager.create({ name: 'Dev', variables: { A: '1' } })

    // Not written immediately (debounced)
    await expect(fs.access(storagePath)).rejects.toThrow()

    // Written after debounce window
    await new Promise((resolve) => setTimeout(resolve, 700))
    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as EnvironmentStorageFile
    expect(saved.environments).toHaveLength(1)
    expect(saved.environments[0].id).toBe(created.id)

    await manager.dispose()
  })

  it('persists defaultEnvironmentId when setDefault is called', async () => {
    const manager = new EnvironmentManager()
    await manager.initialize()

    const created = await manager.create({ name: 'Prod' })
    await manager.setDefault(created.id)
    await manager.dispose()

    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as EnvironmentStorageFile
    expect(saved.defaultEnvironmentId).toBe(created.id)
    expect(saved.environments[0].isDefault).toBe(true)
  })

  it('flushes pending write on dispose and persists deletions', async () => {
    const manager = new EnvironmentManager()
    await manager.initialize()

    const created = await manager.create({ name: 'Temp' })
    await manager.delete(created.id)
    await manager.dispose()

    const saved = JSON.parse(await fs.readFile(storagePath, 'utf-8')) as EnvironmentStorageFile
    expect(saved.environments).toHaveLength(0)
    expect(saved.defaultEnvironmentId).toBeNull()
  })
})
