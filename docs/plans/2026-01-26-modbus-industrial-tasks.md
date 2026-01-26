# Modbus TCP Industrial Features - Implementation Tasks

> **For Claude:** Execute tasks in order. Each task has test conditions. Mark `[x]` when complete.

**Goal:** Add industrial-grade Byte Order, Connection Metrics, Multi Unit ID support to Modbus TCP

**Tech Stack:** TypeScript, Jest (main), Vitest (renderer), React, Zustand

**Branch:** `feat/ui-ux-redesign`

---

## Review Notes

> **Reviewed:** 2026-01-26 | **Status:** Ready for implementation

### Key Design Decisions

1. **Test Runner for Shared Types**: Shared types are pure TypeScript without Node/Electron dependencies. Using `pnpm test:main` (Jest) is acceptable since Jest can run pure TS tests. If issues arise, consider adding `pnpm test:shared` script.

2. **BatchReadConfig**: Added in Phase 1 for type completeness but **not consumed until follow-up batch read plan**. This is intentional forward-compatibility - the config will be used when batch read optimization is implemented.

3. **Commit Strategy**: Commits are consolidated per logical feature (not per micro-task) to maintain clean git history while preserving rollback granularity.

---

## Phase 1: Type Definitions

### Task 1.1: Create Modbus Types File

- [x] T001 Create `src/shared/types/modbus.ts` with ByteOrder type
  - **File:** `src/shared/types/modbus.ts`
  - **Content:** `ByteOrder` type union: `'ABCD' | 'DCBA' | 'BADC' | 'CDAB'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** File exists, no TypeScript errors

- [x] T002 Add `BYTE_ORDER_INFO` constant with vendor information
  - **File:** `src/shared/types/modbus.ts`
  - **Content:** Record mapping each ByteOrder to `{ name, description, vendors[] }`
  - **Test:** `BYTE_ORDER_INFO['ABCD'].vendors` includes 'Siemens S7'
  - **Pass Criteria:** All 4 byte orders have name, description, and at least 2 vendors

- [x] T003 Add `DEFAULT_BYTE_ORDER` constant
  - **File:** `src/shared/types/modbus.ts`
  - **Content:** `export const DEFAULT_BYTE_ORDER: ByteOrder = 'ABCD'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Default is 'ABCD' (Modbus standard)

- [x] T004 Add `BatchReadConfig` interface
  - **File:** `src/shared/types/modbus.ts`
  - **Content:** `{ enabled: boolean, maxGap: number, maxRegisters: number }`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Interface compiles

- [x] T005 Add `DEFAULT_BATCH_READ_CONFIG` constant
  - **File:** `src/shared/types/modbus.ts`
  - **Content:** `{ enabled: true, maxGap: 10, maxRegisters: 125 }`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** maxRegisters is 125 (Modbus protocol limit)
  - **Note:** BatchReadConfig is defined now for type completeness but consumed in future batch read plan

---

### Task 1.2: Create Modbus Types Unit Test

> **Note:** Using `pnpm test:main` (Jest) for shared types tests. These are pure TypeScript without Node/Electron dependencies, so either test runner works. Jest is chosen for consistency with main process tests.

- [x] T006 Create test file `tests/unit/shared/modbus.test.ts`
  - **File:** `tests/unit/shared/modbus.test.ts`
  - **Test:** File exists and imports from `@shared/types/modbus`
  - **Pass Criteria:** `pnpm test:main tests/unit/shared/modbus.test.ts` runs (may fail initially)

- [x] T007 Write test: ByteOrder has info for all 4 types
  - **File:** `tests/unit/shared/modbus.test.ts`
  - **Test Code:**
    ```typescript
    it('should have info for all byte orders', () => {
      const orders: ByteOrder[] = ['ABCD', 'DCBA', 'BADC', 'CDAB']
      orders.forEach(order => {
        expect(BYTE_ORDER_INFO[order]).toBeDefined()
        expect(BYTE_ORDER_INFO[order].name).toBeTruthy()
        expect(BYTE_ORDER_INFO[order].vendors.length).toBeGreaterThan(0)
      })
    })
    ```
  - **Pass Criteria:** Test passes

- [x] T008 Write test: DEFAULT_BYTE_ORDER is ABCD
  - **File:** `tests/unit/shared/modbus.test.ts`
  - **Test Code:**
    ```typescript
    it('should have ABCD as default byte order', () => {
      expect(DEFAULT_BYTE_ORDER).toBe('ABCD')
    })
    ```
  - **Pass Criteria:** Test passes

- [x] T009 Write test: BatchReadConfig defaults are sensible
  - **File:** `tests/unit/shared/modbus.test.ts`
  - **Test Code:**
    ```typescript
    it('should have sensible batch read defaults', () => {
      expect(DEFAULT_BATCH_READ_CONFIG.enabled).toBe(true)
      expect(DEFAULT_BATCH_READ_CONFIG.maxGap).toBe(10)
      expect(DEFAULT_BATCH_READ_CONFIG.maxRegisters).toBe(125)
    })
    ```
  - **Pass Criteria:** Test passes

