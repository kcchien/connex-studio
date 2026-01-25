/**
 * OpcUaWriteConfirm - Confirmation dialog for writing to critical OPC UA nodes.
 *
 * Features:
 * - Shows current vs new value comparison
 * - Displays node information (NodeId, DataType, AccessLevel)
 * - Requires explicit confirmation for writes
 * - Optional "skip confirmation" checkbox for non-critical operations
 */

import React, { useState, useCallback } from 'react'
import {
  AlertTriangle,
  X,
  Check,
  Info
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface OpcUaWriteConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (skipFutureConfirmation: boolean) => void
  nodeId: string
  displayName: string
  dataType: string
  currentValue: unknown
  newValue: unknown
  accessLevel?: number
  isCritical?: boolean
  className?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function formatAccessLevel(accessLevel: number | undefined): string {
  if (accessLevel === undefined) return 'Unknown'

  const flags: string[] = []
  if (accessLevel & 0x01) flags.push('Read')
  if (accessLevel & 0x02) flags.push('Write')
  if (accessLevel & 0x04) flags.push('HistoryRead')
  if (accessLevel & 0x08) flags.push('HistoryWrite')
  return flags.join(', ') || 'None'
}

// =============================================================================
// OpcUaWriteConfirm Component
// =============================================================================

export function OpcUaWriteConfirm({
  isOpen,
  onClose,
  onConfirm,
  nodeId,
  displayName,
  dataType,
  currentValue,
  newValue,
  accessLevel,
  isCritical = false,
  className
}: OpcUaWriteConfirmProps): React.ReactElement | null {
  const [skipConfirmation, setSkipConfirmation] = useState(false)

  const handleConfirm = useCallback(() => {
    onConfirm(skipConfirmation)
  }, [onConfirm, skipConfirmation])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !isCritical) {
      handleConfirm()
    }
  }, [onClose, handleConfirm, isCritical])

  if (!isOpen) {
    return null
  }

  const valuesChanged = formatValue(currentValue) !== formatValue(newValue)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'bg-background rounded-lg shadow-lg w-full max-w-md p-6',
          isCritical && 'border-2 border-destructive',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="write-confirm-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {isCritical ? (
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
          ) : (
            <Info className="h-6 w-6 text-amber-500 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 id="write-confirm-title" className="text-lg font-semibold">
              {isCritical ? 'Critical Write Operation' : 'Confirm Write Operation'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isCritical
                ? 'This is a critical node. Please review carefully before proceeding.'
                : 'Please confirm you want to write this value.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Node Information */}
        <div className="space-y-3 mb-4">
          <div className="bg-muted/50 rounded-md p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Node</span>
              <span className="font-medium truncate max-w-[200px]" title={displayName}>
                {displayName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Node ID</span>
              <span className="font-mono text-xs truncate max-w-[200px]" title={nodeId}>
                {nodeId}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data Type</span>
              <span className="font-medium">{dataType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Access Level</span>
              <span className="font-medium">{formatAccessLevel(accessLevel)}</span>
            </div>
          </div>

          {/* Value Comparison */}
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Current Value</span>
              <div className="mt-1 p-2 bg-muted/30 rounded text-sm font-mono max-h-20 overflow-auto">
                {formatValue(currentValue)}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">New Value</span>
              <div
                className={cn(
                  'mt-1 p-2 rounded text-sm font-mono max-h-20 overflow-auto',
                  valuesChanged ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/30'
                )}
              >
                {formatValue(newValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Skip Confirmation Checkbox (only for non-critical) */}
        {!isCritical && (
          <label className="flex items-center gap-2 mb-4 text-sm">
            <input
              type="checkbox"
              checked={skipConfirmation}
              onChange={(e) => setSkipConfirmation(e.target.checked)}
              className="rounded border-muted-foreground"
            />
            <span className="text-muted-foreground">
              Don't ask again for this session
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              'px-4 py-2 text-sm rounded-md flex items-center gap-2',
              isCritical
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <Check className="h-4 w-4" />
            {isCritical ? 'Confirm Critical Write' : 'Write Value'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Hook for managing write confirmation state
// =============================================================================

interface UseWriteConfirmOptions {
  skipConfirmationForNonCritical?: boolean
}

interface WriteConfirmState {
  isOpen: boolean
  nodeId: string
  displayName: string
  dataType: string
  currentValue: unknown
  newValue: unknown
  accessLevel?: number
  isCritical: boolean
  onConfirm: (() => void) | null
}

const initialState: WriteConfirmState = {
  isOpen: false,
  nodeId: '',
  displayName: '',
  dataType: '',
  currentValue: null,
  newValue: null,
  accessLevel: undefined,
  isCritical: false,
  onConfirm: null
}

export function useWriteConfirm(options: UseWriteConfirmOptions = {}) {
  const [state, setState] = useState<WriteConfirmState>(initialState)
  const [skipNonCritical, setSkipNonCritical] = useState(
    options.skipConfirmationForNonCritical ?? false
  )

  const requestConfirmation = useCallback(
    (
      params: Omit<WriteConfirmState, 'isOpen' | 'onConfirm'>,
      onConfirmed: () => void
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        // Skip confirmation for non-critical if user opted out
        if (!params.isCritical && skipNonCritical) {
          onConfirmed()
          resolve(true)
          return
        }

        setState({
          ...params,
          isOpen: true,
          onConfirm: () => {
            onConfirmed()
            resolve(true)
          }
        })
      })
    },
    [skipNonCritical]
  )

  const handleClose = useCallback(() => {
    setState(initialState)
  }, [])

  const handleConfirm = useCallback(
    (skipFuture: boolean) => {
      if (skipFuture) {
        setSkipNonCritical(true)
      }
      state.onConfirm?.()
      setState(initialState)
    },
    [state.onConfirm]
  )

  return {
    state,
    requestConfirmation,
    handleClose,
    handleConfirm,
    skipNonCritical,
    setSkipNonCritical
  }
}
