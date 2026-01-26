import React from 'react'
import { cn } from '@renderer/lib/utils'
import { ConnectionStatusIndicator, type ConnectionStatus } from '@renderer/components/connection'

interface ConnectionInfo {
  name: string
  status: ConnectionStatus
}

interface HeaderProps {
  /** Optional additional className */
  className?: string
  /** Optional actions to render on the right side */
  actions?: React.ReactNode
  /** Current connection info to display */
  connection?: ConnectionInfo | null
}

/**
 * Top header component with app title and optional actions.
 * Fixed height of 48px as per design requirements.
 */
export function Header({ className, actions, connection }: HeaderProps): React.ReactElement {
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
        {connection && (
          <>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {connection.name}
              </span>
              <ConnectionStatusIndicator status={connection.status} showLabel size="sm" />
            </div>
          </>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
