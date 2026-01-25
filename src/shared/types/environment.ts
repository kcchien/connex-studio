/**
 * Environment type definitions for variable substitution.
 * Shared between Main and Renderer processes.
 */

// -----------------------------------------------------------------------------
// Core Environment Types
// -----------------------------------------------------------------------------

export interface Environment {
  id: string
  name: string
  variables: Record<string, string>
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

// -----------------------------------------------------------------------------
// Environment Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateEnvironmentRequest {
  name: string
  variables?: Record<string, string>
  isDefault?: boolean
}

export interface UpdateEnvironmentRequest {
  id: string
  name?: string
  variables?: Record<string, string>
}

// -----------------------------------------------------------------------------
// Variable Resolution Types
// -----------------------------------------------------------------------------

export interface VariableResolutionResult {
  resolved: string
  variables: string[]
  unresolved: string[]
}

/** Alias for VariableResolutionResult (used by IPC) */
export type ResolutionResult = VariableResolutionResult

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

/**
 * Variable name pattern: uppercase letters, digits, and underscores.
 * Must start with a letter or underscore.
 */
export const VARIABLE_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/

/**
 * Variable reference pattern: ${VAR_NAME} or ${VAR_NAME:default}
 */
export const VARIABLE_REFERENCE_PATTERN = /\$\{([A-Z_][A-Z0-9_]*)(?::([^}]*))?\}/g

/**
 * Validates a variable name
 */
export function isValidVariableName(name: string): boolean {
  return VARIABLE_NAME_PATTERN.test(name)
}
