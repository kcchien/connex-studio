/**
 * DeleteTagsDialog Component
 *
 * Confirmation dialog for batch tag deletion.
 * Shows the count of tags to be deleted and requires confirmation.
 */

import React, { useState, useCallback } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTagStore } from '@renderer/stores/tagStore'

export interface DeleteTagsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Tag IDs to delete */
  tagIds: string[]
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when deletion is complete */
  onDeleted?: () => void
}

/**
 * Confirmation dialog for deleting multiple tags.
 * Handles the deletion API call and shows loading state.
 */
export function DeleteTagsDialog({
  isOpen,
  tagIds,
  onClose,
  onDeleted
}: DeleteTagsDialogProps): React.ReactElement | null {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeTags = useTagStore((state) => state.removeTags)
  const clearSelection = useTagStore((state) => state.clearSelection)

  const handleDelete = useCallback(async () => {
    if (tagIds.length === 0) return

    setIsDeleting(true)
    setError(null)

    try {
      // Delete tags via IPC
      const results = await Promise.all(
        tagIds.map((tagId) => window.electronAPI.tag.delete(tagId))
      )

      // Check for any failures
      const failures = results.filter((r) => !r.success)
      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} tag(s)`)
        return
      }

      // Update store
      removeTags(tagIds)
      clearSelection()

      // Close dialog and notify parent
      onClose()
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tags')
    } finally {
      setIsDeleting(false)
    }
  }, [tagIds, removeTags, clearSelection, onClose, onDeleted])

  const handleCancel = useCallback(() => {
    if (!isDeleting) {
      onClose()
    }
  }, [isDeleting, onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isDeleting) {
        onClose()
      }
    },
    [isDeleting, onClose]
  )

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) {
    return null
  }

  const count = tagIds.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      data-testid="delete-tags-dialog-backdrop"
    >
      <div
        className={cn(
          'w-full max-w-md p-6 rounded-lg shadow-lg',
          'bg-card border border-border',
          'animate-in zoom-in-95 duration-200'
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        data-testid="delete-tags-dialog"
      >
        {/* Icon and title */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              Delete {count} {count === 1 ? 'tag' : 'tags'}?
            </h2>
            <p
              id="delete-dialog-description"
              className="mt-2 text-sm text-muted-foreground"
            >
              This action cannot be undone. The selected {count === 1 ? 'tag' : 'tags'} will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            className={cn(
              'px-4 py-2 rounded-md',
              'text-sm font-medium',
              'bg-muted hover:bg-muted/80',
              'text-foreground',
              'border border-border',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            data-testid="delete-dialog-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'px-4 py-2 rounded-md',
              'text-sm font-medium',
              'bg-destructive hover:bg-destructive/90',
              'text-destructive-foreground',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            data-testid="delete-dialog-confirm"
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteTagsDialog
