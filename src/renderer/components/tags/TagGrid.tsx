/**
 * TagGrid Component
 *
 * Virtualized grid display for tags with real-time values, sparklines,
 * and threshold-based row highlighting. Supports 100+ tags at 60 FPS.
 */

import React, { useMemo, useCallback, memo } from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Settings,
  Power,
  PowerOff,
  History,
  Radio,
  Wifi,
  Network
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Sparkline } from './Sparkline'
import { useTagStore, type TagDisplayState, type AlarmState, type TrendDirection } from '@renderer/stores/tagStore'
import { useDvrStore } from '@renderer/stores/dvrStore'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import type { Tag, ModbusAddress, MqttAddress } from '@shared/types/tag'
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
  onEdit?: (tag: Tag) => void
  onDelete?: (tagId: string) => void
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
const TagRow = memo(function TagRow({ tag, displayState, historicalValue, isHistorical, protocol, onEdit, onDelete }: TagRowProps) {
  // Determine which value to display: historical or live
  const formattedValue = useMemo(() => {
    // Use historical value if in historical mode
    const value = isHistorical
      ? historicalValue?.value
      : displayState?.currentValue

    if (value === null || value === undefined) return '-'

    if (typeof value === 'boolean') return value ? 'ON' : 'OFF'
    if (typeof value === 'string') return value
    if (typeof value === 'number') {
      const decimals = tag.displayFormat.decimals
      const formatted = value.toFixed(decimals)
      const unit = tag.displayFormat.unit
      return unit ? `${formatted} ${unit}` : formatted
    }
    return String(value)
  }, [displayState?.currentValue, historicalValue?.value, isHistorical, tag.displayFormat])

  // Quality from historical or live
  const quality = isHistorical
    ? historicalValue?.quality
    : displayState?.quality

  const handleEdit = useCallback(() => onEdit?.(tag), [tag, onEdit])
  const handleDelete = useCallback(() => onDelete?.(tag.id), [tag.id, onDelete])

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 border-b border-border',
        'hover:bg-muted/50 transition-colors',
        ALARM_STATE_STYLES[displayState?.alarmState || 'normal'],
        isHistorical && 'bg-amber-500/5'
      )}
    >
      {/* Enabled indicator / Historical indicator */}
      <div className="flex-shrink-0">
        {isHistorical ? (
          <History className="h-4 w-4 text-amber-500" />
        ) : tag.enabled ? (
          <Power className="h-4 w-4 text-green-500" />
        ) : (
          <PowerOff className="h-4 w-4 text-muted-foreground" />
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
    estimateSize: () => 52, // Estimated row height
    overscan: 5 // Render 5 extra rows for smooth scrolling
  })

  // Handle tag deletion with confirmation
  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      try {
        const result = await window.electronAPI.tag.delete(tagId)
        if (result.success) {
          onDeleteTag?.(tagId)
        }
      } catch (err) {
        console.error('Failed to delete tag:', err)
      }
    },
    [onDeleteTag]
  )

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
    <div className={cn('border rounded-lg overflow-hidden bg-card', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
        <div className="w-4" /> {/* Enabled */}
        <div className="w-4" /> {/* Alarm */}
        <div className="flex-1">Name</div>
        <div className="w-[100px] text-center">Trend</div>
        <div className="w-28 text-right">Value</div>
        <div className="w-6" /> {/* Trend icon */}
        <div className="w-16 text-center">Quality</div>
        <div className="w-16 text-center">Actions</div>
      </div>

      {/* Virtualized list */}
      <div
        ref={parentRef}
        className="h-[400px] overflow-auto"
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
                  onEdit={onEditTag}
                  onDelete={handleDeleteTag}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
