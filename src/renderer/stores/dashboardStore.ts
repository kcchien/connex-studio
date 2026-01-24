/**
 * Zustand store for dashboard state management.
 * Manages dashboards and widget configurations.
 */

import { create } from 'zustand'
import type { Dashboard, DashboardWidget, WidgetLayout } from '@shared/types'

export interface DashboardState {
  dashboards: Dashboard[]
  selectedDashboardId: string | null
  selectedWidgetId: string | null
  isEditMode: boolean

  // Actions
  addDashboard: (dashboard: Dashboard) => void
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void
  removeDashboard: (id: string) => void
  setSelectedDashboard: (id: string | null) => void
  setDashboards: (dashboards: Dashboard[]) => void

  // Widget actions
  addWidget: (dashboardId: string, widget: DashboardWidget) => void
  updateWidget: (dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>) => void
  removeWidget: (dashboardId: string, widgetId: string) => void
  updateLayout: (dashboardId: string, layouts: WidgetLayout[]) => void
  setSelectedWidget: (id: string | null) => void

  // Edit mode
  setEditMode: (enabled: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboards: [],
  selectedDashboardId: null,
  selectedWidgetId: null,
  isEditMode: false,

  addDashboard: (dashboard: Dashboard) => {
    set((state) => ({
      dashboards: [...state.dashboards, dashboard]
    }))
  },

  updateDashboard: (id: string, updates: Partial<Dashboard>) => {
    set((state) => ({
      dashboards: state.dashboards.map((db) => (db.id === id ? { ...db, ...updates } : db))
    }))
  },

  removeDashboard: (id: string) => {
    set((state) => {
      const newDashboards = state.dashboards.filter((db) => db.id !== id)
      const newSelectedId = state.selectedDashboardId === id ? null : state.selectedDashboardId
      return {
        dashboards: newDashboards,
        selectedDashboardId: newSelectedId,
        selectedWidgetId: state.selectedDashboardId === id ? null : state.selectedWidgetId
      }
    })
  },

  setSelectedDashboard: (id: string | null) => {
    set({
      selectedDashboardId: id,
      selectedWidgetId: null // Clear widget selection on dashboard change
    })
  },

  setDashboards: (dashboards: Dashboard[]) => {
    set((state) => {
      const newSelectedId =
        state.selectedDashboardId && dashboards.some((d) => d.id === state.selectedDashboardId)
          ? state.selectedDashboardId
          : null
      return {
        dashboards,
        selectedDashboardId: newSelectedId,
        selectedWidgetId: newSelectedId ? state.selectedWidgetId : null
      }
    })
  },

  addWidget: (dashboardId: string, widget: DashboardWidget) => {
    set((state) => ({
      dashboards: state.dashboards.map((db) =>
        db.id === dashboardId ? { ...db, widgets: [...db.widgets, widget] } : db
      )
    }))
  },

  updateWidget: (dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>) => {
    set((state) => ({
      dashboards: state.dashboards.map((db) =>
        db.id === dashboardId
          ? {
              ...db,
              widgets: db.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w))
            }
          : db
      )
    }))
  },

  removeWidget: (dashboardId: string, widgetId: string) => {
    set((state) => ({
      dashboards: state.dashboards.map((db) =>
        db.id === dashboardId
          ? {
              ...db,
              widgets: db.widgets.filter((w) => w.id !== widgetId),
              layout: db.layout.filter((l) => l.i !== widgetId)
            }
          : db
      ),
      selectedWidgetId: state.selectedWidgetId === widgetId ? null : state.selectedWidgetId
    }))
  },

  updateLayout: (dashboardId: string, layouts: WidgetLayout[]) => {
    set((state) => ({
      dashboards: state.dashboards.map((db) =>
        db.id === dashboardId ? { ...db, layout: layouts } : db
      )
    }))
  },

  setSelectedWidget: (id: string | null) => {
    set({ selectedWidgetId: id })
  },

  setEditMode: (enabled: boolean) => {
    set({ isEditMode: enabled })
  }
}))

// Selector helpers
export const selectDashboards = (state: DashboardState) => state.dashboards
export const selectSelectedDashboardId = (state: DashboardState) => state.selectedDashboardId
export const selectSelectedDashboard = (state: DashboardState) =>
  state.dashboards.find((d) => d.id === state.selectedDashboardId)
export const selectDashboardById = (id: string) => (state: DashboardState) =>
  state.dashboards.find((d) => d.id === id)
export const selectSelectedWidgetId = (state: DashboardState) => state.selectedWidgetId
export const selectIsEditMode = (state: DashboardState) => state.isEditMode
export const selectDashboardWidgets = (dashboardId: string) => (state: DashboardState) =>
  state.dashboards.find((d) => d.id === dashboardId)?.widgets ?? []
