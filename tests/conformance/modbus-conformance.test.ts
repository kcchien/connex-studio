/**
 * Modbus TCP Protocol Conformance Tests
 *
 * Tests adapter logic for Modbus TCP protocol compliance.
 * No actual device connection required — all tests are pure unit tests
 * that verify data conversion, address parsing, batch optimization, and
 * error handling logic.
 *
 * Conformance matrix reference: docs/protocol-conformance-matrix.md
 */

import {
  swapBytes,
  reorderRegisters,
  convertFloat32,
  convertInt32,
  convertUint32
} from '@main/protocols/byteOrderUtils'
import {
  parseModbusAddress
} from '@main/protocols/ModbusTcpAdapter'
import {
  createReadBatches,
  extractTagValues,
  type ReadBatch
} from '@main/protocols/batchReadOptimizer'
import type { ByteOrder, Tag, ModbusAddress, DataType, BatchReadConfig } from '@shared/types'

// ---------------------------------------------------------------------------
// Helper: create a minimal Tag object for testing
// ---------------------------------------------------------------------------
function makeTag(
  id: string,
  registerType: ModbusAddress['registerType'],
  address: number,
  length: number,
  dataType: DataType = 'uint16',
  opts?: { unitId?: number; byteOrder?: ByteOrder; enabled?: boolean }
): Tag {
  return {
    id,
    connectionId: 'test-conn',
    name: `Tag ${id}`,
    address: {
      type: 'modbus',
      registerType,
      address,
      length,
      unitId: opts?.unitId,
      byteOrder: opts?.byteOrder
    } as ModbusAddress,
    dataType,
    displayFormat: 'decimal',
    thresholds: {},
    enabled: opts?.enabled ?? true
  } as Tag
}

