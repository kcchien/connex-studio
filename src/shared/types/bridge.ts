/**
 * Bridge type definitions for Modbus-to-MQTT data forwarding.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Core Bridge Types
// -----------------------------------------------------------------------------

export type BridgeStatus = 'idle' | 'active' | 'paused' | 'error'

export interface Bridge {
  id: string
  name: string
  sourceConnectionId: string
  sourceTags: string[]
  targetConnectionId: string
  targetConfig: BridgeTargetConfig
  options: BridgeOptions
  status: BridgeStatus
  createdAt: number
}

export interface BridgeTargetConfig {
  topicTemplate: string
  payloadTemplate: string
  qos: 0 | 1 | 2
  retain: boolean
}

export interface BridgeOptions {
  interval: number
  changeOnly: boolean
  changeThreshold?: number
  bufferSize: number
}

// -----------------------------------------------------------------------------
// Bridge Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateBridgeRequest {
  name: string
  sourceConnectionId: string
  sourceTags: string[]
  targetConnectionId: string
  targetConfig: BridgeTargetConfig
  options?: Partial<BridgeOptions>
}

export interface UpdateBridgeRequest {
  id: string
  name?: string
  sourceTags?: string[]
  targetConfig?: Partial<BridgeTargetConfig>
  options?: Partial<BridgeOptions>
}

export interface BridgeStats {
  bridgeId: string
  status: BridgeStatus
  messagesForwarded: number
  messagesDropped: number
  bytesTransferred: number
  lastForwardedAt?: number
  errorCount: number
  lastError?: string
  uptime: number
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_BRIDGE_OPTIONS: BridgeOptions = {
  interval: 1000,
  changeOnly: false,
  bufferSize: 100
}

export const DEFAULT_BRIDGE_TARGET_CONFIG: BridgeTargetConfig = {
  topicTemplate: 'connex/${connectionId}/${tagName}',
  payloadTemplate: '{"value": ${value}, "timestamp": ${timestamp}}',
  qos: 0,
  retain: false
}
