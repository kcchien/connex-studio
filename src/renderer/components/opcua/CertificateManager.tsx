/**
 * CertificateManager - OPC UA X.509 Certificate Management UI
 *
 * Features:
 * - List application and trusted certificates
 * - Generate self-signed certificates
 * - Import certificates (PEM/DER)
 * - Export certificates
 * - Trust/Reject certificates
 * - View certificate details
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  ShieldX,
  Plus,
  Import,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  FileKey,
  Info,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { opcuaApi } from '@renderer/lib/ipc'
import type {
  OpcUaCertificate,
  GenerateCertificateRequest
} from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface CertificateManagerProps {
  className?: string
  onCertificateChange?: () => void
}

type TabType = 'application' | 'trusted' | 'rejected'

// =============================================================================
// CertificateManager Component
// =============================================================================

export function CertificateManager({
  className,
  onCertificateChange
}: CertificateManagerProps): React.ReactElement {
  const [certificates, setCertificates] = useState<OpcUaCertificate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('application')
  const [selectedCert, setSelectedCert] = useState<OpcUaCertificate | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Load certificates
  const loadCertificates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const certs = await opcuaApi.listCertificates()
      setCertificates(certs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCertificates()
  }, [loadCertificates])

  // Filter certificates by tab
  const filteredCertificates = certificates.filter(cert => {
    switch (activeTab) {
      case 'application':
        return cert.isApplicationCert
      case 'trusted':
        return cert.trusted && !cert.isApplicationCert
      case 'rejected':
        return !cert.trusted && !cert.isApplicationCert
      default:
        return true
    }
  })

  // Get application certificate
  const applicationCert = certificates.find(c => c.isApplicationCert)

  // Handle generate certificate
  const handleGenerate = async (request: GenerateCertificateRequest) => {
    setGenerating(true)
    setError(null)
    try {
      await opcuaApi.generateCertificate(request)
      await loadCertificates()
      setShowGenerateDialog(false)
      onCertificateChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  // Handle trust certificate
  const handleTrust = async (id: string) => {
    setError(null)
    try {
      await opcuaApi.trustCertificate(id)
      await loadCertificates()
      onCertificateChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trust certificate')
    }
  }

  // Handle reject certificate
  const handleReject = async (id: string) => {
    setError(null)
    try {
      await opcuaApi.rejectCertificate(id)
      await loadCertificates()
      onCertificateChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject certificate')
    }
  }

  // Handle delete certificate
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {
      return
    }
    setError(null)
    try {
      await opcuaApi.deleteCertificate(id)
      await loadCertificates()
      setSelectedCert(null)
      onCertificateChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete certificate')
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Certificate Manager</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            disabled={!!applicationCert}
            title={applicationCert ? 'Application certificate already exists' : 'Generate new certificate'}
          >
            <Plus className="h-4 w-4" />
            Generate
          </button>
          <button
            onClick={loadCertificates}
            className="p-1.5 rounded-md hover:bg-muted"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mx-4 mt-4 bg-destructive/10 text-destructive rounded-md">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <TabButton
          active={activeTab === 'application'}
          onClick={() => setActiveTab('application')}
          icon={<FileKey className="h-4 w-4" />}
          label="Application"
          count={certificates.filter(c => c.isApplicationCert).length}
        />
        <TabButton
          active={activeTab === 'trusted'}
          onClick={() => setActiveTab('trusted')}
          icon={<ShieldCheck className="h-4 w-4 text-green-500" />}
          label="Trusted"
          count={certificates.filter(c => c.trusted && !c.isApplicationCert).length}
        />
        <TabButton
          active={activeTab === 'rejected'}
          onClick={() => setActiveTab('rejected')}
          icon={<ShieldX className="h-4 w-4 text-red-500" />}
          label="Rejected"
          count={certificates.filter(c => !c.trusted && !c.isApplicationCert).length}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Certificate List */}
        <div className="w-1/2 border-r overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Info className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {activeTab === 'application'
                  ? 'No application certificate. Click Generate to create one.'
                  : `No ${activeTab} certificates`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCertificates.map(cert => (
                <CertificateCard
                  key={cert.id}
                  certificate={cert}
                  selected={selectedCert?.id === cert.id}
                  onClick={() => setSelectedCert(cert)}
                  onTrust={() => handleTrust(cert.id)}
                  onReject={() => handleReject(cert.id)}
                  onDelete={() => handleDelete(cert.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Certificate Details */}
        <div className="w-1/2 overflow-auto p-4">
          {selectedCert ? (
            <CertificateDetails certificate={selectedCert} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Info className="h-8 w-8 mb-2" />
              <p className="text-sm">Select a certificate to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate Dialog */}
      {showGenerateDialog && (
        <GenerateCertificateDialog
          onClose={() => setShowGenerateDialog(false)}
          onGenerate={handleGenerate}
          loading={generating}
        />
      )}
    </div>
  )
}

// =============================================================================
// TabButton Component
// =============================================================================

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {icon}
      {label}
      <span className={cn(
        'px-1.5 py-0.5 text-xs rounded-full',
        active ? 'bg-primary/20' : 'bg-muted'
      )}>
        {count}
      </span>
    </button>
  )
}

