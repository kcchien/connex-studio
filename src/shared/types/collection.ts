/**
 * Collection type definitions for request sequencing and assertions.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Core Collection Types
// -----------------------------------------------------------------------------

export interface Collection {
  id: string
  name: string
  description?: string
  requests: CollectionRequest[]
  executionMode: 'sequential'
  createdAt: number
  updatedAt: number
}

export interface CollectionRequest {
  id: string
  connectionId: string
  operation: 'read' | 'write'
  parameters: Record<string, unknown>
  assertions: Assertion[]
  timeout: number
}

// -----------------------------------------------------------------------------
// Assertion Types
// -----------------------------------------------------------------------------

export type AssertionType = 'equals' | 'contains' | 'range' | 'regex'
export type AssertionTarget = 'value' | 'status' | 'latency'

export interface Assertion {
  type: AssertionType
  target: AssertionTarget
  expected: unknown
  message?: string
}

// -----------------------------------------------------------------------------
// Collection Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateCollectionRequest {
  name: string
  description?: string
  requests?: CollectionRequest[]
}

export interface UpdateCollectionRequest {
  id: string
  name?: string
  description?: string
  requests?: CollectionRequest[]
}

// -----------------------------------------------------------------------------
// Execution Result Types
// -----------------------------------------------------------------------------

export type CollectionRunStatus = 'success' | 'partial' | 'failed' | 'cancelled'
export type RequestResultStatus = 'passed' | 'failed' | 'skipped'

export interface CollectionRunResult {
  runId: string
  collectionId: string
  status: CollectionRunStatus
  startedAt: number
  completedAt: number
  results: RequestResult[]
  summary: CollectionSummary
}

export interface CollectionSummary {
  total: number
  passed: number
  failed: number
  skipped: number
}

export interface RequestResult {
  requestId: string
  status: RequestResultStatus
  value?: unknown
  latency: number
  assertions: AssertionResult[]
  error?: string
}

export interface AssertionResult {
  passed: boolean
  message?: string
  expected?: unknown
  actual?: unknown
}

// -----------------------------------------------------------------------------
// Progress Types
// -----------------------------------------------------------------------------

export type CollectionProgressStatus = 'running' | 'completed' | 'failed'

export interface CollectionProgress {
  runId: string
  currentIndex: number
  total: number
  currentRequest: string
  status: CollectionProgressStatus
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_REQUEST_TIMEOUT = 5000
