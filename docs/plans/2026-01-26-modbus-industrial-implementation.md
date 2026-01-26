# Modbus TCP Industrial Features - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add industrial-grade Byte Order support, connection health monitoring, batch read optimization, multi Unit ID, and raw frame diagnostics to Modbus TCP connections.

**Architecture:** Extend existing type definitions with ByteOrder and ConnectionMetrics. Modify ModbusTcpAdapter to support configurable byte order and batch reads. Update UI components to expose these features with educational tooltips for new engineers.

**Tech Stack:** TypeScript, Jest (main process tests), Vitest (renderer tests), React, Zustand

---

## Phase 1: Type Definitions & Core Logic

### Task 1: Add ByteOrder Type Definition

**Files:**
- Create: `src/shared/types/modbus.ts`
- Test: `tests/unit/shared/modbus.test.ts`

**Step 1: Create type definition file**

```typescript
// src/shared/types/modbus.ts
/**
 * Modbus-specific type definitions for industrial compatibility.
 */

/**
 * Byte order for multi-register values (32-bit).
 * Named after byte positions: A=MSB, D=LSB for value 0x12345678
 *
 * ABCD (Big-Endian):    [0x1234, 0x5678] - Siemens S7, ABB
 * DCBA (Little-Endian): [0x5678, 0x1234] - Some Allen-Bradley
 * BADC (Mid-Big):       [0x3412, 0x7856] - Schneider Modicon
 * CDAB (Mid-Little):    [0x7856, 0x3412] - GE Fanuc
 */
export type ByteOrder = 'ABCD' | 'DCBA' | 'BADC' | 'CDAB'

export const BYTE_ORDER_INFO: Record<ByteOrder, { name: string; description: string; vendors: string[] }> = {
  ABCD: {
    name: 'Big-Endian',
    description: 'Most significant byte first (Modbus standard)',
    vendors: ['Siemens S7', 'ABB', 'Modicon M340', 'Beckhoff']
  },
  DCBA: {
    name: 'Little-Endian',
    description: 'Least significant byte first',
    vendors: ['Some Allen-Bradley', 'Some Omron']
  },
  BADC: {
    name: 'Mid-Big (Word Swap)',
    description: 'Big-endian words, swapped word order',
    vendors: ['Schneider Modicon', 'Some Mitsubishi']
  },
  CDAB: {
    name: 'Mid-Little (Byte Swap)',
    description: 'Little-endian words, swapped word order',
    vendors: ['GE Fanuc', 'Some older PLCs']
  }
}

export const DEFAULT_BYTE_ORDER: ByteOrder = 'ABCD'

/**
 * Configuration for batch read optimization.
 */
export interface BatchReadConfig {
  enabled: boolean
  maxGap: number        // Max address gap to merge (default: 10)
  maxRegisters: number  // Max registers per request (default: 125, Modbus limit)
}

export const DEFAULT_BATCH_READ_CONFIG: BatchReadConfig = {
  enabled: true,
  maxGap: 10,
  maxRegisters: 125
}
```

**Step 2: Create test file and verify types**

```typescript
// tests/unit/shared/modbus.test.ts
import {
  ByteOrder,
  BYTE_ORDER_INFO,
  DEFAULT_BYTE_ORDER,
  BatchReadConfig,
  DEFAULT_BATCH_READ_CONFIG
} from '@shared/types/modbus'

describe('Modbus Types', () => {
  describe('ByteOrder', () => {
    it('should have info for all byte orders', () => {
      const orders: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']
      orders.forEach(order => {
        expect(BYTE_ORDER_INFO[order]).toBeDefined()
        expect(BYTE_ORDER_INFO[order].name).toBeTruthy()
        expect(BYTE_ORDER_INFO[order].vendors.length).toBeGreaterThan(0)
      })
    })

    it('should have ABCD as default', () => {
      expect(DEFAULT_BYTE_ORDER).toBe('ABCD')
    })
  })

  describe('BatchReadConfig', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_BATCH_READ_CONFIG.enabled).toBe(true)
      expect(DEFAULT_BATCH_READ_CONFIG.maxGap).toBe(10)
      expect(DEFAULT_BATCH_READ_CONFIG.maxRegisters).toBe(125)
    })
  })
})
```

