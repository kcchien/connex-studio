# TypeScript Type Definitions

共用型別定義，用於 `src/shared/types/`。

---

## connection.ts

```ts
// src/shared/types/connection.ts

export type Protocol = 'modbus-tcp' | 'mqtt' | 'opcua'

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'error'

export interface ReconnectPolicy {
  enabled: boolean
  maxRetries: number       // default: 5
  intervalMs: number       // default: 3000
  backoffMultiplier: number // default: 1.5
}

export interface Connection {
  id: string
  name: string
  protocol: Protocol
  status: ConnectionStatus
  config: ModbusConfig | MqttConfig | OpcuaConfig
  reconnectPolicy?: ReconnectPolicy
  createdAt: number
  lastConnectedAt: number | null
  errorMessage?: string
}

// Modbus TCP Configuration
export type ByteOrder = 'big-endian' | 'little-endian' | 'mid-big' | 'mid-little'

export interface ModbusConfig {
  host: string
  port: number              // default: 502
  unitId: number            // default: 1
  timeout: number           // default: 3000ms
  defaultByteOrder: ByteOrder // default: 'big-endian'
}

// MQTT Configuration
export interface MqttConfig {
  brokerUrl: string
  clientId?: string
  username?: string
  password?: string
  useTls: boolean           // default: false
  cleanSession: boolean     // default: true
}

// OPC UA Configuration
export type SecurityMode = 'None' | 'Sign' | 'SignAndEncrypt'
export type SecurityPolicy = 'None' | 'Basic256Sha256' | 'Aes128Sha256RsaOaep'

export interface OpcuaConfig {
  endpointUrl: string
  securityMode: SecurityMode
  securityPolicy: SecurityPolicy
  applicationName: string   // default: 'Connex Studio'
}

// Type guards
export function isModbusConfig(config: unknown): config is ModbusConfig {
  return typeof config === 'object' && config !== null && 'host' in config && 'unitId' in config
}

export function isMqttConfig(config: unknown): config is MqttConfig {
  return typeof config === 'object' && config !== null && 'brokerUrl' in config
}

export function isOpcuaConfig(config: unknown): config is OpcuaConfig {
  return typeof config === 'object' && config !== null && 'endpointUrl' in config && 'securityMode' in config
}
```

---

## tag.ts

```ts
// src/shared/types/tag.ts

import type { ByteOrder } from './connection'

export type DataType = 
  | 'bool'
  | 'int16' | 'uint16'
  | 'int32' | 'uint32'
  | 'int64' | 'uint64'
  | 'float32' | 'float64'
  | 'string'
  | 'json'

export type DisplayFormat = 'decimal' | 'hex' | 'binary' | 'ascii' | 'json'

export type Quality = 'good' | 'bad' | 'uncertain' | 'stale'

export interface AlertConfig {
  enabled: boolean
  lowWarning?: number
  lowCritical?: number
  highWarning?: number
  highCritical?: number
}

export interface Tag {
  id: string
  connectionId: string
  name: string
  address: string
  dataType: DataType
  displayFormat: DisplayFormat
  byteOrder: ByteOrder | null
  pollingInterval: number | null
  alertConfig: AlertConfig | null
}

export interface TagValue {
  value: unknown
  quality: Quality
  timestamp: number
  sourceTimestamp: number | null
}

export interface TagWithValue extends Tag {
  currentValue: TagValue | null
}

export interface DataPoint {
  tagId: string
  value: number | string | boolean
  timestamp: number
}

// Modbus address parsing
export type ModbusFunctionCode = 'hr' | 'ir' | 'co' | 'di'

export interface ParsedModbusAddress {
  functionCode: ModbusFunctionCode
  address: number
}

export function parseModbusAddress(address: string): ParsedModbusAddress | null {
  const match = address.match(/^(hr|ir|co|di):(\d+)$/)
  if (!match) return null
  return {
    functionCode: match[1] as ModbusFunctionCode,
    address: parseInt(match[2], 10)
  }
}
```

---

## virtual-server.ts

```ts
// src/shared/types/virtual-server.ts

export type VirtualServerType = 'modbus-tcp'

export type VirtualServerStatus = 'stopped' | 'running' | 'error'

export interface VirtualModbusConfig {
  port: number              // default: 502
  unitId: number            // default: 1
  holdingRegisters: number  // default: 100
  inputRegisters: number    // default: 100
  coils: number             // default: 100
  discreteInputs: number    // default: 100
}

export interface VirtualServer {
  id: string
  name: string
  type: VirtualServerType
  status: VirtualServerStatus
  config: VirtualModbusConfig
  errorMessage?: string
}

export type WaveformType = 'sine' | 'random' | 'sawtooth' | 'step'

export interface WaveformConfig {
  amplitude: number
  offset: number
  period: number            // ms
  min?: number              // for random
  max?: number              // for random
  stepSize?: number         // for step
}

export interface Waveform {
  id: string
  serverId: string
  type: WaveformType
  targetAddress: string
  config: WaveformConfig
  enabled: boolean
}
```

