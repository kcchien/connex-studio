/**
 * EnvironmentEditor Component
 *
 * Modal dialog for creating and editing environments.
 * Includes name input and variable list editor.
 */

import React, { useState, useCallback, memo, useEffect } from 'react'
import { X, Save, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { VariableList } from './VariableList'
import type { Environment, CreateEnvironmentRequest } from '@shared/types'

interface EnvironmentEditorProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Environment to edit (null for create mode) */
  environment: Environment | null
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when environment is saved */
  onSave: (data: CreateEnvironmentRequest | { id: string } & Partial<Environment>) => Promise<void>
  /** Callback when environment is deleted */
  onDelete?: (id: string) => Promise<void>
  /** Optional additional className */
  className?: string
}

/**
 * EnvironmentEditor for creating and editing environments.
 */
export const EnvironmentEditor = memo(function EnvironmentEditor({
  isOpen,
  environment,
  onClose,
  onSave,
  onDelete,
  className
}: EnvironmentEditorProps): React.ReactElement | null {
  const [name, setName] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isDefault, setIsDefault] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = environment !== null

  // Reset state when dialog opens or environment changes
  useEffect(() => {
    if (isOpen) {
      if (environment) {
        setName(environment.name)
        setVariables({ ...environment.variables })
        setIsDefault(environment.isDefault)
      } else {
        setName('')
        setVariables({})
        setIsDefault(false)
      }
      setError(null)
    }
  }, [isOpen, environment])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Environment name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (isEditMode) {
        await onSave({
          id: environment!.id,
          name: name.trim(),
          variables
        })
      } else {
        await onSave({
          name: name.trim(),
          variables,
          isDefault
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save environment')
    } finally {
      setIsSaving(false)
    }
  }, [name, variables, isDefault, isEditMode, environment, onSave, onClose])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!environment || !onDelete) return

    if (!window.confirm(`Delete environment "${environment.name}"? This cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await onDelete(environment.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete environment')
    } finally {
      setIsDeleting(false)
    }
  }, [environment, onDelete, onClose])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

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
          'w-full max-w-2xl max-h-[80vh] flex flex-col',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditMode ? 'Edit Environment' : 'New Environment'}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Environment name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Environment Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Development, Production, Testing"
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              autoFocus
            />
          </div>

          {/* Default checkbox (only for new environments) */}
          {!isEditMode && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">
                Set as default environment
              </span>
            </label>
          )}

          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Variables
            </label>
            <div className="border border-border rounded-md p-3">
              <VariableList
                variables={variables}
                onChange={setVariables}
              />
            </div>
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
              disabled={isSaving || isDeleting || !name.trim()}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Environment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
