import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@renderer/lib/utils'
import {
  Server,
  Radio,
  Cable,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import type { Protocol, ModbusTcpConfig, MqttConfig, OpcUaConfig } from '@shared/types/connection'
import type { ByteOrder } from '@shared/types'
import { ByteOrderSelector } from './ByteOrderSelector'
import { validateHost, validatePort, filterNumericInput } from '@shared/utils/validation'

export interface ConnectionFormData {
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
}

/** Default ports for each protocol */
const DEFAULT_PORTS: Record<Protocol, number> = {
  'modbus-tcp': 502,
  mqtt: 1883,
  opcua: 4840,
}

/** Test connection result state */
interface TestResult {
  success: boolean
  message: string
}

export interface NewConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ConnectionFormData) => void | Promise<void>
  onTestConnection?: (data: ConnectionFormData) => Promise<boolean>
}

const protocolOptions: {
  value: Protocol
  label: string
  icon: typeof Cable
  color: string
  borderColor: string
  hostPlaceholder: string
  /** For non-Modbus protocols that still use address field */
  addressPlaceholder?: string
}[] = [
  {
    value: 'modbus-tcp',
    label: 'Modbus TCP',
    icon: Server,
    color: 'text-teal-400',
    borderColor: 'border-teal-500',
    hostPlaceholder: '192.168.1.100',
  },
  {
    value: 'mqtt',
    label: 'MQTT',
    icon: Radio,
    color: 'text-green-400',
    borderColor: 'border-green-500',
    hostPlaceholder: 'localhost',
    addressPlaceholder: 'mqtt://localhost:1883',
  },
  {
    value: 'opcua',
    label: 'OPC UA',
    icon: Cable,
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    hostPlaceholder: 'localhost',
    addressPlaceholder: 'opc.tcp://localhost:4840',
  },
]

/**
 * NewConnectionDialog - Minimal fields connection dialog
 * Design: 3-second connection with only name + address required
 */
