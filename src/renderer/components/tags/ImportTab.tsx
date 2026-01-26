import React, { useState, useCallback } from 'react'
import { cn } from '@renderer/lib/utils'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import type { Protocol } from '@shared/types/connection'
import type { Tag } from '@shared/types/tag'

export interface ImportTabProps {
  connectionId: string
  protocol: Protocol
  onPreviewChange: (tags: Partial<Tag>[]) => void
}

type ImportState = 'idle' | 'dragging' | 'parsing' | 'success' | 'error'

/**
 * ImportTab - Import tags from CSV/Excel file
 */
export function ImportTab({
  connectionId,
  protocol,
  onPreviewChange,
}: ImportTabProps): React.ReactElement {
  const [state, setState] = useState<ImportState>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsedCount, setParsedCount] = useState(0)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('dragging')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('idle')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('parsing')

    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    } else {
      setState('idle')
    }
  }, [connectionId, protocol])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setState('parsing')
      processFile(file)
    }
  }, [connectionId, protocol])

  const processFile = async (file: File) => {
    setFileName(file.name)
    setError(null)

    // Simulate file parsing (in real implementation, use PapaParse or xlsx)
    try {
      // For now, generate mock tags based on file
      const mockTags: Partial<Tag>[] = [
        {
          connectionId,
          name: 'Imported_Tag_1',
          dataType: 'float32',
          displayFormat: { decimals: 2, unit: '' },
          thresholds: {},
          enabled: true,
        },
        {
          connectionId,
          name: 'Imported_Tag_2',
          dataType: 'int16',
          displayFormat: { decimals: 0, unit: '' },
          thresholds: {},
          enabled: true,
        },
      ]

      // Simulate async parsing
      await new Promise(resolve => setTimeout(resolve, 500))

      setParsedCount(mockTags.length)
      onPreviewChange(mockTags)
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setState('error')
      onPreviewChange([])
    }
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'h-48 rounded-lg border-2 border-dashed',
          'transition-colors cursor-pointer',
          state === 'dragging'
            ? 'border-blue-500 bg-blue-500/10'
            : state === 'success'
            ? 'border-green-500 bg-green-500/10'
            : state === 'error'
            ? 'border-red-500 bg-red-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
        )}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        {state === 'parsing' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Parsing {fileName}...</p>
          </div>
        ) : state === 'success' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="text-sm text-green-400">{parsedCount} tags found in {fileName}</p>
          </div>
        ) : state === 'error' ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-gray-500">Click or drop to try again</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={cn(
              'w-10 h-10',
              state === 'dragging' ? 'text-blue-400' : 'text-gray-500'
            )} />
            <p className="text-sm text-gray-300">
              Drag & drop CSV or Excel file here
            </p>
            <p className="text-xs text-gray-500">or click to browse</p>
          </div>
        )}
      </div>

      {/* Format Help */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
        <FileSpreadsheet className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-300">Supported formats</p>
          <p className="text-xs text-gray-500 mt-1">
            CSV with columns: name, address, dataType, unit (optional)
            <br />
            Excel with same column structure
          </p>
        </div>
      </div>
    </div>
  )
}
