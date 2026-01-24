/**
 * Export type definitions for IIoT Protocol Studio.
 */

export interface ExportResult {
  success: boolean
  path?: string
  rowCount?: number
  error?: string
  cancelled?: boolean
}

export interface CsvExportOptions {
  tagIds: string[]
  startTimestamp: number
  endTimestamp: number
  includeHeader?: boolean
  delimiter?: string
}

export interface HtmlReportOptions {
  tagIds: string[]
  startTimestamp: number
  endTimestamp: number
  includeCharts: boolean
  title?: string
}