---

## dvr.ts

```ts
// src/shared/types/dvr.ts

import type { TagValue } from './tag'

export interface DvrState {
  isPaused: boolean
  currentTime: number | null  // null = live mode
  bufferStartTime: number
  bufferEndTime: number
}

export interface TagSnapshot {
  tagId: string
  value: unknown
  timestamp: number
}

export interface DvrRange {
  tagId: string
  dataPoints: Array<{
    value: number
    timestamp: number
  }>
}
```

---

## ipc.ts

```ts
// src/shared/types/ipc.ts

import type { Connection, Protocol, ModbusConfig, MqttConfig, OpcuaConfig, ReconnectPolicy } from './connection'
import type { Tag, TagValue, DataType, DisplayFormat, AlertConfig, DataPoint } from './tag'
import type { VirtualServer, VirtualModbusConfig, Waveform, WaveformType, WaveformConfig } from './virtual-server'
import type { DvrState, TagSnapshot } from './dvr'

// ============ IPC Channel Names ============

export const IPC_CHANNELS = {
  // Connection
  CONNECTION_CREATE: 'connection:create',
  CONNECTION_CONNECT: 'connection:connect',
  CONNECTION_DISCONNECT: 'connection:disconnect',
  CONNECTION_LIST: 'connection:list',
  CONNECTION_DELETE: 'connection:delete',
  
  // Tag
  TAG_CREATE: 'tag:create',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',
  TAG_LIST: 'tag:list',
  
  // Modbus
  MODBUS_READ: 'modbus:read',
  MODBUS_WRITE: 'modbus:write',
  MODBUS_START_POLLING: 'modbus:start-polling',
  MODBUS_STOP_POLLING: 'modbus:stop-polling',
  
  // MQTT
  MQTT_SUBSCRIBE: 'mqtt:subscribe',
  MQTT_UNSUBSCRIBE: 'mqtt:unsubscribe',
  MQTT_PUBLISH: 'mqtt:publish',
  
  // OPC UA
  OPCUA_BROWSE: 'opcua:browse',
  OPCUA_READ: 'opcua:read',
  OPCUA_SUBSCRIBE: 'opcua:subscribe',
  OPCUA_UNSUBSCRIBE: 'opcua:unsubscribe',
  
  // Virtual Server
  VIRTUAL_SERVER_CREATE: 'virtual-server:create',
  VIRTUAL_SERVER_START: 'virtual-server:start',
  VIRTUAL_SERVER_STOP: 'virtual-server:stop',
  VIRTUAL_SERVER_SET_WAVEFORM: 'virtual-server:set-waveform',
  
  // DVR
  DVR_PAUSE: 'dvr:pause',
  DVR_RESUME: 'dvr:resume',
  DVR_SEEK: 'dvr:seek',
  DVR_GET_RANGE: 'dvr:get-range',
  
  // State
  STATE_GET: 'state:get',
  STATE_UPDATE: 'state:update',  // Main → Renderer (event)
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

// ============ Error Codes ============

export const IPC_ERRORS = {
  E_CONNECTION_FAILED: 'E_CONNECTION_FAILED',
  E_CONNECTION_TIMEOUT: 'E_CONNECTION_TIMEOUT',
  E_CONNECTION_NOT_FOUND: 'E_CONNECTION_NOT_FOUND',
  E_TAG_NOT_FOUND: 'E_TAG_NOT_FOUND',
  E_PROTOCOL_ERROR: 'E_PROTOCOL_ERROR',
  E_INVALID_ADDRESS: 'E_INVALID_ADDRESS',
  E_PERMISSION_DENIED: 'E_PERMISSION_DENIED',
  E_CERTIFICATE_REJECTED: 'E_CERTIFICATE_REJECTED',
  E_PORT_IN_USE: 'E_PORT_IN_USE',
} as const

export type IpcErrorCode = typeof IPC_ERRORS[keyof typeof IPC_ERRORS]

export interface IpcError {
  code: IpcErrorCode
  message: string
  details?: unknown
}

// ============ Generic Response ============

export interface IpcResponse<T = void> {
  success: boolean
  data?: T
  error?: IpcError
}

// ============ App State ============

export interface AppState {
  connections: Connection[]
  tags: Tag[]
  tagValues: Record<string, TagValue>
  virtualServers: VirtualServer[]
  dvr: DvrState
}

export interface StateChanges {
  tagValues?: Record<string, TagValue>
  connectionStatus?: Record<string, Connection['status']>
}

export interface StateUpdateEvent {
  type: 'full' | 'partial'
  state?: AppState
  changes?: StateChanges
}
```

---

## index.ts

```ts
// src/shared/types/index.ts

export * from './connection'
export * from './tag'
export * from './virtual-server'
export * from './dvr'
export * from './ipc'
```
