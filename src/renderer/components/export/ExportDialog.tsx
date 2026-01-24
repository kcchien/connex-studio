/**
 * ExportDialog Component
 *
 * Modal dialog for configuring and initiating data exports.
 * Supports CSV and HTML report formats with tag selection and time range.
 */

import React, { useState, useCallback, memo, useMemo } from 'react'
import { X, Download, FileText, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTagStore } from '@renderer/stores/tagStore'
import { useDvrStore } from '@renderer/stores/dvrStore'
import type { Tag } from '@shared/types/tag'

type ExportFormat = 'csv' | 'html'

interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Selected connection ID for filtering tags */
  connectionId: string | null
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when export is initiated */
  onExport: (params: {
    format: ExportFormat
    tagIds: string[]
    startTimestamp: number
    endTimestamp: number
    includeCharts: boolean
  }) => Promise<void>
  /** Optional additional className */
  className?: string
}

/**
 * ExportDialog for configuring data exports.
 */
export const ExportDialog = memo(function ExportDialog({
  isOpen,
  connectionId,
  onClose,
  onExport,
  className
}: ExportDialogProps): React.ReactElement | null {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [includeCharts, setIncludeCharts] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get tags for the selected connection
  const tagsByConnection = useTagStore((state) => state.tagsByConnection)
  const tags = connectionId ? (tagsByConnection.get(connectionId) || []) : []

  // Get DVR time range
  const bufferStartTimestamp = useDvrStore((state) => state.bufferStartTimestamp)
  const bufferEndTimestamp = useDvrStore((state) => state.bufferEndTimestamp)

  // Time range state (default to buffer range)
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setFormat('csv')
      setSelectedTags(new Set(tags.map((t) => t.id)))
      setIncludeCharts(true)
      setError(null)

      // Set default time range from buffer
      if (bufferStartTimestamp && bufferEndTimestamp) {
        setStartTime(formatDateTimeLocal(bufferStartTimestamp))
        setEndTime(formatDateTimeLocal(bufferEndTimestamp))
      } else {
        // Default to last hour if no buffer data
        const now = Date.now()
        setEndTime(formatDateTimeLocal(now))
        setStartTime(formatDateTimeLocal(now - 3600000))
      }
    }
  }, [isOpen, tags, bufferStartTimestamp, bufferEndTimestamp])

  // Toggle tag selection
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  // Select all/none
  const selectAll = useCallback(() => {
    setSelectedTags(new Set(tags.map((t) => t.id)))
  }, [tags])

  const selectNone = useCallback(() => {
    setSelectedTags(new Set())
  }, [])

  // Parse timestamps from datetime-local inputs
  const startTimestamp = useMemo(() => {
    return startTime ? new Date(startTime).getTime() : 0
  }, [startTime])

  const endTimestamp = useMemo(() => {
    return endTime ? new Date(endTime).getTime() : 0
  }, [endTime])

  // Handle export
  const handleExport = useCallback(async () => {
    if (selectedTags.size === 0) {
      setError('Select at least one tag to export')
      return
    }

    if (startTimestamp >= endTimestamp) {
      setError('End time must be after start time')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      await onExport({
        format,
        tagIds: Array.from(selectedTags),
        startTimestamp,
        endTimestamp,
        includeCharts
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [format, selectedTags, startTimestamp, endTimestamp, includeCharts, onExport, onClose])

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'w-full max-w-lg p-4',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Export Data</h2>
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-2 mb-4 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Format selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">Export Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('csv')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'border transition-colors',
                format === 'csv'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-foreground hover:bg-muted'
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => setFormat('html')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'border transition-colors',
                format === 'html'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-foreground hover:bg-muted'
              )}
            >
              <FileText className="h-4 w-4" />
              HTML Report
            </button>
          </div>
        </div>

        {/* Time range */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-background border border-input',
                'text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>
        </div>

        {/* Tag selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">Select Tags</label>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-muted-foreground hover:text-foreground">
                All
              </button>
              <span className="text-muted-foreground">/</span>
              <button onClick={selectNone} className="text-muted-foreground hover:text-foreground">
                None
              </button>
            </div>
          </div>

          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No tags available</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-md p-2">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded cursor-pointer',
                    'hover:bg-muted/50 transition-colors'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-foreground">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">({tag.dataType})</span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {selectedTags.size} of {tags.length} selected
          </p>
        </div>

        {/* HTML-specific options */}
        {format === 'html' && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">Include trend charts</span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedTags.size === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
})

/**
 * Format a timestamp for datetime-local input.
 */
function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
