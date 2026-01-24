/**
 * ProfileList Component
 *
 * Displays a list of saved profiles with options to load, delete, or export.
 */

import React, { useEffect, useState, useCallback, memo } from 'react'
import { FolderOpen, Trash2, Download, Upload, RefreshCw } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { ProfileSummary } from '@shared/types/profile'

interface ProfileListProps {
  /** Callback when a profile is selected for loading */
  onLoad: (name: string) => void
  /** Callback when a profile is exported */
  onExport: (name: string) => void
  /** Callback when a profile is deleted */
  onDelete: (name: string) => void
  /** Optional additional className */
  className?: string
}

/**
 * Format timestamp as readable date string.
 */
function formatDate(timestamp?: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * ProfileList displays saved profiles with management actions.
 */
export const ProfileList = memo(function ProfileList({
  onLoad,
  onExport,
  onDelete,
  className
}: ProfileListProps): React.ReactElement {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load profiles
  const loadProfiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.profile.list()
      setProfiles(result.profiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  // Handle delete with confirmation
  const handleDelete = useCallback(async (name: string) => {
    if (!confirm(`Delete profile "${name}"?`)) return
    onDelete(name)
    // Refresh list after delete
    setTimeout(loadProfiles, 100)
  }, [onDelete, loadProfiles])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-32 text-muted-foreground', className)}>
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">Loading profiles...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-32 text-destructive', className)}>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadProfiles}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Try again
        </button>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-32 text-muted-foreground', className)}>
        <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No saved profiles</p>
        <p className="text-xs mt-1">Save a profile to see it here</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Saved Profiles ({profiles.length})
        </span>
        <button
          onClick={loadProfiles}
          className={cn(
            'p-1 rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted transition-colors'
          )}
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        {profiles.map((profile) => (
          <div
            key={profile.name}
            className={cn(
              'flex items-center justify-between',
              'p-2 rounded-md border border-border',
              'hover:bg-muted/50 transition-colors'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {profile.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  v{profile.version}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>{profile.connectionCount} connection{profile.connectionCount !== 1 ? 's' : ''}</span>
                <span>{profile.tagCount} tag{profile.tagCount !== 1 ? 's' : ''}</span>
                {profile.exportedAt && (
                  <span>Last exported: {formatDate(profile.exportedAt)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onLoad(profile.name)}
                className={cn(
                  'p-1.5 rounded-md',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-muted transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                title="Load profile"
              >
                <Upload className="h-4 w-4" />
              </button>
              <button
                onClick={() => onExport(profile.name)}
                className={cn(
                  'p-1.5 rounded-md',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-muted transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                title="Export profile"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(profile.name)}
                className={cn(
                  'p-1.5 rounded-md',
                  'text-muted-foreground hover:text-destructive',
                  'hover:bg-destructive/10 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                title="Delete profile"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
