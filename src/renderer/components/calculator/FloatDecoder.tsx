/**
 * FloatDecoder - IEEE 754 Float Encoder/Decoder UI
 *
 * Features:
 * - Decode hex bytes to float32/float64
 * - Encode float value to hex bytes
 * - Support multiple byte orders
 * - Display binary representation
 * - Show sign, exponent, mantissa breakdown
 */

import React, { useState, useCallback } from 'react'
import { Binary, Copy, Check, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { calculatorApi } from '@renderer/lib/ipc'
import type { ByteOrder } from '@shared/types/calculator'

// =============================================================================
// Types
// =============================================================================

interface FloatDecodeResult {
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

interface FloatEncodeResult {
  bytes: number[]
  hex: string
  binary: string
}

interface FloatDecoderProps {
  className?: string
}

const BYTE_ORDERS: { value: ByteOrder; label: string }[] = [
  { value: 'big-endian', label: 'Big-Endian (ABCD)' },
  { value: 'little-endian', label: 'Little-Endian (DCBA)' },
  { value: 'mid-big', label: 'Mid-Big (CDAB)' },
  { value: 'mid-little', label: 'Mid-Little (BADC)' }
]

// =============================================================================
// FloatDecoder Component
// =============================================================================

export function FloatDecoder({ className }: FloatDecoderProps): React.ReactElement {
  const [mode, setMode] = useState<'decode' | 'encode'>('decode')
  const [floatSize, setFloatSize] = useState<'float32' | 'float64'>('float32')
  const [hexInput, setHexInput] = useState('')
  const [floatInput, setFloatInput] = useState('')
  const [byteOrder, setByteOrder] = useState<ByteOrder>('big-endian')
  const [decodeResult, setDecodeResult] = useState<FloatDecodeResult | null>(null)
  const [encodeResult, setEncodeResult] = useState<FloatEncodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const decode = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter hex data')
      return
    }

    try {
      const decodeFunc = floatSize === 'float32'
        ? calculatorApi.decodeFloat32
        : calculatorApi.decodeFloat64
      const result = await decodeFunc({
        data: hexInput,
        byteOrder
      })
      setDecodeResult(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decode failed')
      setDecodeResult(null)
    }
  }, [hexInput, byteOrder, floatSize])

  const encode = useCallback(async () => {
    const value = parseFloat(floatInput)
    if (isNaN(value) && floatInput !== 'NaN') {
      setError('Please enter a valid number')
      return
    }

    try {
      const result = await calculatorApi.encodeFloat32({
        value: floatInput === 'NaN' ? NaN : value,
        byteOrder
      })
      setEncodeResult(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encode failed')
      setEncodeResult(null)
    }
  }, [floatInput, byteOrder])

  const copyToClipboard = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const formatBinary = (binary: string, groupSize: number = 8): string => {
    const groups: string[] = []
    for (let i = 0; i < binary.length; i += groupSize) {
      groups.push(binary.slice(i, i + groupSize))
    }
    return groups.join(' ')
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Binary className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">IEEE 754 Float Decoder</h3>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('decode'); setError(null); }}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium',
            mode === 'decode'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          Decode (Hex to Float)
        </button>
        <button
          onClick={() => { setMode('encode'); setError(null); }}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium',
            mode === 'encode'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          Encode (Float to Hex)
        </button>
      </div>

      {/* Float Size Selection */}
      <div className="flex gap-4 items-center">
        <label className="text-sm text-muted-foreground">Float Size:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFloatSize('float32')}
            className={cn(
              'px-3 py-1 rounded text-sm',
              floatSize === 'float32'
                ? 'bg-primary/20 text-primary border border-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            Float32 (4 bytes)
          </button>
          <button
            onClick={() => setFloatSize('float64')}
            disabled={mode === 'encode'}
            className={cn(
              'px-3 py-1 rounded text-sm',
              floatSize === 'float64'
                ? 'bg-primary/20 text-primary border border-primary'
                : 'bg-muted text-muted-foreground',
              mode === 'encode' && 'opacity-50 cursor-not-allowed'
            )}
          >
            Float64 (8 bytes)
          </button>
        </div>
      </div>

      {/* Byte Order Selection */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Byte Order</label>
        <select
          value={byteOrder}
          onChange={(e) => setByteOrder(e.target.value as ByteOrder)}
          className="w-full p-2 bg-muted/50 rounded-md border text-sm"
        >
          {BYTE_ORDERS.map(order => (
            <option key={order.value} value={order.value}>
              {order.label}
            </option>
          ))}
        </select>
      </div>

      {/* Input */}
      {mode === 'decode' ? (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Hex Data ({floatSize === 'float32' ? '4 bytes' : '8 bytes'})
          </label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => { setHexInput(e.target.value); setError(null); }}
            placeholder={floatSize === 'float32' ? '42 48 00 00' : '40 49 00 00 00 00 00 00'}
            className="w-full p-3 font-mono text-sm bg-muted/50 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Float Value</label>
          <input
            type="text"
            value={floatInput}
            onChange={(e) => { setFloatInput(e.target.value); setError(null); }}
            placeholder="3.14159"
            className="w-full p-3 font-mono text-sm bg-muted/50 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Special values: Infinity, -Infinity, NaN
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Calculate Button */}
      <button
        onClick={mode === 'decode' ? decode : encode}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
      >
        {mode === 'decode' ? 'Decode' : 'Encode'}
      </button>

      {/* Decode Results */}
      {mode === 'decode' && decodeResult && (
        <div className="p-4 bg-muted/30 rounded-md space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Decoded Value</h4>
            {(decodeResult.isNaN || decodeResult.isInfinity || decodeResult.isZero) && (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded">
                {decodeResult.isNaN ? 'NaN' : decodeResult.isInfinity ? 'Infinity' : 'Zero'}
              </span>
            )}
          </div>

          <div className="text-3xl font-mono text-center py-4">
            {decodeResult.isNaN ? 'NaN' :
             decodeResult.isInfinity ? (decodeResult.sign ? '-Infinity' : 'Infinity') :
             decodeResult.value.toString()}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-background rounded">
              <span className="text-muted-foreground">Sign: </span>
              <span className="font-mono">{decodeResult.sign} ({decodeResult.sign === 0 ? '+' : '-'})</span>
            </div>
            <div className="p-2 bg-background rounded">
              <span className="text-muted-foreground">Exponent: </span>
              <span className="font-mono">{decodeResult.exponent}</span>
            </div>
            <div className="p-2 bg-background rounded">
              <span className="text-muted-foreground">Mantissa: </span>
              <span className="font-mono">{decodeResult.mantissa}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Binary (32-bit)</span>
            <div className="p-2 bg-background rounded font-mono text-xs break-all">
              <span className="text-red-500">{decodeResult.binary[0]}</span>
              <span className="text-blue-500">{decodeResult.binary.slice(1, 9)}</span>
              <span className="text-green-500">{decodeResult.binary.slice(9)}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-red-500">Sign (1)</span>
              <span className="text-blue-500">Exponent (8)</span>
              <span className="text-green-500">Mantissa (23)</span>
            </div>
          </div>
        </div>
      )}

      {/* Encode Results */}
      {mode === 'encode' && encodeResult && (
        <div className="p-4 bg-muted/30 rounded-md space-y-4">
          <h4 className="font-medium text-sm">Encoded Bytes</h4>

          <div className="flex gap-2">
            {encodeResult.bytes.map((byte, i) => (
              <span
                key={i}
                className="px-3 py-2 bg-primary/20 text-primary rounded font-mono text-lg"
              >
                {byte.toString(16).toUpperCase().padStart(2, '0')}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded">
            <div>
              <span className="text-muted-foreground text-sm">Hex: </span>
              <span className="font-mono">{encodeResult.hex}</span>
            </div>
            <button
              onClick={() => copyToClipboard(encodeResult.hex)}
              className="p-1 rounded hover:bg-muted"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Binary</span>
            <div className="p-2 bg-background rounded font-mono text-xs break-all">
              {formatBinary(encodeResult.binary)}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        <p>IEEE 754 is the standard for floating-point arithmetic used in most computing systems.</p>
      </div>
    </div>
  )
}