**Step 3: Run test to verify**

Run: `pnpm test:main tests/unit/shared/modbus.test.ts`
Expected: PASS

**Step 4: Export from shared types index**

Modify `src/shared/types/index.ts` to add:
```typescript
export * from './modbus'
```

**Step 5: Commit**

```bash
git add src/shared/types/modbus.ts tests/unit/shared/modbus.test.ts src/shared/types/index.ts
git commit -m "feat(types): add ByteOrder and BatchReadConfig types for Modbus industrial features"
```

---

### Task 2: Extend ModbusTcpConfig with ByteOrder

**Files:**
- Modify: `src/shared/types/connection.ts`
- Test: existing type checks

**Step 1: Update ModbusTcpConfig interface**

```typescript
// In src/shared/types/connection.ts
import type { ByteOrder, BatchReadConfig } from './modbus'

export interface ModbusTcpConfig {
  host: string
  port: number
  unitId: number
  timeout: number
  defaultByteOrder?: ByteOrder      // NEW: Default byte order for this connection
  batchRead?: BatchReadConfig       // NEW: Batch read optimization settings
}

// Update DEFAULT_MODBUS_CONFIG
export const DEFAULT_MODBUS_CONFIG: ModbusTcpConfig = {
  host: '127.0.0.1',
  port: 502,
  unitId: 1,
  timeout: 5000,
  defaultByteOrder: 'ABCD',
  batchRead: {
    enabled: true,
    maxGap: 10,
    maxRegisters: 125
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/types/connection.ts
git commit -m "feat(types): add defaultByteOrder and batchRead to ModbusTcpConfig"
```

---

### Task 3: Extend ModbusAddress with ByteOrder and UnitId Override

**Files:**
- Modify: `src/shared/types/tag.ts`

**Step 1: Update ModbusAddress interface**

```typescript
// In src/shared/types/tag.ts
import type { ByteOrder } from './modbus'

export interface ModbusAddress {
  type: 'modbus'
  registerType: 'holding' | 'input' | 'coil' | 'discrete'
  address: number
  length: number
  byteOrder?: ByteOrder  // NEW: Override connection default
  unitId?: number        // NEW: Override connection default Unit ID
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/types/tag.ts
git commit -m "feat(types): add byteOrder and unitId override to ModbusAddress"
```

---

### Task 4: Add ConnectionMetrics Type

**Files:**
- Modify: `src/shared/types/connection.ts`

**Step 1: Add ConnectionMetrics interface**

```typescript
// In src/shared/types/connection.ts

/**
 * Real-time connection health metrics.
 */
export interface ConnectionMetrics {
  latencyMs: number           // Last request round-trip time
  latencyAvgMs: number        // Average of last 10 requests
  requestCount: number        // Total requests since connect
  errorCount: number          // Total errors since connect
  errorRate: number           // errorCount / requestCount (0-1)
  lastSuccessAt: number       // Timestamp of last successful request
  lastErrorAt?: number        // Timestamp of last error
  lastErrorMessage?: string   // Last error message
  reconnectAttempts: number   // Reconnection attempts since last stable connection
  connectedAt?: number        // Timestamp when connection was established
}

export const INITIAL_METRICS: ConnectionMetrics = {
  latencyMs: 0,
  latencyAvgMs: 0,
  requestCount: 0,
  errorCount: 0,
  errorRate: 0,
  lastSuccessAt: 0,
  reconnectAttempts: 0
}

/**
 * Metric health thresholds for UI coloring.
 */
export const METRIC_THRESHOLDS = {
  latency: { warning: 100, alarm: 500 },      // ms
  errorRate: { warning: 0.01, alarm: 0.05 },  // 1%, 5%
  lastSuccess: { warning: 10000, alarm: 30000 } // ms since last success
} as const
```

**Step 2: Extend Connection interface**

```typescript
export interface Connection {
  id: string
  name: string
  protocol: Protocol
  config: ModbusTcpConfig | MqttConfig | OpcUaConfig
  status: ConnectionStatus
  lastError?: string
  createdAt: number
  metrics?: ConnectionMetrics  // NEW: Real-time health metrics
}
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/shared/types/connection.ts
git commit -m "feat(types): add ConnectionMetrics for health monitoring"
```

---

