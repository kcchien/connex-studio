/**
 * LogService
 *
 * Centralized logging service with file rotation and IPC support.
 * Uses electron-log for file management and provides methods for
 * retrieving logs from the Renderer process.
 *
 * Features:
 * - File rotation (size-based and count-based)
 * - Log level filtering
 * - Log retrieval for UI display
 * - Export functionality
 */

import log from 'electron-log/main.js'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type { LogLevel, LogEntry } from '@shared/types'

export interface LogServiceConfig {
  maxSize: number // Max file size in bytes
  maxFiles: number // Number of rotated files to keep
  level: LogLevel // Minimum log level
}

const DEFAULT_CONFIG: LogServiceConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  level: 'info'
}

export class LogService {
  private config: LogServiceConfig
  private logPath: string
  private inMemoryLogs: LogEntry[] = []
  private maxInMemoryLogs = 1000

  constructor(config?: Partial<LogServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.logPath = path.join(app.getPath('userData'), 'logs')

    this.initialize()
  }

  private initialize(): void {
    // Ensure log directory exists
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true })
    }

    // Configure electron-log
    log.transports.file.maxSize = this.config.maxSize
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
    log.transports.file.resolvePathFn = () =>
      path.join(this.logPath, 'connex-studio.log')

    // Set log level
    log.transports.file.level = this.config.level
    log.transports.console.level = this.config.level

    // Hook into log events to capture in-memory
    const originalLog = log.log.bind(log)
    log.log = (...args) => {
      this.captureLog('info', args)
      originalLog(...args)
    }

    // Override log methods to capture entries
    this.hookLogMethod('error')
    this.hookLogMethod('warn')
    this.hookLogMethod('info')
    this.hookLogMethod('debug')
    this.hookLogMethod('verbose')

    log.info('[LogService] Initialized', {
      logPath: this.logPath,
      config: this.config
    })
  }

  private hookLogMethod(level: LogLevel): void {
    const originalMethod = log[level].bind(log)
    log[level] = (...args: unknown[]) => {
      this.captureLog(level, args)
      originalMethod(...args)
    }
  }

  private captureLog(level: LogLevel, args: unknown[]): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: args.map((a) => this.formatArg(a)).join(' '),
      source: 'main'
    }

    this.inMemoryLogs.push(entry)

    // Trim if over limit
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs = this.inMemoryLogs.slice(-this.maxInMemoryLogs)
    }
  }

  private formatArg(arg: unknown): string {
    if (typeof arg === 'string') {
      return arg
    }
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`
    }
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }

  /**
   * Get recent log entries from memory.
   */
  getLogs(options?: {
    level?: LogLevel
    limit?: number
    source?: 'main' | 'renderer'
  }): LogEntry[] {
    let logs = [...this.inMemoryLogs]

    // Filter by level
    if (options?.level) {
      const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose']
      const minLevelIndex = levels.indexOf(options.level)
      logs = logs.filter((entry) => levels.indexOf(entry.level) <= minLevelIndex)
    }

    // Filter by source
    if (options?.source) {
      logs = logs.filter((entry) => entry.source === options.source)
    }

    // Apply limit
    if (options?.limit && logs.length > options.limit) {
      logs = logs.slice(-options.limit)
    }

    return logs
  }

  /**
   * Add a log entry from the Renderer process.
   */
  addRendererLog(entry: Omit<LogEntry, 'source'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      source: 'renderer'
    }

    this.inMemoryLogs.push(fullEntry)

    // Also write to file
    log[entry.level](`[Renderer] ${entry.message}`)
  }

  /**
   * Clear in-memory logs.
   */
  clearLogs(): void {
    this.inMemoryLogs = []
    log.info('[LogService] In-memory logs cleared')
  }

  /**
   * Export logs to a file.
   */
  async exportLogs(filePath: string): Promise<void> {
    const logs = this.getLogs()
    const content = logs
      .map((entry) => {
        const timestamp = new Date(entry.timestamp).toISOString()
        return `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}`
      })
      .join('\n')

    await fs.promises.writeFile(filePath, content, 'utf-8')
    log.info(`[LogService] Logs exported to: ${filePath}`)
  }

  /**
   * Get the path to the log directory.
   */
  getLogPath(): string {
    return this.logPath
  }

  /**
   * Get the path to the main log file.
   */
  getLogFilePath(): string {
    return path.join(this.logPath, 'connex-studio.log')
  }

  /**
   * Read the raw log file contents.
   */
  async readLogFile(options?: { lines?: number }): Promise<string> {
    const filePath = this.getLogFilePath()

    if (!fs.existsSync(filePath)) {
      return ''
    }

    const content = await fs.promises.readFile(filePath, 'utf-8')

    if (options?.lines) {
      const allLines = content.split('\n')
      return allLines.slice(-options.lines).join('\n')
    }

    return content
  }

  /**
   * Update log configuration.
   */
  updateConfig(config: Partial<LogServiceConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.maxSize) {
      log.transports.file.maxSize = config.maxSize
    }

    if (config.level) {
      log.transports.file.level = config.level
      log.transports.console.level = config.level
    }

    log.info('[LogService] Configuration updated', this.config)
  }

  /**
   * Get current configuration.
   */
  getConfig(): LogServiceConfig {
    return { ...this.config }
  }
}

// Singleton instance
let instance: LogService | null = null

export function getLogService(): LogService {
  if (!instance) {
    instance = new LogService()
  }
  return instance
}

// Re-export log for convenience
export { log }
