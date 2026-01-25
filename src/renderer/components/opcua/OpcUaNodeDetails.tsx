/**
 * OpcUaNodeDetails - Displays detailed attributes for a selected OPC UA node.
 *
 * Features:
 * - Shows all node attributes (T088)
 * - Variable-specific attributes (value, dataType, accessLevel)
 * - Method-specific attributes (executable)
 * - Auto-refresh for Variable values
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Variable,
  Play,
  Folder,
  Box,
  Database,
  Eye,
  Link,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useOpcUa } from '@renderer/hooks/useOpcUa'
import type { OpcUaNode, OpcUaNodeAttributes, NodeClass } from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface OpcUaNodeDetailsProps {
  connectionId: string
  node: OpcUaNode | null
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

// =============================================================================
// Helper Functions
// =============================================================================

function getNodeIcon(nodeClass: NodeClass): React.ReactNode {
  switch (nodeClass) {
    case 'Object':
      return <Folder className="h-5 w-5 text-amber-500" />
    case 'Variable':
      return <Variable className="h-5 w-5 text-blue-500" />
    case 'Method':
      return <Play className="h-5 w-5 text-green-500" />
    case 'ObjectType':
      return <Box className="h-5 w-5 text-purple-500" />
    case 'VariableType':
      return <Database className="h-5 w-5 text-indigo-500" />
    case 'ReferenceType':
      return <Link className="h-5 w-5 text-gray-500" />
    case 'DataType':
      return <Database className="h-5 w-5 text-teal-500" />
    case 'View':
      return <Eye className="h-5 w-5 text-cyan-500" />
    default:
      return <Folder className="h-5 w-5 text-gray-400" />
  }
}

function formatAccessLevel(accessLevel: number): string[] {
  const flags: string[] = []
  if (accessLevel & 0x01) flags.push('Read')
  if (accessLevel & 0x02) flags.push('Write')
  if (accessLevel & 0x04) flags.push('HistoryRead')
  if (accessLevel & 0x08) flags.push('HistoryWrite')
  if (accessLevel & 0x10) flags.push('SemanticChange')
  if (accessLevel & 0x20) flags.push('StatusWrite')
  if (accessLevel & 0x40) flags.push('TimestampWrite')
  return flags
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

// =============================================================================
// Badge Component
// =============================================================================

function Badge({
  children,
  variant = 'default'
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline'
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border text-foreground'
      )}
    >
      {children}
    </span>
  )
}

// =============================================================================
// DetailRow Component
// =============================================================================

interface DetailRowProps {
  label: string
  value: React.ReactNode
  mono?: boolean
  onCopy?: string
}

function DetailRow({ label, value, mono, onCopy }: DetailRowProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (onCopy) {
      navigator.clipboard.writeText(onCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [onCopy])

  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span
        className={cn(
          'text-sm flex-1 break-all',
          mono && 'font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded'
        )}
      >
        {value}
      </span>
      {onCopy && (
        <button
          className="h-6 w-6 p-0.5 rounded hover:bg-muted"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}

// =============================================================================
// OpcUaNodeDetails Component
// =============================================================================

export function OpcUaNodeDetails({
  connectionId,
  node,
  className,
  autoRefresh = false,
  refreshInterval = 1000
}: OpcUaNodeDetailsProps): React.ReactElement {
  const { readNodeAttributes, isLoading, error } = useOpcUa()

  const [attributes, setAttributes] = useState<OpcUaNodeAttributes | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Load node attributes when node changes
  useEffect(() => {
    if (node) {
      loadAttributes()
    } else {
      setAttributes(null)
    }
  }, [node?.nodeId, connectionId])

  // Auto-refresh for Variable nodes
  useEffect(() => {
    if (!autoRefresh || !node || node.nodeClass !== 'Variable') {
      return
    }

    const timer = setInterval(() => {
      loadAttributes()
    }, refreshInterval)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, node?.nodeId, node?.nodeClass])

  const loadAttributes = useCallback(async (): Promise<void> => {
    if (!node) return

    const result = await readNodeAttributes({
      connectionId,
      nodeId: node.nodeId
    })

    if (result) {
      setAttributes(result)
      setLastRefresh(new Date())
    }
  }, [connectionId, node?.nodeId, readNodeAttributes])

  if (!node) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <p className="text-sm text-muted-foreground">Select a node to view details</p>
      </div>
    )
  }

  return (
    <div className={cn('h-full overflow-auto', className)}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {getNodeIcon(node.nodeClass)}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate">{node.displayName}</h3>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {node.nodeId}
            </p>
          </div>
          <button
            onClick={loadAttributes}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <hr className="border-border" />

        {/* Loading State */}
        {isLoading && !attributes && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Attributes */}
        {attributes && (
          <div className="space-y-4">
            {/* Basic Attributes */}
            <div>
              <h4 className="text-sm font-medium mb-2">Basic Attributes</h4>
              <div className="space-y-0.5">
                <DetailRow label="Node ID" value={attributes.nodeId} mono onCopy={attributes.nodeId} />
                <DetailRow label="Node Class" value={<Badge variant="outline">{attributes.nodeClass}</Badge>} />
                <DetailRow label="Browse Name" value={attributes.browseName} mono />
                <DetailRow label="Display Name" value={attributes.displayName} />
                {attributes.description && (
                  <DetailRow label="Description" value={attributes.description} />
                )}
              </div>
            </div>

            {/* Variable Attributes */}
            {(attributes.nodeClass === 'Variable' || attributes.nodeClass === 'VariableType') && (
              <>
                <hr className="border-border" />
                <div>
                  <h4 className="text-sm font-medium mb-2">Variable Attributes</h4>
                  <div className="space-y-0.5">
                    <DetailRow
                      label="Value"
                      value={
                        <pre className="font-mono text-xs bg-muted/50 p-2 rounded max-h-32 overflow-auto">
                          {formatValue(attributes.value)}
                        </pre>
                      }
                    />
                    {attributes.dataType && (
                      <DetailRow label="Data Type" value={<Badge variant="secondary">{attributes.dataType}</Badge>} />
                    )}
                    {attributes.valueRank !== undefined && (
                      <DetailRow
                        label="Value Rank"
                        value={
                          attributes.valueRank === -1
                            ? 'Scalar'
                            : attributes.valueRank === 0
                              ? 'Any Dimensions'
                              : `${attributes.valueRank}D Array`
                        }
                      />
                    )}
                    {attributes.arrayDimensions && attributes.arrayDimensions.length > 0 && (
                      <DetailRow label="Array Dimensions" value={attributes.arrayDimensions.join(' x ')} />
                    )}
                    {attributes.accessLevel !== undefined && (
                      <DetailRow
                        label="Access Level"
                        value={
                          <div className="flex flex-wrap gap-1">
                            {formatAccessLevel(attributes.accessLevel).map((flag) => (
                              <Badge key={flag} variant="outline">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        }
                      />
                    )}
                    {attributes.userAccessLevel !== undefined && (
                      <DetailRow
                        label="User Access"
                        value={
                          <div className="flex flex-wrap gap-1">
                            {formatAccessLevel(attributes.userAccessLevel).map((flag) => (
                              <Badge key={flag} variant="outline">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        }
                      />
                    )}
                    {attributes.minimumSamplingInterval !== undefined && (
                      <DetailRow
                        label="Min Sampling"
                        value={
                          attributes.minimumSamplingInterval === 0
                            ? 'Continuous'
                            : attributes.minimumSamplingInterval === -1
                              ? 'Indeterminate'
                              : `${attributes.minimumSamplingInterval} ms`
                        }
                      />
                    )}
                    {attributes.historizing !== undefined && (
                      <DetailRow
                        label="Historizing"
                        value={
                          <Badge variant={attributes.historizing ? 'default' : 'secondary'}>
                            {attributes.historizing ? 'Yes' : 'No'}
                          </Badge>
                        }
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Method Attributes */}
            {attributes.nodeClass === 'Method' && (
              <>
                <hr className="border-border" />
                <div>
                  <h4 className="text-sm font-medium mb-2">Method Attributes</h4>
                  <div className="space-y-0.5">
                    {attributes.executable !== undefined && (
                      <DetailRow
                        label="Executable"
                        value={
                          <Badge variant={attributes.executable ? 'default' : 'secondary'}>
                            {attributes.executable ? 'Yes' : 'No'}
                          </Badge>
                        }
                      />
                    )}
                    {attributes.userExecutable !== undefined && (
                      <DetailRow
                        label="User Executable"
                        value={
                          <Badge variant={attributes.userExecutable ? 'default' : 'secondary'}>
                            {attributes.userExecutable ? 'Yes' : 'No'}
                          </Badge>
                        }
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Last Refresh */}
            {lastRefresh && (
              <>
                <hr className="border-border" />
                <div className="text-xs text-muted-foreground text-center">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
