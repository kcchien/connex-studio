/**
 * AlertRuleEditor Component
 *
 * Modal dialog for creating and editing alert rules.
 * Includes threshold configuration with operator, value, duration, and cooldown settings.
 */

import React, { useState, useCallback, memo, useEffect } from 'react'
import { X, Save, AlertCircle, Trash2, Bell, Volume2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type {
  AlertRule,
  AlertCondition,
  AlertSeverity,
  AlertOperator,
  AlertActionType,
  CreateAlertRuleRequest
} from '@shared/types'
import {
  DEFAULT_ALERT_COOLDOWN,
  DEFAULT_ALERT_ACTIONS,
  SEVERITY_COLORS,
  SEVERITY_LABELS
} from '@shared/types'

interface AlertRuleEditorProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Rule to edit (null for create mode) */
  rule: AlertRule | null
  /** Available tags for selection */
  availableTags: Array<{ id: string; name: string; connectionName?: string }>
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when rule is saved */
  onSave: (data: CreateAlertRuleRequest | AlertRule) => Promise<void>
  /** Callback when rule is deleted */
  onDelete?: (id: string) => Promise<void>
  /** Callback to test sound */
  onTestSound?: (severity: AlertSeverity) => void
  /** Optional additional className */
  className?: string
}

const OPERATORS: { value: AlertOperator; label: string; requiresValue2?: boolean }[] = [
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
  { value: '=', label: 'Equal to (=)' },
  { value: '!=', label: 'Not equal to (!=)' },
  { value: 'range', label: 'In range (between)', requiresValue2: true }
]

const SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical']

const ACTIONS: { value: AlertActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'notification', label: 'Desktop Notification', icon: <Bell className="h-4 w-4" /> },
  { value: 'sound', label: 'Sound Alert', icon: <Volume2 className="h-4 w-4" /> },
  { value: 'log', label: 'Log to History', icon: <AlertCircle className="h-4 w-4" /> }
]

/**
 * AlertRuleEditor for creating and editing alert rules.
 */
