# Implementation Plan: IIoT Protocol Studio

**Branch**: `002-iiot-protocol-studio` | **Date**: 2025-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-iiot-protocol-studio/spec.md`

## Summary

Build a cross-platform Electron desktop application for IIoT protocol testing and monitoring. The application supports Modbus TCP, MQTT, and OPC UA protocols with real-time data visualization (Super Grid + Sparklines), Data DVR time-travel capability using a circular buffer, connection profile management, and session export. Primary focus on delivering a smooth, "silky" user experience for industrial automation engineers.

**Technical Approach**: Electron 40 with React 19 frontend, Zustand for cross-process state sync, protocol libraries in Main process, SQLite-backed ring buffer for DVR, and uPlot for high-performance sparklines.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS
**Runtime**: Electron 40
**Frontend**: React 19, Vite 6, Tailwind CSS, Shadcn/ui
**State Management**: Zustand with electron-store for persistence, cross-process sync via IPC
**Primary Dependencies**:
  - Protocol clients: modbus-serial 8.0.23, mqtt.js 5.14.1, node-opcua 2.160.0
  - Charts: uPlot (sparklines - lightweight, 60fps capable), ECharts (reports)
  - Logging: electron-log (file rotation built-in)
  - Secure storage: keytar (OS credential store)
**Storage**: better-sqlite3 (ring buffer for DVR), YAML (config files), JSON (profiles)
**Testing**: Vitest (renderer unit), Jest (main process unit), Playwright (E2E)
**Target Platform**: Windows 10+, macOS 11+, Ubuntu 20.04+
**Project Type**: Electron (Main + Renderer processes)
**Performance Goals**:
  - Cold start < 3s
  - 100 Tags @ 500ms polling, 1hr stable (heap growth < 50MB/hr)
  - DVR scrub response < 100ms
  - UI update >= 10 FPS
**Constraints**:
  - Profile load < 2s (50 Tags)
  - CSV export 10k rows < 5s
  - Min resolution 1280×720
**Scale/Scope**: Up to 10 simultaneous connections, 100+ Tags, 5min DVR buffer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I.1 Spec-Driven Development | ✅ PASS | spec.md complete with 7 user stories, 30 FRs |
| I.2 Single Source of Truth | ✅ PASS | Zustand store as SSOT, ConnectionManager pattern |
| I.3 Abstract Interfaces | ✅ PASS | ProtocolAdapter interface for Modbus/MQTT/OPC UA |
| I.4 Minimum Viable Complexity | ✅ PASS | Standard Electron architecture, no microservices |
| II.1 Separate Data Types | ✅ PASS | Real-time (memory) / Config (YAML) / History (SQLite) |
| II.2 Clear Update Flows | ✅ PASS | IPC channels defined, centralized managers |
| III.1 Built-In Quality | ✅ PASS | Vitest/Jest/Playwright in test plan |
| III.3 Risky Ops Confirmation | ✅ PASS | Close prompt, delete confirmations specified |
| IV.4 Keep a Changelog | ✅ PASS | Will update docs/CHANGELOG.md |
| VI.2 IP & Confidentiality | ✅ PASS | keytar for credentials, no plaintext secrets |

**Gate Result**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/002-iiot-protocol-studio/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity schemas
├── quickstart.md        # Phase 1: Dev environment setup
├── contracts/           # Phase 1: IPC channel definitions
│   ├── ipc-channels.md  # Channel names and payloads
│   └── types.ts         # Shared TypeScript types
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
src/
├── main/                    # Electron Main Process
│   ├── index.ts             # App entry, window management
│   ├── ipc/                 # IPC handlers
│   │   ├── connection.ts    # Connection lifecycle handlers
│   │   ├── polling.ts       # Tag polling handlers
│   │   ├── profile.ts       # Profile CRUD handlers
│   │   └── export.ts        # CSV/HTML export handlers
│   ├── services/            # Business logic (Main process)
│   │   ├── ConnectionManager.ts
│   │   ├── PollingEngine.ts
│   │   ├── DataBuffer.ts    # SQLite ring buffer
│   │   ├── ProfileService.ts
│   │   ├── ExportService.ts
│   │   ├── LogService.ts
│   │   └── VirtualServer.ts
│   ├── protocols/           # Protocol adapters
│   │   ├── ProtocolAdapter.ts   # Abstract interface
│   │   ├── ModbusTcpAdapter.ts
│   │   ├── MqttAdapter.ts
│   │   └── OpcUaAdapter.ts
│   └── db/
│       └── schema.sql       # SQLite ring buffer schema
│
├── renderer/                # Electron Renderer Process (React)
│   ├── index.html
│   ├── main.tsx             # React entry
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/          # Shell, Sidebar, Header
│   │   ├── connection/      # ConnectionCard, ConnectionForm
│   │   ├── tags/            # TagGrid, TagEditor, Sparkline
│   │   ├── dvr/             # TimelineSlider, PlaybackControls
│   │   ├── profile/         # ProfileList, ProfileDialog
│   │   ├── export/          # ExportDialog, ReportPreview
│   │   ├── virtual-server/  # VirtualServerPanel
│   │   └── common/          # Shared UI components
│   ├── stores/              # Zustand stores
│   │   ├── connectionStore.ts
│   │   ├── tagStore.ts
│   │   ├── dvrStore.ts
│   │   └── uiStore.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useConnection.ts
│   │   ├── usePolling.ts
│   │   └── useDvr.ts
│   └── lib/
│       ├── ipc.ts           # Type-safe IPC invoke wrappers
│       └── utils.ts
│
├── preload/
│   └── index.ts             # Context bridge API
│
└── shared/                  # Shared between Main & Renderer
    ├── types/
    │   ├── connection.ts
    │   ├── tag.ts
    │   ├── datapoint.ts
    │   └── profile.ts
    └── constants/
        └── ipc-channels.ts

tests/
├── unit/
│   ├── main/                # Jest tests for Main process
│   └── renderer/            # Vitest tests for Renderer
├── integration/
│   └── ipc/                 # IPC round-trip tests
└── e2e/                     # Playwright E2E tests
```

