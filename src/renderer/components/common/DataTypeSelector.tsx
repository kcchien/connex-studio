/**
 * DataTypeSelector - Unified data type selector for Modbus tags
 *
 * Follows Modbus protocol standard:
 * - Coils/Discrete Inputs (1-bit): Only boolean
 * - Holding/Input Registers (16-bit): int16, uint16, int32, uint32, float32, float64, string
 */

import React from 'react'
import { cn } from '@renderer/lib/utils'
import type { DataType, ModbusAddress } from '@shared/types/tag'
import { DATA_TYPE_INFO } from '@shared/types/tag'

export interface DataTypeSelectorProps {
  value: DataType
  onChange: (value: DataType) => void
  /** Optional: Filter data types based on register type */
  registerType?: ModbusAddress['registerType']
  /** Optional: Custom label */
  label?: string
  /** Optional: Show register count in options */
  showRegisterCount?: boolean
  /** Optional: Disable the selector */
  disabled?: boolean
  /** Optional: Custom id for the select element */
  id?: string
  /** Optional: Custom className for the select element */
  className?: string
  /** Optional: Size variant */
  size?: 'sm' | 'md'
}

// Data types available for each register type per Modbus protocol
const REGISTER_DATA_TYPES: Record<ModbusAddress['registerType'], DataType[]> = {
  // Coils are 1-bit, only boolean makes sense
  coil: ['boolean'],
  // Discrete inputs are read-only 1-bit
  discrete: ['boolean'],
  // Holding registers are 16-bit, support all numeric types
  holding: ['int16', 'uint16', 'int32', 'uint32', 'float32', 'float64', 'string'],
  // Input registers are read-only 16-bit
  input: ['int16', 'uint16', 'int32', 'uint32', 'float32', 'float64', 'string'],
}

// All data types for when no register type filtering is needed
const ALL_DATA_TYPES: DataType[] = [
  'int16',
  'uint16',
  'int32',
  'uint32',
  'float32',
  'float64',
  'boolean',
  'string',
]

/**
 * Get available data types based on register type
 */
export function getDataTypesForRegister(registerType?: ModbusAddress['registerType']): DataType[] {
  if (!registerType) return ALL_DATA_TYPES
  return REGISTER_DATA_TYPES[registerType]
}

/**
 * Get the number of Modbus registers required for a data type
 */
export function getRegisterCount(dataType: DataType): number {
  return DATA_TYPE_INFO[dataType]?.registers ?? 1
}

/**
 * Get default decimal places for a data type
 */
export function getDefaultDecimals(dataType: DataType): number {
  switch (dataType) {
    case 'float32':
    case 'float64':
      return 2
    default:
      return 0
  }
}

/**
 * DataTypeSelector component
 */
export function DataTypeSelector({
  value,
  onChange,
  registerType,
  label = 'Data Type',
  showRegisterCount = false,
  disabled = false,
  id = 'data-type-selector',
  className,
  size = 'md',
}: DataTypeSelectorProps): React.ReactElement {
  const availableTypes = getDataTypesForRegister(registerType)

  // If current value is not in available types, auto-select first available
  React.useEffect(() => {
    if (!availableTypes.includes(value) && availableTypes.length > 0) {
      onChange(availableTypes[0])
    }
  }, [availableTypes, value, onChange])

  const sizeClasses = size === 'sm'
    ? 'h-8 px-2.5 text-sm'
    : 'px-4 py-2.5'

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as DataType)}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg',
          'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'text-gray-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses,
          className
        )}
      >
        {availableTypes.map((type) => {
          const info = DATA_TYPE_INFO[type]
          const label = showRegisterCount && info.registers > 1
            ? `${info.label}`
            : info.label.split(' ')[0] // Just the type name without parenthetical
          return (
            <option key={type} value={type}>
              {label}
            </option>
          )
        })}
      </select>
    </div>
  )
}

export default DataTypeSelector
