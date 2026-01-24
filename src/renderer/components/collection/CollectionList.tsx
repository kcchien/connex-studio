/**
 * CollectionList Component
 *
 * Displays a list of request collections with selection support.
 * Shows collection name, request count, and last run status.
 */

import React, { memo, useCallback } from 'react'
import {
  FolderOpen,
  Play,
  MoreVertical,
  Plus
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Collection } from '@shared/types'

interface CollectionListProps {
  /** List of collections */
  collections: Collection[]
  /** Currently selected collection ID */
  selectedId: string | null
  /** Callback when collection is selected */
  onSelect: (id: string) => void
  /** Callback when collection should run */
  onRun?: (id: string) => void
  /** Callback when "Add new" is clicked */
  onAddNew?: () => void
  /** Callback when collection menu is opened */
  onOpenMenu?: (id: string, event: React.MouseEvent) => void
  /** Optional additional className */
  className?: string
}

interface CollectionItemProps {
  collection: Collection
  isSelected: boolean
  onSelect: () => void
  onRun?: () => void
  onOpenMenu?: (event: React.MouseEvent) => void
}

const CollectionItem = memo(function CollectionItem({
  collection,
  isSelected,
  onSelect,
  onRun,
  onOpenMenu
}: CollectionItemProps): React.ReactElement {
  const requestCount = collection.requests?.length ?? 0

  const handleRun = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onRun?.()
  }, [onRun])

  const handleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenMenu?.(e)
  }, [onOpenMenu])

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer',
        'border border-transparent',
        'hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted border-border'
      )}
    >
      {/* Icon */}
      <FolderOpen className={cn(
        'h-4 w-4 flex-shrink-0',
        isSelected ? 'text-primary' : 'text-muted-foreground'
      )} />

      {/* Collection info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-foreground' : 'text-foreground/80'
          )}>
            {collection.name}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {requestCount} request{requestCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        {onRun && (
          <button
            onClick={handleRun}
            className={cn(
              'p-1 rounded text-muted-foreground',
              'hover:text-primary hover:bg-primary/10',
              'transition-colors'
            )}
            title="Run collection"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {onOpenMenu && (
          <button
            onClick={handleMenu}
            className={cn(
              'p-1 rounded text-muted-foreground',
              'hover:text-foreground hover:bg-muted',
              'transition-colors'
            )}
            title="More options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
})

/**
 * CollectionList for displaying request collections.
 */
export const CollectionList = memo(function CollectionList({
  collections,
  selectedId,
  onSelect,
  onRun,
  onAddNew,
  onOpenMenu,
  className
}: CollectionListProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">Collections</span>
        {onAddNew && (
          <button
            onClick={onAddNew}
            className={cn(
              'p-1 rounded text-muted-foreground',
              'hover:text-primary hover:bg-primary/10',
              'transition-colors'
            )}
            title="New collection"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collection list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {collections.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No collections yet.
            {onAddNew && (
              <button
                onClick={onAddNew}
                className="block mx-auto mt-2 text-primary hover:underline"
              >
                Create your first collection
              </button>
            )}
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection.id} className="group">
              <CollectionItem
                collection={collection}
                isSelected={selectedId === collection.id}
                onSelect={() => onSelect(collection.id)}
                onRun={onRun ? () => onRun(collection.id) : undefined}
                onOpenMenu={onOpenMenu ? (e) => onOpenMenu(collection.id, e) : undefined}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
})
