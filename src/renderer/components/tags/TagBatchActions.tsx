/**
 * TagBatchActions Component
 *
 * Displays batch action bar when tags are selected.
 * Provides actions like delete and cancel selection.
 */

import React, { useMemo } from 'react'
import { Trash2, X, CheckSquare } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTagStore } from '@renderer/stores/tagStore'

export interface TagBatchActionsProps {
  /** Connection ID for the tags */
  connectionId: string
  /** Callback when delete is requested */
  onDelete?: (tagIds: string[]) => void
  /** Optional additional className */
  className?: string
}

/**
 * Batch action bar that appears when tags are selected.
 * Shows selected count and action buttons.
 * Only counts tags that belong to the current connection.
 */
export function TagBatchActions({
  connectionId,
  onDelete,
  className
}: TagBatchActionsProps): React.ReactElement | null {
  const selectedTagIds = useTagStore((state) => state.selectedTagIds)
  const getTags = useTagStore((state) => state.getTags)
  const clearSelection = useTagStore((state) => state.clearSelection)

  // Get tags for current connection and filter selected ones
  const connectionTags = getTags(connectionId)
  const connectionTagIds = useMemo(
    () => new Set(connectionTags.map(t => t.id)),
    [connectionTags]
  )

  // Only count selected tags that belong to this connection
  const selectedInConnection = useMemo(
    () => Array.from(selectedTagIds).filter(id => connectionTagIds.has(id)),
    [selectedTagIds, connectionTagIds]
  )

  const selectedCount = selectedInConnection.length

  // Don't render if nothing is selected in this connection
  if (selectedCount === 0) {
    return null
  }

  const handleDelete = () => {
    onDelete?.(selectedInConnection)
  }

  const handleCancel = () => {
    clearSelection()
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3',
        'bg-blue-500/10 border border-blue-500/30 rounded-lg',
        'animate-in slide-in-from-bottom-2 duration-200',
        className
      )}
      data-testid="tag-batch-actions"
    >
      {/* Selected count */}
      <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
        <CheckSquare className="h-4 w-4" />
        <span data-testid="selected-count">
          {selectedCount} selected
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
            'text-sm font-medium',
            'bg-destructive/10 hover:bg-destructive/20',
            'text-destructive',
            'border border-destructive/30',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          data-testid="batch-delete-button"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>

        {/* Cancel button */}
        <button
          type="button"
          onClick={handleCancel}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
            'text-sm font-medium',
            'bg-transparent hover:bg-muted',
            'text-muted-foreground hover:text-foreground',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          data-testid="batch-cancel-button"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}

export default TagBatchActions
