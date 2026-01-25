/**
 * OPC UA Certificate Store
 *
 * Manages X.509 certificates for OPC UA secure connections.
 * Uses node-opcua's OPCUACertificateManager for PKI operations.
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import crypto from 'crypto'
import os from 'os'
import {
  OPCUACertificateManager,
  makeApplicationUrn
} from 'node-opcua'
import type {
  OpcUaCertificate,
  ImportCertificateRequest,
  GenerateCertificateRequest,
  CertificateValidationResult
} from '@shared/types'

// =============================================================================
// Types
// =============================================================================

/**
 * PKI folder structure following OPC UA standard.
 */
interface PKIPaths {
  root: string
  own: string           // Application certificate + private key
  trusted: string       // Trusted server certificates
  rejected: string      // Rejected certificates
  issuers: string       // Issuer CA certificates
}

// Re-export CertificateValidationResult for convenience
export type { CertificateValidationResult }

// =============================================================================
// Certificate Parsing Utilities
// =============================================================================

/**
 * Parse a DER-encoded X.509 certificate.
 */
function parseDerCertificate(buffer: Buffer): {
  subject: string
  issuer: string
  serialNumber: string
  validFrom: Date
  validTo: Date
  thumbprint: string
} {
  // Create X509Certificate from DER buffer
  const x509 = new crypto.X509Certificate(buffer)

  return {
    subject: x509.subject,
    issuer: x509.issuer,
    serialNumber: x509.serialNumber,
    validFrom: new Date(x509.validFrom),
    validTo: new Date(x509.validTo),
    thumbprint: x509.fingerprint.replace(/:/g, '').toLowerCase()
  }
}

/**
 * Parse a PEM-encoded X.509 certificate.
 */
function parsePemCertificate(pem: string): ReturnType<typeof parseDerCertificate> {
  const x509 = new crypto.X509Certificate(pem)
  return {
    subject: x509.subject,
    issuer: x509.issuer,
    serialNumber: x509.serialNumber,
    validFrom: new Date(x509.validFrom),
    validTo: new Date(x509.validTo),
    thumbprint: x509.fingerprint.replace(/:/g, '').toLowerCase()
  }
}

/**
 * Detect certificate format from file content.
 */
function detectCertificateFormat(buffer: Buffer): 'pem' | 'der' | 'pfx' | 'unknown' {
  // Check for PEM header
  const content = buffer.toString('utf-8', 0, 64)
  if (content.includes('-----BEGIN')) {
    return 'pem'
  }

  // Check for PFX/PKCS#12 magic bytes (0x30 0x82 followed by length)
  // PFX files start with ASN.1 SEQUENCE
  if (buffer[0] === 0x30 && buffer[1] === 0x82) {
    // Could be DER or PFX - check for PFX-specific OID
    // For simplicity, if it has .pfx extension or specific length, assume PFX
    // Otherwise treat as DER
    return 'der'
  }

  return 'unknown'
}

/**
 * Convert PFX to PEM format.
 */
async function extractFromPfx(
  pfxBuffer: Buffer,
  password: string
): Promise<{ certificate: string; privateKey: string }> {
  // Use openssl via child process or node-forge library
  // For now, throw error - full implementation needs additional dependency
  throw new Error(
    `PFX import requires password-protected extraction. ` +
    `Password provided: ${password ? 'yes' : 'no'}`
  )
}

// =============================================================================
// OPC UA Certificate Store
// =============================================================================

/**
 * OPC UA Certificate Store manages certificate lifecycle.
 *
 * Responsibilities:
 * - PKI folder structure management
 * - Self-signed certificate generation
 * - Certificate import/export (PEM, DER, PFX)
 * - Trusted certificate store
 * - Certificate validation
 */
export class OpcUaCertificateStore {
  private certificates: Map<string, OpcUaCertificate> = new Map()
  private paths: PKIPaths
  private certManager: OPCUACertificateManager | null = null
  private initialized = false

  private keySize: 2048 | 3072 | 4096 = 2048

