/**
 * Protocol Calculator Service
 *
 * Provides protocol debugging tools:
 * - CRC-16 Modbus calculation
 * - LRC (Longitudinal Redundancy Check) calculation
 * - Byte Order conversion (swap bytes, swap words)
 * - IEEE 754 Float encoding/decoding
 * - Modbus address format conversion
 * - Packet analysis (RTU/TCP detection)
 */

import log from 'electron-log/main.js'

// =============================================================================
// Types
// =============================================================================

export type ByteOrder = 'big-endian' | 'little-endian' | 'mid-big' | 'mid-little'

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

export interface ByteSwapResult {
  original: number[]
  swapped: number[]
  originalHex: string
  swappedHex: string
}

export interface ModbusAddressInfo {
  registerType: 'coil' | 'discrete-input' | 'input-register' | 'holding-register'
  address: number
  modiconAddress: string
  iecAddress: string
  functionCodes: {
    read: number[]
    write?: number[]
  }
}

export interface PacketAnalysis {
  protocol: 'modbus-rtu' | 'modbus-tcp' | 'unknown'
  valid: boolean
  details: ModbusRtuAnalysis | ModbusTcpAnalysis | null
  errors: string[]
  warnings: string[]
}

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

// =============================================================================
// CRC-16 Modbus Calculation (T113)
// =============================================================================

// CRC-16/MODBUS polynomial: 0x8005 (reflected: 0xA001)
const CRC_TABLE: number[] = []

// Initialize CRC lookup table
function initCrcTable(): void {
  if (CRC_TABLE.length > 0) return

  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xa001
      } else {
        crc = crc >> 1
      }
    }
    CRC_TABLE.push(crc)
  }
}

/**
 * Calculate CRC-16/Modbus checksum.
 * @param data - Input bytes as array or hex string
 * @returns CRC result with various formats
 */
export function calculateCrc16Modbus(data: number[] | string): CrcResult {
  initCrcTable()

  const bytes = typeof data === 'string' ? hexToBytes(data) : data

  let crc = 0xffff
  for (const byte of bytes) {
    crc = (crc >> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  }

  const lowByte = crc & 0xff
  const highByte = (crc >> 8) & 0xff

  return {
    crc,
    hex: crc.toString(16).toUpperCase().padStart(4, '0'),
    hexSwapped: `${lowByte.toString(16).toUpperCase().padStart(2, '0')}${highByte.toString(16).toUpperCase().padStart(2, '0')}`,
    bytes: [lowByte, highByte]
  }
}

// =============================================================================
// LRC Calculation (T114)
// =============================================================================

/**
 * Calculate LRC (Longitudinal Redundancy Check) for Modbus ASCII.
 * LRC = Two's complement of the sum of all bytes (excluding start/end chars)
 * @param data - Input bytes as array or hex string
 * @returns LRC result
 */
export function calculateLrc(data: number[] | string): LrcResult {
  const bytes = typeof data === 'string' ? hexToBytes(data) : data

  let sum = 0
  for (const byte of bytes) {
    sum = (sum + byte) & 0xff
  }

  // Two's complement
  const lrc = ((~sum + 1) & 0xff)

  return {
    lrc,
    hex: lrc.toString(16).toUpperCase().padStart(2, '0')
  }
}

// =============================================================================
// Byte Order Conversion (T115)
// =============================================================================

/**
 * Swap byte order within 16-bit words.
 * [0x12, 0x34] -> [0x34, 0x12]
 */
export function swapBytes(data: number[] | string): ByteSwapResult {
  const bytes = typeof data === 'string' ? hexToBytes(data) : [...data]
  const swapped: number[] = []

  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      swapped.push(bytes[i + 1], bytes[i])
    } else {
      swapped.push(bytes[i])
    }
  }

  return {
    original: bytes,
    swapped,
    originalHex: bytesToHex(bytes),
    swappedHex: bytesToHex(swapped)
  }
}

