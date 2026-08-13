import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SidebarV2 } from '@renderer/components/layout/SidebarV2'

const mockConnections = [
  { id: '1', name: 'PLC-01', protocol: 'modbus-tcp' as const, status: 'connected' as const },
  { id: '2', name: 'Broker', protocol: 'mqtt' as const, status: 'disconnected' as const },
]

describe('SidebarV2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders new connection button at top', () => {
    render(<SidebarV2 connections={[]} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByRole('button', { name: /new connection/i })).toBeInTheDocument()
  })

  it('displays connections directly in sidebar', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText('PLC-01')).toBeInTheDocument()
    expect(screen.getByText('Broker')).toBeInTheDocument()
  })

  it('shows protocol badge for each connection', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText('Modbus')).toBeInTheDocument()
    expect(screen.getByText('MQTT')).toBeInTheDocument()
  })

  it('shows connection status indicator', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    const connectedIndicator = screen.getByTestId('status-1')
    expect(connectedIndicator).toHaveClass('bg-green-500')
  })

  it('calls onSelectConnection when connection clicked', () => {
    const onSelect = vi.fn()
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={onSelect} />)
    fireEvent.click(screen.getByText('PLC-01'))
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('shows tools section expanded by default', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText('Tools')).toBeInTheDocument()
    // Tools are expanded by default — Bridge should be visible
    expect(screen.getByText('Bridge')).toBeInTheDocument()
  })

  it('collapses tools section when clicked', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    const toolsButton = screen.getByText('Tools')
    fireEvent.click(toolsButton)
    expect(screen.queryByText('Bridge')).toBeNull()
  })

  it('calls onNewConnection when new connection button clicked', () => {
    const onNewConnection = vi.fn()
    render(<SidebarV2 connections={[]} onNewConnection={onNewConnection} onSelectConnection={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /new connection/i }))
    expect(onNewConnection).toHaveBeenCalled()
  })

  it('shows empty state when no connections', () => {
    render(<SidebarV2 connections={[]} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText(/no connections yet/i)).toBeInTheDocument()
  })

  it('highlights selected connection', () => {
    render(
      <SidebarV2
        connections={mockConnections}
        selectedConnectionId="1"
        onNewConnection={vi.fn()}
        onSelectConnection={vi.fn()}
      />
    )
    // The selected connection should have visual indication
    const label = screen.getByText('PLC-01')
    const selectedItem = label.parentElement?.parentElement
    expect(selectedItem).toBeTruthy()
    expect(selectedItem).toHaveClass('bg-blue-500/15')
  })
})
