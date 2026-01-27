import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditConnectionDialog } from '@renderer/components/connection/EditConnectionDialog'
import type { Connection } from '@shared/types/connection'

const mockModbusConnection: Connection = {
  id: 'test-id',
  name: 'Test PLC',
  protocol: 'modbus-tcp',
  config: { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 },
  status: 'disconnected',
  createdAt: Date.now()
}

const mockMqttConnection: Connection = {
  id: 'mqtt-test-id',
  name: 'Test Broker',
  protocol: 'mqtt',
  config: { brokerUrl: 'mqtt://localhost:1883', clientId: 'test-client', useTls: false },
  status: 'disconnected',
  createdAt: Date.now()
}

const mockOpcUaConnection: Connection = {
  id: 'opcua-test-id',
  name: 'Test OPC Server',
  protocol: 'opcua',
  config: { endpointUrl: 'opc.tcp://localhost:4840', securityMode: 'None', securityPolicy: 'None' },
  status: 'disconnected',
  createdAt: Date.now()
}

describe('EditConnectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with connection values pre-filled', () => {
    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={() => {}}
        connection={mockModbusConnection}
        onSave={async () => {}}
      />
    )

    expect(screen.getByDisplayValue('Test PLC')).toBeInTheDocument()
    expect(screen.getByDisplayValue('192.168.1.1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('502')).toBeInTheDocument()
  })

  it('shows protocol as readonly (not editable)', () => {
    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={() => {}}
        connection={mockModbusConnection}
        onSave={async () => {}}
      />
    )

    // Protocol should be displayed as text, not a selector
    expect(screen.getByText('Modbus TCP')).toBeInTheDocument()
    // There should be no protocol selection buttons
    expect(screen.queryByRole('button', { name: /mqtt/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /opc ua/i })).not.toBeInTheDocument()
  })

  it('calls onSave with updated values', async () => {
    const onSave = vi.fn()
    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={() => {}}
        connection={mockModbusConnection}
        onSave={onSave}
      />
    )

    // Change the name
    const nameInput = screen.getByDisplayValue('Test PLC')
    fireEvent.change(nameInput, { target: { value: 'Updated PLC' } })

    // Click Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          name: 'Updated PLC'
        })
      )
    })
  })

  it('closes dialog when Cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={onOpenChange}
        connection={mockModbusConnection}
        onSave={async () => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows advanced options when expanded for Modbus', async () => {
    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={() => {}}
        connection={mockModbusConnection}
        onSave={async () => {}}
      />
    )

    // Advanced options should be hidden initially
    expect(screen.queryByLabelText(/unit id/i)).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(screen.getByText(/advanced options/i))

    // Advanced options should now be visible
    expect(screen.getByLabelText(/unit id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/timeout/i)).toBeInTheDocument()
  })

  it('pre-fills advanced options with connection values', async () => {
    const connectionWithAdvanced: Connection = {
      ...mockModbusConnection,
      config: { host: '192.168.1.1', port: 502, unitId: 5, timeout: 10000, defaultByteOrder: 'DCBA' }
    }

    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={() => {}}
        connection={connectionWithAdvanced}
        onSave={async () => {}}
      />
    )

    // Expand advanced options
    fireEvent.click(screen.getByText(/advanced options/i))

    expect(screen.getByLabelText(/unit id/i)).toHaveValue(5)
    expect(screen.getByLabelText(/timeout/i)).toHaveValue(10000)
  })

  describe('MQTT Protocol', () => {
    it('shows address field for MQTT connections', () => {
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockMqttConnection}
          onSave={async () => {}}
        />
      )

      expect(screen.getByText('MQTT')).toBeInTheDocument()
      expect(screen.getByDisplayValue('mqtt://localhost:1883')).toBeInTheDocument()
      expect(screen.queryByLabelText(/host/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/port/i)).not.toBeInTheDocument()
    })

    it('calls onSave with updated MQTT config', async () => {
      const onSave = vi.fn()
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockMqttConnection}
          onSave={onSave}
        />
      )

      const addressInput = screen.getByDisplayValue('mqtt://localhost:1883')
      fireEvent.change(addressInput, { target: { value: 'mqtt://broker.example.com:1883' } })

      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          'mqtt-test-id',
          expect.objectContaining({
            config: expect.objectContaining({
              brokerUrl: 'mqtt://broker.example.com:1883'
            })
          })
        )
      })
    })
  })

  describe('OPC UA Protocol', () => {
    it('shows address field for OPC UA connections', () => {
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockOpcUaConnection}
          onSave={async () => {}}
        />
      )

      expect(screen.getByText('OPC UA')).toBeInTheDocument()
      expect(screen.getByDisplayValue('opc.tcp://localhost:4840')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('shows error for invalid host', async () => {
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockModbusConnection}
          onSave={async () => {}}
        />
      )

      const hostInput = screen.getByDisplayValue('192.168.1.1')
      await userEvent.clear(hostInput)
      await userEvent.type(hostInput, '192.168.1.999')
      fireEvent.blur(hostInput)

      await waitFor(() => {
        expect(screen.getByText(/invalid ip address/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid port', async () => {
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockModbusConnection}
          onSave={async () => {}}
        />
      )

      const portInput = screen.getByDisplayValue('502')
      await userEvent.clear(portInput)
      await userEvent.type(portInput, '70000')
      fireEvent.blur(portInput)

      await waitFor(() => {
        expect(screen.getByText(/must be between 1 and 65535/i)).toBeInTheDocument()
      })
    })
  })

  describe('Test Connection', () => {
    it('shows test button', () => {
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockModbusConnection}
          onSave={async () => {}}
        />
      )

      expect(screen.getByRole('button', { name: /^test$/i })).toBeInTheDocument()
    })

    it('shows success message when test succeeds', async () => {
      const onTestConnection = vi.fn().mockResolvedValue(true)
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockModbusConnection}
          onSave={async () => {}}
          onTestConnection={onTestConnection}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: /^test$/i }))

      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument()
      })
    })

    it('shows error message when test fails', async () => {
      const onTestConnection = vi.fn().mockResolvedValue(false)
      render(
        <EditConnectionDialog
          open={true}
          onOpenChange={() => {}}
          connection={mockModbusConnection}
          onSave={async () => {}}
          onTestConnection={onTestConnection}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: /^test$/i }))

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
      })
    })
  })
})
