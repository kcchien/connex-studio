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
import { registerVirtualServerHandlers } from './virtual-server'
import { registerAppHandlers } from './app'
import { registerEnvironmentHandlers } from './environment'
import { registerCollectionHandlers } from './collection'
import { registerBridgeHandlers } from './bridge'
import { registerDashboardHandlers } from './dashboard'
import { registerAlertHandlers } from './alert'
import { registerOpcUaHandlers } from './opcua'
import { registerCalculatorHandlers } from './calculator'
import { registerWorkspaceHandlers } from './workspace'

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
  registerVirtualServerHandlers()
  registerAppHandlers()
  registerEnvironmentHandlers()
  registerCollectionHandlers()
  registerBridgeHandlers()
  registerDashboardHandlers()
  registerAlertHandlers()
  registerOpcUaHandlers()
  registerCalculatorHandlers()
  registerWorkspaceHandlers()
}

export { registerLogHandlers } from './log'
export { registerConnectionHandlers } from './connection'
export { registerTagHandlers } from './tag'
export { registerPollingHandlers } from './polling'
export { registerDvrHandlers } from './dvr'
export { registerProfileHandlers } from './profile'
export { registerExportHandlers } from './export'
export { registerVirtualServerHandlers } from './virtual-server'
export { registerAppHandlers } from './app'
export { handleWindowClose, setForceQuit, resetForceQuitFlag, stopAllPollingGracefully } from './app'
export { registerEnvironmentHandlers } from './environment'
export { registerCollectionHandlers } from './collection'
export { registerBridgeHandlers, setBridgeMainWindow } from './bridge'
export { registerDashboardHandlers } from './dashboard'
export { registerAlertHandlers, setAlertMainWindow } from './alert'
export { registerOpcUaHandlers, setOpcUaMainWindow } from './opcua'
export { registerCalculatorHandlers } from './calculator'
export { registerWorkspaceHandlers } from './workspace'
