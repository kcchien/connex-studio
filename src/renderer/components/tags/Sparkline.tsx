/**
 * Sparkline Component
 *
 * High-performance mini chart using uPlot for real-time data visualization.
 * Displays recent values as a compact line chart with optional threshold bands.
 */

import React, { useRef, useEffect, useMemo, memo } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { cn } from '@renderer/lib/utils'
import type { Thresholds } from '@shared/types/tag'
import type { AlarmState } from '@renderer/stores/tagStore'

interface SparklineProps {
  /** Array of numeric values to display */
  data: number[]
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Thresholds for band coloring */
  thresholds?: Thresholds
  /** Current alarm state for line color */
  alarmState?: AlarmState
  /** Optional additional className */
  className?: string
}

// Colors for different alarm states
const LINE_COLORS: Record<AlarmState, string> = {
  normal: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  alarm: '#ef4444' // red-500
}

/**
 * Sparkline component using uPlot for high-performance rendering.
 * Supports up to 1000 points without frame drops (target: 60 FPS).
 */
export const Sparkline = memo(function Sparkline({
  data,
  width = 120,
  height = 32,
  thresholds,
  alarmState = 'normal',
  className
}: SparklineProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)

  // Generate x-axis values (indices)
  const chartData = useMemo((): uPlot.AlignedData => {
    const xValues = data.map((_, i) => i)
    return [xValues, data]
  }, [data])

  // Calculate y-axis range with padding
  const yRange = useMemo((): [number, number] => {
    if (data.length === 0) return [0, 100]

    const min = Math.min(...data)
    const max = Math.max(...data)
    const padding = (max - min) * 0.1 || 1

    return [min - padding, max + padding]
  }, [data])

  // Build threshold bands for background
  const bands = useMemo((): uPlot.Band[] => {
    if (!thresholds) return []

    const bands: uPlot.Band[] = []
    const { warningLow, warningHigh, alarmLow, alarmHigh } = thresholds

    // Alarm low band
    if (alarmLow !== undefined) {
      bands.push({
        series: [1, 1],
        fill: 'rgba(239, 68, 68, 0.1)', // red-500/10
        dir: 1
      })
    }

    // Warning low band
    if (warningLow !== undefined) {
      bands.push({
        series: [1, 1],
        fill: 'rgba(245, 158, 11, 0.1)', // amber-500/10
        dir: 1
      })
    }

    return bands
  }, [thresholds])

  // Build uPlot options
  const options = useMemo(
    (): uPlot.Options => ({
      width,
      height,
      cursor: {
        show: false
      },
      legend: {
        show: false
      },
      axes: [
        {
          show: false // Hide x-axis
        },
        {
          show: false // Hide y-axis
        }
      ],
      scales: {
        x: {
          time: false
        },
        y: {
          range: () => yRange
        }
      },
      series: [
        {}, // x-axis series (indices)
        {
          stroke: LINE_COLORS[alarmState],
          width: 1.5,
          fill: undefined // No fill under line
        }
      ],
      bands
    }),
    [width, height, yRange, alarmState, bands]
  )

  // Initialize or update chart
  useEffect(() => {
    if (!containerRef.current) return

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    // Don't create chart if no data
    if (data.length < 2) return

    // Create new chart
    chartRef.current = new uPlot(options, chartData, containerRef.current)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [options, chartData, data.length])

  // Update chart data efficiently
  useEffect(() => {
    if (chartRef.current && data.length >= 2) {
      chartRef.current.setData(chartData)
    }
  }, [chartData, data.length])

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden', className)}
      style={{ width, height }}
    />
  )
})
