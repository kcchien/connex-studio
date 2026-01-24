/**
 * VirtualServerPanel Component
 *
 * Main panel for managing virtual Modbus TCP servers.
 * Allows creating, starting, stopping virtual servers for testing.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { RegisterConfigForm, type RegisterConfig } from './RegisterConfigForm'
import { useVirtualServerStore } from '@renderer/stores/virtualServerStore'
import type { Waveform } from '@shared/types/virtual-server'

interface VirtualServerPanelProps {
  className?: string
}

const DEFAULT_PORT = 5020

const DEFAULT_REGISTER: RegisterConfig = {
  address: 0,
  length: 10,
  waveform: {
    type: 'sine',
    amplitude: 50,
    offset: 100,
    period: 10000
  }
}

export function VirtualServerPanel({
  className = ''
}: VirtualServerPanelProps): React.ReactElement {
  const { servers, isLoading, error, startServer, stopServer, refreshStatus } =
    useVirtualServerStore()

  const [port, setPort] = useState(DEFAULT_PORT)
  const [registers, setRegisters] = useState<RegisterConfig[]>([{ ...DEFAULT_REGISTER }])
  const [localError, setLocalError] = useState<string | null>(null)

  // Refresh status on mount
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleStart = useCallback(async () => {
    setLocalError(null)

    if (registers.length === 0) {
      setLocalError('Please add at least one register')
      return
    }

    const result = await startServer({
      port,
      registers
    })

    if (!result.success) {
      if (result.suggestedPort) {
        setLocalError(`${result.error}. Try port ${result.suggestedPort}`)
        setPort(result.suggestedPort)
      } else {
        setLocalError(result.error || 'Failed to start server')
      }
    }
  }, [port, registers, startServer])

  const handleStop = useCallback(
    async (serverId: string) => {
      setLocalError(null)
      const result = await stopServer(serverId)
      if (!result.success) {
        setLocalError(result.error || 'Failed to stop server')
      }
    },
    [stopServer]
  )

  const displayError = localError || error

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Virtual Server</h3>
        <span className="text-xs text-muted-foreground">
          {servers.length} server{servers.length !== 1 ? 's' : ''} active
        </span>
      </div>

      {/* Error Display */}
      {displayError && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {displayError}
        </div>
      )}

      {/* Server Configuration */}
      <div className="p-4 rounded-lg border bg-card">
        <h4 className="text-sm font-medium text-foreground mb-3">
          Start New Server
        </h4>

        {/* Port */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value) || DEFAULT_PORT)}
            min="1024"
            max="65535"
            className="w-32 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Registers */}
        <RegisterConfigForm
          registers={registers}
          onChange={setRegisters}
          className="mb-4"
        />

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Starting...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Server
            </>
          )}
        </button>
      </div>

      {/* Active Servers */}
      {servers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Active Servers</h4>
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onStop={() => handleStop(server.id)}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ServerCardProps {
  server: {
    id: string
    protocol: string
    port: number
    status: string
    clientCount?: number
    lastError?: string
    registers: Array<{
      address: number
      length: number
      waveform: Waveform
    }>
  }
  onStop: () => void
  isLoading: boolean
}

function ServerCard({ server, onStop, isLoading }: ServerCardProps): React.ReactElement {
  const statusColors: Record<string, string> = {
    running: 'bg-green-500',
    starting: 'bg-yellow-500',
    stopped: 'bg-gray-500',
    error: 'bg-red-500'
  }

  return (
    <div className="p-3 rounded-md border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${statusColors[server.status] || 'bg-gray-500'}`}
          />
          <span className="text-sm font-medium">{server.id}</span>
          <span className="text-xs text-muted-foreground">
            Port {server.port}
          </span>
        </div>
        <button
          onClick={onStop}
          disabled={isLoading || server.status !== 'running'}
          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Stop
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Protocol: {server.protocol}</span>
        <span>Clients: {server.clientCount ?? 0}</span>
        <span>Registers: {server.registers.length}</span>
      </div>

      {server.lastError && (
        <div className="mt-2 text-xs text-destructive">{server.lastError}</div>
      )}
    </div>
  )
}
