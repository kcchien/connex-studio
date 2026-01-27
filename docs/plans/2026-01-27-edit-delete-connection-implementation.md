# Edit & Delete Connection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Edit Connection" and "Delete Connection" features with improved UX using a dropdown menu.

**Architecture:** Main process (ConnectionManager) owns all connection state (SSOT). Renderer sends IPC requests, Main processes them and pushes updates back. New `connection:update` IPC channel handles edit operations with auto-reconnect logic.

**Tech Stack:** TypeScript, React 19, Radix UI (DropdownMenu, AlertDialog), Zustand, Electron IPC

---

## Task 1: Add CONNECTION_UPDATE IPC Channel Constant

**Files:**
- Modify: `src/shared/constants/ipc-channels.ts:7-16`

**Step 1: Add the constant**

Add after line 16 (after `CONNECTION_TEST`):

```typescript
export const CONNECTION_UPDATE = 'connection:update'
```

**Step 2: Add to IPC_CHANNELS object**

Find the `connection` object in `IPC_CHANNELS` (around line 215-226) and add:

```typescript
  connection: {
    create: CONNECTION_CREATE,
    connect: CONNECTION_CONNECT,
    disconnect: CONNECTION_DISCONNECT,
    delete: CONNECTION_DELETE,
    list: CONNECTION_LIST,
    readOnce: CONNECTION_READ_ONCE,
    statusChanged: CONNECTION_STATUS_CHANGED,
    metrics: CONNECTION_METRICS,
    metricsChanged: CONNECTION_METRICS_CHANGED,
    test: CONNECTION_TEST,
    update: CONNECTION_UPDATE  // Add this line
  },
```

**Step 3: Verify**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/shared/constants/ipc-channels.ts
git commit -m "feat(ipc): add CONNECTION_UPDATE channel constant"
```

---

## Task 2: Add ConnectionUpdates Type Definition

**Files:**
- Modify: `src/shared/types/connection.ts`

**Step 1: Add type at the end of the file (after DEFAULT_OPCUA_CONFIG)**

```typescript
/**
 * Partial updates for connection editing.
 * Protocol cannot be changed after creation.
 */
export interface ConnectionUpdates {
  name?: string
  config?: Partial<ModbusTcpConfig> | Partial<MqttConfig> | Partial<OpcUaConfig>
}
```

**Step 2: Verify**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/types/connection.ts
git commit -m "feat(types): add ConnectionUpdates interface"
```

---

## Task 3: Implement ConnectionManager.updateConnection()

**Files:**
- Modify: `src/main/services/ConnectionManager.ts`

**Step 1: Add updateConnection method after deleteConnection() (around line 138)**

```typescript
  /**
   * Update a connection's configuration.
   * If connected, will disconnect, apply updates, then reconnect.
   * @returns The updated connection
   */
  async updateConnection(
    connectionId: string,
    updates: { name?: string; config?: Partial<ModbusTcpConfig | MqttConfig | OpcUaConfig> }
  ): Promise<Connection> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`)
    }

    const wasConnected = connection.status === 'connected'

    // 1. Disconnect if connected
    if (wasConnected) {
      log.info(`[ConnectionManager] Disconnecting for update: ${connectionId}`)
      await this.disconnect(connectionId)
    }

    // 2. Apply updates (SSOT mutation)
    if (updates.name !== undefined) {
      connection.name = updates.name
    }
    if (updates.config !== undefined) {
      connection.config = { ...connection.config, ...updates.config } as typeof connection.config
    }

    log.info(`[ConnectionManager] Updated connection: ${connectionId}`)

    // 3. Reconnect if was connected
    if (wasConnected) {
      log.info(`[ConnectionManager] Reconnecting after update: ${connectionId}`)
      try {
        await this.connect(connectionId, true)
      } catch (error) {
        // Connection update succeeded, but reconnect failed
        // Status will be 'error', user can manually reconnect
        log.warn(`[ConnectionManager] Reconnect after update failed: ${error}`)
      }
    }

    return connection
  }
