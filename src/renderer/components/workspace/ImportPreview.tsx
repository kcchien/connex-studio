/**
 * ImportPreview Component
 *
 * Dialog for importing workspace configuration from YAML.
 * Shows validation results, conflicts, and allows conflict resolution.
 */

import React, { useState, useCallback, memo, useEffect } from 'react'
import {
  X,
  Upload,
  AlertCircle,
  AlertTriangle,
  Check,
  FileText,
  Database,
  Globe,
  ArrowRightLeft,
  LayoutDashboard,
  Bell,
  Tags,
  FileWarning,
  RefreshCw,
  SkipForward,
  Edit3
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type {
  ValidationResult,
  ImportWorkspaceRequest,
  ImportWorkspaceResult,
  ConflictResolution,
  ConflictItem,
  ImportPreview as ImportPreviewType
} from '@shared/types/workspace'

interface ImportWorkspaceProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback to load file */
  onLoadFile: () => Promise<{ yaml?: string; path?: string; error?: string }>
  /** Callback to validate YAML */
  onValidate: (yaml: string) => Promise<ValidationResult>
  /** Callback to perform import */
  onImport: (request: ImportWorkspaceRequest) => Promise<ImportWorkspaceResult>
  /** Optional additional className */
  className?: string
}

type ImportStep = 'select' | 'preview' | 'importing' | 'complete'

/**
 * ImportPreview dialog for importing workspace configuration.
 */
