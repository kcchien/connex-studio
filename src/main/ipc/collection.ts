/**
 * Collection IPC Handlers
 *
 * Handles all collection-related IPC communication between Main and Renderer.
 * Implements: collection:list, collection:get, collection:create,
 *             collection:update, collection:delete, collection:run, collection:stop
 */

import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log/main.js'
import {
  COLLECTION_LIST,
  COLLECTION_GET,
  COLLECTION_CREATE,
  COLLECTION_UPDATE,
  COLLECTION_DELETE,
  COLLECTION_RUN,
  COLLECTION_STOP,
  COLLECTION_PROGRESS,
  COLLECTION_RESULT
} from '@shared/constants/ipc-channels'
import { getCollectionRunner } from '../services/CollectionRunner'
import type {
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionProgress,
  CollectionRunResult
} from '@shared/types'

interface GetParams {
  id: string
}

interface DeleteParams {
  id: string
}

interface RunParams {
  id: string
}

interface StopParams {
  runId: string
}

/**
 * Register all collection IPC handlers.
 */
export function registerCollectionHandlers(): void {
  const runner = getCollectionRunner()

  // Set up event listeners to forward to renderer
  runner.on('progress', (progress: CollectionProgress) => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(COLLECTION_PROGRESS, progress)
    }
  })

  runner.on('result', (result: CollectionRunResult) => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(COLLECTION_RESULT, result)
    }
  })

  // collection:list
  ipcMain.handle(COLLECTION_LIST, async () => {
    log.debug(`[IPC] ${COLLECTION_LIST}`)
    const collections = runner.list()
    return { success: true, collections }
  })

  // collection:get
  ipcMain.handle(COLLECTION_GET, async (_event, params: GetParams) => {
    log.debug(`[IPC] ${COLLECTION_GET}`, params)

    const collection = runner.get(params.id)
    if (!collection) {
      return { success: false, error: `Collection not found: ${params.id}` }
    }
    return { success: true, collection }
  })

  // collection:create
  ipcMain.handle(COLLECTION_CREATE, async (_event, params: CreateCollectionRequest) => {
    log.debug(`[IPC] ${COLLECTION_CREATE}`, params)

    try {
      const collection = await runner.create(params)
      return { success: true, collection }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${COLLECTION_CREATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // collection:update
  ipcMain.handle(COLLECTION_UPDATE, async (_event, params: UpdateCollectionRequest) => {
    log.debug(`[IPC] ${COLLECTION_UPDATE}`, params)

    try {
      const collection = await runner.update(params)
      return { success: true, collection }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${COLLECTION_UPDATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // collection:delete
  ipcMain.handle(COLLECTION_DELETE, async (_event, params: DeleteParams) => {
    log.debug(`[IPC] ${COLLECTION_DELETE}`, params)

    try {
      const deleted = await runner.delete(params.id)
      return { success: deleted }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${COLLECTION_DELETE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // collection:run
  ipcMain.handle(COLLECTION_RUN, async (_event, params: RunParams) => {
    log.debug(`[IPC] ${COLLECTION_RUN}`, params)

    try {
      const result = await runner.run(params.id)
      return { success: true, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${COLLECTION_RUN} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // collection:stop
  ipcMain.handle(COLLECTION_STOP, async (_event, params: StopParams) => {
    log.debug(`[IPC] ${COLLECTION_STOP}`, params)

    try {
      const stopped = runner.stop(params.runId)
      return { success: stopped }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${COLLECTION_STOP} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  log.info('[IPC] Collection handlers registered')
}
