import React, { useState } from 'react'
import { cn } from '@renderer/lib/utils'
import {
  Server,
  Radio,
  Cable,
  ChevronDown,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import type { Protocol, ModbusTcpConfig, MqttConfig, OpcUaConfig } from '@shared/types/connection'
import type { ByteOrder } from '@shared/types'
import { ByteOrderSelector } from './ByteOrderSelector'

export interface ConnectionFormData {
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
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
  placeholder: string
}[] = [
  {
    value: 'modbus-tcp',
    label: 'Modbus TCP',
    icon: Server,
    color: 'text-teal-400',
    borderColor: 'border-teal-500',
    placeholder: '192.168.1.100:502'
  },
  {
    value: 'mqtt',
    label: 'MQTT',
    icon: Radio,
    color: 'text-green-400',
    borderColor: 'border-green-500',
    placeholder: 'mqtt://localhost:1883'
  },
  {
    value: 'opcua',
    label: 'OPC UA',
    icon: Cable,
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    placeholder: 'opc.tcp://localhost:4840'
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
  const [address, setAddress] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Advanced options
  const [unitId, setUnitId] = useState(1)
  const [timeout, setTimeout] = useState(5000)
  const [byteOrder, setByteOrder] = useState<ByteOrder>('ABCD')

  const selectedProtocol = protocolOptions.find(p => p.value === protocol)!

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
    if (!onTestConnection) return

    setIsTesting(true)
    try {
      const formData = buildFormData()
      await onTestConnection(formData)
    } finally {
      setIsTesting(false)
    }
  }

  const buildFormData = (): ConnectionFormData => {
    const baseConfig = { address }

    switch (protocol) {
      case 'modbus-tcp': {
        const [host, port] = parseHostPort(address, 502)
        return {
          name,
          protocol,
          config: {
            host,
            port,
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

  const parseHostPort = (addr: string, defaultPort: number): [string, number] => {
    const parts = addr.split(':')
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      return [parts[0], Number(parts[1])]
    }
    return [addr, defaultPort]
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
                      onClick={() => setProtocol(opt.value)}
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

            {/* Address */}
            <div className="space-y-2">
              <label htmlFor="connection-address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Address
              </label>
              <input
                id="connection-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={selectedProtocol.placeholder}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg',
                  'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'transition-all'
                )}
              />
            </div>

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
                disabled={isTesting || !address}
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
                disabled={isSubmitting || !name || !address}
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
