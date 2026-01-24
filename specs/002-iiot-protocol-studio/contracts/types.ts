/**
 * IIoT Protocol Studio - Shared Type Definitions
 *
 * These types are shared between Main and Renderer processes.
 * Import from '@shared/types' (configured in tsconfig paths).
 */

// =============================================================================
// Connection Types
// =============================================================================

export type Protocol = 'modbus-tcp' | 'mqtt' | 'opcua';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface Connection {
  id: string;
  name: string;
  protocol: Protocol;
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig;
  status: ConnectionStatus;
  lastError?: string;
  createdAt: number;
}

export interface ModbusTcpConfig {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
}

export interface MqttConfig {
  brokerUrl: string;
  clientId: string;
  username?: string;  // Not persisted in JSON; stored in keytar
  password?: string;  // Not persisted in JSON; stored in keytar
  useTls: boolean;
  caCert?: string;
}

export interface OpcUaConfig {
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;
  username?: string;  // Not persisted in JSON; stored in keytar
  password?: string;  // Not persisted in JSON; stored in keytar
}

// =============================================================================
// Tag Types
// =============================================================================

export interface Tag {
  id: string;
  connectionId: string;
  name: string;
  address: ModbusAddress | MqttAddress | OpcUaAddress;
  dataType: DataType;
  displayFormat: DisplayFormat;
  thresholds: Thresholds;
  enabled: boolean;
}

export interface ModbusAddress {
  type: 'modbus';
  registerType: 'holding' | 'input' | 'coil' | 'discrete';
  address: number;
  length: number;
}

export interface MqttAddress {
  type: 'mqtt';
  topic: string;
  jsonPath?: string;
}

export interface OpcUaAddress {
  type: 'opcua';
  nodeId: string;
}

export type DataType =
  | 'int16'
  | 'uint16'
  | 'int32'
  | 'uint32'
  | 'float32'
  | 'boolean'
  | 'string';

export interface DisplayFormat {
  decimals: number;
  unit: string;
  prefix?: string;
  suffix?: string;
}

export interface Thresholds {
  warningLow?: number;
  warningHigh?: number;
  alarmLow?: number;
  alarmHigh?: number;
}

// =============================================================================
// DataPoint Types
// =============================================================================

export type DataQuality = 'good' | 'bad' | 'uncertain';

export interface DataPoint {
  id: number;
  tagId: string;
  timestamp: number;
  value: number | boolean | string;
  quality: DataQuality;
}

// =============================================================================
// Profile Types
// =============================================================================

export interface Profile {
  id: string;
  name: string;
  version: string;
  connections: Connection[];
  tags: Tag[];
  settings: ProfileSettings;
  exportedAt?: number;
}

export interface ProfileSettings {
  defaultPollInterval: number;
  dvrBufferMinutes: number;
  theme: 'light' | 'dark' | 'system';
}

export interface ProfileSummary {
  name: string;
  version: string;
  connectionCount: number;
  tagCount: number;
  exportedAt?: number;
}

// =============================================================================
// Virtual Server Types
// =============================================================================

export type VirtualServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface VirtualServer {
  id: string;
  protocol: 'modbus-tcp';
  port: number;
  status: VirtualServerStatus;
  registers: VirtualRegister[];
}

export interface VirtualRegister {
  address: number;
  length: number;
  waveform: Waveform;
  currentValues: number[];
}

export interface Waveform {
  type: 'constant' | 'sine' | 'square' | 'triangle' | 'random';
  amplitude: number;
  offset: number;
  period: number;
  min?: number;
  max?: number;
}

// =============================================================================
// Polling Types
// =============================================================================

export interface PollingStatus {
  isPolling: boolean;
  intervalMs: number;
  lastPollTimestamp: number;
  tagCount: number;
}

export interface PollingDataPayload {
  connectionId: string;
  timestamp: number;
  values: TagValue[];
}

export interface TagValue {
  tagId: string;
  value: number | boolean | string;
  quality: DataQuality;
}

// =============================================================================
// DVR Types
// =============================================================================

export interface DvrRange {
  startTimestamp: number;
  endTimestamp: number;
  dataPointCount: number;
}

export interface DvrSnapshot {
  timestamp: number;
  values: TagValue[];
}

export interface SparklineData {
  timestamps: number[];
  values: number[];
}

// =============================================================================
// Export Types
// =============================================================================

export interface ExportResult {
  success: boolean;
  path?: string;
  rowCount?: number;
  error?: string;
  cancelled?: boolean;
}

// =============================================================================
// Log Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
}

// =============================================================================
// IPC Response Types
// =============================================================================

export type IpcResult<T> =
  | { success: true } & T
  | { success: false; error: string };

// =============================================================================
// UI State Types (Renderer only, but shared for type safety)
// =============================================================================

export type AlarmState = 'normal' | 'warning' | 'alarm';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface TagDisplayState {
  tagId: string;
  currentValue: number | boolean | string | null;
  quality: DataQuality;
  timestamp: number;
  sparklineData: number[];
  alarmState: AlarmState;
  trend: TrendDirection;
}

export interface DvrState {
  isLive: boolean;
  playbackTimestamp: number;
  bufferStartTimestamp: number;
  bufferEndTimestamp: number;
}
