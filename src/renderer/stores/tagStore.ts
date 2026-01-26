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

  // Selection state for multi-select
  selectedTagIds: Set<string>

  // Track the last clicked tag for shift-click range selection
  lastSelectedTagId: string | null

  // Currently editing tag (for side panel)
  editingTagId: string | null

  // Actions
  setTags: (connectionId: string, tags: Tag[]) => void
  addTag: (connectionId: string, tag: Tag) => void
  updateTag: (tagId: string, updates: Partial<Tag>) => void
  removeTag: (tagId: string) => void
  removeTags: (tagIds: string[]) => void
  clearTags: (connectionId: string) => void

  // Selection actions
  toggleTagSelection: (tagId: string) => void
  selectTag: (tagId: string) => void
  deselectTag: (tagId: string) => void
  selectAllTags: (connectionId: string) => void
  clearSelection: () => void
  selectTagRange: (connectionId: string, fromTagId: string, toTagId: string) => void
  setLastSelectedTag: (tagId: string | null) => void

  // Editing actions
  setEditingTag: (tagId: string | null) => void

  // Handle polling data from main process
  handlePollingData: (payload: PollingDataPayload) => void

  // Get tags for a connection
  getTags: (connectionId: string) => Tag[]

  // Get display state for a tag
  getDisplayState: (tagId: string) => TagDisplayState | undefined

  // Check if tag is selected
  isTagSelected: (tagId: string) => boolean

  // Get selected tag count
  getSelectedCount: () => number
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
  selectedTagIds: new Set(),
  lastSelectedTagId: null,
  editingTagId: null,

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
      const newSelectedIds = new Set(state.selectedTagIds)

      for (const [connId, tags] of newTagsMap.entries()) {
        const filtered = tags.filter((t) => t.id !== tagId)
        if (filtered.length !== tags.length) {
          newTagsMap.set(connId, filtered)
          break
        }
      }

      newDisplayMap.delete(tagId)
      newSelectedIds.delete(tagId)

      return {
        tagsByConnection: newTagsMap,
        displayStates: newDisplayMap,
        selectedTagIds: newSelectedIds,
        editingTagId: state.editingTagId === tagId ? null : state.editingTagId
      }
    })
  },

  removeTags: (tagIds) => {
    set((state) => {
      const newTagsMap = new Map(state.tagsByConnection)
      const newDisplayMap = new Map(state.displayStates)
      const newSelectedIds = new Set(state.selectedTagIds)
      const tagIdSet = new Set(tagIds)

      for (const [connId, tags] of newTagsMap.entries()) {
        const filtered = tags.filter((t) => !tagIdSet.has(t.id))
        if (filtered.length !== tags.length) {
          newTagsMap.set(connId, filtered)
        }
      }

      for (const tagId of tagIds) {
        newDisplayMap.delete(tagId)
        newSelectedIds.delete(tagId)
      }

      return {
        tagsByConnection: newTagsMap,
        displayStates: newDisplayMap,
        selectedTagIds: newSelectedIds,
        editingTagId: state.editingTagId && tagIdSet.has(state.editingTagId) ? null : state.editingTagId
      }
    })
  },

  clearTags: (connectionId) => {
    set((state) => {
      const newTagsMap = new Map(state.tagsByConnection)
      const newDisplayMap = new Map(state.displayStates)
      const newSelectedIds = new Set(state.selectedTagIds)

      const tags = newTagsMap.get(connectionId) ?? []
      for (const tag of tags) {
        newDisplayMap.delete(tag.id)
        newSelectedIds.delete(tag.id)
      }

      newTagsMap.delete(connectionId)

      return {
        tagsByConnection: newTagsMap,
        displayStates: newDisplayMap,
        selectedTagIds: newSelectedIds,
        editingTagId: null
      }
    })
  },

  // Selection actions
  toggleTagSelection: (tagId) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedTagIds)
      if (newSelectedIds.has(tagId)) {
        newSelectedIds.delete(tagId)
      } else {
        newSelectedIds.add(tagId)
      }
      return {
        selectedTagIds: newSelectedIds,
        lastSelectedTagId: tagId
      }
    })
  },

  selectTag: (tagId) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedTagIds)
      newSelectedIds.add(tagId)
      return {
        selectedTagIds: newSelectedIds,
        lastSelectedTagId: tagId
      }
    })
  },

  deselectTag: (tagId) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedTagIds)
      newSelectedIds.delete(tagId)
      return { selectedTagIds: newSelectedIds }
    })
  },

  selectAllTags: (connectionId) => {
    set((state) => {
      const tags = state.tagsByConnection.get(connectionId) ?? []
      const newSelectedIds = new Set(tags.map((t) => t.id))
      return {
        selectedTagIds: newSelectedIds,
        lastSelectedTagId: tags.length > 0 ? tags[tags.length - 1].id : null
      }
    })
  },

  clearSelection: () => {
    set({ selectedTagIds: new Set(), lastSelectedTagId: null })
  },

  selectTagRange: (connectionId, fromTagId, toTagId) => {
    set((state) => {
      const tags = state.tagsByConnection.get(connectionId) ?? []
      const fromIndex = tags.findIndex((t) => t.id === fromTagId)
      const toIndex = tags.findIndex((t) => t.id === toTagId)

      if (fromIndex === -1 || toIndex === -1) return state

      const startIndex = Math.min(fromIndex, toIndex)
      const endIndex = Math.max(fromIndex, toIndex)

      const newSelectedIds = new Set(state.selectedTagIds)
      for (let i = startIndex; i <= endIndex; i++) {
        newSelectedIds.add(tags[i].id)
      }

      return {
        selectedTagIds: newSelectedIds,
        lastSelectedTagId: toTagId
      }
    })
  },

  setLastSelectedTag: (tagId) => {
    set({ lastSelectedTagId: tagId })
  },

  // Editing actions
  setEditingTag: (tagId) => {
    set({ editingTagId: tagId })
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
  },

  isTagSelected: (tagId) => {
    return get().selectedTagIds.has(tagId)
  },

  getSelectedCount: () => {
    return get().selectedTagIds.size
  }
}))

// Selector helpers
export const selectTagsByConnection = (connectionId: string) => (state: TagState) =>
  state.tagsByConnection.get(connectionId) ?? []

export const selectDisplayState = (tagId: string) => (state: TagState) =>
  state.displayStates.get(tagId)

export const selectAllDisplayStates = (state: TagState) =>
  Array.from(state.displayStates.values())

export const selectSelectedTagIds = (state: TagState) =>
  state.selectedTagIds

export const selectSelectedCount = (state: TagState) =>
  state.selectedTagIds.size

export const selectIsTagSelected = (tagId: string) => (state: TagState) =>
  state.selectedTagIds.has(tagId)

export const selectEditingTagId = (state: TagState) =>
  state.editingTagId