  constructor(basePath?: string, keySize?: 2048 | 3072 | 4096) {
    const root = basePath ?? path.join(app.getPath('userData'), 'pki')
    this.paths = {
      root,
      own: path.join(root, 'own'),
      trusted: path.join(root, 'trusted', 'certs'),
      rejected: path.join(root, 'rejected', 'certs'),
      issuers: path.join(root, 'issuers', 'certs')
    }
    this.keySize = keySize ?? 2048
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize the certificate store and PKI folders.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Create PKI folder structure
    await fs.mkdir(this.paths.own, { recursive: true })
    await fs.mkdir(this.paths.trusted, { recursive: true })
    await fs.mkdir(this.paths.rejected, { recursive: true })
    await fs.mkdir(this.paths.issuers, { recursive: true })

    // Create private key subfolder
    await fs.mkdir(path.join(this.paths.root, 'own', 'private'), { recursive: true })

    // Initialize node-opcua certificate manager
    this.certManager = new OPCUACertificateManager({
      rootFolder: this.paths.root,
      automaticallyAcceptUnknownCertificate: false,
      name: 'ConnexStudio',
      keySize: this.keySize
    })

    await this.certManager.initialize()

    // Load certificate index
    await this.loadCertificateIndex()

    this.initialized = true
  }

  /**
   * Ensure the store is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('OpcUaCertificateStore not initialized. Call initialize() first.')
    }
  }

  // ---------------------------------------------------------------------------
  // Index Management
  // ---------------------------------------------------------------------------

  /**
   * Load certificate index from disk.
   */
  private async loadCertificateIndex(): Promise<void> {
    const indexPath = path.join(this.paths.root, 'index.json')
    try {
      const data = await fs.readFile(indexPath, 'utf-8')
      const certs = JSON.parse(data) as OpcUaCertificate[]
      for (const cert of certs) {
        this.certificates.set(cert.id, cert)
      }
    } catch {
      // Index doesn't exist yet - will be created on first save
    }
  }

