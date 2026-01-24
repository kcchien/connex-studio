/**
 * Custom hook for environment operations with loading/error state management.
 * Wraps IPC calls and updates environmentStore on success.
 */

import { useState, useCallback, useEffect } from 'react'
import { useEnvironmentStore } from '../stores/environmentStore'
import { environmentApi, invokeWithError } from '../lib/ipc'
import type {
  Environment,
  CreateEnvironmentRequest,
  ResolutionResult
} from '@shared/types'

export interface UseEnvironmentReturn {
  // State
  environments: Environment[]
  activeEnvironment: Environment | null
  activeVariables: Record<string, string>
  isLoading: boolean
  error: string | null

  // Operations
  create: (params: CreateEnvironmentRequest) => Promise<Environment | null>
  update: (id: string, updates: Partial<Omit<Environment, 'id' | 'createdAt'>>) => Promise<Environment | null>
  remove: (id: string) => Promise<boolean>
  setDefault: (id: string) => Promise<boolean>
  resolve: (template: string, customVariables?: Record<string, string>) => Promise<ResolutionResult | null>
  refresh: () => Promise<void>

  // Actions
  setActive: (id: string | null) => void
  clearError: () => void
}

export function useEnvironment(): UseEnvironmentReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    environments,
    activeEnvironmentId,
    addEnvironment,
    updateEnvironment,
    removeEnvironment,
    setActive,
    setEnvironments
  } = useEnvironmentStore()

  // Derived state
  const activeEnvironment = environments.find((e) => e.id === activeEnvironmentId) ?? null
  const activeVariables = activeEnvironment?.variables ?? {}

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Load all environments from main process.
   */
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invokeWithError(environmentApi.list())
      setEnvironments(result.environments)

      // Set active to default environment if not already set
      const defaultEnv = result.environments.find((e) => e.isDefault)
      if (defaultEnv && !activeEnvironmentId) {
        setActive(defaultEnv.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load environments'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [activeEnvironmentId, setEnvironments, setActive])

  /**
   * Create a new environment.
   */
  const create = useCallback(
    async (params: CreateEnvironmentRequest): Promise<Environment | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(environmentApi.create(params))
        addEnvironment(result.environment)

        // If this is the first environment or marked as default, set it active
        if (result.environment.isDefault || environments.length === 0) {
          setActive(result.environment.id)
        }

        return result.environment
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create environment'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [addEnvironment, environments.length, setActive]
  )

  /**
   * Update an existing environment.
   */
  const update = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Environment, 'id' | 'createdAt'>>
    ): Promise<Environment | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(
          environmentApi.update({ id, ...updates })
        )
        updateEnvironment(id, result.environment)
        return result.environment
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update environment'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [updateEnvironment]
  )

  /**
   * Delete an environment.
   */
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await invokeWithError(environmentApi.delete(id))
        removeEnvironment(id)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete environment'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [removeEnvironment]
  )

  /**
   * Set an environment as the default.
   */
  const setDefaultEnv = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await invokeWithError(environmentApi.setDefault(id))

        // Update all environments: clear isDefault from others, set on the new default
        const updatedEnvironments = environments.map((env) => ({
          ...env,
          isDefault: env.id === id
        }))
        setEnvironments(updatedEnvironments)
        setActive(id)

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set default environment'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [environments, setEnvironments, setActive]
  )

  /**
   * Resolve variable references in a template string.
   */
  const resolve = useCallback(
    async (
      template: string,
      customVariables?: Record<string, string>
    ): Promise<ResolutionResult | null> => {
      try {
        const result = await invokeWithError(
          environmentApi.resolve(template, customVariables)
        )
        return result.result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resolve variables'
        setError(message)
        return null
      }
    },
    []
  )

  // Load environments on mount
  useEffect(() => {
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    environments,
    activeEnvironment,
    activeVariables,
    isLoading,
    error,
    create,
    update,
    remove,
    setDefault: setDefaultEnv,
    resolve,
    refresh,
    setActive,
    clearError
  }
}
