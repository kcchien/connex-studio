/**
 * MqttAdapter
 *
 * Protocol adapter for MQTT communication.
 * Uses mqtt.js library for all MQTT operations.
 *
 * Features:
 * - Connection management with TLS support
 * - Topic subscription with automatic value caching
 * - JSON payload parsing with jsonPath extraction
 * - Authentication (username/password)
 * - Automatic reconnection on failure
 */

import mqtt, { type MqttClient, type IClientOptions } from 'mqtt'
import log from 'electron-log/main.js'
import type {
  Connection,
  Tag,
  MqttConfig,
  MqttAddress,
  DataType
} from '@shared/types'
import { ProtocolAdapter, type ReadResult } from './ProtocolAdapter'

/**
 * Extract value from object using a simple dot-notation path.
 * Supports array indices like "data.values[0].temp"
 */
function extractJsonPath(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== 'object' || obj === null) {
    return obj
  }

  const parts = path.split(/\.|\[|\]/).filter((p) => p !== '')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Parse MQTT message payload to extract value.
 */
function parsePayload(
  payload: Buffer,
  jsonPath?: string,
  dataType?: DataType
): number | boolean | string {
  const text = payload.toString('utf8').trim()

  // If no jsonPath, try to parse as simple value
  if (!jsonPath) {
    return parseSimpleValue(text, dataType)
  }

  // Parse as JSON and extract path
  try {
    const json = JSON.parse(text)
    const extracted = extractJsonPath(json, jsonPath)
    return convertExtractedValue(extracted, dataType)
  } catch {
    log.warn(`[Mqtt] Failed to parse JSON payload: ${text.substring(0, 100)}`)
    return text
  }
}

/**
 * Parse a simple text value into the appropriate type.
 */
function parseSimpleValue(
  text: string,
  dataType?: DataType
): number | boolean | string {
  // Boolean detection
  const lowerText = text.toLowerCase()
  if (lowerText === 'true' || lowerText === '1' || lowerText === 'on') {
    return dataType === 'boolean' ? true : 1
  }
  if (lowerText === 'false' || lowerText === '0' || lowerText === 'off') {
    return dataType === 'boolean' ? false : 0
  }

  // Numeric detection
  const num = parseFloat(text)
  if (!isNaN(num)) {
    return num
  }

  // Default to string
  return text
}

/**
 * Convert extracted JSON value to the target data type.
 */
function convertExtractedValue(
  value: unknown,
  dataType?: DataType
): number | boolean | string {
  if (value === null || value === undefined) {
    return dataType === 'boolean' ? false : dataType === 'string' ? '' : 0
  }

  if (typeof value === 'boolean') {
    return dataType === 'boolean' ? value : value ? 1 : 0
  }

  if (typeof value === 'number') {
    return dataType === 'boolean' ? value !== 0 : value
  }

  if (typeof value === 'string') {
    return parseSimpleValue(value, dataType)
  }

  // Complex types - stringify
  return JSON.stringify(value)
}

/**
 * Cached value for a topic subscription.
 */
interface TopicCache {
  value: number | boolean | string
  timestamp: number
  quality: 'good' | 'bad' | 'uncertain'
}

export class MqttAdapter extends ProtocolAdapter {
  private client: MqttClient | null = null
  private config: MqttConfig
  private isDisposed = false
  private reconnectTimer: NodeJS.Timeout | null = null

  // Cache of last received values per topic
  private topicCache = new Map<string, TopicCache>()

  // Track subscribed topics
  private subscribedTopics = new Set<string>()

  // Map of tagId to topic for reverse lookup
  private tagTopicMap = new Map<string, string>()

  constructor(connection: Connection) {
    super(connection)

    if (connection.protocol !== 'mqtt') {
      throw new Error('MqttAdapter requires mqtt protocol')
    }

    this.config = connection.config as MqttConfig
  }

  /**
   * Connect to the MQTT broker.
   */
  async connect(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Adapter has been disposed')
    }

    if (this.client && this.client.connected) {
      log.info('[Mqtt] Already connected')
      return
    }

    this.setStatus('connecting')
    log.info(`[Mqtt] Connecting to ${this.config.brokerUrl}`)

