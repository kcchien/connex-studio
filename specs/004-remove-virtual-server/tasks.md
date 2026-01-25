# Tasks: Remove Virtual Server

**Input**: Design documents from `/specs/004-remove-virtual-server/`
**Prerequisites**: plan.md (complete), spec.md (complete)

**Organization**: Tasks are grouped by user story to enable independent verification. Since this is a removal task, User Stories can be executed sequentially (recommended) or US1+US2 can be done together since they both involve source code changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project Type**: Electron (Main + Renderer processes)
- **Source Root**: `src/`
- **Specs Root**: `specs/`

---

## Phase 1: Preparation

**Purpose**: Pre-deletion backup and verification

- [x] T001 Verify current build passes before changes: `pnpm typecheck && pnpm test`
- [x] T002 Create git checkpoint: `git stash` or ensure working tree is clean

**Checkpoint**: Clean baseline established

---

## Phase 2: User Story 1 - Clean Protocol Client Experience (Priority: P1) 🎯 MVP

**Goal**: Remove all Virtual Server UI elements so users see only Protocol Client functionality

**Independent Test**: Launch application and verify no Virtual Server panel, tab, or menu option is visible

### Implementation for User Story 1

**Step 2.1: Remove UI Components (no other code depends on these)**

- [x] T003 [P] [US1] Delete Virtual Server UI directory: `src/renderer/components/virtual-server/` (entire directory - 4 files, 742 lines)
- [x] T004 [P] [US1] Delete Virtual Server Zustand store: `src/renderer/stores/virtualServerStore.ts` (110 lines)

**Step 2.2: Remove UI Integration**

- [x] T005 [US1] Remove VirtualServerPanel import and usage from `src/renderer/App.tsx`

**Checkpoint**: UI layer removed - application should render without Virtual Server panel

---

## Phase 3: User Story 2 - Reduced Application Footprint (Priority: P2)

**Goal**: Remove all Virtual Server code from codebase to reduce maintenance burden

**Independent Test**: Search codebase for "virtual-server" or "VirtualServer" - no matches should be found in src/

### Implementation for User Story 2

**Step 3.1: Remove IPC and Service Layer**

- [x] T006 [P] [US2] Delete Virtual Server IPC handlers: `src/main/ipc/virtual-server.ts` (124 lines)
- [x] T007 [P] [US2] Delete Virtual Server service implementation: `src/main/services/VirtualServer.ts` (721 lines)

**Step 3.2: Remove Type Definitions**

- [x] T008 [US2] Delete Virtual Server type definitions: `src/shared/types/virtual-server.ts` (62 lines)

**Step 3.3: Clean Integration Points (remove imports/exports)**

- [x] T009 [P] [US2] Remove Virtual Server handler registration from `src/main/ipc/index.ts`
- [x] T010 [P] [US2] Remove Virtual Server exports from `src/main/services/index.ts`
- [x] T011 [P] [US2] Remove Virtual Server type re-exports from `src/shared/types/index.ts`

**Step 3.4: Remove API Exposure**

- [x] T012 [US2] Remove virtualServer API from preload script: `src/preload/index.ts`

**Step 3.5: Remove IPC Channel Constants**

- [x] T013 [US2] Remove VIRTUAL_SERVER_START, VIRTUAL_SERVER_STOP, VIRTUAL_SERVER_STATUS channels from `src/shared/constants/ipc-channels.ts`

**Step 3.6: Remove Test Files (if any exist)**

- [x] T014 [US2] Search and remove any Virtual Server related test files in `tests/` directory

**Checkpoint**: All source code removed - build should pass: `pnpm typecheck`

---

## Phase 4: User Story 3 - Updated Documentation (Priority: P3)

**Goal**: Update specification documents to reflect Connex Studio as a Protocol Client only tool

**Independent Test**: Grep specification documents for "Virtual Server" - no matches should be found

### Implementation for User Story 3

**Step 4.1: Update Main Spec**

- [x] T015 [P] [US3] Remove User Story 5 (Virtual Server for Testing) from `specs/002-iiot-protocol-studio/spec.md`

