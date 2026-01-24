/**
 * AssertionEditor Component
 *
 * Editor for defining assertions on collection request responses.
 * Supports various assertion types like equals, contains, exists, etc.
 */

import React, { useState, useCallback, memo } from 'react'
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Assertion, AssertionType, AssertionTarget } from '@shared/types'

interface AssertionEditorProps {
  /** List of assertions */
  assertions: Assertion[]
  /** Callback when assertions change */
  onChange: (assertions: Assertion[]) => void
  /** Whether the editor is read-only */
  readonly?: boolean
  /** Optional additional className */
  className?: string
}

const ASSERTION_TYPES: { value: AssertionType; label: string; description: string }[] = [
  { value: 'equals', label: 'Equals', description: 'Value exactly matches expected' },
  { value: 'contains', label: 'Contains', description: 'Value contains expected substring' },
  { value: 'range', label: 'Range', description: 'Value is within numeric range' },
  { value: 'regex', label: 'Regex', description: 'Value matches regular expression' }
]

const ASSERTION_TARGETS: { value: AssertionTarget; label: string }[] = [
  { value: 'value', label: 'Value' },
  { value: 'status', label: 'Status' },
  { value: 'latency', label: 'Latency' }
]

interface AssertionRowProps {
  assertion: Assertion
  index: number
  onChange: (index: number, assertion: Assertion) => void
  onDelete: (index: number) => void
  readonly?: boolean
}

const AssertionRow = memo(function AssertionRow({
  assertion,
  index,
  onChange,
  onDelete,
  readonly = false
}: AssertionRowProps): React.ReactElement {
  const handleFieldChange = useCallback(
    <K extends keyof Assertion>(field: K, value: Assertion[K]) => {
      onChange(index, { ...assertion, [field]: value })
    },
    [assertion, index, onChange]
  )

  return (
    <div className={cn(
      'flex items-start gap-2 p-2 rounded-md',
      'bg-muted/30 border border-border group'
    )}>
      {/* Drag handle (visual only for now) */}
      {!readonly && (
        <div className="pt-2 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Assertion fields */}
      <div className="flex-1 grid grid-cols-12 gap-2">
        {/* Type */}
        <div className="col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Type</label>
          <select
            value={assertion.type}
            onChange={(e) => handleFieldChange('type', e.target.value as AssertionType)}
            disabled={readonly}
            className={cn(
              'w-full px-2 py-1.5 rounded text-sm',
              'bg-background border border-input',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:opacity-50'
            )}
          >
            {ASSERTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target */}
        <div className="col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Target</label>
          <select
            value={assertion.target}
            onChange={(e) => handleFieldChange('target', e.target.value as AssertionTarget)}
            disabled={readonly}
            className={cn(
              'w-full px-2 py-1.5 rounded text-sm',
              'bg-background border border-input',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:opacity-50'
            )}
          >
            {ASSERTION_TARGETS.map((target) => (
              <option key={target.value} value={target.value}>
                {target.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expected value */}
        <div className="col-span-4">
          <label className="block text-xs text-muted-foreground mb-1">Expected</label>
          <input
            type="text"
            value={String(assertion.expected ?? '')}
            onChange={(e) => handleFieldChange('expected', e.target.value)}
            disabled={readonly}
            placeholder="expected value"
            className={cn(
              'w-full px-2 py-1.5 rounded text-sm',
              'bg-background border border-input',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:opacity-50'
            )}
          />
        </div>

        {/* Message */}
        <div className="col-span-3">
          <label className="block text-xs text-muted-foreground mb-1">Message</label>
          <input
            type="text"
            value={assertion.message ?? ''}
            onChange={(e) => handleFieldChange('message', e.target.value || undefined)}
            disabled={readonly}
            placeholder="failure message"
            className={cn(
              'w-full px-2 py-1.5 rounded text-sm',
              'bg-background border border-input',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:opacity-50'
            )}
          />
        </div>

        {/* Delete button */}
        <div className="col-span-1 flex items-end">
          {!readonly && (
            <button
              onClick={() => onDelete(index)}
              className={cn(
                'p-1.5 rounded text-muted-foreground',
                'hover:text-destructive hover:bg-destructive/10',
                'transition-colors',
                'opacity-0 group-hover:opacity-100 focus:opacity-100'
              )}
              title="Remove assertion"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * AssertionEditor for defining request assertions.
 */
export const AssertionEditor = memo(function AssertionEditor({
  assertions,
  onChange,
  readonly = false,
  className
}: AssertionEditorProps): React.ReactElement {
  // Handle assertion change
  const handleChange = useCallback(
    (index: number, assertion: Assertion) => {
      const updated = [...assertions]
      updated[index] = assertion
      onChange(updated)
    },
    [assertions, onChange]
  )

  // Handle assertion delete
  const handleDelete = useCallback(
    (index: number) => {
      const updated = assertions.filter((_, i) => i !== index)
      onChange(updated)
    },
    [assertions, onChange]
  )

  // Handle add new assertion
  const handleAdd = useCallback(() => {
    const newAssertion: Assertion = {
      type: 'equals',
      target: 'value',
      expected: ''
    }
    onChange([...assertions, newAssertion])
  }, [assertions, onChange])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">
          Assertions
          {assertions.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({assertions.length})
            </span>
          )}
        </div>
        {!readonly && (
          <button
            onClick={handleAdd}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm',
              'text-primary hover:bg-primary/10',
              'transition-colors'
            )}
          >
            <Plus className="h-4 w-4" />
            Add Assertion
          </button>
        )}
      </div>

      {/* Assertion list */}
      <div className="space-y-2">
        {assertions.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
            No assertions defined.
            {!readonly && ' Click "Add Assertion" to create one.'}
          </div>
        ) : (
          assertions.map((assertion, index) => (
            <AssertionRow
              key={index}
              assertion={assertion}
              index={index}
              onChange={handleChange}
              onDelete={handleDelete}
              readonly={readonly}
            />
          ))
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            Use dot notation for nested properties (e.g., <code className="px-1 bg-muted rounded">response.data.id</code>)
          </span>
        </div>
        <div className="flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            For array access, use bracket notation (e.g., <code className="px-1 bg-muted rounded">items[0].name</code>)
          </span>
        </div>
      </div>
    </div>
  )
})
