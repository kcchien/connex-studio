/**
 * TagEditor Component
 *
 * Form for creating and editing tags with address, data type, and display configuration.
 * Supports Modbus TCP address configuration with register type, address, and length.
 */

import React, { useState, useCallback, useEffect, type FormEvent } from 'react'
import { ChevronDown, ChevronRight, Plus, Loader2, Save, X } from 'lucide-react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@renderer/lib/utils'
import { useTagStore } from '@renderer/stores/tagStore'
import type { Tag, ModbusAddress, DataType, DisplayFormat, Thresholds } from '@shared/types/tag'
import { DEFAULT_DISPLAY_FORMAT, DEFAULT_THRESHOLDS, DEFAULT_MODBUS_ADDRESS } from '@shared/types/tag'

interface TagEditorProps {
  /** Connection ID this tag belongs to */
  connectionId: string
  /** Optional existing tag for editing mode */
  tag?: Tag
  /** Callback when tag is saved successfully */
  onSaved?: (tag: Tag) => void
  /** Callback when editor is closed/cancelled */
  onCancel?: () => void
  /** Optional additional className */
  className?: string
}

interface FormState {
  name: string
  registerType: ModbusAddress['registerType']
  address: string
  length: string
  dataType: DataType
  decimals: string
  unit: string
  warningLow: string
  warningHigh: string
  alarmLow: string
  alarmHigh: string
  enabled: boolean
}

interface ValidationErrors {
  name?: string
  address?: string
  length?: string
  decimals?: string
  warningLow?: string
  warningHigh?: string
  alarmLow?: string
  alarmHigh?: string
}

const REGISTER_TYPES: { value: ModbusAddress['registerType']; label: string }[] = [
  { value: 'holding', label: 'Holding Register (4x)' },
  { value: 'input', label: 'Input Register (3x)' },
  { value: 'coil', label: 'Coil (0x)' },
  { value: 'discrete', label: 'Discrete Input (1x)' }
]

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: 'int16', label: 'Int16' },
  { value: 'uint16', label: 'UInt16' },
  { value: 'int32', label: 'Int32' },
  { value: 'uint32', label: 'UInt32' },
  { value: 'float32', label: 'Float32' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'string', label: 'String' }
]

function getInitialFormState(tag?: Tag): FormState {
  if (tag && tag.address.type === 'modbus') {
    const modbusAddress = tag.address as ModbusAddress
    return {
      name: tag.name,
      registerType: modbusAddress.registerType,
      address: String(modbusAddress.address),
      length: String(modbusAddress.length),
      dataType: tag.dataType,
      decimals: String(tag.displayFormat.decimals),
      unit: tag.displayFormat.unit,
      warningLow: tag.thresholds.warningLow !== undefined ? String(tag.thresholds.warningLow) : '',
      warningHigh: tag.thresholds.warningHigh !== undefined ? String(tag.thresholds.warningHigh) : '',
      alarmLow: tag.thresholds.alarmLow !== undefined ? String(tag.thresholds.alarmLow) : '',
      alarmHigh: tag.thresholds.alarmHigh !== undefined ? String(tag.thresholds.alarmHigh) : '',
      enabled: tag.enabled
    }
  }

  return {
    name: '',
    registerType: DEFAULT_MODBUS_ADDRESS.registerType,
    address: String(DEFAULT_MODBUS_ADDRESS.address),
    length: String(DEFAULT_MODBUS_ADDRESS.length),
    dataType: 'uint16',
    decimals: String(DEFAULT_DISPLAY_FORMAT.decimals),
    unit: DEFAULT_DISPLAY_FORMAT.unit,
    warningLow: '',
    warningHigh: '',
    alarmLow: '',
    alarmHigh: '',
    enabled: true
  }
}

/**
 * TagEditor component for creating and editing tags.
 * Handles Modbus TCP address configuration with validation.
 */
