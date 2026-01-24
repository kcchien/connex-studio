/**
 * Alert IPC Handlers
 *
 * Handles alert rule CRUD, event queries, acknowledgement, and real-time streaming.
 */

import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log/main.js'
import { getAlertEngine } from '../services/AlertEngine'
import { getAlertSoundPlayer } from '../services/AlertSoundPlayer'
import type {
  AlertRule,
  AlertEvent,
  AlertEventPage,
  AlertEventQuery,
  AlertSeverity,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest
} from '@shared/types'

/**
 * IPC Channel names for alert operations.
 */
export const ALERT_CHANNELS = {
  // Rule CRUD
  LIST_RULES: 'alert:list-rules',
  GET_RULE: 'alert:get-rule',
  CREATE_RULE: 'alert:create-rule',
  UPDATE_RULE: 'alert:update-rule',
  DELETE_RULE: 'alert:delete-rule',
  ENABLE_RULE: 'alert:enable-rule',
  DISABLE_RULE: 'alert:disable-rule',
  MUTE_RULE: 'alert:mute-rule',
  UNMUTE_RULE: 'alert:unmute-rule',
  GET_MUTED_RULES: 'alert:get-muted-rules',

  // Events
  QUERY_EVENTS: 'alert:query-events',
  ACKNOWLEDGE: 'alert:acknowledge',
  ACKNOWLEDGE_ALL: 'alert:acknowledge-all',
  GET_UNACKNOWLEDGED_COUNTS: 'alert:get-unacknowledged-counts',
  CLEAR_HISTORY: 'alert:clear-history',

  // Sound
  TEST_SOUND: 'alert:test-sound',
  SET_SOUND_ENABLED: 'alert:set-sound-enabled',
  GET_SOUND_ENABLED: 'alert:get-sound-enabled',

  // Real-time events (send to renderer)
  EVENT_TRIGGERED: 'alert:event-triggered',
  EVENT_ACKNOWLEDGED: 'alert:event-acknowledged'
} as const

// Store main window reference for sending events
let mainWindow: BrowserWindow | null = null

/**
 * Set the main window for sending alert events.
 */
export function setAlertMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

/**
 * Register all alert IPC handlers.
 */
