/**
 * TagBatchActions Component
 *
 * Displays batch action bar when tags are selected.
 * Provides actions like delete, export, and cancel selection.
 */

import React from 'react'
import { Trash2, Download, X, CheckSquare } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTagStore } from '@renderer/stores/tagStore'

export interface TagBatchActionsProps {
  /** Connection ID for the tags */
  connectionId: string
  /** Callback when delete is requested */
  onDelete?: (tagIds: string[]) => void
  /** Callback when export is requested */
  onExport?: (tagIds: string[]) => void
  /** Optional additional className */
  className?: string
}

/**
 * Batch action bar that appears when tags are selected.
 * Shows selected count and action buttons.
 */
export function TagBatchActions({
  connectionId,
  onDelete,
  onExport,
  className
}: TagBatchActionsProps): React.ReactElement | null {
  const selectedTagIds = useTagStore((state) => state.selectedTagIds)
  const clearSelection = useTagStore((state) => state.clearSelection)

  const selectedCount = selectedTagIds.size

  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null
  }

  const selectedArray = Array.from(selectedTagIds)

  const handleDelete = () => {
    onDelete?.(selectedArray)
  }

  const handleExport = () => {
    onExport?.(selectedArray)
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
        {/* Export button */}
        <button
          type="button"
          onClick={handleExport}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
            'text-sm font-medium',
            'bg-muted hover:bg-muted/80',
            'text-foreground',
            'border border-border',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          data-testid="batch-export-button"
        >
          <Download className="h-4 w-4" />
          Export
        </button>

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