/**
 * Swap word order within 32-bit values (swap pairs of 16-bit words).
 * [0x12, 0x34, 0x56, 0x78] -> [0x56, 0x78, 0x12, 0x34]
 */
export function swapWords(data: number[] | string): ByteSwapResult {
  const bytes = typeof data === 'string' ? hexToBytes(data) : [...data]
  const swapped: number[] = []

  for (let i = 0; i < bytes.length; i += 4) {
    if (i + 3 < bytes.length) {
      swapped.push(bytes[i + 2], bytes[i + 3], bytes[i], bytes[i + 1])
    } else if (i + 1 < bytes.length) {
      swapped.push(bytes[i], bytes[i + 1])
    } else {
      swapped.push(bytes[i])
    }
  }

  return {
    original: bytes,
    swapped,
    originalHex: bytesToHex(bytes),
    swappedHex: bytesToHex(swapped)
  }
}

/**
 * Convert bytes between different byte orders.
 */
export function convertByteOrder(
  data: number[] | string,
  fromOrder: ByteOrder,
  toOrder: ByteOrder
): ByteSwapResult {
  const bytes = typeof data === 'string' ? hexToBytes(data) : [...data]

  if (fromOrder === toOrder) {
    return {
      original: bytes,
      swapped: bytes,
      originalHex: bytesToHex(bytes),
      swappedHex: bytesToHex(bytes)
    }
  }

  // Normalize to big-endian first
  let normalized = [...bytes]
  switch (fromOrder) {
    case 'little-endian':
      normalized = swapBytesInternal(bytes)
      break
    case 'mid-big': // CDAB -> ABCD
      normalized = swapWordsInternal(bytes)
      break
    case 'mid-little': // DCBA -> ABCD
      normalized = swapBytesInternal(swapWordsInternal(bytes))
      break
  }

  // Convert from big-endian to target order
  let result = [...normalized]
  switch (toOrder) {
    case 'little-endian':
      result = swapBytesInternal(normalized)
      break
    case 'mid-big': // ABCD -> CDAB
      result = swapWordsInternal(normalized)
      break
    case 'mid-little': // ABCD -> DCBA
      result = swapBytesInternal(swapWordsInternal(normalized))
      break
  }

  return {
    original: bytes,
    swapped: result,
    originalHex: bytesToHex(bytes),
    swappedHex: bytesToHex(result)
  }
}

function swapBytesInternal(bytes: number[]): number[] {
  const result: number[] = []
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      result.push(bytes[i + 1], bytes[i])
    } else {
      result.push(bytes[i])
    }
  }
  return result
}

function swapWordsInternal(bytes: number[]): number[] {
  const result: number[] = []
  for (let i = 0; i < bytes.length; i += 4) {
    if (i + 3 < bytes.length) {
      result.push(bytes[i + 2], bytes[i + 3], bytes[i], bytes[i + 1])
    } else if (i + 1 < bytes.length) {
      result.push(bytes[i], bytes[i + 1])
    } else {
      result.push(bytes[i])
    }
  }
  return result
}

// =============================================================================
// IEEE 754 Float Encoding/Decoding (T116)
// =============================================================================

/**
 * Decode 4 bytes as IEEE 754 single-precision float (32-bit).
 * @param data - 4 bytes as array or hex string
 * @param byteOrder - Byte order of input data
 */
export function decodeFloat32(
  data: number[] | string,
  byteOrder: ByteOrder = 'big-endian'
): FloatDecodeResult {
  let bytes = typeof data === 'string' ? hexToBytes(data) : [...data]

  if (bytes.length !== 4) {
    throw new Error('Float32 requires exactly 4 bytes')
  }

  // Convert to big-endian for processing
  if (byteOrder !== 'big-endian') {
    const converted = convertByteOrder(bytes, byteOrder, 'big-endian')
    bytes = converted.swapped
  }

  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  bytes.forEach((b, i) => view.setUint8(i, b))

  const value = view.getFloat32(0, false) // big-endian
  const bits = view.getUint32(0, false)

  const sign = (bits >> 31) & 0x1
  const exponent = (bits >> 23) & 0xff
  const mantissa = bits & 0x7fffff

  return {
    value,
    sign,
    exponent,
    mantissa,
    binary: bits.toString(2).padStart(32, '0'),
    hex: bits.toString(16).toUpperCase().padStart(8, '0'),
    isNaN: Number.isNaN(value),
    isInfinity: !Number.isFinite(value) && !Number.isNaN(value),
    isZero: value === 0
  }
}