export function registerAlertHandlers(): void {
  const engine = getAlertEngine()
  const soundPlayer = getAlertSoundPlayer()

  // ---------------------------------------------------------------------------
  // Rule CRUD
  // ---------------------------------------------------------------------------

  ipcMain.handle(ALERT_CHANNELS.LIST_RULES, async (): Promise<AlertRule[]> => {
    try {
      return engine.listRules()
    } catch (error) {
      log.error('[alert:list-rules] Error:', error)
      throw error
    }
  })

  ipcMain.handle(
    ALERT_CHANNELS.GET_RULE,
    async (_, id: string): Promise<AlertRule | null> => {
      try {
        return engine.getRule(id)
      } catch (error) {
        log.error(`[alert:get-rule] Error for ${id}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.CREATE_RULE,
    async (_, request: CreateAlertRuleRequest): Promise<AlertRule> => {
      try {
        const rule = await engine.createRule(request)
        log.info(`[alert:create-rule] Created: ${rule.name}`)
        return rule
      } catch (error) {
        log.error('[alert:create-rule] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.UPDATE_RULE,
    async (_, request: UpdateAlertRuleRequest): Promise<AlertRule> => {
      try {
        const rule = await engine.updateRule(request)
        log.info(`[alert:update-rule] Updated: ${rule.name}`)
        return rule
      } catch (error) {
        log.error('[alert:update-rule] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.DELETE_RULE,
    async (_, id: string): Promise<boolean> => {
      try {
        const success = await engine.deleteRule(id)
        if (success) {
          log.info(`[alert:delete-rule] Deleted: ${id}`)
        }
        return success
      } catch (error) {
        log.error(`[alert:delete-rule] Error for ${id}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.ENABLE_RULE,
    async (_, id: string): Promise<AlertRule> => {
      try {
        const rule = await engine.enableRule(id)
        log.info(`[alert:enable-rule] Enabled: ${rule.name}`)
        return rule
      } catch (error) {
        log.error(`[alert:enable-rule] Error for ${id}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.DISABLE_RULE,
    async (_, id: string): Promise<AlertRule> => {
      try {
        const rule = await engine.disableRule(id)
        log.info(`[alert:disable-rule] Disabled: ${rule.name}`)
        return rule
      } catch (error) {
        log.error(`[alert:disable-rule] Error for ${id}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.MUTE_RULE,
    async (_, id: string): Promise<boolean> => {
      try {
        const success = engine.muteRule(id)
        if (success) {
          log.info(`[alert:mute-rule] Muted: ${id}`)
        }
        return success
      } catch (error) {
        log.error(`[alert:mute-rule] Error for ${id}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.UNMUTE_RULE,
    async (_, id: string): Promise<boolean> => {
      try {
        const success = engine.unmuteRule(id)
        if (success) {
          log.info(`[alert:unmute-rule] Unmuted: ${id}`)
        }
        return success
      } catch (error) {
        log.error(`[alert:unmute-rule] Error for ${id}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.GET_MUTED_RULES,
    async (): Promise<string[]> => {
      try {
        return engine.getMutedRules()
      } catch (error) {
        log.error('[alert:get-muted-rules] Error:', error)
        throw error
      }
    }
  )

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  ipcMain.handle(
    ALERT_CHANNELS.QUERY_EVENTS,
    async (_, query: AlertEventQuery): Promise<AlertEventPage> => {
      try {
        return engine.queryEvents(query)
      } catch (error) {
        log.error('[alert:query-events] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.ACKNOWLEDGE,
    async (
      _,
      { eventId, acknowledgedBy }: { eventId: number; acknowledgedBy?: string }
    ): Promise<boolean> => {
      try {
        const success = engine.acknowledgeEvent(eventId, acknowledgedBy)
        if (success) {
          log.debug(`[alert:acknowledge] Acknowledged: ${eventId}`)
        }
        return success
      } catch (error) {
        log.error(`[alert:acknowledge] Error for ${eventId}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.ACKNOWLEDGE_ALL,
    async (_, severity?: AlertSeverity): Promise<number> => {
      try {
        const count = engine.acknowledgeAll(severity)
        log.info(
          `[alert:acknowledge-all] Acknowledged ${count} events${severity ? ` (${severity})` : ''}`
        )
        return count
      } catch (error) {
        log.error('[alert:acknowledge-all] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.GET_UNACKNOWLEDGED_COUNTS,
    async (): Promise<Record<AlertSeverity, number>> => {
      try {
        return engine.getUnacknowledgedCounts()
      } catch (error) {
        log.error('[alert:get-unacknowledged-counts] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.CLEAR_HISTORY,
    async (_, before?: number): Promise<number> => {
      try {
        const count = engine.clearHistory(before)
        log.info(`[alert:clear-history] Cleared ${count} events`)
        return count
      } catch (error) {
        log.error('[alert:clear-history] Error:', error)
        throw error
      }
    }
  )

  // ---------------------------------------------------------------------------
  // Sound
  // ---------------------------------------------------------------------------

  ipcMain.handle(
    ALERT_CHANNELS.TEST_SOUND,
    async (_, severity: AlertSeverity): Promise<void> => {
      try {
        soundPlayer.test(severity)
      } catch (error) {
        log.error('[alert:test-sound] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.SET_SOUND_ENABLED,
    async (_, enabled: boolean): Promise<void> => {
      try {
        if (enabled) {
          soundPlayer.enable()
        } else {
          soundPlayer.disable()
        }
        log.info(`[alert:set-sound-enabled] Sound ${enabled ? 'enabled' : 'disabled'}`)
      } catch (error) {
        log.error('[alert:set-sound-enabled] Error:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    ALERT_CHANNELS.GET_SOUND_ENABLED,
    async (): Promise<boolean> => {
      try {
        return soundPlayer.isEnabled()
      } catch (error) {
        log.error('[alert:get-sound-enabled] Error:', error)
        throw error
      }
    }
  )

  // ---------------------------------------------------------------------------
  // Real-time Event Streaming
  // ---------------------------------------------------------------------------

  // Listen for alert triggered events and forward to renderer
  engine.on('alert-triggered', (event: AlertEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(ALERT_CHANNELS.EVENT_TRIGGERED, event)
    }
  })

  // Listen for acknowledgement events and forward to renderer
  engine.on('alert-acknowledged', (eventId: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(ALERT_CHANNELS.EVENT_ACKNOWLEDGED, eventId)
    }
  })

  log.info('[IPC] Alert handlers registered')
}

/**
 * Unregister all alert IPC handlers.
 */
export function unregisterAlertHandlers(): void {
  Object.values(ALERT_CHANNELS).forEach((channel) => {
    // Only remove handlers, not the event channels
    if (!channel.includes('event-')) {
      ipcMain.removeHandler(channel)
    }
  })
  log.info('[IPC] Alert handlers unregistered')
}