```

**Step 2: Add import for ConnectionUpdates type**

At the top of the file, update the import from `@shared/types`:

```typescript
import type {
  Connection,
  ConnectionStatus,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  Tag,
  ModbusAddress,
  MqttAddress,
  OpcUaAddress,
  DataType,
  ConnectionUpdates  // Add this
} from '@shared/types'
```

Note: If ConnectionUpdates is not exported from the barrel file, we'll handle that in the next step.

**Step 3: Verify**

Run: `pnpm typecheck`
Expected: No errors (or may need to export from barrel - see Task 4)

**Step 4: Commit**

```bash
git add src/main/services/ConnectionManager.ts
git commit -m "feat(main): add ConnectionManager.updateConnection method"
```

---

## Task 4: Export ConnectionUpdates from Barrel

**Files:**
- Modify: `src/shared/types/index.ts`

**Step 1: Add export**

Find the connection exports and add `ConnectionUpdates`:

```typescript
export type {
  Protocol,
  ConnectionStatus,
  ConnectionMetrics,
  Connection,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  ConnectionUpdates  // Add this
} from './connection'
```

**Step 2: Verify**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/types/index.ts
git commit -m "feat(types): export ConnectionUpdates from barrel"
```

---

## Task 5: Add connection:update IPC Handler

**Files:**
- Modify: `src/main/ipc/connection.ts`

**Step 1: Add import for CONNECTION_UPDATE**

Update the imports at the top:

```typescript
import {
  CONNECTION_CREATE,
  CONNECTION_CONNECT,
  CONNECTION_DISCONNECT,
  CONNECTION_DELETE,
  CONNECTION_LIST,
  CONNECTION_READ_ONCE,
  CONNECTION_METRICS,
  CONNECTION_TEST,
  CONNECTION_UPDATE  // Add this
} from '@shared/constants/ipc-channels'
```

**Step 2: Add UpdateConnectionParams interface (after DeleteParams)**

```typescript
interface UpdateConnectionParams {
  connectionId: string
  updates: {
    name?: string
    config?: Partial<ModbusTcpConfig> | Partial<MqttConfig> | Partial<OpcUaConfig>
  }
}
```

**Step 3: Add handler in registerConnectionHandlers() (after connection:delete handler)**

```typescript
  // connection:update
  ipcMain.handle(CONNECTION_UPDATE, async (_event, params: UpdateConnectionParams) => {
    log.debug(`[IPC] ${CONNECTION_UPDATE}`, params)

    try {
      const connection = await manager.updateConnection(params.connectionId, params.updates)
      return { success: true, connection }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error(`[IPC] ${CONNECTION_UPDATE} failed: ${message}`)
      return { success: false, error: message }
    }
  })
```

**Step 4: Verify**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add src/main/ipc/connection.ts
git commit -m "feat(ipc): add connection:update handler"
```

---

## Task 6: Add connection.update to Preload API

**Files:**
- Modify: `src/preload/index.ts`

**Step 1: Add update method to ElectronAPI interface (in connection section, around line 128)**

After the `delete` method:

```typescript
    update: (params: {
      connectionId: string
      updates: {
        name?: string
        config?: Partial<ModbusTcpConfig> | Partial<MqttConfig> | Partial<OpcUaConfig>
      }
    }) => Promise<IpcResult<{ connection: Connection }>>
```

**Step 2: Add implementation (in electronAPI object, connection section)**

After the `delete` implementation:

```typescript
    update: (params) => ipcRenderer.invoke('connection:update', params),
```

**Step 3: Verify**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat(preload): expose connection.update API"
```

---

## Task 7: Add update() to useConnection Hook

**Files:**
- Modify: `src/renderer/hooks/useConnection.ts`

**Step 1: Import ConnectionUpdates type**

Update imports:

```typescript
import type {
  Protocol,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  ConnectionStatus,
  ConnectionUpdates  // Add this
} from '@shared/types/connection'
```

**Step 2: Add update to UseConnectionReturn interface (after remove)**

```typescript
  update: (
    connectionId: string,
    updates: ConnectionUpdates
  ) => Promise<boolean>
```

