/**
 * Protocol Adapters Index
 *
 * Registers all supported protocol adapters and exports utilities.
 */

export {
  ProtocolAdapter,
  ProtocolAdapterRegistry,
  getProtocolRegistry,
  type ReadResult,
  type ProtocolAdapterEvents,
  type ProtocolAdapterFactory
} from './ProtocolAdapter'

export {
  ModbusTcpAdapter,
  createModbusTcpAdapter,
  parseModbusAddress
} from './ModbusTcpAdapter'

export {
  MqttAdapter,
  createMqttAdapter,
  parseMqttAddress
} from './MqttAdapter'

export { OpcUaAdapter, validateEndpointUrl, parseEndpointUrl } from './OpcUaAdapter'

// Register all protocol adapters
import { getProtocolRegistry } from './ProtocolAdapter'
import { createModbusTcpAdapter } from './ModbusTcpAdapter'
import { createMqttAdapter } from './MqttAdapter'
import { OpcUaAdapter } from './OpcUaAdapter'
import type { Connection } from '@shared/types'

/**
 * Factory function for OPC UA adapter.
 */
function createOpcUaAdapter(connection: Connection): OpcUaAdapter {
  return new OpcUaAdapter(connection)
}

/**
 * Initialize protocol registry with all supported adapters.
 * Call this once during app startup.
 */
export function initializeProtocols(): void {
  const registry = getProtocolRegistry()

  // Register Modbus TCP adapter
  registry.register('modbus-tcp', createModbusTcpAdapter)

  // Register MQTT adapter
  registry.register('mqtt', createMqttAdapter)

  // Register OPC UA adapter
  registry.register('opcua', createOpcUaAdapter)
}
