/**
 * Alert History SQLite Schema
 *
 * Schema for persistent storage of alert events.
 * Used by AlertHistoryStore service.
 */

-- Alert events table
CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tag_ref TEXT NOT NULL,
  trigger_value REAL NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at INTEGER,
  acknowledged_by TEXT
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alert_timestamp ON alert_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rule ON alert_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert_events(severity);
CREATE INDEX IF NOT EXISTS idx_alert_acknowledged ON alert_events(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alert_filter ON alert_events(severity, timestamp DESC);

-- Alert rules table (optional - for rule persistence)
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag_ref TEXT NOT NULL,
  condition_operator TEXT NOT NULL,
  condition_value REAL NOT NULL,
  condition_value2 REAL,
  condition_duration INTEGER DEFAULT 0,
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
  actions TEXT NOT NULL, -- JSON array of action types
  enabled INTEGER DEFAULT 1,
  cooldown INTEGER DEFAULT 60,
  created_at INTEGER NOT NULL
);

-- Index for rule lookups
CREATE INDEX IF NOT EXISTS idx_rule_tag ON alert_rules(tag_ref);
CREATE INDEX IF NOT EXISTS idx_rule_enabled ON alert_rules(enabled);