/**
 * Encode a float value as IEEE 754 single-precision (32-bit).
 * @param value - Float value to encode
 * @param byteOrder - Desired byte order of output
 */
export function encodeFloat32(
  value: number,
  byteOrder: ByteOrder = 'big-endian'
): FloatEncodeResult {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setFloat32(0, value, false) // big-endian

  const bytes: number[] = []
  for (let i = 0; i < 4; i++) {
    bytes.push(view.getUint8(i))
  }

  // Convert to desired byte order
  let resultBytes = bytes
  if (byteOrder !== 'big-endian') {
    const converted = convertByteOrder(bytes, 'big-endian', byteOrder)
    resultBytes = converted.swapped
  }

  const bits = view.getUint32(0, false)

  return {
    bytes: resultBytes,
    hex: bytesToHex(resultBytes),
    binary: bits.toString(2).padStart(32, '0')
  }
}

/**
 * Decode 8 bytes as IEEE 754 double-precision float (64-bit).
 */
export function decodeFloat64(
  data: number[] | string,
  byteOrder: ByteOrder = 'big-endian'
): FloatDecodeResult {
  let bytes = typeof data === 'string' ? hexToBytes(data) : [...data]

  if (bytes.length !== 8) {
    throw new Error('Float64 requires exactly 8 bytes')
  }

  // Convert to big-endian for processing
  if (byteOrder !== 'big-endian') {
    const converted = convertByteOrder(bytes, byteOrder, 'big-endian')
    bytes = converted.swapped
  }

  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  bytes.forEach((b, i) => view.setUint8(i, b))

  const value = view.getFloat64(0, false)
  const highBits = view.getUint32(0, false)
  const lowBits = view.getUint32(4, false)

  const sign = (highBits >> 31) & 0x1
  const exponent = (highBits >> 20) & 0x7ff
  const mantissa = ((highBits & 0xfffff) * Math.pow(2, 32)) + lowBits

  const highBinary = highBits.toString(2).padStart(32, '0')
  const lowBinary = lowBits.toString(2).padStart(32, '0')

  return {
    value,
    sign,
    exponent,
    mantissa,
    binary: highBinary + lowBinary,
    hex: bytesToHex(bytes),
    isNaN: Number.isNaN(value),
    isInfinity: !Number.isFinite(value) && !Number.isNaN(value),
    isZero: value === 0
  }
}

// =============================================================================
// Modbus Address Format Converter (T117)
// =============================================================================

/**
 * Modbus function codes by register type.
 */
const MODBUS_FUNCTION_CODES = {
  'coil': { read: [1], write: [5, 15] },
  'discrete-input': { read: [2] },
  'input-register': { read: [4] },
  'holding-register': { read: [3], write: [6, 16] }
}

/**
 * Parse Modbus address from various formats and return normalized info.
 * Supports:
 * - Modicon format: 00001-09999 (Coils), 10001-19999 (DI), 30001-39999 (IR), 40001-49999 (HR)
 * - IEC format: 0x prefix with register type indicator
 * - Raw format: just the 0-based address
 *
 * @param address - Address string in any format
 * @param registerType - Optional register type (required for raw addresses)
 */
