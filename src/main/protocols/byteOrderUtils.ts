/**
 * Byte Order Conversion Utilities for Modbus 32-bit values.
 *
 * Supports 4 byte order configurations used by different PLC vendors:
 * - ABCD (Big-Endian): Siemens S7, ABB, Modicon M340, Beckhoff
 * - DCBA (Little-Endian): Some Allen-Bradley, Some Omron
 * - BADC (Mid-Big/Word Swap): Schneider Modicon, Some Mitsubishi
 * - CDAB (Mid-Little/Byte Swap): GE Fanuc, Some older PLCs
 */

import type { ByteOrder } from '@shared/types'

/**
 * Swap bytes within a 16-bit word.
 * 0x1234 -> 0x3412
 *
 * @param word 16-bit value to swap
 * @returns Word with high and low bytes swapped
 */
export function swapBytes(word: number): number {
  // Mask to 16 bits first
  const masked = word & 0xffff
  return ((masked & 0xff) << 8) | ((masked >> 8) & 0xff)
}

/**
 * Reorder two 16-bit registers based on byte order.
 * Returns [high, low] in the correct order for IEEE 754 interpretation.
 *
 * @param reg0 First register value from Modbus
 * @param reg1 Second register value from Modbus
 * @param byteOrder Target byte order configuration
 * @returns Tuple of [high, low] registers ready for conversion
 */
export function reorderRegisters(
  reg0: number,
  reg1: number,
  byteOrder: ByteOrder
): [number, number] {
  switch (byteOrder) {
    case 'ABCD': // Big-endian: already correct
      return [reg0, reg1]
    case 'DCBA': // Little-endian: swap words
      return [reg1, reg0]
    case 'BADC': // Mid-big: swap bytes in each word
      return [swapBytes(reg0), swapBytes(reg1)]
    case 'CDAB': // Mid-little: swap bytes and words
      return [swapBytes(reg1), swapBytes(reg0)]
    default:
      // Defensive: handle invalid byteOrder by defaulting to ABCD
      // This prevents TypeError if invalid value somehow gets through validation
      console.warn(`[byteOrderUtils] Invalid byteOrder "${byteOrder}", defaulting to ABCD`)
      return [reg0, reg1]
  }
}

/**
 * Convert two 16-bit registers to a 32-bit float (IEEE 754).
 *
 * @param reg0 First register value from Modbus
 * @param reg1 Second register value from Modbus
 * @param byteOrder Byte order configuration
 * @returns 32-bit floating point value
 */
export function convertFloat32(reg0: number, reg1: number, byteOrder: ByteOrder): number {
  const [high, low] = reorderRegisters(reg0, reg1, byteOrder)

  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setUint16(0, high, false)
  view.setUint16(2, low, false)
  return view.getFloat32(0, false)
}

/**
 * Convert two 16-bit registers to a signed 32-bit integer.
 *
 * @param reg0 First register value from Modbus
 * @param reg1 Second register value from Modbus
 * @param byteOrder Byte order configuration
 * @returns Signed 32-bit integer value
 */
export function convertInt32(reg0: number, reg1: number, byteOrder: ByteOrder): number {
  const [high, low] = reorderRegisters(reg0, reg1, byteOrder)
  const unsigned = ((high << 16) | low) >>> 0

  // Convert to signed if necessary
  if (unsigned >= 0x80000000) {
    return unsigned - 0x100000000
  }
  return unsigned
}

/**
 * Convert two 16-bit registers to an unsigned 32-bit integer.
 *
 * @param reg0 First register value from Modbus
 * @param reg1 Second register value from Modbus
 * @param byteOrder Byte order configuration
 * @returns Unsigned 32-bit integer value
 */
export function convertUint32(reg0: number, reg1: number, byteOrder: ByteOrder): number {
  const [high, low] = reorderRegisters(reg0, reg1, byteOrder)
  return ((high << 16) | low) >>> 0
}

/**
 * Reorder four 16-bit registers based on byte order (for 64-bit values).
 * Returns [R0, R1, R2, R3] in big-endian order for IEEE 754 interpretation.
 *
 * @param reg0 First register value from Modbus
 * @param reg1 Second register value from Modbus
 * @param reg2 Third register value from Modbus
 * @param reg3 Fourth register value from Modbus
 * @param byteOrder Target byte order configuration
 * @returns Tuple of 4 registers in big-endian order ready for conversion
 */
export function reorderRegisters64(
  reg0: number, reg1: number, reg2: number, reg3: number,
  byteOrder: ByteOrder
): [number, number, number, number] {
  switch (byteOrder) {
    case 'ABCD':
      return [reg0, reg1, reg2, reg3]
    case 'DCBA':
      return [reg3, reg2, reg1, reg0]
    case 'BADC':
      return [swapBytes(reg0), swapBytes(reg1), swapBytes(reg2), swapBytes(reg3)]
    case 'CDAB':
      return [swapBytes(reg3), swapBytes(reg2), swapBytes(reg1), swapBytes(reg0)]
    default:
      console.warn(`[byteOrderUtils] Invalid byteOrder "${byteOrder}", defaulting to ABCD`)
      return [reg0, reg1, reg2, reg3]
  }
}

/**
 * Decode four 16-bit registers to a 64-bit float (IEEE 754 double).
 *
 * @param registers Array of 4 register values from Modbus
 * @param byteOrder Byte order configuration
 * @returns 64-bit floating point value
 */
export function decodeFloat64(registers: number[], byteOrder: ByteOrder): number {
  if (!registers || registers.length < 4) {
    return NaN
  }
  const [r0, r1, r2, r3] = reorderRegisters64(
    registers[0], registers[1], registers[2], registers[3], byteOrder
  )
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setUint16(0, r0, false)
  view.setUint16(2, r1, false)
  view.setUint16(4, r2, false)
  view.setUint16(6, r3, false)
  return view.getFloat64(0, false)
}

/**
 * Encode a 64-bit float to four 16-bit registers.
 *
 * @param value 64-bit floating point value to encode
 * @param byteOrder Byte order configuration
 * @returns Tuple of 4 registers in the specified byte order
 */
export function encodeFloat64(value: number, byteOrder: ByteOrder): [number, number, number, number] {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, value, false)
  const r0 = view.getUint16(0, false)
  const r1 = view.getUint16(2, false)
  const r2 = view.getUint16(4, false)
  const r3 = view.getUint16(6, false)
  switch (byteOrder) {
    case 'ABCD': return [r0, r1, r2, r3]
    case 'DCBA': return [r3, r2, r1, r0]
    case 'BADC': return [swapBytes(r0), swapBytes(r1), swapBytes(r2), swapBytes(r3)]
    case 'CDAB': return [swapBytes(r3), swapBytes(r2), swapBytes(r1), swapBytes(r0)]
    default: return [r0, r1, r2, r3]
  }
}
