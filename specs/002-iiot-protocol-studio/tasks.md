# Tasks: IIoT Protocol Studio

**Input**: Design documents from `/specs/002-iiot-protocol-studio/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Main process**: `src/main/` (Node.js/Electron)
- **Renderer process**: `src/renderer/` (React)
- **Preload**: `src/preload/`
- **Shared types**: `src/shared/`
- **Tests**: `tests/unit/main/`, `tests/unit/renderer/`, `tests/e2e/`

---

## Phase 1: Setup (Project Scaffolding)

**Purpose**: Bootable Electron app with Vite HMR working
**Reference**: [plan.md § Phase 1](./plan.md#phase-1-project-scaffolding)

- [x] T001 Initialize Electron + Vite project with electron-vite per [quickstart.md](./quickstart.md)
- [x] T002 Configure TypeScript with path aliases (`@shared/*`, `@main/*`, `@renderer/*`) in tsconfig.json
- [x] T003 [P] Set up Tailwind CSS configuration in tailwind.config.js
- [x] T004 [P] Install and configure Shadcn/ui in src/renderer/components/ui/
- [x] T005 Create directory structure per [plan.md § Project Structure](./plan.md#source-code-repository-root)
- [x] T006 Create preload script skeleton with contextBridge in src/preload/index.ts
- [x] T007 [P] Configure electron-log for Main process in src/main/index.ts
- [x] T008 [P] Add Jest config for Main process in jest.config.js
- [x] T009 [P] Add Vitest config for Renderer in vitest.config.ts
- [x] T010 [P] Add Playwright config for E2E in playwright.config.ts

**Checkpoint**: `npm run dev` opens window, HMR works, test configs ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type-safe IPC layer, data storage, and protocol adapter interface
**Reference**: [plan.md § Phases 2-4](./plan.md#phase-2-shared-types--ipc-foundation)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Types & IPC Foundation

- [x] T011 Create shared types from contracts in src/shared/types/connection.ts per [contracts/types.ts](./contracts/types.ts)
- [x] T012 [P] Create shared types in src/shared/types/tag.ts per [contracts/types.ts](./contracts/types.ts)
- [x] T013 [P] Create shared types in src/shared/types/datapoint.ts per [contracts/types.ts](./contracts/types.ts)
- [x] T014 [P] Create shared types in src/shared/types/profile.ts per [contracts/types.ts](./contracts/types.ts)
- [x] T015 [P] Create shared types in src/shared/types/virtual-server.ts per [contracts/types.ts](./contracts/types.ts)
- [x] T016 Create IPC channel constants in src/shared/constants/ipc-channels.ts per [ipc-channels.md § Channel Naming](./contracts/ipc-channels.md#channel-naming-convention)
- [x] T017 Implement type-safe IPC invoke wrapper in src/renderer/lib/ipc.ts per [research.md § Zustand](./research.md#3-state-management-zustand)
- [x] T018 Set up preload contextBridge with typed API in src/preload/index.ts per [ipc-channels.md](./contracts/ipc-channels.md)

### Data Layer (SQLite + Credential Store)

- [x] T019 Install and configure better-sqlite3 per [research.md § SQLite](./research.md#5-sqlite-ring-buffer-dvr)
- [x] T020 Create SQLite schema in src/main/db/schema.sql per [data-model.md § SQLite Schema](./data-model.md#sqlite-schema)
- [x] T021 Implement DataBuffer service with ring buffer eviction in src/main/services/DataBuffer.ts per [data-model.md § DataPoint](./data-model.md#datapoint)
- [x] T022 Install and configure keytar per [research.md § keytar](./research.md#6-secure-credential-storage-keytar)
- [x] T023 Implement credential helpers in src/main/services/CredentialService.ts per [research.md § keytar Pattern](./research.md#6-secure-credential-storage-keytar)

### Protocol Adapter Interface

- [x] T024 Define ProtocolAdapter abstract interface in src/main/protocols/ProtocolAdapter.ts per [data-model.md § Connection](./data-model.md#connection)
- [x] T025 Implement ModbusTcpAdapter in src/main/protocols/ModbusTcpAdapter.ts per [research.md § Protocol Libraries](./research.md#2-protocol-libraries)
- [x] T026 Implement address parsing for Modbus registers in ModbusTcpAdapter per [data-model.md § ModbusAddress](./data-model.md#tag)
- [x] T027 Implement data type conversion (INT16, UINT16, FLOAT32, etc.) in ModbusTcpAdapter per [data-model.md § DataType](./data-model.md#tag)
- [x] T028 [P] Add unit tests for ModbusTcpAdapter in tests/unit/main/ModbusTcpAdapter.test.ts

### Logging Infrastructure

- [x] T029 Implement LogService with file rotation in src/main/services/LogService.ts per [research.md § Logging](./research.md#7-logging-electron-log)
- [x] T030 [P] Implement log IPC handlers in src/main/ipc/log.ts per [ipc-channels.md § Log Channels](./contracts/ipc-channels.md#log-channels)

**Checkpoint**: Can invoke empty IPC handler from Renderer, SQLite ring buffer works, ModbusTcpAdapter can connect to simulator.

---

## Phase 3: User Story 1 - Quick Connection Test (Priority: P1) 🎯 MVP

**Goal**: User can connect to a Modbus TCP device and perform a single read operation
**Reference**: [spec.md US1](./spec.md#user-story-1---quick-connection-test-priority-p1), [plan.md § Phases 5, 8](./plan.md#phase-5-connection-management)

**Independent Test**: Connect to Modbus Simulator, input IP/Port/UnitID, click Connect, see "Connected" status, read register 40001 and see value displayed.

### Main Process - Connection Management

- [x] T031 [US1] Implement ConnectionManager singleton in src/main/services/ConnectionManager.ts per [data-model.md § Connection](./data-model.md#connection)
- [x] T032 [US1] Implement state machine (disconnected→connecting→connected→error) in ConnectionManager per [data-model.md § State Transitions](./data-model.md#connection)
- [x] T033 [US1] Implement IPC handler `connection:create` in src/main/ipc/connection.ts per [ipc-channels.md § connection:create](./contracts/ipc-channels.md#connectioncreate)
- [x] T034 [P] [US1] Implement IPC handler `connection:connect` in src/main/ipc/connection.ts per [ipc-channels.md § connection:connect](./contracts/ipc-channels.md#connectionconnect)
- [x] T035 [P] [US1] Implement IPC handler `connection:disconnect` in src/main/ipc/connection.ts per [ipc-channels.md § connection:disconnect](./contracts/ipc-channels.md#connectiondisconnect)
- [x] T036 [P] [US1] Implement IPC handler `connection:delete` in src/main/ipc/connection.ts per [ipc-channels.md § connection:delete](./contracts/ipc-channels.md#connectiondelete)
- [x] T037 [P] [US1] Implement IPC handler `connection:list` in src/main/ipc/connection.ts per [ipc-channels.md § connection:list](./contracts/ipc-channels.md#connectionlist)
- [x] T038 [US1] Implement `connection:read-once` for quick test in src/main/ipc/connection.ts per [ipc-channels.md § connection:read-once](./contracts/ipc-channels.md#connectionread-once)
- [x] T039 [US1] Push `connection:status-changed` events to Renderer in ConnectionManager per [ipc-channels.md § Push Channels](./contracts/ipc-channels.md#push-channels-main--renderer)
- [x] T040 [US1] Register all connection IPC handlers in src/main/index.ts

### Renderer - Connection UI

- [x] T041 [US1] Create connectionStore Zustand store in src/renderer/stores/connectionStore.ts per [research.md § Zustand](./research.md#3-state-management-zustand)
- [x] T042 [US1] Implement useConnection hook in src/renderer/hooks/useConnection.ts wrapping IPC calls
- [x] T043 [US1] Build app shell layout (Sidebar, Header) in src/renderer/components/layout/ per [plan.md § layout](./plan.md#source-code-repository-root)
- [x] T044 [US1] Build ConnectionForm component (Modbus TCP config) in src/renderer/components/connection/ConnectionForm.tsx per [data-model.md § ModbusTcpConfig](./data-model.md#connection)
- [x] T045 [US1] Build ConnectionCard with status indicator in src/renderer/components/connection/ConnectionCard.tsx per [data-model.md § ConnectionStatus](./data-model.md#connection)
- [x] T046 [US1] Build ConnectionList component in src/renderer/components/connection/ConnectionList.tsx
- [x] T047 [US1] Build QuickReadPanel component for single read in src/renderer/components/connection/QuickReadPanel.tsx
- [x] T048 [US1] Wire up Connection components in src/renderer/App.tsx

**Checkpoint**: US1 (Quick Connection Test) fully functional - can connect to Modbus device and read registers.

---

## Phase 4: User Story 2 - Tag-Based Continuous Monitoring (Priority: P1)

**Goal**: User can define Tags and see real-time values with sparkline trends
**Reference**: [spec.md US2](./spec.md#user-story-2---tag-based-continuous-monitoring-priority-p1), [plan.md § Phases 6, 7, 9](./plan.md#phase-6-tag-management)

**Independent Test**: After connecting, add 5 Tags, start polling at 1000ms, see values update in grid with sparklines showing 60-second trends.

### Main Process - Tag Management

- [x] T049 [US2] Implement Tag storage in ConnectionManager in src/main/services/ConnectionManager.ts per [data-model.md § Tag](./data-model.md#tag)
- [x] T050 [US2] Implement Tag validation rules per [data-model.md § Tag Validation](./data-model.md#tag)
- [x] T051 [US2] Implement IPC handler `tag:create` in src/main/ipc/tag.ts per [ipc-channels.md § tag:create](./contracts/ipc-channels.md#tagcreate)
- [x] T052 [P] [US2] Implement IPC handler `tag:update` in src/main/ipc/tag.ts per [ipc-channels.md § tag:update](./contracts/ipc-channels.md#tagupdate)
- [x] T053 [P] [US2] Implement IPC handler `tag:delete` in src/main/ipc/tag.ts per [ipc-channels.md § tag:delete](./contracts/ipc-channels.md#tagdelete)
- [x] T054 [P] [US2] Implement IPC handler `tag:list` in src/main/ipc/tag.ts per [ipc-channels.md § tag:list](./contracts/ipc-channels.md#taglist)
- [x] T055 [US2] Implement `tag:import-csv` with CSV parsing in src/main/ipc/tag.ts per [ipc-channels.md § tag:import-csv](./contracts/ipc-channels.md#tagimport-csv)
- [x] T056 [US2] Register all tag IPC handlers in src/main/index.ts

### Main Process - Polling Engine

- [x] T057 [US2] Implement PollingEngine with interval timer in src/main/services/PollingEngine.ts per [spec.md FR-010](./spec.md)
- [x] T058 [US2] Integrate PollingEngine with ProtocolAdapter.read() per [data-model.md § DataPoint](./data-model.md#datapoint)
- [x] T059 [US2] Write DataPoints to DataBuffer on each poll in PollingEngine
- [x] T060 [US2] Implement IPC handler `polling:start` in src/main/ipc/polling.ts per [ipc-channels.md § polling:start](./contracts/ipc-channels.md#pollingstart)
- [x] T061 [P] [US2] Implement IPC handler `polling:stop` in src/main/ipc/polling.ts per [ipc-channels.md § polling:stop](./contracts/ipc-channels.md#pollingstop)
- [x] T062 [P] [US2] Implement IPC handler `polling:status` in src/main/ipc/polling.ts per [ipc-channels.md § polling:status](./contracts/ipc-channels.md#pollingstatus)
- [x] T063 [US2] Push `polling:data` events to Renderer in PollingEngine per [ipc-channels.md § polling:data](./contracts/ipc-channels.md#pollingdata)
- [x] T064 [US2] Register all polling IPC handlers in src/main/index.ts

### Renderer - Tag Grid with Sparklines

- [x] T065 [US2] Create tagStore Zustand store in src/renderer/stores/tagStore.ts per [data-model.md § TagDisplayState](./data-model.md#derived-state-renderer)
- [x] T066 [US2] Implement usePolling hook in src/renderer/hooks/usePolling.ts
- [x] T067 [US2] Build TagEditor component in src/renderer/components/tags/TagEditor.tsx per [data-model.md § Tag](./data-model.md#tag)
- [x] T068 [US2] Implement Sparkline component with uPlot in src/renderer/components/tags/Sparkline.tsx per [research.md § uPlot](./research.md#4-data-visualization-uplot--echarts)
- [x] T069 [US2] Build TagGrid with virtualization for 100+ tags in src/renderer/components/tags/TagGrid.tsx per [spec.md SC-002](./spec.md)
- [x] T070 [US2] Implement threshold-based row highlighting in TagGrid per [data-model.md § Thresholds](./data-model.md#tag)
- [x] T071 [US2] Listen to `polling:data` push events and update tagStore in src/renderer/stores/tagStore.ts
- [x] T072 [US2] Build PollingControls component in src/renderer/components/tags/PollingControls.tsx
- [x] T073 [US2] Wire up Tag components in src/renderer/App.tsx

**Checkpoint**: US2 (Tag-Based Monitoring) fully functional - real-time data updates with sparklines.

---

## Phase 5: User Story 3 - Data DVR Time-Travel (Priority: P1)

**Goal**: User can scrub through historical data using a timeline slider
**Reference**: [spec.md US3](./spec.md#user-story-3---data-dvr-time-travel-priority-p1), [plan.md § Phase 10](./plan.md#phase-10-dvr-data-time-travel)

**Independent Test**: Poll for 2 minutes, drag timeline to 1 minute ago, verify displayed values match that timestamp.

### Main Process - DVR

- [x] T074 [US3] Implement IPC handler `dvr:get-range` in src/main/ipc/dvr.ts per [ipc-channels.md § dvr:get-range](./contracts/ipc-channels.md#dvrget-range)
- [x] T075 [US3] Implement IPC handler `dvr:seek` in src/main/ipc/dvr.ts per [ipc-channels.md § dvr:seek](./contracts/ipc-channels.md#dvrseek)
- [x] T076 [US3] Implement IPC handler `dvr:get-sparkline` in src/main/ipc/dvr.ts per [ipc-channels.md § dvr:get-sparkline](./contracts/ipc-channels.md#dvrget-sparkline)
- [x] T077 [US3] Add downsampling logic for sparkline data in DataBuffer per [ipc-channels.md § maxPoints](./contracts/ipc-channels.md#dvrget-sparkline)
- [x] T078 [US3] Register all dvr IPC handlers in src/main/index.ts

### Renderer - DVR UI

- [x] T079 [US3] Create dvrStore Zustand store in src/renderer/stores/dvrStore.ts per [data-model.md § DvrState](./data-model.md#derived-state-renderer)
- [x] T080 [US3] Implement useDvr hook in src/renderer/hooks/useDvr.ts
- [x] T081 [US3] Build TimelineSlider component in src/renderer/components/dvr/TimelineSlider.tsx per [spec.md US3](./spec.md)
- [x] T082 [US3] Build PlaybackControls (Live/Historical toggle) in src/renderer/components/dvr/PlaybackControls.tsx per [data-model.md § DvrState.isLive](./data-model.md#derived-state-renderer)
- [x] T083 [US3] Integrate DVR seek with TagGrid display in src/renderer/components/tags/TagGrid.tsx
- [x] T084 [US3] Add visual indicator for historical vs live mode in src/renderer/components/dvr/ModeIndicator.tsx
- [x] T085 [US3] Wire up DVR components in src/renderer/App.tsx

**Checkpoint**: US3 (Data DVR Time-Travel) fully functional - can scrub through historical data.

---

## Phase 6: User Story 4 - Profile Management (Priority: P1)

**Goal**: User can save/load/import/export connection profiles
**Reference**: [spec.md US4](./spec.md#user-story-4---connection-profile-management-priority-p1), [plan.md § Phase 11](./plan.md#phase-11-profile-management)

**Independent Test**: Configure connection + Tags, save as "PLC-A", close app, reopen, load "PLC-A", verify all settings restored.

### Main Process - Profile Service

- [ ] T086 [US4] Implement ProfileService with JSON serialization in src/main/services/ProfileService.ts per [data-model.md § Profile](./data-model.md#profile)
- [ ] T087 [US4] Integrate keytar for credential extraction in ProfileService per [research.md § keytar Pattern](./research.md#6-secure-credential-storage-keytar)
- [ ] T088 [US4] Implement IPC handler `profile:save` in src/main/ipc/profile.ts per [ipc-channels.md § profile:save](./contracts/ipc-channels.md#profilesave)
- [ ] T089 [P] [US4] Implement IPC handler `profile:load` in src/main/ipc/profile.ts per [ipc-channels.md § profile:load](./contracts/ipc-channels.md#profileload)
- [ ] T090 [P] [US4] Implement IPC handler `profile:list` in src/main/ipc/profile.ts per [ipc-channels.md § profile:list](./contracts/ipc-channels.md#profilelist)
- [ ] T091 [P] [US4] Implement IPC handler `profile:delete` in src/main/ipc/profile.ts per [ipc-channels.md § profile:delete](./contracts/ipc-channels.md#profiledelete)
- [ ] T092 [US4] Implement `profile:import` with file dialog in src/main/ipc/profile.ts per [ipc-channels.md § profile:import](./contracts/ipc-channels.md#profileimport)
- [ ] T093 [US4] Implement `profile:export` with file dialog in src/main/ipc/profile.ts per [ipc-channels.md § profile:export](./contracts/ipc-channels.md#profileexport)
- [ ] T094 [US4] Implement profile schema version validation in ProfileService per [spec.md FR-023](./spec.md)
- [ ] T095 [US4] Register all profile IPC handlers in src/main/index.ts

### Renderer - Profile UI

- [ ] T096 [US4] Build ProfileList component in src/renderer/components/profile/ProfileList.tsx
- [ ] T097 [US4] Build ProfileDialog (save/load) in src/renderer/components/profile/ProfileDialog.tsx
- [ ] T098 [US4] Build ImportExportButtons component in src/renderer/components/profile/ImportExportButtons.tsx
- [ ] T099 [US4] Wire up Profile components in src/renderer/App.tsx

**Checkpoint**: US4 (Profile Management) fully functional - can save/load/import/export profiles.

---

## Phase 7: User Story 7 - Session Export & Report (Priority: P1)

**Goal**: User can export collected data as CSV or HTML report
**Reference**: [spec.md US7](./spec.md#user-story-7---session-export--report-priority-p1), [plan.md § Phase 12](./plan.md#phase-12-export--reporting)

**Independent Test**: Poll for 1 minute, export CSV, verify file contains Timestamp/TagName/Value columns and can open in Excel.

### Main Process - Export Service

- [ ] T100 [US7] Implement ExportService with CSV writer in src/main/services/ExportService.ts per [ipc-channels.md § export:csv](./contracts/ipc-channels.md#exportcsv)
- [ ] T101 [US7] Implement HTML report generator with ECharts in ExportService per [research.md § ECharts](./research.md#4-data-visualization-uplot--echarts)
- [ ] T102 [US7] Implement IPC handler `export:csv` in src/main/ipc/export.ts per [ipc-channels.md § export:csv](./contracts/ipc-channels.md#exportcsv)
- [ ] T103 [US7] Implement IPC handler `export:html-report` in src/main/ipc/export.ts per [ipc-channels.md § export:html-report](./contracts/ipc-channels.md#exporthtml-report)
- [ ] T104 [US7] Add progress tracking for large exports in ExportService per [spec.md US7 Scenario 3](./spec.md)
- [ ] T105 [US7] Register all export IPC handlers in src/main/index.ts

### Renderer - Export UI

- [ ] T106 [US7] Build ExportDialog component in src/renderer/components/export/ExportDialog.tsx
- [ ] T107 [US7] Build ReportPreview component in src/renderer/components/export/ReportPreview.tsx
- [ ] T108 [US7] Build ExportProgress component with progress bar in src/renderer/components/export/ExportProgress.tsx
- [ ] T109 [US7] Wire up Export components in src/renderer/App.tsx

**Checkpoint**: US7 (Session Export & Report) fully functional - can export CSV and HTML reports.

---

## Phase 8: User Story 5 - Virtual Server (Priority: P2)

**Goal**: Built-in Modbus TCP simulator for testing without hardware
**Reference**: [spec.md US5](./spec.md#user-story-5---virtual-server-for-testing-priority-p2), [plan.md § Phase 13](./plan.md#phase-13-virtual-server-p2)

**Independent Test**: Start Virtual Server on port 5020, connect client to localhost:5020, poll registers, see simulated waveform data.

### Main Process - Virtual Server

- [ ] T110 [US5] Implement VirtualServer service in src/main/services/VirtualServer.ts per [data-model.md § VirtualServer](./data-model.md#virtualserver)
- [ ] T111 [US5] Implement waveform generators (constant, sine, square, triangle, random) in VirtualServer per [data-model.md § Waveform](./data-model.md#waveform)
- [ ] T112 [US5] Implement IPC handler `virtual-server:start` in src/main/ipc/virtual-server.ts per [ipc-channels.md § virtual-server:start](./contracts/ipc-channels.md#virtual-serverstart)
- [ ] T113 [P] [US5] Implement IPC handler `virtual-server:stop` in src/main/ipc/virtual-server.ts per [ipc-channels.md § virtual-server:stop](./contracts/ipc-channels.md#virtual-serverstop)
- [ ] T114 [P] [US5] Implement IPC handler `virtual-server:status` in src/main/ipc/virtual-server.ts per [ipc-channels.md § virtual-server:status](./contracts/ipc-channels.md#virtual-serverstatus)
- [ ] T115 [US5] Handle EADDRINUSE error with port suggestion in VirtualServer per [spec.md Edge Cases](./spec.md)
- [ ] T116 [US5] Register all virtual-server IPC handlers in src/main/index.ts

### Renderer - Virtual Server UI

- [ ] T117 [US5] Build VirtualServerPanel component in src/renderer/components/virtual-server/VirtualServerPanel.tsx
- [ ] T118 [US5] Build RegisterConfigForm component in src/renderer/components/virtual-server/RegisterConfigForm.tsx
- [ ] T119 [US5] Build WaveformSelector component in src/renderer/components/virtual-server/WaveformSelector.tsx
- [ ] T120 [US5] Wire up Virtual Server components in src/renderer/App.tsx

**Checkpoint**: US5 (Virtual Server) fully functional - can start simulator and connect to it.

---

## Phase 9: User Story 6 - Multi-Protocol Support (Priority: P2)

**Goal**: Support MQTT protocol alongside Modbus TCP
**Reference**: [spec.md US6](./spec.md#user-story-6---multi-protocol-support-priority-p2), [plan.md § Phase 14](./plan.md#phase-14-multi-protocol-p2)

**Independent Test**: Create Modbus and MQTT connections, add Tags for each, poll simultaneously, see mixed-protocol data in grid.

### Main Process - MQTT Adapter

- [ ] T121 [US6] Implement MqttAdapter in src/main/protocols/MqttAdapter.ts per [research.md § mqtt.js](./research.md#2-protocol-libraries)
- [ ] T122 [US6] Implement MQTT address handling (topic, jsonPath) in MqttAdapter per [data-model.md § MqttAddress](./data-model.md#tag)
- [ ] T123 [US6] Implement MQTT authentication (username/password, TLS) in MqttAdapter per [data-model.md § MqttConfig](./data-model.md#connection)
- [ ] T124 [US6] Register MqttAdapter in ConnectionManager protocol registry
- [ ] T125 [P] [US6] Add unit tests for MqttAdapter in tests/unit/main/MqttAdapter.test.ts

### Renderer - Multi-Protocol UI

- [ ] T126 [US6] Update ConnectionForm for MQTT protocol in src/renderer/components/connection/ConnectionForm.tsx per [data-model.md § MqttConfig](./data-model.md#connection)
- [ ] T127 [US6] Add protocol selector to ConnectionForm
- [ ] T128 [US6] Add protocol icon/color differentiation in TagGrid per [spec.md US6 Scenario 2](./spec.md)
- [ ] T129 [US6] Update TagEditor for MQTT address type in src/renderer/components/tags/TagEditor.tsx

**Checkpoint**: US6 (Multi-Protocol Support) fully functional - can monitor Modbus and MQTT simultaneously.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, edge cases, and refinements
**Reference**: [plan.md § Phase 15](./plan.md#phase-15-polish--edge-cases)

### App Lifecycle

- [ ] T130 Implement app close confirmation with save prompt in src/main/index.ts per [spec.md Clarifications](./spec.md#clarifications)
- [ ] T131 Implement IPC handlers `app:check-unsaved`, `app:force-quit` in src/main/ipc/app.ts per [ipc-channels.md § App Lifecycle](./contracts/ipc-channels.md#app-lifecycle-channels)
- [ ] T132 Ensure polling stops gracefully on app close in PollingEngine

### Reconnection & Error Handling

- [ ] T133 Implement reconnection with exponential backoff in ConnectionManager per [spec.md Edge Cases](./spec.md)
- [ ] T134 Add network disconnection detection (3s timeout) in ProtocolAdapters per [spec.md Edge Cases](./spec.md)

### UI Polish

- [ ] T135 [P] Add keyboard shortcuts (Ctrl+Enter, F5, Shift+F5) per [spec.md FR-027](./spec.md)
- [ ] T136 [P] Implement Light/Dark theme toggle in src/renderer/stores/uiStore.ts per [spec.md FR-026](./spec.md)
- [ ] T137 [P] Add theme provider in src/renderer/App.tsx per [data-model.md § ProfileSettings.theme](./data-model.md#profile)
- [ ] T138 [P] Build LogViewer component in src/renderer/components/common/LogViewer.tsx per [ipc-channels.md § Log Channels](./contracts/ipc-channels.md#log-channels)

### E2E Testing

- [ ] T139 Write E2E test for US1 (Quick Connection) in tests/e2e/connection.spec.ts
- [ ] T140 [P] Write E2E test for US2 (Tag Monitoring) in tests/e2e/monitoring.spec.ts
- [ ] T141 [P] Write E2E test for US3 (DVR) in tests/e2e/dvr.spec.ts
- [ ] T142 [P] Write E2E test for US4 (Profile) in tests/e2e/profile.spec.ts
- [ ] T143 Run full E2E test suite and fix failures

### Documentation

- [ ] T144 [P] Update CHANGELOG.md with new feature
- [ ] T145 [P] Validate quickstart.md instructions work end-to-end

**Checkpoint**: All user stories pass E2E tests, app is production ready.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ──── BLOCKS ALL USER STORIES
    │
    ├──────────────────────────────────────────────────────┐
    │                                                      │
    ▼                                                      ▼
Phase 3 (US1) ─────► Phase 4 (US2) ─────► Phase 5 (US3)   Phase 6 (US4)
    │                    │                     │               │
    │                    │                     │               │
    │                    └──────────┬──────────┘               │
    │                               │                          │
    │                               ▼                          │
    │                        Phase 7 (US7)                     │
    │                               │                          │
    └──────────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                      Phase 8 (US5) ── Phase 9 (US6)
                                   │
                                   ▼
                          Phase 10 (Polish)
```

### User Story Dependencies

| User Story | Primary Phase | Depends On | Can Start After |
|------------|---------------|------------|-----------------|
| US1 Quick Connection | Phase 3 | Foundational | Phase 2 complete |
| US2 Tag Monitoring | Phase 4 | US1 | Phase 3 checkpoint |
| US3 Data DVR | Phase 5 | US2 | Phase 4 checkpoint |
| US4 Profile Management | Phase 6 | US1 | Phase 3 checkpoint |
| US5 Virtual Server | Phase 8 | Foundational | Phase 2 complete |
| US6 Multi-Protocol | Phase 9 | US2 | Phase 4 checkpoint |
| US7 Export & Report | Phase 7 | US2 | Phase 4 checkpoint |

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T011-T015: All shared type files can be created in parallel
- T019-T023: SQLite setup independent of credential setup
- T024-T028: Protocol adapter work can parallel data layer work

**Between User Stories** (after Phase 2):
- US1 and US5 can start in parallel (both only need Foundational)
- US4 can start as soon as US1 completes
- US6 and US7 can start as soon as US2 completes

**Within Each User Story**:
- IPC handlers marked [P] can be implemented in parallel
- Renderer components can parallel main process work once IPC is ready

---

## Parallel Example: User Story 2

```bash
# After T049-T050 (Tag storage) are done, launch these in parallel:
Task: "[P] [US2] Implement IPC handler tag:update in src/main/ipc/tag.ts"
Task: "[P] [US2] Implement IPC handler tag:delete in src/main/ipc/tag.ts"
Task: "[P] [US2] Implement IPC handler tag:list in src/main/ipc/tag.ts"

# After T057-T059 (PollingEngine core) are done, launch these in parallel:
Task: "[P] [US2] Implement IPC handler polling:stop in src/main/ipc/polling.ts"
Task: "[P] [US2] Implement IPC handler polling:status in src/main/ipc/polling.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently - connect to Modbus and read values
5. Deploy/demo if ready

### Incremental Delivery (P1 Stories)

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → **MVP: Can connect and read**
3. Add US2 → Test → **Increment: Real-time monitoring with sparklines**
4. Add US3 → Test → **Increment: Data time-travel**
5. Add US4 → Test → **Increment: Profile save/load**
6. Add US7 → Test → **Increment: Export capability**
7. Each P1 story adds value without breaking previous stories

### P2 Stories (After Core)

1. US5 (Virtual Server) → Enables testing without hardware
2. US6 (MQTT) → Extends protocol support

---

## Summary

| Phase | Task Count | User Story |
|-------|-----------|------------|
| Phase 1: Setup | 10 | - |
| Phase 2: Foundational | 20 | - |
| Phase 3: US1 Quick Connection | 18 | US1 |
| Phase 4: US2 Tag Monitoring | 25 | US2 |
| Phase 5: US3 Data DVR | 12 | US3 |
| Phase 6: US4 Profile Management | 14 | US4 |
| Phase 7: US7 Export & Report | 10 | US7 |
| Phase 8: US5 Virtual Server | 11 | US5 |
| Phase 9: US6 Multi-Protocol | 9 | US6 |
| Phase 10: Polish | 16 | - |
| **TOTAL** | **145** | |

**MVP Scope**: Phases 1-3 (48 tasks) delivers US1 - Quick Connection Test
**Core P1 Scope**: Phases 1-7 (109 tasks) delivers all P1 user stories
**Full Scope**: All phases (145 tasks) delivers complete feature

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [US#] label maps task to specific user story for traceability
- Each user story checkpoint enables independent validation
- Verify E2E tests pass at each checkpoint before proceeding
- Commit after each task or logical group