export function parseModbusAddress(
  address: string,
  registerType?: 'coil' | 'discrete-input' | 'input-register' | 'holding-register'
): ModbusAddressInfo {
  const trimmed = address.trim()

  // Modicon 5-digit format
  if (/^\d{5}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10)
    if (num >= 1 && num <= 9999) {
      return createAddressInfo('coil', num - 1)
    } else if (num >= 10001 && num <= 19999) {
      return createAddressInfo('discrete-input', num - 10001)
    } else if (num >= 30001 && num <= 39999) {
      return createAddressInfo('input-register', num - 30001)
    } else if (num >= 40001 && num <= 49999) {
      return createAddressInfo('holding-register', num - 40001)
    }
  }

  // Modicon 6-digit format (extended addressing)
  if (/^\d{6}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10)
    if (num >= 1 && num <= 65536) {
      return createAddressInfo('coil', num - 1)
    } else if (num >= 100001 && num <= 165536) {
      return createAddressInfo('discrete-input', num - 100001)
    } else if (num >= 300001 && num <= 365536) {
      return createAddressInfo('input-register', num - 300001)
    } else if (num >= 400001 && num <= 465536) {
      return createAddressInfo('holding-register', num - 400001)
    }
  }

  // IEC format with prefix (e.g., "HR100", "IR50", "COIL0", "DI10")
  const iecMatch = trimmed.match(/^(HR|IR|DI|COIL)(\d+)$/i)
  if (iecMatch) {
    const prefix = iecMatch[1].toUpperCase()
    const addr = parseInt(iecMatch[2], 10)
    const typeMap: Record<string, 'coil' | 'discrete-input' | 'input-register' | 'holding-register'> = {
      'COIL': 'coil',
      'DI': 'discrete-input',
      'IR': 'input-register',
      'HR': 'holding-register'
    }
    return createAddressInfo(typeMap[prefix], addr)
  }

  // Raw numeric address (requires registerType)
  if (/^\d+$/.test(trimmed) && registerType) {
    return createAddressInfo(registerType, parseInt(trimmed, 10))
  }

  throw new Error(`Invalid Modbus address format: ${address}`)
}

function createAddressInfo(
  registerType: 'coil' | 'discrete-input' | 'input-register' | 'holding-register',
  address: number
): ModbusAddressInfo {
  const modiconOffsets = {
    'coil': 1,
    'discrete-input': 10001,
    'input-register': 30001,
    'holding-register': 40001
  }

  const iecPrefixes = {
    'coil': 'COIL',
    'discrete-input': 'DI',
    'input-register': 'IR',
    'holding-register': 'HR'
  }

  return {
    registerType,
    address,
    modiconAddress: (modiconOffsets[registerType] + address).toString().padStart(5, '0'),
    iecAddress: `${iecPrefixes[registerType]}${address}`,
    functionCodes: MODBUS_FUNCTION_CODES[registerType]
  }
}

/**
 * Convert between Modbus address formats.
 */
export function convertModbusAddress(
  address: string,
  registerType?: 'coil' | 'discrete-input' | 'input-register' | 'holding-register'
): ModbusAddressInfo {
  return parseModbusAddress(address, registerType)
}

// =============================================================================
// Packet Analyzer (T118)
// =============================================================================

/**
 * Modbus function code names.
 */
const FUNCTION_CODE_NAMES: Record<number, string> = {
  1: 'Read Coils',
  2: 'Read Discrete Inputs',
  3: 'Read Holding Registers',
  4: 'Read Input Registers',
  5: 'Write Single Coil',
  6: 'Write Single Register',
  7: 'Read Exception Status',
  8: 'Diagnostics',
  11: 'Get Comm Event Counter',
  12: 'Get Comm Event Log',
  15: 'Write Multiple Coils',
  16: 'Write Multiple Registers',
  17: 'Report Slave ID',
  20: 'Read File Record',
  21: 'Write File Record',
  22: 'Mask Write Register',
  23: 'Read/Write Multiple Registers',
  24: 'Read FIFO Queue',
  43: 'Encapsulated Interface Transport'
}

/**
 * Analyze a packet to detect protocol and extract details.
 * @param data - Packet bytes as array or hex string
 */
