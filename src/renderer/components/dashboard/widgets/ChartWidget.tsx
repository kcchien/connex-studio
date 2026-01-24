/**
 * ChartWidget Component
 *
 * Time-series chart widget integrating with DVR data.
 * Displays sparkline-style charts for bound tags.
 */

import React, { memo, useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/lib/utils'
import type { ChartConfig } from '@shared/types'
import { WidgetContainer, type WidgetBaseProps } from '../WidgetBase'

interface ChartWidgetProps extends WidgetBaseProps {
  config: ChartConfig
  /** Tag IDs for data fetching */
  tagRefs: string[]
}

interface DataPoint {
  timestamp: number
  value: number
}

/**
 * Simple SVG line chart renderer.
 */
function renderChart(
  data: DataPoint[],
  width: number,
  height: number,
  showGrid: boolean
): React.ReactElement {
  if (data.length < 2) {
    return (
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: '12px' }}
      >
        Waiting for data...
      </text>
    )
  }

  // Calculate bounds
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue || 1

  const minTime = data[0].timestamp
  const maxTime = data[data.length - 1].timestamp
  const timeRange = maxTime - minTime || 1

  // Padding
  const padding = { top: 10, right: 10, bottom: 20, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Scale functions
  const xScale = (t: number) =>
    padding.left + ((t - minTime) / timeRange) * chartWidth
  const yScale = (v: number) =>
    padding.top + (1 - (v - minValue) / range) * chartHeight

  // Generate path
  const pathData = data
    .map((d, i) => {
      const x = xScale(d.timestamp)
      const y = yScale(d.value)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  // Grid lines
  const gridLines: React.ReactElement[] = []
  if (showGrid) {
    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight
      const value = maxValue - (i / 4) * range
      gridLines.push(
        <g key={`h-${i}`}>
          <line
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="hsl(var(--muted))"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
          <text
            x={padding.left - 4}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '8px' }}
          >
            {value.toFixed(1)}
          </text>
        </g>
      )
    }
  }

  return (
    <>
      {gridLines}

      {/* Line path */}
      <path
        d={pathData}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Area fill */}
      <path
        d={`${pathData} L ${xScale(maxTime).toFixed(2)} ${(padding.top + chartHeight).toFixed(2)} L ${xScale(minTime).toFixed(2)} ${(padding.top + chartHeight).toFixed(2)} Z`}
        fill="hsl(var(--primary))"
        fillOpacity={0.1}
      />
    </>
  )
}

/**
 * ChartWidget displays time-series data from DVR.
 */
export const ChartWidget = memo(function ChartWidget({
  id,
  config,
  values,
  tagRefs,
  isEditing = false,
  onConfigChange,
  onRemove,
  className
}: ChartWidgetProps): React.ReactElement {
  const { timeRange, showGrid, showLegend } = config
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 300, height: 150 })
  const [chartData, setChartData] = useState<DataPoint[]>([])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Fetch sparkline data from DVR
  useEffect(() => {
    if (tagRefs.length === 0) return

    const tagId = tagRefs[0] // Use first tag for now
    const now = Date.now()
    const startTime = now - timeRange * 1000

    // Fetch sparkline data
    window.electronAPI.dvr
      .getSparkline({
        tagId,
        startTimestamp: startTime,
        endTimestamp: now,
        maxPoints: 100
      })
      .then((sparkline) => {
        const data: DataPoint[] = sparkline.timestamps.map((t, i) => ({
          timestamp: t,
          value: sparkline.values[i]
        }))
        setChartData(data)
      })
      .catch((error) => {
        console.error('Failed to fetch sparkline:', error)
      })
  }, [tagRefs, timeRange])

  // Update chart data when values change
  useEffect(() => {
    if (tagRefs.length === 0) return

    const tagId = tagRefs[0]
    const value = values.get(tagId)

    if (value !== null && typeof value === 'number') {
      setChartData((prev) => {
        const now = Date.now()
        const cutoff = now - timeRange * 1000
        const filtered = prev.filter((d) => d.timestamp > cutoff)
        return [...filtered, { timestamp: now, value }]
      })
    }
  }, [values, tagRefs, timeRange])

  return (
    <WidgetContainer
      isEditing={isEditing}
      onRemove={onRemove}
      className={className}
    >
      <div ref={containerRef} className="w-full h-full min-h-[100px]">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        >
          {renderChart(chartData, dimensions.width, dimensions.height, showGrid)}
        </svg>
      </div>

      {/* Legend */}
      {showLegend && tagRefs.length > 0 && (
        <div className="absolute bottom-2 right-2 flex items-center gap-2 px-2 py-1 rounded bg-background/80 text-xs">
          <div className="w-3 h-0.5 bg-primary rounded" />
          <span className="text-muted-foreground">
            {tagRefs[0].split('-').pop()}
          </span>
        </div>
      )}
    </WidgetContainer>
  )
})

export default ChartWidget
