import React, { useState, useCallback, type FormEvent } from 'react'
import { ChevronDown, ChevronRight, Plus, Loader2, Radio, Wifi } from 'lucide-react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@renderer/lib/utils'
import { useConnection } from '@renderer/hooks/useConnection'
import { DEFAULT_MODBUS_CONFIG, DEFAULT_MQTT_CONFIG } from '@shared/types/connection'
import type { ModbusTcpConfig, MqttConfig, Protocol } from '@shared/types/connection'

interface ConnectionFormProps {
  /** Optional callback when connection is created successfully */
  onCreated?: (connectionId: string) => void
  /** Optional additional className */
  className?: string
}

// Protocol options with icons
const PROTOCOL_OPTIONS: { value: Protocol; label: string; icon: typeof Radio }[] = [
  { value: 'modbus-tcp', label: 'Modbus TCP', icon: Radio },
  { value: 'mqtt', label: 'MQTT', icon: Wifi }
]

interface ModbusFormState {
  host: string
  port: string
  unitId: string
  timeout: string
}

interface MqttFormState {
  brokerUrl: string
  clientId: string
  username: string
  password: string
  useTls: boolean
}

interface FormState {
  name: string
  protocol: Protocol
  modbus: ModbusFormState
  mqtt: MqttFormState
}

interface ValidationErrors {
  name?: string
  // Modbus
  host?: string
  port?: string
  unitId?: string
  timeout?: string
  // MQTT
  brokerUrl?: string
  clientId?: string
}

const initialFormState: FormState = {
  name: '',
  protocol: 'modbus-tcp',
  modbus: {
    host: DEFAULT_MODBUS_CONFIG.host,
    port: String(DEFAULT_MODBUS_CONFIG.port),
    unitId: String(DEFAULT_MODBUS_CONFIG.unitId),
    timeout: String(DEFAULT_MODBUS_CONFIG.timeout)
  },
  mqtt: {
    brokerUrl: DEFAULT_MQTT_CONFIG.brokerUrl,
    clientId: DEFAULT_MQTT_CONFIG.clientId,
    username: '',
    password: '',
    useTls: DEFAULT_MQTT_CONFIG.useTls
  }
}

/**
 * ConnectionForm component for creating new connections.
 * Supports Modbus TCP and MQTT protocols with a collapsible design.
 */
