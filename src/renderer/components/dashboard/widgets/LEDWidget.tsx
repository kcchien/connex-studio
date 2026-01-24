/**
 * LEDWidget Component
 *
 * Simple LED indicator showing on/off state.
 * Supports circle or square shapes with configurable colors.
 */

import React, { memo, useMemo } from 'react'
import { cn } from '@renderer/lib/utils'
import type { LEDConfig } from '@shared/types'
import {
  WidgetContainer,
  getPrimaryValue,
  type WidgetBaseProps
} from '../WidgetBase'

interface LEDWidgetProps extends WidgetBaseProps {
  config: LEDConfig
}

/**
 * Check if value matches the "on" condition.
 */
function isOn(
  value: number | boolean | string | null,
  onValue: number | boolean
): boolean {
  if (value === null) return false

  if (typeof onValue === 'boolean') {
    if (typeof value === 'boolean') return value === onValue
    if (typeof value === 'number') return (value !== 0) === onValue
    return false
  }

  if (typeof value === 'number') return value === onValue
  if (typeof value === 'boolean') return (value ? 1 : 0) === onValue
  return false
}

/**
 * LEDWidget displays a simple on/off indicator.
 */
export const LEDWidget = memo(function LEDWidget({
  id,
  config,
  values,
  isEditing = false,
  onConfigChange,
  onRemove,
  className
}: LEDWidgetProps): React.ReactElement {
  const { shape, onValue, onColor, offColor, label } = config

  // Get current value
  const rawValue = getPrimaryValue(values)
  const isActive = useMemo(() => isOn(rawValue, onValue), [rawValue, onValue])

  // LED style
  const ledColor = isActive ? onColor : offColor
  const glowStyle = isActive
    ? { boxShadow: `0 0 12px ${onColor}, 0 0 20px ${onColor}40` }
    : {}

  return (
    <WidgetContainer
      title={label}
      isEditing={isEditing}
      onRemove={onRemove}
      className={className}
    >
      <div className="flex flex-col items-center justify-center h-full gap-2">
        {/* LED indicator */}
        <div
          className={cn(
            'flex items-center justify-center',
            'transition-all duration-200'
          )}
        >
          <div
            className={cn(
              'w-12 h-12',
              shape === 'circle' ? 'rounded-full' : 'rounded-md',
              'border-2 border-border/50',
              'transition-all duration-200'
            )}
            style={{
              backgroundColor: ledColor,
              ...glowStyle
            }}
          />
        </div>

        {/* Status text */}
        <span
          className={cn(
            'text-xs font-medium',
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {isActive ? 'ON' : 'OFF'}
        </span>
      </div>
    </WidgetContainer>
  )
})

export default LEDWidget
