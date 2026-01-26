# Connex Studio UI/UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Connex Studio into a professional-grade IIoT tool with MQTTX-inspired UX, connection-centric navigation, and streamlined data exploration.

**Architecture:** Restructure the sidebar to show connections directly (eliminating one navigation level), redesign ConnectionForm as a modal dialog, create a unified DataExplorer component that replaces the current TagGrid with inline sparklines and expandable details. Update visual system with gradient branding and refined dark mode.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 3.4, Radix UI primitives, TanStack Virtual, uPlot, Lucide icons

---

## Phase 1: Navigation Architecture (P0)

### Task 1: Create New Sidebar Component

**Files:**
- Create: `src/renderer/components/layout/SidebarV2.tsx`
- Modify: `src/renderer/stores/uiStore.ts` (add navigation state)
- Test: `tests/renderer/components/layout/SidebarV2.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/renderer/components/layout/SidebarV2.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SidebarV2 } from '@renderer/components/layout/SidebarV2'

const mockConnections = [
  { id: '1', name: 'PLC-01', protocol: 'modbus-tcp', status: 'connected' },
  { id: '2', name: 'Broker', protocol: 'mqtt', status: 'disconnected' },
]

describe('SidebarV2', () => {
  it('renders new connection button at top', () => {
    render(<SidebarV2 connections={[]} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByRole('button', { name: /new connection/i })).toBeInTheDocument()
  })

  it('displays connections directly in sidebar', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText('PLC-01')).toBeInTheDocument()
    expect(screen.getByText('Broker')).toBeInTheDocument()
  })

  it('shows protocol badge for each connection', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText('Modbus')).toBeInTheDocument()
    expect(screen.getByText('MQTT')).toBeInTheDocument()
  })

  it('shows connection status indicator', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    const connectedIndicator = screen.getByTestId('status-1')
    expect(connectedIndicator).toHaveClass('bg-green-500')
  })

  it('calls onSelectConnection when connection clicked', () => {
    const onSelect = vi.fn()
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={onSelect} />)
    fireEvent.click(screen.getByText('PLC-01'))
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('collapses tools section by default', () => {
    render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.queryByText('Bridge')).not.toBeVisible()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/renderer/components/layout/SidebarV2.test.tsx`
Expected: FAIL with "Cannot find module '@renderer/components/layout/SidebarV2'"

**Step 3: Write minimal implementation**

```typescript
// src/renderer/components/layout/SidebarV2.tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Cable, Radio, Server, GitBranch, Calculator, Video, Settings, User } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Connection, Protocol } from '@shared/types'

interface SidebarV2Props {
  connections: Connection[]
  selectedConnectionId?: string | null
  onNewConnection: () => void
  onSelectConnection: (id: string) => void
  userName?: string
}

const protocolConfig: Record<Protocol, { label: string; icon: typeof Cable; color: string }> = {
  'modbus-tcp': { label: 'Modbus', icon: Server, color: 'text-teal-400' },
  'mqtt': { label: 'MQTT', icon: Radio, color: 'text-green-400' },
  'opcua': { label: 'OPC UA', icon: Cable, color: 'text-purple-400' },
}

const statusColors: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500',
}

export function SidebarV2({
  connections,
  selectedConnectionId,
  onNewConnection,
  onSelectConnection,
  userName = 'User',
}: SidebarV2Props) {
  const [toolsExpanded, setToolsExpanded] = useState(false)

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-400">
          <Cable className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground">ConneX Studio</h1>
          <p className="text-xs text-muted-foreground">IIoT Platform</p>
        </div>
      </div>

      {/* New Connection Button */}
      <div className="px-3 pb-4">
        <button
          onClick={onNewConnection}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          New Connection
        </button>
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My Connections
        </div>
        <div className="space-y-1">
          {connections.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No connections yet
            </p>
          ) : (
            connections.map((conn) => {
              const config = protocolConfig[conn.protocol]
              const Icon = config.icon
              const isSelected = conn.id === selectedConnectionId

              return (
                <button
                  key={conn.id}
                  onClick={() => onSelectConnection(conn.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    isSelected
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <div className="relative">
                    <Icon className={cn('h-5 w-5', isSelected ? 'text-blue-400' : config.color)} />
                    <span
                      data-testid={`status-${conn.id}`}
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface',
                        statusColors[conn.status]
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{conn.name}</div>
                    <div className="text-xs text-muted-foreground">{config.label}</div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Tools Section (Collapsible) */}
        <div className="mt-6">
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="flex w-full items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {toolsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Tools
          </button>
          {toolsExpanded && (
            <div className="mt-2 space-y-1">
              <SidebarToolItem icon={GitBranch} label="Bridge" />
              <SidebarToolItem icon={Calculator} label="Calculator" />
              <SidebarToolItem icon={Video} label="DVR" />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{userName}</div>
          </div>
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function SidebarToolItem({ icon: Icon, label }: { icon: typeof Cable; label: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/renderer/components/layout/SidebarV2.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/layout/SidebarV2.tsx tests/renderer/components/layout/SidebarV2.test.tsx
git commit -m "feat(ui): add SidebarV2 with connection-centric navigation

- Connections displayed directly in sidebar (no extra page)
- Protocol badges with distinct colors (Modbus/MQTT/OPC UA)
- Status indicators with pulse animation for connecting
- Collapsible Tools section
- Gradient CTA button for new connection"
```

