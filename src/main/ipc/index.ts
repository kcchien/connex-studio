/**
 * IPC Handlers Index
 *
 * Registers all IPC handlers for Main process.
 * Call registerAllHandlers() during app startup.
 */

import { registerLogHandlers } from './log'
import { registerConnectionHandlers } from './connection'
import { registerTagHandlers } from './tag'
import { registerPollingHandlers } from './polling'
import { registerDvrHandlers } from './dvr'
import { registerProfileHandlers } from './profile'
import { registerExportHandlers } from './export'

/**
 * Register all IPC handlers.
 * Call this once during app initialization.
 */
export function registerAllHandlers(): void {
  registerLogHandlers()
  registerConnectionHandlers()
  registerTagHandlers()
  registerPollingHandlers()
  registerDvrHandlers()
  registerProfileHandlers()
  registerExportHandlers()

  // Future handlers will be registered here:
  // registerVirtualServerHandlers()
}

export { registerLogHandlers } from './log'
export { registerConnectionHandlers } from './connection'
export { registerTagHandlers } from './tag'
export { registerPollingHandlers } from './polling'
export { registerDvrHandlers } from './dvr'
export { registerProfileHandlers } from './profile'
export { registerExportHandlers } from './export'
