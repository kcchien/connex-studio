/**
 * ReportPreview Component
 *
 * Shows a preview of what the exported report will contain.
 * Displays tag summary, time range, and estimated data size.
 */

import React, { memo, useMemo } from 'react'
import { FileText, Clock, Tag as TagIcon, Database } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Tag } from '@shared/types/tag'

interface ReportPreviewProps {
  /** Selected tags to export */
  tags: Tag[]
  /** Start timestamp */
  startTimestamp: number
  /** End timestamp */
  endTimestamp: number
  /** Export format */
  format: 'csv' | 'html'
  /** Whether charts are included (HTML only) */
  includeCharts?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * ReportPreview shows what will be included in the export.
 */
export const ReportPreview = memo(function ReportPreview({
  tags,
  startTimestamp,
  endTimestamp,
  format,
  includeCharts = false,
  className
}: ReportPreviewProps): React.ReactElement {
  // Calculate time range duration
  const duration = useMemo(() => {
    const ms = endTimestamp - startTimestamp
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }, [startTimestamp, endTimestamp])

  // Format dates
  const startDate = new Date(startTimestamp).toLocaleString()
  const endDate = new Date(endTimestamp).toLocaleString()

  // Estimate data size (rough calculation)
  const estimatedRows = useMemo(() => {
    // Assume average 500ms polling interval
    const durationMs = endTimestamp - startTimestamp
    const samplesPerTag = Math.ceil(durationMs / 500)
    return samplesPerTag * tags.length
  }, [startTimestamp, endTimestamp, tags.length])

  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 p-4', className)}>
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Export Preview
      </h3>

      <div className="space-y-3 text-sm">
        {/* Format */}
        <div className="flex items-start gap-3">
          <div className="text-muted-foreground w-24">Format:</div>
          <div className="text-foreground font-medium">
            {format === 'csv' ? 'CSV (Comma-Separated Values)' : 'HTML Report'}
            {format === 'html' && includeCharts && (
              <span className="ml-2 text-xs text-muted-foreground">(with charts)</span>
            )}
          </div>
        </div>

        {/* Time range */}
        <div className="flex items-start gap-3">
          <div className="text-muted-foreground w-24 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Time Range:
          </div>
          <div className="text-foreground">
            <div className="text-xs text-muted-foreground">{startDate}</div>
            <div className="text-xs text-muted-foreground">to {endDate}</div>
            <div className="text-xs font-medium mt-0.5">({duration})</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-start gap-3">
          <div className="text-muted-foreground w-24 flex items-center gap-1">
            <TagIcon className="h-3 w-3" />
            Tags:
          </div>
          <div className="text-foreground">
            <div className="font-medium">{tags.length} tag{tags.length !== 1 ? 's' : ''}</div>
            {tags.length > 0 && tags.length <= 5 && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {tags.map((t) => t.name).join(', ')}
              </div>
            )}
            {tags.length > 5 && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {tags.slice(0, 3).map((t) => t.name).join(', ')}
                {' and '}{tags.length - 3} more...
              </div>
            )}
          </div>
        </div>

        {/* Estimated size */}
        <div className="flex items-start gap-3">
          <div className="text-muted-foreground w-24 flex items-center gap-1">
            <Database className="h-3 w-3" />
            Est. Rows:
          </div>
          <div className="text-foreground">
            <span className="font-medium">{estimatedRows.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground ml-1">(approximate)</span>
          </div>
        </div>

        {/* CSV columns */}
        {format === 'csv' && (
          <div className="flex items-start gap-3">
            <div className="text-muted-foreground w-24">Columns:</div>
            <div className="text-xs text-muted-foreground font-mono">
              Timestamp, DateTime, TagName, Value, Quality
            </div>
          </div>
        )}

        {/* HTML sections */}
        {format === 'html' && (
          <div className="flex items-start gap-3">
            <div className="text-muted-foreground w-24">Sections:</div>
            <div className="text-xs text-muted-foreground">
              Summary, Statistics (Min/Max/Avg), {includeCharts ? 'Trend Charts' : 'No Charts'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
