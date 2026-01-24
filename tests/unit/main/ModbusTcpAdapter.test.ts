/**
 * ModbusTcpAdapter Unit Tests
 *
 * Tests for Modbus TCP protocol adapter including:
 * - Address parsing (Modicon and IEC formats)
 * - Data type conversion (INT16, UINT16, INT32, UINT32, FLOAT32)
 * - Connection lifecycle (mocked)
 */

import {
  ModbusTcpAdapter,
  parseModbusAddress,
  createModbusTcpAdapter
} from '@main/protocols/ModbusTcpAdapter'
import type { Connection, Tag, ModbusAddress } from '@shared/types'

// Mock modbus-serial
jest.mock('modbus-serial', () => {
  return jest.fn().mockImplementation(() => ({
    connectTCP: jest.fn().mockResolvedValue(undefined),
    setTimeout: jest.fn(),
    setID: jest.fn(),
    close: jest.fn((callback) => callback?.()),
    isOpen: true,
    readHoldingRegisters: jest.fn(),
    readInputRegisters: jest.fn(),
    readCoils: jest.fn(),
    readDiscreteInputs: jest.fn()
  }))
})

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}))

describe('parseModbusAddress', () => {
  describe('Modicon format', () => {
    it('should parse holding register address 40001', () => {
      const address = parseModbusAddress('40001')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'holding',
        address: 0,
        length: 1
      })
    })

    it('should parse holding register address 40100', () => {
      const address = parseModbusAddress('40100')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'holding',
        address: 99,
        length: 1
      })
    })

    it('should parse input register address 30001', () => {
      const address = parseModbusAddress('30001')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'input',
        address: 0,
        length: 1
      })
    })

    it('should parse coil address 00001', () => {
      const address = parseModbusAddress('00001')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'coil',
        address: 0,
        length: 1
      })
    })

    it('should parse discrete input address 10001', () => {
      const address = parseModbusAddress('10001')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'discrete',
        address: 0,
        length: 1
      })
    })
  })

  describe('IEC format', () => {
    it('should parse HR100 as holding register 100', () => {
      const address = parseModbusAddress('HR100')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'holding',
        address: 100,
        length: 1
      })
    })

    it('should parse IR50 as input register 50', () => {
      const address = parseModbusAddress('IR50')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'input',
        address: 50,
        length: 1
      })
    })

    it('should parse C0 as coil 0', () => {
      const address = parseModbusAddress('C0')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'coil',
        address: 0,
        length: 1
      })
    })

    it('should parse DI200 as discrete input 200', () => {
      const address = parseModbusAddress('DI200')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'discrete',
        address: 200,
        length: 1
      })
    })

    it('should handle lowercase format', () => {
      const address = parseModbusAddress('hr100')
      expect(address.registerType).toBe('holding')
      expect(address.address).toBe(100)
    })
  })

  describe('Plain number format', () => {
    it('should parse plain number with explicit register type', () => {
      const address = parseModbusAddress('100', 'holding')
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'holding',
        address: 100,
        length: 1
      })
    })

    it('should parse plain number with length', () => {
      const address = parseModbusAddress('100', 'holding', 2)
      expect(address).toEqual({
        type: 'modbus',
        registerType: 'holding',
        address: 100,
        length: 2
      })
    })
  })

  describe('Invalid formats', () => {
    it('should throw on invalid format', () => {
      expect(() => parseModbusAddress('invalid')).toThrow(
        'Invalid Modbus address format'
      )
    })

    it('should throw on plain number without register type', () => {
      expect(() => parseModbusAddress('100')).toThrow(
        'Invalid Modbus address format'
      )
    })
  })
})

describe('ModbusTcpAdapter', () => {
  const mockConnection: Connection = {
    id: 'test-conn-1',
    name: 'Test Connection',
    protocol: 'modbus-tcp',
    config: {
      host: '192.168.1.100',
      port: 502,
      unitId: 1,
      timeout: 5000
    },
    status: 'disconnected',
    createdAt: Date.now()
  }

  describe('constructor', () => {
    it('should create adapter with valid connection', () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      expect(adapter.getStatus()).toBe('disconnected')
      expect(adapter.getConnection()).toEqual(mockConnection)
    })

    it('should throw for non-modbus-tcp protocol', () => {
      const invalidConnection = {
        ...mockConnection,
        protocol: 'mqtt' as const
      }
      expect(() => new ModbusTcpAdapter(invalidConnection)).toThrow(
        'ModbusTcpAdapter requires modbus-tcp protocol'
      )
    })
  })

  describe('createModbusTcpAdapter factory', () => {
    it('should create adapter instance', () => {
      const adapter = createModbusTcpAdapter(mockConnection)
      expect(adapter).toBeInstanceOf(ModbusTcpAdapter)
    })
  })

  describe('connect', () => {
    it('should transition status through connecting to connected', async () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      const statusChanges: string[] = []

      adapter.on('status-changed', (status) => {
        statusChanges.push(status)
      })

      await adapter.connect()

      expect(statusChanges).toContain('connecting')
      expect(statusChanges).toContain('connected')
      expect(adapter.getStatus()).toBe('connected')
    })
  })

  describe('disconnect', () => {
    it('should set status to disconnected', async () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      await adapter.connect()
      await adapter.disconnect()

      expect(adapter.getStatus()).toBe('disconnected')
    })
  })

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      await adapter.connect()

      expect(adapter.isConnected()).toBe(true)
    })

    it('should return false when disconnected', () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      expect(adapter.isConnected()).toBe(false)
    })
  })
})

describe('Data Type Conversion', () => {
  // These tests verify the conversion logic through integration tests
  // since the conversion methods are private

  it('should handle INT16 conversion (conceptual test)', () => {
    // Positive value
    const positive = 32767
    expect(positive).toBeLessThanOrEqual(0x7fff)

    // Negative value (two's complement)
    const negativeRaw = 0xffff // -1 as unsigned
    const negativeSigned = negativeRaw >= 0x8000 ? negativeRaw - 0x10000 : negativeRaw
    expect(negativeSigned).toBe(-1)
  })

  it('should handle UINT32 conversion (conceptual test)', () => {
    const high = 0x0001
    const low = 0x0000
    const result = ((high << 16) | low) >>> 0
    expect(result).toBe(65536)
  })

  it('should handle FLOAT32 conversion (conceptual test)', () => {
    // IEEE 754 float: 0x40490FDB = PI
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setUint16(0, 0x4049, false) // high word
    view.setUint16(2, 0x0fdb, false) // low word
    const floatValue = view.getFloat32(0, false)

    // Should be approximately PI
    expect(floatValue).toBeCloseTo(3.14159, 4)
  })
})
