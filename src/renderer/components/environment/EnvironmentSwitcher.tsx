/**
 * EnvironmentSwitcher Component
 *
 * Dropdown selector for switching between environments.
 * Shows the currently active environment and allows quick switching.
 */

import React, { useState, useCallback, memo, useRef, useEffect } from 'react'
import { ChevronDown, Check, Settings, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Environment } from '@shared/types'

interface EnvironmentSwitcherProps {
  /** List of available environments */
  environments: Environment[]
  /** Currently active environment */
  activeEnvironment: Environment | null
  /** Callback when environment is switched */
  onSwitch: (id: string) => void
  /** Callback when "Add new" is clicked */
  onAddNew?: () => void
  /** Callback when "Manage" is clicked */
  onManage?: () => void
  /** Optional additional className */
  className?: string
}

/**
 * EnvironmentSwitcher for quick environment switching.
 */
export const EnvironmentSwitcher = memo(function EnvironmentSwitcher({
  environments,
  activeEnvironment,
  onSwitch,
  onAddNew,
  onManage,
  className
}: EnvironmentSwitcherProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = useCallback((id: string) => {
    onSwitch(id)
    setIsOpen(false)
  }, [onSwitch])

  const handleAddNew = useCallback(() => {
    setIsOpen(false)
    onAddNew?.()
  }, [onAddNew])

  const handleManage = useCallback(() => {
    setIsOpen(false)
    onManage?.()
  }, [onManage])

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md',
          'bg-muted/50 border border-border',
          'text-sm text-foreground',
          'hover:bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
      >
        <span className="font-medium truncate max-w-[150px]">
          {activeEnvironment?.name ?? 'No Environment'}
        </span>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 mt-1 z-50',
          'min-w-[200px] max-h-[300px]',
          'bg-popover border border-border rounded-md shadow-lg',
          'overflow-hidden'
        )}>
          {/* Environment list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {environments.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No environments configured
              </div>
            ) : (
              environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => handleSelect(env.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2',
                    'text-sm text-left',
                    'hover:bg-muted transition-colors',
                    activeEnvironment?.id === env.id && 'bg-muted'
                  )}
                >
                  <Check className={cn(
                    'h-4 w-4',
                    activeEnvironment?.id === env.id
                      ? 'text-primary'
                      : 'text-transparent'
                  )} />
                  <span className="flex-1 truncate">{env.name}</span>
                  {env.isDefault && (
                    <span className="text-xs text-muted-foreground">
                      default
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Actions */}
          {(onAddNew || onManage) && (
            <>
              <div className="border-t border-border" />
              <div className="py-1">
                {onAddNew && (
                  <button
                    onClick={handleAddNew}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2',
                      'text-sm text-left',
                      'hover:bg-muted transition-colors'
                    )}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span>Add Environment</span>
                  </button>
                )}
                {onManage && (
                  <button
                    onClick={handleManage}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2',
                      'text-sm text-left',
                      'hover:bg-muted transition-colors'
                    )}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Manage Environments</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
})
