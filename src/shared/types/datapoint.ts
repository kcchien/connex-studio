/**
 * DataPoint type definitions for IIoT Protocol Studio.
 * Represents sampled values from tags.
 */

import type { DataQuality } from './common'

export interface DataPoint {
  id: number
  tagId: string
  timestamp: number
  value: number | boolean | string
  quality: DataQuality
}

// UI display state derived from DataPoints
export type AlarmState = 'normal' | 'warning' | 'alarm'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface TagDisplayState {
  tagId: string
  currentValue: number | boolean | string | null
  quality: DataQuality
  timestamp: number
  sparklineData: number[]
  alarmState: AlarmState
  trend: TrendDirection
}
