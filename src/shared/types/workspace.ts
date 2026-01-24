/**
 * Workspace type definitions for configuration export/import.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Export/Import Types
// -----------------------------------------------------------------------------

export interface ExportWorkspaceRequest {
  includeConnections?: boolean
  includeEnvironments?: boolean
  includeBridges?: boolean
  includeDashboards?: boolean
  includeAlertRules?: boolean
  includeTags?: boolean
}

export interface ImportWorkspaceResult {
  success: boolean
  imported: ImportedCounts
  warnings: string[]
  errors: string[]
}

export interface ImportedCounts {
  environments: number
  connections: number
  tags: number
  bridges: number
  dashboards: number
  alertRules: number
}

// -----------------------------------------------------------------------------
// Validation Types
// -----------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
}

export interface ValidationError {
  path: string
  message: string
}

// -----------------------------------------------------------------------------
// Workspace Metadata
// -----------------------------------------------------------------------------

export interface WorkspaceMeta {
  name: string
  author?: string
  version?: string
  exportedAt: string
  connexVersion: string
  schemaVersion: number
}

// -----------------------------------------------------------------------------
// Current Schema Version
// -----------------------------------------------------------------------------

export const WORKSPACE_SCHEMA_VERSION = 2
