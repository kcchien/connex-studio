import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary } from '../../../../src/renderer/components/common/ErrorBoundary'

function ThrowError(): React.ReactElement {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeDefined()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something Went Wrong')).toBeDefined()
  })

  it('shows error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('Test error')).toBeDefined()
  })

  it('shows reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /reload/i })).toBeDefined()
  })
})
