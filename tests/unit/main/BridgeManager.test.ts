/**
 * BridgeManager Unit Tests
 *
 * Tests for bridge CRUD operations, forwarding, buffering, and auto-resume.
 */

import {
  BridgeManager,
  getBridgeManager,
  disposeBridgeManager
} from '../../../src/main/services/BridgeManager'
import type { Bridge, BridgeStatus, CreateBridgeRequest, Tag } from '../../../src/shared/types'

// Mock ConnectionManager
const mockAdapter = {
  isConnected: jest.fn().mockReturnValue(true),
  readTags: jest.fn().mockResolvedValue([
    { value: 42, quality: 'good', timestamp: Date.now() }
  ]),
  publish: jest.fn().mockResolvedValue(undefined)
}

const mockConnectionManager = {
  getAdapter: jest.fn().mockReturnValue(mockAdapter),
  getConnection: jest.fn().mockReturnValue({ status: 'connected' }),
  getTag: jest.fn().mockImplementation((id: string) => ({
    id,
    name: `Tag-${id}`,
    connectionId: 'conn-1',
    address: { register: 0 },
    dataType: 'int16',
    pollRate: 1000
  }))
}

describe('BridgeManager', () => {
  let manager: BridgeManager

  beforeEach(() => {
    disposeBridgeManager()
    manager = getBridgeManager()
    manager.setDependencies(mockConnectionManager as any)
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await manager.dispose()
  })

  describe('CRUD Operations', () => {
    it('should create a new bridge', async () => {
      const request: CreateBridgeRequest = {
        name: 'Test Bridge',
        sourceConnectionId: 'modbus-1',
        sourceTags: ['tag-1', 'tag-2'],
        targetConnectionId: 'mqtt-1',
        targetConfig: {
          topicTemplate: 'data/{{tagName}}',
          payloadTemplate: '{"value": {{value}}}',
          qos: 1,
          retain: false
        }
      }

      const bridge = await manager.create(request)

      expect(bridge.id).toBeDefined()
      expect(bridge.name).toBe('Test Bridge')
      expect(bridge.sourceConnectionId).toBe('modbus-1')
      expect(bridge.sourceTags).toEqual(['tag-1', 'tag-2'])
      expect(bridge.targetConnectionId).toBe('mqtt-1')
      expect(bridge.status).toBe('idle')
    })

    it('should list all bridges', async () => {
      await manager.create({
        name: 'Bridge 1',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })
      await manager.create({
        name: 'Bridge 2',
        sourceConnectionId: 'src-2',
        sourceTags: ['tag-2'],
        targetConnectionId: 'tgt-2',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const list = manager.list()
      expect(list).toHaveLength(2)
    })

    it('should get bridge by ID', async () => {
      const created = await manager.create({
        name: 'Test Bridge',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const fetched = manager.get(created.id)
      expect(fetched?.name).toBe('Test Bridge')
    })

    it('should return null for non-existent bridge', () => {
      const result = manager.get('non-existent-id')
      expect(result).toBeNull()
    })

    it('should update a bridge', async () => {
      const bridge = await manager.create({
        name: 'Original',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const updated = await manager.update({
        id: bridge.id,
        name: 'Updated',
        sourceTags: ['tag-1', 'tag-2', 'tag-3']
      })

      expect(updated.name).toBe('Updated')
      expect(updated.sourceTags).toEqual(['tag-1', 'tag-2', 'tag-3'])
    })

    it('should throw error when updating non-existent bridge', async () => {
      await expect(manager.update({ id: 'non-existent' })).rejects.toThrow(
        'Bridge not found'
      )
    })

    it('should throw error when updating active bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)

      await expect(
        manager.update({ id: bridge.id, name: 'New Name' })
      ).rejects.toThrow('Cannot update bridge while active')

      await manager.stop(bridge.id)
    })

    it('should delete a bridge', async () => {
      const bridge = await manager.create({
        name: 'ToDelete',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const deleted = await manager.delete(bridge.id)

      expect(deleted).toBe(true)
      expect(manager.get(bridge.id)).toBeNull()
    })

    it('should return false when deleting non-existent bridge', async () => {
      const deleted = await manager.delete('non-existent')
      expect(deleted).toBe(false)
    })

    it('should stop bridge before deleting if running', async () => {
      const bridge = await manager.create({
        name: 'Running',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)
      expect(manager.get(bridge.id)?.status).toBe('active')

      await manager.delete(bridge.id)
      expect(manager.get(bridge.id)).toBeNull()
    })
  })

  describe('Start/Stop/Pause/Resume', () => {
    it('should start a bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const started = await manager.start(bridge.id)

      expect(started).toBe(true)
      expect(manager.get(bridge.id)?.status).toBe('active')

      await manager.stop(bridge.id)
    })

    it('should throw error when starting non-existent bridge', async () => {
      await expect(manager.start('non-existent')).rejects.toThrow(
        'Bridge not found'
      )
    })

    it('should return true if bridge already active', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)
      const secondStart = await manager.start(bridge.id)

      expect(secondStart).toBe(true)

      await manager.stop(bridge.id)
    })

    it('should stop a bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)
      const stopped = await manager.stop(bridge.id)

      expect(stopped).toBe(true)
      expect(manager.get(bridge.id)?.status).toBe('idle')
    })

    it('should return false when stopping non-running bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const stopped = await manager.stop(bridge.id)
      expect(stopped).toBe(false)
    })

    it('should pause a bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)
      const paused = await manager.pause(bridge.id)

      expect(paused).toBe(true)
      expect(manager.get(bridge.id)?.status).toBe('paused')

      await manager.stop(bridge.id)
    })

    it('should return false when pausing non-active bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const paused = await manager.pause(bridge.id)
      expect(paused).toBe(false)
    })

    it('should resume a paused bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)
      await manager.pause(bridge.id)
      const resumed = await manager.resume(bridge.id)

      expect(resumed).toBe(true)
      expect(manager.get(bridge.id)?.status).toBe('active')

      await manager.stop(bridge.id)
    })

    it('should return false when resuming non-paused bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const resumed = await manager.resume(bridge.id)
      expect(resumed).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should return stats for running bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)
      const stats = manager.getStats(bridge.id)

      expect(stats).not.toBeNull()
      expect(stats?.bridgeId).toBe(bridge.id)
      expect(stats?.status).toBe('active')
      expect(stats?.messagesForwarded).toBe(0)

      await manager.stop(bridge.id)
    })

    it('should return basic stats for idle bridge', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const stats = manager.getStats(bridge.id)

      expect(stats).not.toBeNull()
      expect(stats?.status).toBe('idle')
      expect(stats?.uptime).toBe(0)
    })

    it('should return null for non-existent bridge', () => {
      const stats = manager.getStats('non-existent')
      expect(stats).toBeNull()
    })
  })

  describe('Events', () => {
    it('should emit status-changed on start', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      const handler = jest.fn()
      manager.on('status-changed', handler)

      await manager.start(bridge.id)

      expect(handler).toHaveBeenCalledWith(bridge.id, 'active')

      await manager.stop(bridge.id)
    })

    it('should emit status-changed on stop', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)

      const handler = jest.fn()
      manager.on('status-changed', handler)

      await manager.stop(bridge.id)

      expect(handler).toHaveBeenCalledWith(bridge.id, 'idle')
    })

    it('should emit status-changed on pause', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      await manager.start(bridge.id)

      const handler = jest.fn()
      manager.on('status-changed', handler)

      await manager.pause(bridge.id)

      expect(handler).toHaveBeenCalledWith(bridge.id, 'paused')

      await manager.stop(bridge.id)
    })
  })

  describe('Default Options', () => {
    it('should apply default options when not specified', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        }
      })

      // DEFAULT_BRIDGE_OPTIONS from types
      expect(bridge.options.interval).toBe(1000)
      expect(bridge.options.changeOnly).toBe(false)
      expect(bridge.options.bufferSize).toBe(100)
    })

    it('should override default options when specified', async () => {
      const bridge = await manager.create({
        name: 'Test',
        sourceConnectionId: 'src-1',
        sourceTags: ['tag-1'],
        targetConnectionId: 'tgt-1',
        targetConfig: {
          topicTemplate: 'test/{{tagName}}',
          payloadTemplate: '{{value}}',
          qos: 0,
          retain: false
        },
        options: {
          interval: 500,
          changeOnly: true,
          changeThreshold: 0.5,
          bufferSize: 500
        }
      })

      expect(bridge.options.interval).toBe(500)
      expect(bridge.options.changeOnly).toBe(true)
      expect(bridge.options.changeThreshold).toBe(0.5)
      expect(bridge.options.bufferSize).toBe(500)
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getBridgeManager()
      const instance2 = getBridgeManager()
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after dispose', () => {
      const instance1 = getBridgeManager()
      disposeBridgeManager()
      const instance2 = getBridgeManager()
      expect(instance1).not.toBe(instance2)
    })
  })
})
