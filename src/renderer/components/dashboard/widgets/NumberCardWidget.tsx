/**
 * NumberCardWidget Component
 *
 * Simple numeric display card showing a single value.
 * Supports title, unit, decimals, and threshold-based colors.
 */

import React, { memo, useMemo } from 'react'
import { cn } from '@renderer/lib/utils'
import type { NumberCardConfig } from '@shared/types'
import {
  WidgetContainer,
  formatValue,
  getPrimaryValue,
  toNumericValue,
  getColorForValue,
  type WidgetBaseProps
} from '../WidgetBase'

interface NumberCardWidgetProps extends WidgetBaseProps {
  config: NumberCardConfig
}

/**
 * Font size classes mapping.
 */
const FONT_SIZE_CLASSES = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl'
} as const

/**
 * NumberCardWidget displays a single numeric value with optional styling.
 */
export const NumberCardWidget = memo(function NumberCardWidget({
  id,
  config,
  values,
  isEditing = false,
  onConfigChange,
  onRemove,
  className
}: NumberCardWidgetProps): React.ReactElement {
  const { title, unit, decimals, fontSize, thresholds } = config

  // Get current value
  const rawValue = getPrimaryValue(values)
  const numericValue = toNumericValue(rawValue)

  // Get color based on thresholds
  const valueColor = useMemo(() => {
    if (numericValue === null) return undefined
    return getColorForValue(numericValue, thresholds)
  }, [numericValue, thresholds])

  // Font size class
  const fontSizeClass = FONT_SIZE_CLASSES[fontSize] || FONT_SIZE_CLASSES.lg

  return (
    <WidgetContainer
      title={title}
      isEditing={isEditing}
      onRemove={onRemove}
      className={className}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {/* Value display */}
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              fontSizeClass,
              'font-bold tabular-nums transition-colors duration-200'
            )}
            style={{ color: valueColor }}
          >
            {formatValue(numericValue, decimals)}
          </span>

          {/* Unit */}
          {unit && (
            <span className="text-muted-foreground text-sm">{unit}</span>
          )}
        </div>
      </div>
    </WidgetContainer>
  )
})

export default NumberCardWidget
