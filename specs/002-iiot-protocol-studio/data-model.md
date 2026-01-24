# Data Model: IIoT Protocol Studio

**Date**: 2025-01-23
**Source**: spec.md Key Entities section

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     Profile     │       │  VirtualServer  │
│─────────────────│       │─────────────────│
│ id              │       │ id              │
│ name            │       │ protocol        │
│ version         │       │ port            │
│ settings        │       │ status          │
│ exportedAt      │       │ registers[]     │
└────────┬────────┘       └─────────────────┘
         │ 1:N
         ▼
┌─────────────────┐
│   Connection    │
│─────────────────│
│ id              │
│ name            │
│ protocol        │◄────────────────────────┐
│ config          │                         │
│ status          │                         │
│ lastError       │                         │
│ createdAt       │                         │
└────────┬────────┘                         │
         │ 1:N                              │
         ▼                                  │
┌─────────────────┐                         │
│      Tag        │                         │
│─────────────────│       ┌─────────────────┤
│ id              │       │    Waveform     │
│ connectionId    │───────│─────────────────│
│ name            │       │ type            │
│ address         │       │ amplitude       │
│ dataType        │       │ offset          │
│ displayFormat   │       │ period          │
│ thresholds      │       └─────────────────┘
│ enabled         │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│   DataPoint     │
│─────────────────│
│ id              │
│ tagId           │
│ timestamp       │
│ value           │
│ quality         │
└─────────────────┘
```

## Entity Schemas

### Connection

Represents a protocol client session to a remote device or broker.

```typescript
interface Connection {
  id: string;                    // UUID v4
  name: string;                  // User-friendly name, e.g., "PLC-A"
  protocol: 'modbus-tcp' | 'mqtt' | 'opcua';
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig;
  status: ConnectionStatus;
  lastError?: string;            // Most recent error message
  createdAt: number;             // Unix timestamp ms
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ModbusTcpConfig {
  host: string;                  // IP address or hostname
  port: number;                  // 1-65535, default 502
  unitId: number;                // 0-255, default 1
  timeout: number;               // Connection timeout ms, default 5000
}

interface MqttConfig {
  brokerUrl: string;             // mqtt://host:port or mqtts://host:port
  clientId: string;              // Unique client identifier
  username?: string;             // Stored in keytar, not here
  password?: string;             // Stored in keytar, not here
  useTls: boolean;
  caCert?: string;               // Path to CA certificate file
}

interface OpcUaConfig {
  endpointUrl: string;           // opc.tcp://host:port/path
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;        // e.g., "Basic256Sha256"
  username?: string;             // Stored in keytar
  password?: string;             // Stored in keytar
}
```

**Validation Rules**:
- `name`: Required, 1-50 characters, unique within profile
- `config.host`: Valid IP or hostname
- `config.port`: Integer 1-65535
- `config.unitId` (Modbus): Integer 0-255

**State Transitions**:
```
disconnected ──connect()──► connecting ──success──► connected
     ▲                           │                      │
     │                       timeout/                   │
     │                        error                disconnect()
     │                           │                 or error
     │                           ▼                      │
     └──────────────────────── error ◄─────────────────┘
```

### Tag

A monitored data point bound to a specific connection.

```typescript
interface Tag {
  id: string;                    // UUID v4
  connectionId: string;          // FK to Connection.id
  name: string;                  // User-friendly label
  address: ModbusAddress | MqttAddress | OpcUaAddress;
  dataType: DataType;
  displayFormat: DisplayFormat;
  thresholds: Thresholds;
  enabled: boolean;              // Include in polling cycle
}

interface ModbusAddress {
  type: 'modbus';
  registerType: 'holding' | 'input' | 'coil' | 'discrete';
  address: number;               // 0-65535 (0-based internal)
  length: number;                // Number of registers (1-125 for holding/input)
}

interface MqttAddress {
  type: 'mqtt';
  topic: string;                 // e.g., "factory/sensor/temp"
  jsonPath?: string;             // Optional JSON extraction, e.g., "$.value"
}

interface OpcUaAddress {
  type: 'opcua';
  nodeId: string;                // e.g., "ns=2;s=Temperature"
}

type DataType =
  | 'int16' | 'uint16'
  | 'int32' | 'uint32'
  | 'float32'
  | 'boolean'
  | 'string';

interface DisplayFormat {
  decimals: number;              // Decimal places, default 2
  unit: string;                  // e.g., "°C", "bar", "%"
  prefix?: string;               // Prefix text
  suffix?: string;               // Suffix text
}

interface Thresholds {
  warningLow?: number;
  warningHigh?: number;
  alarmLow?: number;
  alarmHigh?: number;
}
```

**Validation Rules**:
- `name`: Required, 1-100 characters
- `address.address` (Modbus): 0-65535
- `address.length` (Modbus): 1-125 for holding/input, 1-2000 for coil/discrete
- `displayFormat.decimals`: 0-10

### DataPoint

A single sampled value from a tag at a specific time.

```typescript
interface DataPoint {
  id: number;                    // SQLite auto-increment ROWID
  tagId: string;                 // FK to Tag.id
  timestamp: number;             // Unix timestamp ms
  value: number | boolean | string;
  quality: DataQuality;
}

type DataQuality = 'good' | 'bad' | 'uncertain';
```

**Storage**: SQLite ring buffer (see research.md).

**Retention**: Configurable, default 5 minutes worth of samples.

### Profile

Saved configuration bundle for persistence and sharing.

```typescript
interface Profile {
  id: string;                    // UUID v4
  name: string;                  // User-chosen name
  version: string;               // Schema version, e.g., "1.0.0"
  connections: Connection[];     // Embedded connections (credentials excluded)
  tags: Tag[];                   // Embedded tags
  settings: ProfileSettings;
  exportedAt?: number;           // Timestamp when last exported
}

interface ProfileSettings {
  defaultPollInterval: number;   // ms, default 1000
  dvrBufferMinutes: number;      // default 5
  theme: 'light' | 'dark' | 'system';
}
```

**File Format**: JSON, stored in `{userData}/profiles/{name}.json`

**Schema Migration**: Profile loader checks `version` field and applies migrations if needed.

### VirtualServer

Simulated protocol server for testing without hardware.

```typescript
interface VirtualServer {
  id: string;                    // UUID v4
  protocol: 'modbus-tcp';        // Phase 1: Modbus only
  port: number;                  // Listening port
  status: 'stopped' | 'starting' | 'running' | 'error';
  registers: VirtualRegister[];
}

interface VirtualRegister {
  address: number;               // Starting address
  length: number;                // Number of registers
  waveform: Waveform;
  currentValues: number[];       // Live generated values
}
```

### Waveform

Data generator configuration for Virtual Server.

```typescript
interface Waveform {
  type: 'constant' | 'sine' | 'square' | 'triangle' | 'random';
  amplitude: number;             // Peak deviation from offset
  offset: number;                // Center value
  period: number;                // Cycle period in ms (for sine/square/triangle)
  min?: number;                  // For random: minimum value
  max?: number;                  // For random: maximum value
}
```

**Value Generation**:
```typescript
function generateValue(waveform: Waveform, t: number): number {
  const { type, amplitude, offset, period } = waveform;
  const phase = (t % period) / period;

  switch (type) {
    case 'constant': return offset;
    case 'sine': return offset + amplitude * Math.sin(2 * Math.PI * phase);
    case 'square': return offset + (phase < 0.5 ? amplitude : -amplitude);
    case 'triangle': return offset + amplitude * (1 - 4 * Math.abs(phase - 0.5));
    case 'random': return waveform.min! + Math.random() * (waveform.max! - waveform.min!);
  }
}
```

## SQLite Schema

```sql
-- Ring buffer for DVR data points
CREATE TABLE IF NOT EXISTS datapoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  value REAL,
  value_bool INTEGER,           -- For boolean tags
  value_text TEXT,              -- For string tags
  quality TEXT DEFAULT 'good'
);

CREATE INDEX IF NOT EXISTS idx_datapoints_tag_time
  ON datapoints(tag_id, timestamp);

-- Buffer configuration
CREATE TABLE IF NOT EXISTS buffer_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO buffer_config (key, value) VALUES ('max_rows', '60000');
INSERT OR IGNORE INTO buffer_config (key, value) VALUES ('retention_minutes', '5');
```

## Derived State (Renderer)

```typescript
// Computed from DataPoint[] for display
interface TagDisplayState {
  tagId: string;
  currentValue: number | boolean | string | null;
  quality: DataQuality;
  timestamp: number;
  sparklineData: number[];       // Last 60 values for sparkline
  alarmState: 'normal' | 'warning' | 'alarm';
  trend: 'up' | 'down' | 'stable';
}

// DVR playback state
interface DvrState {
  isLive: boolean;
  playbackTimestamp: number;     // Current position in history
  bufferStartTimestamp: number;  // Oldest available data
  bufferEndTimestamp: number;    // Most recent data (now if live)
}
```
