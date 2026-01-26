/**
 * TagDetailPanel Component
 *
 * Side panel for viewing and editing tag details.
 * Shows current value, status, and editable properties.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Save, Trash2, AlertTriangle, RefreshCw, Loader2, Clock, XCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTagStore, type TagDisplayState } from '@renderer/stores/tagStore'
import type { Tag, DataType, ModbusAddress } from '@shared/types/tag'
import { DATA_TYPE_INFO } from '@shared/types/tag'
import { ModbusAddressInput } from './ModbusAddressInput'
import type { ParsedModbusAddress } from '@shared/utils/modbusAddress'
import { toTraditionalAddress } from '@shared/utils/modbusAddress'
import { getFullErrorDetails } from '@shared/utils/modbusErrors'
import { TagStatusIcon, TagStatusBadge } from './TagStatusIcon'

export interface TagDetailPanelProps {
  /** Tag to display/edit */
  tag: Tag | null
  /** Display state for the tag (current value, status, etc.) */
  displayState?: TagDisplayState
  /** Callback when panel is closed */
  onClose: () => void
  /** Callback when tag is saved */
  onSave?: (tag: Tag) => void
  /** Callback when tag is deleted */
  onDelete?: (tagId: string) => void
  /** Callback when retry is requested for error tags */
  onRetry?: (tagId: string) => void
  /** Optional additional className */
  className?: string
}

interface FormState {
  name: string
  address: string
  dataType: DataType
  decimals: number
  unit: string
  warningLow: string
  warningHigh: string
  alarmLow: string
  alarmHigh: string
}

// Byte order options for multi-register types
const BYTE_ORDER_OPTIONS = [
  { value: 'big-endian', label: 'Big Endian (AB CD)' },
  { value: 'little-endian', label: 'Little Endian (CD AB)' },
  { value: 'big-endian-swap', label: 'Big Endian Swap (BA DC)' },
  { value: 'little-endian-swap', label: 'Little Endian Swap (DC BA)' },
] as const

/**
 * Side panel for viewing and editing tag details.
 * Slides in from the right when a tag is selected.
 */
