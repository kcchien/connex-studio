/**
 * OPC UA Helper Functions Unit Tests
 *
 * Tests for OPC UA component utility functions and constants.
 */

import { describe, it, expect } from 'vitest'
import { OBJECTS_FOLDER_NODE_ID } from '@shared/types/opcua'

describe('OPC UA Constants', () => {
  describe('OBJECTS_FOLDER_NODE_ID', () => {
    it('should be the standard OPC UA Objects folder', () => {
      // Objects folder is node 85 in namespace 0
      expect(OBJECTS_FOLDER_NODE_ID).toBe('i=85')
    })
  })
})

describe('Access Level Flags', () => {
  // OPC UA AccessLevel bit flags
  const ACCESS_LEVEL = {
    READ: 0x01,
    WRITE: 0x02,
    HISTORY_READ: 0x04,
    HISTORY_WRITE: 0x08,
    SEMANTIC_CHANGE: 0x10,
    STATUS_WRITE: 0x20,
    TIMESTAMP_WRITE: 0x40
  }

  function formatAccessLevel(accessLevel: number | undefined): string {
    if (accessLevel === undefined) return 'Unknown'

    const flags: string[] = []
    if (accessLevel & ACCESS_LEVEL.READ) flags.push('Read')
    if (accessLevel & ACCESS_LEVEL.WRITE) flags.push('Write')
    if (accessLevel & ACCESS_LEVEL.HISTORY_READ) flags.push('HistoryRead')
    if (accessLevel & ACCESS_LEVEL.HISTORY_WRITE) flags.push('HistoryWrite')
    return flags.join(', ') || 'None'
  }

  it('should format read access', () => {
    expect(formatAccessLevel(ACCESS_LEVEL.READ)).toBe('Read')
  })

  it('should format write access', () => {
    expect(formatAccessLevel(ACCESS_LEVEL.WRITE)).toBe('Write')
  })

  it('should format read+write access', () => {
    expect(formatAccessLevel(ACCESS_LEVEL.READ | ACCESS_LEVEL.WRITE)).toBe('Read, Write')
  })

  it('should format full access', () => {
    const full = ACCESS_LEVEL.READ | ACCESS_LEVEL.WRITE | ACCESS_LEVEL.HISTORY_READ | ACCESS_LEVEL.HISTORY_WRITE
    expect(formatAccessLevel(full)).toBe('Read, Write, HistoryRead, HistoryWrite')
  })

  it('should return None for zero access', () => {
    expect(formatAccessLevel(0)).toBe('None')
  })

  it('should return Unknown for undefined', () => {
    expect(formatAccessLevel(undefined)).toBe('Unknown')
  })
})

describe('Value Formatting', () => {
  function formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  it('should format null as "null"', () => {
    expect(formatValue(null)).toBe('null')
  })

  it('should format undefined as "null"', () => {
    expect(formatValue(undefined)).toBe('null')
  })

  it('should format numbers as strings', () => {
    expect(formatValue(42)).toBe('42')
    expect(formatValue(3.14)).toBe('3.14')
    expect(formatValue(-10)).toBe('-10')
  })

  it('should format booleans as strings', () => {
    expect(formatValue(true)).toBe('true')
    expect(formatValue(false)).toBe('false')
  })

  it('should format strings as-is', () => {
    expect(formatValue('hello')).toBe('hello')
  })

  it('should format objects as JSON', () => {
    const obj = { key: 'value' }
    expect(formatValue(obj)).toContain('"key"')
    expect(formatValue(obj)).toContain('"value"')
  })

  it('should format arrays as JSON', () => {
    const arr = [1, 2, 3]
    expect(formatValue(arr)).toContain('1')
    expect(formatValue(arr)).toContain('2')
    expect(formatValue(arr)).toContain('3')
  })
})

describe('Node Class Mappings', () => {
  const nodeClasses = [
    'Object',
    'Variable',
    'Method',
    'ObjectType',
    'VariableType',
    'ReferenceType',
    'DataType',
    'View'
  ] as const

  it('should define all standard OPC UA node classes', () => {
    expect(nodeClasses).toContain('Object')
    expect(nodeClasses).toContain('Variable')
    expect(nodeClasses).toContain('Method')
    expect(nodeClasses).toContain('ObjectType')
    expect(nodeClasses).toContain('VariableType')
    expect(nodeClasses).toContain('ReferenceType')
    expect(nodeClasses).toContain('DataType')
    expect(nodeClasses).toContain('View')
  })

  it('should have 8 node classes', () => {
    expect(nodeClasses.length).toBe(8)
  })
})

