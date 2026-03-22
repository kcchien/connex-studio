import os from 'os'
import path from 'path'

// Mock Electron app (not initialized in Jest)
jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => path.join(os.homedir(), '.connex-studio')) }
}))

import { validateCertificatePath, validatePemFormat } from '@main/protocols/OpcUaAdapter'

describe('OPC UA certificate validation', () => {
  it('accepts path under home directory', () => {
    const certPath = path.join(os.homedir(), 'certs', 'client.pem')
    expect(() => validateCertificatePath(certPath)).not.toThrow()
  })

  it('rejects path traversal attempt', () => {
    expect(() => validateCertificatePath('/etc/passwd')).toThrow(/not in allowed directory/)
  })

  it('rejects path outside home directory', () => {
    // Use a known system path that is outside both homeDir and userDataDir
    expect(() => validateCertificatePath('/var/log/system.log')).toThrow(/not in allowed directory/)
  })

  it('validates PEM certificate format', () => {
    const validPem = '-----BEGIN CERTIFICATE-----\nMIIBxx...\n-----END CERTIFICATE-----'
    expect(validatePemFormat(validPem, 'certificate')).toBe(true)
  })

  it('rejects invalid PEM format', () => {
    expect(validatePemFormat('not a certificate', 'certificate')).toBe(false)
  })

  it('validates PEM private key format', () => {
    const validKey = '-----BEGIN PRIVATE KEY-----\nMIIBxx...\n-----END PRIVATE KEY-----'
    expect(validatePemFormat(validKey, 'privateKey')).toBe(true)
  })

  it('validates RSA private key format', () => {
    const validKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIBxx...\n-----END RSA PRIVATE KEY-----'
    expect(validatePemFormat(validKey, 'privateKey')).toBe(true)
  })
})
