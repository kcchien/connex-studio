/**
 * Polling IPC Handler Integration Tests
 *
 * Tests the polling:* IPC channel handlers including interval
 * validation, start/stop lifecycle, and status query.
 */

import { invokeHandler, resetHandlerRegistry, hasHandler } from './setup'

// ---------------------------------------------------------------------------
// Mock PollingEngine
// ---------------------------------------------------------------------------

const mockStartPolling = jest.fn()
const mockStopPolling = jest.fn()
const mockGetPollingStatus = jest.fn()

jest.mock('@main/services/PollingEngine', () => ({
  getPollingEngine: () => ({
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling,
    getPollingStatus: mockGetPollingStatus
  })
}))

// ---------------------------------------------------------------------------
// Import handler registration (after mocks)
// ---------------------------------------------------------------------------

import { registerPollingHandlers } from '@main/ipc/polling'
import {
  POLLING_START,
  POLLING_STOP,
  POLLING_STATUS
} from '@shared/constants/ipc-channels'
import {
  MIN_POLLING_INTERVAL_MS,
  MAX_POLLING_INTERVAL_MS
} from '@shared/types/polling'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Polling IPC Handlers', () => {
  beforeEach(() => {
    resetHandlerRegistry()
    jest.clearAllMocks()
    registerPollingHandlers()
  })

  // -------------------------------------------------------------------------
  // Handler registration
  // -------------------------------------------------------------------------

  it('registers all polling channels', () => {
    expect(hasHandler(POLLING_START)).toBe(true)
    expect(hasHandler(POLLING_STOP)).toBe(true)
    expect(hasHandler(POLLING_STATUS)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // polling:start — valid interval
  // -------------------------------------------------------------------------

  describe('polling:start', () => {
    it('starts polling with valid interval', async () => {
      mockStartPolling.mockReturnValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1', 'tag-2'],
          intervalMs: 1000
        }
      )

      expect(result.success).toBe(true)
      expect(mockStartPolling).toHaveBeenCalledWith('conn-1', ['tag-1', 'tag-2'], 1000)
    })

    it('starts polling with minimum interval (100ms)', async () => {
      mockStartPolling.mockReturnValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: MIN_POLLING_INTERVAL_MS
        }
      )

      expect(result.success).toBe(true)
      expect(mockStartPolling).toHaveBeenCalledWith(
        'conn-1',
        ['tag-1'],
        MIN_POLLING_INTERVAL_MS
      )
    })

    it('starts polling with maximum interval (60000ms)', async () => {
      mockStartPolling.mockReturnValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: MAX_POLLING_INTERVAL_MS
        }
      )

      expect(result.success).toBe(true)
    })

    it('rejects interval below minimum (< 100ms)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: 50
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain(`at least ${MIN_POLLING_INTERVAL_MS}ms`)
      expect(mockStartPolling).not.toHaveBeenCalled()
    })

    it('rejects interval above maximum (> 60000ms)', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: 120000
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain(`at most ${MAX_POLLING_INTERVAL_MS}ms`)
      expect(mockStartPolling).not.toHaveBeenCalled()
    })

    it('rejects NaN interval', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: NaN
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Interval must be a number')
      expect(mockStartPolling).not.toHaveBeenCalled()
    })

    it('rejects non-number interval', async () => {
      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: 'fast' as any
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Interval must be a number')
      expect(mockStartPolling).not.toHaveBeenCalled()
    })

    it('returns error when engine throws (connection not found)', async () => {
      mockStartPolling.mockImplementation(() => {
        throw new Error('Connection not found: conn-missing')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-missing',
          tagIds: ['tag-1'],
          intervalMs: 1000
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection not found')
    })

    it('returns error when engine throws (not connected)', async () => {
      mockStartPolling.mockImplementation(() => {
        throw new Error('Connection is not connected')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: ['tag-1'],
          intervalMs: 1000
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('not connected')
    })

    it('returns error when no enabled tags are available', async () => {
      mockStartPolling.mockImplementation(() => {
        throw new Error('No enabled tags to poll')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_START,
        {
          connectionId: 'conn-1',
          tagIds: [],
          intervalMs: 1000
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('No enabled tags')
    })
  })

  // -------------------------------------------------------------------------
  // polling:stop
  // -------------------------------------------------------------------------

  describe('polling:stop', () => {
    it('stops polling successfully', async () => {
      mockStopPolling.mockReturnValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        POLLING_STOP,
        { connectionId: 'conn-1' }
      )

      expect(result.success).toBe(true)
      expect(mockStopPolling).toHaveBeenCalledWith('conn-1')
    })

    it('succeeds even when no session exists (engine handles silently)', async () => {
      mockStopPolling.mockReturnValue(undefined)

      const result = await invokeHandler<{ success: boolean }>(
        POLLING_STOP,
        { connectionId: 'conn-no-session' }
      )

      expect(result.success).toBe(true)
    })

    it('returns error if engine throws on stop', async () => {
      mockStopPolling.mockImplementation(() => {
        throw new Error('Unexpected stop error')
      })

      const result = await invokeHandler<{ success: boolean; error?: string }>(
        POLLING_STOP,
        { connectionId: 'conn-1' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unexpected stop error')
    })
  })

  // -------------------------------------------------------------------------
  // polling:status
  // -------------------------------------------------------------------------

  describe('polling:status', () => {
    it('returns active polling status', async () => {
      const now = Date.now()
      mockGetPollingStatus.mockReturnValue({
        isPolling: true,
        intervalMs: 500,
        lastPollTimestamp: now,
        tagCount: 5
      })

      const result = await invokeHandler<{
        isPolling: boolean
        intervalMs: number
        lastPollTimestamp: number
        tagCount: number
      }>(POLLING_STATUS, { connectionId: 'conn-1' })

      expect(result.isPolling).toBe(true)
      expect(result.intervalMs).toBe(500)
      expect(result.tagCount).toBe(5)
      expect(result.lastPollTimestamp).toBe(now)
    })

    it('returns inactive status when no session exists', async () => {
      mockGetPollingStatus.mockReturnValue({
        isPolling: false,
        intervalMs: 0,
        lastPollTimestamp: 0,
        tagCount: 0
      })

      const result = await invokeHandler<{
        isPolling: boolean
        intervalMs: number
        tagCount: number
      }>(POLLING_STATUS, { connectionId: 'conn-idle' })

      expect(result.isPolling).toBe(false)
      expect(result.intervalMs).toBe(0)
      expect(result.tagCount).toBe(0)
    })
  })
})
