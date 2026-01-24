/**
 * Zustand store for environment variables state management.
 * Manages environments and syncs with Main process via IPC.
 */

import { create } from 'zustand'
import type { Environment } from '@shared/types'

export interface EnvironmentState {
  environments: Environment[]
  activeEnvironmentId: string | null

  // Actions
  addEnvironment: (env: Environment) => void
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  removeEnvironment: (id: string) => void
  setActive: (id: string | null) => void
  setEnvironments: (environments: Environment[]) => void
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  environments: [],
  activeEnvironmentId: null,

  addEnvironment: (env: Environment) => {
    set((state) => ({
      environments: [...state.environments, env]
    }))
  },

  updateEnvironment: (id: string, updates: Partial<Environment>) => {
    set((state) => ({
      environments: state.environments.map((env) =>
        env.id === id ? { ...env, ...updates } : env
      )
    }))
  },

  removeEnvironment: (id: string) => {
    set((state) => {
      const newEnvironments = state.environments.filter((env) => env.id !== id)
      // Clear active if the removed environment was active
      const newActiveId = state.activeEnvironmentId === id ? null : state.activeEnvironmentId
      return {
        environments: newEnvironments,
        activeEnvironmentId: newActiveId
      }
    })
  },

  setActive: (id: string | null) => {
    set({ activeEnvironmentId: id })
  },

  setEnvironments: (environments: Environment[]) => {
    set((state) => {
      const newActiveId =
        state.activeEnvironmentId && environments.some((e) => e.id === state.activeEnvironmentId)
          ? state.activeEnvironmentId
          : null
      return {
        environments,
        activeEnvironmentId: newActiveId
      }
    })
  }
}))

// Selector helpers
export const selectEnvironments = (state: EnvironmentState) => state.environments
export const selectActiveEnvironmentId = (state: EnvironmentState) => state.activeEnvironmentId
export const selectActiveEnvironment = (state: EnvironmentState) =>
  state.environments.find((e) => e.id === state.activeEnvironmentId)
export const selectEnvironmentById = (id: string) => (state: EnvironmentState) =>
  state.environments.find((e) => e.id === id)
export const selectActiveVariables = (state: EnvironmentState) => {
  const active = state.environments.find((e) => e.id === state.activeEnvironmentId)
  return active?.variables ?? {}
}
