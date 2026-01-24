/**
 * ExportProgress Component
 *
 * Displays export progress with a progress bar.
 * Used for large exports (>10000 rows).
 */

import React, { memo } from 'react'
import { Loader2, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface ExportProgressProps {
  /** Export type: csv or html */
  type: 'csv' | 'html'
  /** Current progress (0-100) */
  progress: number
  /** Current row/item being processed */
  current: number
  /** Total rows/items to process */
  total: number
  /** Whether export is complete */
  isComplete?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * ExportProgress displays a progress bar for ongoing exports.
 */
export const ExportProgress = memo(function ExportProgress({
  type,
  progress,
  current,
  total,
  isComplete = false,
  className
}: ExportProgressProps): React.ReactElement {
  const Icon = type === 'csv' ? FileSpreadsheet : FileText
  const label = type === 'csv' ? 'CSV Export' : 'HTML Report'

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-card border border-border',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full',
          isComplete ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>

      {/* Progress info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">
            {isComplete ? 'Complete' : `${current.toLocaleString()} / ${total.toLocaleString()}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isComplete ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        {/* Percentage */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {isComplete ? 'Export saved successfully' : 'Processing...'}
          </span>
          <span className="text-xs font-medium text-foreground">{progress}%</span>
        </div>
      </div>

      {/* Spinner when in progress */}
      {!isComplete && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
    </div>
  )
})
