# Tasks: Phase 2 Professional Features with Full OPC UA

**Input**: Design documents from `/specs/003-pro-features-opcua/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md
**Generated**: 2026-01-24

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, shared types, and base services structure

- [X] T001 Create shared type definitions for professional features in src/shared/types/bridge.ts
- [X] T002 [P] Create shared type definitions for environment in src/shared/types/environment.ts
- [X] T003 [P] Create shared type definitions for collection in src/shared/types/collection.ts
- [X] T004 [P] Create shared type definitions for dashboard in src/shared/types/dashboard.ts
- [X] T005 [P] Create shared type definitions for alert in src/shared/types/alert.ts
- [X] T006 [P] Extend OPC UA type definitions in src/shared/types/opcua.ts
- [X] T007 Add IPC channel constants for all new features in src/shared/types/ipc.ts
- [X] T008 Install new dependencies: react-grid-layout, js-yaml in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services and infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create EnvironmentManager service skeleton in src/main/services/EnvironmentManager.ts
- [X] T010 [P] Create variable substitution engine in src/main/services/VariableSubstitution.ts
- [X] T011 [P] Create BridgeManager service skeleton in src/main/services/BridgeManager.ts
- [X] T012 [P] Create DashboardService skeleton in src/main/services/DashboardService.ts
- [X] T013 [P] Create AlertEngine service skeleton in src/main/services/AlertEngine.ts
- [X] T014 [P] Create AlertHistoryStore with SQLite schema in src/main/services/AlertHistoryStore.ts
- [X] T015 Create alert SQLite schema in src/main/db/alert-schema.sql
- [X] T016 [P] Create CollectionRunner service skeleton in src/main/services/CollectionRunner.ts
- [X] T017 [P] Create OpcUaAdapter extending ProtocolAdapter in src/main/protocols/OpcUaAdapter.ts
- [X] T018 [P] Create OpcUaCertificateStore service in src/main/services/OpcUaCertificateStore.ts
- [X] T019 Create Zustand stores for renderer: bridgeStore in src/renderer/stores/bridgeStore.ts
- [X] T020 [P] Create environmentStore in src/renderer/stores/environmentStore.ts
- [X] T021 [P] Create collectionStore in src/renderer/stores/collectionStore.ts
- [X] T022 [P] Create dashboardStore in src/renderer/stores/dashboardStore.ts
- [X] T023 [P] Create alertStore in src/renderer/stores/alertStore.ts
- [X] T024 [P] Create opcuaStore in src/renderer/stores/opcuaStore.ts

**Checkpoint**: Foundation ready - all service skeletons and stores in place

---

## Phase 3: User Story 2 - Collections & Environment System (Priority: P1)

**Goal**: Enable environment switching and variable substitution, collection creation and execution

**Independent Test**: Create "Development" and "Production" environments with FACTORY_IP variable, create connection using ${FACTORY_IP}, switch environments and verify connection updates

### Implementation for US2 - Environment

- [X] T025 [US2] Implement EnvironmentManager CRUD operations in src/main/services/EnvironmentManager.ts
- [X] T026 [US2] Implement variable parsing ${VAR_NAME} and ${VAR_NAME:default} in src/main/services/VariableSubstitution.ts
- [X] T027 [US2] Implement environment switching with connection reload in src/main/services/EnvironmentManager.ts
- [X] T028 [US2] Create environment IPC handlers in src/main/ipc/environment.ts
- [X] T029 [US2] Create useEnvironment hook in src/renderer/hooks/useEnvironment.ts
- [X] T030 [P] [US2] Create EnvironmentSwitcher component in src/renderer/components/environment/EnvironmentSwitcher.tsx
- [X] T031 [P] [US2] Create EnvironmentEditor component in src/renderer/components/environment/EnvironmentEditor.tsx
- [X] T032 [P] [US2] Create VariableList component in src/renderer/components/environment/VariableList.tsx

### Implementation for US2 - Collection

- [X] T033 [US2] Implement CollectionRunner sequential execution in src/main/services/CollectionRunner.ts
- [X] T034 [US2] Implement assertion evaluation (equals, contains, range, regex) in src/main/services/CollectionRunner.ts
- [X] T035 [US2] Create collection IPC handlers in src/main/ipc/collection.ts
- [X] T036 [US2] Create useCollection hook in src/renderer/hooks/useCollection.ts
- [X] T037 [P] [US2] Create CollectionList component in src/renderer/components/collection/CollectionList.tsx
- [X] T038 [P] [US2] Create CollectionRunner UI component in src/renderer/components/collection/CollectionRunner.tsx
- [X] T039 [P] [US2] Create AssertionEditor component in src/renderer/components/collection/AssertionEditor.tsx

**Checkpoint**: US-002 Environment switching and Collection execution functional

---

## Phase 4: User Story 1 - The Bridge Protocol Bridging (Priority: P1)

**Goal**: Enable Modbus-to-MQTT data forwarding with drag-and-drop mapping

**Independent Test**: Create Modbus connection with Temperature tag, MQTT connection, drag-and-drop create Bridge, start forwarding, verify MQTT messages received

### Implementation for US1

- [X] T040 [US1] Implement BridgeManager CRUD and state machine in src/main/services/BridgeManager.ts
- [X] T041 [US1] Implement Payload Template Engine with ${tags.name.value} syntax in src/main/services/PayloadTemplateEngine.ts
- [X] T042 [US1] Implement change-only forwarding with threshold in src/main/services/BridgeManager.ts
- [X] T043 [US1] Implement auto-resume on reconnection in src/main/services/BridgeManager.ts
- [X] T044 [US1] Implement local buffering when target unavailable in src/main/services/BridgeManager.ts
- [X] T045 [US1] Create bridge IPC handlers in src/main/ipc/bridge.ts
- [X] T046 [US1] Create useBridge hook in src/renderer/hooks/useBridge.ts
- [X] T047 [P] [US1] Create BridgeMapper drag-and-drop component in src/renderer/components/bridge/BridgeMapper.tsx
- [X] T048 [P] [US1] Create BridgeStatus display component in src/renderer/components/bridge/BridgeStatus.tsx
- [X] T049 [P] [US1] Create PayloadEditor template editor in src/renderer/components/bridge/PayloadEditor.tsx

**Checkpoint**: US-001 Bridge forwarding functional

---

## Phase 5: User Story 3 - Dashboard View with Gauges (Priority: P1)

**Goal**: Enable custom dashboard creation with widgets (Gauge, LED, NumberCard, Chart)

**Independent Test**: Create Dashboard, add Gauge widget bound to temperature tag, set thresholds, verify real-time updates and color changes

### Implementation for US3

- [X] T050 [US3] Implement DashboardService CRUD and persistence in src/main/services/DashboardService.ts
- [X] T051 [US3] Create dashboard IPC handlers in src/main/ipc/dashboard.ts
- [X] T052 [US3] Create useDashboard hook in src/renderer/hooks/useDashboard.ts
- [X] T053 [US3] Create widget base interface and types in src/renderer/components/dashboard/WidgetBase.tsx
- [X] T054 [P] [US3] Create GaugeWidget with ECharts in src/renderer/components/dashboard/widgets/GaugeWidget.tsx
- [X] T055 [P] [US3] Create LEDWidget indicator in src/renderer/components/dashboard/widgets/LEDWidget.tsx
- [X] T056 [P] [US3] Create NumberCardWidget display in src/renderer/components/dashboard/widgets/NumberCardWidget.tsx
- [X] T057 [P] [US3] Create ChartWidget integrating DVR Chart in src/renderer/components/dashboard/widgets/ChartWidget.tsx
- [X] T058 [US3] Create DashboardCanvas with react-grid-layout in src/renderer/components/dashboard/DashboardCanvas.tsx
- [X] T059 [P] [US3] Create WidgetPalette selection panel in src/renderer/components/dashboard/WidgetPalette.tsx
- [X] T060 [P] [US3] Create WidgetConfig property editor in src/renderer/components/dashboard/WidgetConfig.tsx
- [X] T061 [US3] Implement edit mode vs view mode toggle in src/renderer/components/dashboard/DashboardCanvas.tsx

**Checkpoint**: US-003 Dashboard with widgets functional

---

## Phase 6: User Story 4 - Alert & Notification System (Priority: P1)

**Goal**: Enable threshold-based alerts with notifications, history, and acknowledgement

**Independent Test**: Set temperature tag alert > 80 as Warning, simulate value exceeding 80, verify desktop notification, sound, and history log

### Implementation for US4

- [X] T062 [US4] Implement AlertEngine rule evaluation in src/main/services/AlertEngine.ts
- [X] T063 [US4] Implement threshold-based alerts (>, <, =, !=, range) in src/main/services/AlertEngine.ts
- [X] T064 [US4] Implement duration conditions (debounce) in src/main/services/AlertEngine.ts
- [X] T065 [US4] Implement cooldown between alerts in src/main/services/AlertEngine.ts
- [X] T066 [US4] Implement desktop notification using Electron Notification API in src/main/services/AlertEngine.ts
- [X] T067 [US4] Implement sound playback using Web Audio API in src/main/services/AlertSoundPlayer.ts
- [X] T068 [US4] Implement AlertHistoryStore SQLite operations in src/main/services/AlertHistoryStore.ts
- [X] T069 [US4] Implement alert acknowledgement and muting in src/main/services/AlertEngine.ts
- [X] T070 [US4] Create alert IPC handlers in src/main/ipc/alert.ts
- [X] T071 [US4] Create useAlert hook in src/renderer/hooks/useAlert.ts
- [X] T072 [P] [US4] Create AlertRuleEditor component in src/renderer/components/alert/AlertRuleEditor.tsx
- [X] T073 [P] [US4] Create AlertHistory panel component in src/renderer/components/alert/AlertHistory.tsx
- [X] T074 [P] [US4] Create AlertNotification toast component in src/renderer/components/alert/AlertNotification.tsx

**Checkpoint**: US-004 Alert system functional

---

## Phase 7: User Story 7 - OPC UA Connection (Priority: P1)

**Goal**: Enable OPC UA server connections with security modes and authentication

**Independent Test**: Connect to Prosys OPC UA Simulation Server with Basic256Sha256 security, verify session established

### Implementation for US7

- [X] T075 [US7] Implement OpcUaAdapter connection logic in src/main/protocols/OpcUaAdapter.ts
- [X] T076 [US7] Implement endpoint URL parsing and validation in src/main/protocols/OpcUaAdapter.ts
- [X] T077 [US7] Implement security policy selection (None, Basic256Sha256, etc.) in src/main/protocols/OpcUaAdapter.ts
- [X] T078 [US7] Implement session management (create, activate, close) in src/main/protocols/OpcUaAdapter.ts
- [X] T079 [US7] Implement session timeout and renewal in src/main/protocols/OpcUaAdapter.ts
- [X] T080 [US7] Implement authentication methods (anonymous, username, certificate) in src/main/protocols/OpcUaAdapter.ts
- [X] T081 [US7] Implement GetEndpoints discovery in src/main/protocols/OpcUaAdapter.ts
- [X] T082 [US7] Integrate OpcUaAdapter with ConnectionManager in src/main/services/ConnectionManager.ts
- [X] T083 [US7] Create opcua connection IPC handlers in src/main/ipc/opcua.ts
- [X] T084 [US7] Create useOpcUa hook in src/renderer/hooks/useOpcUa.ts
- [X] T085 [US7] Add OPC UA connection type to connection dialog in src/renderer/components/connection/ConnectionForm.tsx

**Checkpoint**: US-007 OPC UA connection functional

---

## Phase 8: User Story 8 - OPC UA Node Browsing (Priority: P1)

**Goal**: Enable hierarchical address space browsing with lazy loading

**Independent Test**: Connect to server, expand Objects node, browse to Server/ServerStatus/CurrentTime, verify node attributes

### Implementation for US8

- [X] T086 [US8] Implement browse service with lazy loading in src/main/protocols/OpcUaAdapter.ts
- [X] T087 [US8] Implement continuation point handling for large results in src/main/protocols/OpcUaAdapter.ts
- [X] T088 [US8] Implement node attribute reading in src/main/protocols/OpcUaAdapter.ts
- [X] T089 [US8] Implement node search by DisplayName in src/main/protocols/OpcUaAdapter.ts
- [X] T090 [US8] Implement browse path translation in src/main/protocols/OpcUaAdapter.ts
- [X] T091 [US8] Create browse IPC handlers in src/main/ipc/opcua.ts
- [X] T092 [US8] Create OpcUaBrowser tree component in src/renderer/components/opcua/OpcUaBrowser.tsx
- [X] T093 [P] [US8] Create OpcUaNodeDetails viewer in src/renderer/components/opcua/OpcUaNodeDetails.tsx
- [X] T094 [US8] Implement drag-to-create-Tag from browser in src/renderer/components/opcua/OpcUaBrowser.tsx

**Checkpoint**: US-008 Node browsing functional

---

## Phase 9: User Story 9, 10, 11 - OPC UA Read/Write & Subscriptions (Priority: P1)

**Goal**: Enable node value operations and subscriptions with deadband filtering

**Independent Test**: Read multiple nodes, write to writable node, create subscription, verify updates within 200ms

### Implementation for US9 (Read)

- [X] T095 [US9] Implement single and batch read in src/main/protocols/OpcUaAdapter.ts
- [X] T096 [US9] Implement data type handling for all OPC UA Built-in types in src/main/protocols/OpcUaAdapter.ts
- [X] T097 [US9] Implement ExtensionObject decoding in src/main/protocols/OpcUaAdapter.ts
- [X] T098 [US9] Implement StatusCode display with human-readable text in src/main/protocols/OpcUaAdapter.ts
- [X] T099 [US9] Create read IPC handlers in src/main/ipc/opcua.ts

### Implementation for US10 (Write)

- [X] T100 [US10] Implement single and batch write in src/main/protocols/OpcUaAdapter.ts
- [X] T101 [US10] Implement data type validation before write in src/main/protocols/OpcUaAdapter.ts
- [X] T102 [US10] Implement AccessLevel check before write attempt in src/main/protocols/OpcUaAdapter.ts
- [X] T103 [US10] Create write IPC handlers in src/main/ipc/opcua.ts
- [X] T104 [US10] Implement write confirmation dialog for critical nodes in src/renderer/components/opcua/OpcUaWriteConfirm.tsx

### Implementation for US11 (Subscriptions)

- [X] T105 [US11] Implement subscription creation with configurable interval in src/main/protocols/OpcUaAdapter.ts
- [X] T106 [US11] Implement monitored item creation in src/main/protocols/OpcUaAdapter.ts
- [X] T107 [US11] Implement deadband filtering (None, Absolute, Percent) in src/main/protocols/OpcUaAdapter.ts
- [X] T108 [US11] Implement data change notification handling in src/main/protocols/OpcUaAdapter.ts
- [X] T109 [US11] Implement subscription lifetime and keep-alive in src/main/protocols/OpcUaAdapter.ts
- [X] T110 [US11] Implement publishing enable/disable (pause/resume) in src/main/protocols/OpcUaAdapter.ts
- [X] T111 [US11] Implement subscription transfer on reconnect in src/main/protocols/OpcUaAdapter.ts
- [X] T112 [US11] Create subscription IPC handlers in src/main/ipc/opcua.ts

**Checkpoint**: US-009, US-010, US-011 functional

---

## Phase 10: User Story 5 - Protocol Calculator & Tools (Priority: P2)

**Goal**: Enable protocol debugging tools (CRC, Byte Order, Float decoder, Packet Analyzer)

**Independent Test**: Enter Hex data, verify CRC-16 calculation, decode float32, analyze Modbus packet

### Implementation for US5

- [X] T113 [US5] Implement Modbus CRC-16 calculator in src/main/services/ProtocolCalculator.ts
- [X] T114 [US5] Implement LRC calculator in src/main/services/ProtocolCalculator.ts
- [X] T115 [US5] Implement Byte Order converter in src/main/services/ProtocolCalculator.ts
- [X] T116 [US5] Implement IEEE 754 Float encoder/decoder in src/main/services/ProtocolCalculator.ts
- [X] T117 [US5] Implement Modbus address format converter in src/main/services/ProtocolCalculator.ts
- [X] T118 [US5] Implement Packet Analyzer with Modbus RTU/TCP detection in src/main/services/ProtocolCalculator.ts
- [X] T119 [US5] Create calculator IPC handlers in src/main/ipc/calculator.ts
- [X] T120 [P] [US5] Create CrcCalculator UI in src/renderer/components/calculator/CrcCalculator.tsx
- [X] T121 [P] [US5] Create ByteOrderConverter UI in src/renderer/components/calculator/ByteOrderConverter.tsx
- [X] T122 [P] [US5] Create FloatDecoder UI in src/renderer/components/calculator/FloatDecoder.tsx
- [X] T123 [P] [US5] Create PacketAnalyzer UI in src/renderer/components/calculator/PacketAnalyzer.tsx

**Checkpoint**: US-005 Protocol Calculator functional

---

## Phase 11: User Story 12 - OPC UA Certificate Management (Priority: P2)

**Goal**: Enable X.509 certificate handling for secure connections

**Independent Test**: Generate self-signed certificate, export to server, establish SignAndEncrypt connection

### Implementation for US12

- [ ] T124 [US12] Implement OpcUaCertificateStore CRUD in src/main/services/OpcUaCertificateStore.ts
- [ ] T125 [US12] Implement self-signed certificate generation in src/main/services/OpcUaCertificateStore.ts
- [ ] T126 [US12] Implement certificate import (PEM/DER/PFX) in src/main/services/OpcUaCertificateStore.ts
- [ ] T127 [US12] Implement trusted certificate store management in src/main/services/OpcUaCertificateStore.ts
- [ ] T128 [US12] Implement certificate validation in src/main/services/OpcUaCertificateStore.ts
- [ ] T129 [US12] Implement certificate trust prompts in src/main/services/OpcUaCertificateStore.ts
- [ ] T130 [US12] Create certificate IPC handlers in src/main/ipc/opcua.ts
- [ ] T131 [US12] Create CertificateManager UI in src/renderer/components/opcua/CertificateManager.tsx

**Checkpoint**: US-012 Certificate management functional

---

## Phase 12: User Story 13, 14 - OPC UA Events & Methods (Priority: P2)

**Goal**: Enable event subscriptions and method calls

**Independent Test**: Subscribe to Server events, trigger test event, call method with arguments

### Implementation for US13 (Events)

- [ ] T132 [US13] Implement event subscription in src/main/protocols/OpcUaAdapter.ts
- [ ] T133 [US13] Implement event filter with select/where clauses in src/main/protocols/OpcUaAdapter.ts
- [ ] T134 [US13] Implement event notification handling in src/main/protocols/OpcUaAdapter.ts
- [ ] T135 [US13] Implement Acknowledge/Confirm for alarm conditions in src/main/protocols/OpcUaAdapter.ts
- [ ] T136 [US13] Create event IPC handlers in src/main/ipc/opcua.ts
- [ ] T137 [US13] Create OpcUaEventViewer UI in src/renderer/components/opcua/OpcUaEventViewer.tsx

### Implementation for US14 (Methods)

- [ ] T138 [US14] Implement method browsing on objects in src/main/protocols/OpcUaAdapter.ts
- [ ] T139 [US14] Implement method argument definition reading in src/main/protocols/OpcUaAdapter.ts
- [ ] T140 [US14] Implement method invocation with input/output arguments in src/main/protocols/OpcUaAdapter.ts
- [ ] T141 [US14] Create method IPC handlers in src/main/ipc/opcua.ts
- [ ] T142 [US14] Create OpcUaMethodCall UI in src/renderer/components/opcua/OpcUaMethodCall.tsx

**Checkpoint**: US-013, US-014 functional

---

## Phase 13: User Story 6 - Configuration Export/Import (Priority: P2)

**Goal**: Enable YAML workspace export/import with version control friendly output

**Independent Test**: Configure connections, tags, dashboard, export YAML, delete local, import, verify restoration

### Implementation for US6

- [x] T143 [US6] Define Workspace YAML schema and types in src/shared/types/workspace.ts
- [x] T144 [US6] Implement YAML export with stable sorting using js-yaml in src/main/services/WorkspaceExporter.ts
- [x] T145 [US6] Implement selective export (choose items to include) in src/main/services/WorkspaceExporter.ts
- [x] T146 [US6] Implement credential exclusion from export in src/main/services/WorkspaceExporter.ts
- [x] T147 [US6] Implement schema version embedding in src/main/services/WorkspaceExporter.ts
- [x] T148 [US6] Implement YAML import with conflict resolution in src/main/services/WorkspaceImporter.ts
- [x] T149 [US6] Implement schema validation before import in src/main/services/WorkspaceImporter.ts
- [x] T150 [US6] Create workspace IPC handlers in src/main/ipc/workspace.ts
- [x] T151 [P] [US6] Create ExportWorkspace UI in src/renderer/components/workspace/ExportWorkspace.tsx
- [x] T152 [P] [US6] Create ImportPreview UI with conflict display in src/renderer/components/workspace/ImportPreview.tsx

**Checkpoint**: US-006 Configuration export/import functional

---

## Phase 14: User Story 15 - OPC UA Historical Access (Priority: P3)

**Goal**: Enable historical data queries from OPC UA servers

**Independent Test**: Select node with Historizing=true, query past 1 hour, display results in chart

### Implementation for US15

- [x] T153 [US15] Implement Historizing attribute check in src/main/protocols/OpcUaAdapter.ts
- [x] T154 [US15] Implement raw history read with time range in src/main/protocols/OpcUaAdapter.ts
- [x] T155 [US15] Implement processed history read with aggregates in src/main/protocols/OpcUaAdapter.ts
- [x] T156 [US15] Implement continuation point handling for large results in src/main/protocols/OpcUaAdapter.ts
- [x] T157 [US15] Create history IPC handlers in src/main/ipc/opcua.ts
- [x] T158 [US15] Create OpcUaHistoryQuery UI with chart display in src/renderer/components/opcua/OpcUaHistoryQuery.tsx

**Checkpoint**: US-015 Historical access functional

---

## Phase 15: User Story 16 - OPC UA Discovery (Priority: P3)

**Goal**: Enable OPC UA server discovery on network

**Independent Test**: Execute discovery, find local and LAN servers, select and add to connections

### Implementation for US16

- [x] T159 [US16] Implement FindServers via LDS endpoint in src/main/protocols/OpcUaAdapter.ts
- [x] T160 [US16] Implement GetEndpoints from discovered servers in src/main/protocols/OpcUaAdapter.ts
- [x] T161 [US16] Implement discovery result caching in src/main/protocols/OpcUaAdapter.ts
- [x] T162 [US16] Create discovery IPC handlers in src/main/ipc/opcua.ts
- [x] T163 [US16] Create OpcUaDiscovery UI in src/renderer/components/opcua/OpcUaDiscovery.tsx

**Checkpoint**: US-016 Discovery functional

---

## Phase 16: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, edge cases, testing

- [ ] T164 Implement connection status alerts (disconnect, timeout) in src/main/services/AlertEngine.ts
- [ ] T165 Implement rate-of-change alerts in src/main/services/AlertEngine.ts
- [ ] T166 Handle orphaned widget cleanup when Tag deleted in src/main/services/DashboardService.ts
- [ ] T167 Handle environment switch during active connections in src/main/services/EnvironmentManager.ts
- [ ] T168 Handle OPC UA session timeout and renewal edge cases in src/main/protocols/OpcUaAdapter.ts
- [ ] T169 [P] Create BridgeManager unit tests in tests/unit/main/BridgeManager.test.ts
- [ ] T170 [P] Create EnvironmentManager unit tests in tests/unit/main/EnvironmentManager.test.ts
- [ ] T171 [P] Create AlertEngine unit tests in tests/unit/main/AlertEngine.test.ts
- [ ] T172 [P] Create OpcUaAdapter unit tests in tests/unit/main/OpcUaAdapter.test.ts
- [ ] T173 [P] Create Dashboard widget unit tests in tests/unit/renderer/dashboard/
- [ ] T174 [P] Create OPC UA browser unit tests in tests/unit/renderer/opcua/
- [ ] T175 Create Bridge E2E test in tests/e2e/bridge.spec.ts
- [ ] T176 [P] Create Dashboard E2E test in tests/e2e/dashboard.spec.ts
- [ ] T177 [P] Create Alert E2E test in tests/e2e/alert.spec.ts
- [ ] T178 [P] Create OPC UA E2E test in tests/e2e/opcua.spec.ts
- [ ] T179 Run quickstart.md validation scenarios
- [ ] T180 Update CHANGELOG.md with Phase 2 features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-15)**: All depend on Foundational phase completion
- **Polish (Phase 16)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
    │
    ├─► US2 Environment/Collection (Phase 3) ─► US6 Config Export (Phase 13)
    │
    ├─► US1 Bridge (Phase 4) ─► US6 Config Export (Phase 13)
    │
    ├─► US3 Dashboard (Phase 5) ─► US6 Config Export (Phase 13)
    │
    ├─► US4 Alerts (Phase 6) ─► US6 Config Export (Phase 13)
    │
    ├─► US5 Calculator (Phase 10) [Independent]
    │
    └─► US7 OPC UA Connection (Phase 7)
            │
            ├─► US8 Browse (Phase 8)
            │       │
            │       ├─► US9 Read (Phase 9)
            │       ├─► US10 Write (Phase 9)
            │       ├─► US11 Subscriptions (Phase 9)
            │       ├─► US14 Methods (Phase 12)
            │       └─► US15 History (Phase 14)
            │
            ├─► US12 Certificates (Phase 11)
            ├─► US13 Events (Phase 12)
            └─► US16 Discovery (Phase 15)
```