export function TagDetailPanel({
  tag,
  displayState,
  onClose,
  onSave,
  onDelete,
  onRetry,
  className
}: TagDetailPanelProps): React.ReactElement | null {
  const updateTag = useTagStore((state) => state.updateTag)
  const clearTagError = useTagStore((state) => state.clearTagError)
  const [isRetrying, setIsRetrying] = useState(false)

  // Form state
  const [formState, setFormState] = useState<FormState>({
    name: '',
    address: '',
    dataType: 'int16',
    decimals: 2,
    unit: '',
    warningLow: '',
    warningHigh: '',
    alarmLow: '',
    alarmHigh: '',
  })
  const [parsedAddress, setParsedAddress] = useState<ParsedModbusAddress | null>(null)
  const [byteOrder, setByteOrder] = useState<string>('big-endian')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  // Initialize form state from tag
  useEffect(() => {
    if (tag) {
      const modbusAddress = tag.address as ModbusAddress
      const traditionalAddr = tag.address.type === 'modbus'
        ? toTraditionalAddress(modbusAddress.registerType, modbusAddress.address)
        : 0

      setFormState({
        name: tag.name,
        address: traditionalAddr.toString(),
        dataType: tag.dataType,
        decimals: tag.displayFormat.decimals,
        unit: tag.displayFormat.unit,
        warningLow: tag.thresholds.warningLow?.toString() ?? '',
        warningHigh: tag.thresholds.warningHigh?.toString() ?? '',
        alarmLow: tag.thresholds.alarmLow?.toString() ?? '',
        alarmHigh: tag.thresholds.alarmHigh?.toString() ?? '',
      })

      if (tag.address.type === 'modbus' && modbusAddress.byteOrder) {
        setByteOrder(modbusAddress.byteOrder)
      }

      setIsDirty(false)
      setShowUnsavedWarning(false)
    }
  }, [tag])

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof FormState, value: string | DataType) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }, [])

  // Handle address change
  const handleAddressChange = useCallback((value: string, parsed: ParsedModbusAddress | null) => {
    setFormState((prev) => ({ ...prev, address: value }))
    setParsedAddress(parsed)
    setIsDirty(true)
  }, [])

  // Check if multi-register type (needs byte order selector)
  const isMultiRegisterType = useMemo(() => {
    const info = DATA_TYPE_INFO[formState.dataType]
    return info.registers > 1
  }, [formState.dataType])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!tag || !parsedAddress) return

    setIsSaving(true)
    try {
      const updatedTag: Tag = {
        ...tag,
        name: formState.name,
        address: {
          type: 'modbus',
          registerType: parsedAddress.registerType,
          address: parsedAddress.address,
          length: DATA_TYPE_INFO[formState.dataType].registers,
          byteOrder: isMultiRegisterType ? (byteOrder as ModbusAddress['byteOrder']) : undefined,
        } as ModbusAddress,
        dataType: formState.dataType,
        displayFormat: {
          decimals: formState.decimals,
          unit: formState.unit,
        },
        thresholds: {
          warningLow: formState.warningLow ? parseFloat(formState.warningLow) : undefined,
          warningHigh: formState.warningHigh ? parseFloat(formState.warningHigh) : undefined,
          alarmLow: formState.alarmLow ? parseFloat(formState.alarmLow) : undefined,
          alarmHigh: formState.alarmHigh ? parseFloat(formState.alarmHigh) : undefined,
        },
      }

      // Update via IPC
      const result = await window.electronAPI.tag.update({
        tagId: tag.id,
        updates: {
          name: updatedTag.name,
          address: updatedTag.address,
          dataType: updatedTag.dataType,
          displayFormat: updatedTag.displayFormat,
          thresholds: updatedTag.thresholds,
          enabled: updatedTag.enabled,
        }
      })
      if (result.success) {
        updateTag(tag.id, updatedTag)
        setIsDirty(false)
        onSave?.(updatedTag)
      }
    } catch (err) {
      console.error('Failed to save tag:', err)
    } finally {
      setIsSaving(false)
    }
  }, [tag, parsedAddress, formState, byteOrder, isMultiRegisterType, updateTag, onSave])

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (tag) {
      onDelete?.(tag.id)
    }
  }, [tag, onDelete])

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedWarning(false)
    onClose()
  }, [onClose])

  // Handle retry (P3-7)
  const handleRetry = useCallback(async () => {
    if (!tag) return
    setIsRetrying(true)
    try {
      // Clear the error state
      clearTagError(tag.id)
      // Call the onRetry callback if provided
      onRetry?.(tag.id)
    } finally {
      // Reset retrying state after a delay
      setTimeout(() => setIsRetrying(false), 1000)
    }
  }, [tag, clearTagError, onRetry])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && tag) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [tag, handleClose])

  if (!tag) {
    return null
  }

  // Format current value
  const formattedValue = useMemo(() => {
    const value = displayState?.currentValue
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'ON' : 'OFF'
    if (typeof value === 'number') {
      return value.toFixed(formState.decimals) + (formState.unit ? ` ${formState.unit}` : '')
    }
    return String(value)
  }, [displayState?.currentValue, formState.decimals, formState.unit])

  // Get error details (P3-7)
  const errorDetails = useMemo(() => {
    if (!displayState?.lastError) return null
    return getFullErrorDetails(displayState.lastError)
  }, [displayState?.lastError])

  // Check if tag has error or timeout status
  const hasError = displayState?.status === 'error' || displayState?.status === 'timeout'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleClose}
        data-testid="tag-detail-panel-backdrop"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-96',
          'bg-card border-l border-border shadow-xl',
          'animate-in slide-in-from-right duration-300',
          className
        )}
        data-testid="tag-detail-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Tag Details</h2>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'p-1.5 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label="Close panel"
            data-testid="tag-detail-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Current value display */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Current Value</div>
              {displayState?.status && (
                <TagStatusBadge status={displayState.status} size="sm" />
              )}
            </div>
            <div className="mt-1 text-2xl font-mono font-bold text-foreground">
              {formattedValue}
            </div>
            {displayState && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Quality: {displayState.quality}</span>
                <span>|</span>
                <span>Alarm: {displayState.alarmState}</span>
                {displayState.lastSuccessAt && (
                  <>
                    <span>|</span>
                    <span>Last read: {new Date(displayState.lastSuccessAt).toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Error/Timeout display (P3-7) */}
          {hasError && (
            <div
              className={cn(
                'p-3 rounded-lg border',
                displayState?.status === 'error' && 'bg-destructive/10 border-destructive/30',
                displayState?.status === 'timeout' && 'bg-amber-500/10 border-amber-500/30'
              )}
              data-testid="tag-error-details"
            >
              <div className="flex items-start gap-2">
                {displayState?.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm font-medium',
                    displayState?.status === 'error' && 'text-destructive',
                    displayState?.status === 'timeout' && 'text-amber-600 dark:text-amber-400'
                  )}>
                    {errorDetails?.name ?? (displayState?.status === 'timeout' ? 'Read Timeout' : 'Read Error')}
                  </div>
                  {errorDetails && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {errorDetails.description}
                    </div>
                  )}
                  {errorDetails?.suggestion && (
                    <div className="mt-1.5 text-xs text-muted-foreground italic">
                      💡 {errorDetails.suggestion}
                    </div>
                  )}
                  {displayState?.consecutiveFailures > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Failed {displayState.consecutiveFailures} time{displayState.consecutiveFailures !== 1 ? 's' : ''}
                      </span>
                      {displayState.isThrottled && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Throttled
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className={cn(
                      'mt-2 flex items-center gap-1 px-2 py-1 rounded text-xs',
                      displayState?.status === 'error' && 'bg-destructive/10 hover:bg-destructive/20 text-destructive',
                      displayState?.status === 'timeout' && 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400',
                      'transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    data-testid="tag-retry-button"
                  >
                    <RefreshCw className={cn('h-3 w-3', isRetrying && 'animate-spin')} />
                    {isRetrying ? 'Retrying...' : 'Retry Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="tag-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="tag-name"
                type="text"
                value={formState.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-md border',
                  'bg-background text-foreground',
                  'border-input focus:border-ring',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50'
                )}
                data-testid="tag-name-input"
              />
            </div>

            {/* Address */}
            <ModbusAddressInput
              value={formState.address}
              onChange={handleAddressChange}
              label="Address"
              id="tag-address"
              placeholder="e.g., 40001"
            />

            {/* Data Type */}
            <div className="space-y-1.5">
              <label htmlFor="tag-datatype" className="text-sm font-medium text-foreground">
                Data Type
              </label>
              <select
                id="tag-datatype"
                value={formState.dataType}
                onChange={(e) => handleFieldChange('dataType', e.target.value as DataType)}
                className={cn(
                  'w-full px-3 py-2 rounded-md border',
                  'bg-background text-foreground',
                  'border-input focus:border-ring',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50'
                )}
                data-testid="tag-datatype-select"
              >
                {Object.entries(DATA_TYPE_INFO).map(([value, info]) => (
                  <option key={value} value={value}>
                    {info.label}
                  </option>
                ))}
              </select>
              {isMultiRegisterType && (
                <p className="text-xs text-muted-foreground">
                  Will read {DATA_TYPE_INFO[formState.dataType].registers} registers
                </p>
              )}
            </div>

            {/* Byte Order (only for multi-register types) */}
            {isMultiRegisterType && (
              <div className="space-y-1.5">
                <label htmlFor="tag-byteorder" className="text-sm font-medium text-foreground">
                  Byte Order
                </label>
                <select
                  id="tag-byteorder"
                  value={byteOrder}
                  onChange={(e) => {
                    setByteOrder(e.target.value)
                    setIsDirty(true)
                  }}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border',
                    'bg-background text-foreground',
                    'border-input focus:border-ring',
                    'focus:outline-none focus:ring-2 focus:ring-ring/50'
                  )}
                  data-testid="tag-byteorder-select"
                >
                  {BYTE_ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Display Format */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="tag-decimals" className="text-sm font-medium text-foreground">
                  Decimals
                </label>
                <input
                  id="tag-decimals"
                  type="number"
                  min="0"
                  max="10"
                  value={formState.decimals}
                  onChange={(e) => handleFieldChange('decimals', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border',
                    'bg-background text-foreground',
                    'border-input focus:border-ring',
                    'focus:outline-none focus:ring-2 focus:ring-ring/50'
                  )}
                  data-testid="tag-decimals-input"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tag-unit" className="text-sm font-medium text-foreground">
                  Unit
                </label>
                <input
                  id="tag-unit"
                  type="text"
                  value={formState.unit}
                  onChange={(e) => handleFieldChange('unit', e.target.value)}
                  placeholder="e.g., °C, PSI"
                  className={cn(
                    'w-full px-3 py-2 rounded-md border',
                    'bg-background text-foreground',
                    'border-input focus:border-ring',
                    'focus:outline-none focus:ring-2 focus:ring-ring/50'
                  )}
                  data-testid="tag-unit-input"
                />
              </div>
            </div>

            {/* Thresholds */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Thresholds</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="tag-warning-low" className="text-xs text-muted-foreground">
                    Warning Low
                  </label>
                  <input
                    id="tag-warning-low"
                    type="number"
                    value={formState.warningLow}
                    onChange={(e) => handleFieldChange('warningLow', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-md border',
                      'bg-background text-foreground',
                      'border-input focus:border-ring',
                      'focus:outline-none focus:ring-2 focus:ring-ring/50'
                    )}
                    data-testid="tag-warning-low-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="tag-warning-high" className="text-xs text-muted-foreground">
                    Warning High
                  </label>
                  <input
                    id="tag-warning-high"
                    type="number"
                    value={formState.warningHigh}
                    onChange={(e) => handleFieldChange('warningHigh', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-md border',
                      'bg-background text-foreground',
                      'border-input focus:border-ring',
                      'focus:outline-none focus:ring-2 focus:ring-ring/50'
                    )}
                    data-testid="tag-warning-high-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="tag-alarm-low" className="text-xs text-muted-foreground">
                    Alarm Low
                  </label>
                  <input
                    id="tag-alarm-low"
                    type="number"
                    value={formState.alarmLow}
                    onChange={(e) => handleFieldChange('alarmLow', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-md border',
                      'bg-background text-foreground',
                      'border-input focus:border-ring',
                      'focus:outline-none focus:ring-2 focus:ring-ring/50'
                    )}
                    data-testid="tag-alarm-low-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="tag-alarm-high" className="text-xs text-muted-foreground">
                    Alarm High
                  </label>
                  <input
                    id="tag-alarm-high"
                    type="number"
                    value={formState.alarmHigh}
                    onChange={(e) => handleFieldChange('alarmHigh', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-md border',
                      'bg-background text-foreground',
                      'border-input focus:border-ring',
                      'focus:outline-none focus:ring-2 focus:ring-ring/50'
                    )}
                    data-testid="tag-alarm-high-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-md',
              'text-sm font-medium',
              'bg-destructive/10 hover:bg-destructive/20',
              'text-destructive',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            data-testid="tag-delete-button"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || !parsedAddress}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md',
              'text-sm font-medium',
              'bg-primary hover:bg-primary/90',
              'text-primary-foreground',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            data-testid="tag-save-button"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Unsaved changes warning dialog */}
      {showUnsavedWarning && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          data-testid="unsaved-warning-dialog"
        >
          <div className="w-full max-w-sm p-6 rounded-lg bg-card border border-border shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Unsaved Changes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className={cn(
                  'px-4 py-2 rounded-md',
                  'text-sm font-medium',
                  'bg-muted hover:bg-muted/80',
                  'text-foreground',
                  'transition-colors'
                )}
                data-testid="unsaved-warning-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardChanges}
                className={cn(
                  'px-4 py-2 rounded-md',
                  'text-sm font-medium',
                  'bg-destructive hover:bg-destructive/90',
                  'text-destructive-foreground',
                  'transition-colors'
                )}
                data-testid="unsaved-warning-discard"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TagDetailPanel
