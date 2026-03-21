import { CredentialService } from '../../../src/main/services/CredentialService'

// Mock electron modules
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((str: string) => Buffer.from(`encrypted:${str}`)),
    decryptString: jest.fn((buf: Buffer) => {
      const str = buf.toString()
      return str.startsWith('encrypted:') ? str.slice(10) : str
    })
  },
  app: {
    getPath: jest.fn(() => '/tmp/test-connex')
  }
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => {
    const store = new Map<string, unknown>()
    return {
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, val: unknown) => { store.set(key, val) }),
      delete: jest.fn((key: string) => { store.delete(key) }),
      has: jest.fn((key: string) => store.has(key)),
      get store() { return Object.fromEntries(store) }
    }
  })
})

jest.mock('electron-log/main.js', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}))

describe('CredentialService (safeStorage)', () => {
  let service: CredentialService

  beforeEach(() => {
    service = new CredentialService()
  })

  test('stores and retrieves credentials', async () => {
    await service.setCredentials('conn-1', { username: 'admin', password: 'secret' })
    const result = await service.getCredentials('conn-1')
    expect(result).toEqual({ username: 'admin', password: 'secret' })
  })

  test('returns null for non-existent credentials', async () => {
    const result = await service.getCredentials('non-existent')
    expect(result).toBeNull()
  })

  test('deletes credentials', async () => {
    await service.setCredentials('conn-1', { username: 'a', password: 'b' })
    const deleted = await service.deleteCredentials('conn-1')
    expect(deleted).toBe(true)
    const result = await service.getCredentials('conn-1')
    expect(result).toBeNull()
  })

  test('hasCredentials returns true when stored', async () => {
    await service.setCredentials('conn-1', { username: 'a', password: 'b' })
    expect(await service.hasCredentials('conn-1')).toBe(true)
  })

  test('hasCredentials returns false when not stored', async () => {
    expect(await service.hasCredentials('non-existent')).toBe(false)
  })

  test('lists connections with credentials', async () => {
    await service.setCredentials('conn-1', { username: 'a', password: 'b' })
    await service.setCredentials('conn-2', { username: 'c', password: 'd' })
    const list = await service.listConnectionsWithCredentials()
    expect(list).toContain('conn-1')
    expect(list).toContain('conn-2')
    expect(list).toHaveLength(2)
  })

  test('updatePassword preserves username', async () => {
    await service.setCredentials('conn-1', { username: 'admin', password: 'old' })
    await service.updatePassword('conn-1', 'new')
    const result = await service.getCredentials('conn-1')
    expect(result).toEqual({ username: 'admin', password: 'new' })
  })

  test('clearAll removes all credentials', async () => {
    await service.setCredentials('conn-1', { username: 'a', password: 'b' })
    await service.setCredentials('conn-2', { username: 'c', password: 'd' })
    await service.clearAll()
    expect(await service.listConnectionsWithCredentials()).toHaveLength(0)
  })
})
