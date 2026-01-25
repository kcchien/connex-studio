# Feature Specification: Remove Virtual Server

**Feature Branch**: `004-remove-virtual-server`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Remove Virtual Server feature from Connex Studio to make it a pure Protocol Client tool"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Protocol Client Experience (Priority: P1)

As a user of Connex Studio, I want the application to focus solely on protocol client functionality (connecting to external devices/servers), so that the interface is simpler and the application's purpose is clearer.

**Why this priority**: This is the core objective - removing Virtual Server transforms Connex Studio from a dual-purpose tool (client + server simulation) into a focused Protocol Client tool. This simplification reduces cognitive load for users and clarifies the product positioning.

**Independent Test**: Can be verified by launching the application and confirming that no Virtual Server UI elements, menu items, or configuration options are present.

**Acceptance Scenarios**:

1. **Given** a user launches Connex Studio, **When** they explore all UI panels and menus, **Then** there should be no Virtual Server panel, tab, or menu option visible
2. **Given** a user opens the application settings, **When** they browse all configuration sections, **Then** there should be no Virtual Server configuration options
3. **Given** a user reviews the connection management interface, **When** they examine all connection types available, **Then** only client connection options (Modbus TCP Client, MQTT Client, OPC UA Client) should be present

---

### User Story 2 - Reduced Application Footprint (Priority: P2)

As a developer maintaining Connex Studio, I want all Virtual Server code removed from the codebase, so that the application has a smaller footprint and reduced maintenance burden.

**Why this priority**: Code cleanup is essential for long-term maintainability but is secondary to the user-facing changes. This ensures no dead code remains that could cause confusion or technical debt.

**Independent Test**: Can be verified by searching the codebase for Virtual Server related files, imports, and references - all should be absent.

**Acceptance Scenarios**:

1. **Given** the codebase after removal, **When** searching for "virtual-server" or "VirtualServer" in source files, **Then** no matches should be found in src/ directory
2. **Given** the application is built, **When** inspecting the build output, **Then** no Virtual Server related code should be bundled
3. **Given** a developer inspects IPC channel definitions, **When** looking for virtual-server channels, **Then** no such channels should exist

---

### User Story 3 - Updated Documentation (Priority: P3)

As a user or developer, I want all specification documents to reflect that Connex Studio is a Protocol Client tool only, so that documentation accurately describes the product capabilities.

**Why this priority**: Documentation consistency is important but can be addressed after the functional changes are complete. This ensures no misleading information remains in project documentation.

**Independent Test**: Can be verified by reviewing all specification documents and confirming no Virtual Server references exist.

**Acceptance Scenarios**:

1. **Given** the main spec.md for the project, **When** reviewing user stories and requirements, **Then** no Virtual Server user story or requirement should be present
2. **Given** the data-model.md specification, **When** reviewing entity definitions, **Then** no VirtualServer, VirtualRegister, or Waveform entities should be defined
3. **Given** the IPC contracts documentation, **When** reviewing channel definitions, **Then** no virtual-server channels should be documented

---

### Edge Cases

- What happens to existing Virtual Server configurations if a user had saved any? (Assumption: Any orphaned configuration data can be safely ignored as it will not be loaded)
- What if other code inadvertently depends on Virtual Server types? (Build will fail, serving as detection mechanism)

## Requirements *(mandatory)*

### Functional Requirements

#### Source Code Removal

- **FR-001**: System MUST remove the VirtualServer service implementation (`src/main/services/VirtualServer.ts`)
- **FR-002**: System MUST remove Virtual Server IPC handlers (`src/main/ipc/virtual-server.ts`)
- **FR-003**: System MUST remove Virtual Server type definitions (`src/shared/types/virtual-server.ts`)
- **FR-004**: System MUST remove Virtual Server Zustand store (`src/renderer/stores/virtualServerStore.ts`)
- **FR-005**: System MUST remove all Virtual Server UI components (`src/renderer/components/virtual-server/` directory)

#### Integration Point Cleanup

- **FR-006**: System MUST remove Virtual Server IPC channel constants from `src/shared/constants/ipc-channels.ts`
- **FR-007**: System MUST remove Virtual Server API exposure from preload script (`src/preload/index.ts`)
- **FR-008**: System MUST remove Virtual Server exports from service index (`src/main/services/index.ts`)
- **FR-009**: System MUST remove Virtual Server type re-exports from types index (`src/shared/types/index.ts`)
- **FR-010**: System MUST remove VirtualServerPanel from application layout (`src/renderer/App.tsx`)
- **FR-011**: System MUST remove Virtual Server handler registration from IPC index (`src/main/ipc/index.ts`)

#### Documentation Updates

- **FR-012**: Specification document (`specs/002-iiot-protocol-studio/spec.md`) MUST have User Story 5 (Virtual Server for Testing) removed
- **FR-013**: Implementation plan (`specs/002-iiot-protocol-studio/plan.md`) MUST have Phase 13 (Virtual Server) removed
- **FR-014**: Data model specification (`specs/002-iiot-protocol-studio/data-model.md`) MUST have VirtualServer, VirtualRegister, and Waveform interfaces removed
- **FR-015**: IPC contracts (`specs/002-iiot-protocol-studio/contracts/ipc-channels.md`) MUST have virtual-server channel definitions removed

#### Build Verification

- **FR-016**: Application MUST build successfully after all removals (no TypeScript errors)
- **FR-017**: Application MUST pass all existing tests after removals (tests specific to Virtual Server should be removed)

### Key Entities

This feature removes the following entities from the system:

- **VirtualServer** (REMOVED): Previously represented a simulated Modbus TCP server instance with port, status, and client connections
- **VirtualRegister** (REMOVED): Previously represented configurable register ranges for simulation
- **Waveform** (REMOVED): Previously represented data generation patterns (constant, sine, square, triangle, random)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application launches without any Virtual Server UI elements visible
- **SC-002**: Codebase contains zero files matching `*virtual-server*` or `*VirtualServer*` patterns in src/ directory
- **SC-003**: All 8 source code files identified for removal are deleted
- **SC-004**: All 6 integration point files are successfully modified to remove Virtual Server references
- **SC-005**: All 4 specification documents are updated to remove Virtual Server content
- **SC-006**: Application builds without TypeScript errors after all changes
- **SC-007**: All non-Virtual-Server tests pass after changes
- **SC-008**: Total lines of code removed is approximately 1,800+ lines (sum of identified files)

## Assumptions

- Any existing Virtual Server configuration data (if persisted) will be orphaned and safely ignored
- No external systems or users depend on the Virtual Server functionality
- The application's primary value proposition is as a Protocol Client, not a server simulator
- Test files related to Virtual Server functionality (if any) should also be removed

## Out of Scope

- Adding any replacement functionality for Virtual Server
- Migrating users from Virtual Server to alternative solutions
- Creating external documentation about the removal (only internal specs are updated)
