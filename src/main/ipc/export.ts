/**
 * Export IPC Handlers
 *
 * Handles CSV and HTML report export operations.
 * Supports progress tracking for large exports.
 */

import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log/main.js'
import { EXPORT_CSV, EXPORT_HTML_REPORT } from '@shared/constants/ipc-channels'
import { getExportService } from '../services/ExportService'
import type { ExportResult, CsvExportOptions, HtmlReportOptions } from '@shared/types/export'

// Large export threshold (rows) for progress tracking
const LARGE_EXPORT_THRESHOLD = 10000

/**
 * Register all export IPC handlers.
 */
export function registerExportHandlers(): void {
  // export:csv - Export data to CSV file
  ipcMain.handle(
    EXPORT_CSV,
    async (
      _event,
      params: { tagIds: string[]; startTimestamp: number; endTimestamp: number }
    ): Promise<ExportResult> => {
      try {
        log.info(`[IPC] export:csv - Exporting ${params.tagIds.length} tags`)

        if (!params.tagIds || params.tagIds.length === 0) {
          return { success: false, error: 'At least one tag must be selected' }
        }

        if (params.startTimestamp >= params.endTimestamp) {
          return { success: false, error: 'Invalid time range' }
        }

        const exportService = getExportService()

        // For large exports, send progress updates to renderer
        const onProgress = (progress: { current: number; total: number; percentage: number }) => {
          // Only send progress for large exports
          if (progress.total >= LARGE_EXPORT_THRESHOLD) {
            const mainWindow = BrowserWindow.getAllWindows()[0]
            if (mainWindow) {
              mainWindow.webContents.send('export:progress', {
                type: 'csv',
                ...progress
              })
            }
          }
        }

        const options: CsvExportOptions = {
          tagIds: params.tagIds,
          startTimestamp: params.startTimestamp,
          endTimestamp: params.endTimestamp,
          includeHeader: true,
          delimiter: ','
        }

        const result = await exportService.exportCsv(options, onProgress)

        if (result.success) {
          log.info(`[IPC] export:csv - Success: ${result.rowCount} rows to ${result.path}`)
        } else if (!result.cancelled) {
          log.warn(`[IPC] export:csv - Failed: ${result.error}`)
        }

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] export:csv failed: ${message}`)
        return { success: false, error: message }
      }
    }
  )

  // export:html-report - Generate HTML report
  ipcMain.handle(
    EXPORT_HTML_REPORT,
    async (
      _event,
      params: {
        tagIds: string[]
        startTimestamp: number
        endTimestamp: number
        includeCharts: boolean
      }
    ): Promise<ExportResult> => {
      try {
        log.info(
          `[IPC] export:html-report - Generating report for ${params.tagIds.length} tags (charts: ${params.includeCharts})`
        )

        if (!params.tagIds || params.tagIds.length === 0) {
          return { success: false, error: 'At least one tag must be selected' }
        }

        if (params.startTimestamp >= params.endTimestamp) {
          return { success: false, error: 'Invalid time range' }
        }

        const exportService = getExportService()

        // Progress callback for renderer
        const onProgress = (progress: { current: number; total: number; percentage: number }) => {
          const mainWindow = BrowserWindow.getAllWindows()[0]
          if (mainWindow) {
            mainWindow.webContents.send('export:progress', {
              type: 'html',
              ...progress
            })
          }
        }

        const options: HtmlReportOptions = {
          tagIds: params.tagIds,
          startTimestamp: params.startTimestamp,
          endTimestamp: params.endTimestamp,
          includeCharts: params.includeCharts,
          title: 'IIoT Data Report'
        }

        const result = await exportService.exportHtmlReport(options, onProgress)

        if (result.success) {
          log.info(`[IPC] export:html-report - Success: ${result.path}`)
        } else if (!result.cancelled) {
          log.warn(`[IPC] export:html-report - Failed: ${result.error}`)
        }

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] export:html-report failed: ${message}`)
        return { success: false, error: message }
      }
    }
  )

  log.info('[IPC] Export handlers registered')
}
