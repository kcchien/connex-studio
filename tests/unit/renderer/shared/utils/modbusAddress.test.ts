import { describe, it, expect } from 'vitest'
import {
  parseTraditionalAddress,
  toTraditionalAddress,
  validateModbusAddress,
  getAddressDescription,
  isSameRegisterType,
  calculateRangeCount
} from '@shared/utils/modbusAddress'

describe('modbusAddress', () => {
  describe('parseTraditionalAddress', () => {
    it('parses holding register addresses (40001-49999)', () => {
      expect(parseTraditionalAddress('40001')).toEqual({
        registerType: 'holding',
        address: 0,
        traditional: 40001
      })

      expect(parseTraditionalAddress('40050')).toEqual({
        registerType: 'holding',
        address: 49,
        traditional: 40050
      })

      expect(parseTraditionalAddress('49999')).toEqual({
        registerType: 'holding',
        address: 9998,
        traditional: 49999
      })
    })

    it('parses input register addresses (30001-39999)', () => {
      expect(parseTraditionalAddress('30001')).toEqual({
        registerType: 'input',
        address: 0,
        traditional: 30001
      })

      expect(parseTraditionalAddress('30050')).toEqual({
        registerType: 'input',
        address: 49,
        traditional: 30050
      })
    })

    it('parses discrete input addresses (10001-19999)', () => {
      expect(parseTraditionalAddress('10001')).toEqual({
        registerType: 'discrete',
        address: 0,
        traditional: 10001
      })

      expect(parseTraditionalAddress('15000')).toEqual({
        registerType: 'discrete',
        address: 4999,
        traditional: 15000
      })
    })

    it('parses coil addresses (1-9999)', () => {
      expect(parseTraditionalAddress('1')).toEqual({
        registerType: 'coil',
        address: 0,
        traditional: 1
      })

      expect(parseTraditionalAddress('100')).toEqual({
        registerType: 'coil',
        address: 99,
        traditional: 100
      })

      expect(parseTraditionalAddress('9999')).toEqual({
        registerType: 'coil',
        address: 9998,
        traditional: 9999
      })
    })

    it('returns null for invalid addresses', () => {
      expect(parseTraditionalAddress('')).toBeNull()
      expect(parseTraditionalAddress('abc')).toBeNull()
      expect(parseTraditionalAddress('0')).toBeNull()
      expect(parseTraditionalAddress('50000')).toBeNull()
      expect(parseTraditionalAddress('25000')).toBeNull()
      expect(parseTraditionalAddress('-100')).toBeNull()
    })

    it('handles whitespace', () => {
      expect(parseTraditionalAddress('  40001  ')).toEqual({
        registerType: 'holding',
        address: 0,
        traditional: 40001
      })
    })
  })

  describe('toTraditionalAddress', () => {
    it('converts holding register to traditional', () => {
      expect(toTraditionalAddress('holding', 0)).toBe(40001)
      expect(toTraditionalAddress('holding', 99)).toBe(40100)
    })

    it('converts input register to traditional', () => {
      expect(toTraditionalAddress('input', 0)).toBe(30001)
      expect(toTraditionalAddress('input', 49)).toBe(30050)
    })

    it('converts discrete input to traditional', () => {
      expect(toTraditionalAddress('discrete', 0)).toBe(10001)
      expect(toTraditionalAddress('discrete', 100)).toBe(10101)
    })

    it('converts coil to traditional', () => {
      expect(toTraditionalAddress('coil', 0)).toBe(1)
      expect(toTraditionalAddress('coil', 99)).toBe(100)
    })
  })

  describe('validateModbusAddress', () => {
    it('validates correct addresses', () => {
      const result = validateModbusAddress('40001')
      expect(result.valid).toBe(true)
      expect(result.parsed).toEqual({
        registerType: 'holding',
        address: 0,
        traditional: 40001
      })
    })

    it('returns error for empty input', () => {
      const result = validateModbusAddress('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Address is required')
    })

    it('returns error for non-numeric input', () => {
      const result = validateModbusAddress('abc')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Address must contain only digits')
    })

    it('returns error for address too large', () => {
      const result = validateModbusAddress('50000')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Address too large (max 49999 for holding registers)')
    })

    it('returns error for invalid range (20000-30000)', () => {
      const result = validateModbusAddress('25000')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid range (20000-30000 is not a valid Modbus address range)')
    })
  })

  describe('getAddressDescription', () => {
    it('describes holding registers', () => {
      const parsed = parseTraditionalAddress('40001')!
      expect(getAddressDescription(parsed)).toBe('Holding Register, address 0')
    })

    it('describes input registers', () => {
      const parsed = parseTraditionalAddress('30050')!
      expect(getAddressDescription(parsed)).toBe('Input Register, address 49')
    })

    it('describes discrete inputs', () => {
      const parsed = parseTraditionalAddress('10001')!
      expect(getAddressDescription(parsed)).toBe('Discrete Input, address 0')
    })

    it('describes coils', () => {
      const parsed = parseTraditionalAddress('100')!
      expect(getAddressDescription(parsed)).toBe('Coil, address 99')
    })
  })

  describe('isSameRegisterType', () => {
    it('returns true for same type', () => {
      const addr1 = parseTraditionalAddress('40001')!
      const addr2 = parseTraditionalAddress('40100')!
      expect(isSameRegisterType(addr1, addr2)).toBe(true)
    })

    it('returns false for different types', () => {
      const addr1 = parseTraditionalAddress('40001')!
      const addr2 = parseTraditionalAddress('30001')!
      expect(isSameRegisterType(addr1, addr2)).toBe(false)
    })
  })

  describe('calculateRangeCount', () => {
    it('calculates range correctly', () => {
      const start = parseTraditionalAddress('40001')!
      const end = parseTraditionalAddress('40100')!
      expect(calculateRangeCount(start, end)).toBe(100)
    })

    it('returns 1 for same address', () => {
      const addr = parseTraditionalAddress('40001')!
      expect(calculateRangeCount(addr, addr)).toBe(1)
    })

    it('returns -1 for different register types', () => {
      const start = parseTraditionalAddress('40001')!
      const end = parseTraditionalAddress('30001')!
      expect(calculateRangeCount(start, end)).toBe(-1)
    })

    it('returns -1 for reversed range', () => {
      const start = parseTraditionalAddress('40100')!
      const end = parseTraditionalAddress('40001')!
      expect(calculateRangeCount(start, end)).toBe(-1)
    })
  })
})
