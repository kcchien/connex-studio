/**
 * PollingEngine
 *
 * Manages continuous polling of tags across multiple connections.
 * Each connection has its own polling session with independent interval.
 *
 * Features:
 * - Start/stop polling per connection
 * - Configurable polling interval (100ms - 60000ms)
 * - Pushes data to Renderer via IPC
 * - Writes data points to DataBuffer (SQLite)
 * - Handles connection errors gracefully
 */

import { BrowserWindow } from 'electron'
import log from 'electron-log/main.js'
import { POLLING_DATA, POLLING_STATUS_CHANGED } from '@shared/constants/ipc-channels'
import {
  MIN_POLLING_INTERVAL_MS,
  MAX_POLLING_INTERVAL_MS,
  DEFAULT_POLLING_INTERVAL_MS
} from '@shared/types/polling'
import type { Tag } from '@shared/types/tag'
import type { DataQuality } from '@shared/types/common'
import type { TagValue, PollingDataPayload, PollingStatus } from '@shared/types/polling'
import { getConnectionManager } from './ConnectionManager'
import { getDataBuffer } from './DataBuffer'

interface PollingSession {
  connectionId: string
  tagIds: string[]
  intervalMs: number
  timerId: NodeJS.Timeout | null
  isPolling: boolean
  lastPollTimestamp: number
}

export class PollingEngine {
  private sessions = new Map<string, PollingSession>()
  private mainWindow: BrowserWindow | null = null

  /**
   * Set the main window for sending push events.
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  /**
   * Start polling for a connection.
   */
  startPolling(
    connectionId: string,
    tagIds: string[],
    intervalMs: number = DEFAULT_POLLING_INTERVAL_MS
  ): void {
    const manager = getConnectionManager()
    const connection = manager.getConnection(connectionId)

    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    if (connection.status !== 'connected') {
      throw new Error('Connection is not connected')
    }

    // Validate interval
    const clampedInterval = Math.min(
      Math.max(intervalMs, MIN_POLLING_INTERVAL_MS),
      MAX_POLLING_INTERVAL_MS
    )

    // Stop existing session if any
    if (this.sessions.has(connectionId)) {
      this.stopPolling(connectionId)
    }

    // Determine which tags to poll
    let tagsToPolll: Tag[]
    if (tagIds.length === 0) {
      // Poll all enabled tags
      tagsToPolll = manager.getTags(connectionId).filter((tag) => tag.enabled)
    } else {
      // Poll specified tags
      tagsToPolll = tagIds
        .map((id) => manager.getTag(id))
        .filter((tag): tag is Tag => tag !== undefined && tag.enabled)
    }

    if (tagsToPolll.length === 0) {
      throw new Error('No enabled tags to poll')
    }

    // Create session
    const session: PollingSession = {
      connectionId,
      tagIds: tagsToPolll.map((t) => t.id),
      intervalMs: clampedInterval,
      timerId: null,
      isPolling: true,
      lastPollTimestamp: 0
    }

    this.sessions.set(connectionId, session)

    // Start polling loop
    this.pollOnce(session)
    session.timerId = setInterval(() => this.pollOnce(session), clampedInterval)

    log.info(
      `[PollingEngine] Started polling for ${connectionId}: ${tagsToPolll.length} tags @ ${clampedInterval}ms`
    )
  }

  /**
   * Stop polling for a connection.
   */
  stopPolling(connectionId: string): void {
    const session = this.sessions.get(connectionId)
    if (!session) {
      return
    }

    // Clear timer
    if (session.timerId) {
      clearInterval(session.timerId)
      session.timerId = null
    }

    session.isPolling = false
    this.sessions.delete(connectionId)

    // Push status change to renderer
    this.pushStatusChanged(connectionId)

    log.info(`[PollingEngine] Stopped polling for ${connectionId}`)
  }

