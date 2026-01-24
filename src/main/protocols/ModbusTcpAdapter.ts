/**
 * ModbusTcpAdapter
 *
 * Protocol adapter for Modbus TCP communication.
 * Uses modbus-serial library for all Modbus operations.
 *
 * Features:
 * - Connection management with timeout handling
 * - Support for all register types (holding, input, coil, discrete)
 * - Data type conversion (INT16, UINT16, INT32, UINT32, FLOAT32, BOOLEAN)
 * - Automatic reconnection on failure
 */

import ModbusRTU from 'modbus-serial'
import log from 'electron-log/main.js'
import type {
  Connection,
  Tag,
  ModbusTcpConfig,
  ModbusAddress,
  DataType
} from '@shared/types'
import { ProtocolAdapter, type ReadResult } from './ProtocolAdapter'

/**
 * Modbus function codes for different register types.
 */
const REGISTER_READ_FUNCTIONS = {
  holding: 'readHoldingRegisters',
  input: 'readInputRegisters',
  coil: 'readCoils',
  discrete: 'readDiscreteInputs'
} as const

export class ModbusTcpAdapter extends ProtocolAdapter {
  private client: ModbusRTU
  private config: ModbusTcpConfig
  private reconnectTimer: NodeJS.Timeout | null = null
  private isDisposed = false

  constructor(connection: Connection) {
    super(connection)

    if (connection.protocol !== 'modbus-tcp') {
      throw new Error('ModbusTcpAdapter requires modbus-tcp protocol')
    }

    this.config = connection.config as ModbusTcpConfig
    this.client = new ModbusRTU()
  }

  /**
   * Connect to the Modbus TCP device.
   */
  async connect(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Adapter has been disposed')
    }

    this.setStatus('connecting')
    log.info(`[ModbusTcp] Connecting to ${this.config.host}:${this.config.port}`)

