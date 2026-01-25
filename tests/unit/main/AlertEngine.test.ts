/**
 * AlertEngine Unit Tests
 *
 * Tests for alert rules, conditions, and triggers (T164, T165).
 */

import {
  AlertEngine,
  getAlertEngine,
  disposeAlertEngine
} from '../../../src/main/services/AlertEngine'
import type { AlertRule, AlertCondition } from '../../../src/shared/types'

// Mock dependencies
jest.mock('../../../src/main/services/AlertHistoryStore', () => ({
  getAlertHistoryStore: () => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn((event) => ({ ...event, id: Math.floor(Math.random() * 1000) })),
    query: jest.fn().mockReturnValue({ events: [], totalCount: 0, hasMore: false }),
    acknowledge: jest.fn().mockReturnValue(true),
    acknowledgeAll: jest.fn().mockReturnValue(0),
    getUnacknowledgedCounts: jest.fn().mockReturnValue({ info: 0, warning: 0, critical: 0 }),
    clearHistory: jest.fn().mockReturnValue(0)
  })
}))

jest.mock('../../../src/main/services/AlertSoundPlayer', () => ({
  getAlertSoundPlayer: () => ({
    play: jest.fn()
  })
}))

jest.mock('electron', () => ({
  Notification: jest.fn().mockImplementation(() => ({
    show: jest.fn()
  }))
}))