**Step 3: Add update implementation (after remove function)**

```typescript
  /**
   * Update a connection's configuration.
   * @returns true on success, false on failure.
   */
  const update = useCallback(
    async (connectionId: string, updates: ConnectionUpdates): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await window.electronAPI.connection.update({
          connectionId,
          updates
        })

        if (result.success && result.connection) {
          // Update store with the returned connection from Main (SSOT)
          updateConnection(connectionId, result.connection)
          return true
        } else {
          throw new Error(result.error || 'Update failed')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update connection'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [updateConnection]
  )
```

**Step 4: Add update to return object**

```typescript
  return {
    create,
    connect,
    disconnect,
    remove,
    update,  // Add this
    readOnce,
    isLoading,
    error,
    clearError
  }
```

**Step 5: Verify**

Run: `pnpm typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add src/renderer/hooks/useConnection.ts
git commit -m "feat(hooks): add update() to useConnection"
```

---

## Task 8: Create DeleteConfirmDialog Component

**Files:**
- Create: `src/renderer/components/connection/DeleteConfirmDialog.tsx`
- Create: `tests/unit/renderer/components/connection/DeleteConfirmDialog.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

describe('DeleteConfirmDialog', () => {
  it('renders connection name in the message', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={() => {}}
        connectionName="Test PLC"
        onConfirm={() => {}}
      />
    )

    expect(screen.getByText(/Test PLC/)).toBeInTheDocument()
  })

  it('calls onConfirm when Delete button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={() => {}}
        connectionName="Test PLC"
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange with false when Cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        connectionName="Test PLC"
        onConfirm={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --run tests/unit/renderer/components/connection/DeleteConfirmDialog.test.tsx`
Expected: FAIL (module not found)

**Step 3: Create the component**

```typescript
/**
 * DeleteConfirmDialog - Confirmation dialog before deleting a connection.
 */

import React from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { cn } from '@renderer/lib/utils'
import { AlertTriangle } from 'lucide-react'

export interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionName: string
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  connectionName,
  onConfirm
}: DeleteConfirmDialogProps): React.ReactElement {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Connection
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">"{connectionName}"</span>? This action cannot be undone.
              </AlertDialog.Description>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-600',
                  'transition-colors'
                )}
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={handleConfirm}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-red-600 text-white',
                  'hover:bg-red-700',
                  'transition-colors'
                )}
              >
                Delete
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --run tests/unit/renderer/components/connection/DeleteConfirmDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/connection/DeleteConfirmDialog.tsx tests/unit/renderer/components/connection/DeleteConfirmDialog.test.tsx
git commit -m "feat(ui): add DeleteConfirmDialog component"
```

---

## Task 9: Create ConnectionMenu Component

**Files:**
- Create: `src/renderer/components/connection/ConnectionMenu.tsx`
- Create: `tests/unit/renderer/components/connection/ConnectionMenu.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConnectionMenu } from './ConnectionMenu'
import type { Connection } from '@shared/types/connection'

const mockConnection: Connection = {
  id: 'test-id',
  name: 'Test PLC',
  protocol: 'modbus-tcp',
  config: { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 },
  status: 'disconnected',
  createdAt: Date.now()
}

describe('ConnectionMenu', () => {
  it('renders the menu trigger button', () => {
    render(
      <ConnectionMenu
        connection={mockConnection}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows Edit and Delete options when menu is opened', async () => {
    render(
      <ConnectionMenu
        connection={mockConnection}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    expect(await screen.findByText('Edit')).toBeInTheDocument()
    expect(await screen.findByText('Delete')).toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', async () => {
    const onEdit = vi.fn()
    render(
      <ConnectionMenu
        connection={mockConnection}
        onEdit={onEdit}
        onDelete={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(await screen.findByText('Edit'))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('disables Delete when connection is connected', async () => {
    const connectedConnection = { ...mockConnection, status: 'connected' as const }
    render(
      <ConnectionMenu
        connection={connectedConnection}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    const deleteItem = await screen.findByText('Delete')

    expect(deleteItem.closest('[data-disabled]')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --run tests/unit/renderer/components/connection/ConnectionMenu.test.tsx`
