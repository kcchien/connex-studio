/**
 * Modbus-specific type definitions for industrial compatibility.
 * Shared between Main and Renderer processes.
 */

/**
 * Byte order for multi-register values (32-bit).
 * Named after byte positions: A=MSB, D=LSB for value 0x12345678
 *
 * ABCD (Big-Endian):    [0x1234, 0x5678] - Siemens S7, ABB
 * DCBA (Little-Endian): [0x5678, 0x1234] - Some Allen-Bradley
 * BADC (Mid-Big):       [0x3412, 0x7856] - Schneider Modicon
 * CDAB (Mid-Little):    [0x7856, 0x3412] - GE Fanuc
 */
export type ByteOrder = 'ABCD' | 'DCBA' | 'BADC' | 'CDAB'

/**
 * Information about each byte order including vendor compatibility.
 */
export const BYTE_ORDER_INFO: Record<
  ByteOrder,
  { name: string; description: string; vendors: string[] }
> = {
  ABCD: {
    name: 'Big-Endian',
    description: 'Most significant byte first (Modbus standard)',
    vendors: ['Siemens S7', 'ABB', 'Modicon M340', 'Beckhoff']
  },
  DCBA: {
    name: 'Little-Endian',
    description: 'Least significant byte first',
    vendors: ['Some Allen-Bradley', 'Some Omron']
  },
  BADC: {
    name: 'Mid-Big (Word Swap)',
    description: 'Big-endian words, swapped word order',
    vendors: ['Schneider Modicon', 'Some Mitsubishi']
  },
  CDAB: {
    name: 'Mid-Little (Byte Swap)',
    description: 'Little-endian words, swapped word order',
    vendors: ['GE Fanuc', 'Some older PLCs']
  }
}

/**
 * Default byte order - ABCD is the Modbus standard.
 */
export const DEFAULT_BYTE_ORDER: ByteOrder = 'ABCD'

/**
 * Configuration for batch read optimization.
 */
export interface BatchReadConfig {
  enabled: boolean
  maxGap: number // Max address gap to merge (default: 10)
  maxRegisters: number // Max registers per request (default: 125, Modbus limit)
}

/**
 * Default batch read configuration.
 * maxRegisters is 125 per Modbus protocol specification.
 */
export const DEFAULT_BATCH_READ_CONFIG: BatchReadConfig = {
  enabled: true,
  maxGap: 10,
  maxRegisters: 125
}
