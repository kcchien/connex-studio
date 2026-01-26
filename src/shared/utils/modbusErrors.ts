/**
 * Modbus Exception Code Definitions and Utilities
 *
 * Converts Modbus exception codes to human-readable messages.
 * Based on Modbus Application Protocol Specification V1.1b3.
 */

export interface ModbusExceptionInfo {
  /** Exception code name */
  name: string
  /** Human-readable description */
  description: string
  /** Suggested action for the user */
  suggestion?: string
}

/**
 * Standard Modbus exception codes as defined in the protocol specification.
 * Codes 0x01-0x08 are standard; higher codes may be device-specific.
 */
export const MODBUS_EXCEPTIONS: Record<number, ModbusExceptionInfo> = {
  0x01: {
    name: 'Illegal Function',
    description: 'The function code received in the query is not supported.',
    suggestion: 'Check if the device supports this register type.',
  },
  0x02: {
    name: 'Illegal Data Address',
    description: 'The data address received in the query does not exist.',
    suggestion: 'Verify the address is within the valid range for this device.',
  },
  0x03: {
    name: 'Illegal Data Value',
    description: 'The value in the data field is not valid.',
    suggestion: 'Check the data type and value range.',
  },
  0x04: {
    name: 'Slave Device Failure',
    description: 'An unrecoverable error occurred while the server was processing the request.',
    suggestion: 'Check device status and try again.',
  },
  0x05: {
    name: 'Acknowledge',
    description: 'The server has accepted the request but processing will take time.',
    suggestion: 'Wait and retry the request.',
  },
  0x06: {
    name: 'Slave Device Busy',
    description: 'The server is busy processing another command.',
    suggestion: 'Wait and retry the request.',
  },
  0x07: {
    name: 'Negative Acknowledge',
    description: 'The server cannot perform the requested function.',
    suggestion: 'Check if the operation is supported.',
  },
  0x08: {
    name: 'Memory Parity Error',
    description: 'The server detected a parity error in memory.',
    suggestion: 'This may indicate a hardware problem with the device.',
  },
  0x0A: {
    name: 'Gateway Path Unavailable',
    description: 'The gateway could not establish a path to the target device.',
    suggestion: 'Check network connectivity and gateway configuration.',
  },
  0x0B: {
    name: 'Gateway Target Device Failed',
    description: 'The target device failed to respond.',
    suggestion: 'Check if the target device is online and reachable.',
  },
}

/**
 * Common connection-level error types (not Modbus protocol exceptions).
 */
export const CONNECTION_ERRORS: Record<string, ModbusExceptionInfo> = {
  ECONNREFUSED: {
    name: 'Connection Refused',
    description: 'The device refused the connection.',
    suggestion: 'Check if the device is running and the port is correct.',
  },
  ETIMEDOUT: {
    name: 'Connection Timeout',
    description: 'The connection attempt timed out.',
    suggestion: 'Check network connectivity and firewall settings.',
  },
  EHOSTUNREACH: {
    name: 'Host Unreachable',
    description: 'The device is not reachable on the network.',
    suggestion: 'Check network configuration and device IP address.',
  },
  ENOTFOUND: {
    name: 'Host Not Found',
    description: 'The hostname could not be resolved.',
    suggestion: 'Check the hostname or use an IP address instead.',
  },
  EPIPE: {
    name: 'Connection Lost',
    description: 'The connection was closed unexpectedly.',
    suggestion: 'The device may have disconnected. Try reconnecting.',
  },
  ECONNRESET: {
    name: 'Connection Reset',
    description: 'The connection was reset by the remote device.',
    suggestion: 'Check if the device restarted or try reconnecting.',
  },
}

/**
 * Get exception information for a Modbus exception code.
 */
export function getExceptionInfo(code: number): ModbusExceptionInfo {
  const info = MODBUS_EXCEPTIONS[code]

  if (info) {
    return info
  }

  // Unknown exception code
  return {
    name: `Unknown Exception (0x${code.toString(16).toUpperCase().padStart(2, '0')})`,
    description: 'An unknown exception occurred.',
    suggestion: 'Check device documentation for this error code.',
  }
}

/**
 * Get error information from an error code string (e.g., ECONNREFUSED).
 */
export function getConnectionErrorInfo(errorCode: string): ModbusExceptionInfo | null {
  return CONNECTION_ERRORS[errorCode] ?? null
}

/**
 * Parse error message and extract Modbus exception code if present.
 * Returns the exception code number or null if not a Modbus exception.
 */
export function parseModbusExceptionCode(errorMessage: string): number | null {
  // Look for patterns like "exception code: 2" or "Exception 0x02"
  const patterns = [
    /exception\s*(?:code)?[:\s]*(?:0x)?([0-9a-f]+)/i,
    /modbus\s*(?:error)?[:\s]*(?:0x)?([0-9a-f]+)/i,
    /error\s*code[:\s]*(?:0x)?([0-9a-f]+)/i,
  ]

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern)
    if (match) {
      const code = parseInt(match[1], match[1].length > 2 ? 10 : 16)
      if (!isNaN(code) && code >= 1 && code <= 255) {
        return code
      }
    }
  }

  return null
}

/**
 * Format error message with human-readable exception information.
 */
export function formatModbusError(errorMessage: string): string {
  const exceptionCode = parseModbusExceptionCode(errorMessage)

  if (exceptionCode !== null) {
    const info = getExceptionInfo(exceptionCode)
    return `${info.name}: ${info.description}`
  }

  // Check for connection errors
  const errorCodes = Object.keys(CONNECTION_ERRORS)
  for (const code of errorCodes) {
    if (errorMessage.includes(code)) {
      const info = CONNECTION_ERRORS[code]
      return `${info.name}: ${info.description}`
    }
  }

  // Return original message if no pattern matched
  return errorMessage
}

/**
 * Get full error details including suggestion.
 */
export function getFullErrorDetails(errorMessage: string): {
  name: string
  description: string
  suggestion?: string
  originalMessage: string
} {
  const exceptionCode = parseModbusExceptionCode(errorMessage)

  if (exceptionCode !== null) {
    const info = getExceptionInfo(exceptionCode)
    return {
      ...info,
      originalMessage: errorMessage,
    }
  }

  // Check for connection errors
  const errorCodes = Object.keys(CONNECTION_ERRORS)
  for (const code of errorCodes) {
    if (errorMessage.includes(code)) {
      const info = CONNECTION_ERRORS[code]
      return {
        ...info,
        originalMessage: errorMessage,
      }
    }
  }

  // Unknown error
  return {
    name: 'Error',
    description: errorMessage,
    originalMessage: errorMessage,
  }
}
