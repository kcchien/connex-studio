/**
 * Polling IPC Handlers
 *
 * Handles all polling-related IPC communication between Main and Renderer.
 * Implements: polling:start, polling:stop, polling:status
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import {
  POLLING_START,
  POLLING_STOP,
  POLLING_STATUS
} from '@shared/constants/ipc-channels'
import { getPollingEngine } from '../services/PollingEngine'
import {
  MIN_POLLING_INTERVAL_MS,
  MAX_POLLING_INTERVAL_MS
} from '@shared/types/polling'

interface StartPollingParams {
  connectionId: string
  tagIds: string[]
  intervalMs: number
}

interface StopPollingParams {
  connectionId: string
}

interface PollingStatusParams {
  connectionId: string
}

/**
 * Validate polling interval.
 */
function validateInterval(intervalMs: number): string | null {
  if (typeof intervalMs !== 'number' || isNaN(intervalMs)) {
    return 'Interval must be a number'
  }
  if (intervalMs < MIN_POLLING_INTERVAL_MS) {
    return `Interval must be at least ${MIN_POLLING_INTERVAL_MS}ms`
  }
  if (intervalMs > MAX_POLLING_INTERVAL_MS) {
    return `Interval must be at most ${MAX_POLLING_INTERVAL_MS}ms`
  }
  return null
}

/**
 * Register all polling IPC handlers.
 */
export function registerPollingHandlers(): void {
  const engine = getPollingEngine()

  // polling:start
  ipcMain.handle(POLLING_START, async (_event, params: StartPollingParams) => {
    log.debug(`[IPC] ${POLLING_START}`, params)

    try {
      // Validate interval
      const intervalError = validateInterval(params.intervalMs)
      if (intervalError) {
        return { success: false, error: intervalError }
      }

      engine.startPolling(params.connectionId, params.tagIds, params.intervalMs)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${POLLING_START} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // polling:stop
  ipcMain.handle(POLLING_STOP, async (_event, params: StopPollingParams) => {
    log.debug(`[IPC] ${POLLING_STOP}`, params)

    try {
      engine.stopPolling(params.connectionId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${POLLING_STOP} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // polling:status
  ipcMain.handle(POLLING_STATUS, async (_event, params: PollingStatusParams) => {
    log.debug(`[IPC] ${POLLING_STATUS}`, params)

    const status = engine.getPollingStatus(params.connectionId)
    return status
  })

  log.info('[IPC] Polling handlers registered')
}
