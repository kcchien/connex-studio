import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConnectionStatusIndicator } from '@renderer/components/connection/ConnectionStatusIndicator'

describe('ConnectionStatusIndicator', () => {
  it('renders connected status with green indicator', () => {
    render(<ConnectionStatusIndicator status="connected" />)
    const indicator = screen.getByTestId('connection-status-indicator')
    expect(indicator).toHaveAttribute('data-status', 'connected')
    expect(indicator.querySelector('span')).toHaveClass('bg-green-500')
  })

  it('renders connecting status with spinner', () => {
    render(<ConnectionStatusIndicator status="connecting" />)
    const indicator = screen.getByTestId('connection-status-indicator')
    expect(indicator).toHaveAttribute('data-status', 'connecting')
    // Should have an SVG (Loader2 icon) instead of a dot
    expect(indicator.querySelector('svg')).toBeInTheDocument()
  })

  it('renders disconnected status with gray indicator', () => {
    render(<ConnectionStatusIndicator status="disconnected" />)
    const indicator = screen.getByTestId('connection-status-indicator')
    expect(indicator).toHaveAttribute('data-status', 'disconnected')
    expect(indicator.querySelector('span')).toHaveClass('bg-gray-400')
  })

  it('renders error status with red indicator', () => {
    render(<ConnectionStatusIndicator status="error" />)
    const indicator = screen.getByTestId('connection-status-indicator')
    expect(indicator).toHaveAttribute('data-status', 'error')
    expect(indicator.querySelector('span')).toHaveClass('bg-red-500')
  })

  it('shows label when showLabel is true', () => {
    render(<ConnectionStatusIndicator status="connected" showLabel />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<ConnectionStatusIndicator status="connected" showLabel={false} />)
    expect(screen.queryByText('Connected')).not.toBeInTheDocument()
  })

  it('shows correct label for each status', () => {
    const { rerender } = render(<ConnectionStatusIndicator status="connected" showLabel />)
    expect(screen.getByText('Connected')).toBeInTheDocument()

    rerender(<ConnectionStatusIndicator status="connecting" showLabel />)
    expect(screen.getByText('Connecting')).toBeInTheDocument()

    rerender(<ConnectionStatusIndicator status="disconnected" showLabel />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()

    rerender(<ConnectionStatusIndicator status="error" showLabel />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('applies size styles correctly', () => {
    const { rerender } = render(<ConnectionStatusIndicator status="connected" size="sm" />)
    expect(screen.getByTestId('connection-status-indicator').querySelector('span')).toHaveClass('w-2', 'h-2')

    rerender(<ConnectionStatusIndicator status="connected" size="md" />)
    expect(screen.getByTestId('connection-status-indicator').querySelector('span')).toHaveClass('w-2.5', 'h-2.5')

    rerender(<ConnectionStatusIndicator status="connected" size="lg" />)
    expect(screen.getByTestId('connection-status-indicator').querySelector('span')).toHaveClass('w-3', 'h-3')
  })

  it('applies custom className', () => {
    render(<ConnectionStatusIndicator status="connected" className="custom-class" />)
    expect(screen.getByTestId('connection-status-indicator')).toHaveClass('custom-class')
  })
})