### Within Each User Story

- Types/Models before services
- Services before IPC handlers
- IPC handlers before UI components
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001-T007 all shared types can run in parallel

**Phase 2 (Foundational)**:
- T009-T018 service skeletons can run in parallel
- T019-T024 stores can run in parallel

**Within User Stories**:
- UI components marked [P] can run in parallel after their services are done
- Different user stories can be worked on in parallel after Phase 2

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch all service skeletons in parallel:
Task: "Create EnvironmentManager service skeleton in src/main/services/EnvironmentManager.ts"
Task: "Create variable substitution engine in src/main/services/VariableSubstitution.ts"
Task: "Create BridgeManager service skeleton in src/main/services/BridgeManager.ts"
Task: "Create DashboardService skeleton in src/main/services/DashboardService.ts"
Task: "Create AlertEngine service skeleton in src/main/services/AlertEngine.ts"

# Launch all stores in parallel:
Task: "Create bridgeStore in src/renderer/stores/bridgeStore.ts"
Task: "Create environmentStore in src/renderer/stores/environmentStore.ts"
Task: "Create dashboardStore in src/renderer/stores/dashboardStore.ts"
```

---

## Implementation Strategy

### MVP First (Recommended Order)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T024)
3. Complete Phase 3: US2 Environment/Collection (T025-T039)
4. Complete Phase 4: US1 Bridge (T040-T049)
5. **STOP and VALIDATE**: Test Modbus→MQTT Bridge with Environment switching
6. Continue with Dashboard, Alerts, OPC UA...

### Suggested MVP Scope

**MVP = US1 (Bridge) + US2 (Environment/Collection)**

This provides:
- Core protocol bridging functionality
- Environment-based configuration
- Collection testing capability

### Incremental Delivery

| Release | User Stories | Value |
|---------|--------------|-------|
| 0.8.0-alpha | US2 + US1 | Bridge with environments |
| 0.8.0-beta | + US3 + US4 | Dashboard + Alerts |
| 0.8.0 | + US5 + US6 | Calculator + Export |
| 0.9.0-alpha | + US7 + US8 | OPC UA Connection + Browse |
| 0.9.0-beta | + US9-11 | OPC UA Read/Write/Subscriptions |
| 0.9.0 | + US12-14 | OPC UA Certificates/Events/Methods |
| 1.0.0 | + US15-16 + Polish | Full OPC UA + Production ready |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