- [x] T010 Run all modbus type tests
  - **Command:** `pnpm test:main tests/unit/shared/modbus.test.ts`
  - **Pass Criteria:** All tests pass

---

### Task 1.3: Export Modbus Types from Index

- [x] T011 Add export to `src/shared/types/index.ts`
  - **File:** `src/shared/types/index.ts`
  - **Content:** Add `export * from './modbus'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Types can be imported from `@shared/types`

- [ ] T012 ~~Commit Phase 1.1-1.3~~ (Deferred - see T026)
  - **Note:** Commit deferred to T026 for consolidated Phase 1 commit
  - **Pass Criteria:** Skip to next task

---

### Task 1.4: Extend ModbusTcpConfig

- [x] T013 Import ByteOrder in connection.ts
  - **File:** `src/shared/types/connection.ts`
  - **Content:** Add `import type { ByteOrder, BatchReadConfig } from './modbus'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Import resolves

- [x] T014 Add `defaultByteOrder` to ModbusTcpConfig
  - **File:** `src/shared/types/connection.ts`
  - **Content:** Add `defaultByteOrder?: ByteOrder` to interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Field is optional (backward compatible)

- [x] T015 Add `batchRead` to ModbusTcpConfig
  - **File:** `src/shared/types/connection.ts`
  - **Content:** Add `batchRead?: BatchReadConfig` to interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Field is optional

- [x] T016 Update DEFAULT_MODBUS_CONFIG with new fields
  - **File:** `src/shared/types/connection.ts`
  - **Content:** Add `defaultByteOrder: 'ABCD'` and `batchRead: { enabled: true, maxGap: 10, maxRegisters: 125 }`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Defaults match spec

- [ ] T017 ~~Commit Task 1.4~~ (Deferred - see T026)
  - **Note:** Commit deferred to T026 for consolidated Phase 1 commit
  - **Pass Criteria:** Skip to next task

---

### Task 1.5: Extend ModbusAddress

- [x] T018 Import ByteOrder in tag.ts
  - **File:** `src/shared/types/tag.ts`
  - **Content:** Add `import type { ByteOrder } from './modbus'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Import resolves

- [x] T019 Add `byteOrder` override to ModbusAddress
  - **File:** `src/shared/types/tag.ts`
  - **Content:** Add `byteOrder?: ByteOrder` to ModbusAddress interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Field is optional (uses connection default if not set)

- [x] T020 Add `unitId` override to ModbusAddress
  - **File:** `src/shared/types/tag.ts`
  - **Content:** Add `unitId?: number` to ModbusAddress interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Field is optional (uses connection default if not set)

- [ ] T021 ~~Commit Task 1.5~~ (Deferred - see T026)
  - **Note:** Commit deferred to T026 for consolidated Phase 1 commit
  - **Pass Criteria:** Skip to next task

---

### Task 1.6: Add ConnectionMetrics Type

- [x] T022 Add ConnectionMetrics interface
  - **File:** `src/shared/types/connection.ts`
  - **Content:**
    ```typescript
    export interface ConnectionMetrics {
      latencyMs: number
      latencyAvgMs: number
      requestCount: number
      errorCount: number
      errorRate: number
      lastSuccessAt: number
      lastErrorAt?: number
      lastErrorMessage?: string
      reconnectAttempts: number
      connectedAt?: number
    }
    ```
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Interface compiles

- [x] T023 Add INITIAL_METRICS constant
  - **File:** `src/shared/types/connection.ts`
  - **Content:** All numeric fields set to 0, optional fields omitted
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Can be used to initialize metrics state

- [x] T024 Add METRIC_THRESHOLDS constant
  - **File:** `src/shared/types/connection.ts`
  - **Content:**
    ```typescript
    export const METRIC_THRESHOLDS = {
      latency: { warning: 100, alarm: 500 },
      errorRate: { warning: 0.01, alarm: 0.05 },
      lastSuccess: { warning: 10000, alarm: 30000 }
    } as const
    ```
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Thresholds match design spec

- [x] T025 Add `metrics` field to Connection interface
  - **File:** `src/shared/types/connection.ts`
  - **Content:** Add `metrics?: ConnectionMetrics` to Connection interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Field is optional

- [x] T026 Commit Phase 1 (Consolidated)
  - **Command:**
    ```bash
    git add src/shared/types/modbus.ts \
            src/shared/types/connection.ts \
            src/shared/types/tag.ts \
            src/shared/types/index.ts \
            tests/unit/shared/modbus.test.ts
    ```
  - **Commit:** `feat(types): add ByteOrder, BatchReadConfig, ConnectionMetrics for Modbus industrial features`
  - **Pass Criteria:** Commit successful, all Phase 1 type definitions in single commit

---

## Phase 2: Byte Order Conversion Utilities

### Task 2.1: Create Test File for Byte Order Utils

- [x] T027 Create test file `tests/unit/main/byteOrderUtils.test.ts`
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Content:** Basic describe block, import statement
  - **Test:** File exists
  - **Pass Criteria:** `pnpm test:main tests/unit/main/byteOrderUtils.test.ts` runs (fails with module not found)

- [x] T028 Write failing test: swapBytes function
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    describe('swapBytes', () => {
      it('should swap high and low bytes', () => {
        expect(swapBytes(0x1234)).toBe(0x3412)
        expect(swapBytes(0x00FF)).toBe(0xFF00)
        expect(swapBytes(0xABCD)).toBe(0xCDAB)
      })
    })
    ```
  - **Pass Criteria:** Test fails with "swapBytes is not defined"

