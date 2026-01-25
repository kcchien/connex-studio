# IPC Channel Contracts

**Date**: 2025-01-23
**Pattern**: Main process exposes handlers via `ipcMain.handle()`, Renderer invokes via `ipcRenderer.invoke()`

## Channel Naming Convention

```
{domain}:{action}
```

- **domain**: Feature area (connection, tag, polling, profile, export, dvr, log)
- **action**: Operation (create, read, update, delete, start, stop, etc.)

## Connection Channels

### `connection:create`

Create a new connection (does not connect yet).

**Request**:
```typescript
{
  name: string;
  protocol: 'modbus-tcp' | 'mqtt' | 'opcua';
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig;
}
```

**Response**:
```typescript
{ success: true; connection: Connection }
| { success: false; error: string }
```

### `connection:connect`

Establish connection to remote device.

**Request**:
```typescript
{ connectionId: string }
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `connection:disconnect`

Close connection.

**Request**:
```typescript
{ connectionId: string }
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `connection:delete`

Remove connection and its tags.

**Request**:
```typescript
{ connectionId: string }
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `connection:list`

Get all connections.

**Request**: `{}`

**Response**:
```typescript
{ connections: Connection[] }
```

### `connection:read-once`

Perform a single read operation (for quick test).

**Request**:
```typescript
{
  connectionId: string;
  address: ModbusAddress | MqttAddress | OpcUaAddress;
}
```

**Response**:
```typescript
{ success: true; value: number | boolean | string; quality: DataQuality }
| { success: false; error: string }
```

## Tag Channels

### `tag:create`

Create a new tag for a connection.

**Request**:
```typescript
{
  connectionId: string;
  name: string;
  address: ModbusAddress | MqttAddress | OpcUaAddress;
  dataType: DataType;
  displayFormat?: DisplayFormat;
  thresholds?: Thresholds;
}
```

**Response**:
```typescript
{ success: true; tag: Tag }
| { success: false; error: string }
```

### `tag:update`

Update tag properties.

**Request**:
```typescript
{
  tagId: string;
  updates: Partial<Omit<Tag, 'id' | 'connectionId'>>;
}
```

**Response**:
```typescript
{ success: true; tag: Tag }
| { success: false; error: string }
```

### `tag:delete`

Remove a tag.

**Request**:
```typescript
{ tagId: string }
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `tag:list`

Get tags for a connection.

**Request**:
```typescript
{ connectionId: string }
```

**Response**:
```typescript
{ tags: Tag[] }
```

### `tag:import-csv`

Batch import tags from CSV.

**Request**:
```typescript
{
  connectionId: string;
  csvContent: string;
}
```

**Response**:
```typescript
{ success: true; imported: number; errors: string[] }
| { success: false; error: string }
```

**CSV Format**:
```csv
name,registerType,address,length,dataType,unit,warningHigh,alarmHigh
Temperature,holding,40001,1,float32,°C,80,100
Pressure,holding,40003,1,float32,bar,5,6
```

## Polling Channels

### `polling:start`

Start polling cycle for specified tags.

**Request**:
```typescript
{
  connectionId: string;
  tagIds: string[];          // Empty = all enabled tags
  intervalMs: number;        // 100-60000
}
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `polling:stop`

Stop polling for a connection.

**Request**:
```typescript
{ connectionId: string }
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `polling:status`

Get current polling status.

**Request**:
```typescript
{ connectionId: string }
```

**Response**:
```typescript
{
  isPolling: boolean;
  intervalMs: number;
  lastPollTimestamp: number;
  tagCount: number;
}
```

## Push Channels (Main → Renderer)

These are sent via `webContents.send()` from Main process.

### `polling:data`

Real-time data update pushed during polling.

**Payload**:
```typescript
{
  connectionId: string;
  timestamp: number;
  values: Array<{
    tagId: string;
    value: number | boolean | string;
    quality: DataQuality;
  }>;
}
```

