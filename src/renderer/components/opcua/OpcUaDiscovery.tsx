/**
 * OPC UA Discovery Component (T163)
 *
 * Provides UI for discovering OPC UA servers on the network:
 * - Local Discovery Server (LDS) integration
 * - Server endpoint discovery
 * - Connection profile creation from discovered servers
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Loader2,
  Search,
  Server,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  RefreshCw,
  Globe,
  Network,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { opcuaApi } from '@renderer/lib/ipc'
import type {
  OpcUaDiscoveredServer,
  OpcUaEndpoint,
  DiscoverServersResult,
  GetEndpointsResult,
  OpcUaApplicationType,
  SecurityPolicy,
  MessageSecurityMode
} from '@shared/types/opcua'

// =============================================================================
// Types
// =============================================================================

interface OpcUaDiscoveryProps {
  /** Callback when a server is selected to create connection */
  onSelectServer?: (server: OpcUaDiscoveredServer, endpoint: OpcUaEndpoint) => void
  /** Initial discovery URL */
  initialUrl?: string
  /** Show as dialog */
  asDialog?: boolean
  /** Dialog open state (when asDialog=true) */
  open?: boolean
  /** Dialog close callback (when asDialog=true) */
  onOpenChange?: (open: boolean) => void
  /** Additional class name */
  className?: string
}

// =============================================================================
// UI Components
// =============================================================================

/**
 * Simple Badge component.
 */
function Badge({
  children,
  variant = 'default',
  className
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline'
  className?: string
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        variant === 'outline' && 'border text-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * Simple Button component.
 */
function Button({
  children,
  variant = 'default',
  size = 'default',
  className,
  disabled,
  onClick
}: {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm'
  className?: string
  disabled?: boolean
  onClick?: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        size === 'default' && 'h-9 px-4 py-2 text-sm',
        size === 'sm' && 'h-7 px-3 text-xs',
        className
      )}
    >
      {children}
    </button>
  )
}

/**
 * Simple Input component.
 */
function Input({
  value,
  onChange,
  placeholder,
  disabled,
  className
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}): React.ReactElement {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm',
        'transition-colors placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  )
}

// =============================================================================
// Badge Components
// =============================================================================

/**
 * Application type badge display.
 */
function ApplicationTypeBadge({ type }: { type: OpcUaApplicationType }): React.ReactElement {
  const variants: Record<OpcUaApplicationType, { color: string; icon: React.ReactNode }> = {
    Server: { color: 'bg-blue-100 text-blue-800', icon: <Server className="h-3 w-3 mr-1" /> },
    Client: { color: 'bg-green-100 text-green-800', icon: <Globe className="h-3 w-3 mr-1" /> },
    ClientAndServer: { color: 'bg-purple-100 text-purple-800', icon: <Network className="h-3 w-3 mr-1" /> },
    DiscoveryServer: { color: 'bg-orange-100 text-orange-800', icon: <Search className="h-3 w-3 mr-1" /> }
  }

  const variant = variants[type]
  return (
    <Badge variant="secondary" className={`${variant.color} flex items-center`}>
      {variant.icon}
      {type}
    </Badge>
  )
}

/**
 * Security mode badge display.
 */
function SecurityModeBadge({ mode }: { mode: MessageSecurityMode }): React.ReactElement {
  const variants: Record<MessageSecurityMode, { color: string; icon: React.ReactNode }> = {
    None: { color: 'bg-gray-100 text-gray-800', icon: <Shield className="h-3 w-3 mr-1" /> },
    Sign: { color: 'bg-yellow-100 text-yellow-800', icon: <ShieldAlert className="h-3 w-3 mr-1" /> },
    SignAndEncrypt: { color: 'bg-green-100 text-green-800', icon: <ShieldCheck className="h-3 w-3 mr-1" /> }
  }

  const variant = variants[mode]
  return (
    <Badge variant="secondary" className={`${variant.color} flex items-center`}>
      {variant.icon}
      {mode}
    </Badge>
  )
}

/**
 * Security policy badge display.
 */
function SecurityPolicyBadge({ policy }: { policy: SecurityPolicy }): React.ReactElement {
  const getColor = (policy: SecurityPolicy) => {
    if (policy === 'None') return 'bg-gray-100 text-gray-600'
    if (policy.includes('256')) return 'bg-green-100 text-green-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  return (
    <Badge variant="outline" className={getColor(policy)}>
      {policy}
    </Badge>
  )
}

/**
 * Discovery status indicator.
 */
function DiscoveryStatus({
  isLoading,
  error,
  timestamp
}: {
  isLoading: boolean
  error?: string
  timestamp?: string
}): React.ReactElement | null {
  if (isLoading) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Discovering...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center text-destructive">
        <AlertCircle className="h-4 w-4 mr-2" />
        {error}
      </div>
    )
  }

  if (timestamp) {
    return (
      <div className="flex items-center text-muted-foreground text-sm">
        <Clock className="h-3 w-3 mr-1" />
        Last updated: {new Date(timestamp).toLocaleTimeString()}
      </div>
    )
  }

  return null
}

