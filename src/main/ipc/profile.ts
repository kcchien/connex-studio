/**
 * Profile IPC Handlers
 *
 * Handles profile save/load/import/export operations.
 * Profiles store connection configurations without credentials.
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import {
  PROFILE_SAVE,
  PROFILE_LOAD,
  PROFILE_LIST,
  PROFILE_DELETE,
  PROFILE_IMPORT,
  PROFILE_EXPORT
} from '@shared/constants/ipc-channels'
import { getProfileService } from '../services/ProfileService'
import { getConnectionManager } from '../services/ConnectionManager'
import type { ProfileSummary, Connection, Tag } from '@shared/types'

// Request/Response types
interface SaveRequest {
  name: string
  connectionIds: string[]
}

type SaveResponse =
  | { success: true; path: string }
  | { success: false; error: string }

interface LoadRequest {
  name: string
}

type LoadResponse =
  | { success: true; connections: Connection[]; tags: Tag[]; credentialsRequired: string[] }
  | { success: false; error: string }

interface ListResponse {
  profiles: ProfileSummary[]
}

interface DeleteRequest {
  name: string
}

type DeleteResponse =
  | { success: true }
  | { success: false; error: string }

interface ImportRequest {
  filePath?: string // If not provided, show dialog
}

type ImportResponse =
  | { success: true; name: string }
  | { success: false; error: string; cancelled?: boolean }

interface ExportRequest {
  name: string
}

type ExportResponse =
  | { success: true; path: string }
  | { success: false; error: string; cancelled?: boolean }

/**
 * Register all profile IPC handlers.
 */
export function registerProfileHandlers(): void {
  // profile:save - Save current configuration as profile
  ipcMain.handle(PROFILE_SAVE, async (_event, params: SaveRequest): Promise<SaveResponse> => {
    try {
      log.info(`[IPC] profile:save - Saving profile: ${params.name}`)

      if (!params.name || params.name.trim().length === 0) {
        return { success: false, error: 'Profile name is required' }
      }

      if (!params.connectionIds || params.connectionIds.length === 0) {
        return { success: false, error: 'At least one connection must be selected' }
      }

      const profileService = getProfileService()
      const path = await profileService.save({
        name: params.name.trim(),
        connectionIds: params.connectionIds
      })

      return { success: true, path }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] profile:save failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // profile:load - Load a profile
  ipcMain.handle(PROFILE_LOAD, async (_event, params: LoadRequest): Promise<LoadResponse> => {
    try {
      log.info(`[IPC] profile:load - Loading profile: ${params.name}`)

      if (!params.name) {
        return { success: false, error: 'Profile name is required' }
      }

      const profileService = getProfileService()
      const result = await profileService.load(params.name)

      // Restore connections to ConnectionManager
      const connectionManager = getConnectionManager()
      for (const conn of result.connections) {
        // Create connection in manager (this generates new internal state)
        const created = connectionManager.createConnection(
          conn.name,
          conn.protocol,
          conn.config
        )

        // Restore tags for this connection
        const connTags = result.tags.filter((t) => t.connectionId === conn.id)
        for (const tag of connTags) {
          // Update tag's connectionId to the new connection
          const newTag = { ...tag, connectionId: created.id }
          connectionManager.addTag(newTag)
        }
      }

      return {
        success: true,
        connections: result.connections,
        tags: result.tags,
        credentialsRequired: result.credentialsRequired
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] profile:load failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // profile:list - List available profiles
  ipcMain.handle(PROFILE_LIST, async (): Promise<ListResponse> => {
    try {
      log.debug('[IPC] profile:list - Listing profiles')

      const profileService = getProfileService()
      const profiles = await profileService.list()

      return { profiles }
    } catch (error) {
      log.error(`[IPC] profile:list failed: ${error}`)
      return { profiles: [] }
    }
  })

  // profile:delete - Delete a profile
  ipcMain.handle(PROFILE_DELETE, async (_event, params: DeleteRequest): Promise<DeleteResponse> => {
    try {
      log.info(`[IPC] profile:delete - Deleting profile: ${params.name}`)

      if (!params.name) {
        return { success: false, error: 'Profile name is required' }
      }

      const profileService = getProfileService()
      await profileService.delete(params.name)

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] profile:delete failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // profile:import - Import profile from file
  ipcMain.handle(PROFILE_IMPORT, async (_event, params: ImportRequest): Promise<ImportResponse> => {
    try {
      log.info('[IPC] profile:import - Importing profile')

      const profileService = getProfileService()

      let filePath = params.filePath
      if (!filePath) {
        // Show open dialog
        const dialogResult = await profileService.showImportDialog()
        if (dialogResult.cancelled) {
          return { success: false, error: 'Import cancelled', cancelled: true }
        }
        filePath = dialogResult.filePath
      }

      const name = await profileService.import(filePath)

      return { success: true, name }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] profile:import failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // profile:export - Export profile to file
  ipcMain.handle(PROFILE_EXPORT, async (_event, params: ExportRequest): Promise<ExportResponse> => {
    try {
      log.info(`[IPC] profile:export - Exporting profile: ${params.name}`)

      if (!params.name) {
        return { success: false, error: 'Profile name is required' }
      }

      const profileService = getProfileService()
      const result = await profileService.export(params.name)

      if (result.cancelled) {
        return { success: false, error: 'Export cancelled', cancelled: true }
      }

      return { success: true, path: result.path }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] profile:export failed: ${message}`)
      return { success: false, error: message }
    }
  })

  log.info('[IPC] Profile handlers registered')
}
