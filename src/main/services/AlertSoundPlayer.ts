/**
 * Alert Sound Player
 *
 * Plays alert sounds based on severity level using system audio.
 * Uses Electron shell to play system sounds or custom audio files.
 */

import { shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { AlertSeverity } from '@shared/types'

/**
 * Sound configuration per severity level.
 */
interface SoundConfig {
  frequency: number
  duration: number
  volume: number
}

/**
 * Default sound configurations.
 */
const SOUND_CONFIGS: Record<AlertSeverity, SoundConfig> = {
  info: {
    frequency: 800,
    duration: 200,
    volume: 0.3
  },
  warning: {
    frequency: 600,
    duration: 400,
    volume: 0.5
  },
  critical: {
    frequency: 400,
    duration: 600,
    volume: 0.8
  }
}

/**
 * Alert Sound Player manages audio playback for alerts.
 */
export class AlertSoundPlayer {
  private enabled = true
  private volume = 1.0
  private customSounds: Map<AlertSeverity, string> = new Map()

  constructor() {}

  /**
   * Play alert sound for given severity.
   */
  play(severity: AlertSeverity): void {
    if (!this.enabled) return

    // Check for custom sound file
    const customPath = this.customSounds.get(severity)
    if (customPath && fs.existsSync(customPath)) {
      this.playFile(customPath)
      return
    }

    // Use system beep as fallback
    this.playSystemSound(severity)
  }

  /**
   * Play a custom sound file.
   */
  private playFile(filePath: string): void {
    try {
      // On macOS, use afplay
      // On Windows, use PowerShell
      // On Linux, use paplay or aplay
      if (process.platform === 'darwin') {
        const { exec } = require('child_process')
        exec(`afplay "${filePath}" -v ${this.volume}`)
      } else if (process.platform === 'win32') {
        const { exec } = require('child_process')
        exec(
          `powershell -c "(New-Object Media.SoundPlayer '${filePath}').PlaySync()"`
        )
      } else {
        const { exec } = require('child_process')
        exec(`paplay "${filePath}" || aplay "${filePath}"`)
      }
    } catch {
      // Fallback to shell beep
      shell.beep()
    }
  }

  /**
   * Play system sound based on severity.
   * Uses different beep patterns for different severities.
   */
  private playSystemSound(severity: AlertSeverity): void {
    const config = SOUND_CONFIGS[severity]
    const repeatCount = severity === 'critical' ? 3 : severity === 'warning' ? 2 : 1

    // Play beep pattern
    for (let i = 0; i < repeatCount; i++) {
      setTimeout(() => {
        shell.beep()
      }, i * (config.duration + 100))
    }
  }

  /**
   * Set custom sound file for a severity level.
   */
  setCustomSound(severity: AlertSeverity, filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      return false
    }
    this.customSounds.set(severity, filePath)
    return true
  }

  /**
   * Remove custom sound for a severity level.
   */
  removeCustomSound(severity: AlertSeverity): void {
    this.customSounds.delete(severity)
  }

  /**
   * Get custom sound path for severity.
   */
  getCustomSound(severity: AlertSeverity): string | undefined {
    return this.customSounds.get(severity)
  }

  /**
   * Enable sound playback.
   */
  enable(): void {
    this.enabled = true
  }

  /**
   * Disable sound playback.
   */
  disable(): void {
    this.enabled = false
  }

  /**
   * Check if sound is enabled.
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Set volume (0.0 to 1.0).
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Get current volume.
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * Test play a sound for given severity.
   */
  test(severity: AlertSeverity): void {
    this.play(severity)
  }
}

// Singleton instance
let instance: AlertSoundPlayer | null = null

export function getAlertSoundPlayer(): AlertSoundPlayer {
  if (!instance) {
    instance = new AlertSoundPlayer()
  }
  return instance
}

export function disposeAlertSoundPlayer(): void {
  instance = null
}
