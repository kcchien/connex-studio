/**
 * Connection type definitions for IIoT Protocol Studio.
 * Shared between Main and Renderer processes.
 */

export type Protocol = 'modbus-tcp' | 'mqtt' | 'opcua'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface Connection {
  id: string
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
  status: ConnectionStatus
  lastError?: string
  createdAt: number
}

export interface ModbusTcpConfig {
  host: string
  port: number
  unitId: number
  timeout: number
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
  timeout: 5000
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
