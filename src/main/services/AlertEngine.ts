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
  UpdateAlertRuleRequest,
  AlertEventQuery,
  AlertEventPage
} from '@shared/types'
import { DEFAULT_ALERT_COOLDOWN, DEFAULT_ALERT_ACTIONS } from '@shared/types'
import { getAlertHistoryStore } from './AlertHistoryStore'
import { getAlertSoundPlayer } from './AlertSoundPlayer'

/**
 * Events emitted by AlertEngine.
 */
export interface AlertEngineEvents {
  'alert-triggered': (event: AlertEvent) => void
  'alert-acknowledged': (eventId: number) => void
  'rule-changed': (rule: AlertRule) => void
  'rule-deleted': (ruleId: string) => void
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
  private mutedRules: Set<string> = new Set()
  private initialized = false

  constructor() {
    super()
  }

  /**
   * Initialize the engine, loading rules from storage.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Initialize history store
    const historyStore = getAlertHistoryStore()
    await historyStore.initialize()

    this.initialized = true
  }

  /**
   * Check if engine is initialized.
   */
  isInitialized(): boolean {
    return this.initialized
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
    this.mutedRules.delete(id)

    this.emit('rule-deleted', id)

    // TODO: Persist to profile storage
    return true
  }

  /**
   * Mute an alert rule (suppress notifications but continue logging).
   */
  muteRule(id: string): boolean {
    if (!this.rules.has(id)) {
      return false
    }
    this.mutedRules.add(id)
    return true
  }

  /**
   * Unmute an alert rule.
   */
  unmuteRule(id: string): boolean {
    return this.mutedRules.delete(id)
  }

  /**
   * Check if a rule is muted.
   */
  isRuleMuted(id: string): boolean {
    return this.mutedRules.has(id)
  }

  /**
   * Get all muted rule IDs.
   */
  getMutedRules(): string[] {
    return Array.from(this.mutedRules)
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
    const isMuted = this.mutedRules.has(rule.id)

    // Build message with operator info
    let conditionStr = `${rule.condition.operator} ${rule.condition.value}`
    if (rule.condition.operator === 'range' && rule.condition.value2 !== undefined) {
      conditionStr = `between ${rule.condition.value} and ${rule.condition.value2}`
    }

    const eventData: Omit<AlertEvent, 'id'> = {
      ruleId: rule.id,
      timestamp,
      tagRef: rule.tagRef,
      triggerValue: value,
      severity: rule.severity,
      message: `${rule.name}: Value ${value} triggered (${conditionStr})`,
      acknowledged: false
    }

    // Store in history and get assigned ID
    const historyStore = getAlertHistoryStore()
    const event = historyStore.insert(eventData)

    // Execute actions (skip notification/sound if muted)
    for (const action of rule.actions) {
      if (isMuted && (action === 'notification' || action === 'sound')) {
        continue
      }
      this.executeAction(action, event)
    }

    this.emit('alert-triggered', event)
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
        this.playSound(event.severity)
        break
      case 'log':
        // Already handled by event emission and history store
        break
    }
  }

  /**
   * Play alert sound based on severity.
   */
  private playSound(severity: AlertSeverity): void {
    const soundPlayer = getAlertSoundPlayer()
    soundPlayer.play(severity)
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

  // ---------------------------------------------------------------------------
  // History and Acknowledgement
  // ---------------------------------------------------------------------------

  /**
   * Query alert events from history.
   */
  queryEvents(query: AlertEventQuery): AlertEventPage {
    const historyStore = getAlertHistoryStore()
    return historyStore.query(query)
  }

  /**
   * Acknowledge an alert event.
   */
  acknowledgeEvent(eventId: number, acknowledgedBy?: string): boolean {
    const historyStore = getAlertHistoryStore()
    const success = historyStore.acknowledge(eventId, acknowledgedBy)
    if (success) {
      this.emit('alert-acknowledged', eventId)
    }
    return success
  }

  /**
   * Acknowledge all unacknowledged alerts.
   */
  acknowledgeAll(severity?: AlertSeverity): number {
    const historyStore = getAlertHistoryStore()
    return historyStore.acknowledgeAll(severity)
  }

  /**
   * Get count of unacknowledged alerts by severity.
   */
  getUnacknowledgedCounts(): Record<AlertSeverity, number> {
    const historyStore = getAlertHistoryStore()
    return historyStore.getUnacknowledgedCounts()
  }

  /**
   * Clear alert history.
   */
  clearHistory(before?: number): number {
    const historyStore = getAlertHistoryStore()
    return historyStore.clearHistory(before)
  }

  /**
   * Dispose and cleanup.
   */
  async dispose(): Promise<void> {
    this.rules.clear()
    this.conditionStates.clear()
    this.mutedRules.clear()
    this.removeAllListeners()
    this.initialized = false
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
