import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataExplorer } from '@renderer/components/explorer/DataExplorer'
import type { Tag, ModbusAddress } from '@shared/types/tag'

// Mock tags data
const mockTags: Tag[] = [
  {
    id: 'tag-1',
    connectionId: 'conn-1',
    name: 'Temperature_01',
    address: {
      type: 'modbus',
      registerType: 'holding',
      address: 0,
      length: 1,
    } as ModbusAddress,
    dataType: 'float32',
    displayFormat: { decimals: 1, unit: '°C' },
    thresholds: { warningHigh: 30, alarmHigh: 40 },
    enabled: true,
  },
  {
    id: 'tag-2',
    connectionId: 'conn-1',
    name: 'Pressure_Main',
    address: {
      type: 'modbus',
      registerType: 'holding',
      address: 2,
      length: 1,
    } as ModbusAddress,
    dataType: 'float32',
    displayFormat: { decimals: 2, unit: 'bar' },
    thresholds: { warningHigh: 5, alarmHigh: 7 },
    enabled: true,
  },
]

// Mock display states with values and alarm states
const mockDisplayStates: Record<string, { value: number | string | boolean; alarmState: 'normal' | 'warning' | 'alarm' }> = {
  'tag-1': { value: 23.5, alarmState: 'normal' },
  'tag-2': { value: 5.5, alarmState: 'warning' },
}

const defaultProps = {
  connectionName: 'PLC-01',
  connectionStatus: 'connected' as const,
  latency: 12,
  tags: mockTags,
  displayStates: mockDisplayStates,
  onAddTag: vi.fn(),
  onDisconnect: vi.fn(),
}

describe('DataExplorer', () => {
  it('renders connection header with status', () => {
    render(<DataExplorer {...defaultProps} />)
    expect(screen.getByText('PLC-01')).toBeInTheDocument()
    expect(screen.getByText(/connected/i)).toBeInTheDocument()
    expect(screen.getByText('12ms')).toBeInTheDocument()
  })

  it('renders tag list with values and sparklines', () => {
    render(<DataExplorer {...defaultProps} />)
    expect(screen.getByText('Temperature_01')).toBeInTheDocument()
    expect(screen.getByText('23.5')).toBeInTheDocument()
  })

  it('shows tag details when tag selected', () => {
    render(<DataExplorer {...defaultProps} />)
    fireEvent.click(screen.getByText('Temperature_01'))
    expect(screen.getByTestId('tag-details')).toBeInTheDocument()
  })

  it('shows alarm state styling', () => {
    render(<DataExplorer {...defaultProps} />)
    const warningRow = screen.getByText('Pressure_Main').closest('[data-testid="tag-row"]')
    expect(warningRow).toHaveClass('bg-yellow-500/10')
  })
})
