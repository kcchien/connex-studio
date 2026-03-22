/**
 * Connection IPC Handler Integration Tests
 *
 * Tests the connection:* IPC channel handlers end-to-end through
 * the mock IPC infrastructure, verifying request validation,
 * handler response format, and ConnectionManager interaction.
 */

import { invokeHandler, resetHandlerRegistry, hasHandler } from './setup'

// ---------------------------------------------------------------------------
// Mock ConnectionManager — replaces the singleton before handler registration
// ---------------------------------------------------------------------------

const mockCreateConnection = jest.fn()
const mockConnect = jest.fn()
const mockDisconnect = jest.fn()
const mockDeleteConnection = jest.fn()
const mockGetAllConnections = jest.fn()
const mockReadOnce = jest.fn()
const mockGetConnectionMetrics = jest.fn()
const mockUpdateConnection = jest.fn()
const mockGetConnection = jest.fn()

jest.mock('@main/services/ConnectionManager', () => ({
  getConnectionManager: () => ({
    createConnection: mockCreateConnection,
    connect: mockConnect,
    disconnect: mockDisconnect,
    deleteConnection: mockDeleteConnection,
    getAllConnections: mockGetAllConnections,
    readOnce: mockReadOnce,
    getConnectionMetrics: mockGetConnectionMetrics,
    updateConnection: mockUpdateConnection,
    getConnection: mockGetConnection
  })
}))

// Mock net module for connection:test handler
jest.mock('net', () => {
  const originalNet = jest.requireActual('net')
  return {
    ...originalNet,
    isIP: originalNet.isIP,
    Socket: jest.fn().mockImplementation(() => {
      const handlers: Record<string, (...args: unknown[]) => unknown> = {}
      return {
        connect: jest.fn((_port: number, _host: string, cb: () => void) => cb()),
        destroy: jest.fn(),
        on: jest.fn((event: string, handler: (...args: unknown[]) => unknown) => {
          handlers[event] = handler
        }),
        _handlers: handlers
      }
    })
  }
})

// ---------------------------------------------------------------------------
// Import handler registration (must come after mocks)
// ---------------------------------------------------------------------------

