/**
 * CollectionRunner Component
 *
 * UI for running collections and displaying progress/results.
 * Shows real-time progress during execution and detailed results after completion.
 */

import React, { memo, useCallback } from 'react'
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type {
  Collection,
  CollectionProgress,
  CollectionRunResult,
  RequestResult,
  AssertionResult
} from '@shared/types'

interface CollectionRunnerProps {
  /** Collection to run */
  collection: Collection | null
  /** Whether collection is currently running */
  isRunning: boolean
  /** Current run progress */
  progress: CollectionProgress | null
  /** Last run result */
  lastResult: CollectionRunResult | null
  /** Callback to start running */
  onRun: () => void
  /** Callback to stop running */
  onStop: () => void
  /** Optional additional className */
  className?: string
}

interface RequestResultItemProps {
  result: RequestResult
  isExpanded: boolean
  onToggle: () => void
}

const RequestResultItem = memo(function RequestResultItem({
  result,
  isExpanded,
  onToggle
}: RequestResultItemProps): React.ReactElement {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'text-left hover:bg-muted/50 transition-colors'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {getStatusIcon()}
        <span className="flex-1 text-sm font-medium truncate">
          Request {result.requestId}
        </span>
        <span className="text-xs text-muted-foreground">
          {result.latency}ms
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-3 py-2 space-y-2 bg-muted/20">
          {/* Error message */}
          {result.error && (
            <div className="text-sm text-destructive">
              {result.error}
            </div>
          )}

          {/* Assertions */}
          {result.assertions && result.assertions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Assertions
              </div>
              <div className="space-y-1">
                {result.assertions.map((assertion: AssertionResult, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      assertion.passed ? 'text-green-600' : 'text-destructive'
                    )}
                  >
                    {assertion.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    <span>
                      Expected: {String(assertion.expected)}, Got: {String(assertion.actual)}
                    </span>
                    {!assertion.passed && assertion.message && (
                      <span className="text-xs text-muted-foreground">
                        - {assertion.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Value preview */}
          {result.value !== undefined && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Value
              </div>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto max-h-32">
                {typeof result.value === 'object'
                  ? JSON.stringify(result.value, null, 2)
                  : String(result.value)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * CollectionRunner for executing and viewing collection results.
 */
export const CollectionRunner = memo(function CollectionRunner({
  collection,
  isRunning,
  progress,
  lastResult,
  onRun,
  onStop,
  className
}: CollectionRunnerProps): React.ReactElement {
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set())

  const toggleItem = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Calculate progress percentage
  const progressPercent = progress
    ? Math.round((progress.currentIndex / progress.total) * 100)
    : 0

  // Use summary from result if available
  const stats = lastResult?.summary
    ? {
        ...lastResult.summary,
        duration: lastResult.completedAt - lastResult.startedAt
      }
    : null

  if (!collection) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-muted-foreground text-center">
          <p>Select a collection to run</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with run controls */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-lg font-medium text-foreground">{collection.name}</h3>
          <p className="text-sm text-muted-foreground">
            {collection.requests?.length ?? 0} requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onStop}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md',
                'bg-destructive text-destructive-foreground',
                'hover:bg-destructive/90 transition-colors'
              )}
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={onRun}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <Play className="h-4 w-4" />
              Run Collection
            </button>
          )}
        </div>
      </div>

      {/* Progress bar (during run) */}
      {isRunning && progress && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-foreground">
                Running: {progress.currentRequest}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress.currentIndex} / {progress.total}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Results summary */}
      {stats && !isRunning && (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{stats.passed} passed</span>
          </div>
          {stats.failed > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{stats.failed} failed</span>
            </div>
          )}
          {stats.skipped > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{stats.skipped} skipped</span>
            </div>
          )}
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {stats.duration}ms total
          </span>
        </div>
      )}

      {/* Results list */}
      <div className="flex-1 overflow-y-auto p-4">
        {lastResult?.results && lastResult.results.length > 0 ? (
          <div className="space-y-2">
            {lastResult.results.map((result, index) => (
              <RequestResultItem
                key={index}
                result={result}
                isExpanded={expandedItems.has(index)}
                onToggle={() => toggleItem(index)}
              />
            ))}
          </div>
        ) : !isRunning ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No results yet. Run the collection to see results.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
})
