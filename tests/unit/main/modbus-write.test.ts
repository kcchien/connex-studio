/**
 * Modbus Write Operations Unit Tests
 *
 * Tests for ModbusTcpAdapter write functionality:
 * - FC05: Write Single Coil
 * - FC06: Write Single Register
 * - FC15: Write Multiple Coils
 * - FC16: Write Multiple Registers
 * - Read-only register rejection
 * - Error handling
 */

import { ModbusTcpAdapter } from '@main/protocols/ModbusTcpAdapter'
import type { Connection, Tag, ModbusAddress, DataType } from '@shared/types'

// Mock modbus-serial with write methods
const mockWriteCoil = jest.fn().mockResolvedValue(undefined)
const mockWriteCoils = jest.fn().mockResolvedValue(undefined)
const mockWriteRegister = jest.fn().mockResolvedValue(undefined)
const mockWriteRegisters = jest.fn().mockResolvedValue(undefined)
const mockGetID = jest.fn().mockReturnValue(1)
const mockSetID = jest.fn()

jest.mock('modbus-serial', () => {
  return jest.fn().mockImplementation(() => ({
    connectTCP: jest.fn().mockResolvedValue(undefined),
    setTimeout: jest.fn(),
    setID: mockSetID,
    getID: mockGetID,
    close: jest.fn((callback) => callback?.()),
    isOpen: true,
    readHoldingRegisters: jest.fn().mockResolvedValue({ data: [0] }),
    readInputRegisters: jest.fn().mockResolvedValue({ data: [0] }),
    readCoils: jest.fn().mockResolvedValue({ data: [false] }),
    readDiscreteInputs: jest.fn().mockResolvedValue({ data: [false] }),
    writeCoil: mockWriteCoil,
    writeCoils: mockWriteCoils,
    writeRegister: mockWriteRegister,
    writeRegisters: mockWriteRegisters
  }))
})

