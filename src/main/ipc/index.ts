/**
 * IPC Handlers Index
 *
 * Registers all IPC handlers for Main process.
 * Call registerAllHandlers() during app startup.
 */

import { registerLogHandlers } from './log'

/**
 * Register all IPC handlers.
 * Call this once during app initialization.
 */
export function registerAllHandlers(): void {
  registerLogHandlers()

  // Future handlers will be registered here:
  // registerConnectionHandlers()
  // registerTagHandlers()
  // registerPollingHandlers()
  // registerDvrHandlers()
  // registerProfileHandlers()
  // registerExportHandlers()
  // registerVirtualServerHandlers()
  // registerAppHandlers()
}

export { registerLogHandlers } from './log'
