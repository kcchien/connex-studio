/**
 * Tag IPC Handler Integration Tests
 *
 * Tests the tag:* IPC channel handlers including validation
 * of Modbus addresses, CSV import parsing, and tag CRUD lifecycle.
 */

import { invokeHandler, resetHandlerRegistry, hasHandler } from './setup'

// ---------------------------------------------------------------------------
// Mock ConnectionManager
// ---------------------------------------------------------------------------

let tagIdCounter = 0

const createdTags: Record<string, unknown> = {}

const mockCreateTag = jest.fn((connectionId, name, address, dataType, options) => {
  tagIdCounter++
  const tag = {
    id: `tag-${tagIdCounter}`,
    connectionId,
    name,
    address,
    dataType,
    displayFormat: options?.displayFormat ?? { decimals: 2, unit: '' },
    thresholds: options?.thresholds ?? {},
    enabled: true
  }
  createdTags[tag.id] = tag
  return tag
})

const mockUpdateTag = jest.fn((tagId, updates) => {
  const existing = createdTags[tagId]
  if (!existing) throw new Error(`Tag not found: ${tagId}`)
  const updated = { ...existing, ...updates }
  createdTags[tagId] = updated
  return updated
})

const mockDeleteTag = jest.fn((tagId) => {
  if (!createdTags[tagId]) throw new Error(`Tag not found: ${tagId}`)
  delete createdTags[tagId]
})

const mockGetTags = jest.fn((connectionId) => {
  return Object.values(createdTags).filter(
    (t: any) => t.connectionId === connectionId
  )
})

jest.mock('@main/services/ConnectionManager', () => ({
  getConnectionManager: () => ({
    createTag: mockCreateTag,
    updateTag: mockUpdateTag,
    deleteTag: mockDeleteTag,
    getTags: mockGetTags,
    // connection existence check — createTag calls this.connections.has internally
    // but since we mock createTag directly, we don't need it here
    getConnection: jest.fn(() => ({ id: 'conn-1', name: 'Test' }))
  })
}))

// ---------------------------------------------------------------------------
// Import handler registration (after mocks)
// ---------------------------------------------------------------------------

