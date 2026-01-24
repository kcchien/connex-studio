/**
 * ConnectionManager
 *
 * Singleton service for managing connection lifecycle.
 * Handles connection CRUD, state transitions, and protocol adapter management.
 *
 * State transitions:
 * disconnected -> connecting -> connected
 *                           -> error
 * connected    -> disconnected (explicit disconnect)
 *              -> error (connection failure)
 * error        -> disconnected (reset)
 *              -> connecting (reconnect)
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Network disconnection detection (3s timeout)
 */

import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log/main.js'
import type {
  Connection,
  ConnectionStatus,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  Tag,
  ModbusAddress,
  MqttAddress,
  OpcUaAddress,
  DataType
} from '@shared/types'
import { ProtocolAdapter, getProtocolRegistry, type ReadResult } from '../protocols/ProtocolAdapter'
import type { BrowserWindow } from 'electron'
import { CONNECTION_STATUS_CHANGED } from '@shared/constants/ipc-channels'

export interface ConnectionManagerEvents {
  'status-changed': (connectionId: string, status: ConnectionStatus, error?: string) => void
  'connection-created': (connection: Connection) => void
  'connection-deleted': (connectionId: string) => void
}

type Protocol = 'modbus-tcp' | 'mqtt' | 'opcua'

// Reconnection constants
const RECONNECT_BASE_DELAY_MS = 1000 // 1 second initial delay
const RECONNECT_MAX_DELAY_MS = 30000 // 30 seconds max delay
const RECONNECT_MAX_ATTEMPTS = 5 // Max attempts before giving up
const NETWORK_TIMEOUT_MS = 3000 // 3 seconds timeout for detecting disconnection

interface ReconnectionState {
  attempts: number
  timer: NodeJS.Timeout | null
  enabled: boolean
}

export class ConnectionManager {
  private connections = new Map<string, Connection>()
  private adapters = new Map<string, ProtocolAdapter>()
  private tags = new Map<string, Tag[]>() // connectionId -> tags
  private mainWindow: BrowserWindow | null = null
  private reconnectionStates = new Map<string, ReconnectionState>()

  /**
   * Set the main window for sending push events.
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  /**
   * Create a new connection (does not connect yet).
   */
  createConnection(
    name: string,
    protocol: Protocol,
    config: ModbusTcpConfig | MqttConfig | OpcUaConfig
  ): Connection {
    const id = uuidv4()
    const connection: Connection = {
      id,
      name,
      protocol,
      config,
      status: 'disconnected',
      createdAt: Date.now()
    }

    this.connections.set(id, connection)
    this.tags.set(id, [])
    log.info(`[ConnectionManager] Created connection: ${name} (${id})`)

    return connection
  }

