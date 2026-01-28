import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '@renderer/lib/utils'
import { Wand2 } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag, ModbusAddress, DataType } from '@shared/types/tag'
import type { ByteOrder } from '@shared/types'
import { DataTypeSelector, getRegisterCount, getDefaultDecimals } from '@renderer/components/common'
import { TagByteOrderSelector } from './TagByteOrderSelector'
import { ModbusAddressInput } from './ModbusAddressInput'
import type { ParsedModbusAddress } from '@shared/utils/modbusAddress'
import { toTraditionalAddress } from '@shared/utils/modbusAddress'

export interface GenerateTabProps {
  connectionId: string
  protocol: Protocol
  onPreviewChange: (tags: Partial<Tag>[]) => void
}

/**
 * GenerateTab - Generate tags with naming pattern
 */
export function GenerateTab({
  connectionId,
  protocol,
  onPreviewChange,
}: GenerateTabProps): React.ReactElement {
  const [namingPattern, setNamingPattern] = useState('Tag_{n}')
  const [quantity, setQuantity] = useState(10)
  const [startIndex, setStartIndex] = useState(1)
  const [baseAddressInput, setBaseAddressInput] = useState('40001')
  const [parsedBaseAddress, setParsedBaseAddress] = useState<ParsedModbusAddress | null>({
    registerType: 'holding',
    address: 0,
    traditional: 40001
  })
  const [dataType, setDataType] = useState<DataType>('int16')
  const [byteOrder, setByteOrder] = useState<ByteOrder | undefined>(undefined)
  const [unitId, setUnitId] = useState<number | undefined>(undefined)

  // Memoize register length for use in preview and tag generation
  const registerLength = useMemo(() => getRegisterCount(dataType), [dataType])

  // Auto-generate preview when settings change
  useEffect(() => {
    // Only generate tags if we have a valid parsed address
    if (!parsedBaseAddress) {
      onPreviewChange([])
      return
    }

    const tags: Partial<Tag>[] = []
    const baseProtocolAddress = parsedBaseAddress.address // 0-based protocol address

    for (let i = 0; i < quantity; i++) {
      const index = startIndex + i
      const name = namingPattern.replace('{n}', String(index).padStart(2, '0'))

      tags.push({
        connectionId,
        name,
        address: {
          type: 'modbus',
          registerType: parsedBaseAddress.registerType,
          address: baseProtocolAddress + (i * registerLength),
          length: registerLength,
          ...(byteOrder && { byteOrder }),
          ...(unitId !== undefined && { unitId }),
        } as ModbusAddress,
        dataType,
        displayFormat: { decimals: getDefaultDecimals(dataType), unit: '' },
        thresholds: {},
        enabled: true,
      })
    }

    onPreviewChange(tags)
  }, [namingPattern, quantity, startIndex, parsedBaseAddress, dataType, byteOrder, unitId, connectionId, onPreviewChange, registerLength])

  return (
    <div className="space-y-6">
      {/* Naming Pattern */}
      <div className="space-y-2">
        <label htmlFor="naming-pattern" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Naming Pattern
        </label>
        <input
          id="naming-pattern"
          type="text"
          value={namingPattern}
          onChange={(e) => setNamingPattern(e.target.value)}
          placeholder="Tag_{n}"
          className={cn(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          )}
        />
        <p className="text-xs text-gray-500">
          Use {'{n}'} for sequential number. Example: "Sensor_{'{n}'}" → Sensor_01, Sensor_02...
        </p>
      </div>

      {/* Quantity & Start Index */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(100, Math.max(1, Number(e.target.value))))}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="start-index" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Index
          </label>
          <input
            id="start-index"
            type="number"
            min={0}
            value={startIndex}
            onChange={(e) => setStartIndex(Number(e.target.value))}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Address & Data Type */}
      <div className="grid grid-cols-2 gap-4">
        <ModbusAddressInput
          value={baseAddressInput}
          onChange={(value, parsed) => {
            setBaseAddressInput(value)
            setParsedBaseAddress(parsed)
          }}
          label="Base Address"
          id="gen-start-address"
          placeholder="e.g., 40001"
        />
        <DataTypeSelector
          value={dataType}
          onChange={setDataType}
          registerType={parsedBaseAddress?.registerType ?? 'holding'}
          id="gen-data-type"
        />
      </div>

      {/* Byte Order & Unit ID */}
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
          <label htmlFor="gen-unit-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Unit ID (optional)
          </label>
          <input
            id="gen-unit-id"
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

      {/* Preview */}
      <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Wand2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {quantity} tags
          </span>
        </div>
        {parsedBaseAddress ? (
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
                {Array.from({ length: quantity }, (_, i) => {
                  const index = startIndex + i
                  const name = namingPattern.replace('{n}', String(index).padStart(2, '0'))
                  const protocolAddr = parsedBaseAddress.address + (i * registerLength)
                  const tradAddr = toTraditionalAddress(parsedBaseAddress.registerType, protocolAddr)
                  const endAddr = toTraditionalAddress(parsedBaseAddress.registerType, protocolAddr + registerLength - 1)
                  return (
                    <tr
                      key={i}
                      className={cn(
                        'text-gray-700 dark:text-gray-300',
                        i % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/30' : 'bg-transparent'
                      )}
                    >
                      <td className="px-4 py-1.5 text-gray-400 dark:text-gray-500 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-1.5 font-mono text-xs">{name}</td>
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
            Enter a valid base address to see preview
          </p>
        )}
      </div>
    </div>
  )
}