### `connection:status-changed`

Connection status update.

**Payload**:
```typescript
{
  connectionId: string;
  status: ConnectionStatus;
  error?: string;
}
```

## Profile Channels

### `profile:save`

Save current configuration as profile.

**Request**:
```typescript
{
  name: string;
  connectionIds: string[];   // Which connections to include
}
```

**Response**:
```typescript
{ success: true; path: string }
| { success: false; error: string }
```

### `profile:load`

Load a profile.

**Request**:
```typescript
{ name: string }
```

**Response**:
```typescript
{
  success: true;
  profile: Profile;
  connections: Connection[];
  tags: Tag[];
}
| { success: false; error: string }
```

### `profile:list`

List available profiles.

**Request**: `{}`

**Response**:
```typescript
{
  profiles: Array<{
    name: string;
    version: string;
    connectionCount: number;
    tagCount: number;
    exportedAt?: number;
  }>;
}
```

### `profile:delete`

Delete a profile.

**Request**:
```typescript
{ name: string }
```

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

### `profile:import`

Import profile from file.

**Request**:
```typescript
{ filePath: string }
```

**Response**:
```typescript
{ success: true; name: string }
| { success: false; error: string }
```

### `profile:export`

Export profile to user-selected location.

**Request**:
```typescript
{ name: string }
```

**Response**: Opens save dialog, returns:
```typescript
{ success: true; path: string }
| { success: false; error: string; cancelled?: boolean }
```

## DVR Channels

### `dvr:get-range`

Get available time range in buffer.

**Request**: `{}`

**Response**:
```typescript
{
  startTimestamp: number;
  endTimestamp: number;
  dataPointCount: number;
}
```

### `dvr:seek`

Get data snapshot at specific timestamp.

**Request**:
```typescript
{
  timestamp: number;
  tagIds?: string[];         // Empty = all tags
}
```

**Response**:
```typescript
{
  timestamp: number;
  values: Array<{
    tagId: string;
    value: number | boolean | string;
    quality: DataQuality;
  }>;
}
```

### `dvr:get-sparkline`

Get time-series data for sparkline rendering.

**Request**:
```typescript
{
  tagId: string;
  startTimestamp: number;
  endTimestamp: number;
  maxPoints: number;         // Downsample if needed, default 60
}
```

**Response**:
```typescript
{
  timestamps: number[];
  values: number[];
}
```

## Export Channels

### `export:csv`

Export data to CSV file.

**Request**:
```typescript
{
  tagIds: string[];
  startTimestamp: number;
  endTimestamp: number;
}
```

**Response**: Opens save dialog, returns:
```typescript
{ success: true; path: string; rowCount: number }
| { success: false; error: string; cancelled?: boolean }
```

### `export:html-report`

Generate HTML report.

**Request**:
```typescript
{
  tagIds: string[];
  startTimestamp: number;
  endTimestamp: number;
  includeCharts: boolean;
}
```

**Response**: Opens save dialog, returns:
```typescript
{ success: true; path: string }
| { success: false; error: string; cancelled?: boolean }
```

## Log Channels

### `log:get-recent`

Get recent log entries.

**Request**:
```typescript
{
  limit: number;             // Default 100
  level?: 'debug' | 'info' | 'warn' | 'error';
}
```

**Response**:
```typescript
{
  entries: Array<{
    timestamp: number;
    level: string;
    message: string;
  }>;
}
```

### `log:open-folder`

Open log folder in file manager.

**Request**: `{}`

**Response**:
```typescript
{ success: true }
| { success: false; error: string }
```

## App Lifecycle Channels

### `app:check-unsaved`

Check if there are unsaved changes before close.

**Request**: `{}`

**Response**:
```typescript
{
  hasUnsavedChanges: boolean;
  pollingActive: boolean;
}
```

### `app:force-quit`

Force quit without save prompt (user chose to discard).

**Request**: `{}`

**Response**: App exits.
