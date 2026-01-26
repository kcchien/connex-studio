/**
 * Calculator type definitions for protocol debugging utilities.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Common Types
// -----------------------------------------------------------------------------

/**
 * Calculator-specific byte order type for UI display names.
 * Maps to the core ByteOrder type (ABCD, DCBA, BADC, CDAB).
 */
export type CalculatorByteOrder = 'big-endian' | 'little-endian' | 'mid-big' | 'mid-little'

// -----------------------------------------------------------------------------
// CRC/LRC Types
// -----------------------------------------------------------------------------

export interface CrcResult {
  crc: number
  hex: string
  hexSwapped: string
  bytes: number[]
}

export interface LrcResult {
  lrc: number
  hex: string
}

// -----------------------------------------------------------------------------
// Float Encoding/Decoding Types
// -----------------------------------------------------------------------------

export interface FloatDecodeResult {
  value: number
  sign: number
  exponent: number
  mantissa: number
  binary: string
  hex: string
  isNaN: boolean
  isInfinity: boolean
  isZero: boolean
}

export interface FloatEncodeResult {
  bytes: number[]
  hex: string
  binary: string
}

// Request types for IPC
export interface DecodeFloatRequest {
  data: number[] | string
  byteOrder?: CalculatorByteOrder
}

export interface EncodeFloatRequest {
  value: number
  byteOrder?: CalculatorByteOrder
}

// -----------------------------------------------------------------------------
// Byte Swap Types
// -----------------------------------------------------------------------------

export interface ByteSwapResult {
  original: number[]
  swapped: number[]
  originalHex: string
  swappedHex: string
}

export interface ConvertByteOrderRequest {
  data: number[] | string
  from: CalculatorByteOrder
  to: CalculatorByteOrder
}

// -----------------------------------------------------------------------------
// Modbus Address Types
// -----------------------------------------------------------------------------

export type RegisterType = 'coil' | 'discrete-input' | 'input-register' | 'holding-register'

export interface ModbusAddressInfo {
  registerType: RegisterType
  address: number
  modiconAddress: string
  iecAddress: string
  functionCodes: {
    read: number[]
    write?: number[]
  }
}

export interface ParseModbusAddressRequest {
  address: string
  registerType?: RegisterType
}

// -----------------------------------------------------------------------------
// Packet Analysis Types
// -----------------------------------------------------------------------------

export interface ModbusRtuAnalysis {
  slaveId: number
  functionCode: number
  functionName: string
  data: number[]
  crc: {
    received: number
    calculated: number
    valid: boolean
  }
}

export interface ModbusTcpAnalysis {
  transactionId: number
  protocolId: number
  length: number
  unitId: number
  functionCode: number
  functionName: string
  data: number[]
}

export interface PacketAnalysis {
  protocol: 'modbus-rtu' | 'modbus-tcp' | 'unknown'
  valid: boolean
  details: ModbusRtuAnalysis | ModbusTcpAnalysis | null
  errors: string[]
  warnings: string[]
}
