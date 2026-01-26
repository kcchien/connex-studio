/**
 * Modbus traditional address parsing utilities.
 *
 * Traditional Modbus addressing uses 5-digit numbers:
 * - 00001-09999 or 1-9999: Coils (read/write bits)
 * - 10001-19999: Discrete Inputs (read-only bits)
 * - 30001-39999: Input Registers (read-only 16-bit)
 * - 40001-49999: Holding Registers (read/write 16-bit)
 *
 * The protocol address is 0-based, so:
 * - 40001 → Holding Register address 0
 * - 40100 → Holding Register address 99
 */

export type ModbusRegisterType = 'coil' | 'discrete' | 'input' | 'holding'

export interface ParsedModbusAddress {
  registerType: ModbusRegisterType
  address: number // 0-based protocol address
  traditional: number // Original traditional address
}

export interface ModbusAddressValidation {
  valid: boolean
  error?: string
  parsed?: ParsedModbusAddress
}

/**
 * Parse a traditional Modbus address string into its components.
 *
 * @param input - Traditional address string (e.g., "40001", "30050")
 * @returns Parsed address or null if invalid
 */
export function parseTraditionalAddress(input: string): ParsedModbusAddress | null {
  const trimmed = input.trim()

  // Only allow digits
  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const num = parseInt(trimmed, 10)

  if (isNaN(num) || num < 1) {
    return null
  }

  // Holding Registers: 40001-49999
  if (num >= 40001 && num <= 49999) {
    return {
      registerType: 'holding',
      address: num - 40001,
      traditional: num
    }
  }

  // Input Registers: 30001-39999
  if (num >= 30001 && num <= 39999) {
    return {
      registerType: 'input',
      address: num - 30001,
      traditional: num
    }
  }

  // Discrete Inputs: 10001-19999
  if (num >= 10001 && num <= 19999) {
    return {
      registerType: 'discrete',
      address: num - 10001,
      traditional: num
    }
  }

  // Coils: 00001-09999 or 1-9999
  if (num >= 1 && num <= 9999) {
    return {
      registerType: 'coil',
      address: num - 1,
      traditional: num
    }
  }

  // Address out of valid ranges
  return null
}

/**
 * Convert a register type and 0-based address to traditional Modbus address.
 *
 * @param registerType - The type of register
 * @param address - 0-based protocol address
 * @returns Traditional address number
 */
export function toTraditionalAddress(registerType: ModbusRegisterType, address: number): number {
  switch (registerType) {
    case 'holding':
      return 40001 + address
    case 'input':
      return 30001 + address
    case 'discrete':
      return 10001 + address
    case 'coil':
      return 1 + address
  }
}

/**
 * Validate a traditional Modbus address with detailed error messages.
 *
 * @param input - Traditional address string
 * @returns Validation result with parsed address if valid
 */
export function validateModbusAddress(input: string): ModbusAddressValidation {
  if (!input || input.trim() === '') {
    return { valid: false, error: 'Address is required' }
  }

  const trimmed = input.trim()

  // Only allow digits
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Address must contain only digits' }
  }

  const num = parseInt(trimmed, 10)

  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number format' }
  }

  if (num < 1) {
    return { valid: false, error: 'Address must be at least 1' }
  }

  // Check valid ranges
  const parsed = parseTraditionalAddress(trimmed)

  if (!parsed) {
    // Provide specific error based on the number
    if (num >= 50000) {
      return { valid: false, error: 'Address too large (max 49999 for holding registers)' }
    }
    if (num >= 20000 && num < 30001) {
      return { valid: false, error: 'Invalid range (20000-30000 is not a valid Modbus address range)' }
    }
    return { valid: false, error: 'Address out of valid Modbus range' }
  }

  return { valid: true, parsed }
}

/**
 * Get a human-readable description of a parsed address.
 *
 * @param parsed - Parsed address
 * @returns Description string (e.g., "Holding Register, address 0")
 */
export function getAddressDescription(parsed: ParsedModbusAddress): string {
  const typeNames: Record<ModbusRegisterType, string> = {
    holding: 'Holding Register',
    input: 'Input Register',
    discrete: 'Discrete Input',
    coil: 'Coil'
  }

  return `${typeNames[parsed.registerType]}, address ${parsed.address}`
}

/**
 * Check if two addresses are in the same register type (for range validation).
 *
 * @param addr1 - First parsed address
 * @param addr2 - Second parsed address
 * @returns True if same register type
 */
export function isSameRegisterType(
  addr1: ParsedModbusAddress,
  addr2: ParsedModbusAddress
): boolean {
  return addr1.registerType === addr2.registerType
}

/**
 * Calculate the number of addresses in a range (inclusive).
 *
 * @param start - Start address (traditional)
 * @param end - End address (traditional)
 * @returns Number of addresses, or -1 if invalid range
 */
export function calculateRangeCount(start: ParsedModbusAddress, end: ParsedModbusAddress): number {
  if (!isSameRegisterType(start, end)) {
    return -1
  }

  if (start.address > end.address) {
    return -1
  }

  return end.address - start.address + 1
}