### Task 5: Add Byte Order Conversion Utilities

**Files:**
- Create: `src/main/protocols/byteOrderUtils.ts`
- Test: `tests/unit/main/byteOrderUtils.test.ts`

**Step 1: Write failing tests for byte order conversion**

```typescript
// tests/unit/main/byteOrderUtils.test.ts
import {
  convertInt32,
  convertUint32,
  convertFloat32,
  swapRegisters,
  swapBytes
} from '@main/protocols/byteOrderUtils'
import type { ByteOrder } from '@shared/types'

describe('byteOrderUtils', () => {
  // Test value: 0x12345678
  // As two 16-bit registers: high=0x1234, low=0x5678

  describe('convertFloat32', () => {
    // IEEE 754: 123.456 ≈ 0x42F6E979
    const HIGH = 0x42F6
    const LOW = 0xE979

    it('should convert ABCD (big-endian) correctly', () => {
      const result = convertFloat32(HIGH, LOW, 'ABCD')
      expect(result).toBeCloseTo(123.456, 2)
    })

    it('should convert DCBA (little-endian) correctly', () => {
      // DCBA expects: [LOW, HIGH] in memory
      const result = convertFloat32(LOW, HIGH, 'DCBA')
      expect(result).toBeCloseTo(123.456, 2)
    })

    it('should convert BADC (mid-big) correctly', () => {
      // BADC: swap bytes within each word
      const swappedHigh = ((HIGH & 0xFF) << 8) | ((HIGH >> 8) & 0xFF) // 0xF642
      const swappedLow = ((LOW & 0xFF) << 8) | ((LOW >> 8) & 0xFF)   // 0x79E9
      const result = convertFloat32(swappedHigh, swappedLow, 'BADC')
      expect(result).toBeCloseTo(123.456, 2)
    })

    it('should convert CDAB (mid-little) correctly', () => {
      // CDAB: swap bytes within each word, then swap words
      const swappedHigh = ((HIGH & 0xFF) << 8) | ((HIGH >> 8) & 0xFF)
      const swappedLow = ((LOW & 0xFF) << 8) | ((LOW >> 8) & 0xFF)
      const result = convertFloat32(swappedLow, swappedHigh, 'CDAB')
      expect(result).toBeCloseTo(123.456, 2)
    })
  })

  describe('convertInt32', () => {
    it('should handle positive values with ABCD', () => {
      const result = convertInt32(0x0000, 0x0064, 'ABCD') // 100
      expect(result).toBe(100)
    })

    it('should handle negative values with ABCD', () => {
      const result = convertInt32(0xFFFF, 0xFFFF, 'ABCD') // -1
      expect(result).toBe(-1)
    })
  })

  describe('convertUint32', () => {
    it('should handle large unsigned values', () => {
      const result = convertUint32(0xFFFF, 0xFFFF, 'ABCD')
      expect(result).toBe(4294967295) // 0xFFFFFFFF
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:main tests/unit/main/byteOrderUtils.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement byte order utilities**

```typescript
// src/main/protocols/byteOrderUtils.ts
import type { ByteOrder } from '@shared/types'

/**
 * Swap bytes within a 16-bit word.
 * 0x1234 -> 0x3412
 */
export function swapBytes(word: number): number {
  return ((word & 0xFF) << 8) | ((word >> 8) & 0xFF)
}

/**
 * Reorder two 16-bit registers based on byte order.
 * Returns [high, low] in the correct order for IEEE 754 interpretation.
 */
export function reorderRegisters(
  reg0: number,
  reg1: number,
  byteOrder: ByteOrder
): [number, number] {
  switch (byteOrder) {
    case 'ABCD': // Big-endian: already correct
      return [reg0, reg1]
    case 'DCBA': // Little-endian: swap words
      return [reg1, reg0]
    case 'BADC': // Mid-big: swap bytes in each word
      return [swapBytes(reg0), swapBytes(reg1)]
    case 'CDAB': // Mid-little: swap bytes and words
      return [swapBytes(reg1), swapBytes(reg0)]
  }
}

/**
 * Convert two 16-bit registers to a 32-bit float (IEEE 754).
 */
