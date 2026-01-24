/**
 * Bridge Manager Service
 *
 * Manages data bridges that forward tag values from source connections
 * to target connections (e.g., Modbus to MQTT).
 * Supports change-only forwarding, local buffering, and auto-resume.
 */

import { EventEmitter } from 'events'
import log from 'electron-log/main.js'
import type {
  Bridge,
  BridgeStatus,
  BridgeStats,
  CreateBridgeRequest,
  UpdateBridgeRequest,
  Tag,
  ConnectionStatus
} from '@shared/types'
import { DEFAULT_BRIDGE_OPTIONS } from '@shared/types'
import { resolveTopic, resolvePayload, type TemplateContext } from './PayloadTemplateEngine'
import { getConnectionManager, type ConnectionManager } from './ConnectionManager'

/**
 * Events emitted by BridgeManager.
 */
export interface BridgeManagerEvents {
  'status-changed': (bridgeId: string, status: BridgeStatus) => void
  'error': (bridgeId: string, error: string) => void
  'stats': (stats: BridgeStats) => void
}

/**
 * Buffered message for when target is unavailable.
 */
interface BufferedMessage {
  timestamp: number
  topic: string
  payload: string
  tagId: string
}

/**
 * Runtime state for an active bridge.
 */
interface BridgeRuntime {
  bridge: Bridge
  intervalId?: NodeJS.Timeout
  startedAt: number
  stats: BridgeStats
  lastValues: Map<string, unknown>
  buffer: BufferedMessage[]
  isTargetAvailable: boolean
  pendingResume: boolean
}

/**
 * Bridge Manager handles CRUD operations and runtime management
 * for data bridges.
 */
export class BridgeManager extends EventEmitter {
  private bridges: Map<string, Bridge> = new Map()
  private runtimes: Map<string, BridgeRuntime> = new Map()
  private connectionManager: ConnectionManager | null = null
  private connectionStatusHandler: ((payload: { connectionId: string; status: ConnectionStatus }) => void) | null = null

  constructor() {
    super()
  }

  /**
   * Set dependencies (for late binding to avoid circular deps).
   */
  setDependencies(connMgr: ConnectionManager): void {
    this.connectionManager = connMgr

    // Listen for connection status changes for auto-resume
    this.connectionStatusHandler = (payload) => {
      this.handleConnectionStatusChange(payload.connectionId, payload.status)
    }
  }

  /**
   * Initialize the manager, loading bridges from storage.
   */
  async initialize(): Promise<void> {
    // TODO: Load bridges from profile storage
  }

  /**
   * List all bridges.
   */
  list(): Bridge[] {
    return Array.from(this.bridges.values())
  }

  /**
   * Get bridge by ID.
   */
  get(id: string): Bridge | null {
    return this.bridges.get(id) ?? null
  }

  /**
   * Create a new bridge.
   */
  async create(request: CreateBridgeRequest): Promise<Bridge> {
    const bridge: Bridge = {
      id: crypto.randomUUID(),
      name: request.name,
      sourceConnectionId: request.sourceConnectionId,
      sourceTags: request.sourceTags,
      targetConnectionId: request.targetConnectionId,
      targetConfig: request.targetConfig,
      options: {
        ...DEFAULT_BRIDGE_OPTIONS,
        ...request.options
      },
      status: 'idle',
      createdAt: Date.now()
    }

    this.bridges.set(bridge.id, bridge)
    // TODO: Persist to profile storage
    return bridge
  }

  /**
   * Update an existing bridge.
   */
  async update(request: UpdateBridgeRequest): Promise<Bridge> {
    const existing = this.bridges.get(request.id)
    if (!existing) {
      throw new Error(`Bridge not found: ${request.id}`)
    }

    // Cannot update while running
    if (existing.status === 'active') {
      throw new Error('Cannot update bridge while active. Stop it first.')
    }

    const updated: Bridge = {
      ...existing,
      name: request.name ?? existing.name,
      sourceTags: request.sourceTags ?? existing.sourceTags,
      targetConfig: request.targetConfig
        ? { ...existing.targetConfig, ...request.targetConfig }
        : existing.targetConfig,
      options: request.options
        ? { ...existing.options, ...request.options }
        : existing.options
    }

    this.bridges.set(updated.id, updated)
    // TODO: Persist to profile storage
    return updated
  }

