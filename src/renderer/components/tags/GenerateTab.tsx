import React, { useState, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'
import { Wand2 } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag, ModbusAddress, DataType } from '@shared/types/tag'

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

  // Auto-generate preview when settings change
  useEffect(() => {
    const tags: Partial<Tag>[] = []

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
          length: getDataTypeLength(dataType),
        } as ModbusAddress,
        dataType,
        displayFormat: { decimals: getDefaultDecimals(dataType), unit: '' },
        thresholds: {},
        enabled: true,
      })
    }

    onPreviewChange(tags)
  }, [namingPattern, quantity, startIndex, startAddress, dataType, connectionId])

  return (
    <div className="space-y-6">
      {/* Naming Pattern */}
      <div className="space-y-2">
        <label htmlFor="naming-pattern" className="text-sm font-medium text-gray-300">
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
            'bg-gray-800 border border-gray-700',
            'text-white placeholder-gray-500',
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
          <label htmlFor="quantity" className="text-sm font-medium text-gray-300">
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
              'bg-gray-800 border border-gray-700',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="start-index" className="text-sm font-medium text-gray-300">
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
              'bg-gray-800 border border-gray-700',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Address & Data Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="gen-start-address" className="text-sm font-medium text-gray-300">
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
              'bg-gray-800 border border-gray-700',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="data-type" className="text-sm font-medium text-gray-300">
            Data Type
          </label>
          <select
            id="data-type"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as DataType)}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-gray-800 border border-gray-700',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          >
            <option value="int16">Int16</option>
            <option value="uint16">UInt16</option>
            <option value="int32">Int32</option>
            <option value="uint32">UInt32</option>
            <option value="float32">Float32</option>
            <option value="boolean">Boolean</option>
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">Preview</span>
        </div>
        <div className="text-sm text-gray-400 space-y-1">
          <p>{namingPattern.replace('{n}', String(startIndex).padStart(2, '0'))} → Address {startAddress}</p>
          <p>{namingPattern.replace('{n}', String(startIndex + 1).padStart(2, '0'))} → Address {startAddress + 1}</p>
          <p className="text-gray-600">...</p>
          <p>{namingPattern.replace('{n}', String(startIndex + quantity - 1).padStart(2, '0'))} → Address {startAddress + quantity - 1}</p>
        </div>
      </div>
    </div>
  )
}

function getDataTypeLength(dataType: DataType): number {
  switch (dataType) {
    case 'int32':
    case 'uint32':
    case 'float32':
      return 2
    default:
      return 1
  }
}

function getDefaultDecimals(dataType: DataType): number {
  switch (dataType) {
    case 'float32':
      return 2
    default:
      return 0
  }
}
