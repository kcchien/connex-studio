/**
 * Environment Manager Service
 *
 * Manages environment configurations with variable substitution.
 * Environments store key-value pairs that can be referenced in connection configs.
 */

import { EventEmitter } from 'events'
import type {
  Environment,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest
} from '@shared/types'

/**
 * Events emitted by EnvironmentManager.
 */
export interface EnvironmentManagerEvents {
  'environment-changed': (environment: Environment) => void
  'default-changed': (environment: Environment | null) => void
}

/**
 * Environment Manager handles CRUD operations for environments
 * and manages the active/default environment.
 */
export class EnvironmentManager extends EventEmitter {
  private environments: Map<string, Environment> = new Map()
  private defaultEnvironmentId: string | null = null

  constructor() {
    super()
  }

  /**
   * Initialize the manager, loading environments from storage.
   */
  async initialize(): Promise<void> {
    // TODO: Load environments from YAML file
  }

  /**
   * List all environments.
   */
  list(): Environment[] {
    return Array.from(this.environments.values())
  }

  /**
   * Get environment by ID.
   */
  get(id: string): Environment | null {
    return this.environments.get(id) ?? null
  }

  /**
   * Create a new environment.
   */
  async create(request: CreateEnvironmentRequest): Promise<Environment> {
    const now = Date.now()
    const environment: Environment = {
      id: crypto.randomUUID(),
      name: request.name,
      variables: request.variables ?? {},
      isDefault: request.isDefault ?? false,
      createdAt: now,
      updatedAt: now
    }

    // If this is set as default, unset previous default
    if (environment.isDefault) {
      await this.clearDefault()
      this.defaultEnvironmentId = environment.id
    }

    this.environments.set(environment.id, environment)
    this.emit('environment-changed', environment)

    // TODO: Persist to YAML file
    return environment
  }

  /**
   * Update an existing environment.
   */
  async update(request: UpdateEnvironmentRequest): Promise<Environment> {
    const existing = this.environments.get(request.id)
    if (!existing) {
      throw new Error(`Environment not found: ${request.id}`)
    }

    const updated: Environment = {
      ...existing,
      name: request.name ?? existing.name,
      variables: request.variables ?? existing.variables,
      updatedAt: Date.now()
    }

    this.environments.set(updated.id, updated)
    this.emit('environment-changed', updated)

    // TODO: Persist to YAML file
    return updated
  }

  /**
   * Delete an environment.
   */
  async delete(id: string): Promise<boolean> {
    const environment = this.environments.get(id)
    if (!environment) {
      return false
    }

    // If deleting the default, clear it
    if (this.defaultEnvironmentId === id) {
      this.defaultEnvironmentId = null
      this.emit('default-changed', null)
    }

    this.environments.delete(id)
    // TODO: Persist to YAML file
    return true
  }

  /**
   * Set an environment as the default/active environment.
   */
  async setDefault(id: string): Promise<Environment> {
    const environment = this.environments.get(id)
    if (!environment) {
      throw new Error(`Environment not found: ${id}`)
    }

    await this.clearDefault()

    const updated: Environment = {
      ...environment,
      isDefault: true,
      updatedAt: Date.now()
    }

    this.environments.set(updated.id, updated)
    this.defaultEnvironmentId = updated.id
    this.emit('default-changed', updated)

    // TODO: Persist to YAML file
    return updated
  }

  /**
   * Get the current default environment.
   */
  getDefault(): Environment | null {
    if (!this.defaultEnvironmentId) {
      return null
    }
    return this.environments.get(this.defaultEnvironmentId) ?? null
  }

  /**
   * Clear the default flag from the current default environment.
   */
  private async clearDefault(): Promise<void> {
    if (!this.defaultEnvironmentId) {
      return
    }

    const previous = this.environments.get(this.defaultEnvironmentId)
    if (previous) {
      const updated: Environment = {
        ...previous,
        isDefault: false,
        updatedAt: Date.now()
      }
      this.environments.set(updated.id, updated)
    }
  }

  /**
   * Get the variables from the default environment.
   */
  getVariables(): Record<string, string> {
    const env = this.getDefault()
    return env?.variables ?? {}
  }

  /**
   * Dispose and cleanup.
   */
  async dispose(): Promise<void> {
    this.environments.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let instance: EnvironmentManager | null = null

export function getEnvironmentManager(): EnvironmentManager {
  if (!instance) {
    instance = new EnvironmentManager()
  }
  return instance
}

export function disposeEnvironmentManager(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
