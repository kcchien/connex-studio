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
  /** Emitted before environment switch to allow connection handling (T167) */
  'environment-switching': (from: Environment | null, to: Environment | null) => void
  /** Emitted after environment switch is complete (T167) */
  'environment-switched': (from: Environment | null, to: Environment | null) => void
}

/**
 * Callback type for environment switch handlers (T167).
 */
export type EnvironmentSwitchHandler = (
  from: Environment | null,
  to: Environment | null
) => Promise<void>

/**
 * Environment Manager handles CRUD operations for environments
 * and manages the active/default environment.
 */
export class EnvironmentManager extends EventEmitter {
  private environments: Map<string, Environment> = new Map()
  private defaultEnvironmentId: string | null = null
  /** Handlers to call before environment switch (T167) */
  private switchHandlers: EnvironmentSwitchHandler[] = []
  /** Whether a switch is in progress (T167) */
  private isSwitching = false

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
   * Set an environment as the default/active environment (T167 - with active connection handling).
   */
  async setDefault(id: string): Promise<Environment> {
    const environment = this.environments.get(id)
    if (!environment) {
      throw new Error(`Environment not found: ${id}`)
    }

    // Prevent concurrent switches
    if (this.isSwitching) {
      throw new Error('Environment switch already in progress')
    }

    const previousEnv = this.getDefault()

    // If switching to the same environment, no action needed
    if (previousEnv?.id === id) {
      return environment
    }

    try {
      this.isSwitching = true

      // Emit event before switch to allow pre-switch handling
      this.emit('environment-switching', previousEnv, environment)

      // Call registered switch handlers (e.g., to disconnect active connections)
      for (const handler of this.switchHandlers) {
        await handler(previousEnv, environment)
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

      // Emit event after switch is complete
      this.emit('environment-switched', previousEnv, updated)

      // TODO: Persist to YAML file
      return updated
    } finally {
      this.isSwitching = false
    }
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

  // ---------------------------------------------------------------------------
  // Environment Switch Handling (T167)
  // ---------------------------------------------------------------------------

  /**
   * Register a handler to be called before environment switch (T167).
   * Handlers are called in order and can perform async operations like
   * disconnecting active connections.
   *
   * @param handler - Function to call before switch
   * @returns Unregister function
   */
  registerSwitchHandler(handler: EnvironmentSwitchHandler): () => void {
    this.switchHandlers.push(handler)
    return () => {
      const index = this.switchHandlers.indexOf(handler)
      if (index !== -1) {
        this.switchHandlers.splice(index, 1)
      }
    }
  }

  /**
   * Check if an environment switch is currently in progress (T167).
   */
  isEnvironmentSwitching(): boolean {
    return this.isSwitching
  }

  /**
   * Switch environment with options for handling active connections (T167).
   *
   * @param targetId - ID of environment to switch to
   * @param options - Switch options
   */
  async switchEnvironment(
    targetId: string,
    options: {
      /** Force switch even if connections are active (will trigger disconnect) */
      force?: boolean
      /** Custom handler for active connections (called before switch) */
      onActiveConnections?: (connectionIds: string[]) => Promise<'proceed' | 'cancel'>
    } = {}
  ): Promise<Environment> {
    // Validate target exists
    const target = this.environments.get(targetId)
    if (!target) {
      throw new Error(`Environment not found: ${targetId}`)
    }

    // If force is false and we have a custom handler, it should be called
    // by the consumer before calling this method with the result.
    // The actual switch is handled by setDefault which calls all handlers.

    return this.setDefault(targetId)
  }

  /**
   * Dispose and cleanup.
   */
  async dispose(): Promise<void> {
    this.environments.clear()
    this.switchHandlers = []
    this.isSwitching = false
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