**Structure Decision**: Electron architecture with clear Main/Renderer separation. Main process handles all protocol I/O, file system, and SQLite. Renderer is pure React UI. Shared types ensure type safety across IPC boundary.

## Complexity Tracking

> No violations requiring justification. Architecture follows standard Electron patterns.

| Decision | Rationale | Simpler Alternative Considered |
|----------|-----------|-------------------------------|
| SQLite for DVR buffer | Handles 100 Tags × 500ms × 5min = 60k rows efficiently; survives app restart | In-memory array (loses data on crash, memory pressure) |
| Zustand over Redux | Minimal boilerplate, built-in persistence, simpler cross-process sync | Redux (more boilerplate for this scale) |
| uPlot over Chart.js | 10x faster rendering for real-time sparklines (60fps capable) | Chart.js (struggles with rapid updates) |

## Implementation Phases

### Phase 1: Project Scaffolding

**Goal**: Bootable Electron app with Vite HMR working.

| Step | Action | Reference |
|------|--------|-----------|
| 1.1 | Initialize Electron + Vite project with electron-vite | [quickstart.md](./quickstart.md) |
| 1.2 | Configure TypeScript with path aliases (`@shared/*`, `@main/*`, `@renderer/*`) | [quickstart.md § IDE Setup](./quickstart.md#ide-setup) |
| 1.3 | Set up Tailwind CSS + Shadcn/ui | [research.md § 1. Electron 40 + React 19](./research.md#1-electron-40--react-19--vite-6) |
| 1.4 | Create directory structure per Project Structure section | [plan.md § Project Structure](#project-structure) |
| 1.5 | Set up preload script with contextBridge skeleton | [contracts/ipc-channels.md § Channel Naming](./contracts/ipc-channels.md#channel-naming-convention) |
| 1.6 | Configure electron-log for Main process | [research.md § 7. Logging](./research.md#7-logging-electron-log) |
| 1.7 | Add Jest (main) + Vitest (renderer) + Playwright configs | [research.md § 8. Testing Strategy](./research.md#8-testing-strategy) |

**Checkpoint**: `npm run dev` opens window, HMR works, tests pass.

---

### Phase 2: Shared Types & IPC Foundation

**Goal**: Type-safe IPC layer with channel constants.

| Step | Action | Reference |
|------|--------|-----------|
| 2.1 | Create `src/shared/types/` from contracts | [contracts/types.ts](./contracts/types.ts) - copy as starting point |
| 2.2 | Create `src/shared/constants/ipc-channels.ts` | [contracts/ipc-channels.md § Channel Naming](./contracts/ipc-channels.md#channel-naming-convention) |
| 2.3 | Implement type-safe IPC invoke wrapper in `src/renderer/lib/ipc.ts` | [research.md § 3. Zustand Cross-Process Sync](./research.md#3-state-management-zustand) |
| 2.4 | Set up preload contextBridge with typed API | [contracts/ipc-channels.md](./contracts/ipc-channels.md) - expose all channel groups |

**Checkpoint**: Can invoke empty IPC handler from Renderer, TypeScript validates payloads.

---

### Phase 3: Data Layer (SQLite + Credential Store)

**Goal**: Persistent storage for DVR buffer and secure credentials.

| Step | Action | Reference |
|------|--------|-----------|
| 3.1 | Install and configure better-sqlite3 | [research.md § 5. SQLite Ring Buffer](./research.md#5-sqlite-ring-buffer-dvr) |
| 3.2 | Create `src/main/db/schema.sql` | [data-model.md § SQLite Schema](./data-model.md#sqlite-schema) |
| 3.3 | Implement `DataBuffer` service with ring buffer eviction | [data-model.md § DataPoint](./data-model.md#datapoint) - storage/retention rules |
| 3.4 | Install and configure keytar | [research.md § 6. Secure Credential Storage](./research.md#6-secure-credential-storage-keytar) |
| 3.5 | Implement credential helpers in ProfileService | [research.md § keytar Integration Pattern](./research.md#6-secure-credential-storage-keytar) |

**Checkpoint**: Can insert 1000 DataPoints, query by tag_id, oldest rows auto-evict.

---

### Phase 4: Protocol Adapters (Modbus First)

**Goal**: Abstract protocol interface + working Modbus TCP adapter.

| Step | Action | Reference |
|------|--------|-----------|
| 4.1 | Define `ProtocolAdapter` abstract interface | [data-model.md § Connection State Transitions](./data-model.md#connection) |
| 4.2 | Implement `ModbusTcpAdapter` | [research.md § 2. Protocol Libraries](./research.md#2-protocol-libraries) |
| 4.3 | Implement address parsing for Modbus registers | [data-model.md § ModbusAddress](./data-model.md#tag) |
| 4.4 | Implement data type conversion (INT16, UINT16, FLOAT32, etc.) | [data-model.md § DataType](./data-model.md#tag) |
| 4.5 | Add unit tests for ModbusTcpAdapter | [research.md § Test Organization](./research.md#8-testing-strategy) |

**Checkpoint**: Can connect to Modbus simulator, read holding registers, convert to correct data types.

---

### Phase 5: Connection Management

**Goal**: ConnectionManager service with IPC handlers.

| Step | Action | Reference |
|------|--------|-----------|
| 5.1 | Implement `ConnectionManager` singleton | [data-model.md § Connection](./data-model.md#connection) - all attributes |
| 5.2 | Implement state machine (disconnected→connecting→connected→error) | [data-model.md § Connection State Transitions](./data-model.md#connection) |
| 5.3 | Implement IPC handlers: `connection:create`, `connection:connect`, `connection:disconnect` | [contracts/ipc-channels.md § Connection Channels](./contracts/ipc-channels.md#connection-channels) |
| 5.4 | Implement `connection:read-once` for quick test | [contracts/ipc-channels.md § connection:read-once](./contracts/ipc-channels.md#connectionread-once) |
| 5.5 | Push `connection:status-changed` events to Renderer | [contracts/ipc-channels.md § Push Channels](./contracts/ipc-channels.md#push-channels-main--renderer) |

**Checkpoint**: US1 (Quick Connection Test) functional via IPC.

---

### Phase 6: Tag Management

**Goal**: Tag CRUD with validation.

| Step | Action | Reference |
|------|--------|-----------|
| 6.1 | Implement Tag storage in ConnectionManager | [data-model.md § Tag](./data-model.md#tag) - all attributes |
| 6.2 | Implement validation rules | [data-model.md § Tag Validation Rules](./data-model.md#tag) |
| 6.3 | Implement IPC handlers: `tag:create`, `tag:update`, `tag:delete`, `tag:list` | [contracts/ipc-channels.md § Tag Channels](./contracts/ipc-channels.md#tag-channels) |
| 6.4 | Implement `tag:import-csv` with CSV parsing | [contracts/ipc-channels.md § tag:import-csv](./contracts/ipc-channels.md#tagimport-csv) - CSV format |

**Checkpoint**: Can create tags via IPC, validation errors surface correctly.

---

### Phase 7: Polling Engine

**Goal**: Continuous polling with data buffer integration.

| Step | Action | Reference |
|------|--------|-----------|
| 7.1 | Implement `PollingEngine` with interval timer | [spec.md FR-010](./spec.md) - 100ms-60000ms intervals |
| 7.2 | Integrate with ProtocolAdapter.read() | [data-model.md § DataPoint](./data-model.md#datapoint) |
| 7.3 | Write DataPoints to DataBuffer on each poll | [data-model.md § DataPoint](./data-model.md#datapoint) |
| 7.4 | Implement IPC handlers: `polling:start`, `polling:stop`, `polling:status` | [contracts/ipc-channels.md § Polling Channels](./contracts/ipc-channels.md#polling-channels) |
| 7.5 | Push `polling:data` events to Renderer | [contracts/ipc-channels.md § polling:data](./contracts/ipc-channels.md#pollingdata) |

**Checkpoint**: US2 (Tag-Based Monitoring) data flow working end-to-end.

---

### Phase 8: Renderer - Connection UI

**Goal**: React UI for connection management.

| Step | Action | Reference |
|------|--------|-----------|
| 8.1 | Create `connectionStore` Zustand store | [research.md § 3. Zustand](./research.md#3-state-management-zustand) |
| 8.2 | Implement `useConnection` hook wrapping IPC calls | [contracts/ipc-channels.md § Connection Channels](./contracts/ipc-channels.md#connection-channels) |
| 8.3 | Build `ConnectionForm` component (Modbus TCP config) | [data-model.md § ModbusTcpConfig](./data-model.md#connection) |
| 8.4 | Build `ConnectionCard` with status indicator | [data-model.md § ConnectionStatus](./data-model.md#connection) |
| 8.5 | Build app shell layout (Sidebar, Header) | [plan.md § renderer/components/layout](#source-code-repository-root) |

**Checkpoint**: US1 fully testable via UI.

---

### Phase 9: Renderer - Tag Grid with Sparklines

**Goal**: Real-time data visualization.

| Step | Action | Reference |
|------|--------|-----------|
| 9.1 | Create `tagStore` Zustand store | [data-model.md § TagDisplayState](./data-model.md#derived-state-renderer) |
| 9.2 | Implement `Sparkline` component with uPlot | [research.md § 4. uPlot Implementation Pattern](./research.md#4-data-visualization-uplot--echarts) |
| 9.3 | Build `TagGrid` with virtualization for 100+ tags | [spec.md SC-002](./spec.md) - 100 tags performance |
| 9.4 | Implement threshold-based row highlighting | [data-model.md § Thresholds](./data-model.md#tag), [data-model.md § alarmState](./data-model.md#derived-state-renderer) |
| 9.5 | Listen to `polling:data` push events and update store | [contracts/ipc-channels.md § polling:data](./contracts/ipc-channels.md#pollingdata) |

**Checkpoint**: US2 (Tag-Based Monitoring) fully functional.

---

### Phase 10: DVR (Data Time-Travel)

**Goal**: Historical data playback.

| Step | Action | Reference |
|------|--------|-----------|
| 10.1 | Implement IPC handlers: `dvr:get-range`, `dvr:seek`, `dvr:get-sparkline` | [contracts/ipc-channels.md § DVR Channels](./contracts/ipc-channels.md#dvr-channels) |
| 10.2 | Create `dvrStore` Zustand store | [data-model.md § DvrState](./data-model.md#derived-state-renderer) |
| 10.3 | Build `TimelineSlider` component | [spec.md US3](./spec.md) - DVR time-travel |
| 10.4 | Build `PlaybackControls` (Live/Historical toggle) | [data-model.md § DvrState.isLive](./data-model.md#derived-state-renderer) |
| 10.5 | Integrate DVR seek with TagGrid display | [contracts/ipc-channels.md § dvr:seek response](./contracts/ipc-channels.md#dvrseek) |

**Checkpoint**: US3 (Data DVR Time-Travel) fully functional.

---

### Phase 11: Profile Management

**Goal**: Save/load/export configurations.

| Step | Action | Reference |
|------|--------|-----------|
| 11.1 | Implement `ProfileService` with JSON serialization | [data-model.md § Profile](./data-model.md#profile) |
| 11.2 | Integrate keytar for credential extraction | [research.md § keytar Integration Pattern](./research.md#6-secure-credential-storage-keytar) |
| 11.3 | Implement IPC handlers: `profile:save`, `profile:load`, `profile:list`, `profile:delete` | [contracts/ipc-channels.md § Profile Channels](./contracts/ipc-channels.md#profile-channels) |
| 11.4 | Implement `profile:import`, `profile:export` with file dialogs | [contracts/ipc-channels.md § profile:export](./contracts/ipc-channels.md#profileexport) |
| 11.5 | Build `ProfileList` and `ProfileDialog` components | [plan.md § renderer/components/profile](#source-code-repository-root) |

**Checkpoint**: US4 (Profile Management) fully functional.

---

### Phase 12: Export & Reporting

**Goal**: CSV export and HTML reports.

| Step | Action | Reference |
|------|--------|-----------|
| 12.1 | Implement `ExportService` with CSV writer | [contracts/ipc-channels.md § export:csv](./contracts/ipc-channels.md#exportcsv) |
| 12.2 | Implement HTML report generator with ECharts | [research.md § 4. ECharts for reports](./research.md#4-data-visualization-uplot--echarts) |
| 12.3 | Implement IPC handlers: `export:csv`, `export:html-report` | [contracts/ipc-channels.md § Export Channels](./contracts/ipc-channels.md#export-channels) |
| 12.4 | Build `ExportDialog` component | [plan.md § renderer/components/export](#source-code-repository-root) |

**Checkpoint**: US7 (Session Export & Report) fully functional.

---

### Phase 13: Virtual Server (P2)

**Goal**: Built-in Modbus simulator.

| Step | Action | Reference |
|------|--------|-----------|
| 13.1 | Implement `VirtualServer` service | [data-model.md § VirtualServer](./data-model.md#virtualserver) |
| 13.2 | Implement waveform generators | [data-model.md § Waveform Value Generation](./data-model.md#waveform) |
| 13.3 | Implement IPC handlers: `virtual-server:start`, `virtual-server:stop`, `virtual-server:status` | [contracts/ipc-channels.md § Virtual Server Channels](./contracts/ipc-channels.md#virtual-server-channels) |
| 13.4 | Build `VirtualServerPanel` component | [plan.md § renderer/components/virtual-server](#source-code-repository-root) |

**Checkpoint**: US5 (Virtual Server) fully functional.

---

### Phase 14: Multi-Protocol (P2)

**Goal**: Add MQTT adapter.

| Step | Action | Reference |
|------|--------|-----------|
| 14.1 | Implement `MqttAdapter` | [research.md § 2. mqtt.js](./research.md#2-protocol-libraries), [data-model.md § MqttConfig](./data-model.md#connection) |
| 14.2 | Implement MQTT address handling (topic, jsonPath) | [data-model.md § MqttAddress](./data-model.md#tag) |
| 14.3 | Update ConnectionForm for MQTT protocol | [data-model.md § MqttConfig](./data-model.md#connection) |
| 14.4 | Add protocol icon/color differentiation in TagGrid | [spec.md US6](./spec.md) - Multi-Protocol Support |

**Checkpoint**: US6 (Multi-Protocol Support) fully functional.

---

### Phase 15: Polish & Edge Cases

**Goal**: Production readiness.

| Step | Action | Reference |
|------|--------|-----------|
| 15.1 | Implement app close confirmation with save prompt | [spec.md Clarifications](./spec.md#clarifications) - close behavior |
| 15.2 | Implement reconnection with exponential backoff | [spec.md Edge Cases](./spec.md#edge-cases) - network disconnect |
| 15.3 | Add keyboard shortcuts | [spec.md FR-027](./spec.md) |
| 15.4 | Implement Light/Dark theme toggle | [spec.md FR-026](./spec.md), [data-model.md § ProfileSettings.theme](./data-model.md#profile) |
| 15.5 | Add log viewer UI | [contracts/ipc-channels.md § Log Channels](./contracts/ipc-channels.md#log-channels) |
| 15.6 | Run E2E tests with Playwright | [research.md § Test Organization](./research.md#8-testing-strategy) |

**Checkpoint**: All user stories pass E2E tests.

---

## Service → Data Model → IPC Mapping

| Service | Data Model Entities | IPC Channels |
|---------|---------------------|--------------|
| `ConnectionManager` | Connection, ModbusTcpConfig, MqttConfig | `connection:*` |
| `PollingEngine` | Tag, DataPoint, DataQuality | `polling:*` |
| `DataBuffer` | DataPoint (SQLite) | `dvr:*` |
| `ProfileService` | Profile, ProfileSettings | `profile:*` |
| `ExportService` | DataPoint (read), Tag | `export:*` |
| `VirtualServer` | VirtualServer, VirtualRegister, Waveform | `virtual-server:*` |
| `LogService` | LogEntry | `log:*` |

## User Story → Phase Mapping

| User Story | Primary Phase | Depends On |
|------------|---------------|------------|
| US1 Quick Connection | Phase 5, 8 | Phases 1-4 |
| US2 Tag Monitoring | Phase 6, 7, 9 | US1 |
| US3 Data DVR | Phase 10 | US2 |
| US4 Profile Management | Phase 11 | US1 |
| US5 Virtual Server | Phase 13 | Phase 4 |
| US6 Multi-Protocol | Phase 14 | US2 |
| US7 Export & Report | Phase 12 | US2 |

## Next Steps

1. Run `/speckit.tasks` to generate granular task breakdown from these phases
2. Each task will reference specific steps above with their document links
3. Implementation proceeds phase-by-phase with checkpoints
