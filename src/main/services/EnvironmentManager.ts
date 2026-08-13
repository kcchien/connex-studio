/**
 * Environment Manager Service
 *
 * Manages environment configurations with variable substitution.
 * Environments store key-value pairs that can be referenced in connection configs.
 */

import { EventEmitter } from 'events'
import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import log from 'electron-log/main.js'
import type {
  Environment,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest
} from '@shared/types'

/** Debounce delay for persisting changes to disk */
const PERSIST_DEBOUNCE_MS = 500

/**
 * Persisted file shape for environments storage.
 */
interface EnvironmentStorageFile {
  defaultEnvironmentId: string | null
  environments: Environment[]
}

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
  private readonly storagePath: string | null
  private persistTimer: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.storagePath = this.resolveStoragePath()
  }

  /**
   * Initialize the manager, loading environments from storage.
   */
  async initialize(): Promise<void> {
    if (!this.storagePath) {
      return
    }

    try {
      const content = await fs.readFile(this.storagePath, 'utf-8')
      const parsed = JSON.parse(content) as EnvironmentStorageFile
      this.environments = new Map(parsed.environments.map((item) => [item.id, item]))
      // Only restore default id if it still points to an existing environment
      this.defaultEnvironmentId =
        parsed.defaultEnvironmentId && this.environments.has(parsed.defaultEnvironmentId)
          ? parsed.defaultEnvironmentId
          : null
      log.info(`[EnvironmentManager] Loaded ${parsed.environments.length} environments`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.warn('[EnvironmentManager] Failed to load environments', error)
      }
    }
  }

  /**
   * Resolve environment storage path.
   */
  private resolveStoragePath(): string | null {
    // Keep unit tests deterministic and filesystem independent.
    if (process.env.NODE_ENV === 'test') {
      return null
    }

    try {
      const userDataPath = app.getPath('userData')
      return path.join(userDataPath, 'environments.json')
    } catch {
      // Fallback for non-Electron contexts.
      return path.join(process.cwd(), '.connex', 'environments.json')
    }
  }

  /**
   * Schedule a debounced persist to avoid high-frequency writes.
   */
  private schedulePersist(): void {
    if (!this.storagePath) {
      return
    }

    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      void this.persistEnvironments()
    }, PERSIST_DEBOUNCE_MS)
  }

  /**
   * Persist environments to local storage.
   */
  private async persistEnvironments(): Promise<void> {
    if (!this.storagePath) {
      return
    }

    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true })
      const file: EnvironmentStorageFile = {
        defaultEnvironmentId: this.defaultEnvironmentId,
        environments: Array.from(this.environments.values())
      }
      const payload = JSON.stringify(file, null, 2)
      await fs.writeFile(this.storagePath, payload, 'utf-8')
    } catch (error) {
      log.warn('[EnvironmentManager] Failed to persist environments', error)
    }
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

    this.schedulePersist()
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

    this.schedulePersist()
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
    this.schedulePersist()
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

      this.schedulePersist()
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
    // Flush any pending persist before clearing state
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
      await this.persistEnvironments()
    }

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
