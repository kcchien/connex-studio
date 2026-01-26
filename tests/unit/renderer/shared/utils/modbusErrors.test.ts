import { describe, it, expect } from 'vitest'
import {
  getExceptionInfo,
  getConnectionErrorInfo,
  parseModbusExceptionCode,
  formatModbusError,
  getFullErrorDetails,
  MODBUS_EXCEPTIONS,
  CONNECTION_ERRORS
} from '@shared/utils/modbusErrors'

describe('modbusErrors', () => {
  describe('getExceptionInfo', () => {
    it('returns info for standard exception codes', () => {
      expect(getExceptionInfo(0x01)).toEqual({
        name: 'Illegal Function',
        description: 'The function code received in the query is not supported.',
        suggestion: 'Check if the device supports this register type.',
      })

      expect(getExceptionInfo(0x02)).toEqual({
        name: 'Illegal Data Address',
        description: 'The data address received in the query does not exist.',
        suggestion: 'Verify the address is within the valid range for this device.',
      })

      expect(getExceptionInfo(0x04)).toEqual({
        name: 'Slave Device Failure',
        description: 'An unrecoverable error occurred while the server was processing the request.',
        suggestion: 'Check device status and try again.',
      })
    })

    it('returns info for gateway exception codes', () => {
      expect(getExceptionInfo(0x0A)).toEqual({
        name: 'Gateway Path Unavailable',
        description: 'The gateway could not establish a path to the target device.',
        suggestion: 'Check network connectivity and gateway configuration.',
      })

      expect(getExceptionInfo(0x0B)).toEqual({
        name: 'Gateway Target Device Failed',
        description: 'The target device failed to respond.',
        suggestion: 'Check if the target device is online and reachable.',
      })
    })

    it('returns unknown exception info for unrecognized codes', () => {
      const info = getExceptionInfo(0xFF)
      expect(info.name).toBe('Unknown Exception (0xFF)')
      expect(info.description).toBe('An unknown exception occurred.')
    })
  })

  describe('getConnectionErrorInfo', () => {
    it('returns info for known connection errors', () => {
      expect(getConnectionErrorInfo('ECONNREFUSED')).toEqual({
        name: 'Connection Refused',
        description: 'The device refused the connection.',
        suggestion: 'Check if the device is running and the port is correct.',
      })

      expect(getConnectionErrorInfo('ETIMEDOUT')).toEqual({
        name: 'Connection Timeout',
        description: 'The connection attempt timed out.',
        suggestion: 'Check network connectivity and firewall settings.',
      })
    })

    it('returns null for unknown error codes', () => {
      expect(getConnectionErrorInfo('UNKNOWN_ERROR')).toBeNull()
    })
  })

  describe('parseModbusExceptionCode', () => {
    it('parses "exception code: X" format', () => {
      expect(parseModbusExceptionCode('Modbus exception code: 2')).toBe(2)
      expect(parseModbusExceptionCode('exception code: 1')).toBe(1)
    })

    it('parses "exception 0xXX" format', () => {
      expect(parseModbusExceptionCode('Exception 0x02')).toBe(2)
      expect(parseModbusExceptionCode('modbus error 0x0B')).toBe(11)
    })

    it('parses "error code: X" format', () => {
      expect(parseModbusExceptionCode('error code: 4')).toBe(4)
      expect(parseModbusExceptionCode('Error code: 0x03')).toBe(3)
    })

    it('returns null for non-Modbus errors', () => {
      expect(parseModbusExceptionCode('Connection refused')).toBeNull()
      expect(parseModbusExceptionCode('Timeout')).toBeNull()
      expect(parseModbusExceptionCode('Random error message')).toBeNull()
    })
  })

  describe('formatModbusError', () => {
    it('formats Modbus exception errors', () => {
      expect(formatModbusError('Modbus exception code: 2')).toBe(
        'Illegal Data Address: The data address received in the query does not exist.'
      )
    })

    it('formats connection errors', () => {
      expect(formatModbusError('Error: ECONNREFUSED')).toBe(
        'Connection Refused: The device refused the connection.'
      )
    })

    it('returns original message for unknown errors', () => {
      const message = 'Some unknown error'
      expect(formatModbusError(message)).toBe(message)
    })
  })

  describe('getFullErrorDetails', () => {
    it('returns full details for Modbus exceptions', () => {
      const details = getFullErrorDetails('Modbus exception code: 2')
      expect(details.name).toBe('Illegal Data Address')
      expect(details.description).toBe('The data address received in the query does not exist.')
      expect(details.suggestion).toBe('Verify the address is within the valid range for this device.')
      expect(details.originalMessage).toBe('Modbus exception code: 2')
    })

    it('returns full details for connection errors', () => {
      const details = getFullErrorDetails('Error: ETIMEDOUT')
      expect(details.name).toBe('Connection Timeout')
      expect(details.description).toBe('The connection attempt timed out.')
      expect(details.suggestion).toBe('Check network connectivity and firewall settings.')
    })

    it('returns original message for unknown errors', () => {
      const message = 'Some unknown error'
      const details = getFullErrorDetails(message)
      expect(details.name).toBe('Error')
      expect(details.description).toBe(message)
      expect(details.originalMessage).toBe(message)
    })
  })

  describe('MODBUS_EXCEPTIONS constant', () => {
    it('has all standard exception codes', () => {
      expect(MODBUS_EXCEPTIONS[0x01]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x02]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x03]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x04]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x05]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x06]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x07]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x08]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x0A]).toBeDefined()
      expect(MODBUS_EXCEPTIONS[0x0B]).toBeDefined()
    })
  })

  describe('CONNECTION_ERRORS constant', () => {
    it('has common connection error codes', () => {
      expect(CONNECTION_ERRORS['ECONNREFUSED']).toBeDefined()
      expect(CONNECTION_ERRORS['ETIMEDOUT']).toBeDefined()
      expect(CONNECTION_ERRORS['EHOSTUNREACH']).toBeDefined()
      expect(CONNECTION_ERRORS['ENOTFOUND']).toBeDefined()
      expect(CONNECTION_ERRORS['EPIPE']).toBeDefined()
      expect(CONNECTION_ERRORS['ECONNRESET']).toBeDefined()
    })
  })
})
