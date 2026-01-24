/**
 * Virtual Server IPC Handlers
 *
 * Handles IPC requests for virtual Modbus TCP server operations.
 * Channels:
 * - virtual-server:start - Start a virtual server
 * - virtual-server:stop - Stop a virtual server
 * - virtual-server:status - Get status of all virtual servers
 */

import { ipcMain } from 'electron'
import {
  VIRTUAL_SERVER_START,
  VIRTUAL_SERVER_STOP,
  VIRTUAL_SERVER_STATUS
} from '@shared/constants/ipc-channels'
import { getVirtualServerManager } from '../services/VirtualServer'
import { log } from '../services/LogService'
import type { Waveform } from '@shared/types/virtual-server'

/**
 * Register all virtual-server IPC handlers
 */
export function registerVirtualServerHandlers(): void {
  /**
   * virtual-server:start
   * Start a new virtual Modbus TCP server
   *
   * Request: {
   *   protocol: 'modbus-tcp'
   *   port: number
   *   registers: Array<{
   *     address: number
   *     length: number
   *     waveform: Waveform
   *   }>
   * }
   *
   * Response:
   *   { success: true, serverId: string }
   *   | { success: false, error: string, suggestedPort?: number }
   */
  ipcMain.handle(
    VIRTUAL_SERVER_START,
    async (
      _event,
      params: {
        protocol: 'modbus-tcp'
        port: number
        registers: Array<{
          address: number
          length: number
          waveform: Waveform
        }>
      }
    ) => {
      log.debug('virtual-server:start', { port: params.port, registerCount: params.registers.length })

      const manager = getVirtualServerManager()
      const result = await manager.start(params)

      if (result.success) {
        log.info(`Virtual server started: ${result.serverId} on port ${params.port}`)
      } else {
        log.warn(`Virtual server start failed: ${result.error}`)
      }

      return result
    }
  )

  /**
   * virtual-server:stop
   * Stop a running virtual server
   *
   * Request: { serverId: string }
   *
   * Response:
   *   { success: true }
   *   | { success: false, error: string }
   */
  ipcMain.handle(
    VIRTUAL_SERVER_STOP,
    async (_event, params: { serverId: string }) => {
      log.debug('virtual-server:stop', params)

      const manager = getVirtualServerManager()
      const result = await manager.stop(params.serverId)

      if (result.success) {
        log.info(`Virtual server stopped: ${params.serverId}`)
      } else {
        log.warn(`Virtual server stop failed: ${result.error}`)
      }

      return result
    }
  )

  /**
   * virtual-server:status
   * Get status of all virtual servers
   *
   * Request: {}
   *
   * Response: {
   *   servers: Array<{
   *     id: string
   *     protocol: string
   *     port: number
   *     status: 'stopped' | 'running' | 'error'
   *     clientCount: number
   *     lastError?: string
   *   }>
   * }
   */
  ipcMain.handle(VIRTUAL_SERVER_STATUS, async () => {
    log.debug('virtual-server:status')

    const manager = getVirtualServerManager()
    return manager.getStatus()
  })
}
