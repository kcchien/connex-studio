import React from 'react'
import { cn } from '@renderer/lib/utils'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  /** Main content area */
  children: React.ReactNode
  /** Content to render in the sidebar */
  sidebarContent?: React.ReactNode
  /** Optional actions to render in the header */
  headerActions?: React.ReactNode
  /** Optional additional className for the main content area */
  className?: string
}

/**
 * Main layout wrapper with sidebar + content area.
 *
 * Layout structure:
 * - Header: 48px fixed height at top
 * - Sidebar: 280px fixed width on left
 * - Content: Flexible area taking remaining space
 */
export function AppShell({
  children,
  sidebarContent,
  headerActions,
  className
}: AppShellProps): React.ReactElement {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header actions={headerActions} />

      {/* Main area with sidebar and content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar>
          {sidebarContent}
        </Sidebar>

        {/* Main content */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            'bg-background',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