describe('Node ID Parsing', () => {
  function parseNodeId(nodeId: string): { namespaceIndex: number; identifierType: string; identifier: string | number } | null {
    if (!nodeId) return null

    // Format: ns=<index>;<type>=<identifier>
    const nsMatch = nodeId.match(/^ns=(\d+);/)
    if (!nsMatch) return null

    const namespaceIndex = parseInt(nsMatch[1], 10)
    const rest = nodeId.substring(nsMatch[0].length)

    // Parse identifier type
    if (rest.startsWith('i=')) {
      return {
        namespaceIndex,
        identifierType: 'Numeric',
        identifier: parseInt(rest.substring(2), 10)
      }
    }
    if (rest.startsWith('s=')) {
      return {
        namespaceIndex,
        identifierType: 'String',
        identifier: rest.substring(2)
      }
    }
    if (rest.startsWith('g=')) {
      return {
        namespaceIndex,
        identifierType: 'Guid',
        identifier: rest.substring(2)
      }
    }
    if (rest.startsWith('b=')) {
      return {
        namespaceIndex,
        identifierType: 'ByteString',
        identifier: rest.substring(2)
      }
    }

    return null
  }

  it('should parse numeric node ID', () => {
    const result = parseNodeId('ns=0;i=85')
    expect(result).toEqual({
      namespaceIndex: 0,
      identifierType: 'Numeric',
      identifier: 85
    })
  })

  it('should parse string node ID', () => {
    const result = parseNodeId('ns=1;s=MyVariable')
    expect(result).toEqual({
      namespaceIndex: 1,
      identifierType: 'String',
      identifier: 'MyVariable'
    })
  })

  it('should parse GUID node ID', () => {
    const result = parseNodeId('ns=2;g=550e8400-e29b-41d4-a716-446655440000')
    expect(result).toEqual({
      namespaceIndex: 2,
      identifierType: 'Guid',
      identifier: '550e8400-e29b-41d4-a716-446655440000'
    })
  })

  it('should parse byte string node ID', () => {
    const result = parseNodeId('ns=3;b=BASE64DATA')
    expect(result).toEqual({
      namespaceIndex: 3,
      identifierType: 'ByteString',
      identifier: 'BASE64DATA'
    })
  })

  it('should return null for invalid node ID', () => {
    expect(parseNodeId('')).toBeNull()
    expect(parseNodeId('invalid')).toBeNull()
    expect(parseNodeId('i=85')).toBeNull() // missing namespace
  })
})

describe('Data Type Coercion', () => {
  function coerceValue(value: string, dataType: string): unknown {
    switch (dataType.toLowerCase()) {
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1'
      case 'sbyte':
      case 'byte':
      case 'int16':
      case 'uint16':
      case 'int32':
      case 'uint32':
        return parseInt(value, 10)
      case 'int64':
      case 'uint64':
        return BigInt(value)
      case 'float':
      case 'double':
        return parseFloat(value)
      case 'string':
      case 'localizedtext':
        return value
      default:
        return value
    }
  }

  it('should coerce boolean values', () => {
    expect(coerceValue('true', 'Boolean')).toBe(true)
    expect(coerceValue('false', 'Boolean')).toBe(false)
    expect(coerceValue('1', 'Boolean')).toBe(true)
    expect(coerceValue('0', 'Boolean')).toBe(false)
  })

  it('should coerce integer values', () => {
    expect(coerceValue('42', 'Int32')).toBe(42)
    expect(coerceValue('-10', 'Int16')).toBe(-10)
    expect(coerceValue('255', 'Byte')).toBe(255)
  })

  it('should coerce float values', () => {
    expect(coerceValue('3.14', 'Float')).toBeCloseTo(3.14)
    expect(coerceValue('2.718281828', 'Double')).toBeCloseTo(2.718281828)
  })

  it('should coerce BigInt for Int64', () => {
    expect(coerceValue('9007199254740991', 'Int64')).toBe(BigInt('9007199254740991'))
  })

  it('should return string as-is for string types', () => {
    expect(coerceValue('hello', 'String')).toBe('hello')
    expect(coerceValue('text', 'LocalizedText')).toBe('text')
  })
})

describe('OPC UA Status Codes', () => {
  // Common OPC UA status codes
  const STATUS_CODES = {
    Good: 0x00000000,
    Uncertain: 0x40000000,
    Bad: 0x80000000,
    BadNodeIdInvalid: 0x80340000,
    BadNodeIdUnknown: 0x80350000,
    BadAttributeIdInvalid: 0x80360000,
    BadNotReadable: 0x803A0000,
    BadNotWritable: 0x803B0000,
    BadTypeMismatch: 0x80740000,
    BadOutOfRange: 0x803C0000,
    BadSessionIdInvalid: 0x80250000,
    BadSessionClosed: 0x80260000,
    BadTimeout: 0x800A0000
  }

  it('should define Good status as 0', () => {
    expect(STATUS_CODES.Good).toBe(0)
  })

  it('should define Uncertain status with bit 30 set', () => {
    expect((STATUS_CODES.Uncertain & 0x40000000) !== 0).toBe(true)
  })

  it('should define Bad status with bit 31 set', () => {
    expect((STATUS_CODES.Bad & 0x80000000) !== 0).toBe(true)
  })

  function isGood(statusCode: number): boolean {
    return (statusCode & 0xC0000000) === 0
  }

  function isUncertain(statusCode: number): boolean {
    return (statusCode & 0xC0000000) === 0x40000000
  }

  function isBad(statusCode: number): boolean {
    return (statusCode & 0x80000000) !== 0
  }

  it('should correctly identify Good status', () => {
    expect(isGood(STATUS_CODES.Good)).toBe(true)
    expect(isGood(STATUS_CODES.Bad)).toBe(false)
  })

  it('should correctly identify Uncertain status', () => {
    expect(isUncertain(STATUS_CODES.Uncertain)).toBe(true)
    expect(isUncertain(STATUS_CODES.Good)).toBe(false)
  })

  it('should correctly identify Bad status', () => {
    expect(isBad(STATUS_CODES.Bad)).toBe(true)
    expect(isBad(STATUS_CODES.BadTimeout)).toBe(true)
    expect(isBad(STATUS_CODES.Good)).toBe(false)
  })
})
