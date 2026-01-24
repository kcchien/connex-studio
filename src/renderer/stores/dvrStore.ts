/**
 * Zustand store for DVR (Data Video Recorder) state management.
 * Manages time-travel functionality through historical data.
 */

import { create } from 'zustand'
import type { DvrRange, DvrSnapshot, TagValue } from '@shared/types'

export interface DvrState {
  // DVR Mode
  isLive: boolean

  // Buffer range
  bufferStartTimestamp: number
  bufferEndTimestamp: number
  dataPointCount: number

  // Playback position
  playbackTimestamp: number

  // Historical values at playback position
  historicalValues: Map<string, TagValue>

  // Loading state
  isLoading: boolean
  error: string | null

  // Actions
  setLive: (isLive: boolean) => void
  setRange: (range: DvrRange) => void
  setPlaybackTimestamp: (timestamp: number) => void
  setHistoricalValues: (snapshot: DvrSnapshot) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  isLive: true,
  bufferStartTimestamp: 0,
  bufferEndTimestamp: 0,
  dataPointCount: 0,
  playbackTimestamp: 0,
  historicalValues: new Map<string, TagValue>(),
  isLoading: false,
  error: null
}

export const useDvrStore = create<DvrState>((set) => ({
  ...initialState,

  setLive: (isLive) => {
    set({ isLive })
  },

  setRange: (range) => {
    set({
      bufferStartTimestamp: range.startTimestamp,
      bufferEndTimestamp: range.endTimestamp,
      dataPointCount: range.dataPointCount
    })
  },

  setPlaybackTimestamp: (timestamp) => {
    set({ playbackTimestamp: timestamp })
  },

  setHistoricalValues: (snapshot) => {
    const historicalValues = new Map<string, TagValue>()
    for (const value of snapshot.values) {
      historicalValues.set(value.tagId, value)
    }
    set({
      historicalValues,
      playbackTimestamp: snapshot.timestamp
    })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  setError: (error) => {
    set({ error })
  },

  reset: () => {
    set(initialState)
  }
}))

// Selector helpers
export const selectIsLive = (state: DvrState) => state.isLive
export const selectPlaybackTimestamp = (state: DvrState) => state.playbackTimestamp
export const selectBufferRange = (state: DvrState) => ({
  start: state.bufferStartTimestamp,
  end: state.bufferEndTimestamp,
  count: state.dataPointCount
})
export const selectHistoricalValue = (tagId: string) => (state: DvrState) =>
  state.historicalValues.get(tagId)
