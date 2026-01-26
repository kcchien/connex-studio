/**
 * ModbusAddressInput - Input component for traditional Modbus addresses
 *
 * Provides real-time validation and feedback for Modbus traditional addresses
 * (e.g., 40001 for holding register 0).
 */

import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@renderer/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'
import {
  validateModbusAddress,
  getAddressDescription,
  type ParsedModbusAddress
} from '@shared/utils/modbusAddress'

export interface ModbusAddressInputProps {
  /** Current value */
  value: string
  /** Called when value changes */
  onChange: (value: string, parsed: ParsedModbusAddress | null) => void
  /** External error message to display */
  error?: string
  /** Input placeholder */
  placeholder?: string
  /** Disable input */
  disabled?: boolean
  /** Additional class name */
  className?: string
  /** Label for the input */
  label?: string
  /** ID for the input element */
  id?: string
}

export function ModbusAddressInput({
  value,
  onChange,
  error: externalError,
  placeholder = 'e.g., 40001',
  disabled = false,
  className,
  label,
  id
}: ModbusAddressInputProps): React.ReactElement {
  const [internalError, setInternalError] = useState<string | undefined>()
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'empty'>('empty')
  const [description, setDescription] = useState<string>('')

  // Validate input and update status
  const validateInput = useCallback((inputValue: string) => {
    if (!inputValue || inputValue.trim() === '') {
      setValidationStatus('empty')
      setInternalError(undefined)
      setDescription('')
      return null
    }

    const result = validateModbusAddress(inputValue)

    if (result.valid && result.parsed) {
      setValidationStatus('valid')
      setInternalError(undefined)
      setDescription(getAddressDescription(result.parsed))
      return result.parsed
    } else {
      setValidationStatus('invalid')
      setInternalError(result.error)
      setDescription('')
      return null
    }
  }, [])

  // Validate on value change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateInput(value)
    }, 150) // Small debounce

    return () => clearTimeout(timeoutId)
  }, [value, validateInput])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Only allow digits
    const filtered = newValue.replace(/[^0-9]/g, '')
    const parsed = validateInput(filtered)
    onChange(filtered, parsed)
  }

  const displayError = externalError || internalError
  const hasError = validationStatus === 'invalid' || !!externalError

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 pr-10',
            'rounded-md border bg-background',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            hasError
              ? 'border-red-500 focus:ring-red-500/50'
              : validationStatus === 'valid'
                ? 'border-green-500 focus:ring-green-500/50'
                : 'border-input focus:ring-ring'
          )}
          aria-invalid={hasError}
          aria-describedby={displayError ? `${id}-error` : description ? `${id}-description` : undefined}
          data-testid="modbus-address-input"
        />

        {/* Status icon */}
        {validationStatus !== 'empty' && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {validationStatus === 'valid' ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Feedback message */}
      {displayError && (
        <p
          id={id ? `${id}-error` : undefined}
          className="text-xs text-red-500"
          data-testid="modbus-address-error"
        >
          {displayError}
        </p>
      )}

      {validationStatus === 'valid' && description && !displayError && (
        <p
          id={id ? `${id}-description` : undefined}
          className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1"
          data-testid="modbus-address-description"
        >
          <CheckCircle2 className="w-3 h-3" />
          {description}
        </p>
      )}
    </div>
  )
}

export default ModbusAddressInput