export const ImportPreview = memo(function ImportPreview({
  isOpen,
  onClose,
  onLoadFile,
  onValidate,
  onImport,
  className
}: ImportWorkspaceProps): React.ReactElement | null {
  // State
  const [step, setStep] = useState<ImportStep>('select')
  const [yamlContent, setYamlContent] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip')
  const [importResult, setImportResult] = useState<ImportWorkspaceResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('select')
      setYamlContent(null)
      setFilePath(null)
      setValidation(null)
      setConflictResolution('skip')
      setImportResult(null)
      setError(null)
    }
  }, [isOpen])

  // Handle file selection
  const handleSelectFile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onLoadFile()

      if (result.error && result.error !== 'Load cancelled') {
        setError(result.error)
        return
      }

      if (!result.yaml) {
        return // Cancelled
      }

      setYamlContent(result.yaml)
      setFilePath(result.path ?? null)

      // Validate the YAML
      const validationResult = await onValidate(result.yaml)
      setValidation(validationResult)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      setIsLoading(false)
    }
  }, [onLoadFile, onValidate])

  // Handle import
  const handleImport = useCallback(async () => {
    if (!yamlContent) return

    setIsLoading(true)
    setStep('importing')
    setError(null)

    try {
      const result = await onImport({
        yaml: yamlContent,
        conflictResolution,
        dryRun: false
      })

      setImportResult(result)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStep('preview')
    } finally {
      setIsLoading(false)
    }
  }, [yamlContent, conflictResolution, onImport])

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

  // Icon for item type
  const getIconForType = (type: ConflictItem['type']) => {
    switch (type) {
      case 'connection':
        return <Database className="h-4 w-4" />
      case 'environment':
        return <Globe className="h-4 w-4" />
      case 'bridge':
        return <ArrowRightLeft className="h-4 w-4" />
      case 'dashboard':
        return <LayoutDashboard className="h-4 w-4" />
      case 'alertRule':
        return <Bell className="h-4 w-4" />
      case 'tag':
        return <Tags className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'w-full max-w-3xl max-h-[85vh] flex flex-col',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Import Workspace</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step: Select File */}
          {step === 'select' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Select Workspace File</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a .yaml or .yml file to import
                </p>
              </div>
              <button
                onClick={handleSelectFile}
                disabled={isLoading}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <FileText className="h-4 w-4" />
                {isLoading ? 'Loading...' : 'Browse Files'}
              </button>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && validation && (
            <div className="space-y-4">
              {/* File info */}
              {filePath && (
                <div className="text-sm text-muted-foreground">
                  File: <span className="font-mono">{filePath}</span>
                </div>
              )}

              {/* Metadata */}
              {validation.preview?.meta && (
                <div className="p-3 rounded-md bg-muted/50 border border-border">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="text-foreground font-medium">
                        {validation.preview.meta.name}
                      </span>
                    </div>
                    {validation.preview.meta.author && (
                      <div>
                        <span className="text-muted-foreground">Author:</span>{' '}
                        <span className="text-foreground">{validation.preview.meta.author}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Exported:</span>{' '}
                      <span className="text-foreground">
                        {new Date(validation.preview.meta.exportedAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version:</span>{' '}
                      <span className="text-foreground">
                        {validation.preview.meta.connexVersion}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation errors */}
              {!validation.valid && validation.errors.length > 0 && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Validation Errors
                  </div>
                  <ul className="space-y-1 text-sm text-destructive">
                    {validation.errors.map((err, i) => (
                      <li key={i}>
                        {err.path && <span className="font-mono">{err.path}: </span>}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </div>
                  <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                    {validation.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Import preview counts */}
              {validation.valid && validation.preview && (
                <div className="p-3 rounded-md bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-foreground font-medium mb-3">
                    <Check className="h-4 w-4 text-green-500" />
                    Items to Import
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: 'Environments',
                        count: validation.preview.counts.environments,
                        icon: <Globe className="h-4 w-4" />
                      },
                      {
                        label: 'Connections',
                        count: validation.preview.counts.connections,
                        icon: <Database className="h-4 w-4" />
                      },
                      {
                        label: 'Tags',
                        count: validation.preview.counts.tags,
                        icon: <Tags className="h-4 w-4" />
                      },
                      {
                        label: 'Bridges',
                        count: validation.preview.counts.bridges,
                        icon: <ArrowRightLeft className="h-4 w-4" />
                      },
                      {
                        label: 'Dashboards',
                        count: validation.preview.counts.dashboards,
                        icon: <LayoutDashboard className="h-4 w-4" />
                      },
                      {
                        label: 'Alert Rules',
                        count: validation.preview.counts.alertRules,
                        icon: <Bell className="h-4 w-4" />
                      }
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        {item.icon}
                        <span>
                          {item.label}: <span className="text-foreground">{item.count}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {validation.preview && validation.preview.conflicts.length > 0 && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-3">
                    <FileWarning className="h-4 w-4" />
                    Conflicts Detected ({validation.preview.conflicts.length})
                  </div>
                  <div className="space-y-2 mb-4">
                    {validation.preview.conflicts.map((conflict, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {getIconForType(conflict.type)}
                        <span className="text-foreground">{conflict.name}</span>
                        <span className="text-muted-foreground">already exists</span>
                      </div>
                    ))}
                  </div>

                  {/* Conflict resolution selector */}
                  <div className="border-t border-amber-500/20 pt-3">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Conflict Resolution Strategy
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConflictResolution('skip')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                          'border transition-colors',
                          conflictResolution === 'skip'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <SkipForward className="h-4 w-4" />
                        Skip
                      </button>
                      <button
                        onClick={() => setConflictResolution('overwrite')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                          'border transition-colors',
                          conflictResolution === 'overwrite'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Overwrite
                      </button>
                      <button
                        onClick={() => setConflictResolution('rename')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                          'border transition-colors',
                          conflictResolution === 'rename'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Edit3 className="h-4 w-4" />
                        Rename
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {conflictResolution === 'skip' &&
                        'Existing items will be kept, conflicting items will not be imported.'}
                      {conflictResolution === 'overwrite' &&
                        'Existing items will be replaced with imported items.'}
                      {conflictResolution === 'rename' &&
                        'Imported items will be renamed (e.g., "MyConnection_imported").'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              <p className="text-lg font-medium text-foreground">Importing workspace...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && importResult && (
            <div className="space-y-4">
              {/* Success/Failure header */}
              <div
                className={cn(
                  'flex items-center gap-3 p-4 rounded-md',
                  importResult.success ? 'bg-green-500/10' : 'bg-destructive/10'
                )}
              >
                {importResult.success ? (
                  <>
                    <Check className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="font-medium text-foreground">Import Successful</p>
                      <p className="text-sm text-muted-foreground">
                        Workspace configuration has been imported.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">Import Failed</p>
                      <p className="text-sm text-muted-foreground">
                        Some items could not be imported.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Import summary */}
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <div className="font-medium text-foreground mb-3">Import Summary</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Imported</div>
                    <div className="space-y-1 text-sm">
                      {Object.entries(importResult.imported).map(([key, count]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-green-500">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Skipped</div>
                    <div className="space-y-1 text-sm">
                      {Object.entries(importResult.skipped).map(([key, count]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors
                  </div>
                  <ul className="space-y-1 text-sm text-destructive">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </div>
                  <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                    {importResult.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Credentials reminder */}
              <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Credentials Required</p>
                  <p className="mt-1">
                    Imported connections may require credentials to be entered before connecting.
                    Check each connection's settings to enter the required authentication details.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          {step === 'select' && (
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
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('select')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-muted transition-colors'
                )}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!validation?.valid || isLoading}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              onClick={onClose}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <Check className="h-4 w-4" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
