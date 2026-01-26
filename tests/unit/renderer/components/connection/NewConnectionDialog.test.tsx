import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NewConnectionDialog } from '@renderer/components/connection/NewConnectionDialog'

describe('NewConnectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders protocol selection buttons', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /modbus tcp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mqtt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opc ua/i })).toBeInTheDocument()
  })

  it('shows only name and address fields by default', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/unit id/i)).not.toBeInTheDocument()
  })

  it('expands advanced options when clicked', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByText(/advanced options/i))
    expect(screen.getByLabelText(/unit id/i)).toBeInTheDocument()
  })

  it('calls onSubmit with connection data', async () => {
    const onSubmit = vi.fn()
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'PLC-01' } })
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '192.168.1.100:502' } })
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'PLC-01',
        protocol: 'modbus-tcp',
      }))
    })
  })

  it('shows test connection button', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^test$/i })).toBeInTheDocument()
  })

  it('selects different protocols when clicked', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    // Click MQTT protocol
    fireEvent.click(screen.getByRole('button', { name: /mqtt/i }))

    // The MQTT button should be selected (check for visual indicator)
    const mqttButton = screen.getByRole('button', { name: /mqtt/i })
    expect(mqttButton).toHaveClass('border-green-500')
  })

  it('shows protocol-specific placeholder for address', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    // Default is Modbus TCP
    const addressInput = screen.getByLabelText(/address/i)
    expect(addressInput).toHaveAttribute('placeholder', '192.168.1.100:502')

    // Switch to MQTT
    fireEvent.click(screen.getByRole('button', { name: /mqtt/i }))
    expect(addressInput).toHaveAttribute('placeholder', 'mqtt://localhost:1883')
  })

  it('closes dialog when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(<NewConnectionDialog open onOpenChange={onOpenChange} onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  describe('Byte Order Selector', () => {
    it('should show byte order selector in advanced options for Modbus', async () => {
      render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
      await userEvent.click(screen.getByTestId('advanced-options-toggle'))
      expect(screen.getByTestId('byte-order-selector')).toBeInTheDocument()
    })

    it('should include defaultByteOrder in form data', async () => {
      const onSubmit = vi.fn()
      render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
      await userEvent.type(screen.getByLabelText(/connection name/i), 'Test')
      await userEvent.type(screen.getByLabelText(/address/i), '192.168.1.100')
      await userEvent.click(screen.getByRole('button', { name: /connect/i }))
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            config: expect.objectContaining({ defaultByteOrder: 'ABCD' })
          })
        )
      })
    })
  })
})
