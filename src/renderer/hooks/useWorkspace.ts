/**
 * Custom hook for workspace export/import operations.
 * Provides convenient access to workspace IPC calls with loading/error state.
 */

import { useState, useCallback } from 'react'
import { workspaceApi } from '../lib/ipc'
import type {
  ExportWorkspaceRequest,
  ImportWorkspaceRequest,
  ImportWorkspaceResult,
  ValidationResult,
  SaveFileResult,
  LoadFileResult
} from '@shared/types/workspace'

export interface UseWorkspaceReturn {
  // State
  isLoading: boolean
  error: string | null

  // Export operations
  exportWorkspace: (params: ExportWorkspaceRequest) => Promise<{ yaml: string } | { error: string }>
  saveFile: (yaml: string, defaultPath?: string) => Promise<SaveFileResult>

  // Import operations
  loadFile: () => Promise<LoadFileResult>
  validateWorkspace: (yaml: string) => Promise<ValidationResult>
  importWorkspace: (params: ImportWorkspaceRequest) => Promise<ImportWorkspaceResult>

  // Actions
  clearError: () => void
}

/**
 * Hook for workspace export/import operations.
 */
export function useWorkspace(): UseWorkspaceReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Export workspace configuration to YAML string.
   */
  const exportWorkspace = useCallback(
    async (params: ExportWorkspaceRequest): Promise<{ yaml: string } | { error: string }> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await workspaceApi.export(params)

        if ('error' in result && !result.success) {
          const errorMsg = result.error
          setError(errorMsg)
          return { error: errorMsg }
        }

        if ('yaml' in result) {
          return { yaml: result.yaml }
        }

        return { error: 'Unknown error' }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export failed'
        setError(message)
        return { error: message }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Save YAML content to file (shows save dialog).
   */
  const saveFile = useCallback(
    async (yaml: string, defaultPath?: string): Promise<SaveFileResult> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await workspaceApi.saveFile({ yaml, defaultPath })

        if (!result.success && result.error !== 'Save cancelled') {
          setError(result.error ?? 'Save failed')
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed'
        setError(message)
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Load YAML content from file (shows open dialog).
   */
  const loadFile = useCallback(async (): Promise<LoadFileResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await workspaceApi.loadFile()

      if (!result.success && result.error !== 'Load cancelled') {
        setError(result.error ?? 'Load failed')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Load failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Validate YAML content without importing.
   */
  const validateWorkspace = useCallback(async (yaml: string): Promise<ValidationResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await workspaceApi.validate(yaml)

      if (!result.valid && result.errors.length > 0) {
        setError(result.errors[0]?.message ?? 'Validation failed')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed'
      setError(message)
      return {
        valid: false,
        errors: [{ path: '', message }],
        warnings: []
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Import workspace from YAML content.
   */
  const importWorkspace = useCallback(
    async (params: ImportWorkspaceRequest): Promise<ImportWorkspaceResult> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await workspaceApi.import(params)

        if (!result.success) {
          setError(result.errors[0] ?? 'Import failed')
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed'
        setError(message)
        return {
          success: false,
          imported: { environments: 0, connections: 0, tags: 0, bridges: 0, dashboards: 0, alertRules: 0 },
          skipped: { environments: 0, connections: 0, tags: 0, bridges: 0, dashboards: 0, alertRules: 0 },
          conflicts: [],
          warnings: [],
          errors: [message]
        }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    isLoading,
    error,
    exportWorkspace,
    saveFile,
    loadFile,
    validateWorkspace,
    importWorkspace,
    clearError
  }
}