// =============================================================================
// CertificateCard Component
// =============================================================================

interface CertificateCardProps {
  certificate: OpcUaCertificate
  selected: boolean
  onClick: () => void
  onTrust: () => void
  onReject: () => void
  onDelete: () => void
}

function CertificateCard({
  certificate,
  selected,
  onClick,
  onTrust,
  onReject,
  onDelete
}: CertificateCardProps): React.ReactElement {
  const isExpired = Date.now() > certificate.validTo
  const expiresIn = Math.ceil((certificate.validTo - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-md border cursor-pointer transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {certificate.isApplicationCert ? (
            <FileKey className="h-5 w-5 text-primary" />
          ) : certificate.trusted ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldX className="h-5 w-5 text-red-500" />
          )}
          <div>
            <p className="font-medium text-sm truncate max-w-[200px]">
              {extractCN(certificate.subject)}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {certificate.thumbprint.slice(0, 20)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!certificate.isApplicationCert && (
            <>
              {!certificate.trusted && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTrust() }}
                  className="p-1 rounded hover:bg-green-500/20 text-green-600"
                  title="Trust certificate"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
              {certificate.trusted && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReject() }}
                  className="p-1 rounded hover:bg-red-500/20 text-red-600"
                  title="Reject certificate"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1 rounded hover:bg-destructive/20 text-destructive"
                title="Delete certificate"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expiration Status */}
      <div className="mt-2 flex items-center gap-1">
        {isExpired ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600">
            Expired
          </span>
        ) : expiresIn < 30 ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
            Expires in {expiresIn} days
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">
            Valid
          </span>
        )}
        {certificate.isApplicationCert && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
            Application
          </span>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// CertificateDetails Component
// =============================================================================

interface CertificateDetailsProps {
  certificate: OpcUaCertificate
}

function CertificateDetails({ certificate }: CertificateDetailsProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Certificate Details</h3>
        <div className="flex gap-2">
          {certificate.isApplicationCert ? (
            <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
              Application Certificate
            </span>
          ) : certificate.trusted ? (
            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-600">
              Trusted
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-600">
              Rejected
            </span>
          )}
        </div>
      </div>

      {/* Subject */}
      <DetailSection
        title="Subject"
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      >
        <DetailRow label="Common Name (CN)" value={extractCN(certificate.subject)} />
        <DetailRow label="Full Subject" value={certificate.subject} className="break-all" />
      </DetailSection>

      {/* Issuer */}
      <DetailSection title="Issuer">
        <DetailRow label="Common Name (CN)" value={extractCN(certificate.issuer)} />
        <DetailRow label="Full Issuer" value={certificate.issuer} className="break-all" />
        {certificate.subject === certificate.issuer && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">
            Self-signed
          </span>
        )}
      </DetailSection>

      {/* Validity */}
      <DetailSection title="Validity Period">
        <DetailRow
          label="Valid From"
          value={new Date(certificate.validFrom).toLocaleString()}
        />
        <DetailRow
          label="Valid To"
          value={new Date(certificate.validTo).toLocaleString()}
        />
        <ValidityStatus validTo={certificate.validTo} />
      </DetailSection>

      {/* Identifiers */}
      <DetailSection title="Identifiers">
        <DetailRow label="Serial Number" value={certificate.serialNumber} />
        <DetailRow label="Thumbprint (SHA-1)" value={certificate.thumbprint} className="font-mono text-xs break-all" />
      </DetailSection>

      {/* File Paths */}
      <DetailSection title="Storage">
        <DetailRow label="Certificate Path" value={certificate.path} className="text-xs break-all" />
        {certificate.privateKeyPath && (
          <DetailRow label="Private Key Path" value={certificate.privateKeyPath} className="text-xs break-all" />
        )}
      </DetailSection>
    </div>
  )
}

