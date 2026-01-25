# Implementation Plan: Phase 2 Professional Features with Full OPC UA

**Branch**: `003-pro-features-opcua` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-pro-features-opcua/spec.md`

## Summary

Extend Connex Studio with professional workflow features (Protocol Bridge, Collections/Environment system, Dashboard widgets, Alert & Notification, Protocol Calculator, Configuration Export/Import) and comprehensive OPC UA protocol support (subscriptions, browsing, events, methods, historical access, discovery, certificate management).

**Technical Approach**: Build on existing 002-iiot-protocol-studio architecture. Extend Main process services for Bridge forwarding, environment variable substitution, dashboard persistence, and alert engine. Implement full OPC UA adapter using node-opcua library. Add new UI components for dashboard builder, alert manager, and OPC UA browser.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS
**Runtime**: Electron 40
**Frontend**: React 19, Vite 6, Tailwind CSS, Shadcn/ui
**State Management**: Zustand with electron-store for persistence, cross-process sync via IPC
**Primary Dependencies**:
  - Protocol clients: modbus-serial 8.0.23, mqtt.js 5.14.1, node-opcua 2.160.0
  - Charts: uPlot (sparklines), ECharts (reports, dashboard charts)
  - Dashboard: react-grid-layout (drag-and-drop widget positioning)
  - YAML: js-yaml (config export/import)
  - Sound: howler.js or native Audio API (alert sounds)
**Storage**: better-sqlite3 (ring buffer for DVR, alert history), YAML (config export), JSON (profiles, dashboards)
**Testing**: Vitest (renderer unit), Jest (main process unit), Playwright (E2E)
**Target Platform**: Windows 10+, macOS 11+, Ubuntu 20.04+
**Project Type**: Electron (Main + Renderer processes)
**Performance Goals**:
  - Bridge forwarding latency < 100ms
  - Environment switching < 1 second
  - Dashboard widget update >= 10 FPS
  - Alert notification < 500ms
  - OPC UA browse response < 3 seconds for 1000+ nodes
  - OPC UA subscription update < 200ms
**Constraints**:
  - 10 concurrent Bridge mappings
  - 10,000+ alert history entries with sub-second query
  - YAML export deterministic for Git diffs
  - OPC UA certificate stored securely
**Scale/Scope**: Up to 20 simultaneous connections (Modbus + MQTT + OPC UA), 200+ Tags, multiple Dashboards

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I.1 Spec-Driven Development | ✅ PASS | spec.md complete with 16 user stories, 90 FRs |
| I.2 Single Source of Truth | ✅ PASS | Extend Zustand stores, add EnvironmentManager for variable substitution |
| I.3 Abstract Interfaces | ✅ PASS | Extend ProtocolAdapter for OPC UA; DashboardWidget interface for extensible widgets |
| I.4 Minimum Viable Complexity | ✅ PASS | Reuse existing architecture; avoid over-engineering (Virtual Server deferred) |
| II.1 Separate Data Types | ✅ PASS | Bridge config (YAML) / Alert history (SQLite) / Real-time (memory) |
| II.2 Clear Update Flows | ✅ PASS | IPC channels defined for new features |
| III.1 Built-In Quality | ✅ PASS | Extend test suite for new features |
| III.3 Risky Ops Confirmation | ✅ PASS | OPC UA write confirmation dialog specified |
| IV.4 Keep a Changelog | ✅ PASS | Will update docs/CHANGELOG.md |
| VI.2 IP & Confidentiality | ✅ PASS | OPC UA credentials encrypted, certificate store secured |

**Gate Result**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-pro-features-opcua/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity schemas
├── quickstart.md        # Phase 1: Dev environment setup
├── contracts/           # Phase 1: IPC channel definitions
│   ├── ipc-channels.md  # Channel names and payloads
│   └── types.ts         # Shared TypeScript types
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (extends 002-iiot-protocol-studio)

```text
src/
├── main/
│   ├── protocols/
│   │   └── OpcUaAdapter.ts          # NEW: Full OPC UA client implementation
│   ├── services/
│   │   ├── BridgeManager.ts         # NEW: Protocol bridging service
│   │   ├── EnvironmentManager.ts    # NEW: Variable substitution engine
│   │   ├── CollectionRunner.ts      # NEW: Collection execution engine
│   │   ├── DashboardService.ts      # NEW: Dashboard persistence
│   │   ├── AlertEngine.ts           # NEW: Alert rule evaluation
│   │   ├── AlertHistoryStore.ts     # NEW: SQLite-backed alert history
│   │   └── OpcUaCertificateStore.ts # NEW: X.509 certificate management
│   ├── ipc/
│   │   ├── bridge.ts                # NEW: Bridge IPC handlers
│   │   ├── environment.ts           # NEW: Environment IPC handlers
│   │   ├── collection.ts            # NEW: Collection IPC handlers
│   │   ├── dashboard.ts             # NEW: Dashboard IPC handlers
│   │   ├── alert.ts                 # NEW: Alert IPC handlers
│   │   ├── calculator.ts            # NEW: Protocol calculator handlers
│   │   ├── workspace.ts             # NEW: Config export/import handlers
│   │   └── opcua.ts                 # NEW: OPC UA specific handlers
│   └── db/
│       └── alert-schema.sql         # NEW: Alert history SQLite schema
│
├── renderer/
│   ├── components/
│   │   ├── bridge/                  # NEW: Bridge UI components
│   │   │   ├── BridgeMapper.tsx     # Drag-and-drop mapping
│   │   │   ├── BridgeStatus.tsx     # Forwarding status
│   │   │   └── PayloadEditor.tsx    # Template editor
│   │   ├── environment/             # NEW: Environment UI
│   │   │   ├── EnvironmentSwitcher.tsx
│   │   │   ├── EnvironmentEditor.tsx
│   │   │   └── VariableList.tsx
│   │   ├── collection/              # NEW: Collection UI
│   │   │   ├── CollectionList.tsx
│   │   │   ├── CollectionRunner.tsx
│   │   │   └── AssertionEditor.tsx
│   │   ├── dashboard/               # NEW: Dashboard builder
│   │   │   ├── DashboardCanvas.tsx  # Grid layout container
│   │   │   ├── WidgetPalette.tsx    # Widget selection panel
│   │   │   ├── widgets/
│   │   │   │   ├── GaugeWidget.tsx
│   │   │   │   ├── LEDWidget.tsx
│   │   │   │   ├── NumberCardWidget.tsx
│   │   │   │   └── ChartWidget.tsx  # Integrates DVR Chart
│   │   │   └── WidgetConfig.tsx     # Widget property editor
│   │   ├── alert/                   # NEW: Alert management UI
│   │   │   ├── AlertRuleEditor.tsx
│   │   │   ├── AlertHistory.tsx
│   │   │   └── AlertNotification.tsx
│   │   ├── calculator/              # NEW: Protocol tools
│   │   │   ├── CrcCalculator.tsx
│   │   │   ├── ByteOrderConverter.tsx
│   │   │   ├── FloatDecoder.tsx
│   │   │   └── PacketAnalyzer.tsx
│   │   ├── workspace/               # NEW: Config export/import
│   │   │   ├── ExportWorkspace.tsx
│   │   │   └── ImportPreview.tsx
│   │   └── opcua/                   # NEW: OPC UA specific UI
│   │       ├── OpcUaBrowser.tsx     # Node browser tree
│   │       ├── OpcUaNodeDetails.tsx # Node attributes viewer
│   │       ├── OpcUaMethodCall.tsx  # Method invocation UI
│   │       ├── OpcUaEventViewer.tsx # Event subscription UI
│   │       ├── OpcUaHistoryQuery.tsx# Historical data query
│   │       ├── OpcUaDiscovery.tsx   # Server discovery UI
│   │       └── CertificateManager.tsx
│   ├── stores/
│   │   ├── bridgeStore.ts           # NEW
│   │   ├── environmentStore.ts      # NEW
│   │   ├── collectionStore.ts       # NEW
│   │   ├── dashboardStore.ts        # NEW
│   │   ├── alertStore.ts            # NEW
│   │   └── opcuaStore.ts            # NEW
│   └── hooks/
│       ├── useBridge.ts             # NEW
│       ├── useEnvironment.ts        # NEW
│       ├── useDashboard.ts          # NEW
│       ├── useAlert.ts              # NEW
│       └── useOpcUa.ts              # NEW
│
└── shared/
    └── types/
        ├── bridge.ts                # NEW
        ├── environment.ts           # NEW
        ├── collection.ts            # NEW
        ├── dashboard.ts             # NEW
        ├── alert.ts                 # NEW
        └── opcua.ts                 # NEW (extend existing)