// =============================================================================
// Server Accordion Item
// =============================================================================

interface ServerAccordionItemProps {
  server: OpcUaDiscoveredServer
  isSelected: boolean
  isLoadingEndpoints: boolean
  endpointsResult: GetEndpointsResult | null
  selectedEndpoint: OpcUaEndpoint | null
  onGetEndpoints: (server: OpcUaDiscoveredServer) => void
  onSelectEndpoint: (endpoint: OpcUaEndpoint) => void
}

function ServerAccordionItem({
  server,
  isSelected,
  isLoadingEndpoints,
  endpointsResult,
  selectedEndpoint,
  onGetEndpoints,
  onSelectEndpoint
}: ServerAccordionItemProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{server.applicationName}</div>
            <div className="text-xs text-muted-foreground">
              {server.applicationUri}
            </div>
          </div>
          <ApplicationTypeBadge type={server.applicationType} />
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t">
          {/* Server Details */}
          <div className="pt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Product URI:</span>
              <span className="ml-2 font-mono text-xs">
                {server.productUri || 'N/A'}
              </span>
            </div>
          </div>

          {/* Discovery URLs */}
          <div>
            <div className="text-sm font-medium mb-1">Discovery URLs:</div>
            <div className="space-y-1">
              {server.discoveryUrls.map((url, urlIndex) => (
                <div
                  key={urlIndex}
                  className="flex items-center justify-between bg-muted p-2 rounded text-xs font-mono"
                >
                  <span>{url}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onGetEndpoints(server)}
                    disabled={isLoadingEndpoints}
                  >
                    {isLoadingEndpoints && isSelected ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Get Endpoints'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoints (if loaded for this server) */}
          {isSelected && endpointsResult && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Endpoints ({endpointsResult.endpoints.length})
                </div>
                {endpointsResult.error && (
                  <span className="text-xs text-destructive">
                    {endpointsResult.error}
                  </span>
                )}
              </div>

              {endpointsResult.endpoints.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">URL</th>
                        <th className="text-left p-2">Security Mode</th>
                        <th className="text-left p-2">Policy</th>
                        <th className="text-left p-2">Auth</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpointsResult.endpoints.map((endpoint, epIndex) => (
                        <tr
                          key={epIndex}
                          className={cn(
                            'border-b',
                            selectedEndpoint === endpoint
                              ? 'bg-primary/5'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <td className="p-2 font-mono text-xs max-w-xs truncate">
                            {endpoint.endpointUrl}
                          </td>
                          <td className="p-2">
                            <SecurityModeBadge mode={endpoint.securityMode} />
                          </td>
                          <td className="p-2">
                            <SecurityPolicyBadge policy={endpoint.securityPolicy} />
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {endpoint.userTokenPolicies.map((policy, pIndex) => (
                                <Badge
                                  key={pIndex}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {policy.tokenType}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSelectEndpoint(endpoint)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Select
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No endpoints available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Discovery Content
// =============================================================================

function DiscoveryContent({
  onSelectServer,
  initialUrl
}: {
  onSelectServer?: (server: OpcUaDiscoveredServer, endpoint: OpcUaEndpoint) => void
  initialUrl?: string
}): React.ReactElement {
  const [discoveryUrl, setDiscoveryUrl] = useState(initialUrl || 'opc.tcp://localhost:4840')
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveryResult, setDiscoveryResult] = useState<DiscoverServersResult | null>(null)
  const [selectedServer, setSelectedServer] = useState<OpcUaDiscoveredServer | null>(null)
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false)
  const [endpointsResult, setEndpointsResult] = useState<GetEndpointsResult | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<OpcUaEndpoint | null>(null)

  /**
   * Discover servers via LDS.
   */
  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true)
    setDiscoveryResult(null)
    setSelectedServer(null)
    setEndpointsResult(null)
    setSelectedEndpoint(null)

    try {
      const result = await opcuaApi.discoverServers({
        discoveryUrl
      })
      setDiscoveryResult(result)
    } catch (error) {
      setDiscoveryResult({
        servers: [],
        discoveryUrl,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Discovery failed'
      })
    } finally {
      setIsDiscovering(false)
    }
  }, [discoveryUrl])

  /**
   * Get endpoints from selected server.
   */
  const handleGetEndpoints = useCallback(async (server: OpcUaDiscoveredServer) => {
    setSelectedServer(server)
    setEndpointsResult(null)
    setSelectedEndpoint(null)
    setIsLoadingEndpoints(true)

    // Use first discovery URL
    const endpointUrl = server.discoveryUrls[0] || discoveryUrl

    try {
      const result = await opcuaApi.getServerEndpoints({
        endpointUrl
      })
      setEndpointsResult(result)
    } catch (error) {
      setEndpointsResult({
        endpoints: [],
        endpointUrl,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to get endpoints'
      })
    } finally {
      setIsLoadingEndpoints(false)
    }
  }, [discoveryUrl])

  /**
   * Select an endpoint and call callback.
   */
  const handleSelectEndpoint = useCallback((endpoint: OpcUaEndpoint) => {
    setSelectedEndpoint(endpoint)
    if (selectedServer && onSelectServer) {
      onSelectServer(selectedServer, endpoint)
    }
  }, [selectedServer, onSelectServer])

  // Auto-discover on mount if initial URL provided
  useEffect(() => {
    if (initialUrl) {
      handleDiscover()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  return (
    <div className="space-y-4">
      {/* Discovery URL Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="opc.tcp://localhost:4840"
            value={discoveryUrl}
            onChange={setDiscoveryUrl}
            disabled={isDiscovering}
          />
        </div>
        <Button onClick={handleDiscover} disabled={isDiscovering}>
          {isDiscovering ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Discover
        </Button>
      </div>

      {/* Discovery Status */}
      <DiscoveryStatus
        isLoading={isDiscovering}
        error={discoveryResult?.error}
        timestamp={discoveryResult?.timestamp}
      />

      {/* Discovered Servers */}
      {discoveryResult && discoveryResult.servers.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 flex items-center justify-between border-b">
            <div>
              <h3 className="font-semibold">Discovered Servers</h3>
              <p className="text-sm text-muted-foreground">
                Found {discoveryResult.servers.length} server(s)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscover}
              disabled={isDiscovering}
            >
              <RefreshCw className={cn('h-4 w-4', isDiscovering && 'animate-spin')} />
            </Button>
          </div>
          <div className="p-4 space-y-2">
            {discoveryResult.servers.map((server, index) => (
              <ServerAccordionItem
                key={server.applicationUri || index}
                server={server}
                isSelected={selectedServer === server}
                isLoadingEndpoints={isLoadingEndpoints}
                endpointsResult={selectedServer === server ? endpointsResult : null}
                selectedEndpoint={selectedEndpoint}
                onGetEndpoints={handleGetEndpoints}
                onSelectEndpoint={handleSelectEndpoint}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Servers Found */}
      {discoveryResult && discoveryResult.servers.length === 0 && !discoveryResult.error && (
        <div className="rounded-lg border bg-card p-8 flex flex-col items-center justify-center">
          <Server className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No OPC UA servers found at the specified URL.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different discovery URL or check network connectivity.
          </p>
        </div>
      )}

      {/* Selected Endpoint Summary */}
      {selectedServer && selectedEndpoint && (
        <div className="rounded-lg border border-primary bg-card">
          <div className="p-4 flex items-center gap-2 border-b">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Selected Configuration</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Server:</span>
              <span className="ml-2 font-medium">{selectedServer.applicationName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Endpoint:</span>
              <span className="ml-2 font-mono text-xs">{selectedEndpoint.endpointUrl}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Security:</span>
              <span className="ml-2">
                <SecurityModeBadge mode={selectedEndpoint.securityMode} />
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Policy:</span>
              <span className="ml-2">
                <SecurityPolicyBadge policy={selectedEndpoint.securityPolicy} />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Dialog Component
// =============================================================================

function DiscoveryDialog({
  open,
  onOpenChange,
  onSelectServer,
  initialUrl
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelectServer?: (server: OpcUaDiscoveredServer, endpoint: OpcUaEndpoint) => void
  initialUrl?: string
}): React.ReactElement | null {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border bg-background shadow-lg">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5" />
              Discover OPC UA Servers
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Search for OPC UA servers on your network using Local Discovery Server (LDS)
              or direct endpoint discovery.
            </p>
          </div>

          {/* Content */}
          <DiscoveryContent onSelectServer={onSelectServer} initialUrl={initialUrl} />

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * OPC UA Discovery component.
 * Can be used standalone or as a dialog.
 */
export function OpcUaDiscovery({
  onSelectServer,
  initialUrl,
  asDialog = false,
  open,
  onOpenChange,
  className
}: OpcUaDiscoveryProps): React.ReactElement {
  if (asDialog) {
    return (
      <DiscoveryDialog
        open={open}
        onOpenChange={onOpenChange}
        onSelectServer={onSelectServer}
        initialUrl={initialUrl}
      />
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="h-5 w-5" />
          Discover OPC UA Servers
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Search for OPC UA servers using Local Discovery Server (LDS) or direct endpoint URL.
        </p>
      </div>
      <div className="p-4">
        <DiscoveryContent onSelectServer={onSelectServer} initialUrl={initialUrl} />
      </div>
    </div>
  )
}

export default OpcUaDiscovery
