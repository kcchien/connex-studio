import React from 'react'
import { cn } from '@renderer/lib/utils'

interface SidebarProps {
  /** Content to render inside the sidebar */
  children?: React.ReactNode
  /** Optional additional className */
  className?: string
}

/**
 * Left sidebar component for navigation and connection list.
 * Fixed width of 280px as per design requirements.
 */
export function Sidebar({ children, className }: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        'w-[280px] min-w-[280px] h-full',
        'bg-card border-r border-border',
        'flex flex-col overflow-hidden',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  )
}
