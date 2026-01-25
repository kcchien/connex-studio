/**
 * Environment IPC Handlers
 *
 * Handles all environment-related IPC communication between Main and Renderer.
 * Implements: environment:list, environment:get, environment:create,
 *             environment:update, environment:delete, environment:set-default,
 *             environment:get-default, environment:resolve
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import {
  ENVIRONMENT_LIST,
  ENVIRONMENT_GET,
  ENVIRONMENT_CREATE,
  ENVIRONMENT_UPDATE,
  ENVIRONMENT_DELETE,
  ENVIRONMENT_SET_DEFAULT,
  ENVIRONMENT_GET_DEFAULT,
  ENVIRONMENT_RESOLVE
} from '@shared/constants/ipc-channels'
import { getEnvironmentManager } from '../services/EnvironmentManager'
import { resolveVariables, resolveObjectVariables } from '../services/VariableSubstitution'
import type { CreateEnvironmentRequest, UpdateEnvironmentRequest } from '@shared/types'

interface GetParams {
  id: string
}

interface DeleteParams {
  id: string
}

interface SetDefaultParams {
  id: string
}

interface ResolveParams {
  template: string
  customVariables?: Record<string, string>
}

interface ResolveObjectParams {
  obj: Record<string, unknown>
  customVariables?: Record<string, string>
}

/**
 * Register all environment IPC handlers.
 */
export function registerEnvironmentHandlers(): void {
  const manager = getEnvironmentManager()

  // environment:list
  ipcMain.handle(ENVIRONMENT_LIST, async () => {
    log.debug(`[IPC] ${ENVIRONMENT_LIST}`)
    const environments = manager.list()
    return { success: true, environments }
  })

  // environment:get
  ipcMain.handle(ENVIRONMENT_GET, async (_event, params: GetParams) => {
    log.debug(`[IPC] ${ENVIRONMENT_GET}`, params)

    const environment = manager.get(params.id)
    if (!environment) {
      return { success: false, error: `Environment not found: ${params.id}` }
    }
    return { success: true, environment }
  })

  // environment:create
  ipcMain.handle(ENVIRONMENT_CREATE, async (_event, params: CreateEnvironmentRequest) => {
    log.debug(`[IPC] ${ENVIRONMENT_CREATE}`, params)

    try {
      const environment = await manager.create(params)
      return { success: true, environment }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${ENVIRONMENT_CREATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // environment:update
  ipcMain.handle(ENVIRONMENT_UPDATE, async (_event, params: UpdateEnvironmentRequest) => {
    log.debug(`[IPC] ${ENVIRONMENT_UPDATE}`, params)

    try {
      const environment = await manager.update(params)
      return { success: true, environment }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${ENVIRONMENT_UPDATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // environment:delete
  ipcMain.handle(ENVIRONMENT_DELETE, async (_event, params: DeleteParams) => {
    log.debug(`[IPC] ${ENVIRONMENT_DELETE}`, params)

    try {
      const deleted = await manager.delete(params.id)
      return { success: deleted }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${ENVIRONMENT_DELETE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // environment:set-default
  ipcMain.handle(ENVIRONMENT_SET_DEFAULT, async (_event, params: SetDefaultParams) => {
    log.debug(`[IPC] ${ENVIRONMENT_SET_DEFAULT}`, params)

    try {
      const environment = await manager.setDefault(params.id)
      return { success: true, environment }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${ENVIRONMENT_SET_DEFAULT} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // environment:get-default
  ipcMain.handle(ENVIRONMENT_GET_DEFAULT, async () => {
    log.debug(`[IPC] ${ENVIRONMENT_GET_DEFAULT}`)

    const environment = manager.getDefault()
    return { success: true, environment }
  })

  // environment:resolve
  ipcMain.handle(
    ENVIRONMENT_RESOLVE,
    async (_event, params: ResolveParams | ResolveObjectParams) => {
      log.debug(`[IPC] ${ENVIRONMENT_RESOLVE}`, params)

      try {
        if ('template' in params) {
          // Resolve a single template string
          const result = resolveVariables(params.template, params.customVariables)
          return { success: true, result }
        } else if ('obj' in params) {
          // Resolve an object recursively
          const resolved = resolveObjectVariables(params.obj, params.customVariables)
          return { success: true, resolved }
        }
        return { success: false, error: 'Invalid resolve params' }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(`[IPC] ${ENVIRONMENT_RESOLVE} failed: ${message}`)
        return { success: false, error: message }
      }
    }
  )

  log.info('[IPC] Environment handlers registered')
}
