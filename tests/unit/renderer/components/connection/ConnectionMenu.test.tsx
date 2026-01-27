import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionMenu } from '@renderer/components/connection/ConnectionMenu'
import type { Connection } from '@shared/types/connection'

const mockConnection: Connection = {
  id: 'test-id',
  name: 'Test PLC',
  protocol: 'modbus-tcp',
  config: { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 },
  status: 'disconnected',
  createdAt: Date.now()
}

describe('ConnectionMenu', () => {
  beforeEach(() => {
    // Clean up any portals from previous tests
    const portalRoot = document.body.querySelector('[data-radix-popper-content-wrapper]')
    if (portalRoot) {
      portalRoot.remove()
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the menu trigger button', () => {
    render(
      <ConnectionMenu
        connection={mockConnection}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows Edit and Delete options when menu is opened', async () => {
    const user = userEvent.setup()
    render(
      <ConnectionMenu
        connection={mockConnection}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <ConnectionMenu
        connection={mockConnection}
        onEdit={onEdit}
        onDelete={() => {}}
      />
    )

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('menuitem', { name: /edit/i }))

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledTimes(1)
    })
  })

  it('disables Delete when connection is connected', async () => {
    const user = userEvent.setup()
    const connectedConnection = { ...mockConnection, status: 'connected' as const }
    render(
      <ConnectionMenu
        connection={connectedConnection}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
    })

    const deleteItem = screen.getByRole('menuitem', { name: /delete/i })
    expect(deleteItem).toHaveAttribute('data-disabled')
  })
})