  /**
   * Delete a bridge.
   */
  async delete(id: string): Promise<boolean> {
    const bridge = this.bridges.get(id)
    if (!bridge) {
      return false
    }

    // Stop if running
    if (bridge.status === 'active' || bridge.status === 'paused') {
      await this.stop(id)
    }

    this.bridges.delete(id)
    // TODO: Persist to profile storage
    return true
  }

  /**
   * Start forwarding for a bridge.
   */
  async start(id: string): Promise<boolean> {
    const bridge = this.bridges.get(id)
    if (!bridge) {
      throw new Error(`Bridge not found: ${id}`)
    }

    if (bridge.status === 'active') {
      return true // Already running
    }

    // Check target connection availability
    const isTargetAvailable = this.checkTargetAvailable(bridge.targetConnectionId)

    // Create runtime state
    const runtime: BridgeRuntime = {
      bridge,
      startedAt: Date.now(),
      stats: {
        bridgeId: id,
        status: 'active',
        messagesForwarded: 0,
        messagesDropped: 0,
        bytesTransferred: 0,
        errorCount: 0,
        uptime: 0
      },
      lastValues: new Map(),
      buffer: [],
      isTargetAvailable,
      pendingResume: false
    }

    // Start polling interval for forwarding
    runtime.intervalId = setInterval(() => {
      this.forwardData(id).catch((err) => {
        log.error(`[Bridge] Forward error for ${id}: ${err}`)
        this.incrementError(id, String(err))
      })
    }, bridge.options.interval)

    this.runtimes.set(id, runtime)
    this.updateStatus(id, 'active')

    log.info(`[Bridge] Started bridge ${bridge.name} (${id})`)
    return true
  }

  /**
   * Stop forwarding for a bridge.
   */
  async stop(id: string): Promise<boolean> {
    const runtime = this.runtimes.get(id)
    if (!runtime) {
      return false
    }

    if (runtime.intervalId) {
      clearInterval(runtime.intervalId)
    }

    this.runtimes.delete(id)
    this.updateStatus(id, 'idle')

    return true
  }

  /**
   * Pause forwarding (keeps runtime state).
   */
  async pause(id: string): Promise<boolean> {
    const runtime = this.runtimes.get(id)
    if (!runtime || runtime.bridge.status !== 'active') {
      return false
    }

    if (runtime.intervalId) {
      clearInterval(runtime.intervalId)
      runtime.intervalId = undefined
    }

    this.updateStatus(id, 'paused')
    return true
  }

  /**
   * Resume forwarding from paused state.
   */
  async resume(id: string): Promise<boolean> {
    const runtime = this.runtimes.get(id)
    if (!runtime || runtime.bridge.status !== 'paused') {
      return false
    }

    // Restart polling interval
    runtime.intervalId = setInterval(() => {
      this.forwardData(id).catch((err) => {
        log.error(`[Bridge] Forward error for ${id}: ${err}`)
        this.incrementError(id, String(err))
      })
    }, runtime.bridge.options.interval)

    // Flush buffered messages if target is now available
    if (runtime.isTargetAvailable && runtime.buffer.length > 0) {
      await this.flushBuffer(id)
    }

    this.updateStatus(id, 'active')
    log.info(`[Bridge] Resumed bridge ${runtime.bridge.name} (${id})`)
    return true
  }

  /**
   * Get statistics for a bridge.
   */
  getStats(id: string): BridgeStats | null {
    const runtime = this.runtimes.get(id)
    if (!runtime) {
      const bridge = this.bridges.get(id)
      if (!bridge) return null

      return {
        bridgeId: id,
        status: bridge.status,
        messagesForwarded: 0,
        messagesDropped: 0,
        bytesTransferred: 0,
        errorCount: 0,
        uptime: 0
      }
    }

    return { ...runtime.stats }
  }

  /**
   * Update bridge status and emit event.
   */
  private updateStatus(id: string, status: BridgeStatus): void {
    const bridge = this.bridges.get(id)
    if (!bridge) return

    bridge.status = status
    this.emit('status-changed', id, status)
  }

