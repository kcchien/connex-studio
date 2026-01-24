/**
 * ThemeToggle Component
 *
 * A button that cycles through light, dark, and system themes.
 * Displays appropriate icon for current theme state.
 *
 * @see spec.md FR-026
 */

import React from 'react'
import { cn } from '@renderer/lib/utils'
import { useUIStore, type Theme } from '@renderer/stores/uiStore'

interface ThemeToggleProps {
  className?: string
}

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  dark: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  system: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
}

export function ThemeToggle({ className }: ThemeToggleProps): React.ReactElement {
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        'text-sm text-muted-foreground',
        'hover:text-foreground hover:bg-accent',
        'transition-colors',
        className
      )}
      title={`Current: ${THEME_LABELS[theme]} (click to cycle)`}
    >
      {THEME_ICONS[theme]}
      <span className="text-xs">{THEME_LABELS[theme]}</span>
    </button>
  )
}
