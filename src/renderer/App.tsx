import React, { useEffect, useCallback, useState } from 'react'
import { AppShell } from '@renderer/components/layout/AppShell'
import { ConnectionForm } from '@renderer/components/connection/ConnectionForm'
import { ConnectionList } from '@renderer/components/connection/ConnectionList'
import { QuickReadPanel } from '@renderer/components/connection/QuickReadPanel'
import { TagEditor, TagGrid, PollingControls } from '@renderer/components/tags'
import { TimelineSlider, PlaybackControls, ModeIndicator } from '@renderer/components/dvr'
import { ProfileList, ProfileDialog, ImportExportButtons } from '@renderer/components/profile'
import { ExportDialog } from '@renderer/components/export'
import { LogViewer, ThemeToggle } from '@renderer/components/common'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useTagStore } from '@renderer/stores/tagStore'
import { useUIStore } from '@renderer/stores/uiStore'
import { usePolling } from '@renderer/hooks/usePolling'
import { useDvr } from '@renderer/hooks/useDvr'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'
import type { ConnectionStatus } from '@shared/types/connection'
import type { Tag } from '@shared/types/tag'

/**
 * Main application component.
 * Wires up AppShell with sidebar content (ConnectionForm + ConnectionList)
 * and main content (QuickReadPanel, TagEditor, TagGrid, PollingControls).
 * Handles initialization of connection list, tag list, and status change subscriptions.
 */
