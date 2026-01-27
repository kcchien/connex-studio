/**
 * Diagnostics type definitions for Modbus frame logging.
 * Used by the Frame Diagnostics panel for debugging raw communication.
 */

/**
 * Parsed Modbus TCP frame structure.
 * MBAP Header (7 bytes) + PDU
 */
export interface ParsedFrame {
  /** Transaction identifier (2 bytes) - matches request/response pairs */
  transactionId: number
  /** Protocol identifier (2 bytes) - always 0 for Modbus TCP */
  protocolId: number
  /** Unit identifier (1 byte) - slave address */
  unitId: number
  /** Function code (1 byte) - read/write operation type */
  functionCode: number
  /** Data payload as hex string */
  data: string
  /** Whether this is an exception response (function code >= 0x80) */
  isException?: boolean
  /** Exception code if isException is true */
  exceptionCode?: number
}

/**
 * A logged Modbus frame with metadata.
 */
export interface FrameLog {
  /** Unique identifier for this log entry */
  id: string
  /** Timestamp when the frame was captured */
  timestamp: number
  /** Direction: transmit (request) or receive (response) */
  direction: 'tx' | 'rx'
  /** Raw frame as hex string (e.g., "00 01 00 00 00 06 01 03 00 00 00 0A") */
  rawHex: string
  /** Parsed frame structure */
  parsed: ParsedFrame
  /** Associated tag ID if this was a tag read operation */
  tagId?: string
  /** Round-trip latency in milliseconds (only for rx frames) */
  latencyMs?: number
}

/**
 * Modbus function code descriptions for UI display.
 */
export const FUNCTION_CODE_INFO: Record<number, { name: string; description: string }> = {
  0x01: { name: 'Read Coils', description: 'Read 1-2000 coil status' },
  0x02: { name: 'Read Discrete Inputs', description: 'Read 1-2000 discrete input status' },
  0x03: { name: 'Read Holding Registers', description: 'Read 1-125 holding registers' },
  0x04: { name: 'Read Input Registers', description: 'Read 1-125 input registers' },
  0x05: { name: 'Write Single Coil', description: 'Write a single coil' },
  0x06: { name: 'Write Single Register', description: 'Write a single holding register' },
  0x0F: { name: 'Write Multiple Coils', description: 'Write multiple coils' },
  0x10: { name: 'Write Multiple Registers', description: 'Write multiple holding registers' },
  0x17: { name: 'Read/Write Multiple Registers', description: 'Read and write registers in one transaction' }
}

/**
 * Modbus exception code descriptions.
 */
export const EXCEPTION_CODE_INFO: Record<number, { name: string; description: string }> = {
  0x01: { name: 'Illegal Function', description: 'Function code not supported' },
  0x02: { name: 'Illegal Data Address', description: 'Address out of range' },
  0x03: { name: 'Illegal Data Value', description: 'Invalid data value' },
  0x04: { name: 'Server Device Failure', description: 'Unrecoverable error on server' },
  0x05: { name: 'Acknowledge', description: 'Request accepted, processing' },
  0x06: { name: 'Server Device Busy', description: 'Server busy, retry later' },
  0x08: { name: 'Memory Parity Error', description: 'Memory parity check failed' },
  0x0A: { name: 'Gateway Path Unavailable', description: 'Gateway misconfigured' },
  0x0B: { name: 'Gateway Target Failed', description: 'Target device not responding' }
}

/**
 * Configuration for frame logging.
 */
export interface FrameLogConfig {
  /** Whether frame logging is enabled (impacts performance) */
  enabled: boolean
  /** Maximum number of frames to keep in the ring buffer */
  maxFrames: number
}

/**
 * Default frame log configuration.
 */
export const DEFAULT_FRAME_LOG_CONFIG: FrameLogConfig = {
  enabled: false,
  maxFrames: 500
}

/**
 * Parse a raw Modbus TCP frame from hex string.
 */
export function parseModbusFrame(hexString: string): ParsedFrame | null {
  // Remove spaces and convert to bytes
  const hex = hexString.replace(/\s/g, '')
  if (hex.length < 14) {
    // Minimum MBAP header (7 bytes) + function code (1 byte) = 8 bytes = 16 hex chars
    return null
  }

  try {
    const transactionId = parseInt(hex.slice(0, 4), 16)
    const protocolId = parseInt(hex.slice(4, 8), 16)
    // const length = parseInt(hex.slice(8, 12), 16) // Not needed for parsing
    const unitId = parseInt(hex.slice(12, 14), 16)
    const functionCode = parseInt(hex.slice(14, 16), 16)
    const data = hex.slice(16)

    const isException = functionCode >= 0x80
    const actualFunctionCode = isException ? functionCode - 0x80 : functionCode
    const exceptionCode = isException && data.length >= 2 ? parseInt(data.slice(0, 2), 16) : undefined

    return {
      transactionId,
      protocolId,
      unitId,
      functionCode: actualFunctionCode,
      data: formatHexString(data),
      isException,
      exceptionCode
    }
  } catch {
    return null
  }
}

/**
 * Format hex string with spaces for readability.
 */
export function formatHexString(hex: string): string {
  return hex.replace(/(.{2})/g, '$1 ').trim().toUpperCase()
}

/**
 * Convert bytes array to hex string.
 */
export function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ').toUpperCase()
}