tests/
├── unit/
│   ├── main/
│   │   ├── BridgeManager.test.ts    # NEW
│   │   ├── EnvironmentManager.test.ts# NEW
│   │   ├── AlertEngine.test.ts      # NEW
│   │   └── OpcUaAdapter.test.ts     # NEW
│   └── renderer/
│       ├── dashboard/               # NEW
│       └── opcua/                   # NEW
└── e2e/
    ├── bridge.spec.ts               # NEW
    ├── dashboard.spec.ts            # NEW
    ├── alert.spec.ts                # NEW
    └── opcua.spec.ts                # NEW
```

**Structure Decision**: Extend existing 002 architecture with new services and components. Main process handles all protocol I/O, bridging logic, and alert evaluation. Renderer adds dashboard builder, alert manager, and OPC UA browser UI.

## Complexity Tracking

> No violations requiring justification. Architecture reuses existing patterns.

| Decision | Rationale | Simpler Alternative Considered |
|----------|-----------|-------------------------------|
| SQLite for alert history | Handles 10k+ events with fast query; survives app restart | In-memory array (loses on crash, memory pressure) |
| react-grid-layout for dashboard | Proven library for drag-and-drop grid; handles resize/persist | Custom grid (more dev time, bugs) |
| node-opcua for OPC UA | Most mature Node.js OPC UA library; active maintenance | UA-SDK (less documentation) |
| js-yaml for config export | YAML more human-readable than JSON for Git diffs | JSON only (harder to read/edit manually) |

## Implementation Phases

### Phase 1: Environment & Variable System (P1)

**Goal**: Enable environment switching and variable substitution.

| Step | Action | Reference |
|------|--------|-----------|
| 1.1 | Create `EnvironmentManager` service | [data-model.md § Environment] |
| 1.2 | Implement variable parsing `${VAR_NAME}` and `${VAR_NAME:default}` | [spec.md FR-008, FR-009] |
| 1.3 | Implement environment switching with connection reload | [spec.md FR-010] |
| 1.4 | Create IPC handlers: `environment:*` | [contracts/ipc-channels.md] |
| 1.5 | Build `EnvironmentSwitcher` and `EnvironmentEditor` UI | [spec.md US-002] |

**Checkpoint**: US-002 environment switching functional.

---

### Phase 2: Collection System (P1)

**Goal**: Enable collection creation and execution.

| Step | Action | Reference |
|------|--------|-----------|
| 2.1 | Implement `CollectionRunner` service | [data-model.md § Collection] |
| 2.2 | Implement assertion evaluation | [spec.md FR-012] |
| 2.3 | Implement sequential execution mode | [spec.md FR-013] |
| 2.4 | Create IPC handlers: `collection:*` | [contracts/ipc-channels.md] |
| 2.5 | Build Collection UI components | [spec.md US-002] |

**Checkpoint**: US-002 collection execution functional.

---

### Phase 3: Protocol Bridge (P1)

**Goal**: Enable Modbus-to-MQTT data forwarding.

| Step | Action | Reference |
|------|--------|-----------|
| 3.1 | Implement `BridgeManager` service | [data-model.md § Bridge] |
| 3.2 | Implement Payload Template Engine | [spec.md FR-004] |
| 3.3 | Implement change-only forwarding | [spec.md FR-003] |
| 3.4 | Implement auto-resume on reconnection | [spec.md Edge Cases] |
| 3.5 | Create IPC handlers: `bridge:*` | [contracts/ipc-channels.md] |
| 3.6 | Build `BridgeMapper` drag-and-drop UI | [spec.md US-001] |

**Checkpoint**: US-001 Bridge forwarding functional.

---

### Phase 4: Dashboard System (P1)

**Goal**: Enable custom dashboard creation with widgets.

| Step | Action | Reference |
|------|--------|-----------|
| 4.1 | Implement `DashboardService` for persistence | [data-model.md § Dashboard] |
| 4.2 | Create widget base interface | [data-model.md § DashboardWidget] |
| 4.3 | Implement `GaugeWidget` with threshold colors | [spec.md FR-014] |
| 4.4 | Implement `LEDWidget` | [spec.md FR-015] |
| 4.5 | Implement `NumberCardWidget` | [spec.md FR-016] |
| 4.6 | Integrate existing DVR Chart as `ChartWidget` | [spec.md FR-017] |
| 4.7 | Build `DashboardCanvas` with react-grid-layout | [spec.md FR-018] |
| 4.8 | Implement edit mode vs view mode | [spec.md FR-020] |

**Checkpoint**: US-003 Dashboard with widgets functional.

---

### Phase 5: Alert & Notification (P1)

**Goal**: Enable threshold-based alerts with notifications.

| Step | Action | Reference |
|------|--------|-----------|
| 5.1 | Create `AlertHistoryStore` SQLite schema | [data-model.md § AlertEvent] |
| 5.2 | Implement `AlertEngine` with rule evaluation | [data-model.md § AlertRule] |
| 5.3 | Implement threshold-based alerts | [spec.md FR-021] |
| 5.4 | Implement duration conditions (debounce) | [spec.md FR-024] |
| 5.5 | Implement desktop notification (Electron Notification API) | [spec.md FR-025] |
| 5.6 | Implement sound playback | [spec.md FR-025] |
| 5.7 | Implement alert acknowledgement and muting | [spec.md FR-027] |
| 5.8 | Build Alert UI components | [spec.md US-004] |

**Checkpoint**: US-004 Alert system functional.

---

### Phase 6: OPC UA Connection & Security (P1)

**Goal**: Enable OPC UA server connections with security.

| Step | Action | Reference |
|------|--------|-----------|
| 6.1 | Implement `OpcUaAdapter` extending ProtocolAdapter | [data-model.md § OpcUaConnection] |
| 6.2 | Implement endpoint URL parsing and validation | [spec.md FR-041] |
| 6.3 | Implement security policy selection | [spec.md FR-043, FR-044] |
| 6.4 | Implement session management | [spec.md FR-045, FR-046] |
| 6.5 | Implement authentication methods | [spec.md FR-047, FR-048, FR-049] |
| 6.6 | Integrate with ConnectionManager | [contracts/ipc-channels.md § connection:*] |

**Checkpoint**: US-007 OPC UA connection functional.

---

### Phase 7: OPC UA Node Browsing (P1)

**Goal**: Enable hierarchical address space browsing.

| Step | Action | Reference |
|------|--------|-----------|
| 7.1 | Implement browse service with lazy loading | [spec.md FR-051] |
| 7.2 | Implement continuation point handling | [spec.md FR-054] |
| 7.3 | Implement node attribute reading | [spec.md FR-055] |
| 7.4 | Implement node search by DisplayName | [spec.md FR-056] |
| 7.5 | Implement drag-to-create-Tag | [spec.md US-008 scenario 3] |
| 7.6 | Build `OpcUaBrowser` tree component | [spec.md US-008] |

**Checkpoint**: US-008 Node browsing functional.

---

### Phase 8: OPC UA Read/Write & Subscriptions (P1)

**Goal**: Enable node value operations and subscriptions.

| Step | Action | Reference |
|------|--------|-----------|
| 8.1 | Implement single and batch read | [spec.md FR-058] |
| 8.2 | Implement data type handling | [spec.md FR-059, FR-060] |
| 8.3 | Implement write with type validation | [spec.md FR-062, FR-063] |
| 8.4 | Implement subscription creation | [spec.md FR-065, FR-066] |
| 8.5 | Implement deadband filtering | [spec.md FR-068] |
| 8.6 | Implement subscription transfer on reconnect | [spec.md FR-072] |
| 8.7 | Build node details and write UI | [spec.md US-009, US-010] |

**Checkpoint**: US-009, US-010, US-011 functional.

---

### Phase 9: OPC UA Certificate Management (P2)

**Goal**: Enable X.509 certificate handling.

| Step | Action | Reference |
|------|--------|-----------|
| 9.1 | Implement `OpcUaCertificateStore` service | [data-model.md § OpcUaCertificate] |
| 9.2 | Implement self-signed certificate generation | [spec.md FR-073] |
| 9.3 | Implement certificate import (PEM/DER/PFX) | [spec.md FR-074] |
| 9.4 | Implement trusted certificate store | [spec.md FR-075] |
| 9.5 | Implement certificate trust prompts | [spec.md FR-077] |
| 9.6 | Build `CertificateManager` UI | [spec.md US-012] |

**Checkpoint**: US-012 Certificate management functional.

---

### Phase 10: OPC UA Events & Methods (P2)

**Goal**: Enable event subscriptions and method calls.

| Step | Action | Reference |
|------|--------|-----------|
| 10.1 | Implement event subscription | [spec.md FR-078, FR-079] |
| 10.2 | Implement event notification handling | [spec.md FR-080] |
| 10.3 | Implement Acknowledge/Confirm for alarms | [spec.md FR-081] |
| 10.4 | Implement method browsing | [spec.md FR-082, FR-083] |
| 10.5 | Implement method invocation | [spec.md FR-084] |
| 10.6 | Build `OpcUaEventViewer` and `OpcUaMethodCall` UI | [spec.md US-013, US-014] |

**Checkpoint**: US-013, US-014 functional.

---

### Phase 11: Protocol Calculator (P2)

**Goal**: Enable protocol debugging tools.

| Step | Action | Reference |
|------|--------|-----------|
| 11.1 | Implement Modbus CRC-16 calculator | [spec.md FR-028] |
| 11.2 | Implement Byte Order converter | [spec.md FR-029] |
| 11.3 | Implement IEEE 754 Float decoder | [spec.md FR-030] |
| 11.4 | Implement Modbus address converter | [spec.md FR-031] |
| 11.5 | Implement Packet Analyzer | [spec.md FR-032] |
| 11.6 | Build Calculator UI components | [spec.md US-005] |

**Checkpoint**: US-005 Protocol Calculator functional.

---

### Phase 12: Configuration Export/Import (P2)

**Goal**: Enable YAML workspace export/import.

| Step | Action | Reference |
|------|--------|-----------|
| 12.1 | Define Workspace YAML schema | [data-model.md § Workspace] |
| 12.2 | Implement YAML export with stable sorting | [spec.md FR-039] |
| 12.3 | Implement selective export | [spec.md FR-034] |
| 12.4 | Implement credential exclusion | [spec.md FR-036] |
| 12.5 | Implement import with conflict resolution | [spec.md FR-037] |
| 12.6 | Implement schema validation | [spec.md FR-038] |
| 12.7 | Build `ExportWorkspace` and `ImportPreview` UI | [spec.md US-006] |

**Checkpoint**: US-006 Configuration export/import functional.

---

### Phase 13: OPC UA Historical Access (P3)

**Goal**: Enable historical data queries.

| Step | Action | Reference |
|------|--------|-----------|
| 13.1 | Implement Historizing attribute check | [spec.md FR-085] |
| 13.2 | Implement raw history read | [spec.md FR-086] |
| 13.3 | Implement continuation point handling | [spec.md FR-088] |
| 13.4 | Build `OpcUaHistoryQuery` UI with chart display | [spec.md US-015] |

**Checkpoint**: US-015 Historical access functional.

---

### Phase 14: OPC UA Discovery (P3)

**Goal**: Enable server discovery.

| Step | Action | Reference |
|------|--------|-----------|
| 14.1 | Implement FindServers via LDS | [spec.md FR-089] |
| 14.2 | Implement GetEndpoints | [spec.md FR-090] |
| 14.3 | Build `OpcUaDiscovery` UI | [spec.md US-016] |

**Checkpoint**: US-016 Discovery functional.

---

### Phase 15: Polish & Cross-Cutting Concerns

**Goal**: Production readiness.

| Step | Action | Reference |
|------|--------|-----------|
| 15.1 | Implement connection status alerts | [spec.md FR-023] |
| 15.2 | Implement rate-of-change alerts | [spec.md FR-022] |
| 15.3 | Handle orphaned widget cleanup | [spec.md Edge Cases] |
| 15.4 | Handle environment switch during active connections | [spec.md Edge Cases] |
| 15.5 | Handle OPC UA session timeout and renewal | [spec.md Edge Cases] |
| 15.6 | Run E2E tests with Playwright | [research.md § Testing] |
| 15.7 | Update CHANGELOG.md | [constitution.md IV.4] |

**Checkpoint**: All user stories pass E2E tests.

---

## Service → Data Model → IPC Mapping

| Service | Data Model Entities | IPC Channels |
|---------|---------------------|--------------|
| `EnvironmentManager` | Environment | `environment:*` |
| `CollectionRunner` | Collection, CollectionRequest | `collection:*` |
| `BridgeManager` | Bridge | `bridge:*` |
| `DashboardService` | Dashboard, DashboardWidget | `dashboard:*` |
| `AlertEngine` | AlertRule, AlertEvent | `alert:*` |
| `AlertHistoryStore` | AlertEvent (SQLite) | `alert:history-*` |
| `OpcUaAdapter` | OpcUaConnection, OpcUaNode | `opcua:*`, `connection:*` |
| `OpcUaCertificateStore` | OpcUaCertificate | `opcua:cert-*` |

## User Story → Phase Mapping

| User Story | Primary Phase | Priority | Depends On |
|------------|---------------|----------|------------|
| US-001 Bridge | Phase 3 | P1 | 002 MVP |
| US-002 Environment/Collection | Phase 1, 2 | P1 | 002 MVP |
| US-003 Dashboard | Phase 4 | P1 | 002 MVP |
| US-004 Alerts | Phase 5 | P1 | 002 MVP |
| US-005 Calculator | Phase 11 | P2 | None |
| US-006 Config Export | Phase 12 | P2 | Phases 1-5 |
| US-007 OPC UA Connection | Phase 6 | P1 | 002 MVP |
| US-008 OPC UA Browse | Phase 7 | P1 | Phase 6 |
| US-009 OPC UA Read | Phase 8 | P1 | Phase 7 |
| US-010 OPC UA Write | Phase 8 | P1 | Phase 7 |
| US-011 OPC UA Subscriptions | Phase 8 | P1 | Phase 7 |
| US-012 OPC UA Certificate | Phase 9 | P2 | Phase 6 |
| US-013 OPC UA Events | Phase 10 | P2 | Phase 8 |
| US-014 OPC UA Methods | Phase 10 | P2 | Phase 7 |
| US-015 OPC UA History | Phase 13 | P3 | Phase 7 |
| US-016 OPC UA Discovery | Phase 14 | P3 | Phase 6 |

## Next Steps

1. Run `/speckit.tasks` to generate granular task breakdown from these phases
2. Each task will reference specific steps above with their document links
3. Implementation proceeds phase-by-phase with checkpoints
