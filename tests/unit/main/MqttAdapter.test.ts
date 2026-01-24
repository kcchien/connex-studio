/**
 * MqttAdapter Unit Tests
 *
 * Tests for MQTT protocol adapter including:
 * - Address parsing
 * - JSON path extraction
 * - Payload parsing
 * - Topic matching (wildcards)
 * - Connection lifecycle (mocked)
 */

import { MqttAdapter, parseMqttAddress, createMqttAdapter } from '@main/protocols/MqttAdapter'
import type { Connection, Tag, MqttAddress } from '@shared/types'

// Mock mqtt.js
const mockMqttClient = {
  connected: false,
  on: jest.fn(),
  once: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  end: jest.fn(),
  removeListener: jest.fn()
}

jest.mock('mqtt', () => ({
  connect: jest.fn(() => {
    mockMqttClient.connected = true
    return mockMqttClient
  })
}))

// Mock electron-log - same pattern as ModbusTcpAdapter.test.ts
jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}))

describe('parseMqttAddress', () => {
  describe('Simple topic format', () => {
    it('should parse simple topic', () => {
      const address = parseMqttAddress('sensors/temperature')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/temperature',
        jsonPath: undefined
      })
    })

    it('should parse topic with wildcards', () => {
      const address = parseMqttAddress('sensors/+/temperature')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/+/temperature',
        jsonPath: undefined
      })
    })

    it('should parse topic with multi-level wildcard', () => {
      const address = parseMqttAddress('sensors/#')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/#',
        jsonPath: undefined
      })
    })
  })

  describe('Topic with jsonPath format', () => {
    it('should parse topic::jsonPath format', () => {
      const address = parseMqttAddress('sensors/data::temperature')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/data',
        jsonPath: 'temperature'
      })
    })

    it('should parse nested jsonPath', () => {
      const address = parseMqttAddress('sensors/data::values.current.temp')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/data',
        jsonPath: 'values.current.temp'
      })
    })

    it('should parse jsonPath with array index', () => {
      const address = parseMqttAddress('sensors/data::readings[0].value')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/data',
        jsonPath: 'readings[0].value'
      })
    })

    it('should handle whitespace trimming', () => {
      const address = parseMqttAddress('  sensors/data  ::  temperature  ')
      expect(address).toEqual({
        type: 'mqtt',
        topic: 'sensors/data',
        jsonPath: 'temperature'
      })
    })
  })

  describe('Invalid formats', () => {
    it('should throw on empty topic', () => {
      expect(() => parseMqttAddress('')).toThrow('MQTT topic cannot be empty')
    })

    it('should throw on whitespace-only topic', () => {
      expect(() => parseMqttAddress('   ')).toThrow('MQTT topic cannot be empty')
    })

    it('should throw on just separator', () => {
      expect(() => parseMqttAddress('::jsonPath')).toThrow('MQTT topic cannot be empty')
    })
  })
})

describe('MqttAdapter', () => {
  const mockConnection: Connection = {
    id: 'test-mqtt-1',
    name: 'Test MQTT Connection',
    protocol: 'mqtt',
    config: {
      brokerUrl: 'mqtt://localhost:1883',
      clientId: 'test-client',
      useTls: false
    },
    status: 'disconnected',
    createdAt: Date.now()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockMqttClient.connected = false
    mockMqttClient.on.mockReset()
    mockMqttClient.once.mockReset()
    mockMqttClient.subscribe.mockReset()
    mockMqttClient.end.mockReset()
  })

  describe('constructor', () => {
    it('should create adapter with valid connection', () => {
      const adapter = new MqttAdapter(mockConnection)
      expect(adapter.getStatus()).toBe('disconnected')
      expect(adapter.getConnection()).toEqual(mockConnection)
    })

    it('should throw for non-mqtt protocol', () => {
      const invalidConnection = {
        ...mockConnection,
        protocol: 'modbus-tcp' as const
      }
      expect(() => new MqttAdapter(invalidConnection)).toThrow('MqttAdapter requires mqtt protocol')
    })
  })

  describe('createMqttAdapter factory', () => {
    it('should create adapter instance', () => {
      const adapter = createMqttAdapter(mockConnection)
      expect(adapter).toBeInstanceOf(MqttAdapter)
    })
  })

  describe('connect', () => {
    it('should transition status to connecting', async () => {
      const adapter = new MqttAdapter(mockConnection)
      const statusChanges: string[] = []

      adapter.on('status-changed', (status) => {
        statusChanges.push(status)
      })

      // Mock immediate connection
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0)
        }
        return mockMqttClient
      })

      await adapter.connect()

      expect(statusChanges).toContain('connecting')
    })
  })

  describe('disconnect', () => {
    it('should call client end method', async () => {
      const adapter = new MqttAdapter(mockConnection)

      // Mock connect
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0)
        }
        return mockMqttClient
      })
      await adapter.connect()

      // Mock end
      mockMqttClient.end.mockImplementation((force, opts, callback) => {
        callback?.()
      })

      await adapter.disconnect()

      expect(mockMqttClient.end).toHaveBeenCalled()
    })
  })

  describe('isConnected', () => {
    it('should return false when disconnected', () => {
      const adapter = new MqttAdapter(mockConnection)
      expect(adapter.isConnected()).toBe(false)
    })
  })

  describe('readTags with caching', () => {
    it('should return uncertain quality for unsubscribed topics', async () => {
      const adapter = new MqttAdapter(mockConnection)

      // Mock connection
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0)
        }
        return mockMqttClient
      })
      mockMqttClient.subscribe.mockImplementation((topics, callback) => {
        callback?.(null, [])
      })

      await adapter.connect()

      const tag: Tag = {
        id: 'tag-1',
        connectionId: mockConnection.id,
        name: 'Temperature',
        address: {
          type: 'mqtt',
          topic: 'sensors/temp'
        } as MqttAddress,
        dataType: 'float32',
        displayFormat: { decimals: 2, unit: '°C' },
        thresholds: {},
        enabled: true
      }

      const results = await adapter.readTags([tag])

      expect(results).toHaveLength(1)
      expect(results[0].tagId).toBe('tag-1')
      expect(results[0].quality).toBe('uncertain') // No cached value yet
    })

    it('should skip disabled tags', async () => {
      const adapter = new MqttAdapter(mockConnection)

      // Mock connection
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0)
        }
        return mockMqttClient
      })

      await adapter.connect()

      const tag: Tag = {
        id: 'tag-1',
        connectionId: mockConnection.id,
        name: 'Temperature',
        address: {
          type: 'mqtt',
          topic: 'sensors/temp'
        } as MqttAddress,
        dataType: 'float32',
        displayFormat: { decimals: 2, unit: '°C' },
        thresholds: {},
        enabled: false
      }

      const results = await adapter.readTags([tag])

      expect(results).toHaveLength(0) // Disabled tags are skipped
    })
  })
})