export function NewConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  onTestConnection,
}: NewConnectionDialogProps): React.ReactElement {
  const [protocol, setProtocol] = useState<Protocol>('modbus-tcp')
  const [name, setName] = useState('')
  // Separate host and port fields for Modbus TCP
  const [host, setHost] = useState('')
  const [port, setPort] = useState(String(DEFAULT_PORTS['modbus-tcp']))
  // Combined address field for MQTT/OPC UA
  const [address, setAddress] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Validation errors
  const [hostError, setHostError] = useState<string | undefined>()
  const [portError, setPortError] = useState<string | undefined>()

  // Track if port was manually edited (to preserve user input when switching protocols)
  const [portManuallyEdited, setPortManuallyEdited] = useState(false)

  // Advanced options
  const [unitId, setUnitId] = useState(1)
  const [timeout, setTimeout] = useState(5000)
  const [byteOrder, setByteOrder] = useState<ByteOrder>('ABCD')

  const selectedProtocol = protocolOptions.find(p => p.value === protocol)!

  // Reset test result when inputs change
  useEffect(() => {
    setTestResult(null)
  }, [host, port, address, protocol])

  // Handle protocol change - update port if not manually edited
  const handleProtocolChange = useCallback((newProtocol: Protocol) => {
    const oldDefaultPort = DEFAULT_PORTS[protocol]
    const newDefaultPort = DEFAULT_PORTS[newProtocol]

    setProtocol(newProtocol)

    // Only update port if:
    // 1. Port was never manually edited, OR
    // 2. Port is currently the old protocol's default
    if (!portManuallyEdited || port === String(oldDefaultPort)) {
      setPort(String(newDefaultPort))
    }

    // Clear validation errors when switching protocol
    setHostError(undefined)
    setPortError(undefined)
  }, [protocol, port, portManuallyEdited])

  // Validate host with debounce effect
  const handleHostChange = useCallback((value: string) => {
    setHost(value)
    // Clear error immediately when user starts typing
    if (hostError) setHostError(undefined)
  }, [hostError])

  // Validate host on blur
  const handleHostBlur = useCallback(() => {
    if (host) {
      const result = validateHost(host)
      setHostError(result.error)
    }
  }, [host])

  // Handle port change with filtering
  const handlePortChange = useCallback((value: string) => {
    const filtered = filterNumericInput(value)
    setPort(filtered)
    setPortManuallyEdited(true)
    // Clear error immediately when user starts typing
    if (portError) setPortError(undefined)
  }, [portError])

  // Validate port on blur
  const handlePortBlur = useCallback(() => {
    if (port) {
      const result = validatePort(port)
      setPortError(result.error)
    }
  }, [port])

  // Check if form is valid for submission
  const isFormValid = useCallback(() => {
    if (!name) return false

    if (protocol === 'modbus-tcp') {
      const hostValidation = validateHost(host)
      const portValidation = validatePort(port)
      return hostValidation.valid && portValidation.valid
    } else {
      return !!address
    }
  }, [name, protocol, host, port, address])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = buildFormData()
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestConnection = async () => {
    // Validate before testing
    if (protocol === 'modbus-tcp') {
      const hostResult = validateHost(host)
      const portResult = validatePort(port)

      if (!hostResult.valid) {
        setHostError(hostResult.error)
        return
      }
      if (!portResult.valid) {
        setPortError(portResult.error)
        return
      }
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      // Use prop callback if provided (for testing), otherwise use IPC
      if (onTestConnection) {
        const formData = buildFormData()
        const success = await onTestConnection(formData)
        setTestResult({
          success,
          message: success ? 'Connection successful' : 'Connection failed',
        })
      } else if (protocol === 'modbus-tcp') {
        // Use IPC for actual test connection
        const result = await window.electronAPI.connection.testConnection({
          protocol,
          host: host.trim(),
          port: Number(port),
        })
        setTestResult({
          success: result.success,
          message: result.success ? 'Connection successful' : result.error || 'Connection failed',
        })
      } else {
        // Other protocols not yet implemented
        setTestResult({
          success: false,
          message: `Test connection not implemented for ${protocol}`,
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const buildFormData = (): ConnectionFormData => {
    switch (protocol) {
      case 'modbus-tcp': {
        return {
          name,
          protocol,
          config: {
            host: host.trim(),
            port: Number(port),
            unitId,
            timeout,
            defaultByteOrder: byteOrder,
          } as ModbusTcpConfig
        }
      }
      case 'mqtt':
        return {
          name,
          protocol,
          config: {
            brokerUrl: address,
            clientId: `connex-studio-${Date.now()}`,
            useTls: address.startsWith('mqtts://'),
          } as MqttConfig
        }
      case 'opcua':
        return {
          name,
          protocol,
          config: {
            endpointUrl: address,
            securityMode: 'None',
            securityPolicy: 'None',
          } as OpcUaConfig
        }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              New Connection
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Protocol Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Protocol</label>
              <div className="grid grid-cols-3 gap-3">
                {protocolOptions.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = protocol === opt.value

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleProtocolChange(opt.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all',
                        'flex flex-col items-center gap-2',
                        isSelected
                          ? `${opt.borderColor} bg-gray-100 dark:bg-gray-800`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                      )}
                    >
                      <Icon className={cn('w-6 h-6', opt.color)} />
                      <span className={cn('text-xs font-medium', isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Connection Name */}
            <div className="space-y-2">
              <label htmlFor="connection-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Connection Name
              </label>
              <input
                id="connection-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My PLC"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg',
                  'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'transition-all'
                )}
              />
            </div>

            {/* Host/Port for Modbus TCP, Address for others */}
            {protocol === 'modbus-tcp' ? (
              <div className="grid grid-cols-3 gap-3">
                {/* Host */}
                <div className="col-span-2 space-y-2">
                  <label htmlFor="connection-host" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Host
                  </label>
                  <input
                    id="connection-host"
                    type="text"
                    value={host}
                    onChange={(e) => handleHostChange(e.target.value)}
                    onBlur={handleHostBlur}
                    placeholder={selectedProtocol.hostPlaceholder}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg',
                      'bg-gray-50 dark:bg-gray-800 border',
                      hostError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                      'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                      'focus:outline-none focus:ring-2 focus:border-transparent',
                      'transition-all'
                    )}
                  />
                  {hostError && (
                    <p className="text-xs text-red-500">{hostError}</p>
                  )}
                </div>
                {/* Port */}
                <div className="space-y-2">
                  <label htmlFor="connection-port" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Port
                  </label>
                  <input
                    id="connection-port"
                    type="text"
                    inputMode="numeric"
                    value={port}
                    onChange={(e) => handlePortChange(e.target.value)}
                    onBlur={handlePortBlur}
                    placeholder={String(DEFAULT_PORTS[protocol])}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg',
                      'bg-gray-50 dark:bg-gray-800 border',
                      portError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                      'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                      'focus:outline-none focus:ring-2 focus:border-transparent',
                      'transition-all'
                    )}
                  />
                  {portError && (
                    <p className="text-xs text-red-500">{portError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="connection-address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Address
                </label>
                <input
                  id="connection-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={selectedProtocol.addressPlaceholder}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg',
                    'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'transition-all'
                  )}
                />
              </div>
            )}

            {/* Test Connection Result */}
            {testResult && (
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                )}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {testResult.message}
              </div>
            )}

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                data-testid="advanced-options-toggle"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {advancedOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Advanced Options
              </button>

              {advancedOpen && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-4">
                  {protocol === 'modbus-tcp' && (
                    <>
                      <div className="space-y-2">
                        <label htmlFor="unit-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Unit ID
                        </label>
                        <input
                          id="unit-id"
                          type="number"
                          min={1}
                          max={247}
                          value={unitId}
                          onChange={(e) => setUnitId(Number(e.target.value))}
                          className={cn(
                            'w-full px-4 py-2 rounded-lg',
                            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                            'text-gray-900 dark:text-white',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="timeout" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Timeout (ms)
                        </label>
                        <input
                          id="timeout"
                          type="number"
                          min={1000}
                          max={30000}
                          step={1000}
                          value={timeout}
                          onChange={(e) => setTimeout(Number(e.target.value))}
                          className={cn(
                            'w-full px-4 py-2 rounded-lg',
                            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                            'text-gray-900 dark:text-white',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                          )}
                        />
                      </div>
                      <ByteOrderSelector
                        value={byteOrder}
                        onChange={setByteOrder}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white',
                  'transition-colors'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !isFormValid()}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  'border border-gray-300 dark:border-gray-600',
                  'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors flex items-center gap-2'
                )}
              >
                {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
                Test
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm',
                  'bg-gradient-to-r from-blue-500 to-teal-400',
                  'text-white font-medium',
                  'hover:shadow-lg hover:shadow-blue-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all flex items-center gap-2'
                )}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