  /**
   * Forward data for a bridge.
   * Reads tag values, applies change detection, and publishes to target.
   */
  private async forwardData(id: string): Promise<void> {
    const runtime = this.runtimes.get(id)
    if (!runtime || runtime.bridge.status !== 'active') {
      return
    }

    const { bridge } = runtime
    const timestamp = Date.now()

    // Get all tag values
    const tagValues = await this.getTagValues(bridge.sourceConnectionId, bridge.sourceTags)

    for (const [tagId, tagData] of tagValues) {
      const { tag, value, quality } = tagData

      // Apply change-only filter if enabled
      if (bridge.options.changeOnly) {
        if (!this.hasValueChanged(runtime, tagId, value, bridge.options.changeThreshold)) {
          continue // Skip unchanged values
        }
      }

      // Store last value for change detection
      runtime.lastValues.set(tagId, value)

      // Build template context
      const context: TemplateContext = {
        value,
        timestamp,
        tagName: tag.name,
        connectionId: bridge.sourceConnectionId,
        tag,
        tags: Object.fromEntries(
          Array.from(tagValues.entries()).map(([id, data]) => [
            data.tag.name,
            { value: data.value, quality: data.quality }
          ])
        )
      }

      // Resolve templates
      const topic = resolveTopic(bridge.targetConfig.topicTemplate, context)
      const payloadResult = resolvePayload(bridge.targetConfig.payloadTemplate, context)

      if (!payloadResult.success) {
        this.incrementError(id, payloadResult.error ?? 'Payload resolution failed')
        continue
      }

      // Check target availability
      if (!runtime.isTargetAvailable) {
        // Buffer the message
        this.bufferMessage(runtime, topic, payloadResult.resolved, tagId)
        continue
      }

      // Publish to target
      try {
        await this.publishToTarget(
          bridge.targetConnectionId,
          topic,
          payloadResult.resolved,
          bridge.targetConfig.qos,
          bridge.targetConfig.retain
        )

        // Update stats
        runtime.stats.messagesForwarded++
        runtime.stats.bytesTransferred += payloadResult.resolved.length
        runtime.stats.lastForwardedAt = timestamp
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.incrementError(id, errorMsg)

        // Mark target as unavailable and buffer
        runtime.isTargetAvailable = false
        this.bufferMessage(runtime, topic, payloadResult.resolved, tagId)
      }
    }

    // Update uptime
    runtime.stats.uptime = timestamp - runtime.startedAt
    runtime.stats.status = bridge.status

    // Emit stats update
    this.emit('stats', { ...runtime.stats })
  }

  /**
   * Get tag values from source connection.
   */
  private async getTagValues(
    connectionId: string,
    tagIds: string[]
  ): Promise<Map<string, { tag: Tag; value: unknown; quality: string }>> {
    const results = new Map<string, { tag: Tag; value: unknown; quality: string }>()

    if (!this.connectionManager) {
      return results
    }

    // Get the adapter to read current tag values
    const adapter = this.connectionManager.getAdapter(connectionId)
    if (!adapter || !adapter.isConnected()) {
      return results
    }

    // Collect tags to read
    const tagsToRead: Tag[] = []
    for (const tagId of tagIds) {
      const tag = this.connectionManager.getTag(tagId)
      if (tag) {
        tagsToRead.push(tag)
      }
    }

    if (tagsToRead.length === 0) {
      return results
    }

    // Read tag values from adapter
    try {
      const readResults = await adapter.readTags(tagsToRead)
      for (let i = 0; i < tagsToRead.length; i++) {
        const tag = tagsToRead[i]
        const readResult = readResults[i]
        // ReadResult always has value, quality, timestamp - no success flag
        results.set(tag.id, {
          tag,
          value: readResult.value,
          quality: readResult.quality ?? 'good'
        })
      }
    } catch (error) {
      log.error(`[Bridge] Error reading tags from ${connectionId}: ${error}`)
    }

    return results
  }

  /**
   * Check if a value has changed beyond the threshold.
   */
  private hasValueChanged(
    runtime: BridgeRuntime,
    tagId: string,
    newValue: unknown,
    threshold?: number
  ): boolean {
    const lastValue = runtime.lastValues.get(tagId)

    // First value is always a change
    if (lastValue === undefined) {
      return true
    }

    // For numeric values, apply threshold
    if (typeof newValue === 'number' && typeof lastValue === 'number') {
      if (threshold !== undefined && threshold > 0) {
        return Math.abs(newValue - lastValue) >= threshold
      }
      return newValue !== lastValue
    }

    // For other types, use strict equality
    return newValue !== lastValue
  }

  /**
   * Buffer a message when target is unavailable.
   */
  private bufferMessage(
    runtime: BridgeRuntime,
    topic: string,
    payload: string,
    tagId: string
  ): void {
    const { buffer } = runtime
    const maxSize = runtime.bridge.options.bufferSize

    // Add to buffer
    buffer.push({
      timestamp: Date.now(),
      topic,
      payload,
      tagId
    })

    // Trim buffer if exceeds max size (FIFO)
    while (buffer.length > maxSize) {
      buffer.shift()
      runtime.stats.messagesDropped++
    }
  }

