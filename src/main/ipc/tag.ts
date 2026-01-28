/**
 * Tag IPC Handlers
 *
 * Handles all tag-related IPC communication between Main and Renderer.
 * Implements: tag:create, tag:update, tag:delete, tag:list, tag:import-csv
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import {
  TAG_CREATE,
  TAG_UPDATE,
  TAG_DELETE,
  TAG_LIST,
  TAG_IMPORT_CSV
} from '@shared/constants/ipc-channels'
import { getConnectionManager } from '../services/ConnectionManager'
import type {
  Tag,
  ModbusAddress,
  MqttAddress,
  OpcUaAddress,
  DataType,
  DisplayFormat,
  Thresholds
} from '@shared/types'

interface CreateTagParams {
  connectionId: string
  name: string
  address: ModbusAddress | MqttAddress | OpcUaAddress
  dataType: DataType
  displayFormat?: DisplayFormat
  thresholds?: Thresholds
}

interface UpdateTagParams {
  tagId: string
  updates: Partial<Omit<Tag, 'id' | 'connectionId'>>
}

interface DeleteTagParams {
  tagId: string
}

interface ListTagsParams {
  connectionId: string
}

interface ImportCsvParams {
  connectionId: string
  csvContent: string
}

/**
 * Parse a CSV line, handling quoted values.
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

/**
 * Parse register type from string.
 */
function parseRegisterType(
  value: string
): 'holding' | 'input' | 'coil' | 'discrete' {
  const normalized = value.toLowerCase().trim()
  switch (normalized) {
    case 'holding':
    case 'hr':
      return 'holding'
    case 'input':
    case 'ir':
      return 'input'
    case 'coil':
    case 'c':
      return 'coil'
    case 'discrete':
    case 'di':
      return 'discrete'
    default:
      return 'holding'
  }
}

/**
 * Parse data type from string.
 */
function parseDataType(value: string): DataType {
  const normalized = value.toLowerCase().trim()
  switch (normalized) {
    case 'int16':
      return 'int16'
    case 'uint16':
      return 'uint16'
    case 'int32':
      return 'int32'
    case 'uint32':
      return 'uint32'
    case 'float32':
    case 'float':
      return 'float32'
    case 'boolean':
    case 'bool':
      return 'boolean'
    case 'string':
      return 'string'
    default:
      return 'uint16'
  }
}

/**
 * Validate tag name.
 */
function validateTagName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Tag name is required'
  }
  if (name.length > 100) {
    return 'Tag name must be 100 characters or less'
  }
  return null
}

/**
 * Validate display format scale value.
 */
function validateScale(scale: number | undefined): string | null {
  if (scale === undefined) {
    return null  // Optional, defaults to 1
  }
  if (typeof scale !== 'number' || !isFinite(scale)) {
    return 'Scale must be a finite number'
  }
  if (scale === 0) {
    return 'Scale cannot be zero'
  }
  return null
}

/**
 * Valid byte order values (SSOT: see @shared/types/modbus.ts)
 */
const VALID_BYTE_ORDERS = ['ABCD', 'DCBA', 'BADC', 'CDAB'] as const

/**
 * Validate Modbus address.
 */
function validateModbusAddress(address: ModbusAddress): string | null {
  if (address.address < 0 || address.address > 65535) {
    return 'Address must be between 0 and 65535'
  }

  if (address.registerType === 'coil' || address.registerType === 'discrete') {
    if (address.length < 1 || address.length > 2000) {
      return 'Length must be between 1 and 2000 for coils/discrete inputs'
    }
  } else {
    if (address.length < 1 || address.length > 125) {
      return 'Length must be between 1 and 125 for holding/input registers'
    }
  }

  // Validate byteOrder if provided (must be valid enum value)
  if (address.byteOrder !== undefined) {
    if (!VALID_BYTE_ORDERS.includes(address.byteOrder as typeof VALID_BYTE_ORDERS[number])) {
      return `Invalid byteOrder "${address.byteOrder}". Must be one of: ${VALID_BYTE_ORDERS.join(', ')}`
    }
  }

  return null
}

/**
 * Register all tag IPC handlers.
 */
