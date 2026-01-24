/**
 * Zustand store for collection state management.
 * Manages request collections and run results.
 */

import { create } from 'zustand'
import type {
  Collection,
  CollectionRunResult,
  CollectionProgress
} from '@shared/types'

export interface CollectionState {
  collections: Collection[]
  selectedCollectionId: string | null
  activeRunId: string | null
  runProgress: CollectionProgress | null
  lastRunResult: CollectionRunResult | null

  // Actions
  addCollection: (collection: Collection) => void
  updateCollection: (id: string, updates: Partial<Collection>) => void
  removeCollection: (id: string) => void
  setSelected: (id: string | null) => void
  setCollections: (collections: Collection[]) => void

  // Run state actions
  setActiveRun: (runId: string | null) => void
  setRunProgress: (progress: CollectionProgress | null) => void
  setLastRunResult: (result: CollectionRunResult | null) => void
}

export const useCollectionStore = create<CollectionState>((set) => ({
  collections: [],
  selectedCollectionId: null,
  activeRunId: null,
  runProgress: null,
  lastRunResult: null,

  addCollection: (collection: Collection) => {
    set((state) => ({
      collections: [...state.collections, collection]
    }))
  },

  updateCollection: (id: string, updates: Partial<Collection>) => {
    set((state) => ({
      collections: state.collections.map((coll) =>
        coll.id === id ? { ...coll, ...updates } : coll
      )
    }))
  },

  removeCollection: (id: string) => {
    set((state) => {
      const newCollections = state.collections.filter((coll) => coll.id !== id)
      const newSelectedId = state.selectedCollectionId === id ? null : state.selectedCollectionId
      return {
        collections: newCollections,
        selectedCollectionId: newSelectedId
      }
    })
  },

  setSelected: (id: string | null) => {
    set({ selectedCollectionId: id })
  },

  setCollections: (collections: Collection[]) => {
    set((state) => {
      const newSelectedId =
        state.selectedCollectionId && collections.some((c) => c.id === state.selectedCollectionId)
          ? state.selectedCollectionId
          : null
      return {
        collections,
        selectedCollectionId: newSelectedId
      }
    })
  },

  setActiveRun: (runId: string | null) => {
    set({ activeRunId: runId })
  },

  setRunProgress: (progress: CollectionProgress | null) => {
    set({ runProgress: progress })
  },

  setLastRunResult: (result: CollectionRunResult | null) => {
    set({ lastRunResult: result })
  }
}))

// Selector helpers
export const selectCollections = (state: CollectionState) => state.collections
export const selectSelectedCollectionId = (state: CollectionState) => state.selectedCollectionId
export const selectSelectedCollection = (state: CollectionState) =>
  state.collections.find((c) => c.id === state.selectedCollectionId)
export const selectCollectionById = (id: string) => (state: CollectionState) =>
  state.collections.find((c) => c.id === id)
export const selectIsRunning = (state: CollectionState) => state.activeRunId !== null
export const selectRunProgress = (state: CollectionState) => state.runProgress
export const selectLastRunResult = (state: CollectionState) => state.lastRunResult