// Mock electron-log
jest.mock('electron-log/main.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}))

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

function createTag(overrides: {
  registerType: ModbusAddress['registerType']
  address?: number
  length?: number
  dataType?: DataType
  byteOrder?: 'ABCD' | 'DCBA' | 'BADC' | 'CDAB'
  unitId?: number
}): Tag {
  return {
    id: `tag-${overrides.registerType}-${overrides.address ?? 0}`,
    name: 'Test Tag',
    connectionId: 'test-conn-1',
    dataType: overrides.dataType ?? 'uint16',
    address: {
      type: 'modbus',
      registerType: overrides.registerType,
      address: overrides.address ?? 0,
      length: overrides.length ?? 1,
      byteOrder: overrides.byteOrder,
      unitId: overrides.unitId
    },
    displayFormat: { decimals: 2, unit: '' },
    thresholds: {},
    enabled: true
  }
}

describe('ModbusTcpAdapter Write Operations', () => {
  let adapter: ModbusTcpAdapter

  beforeEach(async () => {
    jest.clearAllMocks()
    adapter = new ModbusTcpAdapter(mockConnection)
    await adapter.connect()
  })

  afterEach(async () => {
    await adapter.dispose()
  })

  describe('supportsWrite', () => {
    it('should return true', () => {
      expect(adapter.supportsWrite()).toBe(true)
    })
  })

  describe('FC05: Write Single Coil', () => {
    it('should write true to a coil', async () => {
      const tag = createTag({ registerType: 'coil', address: 10 })
      const result = await adapter.writeTag(tag, true)

      expect(result.success).toBe(true)
      expect(result.timestamp).toBeGreaterThan(0)
      expect(mockWriteCoil).toHaveBeenCalledWith(10, true)
    })

    it('should write false to a coil', async () => {
      const tag = createTag({ registerType: 'coil', address: 5 })
      const result = await adapter.writeTag(tag, false)

      expect(result.success).toBe(true)
      expect(mockWriteCoil).toHaveBeenCalledWith(5, false)
    })
  })

  describe('FC06: Write Single Holding Register', () => {
    it('should write uint16 value', async () => {
      const tag = createTag({ registerType: 'holding', address: 100, dataType: 'uint16' })
      const result = await adapter.writeTag(tag, 12345)

      expect(result.success).toBe(true)
      expect(mockWriteRegister).toHaveBeenCalledWith(100, 12345)
    })

    it('should write int16 positive value', async () => {
      const tag = createTag({ registerType: 'holding', address: 100, dataType: 'int16' })
      const result = await adapter.writeTag(tag, 1234)

      expect(result.success).toBe(true)
      expect(mockWriteRegister).toHaveBeenCalledWith(100, 1234)
    })

    it('should write int16 negative value (two\'s complement)', async () => {
      const tag = createTag({ registerType: 'holding', address: 100, dataType: 'int16' })
      const result = await adapter.writeTag(tag, -1)

      expect(result.success).toBe(true)
      // -1 in two's complement uint16 = 0xFFFF = 65535
      expect(mockWriteRegister).toHaveBeenCalledWith(100, 0xFFFF)
    })

    it('should write boolean as uint16 to holding register', async () => {
      const tag = createTag({ registerType: 'holding', address: 100, dataType: 'boolean' })
      const result = await adapter.writeTag(tag, true)

      expect(result.success).toBe(true)
      expect(mockWriteRegister).toHaveBeenCalledWith(100, 1)
    })
  })

  describe('FC16: Write Float32 (2 registers)', () => {
    it('should write float32 with ABCD byte order', async () => {
      const tag = createTag({
        registerType: 'holding',
        address: 200,
        length: 2,
        dataType: 'float32',
        byteOrder: 'ABCD'
      })

      // PI ≈ 3.14159265
      const result = await adapter.writeTag(tag, Math.PI)
      expect(result.success).toBe(true)
      expect(mockWriteRegisters).toHaveBeenCalledWith(200, expect.any(Array))

      // Verify the register values encode PI correctly
      const regs = mockWriteRegisters.mock.calls[0][1] as number[]
      expect(regs).toHaveLength(2)

      // Decode back to verify: ABCD means [high_word, low_word] big-endian
      const buf = Buffer.alloc(4)
      buf.writeUInt16BE(regs[0], 0)
      buf.writeUInt16BE(regs[1], 2)
      expect(buf.readFloatBE(0)).toBeCloseTo(Math.PI, 5)
    })

    it('should write float32 with DCBA byte order', async () => {
      const tag = createTag({
        registerType: 'holding',
        address: 200,
        length: 2,
        dataType: 'float32',
        byteOrder: 'DCBA'
      })

      const result = await adapter.writeTag(tag, 1.5)
      expect(result.success).toBe(true)
      expect(mockWriteRegisters).toHaveBeenCalledWith(200, expect.any(Array))

      // Verify DCBA encoding: [(b3<<8)|b2, (b1<<8)|b0]
      const regs = mockWriteRegisters.mock.calls[0][1] as number[]
      // Decode: DCBA reverses the byte order
      const buf = Buffer.alloc(4)
      buf.writeUInt16BE(regs[1], 0) // swap word order
      buf.writeUInt16BE(regs[0], 2)
      // DCBA also swaps bytes within words, but the decode already
      // handles it through the register ordering
      // Actually, let's verify by encoding 1.5 manually
      const refBuf = Buffer.alloc(4)
      refBuf.writeFloatBE(1.5, 0)
      const b0 = refBuf[0], b1 = refBuf[1], b2 = refBuf[2], b3 = refBuf[3]
      // DCBA: [(b3<<8)|b2, (b1<<8)|b0]
      expect(regs[0]).toBe((b3 << 8) | b2)
      expect(regs[1]).toBe((b1 << 8) | b0)
    })
  })

  describe('FC16: Write Int32/Uint32 (2 registers)', () => {
    it('should write int32 positive value', async () => {
      const tag = createTag({
        registerType: 'holding',
        address: 300,
        length: 2,
        dataType: 'int32',
        byteOrder: 'ABCD'
      })

      const result = await adapter.writeTag(tag, 100000)
      expect(result.success).toBe(true)
      expect(mockWriteRegisters).toHaveBeenCalledWith(300, expect.any(Array))

      // Verify encoding
      const regs = mockWriteRegisters.mock.calls[0][1] as number[]
      const buf = Buffer.alloc(4)
      buf.writeUInt16BE(regs[0], 0)
      buf.writeUInt16BE(regs[1], 2)
      expect(buf.readInt32BE(0)).toBe(100000)
    })

    it('should write int32 negative value', async () => {
      const tag = createTag({
        registerType: 'holding',
        address: 300,
        length: 2,
        dataType: 'int32',
        byteOrder: 'ABCD'
      })

      const result = await adapter.writeTag(tag, -50000)
      expect(result.success).toBe(true)

      const regs = mockWriteRegisters.mock.calls[0][1] as number[]
      const buf = Buffer.alloc(4)
      buf.writeUInt16BE(regs[0], 0)
      buf.writeUInt16BE(regs[1], 2)
      expect(buf.readInt32BE(0)).toBe(-50000)
    })

    it('should write uint32 value', async () => {
      const tag = createTag({
        registerType: 'holding',
        address: 400,
        length: 2,
        dataType: 'uint32',
        byteOrder: 'ABCD'
      })

      const result = await adapter.writeTag(tag, 3000000000)
      expect(result.success).toBe(true)

      const regs = mockWriteRegisters.mock.calls[0][1] as number[]
      const buf = Buffer.alloc(4)
      buf.writeUInt16BE(regs[0], 0)
      buf.writeUInt16BE(regs[1], 2)
      expect(buf.readUInt32BE(0)).toBe(3000000000)
    })
  })

  describe('Read-only register rejection', () => {
    it('should reject write to input registers', async () => {
      const tag = createTag({ registerType: 'input', address: 0 })
      const result = await adapter.writeTag(tag, 123)

      expect(result.success).toBe(false)
      expect(result.error).toContain('read-only')
      expect(mockWriteRegister).not.toHaveBeenCalled()
      expect(mockWriteRegisters).not.toHaveBeenCalled()
    })

    it('should reject write to discrete inputs', async () => {
      const tag = createTag({ registerType: 'discrete', address: 0 })
      const result = await adapter.writeTag(tag, true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('read-only')
      expect(mockWriteCoil).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should propagate connection errors', async () => {
      mockWriteRegister.mockRejectedValueOnce(new Error('ECONNRESET'))

      const tag = createTag({ registerType: 'holding', address: 0, dataType: 'uint16' })
      const result = await adapter.writeTag(tag, 42)

      expect(result.success).toBe(false)
      expect(result.error).toContain('ECONNRESET')
    })

    it('should handle unit ID override for write', async () => {
      const tag = createTag({
        registerType: 'holding',
        address: 50,
        dataType: 'uint16',
        unitId: 5
      })

      mockGetID.mockReturnValue(1)
      const result = await adapter.writeTag(tag, 999)

      expect(result.success).toBe(true)
      // Should set unit ID to 5, then restore to 1
      expect(mockSetID).toHaveBeenCalledWith(5)
      // The last setID call should restore the original
      const setIDCalls = mockSetID.mock.calls
      expect(setIDCalls[setIDCalls.length - 1][0]).toBe(1)
    })
  })
})
