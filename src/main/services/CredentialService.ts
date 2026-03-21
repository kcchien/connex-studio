/**
 * CredentialService
 *
 * Secure credential storage using Electron safeStorage + electron-store.
 * - safeStorage encrypts strings using OS-native cryptography
 * - electron-store persists encrypted data to a JSON file
 *
 * This replaces the previous keytar-based implementation.
 * Credentials are stored separately from profile JSON files to prevent
 * accidental exposure during file sharing or export.
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'
import log from 'electron-log/main.js'

export interface Credentials {
  username?: string
  password?: string
}

export interface CredentialEntry {
  connectionId: string
  credentials: Credentials
}

const STORE_KEY_PREFIX = 'credentials.'

export class CredentialService {
  private store: Store

  constructor() {
    this.store = new Store({ name: 'credentials' })
  }

  /**
   * Store credentials for a connection.
   * The connection ID is used as the key identifier.
   */
  async setCredentials(connectionId: string, credentials: Credentials): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption not available on this platform')
      }
      const serialized = JSON.stringify(credentials)
      const encrypted = safeStorage.encryptString(serialized)
      this.store.set(`${STORE_KEY_PREFIX}${connectionId}`, encrypted.toString('base64'))
      log.info(`[CredentialService] Stored credentials for: ${connectionId}`)
    } catch (error) {
      log.error(`[CredentialService] Failed to store credentials: ${error}`)
      throw new Error(`Failed to store credentials: ${error}`)
    }
  }

  /**
   * Retrieve credentials for a connection.
   * Returns null if no credentials are stored.
   */
  async getCredentials(connectionId: string): Promise<Credentials | null> {
    try {
      const encrypted = this.store.get(`${STORE_KEY_PREFIX}${connectionId}`) as string | undefined
      if (!encrypted) return null
      const buffer = Buffer.from(encrypted, 'base64')
      const decrypted = safeStorage.decryptString(buffer)
      return JSON.parse(decrypted) as Credentials
    } catch (error) {
      log.error(`[CredentialService] Failed to retrieve credentials: ${error}`)
      return null
    }
  }

  /**
   * Delete credentials for a connection.
   */
  async deleteCredentials(connectionId: string): Promise<boolean> {
    try {
      const key = `${STORE_KEY_PREFIX}${connectionId}`
      if (!this.store.has(key)) return false
      this.store.delete(key)
      log.info(`[CredentialService] Deleted credentials for: ${connectionId}`)
      return true
    } catch (error) {
      log.error(`[CredentialService] Failed to delete credentials: ${error}`)
      return false
    }
  }

  /**
   * Check if credentials exist for a connection.
   */
  async hasCredentials(connectionId: string): Promise<boolean> {
    return this.store.has(`${STORE_KEY_PREFIX}${connectionId}`)
  }

  /**
   * List all connection IDs that have stored credentials.
   * Useful for profile import/export to know which connections need credential re-entry.
   */
  async listConnectionsWithCredentials(): Promise<string[]> {
    try {
      const allKeys = Object.keys(this.store.store as Record<string, unknown>)
      return allKeys
        .filter((key) => key.startsWith(STORE_KEY_PREFIX))
        .map((key) => key.slice(STORE_KEY_PREFIX.length))
    } catch (error) {
      log.error(`[CredentialService] Failed to list credentials: ${error}`)
      return []
    }
  }

  /**
   * Update password only (preserve username).
   */
  async updatePassword(connectionId: string, password: string): Promise<void> {
    const existing = await this.getCredentials(connectionId)
    await this.setCredentials(connectionId, { username: existing?.username, password })
  }

  /**
   * Bulk delete credentials for multiple connections.
   * Used when deleting a profile or clearing all data.
   */
  async deleteMultiple(connectionIds: string[]): Promise<void> {
    for (const id of connectionIds) {
      await this.deleteCredentials(id)
    }
  }

  /**
   * Clear all credentials for this application.
   * Use with caution - this removes all stored credentials.
   */
  async clearAll(): Promise<void> {
    const ids = await this.listConnectionsWithCredentials()
    await this.deleteMultiple(ids)
    log.info(`[CredentialService] Cleared all credentials (${ids.length} entries)`)
  }
}

// Singleton instance
let instance: CredentialService | null = null

export function getCredentialService(): CredentialService {
  if (!instance) {
    instance = new CredentialService()
  }
  return instance
}
