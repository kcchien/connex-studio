import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataExplorer } from '@renderer/components/explorer/DataExplorer'
import type { ConnectionMetrics } from '@shared/types'

// Mock window.electronAPI for polling hooks
const mockElectronAPI = {
  polling: {
    onData: vi.fn(() => vi.fn()), // Returns unsubscribe function
    onStatusChanged: vi.fn(() => vi.fn()),
    onError: vi.fn(() => vi.fn()),
    start: vi.fn(),
    stop: vi.fn(),
    status: vi.fn().mockResolvedValue({ isPolling: false, interval: 1000, connectionId: null }),
    getState: vi.fn().mockResolvedValue({ isPolling: false, interval: 1000, connectionId: null }),
    setInterval: vi.fn(),
  },
}

beforeEach(() => {
  // @ts-expect-error - mock window.electronAPI
  window.electronAPI = mockElectronAPI
  vi.clearAllMocks()
})

const mockDisplayStates: Record<
  string,
  { value: number | string | boolean; alarmState: 'normal' | 'warning' | 'alarm' }
> = {}

const defaultProps = {
  connectionId: 'conn-1',
  connectionName: 'PLC-01',
  connectionStatus: 'connected' as const,
  tags: [],
  displayStates: mockDisplayStates,
  onAddTag: vi.fn(),
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
}

describe('DataExplorer', () => {
  it('renders connection header with status', () => {
    render(<DataExplorer {...defaultProps} />)
    expect(screen.getByText('PLC-01')).toBeInTheDocument()
    expect(screen.getByText(/connected/i)).toBeInTheDocument()
  })

  it('shows empty state when no tags exist', () => {
    render(<DataExplorer {...defaultProps} />)
    expect(screen.getByText('No tags configured')).toBeInTheDocument()
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
      expect(latencyEl.querySelectorAll('span')[1]).toHaveClass('text-yellow-500')
    })

    it('should show alarm color when latency exceeds alarm threshold', () => {
      const alarmLatency = { ...mockMetrics, latencyMs: 600 }
      render(<DataExplorer {...defaultProps} metrics={alarmLatency} />)
      const latencyEl = screen.getByTestId('latency-display')
      expect(latencyEl.querySelectorAll('span')[1]).toHaveClass('text-red-500')
    })

    it('should show normal color when latency is healthy', () => {
      render(<DataExplorer {...defaultProps} metrics={mockMetrics} />)
      const latencyEl = screen.getByTestId('latency-display')
      expect(latencyEl.querySelectorAll('span')[1]).toHaveClass('text-green-500')
    })

    it('should not render status bar when metrics is undefined', () => {
      render(<DataExplorer {...defaultProps} metrics={undefined} />)
      expect(screen.queryByTestId('connection-status-bar')).not.toBeInTheDocument()
    })
  })
})