describe('AlertEngine', () => {
  let engine: AlertEngine

  beforeEach(async () => {
    disposeAlertEngine()
    engine = getAlertEngine()
    await engine.initialize()
  })

  afterEach(async () => {
    await engine.dispose()
  })

  describe('Rule CRUD Operations', () => {
    it('should create a new alert rule', async () => {
      const rule = await engine.createRule({
        name: 'High Temperature',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 100 },
        severity: 'warning'
      })

      expect(rule.id).toBeDefined()
      expect(rule.name).toBe('High Temperature')
      expect(rule.enabled).toBe(true)
    })

    it('should list all alert rules', async () => {
      await engine.createRule({
        name: 'Rule 1',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })
      await engine.createRule({
        name: 'Rule 2',
        tagRef: 'tag-2',
        condition: { operator: '<', value: 10 },
        severity: 'warning'
      })

      const rules = engine.listRules()
      expect(rules).toHaveLength(2)
    })

    it('should get rule by ID', async () => {
      const created = await engine.createRule({
        name: 'Test Rule',
        tagRef: 'tag-1',
        condition: { operator: '=', value: 0 },
        severity: 'critical'
      })

      const fetched = engine.getRule(created.id)
      expect(fetched?.name).toBe('Test Rule')
    })

    it('should update an alert rule', async () => {
      const rule = await engine.createRule({
        name: 'Original',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      const updated = await engine.updateRule({
        id: rule.id,
        name: 'Updated',
        condition: { operator: '>', value: 100 }
      })

      expect(updated.name).toBe('Updated')
      expect(updated.condition.value).toBe(100)
    })

    it('should delete an alert rule', async () => {
      const rule = await engine.createRule({
        name: 'ToDelete',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      const deleted = await engine.deleteRule(rule.id)
      expect(deleted).toBe(true)
      expect(engine.getRule(rule.id)).toBeNull()
    })
  })

  describe('Rule Enable/Disable', () => {
    it('should disable a rule', async () => {
      const rule = await engine.createRule({
        name: 'Test',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      const disabled = await engine.disableRule(rule.id)
      expect(disabled.enabled).toBe(false)
    })

    it('should enable a rule', async () => {
      const rule = await engine.createRule({
        name: 'Test',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      await engine.disableRule(rule.id)
      const enabled = await engine.enableRule(rule.id)
      expect(enabled.enabled).toBe(true)
    })
  })

  describe('Rule Mute/Unmute', () => {
    it('should mute a rule', async () => {
      const rule = await engine.createRule({
        name: 'Test',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      const result = engine.muteRule(rule.id)
      expect(result).toBe(true)
      expect(engine.isRuleMuted(rule.id)).toBe(true)
    })

    it('should unmute a rule', async () => {
      const rule = await engine.createRule({
        name: 'Test',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      engine.muteRule(rule.id)
      const result = engine.unmuteRule(rule.id)
      expect(result).toBe(true)
      expect(engine.isRuleMuted(rule.id)).toBe(false)
    })

    it('should list muted rules', async () => {
      const rule1 = await engine.createRule({
        name: 'Rule 1',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })
      const rule2 = await engine.createRule({
        name: 'Rule 2',
        tagRef: 'tag-2',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      engine.muteRule(rule1.id)
      engine.muteRule(rule2.id)

      const muted = engine.getMutedRules()
      expect(muted).toContain(rule1.id)
      expect(muted).toContain(rule2.id)
    })
  })

  describe('Condition Evaluation', () => {
    it('should trigger alert when value > threshold', async () => {
      const rule = await engine.createRule({
        name: 'High Value',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 60)

      expect(handler).toHaveBeenCalled()
    })

    it('should trigger alert when value < threshold', async () => {
      const rule = await engine.createRule({
        name: 'Low Value',
        tagRef: 'tag-1',
        condition: { operator: '<', value: 10 },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 5)

      expect(handler).toHaveBeenCalled()
    })

    it('should trigger alert when value = threshold', async () => {
      const rule = await engine.createRule({
        name: 'Exact Value',
        tagRef: 'tag-1',
        condition: { operator: '=', value: 100 },
        severity: 'info',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 100)

      expect(handler).toHaveBeenCalled()
    })

    it('should trigger alert when value != threshold', async () => {
      const rule = await engine.createRule({
        name: 'Not Equal',
        tagRef: 'tag-1',
        condition: { operator: '!=', value: 0 },
        severity: 'info',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 50)

      expect(handler).toHaveBeenCalled()
    })

    it('should trigger alert when value in range', async () => {
      const rule = await engine.createRule({
        name: 'In Range',
        tagRef: 'tag-1',
        condition: { operator: 'range', value: 20, value2: 80 },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 50)

      expect(handler).toHaveBeenCalled()
    })

    it('should not trigger alert when condition not met', async () => {
      const rule = await engine.createRule({
        name: 'High Value',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 100 },
        severity: 'warning'
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 50)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not trigger alert for disabled rule', async () => {
      const rule = await engine.createRule({
        name: 'Disabled',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'warning'
      })

      await engine.disableRule(rule.id)

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processTagValue('tag-1', 100)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Duration Condition', () => {
    it('should respect duration requirement', async () => {
      jest.useFakeTimers()

      const rule = await engine.createRule({
        name: 'With Duration',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50, duration: 1 }, // 1 second
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      // First value - starts timer
      engine.processTagValue('tag-1', 60)
      expect(handler).not.toHaveBeenCalled()

      // Advance time and process again
      jest.advanceTimersByTime(1500)
      engine.processTagValue('tag-1', 60)

      expect(handler).toHaveBeenCalled()

      jest.useRealTimers()
    })
  })

  describe('Cooldown', () => {
    it('should respect cooldown between alerts', async () => {
      jest.useFakeTimers()

      const rule = await engine.createRule({
        name: 'With Cooldown',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'warning',
        cooldown: 10 // 10 seconds
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      // First trigger
      engine.processTagValue('tag-1', 60)
      expect(handler).toHaveBeenCalledTimes(1)

      // Second trigger within cooldown - should not fire
      jest.advanceTimersByTime(5000)
      engine.processTagValue('tag-1', 70)
      expect(handler).toHaveBeenCalledTimes(1)

      // Third trigger after cooldown
      jest.advanceTimersByTime(10000)
      engine.processTagValue('tag-1', 80)
      expect(handler).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })
  })

  describe('Rate of Change (T165)', () => {
    it('should trigger alert on rate of change - absolute', async () => {
      const rule = await engine.createRule({
        name: 'ROC Alert',
        tagRef: 'tag-1',
        condition: {
          operator: 'roc',
          value: 20, // 20 units change threshold
          rocType: 'absolute',
          rocWindow: 60 // 60 second window
        },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      // Build up value history
      const now = Date.now()
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now - 30000) // 30 seconds ago
        .mockReturnValueOnce(now) // now

      engine.processTagValue('tag-1', 50) // First value
      engine.processTagValue('tag-1', 80) // Change of 30 units

      expect(handler).toHaveBeenCalled()
    })

    it('should trigger alert on rate of change - percentage', async () => {
      const rule = await engine.createRule({
        name: 'ROC Percent Alert',
        tagRef: 'tag-1',
        condition: {
          operator: 'roc',
          value: 50, // 50% change threshold
          rocType: 'percentage',
          rocWindow: 60
        },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      const now = Date.now()
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now - 30000)
        .mockReturnValueOnce(now)

      engine.processTagValue('tag-1', 100) // First value
      engine.processTagValue('tag-1', 200) // 100% change

      expect(handler).toHaveBeenCalled()
    })

    it('should not trigger ROC alert when change is below threshold', async () => {
      const rule = await engine.createRule({
        name: 'ROC Alert',
        tagRef: 'tag-1',
        condition: {
          operator: 'roc',
          value: 50, // 50 units threshold
          rocType: 'absolute',
          rocWindow: 60
        },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      const now = Date.now()
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now - 30000)
        .mockReturnValueOnce(now)

      engine.processTagValue('tag-1', 100)
      engine.processTagValue('tag-1', 110) // Only 10 units change

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not trigger ROC with insufficient history', async () => {
      const rule = await engine.createRule({
        name: 'ROC Alert',
        tagRef: 'tag-1',
        condition: {
          operator: 'roc',
          value: 10,
          rocType: 'absolute',
          rocWindow: 60
        },
        severity: 'warning',
        cooldown: 0
      })

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      // Only one value - not enough for ROC
      engine.processTagValue('tag-1', 100)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Connection Status Alerts (T164)', () => {
    it('should trigger disconnect alert when connection disconnects', async () => {
      const rule = await engine.createRule({
        name: 'Connection Lost',
        tagRef: 'conn-1', // Will be replaced by connectionId
        condition: { operator: 'disconnect', value: 0 },
        severity: 'critical',
        cooldown: 0
      })

      // Update rule with connection source
      await engine.updateRule({
        id: rule.id,
        tagRef: 'conn-1'
      })

      // Manually set source and connectionId for testing
      const updatedRule = engine.getRule(rule.id)
      if (updatedRule) {
        (updatedRule as any).source = 'connection'
        ;(updatedRule as any).connectionId = 'conn-1'
      }

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      // Process status change from connected to disconnected
      engine.processConnectionStatus('conn-1', 'connected')
      engine.processConnectionStatus('conn-1', 'disconnected')

      expect(handler).toHaveBeenCalled()
    })

    it('should trigger timeout alert on error status', async () => {
      const rule = await engine.createRule({
        name: 'Connection Timeout',
        tagRef: 'conn-1',
        condition: { operator: 'timeout', value: 0 },
        severity: 'warning',
        cooldown: 0
      })

      const updatedRule = engine.getRule(rule.id)
      if (updatedRule) {
        (updatedRule as any).source = 'connection'
        ;(updatedRule as any).connectionId = 'conn-1'
      }

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processConnectionStatus('conn-1', 'error')

      expect(handler).toHaveBeenCalled()
    })

    it('should not trigger disconnect alert when still connected', async () => {
      const rule = await engine.createRule({
        name: 'Connection Lost',
        tagRef: 'conn-1',
        condition: { operator: 'disconnect', value: 0 },
        severity: 'critical',
        cooldown: 0
      })

      const updatedRule = engine.getRule(rule.id)
      if (updatedRule) {
        (updatedRule as any).source = 'connection'
        ;(updatedRule as any).connectionId = 'conn-1'
      }

      const handler = jest.fn()
      engine.on('alert-triggered', handler)

      engine.processConnectionStatus('conn-1', 'connected')
      engine.processConnectionStatus('conn-1', 'connected')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Events', () => {
    it('should emit rule-changed on create', async () => {
      const handler = jest.fn()
      engine.on('rule-changed', handler)

      await engine.createRule({
        name: 'New Rule',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should emit rule-deleted on delete', async () => {
      const rule = await engine.createRule({
        name: 'ToDelete',
        tagRef: 'tag-1',
        condition: { operator: '>', value: 50 },
        severity: 'info'
      })

      const handler = jest.fn()
      engine.on('rule-deleted', handler)

      await engine.deleteRule(rule.id)

      expect(handler).toHaveBeenCalledWith(rule.id)
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getAlertEngine()
      const instance2 = getAlertEngine()
      expect(instance1).toBe(instance2)
    })
  })
})
