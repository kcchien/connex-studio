/**
 * Dashboard IPC Handlers
 *
 * Handles dashboard CRUD operations, widget management, and layout updates.
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import { getDashboardService } from '../services/DashboardService'
import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  AddWidgetRequest,
  UpdateWidgetRequest,
  UpdateLayoutRequest
} from '@shared/types'

/**
 * IPC Channel names for dashboard operations.
 */
export const DASHBOARD_CHANNELS = {
  LIST: 'dashboard:list',
  GET: 'dashboard:get',
  CREATE: 'dashboard:create',
  UPDATE: 'dashboard:update',
  DELETE: 'dashboard:delete',
  SET_DEFAULT: 'dashboard:set-default',
  GET_DEFAULT: 'dashboard:get-default',
  ADD_WIDGET: 'dashboard:add-widget',
  UPDATE_WIDGET: 'dashboard:update-widget',
  REMOVE_WIDGET: 'dashboard:remove-widget',
  UPDATE_LAYOUT: 'dashboard:update-layout'
} as const

/**
 * Register all dashboard IPC handlers.
 */
export function registerDashboardHandlers(): void {
  const service = getDashboardService()

  // List all dashboards
  ipcMain.handle(DASHBOARD_CHANNELS.LIST, async (): Promise<Dashboard[]> => {
    try {
      return service.list()
    } catch (error) {
      log.error('[dashboard:list] Error:', error)
      throw error
    }
  })

  // Get dashboard by ID
  ipcMain.handle(
    DASHBOARD_CHANNELS.GET,
    async (_, id: string): Promise<Dashboard | null> => {
      try {
        return service.get(id)
      } catch (error) {
        log.error(`[dashboard:get] Error for ${id}:`, error)
        throw error
      }
    }
  )

  // Create dashboard
  ipcMain.handle(
    DASHBOARD_CHANNELS.CREATE,
    async (_, request: CreateDashboardRequest): Promise<Dashboard> => {
      try {
        const dashboard = await service.create(request)
        log.info(`[dashboard:create] Created dashboard: ${dashboard.name}`)
        return dashboard
      } catch (error) {
        log.error('[dashboard:create] Error:', error)
        throw error
      }
    }
  )

  // Update dashboard
  ipcMain.handle(
    DASHBOARD_CHANNELS.UPDATE,
    async (_, request: UpdateDashboardRequest): Promise<Dashboard> => {
      try {
        const dashboard = await service.update(request)
        log.info(`[dashboard:update] Updated dashboard: ${dashboard.name}`)
        return dashboard
      } catch (error) {
        log.error('[dashboard:update] Error:', error)
        throw error
      }
    }
  )

  // Delete dashboard
  ipcMain.handle(
    DASHBOARD_CHANNELS.DELETE,
    async (_, id: string): Promise<boolean> => {
      try {
        const success = await service.delete(id)
        if (success) {
          log.info(`[dashboard:delete] Deleted dashboard: ${id}`)
        }
        return success
      } catch (error) {
        log.error(`[dashboard:delete] Error for ${id}:`, error)
        throw error
      }
    }
  )

  // Set default dashboard
  ipcMain.handle(
    DASHBOARD_CHANNELS.SET_DEFAULT,
    async (_, id: string): Promise<Dashboard> => {
      try {
        const dashboard = await service.setDefault(id)
        log.info(`[dashboard:set-default] Set default: ${dashboard.name}`)
        return dashboard
      } catch (error) {
        log.error(`[dashboard:set-default] Error for ${id}:`, error)
        throw error
      }
    }
  )

  // Get default dashboard
  ipcMain.handle(
    DASHBOARD_CHANNELS.GET_DEFAULT,
    async (): Promise<Dashboard | null> => {
      try {
        return service.getDefault()
      } catch (error) {
        log.error('[dashboard:get-default] Error:', error)
        throw error
      }
    }
  )

  // Add widget to dashboard
  ipcMain.handle(
    DASHBOARD_CHANNELS.ADD_WIDGET,
    async (_, request: AddWidgetRequest): Promise<DashboardWidget> => {
      try {
        const widget = await service.addWidget(request)
        log.info(`[dashboard:add-widget] Added widget to ${request.dashboardId}`)
        return widget
      } catch (error) {
        log.error('[dashboard:add-widget] Error:', error)
        throw error
      }
    }
  )

  // Update widget
  ipcMain.handle(
    DASHBOARD_CHANNELS.UPDATE_WIDGET,
    async (_, request: UpdateWidgetRequest): Promise<DashboardWidget> => {
      try {
        const widget = await service.updateWidget(request)
        log.info(`[dashboard:update-widget] Updated widget ${request.widgetId}`)
        return widget
      } catch (error) {
        log.error('[dashboard:update-widget] Error:', error)
        throw error
      }
    }
  )

  // Remove widget
  ipcMain.handle(
    DASHBOARD_CHANNELS.REMOVE_WIDGET,
    async (
      _,
      { dashboardId, widgetId }: { dashboardId: string; widgetId: string }
    ): Promise<boolean> => {
      try {
        const success = await service.removeWidget(dashboardId, widgetId)
        if (success) {
          log.info(`[dashboard:remove-widget] Removed widget ${widgetId}`)
        }
        return success
      } catch (error) {
        log.error('[dashboard:remove-widget] Error:', error)
        throw error
      }
    }
  )

  // Update layout
  ipcMain.handle(
    DASHBOARD_CHANNELS.UPDATE_LAYOUT,
    async (_, request: UpdateLayoutRequest): Promise<boolean> => {
      try {
        const success = await service.updateLayout(request)
        log.debug(`[dashboard:update-layout] Updated layout for ${request.dashboardId}`)
        return success
      } catch (error) {
        log.error('[dashboard:update-layout] Error:', error)
        throw error
      }
    }
  )

  log.info('[IPC] Dashboard handlers registered')
}

/**
 * Unregister all dashboard IPC handlers.
 */
export function unregisterDashboardHandlers(): void {
  Object.values(DASHBOARD_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })
  log.info('[IPC] Dashboard handlers unregistered')
}
