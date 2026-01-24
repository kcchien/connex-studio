-- SQLite Schema for IIoT Protocol Studio DVR (Data Video Recorder)
-- Ring buffer implementation for time-series data storage

-- Ring buffer for DVR data points
-- Uses ROWID-based eviction for efficient circular buffer behavior
CREATE TABLE IF NOT EXISTS datapoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  value REAL,
  value_bool INTEGER,           -- For boolean tags (0 or 1)
  value_text TEXT,              -- For string tags
  quality TEXT DEFAULT 'good'   -- 'good', 'bad', 'uncertain'
);

-- Composite index for efficient time-range queries per tag
CREATE INDEX IF NOT EXISTS idx_datapoints_tag_time
  ON datapoints(tag_id, timestamp);

-- Additional index for timestamp-only queries (DVR seek)
CREATE INDEX IF NOT EXISTS idx_datapoints_timestamp
  ON datapoints(timestamp);

-- Buffer configuration table
CREATE TABLE IF NOT EXISTS buffer_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Default configuration values
-- max_rows: 60000 = 100 tags x 10 samples/sec x 60 seconds
-- retention_minutes: 5 = default DVR buffer duration
INSERT OR IGNORE INTO buffer_config (key, value) VALUES ('max_rows', '60000');
INSERT OR IGNORE INTO buffer_config (key, value) VALUES ('retention_minutes', '5');
