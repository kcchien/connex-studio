/**
 * OpcUaHistoryQuery - UI component for querying OPC UA historical data.
 *
 * Features:
 * - Check if node supports historizing (T153)
 * - Query raw historical data with time range (T154)
 * - Query processed/aggregated data (T155)
 * - Display results in table and chart format (T158)
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  History,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  BarChart3,
  Table,
  RefreshCw,
  ChevronDown,
  X,
  Clock,
  Database
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { opcuaApi } from '@renderer/lib/ipc'
import type {
  OpcUaNode,
  HistorizingCheckResult,
  HistoryReadRawResult,
  HistoryReadProcessedResult,
  HistoryDataValue,
  HistoryNodeResult,
  HistoryAggregateType,
  TimestampsToReturn
} from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface OpcUaHistoryQueryProps {
  connectionId: string
  node?: OpcUaNode | null
  className?: string
  onDataLoaded?: (results: HistoryNodeResult[]) => void
}

type QueryMode = 'raw' | 'processed'
type ViewMode = 'table' | 'chart'

interface QueryParams {
  mode: QueryMode
  startTime: string
  endTime: string
  numValuesPerNode: number
  returnBounds: boolean
  timestampsToReturn: TimestampsToReturn
  // Processed-specific
  aggregateType: HistoryAggregateType
  processingInterval: number
}

// =============================================================================
// Constants
// =============================================================================

const AGGREGATE_TYPES: HistoryAggregateType[] = [
  'Average',
  'TimeAverage',
  'Count',
  'Minimum',
  'Maximum',
  'MinimumActualTime',
  'MaximumActualTime',
  'Range',
  'Total',
  'Interpolative',
  'Start',
  'End',
  'Delta',
  'PercentBad',
  'PercentGood',
  'DurationBad',
  'DurationGood',
  'StandardDeviation',
  'Variance'
]

const TIMESTAMPS_OPTIONS: { value: TimestampsToReturn; label: string }[] = [
  { value: 'Both', label: 'Both' },
  { value: 'Source', label: 'Source' },
  { value: 'Server', label: 'Server' },
  { value: 'Neither', label: 'Neither' }
]

const DEFAULT_PARAMS: QueryParams = {
  mode: 'raw',
  startTime: new Date(Date.now() - 3600000).toISOString().slice(0, 16), // 1 hour ago
  endTime: new Date().toISOString().slice(0, 16),
  numValuesPerNode: 1000,
  returnBounds: false,
  timestampsToReturn: 'Both',
  aggregateType: 'Average',
  processingInterval: 60000 // 1 minute
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimestamp(ts?: string): string {
  if (!ts) return '-'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(4)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getStatusClass(statusCode: number): string {
  if (statusCode === 0) return 'text-green-600'
  if ((statusCode & 0xC0000000) === 0x40000000) return 'text-yellow-600' // Uncertain
  return 'text-red-600' // Bad
}

function getStatusText(statusCode: number, statusText?: string): string {
  if (statusText) return statusText
  if (statusCode === 0) return 'Good'
  if ((statusCode & 0xC0000000) === 0x40000000) return 'Uncertain'
  return 'Bad'
}

// =============================================================================
// Badge Component
// =============================================================================

function Badge({
  children,
  variant = 'default'
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning'
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border text-foreground',
        variant === 'success' && 'bg-green-500/10 text-green-700',
        variant === 'danger' && 'bg-red-500/10 text-red-700',
        variant === 'warning' && 'bg-yellow-500/10 text-yellow-700'
      )}
    >
      {children}
    </span>
  )
}

// =============================================================================
// HistoryAvailabilityBadge Component
// =============================================================================

function HistoryAvailabilityBadge({
  historizingResult,
  error
}: {
  historizingResult: HistorizingCheckResult | null
  error?: string | null
}): React.ReactElement {
  if (error) {
    return (
      <Badge variant="danger">
        <AlertCircle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    )
  }

  if (!historizingResult) {
    return <Badge variant="secondary">Unknown</Badge>
  }

  if (historizingResult.historizing) {
    return (
      <Badge variant="success">
        <CheckCircle className="mr-1 h-3 w-3" />
        Historizing
      </Badge>
    )
  }

  return (
    <Badge variant="warning">
      <X className="mr-1 h-3 w-3" />
      Not Historizing
    </Badge>
  )
}

// =============================================================================
// QueryParamsForm Component
// =============================================================================

function QueryParamsForm({
  params,
  onChange,
  disabled
}: {
  params: QueryParams
  onChange: (params: QueryParams) => void
  disabled: boolean
}): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex gap-2">
        <button
          type="button"
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            params.mode === 'raw'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          onClick={() => onChange({ ...params, mode: 'raw' })}
          disabled={disabled}
        >
          <Database className="mr-2 inline-block h-4 w-4" />
          Raw Data
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            params.mode === 'processed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          onClick={() => onChange({ ...params, mode: 'processed' })}
          disabled={disabled}
        >
          <BarChart3 className="mr-2 inline-block h-4 w-4" />
          Processed
        </button>
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={params.startTime}
            onChange={(e) => onChange({ ...params, startTime: e.target.value })}
            disabled={disabled}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">End Time</label>
          <input
            type="datetime-local"
            value={params.endTime}
            onChange={(e) => onChange({ ...params, endTime: e.target.value })}
            disabled={disabled}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Raw-specific options */}
      {params.mode === 'raw' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Max Values
            </label>
            <input
              type="number"
              value={params.numValuesPerNode}
              onChange={(e) =>
                onChange({ ...params, numValuesPerNode: parseInt(e.target.value) || 1000 })
              }
              disabled={disabled}
              min={1}
              max={10000}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={params.returnBounds}
                onChange={(e) => onChange({ ...params, returnBounds: e.target.checked })}
                disabled={disabled}
                className="rounded border"
              />
              Return Bounds
            </label>
          </div>
        </div>
      )}

      {/* Processed-specific options */}
      {params.mode === 'processed' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Aggregate Type
              </label>
              <select
                value={params.aggregateType}
                onChange={(e) =>
                  onChange({ ...params, aggregateType: e.target.value as HistoryAggregateType })
                }
                disabled={disabled}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {AGGREGATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Interval (ms)
              </label>
              <input
                type="number"
                value={params.processingInterval}
                onChange={(e) =>
                  onChange({ ...params, processingInterval: parseInt(e.target.value) || 60000 })
                }
                disabled={disabled}
                min={1000}
                step={1000}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Timestamps option */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Timestamps to Return
        </label>
        <select
          value={params.timestampsToReturn}
          onChange={(e) =>
            onChange({ ...params, timestampsToReturn: e.target.value as TimestampsToReturn })
          }
          disabled={disabled}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TIMESTAMPS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// =============================================================================
// HistoryDataTable Component
// =============================================================================

function HistoryDataTable({
  results
}: {
  results: HistoryNodeResult[]
}): React.ReactElement {
  if (results.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Flatten all data values with their node IDs
  const allData = useMemo(() => {
    const data: { nodeId: string; dv: HistoryDataValue }[] = []
    for (const result of results) {
      for (const dv of result.dataValues) {
        data.push({ nodeId: result.nodeId, dv })
      }
    }
    // Sort by source timestamp
    data.sort((a, b) => {
      const tsA = a.dv.sourceTimestamp ? new Date(a.dv.sourceTimestamp).getTime() : 0
      const tsB = b.dv.sourceTimestamp ? new Date(b.dv.sourceTimestamp).getTime() : 0
      return tsA - tsB
    })
    return data
  }, [results])

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Source Timestamp</th>
            <th className="px-3 py-2 text-left font-medium">Server Timestamp</th>
            <th className="px-3 py-2 text-left font-medium">Value</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            {results.length > 1 && (
              <th className="px-3 py-2 text-left font-medium">Node</th>
            )}
          </tr>
        </thead>
        <tbody>
          {allData.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/50">
              <td className="px-3 py-2 font-mono text-xs">
                {formatTimestamp(item.dv.sourceTimestamp)}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {formatTimestamp(item.dv.serverTimestamp)}
              </td>
              <td className="px-3 py-2 font-mono">{formatValue(item.dv.value)}</td>
              <td className={cn('px-3 py-2', getStatusClass(item.dv.statusCode))}>
                {getStatusText(item.dv.statusCode, item.dv.statusText)}
              </td>
              {results.length > 1 && (
                <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                  {item.nodeId}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// =============================================================================
// HistoryDataChart Component (Simple)
// =============================================================================

function HistoryDataChart({
  results
}: {
  results: HistoryNodeResult[]
}): React.ReactElement {
  // Get numeric values for charting
  const chartData = useMemo(() => {
    const data: { timestamp: number; value: number; nodeId: string }[] = []
    for (const result of results) {
      for (const dv of result.dataValues) {
        const value = typeof dv.value === 'number' ? dv.value : parseFloat(String(dv.value))
        if (!isNaN(value) && dv.sourceTimestamp) {
          data.push({
            timestamp: new Date(dv.sourceTimestamp).getTime(),
            value,
            nodeId: result.nodeId
          })
        }
      }
    }
    data.sort((a, b) => a.timestamp - b.timestamp)
    return data
  }, [results])

  if (chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No numeric data available for chart
      </div>
    )
  }

  // Calculate chart dimensions
  const minVal = Math.min(...chartData.map((d) => d.value))
  const maxVal = Math.max(...chartData.map((d) => d.value))
  const range = maxVal - minVal || 1
  const minTime = chartData[0].timestamp
  const maxTime = chartData[chartData.length - 1].timestamp
  const timeRange = maxTime - minTime || 1

  // SVG dimensions
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Scale functions
  const xScale = (t: number) => padding.left + ((t - minTime) / timeRange) * chartWidth
  const yScale = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight

  // Generate path
  const pathD = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.timestamp)} ${yScale(d.value)}`)
    .join(' ')

  return (
    <div className="overflow-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + chartHeight * (1 - frac)}
            y2={padding.top + chartHeight * (1 - frac)}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((frac) => (
          <text
            key={frac}
            x={padding.left - 5}
            y={padding.top + chartHeight * (1 - frac)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {(minVal + range * frac).toFixed(2)}
          </text>
        ))}

        {/* X-axis labels */}
        {[0, 0.5, 1].map((frac) => (
          <text
            key={frac}
            x={padding.left + chartWidth * frac}
            y={height - 5}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {new Date(minTime + timeRange * frac).toLocaleTimeString()}
          </text>
        ))}

        {/* Data line */}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />

        {/* Data points */}
        {chartData.map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.timestamp)}
            cy={yScale(d.value)}
            r={3}
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>

      <div className="mt-2 text-center text-xs text-muted-foreground">
        {chartData.length} data points | {new Date(minTime).toLocaleString()} -{' '}
        {new Date(maxTime).toLocaleString()}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function OpcUaHistoryQuery({
  connectionId,
  node,
  className,
  onDataLoaded
}: OpcUaHistoryQueryProps): React.ReactElement {
  // State
  const [historizingResult, setHistorizingResult] = useState<HistorizingCheckResult | null>(null)
  const [checkingHistorizing, setCheckingHistorizing] = useState(false)
  const [params, setParams] = useState<QueryParams>(DEFAULT_PARAMS)
  const [results, setResults] = useState<HistoryNodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [continuationPoint, setContinuationPoint] = useState<string | undefined>(undefined)
  const [historizingError, setHistorizingError] = useState<string | null>(null)

  // Check historizing attribute when node changes
  const checkHistorizing = useCallback(async () => {
    if (!node?.nodeId) return

    setCheckingHistorizing(true)
    setHistorizingResult(null)
    setHistorizingError(null)

    try {
      const result = await opcuaApi.checkHistorizing({
        connectionId,
        nodeId: node.nodeId
      })
      setHistorizingResult(result)
    } catch (err) {
      setHistorizingError(err instanceof Error ? err.message : 'Failed to check historizing')
    } finally {
      setCheckingHistorizing(false)
    }
  }, [connectionId, node?.nodeId])

  // Execute history query
  const executeQuery = useCallback(async () => {
    if (!node?.nodeId) return

    setLoading(true)
    setError(null)

    try {
      const startTime = new Date(params.startTime).toISOString()
      const endTime = new Date(params.endTime).toISOString()

      let response: HistoryReadRawResult | HistoryReadProcessedResult

      if (params.mode === 'raw') {
        response = await opcuaApi.readHistoryRaw({
          connectionId,
          nodeIds: [node.nodeId],
          startTime,
          endTime,
          numValuesPerNode: params.numValuesPerNode,
          returnBounds: params.returnBounds,
          timestampsToReturn: params.timestampsToReturn,
          continuationPoint
        })
      } else {
        response = await opcuaApi.readHistoryProcessed({
          connectionId,
          nodeIds: [node.nodeId],
          startTime,
          endTime,
          aggregateType: params.aggregateType,
          processingInterval: params.processingInterval,
          timestampsToReturn: params.timestampsToReturn,
          continuationPoint
        })
      }

      setResults(response.results)

      // Check for continuation point
      const cp = response.results[0]?.continuationPoint
      setContinuationPoint(cp)

      // Notify parent
      onDataLoaded?.(response.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [connectionId, node?.nodeId, params, continuationPoint, onDataLoaded])

  // Load more data (continuation)
  const loadMore = useCallback(async () => {
    if (!continuationPoint || !node?.nodeId) return

    setLoading(true)

    try {
      const startTime = new Date(params.startTime).toISOString()
      const endTime = new Date(params.endTime).toISOString()

      let response: HistoryReadRawResult | HistoryReadProcessedResult

      if (params.mode === 'raw') {
        response = await opcuaApi.readHistoryRaw({
          connectionId,
          nodeIds: [node.nodeId],
          startTime,
          endTime,
          numValuesPerNode: params.numValuesPerNode,
          returnBounds: params.returnBounds,
          timestampsToReturn: params.timestampsToReturn,
          continuationPoint
        })
      } else {
        response = await opcuaApi.readHistoryProcessed({
          connectionId,
          nodeIds: [node.nodeId],
          startTime,
          endTime,
          aggregateType: params.aggregateType,
          processingInterval: params.processingInterval,
          timestampsToReturn: params.timestampsToReturn,
          continuationPoint
        })
      }

      // Append new data
      setResults((prev) => {
        const updated = [...prev]
        for (const newResult of response.results) {
          const existingIdx = updated.findIndex((r) => r.nodeId === newResult.nodeId)
          if (existingIdx >= 0) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              dataValues: [...updated[existingIdx].dataValues, ...newResult.dataValues],
              continuationPoint: newResult.continuationPoint
            }
          } else {
            updated.push(newResult)
          }
        }
        return updated
      })

      // Update continuation point
      const cp = response.results[0]?.continuationPoint
      setContinuationPoint(cp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more data')
    } finally {
      setLoading(false)
    }
  }, [connectionId, node?.nodeId, params, continuationPoint])

  // Release continuation points when done
  const releaseContinuation = useCallback(async () => {
    if (!continuationPoint) return

    try {
      await opcuaApi.releaseContinuationPoints({
        connectionId,
        continuationPoints: [continuationPoint]
      })
      setContinuationPoint(undefined)
    } catch (err) {
      console.warn('Failed to release continuation points:', err)
    }
  }, [connectionId, continuationPoint])

  // Export data as CSV
  const exportCsv = useCallback(() => {
    if (results.length === 0) return

    const lines: string[] = ['NodeId,SourceTimestamp,ServerTimestamp,Value,StatusCode,StatusText']

    for (const result of results) {
      for (const dv of result.dataValues) {
        lines.push(
          [
            result.nodeId,
            dv.sourceTimestamp ?? '',
            dv.serverTimestamp ?? '',
            formatValue(dv.value),
            dv.statusCode,
            dv.statusText ?? ''
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        )
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `history_${node?.displayName ?? 'data'}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results, node?.displayName])

  // Total data count
  const totalDataCount = useMemo(
    () => results.reduce((sum, r) => sum + r.dataValues.length, 0),
    [results]
  )

  return (
    <div className={cn('flex flex-col rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Historical Access</h3>
        </div>
        {node && (
          <div className="flex items-center gap-2">
            {checkingHistorizing ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <HistoryAvailabilityBadge historizingResult={historizingResult} error={historizingError} />
            )}
            <button
              onClick={checkHistorizing}
              disabled={checkingHistorizing}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Check historizing attribute"
            >
              <RefreshCw className={cn('h-4 w-4', checkingHistorizing && 'animate-spin')} />
            </button>
          </div>
        )}
      </div>

      {/* Node Info */}
      {node && (
        <div className="border-b bg-muted/50 px-4 py-2">
          <div className="text-sm font-medium">{node.displayName}</div>
          <div className="font-mono text-xs text-muted-foreground">{node.nodeId}</div>
        </div>
      )}

      {/* Query Form */}
      {node && (
        <div className="border-b p-4">
          <QueryParamsForm params={params} onChange={setParams} disabled={loading} />

          <div className="mt-4 flex gap-2">
            <button
              onClick={executeQuery}
              disabled={loading}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 inline-block h-4 w-4" />
              )}
              Execute Query
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 border-b bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Results Header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm text-muted-foreground">
            {totalDataCount} values
            {continuationPoint && ' (more available)'}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'rounded-l-md px-3 py-1 text-sm',
                  viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <Table className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={cn(
                  'rounded-r-md px-3 py-1 text-sm',
                  viewMode === 'chart' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={exportCsv}
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
              title="Export as CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Results Content */}
      <div className="flex-1 overflow-auto p-4">
        {!node ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Select a node to query historical data
          </div>
        ) : results.length === 0 && !loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Clock className="mr-2 h-5 w-5" />
            Configure parameters and execute query
          </div>
        ) : viewMode === 'table' ? (
          <HistoryDataTable results={results} />
        ) : (
          <HistoryDataChart results={results} />
        )}
      </div>

      {/* Load More */}
      {continuationPoint && (
        <div className="flex items-center justify-center gap-2 border-t px-4 py-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border px-4 py-1 text-sm hover:bg-muted"
          >
            {loading ? (
              <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="mr-2 inline-block h-4 w-4" />
            )}
            Load More
          </button>
          <button
            onClick={releaseContinuation}
            disabled={loading}
            className="rounded-md border px-4 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            <X className="mr-2 inline-block h-4 w-4" />
            Release
          </button>
        </div>
      )}
    </div>
  )
}

export default OpcUaHistoryQuery
