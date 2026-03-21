import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import { MODBUS_WRITE_SINGLE } from '@shared/constants/ipc-channels'
import { getConnectionManager } from '../services/ConnectionManager'
import type { ModbusAddress, DataType } from '@shared/types'

interface WriteParams {
  connectionId: string
  address: ModbusAddress
  dataType: DataType
  value: number | boolean | string
}

export function registerModbusWriteHandlers(): void {
  ipcMain.handle(MODBUS_WRITE_SINGLE, async (_event, params: WriteParams) => {
    log.debug(`[IPC] ${MODBUS_WRITE_SINGLE}`, params)
    try {
      // Validate writable register types
      if (params.address.registerType === 'input' || params.address.registerType === 'discrete') {
        return { success: false, error: `${params.address.registerType} registers are read-only` }
      }
      const manager = getConnectionManager()
      return await manager.writeOnce(params.connectionId, params.address, params.dataType, params.value)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${MODBUS_WRITE_SINGLE} failed: ${message}`)
      return { success: false, error: message }
    }
  })
}