export const AlertRuleEditor = memo(function AlertRuleEditor({
  isOpen,
  rule,
  availableTags,
  onClose,
  onSave,
  onDelete,
  onTestSound,
  className
}: AlertRuleEditorProps): React.ReactElement | null {
  // Form state
  const [name, setName] = useState('')
  const [tagRef, setTagRef] = useState('')
  const [operator, setOperator] = useState<AlertOperator>('>')
  const [value, setValue] = useState(0)
  const [value2, setValue2] = useState(0)
  const [duration, setDuration] = useState(0)
  const [severity, setSeverity] = useState<AlertSeverity>('warning')
  const [actions, setActions] = useState<AlertActionType[]>(DEFAULT_ALERT_ACTIONS)
  const [cooldown, setCooldown] = useState(DEFAULT_ALERT_COOLDOWN)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = rule !== null
  const selectedOperator = OPERATORS.find((op) => op.value === operator)

  // Reset state when dialog opens or rule changes
  useEffect(() => {
    if (isOpen) {
      if (rule) {
        setName(rule.name)
        setTagRef(rule.tagRef)
        setOperator(rule.condition.operator)
        setValue(rule.condition.value)
        setValue2(rule.condition.value2 ?? 0)
        setDuration(rule.condition.duration ?? 0)
        setSeverity(rule.severity)
        setActions([...rule.actions])
        setCooldown(rule.cooldown)
      } else {
        setName('')
        setTagRef(availableTags[0]?.id ?? '')
        setOperator('>')
        setValue(0)
        setValue2(0)
        setDuration(0)
        setSeverity('warning')
        setActions([...DEFAULT_ALERT_ACTIONS])
        setCooldown(DEFAULT_ALERT_COOLDOWN)
      }
      setError(null)
    }
  }, [isOpen, rule, availableTags])

  // Toggle action
  const toggleAction = useCallback((action: AlertActionType) => {
    setActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action]
    )
  }, [])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Rule name is required')
      return
    }
    if (!tagRef) {
      setError('Please select a tag')
      return
    }
    if (actions.length === 0) {
      setError('At least one action is required')
      return
    }

    setIsSaving(true)
    setError(null)

    const condition: AlertCondition = {
      operator,
      value,
      ...(selectedOperator?.requiresValue2 && { value2 }),
      ...(duration > 0 && { duration })
    }

    try {
      if (isEditMode) {
        await onSave({
          ...rule!,
          name: name.trim(),
          tagRef,
          condition,
          severity,
          actions,
          cooldown
        })
      } else {
        await onSave({
          name: name.trim(),
          tagRef,
          condition,
          severity,
          actions,
          cooldown
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setIsSaving(false)
    }
  }, [
    name,
    tagRef,
    operator,
    value,
    value2,
    duration,
    severity,
    actions,
    cooldown,
    isEditMode,
    rule,
    selectedOperator,
    onSave,
    onClose
  ])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!rule || !onDelete) return

    if (!window.confirm(`Delete alert rule "${rule.name}"? This cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await onDelete(rule.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setIsDeleting(false)
    }
  }, [rule, onDelete, onClose])

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'w-full max-w-2xl max-h-[85vh] flex flex-col',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditMode ? 'Edit Alert Rule' : 'New Alert Rule'}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rule name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Rule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Temperature Alert"
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              autoFocus
            />
          </div>

          {/* Tag selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Monitor Tag
            </label>
            <select
              value={tagRef}
              onChange={(e) => setTagRef(e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              <option value="">Select a tag...</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.connectionName ? `${tag.connectionName} / ` : ''}{tag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Trigger Condition
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Operator */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Operator</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as AlertOperator)}
                  className={cn(
                    'w-full px-3 py-2 rounded-md',
                    'bg-background border border-input',
                    'text-sm text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value 1 */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {selectedOperator?.requiresValue2 ? 'Min Value' : 'Threshold'}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className={cn(
                    'w-full px-3 py-2 rounded-md',
                    'bg-background border border-input',
                    'text-sm text-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                />
              </div>

              {/* Value 2 (for range) */}
              {selectedOperator?.requiresValue2 && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Value</label>
                  <input
                    type="number"
                    value={value2}
                    onChange={(e) => setValue2(Number(e.target.value))}
                    className={cn(
                      'w-full px-3 py-2 rounded-md',
                      'bg-background border border-input',
                      'text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring'
                    )}
                  />
                </div>
              )}
            </div>

            {/* Duration (debounce) */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Duration (seconds) - Condition must hold for this long
              </label>
              <input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(Math.max(0, Number(e.target.value)))}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-input',
                  'text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              />
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Severity Level
            </label>
            <div className="flex gap-2">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-md text-sm font-medium',
                    'border transition-colors',
                    severity === sev
                      ? 'border-2'
                      : 'border-border hover:border-muted-foreground'
                  )}
                  style={{
                    borderColor: severity === sev ? SEVERITY_COLORS[sev] : undefined,
                    backgroundColor: severity === sev ? `${SEVERITY_COLORS[sev]}20` : undefined,
                    color: severity === sev ? SEVERITY_COLORS[sev] : undefined
                  }}
                >
                  {SEVERITY_LABELS[sev]}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Alert Actions
            </label>
            <div className="space-y-2">
              {ACTIONS.map((action) => (
                <label
                  key={action.value}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-md cursor-pointer',
                    'border transition-colors',
                    actions.includes(action.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={actions.includes(action.value)}
                    onChange={() => toggleAction(action.value)}
                    className="rounded border-input"
                  />
                  <span className="text-muted-foreground">{action.icon}</span>
                  <span className="text-sm text-foreground">{action.label}</span>
                  {action.value === 'sound' && actions.includes('sound') && onTestSound && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        onTestSound(severity)
                      }}
                      className={cn(
                        'ml-auto px-2 py-1 text-xs rounded',
                        'bg-muted hover:bg-muted/80 text-foreground'
                      )}
                    >
                      Test
                    </button>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Cooldown (seconds) - Minimum time between alerts
            </label>
            <input
              type="number"
              min={0}
              value={cooldown}
              onChange={(e) => setCooldown(Math.max(0, Number(e.target.value)))}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          {/* Delete button (only in edit mode) */}
          <div>
            {isEditMode && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                  'text-destructive hover:bg-destructive/10',
                  'transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          {/* Save/Cancel buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-muted transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting || !name.trim() || !tagRef}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
