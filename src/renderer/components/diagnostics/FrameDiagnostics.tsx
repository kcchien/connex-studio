/**
 * FrameDiagnostics - Collapsible panel for viewing raw Modbus TCP frames.
 *
 * Features:
 * - Enable/disable toggle (disabled by default for performance)
 * - TX/RX frame display with colored hex bytes
 * - Hover tooltips explaining frame fields
 * - Ring buffer of up to 500 frames
 * - Export to .log or .csv
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { FrameLog, ParsedFrame } from '@shared/types'
import { FUNCTION_CODE_INFO, EXCEPTION_CODE_INFO } from '@shared/types'

export interface FrameDiagnosticsProps {
  /** Array of frame logs to display */
  frames: FrameLog[]
  /** Whether frame logging is currently enabled */
  enabled: boolean
  /** Callback to toggle frame logging */
  onToggleEnabled: (enabled: boolean) => void
  /** Callback to clear all frames */
  onClear: () => void
  /** Optional className */
  className?: string
}

/**
 * Format timestamp as HH:MM:SS.mmm
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * Get function code display name.
 */
function getFunctionCodeName(code: number): string {
  return FUNCTION_CODE_INFO[code]?.name ?? `FC ${code.toString(16).toUpperCase()}`
}

/**
 * Colored hex byte display with tooltips.
 */
function HexDisplay({ frame }: { frame: FrameLog }): React.ReactElement {
  const bytes = frame.rawHex.split(' ')

  // MBAP Header coloring (first 7 bytes)
  // Bytes 0-1: Transaction ID (blue)
  // Bytes 2-3: Protocol ID (gray)
  // Bytes 4-5: Length (purple)
  // Byte 6: Unit ID (orange)
  // Byte 7+: PDU (function code + data)

  const getByteStyle = (index: number): string => {
    if (index < 2) return 'text-blue-600 dark:text-blue-400' // Transaction ID
    if (index < 4) return 'text-gray-500 dark:text-gray-400' // Protocol ID
    if (index < 6) return 'text-purple-600 dark:text-purple-400' // Length
    if (index === 6) return 'text-orange-600 dark:text-orange-400' // Unit ID
    if (index === 7) return 'text-green-600 dark:text-green-400 font-semibold' // Function Code
    return 'text-foreground' // Data
  }

  const getByteTooltip = (index: number): string => {
    if (index < 2) return `Transaction ID: 0x${bytes.slice(0, 2).join('')}`
    if (index < 4) return 'Protocol ID (0x0000 for Modbus)'
    if (index < 6) return `Length: ${parseInt(bytes.slice(4, 6).join(''), 16)} bytes`
    if (index === 6) return `Unit ID: ${parseInt(bytes[6], 16)}`
    if (index === 7) {
      const fc = parseInt(bytes[7], 16)
      const isException = fc >= 0x80
      const actualFc = isException ? fc - 0x80 : fc
      const info = FUNCTION_CODE_INFO[actualFc]
      return isException
        ? `Exception Response (${info?.name ?? `FC ${actualFc}`})`
        : `Function: ${info?.name ?? `FC ${actualFc}`}`
    }
    return 'Data'
  }

  return (
    <div className="font-mono text-xs flex flex-wrap gap-x-1">
      {bytes.map((byte, i) => (
        <span
          key={i}
          className={cn(getByteStyle(i), 'cursor-help')}
          title={getByteTooltip(i)}
        >
          {byte}
        </span>
      ))}
    </div>
  )
}

/**
 * Single frame row display.
 */
function FrameRow({ frame }: { frame: FrameLog }): React.ReactElement {
  const isTx = frame.direction === 'tx'
  const DirectionIcon = isTx ? ArrowUpRight : ArrowDownLeft

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-2 py-1.5 text-xs border-b border-border/50',
        'hover:bg-muted/50 transition-colors',
        frame.parsed.isException && 'bg-destructive/10'
      )}
    >
      {/* Direction indicator */}
      <div
        className={cn(
          'flex items-center gap-1 w-12 shrink-0',
          isTx ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
        )}
        title={isTx ? 'Transmitted (Request)' : 'Received (Response)'}
      >
        <DirectionIcon className="h-3 w-3" />
        <span className="font-medium">{isTx ? 'TX' : 'RX'}</span>
      </div>

      {/* Timestamp */}
      <div className="w-24 shrink-0 text-muted-foreground font-mono">
        {formatTimestamp(frame.timestamp)}
      </div>

      {/* Function code */}
      <div
        className={cn(
          'w-32 shrink-0 truncate',
          frame.parsed.isException && 'text-destructive font-medium'
        )}
        title={
          frame.parsed.isException
            ? `Exception: ${EXCEPTION_CODE_INFO[frame.parsed.exceptionCode ?? 0]?.name ?? 'Unknown'}`
            : getFunctionCodeName(frame.parsed.functionCode)
        }
      >
        {frame.parsed.isException ? (
          <span>! {EXCEPTION_CODE_INFO[frame.parsed.exceptionCode ?? 0]?.name ?? 'Exception'}</span>
        ) : (
          getFunctionCodeName(frame.parsed.functionCode)
        )}
      </div>

      {/* Latency (for RX only) */}
      <div className="w-16 shrink-0 text-right text-muted-foreground">
        {frame.latencyMs !== undefined ? `${frame.latencyMs}ms` : ''}
      </div>

      {/* Hex bytes */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <HexDisplay frame={frame} />
      </div>
    </div>
  )
}

