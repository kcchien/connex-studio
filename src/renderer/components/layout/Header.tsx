import React from 'react'
import { cn } from '@renderer/lib/utils'

interface HeaderProps {
  /** Optional additional className */
  className?: string
  /** Optional actions to render on the right side */
  actions?: React.ReactNode
}

/**
 * Top header component with app title and optional actions.
 * Fixed height of 48px as per design requirements.
 */
export function Header({ className, actions }: HeaderProps): React.ReactElement {
  return (
    <header
      className={cn(
        'h-12 min-h-12 flex items-center justify-between px-4',
        'bg-card border-b border-border',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">
          Connex Studio
        </h1>
        <span className="text-xs text-muted-foreground">
          IIoT Protocol Studio
        </span>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
