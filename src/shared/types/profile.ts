/**
 * Profile type definitions for IIoT Protocol Studio.
 * Profiles save/restore connection configurations.
 */

import type { Connection } from './connection'
import type { Tag } from './tag'

export interface Profile {
  id: string
  name: string
  version: string
  connections: Connection[]
  tags: Tag[]
  settings: ProfileSettings
  exportedAt?: number
}

export interface ProfileSettings {
  defaultPollInterval: number
  dvrBufferMinutes: number
  theme: 'light' | 'dark' | 'system'
}

export interface ProfileSummary {
  name: string
  version: string
  connectionCount: number
  tagCount: number
  exportedAt?: number
}

// Current schema version
export const PROFILE_SCHEMA_VERSION = '1.0.0'

// Default settings
export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  defaultPollInterval: 1000,
  dvrBufferMinutes: 5,
  theme: 'system'
}
