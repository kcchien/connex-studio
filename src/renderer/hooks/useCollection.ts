/**
 * Custom hook for collection operations with loading/error state management.
 * Wraps IPC calls and updates collectionStore on success.
 * Also sets up event listeners for run progress and results.
 */

import { useState, useCallback, useEffect } from 'react'
import { useCollectionStore } from '../stores/collectionStore'
import { collectionApi, invokeWithError } from '../lib/ipc'
import type {
  Collection,
  CreateCollectionRequest,
  CollectionRunResult,
  CollectionProgress
} from '@shared/types'

export interface UseCollectionReturn {
  // State
  collections: Collection[]
  selectedCollection: Collection | null
  isRunning: boolean
  runProgress: CollectionProgress | null
  lastRunResult: CollectionRunResult | null
  isLoading: boolean
  error: string | null

  // Operations
  create: (params: CreateCollectionRequest) => Promise<Collection | null>
  update: (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => Promise<Collection | null>
  remove: (id: string) => Promise<boolean>
  run: (id: string) => Promise<CollectionRunResult | null>
  stop: () => Promise<boolean>
  refresh: () => Promise<void>

  // Actions
  setSelected: (id: string | null) => void
  clearError: () => void
  clearLastResult: () => void
}

export function useCollection(): UseCollectionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    collections,
    selectedCollectionId,
    activeRunId,
    runProgress,
    lastRunResult,
    addCollection,
    updateCollection,
    removeCollection,
    setSelected,
    setCollections,
    setActiveRun,
    setRunProgress,
    setLastRunResult
  } = useCollectionStore()

  // Derived state
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId) ?? null
  const isRunning = activeRunId !== null

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearLastResult = useCallback(() => {
    setLastRunResult(null)
  }, [setLastRunResult])

  /**
   * Load all collections from main process.
   */
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invokeWithError(collectionApi.list())
      setCollections(result.collections)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load collections'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [setCollections])

  /**
   * Create a new collection.
   */
  const create = useCallback(
    async (params: CreateCollectionRequest): Promise<Collection | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(collectionApi.create(params))
        addCollection(result.collection)
        return result.collection
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create collection'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [addCollection]
  )

  /**
   * Update an existing collection.
   */
  const update = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Collection, 'id' | 'createdAt'>>
    ): Promise<Collection | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(
          collectionApi.update({ id, ...updates })
        )
        updateCollection(id, result.collection)
        return result.collection
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update collection'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [updateCollection]
  )

  /**
   * Delete a collection.
   */
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await invokeWithError(collectionApi.delete(id))
        removeCollection(id)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete collection'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [removeCollection]
  )

  /**
   * Run a collection.
   */
  const run = useCallback(
    async (id: string): Promise<CollectionRunResult | null> => {
      if (isRunning) {
        setError('A collection is already running')
        return null
      }

      setIsLoading(true)
      setError(null)
      setRunProgress(null)
      setLastRunResult(null)

      try {
        // Note: We set activeRunId optimistically but it will be confirmed
        // when progress events start arriving
        setActiveRun(`run-${id}-${Date.now()}`)

        const result = await invokeWithError(collectionApi.run(id))
        setLastRunResult(result.result)
        setActiveRun(null)
        return result.result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to run collection'
        setError(message)
        setActiveRun(null)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isRunning, setActiveRun, setRunProgress, setLastRunResult]
  )

  /**
   * Stop the currently running collection.
   */
  const stop = useCallback(async (): Promise<boolean> => {
    if (!activeRunId) {
      return true // Nothing to stop
    }

    try {
      await invokeWithError(collectionApi.stop(activeRunId))
      setActiveRun(null)
      setRunProgress(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop collection'
      setError(message)
      return false
    }
  }, [activeRunId, setActiveRun, setRunProgress])

  // Set up event listeners for progress and results
  useEffect(() => {
    const unsubProgress = collectionApi.onProgress((progress: CollectionProgress) => {
      setRunProgress(progress)
      if (progress.runId) {
        setActiveRun(progress.runId)
      }
    })

    const unsubResult = collectionApi.onResult((result: CollectionRunResult) => {
      setLastRunResult(result)
      setActiveRun(null)
      setRunProgress(null)
    })

    return () => {
      unsubProgress()
      unsubResult()
    }
  }, [setActiveRun, setRunProgress, setLastRunResult])

  // Load collections on mount
  useEffect(() => {
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    collections,
    selectedCollection,
    isRunning,
    runProgress,
    lastRunResult,
    isLoading,
    error,
    create,
    update,
    remove,
    run,
    stop,
    refresh,
    setSelected,
    clearError,
    clearLastResult
  }
}
