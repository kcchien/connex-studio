/**
 * VirtualServer Service
 *
 * Provides built-in Modbus TCP server simulation for testing
 * without requiring physical hardware.
 *
 * Features:
 * - Modbus TCP server (port configurable)
 * - Multiple virtual registers with configurable waveforms
 * - Waveform generators: constant, sine, square, triangle, random
 * - Client connection tracking
 * - EADDRINUSE error handling with port suggestions
 */

import { EventEmitter } from 'events'
import net from 'net'
import { log } from './LogService'
import type {
  VirtualServer,
  VirtualServerStatus,
  VirtualRegister,
  Waveform,
  DEFAULT_VIRTUAL_SERVER_PORT,
  MIN_VIRTUAL_SERVER_PORT,
  MAX_VIRTUAL_SERVER_PORT
} from '@shared/types/virtual-server'

// Re-export constants for external use
export {
  DEFAULT_VIRTUAL_SERVER_PORT,
  MIN_VIRTUAL_SERVER_PORT,
  MAX_VIRTUAL_SERVER_PORT
} from '@shared/types/virtual-server'

/**
 * Modbus TCP Function Codes
 */
const MODBUS_FC = {
  READ_HOLDING_REGISTERS: 0x03,
  READ_INPUT_REGISTERS: 0x04,
  WRITE_SINGLE_REGISTER: 0x06,
  WRITE_MULTIPLE_REGISTERS: 0x10
} as const

/**
 * Modbus Exception Codes
 */
const MODBUS_EXCEPTION = {
  ILLEGAL_FUNCTION: 0x01,
  ILLEGAL_DATA_ADDRESS: 0x02,
  ILLEGAL_DATA_VALUE: 0x03,
  SLAVE_DEVICE_FAILURE: 0x04
} as const

/**
 * Waveform generator functions
 */
const waveformGenerators = {
  /**
   * Constant value - returns offset value
   */
  constant: (waveform: Waveform, _timestamp: number): number => {
    return waveform.offset
  },

  /**
   * Sine wave - oscillates between (offset - amplitude) and (offset + amplitude)
   */
  sine: (waveform: Waveform, timestamp: number): number => {
    const phase = (timestamp % waveform.period) / waveform.period
    const value = waveform.offset + waveform.amplitude * Math.sin(2 * Math.PI * phase)
    return Math.round(value)
  },

  /**
   * Square wave - alternates between (offset - amplitude) and (offset + amplitude)
   */
  square: (waveform: Waveform, timestamp: number): number => {
    const phase = (timestamp % waveform.period) / waveform.period
    const value = phase < 0.5
      ? waveform.offset + waveform.amplitude
      : waveform.offset - waveform.amplitude
    return Math.round(value)
  },

  /**
   * Triangle wave - linearly ramps up and down
   */
  triangle: (waveform: Waveform, timestamp: number): number => {
    const phase = (timestamp % waveform.period) / waveform.period
    // 0 -> 0.5: ramp up, 0.5 -> 1: ramp down
    const triangleValue = phase < 0.5
      ? 4 * phase - 1  // -1 to 1
      : 3 - 4 * phase  // 1 to -1
    const value = waveform.offset + waveform.amplitude * triangleValue
    return Math.round(value)
  },

  /**
   * Random value - returns random value between min and max
   */
  random: (waveform: Waveform, _timestamp: number): number => {
    const min = waveform.min ?? 0
    const max = waveform.max ?? 100
    return Math.round(min + Math.random() * (max - min))
  }
}

/**
 * Generate waveform value for a given timestamp
 */
export function generateWaveformValue(waveform: Waveform, timestamp: number): number {
  const generator = waveformGenerators[waveform.type]
  if (!generator) {
    log.warn(`Unknown waveform type: ${waveform.type}, using constant`)
    return waveform.offset
  }
  return generator(waveform, timestamp)
}

/**
 * VirtualServerManager - Manages multiple virtual server instances
 */
export class VirtualServerManager extends EventEmitter {
  private servers: Map<string, VirtualServerInstance> = new Map()
  private nextId = 1

