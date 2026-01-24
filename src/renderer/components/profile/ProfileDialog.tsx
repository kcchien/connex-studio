/**
 * ProfileDialog Component
 *
 * Modal dialog for saving a new profile.
 * Allows user to name the profile and select which connections to include.
 */

import React, { useState, useCallback, memo } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Connection } from '@shared/types/connection'

interface ProfileDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Available connections to select from */
  connections: Connection[]
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when profile is saved */
  onSave: (name: string, connectionIds: string[]) => Promise<void>
  /** Optional additional className */
  className?: string
}

/**
 * ProfileDialog for saving new profiles.
 */
export const ProfileDialog = memo(function ProfileDialog({
  isOpen,
  connections,
  onClose,
  onSave,
  className
}: ProfileDialogProps): React.ReactElement | null {
  const [name, setName] = useState('')
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setName('')
      setSelectedConnections(new Set(connections.map((c) => c.id)))
      setError(null)
    }
  }, [isOpen, connections])

  // Toggle connection selection
  const toggleConnection = useCallback((connectionId: string) => {
    setSelectedConnections((prev) => {
      const next = new Set(prev)
      if (next.has(connectionId)) {
        next.delete(connectionId)
      } else {
        next.add(connectionId)
      }
      return next
    })
  }, [])

  // Select all/none
  const selectAll = useCallback(() => {
    setSelectedConnections(new Set(connections.map((c) => c.id)))
  }, [connections])

  const selectNone = useCallback(() => {
    setSelectedConnections(new Set())
  }, [])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Profile name is required')
      return
    }

    if (selectedConnections.size === 0) {
      setError('Select at least one connection')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(name.trim(), Array.from(selectedConnections))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }, [name, selectedConnections, onSave, onClose])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !isSaving) {
      handleSave()
    }
  }, [onClose, handleSave, isSaving])

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
          'w-full max-w-md p-4',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Save Profile</h2>
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

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-2 mb-4 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile name input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            Profile Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter profile name..."
            className={cn(
              'w-full px-3 py-2 rounded-md',
              'bg-background border border-input',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            autoFocus
          />
        </div>

        {/* Connection selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">
              Include Connections
            </label>
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-muted-foreground hover:text-foreground"
              >
                All
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={selectNone}
                className="text-muted-foreground hover:text-foreground"
              >
                None
              </button>
            </div>
          </div>

          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No connections available
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
              {connections.map((conn) => (
                <label
                  key={conn.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded cursor-pointer',
                    'hover:bg-muted/50 transition-colors'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedConnections.has(conn.id)}
                    onChange={() => toggleConnection(conn.id)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-foreground">{conn.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({conn.protocol})
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {selectedConnections.size} of {connections.length} selected
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
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
            disabled={isSaving || !name.trim() || selectedConnections.size === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
})
