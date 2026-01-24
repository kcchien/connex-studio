/**
 * Alert type definitions for threshold monitoring and notifications.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Core Alert Types
// -----------------------------------------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertOperator = '>' | '<' | '=' | '!=' | 'range' | 'roc'
export type AlertActionType = 'notification' | 'sound' | 'log'

export interface AlertRule {
  id: string
  name: string
  tagRef: string
  condition: AlertCondition
  severity: AlertSeverity
  actions: AlertActionType[]
  enabled: boolean
  cooldown: number
  createdAt: number
}

export interface AlertCondition {
  operator: AlertOperator
  value: number
  value2?: number
  duration?: number
}

// -----------------------------------------------------------------------------
// Alert Event Types (for history)
// -----------------------------------------------------------------------------

export interface AlertEvent {
  id: number
  ruleId: string
  timestamp: number
  tagRef: string
  triggerValue: number
  severity: AlertSeverity
  message: string
  acknowledged: boolean
  acknowledgedAt?: number
  acknowledgedBy?: string
}

// -----------------------------------------------------------------------------
// Alert Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateAlertRuleRequest {
  name: string
  tagRef: string
  condition: AlertCondition
  severity: AlertSeverity
  actions: AlertActionType[]
  cooldown?: number
}

export interface UpdateAlertRuleRequest {
  id: string
  name?: string
  tagRef?: string
  condition?: AlertCondition
  severity?: AlertSeverity
  actions?: AlertActionType[]
  cooldown?: number
}

export interface AlertEventQuery {
  severity?: AlertSeverity
  acknowledged?: boolean
  from?: number
  to?: number
  limit?: number
  offset?: number
}

export interface AlertEventPage {
  events: AlertEvent[]
  total: number
  hasMore: boolean
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_ALERT_COOLDOWN = 60 // seconds
export const DEFAULT_ALERT_ACTIONS: AlertActionType[] = ['notification', 'log']

// -----------------------------------------------------------------------------
// Severity Configuration
// -----------------------------------------------------------------------------

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: '#3b82f6',     // blue-500
  warning: '#f59e0b',  // amber-500
  critical: '#ef4444'  // red-500
}

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical'
}
