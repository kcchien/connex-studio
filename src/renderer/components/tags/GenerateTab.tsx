import React, { useState, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'
import { Wand2 } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag, ModbusAddress, DataType } from '@shared/types/tag'
import type { ByteOrder } from '@shared/types'
import { DataTypeSelector, getRegisterCount, getDefaultDecimals } from '@renderer/components/common'
import { TagByteOrderSelector } from './TagByteOrderSelector'

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
  const [startAddress, setStartAddress] = useState(0)
  const [dataType, setDataType] = useState<DataType>('int16')
  const [byteOrder, setByteOrder] = useState<ByteOrder | undefined>(undefined)
  const [unitId, setUnitId] = useState<number | undefined>(undefined)

  // Auto-generate preview when settings change
  useEffect(() => {
    const tags: Partial<Tag>[] = []
    const registerLength = getRegisterCount(dataType)

    for (let i = 0; i < quantity; i++) {
      const index = startIndex + i
      const name = namingPattern.replace('{n}', String(index).padStart(2, '0'))

      tags.push({
        connectionId,
        name,
        address: {
          type: 'modbus',
          registerType: 'holding',
          address: startAddress + i,
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
  }, [namingPattern, quantity, startIndex, startAddress, dataType, byteOrder, unitId, connectionId, onPreviewChange])

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
        <div className="space-y-2">
          <label htmlFor="gen-start-address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Base Address
          </label>
          <input
            id="gen-start-address"
            type="number"
            min={0}
            value={startAddress}
            onChange={(e) => setStartAddress(Number(e.target.value))}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
        <DataTypeSelector
          value={dataType}
          onChange={setDataType}
          registerType="holding"
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
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>{namingPattern.replace('{n}', String(startIndex).padStart(2, '0'))} → Address {startAddress}</p>
          <p>{namingPattern.replace('{n}', String(startIndex + 1).padStart(2, '0'))} → Address {startAddress + 1}</p>
          <p className="text-gray-400 dark:text-gray-600">...</p>
          <p>{namingPattern.replace('{n}', String(startIndex + quantity - 1).padStart(2, '0'))} → Address {startAddress + quantity - 1}</p>
        </div>
      </div>
    </div>
  )
}