import { registerTagHandlers } from '@main/ipc/tag'
import {
  TAG_CREATE,
  TAG_UPDATE,
  TAG_DELETE,
  TAG_LIST,
  TAG_IMPORT_CSV
} from '@shared/constants/ipc-channels'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Tag IPC Handlers', () => {
  beforeEach(() => {
    resetHandlerRegistry()
    jest.clearAllMocks()
    tagIdCounter = 0
    // Clear created tags
    for (const key of Object.keys(createdTags)) {
      delete createdTags[key]
    }
    registerTagHandlers()
  })

  // -------------------------------------------------------------------------
  // Handler registration
  // -------------------------------------------------------------------------

  it('registers all tag channels', () => {
    expect(hasHandler(TAG_CREATE)).toBe(true)
    expect(hasHandler(TAG_UPDATE)).toBe(true)
    expect(hasHandler(TAG_DELETE)).toBe(true)
    expect(hasHandler(TAG_LIST)).toBe(true)
    expect(hasHandler(TAG_IMPORT_CSV)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // tag:create — valid Modbus address
  // -------------------------------------------------------------------------

  describe('tag:create', () => {
    it('creates tag with valid Modbus address', async () => {
      const result = await invokeHandler<{ success: boolean; tag?: any }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Temperature',
          address: {
            type: 'modbus',
            registerType: 'holding',
            address: 100,
            length: 1
          },
          dataType: 'uint16'
        }
      )

      expect(result.success).toBe(true)
      expect(result.tag).toBeDefined()
      expect(result.tag.name).toBe('Temperature')
      expect(result.tag.address.address).toBe(100)
      expect(mockCreateTag).toHaveBeenCalledTimes(1)
    })

    it('rejects tag with empty name', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: '',
          address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
          dataType: 'uint16'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tag name is required')
      expect(mockCreateTag).not.toHaveBeenCalled()
    })

    it('rejects tag with name longer than 100 characters', async () => {
      const longName = 'A'.repeat(101)
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: longName,
          address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
          dataType: 'uint16'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('100 characters')
      expect(mockCreateTag).not.toHaveBeenCalled()
    })

    it('rejects Modbus address out of range (negative)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Bad Address',
          address: { type: 'modbus', registerType: 'holding', address: -1, length: 1 },
          dataType: 'uint16'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Address must be between 0 and 65535')
    })

    it('rejects Modbus address out of range (>65535)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Overflow Address',
          address: { type: 'modbus', registerType: 'holding', address: 70000, length: 1 },
          dataType: 'uint16'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Address must be between 0 and 65535')
    })

    it('rejects holding register length > 125', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Too Long',
          address: { type: 'modbus', registerType: 'holding', address: 0, length: 126 },
          dataType: 'uint16'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Length must be between 1 and 125')
    })

    it('accepts coil length up to 2000', async () => {
      const result = await invokeHandler<{ success: boolean; tag?: any }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Many Coils',
          address: { type: 'modbus', registerType: 'coil', address: 0, length: 2000 },
          dataType: 'boolean'
        }
      )

      expect(result.success).toBe(true)
    })

    it('rejects coil length > 2000', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Too Many Coils',
          address: { type: 'modbus', registerType: 'coil', address: 0, length: 2001 },
          dataType: 'boolean'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Length must be between 1 and 2000')
    })

    it('rejects invalid byteOrder', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Bad ByteOrder',
          address: {
            type: 'modbus',
            registerType: 'holding',
            address: 0,
            length: 2,
            byteOrder: 'WXYZ'
          },
          dataType: 'float32'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid byteOrder')
    })

    it('rejects scale value of zero', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_CREATE,
        {
          connectionId: 'conn-1',
          name: 'Zero Scale',
          address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
          dataType: 'uint16',
          displayFormat: { decimals: 2, unit: '', scale: 0 }
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Scale cannot be zero')
    })

    it('creates tag with valid MQTT address (no Modbus validation)', async () => {
      const result = await invokeHandler<{ success: boolean; tag?: any }>(
        TAG_CREATE,
        {
          connectionId: 'conn-2',
          name: 'MQTT Temp',
          address: { type: 'mqtt', topic: 'sensors/temperature' },
          dataType: 'float32'
        }
      )

      expect(result.success).toBe(true)
      expect(result.tag.address.type).toBe('mqtt')
    })
  })

  // -------------------------------------------------------------------------
  // tag:update
  // -------------------------------------------------------------------------

  describe('tag:update', () => {
    it('updates tag name', async () => {
      // First create a tag
      await invokeHandler(TAG_CREATE, {
        connectionId: 'conn-1',
        name: 'Original',
        address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
        dataType: 'uint16'
      })

      const result = await invokeHandler<{ success: boolean; tag?: any }>(
        TAG_UPDATE,
        { tagId: 'tag-1', updates: { name: 'Renamed Tag' } }
      )

      expect(result.success).toBe(true)
      expect(mockUpdateTag).toHaveBeenCalledWith('tag-1', { name: 'Renamed Tag' })
    })

    it('rejects update with empty name', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_UPDATE,
        { tagId: 'tag-1', updates: { name: '' } }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tag name is required')
    })

    it('validates Modbus address in update', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_UPDATE,
        {
          tagId: 'tag-1',
          updates: {
            address: { type: 'modbus', registerType: 'holding', address: 99999, length: 1 }
          }
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Address must be between 0 and 65535')
    })

    it('returns error for non-existent tag', async () => {
      mockUpdateTag.mockImplementation(() => {
        throw new Error('Tag not found: tag-nonexistent')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_UPDATE,
        { tagId: 'tag-nonexistent', updates: { name: 'Whatever' } }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tag not found')
    })
  })

  // -------------------------------------------------------------------------
  // tag:delete
  // -------------------------------------------------------------------------

  describe('tag:delete', () => {
    it('deletes existing tag', async () => {
      // Create a tag first so the mock has it
      await invokeHandler(TAG_CREATE, {
        connectionId: 'conn-1',
        name: 'Doomed',
        address: { type: 'modbus', registerType: 'holding', address: 0, length: 1 },
        dataType: 'uint16'
      })

      const result = await invokeHandler<{ success: boolean }>(
        TAG_DELETE,
        { tagId: 'tag-1' }
      )

      expect(result.success).toBe(true)
      expect(mockDeleteTag).toHaveBeenCalledWith('tag-1')
    })

    it('returns error for non-existent tag', async () => {
      mockDeleteTag.mockImplementation(() => {
        throw new Error('Tag not found: tag-ghost')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_DELETE,
        { tagId: 'tag-ghost' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tag not found')
    })
  })

  // -------------------------------------------------------------------------
  // tag:list
  // -------------------------------------------------------------------------

  describe('tag:list', () => {
    it('returns tags for a connection', async () => {
      mockGetTags.mockReturnValue([
        { id: 'tag-a', connectionId: 'conn-1', name: 'Tag A' },
        { id: 'tag-b', connectionId: 'conn-1', name: 'Tag B' }
      ])

      const result = await invokeHandler<{ tags: unknown[] }>(
        TAG_LIST,
        { connectionId: 'conn-1' }
      )

      expect(result.tags).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // tag:import-csv — valid and malformed
  // -------------------------------------------------------------------------

  describe('tag:import-csv', () => {
    it('imports valid CSV with all required columns', async () => {
      const csv = [
        'name,registerType,address,length,dataType,unit',
        'Pressure,holding,100,1,uint16,PSI',
        'Flow,input,200,2,float32,L/min'
      ].join('\n')

      const result = await invokeHandler<{
        success: boolean
        imported?: number
        errors?: string[]
      }>(TAG_IMPORT_CSV, { connectionId: 'conn-1', csvContent: csv })

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(mockCreateTag).toHaveBeenCalledTimes(2)
    })

    it('reports error for row with missing name', async () => {
      const csv = [
        'name,registerType,address',
        ',holding,100',
        'ValidTag,holding,200'
      ].join('\n')

      const result = await invokeHandler<{
        success: boolean
        imported?: number
        errors?: string[]
      }>(TAG_IMPORT_CSV, { connectionId: 'conn-1', csvContent: csv })

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0]).toContain('Row 2')
      expect(result.errors![0]).toContain('Missing name')
    })

    it('reports error for row with invalid address (NaN)', async () => {
      const csv = [
        'name,registerType,address',
        'BadAddr,holding,abc'
      ].join('\n')

      const result = await invokeHandler<{
        success: boolean
        imported?: number
        errors?: string[]
      }>(TAG_IMPORT_CSV, { connectionId: 'conn-1', csvContent: csv })

      expect(result.success).toBe(true)
      expect(result.imported).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0]).toContain('Invalid address')
    })

    it('returns error for empty CSV', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_IMPORT_CSV,
        { connectionId: 'conn-1', csvContent: '' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('returns error for CSV missing required columns', async () => {
      const csv = [
        'name,unit',
        'Temp,°C'
      ].join('\n')

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        TAG_IMPORT_CSV,
        { connectionId: 'conn-1', csvContent: csv }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required column')
    })

    it('handles CSV with quoted values', async () => {
      const csv = [
        'name,registerType,address',
        '"Tag, with comma",holding,300'
      ].join('\n')

      const result = await invokeHandler<{
        success: boolean
        imported?: number
        errors?: string[]
      }>(TAG_IMPORT_CSV, { connectionId: 'conn-1', csvContent: csv })

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      // Verify the name was parsed with the comma
      expect(mockCreateTag).toHaveBeenCalledWith(
        'conn-1',
        'Tag, with comma',
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('parses threshold columns in CSV', async () => {
      const csv = [
        'name,registerType,address,warningHigh,warningLow,alarmHigh,alarmLow',
        'SensorA,holding,100,80,20,90,10'
      ].join('\n')

      const result = await invokeHandler<{
        success: boolean
        imported?: number
      }>(TAG_IMPORT_CSV, { connectionId: 'conn-1', csvContent: csv })

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      // The threshold values should be passed to createTag
      expect(mockCreateTag).toHaveBeenCalledWith(
        'conn-1',
        'SensorA',
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          thresholds: {
            warningHigh: 80,
            warningLow: 20,
            alarmHigh: 90,
            alarmLow: 10
          }
        })
      )
    })
  })
})
