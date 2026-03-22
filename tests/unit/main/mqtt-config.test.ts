/**
 * mqtt-config.test.ts
 *
 * Tests for MQT-010/011/012:
 * - MQT-010: cleanSession flag is forwarded to mqtt.js `clean` option
 * - MQT-011: Will message (topic/payload/QoS/retain) is assembled correctly
 * - MQT-012: isRetained flag propagates from incoming packet → cache → readTags result
 */

import { MqttAdapter } from '@main/protocols/MqttAdapter'
import type { Connection, MqttConfig } from '@shared/types'
import type { IClientOptions } from 'mqtt'

// ── mqtt.js mock ─────────────────────────────────────────────────────────────

let capturedOptions: IClientOptions | undefined

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
  connect: jest.fn((url: string, opts: IClientOptions) => {
    capturedOptions = opts
    mockMqttClient.connected = true
    return mockMqttClient
  })
}))

// ── electron-log mock ────────────────────────────────────────────────────────

jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}))

// ── helpers ──────────────────────────────────────────────────────────────────

function makeConnection(partial: Partial<MqttConfig> = {}): Connection {
  return {
    id: 'test-mqtt-config',
    name: 'Test MQTT Config',
    protocol: 'mqtt',
    config: {
      brokerUrl: 'mqtt://localhost:1883',
      clientId: 'test-client',
      useTls: false,
      ...partial
    } satisfies MqttConfig,
    status: 'disconnected',
    createdAt: Date.now()
  }
}

/**
 * Drive adapter.connect() through the happy path.
 * The mock client fires the 'connect' once-handler immediately.
 */
async function connectAdapter(adapter: MqttAdapter): Promise<void> {
  mockMqttClient.once.mockImplementation((event: string, cb: () => void) => {
    if (event === 'connect') setTimeout(() => cb(), 0)
    return mockMqttClient
  })
  await adapter.connect()
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  capturedOptions = undefined
  mockMqttClient.connected = false
})

// ─────────────────────────────────────────────────────────────────────────────
// MQT-010: cleanSession
// ─────────────────────────────────────────────────────────────────────────────