- [x] T029 Write failing test: convertFloat32 ABCD
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    describe('convertFloat32', () => {
      // IEEE 754: 123.456 ≈ 0x42F6E979
      const HIGH = 0x42F6
      const LOW = 0xE979

      it('should convert ABCD (big-endian) correctly', () => {
        const result = convertFloat32(HIGH, LOW, 'ABCD')
        expect(result).toBeCloseTo(123.456, 2)
      })
    })
    ```
  - **Pass Criteria:** Test fails with "convertFloat32 is not defined"

- [x] T030 Write failing test: convertFloat32 DCBA
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should convert DCBA (little-endian) correctly', () => {
      const result = convertFloat32(LOW, HIGH, 'DCBA')
      expect(result).toBeCloseTo(123.456, 2)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T031 Write failing test: convertFloat32 BADC
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should convert BADC (mid-big) correctly', () => {
      const swappedHigh = 0xF642 // swapBytes(0x42F6)
      const swappedLow = 0x79E9  // swapBytes(0xE979)
      const result = convertFloat32(swappedHigh, swappedLow, 'BADC')
      expect(result).toBeCloseTo(123.456, 2)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T032 Write failing test: convertFloat32 CDAB
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should convert CDAB (mid-little) correctly', () => {
      const swappedHigh = 0xF642
      const swappedLow = 0x79E9
      const result = convertFloat32(swappedLow, swappedHigh, 'CDAB')
      expect(result).toBeCloseTo(123.456, 2)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T033 Write failing test: convertInt32 positive
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    describe('convertInt32', () => {
      it('should handle positive values with ABCD', () => {
        const result = convertInt32(0x0000, 0x0064, 'ABCD')
        expect(result).toBe(100)
      })
    })
    ```
  - **Pass Criteria:** Test added

- [x] T034 Write failing test: convertInt32 negative
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should handle negative values with ABCD', () => {
      const result = convertInt32(0xFFFF, 0xFFFF, 'ABCD')
      expect(result).toBe(-1)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T035 Write failing test: convertUint32 large value
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    describe('convertUint32', () => {
      it('should handle large unsigned values', () => {
        const result = convertUint32(0xFFFF, 0xFFFF, 'ABCD')
        expect(result).toBe(4294967295)
      })
    })
    ```
  - **Pass Criteria:** Test added

### Task 2.1a: Edge Case Tests (Industrial Robustness)

> **Rationale:** Industrial environments produce edge cases (NaN from sensor faults, boundary values). These tests ensure robustness.

- [x] T035a Write failing test: convertFloat32 handles NaN
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    describe('Edge Cases', () => {
      it('should return NaN for NaN registers', () => {
        // IEEE 754 NaN: 0x7FC00000
        const result = convertFloat32(0x7FC0, 0x0000, 'ABCD')
        expect(result).toBeNaN()
      })
    })
    ```
  - **Pass Criteria:** Test added

