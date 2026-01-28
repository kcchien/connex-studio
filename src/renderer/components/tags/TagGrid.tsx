/**
 * TagGrid Component
 *
 * Virtualized grid display for tags with real-time values, sparklines,
 * and threshold-based row highlighting. Supports 100+ tags at 60 FPS.
 */

import React, { useMemo, useCallback, memo, useRef } from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Settings,
  History,
  Radio,
  Wifi,
  Network,
  Square,
  CheckSquare,
  MinusSquare,
  Circle
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Sparkline } from './Sparkline'
import { useTagStore, type TagDisplayState, type AlarmState, type TrendDirection } from '@renderer/stores/tagStore'
import { useDvrStore } from '@renderer/stores/dvrStore'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import type { Tag, ModbusAddress, MqttAddress, DataType } from '@shared/types/tag'
import { DATA_TYPE_INFO } from '@shared/types/tag'
import type { TagValue } from '@shared/types/polling'
import type { Protocol } from '@shared/types/connection'

interface TagGridProps {
  /** Connection ID to display tags for */
  connectionId: string
  /** Callback when a tag is selected for editing */
  onEditTag?: (tag: Tag) => void
  /** Callback when a tag is deleted */
  onDeleteTag?: (tagId: string) => void
  /** Optional additional className */
  className?: string
}

interface TagRowProps {
  tag: Tag
  displayState?: TagDisplayState
  historicalValue?: TagValue
  isHistorical: boolean
  protocol?: Protocol
  isSelected: boolean
  rowIndex: number
  onEdit?: (tag: Tag) => void
  onDelete?: (tagId: string) => void
  onToggleSelect?: (tagId: string, event: React.MouseEvent) => void
}

// Alarm state colors for row highlighting
const ALARM_STATE_STYLES: Record<AlarmState, string> = {
  normal: '',
  warning: 'bg-amber-500/10 border-l-2 border-l-amber-500',
  alarm: 'bg-red-500/10 border-l-2 border-l-red-500'
}

// Trend icons
const TrendIcon = memo(function TrendIcon({ trend }: { trend: TrendDirection }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
})

// Alarm state icon
const AlarmIcon = memo(function AlarmIcon({ state }: { state: AlarmState }) {
  switch (state) {
    case 'alarm':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return null
  }
})

// Protocol icon with color
const ProtocolIcon = memo(function ProtocolIcon({ protocol }: { protocol?: Protocol }) {
  switch (protocol) {
    case 'modbus-tcp':
      return (
        <span title="Modbus TCP">
          <Radio className="h-3.5 w-3.5 text-blue-500" />
        </span>
      )
    case 'mqtt':
      return (
        <span title="MQTT">
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        </span>
      )
    case 'opcua':
      return (
        <span title="OPC UA">
          <Network className="h-3.5 w-3.5 text-purple-500" />
        </span>
      )
    default:
      return null
  }
})

// Quality badge
const QualityBadge = memo(function QualityBadge({ quality }: { quality: string }) {
  const styles: Record<string, string> = {
    good: 'bg-green-500/20 text-green-500',
    bad: 'bg-red-500/20 text-red-500',
    uncertain: 'bg-amber-500/20 text-amber-500'
  }

  return (
    <span className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded', styles[quality] || styles.uncertain)}>
      {quality.toUpperCase()}
    </span>
  )
})

/**
 * Format address display string based on address type.
 */
function formatAddress(address: Tag['address']): string {
  switch (address.type) {
    case 'modbus':
      const modbus = address as ModbusAddress
      return `${modbus.registerType}:${modbus.address}`
    case 'mqtt':
      const mqtt = address as MqttAddress
      return mqtt.jsonPath ? `${mqtt.topic}::${mqtt.jsonPath}` : mqtt.topic
    case 'opcua':
      return address.nodeId
    default:
      return '-'
  }
}

/**
 * Individual tag row with value display and controls.
 * Supports both live and historical display modes.
 */
