import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchTagDialog } from '@renderer/components/tags/BatchTagDialog'

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  connectionId: 'conn-1',
  protocol: 'modbus-tcp' as const,
  onTagsCreated: vi.fn(),
}

describe('BatchTagDialog', () => {
  it('renders three method tabs', () => {
    render(<BatchTagDialog {...defaultProps} />)
    expect(screen.getByRole('tab', { name: /import/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /scan/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument()
  })

  it('shows import tab by default with drag-drop zone', () => {
    render(<BatchTagDialog {...defaultProps} />)
    expect(screen.getByText(/drag.*csv.*excel/i)).toBeInTheDocument()
  })

  it('switches to scan tab and shows address range inputs', () => {
    render(<BatchTagDialog {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /scan/i }))
    expect(screen.getByLabelText(/start address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end address/i)).toBeInTheDocument()
  })

  it('switches to generate tab and shows naming pattern input', () => {
    render(<BatchTagDialog {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /generate/i }))
    expect(screen.getByLabelText(/naming pattern/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
  })
})
