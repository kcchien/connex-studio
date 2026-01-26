import React from 'react'
import logoSvg from '@renderer/assets/logo.svg'

export interface LogoProps {
  /** Logo size in pixels (default: 36) */
  size?: number
  /** Optional CSS class name */
  className?: string
}

/**
 * Logo - ConneX Studio brand logo
 * Uses the official logo from assets/logo.svg
 */
export function Logo({ size = 36, className }: LogoProps): React.ReactElement {
  return (
    <img
      src={logoSvg}
      alt="ConneX Studio Logo"
      width={size}
      height={size}
      className={className}
    />
  )
}
