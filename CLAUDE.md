# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Connex Studio** is an Industrial IoT (IIoT) communication testing platform built with Electron, React, and TypeScript. It supports Modbus TCP, MQTT, and OPC UA protocols with real-time data visualization.

**Status**: MVP specification phase - source code structure is defined but not yet implemented.

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm rebuild          # Rebuild native modules (modbus-serial, better-sqlite3)
pnpm dev              # Start dev mode with HMR
pnpm dev --inspect    # Start with Node.js inspector for Main process debugging
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint check
pnpm lint --fix       # Auto-fix lint issues
pnpm test             # Run all tests
pnpm test:unit        # Renderer unit tests (Vitest)
pnpm test:main        # Main process unit tests (Jest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm build            # Production build
pnpm package          # Package for current platform
pnpm package:all      # Package for Windows/macOS/Linux
```

## Architecture

Electron multi-process architecture with electron-vite:

```
src/
├── main/              # Main Process (Node.js) - protocol clients, IPC handlers
│   ├── protocols/     # BaseProtocolClient abstract class + Modbus/MQTT/OPC UA
│   ├── ipc/           # IPC handlers (ipcMain.handle)
│   ├── virtual-server/# Modbus TCP slave simulator
│   └── storage/       # Ring buffer (DVR), config store
├── renderer/          # Renderer Process (React 19, Shadcn/ui, Tailwind)
│   ├── components/    # super-grid/, connection/, dvr/, layout/
│   ├── stores/        # Zustand stores (connection, tags, dvr)
│   └── hooks/         # useIpc.ts - IPC invoke wrapper
├── preload/           # contextBridge API (security boundary)
└── shared/            # TypeScript types shared across processes
    └── types/         # connection.ts, tag.ts, ipc.ts
```

**Key Design Patterns**:
- **SSOT**: Zustand store in Main process is authoritative; Renderer syncs via IPC
- **IPC Contracts**: `ipcMain.handle/invoke` with channels like `modbus:read`, `connection:connect`
- **Protocol Abstraction**: All clients extend `BaseProtocolClient` for uniform interface

## Constitution (Required Reading)

Read `.specify/memory/constitution.md` before making changes. Key principles:

1. **Spec-Driven**: Every feature must trace to spec.md requirements
2. **SSOT**: One source of truth for each data type
3. **Propose First**: For large/risky changes, present plan before execution
4. **Minimum Complexity**: Simplest maintainable solution wins

## Specification Documents

| Document | Purpose |
|----------|---------|
| `specs/002-iiot-protocol-studio/spec.md` | User stories, acceptance criteria |
| `specs/002-iiot-protocol-studio/plan.md` | Implementation phases, tech context |
| `specs/002-iiot-protocol-studio/data-model.md` | Entity definitions, state transitions |
| `specs/002-iiot-protocol-studio/contracts/ipc-channels.md` | IPC channel definitions |
| `specs/002-iiot-protocol-studio/contracts/types.ts` | TypeScript type contracts |
| `specs/002-iiot-protocol-studio/quickstart.md` | Dev environment setup |
| `specs/002-iiot-protocol-studio/research.md` | Technology decisions & rationale |

## IPC Pattern

```typescript
// Define channel in src/shared/types/ipc.ts
export const IPC_CHANNELS = {
  MODBUS_READ: 'modbus:read',
} as const

// Handler in src/main/ipc/modbus.ts
ipcMain.handle(IPC_CHANNELS.MODBUS_READ, async (_, params) => {
  return { success: true, data: { value: 42 } }
})

// Invoke from Renderer via preload bridge
const result = await window.api.invoke('modbus:read', params)
```

## Tech Stack

- **Runtime**: Node.js 22 LTS, Electron 40
- **Frontend**: React 19, Vite 6, Tailwind CSS, Shadcn/ui
- **State**: Zustand with cross-process sync
- **Protocols**: modbus-serial 8.x, mqtt.js 5.x, node-opcua 2.x
- **Charts**: uPlot (sparklines), ECharts
- **Storage**: better-sqlite3 (ring buffer), YAML (config)
- **Testing**: Vitest (renderer), Jest (main), Playwright (E2E)

## Performance Targets

- Super Grid with 100+ Tags: ≤50ms UI response
- Sparklines: 1000 points without frame drops
- All animations: 60 FPS
- Cold start: ≤5 seconds
- DVR buffer (100 Tags @ 500ms): ≤200MB memory

## Active Technologies
- TypeScript 5.x, Node.js 22 LTS (002-iiot-protocol-studio)
- better-sqlite3 (ring buffer for DVR), YAML (config files), JSON (profiles) (002-iiot-protocol-studio)
- better-sqlite3 (ring buffer for DVR, alert history), YAML (config export), JSON (profiles, dashboards) (003-pro-features-opcua)

## Recent Changes
- 002-iiot-protocol-studio: Added TypeScript 5.x, Node.js 22 LTS
