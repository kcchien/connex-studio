/**
 * TagStatusIcon Component
 *
 * Displays the current status of a tag with appropriate icon and color.
 * Shows tooltip with detailed status information on hover.
 */

import React, { memo } from 'react'
import { Circle, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export type TagStatus = 'normal' | 'timeout' | 'error' | 'stale' | 'loading' | 'disabled'

export interface TagStatusIconProps {
  /** Current status of the tag */
  status: TagStatus
  /** Optional detailed status message */
  message?: string
  /** Size of the icon ('sm' | 'md' | 'lg') */
  size?: 'sm' | 'md' | 'lg'
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Optional additional className */
  className?: string
}

// Status configuration
const STATUS_CONFIG: Record<TagStatus, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  label: string
  description: string
}> = {
  normal: {
    icon: Circle,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Normal',
    description: 'Tag is reading successfully',
  },
  timeout: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    label: 'Timeout',
    description: 'Tag read timed out',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    label: 'Error',
    description: 'Tag read failed',
  },
  stale: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Stale',
    description: 'No recent data',
  },
  loading: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    label: 'Loading',
    description: 'Reading tag value...',
  },
  disabled: {
    icon: Circle,
    color: 'text-gray-300',
    bgColor: 'bg-gray-300',
    label: 'Disabled',
    description: 'Tag is disabled',
  },
}

// Size classes
const SIZE_CLASSES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

/**
 * Icon component for displaying tag status.
 * Provides visual indication of tag health with optional tooltip.
 */
export const TagStatusIcon = memo(function TagStatusIcon({
  status,
  message,
  size = 'md',
  showTooltip = true,
  className,
}: TagStatusIconProps): React.ReactElement {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const sizeClass = SIZE_CLASSES[size]

  const tooltipContent = message || config.description

  // For loading status, use animated spinner
  const isLoading = status === 'loading'

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      title={showTooltip ? tooltipContent : undefined}
      data-testid={`tag-status-icon-${status}`}
    >
      {status === 'normal' ? (
        // Solid filled circle for normal status
        <div
          className={cn(
            'rounded-full',
            config.bgColor,
            size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          )}
          aria-label={config.label}
        />
      ) : (
        <Icon
          className={cn(
            sizeClass,
            config.color,
            isLoading && 'animate-spin'
          )}
          aria-label={config.label}
        />
      )}
    </div>
  )
})

/**
 * TagStatusBadge - Larger badge version with label
 */
export interface TagStatusBadgeProps extends Omit<TagStatusIconProps, 'showTooltip'> {
  /** Show the status label */
  showLabel?: boolean
}

export const TagStatusBadge = memo(function TagStatusBadge({
  status,
  message,
  size = 'sm',
  showLabel = true,
  className,
}: TagStatusBadgeProps): React.ReactElement {
  const config = STATUS_CONFIG[status]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        'text-xs font-medium',
        status === 'normal' && 'bg-green-500/10 text-green-600 dark:text-green-400',
        status === 'timeout' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        status === 'error' && 'bg-red-500/10 text-red-600 dark:text-red-400',
        status === 'stale' && 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
        status === 'loading' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        status === 'disabled' && 'bg-gray-500/10 text-gray-500',
        className
      )}
      title={message || config.description}
      data-testid={`tag-status-badge-${status}`}
    >
      <TagStatusIcon status={status} size={size} showTooltip={false} />
      {showLabel && <span>{config.label}</span>}
    </div>
  )
})

export default TagStatusIcon