export function analyzePacket(data: number[] | string): PacketAnalysis {
  const bytes = typeof data === 'string' ? hexToBytes(data) : [...data]
  const errors: string[] = []
  const warnings: string[] = []

  if (bytes.length < 4) {
    return {
      protocol: 'unknown',
      valid: false,
      details: null,
      errors: ['Packet too short (minimum 4 bytes)'],
      warnings: []
    }
  }

  // Try Modbus TCP first (has distinct header)
  if (bytes.length >= 8) {
    const tcpResult = analyzeModbusTcp(bytes)
    if (tcpResult.valid || tcpResult.errors.length === 0) {
      return tcpResult
    }
  }

  // Try Modbus RTU
  if (bytes.length >= 4) {
    const rtuResult = analyzeModbusRtu(bytes)
    if (rtuResult.valid) {
      return rtuResult
    }
    // Even if CRC fails, might still be RTU with corrupt data
    if (rtuResult.details) {
      return rtuResult
    }
  }

  return {
    protocol: 'unknown',
    valid: false,
    details: null,
    errors: ['Could not identify protocol'],
    warnings: ['Packet does not match known Modbus RTU or TCP format']
  }
}

function analyzeModbusTcp(bytes: number[]): PacketAnalysis {
  const errors: string[] = []
  const warnings: string[] = []

  if (bytes.length < 8) {
    errors.push('Modbus TCP requires minimum 8 bytes')
    return { protocol: 'modbus-tcp', valid: false, details: null, errors, warnings }
  }

  const transactionId = (bytes[0] << 8) | bytes[1]
  const protocolId = (bytes[2] << 8) | bytes[3]
  const length = (bytes[4] << 8) | bytes[5]
  const unitId = bytes[6]
  const functionCode = bytes[7]

  // Protocol ID should be 0 for Modbus
  if (protocolId !== 0) {
    warnings.push(`Protocol ID is ${protocolId}, expected 0 for Modbus`)
  }

  // Length should match remaining bytes
  const expectedLength = bytes.length - 6
  if (length !== expectedLength) {
    warnings.push(`Length field (${length}) does not match actual data length (${expectedLength})`)
  }

  // Extract PDU data
  const data = bytes.slice(8)

  const details: ModbusTcpAnalysis = {
    transactionId,
    protocolId,
    length,
    unitId,
    functionCode,
    functionName: FUNCTION_CODE_NAMES[functionCode] || `Unknown (${functionCode})`,
    data
  }

  const valid = protocolId === 0 && length === expectedLength && errors.length === 0

  return {
    protocol: 'modbus-tcp',
    valid,
    details,
    errors,
    warnings
  }
}