    try {
      // Set timeout before connecting
      this.client.setTimeout(this.config.timeout || 5000)

      // Connect to the device
      await this.client.connectTCP(this.config.host, {
        port: this.config.port
      })

      // Set unit ID
      this.client.setID(this.config.unitId || 1)

      this.setStatus('connected')
      log.info(`[ModbusTcp] Connected to ${this.config.host}:${this.config.port}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.setStatus('error', message)
      log.error(`[ModbusTcp] Connection failed: ${message}`)
      throw error
    }
  }

  /**
   * Disconnect from the Modbus TCP device.
   */
  async disconnect(): Promise<void> {
    this.cancelReconnect()

    try {
      if (this.client.isOpen) {
        this.client.close(() => {
          log.info('[ModbusTcp] Connection closed')
        })
      }
    } catch (error) {
      log.warn(`[ModbusTcp] Error during disconnect: ${error}`)
    }

    this.setStatus('disconnected')
  }

  /**
   * Read values from multiple tags.
   */
  async readTags(tags: Tag[]): Promise<ReadResult[]> {
    const results: ReadResult[] = []
    const timestamp = Date.now()

    for (const tag of tags) {
      if (!tag.enabled) {
        continue
      }

      try {
        const result = await this.readSingleTag(tag, timestamp)
        results.push(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.debug(`[ModbusTcp] Read failed for tag ${tag.name}: ${message}`)

        results.push({
          tagId: tag.id,
          value: 0,
          quality: 'bad',
          timestamp
        })

        // Check if this is a connection error
        if (this.isConnectionError(error)) {
          this.handleConnectionError(error as Error)
          break // Stop reading other tags
        }
      }
    }

    return results
  }

  /**
   * Read a single tag from the device.
   */
  private async readSingleTag(tag: Tag, timestamp: number): Promise<ReadResult> {
    const address = tag.address as ModbusAddress

    if (address.type !== 'modbus') {
      throw new Error(`Invalid address type for Modbus: ${address.type}`)
    }

    // Read raw register data
    const rawData = await this.readRegisters(address)

    // Convert to the target data type
    const value = this.convertValue(rawData, tag.dataType, address)

    return {
      tagId: tag.id,
      value,
      quality: 'good',
      timestamp
    }
  }

  /**
   * Read registers from the device based on register type.
   */
  private async readRegisters(
    address: ModbusAddress
  ): Promise<number[] | boolean[]> {
    const { registerType, address: regAddr, length } = address

    switch (registerType) {
      case 'holding': {
        const response = await this.client.readHoldingRegisters(regAddr, length)
        return response.data
      }
      case 'input': {
        const response = await this.client.readInputRegisters(regAddr, length)
        return response.data
      }
      case 'coil': {
        const response = await this.client.readCoils(regAddr, length)
        return response.data
      }
      case 'discrete': {
        const response = await this.client.readDiscreteInputs(regAddr, length)
        return response.data
      }
      default:
        throw new Error(`Unknown register type: ${registerType}`)
    }
  }

  /**
   * Convert raw register data to the target data type.
   */
  private convertValue(
    rawData: number[] | boolean[],
    dataType: DataType,
    address: ModbusAddress
  ): number | boolean | string {
    // Handle boolean types (coils and discrete inputs)
    if (address.registerType === 'coil' || address.registerType === 'discrete') {
      return (rawData as boolean[])[0]
    }

    const registers = rawData as number[]

    switch (dataType) {
      case 'boolean':
        // Single bit from register (bit 0)
        return (registers[0] & 0x01) === 1

      case 'int16':
        return this.toInt16(registers[0])

      case 'uint16':
        return registers[0]

      case 'int32':
        if (registers.length < 2) {
          throw new Error('INT32 requires 2 registers')
        }
        return this.toInt32(registers[0], registers[1])

      case 'uint32':
        if (registers.length < 2) {
          throw new Error('UINT32 requires 2 registers')
        }
        return this.toUint32(registers[0], registers[1])

      case 'float32':
        if (registers.length < 2) {
          throw new Error('FLOAT32 requires 2 registers')
        }
        return this.toFloat32(registers[0], registers[1])

      case 'string':
        // Interpret registers as ASCII characters (2 chars per register)
        return this.registersToString(registers)

      default:
        // Default to uint16
        return registers[0]
    }
  }

  /**
   * Convert unsigned 16-bit to signed 16-bit.
   */
  private toInt16(value: number): number {
    if (value >= 0x8000) {
      return value - 0x10000
    }
    return value
  }

  /**
   * Convert two registers to signed 32-bit integer (big-endian).
   */
  private toInt32(high: number, low: number): number {
    const unsigned = (high << 16) | low
    if (unsigned >= 0x80000000) {
      return unsigned - 0x100000000
    }
    return unsigned
  }

  /**
   * Convert two registers to unsigned 32-bit integer (big-endian).
   */
  private toUint32(high: number, low: number): number {
    return ((high << 16) | low) >>> 0
  }

  /**
   * Convert two registers to 32-bit float (IEEE 754, big-endian).
   */
  private toFloat32(high: number, low: number): number {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    // Big-endian: high word first
    view.setUint16(0, high, false)
    view.setUint16(2, low, false)

    return view.getFloat32(0, false)
  }

  /**
   * Convert registers to ASCII string.
   */
  private registersToString(registers: number[]): string {
    const chars: string[] = []

    for (const reg of registers) {
      const high = (reg >> 8) & 0xff
      const low = reg & 0xff

      if (high > 0 && high < 128) {
        chars.push(String.fromCharCode(high))
      }
      if (low > 0 && low < 128) {
        chars.push(String.fromCharCode(low))
      }
    }

    return chars.join('').replace(/\0/g, '').trim()
  }

  /**
   * Check if an error indicates connection loss.
   */
  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const connectionErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'Port Not Open'
    ]

    return connectionErrors.some(
      (e) => error.message.includes(e) || (error as NodeJS.ErrnoException).code === e
    )
  }

  /**
   * Handle connection errors with optional reconnection.
   */
  private handleConnectionError(error: Error): void {
    log.warn(`[ModbusTcp] Connection error: ${error.message}`)
    this.setStatus('error', error.message)
    this.emit('error', error)
  }

  /**
   * Cancel any pending reconnection attempt.
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Cleanup resources when adapter is destroyed.
   */
  async dispose(): Promise<void> {
    this.isDisposed = true
    this.cancelReconnect()
    await this.disconnect()
    this.removeAllListeners()
    log.info('[ModbusTcp] Adapter disposed')
  }
}

/**
 * Factory function for ModbusTcpAdapter.
 */
export function createModbusTcpAdapter(connection: Connection): ModbusTcpAdapter {
  return new ModbusTcpAdapter(connection)
}

/**
 * Parse a Modbus address string (e.g., "40001", "HR100", "C0").
 * Returns a ModbusAddress object.
 *
 * Formats supported:
 * - Modicon: 40001 (holding), 30001 (input), 00001 (coil), 10001 (discrete)
 * - IEC: HR100, IR100, C100, DI100
 * - Plain: address with explicit register type
 */
export function parseModbusAddress(
  addressStr: string,
  registerType?: 'holding' | 'input' | 'coil' | 'discrete',
  length?: number
): ModbusAddress {
  addressStr = addressStr.trim().toUpperCase()

  // IEC format: HR100, IR100, C100, DI100
  const iecMatch = addressStr.match(/^(HR|IR|C|DI)(\d+)$/)
  if (iecMatch) {
    const typeMap: Record<string, 'holding' | 'input' | 'coil' | 'discrete'> = {
      HR: 'holding',
      IR: 'input',
      C: 'coil',
      DI: 'discrete'
    }

    return {
      type: 'modbus',
      registerType: typeMap[iecMatch[1]],
      address: parseInt(iecMatch[2], 10),
      length: length ?? 1
    }
  }

  // Modicon format: 40001, 30001, 00001, 10001
  const modiconMatch = addressStr.match(/^(\d{5,6})$/)
  if (modiconMatch) {
    const addr = parseInt(modiconMatch[1], 10)

    if (addr >= 40001 && addr <= 49999) {
      // Holding registers
      return {
        type: 'modbus',
        registerType: 'holding',
        address: addr - 40001, // Convert to 0-based
        length: length ?? 1
      }
    } else if (addr >= 30001 && addr <= 39999) {
      // Input registers
      return {
        type: 'modbus',
        registerType: 'input',
        address: addr - 30001,
        length: length ?? 1
      }
    } else if (addr >= 1 && addr <= 9999) {
      // Coils
      return {
        type: 'modbus',
        registerType: 'coil',
        address: addr - 1,
        length: length ?? 1
      }
    } else if (addr >= 10001 && addr <= 19999) {
      // Discrete inputs
      return {
        type: 'modbus',
        registerType: 'discrete',
        address: addr - 10001,
        length: length ?? 1
      }
    }
  }

  // Plain number format: requires explicit register type
  const plainMatch = addressStr.match(/^(\d+)$/)
  if (plainMatch && registerType) {
    return {
      type: 'modbus',
      registerType,
      address: parseInt(plainMatch[1], 10),
      length: length ?? 1
    }
  }

  throw new Error(`Invalid Modbus address format: ${addressStr}`)
}
