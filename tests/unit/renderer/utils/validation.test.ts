import { describe, it, expect } from 'vitest'
import {
  isValidIPv4,
  isValidHostname,
  validateHost,
  validatePort,
  filterNumericInput,
} from '@shared/utils/validation'

describe('validation utilities', () => {
  describe('isValidIPv4', () => {
    it('returns true for valid IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.100')).toBe(true)
      expect(isValidIPv4('0.0.0.0')).toBe(true)
      expect(isValidIPv4('255.255.255.255')).toBe(true)
      expect(isValidIPv4('10.0.0.1')).toBe(true)
    })

    it('returns false for invalid IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.999')).toBe(false)
      expect(isValidIPv4('192.168.1')).toBe(false)
      expect(isValidIPv4('192.168.1.1.1')).toBe(false)
      expect(isValidIPv4('256.1.1.1')).toBe(false)
      expect(isValidIPv4('192.168.1.-1')).toBe(false)
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false)
      expect(isValidIPv4('192.168.01.1')).toBe(false) // Leading zero
    })
  })

  describe('isValidHostname', () => {
    it('returns true for valid hostnames', () => {
      expect(isValidHostname('localhost')).toBe(true)
      expect(isValidHostname('plc-01')).toBe(true)
      expect(isValidHostname('plc-01.local')).toBe(true)
      expect(isValidHostname('my-plc.factory.com')).toBe(true)
      expect(isValidHostname('PLC01')).toBe(true)
    })

    it('returns false for invalid hostnames', () => {
      expect(isValidHostname('-invalid')).toBe(false)
      expect(isValidHostname('invalid-')).toBe(false)
      expect(isValidHostname('inv@lid')).toBe(false)
      expect(isValidHostname('inv lid')).toBe(false)
      expect(isValidHostname('')).toBe(false)
      expect(isValidHostname('.invalid')).toBe(false)
    })
  })

  describe('validateHost', () => {
    it('returns valid for correct IP addresses', () => {
      expect(validateHost('192.168.1.100')).toEqual({ valid: true })
      expect(validateHost('10.0.0.1')).toEqual({ valid: true })
    })

    it('returns valid for correct hostnames', () => {
      expect(validateHost('localhost')).toEqual({ valid: true })
      expect(validateHost('plc-01.local')).toEqual({ valid: true })
    })

    it('returns error for empty input', () => {
      expect(validateHost('')).toEqual({ valid: false, error: 'Host is required' })
      expect(validateHost('   ')).toEqual({ valid: false, error: 'Host is required' })
    })

    it('returns error for invalid IP address', () => {
      const result = validateHost('192.168.1.999')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid IP address')
    })

    it('returns error for hostname starting with hyphen', () => {
      const result = validateHost('-invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot start with a hyphen')
    })
  })

  describe('validatePort', () => {
    it('returns valid for correct port numbers', () => {
      expect(validatePort('502')).toEqual({ valid: true })
      expect(validatePort('1')).toEqual({ valid: true })
      expect(validatePort('65535')).toEqual({ valid: true })
      expect(validatePort('1883')).toEqual({ valid: true })
    })

    it('returns error for empty input', () => {
      expect(validatePort('')).toEqual({ valid: false, error: 'Port is required' })
      expect(validatePort('   ')).toEqual({ valid: false, error: 'Port is required' })
    })

    it('returns error for non-numeric input', () => {
      expect(validatePort('abc')).toEqual({ valid: false, error: 'Port must be a number' })
      expect(validatePort('50a')).toEqual({ valid: false, error: 'Port must be a number' })
    })

    it('returns error for out of range ports', () => {
      expect(validatePort('0')).toEqual({ valid: false, error: 'Port must be between 1 and 65535' })
      expect(validatePort('70000')).toEqual({ valid: false, error: 'Port must be between 1 and 65535' })
      expect(validatePort('65536')).toEqual({ valid: false, error: 'Port must be between 1 and 65535' })
    })
  })

  describe('filterNumericInput', () => {
    it('removes non-numeric characters', () => {
      expect(filterNumericInput('abc')).toBe('')
      expect(filterNumericInput('123abc')).toBe('123')
      expect(filterNumericInput('12.34')).toBe('1234')
      expect(filterNumericInput('  502  ')).toBe('502')
    })

    it('keeps numeric characters', () => {
      expect(filterNumericInput('502')).toBe('502')
      expect(filterNumericInput('65535')).toBe('65535')
    })
  })
})
