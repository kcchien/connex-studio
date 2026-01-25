/**
 * Collection Runner Service
 *
 * Executes request collections sequentially with assertions.
 */

import { EventEmitter } from 'events'
import type {
  Collection,
  CollectionRequest,
  CollectionRunResult,
  CollectionProgress,
  RequestResult,
  AssertionResult,
  Assertion,
  CreateCollectionRequest,
  UpdateCollectionRequest
} from '@shared/types'
import { DEFAULT_REQUEST_TIMEOUT } from '@shared/types'

/**
 * Events emitted by CollectionRunner.
 */
export interface CollectionRunnerEvents {
  'progress': (progress: CollectionProgress) => void
  'result': (result: CollectionRunResult) => void
}

/**
 * Collection Runner handles collection CRUD and execution.
 */
export class CollectionRunner extends EventEmitter {
  private collections: Map<string, Collection> = new Map()
  private activeRuns: Map<string, { cancelled: boolean }> = new Map()

  constructor() {
    super()
  }

  /**
   * Initialize the runner, loading collections from storage.
   */
  async initialize(): Promise<void> {
    // TODO: Load collections from profile storage
  }

  /**
   * List all collections.
   */
  list(): Collection[] {
    return Array.from(this.collections.values())
  }

  /**
   * Get collection by ID.
   */
  get(id: string): Collection | null {
    return this.collections.get(id) ?? null
  }

  /**
   * Create a new collection.
   */
  async create(request: CreateCollectionRequest): Promise<Collection> {
    const now = Date.now()
    const collection: Collection = {
      id: crypto.randomUUID(),
      name: request.name,
      description: request.description,
      requests: request.requests ?? [],
      executionMode: 'sequential',
      createdAt: now,
      updatedAt: now
    }

    this.collections.set(collection.id, collection)
    // TODO: Persist to profile storage
    return collection
  }

  /**
   * Update an existing collection.
   */
  async update(request: UpdateCollectionRequest): Promise<Collection> {
    const existing = this.collections.get(request.id)
    if (!existing) {
      throw new Error(`Collection not found: ${request.id}`)
    }

    const updated: Collection = {
      ...existing,
      name: request.name ?? existing.name,
      description: request.description ?? existing.description,
      requests: request.requests ?? existing.requests,
      updatedAt: Date.now()
    }

    this.collections.set(updated.id, updated)
    // TODO: Persist to profile storage
    return updated
  }

  /**
   * Delete a collection.
   */
  async delete(id: string): Promise<boolean> {
    if (!this.collections.has(id)) {
      return false
    }

    this.collections.delete(id)
    // TODO: Persist to profile storage
    return true
  }

  /**
   * Execute a collection.
   */
  async run(id: string): Promise<CollectionRunResult> {
    const collection = this.collections.get(id)
    if (!collection) {
      throw new Error(`Collection not found: ${id}`)
    }

    const runId = crypto.randomUUID()
    const runState = { cancelled: false }
    this.activeRuns.set(runId, runState)

    const startedAt = Date.now()
    const results: RequestResult[] = []

    try {
      for (let i = 0; i < collection.requests.length; i++) {
        if (runState.cancelled) {
          // Mark remaining as skipped
          for (let j = i; j < collection.requests.length; j++) {
            results.push({
              requestId: collection.requests[j].id,
              status: 'skipped',
              latency: 0,
              assertions: []
            })
          }
          break
        }

        const request = collection.requests[i]

        // Emit progress
        this.emit('progress', {
          runId,
          currentIndex: i,
          total: collection.requests.length,
          currentRequest: request.id,
          status: 'running'
        } as CollectionProgress)

        // Execute request
        const result = await this.executeRequest(request)
        results.push(result)
      }
    } finally {
      this.activeRuns.delete(runId)
    }

    const completedAt = Date.now()

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length
    }

    const status = runState.cancelled
      ? 'cancelled'
      : summary.failed === 0
        ? 'success'
        : summary.passed > 0
          ? 'partial'
          : 'failed'

    const result: CollectionRunResult = {
      runId,
      collectionId: id,
      status,
      startedAt,
      completedAt,
      results,
      summary
    }

    this.emit('result', result)
    this.emit('progress', {
      runId,
      currentIndex: collection.requests.length,
      total: collection.requests.length,
      currentRequest: '',
      status: 'completed'
    } as CollectionProgress)

    return result
  }

  /**
   * Stop a running collection.
   */
  stop(runId: string): boolean {
    const runState = this.activeRuns.get(runId)
    if (!runState) {
      return false
    }

    runState.cancelled = true
    return true
  }

  /**
   * Execute a single request.
   */
  private async executeRequest(request: CollectionRequest): Promise<RequestResult> {
    const startTime = Date.now()

    try {
      // TODO: Get connection from ConnectionManager
      // TODO: Execute read/write based on request.operation
      // For now, simulate a request
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(request.timeout ?? DEFAULT_REQUEST_TIMEOUT, 100))
      )

      const value = Math.random() * 100 // Simulated value
      const latency = Date.now() - startTime

      // Evaluate assertions
      const assertionResults = this.evaluateAssertions(request.assertions, {
        value,
        status: 'success',
        latency
      })

      const allPassed = assertionResults.every(a => a.passed)

      return {
        requestId: request.id,
        status: allPassed ? 'passed' : 'failed',
        value,
        latency,
        assertions: assertionResults
      }
    } catch (error) {
      return {
        requestId: request.id,
        status: 'failed',
        latency: Date.now() - startTime,
        assertions: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Evaluate assertions against a result.
   */
  private evaluateAssertions(
    assertions: Assertion[],
    context: { value: unknown; status: string; latency: number }
  ): AssertionResult[] {
    return assertions.map(assertion => {
      const actual = this.getAssertionTarget(assertion.target, context)
      const passed = this.checkAssertion(assertion, actual)

      return {
        passed,
        message: passed ? undefined : assertion.message,
        expected: assertion.expected,
        actual
      }
    })
  }

  /**
   * Get the value to assert against.
   */
  private getAssertionTarget(
    target: 'value' | 'status' | 'latency',
    context: { value: unknown; status: string; latency: number }
  ): unknown {
    switch (target) {
      case 'value':
        return context.value
      case 'status':
        return context.status
      case 'latency':
        return context.latency
      default:
        return undefined
    }
  }

  /**
   * Check if an assertion passes.
   */
  private checkAssertion(assertion: Assertion, actual: unknown): boolean {
    switch (assertion.type) {
      case 'equals':
        return actual === assertion.expected

      case 'contains':
        if (typeof actual === 'string' && typeof assertion.expected === 'string') {
          return actual.includes(assertion.expected)
        }
        return false

      case 'range':
        if (typeof actual === 'number' && Array.isArray(assertion.expected)) {
          const [min, max] = assertion.expected as [number, number]
          return actual >= min && actual <= max
        }
        return false

      case 'regex':
        if (typeof actual === 'string' && typeof assertion.expected === 'string') {
          return new RegExp(assertion.expected).test(actual)
        }
        return false

      default:
        return false
    }
  }

  /**
   * Dispose and cleanup.
   */
  async dispose(): Promise<void> {
    // Cancel all active runs
    for (const runState of this.activeRuns.values()) {
      runState.cancelled = true
    }

    this.collections.clear()
    this.activeRuns.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let instance: CollectionRunner | null = null

export function getCollectionRunner(): CollectionRunner {
  if (!instance) {
    instance = new CollectionRunner()
  }
  return instance
}

export function disposeCollectionRunner(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
