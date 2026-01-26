import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataExplorer } from '@renderer/components/explorer/DataExplorer'
import type { Tag, ModbusAddress } from '@shared/types/tag'
import type { ConnectionMetrics } from '@shared/types'

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

  describe('Connection Metrics Display', () => {
    const mockMetrics: ConnectionMetrics = {
      latencyMs: 12,
      latencyAvgMs: 15,
      requestCount: 1234,
      errorCount: 2,
      errorRate: 0.001,
      lastSuccessAt: Date.now(),
      reconnectAttempts: 0
    }

    it('should display latency', () => {
      render(<DataExplorer {...defaultProps} metrics={mockMetrics} />)
      const latencyEl = screen.getByTestId('latency-display')
      expect(latencyEl).toBeInTheDocument()
      expect(latencyEl).toHaveTextContent('12')
    })

    it('should show warning color when latency exceeds warning threshold', () => {
      const highLatency = { ...mockMetrics, latencyMs: 150 }
      render(<DataExplorer {...defaultProps} metrics={highLatency} />)
      const latencyEl = screen.getByTestId('latency-display')
      expect(latencyEl.querySelector('span')).toHaveClass('text-yellow-500')
    })

    it('should show alarm color when latency exceeds alarm threshold', () => {
      const alarmLatency = { ...mockMetrics, latencyMs: 600 }
      render(<DataExplorer {...defaultProps} metrics={alarmLatency} />)
      const latencyEl = screen.getByTestId('latency-display')
      expect(latencyEl.querySelector('span')).toHaveClass('text-red-500')
    })

    it('should show normal color when latency is healthy', () => {
      render(<DataExplorer {...defaultProps} metrics={mockMetrics} />)
      const latencyEl = screen.getByTestId('latency-display')
      expect(latencyEl.querySelector('span')).toHaveClass('text-green-500')
    })

    it('should not render status bar when metrics is undefined', () => {
      render(<DataExplorer {...defaultProps} metrics={undefined} />)
      expect(screen.queryByTestId('connection-status-bar')).not.toBeInTheDocument()
    })
  })
})
