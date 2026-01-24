/**
 * ImportExportButtons Component
 *
 * Buttons for importing and exporting profiles, plus saving current config.
 */

import React, { useState, useCallback, memo } from 'react'
import { Download, Upload, Save, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface ImportExportButtonsProps {
  /** Callback to open save dialog */
  onSaveClick: () => void
  /** Callback when import is triggered */
  onImport: () => Promise<void>
  /** Whether save is disabled (no connections to save) */
  saveDisabled?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * ImportExportButtons for profile management actions.
 */
export const ImportExportButtons = memo(function ImportExportButtons({
  onSaveClick,
  onImport,
  saveDisabled = false,
  className
}: ImportExportButtonsProps): React.ReactElement {
  const [isImporting, setIsImporting] = useState(false)

  // Handle import with loading state
  const handleImport = useCallback(async () => {
    setIsImporting(true)
    try {
      await onImport()
    } finally {
      setIsImporting(false)
    }
  }, [onImport])

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Save Profile */}
      <button
        onClick={onSaveClick}
        disabled={saveDisabled}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
        title={saveDisabled ? 'No connections to save' : 'Save current configuration as profile'}
      >
        <Save className="h-4 w-4" />
        <span>Save Profile</span>
      </button>

      {/* Import Profile */}
      <button
        onClick={handleImport}
        disabled={isImporting}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'border border-input bg-background',
          'text-foreground hover:bg-muted transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
        title="Import profile from file"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span>{isImporting ? 'Importing...' : 'Import'}</span>
      </button>
    </div>
  )
})
