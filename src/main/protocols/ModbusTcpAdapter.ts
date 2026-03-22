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
  DataType,
  ByteOrder,
  ConnectionMetrics
} from '@shared/types'
import { INITIAL_METRICS, DEFAULT_BATCH_READ_CONFIG } from '@shared/types'
import {
  convertFloat32,
  convertInt32,
  convertUint32,
  decodeFloat64,
  encodeFloat64
} from './byteOrderUtils'
import { ProtocolAdapter, type ReadResult, type WriteResult } from './ProtocolAdapter'
import {
  createReadBatches,
  extractTagValues,
  type ReadBatch
} from './batchReadOptimizer'

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
  private metrics: ConnectionMetrics = { ...INITIAL_METRICS }
  private latencyHistory: number[] = []
  private readonly LATENCY_HISTORY_SIZE = 10

  constructor(connection: Connection) {
    super(connection)

    if (connection.protocol !== 'modbus-tcp') {
      throw new Error('ModbusTcpAdapter requires modbus-tcp protocol')
    }

    this.config = connection.config as ModbusTcpConfig
    this.client = new ModbusRTU()
  }

  /**
   * Get the default byte order for this connection.
   * Returns 'ABCD' (big-endian) if not explicitly configured.
   */
  getDefaultByteOrder(): ByteOrder {
    return this.config.defaultByteOrder ?? 'ABCD'
  }

  /**
   * Get the current connection metrics.
   * Returns a copy of the metrics to prevent external mutation.
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics to initial values.
   * Called when a new connection is established.
   */
  private resetMetrics(): void {
    this.metrics = { ...INITIAL_METRICS }
    this.latencyHistory = []
  }

  /**
   * Update metrics after a read operation.
   * @param latencyMs The latency of the operation in milliseconds
   * @param isSuccess Whether the operation was successful
   * @param errorMessage Optional error message if the operation failed
   */
  private updateMetrics(latencyMs: number, isSuccess: boolean, errorMessage?: string): void {
    this.metrics.requestCount++

    if (isSuccess) {
      this.metrics.latencyMs = latencyMs
      this.metrics.lastSuccessAt = Date.now()

      // Update rolling average latency
      this.latencyHistory.push(latencyMs)
      if (this.latencyHistory.length > this.LATENCY_HISTORY_SIZE) {
        this.latencyHistory.shift()
      }
      this.metrics.latencyAvgMs = Math.round(
        this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
      )
    } else {
      this.metrics.errorCount++
      this.metrics.lastErrorAt = Date.now()
      this.metrics.lastErrorMessage = errorMessage
    }

    // Calculate error rate
    this.metrics.errorRate = this.metrics.requestCount > 0
      ? this.metrics.errorCount / this.metrics.requestCount
      : 0

    // Emit metrics-updated event
    this.emit('metrics-updated', this.getMetrics())
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

      // Reset metrics on successful connection
      this.resetMetrics()
      this.metrics.connectedAt = Date.now()

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
   * Read values from multiple tags using batch optimization.
   */
  async readTags(tags: Tag[]): Promise<ReadResult[]> {
    const timestamp = Date.now()
    const startTime = performance.now()
    let hasErrors = false
    let lastErrorMessage: string | undefined

    // Get batch configuration
    const batchConfig = this.config.batchRead ?? DEFAULT_BATCH_READ_CONFIG

    // Create optimized read batches
    const batches = createReadBatches(tags, batchConfig, this.config.unitId)

    if (batches.length === 0) {
      return []
    }

    log.debug(
      `[ModbusTcp] Batch read: ${tags.filter((t) => t.enabled).length} tags → ${batches.length} batches`
    )

    // Read all batches
    const resultsMap = new Map<string, ReadResult>()

    for (const batch of batches) {
      try {
        const batchResults = await this.readBatch(batch, timestamp)
        for (const result of batchResults) {
          resultsMap.set(result.tagId, result)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.debug(`[ModbusTcp] Batch read failed: ${message}`)
        hasErrors = true
        lastErrorMessage = message

        // Mark all tags in this batch as bad
        for (const { tag } of batch.tags) {
          resultsMap.set(tag.id, {
            tagId: tag.id,
            value: 0,
            quality: 'bad',
            timestamp
          })
        }

        // Check if this is a connection error
        if (this.isConnectionError(error)) {
          this.handleConnectionError(error as Error)
          break // Stop reading other batches
        }
      }
    }

    // Update metrics after read operation
    const latencyMs = Math.round(performance.now() - startTime)
    this.updateMetrics(latencyMs, !hasErrors, lastErrorMessage)

    // Return results in original tag order
    return tags
      .filter((tag) => tag.enabled && tag.address.type === 'modbus')
      .map((tag) => resultsMap.get(tag.id)!)
      .filter(Boolean)
  }

  /**
   * Check if this adapter supports write operations.
   */
  override supportsWrite(): boolean {
    return true
  }

  /**
   * Write a value to a Modbus device.
   * Supports coils (FC05) and holding registers (FC06/FC16).
   * Input registers and discrete inputs are read-only.
   */
  override async writeTag(tag: Tag, value: number | boolean | string): Promise<WriteResult> {
    const address = tag.address as ModbusAddress

    if (address.type !== 'modbus') {
      return { success: false, error: `Invalid address type for Modbus: ${address.type}`, timestamp: Date.now() }
    }

    // Reject read-only register types
    if (address.registerType === 'input' || address.registerType === 'discrete') {
      return { success: false, error: `Cannot write to ${address.registerType} registers (read-only)`, timestamp: Date.now() }
    }

    // Handle unit ID override
    const originalUnitId = this.client.getID()
    if (address.unitId !== undefined) {
      this.client.setID(address.unitId)
    }

    try {
      if (address.registerType === 'coil') {
        await this.writeCoilValue(address, value)
      } else {
        // holding register
        await this.writeHoldingValue(address, tag.dataType, value)
      }

      return { success: true, timestamp: Date.now() }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message, timestamp: Date.now() }
    } finally {
      if (address.unitId !== undefined) {
        this.client.setID(originalUnitId)
      }
    }
  }

  /**
   * Write a value to a coil address.
   * Single coil uses FC05, multiple coils use FC15.
   */
  private async writeCoilValue(address: ModbusAddress, value: number | boolean | string): Promise<void> {
    if (address.length > 1 && Array.isArray(value)) {
      await this.client.writeCoils(address.address, value as boolean[])
    } else {
      await this.client.writeCoil(address.address, Boolean(value))
    }
  }

  /**
   * Write a value to a holding register address.
   * Single register uses FC06, multi-register (32-bit) uses FC16.
   */
  private async writeHoldingValue(
    address: ModbusAddress,
    dataType: DataType,
    value: number | boolean | string
  ): Promise<void> {
    const numValue = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value)
    const byteOrder = this.getEffectiveByteOrder(address)

    switch (dataType) {
      case 'boolean':
      case 'uint16':
        await this.client.writeRegister(address.address, numValue & 0xFFFF)
        break

      case 'int16': {
        // Convert signed to unsigned 16-bit
        const unsigned = numValue < 0 ? numValue + 0x10000 : numValue
        await this.client.writeRegister(address.address, unsigned & 0xFFFF)
        break
      }

      case 'float32': {
        const regs = this.encodeFloat32(numValue, byteOrder)
        await this.client.writeRegisters(address.address, regs)
        break
      }

      case 'int32': {
        const regs = this.encodeInt32(numValue, byteOrder)
        await this.client.writeRegisters(address.address, regs)
        break
      }

      case 'uint32': {
        const regs = this.encodeUint32(numValue, byteOrder)
        await this.client.writeRegisters(address.address, regs)
        break
      }

      case 'float64': {
        const regs = encodeFloat64(Number(value), byteOrder ?? 'ABCD')
        await this.client.writeRegisters(address.address, regs)
        return
      }

      default:
        throw new Error(`Unsupported data type for write: ${dataType}`)
    }
  }

  /**
   * Encode a float32 value into two 16-bit registers respecting byte order.
   */
  private encodeFloat32(value: number, byteOrder: ByteOrder): [number, number] {
    const buf = Buffer.alloc(4)
    buf.writeFloatBE(value, 0)
    return this.encodeBufferToRegisters(buf, byteOrder)
  }

  /**
   * Encode a signed int32 value into two 16-bit registers respecting byte order.
   */
  private encodeInt32(value: number, byteOrder: ByteOrder): [number, number] {
    const buf = Buffer.alloc(4)
    buf.writeInt32BE(value, 0)
    return this.encodeBufferToRegisters(buf, byteOrder)
  }

  /**
   * Encode an unsigned uint32 value into two 16-bit registers respecting byte order.
   */
  private encodeUint32(value: number, byteOrder: ByteOrder): [number, number] {
    const buf = Buffer.alloc(4)
    buf.writeUInt32BE(value >>> 0, 0)
    return this.encodeBufferToRegisters(buf, byteOrder)
  }

  /**
   * Convert a 4-byte buffer (big-endian) to two 16-bit register values
   * according to the specified byte order.
   *
   * Buffer bytes are labeled [b0, b1, b2, b3] (big-endian: b0=MSB).
   * ABCD: [(b0<<8)|b1, (b2<<8)|b3]  — big-endian
   * DCBA: [(b3<<8)|b2, (b1<<8)|b0]  — little-endian
   * BADC: [(b1<<8)|b0, (b3<<8)|b2]  — mid-big (word swap)
   * CDAB: [(b2<<8)|b3, (b0<<8)|b1]  — mid-little (byte swap)
   */
  private encodeBufferToRegisters(buf: Buffer, byteOrder: ByteOrder): [number, number] {
    const b0 = buf[0], b1 = buf[1], b2 = buf[2], b3 = buf[3]

    switch (byteOrder) {
      case 'ABCD':
        return [(b0 << 8) | b1, (b2 << 8) | b3]
      case 'DCBA':
        return [(b3 << 8) | b2, (b1 << 8) | b0]
      case 'BADC':
        return [(b1 << 8) | b0, (b3 << 8) | b2]
      case 'CDAB':
        return [(b2 << 8) | b3, (b0 << 8) | b1]
      default:
        return [(b0 << 8) | b1, (b2 << 8) | b3]
    }
  }

  /**
   * Read a batch of registers and extract individual tag values.
   */
  private async readBatch(batch: ReadBatch, timestamp: number): Promise<ReadResult[]> {
    // Set unit ID for this batch if specified
    const originalUnitId = this.client.getID()
    if (batch.unitId !== undefined) {
      this.client.setID(batch.unitId)
    }

    try {
      // Read raw data from device
      const rawData = await this.readRegistersRange(
        batch.registerType,
        batch.startAddress,
        batch.length
      )

      // Extract individual tag values
      const tagValues = extractTagValues(batch, rawData)

      // Convert each tag's value
      const results: ReadResult[] = []
      for (const { tag } of batch.tags) {
        const values = tagValues.get(tag.id)
        if (!values) {
          results.push({
            tagId: tag.id,
            value: 0,
            quality: 'bad',
            timestamp
          })
          continue
        }

        const address = tag.address as ModbusAddress
        const value = this.convertValue(values, tag.dataType, address)

        results.push({
          tagId: tag.id,
          value,
          quality: 'good',
          timestamp
        })
      }

      return results
    } finally {
      // Restore original unit ID
      if (batch.unitId !== undefined) {
        this.client.setID(originalUnitId)
      }
    }
  }

  /**
   * Read a range of registers from the device.
   */
  private async readRegistersRange(
    registerType: ModbusAddress['registerType'],
    startAddress: number,
    length: number
  ): Promise<number[] | boolean[]> {
    switch (registerType) {
      case 'holding': {
        const response = await this.client.readHoldingRegisters(startAddress, length)
        return response.data
      }
      case 'input': {
        const response = await this.client.readInputRegisters(startAddress, length)
        return response.data
      }
      case 'coil': {
        const response = await this.client.readCoils(startAddress, length)
        return response.data
      }
      case 'discrete': {
        const response = await this.client.readDiscreteInputs(startAddress, length)
        return response.data
      }
      default:
        throw new Error(`Unknown register type: ${registerType}`)
    }
  }

  /**
   * Read a single tag from the device.
   * @deprecated Use readTags with batch optimization instead.
   */
  private async readSingleTag(tag: Tag, timestamp: number): Promise<ReadResult> {
    const address = tag.address as ModbusAddress

    if (address.type !== 'modbus') {
      throw new Error(`Invalid address type for Modbus: ${address.type}`)
    }

    // Handle tag-level unit ID override
    const originalUnitId = this.client.getID()
    if (address.unitId !== undefined) {
      this.client.setID(address.unitId)
    }

    try {
      // Read raw register data
      const rawData = await this.readRegistersRange(
        address.registerType,
        address.address,
        address.length
      )

      // Convert to the target data type
      const value = this.convertValue(rawData, tag.dataType, address)

      return {
        tagId: tag.id,
        value,
        quality: 'good',
        timestamp
      }
    } finally {
      // Restore original unit ID
      if (address.unitId !== undefined) {
        this.client.setID(originalUnitId)
      }
    }
  }

  /**
   * Get the effective byte order for an address.
   * Uses tag-level override if specified, otherwise connection default.
   */
  private getEffectiveByteOrder(address: ModbusAddress): ByteOrder {
    return address.byteOrder ?? this.getDefaultByteOrder()
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
    const byteOrder = this.getEffectiveByteOrder(address)

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
        return convertInt32(registers[0], registers[1], byteOrder)

      case 'uint32':
        if (registers.length < 2) {
          throw new Error('UINT32 requires 2 registers')
        }
        return convertUint32(registers[0], registers[1], byteOrder)

      case 'float32':
        if (registers.length < 2) {
          throw new Error('FLOAT32 requires 2 registers')
        }
        return convertFloat32(registers[0], registers[1], byteOrder)

      case 'float64': {
        if (registers.length < 4) return registers[0]
        return decodeFloat64(registers, byteOrder ?? 'ABCD')
      }

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

    const address = parseInt(iecMatch[2], 10)
    if (address < 0 || address > 65535) {
      throw new Error(`Modbus address out of range: ${address} (valid: 0-65535)`)
    }

    return {
      type: 'modbus',
      registerType: typeMap[iecMatch[1]],
      address,
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
    const address = parseInt(plainMatch[1], 10)
    if (address < 0 || address > 65535) {
      throw new Error(`Modbus address out of range: ${address} (valid: 0-65535)`)
    }
    return {
      type: 'modbus',
      registerType,
      address,
      length: length ?? 1
    }
  }

  throw new Error(`Invalid Modbus address format: ${addressStr}`)
}
