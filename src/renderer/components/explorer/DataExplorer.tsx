import React, { useState } from 'react'
import { cn } from '@renderer/lib/utils'
import {
  Activity,
  Plus,
  Power,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { Tag } from '@shared/types/tag'
import { TagRow } from './TagRow'
import { TagDetails } from './TagDetails'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface TagDisplayState {
  value: number | string | boolean
  alarmState: 'normal' | 'warning' | 'alarm'
  history?: number[]
}

export interface DataExplorerProps {
  connectionName: string
  connectionStatus: ConnectionStatus
  latency?: number
  tags: Tag[]
  displayStates: Record<string, TagDisplayState>
  onAddTag: () => void
  onDisconnect: () => void
  onTagSelect?: (tagId: string) => void
  onRemoveTag?: (tagId: string) => void
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
export function DataExplorer({
  connectionName,
  connectionStatus,
  latency,
  tags,
  displayStates,
  onAddTag,
  onDisconnect,
  onTagSelect,
  onRemoveTag,
}: DataExplorerProps): React.ReactElement {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)

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
          {latency !== undefined && connectionStatus === 'connected' && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Activity className="w-4 h-4" />
              <span className="text-sm">{latency}ms</span>
            </div>
          )}
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
          <button
            onClick={onDisconnect}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300 text-sm',
              'hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
              'transition-colors'
            )}
          >
            <Power className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tag List */}
        <div className={cn(
          'flex-1 overflow-y-auto',
          selectedTag ? 'border-r border-gray-200 dark:border-gray-800' : ''
        )}>
          {tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Activity className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg text-gray-600 dark:text-gray-400">No tags configured</p>
              <p className="text-sm">Click "Add Tag" to start monitoring</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {tags.map(tag => {
                const displayState = displayStates[tag.id]
                return (
                  <TagRow
                    key={tag.id}
                    tag={tag}
                    value={displayState?.value}
                    alarmState={displayState?.alarmState || 'normal'}
                    history={displayState?.history}
                    isSelected={selectedTagId === tag.id}
                    onClick={() => handleTagClick(tag.id)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Tag Details Panel */}
        {selectedTag && selectedDisplayState && (
          <TagDetails
            tag={selectedTag}
            displayState={selectedDisplayState}
            onClose={handleCloseDetails}
            onRemove={() => onRemoveTag?.(selectedTag.id)}
          />
        )}
      </div>
    </div>
  )
}