export function registerTagHandlers(): void {
  const manager = getConnectionManager()

  // tag:create
  ipcMain.handle(TAG_CREATE, async (_event, params: CreateTagParams) => {
    log.debug(`[IPC] ${TAG_CREATE}`, params)

    try {
      // Validate tag name
      const nameError = validateTagName(params.name)
      if (nameError) {
        return { success: false, error: nameError }
      }

      // Validate address based on type
      if (params.address.type === 'modbus') {
        const addressError = validateModbusAddress(params.address as ModbusAddress)
        if (addressError) {
          return { success: false, error: addressError }
        }
      }

      // Validate scale if provided
      if (params.displayFormat?.scale !== undefined) {
        const scaleError = validateScale(params.displayFormat.scale)
        if (scaleError) {
          return { success: false, error: scaleError }
        }
      }

      const tag = manager.createTag(
        params.connectionId,
        params.name,
        params.address,
        params.dataType,
        {
          displayFormat: params.displayFormat,
          thresholds: params.thresholds
        }
      )

      return { success: true, tag }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${TAG_CREATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // tag:update
  ipcMain.handle(TAG_UPDATE, async (_event, params: UpdateTagParams) => {
    log.debug(`[IPC] ${TAG_UPDATE}`, params)

    try {
      // Validate name if provided
      if (params.updates.name !== undefined) {
        const nameError = validateTagName(params.updates.name)
        if (nameError) {
          return { success: false, error: nameError }
        }
      }

      // Validate address if provided
      if (params.updates.address?.type === 'modbus') {
        const addressError = validateModbusAddress(params.updates.address as ModbusAddress)
        if (addressError) {
          return { success: false, error: addressError }
        }
      }

      // Validate scale if provided
      if (params.updates.displayFormat?.scale !== undefined) {
        const scaleError = validateScale(params.updates.displayFormat.scale)
        if (scaleError) {
          return { success: false, error: scaleError }
        }
      }

      const tag = manager.updateTag(params.tagId, params.updates)
      return { success: true, tag }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${TAG_UPDATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // tag:delete
  ipcMain.handle(TAG_DELETE, async (_event, params: DeleteTagParams) => {
    log.debug(`[IPC] ${TAG_DELETE}`, params)

    try {
      manager.deleteTag(params.tagId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${TAG_DELETE} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  // tag:list
  ipcMain.handle(TAG_LIST, async (_event, params: ListTagsParams) => {
    log.debug(`[IPC] ${TAG_LIST}`, params)

    const tags = manager.getTags(params.connectionId)
    return { tags }
  })

  // tag:import-csv
  ipcMain.handle(TAG_IMPORT_CSV, async (_event, params: ImportCsvParams) => {
    log.debug(`[IPC] ${TAG_IMPORT_CSV}`, { connectionId: params.connectionId })

    try {
      const lines = params.csvContent.split(/\r?\n/).filter((line) => line.trim())

      if (lines.length === 0) {
        return { success: false, error: 'CSV file is empty' }
      }

      // Parse header
      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
      const requiredColumns = ['name', 'registertype', 'address']

      // Check required columns
      for (const col of requiredColumns) {
        if (!header.includes(col)) {
          return { success: false, error: `Missing required column: ${col}` }
        }
      }

      // Get column indices
      const nameIdx = header.indexOf('name')
      const registerTypeIdx = header.indexOf('registertype')
      const addressIdx = header.indexOf('address')
      const lengthIdx = header.indexOf('length')
      const dataTypeIdx = header.indexOf('datatype')
      const unitIdx = header.indexOf('unit')
      const warningHighIdx = header.indexOf('warninghigh')
      const warningLowIdx = header.indexOf('warninglow')
      const alarmHighIdx = header.indexOf('alarmhigh')
      const alarmLowIdx = header.indexOf('alarmlow')

      const imported: Tag[] = []
      const errors: string[] = []

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])

        try {
          const name = values[nameIdx]?.trim()
          if (!name) {
            errors.push(`Row ${i + 1}: Missing name`)
            continue
          }

          const registerType = parseRegisterType(values[registerTypeIdx] || 'holding')
          const address = parseInt(values[addressIdx], 10)
          if (isNaN(address)) {
            errors.push(`Row ${i + 1}: Invalid address`)
            continue
          }

          const length = lengthIdx >= 0 ? parseInt(values[lengthIdx], 10) || 1 : 1
          const dataType =
            dataTypeIdx >= 0 ? parseDataType(values[dataTypeIdx] || 'uint16') : 'uint16'

          const modbusAddress: ModbusAddress = {
            type: 'modbus',
            registerType,
            address,
            length
          }

          const displayFormat: DisplayFormat = {
            decimals: 2,
            unit: unitIdx >= 0 ? values[unitIdx]?.trim() || '' : ''
          }

          const thresholds: Thresholds = {}
          if (warningHighIdx >= 0 && values[warningHighIdx]) {
            const val = parseFloat(values[warningHighIdx])
            if (!isNaN(val)) thresholds.warningHigh = val
          }
          if (warningLowIdx >= 0 && values[warningLowIdx]) {
            const val = parseFloat(values[warningLowIdx])
            if (!isNaN(val)) thresholds.warningLow = val
          }
          if (alarmHighIdx >= 0 && values[alarmHighIdx]) {
            const val = parseFloat(values[alarmHighIdx])
            if (!isNaN(val)) thresholds.alarmHigh = val
          }
          if (alarmLowIdx >= 0 && values[alarmLowIdx]) {
            const val = parseFloat(values[alarmLowIdx])
            if (!isNaN(val)) thresholds.alarmLow = val
          }

          const tag = manager.createTag(
            params.connectionId,
            name,
            modbusAddress,
            dataType,
            { displayFormat, thresholds }
          )

          imported.push(tag)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`Row ${i + 1}: ${message}`)
        }
      }

      log.info(`[IPC] ${TAG_IMPORT_CSV} imported ${imported.length} tags, ${errors.length} errors`)
      return { success: true, imported: imported.length, errors }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${TAG_IMPORT_CSV} failed: ${message}`)
      return { success: false, error: message }
    }
  })

  log.info('[IPC] Tag handlers registered')
}
