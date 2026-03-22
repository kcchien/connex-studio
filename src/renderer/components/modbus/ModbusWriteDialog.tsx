/**
 * ModbusWriteDialog - Confirmation dialog for writing to Modbus registers.
 *
 * Features:
 * - Shows tag name, address (registerType:address), data type, byte order
 * - Value input adapts to data type (toggle for boolean, number for integers, etc.)
 * - FC15 multi-coil: checkbox array when registerType='coil' AND length > 1
 * - Current vs new value comparison
 * - Optional "skip confirmation" checkbox
 * - Exported useModbusWriteConfirm hook for managing dialog state
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  X,
  Check,
  Pencil
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { ModbusAddress, DataType } from '@shared/types/tag'
import { DATA_TYPE_INFO } from '@shared/types/tag'

// =============================================================================
// Types
// =============================================================================

interface ModbusWriteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: number | boolean | string | boolean[], skipFutureConfirmation: boolean) => void
  tagName: string
  address: ModbusAddress
  dataType: DataType
  currentValue: unknown
  className?: string
}

// Value range limits per data type
const DATA_TYPE_RANGE: Record<string, { min: number; max: number; step: number }> = {
  int16: { min: -32768, max: 32767, step: 1 },
  uint16: { min: 0, max: 65535, step: 1 },
  int32: { min: -2147483648, max: 2147483647, step: 1 },
  uint32: { min: 0, max: 4294967295, step: 1 },
  float32: { min: -3.4e38, max: 3.4e38, step: 0.01 },
  float64: { min: -1.7e308, max: 1.7e308, step: 0.01 }
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF'
  if (Array.isArray(value)) return value.map((v) => (v ? '1' : '0')).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatAddress(address: ModbusAddress): string {
  return `${address.registerType}:${address.address}`
}

function isMultiCoil(address: ModbusAddress): boolean {
  return address.registerType === 'coil' && address.length > 1
}

// =============================================================================
// Value Input Sub-Components
// =============================================================================

/** Toggle for single boolean/coil values */
const BooleanInput = memo(function BooleanInput({
  value,
  onChange
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-l-md border',
          !value
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        )}
      >
        OFF
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-r-md border',
          value
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        )}
      >
        ON
      </button>
    </div>
  )
})

/** Checkbox array for FC15 multi-coil writes */
const MultiCoilInput = memo(function MultiCoilInput({
  values,
  onChange,
  length
}: {
  values: boolean[]
  onChange: (v: boolean[]) => void
  length: number
}) {
  const handleToggle = useCallback(
    (index: number) => {
      const next = [...values]
      next[index] = !next[index]
      onChange(next)
    },
    [values, onChange]
  )

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">
        Coils {0} - {length - 1} ({length} bits)
      </span>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length }, (_, i) => (
          <label
            key={i}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded border text-xs font-mono cursor-pointer transition-colors',
              values[i]
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={values[i] ?? false}
              onChange={() => handleToggle(i)}
            />
            {i}
          </label>
        ))}
      </div>
    </div>
  )
})

/** Number input with min/max/step based on data type */
const NumberInput = memo(function NumberInput({
  value,
  onChange,
  dataType
}: {
  value: number
  onChange: (v: number) => void
  dataType: DataType
}) {
  const range = DATA_TYPE_RANGE[dataType]
  const isFloat = dataType === 'float32' || dataType === 'float64'

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const parsed = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
        if (!isNaN(parsed)) onChange(parsed)
      }}
      min={range?.min}
      max={range?.max}
      step={range?.step ?? 1}
      className={cn(
        'w-full px-3 py-2 text-sm font-mono rounded-md border border-border',
        'bg-background text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    />
  )
})

/** Text input for string data type */
const StringInput = memo(function StringInput({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full px-3 py-2 text-sm font-mono rounded-md border border-border',
        'bg-background text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring'
      )}
      placeholder="Enter string value"
    />
  )
})

// React.memo shorthand
function memo<P extends object>(
  Component: React.FC<P>
): React.NamedExoticComponent<P> {
  return React.memo(Component)
}

// =============================================================================
// ModbusWriteDialog Component
// =============================================================================

