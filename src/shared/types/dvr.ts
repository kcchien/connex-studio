/**
 * DVR (Data Video Recorder) type definitions for IIoT Protocol Studio.
 * Enables time-travel through historical data.
 */

import type { TagValue } from './polling'

export interface DvrRange {
  startTimestamp: number
  endTimestamp: number
  dataPointCount: number
}

export interface DvrSnapshot {
  timestamp: number
  values: TagValue[]
}

export interface SparklineData {
  timestamps: number[]
  values: number[]
}

export interface DvrState {
  isLive: boolean
  playbackTimestamp: number
  bufferStartTimestamp: number
  bufferEndTimestamp: number
}

// DVR constraints
export const DEFAULT_DVR_BUFFER_MINUTES = 5
export const MAX_DVR_BUFFER_MINUTES = 60
export const DEFAULT_SPARKLINE_POINTS = 60
