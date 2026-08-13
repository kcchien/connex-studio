import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarV2, type ToolId } from '@renderer/components/layout/SidebarV2'
import {
  NewConnectionDialog,
  ConnectionFormData,
  EditConnectionDialog,
  DeleteConfirmDialog
} from '@renderer/components/connection'
import { DataExplorer, TagDisplayState } from '@renderer/components/explorer'
import { BatchTagDialog } from '@renderer/components/tags'
import { LogViewer, Logo, ToastContainer, UpdateBanner } from '@renderer/components/common'
import { ProfileDialog } from '@renderer/components/profile/ProfileDialog'
import { ProfileList } from '@renderer/components/profile/ProfileList'
import { SettingsDialog } from '@renderer/components/settings/SettingsDialog'
import { CrcCalculator, ByteOrderConverter, FloatDecoder, PacketAnalyzer } from '@renderer/components/calculator'
import { HelpPanel } from '@renderer/components/help/HelpPanel'
import { LayoutDashboard, Bell, Shuffle, HardDrive } from 'lucide-react'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useTagStore } from '@renderer/stores/tagStore'
import { useUIStore } from '@renderer/stores/uiStore'
import { usePolling } from '@renderer/hooks/usePolling'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'
import type {
  Connection,
  ConnectionStatus as ConnStatus,
  ConnectionMetrics,
  ConnectionUpdates
} from '@shared/types/connection'
import type { Tag } from '@shared/types/tag'

const toolMeta: Record<Exclude<ToolId, 'calculator'>, { icon: typeof LayoutDashboard; titleKey: string; descKey: string }> = {
  dashboard: { icon: LayoutDashboard, titleKey: 'tools.dashboardTitle', descKey: 'tools.dashboardDesc' },
  alerts: { icon: Bell, titleKey: 'tools.alertsTitle', descKey: 'tools.alertsDesc' },
  bridge: { icon: Shuffle, titleKey: 'tools.bridgeTitle', descKey: 'tools.bridgeDesc' },
  dvr: { icon: HardDrive, titleKey: 'tools.dvrTitle', descKey: 'tools.dvrDesc' },
}

function ToolPlaceholder({ tool }: { tool: ToolId }): React.ReactElement {
  const { t } = useTranslation('layout')
  if (tool === 'calculator') return <div /> // handled separately
  const meta = toolMeta[tool]
  const Icon = meta.icon
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-transparent">
      <div className="text-center max-w-sm">
        <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(meta.titleKey)}</h2>
        <p className="text-gray-500 dark:text-gray-500 text-sm leading-relaxed">{t(meta.descKey)}</p>
      </div>
    </div>
  )
}

/**
 * App - Main application with connection-centric navigation
 * Uses SidebarV2, NewConnectionDialog, DataExplorer, BatchTagDialog
 */
