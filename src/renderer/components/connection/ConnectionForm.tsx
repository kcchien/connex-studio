import React, { useState, useCallback, type FormEvent } from 'react'
import { ChevronDown, ChevronRight, Plus, Loader2 } from 'lucide-react'
import * as Label from '@radix-ui/react-label'
import { cn } from '@renderer/lib/utils'
import { useConnection } from '@renderer/hooks/useConnection'
import { DEFAULT_MODBUS_CONFIG } from '@shared/types/connection'
import type { ModbusTcpConfig } from '@shared/types/connection'

interface ConnectionFormProps {
  /** Optional callback when connection is created successfully */
  onCreated?: (connectionId: string) => void
  /** Optional additional className */
  className?: string
}

interface FormState {
  name: string
  host: string
  port: string
  unitId: string
  timeout: string
}

interface ValidationErrors {
  name?: string
  host?: string
  port?: string
  unitId?: string
  timeout?: string
}

const initialFormState: FormState = {
  name: '',
  host: DEFAULT_MODBUS_CONFIG.host,
  port: String(DEFAULT_MODBUS_CONFIG.port),
  unitId: String(DEFAULT_MODBUS_CONFIG.unitId),
  timeout: String(DEFAULT_MODBUS_CONFIG.timeout)
}

/**
 * ConnectionForm component for creating new Modbus TCP connections.
 * Features a collapsible design with input validation.
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
    (field: keyof FormState, value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      // Clear API error when user makes changes
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

    // Host validation
    if (!formState.host.trim()) {
      errors.host = 'Host is required'
    }

    // Port validation
    const port = parseInt(formState.port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.port = 'Port must be between 1 and 65535'
    }

    // Unit ID validation
    const unitId = parseInt(formState.unitId, 10)
    if (isNaN(unitId) || unitId < 0 || unitId > 255) {
      errors.unitId = 'Unit ID must be between 0 and 255'
    }

    // Timeout validation
    const timeout = parseInt(formState.timeout, 10)
    if (isNaN(timeout) || timeout < 100 || timeout > 60000) {
      errors.timeout = 'Timeout must be between 100ms and 60000ms'
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

      const config: ModbusTcpConfig = {
        host: formState.host.trim(),
        port: parseInt(formState.port, 10),
        unitId: parseInt(formState.unitId, 10),
        timeout: parseInt(formState.timeout, 10)
      }

      const connectionId = await create(formState.name.trim(), 'modbus-tcp', config)

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
              placeholder="My Modbus Device"
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
                value={formState.host}
                onChange={(e) => updateField('host', e.target.value)}
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
                value={formState.port}
                onChange={(e) => updateField('port', e.target.value)}
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
                value={formState.unitId}
                onChange={(e) => updateField('unitId', e.target.value)}
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
                value={formState.timeout}
                onChange={(e) => updateField('timeout', e.target.value)}
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
                <Plus className="h-4 w-4" />
                <span>Create Connection</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