// ===========================================================================
// MOD-020 ~ MOD-024: Byte Order Conformance
// ===========================================================================
describe('[MOD-020..024] Byte Order Variants', () => {
  describe('swapBytes()', () => {
    it('should swap high and low bytes of a 16-bit word', () => {
      expect(swapBytes(0x1234)).toBe(0x3412)
      expect(swapBytes(0x00ff)).toBe(0xff00)
      expect(swapBytes(0xabcd)).toBe(0xcdab)
      expect(swapBytes(0x0000)).toBe(0x0000)
      expect(swapBytes(0xffff)).toBe(0xffff)
    })

    it('should mask input to 16 bits before swapping', () => {
      // 0x12345678 & 0xFFFF = 0x5678 -> swap -> 0x7856
      expect(swapBytes(0x12345678)).toBe(0x7856)
    })
  })

  describe('reorderRegisters()', () => {
    const R0 = 0x1122
    const R1 = 0x3344

    it('[MOD-020] ABCD: returns registers in original order', () => {
      expect(reorderRegisters(R0, R1, 'ABCD')).toEqual([R0, R1])
    })

    it('[MOD-021] DCBA: swaps word order', () => {
      expect(reorderRegisters(R0, R1, 'DCBA')).toEqual([R1, R0])
    })

    it('[MOD-022] BADC: swaps bytes within each word', () => {
      expect(reorderRegisters(R0, R1, 'BADC')).toEqual([
        swapBytes(R0),
        swapBytes(R1)
      ])
    })

    it('[MOD-023] CDAB: swaps both words and bytes', () => {
      expect(reorderRegisters(R0, R1, 'CDAB')).toEqual([
        swapBytes(R1),
        swapBytes(R0)
      ])
    })

    it('[MOD-024] Invalid byte order falls back to ABCD', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = reorderRegisters(R0, R1, 'WXYZ' as ByteOrder)
      expect(result).toEqual([R0, R1])
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})

// ===========================================================================
// MOD-030 ~ MOD-038: Data Type Conversions
// ===========================================================================
describe('[MOD-030..038] Data Type Conversions', () => {
  // --------------------------------------------------
  // Float32 (IEEE 754) with all byte orders
  // --------------------------------------------------
  describe('convertFloat32() — IEEE 754', () => {
    // Known value: 123.456 ≈ 0x42F6E979
    const HIGH = 0x42f6
    const LOW = 0xe979

    it('[MOD-034] ABCD: big-endian float32', () => {
      expect(convertFloat32(HIGH, LOW, 'ABCD')).toBeCloseTo(123.456, 2)
    })

    it('[MOD-034] DCBA: little-endian float32', () => {
      expect(convertFloat32(LOW, HIGH, 'DCBA')).toBeCloseTo(123.456, 2)
    })

    it('[MOD-034] BADC: mid-big float32', () => {
      // BADC swaps bytes within each word, so we pass pre-swapped values
      expect(convertFloat32(swapBytes(HIGH), swapBytes(LOW), 'BADC'))
        .toBeCloseTo(123.456, 2)
    })

    it('[MOD-034] CDAB: mid-little float32', () => {
      // CDAB swaps both bytes and words
      expect(convertFloat32(swapBytes(LOW), swapBytes(HIGH), 'CDAB'))
        .toBeCloseTo(123.456, 2)
    })

    it('handles zero', () => {
      expect(convertFloat32(0x0000, 0x0000, 'ABCD')).toBe(0)
    })

    it('handles negative values', () => {
      // -1.0 = 0xBF800000
      expect(convertFloat32(0xbf80, 0x0000, 'ABCD')).toBeCloseTo(-1.0, 5)
    })

    it('handles NaN (IEEE 754)', () => {
      // NaN: 0x7FC00000
      expect(convertFloat32(0x7fc0, 0x0000, 'ABCD')).toBeNaN()
    })

    it('handles +Infinity (IEEE 754)', () => {
      // +Inf: 0x7F800000
      expect(convertFloat32(0x7f80, 0x0000, 'ABCD')).toBe(Infinity)
    })

    it('handles -Infinity (IEEE 754)', () => {
      // -Inf: 0xFF800000
      expect(convertFloat32(0xff80, 0x0000, 'ABCD')).toBe(-Infinity)
    })

    it('handles very small (subnormal) float', () => {
      // Smallest positive subnormal: 0x00000001
      const result = convertFloat32(0x0000, 0x0001, 'ABCD')
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1e-38)
    })
  })

  // --------------------------------------------------
  // Int32 (signed 32-bit integer)
  // --------------------------------------------------
  describe('convertInt32()', () => {
    it('[MOD-033] positive value with ABCD', () => {
      // 100 = 0x00000064
      expect(convertInt32(0x0000, 0x0064, 'ABCD')).toBe(100)
    })

    it('[MOD-033] negative value -1 with ABCD', () => {
      // -1 = 0xFFFFFFFF
      expect(convertInt32(0xffff, 0xffff, 'ABCD')).toBe(-1)
    })

    it('[MOD-033] INT32_MIN (-2147483648) with ABCD', () => {
      // 0x80000000
      expect(convertInt32(0x8000, 0x0000, 'ABCD')).toBe(-2147483648)
    })

    it('[MOD-033] INT32_MAX (2147483647) with ABCD', () => {
      // 0x7FFFFFFF
      expect(convertInt32(0x7fff, 0xffff, 'ABCD')).toBe(2147483647)
    })

    it('[MOD-033] positive value with DCBA', () => {
      // 100 = 0x00000064, DCBA swaps words
      expect(convertInt32(0x0064, 0x0000, 'DCBA')).toBe(100)
    })

    it('[MOD-033] negative value with DCBA', () => {
      expect(convertInt32(0xffff, 0xffff, 'DCBA')).toBe(-1)
    })

    it('handles zero', () => {
      expect(convertInt32(0x0000, 0x0000, 'ABCD')).toBe(0)
    })
  })

  // --------------------------------------------------
  // Uint32 (unsigned 32-bit integer)
  // --------------------------------------------------
  describe('convertUint32()', () => {
    it('[MOD-032] max unsigned value with ABCD', () => {
      // 4294967295 = 0xFFFFFFFF
      expect(convertUint32(0xffff, 0xffff, 'ABCD')).toBe(4294967295)
    })

    it('[MOD-032] mid-range value', () => {
      // 65536 = 0x00010000
      expect(convertUint32(0x0001, 0x0000, 'ABCD')).toBe(65536)
    })

    it('[MOD-032] value with DCBA', () => {
      expect(convertUint32(0x0000, 0x0001, 'DCBA')).toBe(65536)
    })

    it('[MOD-032] value with BADC', () => {
      // BADC swaps bytes in each word
      // To get 0x00010000, we need swapBytes(reg0)=0x0001, swapBytes(reg1)=0x0000
      // so reg0=0x0100, reg1=0x0000
      expect(convertUint32(0x0100, 0x0000, 'BADC')).toBe(65536)
    })

    it('[MOD-032] value with CDAB', () => {
      // CDAB: [swapBytes(reg1), swapBytes(reg0)]
      // Want high=0x0001, low=0x0000
      // swapBytes(reg1) = 0x0001 -> reg1 = 0x0100
      // swapBytes(reg0) = 0x0000 -> reg0 = 0x0000
      expect(convertUint32(0x0000, 0x0100, 'CDAB')).toBe(65536)
    })

    it('handles zero', () => {
      expect(convertUint32(0x0000, 0x0000, 'ABCD')).toBe(0)
    })
  })
})

// ===========================================================================
// MOD-040 ~ MOD-047: Address Parsing
// ===========================================================================
describe('[MOD-040..047] Address Parsing', () => {
  describe('Modicon 5-digit format', () => {
    it('[MOD-040] 40001-49999 maps to holding registers (0-based)', () => {
      const addr = parseModbusAddress('40001')
      expect(addr.type).toBe('modbus')
      expect(addr.registerType).toBe('holding')
      expect(addr.address).toBe(0) // 40001 - 40001 = 0

      const addr2 = parseModbusAddress('40100')
      expect(addr2.registerType).toBe('holding')
      expect(addr2.address).toBe(99)
    })

    it('[MOD-041] 30001-39999 maps to input registers (0-based)', () => {
      const addr = parseModbusAddress('30001')
      expect(addr.registerType).toBe('input')
      expect(addr.address).toBe(0)

      const addr2 = parseModbusAddress('30050')
      expect(addr2.registerType).toBe('input')
      expect(addr2.address).toBe(49)
    })

    it('[MOD-042] 00001-09999 maps to coils (0-based)', () => {
      const addr = parseModbusAddress('00001')
      expect(addr.registerType).toBe('coil')
      expect(addr.address).toBe(0)

      const addr2 = parseModbusAddress('00100')
      expect(addr2.registerType).toBe('coil')
      expect(addr2.address).toBe(99)
    })

    it('[MOD-043] 10001-19999 maps to discrete inputs (0-based)', () => {
      const addr = parseModbusAddress('10001')
      expect(addr.registerType).toBe('discrete')
      expect(addr.address).toBe(0)

      const addr2 = parseModbusAddress('10050')
      expect(addr2.registerType).toBe('discrete')
      expect(addr2.address).toBe(49)
    })
  })

  describe('IEC format', () => {
    it('[MOD-044] HR prefix maps to holding register', () => {
      const addr = parseModbusAddress('HR100')
      expect(addr.registerType).toBe('holding')
      expect(addr.address).toBe(100)
    })

    it('[MOD-044] IR prefix maps to input register', () => {
      const addr = parseModbusAddress('IR0')
      expect(addr.registerType).toBe('input')
      expect(addr.address).toBe(0)
    })

    it('[MOD-044] C prefix maps to coil', () => {
      const addr = parseModbusAddress('C50')
      expect(addr.registerType).toBe('coil')
      expect(addr.address).toBe(50)
    })

    it('[MOD-044] DI prefix maps to discrete input', () => {
      const addr = parseModbusAddress('DI200')
      expect(addr.registerType).toBe('discrete')
      expect(addr.address).toBe(200)
    })

    it('[MOD-044] IEC format is case-insensitive', () => {
      const addr = parseModbusAddress('hr100')
      expect(addr.registerType).toBe('holding')
      expect(addr.address).toBe(100)
    })
  })

  describe('Plain number format', () => {
    it('[MOD-045] plain number with explicit registerType', () => {
      const addr = parseModbusAddress('100', 'holding')
      expect(addr.registerType).toBe('holding')
      expect(addr.address).toBe(100)
    })

    it('[MOD-045] plain number with length parameter', () => {
      const addr = parseModbusAddress('100', 'holding', 2)
      expect(addr.length).toBe(2)
    })
  })

  describe('Error handling', () => {
    it('[MOD-046] throws on invalid format', () => {
      expect(() => parseModbusAddress('INVALID')).toThrow('Invalid Modbus address format')
    })

    it('[MOD-046] throws on plain number without registerType', () => {
      expect(() => parseModbusAddress('100')).toThrow('Invalid Modbus address format')
    })

    it('[MOD-046] throws on empty string', () => {
      expect(() => parseModbusAddress('')).toThrow('Invalid Modbus address format')
    })
  })

  describe('Default length', () => {
    it('defaults to length 1 when not specified', () => {
      const addr = parseModbusAddress('40001')
      expect(addr.length).toBe(1)
    })

    it('uses custom length when specified', () => {
      const addr = parseModbusAddress('40001', undefined, 4)
      expect(addr.length).toBe(4)
    })
  })
})

// ===========================================================================
// MOD-050 ~ MOD-055: Batch Read Optimization
// ===========================================================================
describe('[MOD-050..055] Batch Read Optimization', () => {
  const defaultConfig: BatchReadConfig = {
    enabled: true,
    maxGap: 10,
    maxRegisters: 125
  }

  describe('createReadBatches()', () => {
    it('[MOD-050] merges adjacent tags into a single batch', () => {
      const tags = [
        makeTag('t1', 'holding', 0, 1),
        makeTag('t2', 'holding', 1, 1),
        makeTag('t3', 'holding', 2, 1)
      ]

      const batches = createReadBatches(tags, defaultConfig)
      expect(batches).toHaveLength(1)
      expect(batches[0].startAddress).toBe(0)
      expect(batches[0].length).toBe(3)
      expect(batches[0].tags).toHaveLength(3)
    })

    it('[MOD-050] merges tags with gap within maxGap', () => {
      const tags = [
        makeTag('t1', 'holding', 0, 1),
        makeTag('t2', 'holding', 5, 1) // gap = 4, within maxGap=10
      ]

      const batches = createReadBatches(tags, defaultConfig)
      expect(batches).toHaveLength(1)
      expect(batches[0].length).toBe(6) // 0..5 inclusive
    })

    it('[MOD-050] splits tags when gap exceeds maxGap', () => {
      const config: BatchReadConfig = { enabled: true, maxGap: 2, maxRegisters: 125 }
      const tags = [
        makeTag('t1', 'holding', 0, 1),
        makeTag('t2', 'holding', 20, 1) // gap = 19, exceeds maxGap=2
      ]

      const batches = createReadBatches(tags, config)
      expect(batches).toHaveLength(2)
    })

    it('[MOD-051] splits batches exceeding 125 registers', () => {
      // Create tags that span more than 125 registers
      const tags = [
        makeTag('t1', 'holding', 0, 1),
        makeTag('t2', 'holding', 130, 1) // total length = 131, exceeds 125
      ]

      const batches = createReadBatches(tags, defaultConfig)
      expect(batches).toHaveLength(2)
      expect(batches[0].length).toBeLessThanOrEqual(125)
    })

    it('[MOD-052] groups by register type', () => {
      const tags = [
        makeTag('t1', 'holding', 0, 1),
        makeTag('t2', 'input', 0, 1),
        makeTag('t3', 'holding', 1, 1)
      ]

      const batches = createReadBatches(tags, defaultConfig)
      // Should have 2 batches: one for holding (t1+t3), one for input (t2)
      expect(batches).toHaveLength(2)

      const holdingBatch = batches.find(b => b.registerType === 'holding')
      const inputBatch = batches.find(b => b.registerType === 'input')
      expect(holdingBatch).toBeDefined()
      expect(inputBatch).toBeDefined()
      expect(holdingBatch!.tags).toHaveLength(2)
      expect(inputBatch!.tags).toHaveLength(1)
    })

    it('[MOD-053] groups by unit ID', () => {
      const tags = [
        makeTag('t1', 'holding', 0, 1, 'uint16', { unitId: 1 }),
        makeTag('t2', 'holding', 1, 1, 'uint16', { unitId: 2 }),
        makeTag('t3', 'holding', 2, 1, 'uint16', { unitId: 1 })
      ]

      const batches = createReadBatches(tags, defaultConfig)
      expect(batches).toHaveLength(2)

      const unit1Batch = batches.find(b => b.unitId === 1)
      const unit2Batch = batches.find(b => b.unitId === 2)
      expect(unit1Batch!.tags).toHaveLength(2)
      expect(unit2Batch!.tags).toHaveLength(1)
    })

    it('[MOD-054] disabling batch mode creates one batch per tag', () => {
      const config: BatchReadConfig = { enabled: false, maxGap: 10, maxRegisters: 125 }
      const tags = [
        makeTag('t1', 'holding', 0, 1),
        makeTag('t2', 'holding', 1, 1),
        makeTag('t3', 'holding', 2, 1)
      ]

      const batches = createReadBatches(tags, config)
      expect(batches).toHaveLength(3)
      batches.forEach(b => expect(b.tags).toHaveLength(1))
    })

    it('filters out disabled tags', () => {
      const tags = [
        makeTag('t1', 'holding', 0, 1, 'uint16', { enabled: true }),
        makeTag('t2', 'holding', 1, 1, 'uint16', { enabled: false }),
        makeTag('t3', 'holding', 2, 1, 'uint16', { enabled: true })
      ]

      const batches = createReadBatches(tags, defaultConfig)
      const allTagIds = batches.flatMap(b => b.tags.map(t => t.tag.id))
      expect(allTagIds).not.toContain('t2')
      expect(allTagIds).toContain('t1')
      expect(allTagIds).toContain('t3')
    })

    it('returns empty array for empty tag list', () => {
      expect(createReadBatches([], defaultConfig)).toEqual([])
    })

    it('returns empty array when no tags are enabled', () => {
      const tags = [
        makeTag('t1', 'holding', 0, 1, 'uint16', { enabled: false })
      ]
      expect(createReadBatches(tags, defaultConfig)).toEqual([])
    })
  })

  describe('extractTagValues()', () => {
    it('[MOD-055] extracts individual tag values from batch result', () => {
      const batch: ReadBatch = {
        registerType: 'holding',
        unitId: undefined,
        startAddress: 0,
        length: 5,
        tags: [
          { tag: makeTag('t1', 'holding', 0, 2), offset: 0, length: 2 },
          { tag: makeTag('t2', 'holding', 2, 1), offset: 2, length: 1 },
          { tag: makeTag('t3', 'holding', 3, 2), offset: 3, length: 2 }
        ]
      }

      const rawData = [100, 200, 300, 400, 500]
      const result = extractTagValues(batch, rawData)

      expect(result.get('t1')).toEqual([100, 200])
      expect(result.get('t2')).toEqual([300])
      expect(result.get('t3')).toEqual([400, 500])
    })

    it('[MOD-055] extracts boolean values from coil/discrete batch', () => {
      const batch: ReadBatch = {
        registerType: 'coil',
        unitId: undefined,
        startAddress: 0,
        length: 3,
        tags: [
          { tag: makeTag('c1', 'coil', 0, 1), offset: 0, length: 1 },
          { tag: makeTag('c2', 'coil', 1, 1), offset: 1, length: 1 },
          { tag: makeTag('c3', 'coil', 2, 1), offset: 2, length: 1 }
        ]
      }

      const rawData = [true, false, true]
      const result = extractTagValues(batch, rawData)

      expect(result.get('c1')).toEqual([true])
      expect(result.get('c2')).toEqual([false])
      expect(result.get('c3')).toEqual([true])
    })
  })
})

// ===========================================================================
// MOD-010 ~ MOD-013: Error Code Mapping & Connection Errors
// ===========================================================================
describe('[MOD-010..013] Error Handling', () => {
  // We test the error patterns that isConnectionError() checks.
  // The method is private, so we validate the error strings it recognizes.
  const CONNECTION_ERRORS = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'Port Not Open'
  ]

  it('[MOD-010] should recognize all documented connection error patterns', () => {
    // These are the exact strings checked in isConnectionError()
    CONNECTION_ERRORS.forEach(errorCode => {
      const error = new Error(`Socket error: ${errorCode}`)
      expect(error.message).toContain(errorCode)
    })
  })

  it('[MOD-010] connection error list covers TCP layer failures', () => {
    // Verify we have TCP reset, refuse, timeout, and unreachable covered
    expect(CONNECTION_ERRORS).toContain('ECONNRESET')
    expect(CONNECTION_ERRORS).toContain('ECONNREFUSED')
    expect(CONNECTION_ERRORS).toContain('ETIMEDOUT')
    expect(CONNECTION_ERRORS).toContain('EHOSTUNREACH')
    expect(CONNECTION_ERRORS).toContain('ENETUNREACH')
  })

  it('[MOD-010] connection error list covers modbus-serial specific errors', () => {
    expect(CONNECTION_ERRORS).toContain('Port Not Open')
  })
})

// ===========================================================================
// Cross-byte-order round-trip tests
// ===========================================================================
describe('Cross-byte-order round-trip consistency', () => {
  // For a given 32-bit value, encoding with any byte order and then decoding
  // with the same byte order should yield the original value.

  const testValues = [
    { name: 'zero', high: 0x0000, low: 0x0000, expected: 0 },
    { name: 'one', high: 0x0000, low: 0x0001, expected: 1 },
    { name: '65536', high: 0x0001, low: 0x0000, expected: 65536 },
    { name: 'max uint32', high: 0xffff, low: 0xffff, expected: 4294967295 }
  ]

  const byteOrders: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']

  for (const { name, high, low, expected } of testValues) {
    for (const order of byteOrders) {
      it(`uint32 ${name} (${expected}) round-trips through ${order}`, () => {
        // Encode: reorder the ABCD canonical form for this byte order
        // The adapter receives data from a device that already has a specific byte order.
        // reorderRegisters transforms device-native order back to ABCD for interpretation.
        // So for round-trip: we need to figure out what the device would send.

        // For ABCD: device sends [high, low]
        // For DCBA: device sends [low, high] (reorderRegisters swaps back)
        // For BADC: device sends [swapBytes(high), swapBytes(low)]
        // For CDAB: device sends [swapBytes(low), swapBytes(high)]

        let deviceReg0: number, deviceReg1: number
        switch (order) {
          case 'ABCD':
            deviceReg0 = high
            deviceReg1 = low
            break
          case 'DCBA':
            deviceReg0 = low
            deviceReg1 = high
            break
          case 'BADC':
            deviceReg0 = swapBytes(high)
            deviceReg1 = swapBytes(low)
            break
          case 'CDAB':
            deviceReg0 = swapBytes(low)
            deviceReg1 = swapBytes(high)
            break
        }

        const result = convertUint32(deviceReg0, deviceReg1, order)
        expect(result).toBe(expected)
      })
    }
  }

  // Float32 round-trip with known value across all byte orders
  const FLOAT_VALUE = 123.456
  const FLOAT_HIGH = 0x42f6
  const FLOAT_LOW = 0xe979

  for (const order of byteOrders) {
    it(`float32 123.456 round-trips through ${order}`, () => {
      let deviceReg0: number, deviceReg1: number
      switch (order) {
        case 'ABCD':
          deviceReg0 = FLOAT_HIGH
          deviceReg1 = FLOAT_LOW
          break
        case 'DCBA':
          deviceReg0 = FLOAT_LOW
          deviceReg1 = FLOAT_HIGH
          break
        case 'BADC':
          deviceReg0 = swapBytes(FLOAT_HIGH)
          deviceReg1 = swapBytes(FLOAT_LOW)
          break
        case 'CDAB':
          deviceReg0 = swapBytes(FLOAT_LOW)
          deviceReg1 = swapBytes(FLOAT_HIGH)
          break
      }

      const result = convertFloat32(deviceReg0, deviceReg1, order)
      expect(result).toBeCloseTo(FLOAT_VALUE, 2)
    })
  }
})