function App(): React.ReactElement {
  const { t } = useTranslation('layout')

  // Connection store
  const setConnections = useConnectionStore((state) => state.setConnections)
  const handleStatusChanged = useConnectionStore((state) => state.handleStatusChanged)
  const connections = useConnectionStore((state) => state.connections)
  const setMetrics = useConnectionStore((state) => state.setMetrics)
  const clearMetrics = useConnectionStore((state) => state.clearMetrics)
  const metricsMap = useConnectionStore((state) => state.metrics)

  // Tag store
  const tagsByConnection = useTagStore((state) => state.tagsByConnection)
  const setTags = useTagStore((state) => state.setTags)
  const displayStates = useTagStore((state) => state.displayStates)

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

  // Edit/Delete dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [connectionToEdit, setConnectionToEdit] = useState<Connection | null>(null)
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null)

  // Profile dialog state
  const [profileSaveOpen, setProfileSaveOpen] = useState(false)
  const [profileListOpen, setProfileListOpen] = useState(false)

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Tool navigation state
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null)

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
    selectedConnectionId ? (tagsByConnection.get(selectedConnectionId) ?? []) : [],
    [selectedConnectionId, tagsByConnection]
  )

  // Get metrics for selected connection
  const connectionMetrics = useMemo<ConnectionMetrics | undefined>(() =>
    selectedConnectionId ? metricsMap.get(selectedConnectionId) : undefined,
    [selectedConnectionId, metricsMap]
  )

  // Build display states from tag values for DataExplorer
  const tagDisplayStates = useMemo<Record<string, TagDisplayState>>(() => {
    const states: Record<string, TagDisplayState> = {}
    for (const tag of connectionTags) {
      const tagState = displayStates.get(tag.id)
      const value = tagState?.currentValue ?? 0
      states[tag.id] = {
        value,
        alarmState: tagState?.alarmState ?? 'normal',
        history: tagState?.sparklineData ?? [],
      }
    }
    return states
  }, [connectionTags, displayStates])

  // Handle new connection submission
  const handleConnectionSubmit = useCallback(async (data: ConnectionFormData) => {
    try {
      const result = await window.electronAPI.connection.create(data)
      if (result.success) {
        const connectionId = result.connection.id

        // Connect to the newly created connection
        try {
          await window.electronAPI.connection.connect(connectionId)
        } catch (connectError) {
          console.warn('Auto-connect failed:', connectError)
          // Continue anyway - user can manually reconnect
        }

        // Refresh connection list to get updated status
        const listResult = await window.electronAPI.connection.list()
        setConnections(listResult.connections)
        // Auto-select the new connection
        setSelectedConnectionId(connectionId)
        // Close dialog
        setNewConnectionDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to create connection:', error)
    }
  }, [setConnections, setSelectedConnectionId, setNewConnectionDialogOpen])

  // Handle connect
  const handleConnect = useCallback(async () => {
    if (!selectedConnectionId) return
    try {
      await window.electronAPI.connection.connect(selectedConnectionId)
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }, [selectedConnectionId])

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    if (!selectedConnectionId) return
    try {
      await window.electronAPI.connection.disconnect(selectedConnectionId)
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }, [selectedConnectionId])

  // Handle edit connection
  const handleEditConnection = useCallback((connection: Connection) => {
    setConnectionToEdit(connection)
    setEditDialogOpen(true)
  }, [])

  // Handle save connection edits
  const handleSaveConnection = useCallback(async (connectionId: string, updates: ConnectionUpdates) => {
    try {
      await window.electronAPI.connection.update({ connectionId, updates })
      // Refresh connection list
      const listResult = await window.electronAPI.connection.list()
      setConnections(listResult.connections)
      setEditDialogOpen(false)
      setConnectionToEdit(null)
    } catch (error) {
      console.error('Failed to update connection:', error)
    }
  }, [setConnections])

  // Handle delete connection
  const handleDeleteConnection = useCallback((connection: Connection) => {
    setConnectionToDelete(connection)
    setDeleteDialogOpen(true)
  }, [])

  // Handle confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!connectionToDelete) return
    try {
      await window.electronAPI.connection.delete(connectionToDelete.id)
      // Refresh connection list
      const listResult = await window.electronAPI.connection.list()
      setConnections(listResult.connections)
      // Clear selection if deleted connection was selected
      if (selectedConnectionId === connectionToDelete.id) {
        setSelectedConnectionId(null)
      }
      setDeleteDialogOpen(false)
      setConnectionToDelete(null)
    } catch (error) {
      console.error('Failed to delete connection:', error)
    }
  }, [connectionToDelete, selectedConnectionId, setConnections, setSelectedConnectionId])

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

  // Handle profile save
  const handleProfileSave = useCallback(async (name: string, connectionIds: string[]) => {
    await window.electronAPI.profile.save({ name, connectionIds })
    setProfileSaveOpen(false)
  }, [])

  // Handle profile load
  const handleProfileLoad = useCallback(async (name: string) => {
    try {
      const result = await window.electronAPI.profile.load(name)
      if (result.success) {
        // Refresh connection list to show restored connections
        const listResult = await window.electronAPI.connection.list()
        setConnections(listResult.connections)
        setProfileListOpen(false)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }, [setConnections])

  // Handle profile export
  const handleProfileExport = useCallback(async (name: string) => {
    await window.electronAPI.profile.export(name)
  }, [])

  // Handle profile delete
  const handleProfileDelete = useCallback(async (name: string) => {
    await window.electronAPI.profile.delete(name)
  }, [])

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
    const unsubscribeStatus = window.electronAPI.connection.onStatusChanged((payload) => {
      handleStatusChanged(
        payload.connectionId,
        payload.status as ConnStatus,
        payload.error
      )
      // Clear metrics when disconnected
      if (payload.status === 'disconnected' || payload.status === 'error') {
        clearMetrics(payload.connectionId)
      }
    })

    // Subscribe to metrics changes
    const unsubscribeMetrics = window.electronAPI.connection.onMetricsChanged((payload) => {
      setMetrics(payload.connectionId, payload.metrics)
    })

    return () => {
      unsubscribeStatus()
      unsubscribeMetrics()
    }
  }, [setConnections, handleStatusChanged, setMetrics, clearMetrics])

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
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100 dark:bg-[#0A0E14]">
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
          connectionStatus={selectedConnection.status}
          onTagsCreated={handleTagsCreated}
        />
      )}

      {/* Edit Connection Dialog */}
      {connectionToEdit && (
        <EditConnectionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          connection={connectionToEdit}
          onSave={handleSaveConnection}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {connectionToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          connectionName={connectionToDelete.name}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Profile Save Dialog */}
      <ProfileDialog
        isOpen={profileSaveOpen}
        connections={connections}
        onClose={() => setProfileSaveOpen(false)}
        onSave={handleProfileSave}
      />

      {/* Profile List Dialog (load/manage) */}
      {profileListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-[500px] max-h-[600px] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('sidebar.loadProfile')}
              </h2>
              <button
                onClick={() => setProfileListOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                &times;
              </button>
            </div>
            <ProfileList
              onLoad={handleProfileLoad}
              onExport={handleProfileExport}
              onDelete={handleProfileDelete}
            />
          </div>
        </div>
      )}

      {/* Sidebar */}
      <SidebarV2
        connections={sidebarConnections}
        fullConnections={connections}
        selectedConnectionId={selectedConnectionId}
        onNewConnection={() => setNewConnectionDialogOpen(true)}
        onSelectConnection={(id) => { setSelectedConnectionId(id); setSelectedTool(null) }}
        onEditConnection={handleEditConnection}
        onDeleteConnection={handleDeleteConnection}
        onSaveProfile={() => setProfileSaveOpen(true)}
        onLoadProfile={() => setProfileListOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        selectedTool={selectedTool}
        onSelectTool={(tool) => {
          setSelectedTool(tool)
          if (tool) setSelectedConnectionId(null)
        }}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <UpdateBanner />
        {selectedTool === 'calculator' ? (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0d1117]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('tools.calculatorTitle')}</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CrcCalculator />
              <FloatDecoder />
              <ByteOrderConverter />
              <PacketAnalyzer />
            </div>
          </div>
        ) : selectedTool ? (
          <ToolPlaceholder tool={selectedTool} />
        ) : selectedConnectionId && selectedConnection ? (
          <DataExplorer
            connectionId={selectedConnectionId}
            connectionName={selectedConnection.name}
            connectionStatus={selectedConnection.status}
            lastError={selectedConnection.lastError}
            metrics={connectionMetrics}
            tags={connectionTags}
            displayStates={tagDisplayStates}
            onAddTag={() => setBatchTagDialogOpen(true)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onEditConnection={() => handleEditConnection(selectedConnection)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-transparent">
            <div className="text-center">
              <Logo size={64} className="mx-auto mb-6 opacity-50" />
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('welcome.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                {t('welcome.description')}
              </p>
              <button
                onClick={() => setNewConnectionDialogOpen(true)}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-teal-400 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                {t('welcome.newConnection')}
              </button>
            </div>
          </div>
        )}

        {/* Log Viewer */}
        {logViewerOpen && (
          <div className="border-t border-gray-200 dark:border-gray-800 h-48">
            <LogViewer maxHeight="100%" />
          </div>
        )}
      </main>
      <ToastContainer />
      <HelpPanel />
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default App