  /**
   * Save certificate index to disk.
   */
  private async saveCertificateIndex(): Promise<void> {
    const indexPath = path.join(this.paths.root, 'index.json')
    const certs = Array.from(this.certificates.values())
    await fs.writeFile(indexPath, JSON.stringify(certs, null, 2))
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * List all certificates.
   */
  list(): OpcUaCertificate[] {
    return Array.from(this.certificates.values())
  }

  /**
   * List trusted certificates only.
   */
  listTrusted(): OpcUaCertificate[] {
    return this.list().filter(c => c.trusted)
  }

  /**
   * List rejected certificates only.
   */
  listRejected(): OpcUaCertificate[] {
    return this.list().filter(c => !c.trusted && !c.isApplicationCert)
  }

  /**
   * Get certificate by ID.
   */
  get(id: string): OpcUaCertificate | null {
    return this.certificates.get(id) ?? null
  }

  /**
   * Get certificate by thumbprint.
   */
  getByThumbprint(thumbprint: string): OpcUaCertificate | null {
    const normalizedThumbprint = thumbprint.toLowerCase().replace(/:/g, '')
    for (const cert of this.certificates.values()) {
      if (cert.thumbprint.toLowerCase() === normalizedThumbprint) {
        return cert
      }
    }
    return null
  }

  /**
   * Get the application certificate (for client authentication).
   */
  getApplicationCertificate(): OpcUaCertificate | null {
    for (const cert of this.certificates.values()) {
      if (cert.isApplicationCert) {
        return cert
      }
    }
    return null
  }

  /**
   * Delete a certificate.
   */
  async delete(id: string): Promise<boolean> {
    this.ensureInitialized()

    const cert = this.certificates.get(id)
    if (!cert) {
      return false
    }

    // Don't delete the application certificate
    if (cert.isApplicationCert) {
      throw new Error('Cannot delete application certificate')
    }

    // Remove certificate file
    try {
      if (existsSync(cert.path)) {
        await fs.unlink(cert.path)
      }
      if (cert.privateKeyPath && existsSync(cert.privateKeyPath)) {
        await fs.unlink(cert.privateKeyPath)
      }
    } catch (error) {
      console.error('Failed to delete certificate files:', error)
    }

    this.certificates.delete(id)
    await this.saveCertificateIndex()

    return true
  }

  // ---------------------------------------------------------------------------
  // Certificate Generation
  // ---------------------------------------------------------------------------

  /**
   * Generate a self-signed application certificate.
   */
  async generate(request: GenerateCertificateRequest): Promise<OpcUaCertificate> {
    this.ensureInitialized()

    if (!this.certManager) {
      throw new Error('Certificate manager not initialized')
    }

    // Check if application certificate already exists
    const existing = this.getApplicationCertificate()
    if (existing) {
      throw new Error('Application certificate already exists. Delete it first to regenerate.')
    }

    const id = crypto.randomUUID()
    const certPath = path.join(this.paths.own, 'certificate.der')
    const keyPath = path.join(this.paths.own, 'private', 'private_key.pem')

    // Generate certificate using node-opcua
    await this.certManager.createSelfSignedCertificate({
      subject: request.subject || `/CN=Connex Studio/O=ConnexStudio`,
      applicationUri: request.applicationUri || makeApplicationUrn(os.hostname(), 'ConnexStudio'),
      dns: [os.hostname(), 'localhost'],
      ip: ['127.0.0.1'],
      startDate: new Date(),
      validity: request.validityDays ?? 365 * 2 // 2 years default
    })

    // Read the generated certificate to extract metadata
    const certBuffer = await fs.readFile(certPath)
    const certInfo = parseDerCertificate(certBuffer)

    const cert: OpcUaCertificate = {
      id,
      subject: certInfo.subject,
      issuer: certInfo.issuer,
      serialNumber: certInfo.serialNumber,
      validFrom: certInfo.validFrom.getTime(),
      validTo: certInfo.validTo.getTime(),
      thumbprint: certInfo.thumbprint,
      path: certPath,
      privateKeyPath: keyPath,
      trusted: true,
      isApplicationCert: true
    }

    this.certificates.set(cert.id, cert)
    await this.saveCertificateIndex()

    return cert
  }

  /**
   * Regenerate the application certificate.
   */
  async regenerate(request: GenerateCertificateRequest): Promise<OpcUaCertificate> {
    this.ensureInitialized()

    // Delete existing application certificate
    const existing = this.getApplicationCertificate()
    if (existing) {
      // Mark as non-application cert so we can delete it
      existing.isApplicationCert = false
      await this.delete(existing.id)
    }

    // Generate new one
    return this.generate(request)
  }

  // ---------------------------------------------------------------------------
  // Certificate Import
  // ---------------------------------------------------------------------------

  /**
   * Import a certificate from file.
   */
  async import(request: ImportCertificateRequest): Promise<OpcUaCertificate> {
    this.ensureInitialized()

    const certBuffer = await fs.readFile(request.certificatePath)
    const format = detectCertificateFormat(certBuffer)

    let certInfo: ReturnType<typeof parseDerCertificate>
    let finalCertPath: string
    let finalKeyPath: string | undefined

    const id = crypto.randomUUID()

    switch (format) {
      case 'pem': {
        const pemContent = certBuffer.toString('utf-8')
        certInfo = parsePemCertificate(pemContent)

        // Copy PEM to trusted store
        finalCertPath = path.join(this.paths.trusted, `${id}.pem`)
        await fs.copyFile(request.certificatePath, finalCertPath)

        if (request.privateKeyPath) {
          finalKeyPath = path.join(this.paths.root, 'own', 'private', `${id}.pem`)
          await fs.copyFile(request.privateKeyPath, finalKeyPath)
        }
        break
      }

      case 'der': {
        certInfo = parseDerCertificate(certBuffer)

        // Copy DER to trusted store
        finalCertPath = path.join(this.paths.trusted, `${id}.der`)
        await fs.copyFile(request.certificatePath, finalCertPath)

        if (request.privateKeyPath) {
          finalKeyPath = path.join(this.paths.root, 'own', 'private', `${id}.pem`)
          await fs.copyFile(request.privateKeyPath, finalKeyPath)
        }
        break
      }

      case 'pfx': {
        // Extract certificate and key from PFX
        const { certificate, privateKey } = await extractFromPfx(
          certBuffer,
          request.password || ''
        )
        certInfo = parsePemCertificate(certificate)

        // Save extracted certificate
        finalCertPath = path.join(this.paths.trusted, `${id}.pem`)
        await fs.writeFile(finalCertPath, certificate)

        // Save extracted private key
        finalKeyPath = path.join(this.paths.root, 'own', 'private', `${id}.pem`)
        await fs.writeFile(finalKeyPath, privateKey)
        break
      }

      default:
        throw new Error(`Unsupported certificate format: ${format}`)
    }

    // Check for duplicate thumbprint
    const existingCert = this.getByThumbprint(certInfo.thumbprint)
    if (existingCert) {
      // Clean up copied files
      await fs.unlink(finalCertPath).catch(() => {})
      if (finalKeyPath) {
        await fs.unlink(finalKeyPath).catch(() => {})
      }
      throw new Error(`Certificate with thumbprint ${certInfo.thumbprint} already exists`)
    }

    const cert: OpcUaCertificate = {
      id,
      subject: certInfo.subject,
      issuer: certInfo.issuer,
      serialNumber: certInfo.serialNumber,
      validFrom: certInfo.validFrom.getTime(),
      validTo: certInfo.validTo.getTime(),
      thumbprint: certInfo.thumbprint,
      path: finalCertPath,
      privateKeyPath: finalKeyPath,
      trusted: false, // Imported certificates start as untrusted
      isApplicationCert: false
    }

    this.certificates.set(cert.id, cert)
    await this.saveCertificateIndex()

    return cert
  }

  /**
   * Export a certificate to file.
   */
  async export(id: string, exportPath: string): Promise<boolean> {
    this.ensureInitialized()

    const cert = this.certificates.get(id)
    if (!cert) {
      return false
    }

    // Copy certificate file to export path
    await fs.copyFile(cert.path, exportPath)
    return true
  }

  // ---------------------------------------------------------------------------
  // Trust Management
  // ---------------------------------------------------------------------------

  /**
   * Trust a certificate (move to trusted store).
   */
  async trust(id: string): Promise<OpcUaCertificate> {
    this.ensureInitialized()

    const cert = this.certificates.get(id)
    if (!cert) {
      throw new Error(`Certificate not found: ${id}`)
    }

    if (cert.trusted) {
      return cert // Already trusted
    }

    // Move file to trusted folder if not already there
    if (!cert.path.includes(this.paths.trusted)) {
      const filename = path.basename(cert.path)
      const newPath = path.join(this.paths.trusted, filename)

      // Remove from rejected folder if present
      const rejectedPath = path.join(this.paths.rejected, filename)
      if (existsSync(rejectedPath)) {
        await fs.rename(rejectedPath, newPath)
      } else {
        await fs.copyFile(cert.path, newPath)
      }

      cert.path = newPath
    }

    cert.trusted = true
    await this.saveCertificateIndex()

    return cert
  }

  /**
   * Reject a certificate (move to rejected store).
   */
  async reject(id: string): Promise<boolean> {
    this.ensureInitialized()

    const cert = this.certificates.get(id)
    if (!cert) {
      return false
    }

    // Cannot reject application certificate
    if (cert.isApplicationCert) {
      throw new Error('Cannot reject application certificate')
    }

    if (!cert.trusted && cert.path.includes(this.paths.rejected)) {
      return true // Already rejected
    }

    // Move file to rejected folder
    const filename = path.basename(cert.path)
    const newPath = path.join(this.paths.rejected, filename)

    if (!cert.path.includes(this.paths.rejected)) {
      await fs.rename(cert.path, newPath)
      cert.path = newPath
    }

    cert.trusted = false
    await this.saveCertificateIndex()

    return true
  }

  // ---------------------------------------------------------------------------
  // Certificate Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate a certificate.
   */
  validate(id: string): CertificateValidationResult {
    const cert = this.certificates.get(id)
    if (!cert) {
      return {
        valid: false,
        expired: false,
        notYetValid: false,
        selfSigned: false,
        trusted: false,
        errors: ['Certificate not found']
      }
    }

    const now = Date.now()
    const errors: string[] = []

    const expired = now > cert.validTo
    const notYetValid = now < cert.validFrom
    const selfSigned = cert.subject === cert.issuer

    if (expired) {
      errors.push('Certificate has expired')
    }

    if (notYetValid) {
      errors.push('Certificate is not yet valid')
    }

    if (!cert.trusted) {
      errors.push('Certificate is not trusted')
    }

    return {
      valid: errors.length === 0,
      expired,
      notYetValid,
      selfSigned,
      trusted: cert.trusted,
      errors
    }
  }

  /**
   * Validate certificate file without importing.
   */
  async validateFile(filePath: string): Promise<CertificateValidationResult> {
    try {
      const buffer = await fs.readFile(filePath)
      const format = detectCertificateFormat(buffer)

      let certInfo: ReturnType<typeof parseDerCertificate>

      if (format === 'pem') {
        certInfo = parsePemCertificate(buffer.toString('utf-8'))
      } else if (format === 'der') {
        certInfo = parseDerCertificate(buffer)
      } else {
        return {
          valid: false,
          expired: false,
          notYetValid: false,
          selfSigned: false,
          trusted: false,
          errors: ['Unsupported certificate format']
        }
      }

      const now = Date.now()
      const errors: string[] = []

      const validFrom = certInfo.validFrom.getTime()
      const validTo = certInfo.validTo.getTime()
      const expired = now > validTo
      const notYetValid = now < validFrom
      const selfSigned = certInfo.subject === certInfo.issuer

      if (expired) {
        errors.push('Certificate has expired')
      }

      if (notYetValid) {
        errors.push('Certificate is not yet valid')
      }

      // Check if already trusted
      const existing = this.getByThumbprint(certInfo.thumbprint)
      const trusted = existing?.trusted ?? false

      return {
        valid: !expired && !notYetValid,
        expired,
        notYetValid,
        selfSigned,
        trusted,
        errors
      }
    } catch (error) {
      return {
        valid: false,
        expired: false,
        notYetValid: false,
        selfSigned: false,
        trusted: false,
        errors: [`Failed to parse certificate: ${error}`]
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Server Certificate Discovery
  // ---------------------------------------------------------------------------

  /**
   * Get server certificate from endpoint URL.
   * This connects to the server to retrieve its certificate.
   */
  async getServerCertificate(endpointUrl: string): Promise<OpcUaCertificate | null> {
    this.ensureInitialized()

    // This would require connecting to the OPC UA server and retrieving
    // its certificate. For now, return null - this will be implemented
    // when the OPC UA connection handling is complete.
    console.log(`TODO: Retrieve certificate from ${endpointUrl}`)
    return null
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Get PKI paths.
   */
  getPaths(): PKIPaths {
    return { ...this.paths }
  }

  /**
   * Check if application certificate exists.
   */
  hasApplicationCertificate(): boolean {
    return this.getApplicationCertificate() !== null
  }

  /**
   * Get certificate manager instance for advanced operations.
   */
  getCertificateManager(): OPCUACertificateManager | null {
    return this.certManager
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: OpcUaCertificateStore | null = null

export function getOpcUaCertificateStore(): OpcUaCertificateStore {
  if (!instance) {
    instance = new OpcUaCertificateStore()
  }
  return instance
}

export function disposeOpcUaCertificateStore(): void {
  instance = null
}
