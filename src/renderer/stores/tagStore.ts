/**
 * Zustand store for tag state management.
 * Manages tags, real-time values, and sparkline data.
 */

import { create } from 'zustand'
import type { Tag } from '@shared/types/tag'
import type { DataQuality } from '@shared/types/common'
import type { TagValue, PollingDataPayload } from '@shared/types/polling'

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

interface TagState {
  // Tag definitions per connection
  tagsByConnection: Map<string, Tag[]>

  // Real-time display state per tag
  displayStates: Map<string, TagDisplayState>

  // Actions
  setTags: (connectionId: string, tags: Tag[]) => void
  addTag: (connectionId: string, tag: Tag) => void
  updateTag: (tagId: string, updates: Partial<Tag>) => void
  removeTag: (tagId: string) => void
  clearTags: (connectionId: string) => void

  // Handle polling data from main process
  handlePollingData: (payload: PollingDataPayload) => void

  // Get tags for a connection
  getTags: (connectionId: string) => Tag[]

  // Get display state for a tag
  getDisplayState: (tagId: string) => TagDisplayState | undefined
}

// Maximum sparkline data points to keep
const MAX_SPARKLINE_POINTS = 60

/**
 * Calculate alarm state based on thresholds.
 */
function calculateAlarmState(
  value: number,
  thresholds: Tag['thresholds']
): AlarmState {
  const { warningLow, warningHigh, alarmLow, alarmHigh } = thresholds

  // Check alarm thresholds first (higher priority)
  if (alarmLow !== undefined && value <= alarmLow) return 'alarm'
  if (alarmHigh !== undefined && value >= alarmHigh) return 'alarm'

  // Check warning thresholds
  if (warningLow !== undefined && value <= warningLow) return 'warning'
  if (warningHigh !== undefined && value >= warningHigh) return 'warning'

  return 'normal'
}

/**
 * Calculate trend direction based on recent values.
 */
function calculateTrend(sparklineData: number[]): TrendDirection {
  if (sparklineData.length < 3) return 'stable'

  // Compare last value to average of previous values
  const lastValue = sparklineData[sparklineData.length - 1]
  const previousValues = sparklineData.slice(-6, -1)

  if (previousValues.length === 0) return 'stable'

  const avg = previousValues.reduce((a, b) => a + b, 0) / previousValues.length
  const diff = lastValue - avg
  const threshold = Math.abs(avg) * 0.02 // 2% threshold

  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'stable'
}

export const useTagStore = create<TagState>((set, get) => ({
  tagsByConnection: new Map(),
  displayStates: new Map(),

  setTags: (connectionId, tags) => {
    set((state) => {
      const newMap = new Map(state.tagsByConnection)
      newMap.set(connectionId, tags)
      return { tagsByConnection: newMap }
    })
  },

  addTag: (connectionId, tag) => {
    set((state) => {
      const newMap = new Map(state.tagsByConnection)
      const existing = newMap.get(connectionId) ?? []
      newMap.set(connectionId, [...existing, tag])
      return { tagsByConnection: newMap }
    })
  },

  updateTag: (tagId, updates) => {
    set((state) => {
      const newMap = new Map(state.tagsByConnection)

      for (const [connId, tags] of newMap.entries()) {
        const tagIndex = tags.findIndex((t) => t.id === tagId)
        if (tagIndex !== -1) {
          const updatedTags = [...tags]
          updatedTags[tagIndex] = { ...updatedTags[tagIndex], ...updates }
          newMap.set(connId, updatedTags)
          break
        }
      }

      return { tagsByConnection: newMap }
    })
  },

  removeTag: (tagId) => {
    set((state) => {
      const newTagsMap = new Map(state.tagsByConnection)
      const newDisplayMap = new Map(state.displayStates)

      for (const [connId, tags] of newTagsMap.entries()) {
        const filtered = tags.filter((t) => t.id !== tagId)
        if (filtered.length !== tags.length) {
          newTagsMap.set(connId, filtered)
          break
        }
      }

      newDisplayMap.delete(tagId)

      return {
        tagsByConnection: newTagsMap,
        displayStates: newDisplayMap
      }
    })
  },

  clearTags: (connectionId) => {
    set((state) => {
      const newTagsMap = new Map(state.tagsByConnection)
      const newDisplayMap = new Map(state.displayStates)

      const tags = newTagsMap.get(connectionId) ?? []
      for (const tag of tags) {
        newDisplayMap.delete(tag.id)
      }

      newTagsMap.delete(connectionId)

      return {
        tagsByConnection: newTagsMap,
        displayStates: newDisplayMap
      }
    })
  },

  handlePollingData: (payload) => {
    set((state) => {
      const newDisplayMap = new Map(state.displayStates)
      const tags = state.tagsByConnection.get(payload.connectionId) ?? []

      for (const value of payload.values) {
        const tag = tags.find((t) => t.id === value.tagId)
        if (!tag) continue

        const existing = newDisplayMap.get(value.tagId)
        const numericValue = typeof value.value === 'number' ? value.value : 0

        // Update sparkline data
        let sparklineData: number[] = existing?.sparklineData ?? []
        if (typeof value.value === 'number') {
          sparklineData = [...sparklineData, value.value]
          if (sparklineData.length > MAX_SPARKLINE_POINTS) {
            sparklineData = sparklineData.slice(-MAX_SPARKLINE_POINTS)
          }
        }

        // Calculate alarm state and trend
        const alarmState = calculateAlarmState(numericValue, tag.thresholds)
        const trend = calculateTrend(sparklineData)

        const displayState: TagDisplayState = {
          tagId: value.tagId,
          currentValue: value.value,
          quality: value.quality,
          timestamp: payload.timestamp,
          sparklineData,
          alarmState,
          trend
        }

        newDisplayMap.set(value.tagId, displayState)
      }

      return { displayStates: newDisplayMap }
    })
  },

  getTags: (connectionId) => {
    return get().tagsByConnection.get(connectionId) ?? []
  },

  getDisplayState: (tagId) => {
    return get().displayStates.get(tagId)
  }
}))

// Selector helpers
export const selectTagsByConnection = (connectionId: string) => (state: TagState) =>
  state.tagsByConnection.get(connectionId) ?? []

export const selectDisplayState = (tagId: string) => (state: TagState) =>
  state.displayStates.get(tagId)

export const selectAllDisplayStates = (state: TagState) =>
  Array.from(state.displayStates.values())
