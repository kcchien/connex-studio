/**
 * Tag type definitions for IIoT Protocol Studio.
 * Shared between Main and Renderer processes.
 */

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
  | 'boolean'
  | 'string'

export interface DisplayFormat {
  decimals: number
  unit: string
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
