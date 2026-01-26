import React, { useState, useMemo } from 'react'
import { cn } from '@renderer/lib/utils'
import { Search, Loader2, Plus, AlertCircle } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag, ModbusAddress } from '@shared/types/tag'
import { ModbusAddressInput } from './ModbusAddressInput'
import {
  parseTraditionalAddress,
  calculateRangeCount,
  isSameRegisterType,
  type ParsedModbusAddress
} from '@shared/utils/modbusAddress'

export interface ScanTabProps {
  connectionId: string
  protocol: Protocol
  isConnected?: boolean
  onPreviewChange: (tags: Partial<Tag>[]) => void
}

type ScanMode = 'live-scan' | 'range-create'

/**
 * ScanTab - Scan address range for active registers or create tags from range
 */
export function ScanTab({
  connectionId,
  protocol,
  isConnected = false,
  onPreviewChange,
}: ScanTabProps): React.ReactElement {
  // Address inputs using traditional addressing (e.g., 40001)
  const [startAddressStr, setStartAddressStr] = useState('')
  const [endAddressStr, setEndAddressStr] = useState('')
  const [startParsed, setStartParsed] = useState<ParsedModbusAddress | null>(null)
  const [endParsed, setEndParsed] = useState<ParsedModbusAddress | null>(null)

  // Mode selection
  const [scanMode, setScanMode] = useState<ScanMode>('range-create')

  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResult, setScanResult] = useState<{ found: number; scanned: number } | null>(null)

  // Validation
  const validation = useMemo(() => {
    if (!startParsed && startAddressStr) {
      return { valid: false, error: 'Invalid start address' }
    }
    if (!endParsed && endAddressStr) {
      return { valid: false, error: 'Invalid end address' }
    }
    if (!startParsed || !endParsed) {
      return { valid: false, error: 'Both addresses are required' }
    }
    if (!isSameRegisterType(startParsed, endParsed)) {
      return { valid: false, error: 'Start and End must be the same register type' }
    }
    if (startParsed.address > endParsed.address) {
      return { valid: false, error: 'Start address must be less than or equal to End address' }
    }
    return { valid: true }
  }, [startParsed, endParsed, startAddressStr, endAddressStr])

  // Calculate tag count
  const tagCount = useMemo(() => {
    if (!startParsed || !endParsed || !validation.valid) return 0
    return calculateRangeCount(startParsed, endParsed)
  }, [startParsed, endParsed, validation.valid])

  // Handle start address change
  const handleStartChange = (value: string, parsed: ParsedModbusAddress | null) => {
    setStartAddressStr(value)
    setStartParsed(parsed)
    setScanResult(null)
  }

  // Handle end address change
  const handleEndChange = (value: string, parsed: ParsedModbusAddress | null) => {
    setEndAddressStr(value)
    setEndParsed(parsed)
    setScanResult(null)
  }

  // Create tags from range (Range Create mode)
  const handleRangeCreate = () => {
    if (!startParsed || !endParsed || !validation.valid) return

    const tags: Partial<Tag>[] = []
    for (let i = startParsed.address; i <= endParsed.address; i++) {
      tags.push({
        connectionId,
        name: `${startParsed.registerType}_${i}`,
        address: {
          type: 'modbus',
          registerType: startParsed.registerType,
          address: i,
          length: 1,
        } as ModbusAddress,
        dataType: 'int16',
        displayFormat: { decimals: 0, unit: '' },
        thresholds: {},
        enabled: true,
      })
    }

    setScanResult({ found: tags.length, scanned: tags.length })
    onPreviewChange(tags)
  }

  // Live scan for active registers
  const handleLiveScan = async () => {
    if (!startParsed || !endParsed || !validation.valid || !isConnected) return

    setIsScanning(true)
    setScanResult(null)
    setScanProgress(0)

    try {
      const foundTags: Partial<Tag>[] = []
      const total = endParsed.address - startParsed.address + 1

      // Scan each address
      for (let i = startParsed.address; i <= endParsed.address; i++) {
        const progress = ((i - startParsed.address + 1) / total) * 100
        setScanProgress(progress)

        try {
          // Attempt to read the address
          const result = await window.electronAPI.connection.readOnce({
            connectionId,
            address: {
              type: 'modbus',
              registerType: startParsed.registerType,
              address: i,
              length: 1,
            } as ModbusAddress,
          })

          // If read succeeds, add to found tags
          if (result.success) {
            foundTags.push({
              connectionId,
              name: `${startParsed.registerType}_${i}`,
              address: {
                type: 'modbus',
                registerType: startParsed.registerType,
                address: i,
                length: 1,
              } as ModbusAddress,
              dataType: 'int16',
              displayFormat: { decimals: 0, unit: '' },
              thresholds: {},
              enabled: true,
            })
          }
        } catch {
          // Address doesn't respond - skip it
        }
      }

      setScanResult({ found: foundTags.length, scanned: total })
      onPreviewChange(foundTags)
    } finally {
      setIsScanning(false)
      setScanProgress(0)
    }
  }

  const handleAction = () => {
    if (scanMode === 'live-scan') {
      handleLiveScan()
    } else {
      handleRangeCreate()
    }
  }

  const isModbus = protocol === 'modbus-tcp'
  const canScan = validation.valid && (scanMode === 'range-create' || isConnected)

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScanMode('range-create')}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium',
              'border transition-colors',
              scanMode === 'range-create'
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Range Create
            </div>
            <p className="text-xs mt-1 opacity-70">Create tags without connection</p>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('live-scan')}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium',
              'border transition-colors',
              scanMode === 'live-scan'
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              Live Scan
            </div>
            <p className="text-xs mt-1 opacity-70">Scan for active registers</p>
          </button>
        </div>
      </div>

      {/* Connection Required Warning for Live Scan */}
      {scanMode === 'live-scan' && !isConnected && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Connection required for live scanning. Please connect first.
          </p>
        </div>
      )}

      {/* Address Range (Traditional Addressing) */}
      {isModbus && (
        <div className="grid grid-cols-2 gap-4">
          <ModbusAddressInput
            value={startAddressStr}
            onChange={handleStartChange}
            label="Start Address"
            id="start-address"
            placeholder="e.g., 40001"
          />
          <ModbusAddressInput
            value={endAddressStr}
            onChange={handleEndChange}
            label="End Address"
            id="end-address"
            placeholder="e.g., 40100"
          />
        </div>
      )}

      {/* Range Validation Error */}
      {!validation.valid && startAddressStr && endAddressStr && startParsed && endParsed && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-600 dark:text-red-400">{validation.error}</p>
        </div>
      )}

      {/* Tag Count Preview */}
      {validation.valid && tagCount > 0 && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Will create <strong>{tagCount}</strong> tags ({startParsed?.registerType} registers)
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleAction}
        disabled={!canScan || isScanning || tagCount === 0}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
          'bg-blue-500 hover:bg-blue-600',
          'text-white font-medium',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        {isScanning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Scanning... {Math.round(scanProgress)}%
          </>
        ) : scanMode === 'live-scan' ? (
          <>
            <Search className="w-5 h-5" />
            Scan {tagCount > 0 ? `(${tagCount} addresses)` : ''}
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Create {tagCount > 0 ? `${tagCount} Tags` : ''}
          </>
        )}
      </button>

      {/* Scan Result */}
      {scanResult && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <p className="text-sm text-green-600 dark:text-green-400">
            {scanMode === 'live-scan'
              ? `Found ${scanResult.found} active registers out of ${scanResult.scanned} scanned`
              : `Created ${scanResult.found} tags`}
          </p>
        </div>
      )}
    </div>
  )
}
