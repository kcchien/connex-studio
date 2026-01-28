import React, { useState, useCallback } from 'react'
import { cn } from '@renderer/lib/utils'
import {
  Activity,
  Plus,
  PowerOff,
  Plug,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react'
import type { Tag } from '@shared/types/tag'
import type { ConnectionMetrics, FrameLog } from '@shared/types'
import { TagRow } from './TagRow'
import { TagDetailPanel, PollingControls, TagGrid, TagBatchActions, DeleteTagsDialog } from '@renderer/components/tags'
import { ConnectionStatusBar } from './ConnectionStatusBar'
import { FrameDiagnostics } from '@renderer/components/diagnostics'
import type { TagDisplayState as StoreTagDisplayState } from '@renderer/stores/tagStore'
import { useTagStore } from '@renderer/stores/tagStore'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

// Local display state for DataExplorer (backward compatible)
export interface TagDisplayState {
  value: number | string | boolean
  alarmState: 'normal' | 'warning' | 'alarm'
  history?: number[]
}

// Convert local display state to store format for TagDetailPanel
function toStoreDisplayState(tagId: string, local: TagDisplayState): StoreTagDisplayState {
  return {
    tagId,
    currentValue: local.value,
    quality: 'good',
    timestamp: Date.now(),
    sparklineData: local.history || [],
    alarmState: local.alarmState,
    trend: 'stable',
    status: local.alarmState === 'alarm' ? 'error' : local.alarmState === 'warning' ? 'timeout' : 'normal',
    consecutiveFailures: 0,
    isThrottled: false,
  }
}

export interface DataExplorerProps {
  connectionId: string
  connectionName: string
  connectionStatus: ConnectionStatus
  /** Last error message when status is 'error' */
  lastError?: string
  metrics?: ConnectionMetrics
  tags: Tag[]
  displayStates: Record<string, TagDisplayState>
  onAddTag: () => void
  onConnect: () => void
  onDisconnect: () => void
  /** Callback to edit connection settings */
  onEditConnection?: () => void
  onTagSelect?: (tagId: string) => void
  onRemoveTag?: (tagId: string) => void
  /** Frame diagnostics data */
  frameLogs?: FrameLog[]
  /** Whether frame logging is enabled */
  frameLoggingEnabled?: boolean
  /** Callback to toggle frame logging */
  onFrameLoggingToggle?: (enabled: boolean) => void
  /** Callback to clear frame logs */
  onFrameLogsClear?: () => void
}

const statusConfig: Record<ConnectionStatus, { icon: typeof Wifi; color: string; label: string }> = {
  connected: { icon: Wifi, color: 'text-green-400', label: 'Connected' },
  connecting: { icon: Loader2, color: 'text-yellow-400 animate-spin', label: 'Connecting' },
  disconnected: { icon: WifiOff, color: 'text-gray-500', label: 'Disconnected' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
}

/**
 * DataExplorer - Main data exploration view for a connection
 * Shows connection status, tag list with live values, and tag details panel
 */
/**
 * Get user-friendly error message with actionable guidance
 */
function getErrorGuidance(error?: string): { message: string; suggestion: string } {
  if (!error) {
    return { message: 'Unknown error', suggestion: 'Check connection settings' }
  }

  // Connection refused - server not running or wrong port
  if (error.includes('ECONNREFUSED')) {
    const match = error.match(/ECONNREFUSED\s+([\d.]+):(\d+)/)
    if (match) {
      return {
        message: `Connection refused at ${match[1]}:${match[2]}`,
        suggestion: 'Check if server is running or verify host/port in settings'
      }
    }
    return {
      message: 'Connection refused',
      suggestion: 'Check if server is running or verify host/port in settings'
    }
  }

  // Timeout
  if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
    return {
      message: 'Connection timed out',
      suggestion: 'Server may be unreachable or blocked by firewall'
    }
  }

  // DNS resolution failed
  if (error.includes('ENOTFOUND') || error.includes('getaddrinfo')) {
    return {
      message: 'Host not found',
      suggestion: 'Check hostname spelling or use IP address'
    }
  }

  // Network unreachable
  if (error.includes('ENETUNREACH')) {
    return {
      message: 'Network unreachable',
      suggestion: 'Check network connection'
    }
  }

  // Default
  return {
    message: error.length > 50 ? error.substring(0, 50) + '...' : error,
    suggestion: 'Check connection settings'
  }
}

export function DataExplorer({
  connectionId,
  connectionName,
  connectionStatus,
  lastError,
  metrics,
  tags,
  displayStates,
  onAddTag,
  onConnect,
  onDisconnect,
  onEditConnection,
  onTagSelect,
  onRemoveTag,
  frameLogs = [],
  frameLoggingEnabled = false,
  onFrameLoggingToggle,
  onFrameLogsClear,
}: DataExplorerProps): React.ReactElement {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagsToDelete, setTagsToDelete] = useState<string[]>([])

  // Batch selection state from store
  const selectedTagIds = useTagStore((state) => state.selectedTagIds)
  const clearSelection = useTagStore((state) => state.clearSelection)

  // Frame logging handlers (use local state fallback if no callbacks provided)
  const [localFrameLogging, setLocalFrameLogging] = useState(false)
  const isFrameLoggingEnabled = onFrameLoggingToggle ? frameLoggingEnabled : localFrameLogging

  const handleFrameLoggingToggle = useCallback((enabled: boolean) => {
    if (onFrameLoggingToggle) {
      onFrameLoggingToggle(enabled)
    } else {
      setLocalFrameLogging(enabled)
    }
  }, [onFrameLoggingToggle])

  const handleFrameLogsClear = useCallback(() => {
    onFrameLogsClear?.()
  }, [onFrameLogsClear])

  const status = statusConfig[connectionStatus]
  const StatusIcon = status.icon
  const selectedTag = selectedTagId ? tags.find(t => t.id === selectedTagId) : null
  const selectedDisplayState = selectedTagId ? displayStates[selectedTagId] : null

  const handleTagClick = (tagId: string) => {
    setSelectedTagId(tagId)
    onTagSelect?.(tagId)
  }

  const handleCloseDetails = () => {
    setSelectedTagId(null)
  }

  // Batch delete handler
  const handleBatchDelete = useCallback((tagIds: string[]) => {
    setTagsToDelete(tagIds)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteDialogClose = useCallback(() => {
    setDeleteDialogOpen(false)
    setTagsToDelete([])
  }, [])

  const handleTagsDeleted = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d1117]">
      {/* Connection Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{connectionName}</h1>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('w-4 h-4', status.color)} />
            <span className={cn('text-sm', status.color)}>{status.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddTag}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              'bg-gradient-to-r from-blue-500 to-teal-400',
              'text-white text-sm font-medium',
              'hover:shadow-lg hover:shadow-blue-500/25',
              'transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            Add Tag
          </button>
          {/* Connection Toggle Button */}
          {connectionStatus === 'connecting' ? (
            <button
              disabled
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700',
                'text-yellow-700 dark:text-yellow-400 text-sm',
                'cursor-not-allowed opacity-75'
              )}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </button>
          ) : connectionStatus === 'connected' ? (
            <button
              onClick={onDisconnect}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800',
                'text-red-600 dark:text-red-400 text-sm',
                'hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-400 dark:hover:border-red-700',
                'transition-colors'
              )}
            >
              <PowerOff className="w-4 h-4" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800',
                'text-green-600 dark:text-green-400 text-sm',
                'hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-400 dark:hover:border-green-700',
                'transition-colors'
              )}
            >
              <Plug className="w-4 h-4" />
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Error Message Bar - show when in error state */}
      {connectionStatus === 'error' && lastError && (
        <div className="flex items-center justify-between px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {getErrorGuidance(lastError).message}
              </span>
              <span className="text-xs text-red-600 dark:text-red-400">
                {getErrorGuidance(lastError).suggestion}
              </span>
            </div>
          </div>
          {onEditConnection && (
            <button
              onClick={onEditConnection}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700',
                'text-red-700 dark:text-red-300 text-sm font-medium',
                'hover:bg-red-200 dark:hover:bg-red-900/60 hover:border-red-400 dark:hover:border-red-600',
                'transition-colors'
              )}
            >
              <Settings className="w-4 h-4" />
              Edit Settings
            </button>
          )}
        </div>
      )}

      {/* Polling Controls - show when tags exist, disabled when not connected */}
      {tags.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <PollingControls
            connectionId={connectionId}
            disabled={connectionStatus !== 'connected'}
            disabledMessage={connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to enable polling'}
          />
        </div>
      )}

      {/* Connection Status Bar */}
      {metrics && connectionStatus === 'connected' && (
        <ConnectionStatusBar metrics={metrics} />
      )}

      {/* Batch Actions Bar - shows when tags are selected */}
      {selectedTagIds.size > 0 && (
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-800">
          <TagBatchActions
            connectionId={connectionId}
            onDelete={handleBatchDelete}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tag List with batch selection */}
        <div className={cn(
          'flex-1 overflow-y-auto p-4',
          selectedTag ? 'border-r border-gray-200 dark:border-gray-800' : ''
        )}>
          {tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Activity className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg text-gray-600 dark:text-gray-400">No tags configured</p>
              <p className="text-sm">Click "Add Tag" to start monitoring</p>
            </div>
          ) : (
            <TagGrid
              connectionId={connectionId}
              onEditTag={(tag) => handleTagClick(tag.id)}
              onDeleteTag={(tagId) => {
                // Show confirmation dialog for single tag delete
                setTagsToDelete([tagId])
                setDeleteDialogOpen(true)
              }}
            />
          )}
        </div>

        {/* Tag Details Panel */}
        {selectedTag && (
          <TagDetailPanel
            tag={selectedTag}
            displayState={selectedDisplayState ? toStoreDisplayState(selectedTag.id, selectedDisplayState) : undefined}
            onClose={handleCloseDetails}
            onDelete={(tagId) => {
              // Show confirmation dialog for single tag delete
              setTagsToDelete([tagId])
              setDeleteDialogOpen(true)
            }}
          />
        )}
      </div>

      {/* Frame Diagnostics Panel */}
      <FrameDiagnostics
        frames={frameLogs}
        enabled={isFrameLoggingEnabled}
        onToggleEnabled={handleFrameLoggingToggle}
        onClear={handleFrameLogsClear}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteTagsDialog
        isOpen={deleteDialogOpen}
        tagIds={tagsToDelete}
        onClose={handleDeleteDialogClose}
        onDeleted={handleTagsDeleted}
      />
    </div>
  )
}
