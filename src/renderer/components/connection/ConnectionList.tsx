/**
 * ConnectionList component displays a list of ConnectionCard components.
 * Gets connections from connectionStore and handles selection state.
 * Hosts Edit and Delete dialogs for connection management.
 */

import React, { useState } from 'react'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useConnection } from '@renderer/hooks/useConnection'
import { ConnectionCard } from './ConnectionCard'
import { EditConnectionDialog } from './EditConnectionDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import type { Connection, ConnectionUpdates } from '@shared/types/connection'

/**
 * Displays a scrollable list of all connections.
 * Shows empty state message when no connections exist.
 * Handles connection selection via store.
 */
export function ConnectionList(): React.ReactElement {
  const connections = useConnectionStore((state) => state.connections)
  const selectedConnectionId = useConnectionStore((state) => state.selectedConnectionId)
  const setSelected = useConnectionStore((state) => state.setSelected)
  const { update, remove } = useConnection()

  // Dialog state - which connection is being edited/deleted
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
  const [deletingConnection, setDeletingConnection] = useState<Connection | null>(null)

  // Handlers for edit/delete operations
  const handleEditConnection = async (connectionId: string, updates: ConnectionUpdates) => {
    await update(connectionId, updates)
    setEditingConnection(null)
  }

  const handleDeleteConnection = async () => {
    if (deletingConnection) {
      await remove(deletingConnection.id)
      setDeletingConnection(null)
    }
  }

  // Empty state
  if (connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No connections yet
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            selected={connection.id === selectedConnectionId}
            onClick={() => setSelected(connection.id)}
            onEditRequest={setEditingConnection}
            onDeleteRequest={setDeletingConnection}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      {editingConnection && (
        <EditConnectionDialog
          open={!!editingConnection}
          onOpenChange={(open) => !open && setEditingConnection(null)}
          connection={editingConnection}
          onSave={handleEditConnection}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingConnection && (
        <DeleteConfirmDialog
          open={!!deletingConnection}
          onOpenChange={(open) => !open && setDeletingConnection(null)}
          connectionName={deletingConnection.name}
          onConfirm={handleDeleteConnection}
        />
      )}
    </>
  )
}
