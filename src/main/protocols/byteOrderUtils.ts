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