describe('MQT-010: cleanSession', () => {
  it('defaults to clean=true when cleanSession is not set', async () => {
    const adapter = new MqttAdapter(makeConnection())
    await connectAdapter(adapter)

    expect(capturedOptions?.clean).toBe(true)
  })

  it('passes clean=true when cleanSession is explicitly true', async () => {
    const adapter = new MqttAdapter(makeConnection({ cleanSession: true }))
    await connectAdapter(adapter)

    expect(capturedOptions?.clean).toBe(true)
  })

  it('passes clean=false when cleanSession is explicitly false', async () => {
    const adapter = new MqttAdapter(makeConnection({ cleanSession: false }))
    await connectAdapter(adapter)

    expect(capturedOptions?.clean).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MQT-011: Will message
// ─────────────────────────────────────────────────────────────────────────────

describe('MQT-011: will message', () => {
  it('does not set will when willTopic is absent', async () => {
    const adapter = new MqttAdapter(makeConnection())
    await connectAdapter(adapter)

    expect(capturedOptions?.will).toBeUndefined()
  })

  it('assembles will with defaults when only willTopic is provided', async () => {
    const adapter = new MqttAdapter(makeConnection({ willTopic: 'status/offline' }))
    await connectAdapter(adapter)

    expect(capturedOptions?.will).toEqual({
      topic: 'status/offline',
      payload: Buffer.from(''),
      qos: 0,
      retain: false
    })
  })

  it('assembles will with all fields when fully specified', async () => {
    const adapter = new MqttAdapter(makeConnection({
      willTopic: 'status/offline',
      willPayload: '{"state":"offline"}',
      willQos: 1,
      willRetain: true
    }))
    await connectAdapter(adapter)

    expect(capturedOptions?.will).toEqual({
      topic: 'status/offline',
      payload: Buffer.from('{"state":"offline"}'),
      qos: 1,
      retain: true
    })
  })

  it('uses willQos=2 when specified', async () => {
    const adapter = new MqttAdapter(makeConnection({
      willTopic: 'device/status',
      willQos: 2
    }))
    await connectAdapter(adapter)

    expect(capturedOptions?.will?.qos).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MQT-012: isRetained flag
// ─────────────────────────────────────────────────────────────────────────────

describe('MQT-012: isRetained flag propagation', () => {
  /**
   * Simulate receiving an MQTT message by calling the 'message' handler
   * that was registered via client.on('message', ...).
   */
  function getMessageHandler(): (
    topic: string,
    payload: Buffer,
    packet: { retain: boolean }
  ) => void {
    // Find the call where event === 'message'
    const call = (mockMqttClient.on as jest.Mock).mock.calls.find(
      ([event]: [string]) => event === 'message'
    )
    if (!call) throw new Error('No message handler registered on client')
    return call[1]
  }

  it('stores isRetained=true in cache when broker sends a retained message', async () => {
    const adapter = new MqttAdapter(makeConnection())
    mockMqttClient.subscribe.mockImplementation(
      (_topics: unknown, cb: (err: null, granted: unknown[]) => void) => cb(null, [])
    )
    await connectAdapter(adapter)

    const messageHandler = getMessageHandler()

    // Simulate a retained message arriving
    messageHandler('sensors/temp', Buffer.from('25.5'), { retain: true })

    // readTags should reflect isRetained=true from cache
    const tag = {
      id: 'tag-retain',
      connectionId: 'test-mqtt-config',
      name: 'Temp',
      address: { type: 'mqtt' as const, topic: 'sensors/temp' },
      dataType: 'float32' as const,
      displayFormat: { decimals: 2, unit: '' },
      thresholds: {},
      enabled: true
    }
    const results = await adapter.readTags([tag])

    expect(results[0].isRetained).toBe(true)
    expect(results[0].value).toBe(25.5)
  })

  it('stores isRetained=false for normal (non-retained) messages', async () => {
    const adapter = new MqttAdapter(makeConnection())
    mockMqttClient.subscribe.mockImplementation(
      (_topics: unknown, cb: (err: null, granted: unknown[]) => void) => cb(null, [])
    )
    await connectAdapter(adapter)

    const messageHandler = getMessageHandler()

    // Simulate a normal (non-retained) message
    messageHandler('sensors/temp', Buffer.from('30'), { retain: false })

    const tag = {
      id: 'tag-normal',
      connectionId: 'test-mqtt-config',
      name: 'Temp',
      address: { type: 'mqtt' as const, topic: 'sensors/temp' },
      dataType: 'float32' as const,
      displayFormat: { decimals: 2, unit: '' },
      thresholds: {},
      enabled: true
    }
    const results = await adapter.readTags([tag])

    expect(results[0].isRetained).toBe(false)
  })

  it('readTags returns isRetained=true from cache after a retained message arrives', async () => {
    // Verifies the full path: retained message → raw topic cache → readTags result.
    // The raw topic cache is updated whenever a message arrives (no prior subscription
    // needed). readTags then reads this cache and surfaces isRetained.
    const adapter = new MqttAdapter(makeConnection())
    mockMqttClient.subscribe.mockImplementation(
      (_topics: unknown, cb: (err: null, granted: unknown[]) => void) => cb(null, [])
    )
    await connectAdapter(adapter)

    const messageHandler = getMessageHandler()

    // Deliver retained message BEFORE readTags, so cache is primed from raw entry
    messageHandler('sensors/humidity', Buffer.from('60'), { retain: true })

    const tag = {
      id: 'tag-emit',
      connectionId: 'test-mqtt-config',
      name: 'Humidity',
      address: { type: 'mqtt' as const, topic: 'sensors/humidity' },
      dataType: 'float32' as const,
      displayFormat: { decimals: 2, unit: '' },
      thresholds: {},
      enabled: true
    }

    // readTags will look up cache key 'sensors/humidity' — raw cache hit
    const results = await adapter.readTags([tag])
    expect(results[0].isRetained).toBe(true)
    expect(results[0].value).toBe(60)
  })
})
