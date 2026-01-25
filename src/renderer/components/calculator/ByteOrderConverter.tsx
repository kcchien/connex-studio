/**
 * ByteOrderConverter - Byte and Word Order Conversion UI
 *
 * Features:
 * - Swap bytes within 16-bit words
 * - Swap words within 32-bit values
 * - Convert between byte orders (Big/Little/Mid-Big/Mid-Little)
 * - Visual byte representation
 */

import React, { useState, useCallback } from 'react'
import { ArrowRightLeft, Copy, Check, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { calculatorApi } from '@renderer/lib/ipc'

// =============================================================================
// Types
// =============================================================================

type ByteOrder = 'big-endian' | 'little-endian' | 'mid-big' | 'mid-little'

interface ByteSwapResult {
  original: number[]
  swapped: number[]
  originalHex: string
  swappedHex: string
}

interface ByteOrderConverterProps {
  className?: string
}

const BYTE_ORDERS: { value: ByteOrder; label: string; description: string }[] = [
  { value: 'big-endian', label: 'Big-Endian (ABCD)', description: 'MSB first' },
  { value: 'little-endian', label: 'Little-Endian (DCBA)', description: 'LSB first' },
  { value: 'mid-big', label: 'Mid-Big (CDAB)', description: 'Word swap' },
  { value: 'mid-little', label: 'Mid-Little (BADC)', description: 'Byte swap' }
]

// =============================================================================
// ByteOrderConverter Component
// =============================================================================

export function ByteOrderConverter({ className }: ByteOrderConverterProps): React.ReactElement {
  const [hexInput, setHexInput] = useState('')
  const [fromOrder, setFromOrder] = useState<ByteOrder>('big-endian')
  const [toOrder, setToOrder] = useState<ByteOrder>('little-endian')
  const [result, setResult] = useState<ByteSwapResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(e.target.value)
    setError(null)
    setResult(null)
  }, [])

  const convert = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter hex data')
      return
    }

    try {
      const convertResult = await calculatorApi.convertByteOrder({
        data: hexInput,
        from: fromOrder,
        to: toOrder
      })
      setResult(convertResult)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setResult(null)
    }
  }, [hexInput, fromOrder, toOrder])

  const swapBytes = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter hex data')
      return
    }

    try {
      const swapResult = await calculatorApi.swapBytes(hexInput)
      setResult(swapResult)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed')
      setResult(null)
    }
  }, [hexInput])

  const swapWords = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter hex data')
      return
    }

    try {
      const swapResult = await calculatorApi.swapWords(hexInput)
      setResult(swapResult)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed')
      setResult(null)
    }
  }, [hexInput])

  const copyToClipboard = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const swapOrders = useCallback(() => {
    const temp = fromOrder
    setFromOrder(toOrder)
    setToOrder(temp)
  }, [fromOrder, toOrder])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Byte Order Converter</h3>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">
          Hex Data (e.g., "41 42 43 44" or "ABCD1234")
        </label>
        <input
          type="text"
          value={hexInput}
          onChange={handleInputChange}
          placeholder="Enter hex bytes..."
          className="w-full p-3 font-mono text-sm bg-muted/50 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Byte Order Selection */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">From</label>
          <select
            value={fromOrder}
            onChange={(e) => setFromOrder(e.target.value as ByteOrder)}
            className="w-full p-2 bg-muted/50 rounded-md border text-sm"
          >
            {BYTE_ORDERS.map(order => (
              <option key={order.value} value={order.value}>
                {order.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={swapOrders}
          className="p-2 rounded-md hover:bg-muted"
          title="Swap orders"
        >
          <ArrowRightLeft className="h-5 w-5" />
        </button>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">To</label>
          <select
            value={toOrder}
            onChange={(e) => setToOrder(e.target.value as ByteOrder)}
            className="w-full p-2 bg-muted/50 rounded-md border text-sm"
          >
            {BYTE_ORDERS.map(order => (
              <option key={order.value} value={order.value}>
                {order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={convert}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
        >
          Convert
        </button>
        <button
          onClick={swapBytes}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm"
        >
          Swap Bytes
        </button>
        <button
          onClick={swapWords}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm"
        >
          Swap Words
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 bg-muted/30 rounded-md space-y-4">
          <h4 className="font-medium text-sm">Result</h4>

          {/* Visual Representation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Original</span>
              <div className="flex gap-1 flex-wrap">
                {result.original.map((byte, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-mono text-sm"
                  >
                    {byte.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Converted</span>
              <div className="flex gap-1 flex-wrap">
                {result.swapped.map((byte, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-300 rounded font-mono text-sm"
                  >
                    {byte.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Hex Output */}
          <div className="flex items-center justify-between p-3 bg-background rounded">
            <div>
              <span className="text-muted-foreground text-sm">Result: </span>
              <span className="font-mono">{result.swappedHex}</span>
            </div>
            <button
              onClick={() => copyToClipboard(result.swappedHex)}
              className="p-1 rounded hover:bg-muted"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Big-Endian (ABCD):</strong> Most significant byte first. Network byte order.</p>
        <p><strong>Little-Endian (DCBA):</strong> Least significant byte first. x86/x64.</p>
        <p><strong>Mid-Big (CDAB):</strong> Word-swapped big-endian. Some PLCs.</p>
        <p><strong>Mid-Little (BADC):</strong> Byte-swapped little-endian.</p>
      </div>
    </div>
  )
}