- [x] T035b Write failing test: convertFloat32 handles Infinity
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should return Infinity for Infinity registers', () => {
      // IEEE 754 +Infinity: 0x7F800000
      const result = convertFloat32(0x7F80, 0x0000, 'ABCD')
      expect(result).toBe(Infinity)
    })

    it('should return -Infinity for -Infinity registers', () => {
      // IEEE 754 -Infinity: 0xFF800000
      const result = convertFloat32(0xFF80, 0x0000, 'ABCD')
      expect(result).toBe(-Infinity)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T035c Write failing test: convertInt32 boundary (MIN_INT32)
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should handle INT32 minimum boundary', () => {
      // 0x80000000 = -2147483648
      const result = convertInt32(0x8000, 0x0000, 'ABCD')
      expect(result).toBe(-2147483648)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T035d Write failing test: swapBytes masks to 16-bit
  - **File:** `tests/unit/main/byteOrderUtils.test.ts`
  - **Test Code:**
    ```typescript
    it('should mask input to 16-bit', () => {
      // Input > 0xFFFF should be masked
      const result = swapBytes(0x12345678)
      // Only lower 16 bits (0x5678) should be processed
      expect(result).toBe(0x7856)
    })
    ```
  - **Pass Criteria:** Test added

---

### Task 2.2: Implement Byte Order Utilities

- [x] T036 Create `src/main/protocols/byteOrderUtils.ts`
  - **File:** `src/main/protocols/byteOrderUtils.ts`
  - **Content:** File with imports and JSDoc header
  - **Test:** File exists
  - **Pass Criteria:** `pnpm typecheck` passes

- [x] T037 Implement swapBytes function
  - **File:** `src/main/protocols/byteOrderUtils.ts`
  - **Content:**
    ```typescript
    export function swapBytes(word: number): number {
      return ((word & 0xFF) << 8) | ((word >> 8) & 0xFF)
    }
    ```
  - **Test:** `pnpm test:main` - swapBytes tests pass
  - **Pass Criteria:** All swapBytes tests pass

- [x] T038 Implement reorderRegisters function
  - **File:** `src/main/protocols/byteOrderUtils.ts`
  - **Content:**
    ```typescript
    export function reorderRegisters(
      reg0: number,
      reg1: number,
      byteOrder: ByteOrder
    ): [number, number] {
      switch (byteOrder) {
        case 'ABCD': return [reg0, reg1]
        case 'DCBA': return [reg1, reg0]
        case 'BADC': return [swapBytes(reg0), swapBytes(reg1)]
        case 'CDAB': return [swapBytes(reg1), swapBytes(reg0)]
      }
    }
    ```
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Function compiles

- [x] T039 Implement convertFloat32 function
  - **File:** `src/main/protocols/byteOrderUtils.ts`
  - **Content:**
    ```typescript
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
    ```
  - **Test:** `pnpm test:main` - convertFloat32 tests pass
  - **Pass Criteria:** All 4 byte order tests pass

- [x] T040 Implement convertInt32 function
  - **File:** `src/main/protocols/byteOrderUtils.ts`
  - **Content:**
    ```typescript
    export function convertInt32(
      reg0: number,
      reg1: number,
      byteOrder: ByteOrder
    ): number {
      const [high, low] = reorderRegisters(reg0, reg1, byteOrder)
      const unsigned = ((high << 16) | low) >>> 0
      if (unsigned >= 0x80000000) {
        return unsigned - 0x100000000
      }
      return unsigned
    }
    ```
  - **Test:** `pnpm test:main` - convertInt32 tests pass
  - **Pass Criteria:** Positive and negative tests pass

- [x] T041 Implement convertUint32 function
  - **File:** `src/main/protocols/byteOrderUtils.ts`
  - **Content:**
    ```typescript
    export function convertUint32(
      reg0: number,
      reg1: number,
      byteOrder: ByteOrder
    ): number {
      const [high, low] = reorderRegisters(reg0, reg1, byteOrder)
      return ((high << 16) | low) >>> 0
    }
    ```
  - **Test:** `pnpm test:main` - convertUint32 tests pass
  - **Pass Criteria:** Large unsigned value test passes

- [x] T042 Run all byteOrderUtils tests
  - **Command:** `pnpm test:main tests/unit/main/byteOrderUtils.test.ts`
  - **Pass Criteria:** All tests pass (8+ tests)

- [x] T043 Commit Phase 2
  - **Command:** `git add src/main/protocols/byteOrderUtils.ts tests/unit/main/byteOrderUtils.test.ts`
  - **Commit:** `feat(modbus): add byte order conversion utilities with tests`
  - **Pass Criteria:** Commit successful

---

## Phase 3: Update ModbusTcpAdapter

### Task 3.1: Add Byte Order Support to Adapter

- [x] T044 Write failing test: adapter uses connection default byte order
  - **File:** `tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Test Code:**
    ```typescript
    describe('Byte Order Support', () => {
      it('should use connection default byte order', () => {
        const connection = {
          ...mockConnection,
          config: { ...mockConnection.config, defaultByteOrder: 'DCBA' }
        }
        const adapter = new ModbusTcpAdapter(connection)
        expect(adapter.getDefaultByteOrder()).toBe('DCBA')
      })
    })
    ```
  - **Pass Criteria:** Test fails with "getDefaultByteOrder is not a function"

- [x] T045 Write failing test: adapter defaults to ABCD
  - **File:** `tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Test Code:**
    ```typescript
    it('should default to ABCD when not specified', () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      expect(adapter.getDefaultByteOrder()).toBe('ABCD')
    })
    ```
  - **Pass Criteria:** Test added

- [x] T046 Import byte order utilities in adapter
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Add imports for `convertFloat32`, `convertInt32`, `convertUint32`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Imports resolve

- [x] T047 Add getDefaultByteOrder method
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:**
    ```typescript
    getDefaultByteOrder(): ByteOrder {
      return this.config.defaultByteOrder ?? 'ABCD'
    }
    ```
  - **Test:** `pnpm test:main` - byte order tests pass
  - **Pass Criteria:** Both byte order tests pass

- [x] T048 Update convertValue to use byte order
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Replace hardcoded `toInt32`, `toUint32`, `toFloat32` with imported utilities
  - **Test:** Existing data type conversion tests still pass
  - **Pass Criteria:** All ModbusTcpAdapter tests pass

- [x] T049 Run all ModbusTcpAdapter tests
  - **Command:** `pnpm test:main tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Pass Criteria:** All tests pass

- [ ] T050 ~~Commit Task 3.1~~ (Deferred - see T062)
  - **Note:** Commit deferred to T062 for consolidated Phase 3 commit
  - **Pass Criteria:** Skip to next task

---

### Task 3.2: Add Metrics Tracking to Adapter

- [x] T051 Write failing test: adapter tracks request count
  - **File:** `tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Test Code:**
    ```typescript
    describe('Metrics Tracking', () => {
      it('should track request count', async () => {
        const adapter = new ModbusTcpAdapter(mockConnection)
        await adapter.connect()
        await adapter.readTags([mockTag])
        await adapter.readTags([mockTag])
        expect(adapter.getMetrics().requestCount).toBe(2)
      })
    })
    ```
  - **Pass Criteria:** Test fails with "getMetrics is not a function"

- [x] T052 Write failing test: adapter tracks latency
  - **File:** `tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Test Code:**
    ```typescript
    it('should track latency', async () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      await adapter.connect()
      await adapter.readTags([mockTag])
      expect(adapter.getMetrics().latencyMs).toBeGreaterThanOrEqual(0)
    })
    ```
  - **Pass Criteria:** Test added

- [x] T053 Write failing test: adapter emits metrics-updated event
  - **File:** `tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Test Code:**
    ```typescript
    it('should emit metrics-updated event', async () => {
      const adapter = new ModbusTcpAdapter(mockConnection)
      const handler = jest.fn()
      adapter.on('metrics-updated', handler)
      await adapter.connect()
      await adapter.readTags([mockTag])
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ requestCount: 1 }))
    })
    ```
  - **Pass Criteria:** Test added

- [x] T054 Import ConnectionMetrics types
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Add `import type { ConnectionMetrics } from '@shared/types'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Import resolves

- [x] T055 Add metrics state to adapter
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:**
    ```typescript
    private metrics: ConnectionMetrics = { ...INITIAL_METRICS }
    private latencyHistory: number[] = []
    private readonly LATENCY_HISTORY_SIZE = 10
    ```
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** State compiles

- [x] T056 Implement getMetrics method
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:**
    ```typescript
    getMetrics(): ConnectionMetrics {
      return { ...this.metrics }
    }
    ```
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Method compiles

- [x] T057 Implement updateMetrics private method
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Method that updates all metrics fields and emits 'metrics-updated'
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Method compiles

- [x] T058 Call updateMetrics in readTags
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Add timing with `performance.now()`, call updateMetrics at end of readTags
  - **Test:** `pnpm test:main` - metrics tests pass
  - **Pass Criteria:** All metrics tests pass

- [x] T059 Implement resetMetrics method
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Reset metrics to INITIAL_METRICS, clear latencyHistory
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Method compiles

- [x] T060 Call resetMetrics in connect
  - **File:** `src/main/protocols/ModbusTcpAdapter.ts`
  - **Content:** Reset metrics when connection is established
  - **Test:** `pnpm test:main` passes
  - **Pass Criteria:** Metrics reset on new connection

- [x] T061 Run all adapter tests
  - **Command:** `pnpm test:main tests/unit/main/ModbusTcpAdapter.test.ts`
  - **Pass Criteria:** All tests pass

- [x] T062 Commit Phase 3 (Consolidated)
  - **Command:**
    ```bash
    git add src/main/protocols/ModbusTcpAdapter.ts \
            tests/unit/main/ModbusTcpAdapter.test.ts
    ```
  - **Commit:** `feat(modbus): add configurable byte order and connection metrics to ModbusTcpAdapter`
  - **Pass Criteria:** Commit successful, byte order + metrics in single adapter commit

---

## Phase 4: UI Components

### Task 4.1: Create ByteOrderSelector Component

- [x] T063 Create `src/renderer/components/connection/ByteOrderSelector.tsx`
  - **File:** `src/renderer/components/connection/ByteOrderSelector.tsx`
  - **Content:** Basic React component with props interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Component compiles

- [x] T064 Add select dropdown for byte order
  - **File:** `src/renderer/components/connection/ByteOrderSelector.tsx`
  - **Content:** `<select>` with 4 options (ABCD, DCBA, BADC, CDAB)
  - **Test:** Component renders select element
  - **Pass Criteria:** Select has all 4 options

- [x] T065 Add visual example box showing register layout
  - **File:** `src/renderer/components/connection/ByteOrderSelector.tsx`
  - **Content:** Info box showing FLOAT32 123.456 as example
  - **Test:** Component shows example value
  - **Pass Criteria:** Example updates when byte order changes

- [x] T066 Add vendor list display
  - **File:** `src/renderer/components/connection/ByteOrderSelector.tsx`
  - **Content:** Show common vendors from BYTE_ORDER_INFO
  - **Test:** Siemens S7 shown for ABCD
  - **Pass Criteria:** Vendors display correctly

- [x] T067 Add helper text
  - **File:** `src/renderer/components/connection/ByteOrderSelector.tsx`
  - **Content:** "Not sure? Use Tools → Byte Order Converter..."
  - **Test:** Helper text visible
  - **Pass Criteria:** Text renders

- [x] T068 Export from connection index
  - **File:** `src/renderer/components/connection/index.ts`
  - **Content:** Add `export { ByteOrderSelector } from './ByteOrderSelector'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Can import from `@renderer/components/connection`

---

### Task 4.2: Integrate ByteOrderSelector in NewConnectionDialog

- [x] T069 Write failing test: byte order selector visible in advanced options
  - **File:** `tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **Test Code:**
    ```typescript
    it('should show byte order selector in advanced options for Modbus', async () => {
      render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
      // Use data-testid for stability against i18n/copy changes
      await userEvent.click(screen.getByTestId('advanced-options-toggle'))
      expect(screen.getByTestId('byte-order-selector')).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test fails (byte order selector not found)
  - **Note:** Requires adding `data-testid="advanced-options-toggle"` and `data-testid="byte-order-selector"` to components

- [x] T070 Write failing test: form data includes byte order
  - **File:** `tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **Test Code:**
    ```typescript
    it('should include defaultByteOrder in form data', async () => {
      const onSubmit = vi.fn()
      render(<NewConnectionDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
      await userEvent.type(screen.getByLabelText(/name/i), 'Test')
      await userEvent.type(screen.getByLabelText(/address/i), '192.168.1.100')
      await userEvent.click(screen.getByRole('button', { name: /connect/i }))
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ defaultByteOrder: 'ABCD' })
        })
      )
    })
    ```
  - **Pass Criteria:** Test fails

- [x] T071 Add byteOrder state to NewConnectionDialog
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Content:** `const [byteOrder, setByteOrder] = useState<ByteOrder>('ABCD')`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** State compiles

- [x] T072 Add ByteOrderSelector to advanced options (Modbus only)
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Content:**
    - Render ByteOrderSelector inside advanced options when protocol is modbus-tcp
    - Add `data-testid="advanced-options-toggle"` to the expand/collapse button
    - Add `data-testid="byte-order-selector"` to the ByteOrderSelector wrapper
  - **Test:** Component visible in advanced options
  - **Pass Criteria:** Selector appears for Modbus with required data-testid attributes

- [x] T073 Include byteOrder in buildFormData
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Content:** Add `defaultByteOrder: byteOrder` to Modbus config
  - **Test:** `pnpm test:unit` - form data tests pass
  - **Pass Criteria:** Both tests pass

- [x] T074 Run NewConnectionDialog tests
  - **Command:** `pnpm test:unit tests/unit/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **Pass Criteria:** All tests pass

