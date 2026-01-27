/**
 * Connection type definitions for IIoT Protocol Studio.
 * Shared between Main and Renderer processes.
 */

import type { ByteOrder, BatchReadConfig } from './modbus'

export type Protocol = 'modbus-tcp' | 'mqtt' | 'opcua'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Real-time connection health metrics.
 */
export interface ConnectionMetrics {
  latencyMs: number
  latencyAvgMs: number
  requestCount: number
  errorCount: number
  errorRate: number
  lastSuccessAt: number
  lastErrorAt?: number
  lastErrorMessage?: string
  reconnectAttempts: number
  connectedAt?: number
}

export const INITIAL_METRICS: ConnectionMetrics = {
  latencyMs: 0,
  latencyAvgMs: 0,
  requestCount: 0,
  errorCount: 0,
  errorRate: 0,
  lastSuccessAt: 0,
  reconnectAttempts: 0
}

/**
 * Metric health thresholds for UI coloring.
 */
export const METRIC_THRESHOLDS = {
  latency: { warning: 100, alarm: 500 },
  errorRate: { warning: 0.01, alarm: 0.05 },
  lastSuccess: { warning: 10000, alarm: 30000 }
} as const

export interface Connection {
  id: string
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
  status: ConnectionStatus
  lastError?: string
  createdAt: number
  metrics?: ConnectionMetrics
}

export interface ModbusTcpConfig {
  host: string
  port: number
  unitId: number
  timeout: number
  defaultByteOrder?: ByteOrder
  batchRead?: BatchReadConfig
}

export interface MqttConfig {
  brokerUrl: string
  clientId: string
  username?: string  // Not persisted in JSON; stored in keytar
  password?: string  // Not persisted in JSON; stored in keytar
  useTls: boolean
  caCert?: string
}

export interface OpcUaConfig {
  endpointUrl: string
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt'
  securityPolicy: string
  username?: string  // Not persisted in JSON; stored in keytar
  password?: string  // Not persisted in JSON; stored in keytar
}

// Default configurations
export const DEFAULT_MODBUS_CONFIG: ModbusTcpConfig = {
  host: '127.0.0.1',
  port: 502,
  unitId: 1,
  timeout: 5000,
  defaultByteOrder: 'ABCD',
  batchRead: {
    enabled: true,
    maxGap: 10,
    maxRegisters: 125
  }
}

export const DEFAULT_MQTT_CONFIG: MqttConfig = {
  brokerUrl: 'mqtt://localhost:1883',
  clientId: `connex-studio-${Date.now()}`,
  useTls: false
}

export const DEFAULT_OPCUA_CONFIG: OpcUaConfig = {
  endpointUrl: 'opc.tcp://localhost:4840',
  securityMode: 'None',
  securityPolicy: 'None'
}

/**
 * Partial updates for connection editing.
 * Protocol cannot be changed after creation.
 */
export interface ConnectionUpdates {
  name?: string
  config?: Partial<ModbusTcpConfig> | Partial<MqttConfig> | Partial<OpcUaConfig>
}