Expected: FAIL (module not found)

**Step 3: Create the component**

```typescript
/**
 * ConnectionMenu - Dropdown menu with Edit/Delete actions for a connection.
 */

import React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Connection } from '@shared/types/connection'

export interface ConnectionMenuProps {
  connection: Connection
  onEdit: () => void
  onDelete: () => void
}

export function ConnectionMenu({
  connection,
  onEdit,
  onDelete
}: ConnectionMenuProps): React.ReactElement {
  const isConnected = connection.status === 'connected' || connection.status === 'connecting'
  const canDelete = !isConnected

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'p-1.5 rounded-md transition-colors',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'min-w-[140px] rounded-lg p-1',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
          sideOffset={5}
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'cursor-pointer outline-none',
              'data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700'
            )}
            onSelect={onEdit}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px my-1 bg-gray-200 dark:bg-gray-700" />

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
              'cursor-pointer outline-none',
              canDelete
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            )}
            onSelect={canDelete ? onDelete : undefined}
            disabled={!canDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --run tests/unit/renderer/components/connection/ConnectionMenu.test.tsx`
Expected: PASS (or may need adjustment for Radix testing)

**Step 5: Commit**

```bash
git add src/renderer/components/connection/ConnectionMenu.tsx tests/unit/renderer/components/connection/ConnectionMenu.test.tsx
git commit -m "feat(ui): add ConnectionMenu dropdown component"
```

---

## Task 10: Create EditConnectionDialog Component

**Files:**
- Create: `src/renderer/components/connection/EditConnectionDialog.tsx`
- Create: `tests/unit/renderer/components/connection/EditConnectionDialog.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditConnectionDialog } from './EditConnectionDialog'
import type { Connection } from '@shared/types/connection'

const mockModbusConnection: Connection = {
  id: 'test-id',
  name: 'Test PLC',
  protocol: 'modbus-tcp',
  config: { host: '192.168.1.1', port: 502, unitId: 1, timeout: 5000 },
  status: 'disconnected',
  createdAt: Date.now()
}

describe('EditConnectionDialog', () => {
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

  it('shows protocol as disabled/readonly', () => {
    render(
      <EditConnectionDialog
        open={true}
        onOpenChange={() => {}}
        connection={mockModbusConnection}
        onSave={async () => {}}
      />
    )

    expect(screen.getByText('Modbus TCP')).toBeInTheDocument()
    // Protocol selector buttons should not be clickable
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
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --run tests/unit/renderer/components/connection/EditConnectionDialog.test.tsx`
Expected: FAIL (module not found)

**Step 3: Create the component**

