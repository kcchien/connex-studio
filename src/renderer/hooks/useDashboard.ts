/**
 * useDashboard Hook
 *
 * React hook for dashboard CRUD, widget management, and layout updates.
 * Provides dashboard state management and IPC communication.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  Dashboard,
  DashboardWidget,
  WidgetLayout,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  AddWidgetRequest,
  UpdateWidgetRequest,
  UpdateLayoutRequest
} from '@shared/types'

const { dashboard: dashboardApi } = window.electronAPI

/**
 * Dashboard state with UI enhancements.
 */
interface DashboardState {
  dashboards: Dashboard[]
  currentDashboard: Dashboard | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook return type.
 */
interface UseDashboardReturn {
  // State
  dashboards: Dashboard[]
  currentDashboard: Dashboard | null
  isLoading: boolean
  error: string | null

  // Dashboard CRUD
  createDashboard: (request: CreateDashboardRequest) => Promise<Dashboard | null>
  updateDashboard: (request: UpdateDashboardRequest) => Promise<Dashboard | null>
  deleteDashboard: (id: string) => Promise<boolean>
  setDefaultDashboard: (id: string) => Promise<Dashboard | null>
  selectDashboard: (id: string) => void

  // Widget operations
  addWidget: (request: AddWidgetRequest) => Promise<DashboardWidget | null>
  updateWidget: (request: UpdateWidgetRequest) => Promise<DashboardWidget | null>
  removeWidget: (dashboardId: string, widgetId: string) => Promise<boolean>
  updateLayout: (request: UpdateLayoutRequest) => Promise<boolean>

