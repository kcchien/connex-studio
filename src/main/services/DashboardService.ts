/**
 * Dashboard Service
 *
 * Manages dashboard configurations with widgets and layouts.
 */

import { EventEmitter } from 'events'
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
import { DEFAULT_WIDGET_LAYOUT } from '@shared/types'

/**
 * Events emitted by DashboardService.
 */
export interface DashboardServiceEvents {
  'dashboard-changed': (dashboard: Dashboard) => void
  'widget-added': (dashboardId: string, widget: DashboardWidget) => void
  'widget-updated': (dashboardId: string, widget: DashboardWidget) => void
  'widget-removed': (dashboardId: string, widgetId: string) => void
  'layout-updated': (dashboardId: string, layout: WidgetLayout[]) => void
  /** Emitted when orphaned widgets are cleaned up (T166) */
  'orphaned-widgets-cleaned': (dashboardId: string, widgetIds: string[]) => void
}

/**
 * Dashboard Service handles CRUD operations for dashboards and widgets.
 */
export class DashboardService extends EventEmitter {
  private dashboards: Map<string, Dashboard> = new Map()

  constructor() {
    super()
  }

  /**
   * Initialize the service, loading dashboards from storage.
   */
  async initialize(): Promise<void> {
    // TODO: Load dashboards from profile storage
  }

  /**
   * List all dashboards.
   */
  list(): Dashboard[] {
    return Array.from(this.dashboards.values())
  }

  /**
   * Get dashboard by ID.
   */
  get(id: string): Dashboard | null {
    return this.dashboards.get(id) ?? null
  }

  /**
   * Create a new dashboard.
   */
  async create(request: CreateDashboardRequest): Promise<Dashboard> {
    const now = Date.now()
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name: request.name,
      isDefault: request.isDefault ?? false,
      layout: [],
      widgets: [],
      createdAt: now,
      updatedAt: now
    }

    // If this is set as default, unset previous default
    if (dashboard.isDefault) {
      await this.clearDefault()
    }

    this.dashboards.set(dashboard.id, dashboard)
    this.emit('dashboard-changed', dashboard)

