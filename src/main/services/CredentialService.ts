/**
 * CredentialService
 *
 * Secure credential storage using keytar (OS-native keychain).
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (libsecret)
 *
 * Credentials are stored separately from profile JSON files to prevent
 * accidental exposure during file sharing or export.
 */

import keytar from 'keytar'
import log from 'electron-log/main.js'

const SERVICE_NAME = 'connex-studio'

export interface Credentials {
  username?: string
  password?: string
}

export interface CredentialEntry {
  connectionId: string
  credentials: Credentials
}

export class CredentialService {
  /**
   * Store credentials for a connection.
   * The connection ID is used as the account identifier.
   */
  async setCredentials(
    connectionId: string,
    credentials: Credentials
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(credentials)
      await keytar.setPassword(SERVICE_NAME, connectionId, serialized)
      log.info(`[CredentialService] Stored credentials for connection: ${connectionId}`)
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
      const serialized = await keytar.getPassword(SERVICE_NAME, connectionId)

      if (!serialized) {
        return null
      }

      return JSON.parse(serialized) as Credentials
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
      const result = await keytar.deletePassword(SERVICE_NAME, connectionId)
      if (result) {
        log.info(`[CredentialService] Deleted credentials for connection: ${connectionId}`)
      }
      return result
    } catch (error) {
      log.error(`[CredentialService] Failed to delete credentials: ${error}`)
      return false
    }
  }

  /**
   * Check if credentials exist for a connection.
   */
  async hasCredentials(connectionId: string): Promise<boolean> {
    try {
      const serialized = await keytar.getPassword(SERVICE_NAME, connectionId)
      return serialized !== null
    } catch (error) {
      log.error(`[CredentialService] Failed to check credentials: ${error}`)
      return false
    }
  }

  /**
   * List all connection IDs that have stored credentials.
   * Useful for profile import/export to know which connections need credential re-entry.
   */
  async listConnectionsWithCredentials(): Promise<string[]> {
    try {
      const credentials = await keytar.findCredentials(SERVICE_NAME)
      return credentials.map((cred) => cred.account)
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
    const updated: Credentials = {
      username: existing?.username,
      password
    }
    await this.setCredentials(connectionId, updated)
  }

  /**
   * Bulk delete credentials for multiple connections.
   * Used when deleting a profile or clearing all data.
   */
  async deleteMultiple(connectionIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      connectionIds.map((id) => this.deleteCredentials(id))
    )

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      log.warn(`[CredentialService] Failed to delete ${failed.length} credentials`)
    }
  }

  /**
   * Clear all credentials for this application.
   * Use with caution - this removes all stored credentials.
   */
  async clearAll(): Promise<void> {
    try {
      const connectionIds = await this.listConnectionsWithCredentials()
      await this.deleteMultiple(connectionIds)
      log.info(`[CredentialService] Cleared all credentials (${connectionIds.length} entries)`)
    } catch (error) {
      log.error(`[CredentialService] Failed to clear all credentials: ${error}`)
      throw error
    }
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