export function ModbusWriteDialog({
  isOpen,
  onClose,
  onConfirm,
  tagName,
  address,
  dataType,
  currentValue,
  className
}: ModbusWriteDialogProps): React.ReactElement | null {
  const [skipConfirmation, setSkipConfirmation] = useState(false)

  // Determine initial value based on data type
  const initialValue = useMemo(() => {
    if (isMultiCoil(address)) {
      // Multi-coil: array of booleans
      const current = Array.isArray(currentValue)
        ? currentValue.map(Boolean)
        : []
      // Pad to address.length
      return Array.from({ length: address.length }, (_, i) => current[i] ?? false)
    }
    if (dataType === 'boolean' || address.registerType === 'coil') {
      return Boolean(currentValue)
    }
    if (dataType === 'string') {
      return currentValue != null ? String(currentValue) : ''
    }
    // Numeric types
    return typeof currentValue === 'number' ? currentValue : 0
  }, [currentValue, dataType, address])

  const [newValue, setNewValue] = useState<number | boolean | string | boolean[]>(initialValue)

  // Reset value when dialog opens with new data
  React.useEffect(() => {
    if (isOpen) {
      setNewValue(initialValue)
      setSkipConfirmation(false)
    }
  }, [isOpen, initialValue])

  const handleConfirm = useCallback(() => {
    onConfirm(newValue, skipConfirmation)
  }, [onConfirm, newValue, skipConfirmation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter') {
        // Only submit on Enter for non-multi-coil inputs
        if (!isMultiCoil(address)) {
          handleConfirm()
        }
      }
    },
    [onClose, handleConfirm, address]
  )

  if (!isOpen) return null

  // Check if new value differs from current
  const valueChanged = formatValue(newValue) !== formatValue(currentValue)

  // Show byte order info for multi-register types
  const showByteOrder =
    DATA_TYPE_INFO[dataType].registers > 1 && address.byteOrder

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'bg-background rounded-lg shadow-lg w-full max-w-md p-6',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modbus-write-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Pencil className="h-6 w-6 text-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <h2 id="modbus-write-title" className="text-lg font-semibold">
              Write Modbus Value
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Write a new value to the selected register.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tag Information */}
        <div className="space-y-3 mb-4">
          <div className="bg-muted/50 rounded-md p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tag</span>
              <span className="font-medium truncate max-w-[200px]" title={tagName}>
                {tagName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Address</span>
              <span className="font-mono text-xs">
                {formatAddress(address)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data Type</span>
              <span className="font-medium">{DATA_TYPE_INFO[dataType].label}</span>
            </div>
            {showByteOrder && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Byte Order</span>
                <span className="font-mono text-xs">{address.byteOrder}</span>
              </div>
            )}
          </div>

          {/* Current Value */}
          <div>
            <span className="text-sm text-muted-foreground">Current Value</span>
            <div className="mt-1 p-2 bg-muted/30 rounded text-sm font-mono">
              {formatValue(currentValue)}
            </div>
          </div>

          {/* New Value Input */}
          <div>
            <span className="text-sm text-muted-foreground">New Value</span>
            <div className="mt-1">
              {isMultiCoil(address) ? (
                <MultiCoilInput
                  values={newValue as boolean[]}
                  onChange={setNewValue as (v: boolean[]) => void}
                  length={address.length}
                />
              ) : dataType === 'boolean' || address.registerType === 'coil' ? (
                <BooleanInput
                  value={newValue as boolean}
                  onChange={setNewValue as (v: boolean) => void}
                />
              ) : dataType === 'string' ? (
                <StringInput
                  value={newValue as string}
                  onChange={setNewValue as (v: string) => void}
                />
              ) : (
                <NumberInput
                  value={newValue as number}
                  onChange={setNewValue as (v: number) => void}
                  dataType={dataType}
                />
              )}
            </div>
          </div>

          {/* Value changed indicator */}
          {valueChanged && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Value will be changed</span>
            </div>
          )}
        </div>

        {/* Skip Confirmation Checkbox */}
        <label className="flex items-center gap-2 mb-4 text-sm">
          <input
            type="checkbox"
            checked={skipConfirmation}
            onChange={(e) => setSkipConfirmation(e.target.checked)}
            className="rounded border-muted-foreground"
          />
          <span className="text-muted-foreground">
            Don&apos;t ask again for this session
          </span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              'px-4 py-2 text-sm rounded-md flex items-center gap-2',
              'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <Check className="h-4 w-4" />
            Write Value
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Hook for managing Modbus write confirmation state
// =============================================================================

interface ModbusWriteConfirmState {
  isOpen: boolean
  tagName: string
  address: ModbusAddress
  dataType: DataType
  currentValue: unknown
  onConfirm: ((value: number | boolean | string | boolean[]) => void) | null
}

const initialWriteState: ModbusWriteConfirmState = {
  isOpen: false,
  tagName: '',
  address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
  dataType: 'uint16',
  currentValue: null,
  onConfirm: null
}

interface UseModbusWriteConfirmOptions {
  skipConfirmationForNonCritical?: boolean
}

export function useModbusWriteConfirm(options: UseModbusWriteConfirmOptions = {}) {
  const [state, setState] = useState<ModbusWriteConfirmState>(initialWriteState)
  const [skipNonCritical, setSkipNonCritical] = useState(
    options.skipConfirmationForNonCritical ?? false
  )

  const requestWrite = useCallback(
    (
      params: {
        tagName: string
        address: ModbusAddress
        dataType: DataType
        currentValue: unknown
      },
      onConfirmed: (value: number | boolean | string | boolean[]) => void
    ) => {
      // Skip dialog if user previously opted out
      if (skipNonCritical) {
        // Use current value as default since we skip the dialog
        onConfirmed(params.currentValue as number | boolean | string | boolean[])
        return
      }

      setState({
        isOpen: true,
        tagName: params.tagName,
        address: params.address,
        dataType: params.dataType,
        currentValue: params.currentValue,
        onConfirm: onConfirmed
      })
    },
    [skipNonCritical]
  )

  const handleClose = useCallback(() => {
    setState(initialWriteState)
  }, [])

  const handleConfirm = useCallback(
    (value: number | boolean | string | boolean[], skipFuture: boolean) => {
      if (skipFuture) {
        setSkipNonCritical(true)
      }
      state.onConfirm?.(value)
      setState(initialWriteState)
    },
    [state.onConfirm]
  )

  return {
    state,
    requestWrite,
    handleClose,
    handleConfirm,
    skipNonCritical,
    setSkipNonCritical
  }
}
