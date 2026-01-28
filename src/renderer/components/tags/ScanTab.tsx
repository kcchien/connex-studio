import React, { useState, useMemo, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'
import { ListChecks } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag, ModbusAddress, DataType } from '@shared/types/tag'
import type { ByteOrder } from '@shared/types'
import { ModbusAddressInput } from './ModbusAddressInput'
import { TagByteOrderSelector } from './TagByteOrderSelector'
import { DataTypeSelector, getRegisterCount, getDefaultDecimals } from '@renderer/components/common'
import {
  isSameRegisterType,
  calculateTagCountInRange,
  generateTagAddressesInRange,
  toTraditionalAddress,
  type ParsedModbusAddress
} from '@shared/utils/modbusAddress'

export interface ScanTabProps {
  connectionId: string
  protocol: Protocol
  /** @deprecated No longer used - kept for API compatibility */
  isConnected?: boolean
  onPreviewChange: (tags: Partial<Tag>[]) => void
}

/**
 * ScanTab - Create tags from address range
 *
 * Generates tags for all addresses in the specified range.
 * No connection required - useful when you know the PLC configuration.
 */
export function ScanTab({
  connectionId,
  protocol,
  onPreviewChange,
}: ScanTabProps): React.ReactElement {
  // Address inputs using traditional addressing (e.g., 40001)
  const [startAddressStr, setStartAddressStr] = useState('')
  const [endAddressStr, setEndAddressStr] = useState('')
  const [startParsed, setStartParsed] = useState<ParsedModbusAddress | null>(null)
  const [endParsed, setEndParsed] = useState<ParsedModbusAddress | null>(null)

  // Data type selection
  const [dataType, setDataType] = useState<DataType>('int16')

  // Byte order override (for 32-bit types)
  const [byteOrder, setByteOrder] = useState<ByteOrder | undefined>(undefined)

  // Unit ID (Modbus slave address)
  const [unitId, setUnitId] = useState<number | undefined>(undefined)

  // Get register length for the selected data type
  const registerLength = useMemo(() => getRegisterCount(dataType), [dataType])

  // Validation (auto-swap is handled in calculation, just check basics)
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
    // Auto-swap is handled in calculateTagCountInRange, no error needed
    return { valid: true }
  }, [startParsed, endParsed, startAddressStr, endAddressStr])

  // Calculate tag count using SSOT function
  const tagCount = useMemo(() => {
    if (!startParsed || !endParsed || !validation.valid) return 0
    return calculateTagCountInRange(startParsed, endParsed, registerLength)
  }, [startParsed, endParsed, validation.valid, registerLength])

  // Generate tag addresses using SSOT function
  const tagAddresses = useMemo(() => {
    if (!startParsed || !endParsed || !validation.valid) return []
    return generateTagAddressesInRange(startParsed, endParsed, registerLength)
  }, [startParsed, endParsed, validation.valid, registerLength])

  // Handle start address change
  const handleStartChange = (value: string, parsed: ParsedModbusAddress | null) => {
    setStartAddressStr(value)
    setStartParsed(parsed)
  }

  // Handle end address change
  const handleEndChange = (value: string, parsed: ParsedModbusAddress | null) => {
    setEndAddressStr(value)
    setEndParsed(parsed)
  }

  // Auto-generate preview using SSOT address generation
  useEffect(() => {
    if (!startParsed || !endParsed || !validation.valid || tagAddresses.length === 0) {
      onPreviewChange([])
      return
    }

    const tags: Partial<Tag>[] = tagAddresses.map((addr) => ({
      connectionId,
      name: `${startParsed.registerType}_${toTraditionalAddress(startParsed.registerType, addr)}`,
      address: {
        type: 'modbus',
        registerType: startParsed.registerType,
        address: addr,
        length: registerLength,
        ...(byteOrder && { byteOrder }),
        ...(unitId !== undefined && { unitId }),
      } as ModbusAddress,
      dataType,
      displayFormat: { decimals: getDefaultDecimals(dataType), unit: '' },
      thresholds: {},
      enabled: true,
    }))

    onPreviewChange(tags)
  }, [startParsed, endParsed, validation.valid, tagAddresses, registerLength, dataType, byteOrder, unitId, connectionId, onPreviewChange])

  const isModbus = protocol === 'modbus-tcp'

  return (
    <div className="space-y-6">
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

      {/* Data Type Selector */}
      {isModbus && (
        <DataTypeSelector
          value={dataType}
          onChange={setDataType}
          registerType={startParsed?.registerType}
          label="Data Type"
          id="scan-data-type"
        />
      )}

      {/* Advanced Options: Byte Order & Unit ID */}
      {isModbus && (
        <div className="grid grid-cols-2 gap-4">
          {/* Byte Order - only for 32-bit types */}
          {(dataType === 'int32' || dataType === 'uint32' || dataType === 'float32' || dataType === 'float64') && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Byte Order
              </label>
              <TagByteOrderSelector
                value={byteOrder}
                onChange={setByteOrder}
              />
            </div>
          )}

          {/* Unit ID Override */}
          <div className="space-y-2">
            <label htmlFor="scan-unit-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Unit ID (optional)
            </label>
            <input
              id="scan-unit-id"
              type="number"
              min={1}
              max={247}
              value={unitId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setUnitId(undefined)
                } else {
                  const num = Number(val)
                  if (num >= 1 && num <= 247) {
                    setUnitId(num)
                  }
                }
              }}
              placeholder="Connection default"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg',
                'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              )}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Override Modbus slave address (1-247)
            </p>
          </div>
        </div>
      )}

      {/* Range Validation Error */}
      {!validation.valid && startAddressStr && endAddressStr && startParsed && endParsed && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-600 dark:text-red-400">{validation.error}</p>
        </div>
      )}

      {/* Preview Table */}
      <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <ListChecks className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {tagCount} tags
            </span>
          </div>
          {validation.valid && tagCount > 0 && startParsed ? (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700/80 backdrop-blur-sm">
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <th className="px-4 py-2 font-medium w-10">#</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium text-right">Address</th>
                    <th className="px-4 py-2 font-medium text-right">Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                  {tagAddresses.map((addr, i) => {
                    const tradAddr = toTraditionalAddress(startParsed.registerType, addr)
                    const endAddr = toTraditionalAddress(startParsed.registerType, addr + registerLength - 1)
                    return (
                      <tr
                        key={i}
                        className={cn(
                          'text-gray-700 dark:text-gray-300',
                          i % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/30' : 'bg-transparent'
                        )}
                      >
                        <td className="px-4 py-1.5 text-gray-400 dark:text-gray-500 tabular-nums">{i + 1}</td>
                        <td className="px-4 py-1.5 font-mono text-xs">{startParsed.registerType}_{tradAddr}</td>
                        <td className="px-4 py-1.5 text-right font-mono text-xs tabular-nums">{tradAddr}</td>
                        <td className="px-4 py-1.5 text-right font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400">
                          {registerLength > 1 ? `${tradAddr}–${endAddr}` : tradAddr}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
              Enter valid start and end addresses to see preview
            </p>
          )}
      </div>
    </div>
  )
}
