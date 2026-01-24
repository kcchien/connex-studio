/**
 * ConnectionList component displays a list of ConnectionCard components.
 * Gets connections from connectionStore and handles selection state.
 */

import React from 'react'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { ConnectionCard } from './ConnectionCard'

/**
 * Displays a scrollable list of all connections.
 * Shows empty state message when no connections exist.
 * Handles connection selection via store.
 */
export function ConnectionList(): React.ReactElement {
  const connections = useConnectionStore((state) => state.connections)
  const selectedConnectionId = useConnectionStore((state) => state.selectedConnectionId)
  const setSelected = useConnectionStore((state) => state.setSelected)

  // Empty state
  if (connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No connections yet
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {connections.map((connection) => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          selected={connection.id === selectedConnectionId}
          onClick={() => setSelected(connection.id)}
        />
      ))}
    </div>
  )
}
