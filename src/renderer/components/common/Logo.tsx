import React from 'react'

export interface LogoProps {
  /** Logo size in pixels (default: 36) */
  size?: number
  /** Optional CSS class name */
  className?: string
}

/**
 * Logo - ConneX Studio brand logo
 * Inline SVG to ensure compatibility with Electron packaging
 */
export function Logo({ size = 36, className }: LogoProps): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ConneX Studio Logo"
    >
      {/* Background rounded rectangle */}
      <rect x="4" y="4" width="32" height="32" rx="4" fill="#002FA7" />
      {/* Thin line (top-left to bottom-right) - parallelogram shape */}
      <polygon points="11,12 12.5,12 29,28.5 27.5,28.5" fill="white" />
      {/* Thick line (top-right to bottom-left) - parallelogram shape, 4px width */}
      <polygon points="26,12 30,12 14,28 10,28" fill="white" />
    </svg>
  )
}
