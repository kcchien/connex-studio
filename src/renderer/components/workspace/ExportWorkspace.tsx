/**
 * ExportWorkspace Component
 *
 * Dialog for exporting workspace configuration to YAML.
 * Allows selective export of connections, environments, bridges, etc.
 */

import React, { useState, useCallback, memo, useEffect } from 'react'
import {
  X,
  Download,
  AlertCircle,
  Check,
  FileText,
  Database,
  Globe,
  ArrowRightLeft,
  LayoutDashboard,
  Bell,
  Tags,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { ExportWorkspaceRequest } from '@shared/types/workspace'
import type { Connection } from '@shared/types/connection'
import type { Environment } from '@shared/types/environment'
import type { Bridge } from '@shared/types/bridge'
import type { Dashboard } from '@shared/types/dashboard'
import type { AlertRule } from '@shared/types/alert'

interface ExportWorkspaceProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog is closed */
  onClose: () => void
  /** Available connections to export */
  connections: Connection[]
  /** Available environments to export */
  environments: Environment[]
  /** Available bridges to export */
  bridges: Bridge[]
  /** Available dashboards to export */
  dashboards: Dashboard[]
  /** Available alert rules to export */
  alertRules: AlertRule[]
  /** Callback to perform export */
  onExport: (request: ExportWorkspaceRequest) => Promise<{ yaml: string } | { error: string }>
  /** Callback to save file */
  onSaveFile: (yaml: string, defaultPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  /** Optional additional className */
  className?: string
}

interface SelectionSection {
  id: string
  label: string
  icon: React.ReactNode
  items: Array<{ id: string; name: string }>
  enabled: boolean
  selectedIds: Set<string>
  expanded: boolean
}

/**
 * ExportWorkspace dialog for exporting workspace configuration.
 */
export const ExportWorkspace = memo(function ExportWorkspace({
  isOpen,
  onClose,
  connections,
  environments,
  bridges,
  dashboards,
  alertRules,
  onExport,
  onSaveFile,
  className
}: ExportWorkspaceProps): React.ReactElement | null {
  // Metadata
  const [workspaceName, setWorkspaceName] = useState('My Workspace')
  const [author, setAuthor] = useState('')

  // Section toggles
  const [includeConnections, setIncludeConnections] = useState(true)
  const [includeEnvironments, setIncludeEnvironments] = useState(true)
  const [includeBridges, setIncludeBridges] = useState(true)
  const [includeDashboards, setIncludeDashboards] = useState(true)
  const [includeAlertRules, setIncludeAlertRules] = useState(true)
  const [includeTags, setIncludeTags] = useState(true)

  // Selected items (empty = all)
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set())
  const [selectedEnvironments, setSelectedEnvironments] = useState<Set<string>>(new Set())
  const [selectedBridges, setSelectedBridges] = useState<Set<string>>(new Set())
  const [selectedDashboards, setSelectedDashboards] = useState<Set<string>>(new Set())
  const [selectedAlertRules, setSelectedAlertRules] = useState<Set<string>>(new Set())

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // State
  const [isExporting, setIsExporting] = useState(false)
  const [exportedYaml, setExportedYaml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setExportedYaml(null)
    }
  }, [isOpen])

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  // Toggle item selection
  const toggleItem = useCallback(
    (
      sectionId: string,
      itemId: string,
      selectedSet: Set<string>,
      setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
    ) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
        } else {
          next.add(itemId)
        }
        return next
      })
    },
    []
  )

  // Select all in section
  const selectAll = useCallback(
    (items: Array<{ id: string }>, setSelected: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      setSelected(new Set(items.map((item) => item.id)))
    },
    []
  )

  // Clear selection in section
  const selectNone = useCallback(
    (setSelected: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      setSelected(new Set())
    },
    []
  )

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setError(null)

    try {
      const request: ExportWorkspaceRequest = {
        name: workspaceName.trim() || 'My Workspace',
        author: author.trim() || undefined,
        includeConnections,
        includeEnvironments,
        includeBridges,
        includeDashboards,
        includeAlertRules,
        includeTags,
        connectionIds: selectedConnections.size > 0 ? Array.from(selectedConnections) : undefined,
        environmentIds: selectedEnvironments.size > 0 ? Array.from(selectedEnvironments) : undefined,
        bridgeIds: selectedBridges.size > 0 ? Array.from(selectedBridges) : undefined,
        dashboardIds: selectedDashboards.size > 0 ? Array.from(selectedDashboards) : undefined,
        alertRuleIds: selectedAlertRules.size > 0 ? Array.from(selectedAlertRules) : undefined
      }

      const result = await onExport(request)

      if ('error' in result) {
        setError(result.error)
      } else {
        setExportedYaml(result.yaml)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [
    workspaceName,
    author,
    includeConnections,
    includeEnvironments,
    includeBridges,
    includeDashboards,
    includeAlertRules,
    includeTags,
    selectedConnections,
    selectedEnvironments,
    selectedBridges,
    selectedDashboards,
    selectedAlertRules,
    onExport
  ])

  // Handle save to file
  const handleSaveToFile = useCallback(async () => {
    if (!exportedYaml) return

    setIsExporting(true)
    setError(null)

    try {
      const defaultPath = `${workspaceName.toLowerCase().replace(/\s+/g, '-')}.yaml`
      const result = await onSaveFile(exportedYaml, defaultPath)

      if (result.success) {
        onClose()
      } else if (result.error && result.error !== 'Save cancelled') {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsExporting(false)
    }
  }, [exportedYaml, workspaceName, onSaveFile, onClose])

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!exportedYaml) return

    try {
      await navigator.clipboard.writeText(exportedYaml)
      // Could show a toast here
    } catch (err) {
      setError('Failed to copy to clipboard')
    }
  }, [exportedYaml])

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  // Sections configuration
  const sections: SelectionSection[] = [
    {
      id: 'connections',
      label: 'Connections',
      icon: <Database className="h-4 w-4" />,
      items: connections.map((c) => ({ id: c.id, name: c.name })),
      enabled: includeConnections,
      selectedIds: selectedConnections,
      expanded: expandedSections.has('connections')
    },
    {
      id: 'environments',
      label: 'Environments',
      icon: <Globe className="h-4 w-4" />,
      items: environments.map((e) => ({ id: e.id, name: e.name })),
      enabled: includeEnvironments,
      selectedIds: selectedEnvironments,
      expanded: expandedSections.has('environments')
    },
    {
      id: 'bridges',
      label: 'Bridges',
      icon: <ArrowRightLeft className="h-4 w-4" />,
      items: bridges.map((b) => ({ id: b.id, name: b.name })),
      enabled: includeBridges,
      selectedIds: selectedBridges,
      expanded: expandedSections.has('bridges')
    },
    {
      id: 'dashboards',
      label: 'Dashboards',
      icon: <LayoutDashboard className="h-4 w-4" />,
      items: dashboards.map((d) => ({ id: d.id, name: d.name })),
      enabled: includeDashboards,
      selectedIds: selectedDashboards,
      expanded: expandedSections.has('dashboards')
    },
    {
      id: 'alertRules',
      label: 'Alert Rules',
      icon: <Bell className="h-4 w-4" />,
      items: alertRules.map((r) => ({ id: r.id, name: r.name })),
      enabled: includeAlertRules,
      selectedIds: selectedAlertRules,
      expanded: expandedSections.has('alertRules')
    }
  ]

  const getSetterForSection = (sectionId: string) => {
    switch (sectionId) {
      case 'connections':
        return setSelectedConnections
      case 'environments':
        return setSelectedEnvironments
      case 'bridges':
        return setSelectedBridges
      case 'dashboards':
        return setSelectedDashboards
      case 'alertRules':
        return setSelectedAlertRules
      default:
        return () => {}
    }
  }

  const getToggleForSection = (sectionId: string) => {
    switch (sectionId) {
      case 'connections':
        return () => setIncludeConnections((p) => !p)
      case 'environments':
        return () => setIncludeEnvironments((p) => !p)
      case 'bridges':
        return () => setIncludeBridges((p) => !p)
      case 'dashboards':
        return () => setIncludeDashboards((p) => !p)
      case 'alertRules':
        return () => setIncludeAlertRules((p) => !p)
      default:
        return () => {}
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'w-full max-w-3xl max-h-[85vh] flex flex-col',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Export Workspace</h2>
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview section (when YAML is exported) */}
          {exportedYaml ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Export Preview</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium',
                      'bg-muted text-muted-foreground hover:text-foreground',
                      'transition-colors'
                    )}
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setExportedYaml(null)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium',
                      'text-muted-foreground hover:text-foreground',
                      'transition-colors'
                    )}
                  >
                    Back to Options
                  </button>
                </div>
              </div>
              <pre
                className={cn(
                  'p-4 rounded-md bg-muted/50 border border-border',
                  'text-xs font-mono text-foreground',
                  'overflow-auto max-h-96'
                )}
              >
                {exportedYaml}
              </pre>
            </div>
          ) : (
            <>
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Workspace"
                    className={cn(
                      'w-full px-3 py-2 rounded-md',
                      'bg-background border border-input',
                      'text-sm text-foreground placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Author (optional)
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name"
                    className={cn(
                      'w-full px-3 py-2 rounded-md',
                      'bg-background border border-input',
                      'text-sm text-foreground placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring'
                    )}
                  />
                </div>
              </div>

              {/* Include Tags toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTags}
                  onChange={(e) => setIncludeTags(e.target.checked)}
                  className="rounded border-input"
                />
                <Tags className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Include Tags (with selected connections)</span>
              </label>

              {/* Selection sections */}
              <div className="space-y-2">
                {sections.map((section) => (
                  <div key={section.id} className="border border-border rounded-md">
                    {/* Section header */}
                    <div
                      className={cn(
                        'flex items-center justify-between p-3',
                        section.items.length > 0 && 'cursor-pointer',
                        !section.enabled && 'opacity-50'
                      )}
                      onClick={() => section.items.length > 0 && toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={section.enabled}
                          onChange={getToggleForSection(section.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-input"
                        />
                        {section.icon}
                        <span className="text-sm font-medium text-foreground">{section.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({section.items.length})
                          {section.selectedIds.size > 0 && (
                            <span className="ml-1 text-primary">
                              {section.selectedIds.size} selected
                            </span>
                          )}
                        </span>
                      </div>
                      {section.items.length > 0 && (
                        <div>
                          {section.expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Section items */}
                    {section.expanded && section.enabled && section.items.length > 0 && (
                      <div className="border-t border-border p-3 bg-muted/30">
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => selectAll(section.items, getSetterForSection(section.id))}
                            className="text-xs text-primary hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-muted-foreground">|</span>
                          <button
                            onClick={() => selectNone(getSetterForSection(section.id))}
                            className="text-xs text-primary hover:underline"
                          >
                            Select None
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {section.items.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  section.selectedIds.size === 0 || section.selectedIds.has(item.id)
                                }
                                onChange={() =>
                                  toggleItem(
                                    section.id,
                                    item.id,
                                    section.selectedIds,
                                    getSetterForSection(section.id)
                                  )
                                }
                                className="rounded border-input"
                              />
                              <span className="text-foreground truncate">{item.name}</span>
                            </label>
                          ))}
                        </div>
                        {section.selectedIds.size === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            No specific items selected = export all
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Security Note</p>
                  <p className="mt-1">
                    Credentials (passwords, API keys, certificates) are NOT exported for security
                    reasons. After importing, you will need to re-enter credentials for connections
                    that require them.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors'
            )}
          >
            Cancel
          </button>
          {exportedYaml ? (
            <button
              onClick={handleSaveToFile}
              disabled={isExporting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Saving...' : 'Save to File'}
            </button>
          ) : (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <FileText className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Generate Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