export function ConnectionForm({
  onCreated,
  className
}: ConnectionFormProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const { create, isLoading, error, clearError } = useConnection()

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      if (error) {
        clearError()
      }
    },
    [error, clearError]
  )

  const updateModbusField = useCallback(
    (field: keyof ModbusFormState, value: string) => {
      setFormState((prev) => ({
        ...prev,
        modbus: { ...prev.modbus, [field]: value }
      }))
      if (validationErrors[field as keyof ValidationErrors]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      if (error) {
        clearError()
      }
    },
    [validationErrors, error, clearError]
  )

  const updateMqttField = useCallback(
    <K extends keyof MqttFormState>(field: K, value: MqttFormState[K]) => {
      setFormState((prev) => ({
        ...prev,
        mqtt: { ...prev.mqtt, [field]: value }
      }))
      if (validationErrors[field as keyof ValidationErrors]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      if (error) {
        clearError()
      }
    },
    [validationErrors, error, clearError]
  )

  const validate = useCallback((): boolean => {
    const errors: ValidationErrors = {}

    // Name validation
    if (!formState.name.trim()) {
      errors.name = 'Connection name is required'
    }

    if (formState.protocol === 'modbus-tcp') {
      // Host validation
      if (!formState.modbus.host.trim()) {
        errors.host = 'Host is required'
      }

      // Port validation
      const port = parseInt(formState.modbus.port, 10)
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.port = 'Port must be between 1 and 65535'
      }

      // Unit ID validation
      const unitId = parseInt(formState.modbus.unitId, 10)
      if (isNaN(unitId) || unitId < 0 || unitId > 255) {
        errors.unitId = 'Unit ID must be between 0 and 255'
      }

      // Timeout validation
      const timeout = parseInt(formState.modbus.timeout, 10)
      if (isNaN(timeout) || timeout < 100 || timeout > 60000) {
        errors.timeout = 'Timeout must be between 100ms and 60000ms'
      }
    } else if (formState.protocol === 'mqtt') {
      // Broker URL validation
      if (!formState.mqtt.brokerUrl.trim()) {
        errors.brokerUrl = 'Broker URL is required'
      } else if (!/^mqtts?:\/\/.+/.test(formState.mqtt.brokerUrl)) {
        errors.brokerUrl = 'URL must start with mqtt:// or mqtts://'
      }

      // Client ID validation
      if (!formState.mqtt.clientId.trim()) {
        errors.clientId = 'Client ID is required'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formState])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!validate()) {
        return
      }

      let config: ModbusTcpConfig | MqttConfig

      if (formState.protocol === 'modbus-tcp') {
        config = {
          host: formState.modbus.host.trim(),
          port: parseInt(formState.modbus.port, 10),
          unitId: parseInt(formState.modbus.unitId, 10),
          timeout: parseInt(formState.modbus.timeout, 10)
        }
      } else {
        config = {
          brokerUrl: formState.mqtt.brokerUrl.trim(),
          clientId: formState.mqtt.clientId.trim(),
          useTls: formState.mqtt.useTls,
          ...(formState.mqtt.username.trim() && { username: formState.mqtt.username.trim() }),
          ...(formState.mqtt.password && { password: formState.mqtt.password })
        }
      }

      const connectionId = await create(formState.name.trim(), formState.protocol, config)

      if (connectionId) {
        // Reset form on success
        setFormState(initialFormState)
        setValidationErrors({})
        setIsExpanded(false)
        onCreated?.(connectionId)
      }
    },
    [formState, validate, create, onCreated]
  )

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
    if (error) {
      clearError()
    }
  }, [error, clearError])

  const SelectedProtocolIcon = PROTOCOL_OPTIONS.find((p) => p.value === formState.protocol)?.icon || Radio

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5',
          'text-sm font-medium text-foreground',
          'hover:bg-muted/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          isExpanded && 'border-b border-border'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Plus className="h-4 w-4 text-muted-foreground" />
        <span>New Connection</span>
      </button>

      {/* Form Content */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Connection Name */}
          <div className="space-y-1.5">
            <Label.Root
              htmlFor="connection-name"
              className="text-xs font-medium text-muted-foreground"
            >
              Connection Name
            </Label.Root>
            <input
              id="connection-name"
              type="text"
              value={formState.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="My Device"
              disabled={isLoading}
              className={cn(
                'w-full h-8 px-2.5 text-sm rounded-md',
                'bg-background border border-input',
                'placeholder:text-muted-foreground/60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                validationErrors.name && 'border-destructive'
              )}
            />
            {validationErrors.name && (
              <p className="text-xs text-destructive">{validationErrors.name}</p>
            )}
          </div>

          {/* Protocol Selector */}
          <div className="space-y-1.5">
            <Label.Root className="text-xs font-medium text-muted-foreground">
              Protocol
            </Label.Root>
            <div className="grid grid-cols-2 gap-2">
              {PROTOCOL_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('protocol', option.value)}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md',
                      'text-sm font-medium transition-colors',
                      'border',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      formState.protocol === option.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Protocol-specific fields */}
          {formState.protocol === 'modbus-tcp' && (
            <>
              {/* Host and Port - Two columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label.Root
                    htmlFor="connection-host"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Host
                  </Label.Root>
                  <input
                    id="connection-host"
                    type="text"
                    value={formState.modbus.host}
                    onChange={(e) => updateModbusField('host', e.target.value)}
                    placeholder="127.0.0.1"
                    disabled={isLoading}
                    className={cn(
                      'w-full h-8 px-2.5 text-sm rounded-md',
                      'bg-background border border-input',
                      'placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      validationErrors.host && 'border-destructive'
                    )}
                  />
                  {validationErrors.host && (
                    <p className="text-xs text-destructive">{validationErrors.host}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label.Root
                    htmlFor="connection-port"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Port
                  </Label.Root>
                  <input
                    id="connection-port"
                    type="number"
                    value={formState.modbus.port}
                    onChange={(e) => updateModbusField('port', e.target.value)}
                    placeholder="502"
                    min={1}
                    max={65535}
                    disabled={isLoading}
                    className={cn(
                      'w-full h-8 px-2.5 text-sm rounded-md',
                      'bg-background border border-input',
                      'placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      validationErrors.port && 'border-destructive'
                    )}
                  />
                  {validationErrors.port && (
                    <p className="text-xs text-destructive">{validationErrors.port}</p>
                  )}
                </div>
              </div>

              {/* Unit ID and Timeout - Two columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label.Root
                    htmlFor="connection-unit-id"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Unit ID
                  </Label.Root>
                  <input
                    id="connection-unit-id"
                    type="number"
                    value={formState.modbus.unitId}
                    onChange={(e) => updateModbusField('unitId', e.target.value)}
                    placeholder="1"
                    min={0}
                    max={255}
                    disabled={isLoading}
                    className={cn(
                      'w-full h-8 px-2.5 text-sm rounded-md',
                      'bg-background border border-input',
                      'placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      validationErrors.unitId && 'border-destructive'
                    )}
                  />
                  {validationErrors.unitId && (
                    <p className="text-xs text-destructive">{validationErrors.unitId}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label.Root
                    htmlFor="connection-timeout"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Timeout (ms)
                  </Label.Root>
                  <input
                    id="connection-timeout"
                    type="number"
                    value={formState.modbus.timeout}
                    onChange={(e) => updateModbusField('timeout', e.target.value)}
                    placeholder="5000"
                    min={100}
                    max={60000}
                    disabled={isLoading}
                    className={cn(
                      'w-full h-8 px-2.5 text-sm rounded-md',
                      'bg-background border border-input',
                      'placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      validationErrors.timeout && 'border-destructive'
                    )}
                  />
                  {validationErrors.timeout && (
                    <p className="text-xs text-destructive">{validationErrors.timeout}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {formState.protocol === 'mqtt' && (
            <>
              {/* Broker URL */}
              <div className="space-y-1.5">
                <Label.Root
                  htmlFor="connection-broker-url"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Broker URL
                </Label.Root>
                <input
                  id="connection-broker-url"
                  type="text"
                  value={formState.mqtt.brokerUrl}
                  onChange={(e) => updateMqttField('brokerUrl', e.target.value)}
                  placeholder="mqtt://localhost:1883"
                  disabled={isLoading}
                  className={cn(
                    'w-full h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'placeholder:text-muted-foreground/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validationErrors.brokerUrl && 'border-destructive'
                  )}
                />
                {validationErrors.brokerUrl && (
                  <p className="text-xs text-destructive">{validationErrors.brokerUrl}</p>
                )}
              </div>

              {/* Client ID */}
              <div className="space-y-1.5">
                <Label.Root
                  htmlFor="connection-client-id"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Client ID
                </Label.Root>
                <input
                  id="connection-client-id"
                  type="text"
                  value={formState.mqtt.clientId}
                  onChange={(e) => updateMqttField('clientId', e.target.value)}
                  placeholder="connex-studio-client"
                  disabled={isLoading}
                  className={cn(
                    'w-full h-8 px-2.5 text-sm rounded-md',
                    'bg-background border border-input',
                    'placeholder:text-muted-foreground/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validationErrors.clientId && 'border-destructive'
                  )}
                />
                {validationErrors.clientId && (
                  <p className="text-xs text-destructive">{validationErrors.clientId}</p>
                )}
              </div>

              {/* Username and Password - Two columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label.Root
                    htmlFor="connection-username"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Username (optional)
                  </Label.Root>
                  <input
                    id="connection-username"
                    type="text"
                    value={formState.mqtt.username}
                    onChange={(e) => updateMqttField('username', e.target.value)}
                    placeholder="username"
                    disabled={isLoading}
                    className={cn(
                      'w-full h-8 px-2.5 text-sm rounded-md',
                      'bg-background border border-input',
                      'placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label.Root
                    htmlFor="connection-password"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Password (optional)
                  </Label.Root>
                  <input
                    id="connection-password"
                    type="password"
                    value={formState.mqtt.password}
                    onChange={(e) => updateMqttField('password', e.target.value)}
                    placeholder="password"
                    disabled={isLoading}
                    className={cn(
                      'w-full h-8 px-2.5 text-sm rounded-md',
                      'bg-background border border-input',
                      'placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  />
                </div>
              </div>

              {/* TLS Toggle */}
              <div className="flex items-center gap-2">
                <input
                  id="connection-use-tls"
                  type="checkbox"
                  checked={formState.mqtt.useTls}
                  onChange={(e) => updateMqttField('useTls', e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-input"
                />
                <Label.Root htmlFor="connection-use-tls" className="text-sm text-foreground">
                  Use TLS (mqtts://)
                </Label.Root>
              </div>
            </>
          )}

          {/* Error message from API */}
          {error && (
            <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full h-8 px-3 text-sm font-medium rounded-md',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <SelectedProtocolIcon className="h-4 w-4" />
                <span>Create Connection</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
