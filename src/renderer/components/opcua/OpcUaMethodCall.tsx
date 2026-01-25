/**
 * OpcUaMethodCall - UI component for calling OPC UA methods.
 *
 * Features:
 * - Browse and select methods (T138)
 * - Display method arguments with types (T139)
 * - Input argument values with validation (T140)
 * - Execute method and display results (T140)
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Play,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  RefreshCw,
  Folder,
  Info
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useOpcUa } from '@renderer/hooks/useOpcUa'
import type {
  OpcUaNode,
  OpcUaMethodArguments,
  MethodArgument,
  OpcUaCallMethodResult
} from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface OpcUaMethodCallProps {
  connectionId: string
  objectNode?: OpcUaNode | null
  methodNode?: OpcUaNode | null
  className?: string
  onMethodCalled?: (result: OpcUaCallMethodResult) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDefaultValue(dataType: string): unknown {
  const lowerType = dataType.toLowerCase()
  if (lowerType.includes('boolean')) return false
  if (lowerType.includes('int') || lowerType.includes('uint') || lowerType.includes('byte')) return 0
  if (lowerType.includes('float') || lowerType.includes('double')) return 0.0
  if (lowerType.includes('string')) return ''
  if (lowerType.includes('datetime')) return new Date().toISOString()
  return null
}

function parseValue(value: string, dataType: string): unknown {
  const lowerType = dataType.toLowerCase()

  if (lowerType.includes('boolean')) {
    return value.toLowerCase() === 'true' || value === '1'
  }
  if (lowerType.includes('int') || lowerType.includes('uint') || lowerType.includes('byte')) {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? 0 : parsed
  }
  if (lowerType.includes('float') || lowerType.includes('double')) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  if (lowerType.includes('datetime')) {
    return new Date(value).toISOString()
  }

  // Try to parse as JSON for complex types
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function getStatusCodeMessage(statusCode: number): { message: string; isSuccess: boolean } {
  if (statusCode === 0) return { message: 'Good', isSuccess: true }
  if (statusCode === 0x80010000) return { message: 'BadUnexpectedError', isSuccess: false }
  if (statusCode === 0x80020000) return { message: 'BadInternalError', isSuccess: false }
  if (statusCode === 0x80030000) return { message: 'BadOutOfMemory', isSuccess: false }
  if (statusCode === 0x80340000) return { message: 'BadTypeMismatch', isSuccess: false }
  if (statusCode === 0x80350000) return { message: 'BadNotReadable', isSuccess: false }
  if (statusCode === 0x803c0000) return { message: 'BadInvalidArgument', isSuccess: false }
  return { message: `Status: 0x${statusCode.toString(16).toUpperCase()}`, isSuccess: statusCode === 0 }
}

// =============================================================================
// Badge Component
// =============================================================================

function Badge({
  children,
  variant = 'default'
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'danger'
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border text-foreground',
        variant === 'success' && 'bg-green-500/10 text-green-700',
        variant === 'danger' && 'bg-red-500/10 text-red-700'
      )}
    >
      {children}
    </span>
  )
}

// =============================================================================
// ArgumentInput Component
// =============================================================================

interface ArgumentInputProps {
  argument: MethodArgument
  value: string
  onChange: (value: string) => void
}

function ArgumentInput({ argument, value, onChange }: ArgumentInputProps): React.ReactElement {
  const isBoolean = argument.dataType.toLowerCase().includes('boolean')
  const isNumber =
    argument.dataType.toLowerCase().includes('int') ||
    argument.dataType.toLowerCase().includes('float') ||
    argument.dataType.toLowerCase().includes('double') ||
    argument.dataType.toLowerCase().includes('byte')

  if (isBoolean) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-md text-sm"
      >
        <option value="false">False</option>
        <option value="true">True</option>
      </select>
    )
  }

  return (
    <input
      type={isNumber ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${argument.dataType} value`}
      className="w-full px-3 py-2 border rounded-md text-sm font-mono"
    />
  )
}

// =============================================================================
// ResultDisplay Component
// =============================================================================

interface ResultDisplayProps {
  result: OpcUaCallMethodResult
  outputArgs: MethodArgument[]
}

function ResultDisplay({ result, outputArgs }: ResultDisplayProps): React.ReactElement {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const { message, isSuccess } = getStatusCodeMessage(result.statusCode)

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [])

  return (
    <div className="space-y-3">
      {/* Status */}
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
        <span className={cn('font-medium', isSuccess ? 'text-green-700' : 'text-red-700')}>
          {message}
        </span>
      </div>

      {/* Input Argument Results */}
      {result.inputArgumentResults && result.inputArgumentResults.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-1">Input Argument Results</h5>
          <div className="space-y-1">
            {result.inputArgumentResults.map((status, index) => {
              const { message: argMessage, isSuccess: argSuccess } = getStatusCodeMessage(status)
              return (
                <div
                  key={index}
                  className={cn(
                    'px-2 py-1 rounded text-xs',
                    argSuccess ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}
                >
                  Arg {index}: {argMessage}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Output Arguments */}
      {result.outputArguments && result.outputArguments.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-1">Output Arguments</h5>
          <div className="space-y-2">
            {result.outputArguments.map((value, index) => {
              const argDef = outputArgs[index]
              const formattedValue = formatValue(value)
              return (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
                    <span className="text-sm font-medium">
                      {argDef?.name || `Output ${index}`}
                    </span>
                    {argDef && (
                      <Badge variant="secondary">{argDef.dataType}</Badge>
                    )}
                  </div>
                  <div className="relative">
                    <pre className="px-3 py-2 text-xs font-mono overflow-auto max-h-32 bg-card">
                      {formattedValue}
                    </pre>
                    <button
                      onClick={() => handleCopy(formattedValue, index)}
                      className="absolute top-1 right-1 p-1 rounded hover:bg-muted"
                      title="Copy value"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// OpcUaMethodCall Component
// =============================================================================

export function OpcUaMethodCall({
  connectionId,
  objectNode,
  methodNode,
  className,
  onMethodCalled
}: OpcUaMethodCallProps): React.ReactElement {
  const { getMethodArgs, callMethod, isLoading, error } = useOpcUa()

  const [methodArgs, setMethodArgs] = useState<OpcUaMethodArguments | null>(null)
  const [inputValues, setInputValues] = useState<string[]>([])
  const [result, setResult] = useState<OpcUaCallMethodResult | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  // Load method arguments when method node changes
  useEffect(() => {
    if (objectNode && methodNode) {
      loadMethodArgs()
    } else {
      setMethodArgs(null)
      setInputValues([])
      setResult(null)
    }
  }, [objectNode?.nodeId, methodNode?.nodeId, connectionId])

  const loadMethodArgs = useCallback(async () => {
    if (!objectNode || !methodNode) return

    setLocalError(null)
    const args = await getMethodArgs(connectionId, objectNode.nodeId, methodNode.nodeId)

    if (args) {
      setMethodArgs(args)
      // Initialize input values with defaults
      setInputValues(
        args.inputArguments.map((arg) => String(getDefaultValue(arg.dataType) ?? ''))
      )
    }
  }, [connectionId, objectNode?.nodeId, methodNode?.nodeId, getMethodArgs])

  const handleInputChange = useCallback((index: number, value: string) => {
    setInputValues((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const handleCall = useCallback(async () => {
    if (!objectNode || !methodNode || !methodArgs) return

    setLocalError(null)
    setResult(null)

    // Parse input values
    const parsedInputs = methodArgs.inputArguments.map((arg, index) =>
      parseValue(inputValues[index] || '', arg.dataType)
    )

    const callResult = await callMethod({
      connectionId,
      objectId: objectNode.nodeId,
      methodId: methodNode.nodeId,
      inputArguments: parsedInputs
    })

    if (callResult) {
      setResult(callResult)
      onMethodCalled?.(callResult)
    }
  }, [
    connectionId,
    objectNode?.nodeId,
    methodNode?.nodeId,
    methodArgs,
    inputValues,
    callMethod,
    onMethodCalled
  ])

  // No method selected
  if (!objectNode || !methodNode) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full', className)}>
        <Play className="h-12 w-12 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Select a method to call</p>
        <p className="text-xs text-muted-foreground mt-1">
          Browse the address space and select a Method node
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Play className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium truncate">{methodNode.displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              on {objectNode.displayName}
            </p>
          </div>
        </div>
        <button
          onClick={loadMethodArgs}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
          title="Refresh arguments"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Error Display */}
      {(error || localError) && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm border-b">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{error || localError}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !methodArgs && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Method Details */}
      {methodArgs && (
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {/* Method Info */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <Folder className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Object: </span>
                  <span className="font-mono text-xs">{objectNode.nodeId}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm mt-1">
                <Play className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Method: </span>
                  <span className="font-mono text-xs">{methodNode.nodeId}</span>
                </div>
              </div>
            </div>

            {/* Input Arguments */}
            {methodArgs.inputArguments.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium mb-2">Input Arguments</h4>
                <div className="space-y-3">
                  {methodArgs.inputArguments.map((arg, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{arg.name}</span>
                        <Badge variant="secondary">{arg.dataType}</Badge>
                      </div>
                      {arg.description && (
                        <p className="text-xs text-muted-foreground mb-2">{arg.description}</p>
                      )}
                      <ArgumentInput
                        argument={arg}
                        value={inputValues[index] || ''}
                        onChange={(value) => handleInputChange(index, value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                This method has no input arguments
              </div>
            )}

            {/* Output Arguments Info */}
            {methodArgs.outputArguments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Output Arguments</h4>
                <div className="space-y-1">
                  {methodArgs.outputArguments.map((arg, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded"
                    >
                      <span className="text-sm">{arg.name}</span>
                      <Badge variant="secondary">{arg.dataType}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call Button */}
            <button
              onClick={handleCall}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Call Method
            </button>

            {/* Result */}
            {result && (
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Result</h4>
                <ResultDisplay result={result} outputArgs={methodArgs.outputArguments} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