```typescript
/**
 * EditConnectionDialog - Dialog for editing an existing connection.
 * Protocol is fixed (cannot be changed after creation).
 */

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
import type {
  Protocol,
  Connection,
  ModbusTcpConfig,
  MqttConfig,
  OpcUaConfig,
  ConnectionUpdates
} from '@shared/types/connection'
import type { ByteOrder } from '@shared/types'
import { ByteOrderSelector } from './ByteOrderSelector'
import { validateHost, validatePort, filterNumericInput } from '@shared/utils/validation'

interface TestResult {
  success: boolean
  message: string
}

export interface EditConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: Connection
  onSave: (connectionId: string, updates: ConnectionUpdates) => Promise<void>
  onTestConnection?: (connection: Connection) => Promise<boolean>
}

const protocolLabels: Record<Protocol, { label: string; icon: typeof Cable; color: string }> = {
  'modbus-tcp': { label: 'Modbus TCP', icon: Server, color: 'text-teal-400' },
  mqtt: { label: 'MQTT', icon: Radio, color: 'text-green-400' },
  opcua: { label: 'OPC UA', icon: Cable, color: 'text-purple-400' }
}

export function EditConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
  onTestConnection
}: EditConnectionDialogProps): React.ReactElement {
  const { protocol } = connection
  const protocolInfo = protocolLabels[protocol]
  const Icon = protocolInfo.icon

  // Form state
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [address, setAddress] = useState('') // For MQTT/OPC UA
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Validation
  const [hostError, setHostError] = useState<string | undefined>()
  const [portError, setPortError] = useState<string | undefined>()

  // Advanced options (Modbus)
  const [unitId, setUnitId] = useState(1)
  const [timeout, setTimeout] = useState(5000)
  const [byteOrder, setByteOrder] = useState<ByteOrder>('ABCD')

  // Initialize form from connection
  useEffect(() => {
    if (open && connection) {
      setName(connection.name)

      if (protocol === 'modbus-tcp') {
        const config = connection.config as ModbusTcpConfig
        setHost(config.host)
        setPort(String(config.port))
        setUnitId(config.unitId)
        setTimeout(config.timeout)
        setByteOrder(config.defaultByteOrder ?? 'ABCD')
      } else if (protocol === 'mqtt') {
        const config = connection.config as MqttConfig
        setAddress(config.brokerUrl)
      } else if (protocol === 'opcua') {
        const config = connection.config as OpcUaConfig
        setAddress(config.endpointUrl)
      }

      // Reset validation and test state
      setHostError(undefined)
      setPortError(undefined)
      setTestResult(null)
    }
  }, [open, connection, protocol])

  // Reset test result when inputs change
  useEffect(() => {
    setTestResult(null)
  }, [host, port, address])

  const handleHostChange = useCallback((value: string) => {
    setHost(value)
    if (hostError) setHostError(undefined)
  }, [hostError])

  const handleHostBlur = useCallback(() => {
    if (host) {
      const result = validateHost(host)
      setHostError(result.error)
    }
  }, [host])

  const handlePortChange = useCallback((value: string) => {
    const filtered = filterNumericInput(value)
    setPort(filtered)
    if (portError) setPortError(undefined)
  }, [portError])

  const handlePortBlur = useCallback(() => {
    if (port) {
      const result = validatePort(port)
      setPortError(result.error)
    }
  }, [port])

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
      const updates = buildUpdates()
      await onSave(connection.id, updates)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestConnection = async () => {
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
      if (onTestConnection) {
        const testConnection = { ...connection, config: buildConfig() }
        const success = await onTestConnection(testConnection)
        setTestResult({
          success,
          message: success ? 'Connection successful' : 'Connection failed'
        })
      } else if (protocol === 'modbus-tcp') {
        const result = await window.electronAPI.connection.testConnection({
          protocol,
          host: host.trim(),
          port: Number(port)
        })
        setTestResult({
          success: result.success,
          message: result.success ? 'Connection successful' : result.error || 'Connection failed'
        })
      } else {
        setTestResult({
          success: false,
          message: `Test connection not implemented for ${protocol}`
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const buildConfig = (): ModbusTcpConfig | MqttConfig | OpcUaConfig => {
    switch (protocol) {
      case 'modbus-tcp':
        return {
          host: host.trim(),
          port: Number(port),
          unitId,
          timeout,
          defaultByteOrder: byteOrder
        } as ModbusTcpConfig
      case 'mqtt':
        return {
          ...(connection.config as MqttConfig),
          brokerUrl: address
        }
      case 'opcua':
        return {
          ...(connection.config as OpcUaConfig),
          endpointUrl: address
        }
    }
  }

  const buildUpdates = (): ConnectionUpdates => {
    return {
      name,
      config: buildConfig()
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
              Edit Connection
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Protocol (readonly) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Protocol</label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Icon className={cn('w-5 h-5', protocolInfo.color)} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{protocolInfo.label}</span>
                <span className="ml-auto text-xs text-gray-400">(cannot be changed)</span>
              </div>
            </div>

            {/* Connection Name */}
            <div className="space-y-2">
              <label htmlFor="edit-connection-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Connection Name
              </label>
              <input
                id="edit-connection-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                <div className="col-span-2 space-y-2">
                  <label htmlFor="edit-connection-host" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Host
                  </label>
                  <input
                    id="edit-connection-host"
                    type="text"
                    value={host}
                    onChange={(e) => handleHostChange(e.target.value)}
                    onBlur={handleHostBlur}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg',
                      'bg-gray-50 dark:bg-gray-800 border',
                      hostError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:border-transparent',
                      'transition-all'
                    )}
                  />
                  {hostError && <p className="text-xs text-red-500">{hostError}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-connection-port" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Port
                  </label>
                  <input
                    id="edit-connection-port"
                    type="text"
                    inputMode="numeric"
                    value={port}
                    onChange={(e) => handlePortChange(e.target.value)}
                    onBlur={handlePortBlur}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg',
                      'bg-gray-50 dark:bg-gray-800 border',
                      portError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:border-transparent',
                      'transition-all'
                    )}
                  />
                  {portError && <p className="text-xs text-red-500">{portError}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="edit-connection-address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Address
                </label>
                <input
                  id="edit-connection-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg',
                    'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white',
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

            {/* Advanced Options (Modbus only) */}
            {protocol === 'modbus-tcp' && (
              <div>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {advancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Advanced Options
                </button>

                {advancedOpen && (
                  <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="edit-unit-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Unit ID
                      </label>
                      <input
                        id="edit-unit-id"
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
                      <label htmlFor="edit-timeout" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timeout (ms)
                      </label>
                      <input
                        id="edit-timeout"
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
                    <ByteOrderSelector value={byteOrder} onChange={setByteOrder} />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-600',
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
                  'text-gray-600 dark:text-gray-300',
                  'hover:border-gray-400 dark:hover:border-gray-500',
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
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --run tests/unit/renderer/components/connection/EditConnectionDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/connection/EditConnectionDialog.tsx tests/unit/renderer/components/connection/EditConnectionDialog.test.tsx
git commit -m "feat(ui): add EditConnectionDialog component"
```

