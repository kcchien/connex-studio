/**
 * Calculator IPC Handlers
 *
 * Handles IPC communication for protocol calculator operations:
 * - CRC-16 Modbus calculation
 * - LRC calculation
 * - Float32 encoding/decoding
 * - Byte order swapping
 * - Modbus address conversion
 * - Packet analysis
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import {
  CALCULATOR_CRC16_MODBUS,
  CALCULATOR_LRC,
  CALCULATOR_DECODE_FLOAT32,
  CALCULATOR_ENCODE_FLOAT32,
  CALCULATOR_SWAP_BYTES
} from '@shared/constants/ipc-channels'
import {
  getProtocolCalculator,
  type CrcResult,
  type LrcResult,
  type FloatDecodeResult,
  type FloatEncodeResult,
  type ByteSwapResult,
  type ByteOrder,
  type ModbusAddressInfo,
  type PacketAnalysis
} from '../services/ProtocolCalculator'

// Additional IPC channels not yet in ipc-channels.ts
const CALCULATOR_SWAP_WORDS = 'calculator:swap-words'
const CALCULATOR_CONVERT_BYTE_ORDER = 'calculator:convert-byte-order'
const CALCULATOR_DECODE_FLOAT64 = 'calculator:decode-float64'
const CALCULATOR_PARSE_MODBUS_ADDRESS = 'calculator:parse-modbus-address'
const CALCULATOR_ANALYZE_PACKET = 'calculator:analyze-packet'
const CALCULATOR_HEX_TO_BYTES = 'calculator:hex-to-bytes'
const CALCULATOR_BYTES_TO_HEX = 'calculator:bytes-to-hex'

/**
 * Register calculator IPC handlers.
 */
export function registerCalculatorHandlers(): void {
  log.info('[CalculatorIPC] Registering calculator handlers')

  const calculator = getProtocolCalculator()

  // ==========================================================================
  // CRC-16 Modbus (T113)
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_CRC16_MODBUS,
    async (_, data: number[] | string): Promise<CrcResult> => {
      log.debug(`[CalculatorIPC] Calculating CRC-16 Modbus`)
      try {
        return calculator.crc16Modbus(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] CRC-16 error: ${message}`)
        throw new Error(message)
      }
    }
  )

  // ==========================================================================
  // LRC (T114)
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_LRC,
    async (_, data: number[] | string): Promise<LrcResult> => {
      log.debug(`[CalculatorIPC] Calculating LRC`)
      try {
        return calculator.lrc(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] LRC error: ${message}`)
        throw new Error(message)
      }
    }
  )

  // ==========================================================================
  // Float Operations (T116)
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_DECODE_FLOAT32,
    async (
      _,
      params: { data: number[] | string; byteOrder?: ByteOrder }
    ): Promise<FloatDecodeResult> => {
      log.debug(`[CalculatorIPC] Decoding Float32`)
      try {
        return calculator.decodeFloat32(params.data, params.byteOrder)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Float32 decode error: ${message}`)
        throw new Error(message)
      }
    }
  )

  ipcMain.handle(
    CALCULATOR_ENCODE_FLOAT32,
    async (
      _,
      params: { value: number; byteOrder?: ByteOrder }
    ): Promise<FloatEncodeResult> => {
      log.debug(`[CalculatorIPC] Encoding Float32: ${params.value}`)
      try {
        return calculator.encodeFloat32(params.value, params.byteOrder)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Float32 encode error: ${message}`)
        throw new Error(message)
      }
    }
  )

  ipcMain.handle(
    CALCULATOR_DECODE_FLOAT64,
    async (
      _,
      params: { data: number[] | string; byteOrder?: ByteOrder }
    ): Promise<FloatDecodeResult> => {
      log.debug(`[CalculatorIPC] Decoding Float64`)
      try {
        return calculator.decodeFloat64(params.data, params.byteOrder)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Float64 decode error: ${message}`)
        throw new Error(message)
      }
    }
  )

  // ==========================================================================
  // Byte Order Operations (T115)
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_SWAP_BYTES,
    async (_, data: number[] | string): Promise<ByteSwapResult> => {
      log.debug(`[CalculatorIPC] Swapping bytes`)
      try {
        return calculator.swapBytes(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Swap bytes error: ${message}`)
        throw new Error(message)
      }
    }
  )

  ipcMain.handle(
    CALCULATOR_SWAP_WORDS,
    async (_, data: number[] | string): Promise<ByteSwapResult> => {
      log.debug(`[CalculatorIPC] Swapping words`)
      try {
        return calculator.swapWords(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Swap words error: ${message}`)
        throw new Error(message)
      }
    }
  )

  ipcMain.handle(
    CALCULATOR_CONVERT_BYTE_ORDER,
    async (
      _,
      params: { data: number[] | string; from: ByteOrder; to: ByteOrder }
    ): Promise<ByteSwapResult> => {
      log.debug(`[CalculatorIPC] Converting byte order: ${params.from} -> ${params.to}`)
      try {
        return calculator.convertByteOrder(params.data, params.from, params.to)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Convert byte order error: ${message}`)
        throw new Error(message)
      }
    }
  )

  // ==========================================================================
  // Modbus Address (T117)
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_PARSE_MODBUS_ADDRESS,
    async (
      _,
      params: {
        address: string
        registerType?: 'coil' | 'discrete-input' | 'input-register' | 'holding-register'
      }
    ): Promise<ModbusAddressInfo> => {
      log.debug(`[CalculatorIPC] Parsing Modbus address: ${params.address}`)
      try {
        return calculator.parseModbusAddress(params.address, params.registerType)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Parse address error: ${message}`)
        throw new Error(message)
      }
    }
  )

  // ==========================================================================
  // Packet Analysis (T118)
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_ANALYZE_PACKET,
    async (_, data: number[] | string): Promise<PacketAnalysis> => {
      log.debug(`[CalculatorIPC] Analyzing packet`)
      try {
        return calculator.analyzePacket(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[CalculatorIPC] Analyze packet error: ${message}`)
        throw new Error(message)
      }
    }
  )

  // ==========================================================================
  // Utility Operations
  // ==========================================================================

  ipcMain.handle(
    CALCULATOR_HEX_TO_BYTES,
    async (_, hex: string): Promise<number[]> => {
      try {
        return calculator.hexToBytes(hex)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(message)
      }
    }
  )

  ipcMain.handle(
    CALCULATOR_BYTES_TO_HEX,
    async (_, params: { bytes: number[]; separator?: string }): Promise<string> => {
      try {
        return calculator.bytesToHex(params.bytes, params.separator)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(message)
      }
    }
  )

  log.info('[CalculatorIPC] Calculator handlers registered')
}