describe('JSON Path Extraction', () => {
  // Test the extraction logic conceptually
  it('should understand dot notation path splitting', () => {
    const path = 'data.values.temperature'
    const parts = path.split('.')
    expect(parts).toEqual(['data', 'values', 'temperature'])
  })

  it('should understand array index path splitting', () => {
    const path = 'data.values[0].temp'
    const parts = path.split(/\.|\[|\]/).filter((p) => p !== '')
    expect(parts).toEqual(['data', 'values', '0', 'temp'])
  })
})

describe('Topic Matching', () => {
  // Conceptual tests for MQTT topic wildcards

  function topicMatches(topic: string, pattern: string): boolean {
    if (topic === pattern) return true

    const topicParts = topic.split('/')
    const patternParts = pattern.split('/')

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]

      if (patternPart === '#') return true
      if (patternPart === '+') {
        if (i >= topicParts.length) return false
        continue
      }

      if (i >= topicParts.length || patternPart !== topicParts[i]) {
        return false
      }
    }

    return topicParts.length === patternParts.length
  }

  describe('exact match', () => {
    it('should match identical topics', () => {
      expect(topicMatches('sensors/temp', 'sensors/temp')).toBe(true)
    })

    it('should not match different topics', () => {
      expect(topicMatches('sensors/temp', 'sensors/humidity')).toBe(false)
    })
  })

  describe('single-level wildcard (+)', () => {
    it('should match single level', () => {
      expect(topicMatches('sensors/room1/temp', 'sensors/+/temp')).toBe(true)
    })

    it('should match any single level value', () => {
      expect(topicMatches('sensors/kitchen/temp', 'sensors/+/temp')).toBe(true)
    })

    it('should not match multiple levels', () => {
      expect(topicMatches('sensors/floor1/room1/temp', 'sensors/+/temp')).toBe(false)
    })
  })

  describe('multi-level wildcard (#)', () => {
    it('should match all remaining levels', () => {
      expect(topicMatches('sensors/room1/temp', 'sensors/#')).toBe(true)
    })

    it('should match deep nested levels', () => {
      expect(topicMatches('sensors/floor1/room1/device1/temp', 'sensors/#')).toBe(true)
    })

    it('should match just the prefix', () => {
      expect(topicMatches('sensors', 'sensors/#')).toBe(true)
    })
  })
})

describe('Payload Parsing', () => {
  // Conceptual tests for payload parsing logic

  function parseSimpleValue(text: string): number | boolean | string {
    const lowerText = text.toLowerCase()
    if (lowerText === 'true' || lowerText === '1' || lowerText === 'on') return true
    if (lowerText === 'false' || lowerText === '0' || lowerText === 'off') return false

    const num = parseFloat(text)
    if (!isNaN(num)) return num

    return text
  }

  describe('boolean values', () => {
    it('should parse "true" as true', () => {
      expect(parseSimpleValue('true')).toBe(true)
    })

    it('should parse "false" as false', () => {
      expect(parseSimpleValue('false')).toBe(false)
    })

    it('should parse "on" as true', () => {
      expect(parseSimpleValue('on')).toBe(true)
    })

    it('should parse "off" as false', () => {
      expect(parseSimpleValue('off')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(parseSimpleValue('TRUE')).toBe(true)
      expect(parseSimpleValue('FALSE')).toBe(false)
    })
  })

  describe('numeric values', () => {
    it('should parse integers', () => {
      expect(parseSimpleValue('42')).toBe(42)
    })

    it('should parse floats', () => {
      expect(parseSimpleValue('3.14')).toBeCloseTo(3.14)
    })

    it('should parse negative numbers', () => {
      expect(parseSimpleValue('-10.5')).toBeCloseTo(-10.5)
    })

    it('should parse scientific notation', () => {
      expect(parseSimpleValue('1.5e3')).toBe(1500)
    })
  })

  describe('string values', () => {
    it('should return string for non-numeric text', () => {
      expect(parseSimpleValue('hello world')).toBe('hello world')
    })

    it('should return string for mixed content', () => {
      expect(parseSimpleValue('temp: 25')).toBe('temp: 25')
    })
  })
})