  // Utility
  refreshDashboards: () => Promise<void>
  getDashboardById: (id: string) => Dashboard | undefined
  getWidgetById: (dashboardId: string, widgetId: string) => DashboardWidget | undefined
  clearError: () => void
}

/**
 * Hook for dashboard management.
 */
export function useDashboard(): UseDashboardReturn {
  const [state, setState] = useState<DashboardState>({
    dashboards: [],
    currentDashboard: null,
    isLoading: false,
    error: null
  })

  // Load dashboards on mount
  useEffect(() => {
    refreshDashboards()
  }, [])

  /**
   * Refresh dashboards from server.
   */
  const refreshDashboards = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const dashboards = await dashboardApi.list()
      const defaultDashboard = await dashboardApi.getDefault()

      setState((prev) => ({
        ...prev,
        dashboards,
        currentDashboard: defaultDashboard ?? dashboards[0] ?? null,
        isLoading: false
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
    }
  }, [])

  /**
   * Create a new dashboard.
   */
  const createDashboard = useCallback(
    async (request: CreateDashboardRequest): Promise<Dashboard | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const dashboard = await dashboardApi.create(request)
        setState((prev) => ({
          ...prev,
          dashboards: [...prev.dashboards, dashboard],
          currentDashboard: dashboard,
          isLoading: false
        }))
        return dashboard
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error),
          isLoading: false
        }))
        return null
      }
    },
    []
  )

  /**
   * Update an existing dashboard.
   */
  const updateDashboard = useCallback(
    async (request: UpdateDashboardRequest): Promise<Dashboard | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const dashboard = await dashboardApi.update(request)
        setState((prev) => ({
          ...prev,
          dashboards: prev.dashboards.map((d) =>
            d.id === request.id ? dashboard : d
          ),
          currentDashboard:
            prev.currentDashboard?.id === request.id
              ? dashboard
              : prev.currentDashboard,
          isLoading: false
        }))
        return dashboard
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error),
          isLoading: false
        }))
        return null
      }
    },
    []
  )

  /**
   * Delete a dashboard.
   */
  const deleteDashboard = useCallback(async (id: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const success = await dashboardApi.delete(id)
      if (success) {
        setState((prev) => {
          const remaining = prev.dashboards.filter((d) => d.id !== id)
          return {
            ...prev,
            dashboards: remaining,
            currentDashboard:
              prev.currentDashboard?.id === id
                ? remaining[0] ?? null
                : prev.currentDashboard,
            isLoading: false
          }
        })
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
      return success
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }))
      return false
    }
  }, [])

  /**
   * Set dashboard as default.
   */
  const setDefaultDashboard = useCallback(
    async (id: string): Promise<Dashboard | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const dashboard = await dashboardApi.setDefault(id)
        setState((prev) => ({
          ...prev,
          dashboards: prev.dashboards.map((d) => ({
            ...d,
            isDefault: d.id === id
          })),
          isLoading: false
        }))
        return dashboard
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error),
          isLoading: false
        }))
        return null
      }
    },
    []
  )

  /**
   * Select a dashboard as current.
   */
  const selectDashboard = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      currentDashboard: prev.dashboards.find((d) => d.id === id) ?? null
    }))
  }, [])

  /**
   * Add widget to a dashboard.
   */
  const addWidget = useCallback(
    async (request: AddWidgetRequest): Promise<DashboardWidget | null> => {
      try {
        const widget = await dashboardApi.addWidget(request)

        // Refresh dashboard to get updated layout
        const dashboard = await dashboardApi.get(request.dashboardId)
        if (dashboard) {
          setState((prev) => ({
            ...prev,
            dashboards: prev.dashboards.map((d) =>
              d.id === request.dashboardId ? dashboard : d
            ),
            currentDashboard:
              prev.currentDashboard?.id === request.dashboardId
                ? dashboard
                : prev.currentDashboard
          }))
        }
        return widget
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error)
        }))
        return null
      }
    },
    []
  )

  /**
   * Update a widget.
   */
  const updateWidget = useCallback(
    async (request: UpdateWidgetRequest): Promise<DashboardWidget | null> => {
      try {
        const widget = await dashboardApi.updateWidget(request)

        // Update local state
        setState((prev) => ({
          ...prev,
          dashboards: prev.dashboards.map((d) => {
            if (d.id !== request.dashboardId) return d
            return {
              ...d,
              widgets: d.widgets.map((w) =>
                w.id === request.widgetId ? widget : w
              )
            }
          }),
          currentDashboard:
            prev.currentDashboard?.id === request.dashboardId
              ? {
                  ...prev.currentDashboard,
                  widgets: prev.currentDashboard.widgets.map((w) =>
                    w.id === request.widgetId ? widget : w
                  )
                }
              : prev.currentDashboard
        }))
        return widget
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error)
        }))
        return null
      }
    },
    []
  )

  /**
   * Remove a widget.
   */
  const removeWidget = useCallback(
    async (dashboardId: string, widgetId: string): Promise<boolean> => {
      try {
        const success = await dashboardApi.removeWidget(dashboardId, widgetId)
        if (success) {
          setState((prev) => ({
            ...prev,
            dashboards: prev.dashboards.map((d) => {
              if (d.id !== dashboardId) return d
              return {
                ...d,
                widgets: d.widgets.filter((w) => w.id !== widgetId),
                layout: d.layout.filter((l) => l.i !== widgetId)
              }
            }),
            currentDashboard:
              prev.currentDashboard?.id === dashboardId
                ? {
                    ...prev.currentDashboard,
                    widgets: prev.currentDashboard.widgets.filter(
                      (w) => w.id !== widgetId
                    ),
                    layout: prev.currentDashboard.layout.filter(
                      (l) => l.i !== widgetId
                    )
                  }
                : prev.currentDashboard
          }))
        }
        return success
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error)
        }))
        return false
      }
    },
    []
  )

  /**
   * Update layout.
   */
  const updateLayout = useCallback(
    async (request: UpdateLayoutRequest): Promise<boolean> => {
      try {
        const success = await dashboardApi.updateLayout(request)
        if (success) {
          setState((prev) => ({
            ...prev,
            dashboards: prev.dashboards.map((d) =>
              d.id === request.dashboardId
                ? { ...d, layout: request.layout }
                : d
            ),
            currentDashboard:
              prev.currentDashboard?.id === request.dashboardId
                ? { ...prev.currentDashboard, layout: request.layout }
                : prev.currentDashboard
          }))
        }
        return success
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error)
        }))
        return false
      }
    },
    []
  )

  /**
   * Get dashboard by ID.
   */
  const getDashboardById = useCallback(
    (id: string): Dashboard | undefined => {
      return state.dashboards.find((d) => d.id === id)
    },
    [state.dashboards]
  )

  /**
   * Get widget by ID.
   */
  const getWidgetById = useCallback(
    (dashboardId: string, widgetId: string): DashboardWidget | undefined => {
      const dashboard = state.dashboards.find((d) => d.id === dashboardId)
      return dashboard?.widgets.find((w) => w.id === widgetId)
    },
    [state.dashboards]
  )

  /**
   * Clear error.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    dashboards: state.dashboards,
    currentDashboard: state.currentDashboard,
    isLoading: state.isLoading,
    error: state.error,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    setDefaultDashboard,
    selectDashboard,
    addWidget,
    updateWidget,
    removeWidget,
    updateLayout,
    refreshDashboards,
    getDashboardById,
    getWidgetById,
    clearError
  }
}
