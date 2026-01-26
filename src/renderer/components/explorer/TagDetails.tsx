import React from 'react'
import { cn } from '@renderer/lib/utils'
import {
  X,
  Trash2,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import type { Tag } from '@shared/types/tag'
import type { TagDisplayState } from './DataExplorer'
import type { AlarmState } from './TagRow'

export interface TagDetailsProps {
  tag: Tag
  displayState: TagDisplayState
  onClose: () => void
  onRemove?: () => void
  onConfigure?: () => void
}

const alarmConfig: Record<AlarmState, { icon: typeof CheckCircle; color: string; label: string }> = {
  normal: { icon: CheckCircle, color: 'text-green-500', label: 'Normal' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Warning' },
  alarm: { icon: AlertCircle, color: 'text-red-500', label: 'Alarm' },
}

/**
 * TagDetails - Detailed view panel for a selected tag
 * Shows large value display, trend, thresholds, and configuration
 */
export function TagDetails({
  tag,
  displayState,
  onClose,
  onRemove,
  onConfigure,
}: TagDetailsProps): React.ReactElement {
  const alarm = alarmConfig[displayState.alarmState]
  const AlarmIcon = alarm.icon

  const formatValue = (val: number | string | boolean): string => {
    if (typeof val === 'boolean') return val ? 'ON' : 'OFF'
    if (typeof val === 'number') {
      return val.toFixed(tag.displayFormat.decimals)
    }
    return String(val)
  }

  const getTrend = (): { icon: typeof TrendingUp; label: string } | null => {
    if (!displayState.history || displayState.history.length < 2) return null
    const last = displayState.history[displayState.history.length - 1]
    const prev = displayState.history[displayState.history.length - 2]
    const diff = last - prev
    if (Math.abs(diff) < 0.001) return { icon: Minus, label: 'Stable' }
    if (diff > 0) return { icon: TrendingUp, label: 'Rising' }
    return { icon: TrendingDown, label: 'Falling' }
  }

  const trend = getTrend()
  const TrendIcon = trend?.icon

  return (
    <div data-testid="tag-details" className="w-80 flex flex-col bg-white dark:bg-[#111827] border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{tag.name}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Large Value Display */}
      <div className={cn(
        'p-6 text-center',
        displayState.alarmState === 'alarm' ? 'bg-red-500/10' :
        displayState.alarmState === 'warning' ? 'bg-yellow-500/10' :
        ''
      )}>
        <p className={cn(
          'text-4xl font-mono font-bold',
          displayState.alarmState === 'alarm' ? 'text-red-500 dark:text-red-400' :
          displayState.alarmState === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
          'text-gray-900 dark:text-white'
        )}>
          {formatValue(displayState.value)}
        </p>
        {tag.displayFormat.unit && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tag.displayFormat.unit}</p>
        )}
      </div>

      {/* Status & Trend */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <AlarmIcon className={cn('w-4 h-4', alarm.color)} />
          <span className={cn('text-sm', alarm.color)}>{alarm.label}</span>
        </div>
        {trend && TrendIcon && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm">{trend.label}</span>
          </div>
        )}
      </div>

      {/* Tag Info */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Address */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">{getAddressDisplay(tag)}</p>
        </div>

        {/* Data Type */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data Type</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{tag.dataType}</p>
        </div>

        {/* Thresholds */}
        {hasThresholds(tag) && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Thresholds</p>
            <div className="space-y-1">
              {tag.thresholds.alarmHigh !== undefined && (
                <ThresholdRow label="Alarm High" value={tag.thresholds.alarmHigh} color="text-red-500 dark:text-red-400" />
              )}
              {tag.thresholds.warningHigh !== undefined && (
                <ThresholdRow label="Warning High" value={tag.thresholds.warningHigh} color="text-yellow-600 dark:text-yellow-400" />
              )}
              {tag.thresholds.warningLow !== undefined && (
                <ThresholdRow label="Warning Low" value={tag.thresholds.warningLow} color="text-yellow-600 dark:text-yellow-400" />
              )}
              {tag.thresholds.alarmLow !== undefined && (
                <ThresholdRow label="Alarm Low" value={tag.thresholds.alarmLow} color="text-red-500 dark:text-red-400" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onConfigure}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'text-gray-700 dark:text-gray-300 text-sm',
            'hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
            'transition-colors'
          )}
        >
          <Settings className="w-4 h-4" />
          Configure
        </button>
        <button
          onClick={onRemove}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'bg-red-500/10 border border-red-500/30',
            'text-red-500 dark:text-red-400 text-sm',
            'hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-300',
            'transition-colors'
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ThresholdRow({ label, value, color }: { label: string; value: number; color: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={cn('text-sm font-mono', color)}>{value}</span>
    </div>
  )
}

function getAddressDisplay(tag: Tag): string {
  const addr = tag.address
  switch (addr.type) {
    case 'modbus':
      return `${addr.registerType}[${addr.address}]`
    case 'mqtt':
      return addr.topic
    case 'opcua':
      return addr.nodeId
    default:
      return 'Unknown'
  }
}

function hasThresholds(tag: Tag): boolean {
  const t = tag.thresholds
  return t.alarmHigh !== undefined ||
         t.alarmLow !== undefined ||
         t.warningHigh !== undefined ||
         t.warningLow !== undefined
}
