/**
 * Alert History Store
 *
 * SQLite-based storage for alert events history.
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type {
  AlertEvent,
  AlertEventQuery,
  AlertEventPage,
  AlertSeverity
} from '@shared/types'

/**
 * Alert History Store manages persistent storage for alert events.
 */
export class AlertHistoryStore {
  private db: Database.Database | null = null
  private dbPath: string

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? path.join(app.getPath('userData'), 'alert-history.db')
  }

  /**
   * Initialize the database and create tables.
   */
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath)

    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL')

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tag_ref TEXT NOT NULL,
        trigger_value REAL NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_at INTEGER,
        acknowledged_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_alert_timestamp ON alert_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_alert_rule ON alert_events(rule_id);
      CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert_events(severity);
      CREATE INDEX IF NOT EXISTS idx_alert_acknowledged ON alert_events(acknowledged);
      CREATE INDEX IF NOT EXISTS idx_alert_filter ON alert_events(severity, timestamp DESC);
    `)
  }

  /**
   * Insert a new alert event.
   */
  insert(event: Omit<AlertEvent, 'id'>): AlertEvent {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      INSERT INTO alert_events (
        rule_id, timestamp, tag_ref, trigger_value,
        severity, message, acknowledged, acknowledged_at, acknowledged_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      event.ruleId,
      event.timestamp,
      event.tagRef,
      event.triggerValue,
      event.severity,
      event.message,
      event.acknowledged ? 1 : 0,
      event.acknowledgedAt ?? null,
      event.acknowledgedBy ?? null
    )

    return {
      ...event,
      id: result.lastInsertRowid as number
    }
  }

  /**
   * Query alert events with pagination.
   */
  query(query: AlertEventQuery): AlertEventPage {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const conditions: string[] = []
    const params: unknown[] = []

    if (query.severity) {
      conditions.push('severity = ?')
      params.push(query.severity)
    }

    if (query.acknowledged !== undefined) {
      conditions.push('acknowledged = ?')
      params.push(query.acknowledged ? 1 : 0)
    }

    if (query.from) {
      conditions.push('timestamp >= ?')
      params.push(query.from)
    }

    if (query.to) {
      conditions.push('timestamp <= ?')
      params.push(query.to)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM alert_events ${whereClause}`)
    const { count: total } = countStmt.get(...params) as { count: number }

    // Get events
    const selectStmt = this.db.prepare(`
      SELECT * FROM alert_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `)

    const rows = selectStmt.all(...params, limit, offset) as Array<{
      id: number
      rule_id: string
      timestamp: number
      tag_ref: string
      trigger_value: number
      severity: string
      message: string
      acknowledged: number
      acknowledged_at: number | null
      acknowledged_by: string | null
    }>

    const events: AlertEvent[] = rows.map(row => ({
      id: row.id,
      ruleId: row.rule_id,
      timestamp: row.timestamp,
      tagRef: row.tag_ref,
      triggerValue: row.trigger_value,
      severity: row.severity as AlertSeverity,
      message: row.message,
      acknowledged: row.acknowledged === 1,
      acknowledgedAt: row.acknowledged_at ?? undefined,
      acknowledgedBy: row.acknowledged_by ?? undefined
    }))

    return {
      events,
      total,
      hasMore: offset + events.length < total
    }
  }

  /**
   * Acknowledge an alert event.
   */
  acknowledge(eventId: number, acknowledgedBy?: string): boolean {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      UPDATE alert_events
      SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ?
      WHERE id = ?
    `)

    const result = stmt.run(Date.now(), acknowledgedBy ?? 'User', eventId)
    return result.changes > 0
  }

  /**
   * Acknowledge all unacknowledged alerts, optionally filtered by severity.
   */
  acknowledgeAll(severity?: AlertSeverity): number {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    let sql = 'UPDATE alert_events SET acknowledged = 1, acknowledged_at = ? WHERE acknowledged = 0'
    const params: unknown[] = [Date.now()]

    if (severity) {
      sql += ' AND severity = ?'
      params.push(severity)
    }

    const stmt = this.db.prepare(sql)
    const result = stmt.run(...params)
    return result.changes
  }

  /**
   * Clear old events from history.
   */
  clearHistory(before?: number): number {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    let sql = 'DELETE FROM alert_events'
    const params: unknown[] = []

    if (before) {
      sql += ' WHERE timestamp < ?'
      params.push(before)
    }

    const stmt = this.db.prepare(sql)
    const result = stmt.run(...params)
    return result.changes
  }

  /**
   * Get count of unacknowledged alerts by severity.
   */
  getUnacknowledgedCounts(): Record<AlertSeverity, number> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const stmt = this.db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM alert_events
      WHERE acknowledged = 0
      GROUP BY severity
    `)

    const rows = stmt.all() as Array<{ severity: string; count: number }>

    const counts: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0
    }

    for (const row of rows) {
      counts[row.severity as AlertSeverity] = row.count
    }

    return counts
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Singleton instance
let instance: AlertHistoryStore | null = null

export function getAlertHistoryStore(): AlertHistoryStore {
  if (!instance) {
    instance = new AlertHistoryStore()
  }
  return instance
}

export function closeAlertHistoryStore(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}
