/**
 * App Lifecycle IPC Handlers
 *
 * Handles app-level operations like close confirmation, force quit,
 * and state checking.
 */

import { ipcMain, app, BrowserWindow, dialog } from 'electron'
import log from 'electron-log/main.js'
import { getConnectionManager } from '../services/ConnectionManager'
import { getPollingEngine } from '../services/PollingEngine'

// IPC Channel constants
const APP_CHECK_UNSAVED = 'app:check-unsaved'
const APP_FORCE_QUIT = 'app:force-quit'
const APP_CONFIRM_CLOSE = 'app:confirm-close'

// Track if we should force quit (skip confirmation)
let shouldForceQuit = false

/**
 * Check if there are unsaved changes or active polling sessions.
 */
export function checkUnsavedState(): { hasUnsavedChanges: boolean; pollingActive: boolean } {
  const manager = getConnectionManager()
  const pollingEngine = getPollingEngine()

  // Check for active polling sessions
  const connections = manager.getAllConnections()
  const pollingActive = connections.some((conn) => pollingEngine.isPolling(conn.id))

  // For now, we consider "unsaved changes" as having active polling
  // In the future, this could track profile changes, etc.
  const hasUnsavedChanges = pollingActive

  return { hasUnsavedChanges, pollingActive }
}

/**
 * Stop all active polling sessions gracefully.
 */
export async function stopAllPollingGracefully(): Promise<void> {
  const pollingEngine = getPollingEngine()
  pollingEngine.stopAll()
  log.info('[App] All polling sessions stopped gracefully')
}

/**
 * Show close confirmation dialog.
 * Returns true if user wants to quit, false otherwise.
 */
export async function showCloseConfirmation(mainWindow: BrowserWindow): Promise<boolean> {
  const { hasUnsavedChanges, pollingActive } = checkUnsavedState()

  if (!hasUnsavedChanges && !pollingActive) {
    return true // No confirmation needed
  }

  let message = 'Are you sure you want to quit?'
  if (pollingActive) {
    message = 'Polling is currently active. Are you sure you want to quit?\n\nActive polling sessions will be stopped.'
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Quit', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Confirm Exit',
    message: message
  })

  return result.response === 0 // 0 = Quit button
}

/**
 * Handle window close event with confirmation.
 */
export function handleWindowClose(
  event: Electron.Event,
  mainWindow: BrowserWindow
): void {
  if (shouldForceQuit) {
    // User already confirmed, let it close
    return
  }

  // Prevent immediate close
  event.preventDefault()

  // Check state and show confirmation if needed
  showCloseConfirmation(mainWindow).then(async (shouldClose) => {
    if (shouldClose) {
      // Stop polling gracefully before closing
      await stopAllPollingGracefully()
      shouldForceQuit = true
      mainWindow.close()
    }
  })
}

/**
 * Reset force quit flag (for reuse).
 */
export function resetForceQuitFlag(): void {
  shouldForceQuit = false
}

/**
 * Set force quit flag directly.
 */
export function setForceQuit(value: boolean): void {
  shouldForceQuit = value
}

/**
 * Register app lifecycle IPC handlers.
 */
export function registerAppHandlers(): void {
  // Check for unsaved changes
  ipcMain.handle(APP_CHECK_UNSAVED, async () => {
    return checkUnsavedState()
  })

  // Force quit (user confirmed discard)
  ipcMain.on(APP_FORCE_QUIT, async () => {
    log.info('[App] Force quit requested')
    await stopAllPollingGracefully()
    shouldForceQuit = true
    app.quit()
  })

  // Confirm close from renderer (for menu-triggered close)
  ipcMain.handle(APP_CONFIRM_CLOSE, async () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) {
      return { confirmed: false }
    }

    const confirmed = await showCloseConfirmation(mainWindow)
    if (confirmed) {
      await stopAllPollingGracefully()
      shouldForceQuit = true
      mainWindow.close()
    }

    return { confirmed }
  })

  log.info('[IPC] App lifecycle handlers registered')
}