export function TagEditor({
  connectionId,
  tag,
  onSaved,
  onCancel,
  className
}: TagEditorProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(!!tag) // Expanded if editing
  const [formState, setFormState] = useState<FormState>(() => getInitialFormState(tag))
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addTag = useTagStore((state) => state.addTag)
  const updateTag = useTagStore((state) => state.updateTag)

  // Reset form when tag prop changes
  useEffect(() => {
    setFormState(getInitialFormState(tag))
    setValidationErrors({})
    setError(null)
  }, [tag])

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      if (validationErrors[field as keyof ValidationErrors]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      if (error) {
        setError(null)
      }
    },
    [validationErrors, error]
  )

  const validate = useCallback((): boolean => {
    const errors: ValidationErrors = {}

    // Name validation
    if (!formState.name.trim()) {
      errors.name = 'Tag name is required'
    } else if (formState.name.length > 100) {
      errors.name = 'Tag name must be 100 characters or less'
    }

    // Address validation
    const address = parseInt(formState.address, 10)
    if (isNaN(address) || address < 0 || address > 65535) {
      errors.address = 'Address must be between 0 and 65535'
    }

    // Length validation
    const length = parseInt(formState.length, 10)
    const maxLength = formState.registerType === 'coil' || formState.registerType === 'discrete' ? 2000 : 125
    if (isNaN(length) || length < 1 || length > maxLength) {
      errors.length = `Length must be between 1 and ${maxLength}`
    }

    // Decimals validation
    const decimals = parseInt(formState.decimals, 10)
    if (isNaN(decimals) || decimals < 0 || decimals > 10) {
      errors.decimals = 'Decimals must be between 0 and 10'
    }

    // Threshold validations (optional, but must be valid numbers if provided)
    if (formState.warningLow && isNaN(parseFloat(formState.warningLow))) {
      errors.warningLow = 'Must be a valid number'
    }
    if (formState.warningHigh && isNaN(parseFloat(formState.warningHigh))) {
      errors.warningHigh = 'Must be a valid number'
    }
    if (formState.alarmLow && isNaN(parseFloat(formState.alarmLow))) {
      errors.alarmLow = 'Must be a valid number'
    }
    if (formState.alarmHigh && isNaN(parseFloat(formState.alarmHigh))) {
      errors.alarmHigh = 'Must be a valid number'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formState])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!validate()) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const modbusAddress: ModbusAddress = {
          type: 'modbus',
          registerType: formState.registerType,
          address: parseInt(formState.address, 10),
          length: parseInt(formState.length, 10)
        }

        const displayFormat: DisplayFormat = {
          decimals: parseInt(formState.decimals, 10),
          unit: formState.unit
        }

        const thresholds: Thresholds = {}
        if (formState.warningLow) thresholds.warningLow = parseFloat(formState.warningLow)
        if (formState.warningHigh) thresholds.warningHigh = parseFloat(formState.warningHigh)
        if (formState.alarmLow) thresholds.alarmLow = parseFloat(formState.alarmLow)
        if (formState.alarmHigh) thresholds.alarmHigh = parseFloat(formState.alarmHigh)

        if (tag) {
          // Update existing tag
          const result = await window.electronAPI.tag.update({
            tagId: tag.id,
            updates: {
              name: formState.name.trim(),
              address: modbusAddress,
              dataType: formState.dataType,
              displayFormat,
              thresholds,
              enabled: formState.enabled
            }
          })

          if (!result.success) {
            setError(result.error || 'Failed to update tag')
            return
          }

          updateTag(tag.id, result.tag!)
          onSaved?.(result.tag!)
        } else {
          // Create new tag
          const result = await window.electronAPI.tag.create({
            connectionId,
            name: formState.name.trim(),
            address: modbusAddress,
            dataType: formState.dataType
          })

          if (!result.success) {
            setError(result.error || 'Failed to create tag')
            return
          }

          // Update with display format and thresholds
          const updateResult = await window.electronAPI.tag.update({
            tagId: result.tag!.id,
            updates: {
              displayFormat,
              thresholds,
              enabled: formState.enabled
            }
          })

          const finalTag = updateResult.success ? updateResult.tag! : result.tag!
          addTag(connectionId, finalTag)
          onSaved?.(finalTag)

          // Reset form
          setFormState(getInitialFormState())
          setIsExpanded(false)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save tag'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [formState, validate, tag, connectionId, addTag, updateTag, onSaved]
  )

  const handleCancel = useCallback(() => {
    setFormState(getInitialFormState(tag))
    setValidationErrors({})
    setError(null)
    if (!tag) {
      setIsExpanded(false)
    }
    onCancel?.()
  }, [tag, onCancel])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
    setError(null)
  }, [])

  const isEditing = !!tag

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      {/* Collapsible Header (only for create mode) */}
      {!isEditing && (
        <button
          type="button"
          onClick={toggleExpanded}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5',
            'text-sm font-medium text-foreground',
            'hover:bg-muted/50 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isExpanded && 'border-b border-border'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span>New Tag</span>
        </button>
      )}

      {/* Form Content */}
      {(isExpanded || isEditing) && (
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Tag Name */}
          <div className="space-y-1.5">
            <Label.Root htmlFor="tag-name" className="text-xs font-medium text-muted-foreground">
              Tag Name
            </Label.Root>
            <input
              id="tag-name"
              type="text"
              value={formState.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Temperature Sensor 1"
              disabled={isLoading}
              className={cn(
                'w-full h-8 px-2.5 text-sm rounded-md',
                'bg-background border border-input',
                'placeholder:text-muted-foreground/60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                validationErrors.name && 'border-destructive'
              )}
            />
            {validationErrors.name && (
              <p className="text-xs text-destructive">{validationErrors.name}</p>
            )}
          </div>

          {/* Register Type */}
          <div className="space-y-1.5">
            <Label.Root
              htmlFor="tag-register-type"
              className="text-xs font-medium text-muted-foreground"
            >
              Register Type
            </Label.Root>
            <select
              id="tag-register-type"
              value={formState.registerType}
              onChange={(e) =>
                updateField('registerType', e.target.value as ModbusAddress['registerType'])
              }
              disabled={isLoading}
              className={cn(
                'w-full h-8 px-2.5 text-sm rounded-md',
                'bg-background border border-input',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {REGISTER_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address and Length */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label.Root
                htmlFor="tag-address"
                className="text-xs font-medium text-muted-foreground"
              >
                Address
              </Label.Root>
              <input
                id="tag-address"
                type="number"
                value={formState.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="0"
                min={0}
                max={65535}
                disabled={isLoading}
                className={cn(
                  'w-full h-8 px-2.5 text-sm rounded-md',
                  'bg-background border border-input',
                  'placeholder:text-muted-foreground/60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  validationErrors.address && 'border-destructive'
                )}
              />
              {validationErrors.address && (
                <p className="text-xs text-destructive">{validationErrors.address}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label.Root
                htmlFor="tag-length"
                className="text-xs font-medium text-muted-foreground"
              >
                Length
              </Label.Root>
              <input
                id="tag-length"
                type="number"
                value={formState.length}
                onChange={(e) => updateField('length', e.target.value)}
                placeholder="1"
                min={1}
                max={formState.registerType === 'coil' || formState.registerType === 'discrete' ? 2000 : 125}
                disabled={isLoading}
                className={cn(
                  'w-full h-8 px-2.5 text-sm rounded-md',
                  'bg-background border border-input',
                  'placeholder:text-muted-foreground/60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  validationErrors.length && 'border-destructive'
                )}
              />
              {validationErrors.length && (
                <p className="text-xs text-destructive">{validationErrors.length}</p>
              )}
            </div>
          </div>

          {/* Data Type */}
          <div className="space-y-1.5">
            <Label.Root
              htmlFor="tag-data-type"
              className="text-xs font-medium text-muted-foreground"
            >
              Data Type
            </Label.Root>
            <select
              id="tag-data-type"
              value={formState.dataType}
              onChange={(e) => updateField('dataType', e.target.value as DataType)}
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

          {/* Display Format */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label.Root
                htmlFor="tag-decimals"
                className="text-xs font-medium text-muted-foreground"
              >
                Decimal Places
              </Label.Root>
              <input
                id="tag-decimals"
                type="number"
                value={formState.decimals}
                onChange={(e) => updateField('decimals', e.target.value)}
                min={0}
                max={10}
                disabled={isLoading}
                className={cn(
                  'w-full h-8 px-2.5 text-sm rounded-md',
                  'bg-background border border-input',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  validationErrors.decimals && 'border-destructive'
                )}
              />
              {validationErrors.decimals && (
                <p className="text-xs text-destructive">{validationErrors.decimals}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label.Root htmlFor="tag-unit" className="text-xs font-medium text-muted-foreground">
                Unit
              </Label.Root>
              <input
                id="tag-unit"
                type="text"
                value={formState.unit}
                onChange={(e) => updateField('unit', e.target.value)}
                placeholder="e.g., C, bar, %"
                disabled={isLoading}
                className={cn(
                  'w-full h-8 px-2.5 text-sm rounded-md',
                  'bg-background border border-input',
                  'placeholder:text-muted-foreground/60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-2">
            <Label.Root className="text-xs font-medium text-muted-foreground">
              Thresholds (Optional)
            </Label.Root>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <input
                  id="tag-warning-low"
                  type="number"
                  value={formState.warningLow}
                  onChange={(e) => updateField('warningLow', e.target.value)}
                  placeholder="Warning Low"
                  disabled={isLoading}
                  step="any"
                  className={cn(
                    'w-full h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'placeholder:text-muted-foreground/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validationErrors.warningLow && 'border-destructive'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <input
                  id="tag-warning-high"
                  type="number"
                  value={formState.warningHigh}
                  onChange={(e) => updateField('warningHigh', e.target.value)}
                  placeholder="Warning High"
                  disabled={isLoading}
                  step="any"
                  className={cn(
                    'w-full h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'placeholder:text-muted-foreground/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validationErrors.warningHigh && 'border-destructive'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <input
                  id="tag-alarm-low"
                  type="number"
                  value={formState.alarmLow}
                  onChange={(e) => updateField('alarmLow', e.target.value)}
                  placeholder="Alarm Low"
                  disabled={isLoading}
                  step="any"
                  className={cn(
                    'w-full h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'placeholder:text-muted-foreground/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validationErrors.alarmLow && 'border-destructive'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <input
                  id="tag-alarm-high"
                  type="number"
                  value={formState.alarmHigh}
                  onChange={(e) => updateField('alarmHigh', e.target.value)}
                  placeholder="Alarm High"
                  disabled={isLoading}
                  step="any"
                  className={cn(
                    'w-full h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'placeholder:text-muted-foreground/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validationErrors.alarmHigh && 'border-destructive'
                  )}
                />
              </div>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="tag-enabled"
              type="checkbox"
              checked={formState.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-input"
            />
            <Label.Root htmlFor="tag-enabled" className="text-sm text-foreground">
              Enabled (include in polling)
            </Label.Root>
          </div>

          {/* Error message from API */}
          {error && (
            <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">{error}</div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'flex-1 h-8 px-3 text-sm font-medium rounded-md',
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
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Tag</span>
                </>
              )}
            </button>

            {(isEditing || isExpanded) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className={cn(
                  'h-8 px-3 text-sm font-medium rounded-md',
                  'bg-muted text-muted-foreground',
                  'hover:bg-muted/80 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-2'
                )}
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
