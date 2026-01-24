/**
 * Log type definitions for IIoT Protocol Studio.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose'

export interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  source?: string
  details?: Record<string, unknown>
}

// Log configuration
export const LOG_MAX_FILES = 5
export const LOG_MAX_SIZE_MB = 10
export const DEFAULT_LOG_LEVEL: LogLevel = 'info'
