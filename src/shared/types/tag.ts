/**
 * Tag type definitions for IIoT Protocol Studio.
 * Shared between Main and Renderer processes.
 */

import type { ByteOrder } from './modbus'

export interface Tag {
  id: string
  connectionId: string
  name: string
  address: ModbusAddress | MqttAddress | OpcUaAddress
  dataType: DataType
  displayFormat: DisplayFormat
  thresholds: Thresholds
  enabled: boolean
}

export interface ModbusAddress {
  type: 'modbus'
  registerType: 'holding' | 'input' | 'coil' | 'discrete'
  address: number
  length: number
  byteOrder?: ByteOrder
  unitId?: number
}

export interface MqttAddress {
  type: 'mqtt'
  topic: string
  jsonPath?: string
}

export interface OpcUaAddress {
  type: 'opcua'
  nodeId: string
}

export type DataType =
  | 'int16'
  | 'uint16'
  | 'int32'
  | 'uint32'
  | 'float32'
  | 'float64'
  | 'boolean'
  | 'string'

// Data type metadata for UI display and register calculation
export const DATA_TYPE_INFO: Record<DataType, { label: string; registers: number; description: string }> = {
  int16: { label: 'INT16 (Signed)', registers: 1, description: 'Signed 16-bit integer' },
  uint16: { label: 'UINT16 (Unsigned)', registers: 1, description: 'Unsigned 16-bit integer' },
  int32: { label: 'INT32 (2 registers)', registers: 2, description: 'Signed 32-bit integer' },
  uint32: { label: 'UINT32 (2 registers)', registers: 2, description: 'Unsigned 32-bit integer' },
  float32: { label: 'FLOAT32 (2 registers)', registers: 2, description: '32-bit floating point' },
  float64: { label: 'FLOAT64 (4 registers)', registers: 4, description: '64-bit floating point' },
  boolean: { label: 'BOOL (Bit)', registers: 1, description: 'Boolean / Bit' },
  string: { label: 'STRING (ASCII)', registers: 1, description: 'ASCII string' },
}

export interface DisplayFormat {
  decimals: number
  unit: string
  scale?: number  // Scaling factor: Real Value = Raw × Scale (default: 1)
  prefix?: string
  suffix?: string
}

export interface Thresholds {
  warningLow?: number
  warningHigh?: number
  alarmLow?: number
  alarmHigh?: number
}

// Default values
export const DEFAULT_DISPLAY_FORMAT: DisplayFormat = {
  decimals: 2,
  unit: ''
}

export const DEFAULT_THRESHOLDS: Thresholds = {}

export const DEFAULT_MODBUS_ADDRESS: ModbusAddress = {
  type: 'modbus',
  registerType: 'holding',
  address: 0,
  length: 1
}

export const DEFAULT_MQTT_ADDRESS: MqttAddress = {
  type: 'mqtt',
  topic: 'sensors/temperature'
}
