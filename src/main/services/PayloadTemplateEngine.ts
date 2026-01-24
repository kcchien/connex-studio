/**
 * Payload Template Engine
 *
 * Resolves template strings with tag values for bridge payloads.
 * Supports ${value}, ${timestamp}, ${tagName}, ${connectionId}, and ${tags.NAME.value} syntax.
 */

import type { Tag } from '@shared/types'

/**
 * Context data for template resolution.
 */
export interface TemplateContext {
  /** Current tag value */
  value: unknown
  /** Current timestamp (Unix ms) */
  timestamp: number
  /** Tag name */
  tagName: string
  /** Connection ID */
  connectionId: string
  /** All available tags with their current values */
  tags?: Record<string, { value: unknown; quality?: string }>
  /** Tag metadata */
  tag?: Tag
}

/**
 * Result of template resolution.
 */
export interface TemplateResult {
  /** The resolved string */
  resolved: string
  /** Whether resolution was successful */
  success: boolean
  /** Error message if resolution failed */
  error?: string
}

/**
 * Pattern for simple variable references: ${variable}
 */
const SIMPLE_VAR_PATTERN = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g

/**
 * Pattern for nested variable references: ${tags.NAME.value}
 */
const NESTED_VAR_PATTERN = /\$\{tags\.([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g

/**
 * Pattern for tag metadata references: ${tag.property}
 */
const TAG_METADATA_PATTERN = /\$\{tag\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g

/**
 * Resolve a template string with the given context.
 *
 * @param template - Template string containing ${...} references
 * @param context - Context data for variable resolution
 * @returns Resolved template result
 *
 * @example
 * resolveTemplate('{"value": ${value}, "ts": ${timestamp}}', {
 *   value: 42,
 *   timestamp: 1704067200000,
 *   tagName: 'temperature',
 *   connectionId: 'conn-1'
 * })
 * // => { resolved: '{"value": 42, "ts": 1704067200000}', success: true }
 *
 * @example
 * resolveTemplate('${tags.TEMP.value} at ${tags.HUMID.value}%', {
 *   value: 0,
 *   timestamp: Date.now(),
 *   tagName: 'x',
 *   connectionId: 'c1',
 *   tags: { TEMP: { value: 25 }, HUMID: { value: 60 } }
 * })
 * // => { resolved: '25 at 60%', success: true }
 */
export function resolveTemplate(
  template: string,
  context: TemplateContext
): TemplateResult {
  try {
    let resolved = template

    // Resolve nested tag references first: ${tags.NAME.value}
    resolved = resolved.replace(NESTED_VAR_PATTERN, (match, tagName, property) => {
      if (!context.tags) {
        return match // Keep unresolved if no tags available
      }

      const tagData = context.tags[tagName]
      if (!tagData) {
        return match // Keep unresolved if tag not found
      }

      const propValue = (tagData as Record<string, unknown>)[property]
      if (propValue === undefined) {
        return match // Keep unresolved if property not found
      }

      return formatValue(propValue)
    })

    // Resolve tag metadata references: ${tag.property}
    resolved = resolved.replace(TAG_METADATA_PATTERN, (match, property) => {
      if (!context.tag) {
        return match
      }

      const propValue = (context.tag as unknown as Record<string, unknown>)[property]
      if (propValue === undefined) {
        return match
      }

      return formatValue(propValue)
    })

    // Resolve simple variable references: ${variable}
    resolved = resolved.replace(SIMPLE_VAR_PATTERN, (match, varName) => {
      switch (varName) {
        case 'value':
          return formatValue(context.value)
        case 'timestamp':
          return String(context.timestamp)
        case 'tagName':
          return context.tagName
        case 'connectionId':
          return context.connectionId
        case 'isoTimestamp':
          return new Date(context.timestamp).toISOString()
        case 'quality':
          return context.tags?.[context.tagName]?.quality ?? 'good'
        default:
          return match // Keep unresolved
      }
    })

    return { resolved, success: true }
  } catch (error) {
    return {
      resolved: template,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Resolve a topic template with the given context.
 * This is a convenience wrapper that handles topic-specific formatting.
 *
 * @param topicTemplate - Topic template string
 * @param context - Context data
 * @returns Resolved topic string
 */
export function resolveTopic(topicTemplate: string, context: TemplateContext): string {
  const result = resolveTemplate(topicTemplate, context)
  if (!result.success) {
    // Fallback to a safe topic if resolution fails
    return `connex/${context.connectionId}/${context.tagName}`
  }

  // Clean up topic: remove trailing slashes, replace multiple slashes
  return result.resolved
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/^\//, '')
}

/**
 * Resolve a payload template with the given context.
 * Validates that the result is valid JSON if it looks like JSON.
 *
 * @param payloadTemplate - Payload template string
 * @param context - Context data
 * @returns Resolved payload result
 */
export function resolvePayload(
  payloadTemplate: string,
  context: TemplateContext
): TemplateResult {
  const result = resolveTemplate(payloadTemplate, context)

  if (!result.success) {
    return result
  }

  // If template looks like JSON, validate it
  const trimmed = result.resolved.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
    } catch {
      return {
        resolved: result.resolved,
        success: false,
        error: 'Invalid JSON in resolved payload'
      }
    }
  }

  return result
}

/**
 * Format a value for inclusion in a template.
 * Handles various types appropriately.
 */
function formatValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (typeof value === 'string') {
    // Don't double-quote strings when embedding in JSON templates
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Extract variable names from a template.
 * Useful for validation and documentation.
 *
 * @param template - Template string
 * @returns List of variable references found
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = []

  // Simple variables
  const simpleMatches = template.matchAll(SIMPLE_VAR_PATTERN)
  for (const match of simpleMatches) {
    variables.push(match[1])
  }

  // Nested tag references
  const nestedMatches = template.matchAll(NESTED_VAR_PATTERN)
  for (const match of nestedMatches) {
    variables.push(`tags.${match[1]}.${match[2]}`)
  }

  // Tag metadata references
  const metadataMatches = template.matchAll(TAG_METADATA_PATTERN)
  for (const match of metadataMatches) {
    variables.push(`tag.${match[1]}`)
  }

  return [...new Set(variables)]
}

/**
 * Validate a template string.
 * Checks for common issues without resolving.
 *
 * @param template - Template string to validate
 * @returns Validation result
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for unclosed braces
  const openBraces = (template.match(/\$\{/g) || []).length
  const closeBraces = (template.match(/\}/g) || []).length

  if (openBraces !== closeBraces) {
    errors.push('Mismatched braces in template')
  }

  // Check for empty variable references
  if (/\$\{\s*\}/.test(template)) {
    errors.push('Empty variable reference found')
  }

  // Validate JSON structure if it looks like JSON
  const trimmed = template.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Replace all ${...} with placeholder values for JSON validation
    const testString = trimmed
      .replace(/\$\{[^}]+\}/g, '"__placeholder__"')
      // Also handle numeric placeholders
      .replace(/"(\d+)"/g, '$1')

    try {
      JSON.parse(testString)
    } catch {
      errors.push('Template structure is not valid JSON')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
