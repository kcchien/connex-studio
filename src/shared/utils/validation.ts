/**
 * Validation utilities for connection forms
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate IPv4 address format
 * Each octet must be 0-255
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false

  return parts.every((part) => {
    const num = Number(part)
    return !isNaN(num) && num >= 0 && num <= 255 && part === String(num)
  })
}

/**
 * Validate hostname format
 * Allows letters, numbers, hyphens, and dots
 * Cannot start with a hyphen
 */
export function isValidHostname(hostname: string): boolean {
  // Cannot start with hyphen
  if (hostname.startsWith('-')) return false

  // Each label cannot start or end with hyphen
  const labels = hostname.split('.')
  for (const label of labels) {
    if (label.length === 0) return false
    if (label.startsWith('-') || label.endsWith('-')) return false
    // Only allow alphanumeric and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false
  }

  return true
}

/**
 * Validate host field (IP or hostname)
 */
export function validateHost(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Host is required' }
  }

  const trimmed = value.trim()

  // Check if it's an IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) {
    if (!isValidIPv4(trimmed)) {
      return { valid: false, error: 'Invalid IP address format (each octet must be 0-255)' }
    }
    return { valid: true }
  }

  // Otherwise treat as hostname
  if (!isValidHostname(trimmed)) {
    if (trimmed.startsWith('-')) {
      return { valid: false, error: 'Hostname cannot start with a hyphen' }
    }
    return { valid: false, error: 'Invalid hostname format' }
  }

  return { valid: true }
}

/**
 * Validate port field
 * Must be a number between 1 and 65535
 */
export function validatePort(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Port is required' }
  }

  const trimmed = value.trim()

  // Only allow digits
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Port must be a number' }
  }

  const num = Number(trimmed)

  if (num < 1 || num > 65535) {
    return { valid: false, error: 'Port must be between 1 and 65535' }
  }

  return { valid: true }
}

/**
 * Filter non-numeric characters from input
 * Used for port input to prevent invalid characters
 */
export function filterNumericInput(value: string): string {
  return value.replace(/[^0-9]/g, '')
}
