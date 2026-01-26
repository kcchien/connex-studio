import React from 'react'
import { cn } from '@renderer/lib/utils'
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import type { Tag } from '@shared/types/tag'

export type AlarmState = 'normal' | 'warning' | 'alarm'

export interface TagRowProps {
  tag: Tag
  value?: number | string | boolean
  alarmState: AlarmState
  history?: number[]
  isSelected?: boolean
  onClick?: () => void
}

const alarmConfig: Record<AlarmState, { icon: typeof CheckCircle; bgColor: string; iconColor: string }> = {
  normal: { icon: CheckCircle, bgColor: '', iconColor: 'text-green-500' },
  warning: { icon: AlertTriangle, bgColor: 'bg-yellow-500/10', iconColor: 'text-yellow-500' },
  alarm: { icon: AlertCircle, bgColor: 'bg-red-500/10', iconColor: 'text-red-500' },
}

/**
 * TagRow - Single tag row in the data explorer
 * Shows tag name, current value, sparkline, and alarm state
 */
export function TagRow({
  tag,
  value,
  alarmState,
  history,
  isSelected,
  onClick,
}: TagRowProps): React.ReactElement {
  const alarm = alarmConfig[alarmState]
  const AlarmIcon = alarm.icon

  const formatValue = (val: number | string | boolean | undefined): string => {
    if (val === undefined) return '--'
    if (typeof val === 'boolean') return val ? 'ON' : 'OFF'
    if (typeof val === 'number') {
      return val.toFixed(tag.displayFormat.decimals)
    }
    return String(val)
  }

  return (
    <div
      data-testid="tag-row"
      onClick={onClick}
      className={cn(
        'flex items-center px-6 py-3 cursor-pointer transition-colors',
        alarm.bgColor,
        isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-gray-800/50',
      )}
    >
      {/* Alarm/Status Icon */}
      <div className="w-6 flex-shrink-0">
        <AlarmIcon className={cn('w-4 h-4', alarm.iconColor)} />
      </div>

      {/* Tag Name */}
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-white truncate">{tag.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {getAddressDisplay(tag)}
        </p>
      </div>

      {/* Sparkline Placeholder */}
      <div className="w-24 h-8 mr-4 flex-shrink-0">
        {history && history.length > 1 && (
          <Sparkline data={history} alarmState={alarmState} />
        )}
      </div>

      {/* Current Value */}
      <div className="w-24 text-right flex-shrink-0">
        <p className={cn(
          'text-lg font-mono font-semibold',
          alarmState === 'alarm' ? 'text-red-400' :
          alarmState === 'warning' ? 'text-yellow-400' :
          'text-white'
        )}>
          {formatValue(value)}
        </p>
        {tag.displayFormat.unit && (
          <p className="text-xs text-gray-500">{tag.displayFormat.unit}</p>
        )}
      </div>
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

/**
 * Simple SVG sparkline component
 */
function Sparkline({ data, alarmState }: { data: number[]; alarmState: AlarmState }): React.ReactElement {
  const width = 96
  const height = 32
  const padding = 2

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const strokeColor =
    alarmState === 'alarm' ? '#ef4444' :
    alarmState === 'warning' ? '#eab308' :
    '#22c55e'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
