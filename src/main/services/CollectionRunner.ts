/**
 * Collection Runner Service
 *
 * Executes request collections sequentially with assertions.
 */

import { EventEmitter } from 'events'
import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import log from 'electron-log/main.js'
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
import { getConnectionManager } from './ConnectionManager'
import type {
  DataType,
  ModbusAddress,
  MqttAddress,
  OpcUaAddress
} from '@shared/types'

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
  private readonly storagePath: string | null

  constructor() {
    super()
    this.storagePath = this.resolveStoragePath()
  }

  /**
   * Initialize the runner, loading collections from storage.
   */
  async initialize(): Promise<void> {
    if (!this.storagePath) {
      return
    }

    try {
      const content = await fs.readFile(this.storagePath, 'utf-8')
      const parsed = JSON.parse(content) as Collection[]
      this.collections = new Map(parsed.map((item) => [item.id, item]))
      log.info(`[CollectionRunner] Loaded ${parsed.length} collections`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.warn('[CollectionRunner] Failed to load collections', error)
      }
    }
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
    await this.persistCollections()
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
    await this.persistCollections()
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
    await this.persistCollections()
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
   * Resolve collection storage path.
   */
  private resolveStoragePath(): string | null {
    // Keep unit tests deterministic and filesystem independent.
    if (process.env.NODE_ENV === 'test') {
      return null
    }

    try {
      const userDataPath = app.getPath('userData')
      return path.join(userDataPath, 'collections.json')
    } catch {
      // Fallback for non-Electron contexts.
      return path.join(process.cwd(), '.connex', 'collections.json')
    }
  }

  /**
   * Persist collections to local storage.
   */
  private async persistCollections(): Promise<void> {
    if (!this.storagePath) {
      return
    }

    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true })
      const payload = JSON.stringify(Array.from(this.collections.values()), null, 2)
      await fs.writeFile(this.storagePath, payload, 'utf-8')
    } catch (error) {
      log.warn('[CollectionRunner] Failed to persist collections', error)
    }
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
      const execution = await this.executeOperationWithTimeout(request)
      const latency = Date.now() - startTime

      // Evaluate assertions
      const assertionResults = this.evaluateAssertions(request.assertions, {
        value: execution.value,
        status: execution.status,
        latency
      })

      const allPassed = assertionResults.every(a => a.passed)

      return {
        requestId: request.id,
        status: allPassed ? 'passed' : 'failed',
        value: execution.value,
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
   * Execute operation with per-request timeout.
   */
  private async executeOperationWithTimeout(
    request: CollectionRequest
  ): Promise<{ value: unknown; status: string }> {
    const timeoutMs = Math.max(1, request.timeout ?? DEFAULT_REQUEST_TIMEOUT)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.executeOperation(request)
        .then((result) => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Execute read/write operation.
   */
  private async executeOperation(
    request: CollectionRequest
  ): Promise<{ value: unknown; status: string }> {
    switch (request.operation) {
      case 'read':
        return this.executeReadOperation(request)
      case 'write':
        throw new Error('Write operation is not implemented yet')
      default:
        throw new Error(`Unsupported operation: ${request.operation}`)
    }
  }

  /**
   * Execute a read request via ConnectionManager.
   */
  private async executeReadOperation(
    request: CollectionRequest
  ): Promise<{ value: unknown; status: string }> {
    const address = this.getAddressFromParameters(request.parameters)
    const dataType = this.getDataTypeFromParameters(request.parameters)

    const result = await getConnectionManager().readOnce(
      request.connectionId,
      address,
      dataType
    )

    return {
      value: result.value,
      status: result.quality === 'bad' ? 'failed' : 'success'
    }
  }

  /**
   * Parse address payload from request parameters.
   */
  private getAddressFromParameters(
    parameters: Record<string, unknown>
  ): ModbusAddress | MqttAddress | OpcUaAddress {
    const address = parameters.address
    if (!address || typeof address !== 'object') {
      throw new Error('Invalid request parameters: address is required')
    }

    const type = (address as { type?: unknown }).type
    if (type !== 'modbus' && type !== 'mqtt' && type !== 'opcua') {
      throw new Error('Invalid request parameters: unsupported address type')
    }

    return address as ModbusAddress | MqttAddress | OpcUaAddress
  }

  /**
   * Parse data type from request parameters, defaults to uint16.
   */
  private getDataTypeFromParameters(parameters: Record<string, unknown>): DataType {
    const value = parameters.dataType
    if (typeof value !== 'string') {
      return 'uint16'
    }

    const validDataTypes = new Set<DataType>([
      'boolean',
      'int16',
      'uint16',
      'int32',
      'uint32',
      'float32',
      'float64',
      'string'
    ])

    return validDataTypes.has(value as DataType) ? (value as DataType) : 'uint16'
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