/**
 * Export frames to CSV format.
 */
function exportToCsv(frames: FrameLog[]): void {
  const headers = ['Timestamp', 'Direction', 'Function', 'Unit ID', 'Latency (ms)', 'Raw Hex', 'Tag ID']
  const rows = frames.map((f) => [
    new Date(f.timestamp).toISOString(),
    f.direction.toUpperCase(),
    getFunctionCodeName(f.parsed.functionCode),
    f.parsed.unitId,
    f.latencyMs ?? '',
    f.rawHex,
    f.tagId ?? ''
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

  downloadFile(csv, 'modbus-frames.csv', 'text/csv')
}

/**
 * Export frames to log format.
 */
function exportToLog(frames: FrameLog[]): void {
  const lines = frames.map((f) => {
    const ts = formatTimestamp(f.timestamp)
    const dir = f.direction.toUpperCase().padEnd(2)
    const fc = getFunctionCodeName(f.parsed.functionCode).padEnd(24)
    const latency = f.latencyMs !== undefined ? `${f.latencyMs}ms`.padStart(6) : '      '
    return `[${ts}] ${dir} ${fc} ${latency} ${f.rawHex}`
  })

  const log = lines.join('\n')
  downloadFile(log, 'modbus-frames.log', 'text/plain')
}

/**
 * Trigger file download.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function FrameDiagnostics({
  frames,
  enabled,
  onToggleEnabled,
  onClear,
  className
}: FrameDiagnosticsProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    onToggleEnabled(!enabled)
  }, [enabled, onToggleEnabled])

  const handleExportCsv = useCallback(() => {
    exportToCsv(frames)
  }, [frames])

  const handleExportLog = useCallback(() => {
    exportToLog(frames)
  }, [frames])

  // Reverse frames for newest-first display
  const reversedFrames = useMemo(() => [...frames].reverse(), [frames])

  // Statistics
  const txCount = frames.filter((f) => f.direction === 'tx').length
  const rxCount = frames.filter((f) => f.direction === 'rx').length
  const errorCount = frames.filter((f) => f.parsed.isException).length

  return (
    <div className={cn('border-t border-border bg-card', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'text-sm font-medium text-foreground',
          'hover:bg-muted/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span>Frame Diagnostics</span>

        {/* Status indicators */}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {enabled && frames.length > 0 && (
            <>
              <span title="Transmitted frames">{txCount} TX</span>
              <span title="Received frames">{rxCount} RX</span>
              {errorCount > 0 && (
                <span className="text-destructive" title="Exception responses">
                  {errorCount} errors
                </span>
              )}
            </>
          )}
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium',
              enabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
            {/* Enable toggle */}
            <button
              type="button"
              onClick={handleToggle}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
                'transition-colors',
                enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              title={enabled ? 'Disable frame logging' : 'Enable frame logging'}
            >
              {enabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              <span>{enabled ? 'Enabled' : 'Disabled'}</span>
            </button>

            <div className="flex-1" />

            {/* Export buttons */}
            <button
              type="button"
              onClick={handleExportLog}
              disabled={frames.length === 0}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                'bg-muted text-muted-foreground hover:bg-muted/80',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Export as .log file"
            >
              <Download className="h-3 w-3" />
              <span>.log</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={frames.length === 0}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                'bg-muted text-muted-foreground hover:bg-muted/80',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Export as .csv file"
            >
              <Download className="h-3 w-3" />
              <span>.csv</span>
            </button>

            {/* Clear button */}
            <button
              type="button"
              onClick={onClear}
              disabled={frames.length === 0}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Clear all frames"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border-b border-border">
            <span className="font-medium">Legend:</span>
            <span className="text-blue-600 dark:text-blue-400">Transaction ID</span>
            <span className="text-gray-500 dark:text-gray-400">Protocol</span>
            <span className="text-purple-600 dark:text-purple-400">Length</span>
            <span className="text-orange-600 dark:text-orange-400">Unit ID</span>
            <span className="text-green-600 dark:text-green-400">Function</span>
            <span>Data</span>
          </div>

          {/* Frame list */}
          <div className="max-h-64 overflow-y-auto">
            {frames.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {enabled ? (
                  'No frames captured yet. Perform a read operation to see frames.'
                ) : (
                  'Frame logging is disabled. Enable it to capture Modbus frames.'
                )}
              </div>
            ) : (
              reversedFrames.map((frame) => <FrameRow key={frame.id} frame={frame} />)
            )}
          </div>

          {/* Footer with buffer info */}
          {frames.length > 0 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border-t border-border">
              {frames.length} frames (max 500) | Oldest will be dropped when full
            </div>
          )}
        </div>
      )}
    </div>
  )
}
