/**
 * LogViewer Component
 *
 * A panel that displays application logs with filtering capabilities.
 * Shows logs from both Main and Renderer processes.
 * Supports filtering by log level (debug, info, warn, error).
 *
 * @see ipc-channels.md § Log Channels
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { cn } from '@renderer/lib/utils'
import type { LogLevel, LogEntry } from '@shared/types'

interface LogViewerProps {
  className?: string
  maxHeight?: string
  autoRefreshInterval?: number // ms, default 5000
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-muted-foreground',
  info: 'text-blue-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
  verbose: 'text-muted-foreground/70'
}

const LOG_LEVEL_BADGES: Record<LogLevel, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/10 text-blue-500',
  warn: 'bg-yellow-500/10 text-yellow-500',
  error: 'bg-red-500/10 text-red-500',
  verbose: 'bg-muted/50 text-muted-foreground'
}

export function LogViewer({
  className,
  maxHeight = '400px',
  autoRefreshInterval = 5000
}: LogViewerProps): React.ReactElement {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch logs from main process
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: { limit?: number; level?: LogLevel } = { limit: 200 }
      if (filterLevel !== 'all') {
        params.level = filterLevel
      }
      const result = await window.electronAPI.log.getRecent(params)
      if ('entries' in result && result.entries) {
        setLogs(result.entries)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filterLevel])

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchLogs()

    const intervalId = setInterval(fetchLogs, autoRefreshInterval)
    return () => clearInterval(intervalId)
  }, [fetchLogs, autoRefreshInterval])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setAutoScroll(isAtBottom)
    }
  }, [])

  // Open log folder
  const handleOpenFolder = useCallback(async () => {
    try {
      await window.electronAPI.log.openFolder()
    } catch (error) {
      console.error('Failed to open log folder:', error)
    }
  }, [])

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={cn('flex flex-col bg-card rounded-lg border border-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Application Logs</h3>
        <div className="flex items-center gap-2">
          {/* Level filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
            className="px-2 py-1 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(isLoading && 'animate-spin')}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>

          {/* Open folder button */}
          <button
            onClick={handleOpenFolder}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Open log folder"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              <path d="M12 10v6" />
              <path d="m15 13-3 3-3-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto font-mono text-xs"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>No logs to display</p>
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {logs.map((log, index) => (
                <tr
                  key={`${log.timestamp}-${index}`}
                  className="border-b border-border/50 last:border-b-0 hover:bg-accent/50"
                >
                  <td className="px-2 py-1 text-muted-foreground whitespace-nowrap align-top">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap align-top">
                    <span
                      className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                        LOG_LEVEL_BADGES[log.level]
                      )}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className={cn('px-2 py-1 break-all', LOG_LEVEL_COLORS[log.level])}>
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with auto-scroll indicator */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-border text-xs text-muted-foreground">
        <span>{logs.length} entries</span>
        <button
          onClick={() => {
            setAutoScroll(true)
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
            }
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded transition-colors',
            autoScroll
              ? 'text-green-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <span
            className={cn('w-2 h-2 rounded-full', autoScroll ? 'bg-green-500' : 'bg-muted')}
          />
          Auto-scroll
        </button>
      </div>
    </div>
  )
}
