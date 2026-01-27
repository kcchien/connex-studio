/**
 * ConnectionMenu - Dropdown menu with Edit/Delete actions for a connection.
 */

import React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Connection } from '@shared/types/connection'

export interface ConnectionMenuProps {
  connection: Connection
  onEdit: () => void
  onDelete: () => void
}

export function ConnectionMenu({
  connection,
  onEdit,
  onDelete
}: ConnectionMenuProps): React.ReactElement {
  const isConnected = connection.status === 'connected' || connection.status === 'connecting'
  const canDelete = !isConnected

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'p-1.5 rounded-md transition-colors',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'min-w-[140px] rounded-lg p-1',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
          sideOffset={5}
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'cursor-pointer outline-none',
              'data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700'
            )}
            onSelect={onEdit}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px my-1 bg-gray-200 dark:bg-gray-700" />

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
              'cursor-pointer outline-none',
              canDelete
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            )}
            onSelect={canDelete ? onDelete : undefined}
            disabled={!canDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