**Step 4.2: Update Implementation Plan**

- [x] T016 [P] [US3] Remove Phase 13 (Virtual Server) and VirtualServer.ts reference from `specs/002-iiot-protocol-studio/plan.md`

**Step 4.3: Update Data Model**

- [x] T017 [P] [US3] Remove VirtualServer, VirtualRegister, and Waveform interfaces from `specs/002-iiot-protocol-studio/data-model.md`

**Step 4.4: Update IPC Contracts**

- [x] T018 [P] [US3] Remove virtual-server:start, virtual-server:stop, virtual-server:status channels from `specs/002-iiot-protocol-studio/contracts/ipc-channels.md`

**Checkpoint**: Documentation updated - grep verification passes

---

## Phase 5: Verification & Polish

**Purpose**: Final verification and changelog update

- [x] T019 Run TypeScript type check: `pnpm typecheck`
- [x] T020 Run all tests: `pnpm test`
- [x] T021 Verify no Virtual Server files remain: `find src -name "*virtual-server*" -o -name "*VirtualServer*"`
- [x] T022 Verify no Virtual Server references in src/: `grep -r "virtual-server\|VirtualServer" src/ || echo "Clean"`
- [x] T023 Launch application and manually verify no Virtual Server UI elements
- [x] T024 Update `docs/CHANGELOG.md` with "Removed" section documenting Virtual Server removal

**Checkpoint**: All success criteria verified - feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Preparation
    ↓
Phase 2: User Story 1 (UI Removal)
    ↓
Phase 3: User Story 2 (Code Removal)
    ↓
Phase 4: User Story 3 (Documentation)
    ↓
Phase 5: Verification
```

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - can start after preparation
- **User Story 2 (P2)**: Can run in parallel with US1 or after (recommended: after US1 for cleaner commits)
- **User Story 3 (P3)**: No code dependencies - can run in parallel with US1/US2 but logically after code changes

### Parallel Opportunities

**Within User Story 1:**
```
T003 (delete UI directory) ‖ T004 (delete store)
         ↓
T005 (remove from App.tsx)
```

**Within User Story 2:**
```
T006 (delete IPC) ‖ T007 (delete service)
         ↓
T008 (delete types)
         ↓
T009 ‖ T010 ‖ T011 (clean index files)
         ↓
T012 (preload)
         ↓
T013 (channels)
         ↓
T014 (tests)
```

**Within User Story 3:**
```
T015 ‖ T016 ‖ T017 ‖ T018 (all spec docs can be edited in parallel)
```

---

## Implementation Strategy

### Recommended Approach: Sequential by Phase

1. **Phase 1**: Establish clean baseline
2. **Phase 2**: Remove UI (quick win - visible result)
3. **Phase 3**: Remove backend code (main deletion work)
4. **Phase 4**: Update documentation
5. **Phase 5**: Verify everything works

### Alternative: Aggressive Parallel

If multiple contributors available:

- **Contributor A**: Phase 2 (UI) + Phase 3.1-3.5 (code)
- **Contributor B**: Phase 4 (documentation)
- **All**: Phase 5 (verification)

### Commit Strategy

Recommended commits:
1. After T005: "chore: remove Virtual Server UI components"
2. After T013: "chore: remove Virtual Server backend code"
3. After T018: "docs: remove Virtual Server from specifications"
4. After T024: "docs: update CHANGELOG for Virtual Server removal"

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 24 |
| **User Story 1 Tasks** | 3 |
| **User Story 2 Tasks** | 9 |
| **User Story 3 Tasks** | 4 |
| **Setup/Verification Tasks** | 8 |
| **Parallel Opportunities** | 14 tasks marked [P] |
| **Files to Delete** | 8 |
| **Files to Modify** | 6 |
| **Spec Docs to Update** | 4 |
| **Estimated LOC Removed** | ~1,800 |

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- This is a **removal** feature - all tasks are deletions or modifications, no new code
- Build verification (T019-T022) catches any missed dependencies
- Manual UI verification (T023) confirms user-facing success criteria
