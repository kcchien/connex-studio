/**
 * Alert Engine Service
 *
 * Evaluates alert rules against tag values and triggers actions.
 */

import { EventEmitter } from 'events'
import { Notification } from 'electron'
import type {
  AlertRule,
  AlertEvent,
  AlertCondition,
  AlertSeverity,
  AlertActionType,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest
} from '@shared/types'
import { DEFAULT_ALERT_COOLDOWN, DEFAULT_ALERT_ACTIONS } from '@shared/types'

/**
 * Events emitted by AlertEngine.
 */
export interface AlertEngineEvents {
  'alert-triggered': (event: AlertEvent) => void
  'alert-acknowledged': (eventId: number) => void
  'rule-changed': (rule: AlertRule) => void
}

/**
 * Runtime state for alert condition tracking.
 */
interface ConditionState {
  conditionMetAt: number | null
  lastTriggeredAt: number | null
  currentValue: number | null
}

/**
 * Alert Engine evaluates rules and triggers notifications.
 */
export class AlertEngine extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map()
  private conditionStates: Map<string, ConditionState> = new Map()
  private nextEventId = 1

  constructor() {
    super()
  }

  /**
   * Initialize the engine, loading rules from storage.
   */
  async initialize(): Promise<void> {
    // TODO: Load rules from profile storage
  }

  /**
   * List all alert rules.
   */
  listRules(): AlertRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Get alert rule by ID.
   */
  getRule(id: string): AlertRule | null {
    return this.rules.get(id) ?? null
  }

  /**
   * Create a new alert rule.
   */
  async createRule(request: CreateAlertRuleRequest): Promise<AlertRule> {
    const rule: AlertRule = {
      id: crypto.randomUUID(),
      name: request.name,
      tagRef: request.tagRef,
      condition: request.condition,
      severity: request.severity,
      actions: request.actions ?? DEFAULT_ALERT_ACTIONS,
      enabled: true,
      cooldown: request.cooldown ?? DEFAULT_ALERT_COOLDOWN,
      createdAt: Date.now()
    }

    this.rules.set(rule.id, rule)
    this.conditionStates.set(rule.id, {
      conditionMetAt: null,
      lastTriggeredAt: null,
      currentValue: null
    })

    this.emit('rule-changed', rule)

    // TODO: Persist to profile storage
    return rule
  }

  /**
   * Update an existing alert rule.
   */
  async updateRule(request: UpdateAlertRuleRequest): Promise<AlertRule> {
    const existing = this.rules.get(request.id)
    if (!existing) {
      throw new Error(`Alert rule not found: ${request.id}`)
    }

    const updated: AlertRule = {
      ...existing,
      name: request.name ?? existing.name,
      tagRef: request.tagRef ?? existing.tagRef,
      condition: request.condition ?? existing.condition,
      severity: request.severity ?? existing.severity,
      actions: request.actions ?? existing.actions,
      cooldown: request.cooldown ?? existing.cooldown
    }

    this.rules.set(updated.id, updated)
    this.emit('rule-changed', updated)

    // Reset condition state on rule change
    this.conditionStates.set(updated.id, {
      conditionMetAt: null,
      lastTriggeredAt: null,
      currentValue: null
    })

    // TODO: Persist to profile storage
    return updated
  }

  /**
   * Delete an alert rule.
   */
  async deleteRule(id: string): Promise<boolean> {
    if (!this.rules.has(id)) {
      return false
    }

    this.rules.delete(id)
    this.conditionStates.delete(id)

    // TODO: Persist to profile storage
    return true
  }

  /**
   * Enable an alert rule.
   */
  async enableRule(id: string): Promise<AlertRule> {
    const rule = this.rules.get(id)
    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`)
    }

    rule.enabled = true
    this.emit('rule-changed', rule)

    // TODO: Persist to profile storage
    return rule
  }

  /**
   * Disable an alert rule.
   */
  async disableRule(id: string): Promise<AlertRule> {
    const rule = this.rules.get(id)
    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`)
    }

    rule.enabled = false
    this.conditionStates.set(id, {
      conditionMetAt: null,
      lastTriggeredAt: null,
      currentValue: null
    })

    this.emit('rule-changed', rule)

    // TODO: Persist to profile storage
    return rule
  }

  /**
   * Process a tag value update.
   * Called by PollingEngine when new data arrives.
   */
  processTagValue(tagId: string, value: number): void {
    const now = Date.now()

    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.tagRef !== tagId) {
        continue
      }

      const state = this.conditionStates.get(rule.id)
      if (!state) continue

      state.currentValue = value
      const conditionMet = this.evaluateCondition(rule.condition, value)

      if (conditionMet) {
        // Condition is met
        if (state.conditionMetAt === null) {
          state.conditionMetAt = now
        }

        // Check duration requirement
        const duration = rule.condition.duration ?? 0
        const heldFor = now - state.conditionMetAt

        if (heldFor >= duration * 1000) {
          // Check cooldown
          if (
            state.lastTriggeredAt === null ||
            now - state.lastTriggeredAt >= rule.cooldown * 1000
          ) {
            this.triggerAlert(rule, value, now)
            state.lastTriggeredAt = now
          }
        }
      } else {
        // Condition not met, reset timer
        state.conditionMetAt = null
      }
    }
  }

  /**
   * Evaluate an alert condition against a value.
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.value
      case '<':
        return value < condition.value
      case '=':
        return value === condition.value
      case '!=':
        return value !== condition.value
      case 'range':
        return value >= condition.value && value <= (condition.value2 ?? condition.value)
      case 'roc':
        // Rate of change - TODO: implement with historical values
        return false
      default:
        return false
    }
  }

  /**
   * Trigger an alert and execute actions.
   */
  private triggerAlert(rule: AlertRule, value: number, timestamp: number): void {
    const event: AlertEvent = {
      id: this.nextEventId++,
      ruleId: rule.id,
      timestamp,
      tagRef: rule.tagRef,
      triggerValue: value,
      severity: rule.severity,
      message: `${rule.name}: Value ${value} triggered ${rule.condition.operator} ${rule.condition.value}`,
      acknowledged: false
    }

    // Execute actions
    for (const action of rule.actions) {
      this.executeAction(action, event)
    }

    this.emit('alert-triggered', event)

    // TODO: Store event in AlertHistoryStore
  }

  /**
   * Execute an alert action.
   */
  private executeAction(action: AlertActionType, event: AlertEvent): void {
    switch (action) {
      case 'notification':
        this.showNotification(event)
        break
      case 'sound':
        // TODO: Play sound via AlertSoundPlayer
        break
      case 'log':
        // Already handled by event emission
        break
    }
  }

  /**
   * Show desktop notification.
   */
  private showNotification(event: AlertEvent): void {
    const notification = new Notification({
      title: `Alert: ${event.severity.toUpperCase()}`,
      body: event.message
    })
    notification.show()
  }

  /**
   * Dispose and cleanup.
   */
  async dispose(): Promise<void> {
    this.rules.clear()
    this.conditionStates.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let instance: AlertEngine | null = null

export function getAlertEngine(): AlertEngine {
  if (!instance) {
    instance = new AlertEngine()
  }
  return instance
}

export function disposeAlertEngine(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