  /**
   * Get a connection by ID.
   */
  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId)
  }

  /**
   * Get all connections.
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values())
  }

  /**
   * Delete a connection and its associated tags.
   * Must be disconnected first.
   */
  deleteConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    if (connection.status === 'connected' || connection.status === 'connecting') {
      throw new Error('Cannot delete connected connection. Disconnect first.')
    }

    // Dispose adapter if exists
    const adapter = this.adapters.get(connectionId)
    if (adapter) {
      adapter.dispose()
      this.adapters.delete(connectionId)
    }

    // Remove connection and tags
    this.connections.delete(connectionId)
    this.tags.delete(connectionId)

    log.info(`[ConnectionManager] Deleted connection: ${connectionId}`)
  }

  /**
   * Connect to a device/broker.
   * @param enableReconnect - If true, auto-reconnect on failure
   */
  async connect(connectionId: string, enableReconnect = true): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    if (connection.status === 'connected') {
      log.warn(`[ConnectionManager] Already connected: ${connectionId}`)
      return
    }

    if (connection.status === 'connecting') {
      log.warn(`[ConnectionManager] Connection in progress: ${connectionId}`)
      return
    }

    // Initialize reconnection state
    if (!this.reconnectionStates.has(connectionId)) {
      this.reconnectionStates.set(connectionId, {
        attempts: 0,
        timer: null,
        enabled: enableReconnect
      })
    } else {
      const state = this.reconnectionStates.get(connectionId)!
      state.enabled = enableReconnect
    }

    // Update status to connecting
    this.updateStatus(connectionId, 'connecting')

    try {
      // Create adapter if not exists
      let adapter = this.adapters.get(connectionId)
      if (!adapter) {
        const registry = getProtocolRegistry()
        adapter = registry.create(connection)
        this.adapters.set(connectionId, adapter)

        // Listen to adapter status changes
        adapter.on('status-changed', (status, error) => {
          this.handleStatusChange(connectionId, status, error)
        })

        adapter.on('error', (error) => {
          log.error(`[ConnectionManager] Adapter error for ${connectionId}: ${error.message}`)
          this.handleConnectionError(connectionId, error.message)
        })
      }

      // Connect with timeout
      await this.connectWithTimeout(adapter, connectionId)

      // Reset reconnection attempts on successful connect
      const state = this.reconnectionStates.get(connectionId)
      if (state) {
        state.attempts = 0
      }

      this.updateStatus(connectionId, 'connected')
      log.info(`[ConnectionManager] Connected: ${connectionId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.handleConnectionError(connectionId, message)
      throw error
    }
  }

  /**
   * Connect with network timeout detection.
   */
  private async connectWithTimeout(adapter: ProtocolAdapter, connectionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${NETWORK_TIMEOUT_MS}ms`))
      }, NETWORK_TIMEOUT_MS)

      adapter.connect()
        .then(() => {
          clearTimeout(timeout)
          resolve()
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Handle status changes from adapter.
   */
  private handleStatusChange(connectionId: string, status: ConnectionStatus, error?: string): void {
    if (status === 'error' || status === 'disconnected') {
      this.handleConnectionError(connectionId, error)
    } else {
      this.updateStatus(connectionId, status, error)
    }
  }

  /**
   * Handle connection error with potential reconnection.
   */
  private handleConnectionError(connectionId: string, error?: string): void {
    this.updateStatus(connectionId, 'error', error)

    const state = this.reconnectionStates.get(connectionId)
    if (state?.enabled) {
      this.scheduleReconnect(connectionId)
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(connectionId: string): void {
    const state = this.reconnectionStates.get(connectionId)
    if (!state || !state.enabled) return

    // Clear existing timer
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }

    // Check max attempts
    if (state.attempts >= RECONNECT_MAX_ATTEMPTS) {
      log.warn(`[ConnectionManager] Max reconnection attempts reached for ${connectionId}`)
      state.enabled = false
      return
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, state.attempts),
      RECONNECT_MAX_DELAY_MS
    )

    state.attempts++
    log.info(`[ConnectionManager] Scheduling reconnect for ${connectionId} in ${delay}ms (attempt ${state.attempts}/${RECONNECT_MAX_ATTEMPTS})`)

    state.timer = setTimeout(async () => {
      const connection = this.connections.get(connectionId)
      if (!connection) return

      // Only reconnect if still in error state
      if (connection.status !== 'error') return

      try {
        log.info(`[ConnectionManager] Attempting reconnect for ${connectionId}`)
        await this.connect(connectionId, true)
      } catch (error) {
        // Error handling is done in connect(), just log here
        log.warn(`[ConnectionManager] Reconnect attempt ${state.attempts} failed for ${connectionId}`)
      }
    }, delay)
  }

  /**
   * Enable or disable auto-reconnect for a connection.
   */
  setAutoReconnect(connectionId: string, enabled: boolean): void {
    const state = this.reconnectionStates.get(connectionId)
    if (state) {
      state.enabled = enabled
      if (!enabled && state.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }
    }
  }

  /**
   * Cancel any pending reconnection attempts.
   */
  private cancelReconnect(connectionId: string): void {
    const state = this.reconnectionStates.get(connectionId)
    if (state) {
      if (state.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }
      state.attempts = 0
      state.enabled = false
    }
  }

  /**
   * Disconnect from a device/broker.
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    // Disable auto-reconnect when explicitly disconnecting
    this.cancelReconnect(connectionId)

    const adapter = this.adapters.get(connectionId)
    if (adapter) {
      try {
        await adapter.disconnect()
      } catch (error) {
        log.warn(`[ConnectionManager] Error during disconnect: ${error}`)
      }
    }

    this.updateStatus(connectionId, 'disconnected')
    log.info(`[ConnectionManager] Disconnected: ${connectionId}`)
  }

  /**
   * Perform a single read operation (quick test).
   */
  async readOnce(
    connectionId: string,
    address: ModbusAddress | MqttAddress | OpcUaAddress,
    dataType: DataType = 'uint16'
  ): Promise<ReadResult> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    const adapter = this.adapters.get(connectionId)
    if (!adapter || !adapter.isConnected()) {
      throw new Error('Not connected. Connect first.')
    }

    // Create a temporary tag for the read
    const tempTag: Tag = {
      id: 'temp-read',
      connectionId,
      name: 'Quick Read',
      address,
      dataType,
      displayFormat: { decimals: 2, unit: '' },
      thresholds: {},
      enabled: true
    }

    const results = await adapter.readTags([tempTag])
    return results[0]
  }

  /**
   * Get adapter for a connection.
   */
  getAdapter(connectionId: string): ProtocolAdapter | undefined {
    return this.adapters.get(connectionId)
  }

  /**
   * Update connection status and notify renderer.
   */
  private updateStatus(connectionId: string, status: ConnectionStatus, error?: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    connection.status = status
    connection.lastError = error

    // Push status change to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(CONNECTION_STATUS_CHANGED, {
        connectionId,
        status,
        error
      })
    }
  }

  // ==================== Tag Management ====================

  /**
   * Create a tag for a connection.
   */
  createTag(
    connectionId: string,
    name: string,
    address: ModbusAddress | MqttAddress | OpcUaAddress,
    dataType: DataType,
    options?: Partial<Pick<Tag, 'displayFormat' | 'thresholds' | 'enabled'>>
  ): Tag {
    if (!this.connections.has(connectionId)) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    const id = uuidv4()
    const tag: Tag = {
      id,
      connectionId,
      name,
      address,
      dataType,
      displayFormat: options?.displayFormat ?? { decimals: 2, unit: '' },
      thresholds: options?.thresholds ?? {},
      enabled: options?.enabled ?? true
    }

    const connectionTags = this.tags.get(connectionId) ?? []
    connectionTags.push(tag)
    this.tags.set(connectionId, connectionTags)

    log.info(`[ConnectionManager] Created tag: ${name} (${id}) for connection ${connectionId}`)
    return tag
  }

  /**
   * Get tags for a connection.
   */
  getTags(connectionId: string): Tag[] {
    return this.tags.get(connectionId) ?? []
  }

  /**
   * Add an existing tag (used for profile loading).
   */
  addTag(tag: Tag): void {
    if (!this.connections.has(tag.connectionId)) {
      throw new Error(`Connection not found: ${tag.connectionId}`)
    }

    const connectionTags = this.tags.get(tag.connectionId) ?? []
    connectionTags.push(tag)
    this.tags.set(tag.connectionId, connectionTags)

    log.info(`[ConnectionManager] Added tag: ${tag.name} (${tag.id}) for connection ${tag.connectionId}`)
  }

  /**
   * Get a specific tag by ID.
   */
  getTag(tagId: string): Tag | undefined {
    for (const tags of this.tags.values()) {
      const tag = tags.find((t) => t.id === tagId)
      if (tag) return tag
    }
    return undefined
  }

  /**
   * Update a tag.
   */
  updateTag(tagId: string, updates: Partial<Omit<Tag, 'id' | 'connectionId'>>): Tag {
    for (const [connectionId, tags] of this.tags.entries()) {
      const index = tags.findIndex((t) => t.id === tagId)
      if (index !== -1) {
        const tag = tags[index]
        const updated = { ...tag, ...updates }
        tags[index] = updated
        log.info(`[ConnectionManager] Updated tag: ${tagId}`)
        return updated
      }
    }
    throw new Error(`Tag not found: ${tagId}`)
  }

  /**
   * Delete a tag.
   */
  deleteTag(tagId: string): void {
    for (const [connectionId, tags] of this.tags.entries()) {
      const index = tags.findIndex((t) => t.id === tagId)
      if (index !== -1) {
        tags.splice(index, 1)
        log.info(`[ConnectionManager] Deleted tag: ${tagId}`)
        return
      }
    }
    throw new Error(`Tag not found: ${tagId}`)
  }

  /**
   * Cleanup all resources.
   */
  async dispose(): Promise<void> {
    log.info('[ConnectionManager] Disposing all connections...')

    // Cancel all pending reconnection timers
    for (const [id, state] of this.reconnectionStates.entries()) {
      if (state.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }
    }
    this.reconnectionStates.clear()

    // Disconnect and dispose all adapters
    for (const [id, adapter] of this.adapters.entries()) {
      try {
        await adapter.dispose()
      } catch (error) {
        log.warn(`[ConnectionManager] Error disposing adapter ${id}: ${error}`)
      }
    }

    this.adapters.clear()
    this.connections.clear()
    this.tags.clear()
    log.info('[ConnectionManager] Disposed')
  }
}

// Singleton instance
let instance: ConnectionManager | null = null

export function getConnectionManager(): ConnectionManager {
  if (!instance) {
    instance = new ConnectionManager()
  }
  return instance
}

export function disposeConnectionManager(): Promise<void> {
  if (instance) {
    const manager = instance
    instance = null
    return manager.dispose()
  }
  return Promise.resolve()
}