import { registerConnectionHandlers } from '@main/ipc/connection'
import {
  CONNECTION_CREATE,
  CONNECTION_CONNECT,
  CONNECTION_DISCONNECT,
  CONNECTION_DELETE,
  CONNECTION_LIST,
  CONNECTION_TEST,
  CONNECTION_UPDATE,
  CONNECTION_METRICS
} from '@shared/constants/ipc-channels'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Connection IPC Handlers', () => {
  beforeEach(() => {
    resetHandlerRegistry()
    jest.clearAllMocks()
    registerConnectionHandlers()
  })

  // -------------------------------------------------------------------------
  // Handler registration
  // -------------------------------------------------------------------------

  it('registers all connection channels', () => {
    expect(hasHandler(CONNECTION_CREATE)).toBe(true)
    expect(hasHandler(CONNECTION_CONNECT)).toBe(true)
    expect(hasHandler(CONNECTION_DISCONNECT)).toBe(true)
    expect(hasHandler(CONNECTION_DELETE)).toBe(true)
    expect(hasHandler(CONNECTION_LIST)).toBe(true)
    expect(hasHandler(CONNECTION_TEST)).toBe(true)
    expect(hasHandler(CONNECTION_UPDATE)).toBe(true)
    expect(hasHandler(CONNECTION_METRICS)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // connection:create
  // -------------------------------------------------------------------------

  describe('connection:create', () => {
    it('creates connection with valid params and returns success', async () => {
      const fakeConnection = {
        id: 'conn-1',
        name: 'My PLC',
        protocol: 'modbus-tcp',
        config: { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 },
        status: 'disconnected',
        createdAt: Date.now()
      }
      mockCreateConnection.mockReturnValue(fakeConnection)

      const result = await invokeHandler<{ success: boolean; connection?: unknown }>(
        CONNECTION_CREATE,
        {
          name: 'My PLC',
          protocol: 'modbus-tcp',
          config: { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 }
        }
      )

      expect(result.success).toBe(true)
      expect(result.connection).toEqual(fakeConnection)
      expect(mockCreateConnection).toHaveBeenCalledWith(
        'My PLC',
        'modbus-tcp',
        { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 }
      )
    })

    it('returns error when ConnectionManager throws (e.g. missing name)', async () => {
      mockCreateConnection.mockImplementation(() => {
        throw new Error('Connection name is required')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_CREATE,
        { name: '', protocol: 'modbus-tcp', config: {} }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection name is required')
    })
  })

  // -------------------------------------------------------------------------
  // connection:connect / connection:disconnect
  // -------------------------------------------------------------------------

  describe('connection:connect', () => {
    it('connects successfully and returns success', async () => {
      mockConnect.mockResolvedValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        CONNECTION_CONNECT,
        { connectionId: 'conn-1' }
      )

      expect(result.success).toBe(true)
      expect(mockConnect).toHaveBeenCalledWith('conn-1')
    })

    it('returns error when connection not found', async () => {
      mockConnect.mockRejectedValue(new Error('Connection not found: conn-404'))

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_CONNECT,
        { connectionId: 'conn-404' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection not found')
    })
  })

  describe('connection:disconnect', () => {
    it('disconnects successfully', async () => {
      mockDisconnect.mockResolvedValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        CONNECTION_DISCONNECT,
        { connectionId: 'conn-1' }
      )

      expect(result.success).toBe(true)
      expect(mockDisconnect).toHaveBeenCalledWith('conn-1')
    })

    it('returns error when disconnect fails', async () => {
      mockDisconnect.mockRejectedValue(new Error('Connection not found: conn-nope'))

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_DISCONNECT,
        { connectionId: 'conn-nope' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection not found')
    })
  })

  // -------------------------------------------------------------------------
  // connection:list
  // -------------------------------------------------------------------------

  describe('connection:list', () => {
    it('returns all connections', async () => {
      const connections = [
        { id: 'c1', name: 'PLC A', protocol: 'modbus-tcp', status: 'disconnected' },
        { id: 'c2', name: 'Broker', protocol: 'mqtt', status: 'connected' }
      ]
      mockGetAllConnections.mockReturnValue(connections)

      const result = await invokeHandler<{ connections: unknown[] }>(CONNECTION_LIST)

      expect(result.connections).toHaveLength(2)
      expect(result.connections).toEqual(connections)
    })

    it('returns empty array when no connections exist', async () => {
      mockGetAllConnections.mockReturnValue([])

      const result = await invokeHandler<{ connections: unknown[] }>(CONNECTION_LIST)

      expect(result.connections).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // connection:test — input validation
  // -------------------------------------------------------------------------

  describe('connection:test', () => {
    it('rejects empty host', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: '', port: 502 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid host')
    })

    it('rejects host longer than 255 characters', async () => {
      const longHost = 'a'.repeat(256)
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: longHost, port: 502 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid host')
    })

    it('rejects invalid host format (special chars)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: 'host with spaces', port: 502 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid host format')
    })

    it('rejects port out of range (0)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: '127.0.0.1', port: 0 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid port')
    })

    it('rejects port out of range (65536)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: '127.0.0.1', port: 65536 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid port')
    })

    it('rejects non-integer port', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: '127.0.0.1', port: 502.5 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid port')
    })

    it('succeeds with valid modbus-tcp params when socket connects', async () => {
      const result = await invokeHandler<{ success: boolean }>(
        CONNECTION_TEST,
        { protocol: 'modbus-tcp', host: '192.168.1.1', port: 502 }
      )

      expect(result.success).toBe(true)
    })

    it('returns not implemented for non-modbus protocols', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_TEST,
        { protocol: 'mqtt', host: 'broker.local', port: 1883 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('not implemented')
    })
  })

  // -------------------------------------------------------------------------
  // connection:update
  // -------------------------------------------------------------------------

  describe('connection:update', () => {
    it('updates connection name and config', async () => {
      const updatedConn = {
        id: 'conn-1',
        name: 'Renamed PLC',
        protocol: 'modbus-tcp',
        config: { host: '10.0.0.1', port: 502, unitId: 2, timeout: 3000 },
        status: 'disconnected'
      }
      mockUpdateConnection.mockResolvedValue(updatedConn)

      const result = await invokeHandler<{ success: boolean; connection?: unknown }>(
        CONNECTION_UPDATE,
        {
          connectionId: 'conn-1',
          updates: {
            name: 'Renamed PLC',
            config: { host: '10.0.0.1', unitId: 2 }
          }
        }
      )

      expect(result.success).toBe(true)
      expect(result.connection).toEqual(updatedConn)
      expect(mockUpdateConnection).toHaveBeenCalledWith('conn-1', {
        name: 'Renamed PLC',
        config: { host: '10.0.0.1', unitId: 2 }
      })
    })

    it('returns error when updating non-existent connection', async () => {
      mockUpdateConnection.mockRejectedValue(new Error('Connection not found: conn-gone'))

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_UPDATE,
        { connectionId: 'conn-gone', updates: { name: 'New Name' } }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection not found')
    })
  })

  // -------------------------------------------------------------------------
  // connection:delete
  // -------------------------------------------------------------------------

  describe('connection:delete', () => {
    it('deletes a disconnected connection', async () => {
      mockDeleteConnection.mockReturnValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        CONNECTION_DELETE,
        { connectionId: 'conn-1' }
      )

      expect(result.success).toBe(true)
      expect(mockDeleteConnection).toHaveBeenCalledWith('conn-1')
    })

    it('returns error when trying to delete connected connection', async () => {
      mockDeleteConnection.mockImplementation(() => {
        throw new Error('Cannot delete connected connection. Disconnect first.')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        CONNECTION_DELETE,
        { connectionId: 'conn-active' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot delete connected connection')
    })
  })

  // -------------------------------------------------------------------------
  // connection:metrics
  // -------------------------------------------------------------------------

  describe('connection:metrics', () => {
    it('returns metrics for a connection', async () => {
      const fakeMetrics = {
        latencyMs: 12,
        latencyAvgMs: 15,
        requestCount: 100,
        errorCount: 2,
        errorRate: 0.02,
        lastSuccessAt: Date.now(),
        reconnectAttempts: 0
      }
      mockGetConnectionMetrics.mockReturnValue(fakeMetrics)

      const result = await invokeHandler<{ success: boolean; metrics?: unknown }>(
        CONNECTION_METRICS,
        { connectionId: 'conn-1' }
      )

      expect(result.success).toBe(true)
      expect(result.metrics).toEqual(fakeMetrics)
    })
  })
})
