/**
 * ProtocolAdapter Abstract Interface
 *
 * Base interface for all protocol implementations (Modbus TCP, MQTT, OPC UA).
 * Each adapter handles connection lifecycle and tag reading for its protocol.
 */

import type {
  Connection,
  ConnectionStatus,
  Tag,
  DataPoint,
  DataQuality
} from '@shared/types'
import { EventEmitter } from 'events'

/**
 * Result of a single tag read operation.
 */
export interface ReadResult {
  tagId: string
  value: number | boolean | string
  quality: DataQuality
  timestamp: number
}

/**
 * Events emitted by protocol adapters.
 */
export interface ProtocolAdapterEvents {
  'status-changed': (status: ConnectionStatus, error?: string) => void
  'data-received': (data: ReadResult[]) => void
  'error': (error: Error) => void
}

/**
 * Abstract base class for protocol adapters.
 * Implementations must handle connection, disconnection, and tag reading.
 */
export abstract class ProtocolAdapter extends EventEmitter {
  protected connection: Connection
  protected status: ConnectionStatus = 'disconnected'
  protected lastError?: string

  constructor(connection: Connection) {
    super()
    this.connection = connection
  }

  /**
   * Get current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Get last error message.
   */
  getLastError(): string | undefined {
    return this.lastError
  }

  /**
   * Get connection configuration.
   */
  getConnection(): Connection {
    return this.connection
  }

  /**
   * Update status and emit event.
   */
  protected setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status
    this.lastError = error
    this.emit('status-changed', status, error)
  }

  /**
   * Establish connection to the remote device/broker.
   * Should update status to 'connecting' then 'connected' or 'error'.
   */
  abstract connect(): Promise<void>

  /**
   * Disconnect from the remote device/broker.
   * Should update status to 'disconnected'.
   */
  abstract disconnect(): Promise<void>

  /**
   * Read values from multiple tags.
   * Returns results for all tags, with quality='bad' for failed reads.
   */
  abstract readTags(tags: Tag[]): Promise<ReadResult[]>

  /**
   * Read a single tag value (convenience method).
   */
  async readTag(tag: Tag): Promise<ReadResult> {
    const results = await this.readTags([tag])
    return results[0]
  }

  /**
   * Check if connection is active.
   */
  isConnected(): boolean {
    return this.status === 'connected'
  }

  /**
   * Cleanup resources when adapter is destroyed.
   */
  abstract dispose(): Promise<void>
}

/**
 * Factory function type for creating protocol adapters.
 */
export type ProtocolAdapterFactory = (connection: Connection) => ProtocolAdapter

/**
 * Registry for protocol adapter factories.
 */
export class ProtocolAdapterRegistry {
  private factories = new Map<string, ProtocolAdapterFactory>()

  /**
   * Register a protocol adapter factory.
   */
  register(protocol: string, factory: ProtocolAdapterFactory): void {
    this.factories.set(protocol, factory)
  }

  /**
   * Create an adapter for a connection.
   * Throws if protocol is not registered.
   */
  create(connection: Connection): ProtocolAdapter {
    const factory = this.factories.get(connection.protocol)
    if (!factory) {
      throw new Error(`Unsupported protocol: ${connection.protocol}`)
    }
    return factory(connection)
  }

  /**
   * Check if a protocol is supported.
   */
  isSupported(protocol: string): boolean {
    return this.factories.has(protocol)
  }

  /**
   * Get list of supported protocols.
   */
  getSupportedProtocols(): string[] {
    return Array.from(this.factories.keys())
  }
}

// Singleton registry instance
let registry: ProtocolAdapterRegistry | null = null

export function getProtocolRegistry(): ProtocolAdapterRegistry {
  if (!registry) {
    registry = new ProtocolAdapterRegistry()
  }
  return registry
}
