/**
 * GaugeWidget Component
 *
 * Circular or semi-circular gauge for displaying numeric values.
 * Supports configurable thresholds for color zones.
 */

import React, { memo, useMemo } from 'react'
import { cn } from '@renderer/lib/utils'
import type { GaugeConfig } from '@shared/types'
import {
  WidgetContainer,
  formatValue,
  getPrimaryValue,
  toNumericValue,
  getColorForValue,
  type WidgetBaseProps
} from '../WidgetBase'

interface GaugeWidgetProps extends WidgetBaseProps {
  config: GaugeConfig
}

/**
 * Gauge arc path generator.
 */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180
  const endRad = ((endAngle - 90) * Math.PI) / 180

  const x1 = cx + radius * Math.cos(startRad)
  const y1 = cy + radius * Math.sin(startRad)
  const x2 = cx + radius * Math.cos(endRad)
  const y2 = cy + radius * Math.sin(endRad)

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
}

/**
 * GaugeWidget displays a circular or semi-circular gauge.
 */
export const GaugeWidget = memo(function GaugeWidget({
  id,
  config,
  values,
  isEditing = false,
  onConfigChange,
  onRemove,
  className
}: GaugeWidgetProps): React.ReactElement {
  const { style, min, max, unit, thresholds, showValue } = config

  // Get current value
  const rawValue = getPrimaryValue(values)
  const numericValue = toNumericValue(rawValue)
  const displayValue = numericValue ?? 0

  // Calculate angle based on value
  const range = max - min
  const percentage = Math.max(0, Math.min(1, (displayValue - min) / range))

  // Gauge geometry
  const isSemi = style === 'semi'
  const startAngle = isSemi ? -90 : -135
  const endAngle = isSemi ? 90 : 135
  const totalAngle = endAngle - startAngle
  const valueAngle = startAngle + percentage * totalAngle

  // Get color based on thresholds
  const valueColor = useMemo(
    () => getColorForValue(displayValue, thresholds, 'hsl(var(--primary))'),
    [displayValue, thresholds]
  )

  // SVG dimensions
  const size = 100
  const cx = size / 2
  const cy = isSemi ? size * 0.6 : size / 2
  const radius = 35
  const strokeWidth = 8

  return (
    <WidgetContainer
      isEditing={isEditing}
      onRemove={onRemove}
      className={className}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <svg
          viewBox={`0 0 ${size} ${isSemi ? size * 0.7 : size}`}
          className="w-full h-auto max-h-full"
        >
          {/* Background arc */}
          <path
            d={describeArc(cx, cy, radius, startAngle, endAngle)}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value arc */}
          {numericValue !== null && (
            <path
              d={describeArc(cx, cy, radius, startAngle, valueAngle)}
              fill="none"
              stroke={valueColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          )}

          {/* Value text */}
          {showValue && (
            <text
              x={cx}
              y={isSemi ? cy - 5 : cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground font-semibold"
              style={{ fontSize: '14px' }}
            >
              {formatValue(numericValue, 1)}
            </text>
          )}

          {/* Unit text */}
          {showValue && unit && (
            <text
              x={cx}
              y={isSemi ? cy + 10 : cy + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: '8px' }}
            >
              {unit}
            </text>
          )}

          {/* Min/Max labels */}
          <text
            x={isSemi ? 10 : 20}
            y={isSemi ? cy + 15 : size - 10}
            textAnchor="start"
            className="fill-muted-foreground"
            style={{ fontSize: '7px' }}
          >
            {min}
          </text>
          <text
            x={isSemi ? size - 10 : size - 20}
            y={isSemi ? cy + 15 : size - 10}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '7px' }}
          >
            {max}
          </text>
        </svg>
      </div>
    </WidgetContainer>
  )
})

export default GaugeWidget
