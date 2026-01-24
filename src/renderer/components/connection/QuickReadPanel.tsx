import React, { useState, useCallback, type FormEvent } from 'react'
import { Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@renderer/lib/utils'
import { useConnection } from '@renderer/hooks/useConnection'
import { useConnectionStore, selectSelectedConnection } from '@renderer/stores/connectionStore'
import type { ModbusAddress, DataType } from '@shared/types/tag'

interface QuickReadPanelProps {
  /** Optional additional className */
  className?: string
}

interface ReadResult {
  value: number | boolean | string
  quality: string
  timestamp: number
}

/**
 * Available data types for Modbus read operations.
 */
const DATA_TYPES: { value: DataType; label: string; registers: number }[] = [
  { value: 'uint16', label: 'UINT16', registers: 1 },
  { value: 'int16', label: 'INT16', registers: 1 },
  { value: 'uint32', label: 'UINT32', registers: 2 },
  { value: 'int32', label: 'INT32', registers: 2 },
  { value: 'float32', label: 'FLOAT32', registers: 2 },
  { value: 'boolean', label: 'BOOLEAN', registers: 1 }
]

/**
 * Parse a Modbus address string into a ModbusAddress object.
 * Supports:
 * - Modicon format: 40001 (holding), 30001 (input), 00001 (coil), 10001 (discrete)
 * - IEC format: HR100, IR100, C100, DI100
 *
 * @param addressStr - The address string to parse
 * @param length - Number of registers to read (default: 1)
 * @returns ModbusAddress object
 * @throws Error if address format is invalid
 */
function parseModbusAddress(addressStr: string, length: number = 1): ModbusAddress {
  const trimmed = addressStr.trim().toUpperCase()

  // IEC format: HR100, IR100, C100, DI100
  const iecMatch = trimmed.match(/^(HR|IR|C|DI)(\d+)$/)
  if (iecMatch) {
    const [, prefix, addrStr] = iecMatch
    const address = parseInt(addrStr, 10)

    if (isNaN(address) || address < 0) {
      throw new Error('Invalid address number')
    }

    const registerTypeMap: Record<string, ModbusAddress['registerType']> = {
      HR: 'holding',
      IR: 'input',
      C: 'coil',
      DI: 'discrete'
    }

    return {
      type: 'modbus',
      registerType: registerTypeMap[prefix],
      address,
      length
    }
  }

  // Modicon format: 5-6 digit numbers
  // 00001-09999: Coils
  // 10001-19999: Discrete Inputs
  // 30001-39999: Input Registers
  // 40001-49999: Holding Registers
  // Also support 400001-465535 for extended holding registers
  const numericMatch = trimmed.match(/^(\d{5,6})$/)
  if (numericMatch) {
    const fullAddr = parseInt(numericMatch[1], 10)

    let registerType: ModbusAddress['registerType']
    let address: number

    if (fullAddr >= 400001 && fullAddr <= 465535) {
      // Extended holding register format (6 digits)
      registerType = 'holding'
      address = fullAddr - 400001
    } else if (fullAddr >= 40001 && fullAddr <= 49999) {
      registerType = 'holding'
      address = fullAddr - 40001
    } else if (fullAddr >= 30001 && fullAddr <= 39999) {
      registerType = 'input'
      address = fullAddr - 30001
    } else if (fullAddr >= 10001 && fullAddr <= 19999) {
      registerType = 'discrete'
      address = fullAddr - 10001
    } else if (fullAddr >= 1 && fullAddr <= 9999) {
      registerType = 'coil'
      address = fullAddr - 1
    } else {
      throw new Error('Address out of valid range')
    }

    return {
      type: 'modbus',
      registerType,
      address,
      length
    }
  }

  throw new Error('Invalid address format. Use Modicon (40001) or IEC (HR0) format.')
}

/**
 * Get the quality indicator color based on quality string.
 */
function getQualityColor(quality: string): string {
  switch (quality.toLowerCase()) {
    case 'good':
      return 'text-green-500'
    case 'uncertain':
      return 'text-yellow-500'
    case 'bad':
    default:
      return 'text-red-500'
  }
}

/**
 * Format the read value for display.
 */
function formatReadValue(value: number | boolean | string, dataType: DataType): string {
  if (typeof value === 'boolean') {
    return value ? 'TRUE (1)' : 'FALSE (0)'
  }
  if (typeof value === 'number') {
    if (dataType === 'float32') {
      return value.toFixed(4)
    }
    return value.toString()
  }
  return String(value)
}

/**
 * QuickReadPanel component for performing single read operations on the selected connection.
 * Displays address input, data type selection, and read results with quality indicators.
 */
export function QuickReadPanel({ className }: QuickReadPanelProps): React.ReactElement {
  const [address, setAddress] = useState('')
  const [dataType, setDataType] = useState<DataType>('uint16')
  const [result, setResult] = useState<ReadResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const selectedConnection = useConnectionStore(selectSelectedConnection)
  const { readOnce, isLoading, error, clearError } = useConnection()

  const isConnected = selectedConnection?.status === 'connected'
  const canRead = isConnected && address.trim() !== ''

  const handleAddressChange = useCallback(
    (value: string) => {
      setAddress(value)
      // Clear errors when user types
      if (parseError) {
        setParseError(null)
      }
      if (error) {
        clearError()
      }
    },
    [parseError, error, clearError]
  )

  const handleDataTypeChange = useCallback(
    (value: DataType) => {
      setDataType(value)
      // Clear errors when user changes data type
      if (error) {
        clearError()
      }
    },
    [error, clearError]
  )

  const handleRead = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!selectedConnection || !canRead) {
        return
      }

      // Clear previous errors and results
      setParseError(null)
      setResult(null)

      // Get register length based on data type
      const dataTypeConfig = DATA_TYPES.find((dt) => dt.value === dataType)
      const length = dataTypeConfig?.registers ?? 1

      // Parse the address
      let modbusAddress: ModbusAddress
      try {
        modbusAddress = parseModbusAddress(address, length)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Invalid address format')
        return
      }

      // Perform the read
      const readResult = await readOnce(selectedConnection.id, modbusAddress, dataType)

      if (readResult) {
        setResult({
          value: readResult.value,
          quality: readResult.quality,
          timestamp: Date.now()
        })
      }
    },
    [selectedConnection, canRead, address, dataType, readOnce]
  )

  // Render message when no connection is selected
  if (!selectedConnection) {
    return (
      <div className={cn('border rounded-lg bg-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>No connection selected</span>
        </div>
      </div>
    )
  }

  // Render message when connection is not connected
  if (!isConnected) {
    return (
      <div className={cn('border rounded-lg bg-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Connection not connected</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Connect to &quot;{selectedConnection.name}&quot; to perform read operations.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Quick Read</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Read a single value from {selectedConnection.name}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleRead} className="p-3 space-y-3">
        {/* Address Input */}
        <div className="space-y-1.5">
          <Label.Root htmlFor="read-address" className="text-xs font-medium text-muted-foreground">
            Address
          </Label.Root>
          <input
            id="read-address"
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="40001 or HR0"
            disabled={isLoading}
            className={cn(
              'w-full h-8 px-2.5 text-sm rounded-md font-mono',
              'bg-background border border-input',
              'placeholder:text-muted-foreground/60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              parseError && 'border-destructive'
            )}
          />
          {parseError && <p className="text-xs text-destructive">{parseError}</p>}
        </div>

        {/* Data Type Select */}
        <div className="space-y-1.5">
          <Label.Root htmlFor="read-data-type" className="text-xs font-medium text-muted-foreground">
            Data Type
          </Label.Root>
          <select
            id="read-data-type"
            value={dataType}
            onChange={(e) => handleDataTypeChange(e.target.value as DataType)}
            disabled={isLoading}
            className={cn(
              'w-full h-8 px-2.5 text-sm rounded-md',
              'bg-background border border-input',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {DATA_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Read Button */}
        <button
          type="submit"
          disabled={isLoading || !canRead}
          className={cn(
            'w-full h-8 px-3 text-sm font-medium rounded-md',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reading...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Read</span>
            </>
          )}
        </button>

        {/* API Error */}
        {error && (
          <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Display */}
        {result && !error && (
          <div className="p-3 bg-muted/50 rounded-md space-y-2">
            {/* Value */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Value</span>
              <span className="text-lg font-mono font-medium text-foreground">
                {formatReadValue(result.value, dataType)}
              </span>
            </div>

            {/* Quality */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Quality</span>
              <div className={cn('flex items-center gap-1.5', getQualityColor(result.quality))}>
                {result.quality.toLowerCase() === 'good' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-medium uppercase">{result.quality}</span>
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Read at</span>
              <span className="text-xs text-muted-foreground">
                {new Date(result.timestamp).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
