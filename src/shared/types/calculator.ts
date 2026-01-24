/**
 * Calculator type definitions for protocol debugging utilities.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// CRC/LRC Types
// -----------------------------------------------------------------------------

export interface CrcResult {
  crc: number
  hex: string
}

export interface LrcResult {
  lrc: number
  hex: string
}

// -----------------------------------------------------------------------------
// Float Encoding/Decoding Types
// -----------------------------------------------------------------------------

export type ByteOrder = 'BE' | 'LE'

export interface DecodeFloat32Request {
  hex: string
  byteOrder: ByteOrder
  wordOrder?: ByteOrder
}

export interface DecodeFloat32Result {
  value: number
}

export interface EncodeFloat32Request {
  value: number
  byteOrder: ByteOrder
  wordOrder?: ByteOrder
}

export interface EncodeFloat32Result {
  hex: string
}

// -----------------------------------------------------------------------------
// Byte Swap Types
// -----------------------------------------------------------------------------

export type SwapOperation = 'swap16' | 'swap32' | 'swap64'

export interface SwapBytesRequest {
  hex: string
  operation: SwapOperation
}

export interface SwapBytesResult {
  result: string
}
