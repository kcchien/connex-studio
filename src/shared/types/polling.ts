/**
 * Polling type definitions for IIoT Protocol Studio.
 */

import type { DataQuality } from './common'

export interface PollingStatus {
  isPolling: boolean
  intervalMs: number
  lastPollTimestamp: number
  tagCount: number
}

export interface PollingDataPayload {
  connectionId: string
  timestamp: number
  values: TagValue[]
}

export interface TagValue {
  tagId: string
  value: number | boolean | string
  quality: DataQuality
}

// Polling constraints
export const MIN_POLLING_INTERVAL_MS = 100
export const MAX_POLLING_INTERVAL_MS = 60000
export const DEFAULT_POLLING_INTERVAL_MS = 1000
