/**
 * DataBuffer Service
 *
 * SQLite-backed ring buffer for DVR (Data Video Recorder) functionality.
 * Implements time-series storage with automatic eviction based on row count.
 *
 * Features:
 * - Synchronous better-sqlite3 API for predictable performance
 * - ROWID-based eviction for efficient circular buffer behavior
 * - WAL mode for concurrent read access during export
 * - Downsampling support for sparkline data
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import log from 'electron-log/main.js'
import type { DataPoint, DataQuality } from '@shared/types'

export interface DataBufferConfig {
  maxRows: number
  retentionMinutes: number
}

export interface SparklineOptions {
  tagId: string
  startTime: number
  endTime: number
  maxPoints: number
}

export interface SparklineResult {
  timestamps: number[]
  values: number[]
}

export interface DataRange {
  startTimestamp: number
  endTimestamp: number
  totalPoints: number
}

export class DataBuffer {
  private db: DatabaseType
  private config: DataBufferConfig
  private insertStmt: Database.Statement
  private evictStmt: Database.Statement
  private rangeStmt: Database.Statement
  private seekStmt: Database.Statement
  private sparklineStmt: Database.Statement
  private countStmt: Database.Statement

  constructor(dbPath?: string) {
    const userDataPath = app.getPath('userData')
    const actualPath = dbPath || path.join(userDataPath, 'dvr-buffer.db')

    // Ensure directory exists
    const dir = path.dirname(actualPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    log.info(`[DataBuffer] Opening database at: ${actualPath}`)

    this.db = new Database(actualPath)

    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL')

    // Initialize schema
    this.initializeSchema()

    // Load configuration
    this.config = this.loadConfig()

    // Prepare statements for performance
    this.insertStmt = this.db.prepare(`
      INSERT INTO datapoints (tag_id, timestamp, value, value_bool, value_text, quality)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    this.evictStmt = this.db.prepare(`
      DELETE FROM datapoints
      WHERE id <= (SELECT MAX(id) - ? FROM datapoints)
    `)

    this.rangeStmt = this.db.prepare(`
      SELECT MIN(timestamp) as startTimestamp,
             MAX(timestamp) as endTimestamp,
             COUNT(*) as totalPoints
      FROM datapoints
    `)

    this.seekStmt = this.db.prepare(`
      SELECT tag_id, timestamp, value, value_bool, value_text, quality
      FROM datapoints
      WHERE timestamp <= ?
      AND (tag_id, timestamp) IN (
        SELECT tag_id, MAX(timestamp)
        FROM datapoints
        WHERE timestamp <= ?
        GROUP BY tag_id
      )
    `)

    this.sparklineStmt = this.db.prepare(`
      SELECT timestamp, value
      FROM datapoints
      WHERE tag_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `)

    this.countStmt = this.db.prepare('SELECT COUNT(*) as count FROM datapoints')

    log.info('[DataBuffer] Initialized successfully', this.config)
  }

  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql')

    // Try to read from bundled location, fallback to inline
    let schema: string
    if (fs.existsSync(schemaPath)) {
      schema = fs.readFileSync(schemaPath, 'utf-8')
    } else {
      // Inline schema as fallback
      schema = `
        CREATE TABLE IF NOT EXISTS datapoints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tag_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          value REAL,
          value_bool INTEGER,
          value_text TEXT,
          quality TEXT DEFAULT 'good'
        );

        CREATE INDEX IF NOT EXISTS idx_datapoints_tag_time
          ON datapoints(tag_id, timestamp);

        CREATE INDEX IF NOT EXISTS idx_datapoints_timestamp
          ON datapoints(timestamp);

        CREATE TABLE IF NOT EXISTS buffer_config (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        INSERT OR IGNORE INTO buffer_config (key, value) VALUES ('max_rows', '60000');
        INSERT OR IGNORE INTO buffer_config (key, value) VALUES ('retention_minutes', '5');
      `
    }

    this.db.exec(schema)
  }

  private loadConfig(): DataBufferConfig {
    const getConfig = this.db.prepare(
      'SELECT value FROM buffer_config WHERE key = ?'
    )

    const maxRowsRow = getConfig.get('max_rows') as { value: string } | undefined
    const retentionRow = getConfig.get('retention_minutes') as
      | { value: string }
      | undefined

    return {
      maxRows: maxRowsRow ? parseInt(maxRowsRow.value, 10) : 60000,
      retentionMinutes: retentionRow ? parseInt(retentionRow.value, 10) : 5
    }
  }

  /**
   * Insert a data point into the buffer.
   * Automatically triggers eviction if buffer exceeds maxRows.
   */
  insert(dataPoint: Omit<DataPoint, 'id'>): void {
    const { tagId, timestamp, value, quality } = dataPoint

    // Determine value column based on type
    let numericValue: number | null = null
    let boolValue: number | null = null
    let textValue: string | null = null

    if (typeof value === 'boolean') {
      boolValue = value ? 1 : 0
    } else if (typeof value === 'string') {
      textValue = value
    } else if (typeof value === 'number') {
      numericValue = value
    }

    this.insertStmt.run(
      tagId,
      timestamp,
      numericValue,
      boolValue,
      textValue,
      quality
    )

    // Evict old entries if over limit
    this.evict()
  }

  /**
   * Batch insert multiple data points (more efficient for polling cycles).
   */
  insertBatch(dataPoints: Omit<DataPoint, 'id'>[]): void {
    const insertMany = this.db.transaction((points: Omit<DataPoint, 'id'>[]) => {
      for (const point of points) {
        this.insert(point)
      }
    })

    insertMany(dataPoints)
  }

  /**
   * Evict old entries to maintain ring buffer size.
   */
  private evict(): void {
    const countResult = this.countStmt.get() as { count: number }

    if (countResult.count > this.config.maxRows) {
      this.evictStmt.run(this.config.maxRows)
      log.debug(
        `[DataBuffer] Evicted entries, current count: ${countResult.count - (countResult.count - this.config.maxRows)}`
      )
    }
  }

  /**
   * Get the time range of available data.
   */
  getRange(): DataRange | null {
    const result = this.rangeStmt.get() as {
      startTimestamp: number | null
      endTimestamp: number | null
      totalPoints: number
    }

    if (result.startTimestamp === null || result.endTimestamp === null) {
      return null
    }

    return {
      startTimestamp: result.startTimestamp,
      endTimestamp: result.endTimestamp,
      totalPoints: result.totalPoints
    }
  }

  /**
   * Seek to a specific timestamp and return the most recent value for each tag.
   * Used for DVR time-travel functionality.
   */
  seek(timestamp: number): Map<string, DataPoint> {
    const rows = this.seekStmt.all(timestamp, timestamp) as Array<{
      tag_id: string
      timestamp: number
      value: number | null
      value_bool: number | null
      value_text: string | null
      quality: string
    }>

    const result = new Map<string, DataPoint>()

    for (const row of rows) {
      let value: number | boolean | string
      if (row.value_bool !== null) {
        value = row.value_bool === 1
      } else if (row.value_text !== null) {
        value = row.value_text
      } else {
        value = row.value ?? 0
      }

      result.set(row.tag_id, {
        id: 0, // Not needed for seek results
        tagId: row.tag_id,
        timestamp: row.timestamp,
        value,
        quality: row.quality as DataQuality
      })
    }

    return result
  }

  /**
   * Get sparkline data for a tag with downsampling.
   * Returns timestamps and values arrays for chart rendering.
   */
  getSparkline(options: SparklineOptions): SparklineResult {
    const { tagId, startTime, endTime, maxPoints } = options

    const rows = this.sparklineStmt.all(tagId, startTime, endTime) as Array<{
      timestamp: number
      value: number
    }>

    // If fewer points than max, return all
    if (rows.length <= maxPoints) {
      return {
        timestamps: rows.map((r) => r.timestamp),
        values: rows.map((r) => r.value)
      }
    }

    // Downsample using LTTB (Largest Triangle Three Buckets) algorithm
    return this.downsampleLTTB(rows, maxPoints)
  }

  /**
   * LTTB downsampling algorithm for sparklines.
   * Preserves visual peaks and troughs better than simple sampling.
   */
  private downsampleLTTB(
    data: Array<{ timestamp: number; value: number }>,
    targetPoints: number
  ): SparklineResult {
    if (data.length <= targetPoints) {
      return {
        timestamps: data.map((d) => d.timestamp),
        values: data.map((d) => d.value)
      }
    }

    const sampled: Array<{ timestamp: number; value: number }> = []

    // Always keep first point
    sampled.push(data[0])

    const bucketSize = (data.length - 2) / (targetPoints - 2)

    let a = 0 // Previous selected point

    for (let i = 0; i < targetPoints - 2; i++) {
      // Calculate bucket boundaries
      const bucketStart = Math.floor((i + 1) * bucketSize) + 1
      const bucketEnd = Math.floor((i + 2) * bucketSize) + 1
      const avgBucketEnd = Math.min(bucketEnd, data.length)

      // Calculate average point in next bucket
      let avgX = 0
      let avgY = 0
      let avgCount = 0

      for (let j = bucketEnd; j < Math.min(bucketEnd + bucketSize, data.length); j++) {
        avgX += data[j].timestamp
        avgY += data[j].value
        avgCount++
      }

      if (avgCount > 0) {
        avgX /= avgCount
        avgY /= avgCount
      }

      // Find point in current bucket that forms largest triangle
      let maxArea = -1
      let maxAreaIndex = bucketStart

      for (let j = bucketStart; j < avgBucketEnd; j++) {
        // Triangle area calculation
        const area = Math.abs(
          (data[a].timestamp - avgX) * (data[j].value - data[a].value) -
            (data[a].timestamp - data[j].timestamp) * (avgY - data[a].value)
        )

        if (area > maxArea) {
          maxArea = area
          maxAreaIndex = j
        }
      }

      sampled.push(data[maxAreaIndex])
      a = maxAreaIndex
    }

    // Always keep last point
    sampled.push(data[data.length - 1])

    return {
      timestamps: sampled.map((s) => s.timestamp),
      values: sampled.map((s) => s.value)
    }
  }

  /**
   * Get data points for export (CSV or report).
   * Returns raw data without downsampling.
   */
  getDataForExport(
    tagIds: string[],
    startTime: number,
    endTime: number
  ): DataPoint[] {
    const placeholders = tagIds.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT id, tag_id, timestamp, value, value_bool, value_text, quality
      FROM datapoints
      WHERE tag_id IN (${placeholders})
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `)

    const rows = stmt.all(...tagIds, startTime, endTime) as Array<{
      id: number
      tag_id: string
      timestamp: number
      value: number | null
      value_bool: number | null
      value_text: string | null
      quality: string
    }>

    return rows.map((row) => {
      let value: number | boolean | string
      if (row.value_bool !== null) {
        value = row.value_bool === 1
      } else if (row.value_text !== null) {
        value = row.value_text
      } else {
        value = row.value ?? 0
      }

      return {
        id: row.id,
        tagId: row.tag_id,
        timestamp: row.timestamp,
        value,
        quality: row.quality as DataQuality
      }
    })
  }

  /**
   * Update buffer configuration.
   */
  updateConfig(config: Partial<DataBufferConfig>): void {
    const updateStmt = this.db.prepare(
      'INSERT OR REPLACE INTO buffer_config (key, value) VALUES (?, ?)'
    )

    if (config.maxRows !== undefined) {
      updateStmt.run('max_rows', config.maxRows.toString())
      this.config.maxRows = config.maxRows
    }

    if (config.retentionMinutes !== undefined) {
      updateStmt.run('retention_minutes', config.retentionMinutes.toString())
      this.config.retentionMinutes = config.retentionMinutes
    }

    log.info('[DataBuffer] Configuration updated', this.config)
  }

  /**
   * Clear all data from the buffer.
   */
  clear(): void {
    this.db.exec('DELETE FROM datapoints')
    log.info('[DataBuffer] Buffer cleared')
  }

  /**
   * Get current configuration.
   */
  getConfig(): DataBufferConfig {
    return { ...this.config }
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close()
    log.info('[DataBuffer] Database connection closed')
  }
}

// Singleton instance
let instance: DataBuffer | null = null

export function getDataBuffer(): DataBuffer {
  if (!instance) {
    instance = new DataBuffer()
  }
  return instance
}

export function closeDataBuffer(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}
