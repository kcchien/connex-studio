/**
 * VariableList Component
 *
 * Displays and allows editing of environment variables.
 * Supports adding, editing, and removing key-value pairs.
 */

import React, { useState, useCallback, memo } from 'react'
import { Plus, Trash2, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { isValidVariableName } from '@shared/types'

interface VariableListProps {
  /** Current variables as key-value pairs */
  variables: Record<string, string>
  /** Callback when variables change */
  onChange: (variables: Record<string, string>) => void
  /** Whether the list is read-only */
  readonly?: boolean
  /** Optional additional className */
  className?: string
}

interface VariableRowProps {
  name: string
  value: string
  onNameChange: (oldName: string, newName: string) => void
  onValueChange: (name: string, value: string) => void
  onDelete: (name: string) => void
  readonly?: boolean
  isNew?: boolean
  existingNames: Set<string>
}

const VariableRow = memo(function VariableRow({
  name,
  value,
  onNameChange,
  onValueChange,
  onDelete,
  readonly = false,
  isNew = false,
  existingNames
}: VariableRowProps): React.ReactElement {
  const [localName, setLocalName] = useState(name)
  const [localValue, setLocalValue] = useState(value)
  const [showValue, setShowValue] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Validate and commit name change on blur
  const handleNameBlur = useCallback(() => {
    if (localName === name) return

    if (!localName.trim()) {
      setError('Name is required')
      setLocalName(name)
      return
    }

    if (!isValidVariableName(localName)) {
      setError('Name must be uppercase with underscores')
      setLocalName(name)
      return
    }

    if (existingNames.has(localName) && localName !== name) {
      setError('Name already exists')
      setLocalName(name)
      return
    }

    setError(null)
    onNameChange(name, localName)
  }, [localName, name, existingNames, onNameChange])

  // Commit value change on blur
  const handleValueBlur = useCallback(() => {
    if (localValue !== value) {
      onValueChange(name, localValue)
    }
  }, [localValue, value, name, onValueChange])

  // Copy value to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(localValue)
  }, [localValue])

  // Determine if value looks like a secret
  const isSecret = /password|secret|key|token|credential/i.test(name)

  return (
    <div className="flex items-center gap-2 group">
      {/* Variable name */}
      <input
        type="text"
        value={localName}
        onChange={(e) => setLocalName(e.target.value.toUpperCase())}
        onBlur={handleNameBlur}
        disabled={readonly}
        placeholder="VARIABLE_NAME"
        className={cn(
          'flex-1 px-2 py-1.5 rounded-md text-sm font-mono',
          'bg-background border border-input',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-destructive'
        )}
      />

      {/* Variable value */}
      <div className="flex-[2] relative flex items-center">
        <input
          type={showValue && !isSecret ? 'text' : 'password'}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleValueBlur}
          disabled={readonly}
          placeholder="value"
          className={cn(
            'w-full px-2 py-1.5 pr-16 rounded-md text-sm',
            'bg-background border border-input',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />

        {/* Value actions */}
        <div className="absolute right-1 flex items-center gap-0.5">
          {isSecret && (
            <button
              onClick={() => setShowValue(!showValue)}
              className={cn(
                'p-1 rounded text-muted-foreground',
                'hover:text-foreground hover:bg-muted',
                'transition-colors'
              )}
              title={showValue ? 'Hide value' : 'Show value'}
            >
              {showValue ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={cn(
              'p-1 rounded text-muted-foreground',
              'hover:text-foreground hover:bg-muted',
              'transition-colors'
            )}
            title="Copy value"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete button */}
      {!readonly && (
        <button
          onClick={() => onDelete(name)}
          className={cn(
            'p-1.5 rounded-md',
            'text-muted-foreground hover:text-destructive',
            'hover:bg-destructive/10 transition-colors',
            'opacity-0 group-hover:opacity-100 focus:opacity-100'
          )}
          title="Remove variable"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
})

/**
 * VariableList for displaying and editing environment variables.
 */
export const VariableList = memo(function VariableList({
  variables,
  onChange,
  readonly = false,
  className
}: VariableListProps): React.ReactElement {
  const [newKey, setNewKey] = useState('')

  const existingNames = new Set(Object.keys(variables))

  // Handle name change (rename key)
  const handleNameChange = useCallback((oldName: string, newName: string) => {
    if (oldName === newName) return

    const newVars = { ...variables }
    const value = newVars[oldName]
    delete newVars[oldName]
    newVars[newName] = value
    onChange(newVars)
  }, [variables, onChange])

  // Handle value change
  const handleValueChange = useCallback((name: string, value: string) => {
    onChange({ ...variables, [name]: value })
  }, [variables, onChange])

  // Handle delete
  const handleDelete = useCallback((name: string) => {
    const newVars = { ...variables }
    delete newVars[name]
    onChange(newVars)
  }, [variables, onChange])

  // Handle add new variable
  const handleAdd = useCallback(() => {
    // Generate unique name
    let baseName = 'NEW_VARIABLE'
    let counter = 1
    let name = baseName

    while (existingNames.has(name)) {
      name = `${baseName}_${counter}`
      counter++
    }

    onChange({ ...variables, [name]: '' })
  }, [variables, existingNames, onChange])

  const sortedEntries = Object.entries(variables).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
          <span className="flex-1">Name</span>
          <span className="flex-[2]">Value</span>
        </div>
        {!readonly && (
          <button
            onClick={handleAdd}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-sm',
              'text-primary hover:bg-primary/10',
              'transition-colors'
            )}
          >
            <Plus className="h-4 w-4" />
            Add Variable
          </button>
        )}
      </div>

      {/* Variable rows */}
      <div className="space-y-2">
        {sortedEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No variables defined
          </div>
        ) : (
          sortedEntries.map(([name, value]) => (
            <VariableRow
              key={name}
              name={name}
              value={value}
              onNameChange={handleNameChange}
              onValueChange={handleValueChange}
              onDelete={handleDelete}
              readonly={readonly}
              existingNames={existingNames}
            />
          ))
        )}
      </div>

      {/* Usage hint */}
      <div className="text-xs text-muted-foreground pt-2 border-t border-border">
        Use <code className="px-1 py-0.5 bg-muted rounded font-mono">{'${VARIABLE_NAME}'}</code> to reference variables in connection configs
      </div>
    </div>
  )
})
