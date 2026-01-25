/**
 * DashboardService Unit Tests
 *
 * Tests for dashboard CRUD operations and orphaned widget cleanup (T166).
 */

import {
  DashboardService,
  getDashboardService,
  disposeDashboardService
} from '../../../src/main/services/DashboardService'
import type { Dashboard, DashboardWidget, WidgetLayout } from '../../../src/shared/types'

describe('DashboardService', () => {
  let service: DashboardService

  beforeEach(() => {
    disposeDashboardService()
    service = getDashboardService()
  })

  afterEach(async () => {
    await service.dispose()
  })

  describe('Dashboard CRUD Operations', () => {
    it('should create a new dashboard', async () => {
      const dashboard = await service.create({
        name: 'My Dashboard'
      })

      expect(dashboard.id).toBeDefined()
      expect(dashboard.name).toBe('My Dashboard')
      expect(dashboard.layout).toEqual([])
      expect(dashboard.widgets).toEqual([])
    })

    it('should list all dashboards', async () => {
      await service.create({ name: 'Dashboard 1' })
      await service.create({ name: 'Dashboard 2' })

      const list = service.list()
      expect(list).toHaveLength(2)
    })

    it('should get dashboard by ID', async () => {
      const created = await service.create({ name: 'Test Dashboard' })
      const fetched = service.get(created.id)

      expect(fetched?.name).toBe('Test Dashboard')
    })

    it('should update a dashboard', async () => {
      const dashboard = await service.create({ name: 'Original' })
      const updated = await service.update({
        id: dashboard.id,
        name: 'Updated'
      })

      expect(updated.name).toBe('Updated')
    })

    it('should delete a dashboard', async () => {
      const dashboard = await service.create({ name: 'ToDelete' })
      const deleted = await service.delete(dashboard.id)

      expect(deleted).toBe(true)
      expect(service.get(dashboard.id)).toBeNull()
    })

    it('should throw error when updating non-existent dashboard', async () => {
      await expect(service.update({ id: 'non-existent' })).rejects.toThrow(
        'Dashboard not found'
      )
    })
  })

  describe('Default Dashboard', () => {
    it('should set dashboard as default', async () => {
      const dashboard = await service.create({ name: 'Default' })
      await service.setDefault(dashboard.id)

      const defaultDash = service.getDefault()
      expect(defaultDash?.id).toBe(dashboard.id)
      expect(defaultDash?.isDefault).toBe(true)
    })

    it('should clear previous default when setting new default', async () => {
      const dash1 = await service.create({ name: 'First', isDefault: true })
      const dash2 = await service.create({ name: 'Second' })

      await service.setDefault(dash2.id)

      const updated1 = service.get(dash1.id)
      const updated2 = service.get(dash2.id)

      expect(updated1?.isDefault).toBe(false)
      expect(updated2?.isDefault).toBe(true)
    })
  })

  describe('Widget Operations', () => {
    it('should add a widget to dashboard', async () => {
      const dashboard = await service.create({ name: 'With Widgets' })

      const widget = await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      expect(widget.id).toBeDefined()
      expect(widget.type).toBe('gauge')
      expect(widget.tagRefs).toContain('tag-1')

      const updated = service.get(dashboard.id)
      expect(updated?.widgets).toHaveLength(1)
      expect(updated?.layout).toHaveLength(1)
    })

    it('should update widget configuration', async () => {
      const dashboard = await service.create({ name: 'Test' })
      const widget = await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1'],
        config: { min: 0, max: 100 }
      })

      const updated = await service.updateWidget({
        dashboardId: dashboard.id,
        widgetId: widget.id,
        config: { min: 0, max: 200 }
      })

      expect(updated.config.max).toBe(200)
    })

    it('should remove widget from dashboard', async () => {
      const dashboard = await service.create({ name: 'Test' })
      const widget = await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      const removed = await service.removeWidget(dashboard.id, widget.id)
      expect(removed).toBe(true)

      const updated = service.get(dashboard.id)
      expect(updated?.widgets).toHaveLength(0)
      expect(updated?.layout).toHaveLength(0)
    })

    it('should throw error when adding widget to non-existent dashboard', async () => {
      await expect(
        service.addWidget({
          dashboardId: 'non-existent',
          type: 'gauge',
          tagRefs: ['tag-1']
        })
      ).rejects.toThrow('Dashboard not found')
    })
  })

  describe('Layout Operations', () => {
    it('should update dashboard layout', async () => {
      const dashboard = await service.create({ name: 'Test' })
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      const newLayout: WidgetLayout[] = [
        { i: dashboard.widgets?.[0]?.id || '', x: 0, y: 0, w: 4, h: 3 }
      ]

      await service.updateLayout({
        dashboardId: dashboard.id,
        layout: newLayout
      })

      const updated = service.get(dashboard.id)
      expect(updated?.layout[0].w).toBe(4)
      expect(updated?.layout[0].h).toBe(3)
    })
  })

  describe('Orphaned Widget Cleanup (T166)', () => {
    it('should remove widget when its only tag is deleted', async () => {
      const dashboard = await service.create({ name: 'Test' })
      const widget = await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1'] // Only one tag
      })

      const result = await service.handleTagDeleted('tag-1')

      expect(result.dashboardsAffected).toBe(1)
      expect(result.widgetsRemoved).toBe(1)
      expect(result.widgetsUpdated).toBe(0)

      const updated = service.get(dashboard.id)
      expect(updated?.widgets).toHaveLength(0)
    })

    it('should update widget when it has multiple tags and one is deleted', async () => {
      const dashboard = await service.create({ name: 'Test' })
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'chart',
        tagRefs: ['tag-1', 'tag-2', 'tag-3'] // Multiple tags
      })

      const result = await service.handleTagDeleted('tag-2')

      expect(result.dashboardsAffected).toBe(1)
      expect(result.widgetsRemoved).toBe(0)
      expect(result.widgetsUpdated).toBe(1)

      const updated = service.get(dashboard.id)
      expect(updated?.widgets[0].tagRefs).toEqual(['tag-1', 'tag-3'])
    })

    it('should not affect widgets that do not reference deleted tag', async () => {
      const dashboard = await service.create({ name: 'Test' })
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      const result = await service.handleTagDeleted('tag-other')

      expect(result.dashboardsAffected).toBe(0)
      expect(result.widgetsRemoved).toBe(0)
      expect(result.widgetsUpdated).toBe(0)

      const updated = service.get(dashboard.id)
      expect(updated?.widgets).toHaveLength(1)
    })

    it('should clean up widgets across multiple dashboards', async () => {
      const dash1 = await service.create({ name: 'Dashboard 1' })
      const dash2 = await service.create({ name: 'Dashboard 2' })

      await service.addWidget({
        dashboardId: dash1.id,
        type: 'gauge',
        tagRefs: ['shared-tag']
      })
      await service.addWidget({
        dashboardId: dash2.id,
        type: 'led',
        tagRefs: ['shared-tag']
      })

      const result = await service.handleTagDeleted('shared-tag')

      expect(result.widgetsRemoved).toBe(2)
    })

    it('should handle connection deletion cleanup', async () => {
      const dashboard = await service.create({ name: 'Test' })
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['conn1-tag1']
      })
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['conn1-tag2']
      })

      const result = await service.handleConnectionDeleted('conn-1', [
        'conn1-tag1',
        'conn1-tag2'
      ])

      expect(result.widgetsRemoved).toBe(2)
    })

    it('should emit orphaned-widgets-cleaned event', async () => {
      const dashboard = await service.create({ name: 'Test' })
      const widget = await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      const handler = jest.fn()
      service.on('orphaned-widgets-cleaned', handler)

      await service.handleTagDeleted('tag-1')

      expect(handler).toHaveBeenCalledWith(dashboard.id, [widget.id])
    })

    it('should get widgets by tag reference', async () => {
      const dash1 = await service.create({ name: 'Dashboard 1' })
      const dash2 = await service.create({ name: 'Dashboard 2' })

      const widget1 = await service.addWidget({
        dashboardId: dash1.id,
        type: 'gauge',
        tagRefs: ['shared-tag', 'other-tag']
      })
      const widget2 = await service.addWidget({
        dashboardId: dash2.id,
        type: 'led',
        tagRefs: ['shared-tag']
      })
      await service.addWidget({
        dashboardId: dash2.id,
        type: 'chart',
        tagRefs: ['different-tag']
      })

      const results = service.getWidgetsByTagRef('shared-tag')

      expect(results).toHaveLength(2)
      expect(results.find(r => r.widget.id === widget1.id)).toBeDefined()
      expect(results.find(r => r.widget.id === widget2.id)).toBeDefined()
    })
  })

  describe('Events', () => {
    it('should emit dashboard-changed on create', async () => {
      const handler = jest.fn()
      service.on('dashboard-changed', handler)

      await service.create({ name: 'New' })

      expect(handler).toHaveBeenCalled()
    })

    it('should emit widget-added on add widget', async () => {
      const dashboard = await service.create({ name: 'Test' })

      const handler = jest.fn()
      service.on('widget-added', handler)

      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should emit widget-removed on remove widget', async () => {
      const dashboard = await service.create({ name: 'Test' })
      const widget = await service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        tagRefs: ['tag-1']
      })

      const handler = jest.fn()
      service.on('widget-removed', handler)

      await service.removeWidget(dashboard.id, widget.id)

      expect(handler).toHaveBeenCalledWith(dashboard.id, widget.id)
    })

    it('should emit layout-updated on update layout', async () => {
      const dashboard = await service.create({ name: 'Test' })

      const handler = jest.fn()
      service.on('layout-updated', handler)

      await service.updateLayout({
        dashboardId: dashboard.id,
        layout: []
      })

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getDashboardService()
      const instance2 = getDashboardService()
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after dispose', () => {
      const instance1 = getDashboardService()
      disposeDashboardService()
      const instance2 = getDashboardService()
      expect(instance1).not.toBe(instance2)
    })
  })
})
