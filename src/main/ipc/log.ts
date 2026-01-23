/**
 * Log IPC Handlers
 *
 * Provides IPC handlers for log-related operations between
 * Renderer and Main processes.
 */

import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { getLogService } from '../services/LogService'
import type { LogLevel, LogEntry } from '@shared/types'

// Local result types to avoid complex generic issues
type SuccessResult<T = object> = { success: true } & T
type ErrorResult = { success: false; error: string }

/**
 * Register all log IPC handlers.
 */
export function registerLogHandlers(): void {
  const logService = getLogService()

  // log:get-logs - Retrieve recent log entries
  ipcMain.handle(
    IPC_CHANNELS.log.getLogs,
    async (
      _event,
      options?: { level?: LogLevel; limit?: number; source?: 'main' | 'renderer' }
    ): Promise<SuccessResult<{ logs: LogEntry[] }> | ErrorResult> => {
      try {
        const logs = logService.getLogs(options)
        return { success: true, logs }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // log:add - Add a log entry from Renderer
  ipcMain.handle(
    IPC_CHANNELS.log.add,
    async (
      _event,
      entry: { level: LogLevel; message: string; timestamp?: number }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        logService.addRendererLog({
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp ?? Date.now()
        })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // log:clear - Clear in-memory logs
  ipcMain.handle(
    IPC_CHANNELS.log.clear,
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        logService.clearLogs()
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // log:export - Export logs to file
  ipcMain.handle(
    IPC_CHANNELS.log.export,
    async (_event, filePath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await logService.exportLogs(filePath)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // log:open-folder - Open the log folder in file explorer
  ipcMain.handle(
    IPC_CHANNELS.log.openFolder,
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        const logPath = logService.getLogPath()
        await shell.openPath(logPath)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // log:get-config - Get current log configuration
  ipcMain.handle(
    IPC_CHANNELS.log.getConfig,
    async (): Promise<
      SuccessResult<{ maxSize: number; maxFiles: number; level: LogLevel }> | ErrorResult
    > => {
      try {
        const config = logService.getConfig()
        return { success: true, ...config }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // log:set-level - Update log level
  ipcMain.handle(
    IPC_CHANNELS.log.setLevel,
    async (_event, level: LogLevel): Promise<{ success: boolean; error?: string }> => {
      try {
        logService.updateConfig({ level })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )
}