// =============================================================================
// DetailSection Component
// =============================================================================

interface DetailSectionProps {
  title: string
  children: React.ReactNode
  expanded?: boolean
  onToggle?: () => void
}

function DetailSection({
  title,
  children,
  expanded = true,
  onToggle
}: DetailSectionProps): React.ReactElement {
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 text-sm font-medium hover:bg-muted"
      >
        {title}
        {onToggle && (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
      </button>
      {expanded && (
        <div className="p-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// DetailRow Component
// =============================================================================

interface DetailRowProps {
  label: string
  value: string
  className?: string
}

function DetailRow({ label, value, className }: DetailRowProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm', className)}>{value}</span>
    </div>
  )
}

// =============================================================================
// ValidityStatus Component
// =============================================================================

interface ValidityStatusProps {
  validTo: number
}

function ValidityStatus({ validTo }: ValidityStatusProps): React.ReactElement {
  const now = Date.now()
  const isExpired = now > validTo
  const daysRemaining = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24))

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-red-600 text-sm">
        <XCircle className="h-4 w-4" />
        Certificate has expired
      </div>
    )
  }

  if (daysRemaining < 30) {
    return (
      <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded text-amber-600 text-sm">
        <AlertTriangle className="h-4 w-4" />
        Expires in {daysRemaining} days
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-green-600 text-sm">
      <CheckCircle className="h-4 w-4" />
      Valid for {daysRemaining} days
    </div>
  )
}

// =============================================================================
// GenerateCertificateDialog Component
// =============================================================================

interface GenerateCertificateDialogProps {
  onClose: () => void
  onGenerate: (request: GenerateCertificateRequest) => void
  loading: boolean
}

function GenerateCertificateDialog({
  onClose,
  onGenerate,
  loading
}: GenerateCertificateDialogProps): React.ReactElement {
  const [subject, setSubject] = useState('/CN=Connex Studio/O=ConnexStudio')
  const [applicationUri, setApplicationUri] = useState('')
  const [validityDays, setValidityDays] = useState(730) // 2 years

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate({
      subject,
      applicationUri: applicationUri || `urn:${window.location.hostname}:ConnexStudio`,
      validityDays
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Generate Application Certificate</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject (Distinguished Name)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="/CN=My Application/O=My Organization"
              className="w-full p-2 border rounded-md text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Format: /CN=CommonName/O=Organization/C=Country
            </p>
          </div>

          {/* Application URI */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Application URI (optional)</label>
            <input
              type="text"
              value={applicationUri}
              onChange={(e) => setApplicationUri(e.target.value)}
              placeholder="urn:hostname:application"
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for auto-generated URI
            </p>
          </div>

          {/* Validity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Validity Period (days)</label>
            <select
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value))}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={1095}>3 years</option>
              <option value={1825}>5 years</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract Common Name from subject/issuer string.
 */
function extractCN(dn: string): string {
  // Handle multiple formats:
  // - "/CN=Name/O=Org" (OpenSSL style)
  // - "CN=Name,O=Org" (RFC 2253 style)
  // - "CN=Name\nO=Org" (multi-line)
  const cnMatch = dn.match(/CN=([^,\/\n]+)/i)
  return cnMatch ? cnMatch[1] : dn
}
