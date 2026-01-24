/**
 * ProfileService
 *
 * Handles profile persistence, import/export, and schema migration.
 * Profiles are stored as JSON files in the user data directory.
 *
 * Security: Credentials are stored separately via CredentialService (keytar)
 * and are NOT included in exported profiles.
 */

import { app, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log/main.js'
import type {
  Profile,
  ProfileSettings,
  ProfileSummary,
  Connection,
  Tag
} from '@shared/types'
import {
  PROFILE_SCHEMA_VERSION,
  DEFAULT_PROFILE_SETTINGS
} from '@shared/types/profile'
import { getConnectionManager } from './ConnectionManager'
import { getCredentialService } from './CredentialService'

// Profile directory within user data
const PROFILES_DIR = 'profiles'

// Supported schema versions for migration
const SUPPORTED_VERSIONS = ['1.0.0']

export interface SaveProfileParams {
  name: string
  connectionIds: string[]
}

export interface LoadProfileResult {
  profile: Profile
  connections: Connection[]
  tags: Tag[]
  credentialsRequired: string[] // Connection IDs that need credentials re-entry
}

export class ProfileService {
  private profilesDir: string

  constructor() {
    this.profilesDir = path.join(app.getPath('userData'), PROFILES_DIR)
  }

  /**
   * Ensure profiles directory exists.
   */
  private async ensureProfilesDir(): Promise<void> {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true })
    } catch (error) {
      log.error(`[ProfileService] Failed to create profiles directory: ${error}`)
      throw error
    }
  }

  /**
   * Get profile file path.
   */
  private getProfilePath(name: string): string {
    // Sanitize name to prevent path traversal
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(this.profilesDir, `${safeName}.json`)
  }

  /**
   * Save current configuration as a profile.
   */
  async save(params: SaveProfileParams): Promise<string> {
    await this.ensureProfilesDir()

    const { name, connectionIds } = params
    const connectionManager = getConnectionManager()

    // Gather connections (without credentials)
    const connections: Connection[] = []
    const tags: Tag[] = []

    for (const connId of connectionIds) {
      const conn = connectionManager.getConnection(connId)
      if (conn) {
        // Clone connection without sensitive data
        const sanitizedConn = this.sanitizeConnection(conn)
        connections.push(sanitizedConn)

        // Get tags for this connection
        const connTags = connectionManager.getTags(connId)
        tags.push(...connTags)
      }
    }

    const profile: Profile = {
      id: uuidv4(),
      name,
      version: PROFILE_SCHEMA_VERSION,
      connections,
      tags,
      settings: DEFAULT_PROFILE_SETTINGS,
      exportedAt: Date.now()
    }

    const filePath = this.getProfilePath(name)
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf-8')

    log.info(`[ProfileService] Saved profile: ${name} (${connections.length} connections, ${tags.length} tags)`)
    return filePath
  }

  /**
   * Load a profile by name.
   */
  async load(name: string): Promise<LoadProfileResult> {
    const filePath = this.getProfilePath(name)

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const profile = JSON.parse(content) as Profile

      // Validate schema version
      this.validateSchemaVersion(profile.version)

      // Apply migrations if needed
      const migratedProfile = this.migrateProfile(profile)

      // Check which connections need credentials
      const credentialService = getCredentialService()
      const credentialsRequired: string[] = []

      for (const conn of migratedProfile.connections) {
        const hasCredentials = await credentialService.hasCredentials(conn.id)
        if (!hasCredentials && this.connectionNeedsCredentials(conn)) {
          credentialsRequired.push(conn.id)
        }
      }

      log.info(`[ProfileService] Loaded profile: ${name}`)

      return {
        profile: migratedProfile,
        connections: migratedProfile.connections,
        tags: migratedProfile.tags,
        credentialsRequired
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Profile not found: ${name}`)
      }
      throw error
    }
  }

  /**
   * List all available profiles.
   */
  async list(): Promise<ProfileSummary[]> {
    await this.ensureProfilesDir()

    try {
      const files = await fs.readdir(this.profilesDir)
      const profiles: ProfileSummary[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const filePath = path.join(this.profilesDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const profile = JSON.parse(content) as Profile

          profiles.push({
            name: profile.name,
            version: profile.version,
            connectionCount: profile.connections.length,
            tagCount: profile.tags.length,
            exportedAt: profile.exportedAt
          })
        } catch (err) {
          log.warn(`[ProfileService] Failed to read profile ${file}: ${err}`)
        }
      }

      return profiles.sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      log.error(`[ProfileService] Failed to list profiles: ${error}`)
      return []
    }
  }

  /**
   * Delete a profile by name.
   */
  async delete(name: string): Promise<void> {
    const filePath = this.getProfilePath(name)

    try {
      await fs.unlink(filePath)
      log.info(`[ProfileService] Deleted profile: ${name}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Profile not found: ${name}`)
      }
      throw error
    }
  }

  /**
   * Import a profile from a file.
   */
  async import(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const profile = JSON.parse(content) as Profile

      // Validate structure
      if (!profile.name || !profile.version || !Array.isArray(profile.connections)) {
        throw new Error('Invalid profile format')
      }

      // Validate schema version
      this.validateSchemaVersion(profile.version)

      // Apply migrations
      const migratedProfile = this.migrateProfile(profile)

      // Generate new IDs to avoid conflicts
      const newId = uuidv4()
      migratedProfile.id = newId

      // Remap connection IDs
      const idMap = new Map<string, string>()
      for (const conn of migratedProfile.connections) {
        const oldId = conn.id
        const newConnId = uuidv4()
        idMap.set(oldId, newConnId)
        conn.id = newConnId
      }

      // Update tag connection references
      for (const tag of migratedProfile.tags) {
        const newConnId = idMap.get(tag.connectionId)
        if (newConnId) {
          tag.connectionId = newConnId
          tag.id = uuidv4()
        }
      }

      // Save with potentially modified name if conflict
      let saveName = migratedProfile.name
      const existing = await this.list()
      const existingNames = new Set(existing.map((p) => p.name))

      let counter = 1
      while (existingNames.has(saveName)) {
        saveName = `${migratedProfile.name} (${counter})`
        counter++
      }
      migratedProfile.name = saveName

      // Save to profiles directory
      const destPath = this.getProfilePath(saveName)
      await fs.writeFile(destPath, JSON.stringify(migratedProfile, null, 2), 'utf-8')

      log.info(`[ProfileService] Imported profile: ${saveName} from ${filePath}`)
      return saveName
    } catch (error) {
      log.error(`[ProfileService] Import failed: ${error}`)
      throw error
    }
  }

  /**
   * Export a profile to a user-selected location.
   * Opens a save dialog and returns the export path.
   */
  async export(name: string): Promise<{ path: string; cancelled: boolean }> {
    // Load the profile first
    const { profile } = await this.load(name)

    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Profile',
      defaultPath: `${profile.name}.json`,
      filters: [
        { name: 'Profile Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { path: '', cancelled: true }
    }

    // Update exportedAt timestamp
    profile.exportedAt = Date.now()

    // Write to selected location
    await fs.writeFile(result.filePath, JSON.stringify(profile, null, 2), 'utf-8')

    log.info(`[ProfileService] Exported profile: ${name} to ${result.filePath}`)
    return { path: result.filePath, cancelled: false }
  }

  /**
   * Show open dialog for importing a profile.
   */
  async showImportDialog(): Promise<{ filePath: string; cancelled: boolean }> {
    const result = await dialog.showOpenDialog({
      title: 'Import Profile',
      filters: [
        { name: 'Profile Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { filePath: '', cancelled: true }
    }

    return { filePath: result.filePaths[0], cancelled: false }
  }

  /**
   * Remove sensitive data from connection for storage.
   */
  private sanitizeConnection(conn: Connection): Connection {
    const sanitized = { ...conn }

    // Remove any password fields from config
    if (sanitized.config && 'password' in sanitized.config) {
      sanitized.config = { ...sanitized.config, password: undefined }
    }

    // Reset status for stored profile
    sanitized.status = 'disconnected'
    sanitized.lastError = undefined

    return sanitized
  }

  /**
   * Check if a connection type requires credentials.
   */
  private connectionNeedsCredentials(conn: Connection): boolean {
    // MQTT and OPC UA may need credentials
    if (conn.protocol === 'mqtt' || conn.protocol === 'opcua') {
      return true
    }
    return false
  }

  /**
   * Validate schema version.
   */
  private validateSchemaVersion(version: string): void {
    if (!SUPPORTED_VERSIONS.includes(version)) {
      throw new Error(
        `Unsupported profile version: ${version}. Supported: ${SUPPORTED_VERSIONS.join(', ')}`
      )
    }
  }

  /**
   * Migrate profile to current schema version.
   */
  private migrateProfile(profile: Profile): Profile {
    // Currently only v1.0.0, no migrations needed
    // Future migrations would be handled here
    return profile
  }
}

// Singleton instance
let instance: ProfileService | null = null

export function getProfileService(): ProfileService {
  if (!instance) {
    instance = new ProfileService()
  }
  return instance
}