export function convertFloat32(
  reg0: number,
  reg1: number,
  byteOrder: ByteOrder
): number {
  const [high, low] = reorderRegisters(reg0, reg1, byteOrder)

  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setUint16(0, high, false)
  view.setUint16(2, low, false)
  return view.getFloat32(0, false)
}

/**
 * Convert two 16-bit registers to a signed 32-bit integer.
 */
export function convertInt32(
  reg0: number,
  reg1: number,
  byteOrder: ByteOrder
): number {
  const [high, low] = reorderRegisters(reg0, reg1, byteOrder)
  const unsigned = ((high << 16) | low) >>> 0

  // Convert to signed if necessary
  if (unsigned >= 0x80000000) {
    return unsigned - 0x100000000
  }
  return unsigned
}

/**
 * Convert two 16-bit registers to an unsigned 32-bit integer.
 */
export function convertUint32(
  reg0: number,
  reg1: number,
  byteOrder: ByteOrder
): number {
  const [high, low] = reorderRegisters(reg0, reg1, byteOrder)
  return ((high << 16) | low) >>> 0
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:main tests/unit/main/byteOrderUtils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/protocols/byteOrderUtils.ts tests/unit/main/byteOrderUtils.test.ts
git commit -m "feat(modbus): add byte order conversion utilities with tests"
```

---

### Task 6: Update ModbusTcpAdapter to Use ByteOrder

**Files:**
- Modify: `src/main/protocols/ModbusTcpAdapter.ts`
- Modify: `tests/unit/main/ModbusTcpAdapter.test.ts`

**Step 1: Write failing tests for byte order in adapter**

```typescript
// Add to tests/unit/main/ModbusTcpAdapter.test.ts

describe('Byte Order Support', () => {
  const createConnectionWithByteOrder = (byteOrder: ByteOrder): Connection => ({
    ...mockConnection,
    config: {
      ...mockConnection.config,
      defaultByteOrder: byteOrder
    }
  })

  it('should use connection default byte order', () => {
    const adapter = new ModbusTcpAdapter(
      createConnectionWithByteOrder('DCBA')
    )
    expect(adapter.getDefaultByteOrder()).toBe('DCBA')
  })

  it('should default to ABCD when not specified', () => {
    const adapter = new ModbusTcpAdapter(mockConnection)
    expect(adapter.getDefaultByteOrder()).toBe('ABCD')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:main tests/unit/main/ModbusTcpAdapter.test.ts`
Expected: FAIL with "getDefaultByteOrder is not a function"

**Step 3: Implement byte order support in adapter**

Update `src/main/protocols/ModbusTcpAdapter.ts`:

1. Import byte order utilities:
```typescript
import { convertFloat32, convertInt32, convertUint32 } from './byteOrderUtils'
import type { ByteOrder } from '@shared/types'
```

2. Add getter for default byte order:
```typescript
getDefaultByteOrder(): ByteOrder {
  return this.config.defaultByteOrder ?? 'ABCD'
}
```

3. Update `convertValue` method to accept and use byte order:
```typescript
private convertValue(
  rawData: number[] | boolean[],
  dataType: DataType,
  address: ModbusAddress
): number | boolean | string {
  // ... existing boolean handling ...

  const registers = rawData as number[]
  const byteOrder = address.byteOrder ?? this.getDefaultByteOrder()

  switch (dataType) {
    // ... existing int16/uint16 cases ...

    case 'int32':
      if (registers.length < 2) {
        throw new Error('INT32 requires 2 registers')
      }
      return convertInt32(registers[0], registers[1], byteOrder)

    case 'uint32':
      if (registers.length < 2) {
        throw new Error('UINT32 requires 2 registers')
      }
      return convertUint32(registers[0], registers[1], byteOrder)

    case 'float32':
      if (registers.length < 2) {
        throw new Error('FLOAT32 requires 2 registers')
      }
      return convertFloat32(registers[0], registers[1], byteOrder)

    // ... rest unchanged ...
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:main tests/unit/main/ModbusTcpAdapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/protocols/ModbusTcpAdapter.ts tests/unit/main/ModbusTcpAdapter.test.ts
git commit -m "feat(modbus): implement configurable byte order in ModbusTcpAdapter"
```

---

## Phase 2: UI Components

### Task 7: Add ByteOrder Selector to NewConnectionDialog

**Files:**
- Modify: `src/renderer/components/connection/NewConnectionDialog.tsx`
- Create: `src/renderer/components/connection/ByteOrderSelector.tsx`
- Test: `tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx`

**Step 1: Write failing test**

```typescript
// Add to tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx

describe('Byte Order Selection', () => {
  it('should show byte order selector in advanced options for Modbus', async () => {
    render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    // Open advanced options
    await userEvent.click(screen.getByText(/advanced options/i))

    expect(screen.getByLabelText(/byte order/i)).toBeInTheDocument()
  })

  it('should show byte order visual example', async () => {
    render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    await userEvent.click(screen.getByText(/advanced options/i))

    // Should show vendor info
    expect(screen.getByText(/siemens/i)).toBeInTheDocument()
  })

  it('should include byte order in form data', async () => {
    const onSubmit = vi.fn()
    render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/name/i), 'Test PLC')
    await userEvent.type(screen.getByLabelText(/address/i), '192.168.1.100')

    await userEvent.click(screen.getByText(/advanced options/i))
    await userEvent.click(screen.getByLabelText(/byte order/i))
    await userEvent.click(screen.getByText(/little-endian/i))

    await userEvent.click(screen.getByRole('button', { name: /connect/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          defaultByteOrder: 'DCBA'
        })
      })
    )
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:unit tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx`
Expected: FAIL

**Step 3: Create ByteOrderSelector component**

```typescript
// src/renderer/components/connection/ByteOrderSelector.tsx
import React from 'react'
import { cn } from '@renderer/lib/utils'
import { Info } from 'lucide-react'
import type { ByteOrder } from '@shared/types'
import { BYTE_ORDER_INFO } from '@shared/types/modbus'

interface ByteOrderSelectorProps {
  value: ByteOrder
  onChange: (value: ByteOrder) => void
}

// Visual example: show how 123.456 (0x42F6E979) looks in each byte order
const EXAMPLE_VALUE = 123.456
const EXAMPLE_HEX = '42 F6 E9 79'
const EXAMPLE_REGISTERS: Record<ByteOrder, string> = {
  ABCD: 'Reg0: 0x42F6 │ Reg1: 0xE979',
  DCBA: 'Reg0: 0xE979 │ Reg1: 0x42F6',
  BADC: 'Reg0: 0xF642 │ Reg1: 0x79E9',
  CDAB: 'Reg0: 0x79E9 │ Reg1: 0xF642'
}

export function ByteOrderSelector({ value, onChange }: ByteOrderSelectorProps): React.ReactElement {
  const options: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']
  const selectedInfo = BYTE_ORDER_INFO[value]

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Default Byte Order
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ByteOrder)}
        aria-label="Byte Order"
        className={cn(
          'w-full px-4 py-2 rounded-lg',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'text-gray-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500'
        )}
      >
        {options.map((order) => (
          <option key={order} value={order}>
            {order} - {BYTE_ORDER_INFO[order].name}
          </option>
        ))}
      </select>

      {/* Visual Example Box */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Example: FLOAT32 value {EXAMPLE_VALUE}
            </p>
            <div className="mt-2 font-mono text-xs text-blue-800 dark:text-blue-200">
              <p>Raw bytes: {EXAMPLE_HEX}</p>
              <p className="mt-1">{EXAMPLE_REGISTERS[value]}</p>
            </div>
            <p className="mt-2 text-blue-700 dark:text-blue-300">
              Common: {selectedInfo.vendors.slice(0, 3).join(', ')}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Not sure? Use Tools → Byte Order Converter to test with actual device values.
      </p>
    </div>
  )
}
```

**Step 4: Integrate into NewConnectionDialog**

Update `NewConnectionDialog.tsx` to:
1. Import ByteOrderSelector
2. Add state: `const [byteOrder, setByteOrder] = useState<ByteOrder>('ABCD')`
3. Add ByteOrderSelector in Advanced Options section (Modbus only)
4. Include in `buildFormData()`:
```typescript
case 'modbus-tcp': {
  return {
    name,
    protocol,
    config: {
      host,
      port,
      unitId,
      timeout,
      defaultByteOrder: byteOrder,  // NEW
    } as ModbusTcpConfig
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm test:unit tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/renderer/components/connection/ByteOrderSelector.tsx \
        src/renderer/components/connection/NewConnectionDialog.tsx \
        tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx
git commit -m "feat(ui): add ByteOrderSelector with visual example to NewConnectionDialog"
```

---

### Task 8: Add Connection Metrics Display to DataExplorer

**Files:**
- Modify: `src/renderer/components/explorer/DataExplorer.tsx`
- Create: `src/renderer/components/explorer/ConnectionStatusBar.tsx`
- Test: `tests/unit/renderer/components/explorer/DataExplorer.test.tsx`

**Step 1: Write failing test**

```typescript
// Add to tests/unit/renderer/components/explorer/DataExplorer.test.tsx

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

  it('should display latency in status bar', () => {
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        metrics={mockMetrics}
        tags={[]}
        displayStates={{}}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )

    expect(screen.getByText(/12\s*ms/)).toBeInTheDocument()
  })

  it('should display error count', () => {
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        metrics={mockMetrics}
        tags={[]}
        displayStates={{}}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )

    expect(screen.getByText(/2 errors/i)).toBeInTheDocument()
  })

  it('should show warning color when latency exceeds threshold', () => {
    const highLatencyMetrics = { ...mockMetrics, latencyMs: 150 }
    render(
      <DataExplorer
        connectionName="PLC-01"
        connectionStatus="connected"
        metrics={highLatencyMetrics}
        tags={[]}
        displayStates={{}}
        onAddTag={vi.fn()}
        onDisconnect={vi.fn()}
      />
    )

    const latencyElement = screen.getByTestId('latency-display')
    expect(latencyElement).toHaveClass('text-yellow-500')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:unit tests/unit/renderer/components/explorer/DataExplorer.test.tsx`
Expected: FAIL

**Step 3: Create ConnectionStatusBar component**

```typescript
// src/renderer/components/explorer/ConnectionStatusBar.tsx
import React from 'react'
import { cn } from '@renderer/lib/utils'
import { Clock, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ConnectionMetrics } from '@shared/types'
import { METRIC_THRESHOLDS } from '@shared/types/connection'

interface ConnectionStatusBarProps {
  metrics: ConnectionMetrics
}

function getLatencyColor(latency: number): string {
  if (latency >= METRIC_THRESHOLDS.latency.alarm) return 'text-red-500'
  if (latency >= METRIC_THRESHOLDS.latency.warning) return 'text-yellow-500'
  return 'text-green-500'
}

function getErrorRateColor(rate: number): string {
  if (rate >= METRIC_THRESHOLDS.errorRate.alarm) return 'text-red-500'
  if (rate >= METRIC_THRESHOLDS.errorRate.warning) return 'text-yellow-500'
  return 'text-gray-500 dark:text-gray-400'
}

export function ConnectionStatusBar({ metrics }: ConnectionStatusBarProps): React.ReactElement {
  const {
    latencyMs,
    latencyAvgMs,
    requestCount,
    errorCount,
    errorRate
  } = metrics

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-sm">
      {/* Latency */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-gray-400" />
        <span
          data-testid="latency-display"
          className={cn('font-mono', getLatencyColor(latencyMs))}
        >
          {latencyMs}ms
        </span>
      </div>

      {/* Average Latency */}
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <Activity className="w-4 h-4" />
        <span className="font-mono">Avg: {latencyAvgMs}ms</span>
      </div>

      {/* Request Count */}
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <CheckCircle2 className="w-4 h-4" />
        <span>{requestCount.toLocaleString()} req</span>
      </div>

      {/* Error Count */}
      {errorCount > 0 && (
        <div className={cn('flex items-center gap-1.5', getErrorRateColor(errorRate))}>
          <AlertTriangle className="w-4 h-4" />
          <span>{errorCount} errors ({(errorRate * 100).toFixed(1)}%)</span>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Integrate into DataExplorer**

Update DataExplorer.tsx to:
1. Add `metrics?: ConnectionMetrics` prop
2. Render `<ConnectionStatusBar metrics={metrics} />` when metrics are available

**Step 5: Run tests to verify they pass**

Run: `pnpm test:unit tests/unit/renderer/components/explorer/DataExplorer.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/renderer/components/explorer/ConnectionStatusBar.tsx \
        src/renderer/components/explorer/DataExplorer.tsx \
        tests/unit/renderer/components/explorer/DataExplorer.test.tsx
git commit -m "feat(ui): add ConnectionStatusBar with latency and error metrics"
```

---

## Phase 3: Backend Integration

### Task 9: Implement Metrics Tracking in ModbusTcpAdapter

**Files:**
- Modify: `src/main/protocols/ModbusTcpAdapter.ts`
- Modify: `tests/unit/main/ModbusTcpAdapter.test.ts`

**Step 1: Write failing tests**

```typescript
// Add to tests/unit/main/ModbusTcpAdapter.test.ts

describe('Metrics Tracking', () => {
  it('should track request count', async () => {
    const adapter = new ModbusTcpAdapter(mockConnection)
    await adapter.connect()

    // Mock successful reads
    const mockTag = createMockTag('HR100', 'uint16')
    await adapter.readTags([mockTag])
    await adapter.readTags([mockTag])

    const metrics = adapter.getMetrics()
    expect(metrics.requestCount).toBe(2)
  })

  it('should track latency', async () => {
    const adapter = new ModbusTcpAdapter(mockConnection)
    await adapter.connect()

    const mockTag = createMockTag('HR100', 'uint16')
    await adapter.readTags([mockTag])

    const metrics = adapter.getMetrics()
    expect(metrics.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('should track errors', async () => {
    const adapter = new ModbusTcpAdapter(mockConnection)
    await adapter.connect()

    // Force an error
    const mockTag = createMockTag('HR99999', 'uint16') // Invalid address
    await adapter.readTags([mockTag])

    const metrics = adapter.getMetrics()
    expect(metrics.errorCount).toBe(1)
  })

  it('should emit metrics-updated event', async () => {
    const adapter = new ModbusTcpAdapter(mockConnection)
    const metricsHandler = jest.fn()
    adapter.on('metrics-updated', metricsHandler)

    await adapter.connect()

    const mockTag = createMockTag('HR100', 'uint16')
    await adapter.readTags([mockTag])

    expect(metricsHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        requestCount: 1
      })
    )
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:main tests/unit/main/ModbusTcpAdapter.test.ts`
Expected: FAIL

**Step 3: Implement metrics tracking**

Add to ModbusTcpAdapter:

```typescript
import type { ConnectionMetrics } from '@shared/types'
import { INITIAL_METRICS } from '@shared/types/connection'

export class ModbusTcpAdapter extends ProtocolAdapter {
  // ... existing code ...

  private metrics: ConnectionMetrics = { ...INITIAL_METRICS }
  private latencyHistory: number[] = []
  private readonly LATENCY_HISTORY_SIZE = 10

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics }
  }

  private updateMetrics(latencyMs: number, isError: boolean, errorMessage?: string): void {
    const now = Date.now()

    this.metrics.requestCount++
    this.metrics.latencyMs = latencyMs

    // Update latency history
    this.latencyHistory.push(latencyMs)
    if (this.latencyHistory.length > this.LATENCY_HISTORY_SIZE) {
      this.latencyHistory.shift()
    }
    this.metrics.latencyAvgMs = Math.round(
      this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
    )

    if (isError) {
      this.metrics.errorCount++
      this.metrics.lastErrorAt = now
      this.metrics.lastErrorMessage = errorMessage
    } else {
      this.metrics.lastSuccessAt = now
    }

    this.metrics.errorRate = this.metrics.requestCount > 0
      ? this.metrics.errorCount / this.metrics.requestCount
      : 0

    this.emit('metrics-updated', this.getMetrics())
  }

  private resetMetrics(): void {
    this.metrics = { ...INITIAL_METRICS }
    this.latencyHistory = []
  }
}
```

Update `readTags` to track metrics:

```typescript
async readTags(tags: Tag[]): Promise<ReadResult[]> {
  const results: ReadResult[] = []
  const timestamp = Date.now()
  const startTime = performance.now()

  for (const tag of tags) {
    // ... existing code ...
  }

  const latencyMs = Math.round(performance.now() - startTime)
  const hasErrors = results.some(r => r.quality === 'bad')
  this.updateMetrics(latencyMs, hasErrors)

  return results
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:main tests/unit/main/ModbusTcpAdapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/protocols/ModbusTcpAdapter.ts tests/unit/main/ModbusTcpAdapter.test.ts
git commit -m "feat(modbus): implement connection metrics tracking"
```

---

### Task 10: Add Metrics IPC Channel

**Files:**
- Modify: `src/shared/constants/ipc-channels.ts`
- Modify: `src/main/ipc/connection.ts`
- Modify: `src/preload/index.ts`

**Step 1: Add IPC channel constant**

```typescript
// In src/shared/constants/ipc-channels.ts
export const IPC_CHANNELS = {
  // ... existing channels ...
  CONNECTION_METRICS: 'connection:metrics',
  CONNECTION_METRICS_CHANGED: 'connection:metrics-changed',
} as const
```

**Step 2: Add IPC handler**

```typescript
// In src/main/ipc/connection.ts
ipcMain.handle(IPC_CHANNELS.CONNECTION_METRICS, async (_, connectionId: string) => {
  try {
    const manager = ConnectionManager.getInstance()
    const metrics = manager.getConnectionMetrics(connectionId)
    return { success: true, metrics }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
```

**Step 3: Expose in preload**

```typescript
// In src/preload/index.ts
connection: {
  // ... existing methods ...
  getMetrics: (connectionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_METRICS, connectionId),
  onMetricsChanged: (callback: (payload: { connectionId: string; metrics: ConnectionMetrics }) => void) => {
    const handler = (_: IpcRendererEvent, payload: { connectionId: string; metrics: ConnectionMetrics }) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_METRICS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONNECTION_METRICS_CHANGED, handler)
  }
}
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add src/shared/constants/ipc-channels.ts src/main/ipc/connection.ts src/preload/index.ts
git commit -m "feat(ipc): add metrics IPC channel for real-time health monitoring"
```

---

### Task 11: Integrate Metrics in Renderer

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/stores/connectionStore.ts`

**Step 1: Add metrics to connection store**

```typescript
// In src/renderer/stores/connectionStore.ts
interface ConnectionStore {
  // ... existing ...
  metrics: Map<string, ConnectionMetrics>
  setMetrics: (connectionId: string, metrics: ConnectionMetrics) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  // ... existing ...
  metrics: new Map(),
  setMetrics: (connectionId, metrics) =>
    set((state) => {
      const newMetrics = new Map(state.metrics)
      newMetrics.set(connectionId, metrics)
      return { metrics: newMetrics }
    }),
}))
```

**Step 2: Subscribe to metrics in App.tsx**

```typescript
// In App.tsx useEffect for initialization
useEffect(() => {
  // ... existing connection initialization ...

  // Subscribe to metrics changes
  const unsubscribeMetrics = window.electronAPI.connection.onMetricsChanged((payload) => {
    setMetrics(payload.connectionId, payload.metrics)
  })

  return () => {
    unsubscribe()
    unsubscribeMetrics()
  }
}, [setConnections, handleStatusChanged, setMetrics])
```

**Step 3: Pass metrics to DataExplorer**

```typescript
// In App.tsx render
const connectionMetrics = selectedConnectionId
  ? metrics.get(selectedConnectionId)
  : undefined

<DataExplorer
  // ... existing props ...
  metrics={connectionMetrics}
/>
```

**Step 4: Verify app runs**

Run: `pnpm dev`
Expected: App runs without errors

**Step 5: Commit**

```bash
git add src/renderer/App.tsx src/renderer/stores/connectionStore.ts
git commit -m "feat(renderer): integrate connection metrics in UI"
```

---

## Summary

This implementation plan covers:

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | Tasks 1-6 | Type definitions, byte order utilities, adapter updates |
| 2 | Tasks 7-8 | UI components (ByteOrderSelector, ConnectionStatusBar) |
| 3 | Tasks 9-11 | Backend integration (metrics tracking, IPC, store) |

**Total: 11 tasks, ~30-40 individual steps**

Remaining features for future plans:
- Batch read optimization (coalesce adjacent addresses)
- Raw frame diagnostics panel
- Multi Unit ID in batch reads
- Tag-level byte order/unit ID UI

---

## Next Steps

After completing this plan, create follow-up plans for:
1. `2026-01-26-modbus-batch-read.md` - Batch read optimization
2. `2026-01-26-modbus-diagnostics.md` - Raw frame diagnostics panel