  /**
   * Start a new virtual server
   */
  async start(params: {
    protocol: 'modbus-tcp'
    port: number
    registers: Array<{
      address: number
      length: number
      waveform: Waveform
    }>
  }): Promise<{ success: true; serverId: string } | { success: false; error: string; suggestedPort?: number }> {
    const { protocol, port, registers } = params

    // Validate port range
    if (port < 1024 || port > 65535) {
      return { success: false, error: `Port must be between 1024 and 65535` }
    }

    // Check if port is already in use by another virtual server
    for (const [id, server] of this.servers) {
      if (server.port === port && server.status === 'running') {
        return { success: false, error: `Port ${port} is already in use by virtual server ${id}` }
      }
    }

    const serverId = `vs-${this.nextId++}`
    const virtualRegisters: VirtualRegister[] = registers.map((r) => ({
      address: r.address,
      length: r.length,
      waveform: r.waveform,
      currentValues: new Array(r.length).fill(0)
    }))

    const instance = new VirtualServerInstance(serverId, protocol, port, virtualRegisters)
    this.servers.set(serverId, instance)

    try {
      await instance.start()
      log.info(`Virtual server ${serverId} started on port ${port}`)
      return { success: true, serverId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Handle EADDRINUSE error
      if (errorMessage.includes('EADDRINUSE') || errorMessage.includes('address already in use')) {
        const suggestedPort = await this.findAvailablePort(port + 1)
        this.servers.delete(serverId)
        return {
          success: false,
          error: `Port ${port} is already in use`,
          suggestedPort
        }
      }

      this.servers.delete(serverId)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Stop a virtual server
   */
  async stop(serverId: string): Promise<{ success: true } | { success: false; error: string }> {
    const server = this.servers.get(serverId)
    if (!server) {
      return { success: false, error: `Virtual server ${serverId} not found` }
    }

    try {
      await server.stop()
      this.servers.delete(serverId)
      log.info(`Virtual server ${serverId} stopped`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get status of all virtual servers
   */
  getStatus(): { servers: VirtualServer[] } {
    const servers: VirtualServer[] = []
    for (const [id, instance] of this.servers) {
      servers.push({
        id,
        protocol: instance.protocol,
        port: instance.port,
        status: instance.status,
        registers: instance.registers,
        clientCount: instance.clientCount,
        lastError: instance.lastError
      })
    }
    return { servers }
  }

  /**
   * Find an available port starting from the given port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    for (let port = startPort; port <= 65535; port++) {
      // Check if port is used by our virtual servers
      let usedByUs = false
      for (const server of this.servers.values()) {
        if (server.port === port && server.status === 'running') {
          usedByUs = true
          break
        }
      }
      if (usedByUs) continue

      // Check if port is available on the system
      const available = await this.isPortAvailable(port)
      if (available) {
        return port
      }
    }
    return startPort // Fallback
  }

  /**
   * Check if a port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer()
      server.once('error', () => {
        resolve(false)
      })
      server.once('listening', () => {
        server.close(() => {
          resolve(true)
        })
      })
      server.listen(port)
    })
  }

  /**
   * Stop all virtual servers (for cleanup)
   */
  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = []
    for (const [id, server] of this.servers) {
      stopPromises.push(
        server.stop().catch((err) => {
          log.error(`Error stopping virtual server ${id}:`, err)
        })
      )
    }
    await Promise.all(stopPromises)
    this.servers.clear()
  }
}

/**
 * VirtualServerInstance - A single virtual Modbus TCP server
 */
class VirtualServerInstance {
  readonly id: string
  readonly protocol: 'modbus-tcp'
  readonly port: number
  readonly registers: VirtualRegister[]

  private server: net.Server | null = null
  private clients: Set<net.Socket> = new Set()
  private updateInterval: NodeJS.Timeout | null = null
  private _status: VirtualServerStatus = 'stopped'
  private _lastError?: string

  constructor(
    id: string,
    protocol: 'modbus-tcp',
    port: number,
    registers: VirtualRegister[]
  ) {
    this.id = id
    this.protocol = protocol
    this.port = port
    this.registers = registers
  }

  get status(): VirtualServerStatus {
    return this._status
  }

  get clientCount(): number {
    return this.clients.size
  }

  get lastError(): string | undefined {
    return this._lastError
  }

  /**
   * Start the virtual server
   */
  async start(): Promise<void> {
    if (this._status === 'running') {
      return
    }

    this._status = 'starting'
    this._lastError = undefined

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleClient(socket)
      })

      this.server.on('error', (err) => {
        this._status = 'error'
        this._lastError = err.message
        log.error(`Virtual server ${this.id} error:`, err)
        reject(err)
      })

      this.server.listen(this.port, () => {
        this._status = 'running'
        this.startValueUpdates()
        resolve()
      })
    })
  }

  /**
   * Stop the virtual server
   */
  async stop(): Promise<void> {
    if (this._status === 'stopped') {
      return
    }

    // Stop value updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    // Close all client connections
    for (const client of this.clients) {
      client.destroy()
    }
    this.clients.clear()

    // Close server
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            reject(err)
          } else {
            this._status = 'stopped'
            this.server = null
            resolve()
          }
        })
      } else {
        this._status = 'stopped'
        resolve()
      }
    })
  }

  /**
   * Handle a client connection
   */
  private handleClient(socket: net.Socket): void {
    this.clients.add(socket)
    log.debug(`Virtual server ${this.id}: Client connected from ${socket.remoteAddress}`)

    socket.on('data', (data) => {
      this.handleModbusRequest(socket, data)
    })

    socket.on('close', () => {
      this.clients.delete(socket)
      log.debug(`Virtual server ${this.id}: Client disconnected`)
    })

    socket.on('error', (err) => {
      log.warn(`Virtual server ${this.id}: Client error:`, err.message)
      this.clients.delete(socket)
    })
  }

  /**
   * Handle a Modbus TCP request
   */
  private handleModbusRequest(socket: net.Socket, data: Buffer): void {
    // Modbus TCP frame: MBAP Header (7 bytes) + PDU
    // MBAP: Transaction ID (2) + Protocol ID (2) + Length (2) + Unit ID (1)
    if (data.length < 8) {
      return // Invalid frame
    }

    const transactionId = data.readUInt16BE(0)
    const protocolId = data.readUInt16BE(2)
    // const length = data.readUInt16BE(4)
    const unitId = data.readUInt8(6)
    const functionCode = data.readUInt8(7)

    // Only handle Modbus protocol (protocolId = 0)
    if (protocolId !== 0) {
      return
    }

    let response: Buffer

    switch (functionCode) {
      case MODBUS_FC.READ_HOLDING_REGISTERS:
      case MODBUS_FC.READ_INPUT_REGISTERS:
        response = this.handleReadRegisters(data, transactionId, unitId, functionCode)
        break

      case MODBUS_FC.WRITE_SINGLE_REGISTER:
        response = this.handleWriteSingleRegister(data, transactionId, unitId, functionCode)
        break

      case MODBUS_FC.WRITE_MULTIPLE_REGISTERS:
        response = this.handleWriteMultipleRegisters(data, transactionId, unitId, functionCode)
        break

      default:
        // Unsupported function code - return exception
        response = this.createExceptionResponse(
          transactionId,
          unitId,
          functionCode,
          MODBUS_EXCEPTION.ILLEGAL_FUNCTION
        )
    }

    socket.write(response)
  }

  /**
   * Handle read holding/input registers request
   */
  private handleReadRegisters(
    data: Buffer,
    transactionId: number,
    unitId: number,
    functionCode: number
  ): Buffer {
    if (data.length < 12) {
      return this.createExceptionResponse(
        transactionId,
        unitId,
        functionCode,
        MODBUS_EXCEPTION.ILLEGAL_DATA_VALUE
      )
    }

    const startAddress = data.readUInt16BE(8)
    const quantity = data.readUInt16BE(10)

    // Find matching register(s)
    const values = this.readRegisterValues(startAddress, quantity)
    if (!values) {
      return this.createExceptionResponse(
        transactionId,
        unitId,
        functionCode,
        MODBUS_EXCEPTION.ILLEGAL_DATA_ADDRESS
      )
    }

    // Build response
    const byteCount = quantity * 2
    const responseLength = 3 + byteCount // FC + ByteCount + Data
    const response = Buffer.alloc(7 + responseLength)

    // MBAP Header
    response.writeUInt16BE(transactionId, 0)
    response.writeUInt16BE(0, 2) // Protocol ID
    response.writeUInt16BE(responseLength + 1, 4) // Length (includes unit ID)
    response.writeUInt8(unitId, 6)

    // PDU
    response.writeUInt8(functionCode, 7)
    response.writeUInt8(byteCount, 8)

    // Write register values
    for (let i = 0; i < quantity; i++) {
      response.writeUInt16BE(values[i] & 0xFFFF, 9 + i * 2)
    }

    return response
  }

  /**
   * Handle write single register request
   */
  private handleWriteSingleRegister(
    data: Buffer,
    transactionId: number,
    unitId: number,
    functionCode: number
  ): Buffer {
    if (data.length < 12) {
      return this.createExceptionResponse(
        transactionId,
        unitId,
        functionCode,
        MODBUS_EXCEPTION.ILLEGAL_DATA_VALUE
      )
    }

    const address = data.readUInt16BE(8)
    const value = data.readUInt16BE(10)

    // Find matching register
    const success = this.writeRegisterValue(address, value)
    if (!success) {
      return this.createExceptionResponse(
        transactionId,
        unitId,
        functionCode,
        MODBUS_EXCEPTION.ILLEGAL_DATA_ADDRESS
      )
    }

    // Echo request as response (Modbus spec)
    const response = Buffer.alloc(12)
    data.copy(response, 0, 0, 12)
    response.writeUInt16BE(transactionId, 0)
    return response
  }

  /**
   * Handle write multiple registers request
   */
  private handleWriteMultipleRegisters(
    data: Buffer,
    transactionId: number,
    unitId: number,
    functionCode: number
  ): Buffer {
    if (data.length < 13) {
      return this.createExceptionResponse(
        transactionId,
        unitId,
        functionCode,
        MODBUS_EXCEPTION.ILLEGAL_DATA_VALUE
      )
    }

    const startAddress = data.readUInt16BE(8)
    const quantity = data.readUInt16BE(10)
    const byteCount = data.readUInt8(12)

    if (data.length < 13 + byteCount) {
      return this.createExceptionResponse(
        transactionId,
        unitId,
        functionCode,
        MODBUS_EXCEPTION.ILLEGAL_DATA_VALUE
      )
    }

    // Write values
    for (let i = 0; i < quantity; i++) {
      const value = data.readUInt16BE(13 + i * 2)
      const success = this.writeRegisterValue(startAddress + i, value)
      if (!success) {
        return this.createExceptionResponse(
          transactionId,
          unitId,
          functionCode,
          MODBUS_EXCEPTION.ILLEGAL_DATA_ADDRESS
        )
      }
    }

    // Build response
    const response = Buffer.alloc(12)
    response.writeUInt16BE(transactionId, 0)
    response.writeUInt16BE(0, 2) // Protocol ID
    response.writeUInt16BE(6, 4) // Length
    response.writeUInt8(unitId, 6)
    response.writeUInt8(functionCode, 7)
    response.writeUInt16BE(startAddress, 8)
    response.writeUInt16BE(quantity, 10)

    return response
  }

  /**
   * Create Modbus exception response
   */
  private createExceptionResponse(
    transactionId: number,
    unitId: number,
    functionCode: number,
    exceptionCode: number
  ): Buffer {
    const response = Buffer.alloc(9)
    response.writeUInt16BE(transactionId, 0)
    response.writeUInt16BE(0, 2) // Protocol ID
    response.writeUInt16BE(3, 4) // Length
    response.writeUInt8(unitId, 6)
    response.writeUInt8(functionCode | 0x80, 7) // Error flag
    response.writeUInt8(exceptionCode, 8)
    return response
  }

  /**
   * Read register values for a range
   */
  private readRegisterValues(startAddress: number, quantity: number): number[] | null {
    const values: number[] = []

    for (let i = 0; i < quantity; i++) {
      const address = startAddress + i
      let found = false

      for (const reg of this.registers) {
        const regEnd = reg.address + reg.length
        if (address >= reg.address && address < regEnd) {
          const offset = address - reg.address
          values.push(reg.currentValues[offset])
          found = true
          break
        }
      }

      if (!found) {
        return null // Address not found
      }
    }

    return values
  }

  /**
   * Write a single register value
   */
  private writeRegisterValue(address: number, value: number): boolean {
    for (const reg of this.registers) {
      const regEnd = reg.address + reg.length
      if (address >= reg.address && address < regEnd) {
        const offset = address - reg.address
        reg.currentValues[offset] = value
        return true
      }
    }
    return false
  }

  /**
   * Start periodic value updates based on waveforms
   */
  private startValueUpdates(): void {
    // Update values every 100ms for smooth waveform simulation
    this.updateInterval = setInterval(() => {
      const timestamp = Date.now()

      for (const reg of this.registers) {
        for (let i = 0; i < reg.length; i++) {
          reg.currentValues[i] = generateWaveformValue(reg.waveform, timestamp)
        }
      }
    }, 100)
  }
}

// Singleton instance
let virtualServerManager: VirtualServerManager | null = null

/**
 * Get the VirtualServerManager singleton instance
 */
export function getVirtualServerManager(): VirtualServerManager {
  if (!virtualServerManager) {
    virtualServerManager = new VirtualServerManager()
  }
  return virtualServerManager
}

/**
 * Dispose the VirtualServerManager singleton
 */
export async function disposeVirtualServerManager(): Promise<void> {
  if (virtualServerManager) {
    await virtualServerManager.stopAll()
    virtualServerManager = null
  }
}

export type { VirtualServer, VirtualRegister, Waveform }
