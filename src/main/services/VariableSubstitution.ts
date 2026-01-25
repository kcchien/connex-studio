/**
 * Variable Substitution Engine
 *
 * Resolves variable references in strings using environment variables.
 * Supports ${VAR_NAME} and ${VAR_NAME:default} syntax.
 */

import { VARIABLE_REFERENCE_PATTERN } from '@shared/types'
import { getEnvironmentManager } from './EnvironmentManager'

/**
 * Result of variable resolution.
 */
export interface ResolutionResult {
  /** The resolved string with all variables substituted */
  resolved: string
  /** List of variable names that were found and resolved */
  variables: string[]
  /** List of variable names that were not found (no default) */
  unresolved: string[]
}

/**
 * Resolve variable references in a string.
 *
 * @param template - String containing ${VAR_NAME} or ${VAR_NAME:default} references
 * @param customVariables - Optional custom variables to use instead of environment
 * @returns Resolution result with resolved string and metadata
 *
 * @example
 * resolveVariables('Host: ${SERVER_HOST:localhost}')
 * // => { resolved: 'Host: 192.168.1.100', variables: ['SERVER_HOST'], unresolved: [] }
 */
export function resolveVariables(
  template: string,
  customVariables?: Record<string, string>
): ResolutionResult {
  const variables: string[] = []
  const unresolved: string[] = []

  // Get environment variables
  const envVars = customVariables ?? getEnvironmentManager().getVariables()

  // Reset regex lastIndex for global regex
  const regex = new RegExp(VARIABLE_REFERENCE_PATTERN.source, 'g')

  const resolved = template.replace(regex, (match, varName, defaultValue) => {
    variables.push(varName)

    const value = envVars[varName]
    if (value !== undefined) {
      return value
    }

    if (defaultValue !== undefined) {
      return defaultValue
    }

    unresolved.push(varName)
    return match // Keep original if no value and no default
  })

  return {
    resolved,
    variables: [...new Set(variables)],
    unresolved: [...new Set(unresolved)]
  }
}

/**
 * Resolve variables in an object recursively.
 * Only resolves string values; other types are left unchanged.
 *
 * @param obj - Object with potential variable references in string values
 * @param customVariables - Optional custom variables to use
 * @returns New object with resolved variables
 */
export function resolveObjectVariables<T extends Record<string, unknown>>(
  obj: T,
  customVariables?: Record<string, string>
): T {
  const result = {} as T

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const { resolved } = resolveVariables(value, customVariables)
      ;(result as Record<string, unknown>)[key] = resolved
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      ;(result as Record<string, unknown>)[key] = resolveObjectVariables(
        value as Record<string, unknown>,
        customVariables
      )
    } else {
      ;(result as Record<string, unknown>)[key] = value
    }
  }

  return result
}

/**
 * Extract variable names from a template without resolving them.
 *
 * @param template - String containing variable references
 * @returns List of unique variable names found
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = []
  const regex = new RegExp(VARIABLE_REFERENCE_PATTERN.source, 'g')

  let match
  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1])
  }

  return [...new Set(variables)]
}

/**
 * Validate that all required variables are present.
 *
 * @param template - String containing variable references
 * @param availableVariables - Variables that are available
 * @returns List of missing variable names
 */
export function validateVariables(
  template: string,
  availableVariables: Record<string, string>
): string[] {
  const { unresolved } = resolveVariables(template, availableVariables)
  return unresolved
}

/**
 * Check if a string contains any variable references.
 */
export function hasVariables(template: string): boolean {
  return VARIABLE_REFERENCE_PATTERN.test(template)
}
