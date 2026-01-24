/**
 * DVR (Data Video Recorder) IPC Handlers
 *
 * Implements time-travel functionality through historical data.
 * Enables seeking to any point in the ring buffer and retrieving
 * sparkline data with efficient downsampling.
 */

import { ipcMain } from 'electron'
import log from 'electron-log/main.js'
import { getDataBuffer } from '../services/DataBuffer'
import type { DvrRange, DvrSnapshot, SparklineData, TagValue } from '@shared/types'
import { DEFAULT_SPARKLINE_POINTS } from '@shared/types/dvr'

// IPC channel constants
const DVR_GET_RANGE = 'dvr:get-range'
const DVR_SEEK = 'dvr:seek'
const DVR_GET_SPARKLINE = 'dvr:get-sparkline'

interface SeekParams {
  timestamp: number
  tagIds?: string[]
}

interface SparklineParams {
  tagId: string
  startTimestamp: number
  endTimestamp: number
  maxPoints?: number
}

/**
 * Register all DVR-related IPC handlers.
 */
export function registerDvrHandlers(): void {
  /**
   * dvr:get-range
   * Get the available time range in the data buffer.
   */
  ipcMain.handle(DVR_GET_RANGE, async (): Promise<DvrRange> => {
    log.debug('[IPC] dvr:get-range')

    const dataBuffer = getDataBuffer()
    const range = dataBuffer.getRange()

    if (!range) {
      // No data in buffer
      return {
        startTimestamp: 0,
        endTimestamp: 0,
        dataPointCount: 0
      }
    }

    return {
      startTimestamp: range.startTimestamp,
      endTimestamp: range.endTimestamp,
      dataPointCount: range.totalPoints
    }
  })

  /**
   * dvr:seek
   * Get a snapshot of tag values at a specific timestamp.
   * Returns the most recent value for each tag at or before the given timestamp.
   */
  ipcMain.handle(DVR_SEEK, async (_event, params: SeekParams): Promise<DvrSnapshot> => {
    const { timestamp, tagIds } = params
    log.debug('[IPC] dvr:seek', { timestamp, tagIds: tagIds?.length ?? 'all' })

    const dataBuffer = getDataBuffer()
    const seekResult = dataBuffer.seek(timestamp)

    // Convert Map to array of TagValues
    let values: TagValue[] = []

    for (const [tagId, dataPoint] of seekResult.entries()) {
      // Filter by tagIds if specified
      if (tagIds && tagIds.length > 0 && !tagIds.includes(tagId)) {
        continue
      }

      values.push({
        tagId: dataPoint.tagId,
        value: dataPoint.value,
        quality: dataPoint.quality
      })
    }

    return {
      timestamp,
      values
    }
  })

  /**
   * dvr:get-sparkline
   * Get time-series data for sparkline rendering with optional downsampling.
   * Uses LTTB algorithm to preserve visual peaks and troughs.
   */
  ipcMain.handle(DVR_GET_SPARKLINE, async (_event, params: SparklineParams): Promise<SparklineData> => {
    const { tagId, startTimestamp, endTimestamp, maxPoints = DEFAULT_SPARKLINE_POINTS } = params
    log.debug('[IPC] dvr:get-sparkline', { tagId, startTimestamp, endTimestamp, maxPoints })

    const dataBuffer = getDataBuffer()
    const result = dataBuffer.getSparkline({
      tagId,
      startTime: startTimestamp,
      endTime: endTimestamp,
      maxPoints
    })

    return {
      timestamps: result.timestamps,
      values: result.values
    }
  })

  log.info('[IPC] DVR handlers registered')
}