const TagRow = memo(function TagRow({ tag, displayState, historicalValue, isHistorical, protocol, isSelected, rowIndex, onEdit, onDelete, onToggleSelect }: TagRowProps) {
  // Determine which value to display: historical or live (with scaling)
  const formattedValue = useMemo(() => {
    // Use historical value if in historical mode
    const rawValue = isHistorical
      ? historicalValue?.value
      : displayState?.currentValue

    if (rawValue === null || rawValue === undefined) return '-'

    if (typeof rawValue === 'boolean') return rawValue ? 'ON' : 'OFF'
    if (typeof rawValue === 'string') return rawValue
    if (typeof rawValue === 'number') {
      // Apply scale factor (default to 1)
      const scale = tag.displayFormat.scale ?? 1
      const scaledValue = rawValue * scale
      const decimals = tag.displayFormat.decimals
      const formatted = scaledValue.toFixed(decimals)
      const unit = tag.displayFormat.unit
      return unit ? `${formatted} ${unit}` : formatted
    }
    return String(rawValue)
  }, [displayState?.currentValue, historicalValue?.value, isHistorical, tag.displayFormat])

  // Quality from historical or live
  const quality = isHistorical
    ? historicalValue?.quality
    : displayState?.quality

  const handleEdit = useCallback(() => onEdit?.(tag), [tag, onEdit])
  const handleDelete = useCallback(() => onDelete?.(tag.id), [tag.id, onDelete])
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleSelect?.(tag.id, e)
    },
    [tag.id, onToggleSelect]
  )

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 border-b border-border',
        'hover:bg-muted/50 transition-colors',
        ALARM_STATE_STYLES[displayState?.alarmState || 'normal'],
        isHistorical && 'bg-amber-500/5',
        isSelected && 'bg-blue-500/10 hover:bg-blue-500/15'
      )}
    >
      {/* Row number */}
      <div className="flex-shrink-0 w-8 text-xs text-muted-foreground text-right tabular-nums">
        {rowIndex + 1}
      </div>

      {/* Checkbox for selection */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        className={cn(
          'flex-shrink-0 p-0.5 rounded',
          'text-muted-foreground hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSelected && 'text-blue-500 hover:text-blue-600'
        )}
        aria-label={isSelected ? 'Deselect tag' : 'Select tag'}
        data-testid={`tag-checkbox-${tag.id}`}
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

      {/* Status indicator - simple dot instead of power icon to avoid confusion */}
      <div className="flex-shrink-0" title={isHistorical ? 'Historical data' : tag.enabled ? 'Enabled' : 'Disabled'}>
        {isHistorical ? (
          <History className="h-4 w-4 text-amber-500" />
        ) : (
          <Circle
            className={cn(
              'h-2.5 w-2.5',
              tag.enabled ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
            )}
          />
        )}
      </div>

      {/* Alarm indicator */}
      <div className="flex-shrink-0 w-4">
        <AlarmIcon state={displayState?.alarmState || 'normal'} />
      </div>

      {/* Tag name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <ProtocolIcon protocol={protocol} />
          <span className="text-sm font-medium text-foreground truncate">{tag.name}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {formatAddress(tag.address)}
          </span>
        </div>
      </div>

      {/* Data Type */}
      <div className="flex-shrink-0 w-20">
        <span className="text-xs text-muted-foreground font-mono">
          {tag.dataType.toUpperCase()}
        </span>
      </div>

      {/* Sparkline - only show in live mode */}
      <div className="flex-shrink-0">
        {!isHistorical && displayState && displayState.sparklineData.length > 1 && (
          <Sparkline
            data={displayState.sparklineData}
            width={100}
            height={28}
            thresholds={tag.thresholds}
            alarmState={displayState.alarmState}
          />
        )}
        {isHistorical && (
          <div className="w-[100px] h-[28px] flex items-center justify-center text-xs text-muted-foreground">
            --
          </div>
        )}
      </div>

      {/* Current value */}
      <div className="flex-shrink-0 w-28 text-right">
        <span className="text-sm font-mono font-medium text-foreground">{formattedValue}</span>
      </div>

      {/* Trend indicator */}
      <div className="flex-shrink-0 w-6">
        <TrendIcon trend={displayState?.trend || 'stable'} />
      </div>

      {/* Quality badge */}
      <div className="flex-shrink-0 w-16">
        {quality && <QualityBadge quality={quality} />}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-1">
        <button
          onClick={handleEdit}
          className={cn(
            'p-1.5 rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          title="Edit tag"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={handleDelete}
          className={cn(
            'p-1.5 rounded-md',
            'text-muted-foreground hover:text-destructive',
            'hover:bg-destructive/10 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          title="Delete tag"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
})

/**
 * TagGrid component with virtualized rendering for performance.
 * Handles 100+ tags with smooth scrolling at 60 FPS.
 */
export function TagGrid({
  connectionId,
  onEditTag,
  onDeleteTag,
  className
}: TagGridProps): React.ReactElement {
  const getTags = useTagStore((state) => state.getTags)
  const displayStates = useTagStore((state) => state.displayStates)
  const connections = useConnectionStore((state) => state.connections)

  // Selection state
  const selectedTagIds = useTagStore((state) => state.selectedTagIds)
  const lastSelectedTagId = useTagStore((state) => state.lastSelectedTagId)
  const toggleTagSelection = useTagStore((state) => state.toggleTagSelection)
  const selectAllTags = useTagStore((state) => state.selectAllTags)
  const clearSelection = useTagStore((state) => state.clearSelection)
  const selectTagRange = useTagStore((state) => state.selectTagRange)
  const setLastSelectedTag = useTagStore((state) => state.setLastSelectedTag)

  // Get the protocol for the current connection
  const connection = connections.find((c) => c.id === connectionId)
  const protocol = connection?.protocol

  // DVR state for historical mode
  const isLive = useDvrStore((state) => state.isLive)
  const historicalValues = useDvrStore((state) => state.historicalValues)

  const tags = getTags(connectionId)

  // Virtual list container ref
  const parentRef = React.useRef<HTMLDivElement>(null)

  // Virtual list configuration
  const rowVirtualizer = useVirtualizer({
    count: tags.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimated row height (py-3 = 12px padding + content)
    overscan: 5 // Render 5 extra rows for smooth scrolling
  })

  // Handle tag deletion - delegate to parent for confirmation dialog
  const handleDeleteTag = useCallback(
    (tagId: string) => {
      // Just call the parent callback which should show a confirmation dialog
      onDeleteTag?.(tagId)
    },
    [onDeleteTag]
  )

  // Handle tag selection with shift-click for range selection
  const handleToggleSelect = useCallback(
    (tagId: string, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedTagId) {
        // Range selection
        selectTagRange(connectionId, lastSelectedTagId, tagId)
      } else {
        // Single toggle
        toggleTagSelection(tagId)
      }
    },
    [connectionId, lastSelectedTagId, selectTagRange, toggleTagSelection]
  )

  // Handle header checkbox click
  const handleSelectAllToggle = useCallback(() => {
    const allSelected = tags.length > 0 && tags.every((t) => selectedTagIds.has(t.id))
    if (allSelected) {
      clearSelection()
    } else {
      selectAllTags(connectionId)
    }
  }, [tags, selectedTagIds, clearSelection, selectAllTags, connectionId])

  // Calculate header checkbox state
  const allSelected = tags.length > 0 && tags.every((t) => selectedTagIds.has(t.id))
  const someSelected = tags.some((t) => selectedTagIds.has(t.id)) && !allSelected

  if (tags.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-muted-foreground', className)}>
        <div className="text-center">
          <p className="text-sm">No tags configured</p>
          <p className="text-xs mt-1">Add a tag to start monitoring</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-card flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
        {/* Row number header */}
        <div className="w-8 text-right">#</div>
        {/* Select all checkbox */}
        <button
          type="button"
          onClick={handleSelectAllToggle}
          className={cn(
            'flex-shrink-0 p-0.5 rounded',
            'text-muted-foreground hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            (allSelected || someSelected) && 'text-blue-500 hover:text-blue-600'
          )}
          aria-label={allSelected ? 'Deselect all' : 'Select all'}
          data-testid="tag-select-all-checkbox"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : someSelected ? (
            <MinusSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <div className="w-2.5" /> {/* Status dot */}
        <div className="w-4" /> {/* Alarm */}
        <div className="flex-1">Name</div>
        <div className="w-20">Type</div>
        <div className="w-[100px] text-center">Trend</div>
        <div className="w-28 text-right">Value</div>
        <div className="w-6" /> {/* Trend icon */}
        <div className="w-16 text-center">Quality</div>
        <div className="w-16 text-center">Actions</div>
      </div>

      {/* Virtualized list - use flex-1 to fill available space, min-h for minimum */}
      <div
        ref={parentRef}
        className="flex-1 min-h-[200px] max-h-[calc(100vh-300px)] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
            const tag = tags[virtualRow.index]
            const displayState = displayStates.get(tag.id)
            const historicalValue = historicalValues.get(tag.id)

            return (
              <div
                key={tag.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <TagRow
                  tag={tag}
                  displayState={displayState}
                  historicalValue={historicalValue}
                  isHistorical={!isLive}
                  protocol={protocol}
                  isSelected={selectedTagIds.has(tag.id)}
                  rowIndex={virtualRow.index}
                  onEdit={onEditTag}
                  onDelete={handleDeleteTag}
                  onToggleSelect={handleToggleSelect}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