function App(): React.ReactElement {
  const setConnections = useConnectionStore((state) => state.setConnections)
  const handleStatusChanged = useConnectionStore((state) => state.handleStatusChanged)
  const selectedConnectionId = useConnectionStore((state) => state.selectedConnectionId)
  const connections = useConnectionStore((state) => state.connections)

  const setTags = useTagStore((state) => state.setTags)
  const removeTag = useTagStore((state) => state.removeTag)

  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [profileListKey, setProfileListKey] = useState(0) // For refreshing profile list

  // UI Store for log viewer
  const logViewerOpen = useUIStore((state) => state.logViewerOpen)
  const setLogViewerOpen = useUIStore((state) => state.setLogViewerOpen)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  // Get selected connection
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId)
  const isConnected = selectedConnection?.status === 'connected'

  // Initialize polling hook for real-time data
  usePolling(selectedConnectionId ?? undefined)

  // Initialize DVR time-travel functionality
  const {
    isLive,
    playbackTimestamp,
    bufferStartTimestamp,
    bufferEndTimestamp,
    isLoading: isDvrLoading,
    error: dvrError,
    goLive,
    seek
  } = useDvr()

  // Callback when a new connection is created - could be used for auto-selection
  const handleConnectionCreated = useCallback((_connectionId: string) => {
    // Could auto-select the newly created connection here if desired
    // For now, we just let the user select it manually
  }, [])

  // Callback when a tag is saved (created or updated)
  const handleTagSaved = useCallback((_tag: Tag) => {
    setEditingTag(undefined)
    // Tags are already added to store by TagEditor
  }, [])

  // Callback when a tag is deleted
  const handleTagDeleted = useCallback(
    (tagId: string) => {
      removeTag(tagId)
      if (editingTag?.id === tagId) {
        setEditingTag(undefined)
      }
    },
    [removeTag, editingTag]
  )

  // Callback when a tag is selected for editing
  const handleEditTag = useCallback((tag: Tag) => {
    setEditingTag(tag)
  }, [])

  // Profile management callbacks
  const handleSaveProfile = useCallback(async (name: string, connectionIds: string[]) => {
    const result = await window.electronAPI.profile.save({ name, connectionIds })
    if (!result.success) {
      throw new Error(result.error)
    }
    setProfileListKey((k) => k + 1) // Refresh list
  }, [])

  const handleLoadProfile = useCallback(async (name: string) => {
    try {
      const result = await window.electronAPI.profile.load(name)
      if (result.success) {
        // Refresh connections list
        const connResult = await window.electronAPI.connection.list()
        setConnections(connResult.connections)

        if (result.credentialsRequired.length > 0) {
          console.warn('Some connections require credentials:', result.credentialsRequired)
          // Could show a dialog here to prompt for credentials
        }
      } else {
        console.error('Failed to load profile:', result.error)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }, [setConnections])

  const handleExportProfile = useCallback(async (name: string) => {
    try {
      const result = await window.electronAPI.profile.export(name)
      if (!result.success) {
        // Check if cancelled (exists on the result from IPC)
        const cancelled = 'cancelled' in result && result.cancelled
        if (!cancelled) {
          console.error('Failed to export profile:', result.error)
        }
      }
    } catch (err) {
      console.error('Failed to export profile:', err)
    }
  }, [])

  const handleDeleteProfile = useCallback(async (name: string) => {
    try {
      const result = await window.electronAPI.profile.delete(name)
      if (!result.success) {
        console.error('Failed to delete profile:', result.error)
      }
      setProfileListKey((k) => k + 1) // Refresh list
    } catch (err) {
      console.error('Failed to delete profile:', err)
    }
  }, [])

  const handleImportProfile = useCallback(async () => {
    try {
      const result = await window.electronAPI.profile.import()
      if (result.success) {
        setProfileListKey((k) => k + 1) // Refresh list
      } else {
        // Check if cancelled (exists on the result from IPC)
        const cancelled = 'cancelled' in result && result.cancelled
        if (!cancelled) {
          console.error('Failed to import profile:', result.error)
        }
      }
    } catch (err) {
      console.error('Failed to import profile:', err)
    }
  }, [])

  // Export data callback
  const handleExportData = useCallback(
    async (params: {
      format: 'csv' | 'html'
      tagIds: string[]
      startTimestamp: number
      endTimestamp: number
      includeCharts: boolean
    }) => {
      try {
        let result
        if (params.format === 'csv') {
          result = await window.electronAPI.export.csv({
            tagIds: params.tagIds,
            startTimestamp: params.startTimestamp,
            endTimestamp: params.endTimestamp
          })
        } else {
          result = await window.electronAPI.export.htmlReport({
            tagIds: params.tagIds,
            startTimestamp: params.startTimestamp,
            endTimestamp: params.endTimestamp,
            includeCharts: params.includeCharts
          })
        }

        if (!result.success && !result.cancelled) {
          throw new Error(result.error || 'Export failed')
        }
      } catch (err) {
        console.error('Export failed:', err)
        throw err
      }
    },
    []
  )

  // Initialize connection list and subscribe to status changes on mount
  useEffect(() => {
    // Fetch existing connections on mount
    const initializeConnections = async () => {
      try {
        const result = await window.electronAPI.connection.list()
        setConnections(result.connections)
      } catch (error) {
        console.error('Failed to load connections:', error)
      }
    }

    initializeConnections()

    // Subscribe to status changed events
    const unsubscribe = window.electronAPI.connection.onStatusChanged((payload) => {
      handleStatusChanged(
        payload.connectionId,
        payload.status as ConnectionStatus,
        payload.error
      )
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [setConnections, handleStatusChanged])

  // Load tags when selected connection changes
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

  // Sidebar content: ConnectionForm (collapsible) + ConnectionList + Profiles
  const sidebarContent = (
    <div className="flex flex-col gap-4">
      <ConnectionForm onCreated={handleConnectionCreated} />
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Connections
        </h3>
        <ConnectionList />
      </div>

      {/* Profile Management */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Profiles
        </h3>
        <ImportExportButtons
          onSaveClick={() => setIsProfileDialogOpen(true)}
          onImport={handleImportProfile}
          saveDisabled={connections.length === 0}
        />
        <ProfileList
          key={profileListKey}
          onLoad={handleLoadProfile}
          onExport={handleExportProfile}
          onDelete={handleDeleteProfile}
        />
      </div>

      {/* Theme Toggle */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Appearance
        </h3>
        <ThemeToggle />
      </div>

      {/* Log Viewer Toggle */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border">
        <button
          onClick={() => setLogViewerOpen(!logViewerOpen)}
          className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
              <line x1="10" x2="8" y1="9" y2="9" />
            </svg>
            Logs
          </span>
          <span className="text-xs text-muted-foreground">Ctrl+L</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Profile Save Dialog */}
      <ProfileDialog
        isOpen={isProfileDialogOpen}
        connections={connections}
        onClose={() => setIsProfileDialogOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        connectionId={selectedConnectionId}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExportData}
      />

      <AppShell sidebarContent={sidebarContent}>
        <div className="p-4 space-y-4">
        {/* Quick Read Panel */}
        <QuickReadPanel className="max-w-md" />

        {/* Tag Management Section - only show when connection is selected */}
        {selectedConnectionId && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Tags
              {selectedConnection && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({selectedConnection.name})
                </span>
              )}
            </h2>

            {/* Polling Controls - only show when connected */}
            {isConnected && (
              <PollingControls connectionId={selectedConnectionId} />
            )}

            {/* DVR Controls - only show when connected */}
            {isConnected && (
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Time Travel (DVR)</h3>
                  <ModeIndicator
                    isLive={isLive}
                    playbackTimestamp={playbackTimestamp}
                    hasError={!!dvrError}
                  />
                </div>

                <TimelineSlider
                  rangeStart={bufferStartTimestamp}
                  rangeEnd={bufferEndTimestamp}
                  value={playbackTimestamp}
                  isLive={isLive}
                  onChange={seek}
                />

                <PlaybackControls
                  isLive={isLive}
                  playbackTimestamp={playbackTimestamp}
                  bufferStart={bufferStartTimestamp}
                  bufferEnd={bufferEndTimestamp}
                  onGoLive={goLive}
                  onSeek={seek}
                  disabled={isDvrLoading}
                />

                {/* Export Button */}
                <button
                  onClick={() => setIsExportDialogOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Export Data
                </button>
              </div>
            )}

            {/* Tag Editor */}
            {editingTag ? (
              <TagEditor
                connectionId={selectedConnectionId}
                tag={editingTag}
                onSaved={handleTagSaved}
                onCancel={() => setEditingTag(undefined)}
              />
            ) : (
              <TagEditor
                connectionId={selectedConnectionId}
                onSaved={handleTagSaved}
              />
            )}

            {/* Tag Grid */}
            <TagGrid
              connectionId={selectedConnectionId}
              onEditTag={handleEditTag}
              onDeleteTag={handleTagDeleted}
            />
          </div>
        )}

        {/* Placeholder when no connection selected */}
        {!selectedConnectionId && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">Select a connection to manage tags</p>
          </div>
        )}

        {/* Log Viewer Panel */}
        {logViewerOpen && (
          <div className="mt-4">
            <LogViewer maxHeight="300px" />
          </div>
        )}
      </div>
      </AppShell>
    </>
  )
}

export default App
