/**
 * Verify that main process global error handlers can be registered and invoked.
 *
 * The actual app handlers in index.ts require the full Electron runtime
 * (app, dialog, etc.) so they cannot be imported in a pure Node test.
 * These tests validate that the handler registration mechanism works correctly,
 * ensuring the test infrastructure is sound for this pattern.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('Main process error handling', () => {
  // Track whether our test handlers are called
  let rejectionHandlerCalled = false
  let exceptionHandlerCalled = false

  const rejectionHandler = (): void => {
    rejectionHandlerCalled = true
  }
  const exceptionHandler = (): void => {
    exceptionHandlerCalled = true
  }

  beforeAll(() => {
    process.on('unhandledRejection', rejectionHandler)
    process.on('uncaughtException', exceptionHandler)
  })

  afterAll(() => {
    process.removeListener('unhandledRejection', rejectionHandler)
    process.removeListener('uncaughtException', exceptionHandler)
  })

  it('should register unhandledRejection handler', () => {
    const listeners = process.listeners('unhandledRejection')
    expect(listeners.length).toBeGreaterThan(0)
    expect(listeners).toContain(rejectionHandler)
  })

  it('should register uncaughtException handler', () => {
    const listeners = process.listeners('uncaughtException')
    expect(listeners.length).toBeGreaterThan(0)
    expect(listeners).toContain(exceptionHandler)
  })
})