  /**
   * Get polling status for a connection.
   */
  getPollingStatus(connectionId: string): PollingStatus {
    const session = this.sessions.get(connectionId)

    if (!session) {
      return {
        isPolling: false,
        intervalMs: 0,
        lastPollTimestamp: 0,
        tagCount: 0
      }
    }

    return {
      isPolling: session.isPolling,
      intervalMs: session.intervalMs,
      lastPollTimestamp: session.lastPollTimestamp,
      tagCount: session.tagIds.length
    }
  }

  /**
   * Check if a connection is currently polling.
   */
  isPolling(connectionId: string): boolean {
    return this.sessions.get(connectionId)?.isPolling ?? false
  }

  /**
   * Stop all polling sessions.
   */
  stopAll(): void {
    for (const connectionId of this.sessions.keys()) {
      this.stopPolling(connectionId)
    }
    log.info('[PollingEngine] Stopped all polling sessions')
  }

  /**
   * Perform a single poll cycle.
   */
  private async pollOnce(session: PollingSession): Promise<void> {
    if (!session.isPolling) {
      return
    }

    const manager = getConnectionManager()
    const connection = manager.getConnection(session.connectionId)

    // Check connection still exists and is connected
    if (!connection || connection.status !== 'connected') {
      log.warn(`[PollingEngine] Connection ${session.connectionId} no longer connected, stopping polling`)
      this.stopPolling(session.connectionId)
      return
    }

    const adapter = manager.getAdapter(session.connectionId)
    if (!adapter) {
      log.warn(`[PollingEngine] No adapter for ${session.connectionId}, stopping polling`)
      this.stopPolling(session.connectionId)
      return
    }

    // Get current tags (they might have been updated)
    const tags = session.tagIds
      .map((id) => manager.getTag(id))
      .filter((tag): tag is Tag => tag !== undefined && tag.enabled)

    if (tags.length === 0) {
      log.warn(`[PollingEngine] No enabled tags for ${session.connectionId}, stopping polling`)
      this.stopPolling(session.connectionId)
      return
    }

    const timestamp = Date.now()

    try {
      // Read all tags
      const results = await adapter.readTags(tags)

      // Map results to TagValue format
      const values: TagValue[] = results.map((result, index) => ({
        tagId: tags[index].id,
        value: result.value,
        quality: result.quality as DataQuality
      }))

      // Store data points in buffer
      const dataBuffer = getDataBuffer()
      const dataPoints = values.map((v) => ({
        tagId: v.tagId,
        timestamp,
        value: v.value,
        quality: v.quality
      }))
      dataBuffer.insertBatch(dataPoints)

      // Update session timestamp
      session.lastPollTimestamp = timestamp

      // Push data to renderer
      this.pushData({
        connectionId: session.connectionId,
        timestamp,
        values
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[PollingEngine] Poll error for ${session.connectionId}: ${message}`)

      // Create error values for all tags
      const values: TagValue[] = tags.map((tag) => ({
        tagId: tag.id,
        value: 0,
        quality: 'bad' as DataQuality
      }))

      // Still push the error state to renderer
      this.pushData({
        connectionId: session.connectionId,
        timestamp,
        values
      })
    }
  }

  /**
   * Push polling data to renderer.
   */
  private pushData(payload: PollingDataPayload): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(POLLING_DATA, payload)
    }
  }

  /**
   * Push polling status change to renderer.
   */
  private pushStatusChanged(connectionId: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const status = this.getPollingStatus(connectionId)
      this.mainWindow.webContents.send(POLLING_STATUS_CHANGED, { connectionId, ...status })
    }
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.stopAll()
    this.mainWindow = null
    log.info('[PollingEngine] Disposed')
  }
}

// Singleton instance
let instance: PollingEngine | null = null

export function getPollingEngine(): PollingEngine {
  if (!instance) {
    instance = new PollingEngine()
  }
  return instance
}

export function disposePollingEngine(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
