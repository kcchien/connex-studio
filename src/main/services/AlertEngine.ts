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
  AlertEventPage,
  ConnectionAlertSource,
  ConnectionStatus
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

/** Maximum history length for rate-of-change calculations */
const ROC_HISTORY_MAX_LENGTH = 100
/** Default rate-of-change window in seconds */
const DEFAULT_ROC_WINDOW = 60

/**
 * Runtime state for alert condition tracking.
 */
interface ConditionState {
  conditionMetAt: number | null
  lastTriggeredAt: number | null
  currentValue: number | null
  /** Historical values for rate-of-change calculation */
  valueHistory: Array<{ timestamp: number; value: number }>
  /** Last known connection status for connection alerts */
  lastConnectionStatus?: ConnectionStatus
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
      currentValue: null,
      valueHistory: []
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
      currentValue: null,
      valueHistory: []
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
      currentValue: null,
      valueHistory: []
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
      // Skip connection alerts and rules for other tags
      if (!rule.enabled || rule.tagRef !== tagId || rule.source === 'connection') {
        continue
      }

      const state = this.conditionStates.get(rule.id)
      if (!state) continue

      // Add to value history for rate-of-change calculation
      state.valueHistory.push({ timestamp: now, value })
      // Trim history to max length
      if (state.valueHistory.length > ROC_HISTORY_MAX_LENGTH) {
        state.valueHistory = state.valueHistory.slice(-ROC_HISTORY_MAX_LENGTH)
      }

      state.currentValue = value
      const conditionMet = this.evaluateCondition(rule.condition, value, state)

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
   * Process a connection status change (T164).
   * Called when connection status changes.
   */
  processConnectionStatus(connectionId: string, status: ConnectionStatus): void {
    const now = Date.now()

    for (const rule of this.rules.values()) {
      // Only process connection-type alerts for this connection
      if (
        !rule.enabled ||
        rule.source !== 'connection' ||
        rule.connectionId !== connectionId
      ) {
        continue
      }

      const state = this.conditionStates.get(rule.id)
      if (!state) continue

      const previousStatus = state.lastConnectionStatus
      state.lastConnectionStatus = status

      // Check for disconnect alert
      if (rule.condition.operator === 'disconnect') {
        // Trigger when status changes from connected to disconnected or error
        if (
          previousStatus === 'connected' &&
          (status === 'disconnected' || status === 'error')
        ) {
          // Check cooldown
          if (
            state.lastTriggeredAt === null ||
            now - state.lastTriggeredAt >= rule.cooldown * 1000
          ) {
            this.triggerConnectionAlert(rule, status, now)
            state.lastTriggeredAt = now
          }
        }
      }

      // Check for timeout alert
      if (rule.condition.operator === 'timeout') {
        // Trigger when status becomes error (often indicates timeout)
        if (status === 'error') {
          // Check cooldown
          if (
            state.lastTriggeredAt === null ||
            now - state.lastTriggeredAt >= rule.cooldown * 1000
          ) {
            this.triggerConnectionAlert(rule, status, now)
            state.lastTriggeredAt = now
          }
        }
      }
    }
  }

  /**
   * Trigger a connection status alert.
   */
  private triggerConnectionAlert(
    rule: AlertRule,
    status: ConnectionStatus,
    timestamp: number
  ): void {
    const isMuted = this.mutedRules.has(rule.id)

    const eventData: Omit<AlertEvent, 'id'> = {
      ruleId: rule.id,
      timestamp,
      tagRef: rule.connectionId ?? rule.tagRef,
      triggerValue: 0, // No numeric value for connection status
      severity: rule.severity,
      message: `${rule.name}: Connection ${rule.condition.operator} (status: ${status})`,
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
   * Evaluate an alert condition against a value (T165 - includes rate-of-change).
   */
  private evaluateCondition(
    condition: AlertCondition,
    value: number,
    state?: ConditionState
  ): boolean {
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
        return this.evaluateRateOfChange(condition, value, state)
      case 'disconnect':
      case 'timeout':
        // Connection alerts are handled separately in processConnectionStatus
        return false
      default:
        return false
    }
  }

  /**
   * Evaluate rate-of-change condition (T165).
   * Calculates the change over the specified time window.
   */
  private evaluateRateOfChange(
    condition: AlertCondition,
    currentValue: number,
    state?: ConditionState
  ): boolean {
    if (!state || state.valueHistory.length < 2) {
      // Not enough data for rate-of-change calculation
      return false
    }

    const now = Date.now()
    const windowMs = (condition.rocWindow ?? DEFAULT_ROC_WINDOW) * 1000
    const windowStart = now - windowMs

    // Find the earliest value within the time window
    let earliestInWindow: { timestamp: number; value: number } | null = null
    for (const entry of state.valueHistory) {
      if (entry.timestamp >= windowStart) {
        if (!earliestInWindow || entry.timestamp < earliestInWindow.timestamp) {
          earliestInWindow = entry
        }
      }
    }

    if (!earliestInWindow) {
      // No values within the time window
      return false
    }

    // Calculate rate of change
    let rateOfChange: number
    if (condition.rocType === 'percentage') {
      // Calculate percentage change
      if (earliestInWindow.value === 0) {
        // Avoid division by zero
        rateOfChange = currentValue === 0 ? 0 : 100
      } else {
        rateOfChange = Math.abs(
          ((currentValue - earliestInWindow.value) / earliestInWindow.value) * 100
        )
      }
    } else {
      // Absolute change (default)
      rateOfChange = Math.abs(currentValue - earliestInWindow.value)
    }

    // Compare against threshold
    // condition.value is the rate-of-change threshold
    return rateOfChange >= condition.value
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
