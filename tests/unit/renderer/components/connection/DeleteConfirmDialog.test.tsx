import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmDialog } from '@renderer/components/connection/DeleteConfirmDialog'

describe('DeleteConfirmDialog', () => {
  it('renders connection name in the message', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={() => {}}
        connectionName="Test PLC"
        onConfirm={() => {}}
      />
    )

    expect(screen.getByText(/Test PLC/)).toBeInTheDocument()
  })

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={() => {}}
        connectionName="Test PLC"
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange with false when Cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        connectionName="Test PLC"
        onConfirm={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
