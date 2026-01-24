/**
 * PacketAnalyzer - Modbus RTU/TCP Packet Analysis UI
 *
 * Features:
 * - Auto-detect Modbus RTU or TCP protocol
 * - Parse and display packet structure
 * - Validate CRC for RTU packets
 * - Show function code interpretation
 * - Highlight packet fields with colors
 */

import React, { useState, useCallback } from 'react'
import { Search, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { calculatorApi } from '@renderer/lib/ipc'

// =============================================================================
// Types
// =============================================================================

interface ModbusRtuAnalysis {
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

interface ModbusTcpAnalysis {
  transactionId: number
  protocolId: number
  length: number
  unitId: number
  functionCode: number
  functionName: string
  data: number[]
}

interface PacketAnalysis {
  protocol: 'modbus-rtu' | 'modbus-tcp' | 'unknown'
  valid: boolean
  details: ModbusRtuAnalysis | ModbusTcpAnalysis | null
  errors: string[]
  warnings: string[]
}

interface PacketAnalyzerProps {
  className?: string
}

// =============================================================================
// PacketAnalyzer Component
// =============================================================================

export function PacketAnalyzer({ className }: PacketAnalyzerProps): React.ReactElement {
  const [hexInput, setHexInput] = useState('')
  const [result, setResult] = useState<PacketAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async () => {
    if (!hexInput.trim()) {
      setError('Please enter packet data')
      return
    }

    try {
      const analysis = await calculatorApi.analyzePacket(hexInput)
      setResult(analysis)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setResult(null)
    }
  }, [hexInput])

  const loadExample = useCallback((type: 'rtu' | 'tcp') => {
    if (type === 'rtu') {
      // Read Holding Registers: Slave 1, FC3, Addr 0, Count 10
      setHexInput('01 03 00 00 00 0A C5 CD')
    } else {
      // Modbus TCP: Transaction 1, Read Holding Registers
      setHexInput('00 01 00 00 00 06 01 03 00 00 00 0A')
    }
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Packet Analyzer</h3>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">
            Packet Data (Hex)
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => loadExample('rtu')}
              className="text-xs text-primary hover:underline"
            >
              Load RTU Example
            </button>
            <button
              onClick={() => loadExample('tcp')}
              className="text-xs text-primary hover:underline"
            >
              Load TCP Example
            </button>
          </div>
        </div>
        <textarea
          value={hexInput}
          onChange={(e) => { setHexInput(e.target.value); setError(null); }}
          placeholder="Enter Modbus RTU or TCP packet..."
          className="w-full h-20 p-3 font-mono text-sm bg-muted/50 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={analyze}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
      >
        Analyze Packet
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Protocol Detection */}
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-md">
            {result.valid ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <div className="font-medium">
                {result.protocol === 'modbus-rtu' && 'Modbus RTU'}
                {result.protocol === 'modbus-tcp' && 'Modbus TCP'}
                {result.protocol === 'unknown' && 'Unknown Protocol'}
              </div>
              <div className="text-sm text-muted-foreground">
                {result.valid ? 'Valid packet' : 'Invalid or corrupted packet'}
              </div>
            </div>
          </div>

          {/* Errors & Warnings */}
          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((warn, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {warn}
                </div>
              ))}
            </div>
          )}

          {/* RTU Details */}
          {result.protocol === 'modbus-rtu' && result.details && (
            <RtuDetails details={result.details as ModbusRtuAnalysis} />
          )}

          {/* TCP Details */}
          {result.protocol === 'modbus-tcp' && result.details && (
            <TcpDetails details={result.details as ModbusTcpAnalysis} />
          )}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Modbus RTU:</strong> [Slave ID] [Function Code] [Data...] [CRC Lo] [CRC Hi]</p>
        <p><strong>Modbus TCP:</strong> [Transaction ID] [Protocol ID] [Length] [Unit ID] [FC] [Data...]</p>
      </div>
    </div>
  )
}

// =============================================================================
// RTU Details Component
// =============================================================================

interface RtuDetailsProps {
  details: ModbusRtuAnalysis
}

