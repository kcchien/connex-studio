/**
 * Bridge IPC Handlers
 *
 * Handles all bridge-related IPC communication between Main and Renderer.
 * Implements: bridge:list, bridge:get, bridge:create, bridge:update,
 *             bridge:delete, bridge:start, bridge:stop, bridge:pause,
 *             bridge:resume, bridge:get-stats
 *
 * Emits: bridge:status-changed, bridge:error, bridge:stats
 */

import { ipcMain, type BrowserWindow } from 'electron'
import log from 'electron-log/main.js'
import {
  BRIDGE_LIST,
  BRIDGE_GET,
  BRIDGE_CREATE,
  BRIDGE_UPDATE,
  BRIDGE_DELETE,
  BRIDGE_START,
  BRIDGE_STOP,
  BRIDGE_PAUSE,
  BRIDGE_RESUME,
  BRIDGE_GET_STATS,
  BRIDGE_STATUS_CHANGED,
  BRIDGE_ERROR,
  BRIDGE_STATS
} from '@shared/constants/ipc-channels'
import { getBridgeManager } from '../services/BridgeManager'
import { getConnectionManager } from '../services/ConnectionManager'
import type {
  CreateBridgeRequest,
  UpdateBridgeRequest,
  BridgeStatus,
  BridgeStats
} from '@shared/types'

interface GetParams {
  id: string
}

interface DeleteParams {
  id: string
}

interface StartParams {
  id: string
}

interface StopParams {
  id: string
}

interface PauseParams {
  id: string
}

interface ResumeParams {
  id: string
}

interface GetStatsParams {
  id: string
}

let mainWindow: BrowserWindow | null = null

/**
 * Set the main window for sending push events.
 */
export function setBridgeMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

/**
 * Send event to renderer.
 */
function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

/**
 * Register all bridge IPC handlers.
 */
export function registerBridgeHandlers(): void {
  const manager = getBridgeManager()
  const connManager = getConnectionManager()

  // Initialize bridge manager with dependencies
  manager.setDependencies(connManager)

  // Setup event forwarding to renderer
  manager.on('status-changed', (bridgeId: string, status: BridgeStatus) => {
    sendToRenderer(BRIDGE_STATUS_CHANGED, { bridgeId, status })
  })

  manager.on('error', (bridgeId: string, error: string) => {
    sendToRenderer(BRIDGE_ERROR, { bridgeId, error })
  })

  manager.on('stats', (stats: BridgeStats) => {
    sendToRenderer(BRIDGE_STATS, stats)
  })

  // bridge:list
  ipcMain.handle(BRIDGE_LIST, async () => {
    log.debug(`[IPC] ${BRIDGE_LIST}`)
    const bridges = manager.list()
    return { success: true, bridges }
  })

  // bridge:get
  ipcMain.handle(BRIDGE_GET, async (_event, params: GetParams) => {
    log.debug(`[IPC] ${BRIDGE_GET}`, params)

    const bridge = manager.get(params.id)
    if (!bridge) {
      return { success: false, error: `Bridge not found: ${params.id}` }
    }
    return { success: true, bridge }
  })

  // bridge:create
  ipcMain.handle(BRIDGE_CREATE, async (_event, params: CreateBridgeRequest) => {
    log.debug(`[IPC] ${BRIDGE_CREATE}`, params)

    try {
      const bridge = await manager.create(params)
      return { success: true, bridge }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_CREATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:update
  ipcMain.handle(BRIDGE_UPDATE, async (_event, params: UpdateBridgeRequest) => {
    log.debug(`[IPC] ${BRIDGE_UPDATE}`, params)

    try {
      const bridge = await manager.update(params)
      return { success: true, bridge }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_UPDATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:delete
  ipcMain.handle(BRIDGE_DELETE, async (_event, params: DeleteParams) => {
    log.debug(`[IPC] ${BRIDGE_DELETE}`, params)

    try {
      const deleted = await manager.delete(params.id)
      return { success: deleted }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_DELETE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:start
  ipcMain.handle(BRIDGE_START, async (_event, params: StartParams) => {
    log.debug(`[IPC] ${BRIDGE_START}`, params)

    try {
      const started = await manager.start(params.id)
      return { success: started }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_START} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:stop
  ipcMain.handle(BRIDGE_STOP, async (_event, params: StopParams) => {
    log.debug(`[IPC] ${BRIDGE_STOP}`, params)

    try {
      const stopped = await manager.stop(params.id)
      return { success: stopped }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_STOP} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:pause
  ipcMain.handle(BRIDGE_PAUSE, async (_event, params: PauseParams) => {
    log.debug(`[IPC] ${BRIDGE_PAUSE}`, params)

    try {
      const paused = await manager.pause(params.id)
      return { success: paused }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_PAUSE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:resume
  ipcMain.handle(BRIDGE_RESUME, async (_event, params: ResumeParams) => {
    log.debug(`[IPC] ${BRIDGE_RESUME}`, params)

    try {
      const resumed = await manager.resume(params.id)
      return { success: resumed }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${BRIDGE_RESUME} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // bridge:get-stats
  ipcMain.handle(BRIDGE_GET_STATS, async (_event, params: GetStatsParams) => {
    log.debug(`[IPC] ${BRIDGE_GET_STATS}`, params)

    const stats = manager.getStats(params.id)
    if (!stats) {
      return { success: false, error: `Bridge not found: ${params.id}` }
    }
    return { success: true, stats }
  })

  log.info('[IPC] Bridge handlers registered')
}
