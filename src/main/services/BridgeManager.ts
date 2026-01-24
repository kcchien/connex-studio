/**
 * Bridge Manager Service
 *
 * Manages data bridges that forward tag values from source connections
 * to target connections (e.g., Modbus to MQTT).
 */

import { EventEmitter } from 'events'
import type {
  Bridge,
  BridgeStatus,
  BridgeStats,
  CreateBridgeRequest,
  UpdateBridgeRequest
} from '@shared/types'
import { DEFAULT_BRIDGE_OPTIONS } from '@shared/types'

/**
 * Events emitted by BridgeManager.
 */
export interface BridgeManagerEvents {
  'status-changed': (bridgeId: string, status: BridgeStatus) => void
  'error': (bridgeId: string, error: string) => void
  'stats': (stats: BridgeStats) => void
}

/**
 * Runtime state for an active bridge.
 */
interface BridgeRuntime {
  bridge: Bridge
  intervalId?: NodeJS.Timeout
  stats: BridgeStats
  lastValues: Map<string, unknown>
  buffer: Array<{ timestamp: number; payload: unknown }>
}

/**
 * Bridge Manager handles CRUD operations and runtime management
 * for data bridges.
 */
export class BridgeManager extends EventEmitter {
  private bridges: Map<string, Bridge> = new Map()
  private runtimes: Map<string, BridgeRuntime> = new Map()

  constructor() {
    super()
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

    // Create runtime state
    const runtime: BridgeRuntime = {
      bridge,
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
      buffer: []
    }

    // TODO: Start polling interval and forwarding logic
    // runtime.intervalId = setInterval(() => this.forwardData(id), bridge.options.interval)

    this.runtimes.set(id, runtime)
    this.updateStatus(id, 'active')

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

    // TODO: Restart interval
    // runtime.intervalId = setInterval(...)

    this.updateStatus(id, 'active')
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
