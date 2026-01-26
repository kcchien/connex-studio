import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { SidebarV2 } from '@renderer/components/layout/SidebarV2'
import { NewConnectionDialog, ConnectionFormData } from '@renderer/components/connection'
import { DataExplorer, TagDisplayState } from '@renderer/components/explorer'
import { BatchTagDialog } from '@renderer/components/tags'
import { LogViewer, Logo } from '@renderer/components/common'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useTagStore } from '@renderer/stores/tagStore'
import { useUIStore } from '@renderer/stores/uiStore'
import { usePolling } from '@renderer/hooks/usePolling'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'
import type { ConnectionStatus as ConnStatus } from '@shared/types/connection'
import type { Tag } from '@shared/types/tag'

/**
 * AppV2 - Redesigned app with connection-centric navigation
 * Uses SidebarV2, NewConnectionDialog, DataExplorer, BatchTagDialog
 */
function AppV2(): React.ReactElement {
  // Connection store
  const setConnections = useConnectionStore((state) => state.setConnections)
  const handleStatusChanged = useConnectionStore((state) => state.handleStatusChanged)
  const connections = useConnectionStore((state) => state.connections)

  // Tag store
  const tags = useTagStore((state) => state.tags)
  const setTags = useTagStore((state) => state.setTags)
  const tagValues = useTagStore((state) => state.tagValues)

  // UI store
  const newConnectionDialogOpen = useUIStore((state) => state.newConnectionDialogOpen)
  const setNewConnectionDialogOpen = useUIStore((state) => state.setNewConnectionDialogOpen)
  const selectedConnectionId = useUIStore((state) => state.selectedConnectionId)
  const setSelectedConnectionId = useUIStore((state) => state.setSelectedConnectionId)
  const batchTagDialogOpen = useUIStore((state) => state.batchTagDialogOpen)
  const setBatchTagDialogOpen = useUIStore((state) => state.setBatchTagDialogOpen)
  const logViewerOpen = useUIStore((state) => state.logViewerOpen)

  // Keyboard shortcuts
  useKeyboardShortcuts()

  // Get selected connection
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)

  // Initialize polling for selected connection
  usePolling(selectedConnectionId ?? undefined)

  // Map connections to SidebarV2 format
  const sidebarConnections = useMemo(() =>
    connections.map((c) => ({
      id: c.id,
      name: c.name,
      protocol: c.protocol,
      status: c.status,
    })),
    [connections]
  )

  // Get tags for selected connection
  const connectionTags = useMemo(() =>
    selectedConnectionId ? (tags[selectedConnectionId] ?? []) : [],
    [selectedConnectionId, tags]
  )

  // Build display states from tag values
  const displayStates = useMemo<Record<string, TagDisplayState>>(() => {
    const states: Record<string, TagDisplayState> = {}
    for (const tag of connectionTags) {
      const value = tagValues[tag.id]?.value ?? 0
      // Simple alarm logic based on thresholds
      let alarmState: 'normal' | 'warning' | 'alarm' = 'normal'
      if (tag.thresholds?.alarm && typeof value === 'number') {
        if (value >= tag.thresholds.alarm.high || value <= tag.thresholds.alarm.low) {
          alarmState = 'alarm'
        } else if (tag.thresholds?.warning) {
          if (value >= tag.thresholds.warning.high || value <= tag.thresholds.warning.low) {
            alarmState = 'warning'
          }
        }
      }
      states[tag.id] = {
        value,
        alarmState,
        history: [], // Would be populated by DVR
      }
    }
    return states
  }, [connectionTags, tagValues])

  // Handle new connection submission
  const handleConnectionSubmit = useCallback(async (data: ConnectionFormData) => {
    try {
      const result = await window.electronAPI.connection.create(data)
      if (result.success) {
        // Refresh connection list
        const listResult = await window.electronAPI.connection.list()
        setConnections(listResult.connections)
        // Auto-select the new connection
        setSelectedConnectionId(result.id)
        // Close dialog
        setNewConnectionDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to create connection:', error)
    }
  }, [setConnections, setSelectedConnectionId, setNewConnectionDialogOpen])

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    if (!selectedConnectionId) return
    try {
      await window.electronAPI.connection.disconnect(selectedConnectionId)
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }, [selectedConnectionId])

  // Handle batch tag creation
  const handleTagsCreated = useCallback(async (newTags: Partial<Tag>[]) => {
    if (!selectedConnectionId) return
    try {
      for (const tag of newTags) {
        await window.electronAPI.tag.create({
          ...tag,
          connectionId: selectedConnectionId,
        } as Tag)
      }
      // Refresh tags
      const result = await window.electronAPI.tag.list(selectedConnectionId)
      setTags(selectedConnectionId, result.tags)
    } catch (error) {
      console.error('Failed to create tags:', error)
    }
  }, [selectedConnectionId, setTags])

  // Initialize connections on mount
  useEffect(() => {
    const initializeConnections = async () => {
      try {
        const result = await window.electronAPI.connection.list()
        setConnections(result.connections)
      } catch (error) {
        console.error('Failed to load connections:', error)
      }
    }

    initializeConnections()

    // Subscribe to status changes
    const unsubscribe = window.electronAPI.connection.onStatusChanged((payload) => {
      handleStatusChanged(
        payload.connectionId,
        payload.status as ConnStatus,
        payload.error
      )
    })

    return () => {
      unsubscribe()
    }
  }, [setConnections, handleStatusChanged])

  // Load tags when connection changes
  useEffect(() => {
    if (!selectedConnectionId) return

    const loadTags = async () => {
      try {
        const result = await window.electronAPI.tag.list(selectedConnectionId)
        setTags(selectedConnectionId, result.tags)
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }

    loadTags()
  }, [selectedConnectionId, setTags])

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0A0E14]">
      {/* New Connection Dialog */}
      <NewConnectionDialog
        open={newConnectionDialogOpen}
        onOpenChange={setNewConnectionDialogOpen}
        onSubmit={handleConnectionSubmit}
      />

      {/* Batch Tag Dialog */}
      {selectedConnectionId && selectedConnection && (
        <BatchTagDialog
          open={batchTagDialogOpen}
          onOpenChange={setBatchTagDialogOpen}
          connectionId={selectedConnectionId}
          protocol={selectedConnection.protocol}
          onTagsCreated={handleTagsCreated}
        />
      )}

      {/* Sidebar */}
      <SidebarV2
        connections={sidebarConnections}
        selectedConnectionId={selectedConnectionId}
        onNewConnection={() => setNewConnectionDialogOpen(true)}
        onSelectConnection={setSelectedConnectionId}
        userName="Operator"
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {selectedConnectionId && selectedConnection ? (
          <DataExplorer
            connectionName={selectedConnection.name}
            connectionStatus={selectedConnection.status}
            latency={12} // Would come from real metrics
            tags={connectionTags}
            displayStates={displayStates}
            onAddTag={() => setBatchTagDialogOpen(true)}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Logo size={64} className="mx-auto mb-6 opacity-50" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                Welcome to ConneX Studio
              </h2>
              <p className="text-gray-500 mb-6">
                Select a connection or create a new one to get started
              </p>
              <button
                onClick={() => setNewConnectionDialogOpen(true)}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-teal-400 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                New Connection
              </button>
            </div>
          </div>
        )}

        {/* Log Viewer */}
        {logViewerOpen && (
          <div className="border-t border-gray-800 h-48">
            <LogViewer maxHeight="100%" />
          </div>
        )}
      </main>
    </div>
  )
}

export default AppV2
