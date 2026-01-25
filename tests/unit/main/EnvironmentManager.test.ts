/**
 * EnvironmentManager Unit Tests
 *
 * Tests for environment CRUD operations and switch handling (T167).
 */

import {
  EnvironmentManager,
  getEnvironmentManager,
  disposeEnvironmentManager
} from '../../../src/main/services/EnvironmentManager'
import type { Environment } from '../../../src/shared/types'

describe('EnvironmentManager', () => {
  let manager: EnvironmentManager

  beforeEach(() => {
    disposeEnvironmentManager()
    manager = getEnvironmentManager()
  })

  afterEach(async () => {
    await manager.dispose()
  })

  describe('CRUD Operations', () => {
    it('should create a new environment', async () => {
      const env = await manager.create({
        name: 'Development',
        variables: { API_URL: 'http://localhost:3000' }
      })

      expect(env.id).toBeDefined()
      expect(env.name).toBe('Development')
      expect(env.variables.API_URL).toBe('http://localhost:3000')
      expect(env.isDefault).toBe(false)
    })

    it('should list all environments', async () => {
      await manager.create({ name: 'Dev' })
      await manager.create({ name: 'Prod' })

      const list = manager.list()
      expect(list).toHaveLength(2)
    })

    it('should get environment by ID', async () => {
      const created = await manager.create({ name: 'Test' })
      const fetched = manager.get(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched?.name).toBe('Test')
    })

    it('should return null for non-existent environment', () => {
      const result = manager.get('non-existent-id')
      expect(result).toBeNull()
    })

    it('should update an environment', async () => {
      const env = await manager.create({ name: 'Original' })
      const updated = await manager.update({
        id: env.id,
        name: 'Updated',
        variables: { NEW_VAR: 'value' }
      })

      expect(updated.name).toBe('Updated')
      expect(updated.variables.NEW_VAR).toBe('value')
    })

    it('should throw error when updating non-existent environment', async () => {
      await expect(manager.update({ id: 'non-existent' })).rejects.toThrow(
        'Environment not found'
      )
    })

    it('should delete an environment', async () => {
      const env = await manager.create({ name: 'ToDelete' })
      const deleted = await manager.delete(env.id)

      expect(deleted).toBe(true)
      expect(manager.get(env.id)).toBeNull()
    })

    it('should return false when deleting non-existent environment', async () => {
      const deleted = await manager.delete('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('Default Environment', () => {
    it('should set environment as default', async () => {
      const env = await manager.create({ name: 'Default' })
      await manager.setDefault(env.id)

      const defaultEnv = manager.getDefault()
      expect(defaultEnv?.id).toBe(env.id)
      expect(defaultEnv?.isDefault).toBe(true)
    })

    it('should clear previous default when setting new default', async () => {
      const env1 = await manager.create({ name: 'First', isDefault: true })
      const env2 = await manager.create({ name: 'Second' })

      await manager.setDefault(env2.id)

      const updated1 = manager.get(env1.id)
      const updated2 = manager.get(env2.id)

      expect(updated1?.isDefault).toBe(false)
      expect(updated2?.isDefault).toBe(true)
    })

    it('should throw error when setting non-existent environment as default', async () => {
      await expect(manager.setDefault('non-existent')).rejects.toThrow(
        'Environment not found'
      )
    })

    it('should return null when no default is set', () => {
      const defaultEnv = manager.getDefault()
      expect(defaultEnv).toBeNull()
    })

    it('should clear default when deleting default environment', async () => {
      const env = await manager.create({ name: 'Default', isDefault: true })
      await manager.delete(env.id)

      expect(manager.getDefault()).toBeNull()
    })
  })

  describe('Variables', () => {
    it('should get variables from default environment', async () => {
      await manager.create({
        name: 'WithVars',
        variables: { HOST: 'localhost', PORT: '8080' },
        isDefault: true
      })

      const vars = manager.getVariables()
      expect(vars.HOST).toBe('localhost')
      expect(vars.PORT).toBe('8080')
    })

    it('should return empty object when no default environment', () => {
      const vars = manager.getVariables()
      expect(vars).toEqual({})
    })
  })

  describe('Switch Handling (T167)', () => {
    it('should emit environment-switching event', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })

      const switchingHandler = jest.fn()
      manager.on('environment-switching', switchingHandler)

      await manager.setDefault(env2.id)

      expect(switchingHandler).toHaveBeenCalledWith(
        expect.objectContaining({ id: env1.id }),
        expect.objectContaining({ id: env2.id })
      )
    })

    it('should emit environment-switched event', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })

      const switchedHandler = jest.fn()
      manager.on('environment-switched', switchedHandler)

      await manager.setDefault(env2.id)

      expect(switchedHandler).toHaveBeenCalledWith(
        expect.objectContaining({ id: env1.id }),
        expect.objectContaining({ id: env2.id })
      )
    })

    it('should call registered switch handlers', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })

      const handler = jest.fn().mockResolvedValue(undefined)
      manager.registerSwitchHandler(handler)

      await manager.setDefault(env2.id)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: env1.id }),
        expect.objectContaining({ id: env2.id })
      )
    })

    it('should unregister switch handler', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })

      const handler = jest.fn().mockResolvedValue(undefined)
      const unregister = manager.registerSwitchHandler(handler)
      unregister()

      await manager.setDefault(env2.id)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should prevent concurrent switches', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })
      const env3 = await manager.create({ name: 'Env3' })

      // Register a slow handler
      manager.registerSwitchHandler(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Start first switch
      const firstSwitch = manager.setDefault(env2.id)

      // Try second switch immediately
      await expect(manager.setDefault(env3.id)).rejects.toThrow(
        'Environment switch already in progress'
      )

      await firstSwitch
    })

    it('should report switch in progress status', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })

      expect(manager.isEnvironmentSwitching()).toBe(false)

      let wasSwitching = false
      manager.registerSwitchHandler(async () => {
        wasSwitching = manager.isEnvironmentSwitching()
      })

      await manager.setDefault(env2.id)

      expect(wasSwitching).toBe(true)
      expect(manager.isEnvironmentSwitching()).toBe(false)
    })

    it('should not trigger switch events when switching to same environment', async () => {
      const env = await manager.create({ name: 'Env1', isDefault: true })

      const switchingHandler = jest.fn()
      manager.on('environment-switching', switchingHandler)

      await manager.setDefault(env.id)

      expect(switchingHandler).not.toHaveBeenCalled()
    })

    it('should switch environment using switchEnvironment method', async () => {
      const env1 = await manager.create({ name: 'Env1', isDefault: true })
      const env2 = await manager.create({ name: 'Env2' })

      const result = await manager.switchEnvironment(env2.id)

      expect(result.id).toBe(env2.id)
      expect(result.isDefault).toBe(true)
    })
  })

  describe('Events', () => {
    it('should emit environment-changed on create', async () => {
      const handler = jest.fn()
      manager.on('environment-changed', handler)

      await manager.create({ name: 'New' })

      expect(handler).toHaveBeenCalled()
    })

    it('should emit environment-changed on update', async () => {
      const env = await manager.create({ name: 'Original' })

      const handler = jest.fn()
      manager.on('environment-changed', handler)

      await manager.update({ id: env.id, name: 'Updated' })

      expect(handler).toHaveBeenCalled()
    })

    it('should emit default-changed when setting default', async () => {
      const env = await manager.create({ name: 'Env' })

      const handler = jest.fn()
      manager.on('default-changed', handler)

      await manager.setDefault(env.id)

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getEnvironmentManager()
      const instance2 = getEnvironmentManager()
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after dispose', () => {
      const instance1 = getEnvironmentManager()
      disposeEnvironmentManager()
      const instance2 = getEnvironmentManager()
      expect(instance1).not.toBe(instance2)
    })
  })
})