- [x] T075 Commit Task 4.1-4.2
  - **Command:** `git add src/renderer/components/connection/`
  - **Commit:** `feat(ui): add ByteOrderSelector with visual example to NewConnectionDialog`
  - **Pass Criteria:** Commit successful

---

### Task 4.3: Create ConnectionStatusBar Component

- [x] T076 Create `src/renderer/components/explorer/ConnectionStatusBar.tsx`
  - **File:** `src/renderer/components/explorer/ConnectionStatusBar.tsx`
  - **Content:**
    - Basic React component with ConnectionMetrics prop
    - Add `data-testid="connection-status-bar"` to root element
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Component compiles with required data-testid attribute

- [x] T077 Add latency display with color coding
  - **File:** `src/renderer/components/explorer/ConnectionStatusBar.tsx`
  - **Content:** Clock icon + latencyMs with green/yellow/red color based on thresholds
  - **Test:** `data-testid="latency-display"` present
  - **Pass Criteria:** Latency renders with correct color

- [x] T078 Add average latency display
  - **File:** `src/renderer/components/explorer/ConnectionStatusBar.tsx`
  - **Content:** Activity icon + "Avg: Xms"
  - **Test:** Average latency visible
  - **Pass Criteria:** Average renders

- [x] T079 Add request count display
  - **File:** `src/renderer/components/explorer/ConnectionStatusBar.tsx`
  - **Content:** CheckCircle icon + request count with toLocaleString
  - **Test:** Request count visible
  - **Pass Criteria:** Count renders with comma formatting

