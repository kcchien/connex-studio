import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ModbusAddressInput } from '@renderer/components/tags/ModbusAddressInput'

describe('ModbusAddressInput', () => {
  it('renders with placeholder', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} />)

    const input = screen.getByTestId('modbus-address-input')
    expect(input).toHaveAttribute('placeholder', 'e.g., 40001')
  })

  it('renders with custom placeholder', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} placeholder="Enter address" />)

    const input = screen.getByTestId('modbus-address-input')
    expect(input).toHaveAttribute('placeholder', 'Enter address')
  })

  it('renders with label', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} label="Address" id="address" />)

    expect(screen.getByText('Address')).toBeInTheDocument()
  })

  it('filters non-numeric characters', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} />)

    const input = screen.getByTestId('modbus-address-input')
    fireEvent.change(input, { target: { value: 'abc123def456' } })

    expect(onChange).toHaveBeenCalledWith('123456', expect.any(Object))
  })

  it('shows valid description for holding register', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="40001" onChange={onChange} />)

    await waitFor(() => {
      expect(screen.getByTestId('modbus-address-description')).toHaveTextContent(
        'Holding Register, address 0'
      )
    })
  })

  it('shows valid description for input register', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="30050" onChange={onChange} />)

    await waitFor(() => {
      expect(screen.getByTestId('modbus-address-description')).toHaveTextContent(
        'Input Register, address 49'
      )
    })
  })

  it('shows valid description for coil', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="100" onChange={onChange} />)

    await waitFor(() => {
      expect(screen.getByTestId('modbus-address-description')).toHaveTextContent(
        'Coil, address 99'
      )
    })
  })

  it('shows error for invalid address', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="50000" onChange={onChange} />)

    await waitFor(() => {
      expect(screen.getByTestId('modbus-address-error')).toHaveTextContent(
        'Address too large'
      )
    })
  })

  it('shows error for invalid range', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="25000" onChange={onChange} />)

    await waitFor(() => {
      expect(screen.getByTestId('modbus-address-error')).toHaveTextContent(
        'Invalid range'
      )
    })
  })

  it('shows external error', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="40001" onChange={onChange} error="Custom error" />)

    expect(screen.getByTestId('modbus-address-error')).toHaveTextContent('Custom error')
  })

  it('applies error styling when invalid', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="50000" onChange={onChange} />)

    const input = screen.getByTestId('modbus-address-input')

    await waitFor(() => {
      expect(input).toHaveClass('border-red-500')
    })
  })

  it('applies success styling when valid', async () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="40001" onChange={onChange} />)

    const input = screen.getByTestId('modbus-address-input')

    await waitFor(() => {
      expect(input).toHaveClass('border-green-500')
    })
  })

  it('can be disabled', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} disabled />)

    const input = screen.getByTestId('modbus-address-input')
    expect(input).toBeDisabled()
  })

  it('calls onChange with parsed address for valid input', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} />)

    const input = screen.getByTestId('modbus-address-input')
    fireEvent.change(input, { target: { value: '40001' } })

    expect(onChange).toHaveBeenCalledWith('40001', {
      registerType: 'holding',
      address: 0,
      traditional: 40001
    })
  })

  it('calls onChange with null for invalid input', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} />)

    const input = screen.getByTestId('modbus-address-input')
    fireEvent.change(input, { target: { value: '50000' } })

    expect(onChange).toHaveBeenCalledWith('50000', null)
  })

  it('applies custom className', () => {
    const onChange = vi.fn()
    render(<ModbusAddressInput value="" onChange={onChange} className="custom-class" />)

    const container = screen.getByTestId('modbus-address-input').closest('div')?.parentElement
    expect(container).toHaveClass('custom-class')
  })
})
