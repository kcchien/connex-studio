# Connex Studio UI/UX Redesign - Implementation Tasks

> **For Claude:** Execute tasks in order. Each task has TDD test conditions. Mark `[x]` when complete.

**Goal:** Transform Connex Studio into a professional-grade IIoT tool with MQTTX-inspired UX

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 3.4, Radix UI, TanStack Virtual, uPlot, Vitest

---

## Phase 1: Project Setup

- [ ] T001 Verify dev environment runs with `pnpm dev`
  - **Test:** `pnpm dev` starts without errors, browser opens to localhost
  - **Pass Criteria:** Dev server running, no TypeScript errors

- [ ] T002 Verify test runner works with `pnpm test:unit`
  - **Test:** `pnpm test:unit` executes successfully
  - **Pass Criteria:** Test runner initializes, existing tests pass (or no tests exist yet)

- [ ] T003 Create branch `feat/ui-ux-redesign` from main
  - **Test:** `git branch --show-current` returns `feat/ui-ux-redesign`
  - **Pass Criteria:** Branch created and checked out

---

## Phase 2: SidebarV2 Component (Navigation Architecture)

### Task 2.1: SidebarV2 Test Setup

- [ ] T004 Create test file `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test:** File exists and imports testing utilities
  - **Pass Criteria:** `pnpm test:unit tests/renderer/components/layout/SidebarV2.test.tsx` runs (fails with module not found)

- [ ] T005 Write failing test: SidebarV2 renders new connection button
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test Code:**
    ```typescript
    it('renders new connection button at top', () => {
      render(<SidebarV2 connections={[]} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
      expect(screen.getByRole('button', { name: /new connection/i })).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test fails with "Cannot find module '@renderer/components/layout/SidebarV2'"

- [ ] T006 Write failing test: SidebarV2 displays connections directly
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test Code:**
    ```typescript
    it('displays connections directly in sidebar', () => {
      const mockConnections = [
        { id: '1', name: 'PLC-01', protocol: 'modbus-tcp', status: 'connected' },
        { id: '2', name: 'Broker', protocol: 'mqtt', status: 'disconnected' },
      ]
      render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
      expect(screen.getByText('PLC-01')).toBeInTheDocument()
      expect(screen.getByText('Broker')).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added, still fails (module not found)

- [ ] T007 Write failing test: SidebarV2 shows protocol badges
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test Code:**
    ```typescript
    it('shows protocol badge for each connection', () => {
      render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
      expect(screen.getByText('Modbus')).toBeInTheDocument()
      expect(screen.getByText('MQTT')).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T008 Write failing test: SidebarV2 shows connection status indicator
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test Code:**
    ```typescript
    it('shows connection status indicator', () => {
      render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
      const connectedIndicator = screen.getByTestId('status-1')
      expect(connectedIndicator).toHaveClass('bg-green-500')
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T009 Write failing test: SidebarV2 calls onSelectConnection when clicked
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test Code:**
    ```typescript
    it('calls onSelectConnection when connection clicked', () => {
      const onSelect = vi.fn()
      render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={onSelect} />)
      fireEvent.click(screen.getByText('PLC-01'))
      expect(onSelect).toHaveBeenCalledWith('1')
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T010 Write failing test: SidebarV2 collapses tools section by default
  - **File:** `tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Test Code:**
    ```typescript
    it('collapses tools section by default', () => {
      render(<SidebarV2 connections={mockConnections} onNewConnection={vi.fn()} onSelectConnection={vi.fn()} />)
      expect(screen.getByText('Tools')).toBeInTheDocument()
      expect(screen.queryByText('Bridge')).not.toBeVisible()
    })
    ```
  - **Pass Criteria:** All 6 tests written, all fail with module not found

### Task 2.2: SidebarV2 Implementation

- [ ] T011 Create SidebarV2 component file with basic structure
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** Component exports `SidebarV2` function
  - **Pass Criteria:** Import resolves, component renders empty aside

- [ ] T012 Implement SidebarV2 props interface
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Code:**
    ```typescript
    interface SidebarV2Props {
      connections: Connection[]
      selectedConnectionId?: string | null
      onNewConnection: () => void
      onSelectConnection: (id: string) => void
      userName?: string
    }
    ```
  - **Pass Criteria:** TypeScript compiles without errors

- [ ] T013 Implement protocol configuration mapping
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Code:**
    ```typescript
    const protocolConfig: Record<Protocol, { label: string; icon: typeof Cable; color: string }> = {
      'modbus-tcp': { label: 'Modbus', icon: Server, color: 'text-teal-400' },
      'mqtt': { label: 'MQTT', icon: Radio, color: 'text-green-400' },
      'opcua': { label: 'OPC UA', icon: Cable, color: 'text-purple-400' },
    }
    ```
  - **Pass Criteria:** Protocol config object defined

- [ ] T014 Implement status color mapping
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Code:**
    ```typescript
    const statusColors: Record<string, string> = {
      connected: 'bg-green-500',
      connecting: 'bg-yellow-500 animate-pulse',
      disconnected: 'bg-gray-500',
      error: 'bg-red-500',
    }
    ```
  - **Pass Criteria:** Status colors defined

- [ ] T015 Implement SidebarV2 logo section
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** Logo with gradient background renders
  - **Pass Criteria:** Test T004 still fails but component structure visible

- [ ] T016 Implement SidebarV2 new connection button
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** `pnpm test:unit` - T005 passes
  - **Pass Criteria:** "New Connection" button renders with gradient styling

- [ ] T017 Implement SidebarV2 connections list rendering
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** `pnpm test:unit` - T006 passes
  - **Pass Criteria:** Connections display with names

- [ ] T018 Implement SidebarV2 protocol badges
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** `pnpm test:unit` - T007 passes
  - **Pass Criteria:** Protocol labels show (Modbus, MQTT, OPC UA)

- [ ] T019 Implement SidebarV2 status indicators with data-testid
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** `pnpm test:unit` - T008 passes
  - **Pass Criteria:** Status dots with correct colors and testids

- [ ] T020 Implement SidebarV2 connection click handler
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** `pnpm test:unit` - T009 passes
  - **Pass Criteria:** onClick calls onSelectConnection with correct id

- [ ] T021 Implement SidebarV2 collapsible tools section
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** `pnpm test:unit` - T010 passes
  - **Pass Criteria:** Tools section collapsed by default, expands on click

- [ ] T022 Implement SidebarV2 footer with user avatar
  - **File:** `src/renderer/components/layout/SidebarV2.tsx`
  - **Test:** Visual inspection - footer with initials avatar
  - **Pass Criteria:** User section renders at bottom

- [ ] T023 Run all SidebarV2 tests and verify pass
  - **Test:** `pnpm test:unit tests/renderer/components/layout/SidebarV2.test.tsx`
  - **Pass Criteria:** All 6 tests pass (PASS)

- [ ] T024 Commit SidebarV2 component
  - **Command:** `git add src/renderer/components/layout/SidebarV2.tsx tests/renderer/components/layout/SidebarV2.test.tsx && git commit -m "feat(ui): add SidebarV2 with connection-centric navigation"`
  - **Pass Criteria:** Commit created successfully

---

## Phase 3: NewConnectionDialog Component

### Task 3.1: NewConnectionDialog Test Setup

- [ ] T025 Create test file `tests/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **File:** `tests/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **Test:** File exists with test setup
  - **Pass Criteria:** Test file created

- [ ] T026 Write failing test: renders protocol selection buttons
  - **File:** `tests/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **Test Code:**
    ```typescript
    it('renders protocol selection buttons', () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: /modbus tcp/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /mqtt/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /opc ua/i })).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test fails with module not found

- [ ] T027 Write failing test: shows only name and address fields by default
  - **Test Code:**
    ```typescript
    it('shows only name and address fields by default', () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
      expect(screen.queryByLabelText(/unit id/i)).not.toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T028 Write failing test: expands advanced options when clicked
  - **Test Code:**
    ```typescript
    it('expands advanced options when clicked', () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
      fireEvent.click(screen.getByText(/advanced options/i))
      expect(screen.getByLabelText(/unit id/i)).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T029 Write failing test: calls onSubmit with connection data
  - **Test Code:**
    ```typescript
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
    ```
  - **Pass Criteria:** Test added

- [ ] T030 Write failing test: shows test connection button
  - **Test Code:**
    ```typescript
    it('shows test connection button', () => {
      render(<NewConnectionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** All 5 tests written

### Task 3.2: NewConnectionDialog Implementation

- [ ] T031 Create NewConnectionDialog component file
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** Component exports and renders
  - **Pass Criteria:** Import resolves

- [ ] T032 Implement ConnectionFormData interface
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Code:**
    ```typescript
    export interface ConnectionFormData {
      name: string
      protocol: Protocol
      config: ModbusTcpConfig | MqttConfig | OpcUaConfig
    }
    ```
  - **Pass Criteria:** TypeScript compiles

- [ ] T033 Implement protocol selection UI with buttons
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** `pnpm test:unit` - T026 passes
  - **Pass Criteria:** 3 protocol buttons render

- [ ] T034 Implement name and address input fields
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** `pnpm test:unit` - T027 passes
  - **Pass Criteria:** Name and address fields with labels

- [ ] T035 Implement collapsible advanced options section
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** `pnpm test:unit` - T028 passes
  - **Pass Criteria:** Advanced options toggle works

- [ ] T036 Implement form submission handler
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** `pnpm test:unit` - T029 passes
  - **Pass Criteria:** onSubmit called with correct data

- [ ] T037 Implement test connection button
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** `pnpm test:unit` - T030 passes
  - **Pass Criteria:** Test Connection button renders

- [ ] T038 Add loading states for submit and test buttons
  - **File:** `src/renderer/components/connection/NewConnectionDialog.tsx`
  - **Test:** Visual inspection - spinner shows during async
  - **Pass Criteria:** Loader2 icon animates when isSubmitting/isTesting

- [ ] T039 Run all NewConnectionDialog tests and verify pass
  - **Test:** `pnpm test:unit tests/renderer/components/connection/NewConnectionDialog.test.tsx`
  - **Pass Criteria:** All 5 tests pass

- [ ] T040 Commit NewConnectionDialog component
  - **Command:** `git add src/renderer/components/connection/NewConnectionDialog.tsx tests/renderer/components/connection/NewConnectionDialog.test.tsx && git commit -m "feat(ui): add NewConnectionDialog with minimal fields"`
  - **Pass Criteria:** Commit created

---

## Phase 4: UI Store Navigation State

- [ ] T041 Create test file `tests/renderer/stores/uiStore.test.ts`
  - **File:** `tests/renderer/stores/uiStore.test.ts`
  - **Test:** File exists
  - **Pass Criteria:** Test file created

- [ ] T042 Write failing test: tracks new connection dialog state
  - **Test Code:**
    ```typescript
    it('tracks new connection dialog state', () => {
      expect(useUIStore.getState().newConnectionDialogOpen).toBe(false)
      useUIStore.getState().setNewConnectionDialogOpen(true)
      expect(useUIStore.getState().newConnectionDialogOpen).toBe(true)
    })
    ```
  - **Pass Criteria:** Test fails (function not found)

- [ ] T043 Write failing test: tracks tools section expanded state
  - **Test Code:**
    ```typescript
    it('tracks tools section expanded state', () => {
      expect(useUIStore.getState().toolsExpanded).toBe(false)
      useUIStore.getState().setToolsExpanded(true)
      expect(useUIStore.getState().toolsExpanded).toBe(true)
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T044 Add newConnectionDialogOpen state to uiStore
  - **File:** `src/renderer/stores/uiStore.ts`
  - **Test:** `pnpm test:unit` - T042 passes
  - **Pass Criteria:** State and setter work

- [ ] T045 Add toolsExpanded state to uiStore
  - **File:** `src/renderer/stores/uiStore.ts`
  - **Test:** `pnpm test:unit` - T043 passes
  - **Pass Criteria:** State and setter work

- [ ] T046 Run all uiStore tests and verify pass
  - **Test:** `pnpm test:unit tests/renderer/stores/uiStore.test.ts`
  - **Pass Criteria:** All tests pass

- [ ] T047 Commit uiStore updates
  - **Command:** `git add src/renderer/stores/uiStore.ts tests/renderer/stores/uiStore.test.ts && git commit -m "feat(store): add navigation state to uiStore"`
  - **Pass Criteria:** Commit created

---

## Phase 5: DataExplorer Component

### Task 5.1: DataExplorer Test Setup

- [ ] T048 Create test file `tests/renderer/components/explorer/DataExplorer.test.tsx`
  - **File:** `tests/renderer/components/explorer/DataExplorer.test.tsx`
  - **Test:** File exists with mock data
  - **Pass Criteria:** Test file created

- [ ] T049 Write failing test: renders connection header with status
  - **Test Code:**
    ```typescript
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
    ```
  - **Pass Criteria:** Test fails (module not found)

- [ ] T050 Write failing test: renders tag list with values and sparklines
  - **Test Code:**
    ```typescript
    it('renders tag list with values and sparklines', () => {
      render(<DataExplorer {...defaultProps} />)
      expect(screen.getByText('Temperature_01')).toBeInTheDocument()
      expect(screen.getByText('23.5')).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T051 Write failing test: shows tag details when tag selected
  - **Test Code:**
    ```typescript
    it('shows tag details when tag selected', () => {
      render(<DataExplorer {...defaultProps} />)
      fireEvent.click(screen.getByText('Temperature_01'))
      expect(screen.getByTestId('tag-details')).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T052 Write failing test: shows alarm state styling
  - **Test Code:**
    ```typescript
    it('shows alarm state styling', () => {
      render(<DataExplorer {...defaultProps} />)
      const warningRow = screen.getByText('Pressure_Main').closest('[data-testid="tag-row"]')
      expect(warningRow).toHaveClass('bg-yellow-500/10')
    })
    ```
  - **Pass Criteria:** All 4 tests written

### Task 5.2: DataExplorer Implementation

- [ ] T053 Create DataExplorer component file
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T054 Implement DataExplorer props interface
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Pass Criteria:** TypeScript compiles

- [ ] T055 Implement DataExplorer header section
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Test:** `pnpm test:unit` - T049 passes
  - **Pass Criteria:** Header with name, status, latency

- [ ] T056 Create TagRow component file
  - **File:** `src/renderer/components/explorer/TagRow.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T057 Implement TagRow with value display
  - **File:** `src/renderer/components/explorer/TagRow.tsx`
  - **Test:** `pnpm test:unit` - T050 passes
  - **Pass Criteria:** Tag name and value render

- [ ] T058 Implement TagRow alarm state styling
  - **File:** `src/renderer/components/explorer/TagRow.tsx`
  - **Test:** `pnpm test:unit` - T052 passes
  - **Pass Criteria:** Warning rows have yellow background

- [ ] T059 Create TagDetails component file
  - **File:** `src/renderer/components/explorer/TagDetails.tsx`
  - **Test:** Component exports with data-testid
  - **Pass Criteria:** Import resolves

- [ ] T060 Implement TagDetails panel with large value display
  - **File:** `src/renderer/components/explorer/TagDetails.tsx`
  - **Test:** `pnpm test:unit` - T051 passes
  - **Pass Criteria:** Details panel shows on selection

- [ ] T061 Implement DataExplorer tag selection state
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Test:** Click tag -> details panel appears
  - **Pass Criteria:** Selection state works

- [ ] T062 Implement DataExplorer search functionality
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Test:** Type in search -> tags filter
  - **Pass Criteria:** Filter works

- [ ] T063 Implement DataExplorer empty state
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Test:** Pass empty tags array -> empty state shows
  - **Pass Criteria:** Empty message with Add Tag CTA

- [ ] T064 Run all DataExplorer tests and verify pass
  - **Test:** `pnpm test:unit tests/renderer/components/explorer/`
  - **Pass Criteria:** All 4 tests pass

- [ ] T065 Commit DataExplorer components
  - **Command:** `git add src/renderer/components/explorer/ tests/renderer/components/explorer/ && git commit -m "feat(ui): add DataExplorer with inline sparklines and details panel"`
  - **Pass Criteria:** Commit created

---

## Phase 6: BatchTagDialog Component

### Task 6.1: BatchTagDialog Test Setup

- [ ] T066 Create test file `tests/renderer/components/tags/BatchTagDialog.test.tsx`
  - **File:** `tests/renderer/components/tags/BatchTagDialog.test.tsx`
  - **Test:** File exists
  - **Pass Criteria:** Test file created

- [ ] T067 Write failing test: renders three method tabs
  - **Test Code:**
    ```typescript
    it('renders three method tabs', () => {
      render(<BatchTagDialog open onOpenChange={vi.fn()} connectionId="1" onTagsCreated={vi.fn()} />)
      expect(screen.getByRole('tab', { name: /import/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /scan/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test fails

- [ ] T068 Write failing test: shows import tab by default with drag-drop
  - **Test Code:**
    ```typescript
    it('shows import tab by default with drag-drop zone', () => {
      render(<BatchTagDialog open onOpenChange={vi.fn()} connectionId="1" onTagsCreated={vi.fn()} />)
      expect(screen.getByText(/drag.*csv.*excel/i)).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T069 Write failing test: scan tab shows address range inputs
  - **Test Code:**
    ```typescript
    it('switches to scan tab and shows address range inputs', () => {
      render(<BatchTagDialog {...props} />)
      fireEvent.click(screen.getByRole('tab', { name: /scan/i }))
      expect(screen.getByLabelText(/start address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end address/i)).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** Test added

- [ ] T070 Write failing test: generate tab shows naming pattern input
  - **Test Code:**
    ```typescript
    it('switches to generate tab and shows naming pattern input', () => {
      render(<BatchTagDialog {...props} />)
      fireEvent.click(screen.getByRole('tab', { name: /generate/i }))
      expect(screen.getByLabelText(/naming pattern/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    })
    ```
  - **Pass Criteria:** All 4 tests written

### Task 6.2: BatchTagDialog Implementation

- [ ] T071 Create BatchTagDialog component file
  - **File:** `src/renderer/components/tags/BatchTagDialog.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T072 Implement BatchTagDialog with Radix Tabs
  - **File:** `src/renderer/components/tags/BatchTagDialog.tsx`
  - **Test:** `pnpm test:unit` - T067 passes
  - **Pass Criteria:** 3 tabs render

- [ ] T073 Create ImportTab component file
  - **File:** `src/renderer/components/tags/ImportTab.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T074 Implement ImportTab drag-drop zone
  - **File:** `src/renderer/components/tags/ImportTab.tsx`
  - **Test:** `pnpm test:unit` - T068 passes
  - **Pass Criteria:** Drag-drop UI renders

- [ ] T075 Implement ImportTab file parsing and preview
  - **File:** `src/renderer/components/tags/ImportTab.tsx`
  - **Test:** Manual - drop CSV -> preview shows
  - **Pass Criteria:** Parsed tags display with valid/invalid indicators

- [ ] T076 Implement ImportTab template download links
  - **File:** `src/renderer/components/tags/ImportTab.tsx`
  - **Test:** Template buttons render
  - **Pass Criteria:** Modbus/MQTT/OPC UA template links

- [ ] T077 Create ScanTab component file
  - **File:** `src/renderer/components/tags/ScanTab.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T078 Implement ScanTab address range inputs
  - **File:** `src/renderer/components/tags/ScanTab.tsx`
  - **Test:** `pnpm test:unit` - T069 passes
  - **Pass Criteria:** Start/End address inputs with labels

- [ ] T079 Implement ScanTab progress bar and results list
  - **File:** `src/renderer/components/tags/ScanTab.tsx`
  - **Test:** Manual - click scan -> progress shows
  - **Pass Criteria:** Progress bar animates, results show

- [ ] T080 Create GenerateTab component file
  - **File:** `src/renderer/components/tags/GenerateTab.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T081 Implement GenerateTab naming pattern input
  - **File:** `src/renderer/components/tags/GenerateTab.tsx`
  - **Test:** `pnpm test:unit` - T070 passes
  - **Pass Criteria:** Pattern and quantity inputs render

- [ ] T082 Implement GenerateTab preview with {N} substitution
  - **File:** `src/renderer/components/tags/GenerateTab.tsx`
  - **Test:** Type pattern -> preview updates live
  - **Pass Criteria:** Preview shows generated names

- [ ] T083 Run all BatchTagDialog tests and verify pass
  - **Test:** `pnpm test:unit tests/renderer/components/tags/`
  - **Pass Criteria:** All 4 tests pass

- [ ] T084 Commit BatchTagDialog components
  - **Command:** `git add src/renderer/components/tags/ tests/renderer/components/tags/ && git commit -m "feat(ui): add BatchTagDialog with import/scan/generate"`
  - **Pass Criteria:** Commit created

---

## Phase 7: Visual Style Updates

- [ ] T085 Update Tailwind config with brand colors
  - **File:** `tailwind.config.js`
  - **Code:** Add `brand-blue: '#0066FF'`, `brand-teal: '#00D4AA'`
  - **Test:** `pnpm dev` - no Tailwind errors
  - **Pass Criteria:** Colors available in classes

- [ ] T086 Add surface color hierarchy to Tailwind
  - **File:** `tailwind.config.js`
  - **Code:** Add `surface: { DEFAULT: '#111827', elevated: '#1F2937', active: '#374151' }`
  - **Pass Criteria:** Surface colors work

- [ ] T087 Add protocol colors to Tailwind
  - **File:** `tailwind.config.js`
  - **Code:** Add `protocol: { modbus: '#14B8A6', mqtt: '#22C55E', opcua: '#8B5CF6' }`
  - **Pass Criteria:** Protocol colors work

- [ ] T088 Add gradient background utilities
  - **File:** `tailwind.config.js`
  - **Code:** Add `backgroundImage: { 'gradient-brand': 'linear-gradient(135deg, #0066FF 0%, #00D4AA 100%)' }`
  - **Pass Criteria:** `bg-gradient-brand` class works

- [ ] T089 Add brand shadow utilities
  - **File:** `tailwind.config.js`
  - **Code:** Add `boxShadow: { 'brand': '0 4px 14px 0 rgba(0, 102, 255, 0.25)' }`
  - **Pass Criteria:** `shadow-brand` class works

- [ ] T090 Add animation utilities to globals.css
  - **File:** `src/renderer/styles/globals.css`
  - **Code:** Add `.animate-pulse-slow`, `.transition-lift`, `.hover-lift`
  - **Pass Criteria:** Animation classes work

- [ ] T091 Commit Tailwind config updates
  - **Command:** `git add tailwind.config.js src/renderer/styles/globals.css && git commit -m "style: add brand gradient and refined dark mode colors"`
  - **Pass Criteria:** Commit created

---

## Phase 8: Logo Component

- [ ] T092 Create Logo component file
  - **File:** `src/renderer/components/common/Logo.tsx`
  - **Test:** Component exports
  - **Pass Criteria:** Import resolves

- [ ] T093 Implement Logo with gradient fill
  - **File:** `src/renderer/components/common/Logo.tsx`
  - **Code:**
    ```typescript
    export function Logo({ size = 36 }: { size?: number }) {
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
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
  - **Test:** Visual inspection - gradient shows
  - **Pass Criteria:** Logo renders with blue-to-teal gradient

- [ ] T094 Add Logo size prop variants
  - **File:** `src/renderer/components/common/Logo.tsx`
  - **Test:** `<Logo size={24} />` renders smaller
  - **Pass Criteria:** Size prop works

- [ ] T095 Commit Logo component
  - **Command:** `git add src/renderer/components/common/Logo.tsx && git commit -m "style: add Logo component with brand gradient"`
  - **Pass Criteria:** Commit created

---

## Phase 9: Integration

- [ ] T096 Update AppShell to use SidebarV2
  - **File:** `src/renderer/components/layout/AppShell.tsx`
  - **Test:** `pnpm dev` - new sidebar renders
  - **Pass Criteria:** SidebarV2 replaces old sidebar

- [ ] T097 Wire NewConnectionDialog to uiStore
  - **File:** `src/renderer/components/layout/AppShell.tsx`
  - **Test:** Click "New Connection" -> dialog opens
  - **Pass Criteria:** Dialog state controlled by store

- [ ] T098 Wire SidebarV2 connection click to navigation
  - **File:** `src/renderer/components/layout/AppShell.tsx`
  - **Test:** Click connection -> DataExplorer shows
  - **Pass Criteria:** Navigation works

- [ ] T099 Add DataExplorer as main content when connection selected
  - **File:** `src/renderer/components/layout/AppShell.tsx`
  - **Test:** Select connection -> DataExplorer renders
  - **Pass Criteria:** Main area shows DataExplorer

- [ ] T100 Add BatchTagDialog trigger from DataExplorer
  - **File:** `src/renderer/components/explorer/DataExplorer.tsx`
  - **Test:** Click "Import" -> BatchTagDialog opens
  - **Pass Criteria:** Import button opens dialog

- [ ] T101 Run full test suite
  - **Test:** `pnpm test`
  - **Pass Criteria:** All tests pass

- [ ] T102 Manual E2E validation
  - **Test:**
    1. Start app (`pnpm dev`)
    2. Click "New Connection"
    3. Select Modbus TCP
    4. Enter name and address
    5. Click "Connect & Explore"
    6. Verify DataExplorer shows
    7. Click "Import"
    8. Verify BatchTagDialog opens
  - **Pass Criteria:** Full flow works

- [ ] T103 Commit integration changes
  - **Command:** `git add . && git commit -m "feat(ui): integrate new navigation and components"`
  - **Pass Criteria:** Commit created

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T001-T003 | Project Setup |
| 2 | T004-T024 | SidebarV2 Component |
| 3 | T025-T040 | NewConnectionDialog Component |
| 4 | T041-T047 | UI Store Navigation State |
| 5 | T048-T065 | DataExplorer Component |
| 6 | T066-T084 | BatchTagDialog Component |
| 7 | T085-T091 | Visual Style Updates |
| 8 | T092-T095 | Logo Component |
| 9 | T096-T103 | Integration |

**Total: 103 tasks**

---

## Execution Notes

1. **TDD Flow:** Each implementation task follows Red-Green-Refactor
   - Write failing test first
   - Implement minimal code to pass
   - Refactor if needed
   - Commit

2. **Test Commands:**
   - Single file: `pnpm test:unit path/to/test.tsx`
   - All unit tests: `pnpm test:unit`
   - Watch mode: `pnpm test:unit --watch`

3. **Commit Strategy:** One commit per logical unit (component complete with tests)

4. **Rollback:** If tests fail after implementation, use `git checkout -- <file>` to revert

---

*Generated: 2026-01-26*