    return new Promise((resolve, reject) => {
      const options: IClientOptions = {
        clientId: this.config.clientId,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        rejectUnauthorized: this.config.useTls
      }

      // Add authentication if provided
      if (this.config.username) {
        options.username = this.config.username
      }
      if (this.config.password) {
        options.password = this.config.password
      }

      // Add CA certificate for TLS
      if (this.config.useTls && this.config.caCert) {
        options.ca = this.config.caCert
      }

      try {
        this.client = mqtt.connect(this.config.brokerUrl, options)

        const onConnect = () => {
          this.client?.removeListener('error', onError)
          this.setStatus('connected')
          log.info(`[Mqtt] Connected to ${this.config.brokerUrl}`)

          // Resubscribe to all tracked topics
          this.resubscribeAll()

          resolve()
        }

        const onError = (error: Error) => {
          this.client?.removeListener('connect', onConnect)
          const message = error.message || 'Connection failed'
          this.setStatus('error', message)
          log.error(`[Mqtt] Connection failed: ${message}`)
          reject(error)
        }

        this.client.once('connect', onConnect)
        this.client.once('error', onError)

        // Set up persistent event handlers
        this.setupEventHandlers()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.setStatus('error', message)
        log.error(`[Mqtt] Connection error: ${message}`)
        reject(error)
      }
    })
  }

  /**
   * Set up persistent event handlers for the MQTT client.
   */
  private setupEventHandlers(): void {
    if (!this.client) return

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload)
    })

    this.client.on('reconnect', () => {
      log.info('[Mqtt] Attempting reconnection...')
      this.setStatus('connecting')
    })

    this.client.on('close', () => {
      if (!this.isDisposed) {
        log.info('[Mqtt] Connection closed')
        this.setStatus('disconnected')
      }
    })

    this.client.on('offline', () => {
      log.info('[Mqtt] Client offline')
      this.setStatus('disconnected')
    })

    this.client.on('error', (error) => {
      log.error(`[Mqtt] Error: ${error.message}`)
      this.setStatus('error', error.message)
      this.emit('error', error)
    })
  }

  /**
   * Handle incoming MQTT message.
   */
  private handleMessage(topic: string, payload: Buffer): void {
    const timestamp = Date.now()

    try {
      // Find tags that match this topic
      const matchingTags = this.findTagsForTopic(topic)

      for (const tag of matchingTags) {
        const address = tag.address as MqttAddress
        const value = parsePayload(payload, address.jsonPath, tag.dataType)

        // Update cache for this tag's topic+jsonPath combination
        const cacheKey = this.getCacheKey(topic, address.jsonPath)
        this.topicCache.set(cacheKey, {
          value,
          timestamp,
          quality: 'good'
        })

        // Emit data received event
        this.emit('data-received', [
          {
            tagId: tag.id,
            value,
            quality: 'good',
            timestamp
          }
        ])
      }

      // Also cache the raw topic value (no jsonPath)
      const rawValue = parsePayload(payload, undefined, undefined)
      this.topicCache.set(topic, {
        value: rawValue,
        timestamp,
        quality: 'good'
      })
    } catch (error) {
      log.warn(`[Mqtt] Error processing message on ${topic}: ${error}`)
    }
  }

  /**
   * Find tags that are subscribed to the given topic.
   */
  private findTagsForTopic(topic: string): Tag[] {
    const tags: Tag[] = []

    for (const [tagId, subscribedTopic] of this.tagTopicMap) {
      if (this.topicMatches(topic, subscribedTopic)) {
        // We need to get the tag somehow - for now track by ID
        // In practice, tags are passed to readTags which stores them
        tags.push({ id: tagId } as Tag)
      }
    }

    return tags
  }

  /**
   * Check if a topic matches a subscription pattern (including wildcards).
   */
  private topicMatches(topic: string, pattern: string): boolean {
    // Exact match
    if (topic === pattern) return true

    // Handle wildcards
    const topicParts = topic.split('/')
    const patternParts = pattern.split('/')

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]

      // Multi-level wildcard - matches rest
      if (patternPart === '#') {
        return true
      }

      // Single-level wildcard
      if (patternPart === '+') {
        if (i >= topicParts.length) return false
        continue
      }

      // Exact match required
      if (i >= topicParts.length || patternPart !== topicParts[i]) {
        return false
      }
    }

    return topicParts.length === patternParts.length
  }

  /**
   * Get cache key for a topic + jsonPath combination.
   */
  private getCacheKey(topic: string, jsonPath?: string): string {
    return jsonPath ? `${topic}::${jsonPath}` : topic
  }

  /**
   * Disconnect from the MQTT broker.
   */
  async disconnect(): Promise<void> {
    this.cancelReconnect()

    return new Promise((resolve) => {
      if (!this.client) {
        this.setStatus('disconnected')
        resolve()
        return
      }

      this.client.end(false, {}, () => {
        log.info('[Mqtt] Disconnected')
        this.setStatus('disconnected')
        this.client = null
        resolve()
      })
    })
  }

  /**
   * Read values from multiple tags.
   * For MQTT, this returns cached values from subscriptions.
   */
  async readTags(tags: Tag[]): Promise<ReadResult[]> {
    const results: ReadResult[] = []
    const timestamp = Date.now()

    // Ensure we're subscribed to all tag topics
    await this.ensureSubscriptions(tags)

    for (const tag of tags) {
      if (!tag.enabled) continue

      const address = tag.address as MqttAddress
      if (address.type !== 'mqtt') {
        log.warn(`[Mqtt] Invalid address type for tag ${tag.name}: ${address.type}`)
        results.push({
          tagId: tag.id,
          value: 0,
          quality: 'bad',
          timestamp
        })
        continue
      }

      // Get cached value
      const cacheKey = this.getCacheKey(address.topic, address.jsonPath)
      const cached = this.topicCache.get(cacheKey)

      if (cached) {
        results.push({
          tagId: tag.id,
          value: cached.value,
          quality: cached.quality,
          timestamp: cached.timestamp
        })
      } else {
        // No cached value yet - return uncertain quality
        results.push({
          tagId: tag.id,
          value: 0,
          quality: 'uncertain',
          timestamp
        })
      }
    }

    return results
  }

  /**
   * Ensure all tags have active subscriptions.
   */
  private async ensureSubscriptions(tags: Tag[]): Promise<void> {
    if (!this.client || !this.client.connected) return

    const newTopics: string[] = []

    for (const tag of tags) {
      if (!tag.enabled) continue

      const address = tag.address as MqttAddress
      if (address.type !== 'mqtt') continue

      const topic = address.topic

      // Track tag -> topic mapping
      this.tagTopicMap.set(tag.id, topic)

      // Check if already subscribed
      if (!this.subscribedTopics.has(topic)) {
        newTopics.push(topic)
        this.subscribedTopics.add(topic)
      }
    }

    // Subscribe to new topics
    if (newTopics.length > 0) {
      await this.subscribeToTopics(newTopics)
    }
  }

  /**
   * Subscribe to a list of topics.
   */
  private async subscribeToTopics(topics: string[]): Promise<void> {
    if (!this.client || !this.client.connected) return

    return new Promise((resolve, reject) => {
      const topicObj: Record<string, { qos: 0 | 1 | 2 }> = {}
      for (const topic of topics) {
        topicObj[topic] = { qos: 1 }
      }

      this.client!.subscribe(topicObj, (error, granted) => {
        if (error) {
          log.error(`[Mqtt] Subscribe error: ${error.message}`)
          reject(error)
        } else {
          const topicList = granted?.map((g) => g.topic).join(', ') || topics.join(', ')
          log.info(`[Mqtt] Subscribed to: ${topicList}`)
          resolve()
        }
      })
    })
  }

  /**
   * Resubscribe to all tracked topics after reconnection.
   */
  private resubscribeAll(): void {
    if (this.subscribedTopics.size > 0) {
      const topics = Array.from(this.subscribedTopics)
      this.subscribeToTopics(topics).catch((error) => {
        log.error(`[Mqtt] Resubscribe failed: ${error}`)
      })
    }
  }

  /**
   * Cancel any pending reconnection attempt.
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Cleanup resources when adapter is destroyed.
   */
  async dispose(): Promise<void> {
    this.isDisposed = true
    this.cancelReconnect()
    await this.disconnect()
    this.topicCache.clear()
    this.subscribedTopics.clear()
    this.tagTopicMap.clear()
    this.removeAllListeners()
    log.info('[Mqtt] Adapter disposed')
  }
}

/**
 * Factory function for MqttAdapter.
 */
export function createMqttAdapter(connection: Connection): MqttAdapter {
  return new MqttAdapter(connection)
}

/**
 * Parse an MQTT address string.
 * Format: topic or topic::jsonPath
 */
export function parseMqttAddress(addressStr: string): MqttAddress {
  const parts = addressStr.split('::')
  const topic = parts[0].trim()
  const jsonPath = parts.length > 1 ? parts[1].trim() : undefined

  if (!topic) {
    throw new Error('MQTT topic cannot be empty')
  }

  return {
    type: 'mqtt',
    topic,
    jsonPath
  }
}
