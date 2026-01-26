import React from 'react'

export interface LogoProps {
  /** Logo size in pixels (default: 36) */
  size?: number
  /** Optional CSS class name */
  className?: string
}

/**
 * Logo - ConneX Studio brand logo with gradient fill
 * X with parallelogram-style horizontal cuts, MQTTX-inspired gradient
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
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#00D4AA" />
        </linearGradient>
      </defs>
      {/* Background with rounded corners */}
      <rect x="4" y="4" width="32" height="32" rx="6" fill="url(#logo-gradient)" />
      {/* Thin line (top-left to bottom-right) - parallelogram shape */}
      <polygon points="11,12 12.5,12 29,28.5 27.5,28.5" fill="white" />
      {/* Thick line (top-right to bottom-left) - parallelogram shape */}
      <polygon points="26,12 30,12 14,28 10,28" fill="white" />
    </svg>
  )
}
