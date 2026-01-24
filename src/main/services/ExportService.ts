/**
 * Export Service
 *
 * Handles data export operations including CSV and HTML report generation.
 * Supports progress tracking for large exports.
 */

import { app, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import log from 'electron-log/main.js'
import { getDataBuffer } from './DataBuffer'
import { getConnectionManager } from './ConnectionManager'
import type { ExportResult, CsvExportOptions, HtmlReportOptions } from '@shared/types/export'
import type { DataPoint } from '@shared/types/datapoint'
import type { DataQuality } from '@shared/types/common'
import type { Tag } from '@shared/types/tag'

// Progress callback type
export type ExportProgressCallback = (progress: {
  current: number
  total: number
  percentage: number
}) => void

/**
 * ExportService singleton for handling data exports.
 */
export class ExportService {
  private static instance: ExportService | null = null

  private constructor() {
    log.info('[ExportService] Initialized')
  }

  /**
   * Get singleton instance.
   */
  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService()
    }
    return ExportService.instance
  }

  /**
   * Export data to CSV file.
   * Shows save dialog and writes CSV with Timestamp, TagName, Value columns.
   */
  async exportCsv(
    options: CsvExportOptions,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    const { tagIds, startTimestamp, endTimestamp, includeHeader = true, delimiter = ',' } = options

    try {
      // Show save dialog
      const mainWindow = BrowserWindow.getAllWindows()[0]
      const dialogResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Export CSV',
        defaultPath: path.join(app.getPath('documents'), `export-${Date.now()}.csv`),
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (dialogResult.canceled || !dialogResult.filePath) {
        return { success: false, cancelled: true }
      }

      const filePath = dialogResult.filePath
      log.info(`[ExportService] Exporting CSV to: ${filePath}`)

      // Get data from buffer
      const dataBuffer = getDataBuffer()
      const dataPoints = dataBuffer.getDataForExport(tagIds, startTimestamp, endTimestamp)

      if (dataPoints.length === 0) {
        return {
          success: false,
          error: 'No data found in the specified time range'
        }
      }

      // Get tag names for lookup
      const connectionManager = getConnectionManager()
      const tagNameMap = new Map<string, string>()
      for (const tagId of tagIds) {
        const tag = connectionManager.getTag(tagId)
        if (tag) {
          tagNameMap.set(tagId, tag.name)
        }
      }

      // Build CSV content
      const lines: string[] = []

      // Header
      if (includeHeader) {
        lines.push(['Timestamp', 'DateTime', 'TagName', 'Value', 'Quality'].join(delimiter))
      }

      // Data rows with progress tracking
      const total = dataPoints.length
      const progressInterval = Math.max(1, Math.floor(total / 100)) // Update every 1%

      for (let i = 0; i < dataPoints.length; i++) {
        const dp = dataPoints[i]
        const tagName = tagNameMap.get(dp.tagId) || dp.tagId
        const dateTime = new Date(dp.timestamp).toISOString()
        const value = this.formatValue(dp.value)

        lines.push([dp.timestamp.toString(), dateTime, tagName, value, dp.quality].join(delimiter))

        // Report progress
        if (onProgress && i % progressInterval === 0) {
          onProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100)
          })
        }
      }

      // Final progress update
      if (onProgress) {
        onProgress({ current: total, total, percentage: 100 })
      }

      // Write file
      const content = lines.join('\n')
      fs.writeFileSync(filePath, content, 'utf-8')

      log.info(`[ExportService] CSV export complete: ${dataPoints.length} rows`)
      return {
        success: true,
        path: filePath,
        rowCount: dataPoints.length
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[ExportService] CSV export failed: ${message}`)
      return { success: false, error: message }
    }
  }

  /**
   * Generate HTML report with statistics and optional charts.
   */
  async exportHtmlReport(
    options: HtmlReportOptions,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    const { tagIds, startTimestamp, endTimestamp, includeCharts, title = 'IIoT Data Report' } = options

    try {
      // Show save dialog
      const mainWindow = BrowserWindow.getAllWindows()[0]
      const dialogResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Export HTML Report',
        defaultPath: path.join(app.getPath('documents'), `report-${Date.now()}.html`),
        filters: [
          { name: 'HTML Files', extensions: ['html', 'htm'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (dialogResult.canceled || !dialogResult.filePath) {
        return { success: false, cancelled: true }
      }

      const filePath = dialogResult.filePath
      log.info(`[ExportService] Generating HTML report: ${filePath}`)

      // Get data from buffer
      const dataBuffer = getDataBuffer()
      const dataPoints = dataBuffer.getDataForExport(tagIds, startTimestamp, endTimestamp)

      // Get connection and tag info
      const connectionManager = getConnectionManager()
      const tagInfo: Array<{ tag: Tag; connectionName: string }> = []
      for (const tagId of tagIds) {
        const tag = connectionManager.getTag(tagId)
        if (tag) {
          const connection = connectionManager.getConnection(tag.connectionId)
          tagInfo.push({
            tag,
            connectionName: connection?.name || 'Unknown'
          })
        }
      }

      // Calculate statistics per tag
      if (onProgress) {
        onProgress({ current: 0, total: 100, percentage: 0 })
      }

      const statistics = this.calculateStatistics(dataPoints, tagIds)

      if (onProgress) {
        onProgress({ current: 50, total: 100, percentage: 50 })
      }

      // Generate HTML content
      const html = this.generateHtmlReport({
        title,
        startTimestamp,
        endTimestamp,
        tagInfo,
        statistics,
        dataPoints,
        includeCharts
      })

      if (onProgress) {
        onProgress({ current: 90, total: 100, percentage: 90 })
      }

      // Write file
      fs.writeFileSync(filePath, html, 'utf-8')

      if (onProgress) {
        onProgress({ current: 100, total: 100, percentage: 100 })
      }

      log.info(`[ExportService] HTML report complete`)
      return {
        success: true,
        path: filePath
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[ExportService] HTML report failed: ${message}`)
      return { success: false, error: message }
    }
  }

  /**
   * Calculate statistics for each tag.
   */
  private calculateStatistics(
    dataPoints: DataPoint[],
    tagIds: string[]
  ): Map<string, TagStatistics> {
    const stats = new Map<string, TagStatistics>()

    // Initialize stats for each tag
    for (const tagId of tagIds) {
      stats.set(tagId, {
        count: 0,
        min: Infinity,
        max: -Infinity,
        sum: 0,
        avg: 0,
        goodQualityCount: 0,
        badQualityCount: 0
      })
    }

    // Process data points
    for (const dp of dataPoints) {
      const s = stats.get(dp.tagId)
      if (!s) continue

      s.count++

      // Only include numeric values in min/max/avg
      if (typeof dp.value === 'number') {
        s.min = Math.min(s.min, dp.value)
        s.max = Math.max(s.max, dp.value)
        s.sum += dp.value
      }

      if (dp.quality === 'good') {
        s.goodQualityCount++
      } else {
        s.badQualityCount++
      }
    }

    // Calculate averages
    for (const [tagId, s] of stats) {
      if (s.count > 0 && s.min !== Infinity) {
        s.avg = s.sum / s.count
      } else {
        s.min = 0
        s.max = 0
        s.avg = 0
      }
      stats.set(tagId, s)
    }

    return stats
  }

  /**
   * Generate HTML report content.
   */
  private generateHtmlReport(params: {
    title: string
    startTimestamp: number
    endTimestamp: number
    tagInfo: Array<{ tag: Tag; connectionName: string }>
    statistics: Map<string, TagStatistics>
    dataPoints: DataPoint[]
    includeCharts: boolean
  }): string {
    const { title, startTimestamp, endTimestamp, tagInfo, statistics, dataPoints, includeCharts } =
      params

    const startDate = new Date(startTimestamp).toLocaleString()
    const endDate = new Date(endTimestamp).toLocaleString()
    const generatedAt = new Date().toLocaleString()

    // Prepare chart data if needed
    let chartScript = ''
    let chartContainer = ''
    if (includeCharts && dataPoints.length > 0) {
      const chartData = this.prepareChartData(dataPoints, tagInfo)
      chartScript = this.generateEChartsScript(chartData)
      chartContainer = '<div id="chart" style="width: 100%; height: 400px; margin: 20px 0;"></div>'
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${includeCharts ? '<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>' : ''}
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: #f9fafb; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .good { color: #16a34a; }
    .bad { color: #dc2626; }
    .number { font-family: 'Monaco', 'Menlo', monospace; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(title)}</h1>
  <div class="meta">
    <p><strong>Period:</strong> ${startDate} - ${endDate}</p>
    <p><strong>Generated:</strong> ${generatedAt}</p>
    <p><strong>Total Data Points:</strong> ${dataPoints.length.toLocaleString()}</p>
  </div>

  <h2>Connection & Tag Summary</h2>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Connection</th>
          <th>Tag Name</th>
          <th>Data Type</th>
          <th>Address</th>
        </tr>
      </thead>
      <tbody>
        ${tagInfo
          .map(
            ({ tag, connectionName }) => `
          <tr>
            <td>${this.escapeHtml(connectionName)}</td>
            <td>${this.escapeHtml(tag.name)}</td>
            <td>${tag.dataType}</td>
            <td class="number">${this.formatAddress(tag.address)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <h2>Statistics</h2>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Tag Name</th>
          <th>Count</th>
          <th>Min</th>
          <th>Max</th>
          <th>Average</th>
          <th>Good Quality</th>
          <th>Bad Quality</th>
        </tr>
      </thead>
      <tbody>
        ${tagInfo
          .map(({ tag }) => {
            const s = statistics.get(tag.id) || {
              count: 0,
              min: 0,
              max: 0,
              avg: 0,
              goodQualityCount: 0,
              badQualityCount: 0
            }
            const goodPct =
              s.count > 0 ? ((s.goodQualityCount / s.count) * 100).toFixed(1) : '0.0'
            const badPct =
              s.count > 0 ? ((s.badQualityCount / s.count) * 100).toFixed(1) : '0.0'
            return `
          <tr>
            <td>${this.escapeHtml(tag.name)}</td>
            <td class="number">${s.count.toLocaleString()}</td>
            <td class="number">${this.formatNumber(s.min)}</td>
            <td class="number">${this.formatNumber(s.max)}</td>
            <td class="number">${this.formatNumber(s.avg)}</td>
            <td class="good">${s.goodQualityCount.toLocaleString()} (${goodPct}%)</td>
            <td class="bad">${s.badQualityCount.toLocaleString()} (${badPct}%)</td>
          </tr>
        `
          })
          .join('')}
      </tbody>
    </table>
  </div>

  ${includeCharts ? `<h2>Trend Chart</h2><div class="card">${chartContainer}</div>` : ''}

  <div class="footer">
    <p>Generated by Connex Studio - IIoT Protocol Testing Platform</p>
  </div>

  ${chartScript}
</body>
</html>`
  }

  /**
   * Prepare chart data for ECharts.
   */
  private prepareChartData(
    dataPoints: DataPoint[],
    tagInfo: Array<{ tag: Tag; connectionName: string }>
  ): ChartData {
    // Group data by tag
    const seriesData = new Map<string, Array<[number, number]>>()

    for (const { tag } of tagInfo) {
      seriesData.set(tag.id, [])
    }

    // Downsample if too many points (max 1000 points per series)
    const maxPoints = 1000
    const tagPointCounts = new Map<string, number>()
    for (const dp of dataPoints) {
      tagPointCounts.set(dp.tagId, (tagPointCounts.get(dp.tagId) || 0) + 1)
    }

    const skipRatios = new Map<string, number>()
    for (const [tagId, count] of tagPointCounts) {
      skipRatios.set(tagId, Math.max(1, Math.floor(count / maxPoints)))
    }

    const counters = new Map<string, number>()

    for (const dp of dataPoints) {
      const series = seriesData.get(dp.tagId)
      if (!series) continue

      const counter = counters.get(dp.tagId) || 0
      const skipRatio = skipRatios.get(dp.tagId) || 1

      if (counter % skipRatio === 0 && typeof dp.value === 'number') {
        series.push([dp.timestamp, dp.value])
      }

      counters.set(dp.tagId, counter + 1)
    }

    return {
      tagInfo,
      seriesData
    }
  }

  /**
   * Generate ECharts initialization script.
   */
  private generateEChartsScript(chartData: ChartData): string {
    const { tagInfo, seriesData } = chartData

    const series = tagInfo.map(({ tag }) => ({
      name: tag.name,
      type: 'line',
      data: seriesData.get(tag.id) || [],
      showSymbol: false,
      smooth: true
    }))

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: tagInfo.map(({ tag }) => tag.name),
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        boundaryGap: false
      },
      yAxis: {
        type: 'value'
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { start: 0, end: 100 }
      ],
      series
    }

    return `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var chart = echarts.init(document.getElementById('chart'));
    var option = ${JSON.stringify(option)};
    chart.setOption(option);
    window.addEventListener('resize', function() { chart.resize(); });
  });
</script>`
  }

  /**
   * Format a value for display.
   */
  private formatValue(value: number | boolean | string): string {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    if (typeof value === 'number') {
      return value.toString()
    }
    return String(value)
  }

  /**
   * Format a number for display.
   */
  private formatNumber(value: number): string {
    if (!isFinite(value)) return 'N/A'
    if (Number.isInteger(value)) return value.toLocaleString()
    return value.toFixed(3)
  }

  /**
   * Format tag address for display.
   */
  private formatAddress(address: unknown): string {
    if (!address || typeof address !== 'object') return 'N/A'

    const addr = address as Record<string, unknown>

    // Modbus address
    if ('register' in addr) {
      return `${addr.register}${addr.registerOffset ? `:${addr.registerOffset}` : ''}`
    }

    // MQTT address
    if ('topic' in addr) {
      return String(addr.topic)
    }

    // OPC UA address
    if ('nodeId' in addr) {
      return String(addr.nodeId)
    }

    return JSON.stringify(address)
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

// Statistics interface
interface TagStatistics {
  count: number
  min: number
  max: number
  sum: number
  avg: number
  goodQualityCount: number
  badQualityCount: number
}

// Chart data interface
interface ChartData {
  tagInfo: Array<{ tag: Tag; connectionName: string }>
  seriesData: Map<string, Array<[number, number]>>
}

/**
 * Get ExportService singleton instance.
 */
export function getExportService(): ExportService {
  return ExportService.getInstance()
}
