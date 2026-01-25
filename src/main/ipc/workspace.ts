/**
 * Workspace IPC Handlers
 *
 * Handles workspace configuration export/import operations.
 * Workspaces can be exported to YAML files for backup, sharing,
 * and team collaboration.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import log from 'electron-log/main.js'
import {
  WORKSPACE_EXPORT,
  WORKSPACE_IMPORT,
  WORKSPACE_VALIDATE,
  WORKSPACE_SAVE_FILE,
  WORKSPACE_LOAD_FILE
} from '@shared/constants/ipc-channels'
import { getWorkspaceExporter } from '../services/WorkspaceExporter'
import { getWorkspaceImporter } from '../services/WorkspaceImporter'
import type {
  ExportWorkspaceRequest,
  ImportWorkspaceRequest,
  ImportWorkspaceResult,
  ValidationResult,
  SaveFileRequest,
  SaveFileResult,
  LoadFileRequest,
  LoadFileResult
} from '@shared/types/workspace'

/**
 * Register all workspace IPC handlers.
 */
export function registerWorkspaceHandlers(): void {
  // workspace:export - Export workspace configuration to YAML string
  ipcMain.handle(
    WORKSPACE_EXPORT,
    async (_event, params: ExportWorkspaceRequest): Promise<{ success: true; yaml: string } | { success: false; error: string }> => {
      try {
        log.info('[IPC] workspace:export - Exporting workspace configuration')
        log.debug('[IPC] workspace:export params:', params)

        const exporter = getWorkspaceExporter()
        const yaml = await exporter.export(params)

        log.info('[IPC] workspace:export - Export completed successfully')
        return { success: true, yaml }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] workspace:export failed: ${message}`)
        return { success: false, error: message }
      }
    }
  )

  // workspace:import - Import workspace configuration from YAML
  ipcMain.handle(
    WORKSPACE_IMPORT,
    async (_event, params: ImportWorkspaceRequest): Promise<ImportWorkspaceResult> => {
      try {
        log.info('[IPC] workspace:import - Importing workspace configuration')
        log.debug('[IPC] workspace:import params:', {
          yamlLength: params.yaml?.length,
          conflictResolution: params.conflictResolution,
          dryRun: params.dryRun
        })

        const importer = getWorkspaceImporter()
        const result = await importer.import(params)

        if (result.success) {
          log.info('[IPC] workspace:import - Import completed successfully', {
            imported: result.imported,
            skipped: result.skipped
          })
        } else {
          log.warn('[IPC] workspace:import - Import completed with errors', {
            errors: result.errors
          })
        }

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] workspace:import failed: ${message}`)
        return {
          success: false,
          imported: { environments: 0, connections: 0, tags: 0, bridges: 0, dashboards: 0, alertRules: 0 },
          skipped: { environments: 0, connections: 0, tags: 0, bridges: 0, dashboards: 0, alertRules: 0 },
          conflicts: [],
          warnings: [],
          errors: [message]
        }
      }
    }
  )

  // workspace:validate - Validate YAML without importing
  ipcMain.handle(
    WORKSPACE_VALIDATE,
    async (_event, yamlContent: string): Promise<ValidationResult> => {
      try {
        log.info('[IPC] workspace:validate - Validating workspace YAML')

        if (!yamlContent || yamlContent.trim().length === 0) {
          return {
            valid: false,
            errors: [{ path: '', message: 'YAML content is empty' }],
            warnings: []
          }
        }

        const importer = getWorkspaceImporter()
        const result = await importer.validate(yamlContent)

        log.info('[IPC] workspace:validate - Validation completed', {
          valid: result.valid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length
        })

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] workspace:validate failed: ${message}`)
        return {
          valid: false,
          errors: [{ path: '', message }],
          warnings: []
        }
      }
    }
  )

  // workspace:save-file - Save YAML to file with dialog
  ipcMain.handle(
    WORKSPACE_SAVE_FILE,
    async (_event, params: SaveFileRequest): Promise<SaveFileResult> => {
      try {
        log.info('[IPC] workspace:save-file - Saving workspace to file')

        if (!params.yaml || params.yaml.trim().length === 0) {
          return { success: false, error: 'YAML content is empty' }
        }

        const mainWindow = BrowserWindow.getFocusedWindow()
        const dialogResult = await dialog.showSaveDialog(mainWindow || undefined as any, {
          title: 'Save Workspace Configuration',
          defaultPath: params.defaultPath ?? 'workspace.yaml',
          filters: [
            { name: 'YAML Files', extensions: ['yaml', 'yml'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })

        if (dialogResult.canceled || !dialogResult.filePath) {
          return { success: false, error: 'Save cancelled' }
        }

        await fs.writeFile(dialogResult.filePath, params.yaml, 'utf-8')

        log.info(`[IPC] workspace:save-file - Saved to: ${dialogResult.filePath}`)
        return { success: true, path: dialogResult.filePath }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] workspace:save-file failed: ${message}`)
        return { success: false, error: message }
      }
    }
  )

  // workspace:load-file - Load YAML from file with dialog
  ipcMain.handle(
    WORKSPACE_LOAD_FILE,
    async (_event, params?: LoadFileRequest): Promise<LoadFileResult> => {
      try {
        log.info('[IPC] workspace:load-file - Loading workspace from file')

        let filePath = params?.path

        if (!filePath) {
          // Show open dialog
          const mainWindow = BrowserWindow.getFocusedWindow()
          const dialogResult = await dialog.showOpenDialog(mainWindow || undefined as any, {
            title: 'Load Workspace Configuration',
            filters: [
              { name: 'YAML Files', extensions: ['yaml', 'yml'] },
              { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
          })

          if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
            return { success: false, error: 'Load cancelled' }
          }

          filePath = dialogResult.filePaths[0]
        }

        // Check file exists
        try {
          await fs.access(filePath)
        } catch {
          return { success: false, error: `File not found: ${filePath}` }
        }

        const yaml = await fs.readFile(filePath, 'utf-8')

        log.info(`[IPC] workspace:load-file - Loaded from: ${filePath}`)
        return { success: true, yaml, path: filePath }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] workspace:load-file failed: ${message}`)
        return { success: false, error: message }
      }
    }
  )

  log.info('[IPC] Workspace handlers registered')
}