- [x] T080 Add error count display (conditional)
  - **File:** `src/renderer/components/explorer/ConnectionStatusBar.tsx`
  - **Content:** AlertTriangle icon + error count + percentage (only if errorCount > 0)
  - **Test:** Error count visible when > 0
  - **Pass Criteria:** Errors render conditionally with correct color

- [x] T081 Export from explorer index
  - **File:** `src/renderer/components/explorer/index.ts`
  - **Content:** Add `export { ConnectionStatusBar } from './ConnectionStatusBar'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Can import from `@renderer/components/explorer`

---

### Task 4.4: Integrate ConnectionStatusBar in DataExplorer

> **Note:** UI tests use `data-testid` attributes for stability against i18n/copy changes. This is a testing best practice for elements that may have their text content localized.

- [x] T082 Write failing test: latency display in DataExplorer
  - **File:** `tests/unit/renderer/components/explorer/DataExplorer.test.tsx`
  - **Test Code:**
    ```typescript
    describe('Connection Metrics Display', () => {
      const mockMetrics: ConnectionMetrics = {
        latencyMs: 12, latencyAvgMs: 15, requestCount: 1234,
        errorCount: 2, errorRate: 0.001, lastSuccessAt: Date.now(),
        reconnectAttempts: 0
      }

      it('should display latency', () => {
        render(<DataExplorer {...defaultProps} metrics={mockMetrics} />)
        // Use data-testid for stability; verify content separately
        const latencyEl = screen.getByTestId('latency-display')
        expect(latencyEl).toBeInTheDocument()
        expect(latencyEl).toHaveTextContent('12')
      })
    })
    ```
  - **Pass Criteria:** Test fails

- [x] T083 Write failing test: warning and alarm colors for latency thresholds
  - **File:** `tests/unit/renderer/components/explorer/DataExplorer.test.tsx`
  - **Test Code:**
    ```typescript
    it('should show warning color when latency exceeds warning threshold', () => {
      const highLatency = { ...mockMetrics, latencyMs: 150 }
      render(<DataExplorer {...defaultProps} metrics={highLatency} />)
      expect(screen.getByTestId('latency-display')).toHaveClass('text-yellow-500')
    })

    it('should show alarm color when latency exceeds alarm threshold', () => {
      const alarmLatency = { ...mockMetrics, latencyMs: 600 }
      render(<DataExplorer {...defaultProps} metrics={alarmLatency} />)
      expect(screen.getByTestId('latency-display')).toHaveClass('text-red-500')
    })

    it('should show normal color when latency is healthy', () => {
      render(<DataExplorer {...defaultProps} metrics={mockMetrics} />)
      expect(screen.getByTestId('latency-display')).toHaveClass('text-green-500')
    })
    ```
  - **Pass Criteria:** Tests fail

- [x] T083a Write failing test: handles undefined/missing metrics gracefully
  - **File:** `tests/unit/renderer/components/explorer/DataExplorer.test.tsx`
  - **Test Code:**
    ```typescript
    it('should not render status bar when metrics is undefined', () => {
      render(<DataExplorer {...defaultProps} metrics={undefined} />)
      expect(screen.queryByTestId('connection-status-bar')).not.toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test fails

- [x] T084 Add metrics prop to DataExplorer
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Content:** Add `metrics?: ConnectionMetrics` to props interface
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Prop compiles

- [x] T085 Render ConnectionStatusBar in DataExplorer
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Content:** Render `<ConnectionStatusBar metrics={metrics} />` when metrics provided
  - **Test:** `pnpm test:unit` - metrics tests pass
  - **Pass Criteria:** Both tests pass

- [x] T086 Run DataExplorer tests
  - **Command:** `pnpm test:unit tests/unit/renderer/components/explorer/DataExplorer.test.tsx`
  - **Pass Criteria:** All tests pass

- [x] T087 Commit Task 4.3-4.4
  - **Command:** `git add src/renderer/components/explorer/`
  - **Commit:** `feat(ui): add ConnectionStatusBar with latency and error metrics`
  - **Pass Criteria:** Commit successful

---

## Phase 5: IPC Integration

### Task 5.1: Add Metrics IPC Channels

- [x] T088 Add CONNECTION_METRICS channel constant
  - **File:** `src/shared/constants/ipc-channels.ts`
  - **Content:** Add `CONNECTION_METRICS: 'connection:metrics'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Constant defined

- [x] T089 Add CONNECTION_METRICS_CHANGED channel constant
  - **File:** `src/shared/constants/ipc-channels.ts`
  - **Content:** Add `CONNECTION_METRICS_CHANGED: 'connection:metrics-changed'`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Constant defined

- [x] T090 Add getConnectionMetrics to ConnectionManager
  - **File:** `src/main/services/ConnectionManager.ts`
  - **Content:** Method to get metrics from adapter by connectionId
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Method compiles

- [x] T091 Add IPC handler for connection:metrics
  - **File:** `src/main/ipc/connection.ts`
  - **Content:** Handle CONNECTION_METRICS channel, return metrics
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Handler compiles

- [x] T092 Add metrics push on metrics-updated event
  - **File:** `src/main/services/ConnectionManager.ts`
  - **Content:** Listen for adapter 'metrics-updated', push to renderer via IPC
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Event wired up

- [ ] T093 ~~Commit Task 5.1~~ (Deferred - see T102)
  - **Note:** Commit deferred to T102 for consolidated Phase 5 commit
  - **Pass Criteria:** Skip to next task

---

### Task 5.2: Expose Metrics in Preload

- [x] T094 Add getMetrics to preload connection API
  - **File:** `src/preload/index.ts`
  - **Content:** `getMetrics: (id) => ipcRenderer.invoke(CHANNELS.CONNECTION_METRICS, id)`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Method exposed

- [x] T095 Add onMetricsChanged to preload connection API
  - **File:** `src/preload/index.ts`
  - **Content:** Subscribe to CONNECTION_METRICS_CHANGED, return unsubscribe
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Subscription exposed

- [x] T096 Update preload types declaration
  - **File:** `src/preload/index.d.ts` or equivalent
  - **Content:** Add types for getMetrics and onMetricsChanged
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Types available in renderer

- [ ] T097 ~~Commit Task 5.2~~ (Deferred - see T102)
  - **Note:** Commit deferred to T102 for consolidated Phase 5 commit
  - **Pass Criteria:** Skip to next task

---

### Task 5.3: Integrate Metrics in Renderer Store

- [x] T098 Add metrics Map to connectionStore
  - **File:** `src/renderer/stores/connectionStore.ts`
  - **Content:** `metrics: Map<string, ConnectionMetrics>`
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** State compiles

- [x] T099 Add setMetrics action
  - **File:** `src/renderer/stores/connectionStore.ts`
  - **Content:** Action to update metrics for a connectionId
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Action compiles

- [x] T100 Subscribe to metrics changes in App.tsx
  - **File:** `src/renderer/App.tsx`
  - **Content:** Call `onMetricsChanged` in useEffect, update store
  - **Test:** `pnpm typecheck` passes
  - **Pass Criteria:** Subscription wired

- [x] T101 Pass metrics to DataExplorer in App.tsx
  - **File:** `src/renderer/App.tsx`
  - **Content:** Get metrics from store, pass to DataExplorer
  - **Test:** `pnpm dev` - app runs
  - **Pass Criteria:** No runtime errors

- [x] T102 Commit Phase 5 (Consolidated)
  - **Command:**
    ```bash
    git add src/shared/constants/ipc-channels.ts \
            src/main/services/ConnectionManager.ts \
            src/main/ipc/connection.ts \
            src/preload/index.ts \
            src/preload/index.d.ts \
            src/renderer/stores/connectionStore.ts \
            src/renderer/App.tsx
    ```
  - **Commit:** `feat(ipc): add metrics IPC channels, preload API, and renderer integration`
  - **Pass Criteria:** Commit successful, full IPC pipeline in single commit

---

## Phase 6: Final Verification

### Task 6.1: Integration Testing

- [x] T103 Run all main process tests
  - **Command:** `pnpm test:main`
  - **Pass Criteria:** All tests pass

- [x] T104 Run all renderer tests
  - **Command:** `pnpm test:unit`
  - **Pass Criteria:** All tests pass

- [x] T105 Run TypeScript check
  - **Command:** `pnpm typecheck`
  - **Pass Criteria:** No errors

- [x] T106 Run ESLint
  - **Command:** `pnpm lint`
  - **Pass Criteria:** No errors (warnings OK)
  - **Note:** ESLint config not set up in project (pre-existing issue)

- [ ] T107 Start dev server and verify UI
  - **Command:** `pnpm dev`
  - **Manual Test:**
    1. Open New Connection dialog
    2. Select Modbus TCP
    3. Expand Advanced Options
    4. Verify Byte Order selector visible with visual example
    5. Verify vendor info displays
  - **Pass Criteria:** All UI elements render correctly
  - **Note:** Requires manual verification

- [x] T108 Final commit
  - **Command:** Check for any uncommitted changes, commit if needed
  - **Pass Criteria:** Working directory clean

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T001-T026 | Type definitions (ByteOrder, BatchReadConfig, ConnectionMetrics) |
| 2 | T027-T043 | Byte order conversion utilities + edge case tests (T035a-d) |
| 3 | T044-T062 | ModbusTcpAdapter updates (byte order, metrics) |
| 4 | T063-T087 | UI components (ByteOrderSelector, ConnectionStatusBar) + edge case test (T083a) |
| 5 | T088-T102 | IPC integration (channels, preload, store) |
| 6 | T103-T108 | Final verification |

**Total: 113 tasks** (108 original + 5 edge case tests)

### Commit Strategy (Consolidated)

| Commit | Scope | Tasks |
|--------|-------|-------|
| 1 | `feat(types)` | Phase 1 complete (T026) |
| 2 | `feat(modbus)` | Phase 2 byte order utils (T043) |
| 3 | `feat(modbus)` | Phase 3 adapter updates (T062) |
| 4 | `feat(ui)` | Phase 4 UI components (T075, T087) |
| 5 | `feat(ipc)` | Phase 5 IPC integration (T102) |

**Total: 7 commits** (reduced from 12 for cleaner history)

---

## Follow-up Plans (Future)

After this plan is complete, create:
1. `2026-01-26-modbus-batch-read-tasks.md` - Batch read optimization
2. `2026-01-26-modbus-diagnostics-tasks.md` - Raw frame diagnostics panel
3. `2026-01-26-modbus-tag-editor-tasks.md` - Tag-level byte order/unit ID UI