  /**
   * Flush buffered messages when target becomes available.
   */
  private async flushBuffer(id: string): Promise<void> {
    const runtime = this.runtimes.get(id)
    if (!runtime || runtime.buffer.length === 0) {
      return
    }

    const { bridge, buffer } = runtime
    log.info(`[Bridge] Flushing ${buffer.length} buffered messages for ${bridge.name}`)

    while (buffer.length > 0) {
      const msg = buffer.shift()!

      try {
        await this.publishToTarget(
          bridge.targetConnectionId,
          msg.topic,
          msg.payload,
          bridge.targetConfig.qos,
          bridge.targetConfig.retain
        )

        runtime.stats.messagesForwarded++
        runtime.stats.bytesTransferred += msg.payload.length
      } catch (error) {
        // Re-buffer on failure
        buffer.unshift(msg)
        runtime.isTargetAvailable = false
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.incrementError(id, errorMsg)
        break
      }
    }
  }

  /**
   * Publish message to target connection.
   */
  private async publishToTarget(
    connectionId: string,
    topic: string,
    payload: string,
    qos: 0 | 1 | 2,
    retain: boolean
  ): Promise<void> {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized')
    }

    // Get the MQTT adapter and publish
    const adapter = this.connectionManager.getAdapter(connectionId)
    if (!adapter) {
      throw new Error(`Target connection not found: ${connectionId}`)
    }

    // Check if it's an MQTT adapter with publish capability
    if ('publish' in adapter && typeof adapter.publish === 'function') {
      await adapter.publish(topic, payload, { qos, retain })
    } else {
      throw new Error('Target connection does not support publishing')
    }
  }

  /**
   * Check if target connection is available.
   */
  private checkTargetAvailable(connectionId: string): boolean {
    if (!this.connectionManager) {
      return false
    }

    const connection = this.connectionManager.getConnection(connectionId)
    return connection?.status === 'connected'
  }

  /**
   * Handle connection status changes for auto-resume.
   */
  private handleConnectionStatusChange(connectionId: string, status: ConnectionStatus): void {
    for (const [bridgeId, runtime] of this.runtimes) {
      const { bridge } = runtime

      // Check if this is the target connection
      if (bridge.targetConnectionId === connectionId) {
        const wasAvailable = runtime.isTargetAvailable
        runtime.isTargetAvailable = status === 'connected'

        // Auto-resume: Flush buffer when target becomes available
        if (!wasAvailable && runtime.isTargetAvailable && runtime.buffer.length > 0) {
          log.info(`[Bridge] Target reconnected, flushing buffer for ${bridge.name}`)
          this.flushBuffer(bridgeId).catch((err) => {
            log.error(`[Bridge] Buffer flush error for ${bridgeId}: ${err}`)
          })
        }
      }

      // Check if this is the source connection
      if (bridge.sourceConnectionId === connectionId) {
        if (status === 'disconnected' || status === 'error') {
          // Pause bridge when source disconnects
          if (bridge.status === 'active') {
            runtime.pendingResume = true
            this.pause(bridgeId).catch((err) => {
              log.error(`[Bridge] Pause error for ${bridgeId}: ${err}`)
            })
          }
        } else if (status === 'connected' && runtime.pendingResume) {
          // Auto-resume when source reconnects
          runtime.pendingResume = false
          this.resume(bridgeId).catch((err) => {
            log.error(`[Bridge] Resume error for ${bridgeId}: ${err}`)
          })
        }
      }
    }
  }

  /**
   * Increment error count and emit error event.
   */
  private incrementError(id: string, error: string): void {
    const runtime = this.runtimes.get(id)
    if (runtime) {
      runtime.stats.errorCount++
      runtime.stats.lastError = error
    }
    this.emit('error', id, error)
  }

  /**
   * Dispose and cleanup all bridges.
   */
  async dispose(): Promise<void> {
    // Stop all active bridges
    for (const id of this.runtimes.keys()) {
      await this.stop(id)
    }

    this.bridges.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let instance: BridgeManager | null = null

export function getBridgeManager(): BridgeManager {
  if (!instance) {
    instance = new BridgeManager()
  }
  return instance
}

export function disposeBridgeManager(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