---

### Task 2: Create New Connection Dialog

**Files:**
- Create: `src/renderer/components/connection/NewConnectionDialog.tsx`
- Test: `tests/renderer/components/connection/NewConnectionDialog.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/renderer/components/connection/NewConnectionDialog.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NewConnectionDialog } from '@renderer/components/connection/NewConnectionDialog'

describe('NewConnectionDialog', () => {
  it('renders protocol selection buttons', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /modbus tcp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mqtt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opc ua/i })).toBeInTheDocument()
  })

  it('shows only name and address fields by default', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/unit id/i)).not.toBeInTheDocument()
  })

  it('expands advanced options when clicked', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByText(/advanced options/i))
    expect(screen.getByLabelText(/unit id/i)).toBeInTheDocument()
  })

  it('calls onSubmit with connection data', async () => {
    const onSubmit = vi.fn()
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'PLC-01' } })
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '192.168.1.100:502' } })
    fireEvent.click(screen.getByRole('button', { name: /connect & explore/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'PLC-01',
        protocol: 'modbus-tcp',
      }))
    })
  })

  it('shows test connection button', () => {
    render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/renderer/components/connection/NewConnectionDialog.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/renderer/components/connection/NewConnectionDialog.tsx
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, ChevronRight, X, Server, Radio, Cable, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Protocol, ModbusTcpConfig, MqttConfig, OpcUaConfig } from '@shared/types'

interface NewConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ConnectionFormData) => Promise<void>
  onTest?: (data: ConnectionFormData) => Promise<boolean>
}

export interface ConnectionFormData {
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
}

const protocols: { id: Protocol; label: string; icon: typeof Server }[] = [
  { id: 'modbus-tcp', label: 'Modbus TCP', icon: Server },
  { id: 'mqtt', label: 'MQTT', icon: Radio },
  { id: 'opcua', label: 'OPC UA', icon: Cable },
]

export function NewConnectionDialog({ open, onOpenChange, onSubmit, onTest }: NewConnectionDialogProps) {
  const [protocol, setProtocol] = useState<Protocol>('modbus-tcp')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Advanced options (Modbus)
  const [unitId, setUnitId] = useState('1')
  const [timeout, setTimeout] = useState('3000')

  const parseAddress = (addr: string): { host: string; port: number } => {
    const [host, portStr] = addr.split(':')
    return { host, port: parseInt(portStr) || 502 }
  }

  const buildFormData = (): ConnectionFormData => {
    const { host, port } = parseAddress(address)

    if (protocol === 'modbus-tcp') {
      return {
        name,
        protocol,
        config: {
          host,
          port,
          unitId: parseInt(unitId) || 1,
          timeout: parseInt(timeout) || 3000,
        } as ModbusTcpConfig,
      }
    }

    if (protocol === 'mqtt') {
      return {
        name,
        protocol,
        config: {
          brokerUrl: address.startsWith('mqtt://') ? address : `mqtt://${address}`,
          clientId: `connex-${Date.now()}`,
          useTls: false,
        } as MqttConfig,
      }
    }

    return {
      name,
      protocol,
      config: {
        endpointUrl: address.startsWith('opc.tcp://') ? address : `opc.tcp://${address}`,
        securityMode: 'None',
        securityPolicy: 'None',
      } as OpcUaConfig,
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(buildFormData())
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTest = async () => {
    if (!onTest) return
    setIsTesting(true)
    try {
      await onTest(buildFormData())
    } finally {
      setIsTesting(false)
    }
  }

  const getAddressPlaceholder = () => {
    switch (protocol) {
      case 'modbus-tcp': return '192.168.1.100:502'
      case 'mqtt': return 'mqtt.local:1883'
      case 'opcua': return 'opc.tcp://localhost:4840'
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-foreground">
            New Connection
          </Dialog.Title>
          <Dialog.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <div className="mt-6 space-y-6">
            {/* Protocol Selection */}
            <div className="flex gap-2">
              {protocols.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProtocol(id)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all',
                    protocol === id
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* Basic Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="conn-name" className="mb-1.5 block text-sm font-medium text-foreground">
                  Connection Name
                </label>
                <input
                  id="conn-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="PLC-Production-Line-A"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label htmlFor="conn-address" className="mb-1.5 block text-sm font-medium text-foreground">
                  Address
                </label>
                <input
                  id="conn-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={getAddressPlaceholder()}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Advanced Options (Collapsible) */}
            {protocol === 'modbus-tcp' && (
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Advanced Options
                </button>
                {advancedOpen && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="unit-id" className="mb-1.5 block text-sm font-medium text-foreground">
                        Unit ID
                      </label>
                      <input
                        id="unit-id"
                        type="number"
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="timeout" className="mb-1.5 block text-sm font-medium text-foreground">
                        Timeout (ms)
                      </label>
                      <input
                        id="timeout"
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={!name || !address || isTesting}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                Test Connection
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name || !address || isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect & Explore
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/renderer/components/connection/NewConnectionDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/connection/NewConnectionDialog.tsx tests/renderer/components/connection/NewConnectionDialog.test.tsx
git commit -m "feat(ui): add NewConnectionDialog with minimal fields

- Protocol selection with visual buttons
- Only name + address required
- Advanced options collapsed by default
- Test Connection button
- Connect & Explore as primary CTA"
```

---

### Task 3: Update UI Store for Navigation State

**Files:**
- Modify: `src/renderer/stores/uiStore.ts`
- Test: `tests/renderer/stores/uiStore.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/renderer/stores/uiStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@renderer/stores/uiStore'

describe('uiStore navigation state', () => {
  beforeEach(() => {
    useUIStore.setState({
      newConnectionDialogOpen: false,
      toolsExpanded: false,
    })
  })

  it('tracks new connection dialog state', () => {
    expect(useUIStore.getState().newConnectionDialogOpen).toBe(false)
    useUIStore.getState().setNewConnectionDialogOpen(true)
    expect(useUIStore.getState().newConnectionDialogOpen).toBe(true)
  })

  it('tracks tools section expanded state', () => {
    expect(useUIStore.getState().toolsExpanded).toBe(false)
    useUIStore.getState().setToolsExpanded(true)
    expect(useUIStore.getState().toolsExpanded).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/renderer/stores/uiStore.test.ts`
Expected: FAIL with "setNewConnectionDialogOpen is not a function"

**Step 3: Add navigation state to uiStore**

```typescript
// Add to src/renderer/stores/uiStore.ts - add these to the interface and create

// In UIState interface, add:
  newConnectionDialogOpen: boolean
  toolsExpanded: boolean
  setNewConnectionDialogOpen: (open: boolean) => void
  setToolsExpanded: (expanded: boolean) => void

// In the create function, add:
  newConnectionDialogOpen: false,
  toolsExpanded: false,
  setNewConnectionDialogOpen: (open) => set({ newConnectionDialogOpen: open }),
  setToolsExpanded: (expanded) => set({ toolsExpanded: expanded }),
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/renderer/stores/uiStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/stores/uiStore.ts tests/renderer/stores/uiStore.test.ts
git commit -m "feat(store): add navigation state to uiStore

- newConnectionDialogOpen for modal control
- toolsExpanded for sidebar tools section"
```

---

### Task 4: Integrate New Sidebar into AppShell

**Files:**
- Modify: `src/renderer/components/layout/AppShell.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Update AppShell to use SidebarV2**

```typescript
// In src/renderer/components/layout/AppShell.tsx
// Replace the current sidebar content with SidebarV2

import { SidebarV2 } from './SidebarV2'
import { NewConnectionDialog } from '../connection/NewConnectionDialog'
import { useUIStore } from '@renderer/stores/uiStore'
import { useConnectionStore } from '@renderer/stores/connectionStore'

// Inside the component, replace sidebar JSX with:
const connections = useConnectionStore((s) => s.connections)
const selectedConnectionId = useConnectionStore((s) => s.selectedConnectionId)
const setSelected = useConnectionStore((s) => s.setSelected)
const { newConnectionDialogOpen, setNewConnectionDialogOpen } = useUIStore()

// In JSX:
<SidebarV2
  connections={connections}
  selectedConnectionId={selectedConnectionId}
  onNewConnection={() => setNewConnectionDialogOpen(true)}
  onSelectConnection={setSelected}
/>

<NewConnectionDialog
  open={newConnectionDialogOpen}
  onOpenChange={setNewConnectionDialogOpen}
  onSubmit={handleCreateConnection}
/>
```

**Step 2: Test manually**

Run: `pnpm dev`
Expected: New sidebar visible with connections listed directly

**Step 3: Commit**

```bash
git add src/renderer/components/layout/AppShell.tsx src/renderer/App.tsx
git commit -m "feat(ui): integrate SidebarV2 and NewConnectionDialog

- Replace old sidebar with connection-centric layout
- Wire up new connection dialog to store
- Connections now accessible with 1 click"
```

---

## Phase 2: Data Explorer (P0)

### Task 5: Create DataExplorer Component

**Files:**
- Create: `src/renderer/components/explorer/DataExplorer.tsx`
- Create: `src/renderer/components/explorer/TagRow.tsx`
- Create: `src/renderer/components/explorer/TagDetails.tsx`
- Test: `tests/renderer/components/explorer/DataExplorer.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/renderer/components/explorer/DataExplorer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataExplorer } from '@renderer/components/explorer/DataExplorer'

const mockTags = [
  { id: '1', name: 'Temperature_01', address: { type: 'holding', address: 40001 }, dataType: 'float32' },
  { id: '2', name: 'Pressure_Main', address: { type: 'holding', address: 40003 }, dataType: 'float32' },
]

const mockDisplayStates = new Map([
  ['1', { currentValue: 23.5, quality: 'good', alarmState: 'normal', trend: 'stable', sparklineData: [22, 23, 23.5] }],
  ['2', { currentValue: 4.82, quality: 'good', alarmState: 'warning', trend: 'up', sparklineData: [4.5, 4.7, 4.82] }],
])

describe('DataExplorer', () => {
  it('renders connection header with status', () => {
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        latency={12}
        tags={mockTags}
        displayStates={mockDisplayStates}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )
    expect(screen.getByText('PLC-01')).toBeInTheDocument()
    expect(screen.getByText(/connected/i)).toBeInTheDocument()
    expect(screen.getByText('12ms')).toBeInTheDocument()
  })

  it('renders tag list with values and sparklines', () => {
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        tags={mockTags}
        displayStates={mockDisplayStates}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )
    expect(screen.getByText('Temperature_01')).toBeInTheDocument()
    expect(screen.getByText('23.5')).toBeInTheDocument()
    expect(screen.getByText('Pressure_Main')).toBeInTheDocument()
    expect(screen.getByText('4.82')).toBeInTheDocument()
  })

  it('shows tag details when tag selected', () => {
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        tags={mockTags}
        displayStates={mockDisplayStates}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Temperature_01'))
    expect(screen.getByTestId('tag-details')).toBeInTheDocument()
  })

  it('shows alarm state styling', () => {
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        tags={mockTags}
        displayStates={mockDisplayStates}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )
    const warningRow = screen.getByText('Pressure_Main').closest('[data-testid="tag-row"]')
    expect(warningRow).toHaveClass('bg-yellow-500/10')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/renderer/components/explorer/DataExplorer.test.tsx`
Expected: FAIL

**Step 3: Write DataExplorer implementation**

```typescript
// src/renderer/components/explorer/DataExplorer.tsx
import { useState } from 'react'
import { ArrowLeft, Plus, Download, Search, Power } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { TagRow } from './TagRow'
import { TagDetails } from './TagDetails'
import type { Tag, ConnectionStatus, TagDisplayState } from '@shared/types'

interface DataExplorerProps {
  connectionName: string
  connectionStatus: ConnectionStatus
  latency?: number
  tags: Tag[]
  displayStates: Map<string, TagDisplayState>
  onAddTag: () => void
  onImportTags?: () => void
  onDisconnect: () => void
  onBack?: () => void
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string }> = {
  connected: { label: 'Connected', color: 'text-green-400' },
  connecting: { label: 'Connecting...', color: 'text-yellow-400' },
  disconnected: { label: 'Disconnected', color: 'text-gray-400' },
  error: { label: 'Error', color: 'text-red-400' },
}

export function DataExplorer({
  connectionName,
  connectionStatus,
  latency,
  tags,
  displayStates,
  onAddTag,
  onImportTags,
  onDisconnect,
  onBack,
}: DataExplorerProps) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedTag = tags.find((t) => t.id === selectedTagId)
  const selectedDisplayState = selectedTagId ? displayStates.get(selectedTagId) : null

  const status = statusConfig[connectionStatus]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">{connectionName}</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn('flex items-center gap-1.5', status.color)}>
                <span className={cn('h-2 w-2 rounded-full', connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500')} />
                {status.label}
              </span>
              {latency && <span className="text-muted-foreground">{latency}ms</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
        >
          <Power className="h-4 w-4" />
          Disconnect
        </button>
      </header>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-6 py-3">
        <button
          onClick={onAddTag}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Tag
        </button>
        {onImportTags && (
          <button
            onClick={onImportTags}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Import
          </button>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tag List */}
        <div className="flex-1 overflow-y-auto">
          {/* Table Header */}
          <div className="sticky top-0 grid grid-cols-[1fr_140px_100px_120px_100px] gap-4 border-b border-border bg-muted/50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Name</div>
            <div>Address</div>
            <div>Type</div>
            <div>Value</div>
            <div>Status</div>
          </div>

          {/* Tag Rows */}
          <div className="divide-y divide-border">
            {filteredTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground">No tags found</p>
                <p className="mt-1 text-sm text-muted-foreground">Add tags to start monitoring data</p>
                <button
                  onClick={onAddTag}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Tag
                </button>
              </div>
            ) : (
              filteredTags.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  displayState={displayStates.get(tag.id)}
                  isSelected={tag.id === selectedTagId}
                  onClick={() => setSelectedTagId(tag.id === selectedTagId ? null : tag.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Tag Details Panel */}
        {selectedTag && selectedDisplayState && (
          <TagDetails
            tag={selectedTag}
            displayState={selectedDisplayState}
            onClose={() => setSelectedTagId(null)}
          />
        )}
      </div>
    </div>
  )
}
```

**Step 4: Write TagRow component**

```typescript
// src/renderer/components/explorer/TagRow.tsx
import { cn } from '@renderer/lib/utils'
import { Sparkline } from '../tags/Sparkline'
import type { Tag, TagDisplayState, AlarmState } from '@shared/types'

interface TagRowProps {
  tag: Tag
  displayState?: TagDisplayState
  isSelected: boolean
  onClick: () => void
}

const alarmStyles: Record<AlarmState, string> = {
  normal: '',
  warning: 'bg-yellow-500/10',
  alarm: 'bg-red-500/10',
}

const statusBadges: Record<AlarmState, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'bg-green-500/20 text-green-400' },
  warning: { label: 'Warning', className: 'bg-yellow-500/20 text-yellow-400' },
  alarm: { label: 'Alarm', className: 'bg-red-500/20 text-red-400' },
}

export function TagRow({ tag, displayState, isSelected, onClick }: TagRowProps) {
  const alarmState = displayState?.alarmState || 'normal'
  const badge = statusBadges[alarmState]

  const formatAddress = (address: Tag['address']) => {
    if ('address' in address) {
      return `HR:${address.address}`
    }
    if ('topic' in address) {
      return address.topic
    }
    if ('nodeId' in address) {
      return address.nodeId
    }
    return '-'
  }

  return (
    <div
      data-testid="tag-row"
      onClick={onClick}
      className={cn(
        'grid cursor-pointer grid-cols-[1fr_140px_100px_120px_100px] items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50',
        alarmStyles[alarmState],
        isSelected && 'bg-blue-500/10'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            displayState?.quality === 'good' ? 'bg-green-500' : 'bg-gray-500'
          )}
        />
        <span className="font-medium text-foreground">{tag.name}</span>
      </div>
      <div className="font-mono text-sm text-muted-foreground">{formatAddress(tag.address)}</div>
      <div className="font-mono text-xs text-muted-foreground uppercase">{tag.dataType}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">
          {displayState?.currentValue ?? '--'}
        </span>
        {displayState?.sparklineData && (
          <Sparkline data={displayState.sparklineData} width={60} height={20} />
        )}
      </div>
      <div>
        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', badge.className)}>
          {badge.label}
        </span>
      </div>
    </div>
  )
}
```

**Step 5: Write TagDetails component**

```typescript
// src/renderer/components/explorer/TagDetails.tsx
import { X, TrendingUp, TrendingDown, Minus, Edit } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Tag, TagDisplayState, TrendDirection } from '@shared/types'

interface TagDetailsProps {
  tag: Tag
  displayState: TagDisplayState
  onClose: () => void
  onEdit?: () => void
}

const trendIcons: Record<TrendDirection, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
}

export function TagDetails({ tag, displayState, onClose, onEdit }: TagDetailsProps) {
  const TrendIcon = trendIcons[displayState.trend]

  return (
    <aside data-testid="tag-details" className="w-80 border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">{tag.name}</h2>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Edit className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Current Value */}
        <div className="mb-6 rounded-lg bg-muted/50 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-foreground">
              {displayState.currentValue ?? '--'}
            </span>
            <TrendIcon
              className={cn(
                'h-5 w-5',
                displayState.trend === 'up' && 'text-green-400',
                displayState.trend === 'down' && 'text-red-400',
                displayState.trend === 'stable' && 'text-muted-foreground'
              )}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{tag.dataType.toUpperCase()}</p>
        </div>

        {/* Sparkline Chart */}
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Last 5 minutes</h3>
          <div className="h-24 rounded-lg bg-muted/30 p-2">
            {/* Full-size sparkline would go here */}
            <svg viewBox="0 0 200 80" className="h-full w-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-400"
                points={displayState.sparklineData
                  .map((v, i) => {
                    const x = (i / (displayState.sparklineData.length - 1)) * 200
                    const min = Math.min(...displayState.sparklineData)
                    const max = Math.max(...displayState.sparklineData)
                    const range = max - min || 1
                    const y = 80 - ((v - min) / range) * 70
                    return `${x},${y}`
                  })
                  .join(' ')}
              />
            </svg>
          </div>
        </div>

        {/* Tag Info */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Address</span>
            <span className="font-mono text-sm text-foreground">
              {'address' in tag.address ? `HR:${tag.address.address}` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Quality</span>
            <span className="text-sm text-foreground capitalize">{displayState.quality}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Last Update</span>
            <span className="text-sm text-foreground">
              {new Date(displayState.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/renderer/components/explorer/DataExplorer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/explorer/ tests/renderer/components/explorer/
git commit -m "feat(ui): add DataExplorer with inline sparklines and details panel

- Connection header with status and latency
- Tag list with value, trend, sparkline per row
- Alarm state row highlighting (warning/alarm)
- Expandable tag details panel
- Search and quick action buttons"
```

---

## Phase 3: Batch Tag Management (P0)

### Task 6: Create BatchTagDialog Component

**Files:**
- Create: `src/renderer/components/tags/BatchTagDialog.tsx`
- Create: `src/renderer/components/tags/ImportTab.tsx`
- Create: `src/renderer/components/tags/ScanTab.tsx`
- Create: `src/renderer/components/tags/GenerateTab.tsx`
- Test: `tests/renderer/components/tags/BatchTagDialog.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/renderer/components/tags/BatchTagDialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BatchTagDialog } from '@renderer/components/tags/BatchTagDialog'

describe('BatchTagDialog', () => {
  it('renders three method tabs', () => {
    render(<BatchTagDialog open onOpenChange={vi.fn()} connectionId="1" onTagsCreated={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /import/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /scan/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument()
  })

  it('shows import tab by default with drag-drop zone', () => {
    render(<BatchTagDialog open onOpenChange={vi.fn()} connectionId="1" onTagsCreated={vi.fn()} />)
    expect(screen.getByText(/drag.*csv.*excel/i)).toBeInTheDocument()
  })

  it('switches to scan tab and shows address range inputs', () => {
    render(<BatchTagDialog open onOpenChange={vi.fn()} connectionId="1" onTagsCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: /scan/i }))
    expect(screen.getByLabelText(/start address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end address/i)).toBeInTheDocument()
  })

  it('switches to generate tab and shows naming pattern input', () => {
    render(<BatchTagDialog open onOpenChange={vi.fn()} connectionId="1" onTagsCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: /generate/i }))
    expect(screen.getByLabelText(/naming pattern/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/renderer/components/tags/BatchTagDialog.test.tsx`
Expected: FAIL

**Step 3: Write BatchTagDialog implementation**

```typescript
// src/renderer/components/tags/BatchTagDialog.tsx
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, Upload, Search, Grid3X3 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { ImportTab } from './ImportTab'
import { ScanTab } from './ScanTab'
import { GenerateTab } from './GenerateTab'
import type { Tag } from '@shared/types'

interface BatchTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
  protocol?: 'modbus-tcp' | 'mqtt' | 'opcua'
  onTagsCreated: (tags: Omit<Tag, 'id'>[]) => void
}

export function BatchTagDialog({
  open,
  onOpenChange,
  connectionId,
  protocol = 'modbus-tcp',
  onTagsCreated,
}: BatchTagDialogProps) {
  const [activeTab, setActiveTab] = useState('import')

  const handleTagsCreated = (tags: Omit<Tag, 'id'>[]) => {
    onTagsCreated(tags)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Add Tags
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex border-b border-border">
              <Tabs.Trigger
                value="import"
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'import'
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="h-4 w-4" />
                Import CSV/Excel
              </Tabs.Trigger>
              <Tabs.Trigger
                value="scan"
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'scan'
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Search className="h-4 w-4" />
                Scan/Discover
              </Tabs.Trigger>
              <Tabs.Trigger
                value="generate"
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'generate'
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
                Batch Generate
              </Tabs.Trigger>
            </Tabs.List>

            <div className="p-6">
              <Tabs.Content value="import">
                <ImportTab connectionId={connectionId} onTagsCreated={handleTagsCreated} />
              </Tabs.Content>
              <Tabs.Content value="scan">
                <ScanTab connectionId={connectionId} protocol={protocol} onTagsCreated={handleTagsCreated} />
              </Tabs.Content>
              <Tabs.Content value="generate">
                <GenerateTab connectionId={connectionId} onTagsCreated={handleTagsCreated} />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

```typescript
// src/renderer/components/tags/ImportTab.tsx
import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Tag } from '@shared/types'

interface ImportTabProps {
  connectionId: string
  onTagsCreated: (tags: Omit<Tag, 'id'>[]) => void
}

interface ParsedTag {
  name: string
  address: string
  dataType: string
  unit?: string
  valid: boolean
  error?: string
}

export function ImportTab({ connectionId, onTagsCreated }: ImportTabProps) {
  const [dragOver, setDragOver] = useState(false)
  const [parsedTags, setParsedTags] = useState<ParsedTag[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const processFile = async (file: File) => {
    setFileName(file.name)
    // Simplified CSV parsing - real implementation would use papaparse
    const text = await file.text()
    const lines = text.split('\n').slice(1) // Skip header
    const tags: ParsedTag[] = lines
      .filter((line) => line.trim())
      .map((line) => {
        const [name, address, dataType, unit] = line.split(',').map((s) => s.trim())
        const valid = !!name && !!address && !!dataType
        return { name, address, dataType, unit, valid, error: valid ? undefined : 'Missing required field' }
      })
    setParsedTags(tags)
  }

  const validTags = parsedTags.filter((t) => t.valid)

  const handleImport = () => {
    const tags: Omit<Tag, 'id'>[] = validTags.map((t) => ({
      connectionId,
      name: t.name,
      address: { type: 'holding' as const, address: parseInt(t.address.replace('HR:', '')) },
      dataType: t.dataType as Tag['dataType'],
      displayFormat: { decimals: 2, unit: t.unit },
      thresholds: {},
      enabled: true,
    }))
    onTagsCreated(tags)
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-muted-foreground'
        )}
      >
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-foreground">Drag CSV or Excel file here</p>
        <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
      </div>

      {/* Template Downloads */}
      <div className="flex items-center gap-2 text-sm">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Download template:</span>
        <button className="text-blue-400 hover:underline">Modbus</button>
        <button className="text-blue-400 hover:underline">MQTT</button>
        <button className="text-blue-400 hover:underline">OPC UA</button>
      </div>

      {/* Preview */}
      {parsedTags.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium text-foreground">Preview ({parsedTags.length} rows)</span>
            <span className="text-xs text-muted-foreground">{fileName}</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {parsedTags.slice(0, 10).map((tag, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm',
                  !tag.valid && 'bg-red-500/10'
                )}
              >
                {tag.valid ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="flex-1 truncate text-foreground">{tag.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{tag.address}</span>
                <span className="text-xs text-muted-foreground">{tag.dataType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {parsedTags.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={validTags.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Import {validTags.length} Valid Tags
          </button>
        </div>
      )}
    </div>
  )
}
```

```typescript
// src/renderer/components/tags/ScanTab.tsx
import { useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Tag } from '@shared/types'

interface ScanTabProps {
  connectionId: string
  protocol: 'modbus-tcp' | 'mqtt' | 'opcua'
  onTagsCreated: (tags: Omit<Tag, 'id'>[]) => void
}

interface ScannedAddress {
  address: number
  hasResponse: boolean
  rawValue?: number
  selected: boolean
  name: string
}

export function ScanTab({ connectionId, protocol, onTagsCreated }: ScanTabProps) {
  const [startAddress, setStartAddress] = useState('40001')
  const [endAddress, setEndAddress] = useState('40100')
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ScannedAddress[]>([])

  const handleScan = async () => {
    setIsScanning(true)
    setProgress(0)
    setResults([])

    const start = parseInt(startAddress)
    const end = parseInt(endAddress)
    const total = end - start + 1

    // Simulate scanning
    const scanned: ScannedAddress[] = []
    for (let addr = start; addr <= end; addr++) {
      await new Promise((r) => setTimeout(r, 50))
      const hasResponse = Math.random() > 0.3
      scanned.push({
        address: addr,
        hasResponse,
        rawValue: hasResponse ? Math.floor(Math.random() * 65535) : undefined,
        selected: hasResponse,
        name: '',
      })
      setProgress(((addr - start + 1) / total) * 100)
      setResults([...scanned])
    }

    setIsScanning(false)
  }

  const toggleSelect = (addr: number) => {
    setResults((prev) =>
      prev.map((r) => (r.address === addr ? { ...r, selected: !r.selected } : r))
    )
  }

  const setName = (addr: number, name: string) => {
    setResults((prev) =>
      prev.map((r) => (r.address === addr ? { ...r, name } : r))
    )
  }

  const selectedResults = results.filter((r) => r.selected && r.hasResponse)

  const handleAdd = () => {
    const tags: Omit<Tag, 'id'>[] = selectedResults.map((r) => ({
      connectionId,
      name: r.name || `Tag_${r.address}`,
      address: { type: 'holding' as const, address: r.address },
      dataType: 'uint16' as const,
      displayFormat: { decimals: 0 },
      thresholds: {},
      enabled: true,
    }))
    onTagsCreated(tags)
  }

  return (
    <div className="space-y-4">
      {/* Scan Range */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="start-address" className="mb-1.5 block text-sm font-medium text-foreground">
            Start Address
          </label>
          <input
            id="start-address"
            type="text"
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            placeholder="HR:40001"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>
        <span className="pb-2 text-muted-foreground">—</span>
        <div className="flex-1">
          <label htmlFor="end-address" className="mb-1.5 block text-sm font-medium text-foreground">
            End Address
          </label>
          <input
            id="end-address"
            type="text"
            value={endAddress}
            onChange={(e) => setEndAddress(e.target.value)}
            placeholder="HR:40100"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isScanning && <Loader2 className="h-4 w-4 animate-spin" />}
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </button>
      </div>

      {/* Progress */}
      {isScanning && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Scanning HR:{startAddress}...</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium text-foreground">
              Found {results.filter((r) => r.hasResponse).length} responding addresses
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setResults((prev) => prev.map((r) => ({ ...r, selected: r.hasResponse })))}
                className="text-xs text-blue-400 hover:underline"
              >
                Select All
              </button>
              <button
                onClick={() => setResults((prev) => prev.map((r) => ({ ...r, selected: false })))}
                className="text-xs text-muted-foreground hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.address}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm',
                  !r.hasResponse && 'opacity-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={r.selected}
                  disabled={!r.hasResponse}
                  onChange={() => toggleSelect(r.address)}
                  className="rounded border-border"
                />
                <span className="font-mono text-foreground">HR:{r.address}</span>
                {r.hasResponse ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs text-muted-foreground">0x{r.rawValue?.toString(16).toUpperCase().padStart(4, '0')}</span>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => setName(r.address, e.target.value)}
                      placeholder="Name..."
                      className="ml-auto w-32 rounded border border-border bg-background px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">No response</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedResults.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add {selectedResults.length} Tags
          </button>
        </div>
      )}
    </div>
  )
}
```

```typescript
// src/renderer/components/tags/GenerateTab.tsx
import { useState, useMemo } from 'react'
import type { Tag } from '@shared/types'

interface GenerateTabProps {
  connectionId: string
  onTagsCreated: (tags: Omit<Tag, 'id'>[]) => void
}

export function GenerateTab({ connectionId, onTagsCreated }: GenerateTabProps) {
  const [pattern, setPattern] = useState('Sensor_{N}')
  const [startAddress, setStartAddress] = useState('40001')
  const [quantity, setQuantity] = useState('20')
  const [addressInterval, setAddressInterval] = useState('2')
  const [dataType, setDataType] = useState<Tag['dataType']>('float32')

  const preview = useMemo(() => {
    const qty = Math.min(parseInt(quantity) || 0, 100)
    const start = parseInt(startAddress) || 40001
    const interval = parseInt(addressInterval) || 1

    return Array.from({ length: Math.min(qty, 5) }, (_, i) => ({
      name: pattern.replace('{N}', String(i + 1).padStart(2, '0')),
      address: start + i * interval,
    }))
  }, [pattern, startAddress, quantity, addressInterval])

  const handleGenerate = () => {
    const qty = parseInt(quantity) || 0
    const start = parseInt(startAddress) || 40001
    const interval = parseInt(addressInterval) || 1

    const tags: Omit<Tag, 'id'>[] = Array.from({ length: qty }, (_, i) => ({
      connectionId,
      name: pattern.replace('{N}', String(i + 1).padStart(2, '0')),
      address: { type: 'holding' as const, address: start + i * interval },
      dataType,
      displayFormat: { decimals: dataType === 'float32' ? 2 : 0 },
      thresholds: {},
      enabled: true,
    }))

    onTagsCreated(tags)
  }

  return (
    <div className="space-y-4">
      {/* Naming Pattern */}
      <div>
        <label htmlFor="naming-pattern" className="mb-1.5 block text-sm font-medium text-foreground">
          Naming Pattern
        </label>
        <input
          id="naming-pattern"
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Temp_Sensor_{N}"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use {'{N}'} for auto-numbering. Preview: {preview[0]?.name}, {preview[1]?.name}, ...
        </p>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="gen-start" className="mb-1.5 block text-sm font-medium text-foreground">
            Start Address
          </label>
          <input
            id="gen-start"
            type="text"
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium text-foreground">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            max="100"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="interval" className="mb-1.5 block text-sm font-medium text-foreground">
            Address Interval
          </label>
          <input
            id="interval"
            type="number"
            value={addressInterval}
            onChange={(e) => setAddressInterval(e.target.value)}
            min="1"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="gen-datatype" className="mb-1.5 block text-sm font-medium text-foreground">
            Data Type
          </label>
          <select
            id="gen-datatype"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as Tag['dataType'])}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none"
          >
            <option value="uint16">UINT16</option>
            <option value="int16">INT16</option>
            <option value="uint32">UINT32</option>
            <option value="int32">INT32</option>
            <option value="float32">FLOAT32</option>
            <option value="boolean">BOOLEAN</option>
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium text-foreground">Preview</span>
        </div>
        <div className="divide-y divide-border">
          {preview.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-foreground">{item.name}</span>
              <span className="font-mono text-muted-foreground">HR:{item.address}</span>
              <span className="text-xs text-muted-foreground uppercase">{dataType}</span>
            </div>
          ))}
          {parseInt(quantity) > 5 && (
            <div className="px-4 py-2 text-center text-xs text-muted-foreground">
              ... and {parseInt(quantity) - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={!pattern || parseInt(quantity) < 1}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Generate {quantity} Tags
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/renderer/components/tags/BatchTagDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/components/tags/BatchTagDialog.tsx src/renderer/components/tags/ImportTab.tsx src/renderer/components/tags/ScanTab.tsx src/renderer/components/tags/GenerateTab.tsx tests/renderer/components/tags/BatchTagDialog.test.tsx
git commit -m "feat(ui): add BatchTagDialog with import/scan/generate

- Import tab: CSV/Excel drag-drop with preview
- Scan tab: Address range scanning with response detection
- Generate tab: Pattern-based batch generation
- All tabs provide preview before committing"
```

---

## Phase 4: Visual Style Updates (P1)

### Task 7: Update Tailwind Config with New Colors

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/renderer/styles/globals.css`

**Step 1: Add gradient and refined dark mode colors**

```javascript
// tailwind.config.js - add to theme.extend.colors
colors: {
  // Brand gradient endpoints
  'brand-blue': '#0066FF',
  'brand-teal': '#00D4AA',

  // Refined dark mode backgrounds
  'surface': {
    DEFAULT: '#111827',
    elevated: '#1F2937',
    active: '#374151',
  },

  // Keep existing protocol colors
  'protocol': {
    modbus: '#14B8A6',
    mqtt: '#22C55E',
    opcua: '#8B5CF6',
  },
},

// Add gradient utilities
backgroundImage: {
  'gradient-brand': 'linear-gradient(135deg, #0066FF 0%, #00D4AA 100%)',
  'gradient-brand-hover': 'linear-gradient(135deg, #0052CC 0%, #00B894 100%)',
},

// Add shadow utilities
boxShadow: {
  'brand': '0 4px 14px 0 rgba(0, 102, 255, 0.25)',
  'brand-hover': '0 6px 20px 0 rgba(0, 102, 255, 0.35)',
},
```

**Step 2: Update globals.css**

```css
/* src/renderer/styles/globals.css - add */
@layer utilities {
  .animate-pulse-slow {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .transition-lift {
    transition: transform 150ms ease, box-shadow 150ms ease;
  }

  .hover-lift:hover {
    transform: translateY(-2px);
  }
}
```

**Step 3: Commit**

```bash
git add tailwind.config.js src/renderer/styles/globals.css
git commit -m "style: add brand gradient and refined dark mode colors

- Brand gradient: blue to teal
- Surface elevation hierarchy
- Protocol-specific colors
- Lift and pulse animations"
```

---

### Task 8: Update Logo Component with Gradient

**Files:**
- Modify: `src/renderer/assets/logo.svg` or create `src/renderer/components/common/Logo.tsx`

**Step 1: Create Logo component with gradient**

```typescript
// src/renderer/components/common/Logo.tsx
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#00D4AA" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="32" height="32" rx="6" fill="url(#logo-gradient)" />
      <polygon points="11,12 12.5,12 29,28.5 27.5,28.5" fill="white" />
      <polygon points="26,12 30,12 14,28 10,28" fill="white" />
    </svg>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/common/Logo.tsx
git commit -m "style: add Logo component with brand gradient"
```

---

## Summary & Execution Checklist

| Phase | Task | Status |
|-------|------|--------|
| 1 | SidebarV2 Component | ☐ |
| 1 | NewConnectionDialog | ☐ |
| 1 | UI Store Navigation State | ☐ |
| 1 | Integrate into AppShell | ☐ |
| 2 | DataExplorer + TagRow + TagDetails | ☐ |
| 3 | BatchTagDialog (Import/Scan/Generate) | ☐ |
| 4 | Tailwind Config Update | ☐ |
| 4 | Logo Component | ☐ |

**Total: 8 tasks across 4 phases**

---

*Plan complete.*