    // TODO: Persist to profile storage
    return dashboard
  }

  /**
   * Update dashboard properties (not widgets/layout).
   */
  async update(request: UpdateDashboardRequest): Promise<Dashboard> {
    const existing = this.dashboards.get(request.id)
    if (!existing) {
      throw new Error(`Dashboard not found: ${request.id}`)
    }

    // Handle default change
    if (request.isDefault && !existing.isDefault) {
      await this.clearDefault()
    }

    const updated: Dashboard = {
      ...existing,
      name: request.name ?? existing.name,
      isDefault: request.isDefault ?? existing.isDefault,
      updatedAt: Date.now()
    }

    this.dashboards.set(updated.id, updated)
    this.emit('dashboard-changed', updated)

    // TODO: Persist to profile storage
    return updated
  }

  /**
   * Delete a dashboard.
   */
  async delete(id: string): Promise<boolean> {
    if (!this.dashboards.has(id)) {
      return false
    }

    this.dashboards.delete(id)
    // TODO: Persist to profile storage
    return true
  }

  /**
   * Set a dashboard as default (auto-open on startup).
   */
  async setDefault(id: string): Promise<Dashboard> {
    const dashboard = this.dashboards.get(id)
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${id}`)
    }

    await this.clearDefault()

    const updated: Dashboard = {
      ...dashboard,
      isDefault: true,
      updatedAt: Date.now()
    }

    this.dashboards.set(updated.id, updated)
    this.emit('dashboard-changed', updated)

    // TODO: Persist to profile storage
    return updated
  }

  /**
   * Add a widget to a dashboard.
   */
  async addWidget(request: AddWidgetRequest): Promise<DashboardWidget> {
    const dashboard = this.dashboards.get(request.dashboardId)
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${request.dashboardId}`)
    }

    const widgetId = crypto.randomUUID()

    const widget: DashboardWidget = {
      id: widgetId,
      type: request.type,
      tagRefs: request.tagRefs,
      config: request.config
    }

    const layout: WidgetLayout = {
      i: widgetId,
      ...DEFAULT_WIDGET_LAYOUT,
      ...request.layout
    }

    // Find next available position
    if (!request.layout?.x && !request.layout?.y) {
      layout.y = this.findNextRow(dashboard.layout)
    }

    dashboard.widgets.push(widget)
    dashboard.layout.push(layout)
    dashboard.updatedAt = Date.now()

    this.emit('widget-added', request.dashboardId, widget)

    // TODO: Persist to profile storage
    return widget
  }

  /**
   * Update a widget configuration.
   */
  async updateWidget(request: UpdateWidgetRequest): Promise<DashboardWidget> {
    const dashboard = this.dashboards.get(request.dashboardId)
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${request.dashboardId}`)
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === request.widgetId)
    if (widgetIndex === -1) {
      throw new Error(`Widget not found: ${request.widgetId}`)
    }

    const existing = dashboard.widgets[widgetIndex]
    const updated: DashboardWidget = {
      ...existing,
      tagRefs: request.tagRefs ?? existing.tagRefs,
      config: request.config ? { ...existing.config, ...request.config } : existing.config
    }

    dashboard.widgets[widgetIndex] = updated
    dashboard.updatedAt = Date.now()

    this.emit('widget-updated', request.dashboardId, updated)

    // TODO: Persist to profile storage
    return updated
  }

  /**
   * Remove a widget from a dashboard.
   */
  async removeWidget(dashboardId: string, widgetId: string): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard) {
      return false
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId)
    if (widgetIndex === -1) {
      return false
    }

    dashboard.widgets.splice(widgetIndex, 1)
    dashboard.layout = dashboard.layout.filter(l => l.i !== widgetId)
    dashboard.updatedAt = Date.now()

    this.emit('widget-removed', dashboardId, widgetId)

    // TODO: Persist to profile storage
    return true
  }

  /**
   * Update the layout of a dashboard.
   */
  async updateLayout(request: UpdateLayoutRequest): Promise<boolean> {
    const dashboard = this.dashboards.get(request.dashboardId)
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${request.dashboardId}`)
    }

    dashboard.layout = request.layout
    dashboard.updatedAt = Date.now()

    this.emit('layout-updated', request.dashboardId, request.layout)

    // TODO: Persist to profile storage
    return true
  }

  /**
   * Get the default dashboard.
   */
  getDefault(): Dashboard | null {
    for (const dashboard of this.dashboards.values()) {
      if (dashboard.isDefault) {
        return dashboard
      }
    }
    return null
  }

  /**
   * Clear the default flag from all dashboards.
   */
  private async clearDefault(): Promise<void> {
    for (const dashboard of this.dashboards.values()) {
      if (dashboard.isDefault) {
        dashboard.isDefault = false
        dashboard.updatedAt = Date.now()
      }
    }
  }

  /**
   * Find the next available row for widget placement.
   */
  private findNextRow(layout: WidgetLayout[]): number {
    if (layout.length === 0) return 0

    let maxY = 0
    for (const item of layout) {
      const bottom = item.y + item.h
      if (bottom > maxY) {
        maxY = bottom
      }
    }
    return maxY
  }

  // ---------------------------------------------------------------------------
  // Orphaned Widget Cleanup (T166)
  // ---------------------------------------------------------------------------

  /**
   * Handle tag deletion by removing or updating orphaned widgets (T166).
   * Called when a tag is deleted to clean up widgets referencing it.
   *
   * @param tagId - The ID of the deleted tag
   * @returns Summary of cleanup actions taken
   */
  async handleTagDeleted(tagId: string): Promise<{
    dashboardsAffected: number
    widgetsRemoved: number
    widgetsUpdated: number
  }> {
    let dashboardsAffected = 0
    let widgetsRemoved = 0
    let widgetsUpdated = 0

    for (const dashboard of this.dashboards.values()) {
      const widgetsToRemove: string[] = []
      const widgetsToUpdate: DashboardWidget[] = []

      for (const widget of dashboard.widgets) {
        if (widget.tagRefs.includes(tagId)) {
          if (widget.tagRefs.length === 1) {
            // Widget only has this tag - mark for removal
            widgetsToRemove.push(widget.id)
          } else {
            // Widget has multiple tags - remove the deleted tag
            widgetsToUpdate.push({
              ...widget,
              tagRefs: widget.tagRefs.filter(ref => ref !== tagId)
            })
          }
        }
      }

      if (widgetsToRemove.length > 0 || widgetsToUpdate.length > 0) {
        dashboardsAffected++

        // Remove orphaned widgets
        for (const widgetId of widgetsToRemove) {
          const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId)
          if (widgetIndex !== -1) {
            dashboard.widgets.splice(widgetIndex, 1)
            dashboard.layout = dashboard.layout.filter(l => l.i !== widgetId)
            widgetsRemoved++
          }
        }

        // Update widgets with remaining tags
        for (const updatedWidget of widgetsToUpdate) {
          const widgetIndex = dashboard.widgets.findIndex(w => w.id === updatedWidget.id)
          if (widgetIndex !== -1) {
            dashboard.widgets[widgetIndex] = updatedWidget
            widgetsUpdated++
            this.emit('widget-updated', dashboard.id, updatedWidget)
          }
        }

        dashboard.updatedAt = Date.now()

        if (widgetsToRemove.length > 0) {
          this.emit('orphaned-widgets-cleaned', dashboard.id, widgetsToRemove)
        }

        this.emit('dashboard-changed', dashboard)
      }
    }

    return {
      dashboardsAffected,
      widgetsRemoved,
      widgetsUpdated
    }
  }

  /**
   * Handle connection deletion by cleaning up widgets referencing tags from that connection (T166).
   * @param connectionId - The ID of the deleted connection
   * @param affectedTagIds - List of tag IDs that belonged to the connection
   */
  async handleConnectionDeleted(
    connectionId: string,
    affectedTagIds: string[]
  ): Promise<{
    dashboardsAffected: number
    widgetsRemoved: number
    widgetsUpdated: number
  }> {
    let totalDashboardsAffected = 0
    let totalWidgetsRemoved = 0
    let totalWidgetsUpdated = 0

    // Clean up widgets for each affected tag
    for (const tagId of affectedTagIds) {
      const result = await this.handleTagDeleted(tagId)
      if (result.dashboardsAffected > 0) {
        totalDashboardsAffected++ // Count unique dashboards
      }
      totalWidgetsRemoved += result.widgetsRemoved
      totalWidgetsUpdated += result.widgetsUpdated
    }

    return {
      dashboardsAffected: totalDashboardsAffected,
      widgetsRemoved: totalWidgetsRemoved,
      widgetsUpdated: totalWidgetsUpdated
    }
  }

  /**
   * Get widgets that reference a specific tag.
   * Useful for checking before tag deletion.
   */
  getWidgetsByTagRef(tagId: string): Array<{
    dashboardId: string
    dashboardName: string
    widget: DashboardWidget
  }> {
    const results: Array<{
      dashboardId: string
      dashboardName: string
      widget: DashboardWidget
    }> = []

    for (const dashboard of this.dashboards.values()) {
      for (const widget of dashboard.widgets) {
        if (widget.tagRefs.includes(tagId)) {
          results.push({
            dashboardId: dashboard.id,
            dashboardName: dashboard.name,
            widget
          })
        }
      }
    }

    return results
  }

  /**
   * Dispose and cleanup.
   */
  async dispose(): Promise<void> {
    this.dashboards.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let instance: DashboardService | null = null

export function getDashboardService(): DashboardService {
  if (!instance) {
    instance = new DashboardService()
  }
  return instance
}

export function disposeDashboardService(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
