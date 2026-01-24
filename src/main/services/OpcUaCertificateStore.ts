/**
 * OPC UA Certificate Store
 *
 * Manages X.509 certificates for OPC UA secure connections.
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import type {
  OpcUaCertificate,
  ImportCertificateRequest,
  GenerateCertificateRequest
} from '@shared/types'

/**
 * PKI folder structure.
 */
interface PKIPaths {
  root: string
  own: string
  trusted: string
  rejected: string
  issuers: string
}

/**
 * OPC UA Certificate Store manages certificate lifecycle.
 */
export class OpcUaCertificateStore {
  private certificates: Map<string, OpcUaCertificate> = new Map()
  private paths: PKIPaths

  constructor(basePath?: string) {
    const root = basePath ?? path.join(app.getPath('userData'), 'pki')
    this.paths = {
      root,
      own: path.join(root, 'own'),
      trusted: path.join(root, 'trusted'),
      rejected: path.join(root, 'rejected'),
      issuers: path.join(root, 'issuers')
    }
  }

  /**
   * Initialize the certificate store and PKI folders.
   */
  async initialize(): Promise<void> {
    // Create PKI folder structure
    await fs.mkdir(this.paths.own, { recursive: true })
    await fs.mkdir(this.paths.trusted, { recursive: true })
    await fs.mkdir(this.paths.rejected, { recursive: true })
    await fs.mkdir(this.paths.issuers, { recursive: true })

    // Load certificate index
    await this.loadCertificateIndex()
  }

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
      // Index doesn't exist yet
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

  /**
   * List all certificates.
   */
  list(): OpcUaCertificate[] {
    return Array.from(this.certificates.values())
  }

  /**
   * Get certificate by ID.
   */
  get(id: string): OpcUaCertificate | null {
    return this.certificates.get(id) ?? null
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
   * Import a certificate from file.
   */
  async import(request: ImportCertificateRequest): Promise<OpcUaCertificate> {
    // TODO: Parse certificate file to extract metadata
    // For now, create a placeholder
    const cert: OpcUaCertificate = {
      id: crypto.randomUUID(),
      subject: 'Imported Certificate',
      issuer: 'Unknown',
      serialNumber: Date.now().toString(16),
      validFrom: Date.now(),
      validTo: Date.now() + 365 * 24 * 60 * 60 * 1000,
      thumbprint: crypto.randomUUID().replace(/-/g, ''),
      path: request.certificatePath,
      privateKeyPath: request.privateKeyPath,
      trusted: false,
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
    const cert = this.certificates.get(id)
    if (!cert) {
      return false
    }

    // Copy certificate file to export path
    await fs.copyFile(cert.path, exportPath)
    return true
  }

  /**
   * Delete a certificate.
   */
  async delete(id: string): Promise<boolean> {
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
      await fs.unlink(cert.path)
      if (cert.privateKeyPath) {
        await fs.unlink(cert.privateKeyPath)
      }
    } catch {
      // File may not exist
    }

    this.certificates.delete(id)
    await this.saveCertificateIndex()

    return true
  }

  /**
   * Generate a self-signed certificate.
   */
  async generate(request: GenerateCertificateRequest): Promise<OpcUaCertificate> {
    // TODO: Use node-opcua to generate certificate
    // For now, create a placeholder
    const id = crypto.randomUUID()
    const certPath = path.join(this.paths.own, `${id}.der`)
    const keyPath = path.join(this.paths.own, `${id}.pem`)

    const cert: OpcUaCertificate = {
      id,
      subject: request.subject,
      issuer: request.subject, // Self-signed
      serialNumber: Date.now().toString(16),
      validFrom: Date.now(),
      validTo: Date.now() + (request.validityDays ?? 365) * 24 * 60 * 60 * 1000,
      thumbprint: crypto.randomUUID().replace(/-/g, ''),
      path: certPath,
      privateKeyPath: keyPath,
      trusted: true,
      isApplicationCert: true
    }

    // TODO: Actually generate the certificate files

    this.certificates.set(cert.id, cert)
    await this.saveCertificateIndex()

    return cert
  }

  /**
   * Trust a certificate (move to trusted store).
   */
  async trust(id: string): Promise<OpcUaCertificate> {
    const cert = this.certificates.get(id)
    if (!cert) {
      throw new Error(`Certificate not found: ${id}`)
    }

    cert.trusted = true
    await this.saveCertificateIndex()

    return cert
  }

  /**
   * Reject a certificate (move to rejected store).
   */
  async reject(id: string): Promise<boolean> {
    const cert = this.certificates.get(id)
    if (!cert) {
      return false
    }

    cert.trusted = false
    await this.saveCertificateIndex()

    return true
  }

  /**
   * Get server certificate from endpoint.
   */
  async getServerCertificate(_endpointUrl: string): Promise<OpcUaCertificate | null> {
    // TODO: Connect to server and retrieve certificate
    return null
  }

  /**
   * Get PKI paths.
   */
  getPaths(): PKIPaths {
    return { ...this.paths }
  }
}

// Singleton instance
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
