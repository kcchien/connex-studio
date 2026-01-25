/**
 * CrcCalculator - CRC-16 Modbus and LRC Calculator UI
 *
 * Features:
 * - Hex input with validation
 * - CRC-16/Modbus calculation
 * - LRC (Longitudinal Redundancy Check) calculation
 * - Copy results to clipboard
 * - Display in multiple formats (decimal, hex, swapped)
 */

import React, { useState, useCallback } from 'react'
import { Calculator, Copy, Check, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { calculatorApi } from '@renderer/lib/ipc'

// =============================================================================
// Types
// =============================================================================

interface CrcResult {
  crc: number
  hex: string
  hexSwapped: string
  bytes: number[]
}

interface LrcResult {
  lrc: number
  hex: string
}

interface CrcCalculatorProps {
  className?: string
}

// =============================================================================
// CrcCalculator Component
// =============================================================================

export function CrcCalculator({ className }: CrcCalculatorProps): React.ReactElement {
  const [hexInput, setHexInput] = useState('')
  const [crcResult, setCrcResult] = useState<CrcResult | null>(null)
  const [lrcResult, setLrcResult] = useState<LrcResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setHexInput(value)
    setError(null)
    setCrcResult(null)
    setLrcResult(null)
  }, [])

  const calculateCrc = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter hex data')
      return
    }

    try {
      const result = await calculatorApi.crc16Modbus(hexInput)
      setCrcResult(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
      setCrcResult(null)
    }
  }, [hexInput])

  const calculateLrc = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter hex data')
      return
    }

    try {
      const result = await calculatorApi.lrc(hexInput)
      setLrcResult(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
      setLrcResult(null)
    }
  }, [hexInput])

  const calculateBoth = useCallback(async () => {
    await Promise.all([calculateCrc(), calculateLrc()])
  }, [calculateCrc, calculateLrc])

  const copyToClipboard = useCallback(async (value: string, field: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">CRC / LRC Calculator</h3>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">
          Hex Data (e.g., "01 03 00 00 00 0A" or "0103000A")
        </label>
        <textarea
          value={hexInput}
          onChange={handleInputChange}
          placeholder="Enter hex bytes..."
          className="w-full h-24 p-3 font-mono text-sm bg-muted/50 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Calculate Buttons */}
      <div className="flex gap-2">
        <button
          onClick={calculateBoth}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
        >
          Calculate Both
        </button>
        <button
          onClick={calculateCrc}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm"
        >
          CRC-16 Only
        </button>
        <button
          onClick={calculateLrc}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm"
        >
          LRC Only
        </button>
      </div>

      {/* CRC Results */}
      {crcResult && (
        <div className="p-4 bg-muted/30 rounded-md space-y-3">
          <h4 className="font-medium text-sm">CRC-16/Modbus Result</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ResultRow
              label="Decimal"
              value={crcResult.crc.toString()}
              onCopy={() => copyToClipboard(crcResult.crc.toString(), 'crc-dec')}
              copied={copiedField === 'crc-dec'}
            />
            <ResultRow
              label="Hex (Big-Endian)"
              value={`0x${crcResult.hex}`}
              onCopy={() => copyToClipboard(crcResult.hex, 'crc-hex')}
              copied={copiedField === 'crc-hex'}
            />
            <ResultRow
              label="Hex (Little-Endian)"
              value={`0x${crcResult.hexSwapped}`}
              onCopy={() => copyToClipboard(crcResult.hexSwapped, 'crc-hex-swap')}
              copied={copiedField === 'crc-hex-swap'}
            />
            <ResultRow
              label="Bytes [Lo, Hi]"
              value={`[${crcResult.bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}]`}
              onCopy={() => copyToClipboard(crcResult.bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '), 'crc-bytes')}
              copied={copiedField === 'crc-bytes'}
            />
          </div>
        </div>
      )}

      {/* LRC Results */}
      {lrcResult && (
        <div className="p-4 bg-muted/30 rounded-md space-y-3">
          <h4 className="font-medium text-sm">LRC Result</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ResultRow
              label="Decimal"
              value={lrcResult.lrc.toString()}
              onCopy={() => copyToClipboard(lrcResult.lrc.toString(), 'lrc-dec')}
              copied={copiedField === 'lrc-dec'}
            />
            <ResultRow
              label="Hex"
              value={`0x${lrcResult.hex}`}
              onCopy={() => copyToClipboard(lrcResult.hex, 'lrc-hex')}
              copied={copiedField === 'lrc-hex'}
            />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>CRC-16/Modbus:</strong> Used in Modbus RTU frames. Polynomial 0xA001 (reflected 0x8005).</p>
        <p><strong>LRC:</strong> Used in Modbus ASCII. Two's complement of sum of bytes.</p>
      </div>
    </div>
  )
}

// =============================================================================
// ResultRow Component
// =============================================================================

interface ResultRowProps {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
}

function ResultRow({ label, value, onCopy, copied }: ResultRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between p-2 bg-background rounded">
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-mono">{value}</span>
      </div>
      <button
        onClick={onCopy}
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
  )
}
