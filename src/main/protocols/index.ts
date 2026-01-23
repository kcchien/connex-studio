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

// Register all protocol adapters
import { getProtocolRegistry } from './ProtocolAdapter'
import { createModbusTcpAdapter } from './ModbusTcpAdapter'

/**
 * Initialize protocol registry with all supported adapters.
 * Call this once during app startup.
 */
export function initializeProtocols(): void {
  const registry = getProtocolRegistry()

  // Register Modbus TCP adapter
  registry.register('modbus-tcp', createModbusTcpAdapter)

  // Future: Register MQTT adapter
  // registry.register('mqtt', createMqttAdapter)

  // Future: Register OPC UA adapter
  // registry.register('opcua', createOpcUaAdapter)
}