function analyzeModbusRtu(bytes: number[]): PacketAnalysis {
  const errors: string[] = []
  const warnings: string[] = []

  if (bytes.length < 4) {
    errors.push('Modbus RTU requires minimum 4 bytes')
    return { protocol: 'modbus-rtu', valid: false, details: null, errors, warnings }
  }

  const slaveId = bytes[0]
  const functionCode = bytes[1]

  // Validate slave ID (1-247)
  if (slaveId < 1 || slaveId > 247) {
    warnings.push(`Slave ID ${slaveId} is outside valid range (1-247)`)
  }

  // Validate function code
  if (functionCode === 0 || functionCode > 127) {
    if (functionCode > 127) {
      // Exception response
      const exceptionCode = bytes[2]
      warnings.push(`Exception response detected (FC ${functionCode - 128}, Exception ${exceptionCode})`)
    } else {
      warnings.push(`Invalid function code: ${functionCode}`)
    }
  }

  // Extract data (excluding CRC)
  const data = bytes.slice(2, bytes.length - 2)

  // Verify CRC
  const receivedCrcLow = bytes[bytes.length - 2]
  const receivedCrcHigh = bytes[bytes.length - 1]
  const receivedCrc = (receivedCrcHigh << 8) | receivedCrcLow

  const messageWithoutCrc = bytes.slice(0, bytes.length - 2)
  const calculatedCrc = calculateCrc16Modbus(messageWithoutCrc)

  const crcValid = receivedCrc === calculatedCrc.crc

  if (!crcValid) {
    errors.push(
      `CRC mismatch: received 0x${receivedCrc.toString(16).toUpperCase().padStart(4, '0')}, ` +
      `calculated 0x${calculatedCrc.hex}`
    )
  }

  const details: ModbusRtuAnalysis = {
    slaveId,
    functionCode: functionCode > 127 ? functionCode - 128 : functionCode,
    functionName: FUNCTION_CODE_NAMES[functionCode > 127 ? functionCode - 128 : functionCode] ||
      `Unknown (${functionCode})`,
    data,
    crc: {
      received: receivedCrc,
      calculated: calculatedCrc.crc,
      valid: crcValid
    }
  }

  return {
    protocol: 'modbus-rtu',
    valid: crcValid && errors.length === 0,
    details,
    errors,
    warnings
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert hex string to byte array.
 * Supports formats: "01 02 03", "010203", "0x01,0x02", etc.
 */
export function hexToBytes(hex: string): number[] {
  // Remove common separators and prefixes
  const cleaned = hex
    .replace(/0x/gi, '')
    .replace(/[,\s:]/g, '')

  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error('Invalid hex string')
  }

  if (cleaned.length % 2 !== 0) {
    throw new Error('Hex string must have even length')
  }

  const bytes: number[] = []
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.substr(i, 2), 16))
  }

  return bytes
}

/**
 * Convert byte array to hex string.
 */
export function bytesToHex(bytes: number[], separator = ''): string {
  return bytes
    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(separator)
}

// =============================================================================
// Protocol Calculator Service Class
// =============================================================================

export class ProtocolCalculator {
  private static instance: ProtocolCalculator

  static getInstance(): ProtocolCalculator {
    if (!ProtocolCalculator.instance) {
      ProtocolCalculator.instance = new ProtocolCalculator()
    }
    return ProtocolCalculator.instance
  }

  private constructor() {
    log.info('[ProtocolCalculator] Service initialized')
  }

  // CRC-16 Modbus
  crc16Modbus(data: number[] | string): CrcResult {
    return calculateCrc16Modbus(data)
  }

  // LRC
  lrc(data: number[] | string): LrcResult {
    return calculateLrc(data)
  }

  // Byte order
  swapBytes(data: number[] | string): ByteSwapResult {
    return swapBytes(data)
  }

  swapWords(data: number[] | string): ByteSwapResult {
    return swapWords(data)
  }

  convertByteOrder(data: number[] | string, from: ByteOrder, to: ByteOrder): ByteSwapResult {
    return convertByteOrder(data, from, to)
  }

  // Float operations
  decodeFloat32(data: number[] | string, byteOrder?: ByteOrder): FloatDecodeResult {
    return decodeFloat32(data, byteOrder)
  }

  encodeFloat32(value: number, byteOrder?: ByteOrder): FloatEncodeResult {
    return encodeFloat32(value, byteOrder)
  }

  decodeFloat64(data: number[] | string, byteOrder?: ByteOrder): FloatDecodeResult {
    return decodeFloat64(data, byteOrder)
  }

  // Modbus address
  parseModbusAddress(
    address: string,
    registerType?: 'coil' | 'discrete-input' | 'input-register' | 'holding-register'
  ): ModbusAddressInfo {
    return parseModbusAddress(address, registerType)
  }

  // Packet analysis
  analyzePacket(data: number[] | string): PacketAnalysis {
    return analyzePacket(data)
  }

  // Utilities
  hexToBytes(hex: string): number[] {
    return hexToBytes(hex)
  }

  bytesToHex(bytes: number[], separator?: string): string {
    return bytesToHex(bytes, separator)
  }
}

export function getProtocolCalculator(): ProtocolCalculator {
  return ProtocolCalculator.getInstance()
}