---

## Task 11: Update ConnectionCard to Use Menu

**Files:**
- Modify: `src/renderer/components/connection/ConnectionCard.tsx`

**Step 1: Add imports for new components**

```typescript
import { ConnectionMenu } from './ConnectionMenu'
```

**Step 2: Add state for dialogs (inside component, after destructuring props)**

```typescript
const [showEditDialog, setShowEditDialog] = useState(false)
const [showDeleteDialog, setShowDeleteDialog] = useState(false)
```

**Step 3: Add handlers**

```typescript
const handleEditClick = () => {
  setShowEditDialog(true)
}

const handleDeleteClick = () => {
  setShowDeleteDialog(true)
}
```

**Step 4: Update the JSX**

Replace the action buttons section (the div with class "flex items-center gap-2 mt-2") with:

```tsx
{/* Action buttons */}
<div className="flex items-center justify-between mt-2">
  <div className="flex items-center gap-2">
    {/* Connect button - shown when disconnected or error */}
    {(isDisconnected || status === 'error') && (
      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Connect"
      >
        <Plug className="w-4 h-4" />
        Connect
      </button>
    )}

    {/* Disconnect button - shown when connected or connecting */}
    {isConnectedOrConnecting && (
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Disconnect"
      >
        <Unplug className="w-4 h-4" />
        Disconnect
      </button>
    )}
  </div>

  {/* More options menu */}
  <ConnectionMenu
    connection={connection}
    onEdit={handleEditClick}
    onDelete={handleDeleteClick}
  />
</div>
```

