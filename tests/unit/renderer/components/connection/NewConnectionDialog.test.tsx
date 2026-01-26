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

  it('shows separate host and port fields for Modbus TCP by default', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/host/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/port/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/unit id/i)).not.toBeInTheDocument()
  })

  it('shows address field for MQTT protocol', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /mqtt/i }))
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/host/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/port/i)).not.toBeInTheDocument()
  })

  it('expands advanced options when clicked', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByText(/advanced options/i))
    expect(screen.getByLabelText(/unit id/i)).toBeInTheDocument()
  })

  it('calls onSubmit with connection data using host/port', async () => {
    const onSubmit = vi.fn()
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'PLC-01' } })
    fireEvent.change(screen.getByLabelText(/host/i), { target: { value: '192.168.1.100' } })
    fireEvent.change(screen.getByLabelText(/port/i), { target: { value: '502' } })
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'PLC-01',
        protocol: 'modbus-tcp',
        config: expect.objectContaining({
          host: '192.168.1.100',
          port: 502,
        }),
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

  it('updates port default when switching protocols', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    // Default is Modbus TCP with port 502
    expect(screen.getByLabelText(/port/i)).toHaveValue('502')

    // Switch to MQTT - shows address field instead
    fireEvent.click(screen.getByRole('button', { name: /mqtt/i }))
    expect(screen.queryByLabelText(/port/i)).not.toBeInTheDocument()

    // Switch back to Modbus - port should be 502 again
    fireEvent.click(screen.getByRole('button', { name: /modbus tcp/i }))
    expect(screen.getByLabelText(/port/i)).toHaveValue('502')
  })

  it('preserves user-edited port when switching protocols', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    // User changes port to custom value
    fireEvent.change(screen.getByLabelText(/port/i), { target: { value: '1234' } })
    expect(screen.getByLabelText(/port/i)).toHaveValue('1234')

    // Switch to MQTT and back
    fireEvent.click(screen.getByRole('button', { name: /mqtt/i }))
    fireEvent.click(screen.getByRole('button', { name: /modbus tcp/i }))

    // Port should still be 1234 (preserved)
    expect(screen.getByLabelText(/port/i)).toHaveValue('1234')
  })

  it('closes dialog when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(<NewConnectionDialog open onOpenChange={onOpenChange} onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  describe('Host/Port Validation', () => {
    it('shows error for invalid IP address', async () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

      const hostInput = screen.getByLabelText(/host/i)
      await userEvent.type(hostInput, '192.168.1.999')
      fireEvent.blur(hostInput)

      await waitFor(() => {
        expect(screen.getByText(/invalid ip address/i)).toBeInTheDocument()
      })
    })

    it('shows error for out of range port', async () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

      const portInput = screen.getByLabelText(/port/i)
      await userEvent.clear(portInput)
      await userEvent.type(portInput, '70000')
      fireEvent.blur(portInput)

      await waitFor(() => {
        expect(screen.getByText(/must be between 1 and 65535/i)).toBeInTheDocument()
      })
    })

    it('filters non-numeric characters from port input', async () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

      const portInput = screen.getByLabelText(/port/i)
      await userEvent.clear(portInput)
      await userEvent.type(portInput, 'abc123def')

      expect(portInput).toHaveValue('123')
    })
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
      await userEvent.type(screen.getByLabelText(/host/i), '192.168.1.100')
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

  describe('Test Connection', () => {
    it('shows success message when test succeeds', async () => {
      const onTestConnection = vi.fn().mockResolvedValue(true)
      render(
        <NewConnectionDialog
          open
          onOpenChange={vi.fn()}
          onSubmit={vi.fn()}
          onTestConnection={onTestConnection}
        />
      )

      await userEvent.type(screen.getByLabelText(/connection name/i), 'Test')
      await userEvent.type(screen.getByLabelText(/host/i), '192.168.1.100')

      await userEvent.click(screen.getByRole('button', { name: /^test$/i }))

      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument()
      })
    })

    it('shows error message when test fails', async () => {
      const onTestConnection = vi.fn().mockResolvedValue(false)
      render(
        <NewConnectionDialog
          open
          onOpenChange={vi.fn()}
          onSubmit={vi.fn()}
          onTestConnection={onTestConnection}
        />
      )

      await userEvent.type(screen.getByLabelText(/connection name/i), 'Test')
      await userEvent.type(screen.getByLabelText(/host/i), '192.168.1.100')

      await userEvent.click(screen.getByRole('button', { name: /^test$/i }))

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
      })
    })
  })
})