function RtuDetails({ details }: RtuDetailsProps): React.ReactElement {
  return (
    <div className="p-4 bg-muted/30 rounded-md space-y-4">
      <h4 className="font-medium text-sm">Modbus RTU Frame</h4>

      {/* Visual Frame */}
      <div className="flex flex-wrap gap-1 font-mono text-sm">
        <ByteBox value={details.slaveId} label="Slave ID" color="blue" />
        <ByteBox value={details.functionCode} label="FC" color="purple" />
        {details.data.map((byte, i) => (
          <ByteBox key={i} value={byte} label={`Data[${i}]`} color="gray" />
        ))}
        <ByteBox
          value={details.crc.received & 0xff}
          label="CRC Lo"
          color={details.crc.valid ? 'green' : 'red'}
        />
        <ByteBox
          value={(details.crc.received >> 8) & 0xff}
          label="CRC Hi"
          color={details.crc.valid ? 'green' : 'red'}
        />
      </div>

      {/* Details Table */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">Slave ID: </span>
          <span className="font-mono">{details.slaveId}</span>
        </div>
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">Function: </span>
          <span className="font-mono">{details.functionCode} - {details.functionName}</span>
        </div>
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">CRC Received: </span>
          <span className="font-mono">0x{details.crc.received.toString(16).toUpperCase().padStart(4, '0')}</span>
        </div>
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">CRC Calculated: </span>
          <span className={cn('font-mono', details.crc.valid ? 'text-green-500' : 'text-red-500')}>
            0x{details.crc.calculated.toString(16).toUpperCase().padStart(4, '0')}
            {details.crc.valid ? ' (OK)' : ' (MISMATCH)'}
          </span>
        </div>
      </div>

      {/* Data Bytes */}
      {details.data.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Data ({details.data.length} bytes)</span>
          <div className="p-2 bg-background rounded font-mono text-sm break-all">
            {details.data.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// TCP Details Component
// =============================================================================

interface TcpDetailsProps {
  details: ModbusTcpAnalysis
}

function TcpDetails({ details }: TcpDetailsProps): React.ReactElement {
  return (
    <div className="p-4 bg-muted/30 rounded-md space-y-4">
      <h4 className="font-medium text-sm">Modbus TCP Frame</h4>

      {/* Visual Frame */}
      <div className="flex flex-wrap gap-1 font-mono text-sm">
        <ByteBox value={(details.transactionId >> 8) & 0xff} label="Trans Hi" color="blue" />
        <ByteBox value={details.transactionId & 0xff} label="Trans Lo" color="blue" />
        <ByteBox value={(details.protocolId >> 8) & 0xff} label="Proto Hi" color="cyan" />
        <ByteBox value={details.protocolId & 0xff} label="Proto Lo" color="cyan" />
        <ByteBox value={(details.length >> 8) & 0xff} label="Len Hi" color="teal" />
        <ByteBox value={details.length & 0xff} label="Len Lo" color="teal" />
        <ByteBox value={details.unitId} label="Unit ID" color="purple" />
        <ByteBox value={details.functionCode} label="FC" color="purple" />
        {details.data.map((byte, i) => (
          <ByteBox key={i} value={byte} label={`Data[${i}]`} color="gray" />
        ))}
      </div>

      {/* Details Table */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">Transaction ID: </span>
          <span className="font-mono">{details.transactionId}</span>
        </div>
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">Protocol ID: </span>
          <span className="font-mono">{details.protocolId}</span>
        </div>
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">Length: </span>
          <span className="font-mono">{details.length}</span>
        </div>
        <div className="p-2 bg-background rounded">
          <span className="text-muted-foreground">Unit ID: </span>
          <span className="font-mono">{details.unitId}</span>
        </div>
        <div className="p-2 bg-background rounded col-span-2">
          <span className="text-muted-foreground">Function: </span>
          <span className="font-mono">{details.functionCode} - {details.functionName}</span>
        </div>
      </div>

      {/* Data Bytes */}
      {details.data.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">PDU Data ({details.data.length} bytes)</span>
          <div className="p-2 bg-background rounded font-mono text-sm break-all">
            {details.data.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// ByteBox Component
// =============================================================================

interface ByteBoxProps {
  value: number
  label: string
  color: 'blue' | 'purple' | 'green' | 'red' | 'gray' | 'cyan' | 'teal'
}

const colorMap = {
  blue: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  green: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  red: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  gray: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  teal: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30'
}

function ByteBox({ value, label, color }: ByteBoxProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-2 py-1 rounded border',
        colorMap[color]
      )}
      title={label}
    >
      <span className="text-[10px] opacity-60">{label}</span>
      <span>{value.toString(16).toUpperCase().padStart(2, '0')}</span>
    </div>
  )
}