**Step 5: Remove the old Delete button** (it's now in the menu)

Remove the standalone Delete button that was previously in the action buttons area.

**Step 6: Remove Trash2 import if no longer needed**

If Trash2 is not used elsewhere in the component, remove it from the imports.

**Step 7: Verify**

Run: `pnpm typecheck`
Run: `pnpm test:unit`
Expected: All pass

**Step 8: Commit**

```bash
git add src/renderer/components/connection/ConnectionCard.tsx
git commit -m "refactor(ui): replace Delete button with ConnectionMenu"
```

---

## Task 12: Integrate Dialogs in ConnectionList

**Files:**
- Modify: `src/renderer/components/connection/ConnectionList.tsx`

**Step 1: Read the current file to understand its structure**

**Step 2: Add imports**

```typescript
import { EditConnectionDialog } from './EditConnectionDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
```

**Step 3: Add state for managing dialogs**

```typescript
const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
const [deletingConnection, setDeletingConnection] = useState<Connection | null>(null)
```

**Step 4: Add handlers**

```typescript
const handleEditConnection = async (connectionId: string, updates: ConnectionUpdates) => {
  await update(connectionId, updates)
  setEditingConnection(null)
}

const handleDeleteConnection = async () => {
  if (deletingConnection) {
    await remove(deletingConnection.id)
    setDeletingConnection(null)
  }
}
```

**Step 5: Update ConnectionCard usage to pass edit/delete handlers**

This may require modifying the ConnectionCard props or creating wrapper handlers.

**Step 6: Add dialog components at the end of the return**

```tsx
{/* Edit Dialog */}
{editingConnection && (
  <EditConnectionDialog
    open={!!editingConnection}
    onOpenChange={(open) => !open && setEditingConnection(null)}
    connection={editingConnection}
    onSave={handleEditConnection}
  />
)}

{/* Delete Confirmation Dialog */}
{deletingConnection && (
  <DeleteConfirmDialog
    open={!!deletingConnection}
    onOpenChange={(open) => !open && setDeletingConnection(null)}
    connectionName={deletingConnection.name}
    onConfirm={handleDeleteConnection}
  />
)}
```

**Step 7: Verify**

Run: `pnpm typecheck`
Run: `pnpm test:unit`
Expected: All pass

**Step 8: Commit**

```bash
git add src/renderer/components/connection/ConnectionList.tsx
git commit -m "feat(ui): integrate Edit/Delete dialogs in ConnectionList"
```

---

## Task 13: Export New Components from Index

**Files:**
- Modify: `src/renderer/components/connection/index.ts` (if exists, otherwise skip)

**Step 1: Add exports**

```typescript
export { ConnectionMenu } from './ConnectionMenu'
export { EditConnectionDialog } from './EditConnectionDialog'
export { DeleteConfirmDialog } from './DeleteConfirmDialog'
```

**Step 2: Commit**

```bash
git add src/renderer/components/connection/index.ts
git commit -m "feat: export new connection components"
```

---

## Task 14: Run Full Test Suite

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Run unit tests**

Run: `pnpm test:unit`
Expected: All pass

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors (or auto-fix with `pnpm lint --fix`)

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: fix lint issues"
```

---

## Task 15: Manual Testing Checklist

Before merging, manually test:

- [ ] Create a new Modbus TCP connection
- [ ] Click ⋮ menu → Edit opens EditConnectionDialog
- [ ] Change name and host → Save → Verify changes applied
- [ ] Connect to the connection
- [ ] Click ⋮ menu → Delete is disabled (grayed out)
- [ ] Edit while connected → Verify auto-disconnect and reconnect
- [ ] Disconnect the connection
- [ ] Click ⋮ menu → Delete → Confirm → Connection removed
- [ ] Cancel delete → Connection not removed

---

## Summary

**Total Tasks:** 15
**New Files:** 6 (3 components + 3 tests)
**Modified Files:** 8

**Commits:**
1. `feat(ipc): add CONNECTION_UPDATE channel constant`
2. `feat(types): add ConnectionUpdates interface`
3. `feat(main): add ConnectionManager.updateConnection method`
4. `feat(types): export ConnectionUpdates from barrel`
5. `feat(ipc): add connection:update handler`
6. `feat(preload): expose connection.update API`
7. `feat(hooks): add update() to useConnection`
8. `feat(ui): add DeleteConfirmDialog component`
9. `feat(ui): add ConnectionMenu dropdown component`
10. `feat(ui): add EditConnectionDialog component`
11. `refactor(ui): replace Delete button with ConnectionMenu`
12. `feat(ui): integrate Edit/Delete dialogs in ConnectionList`
13. `feat: export new connection components`
14. `chore: fix lint issues` (if needed)
