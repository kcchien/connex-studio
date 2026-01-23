# Implementation Plan: MVP Protocol Clients

**Branch**: `001-mvp-protocol-clients` | **Date**: 2026-01-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-mvp-protocol-clients/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

以 Electron 打造跨平台工業通訊協定連接與測試工具 MVP，支援 Modbus TCP、MQTT、OPC UA 三協定客戶端。採用 Vite + electron-vite 現代化 Bundler、electron-builder 打包方案、ipcMain.handle/invoke 原生 IPC、Zustand 跨進程狀態管理，實現絲滑流暢的 60fps 使用者體驗。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS  
**Primary Dependencies**: 
- **App Shell**: Electron 34+
- **Frontend**: React 19, Shadcn/ui, Tailwind CSS
- **Bundler**: Vite 6.x + electron-vite
- **Packaging**: electron-builder
- **IPC**: ipcMain.handle / ipcRenderer.invoke (原生 Promise-based)
- **State Management**: Zustand (with IPC sync for cross-process state)
- **Protocols**: modbus-serial 8.x, node-opcua 2.x, mqtt.js 5.x
- **Charts**: uPlot 1.6.x (Canvas, 高效能 Sparklines), ECharts 5.x

**Storage**: better-sqlite3 11.x (timeseries 環形緩衝區), YAML (configuration)  
**Testing**: Vitest (renderer), Jest (main process), Playwright (E2E)  
**Target Platform**: Windows 10+, macOS 12+, Ubuntu 20.04+
**Project Type**: Electron (main + renderer multi-process)  
**Performance Goals**: 
- Super Grid 100+ Tags ≤ 50ms UI response
- Sparklines 1000 points @ 30 sec
- 60 fps animations
- Cold start ≤ 5s

**Constraints**: 
- Memory ≤ 200MB for 5-min DVR buffer (100 Tags @ 500ms)
- Offline-capable (no cloud dependency)

**Scale/Scope**: MVP 單用戶桌面應用，100+ Tags 同時監控

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | 遵循 spec.md，Reference v3 Spec |
| II. Single Configuration Source | ✅ PASS | YAML for connections, tags |
| III. Stability First | ✅ PASS | 版本鎖定: Node 22, Electron 34+, TS 5.x |
| IV. Intent-Driven Development | ✅ PASS | 每個模組對應 spec 的 User Story |
| V. Minimum Viable Complexity | ✅ PASS | electron-vite 標準架構，無額外抽象層 |
| VI. Constitution Is Law | ✅ PASS | 技術選型更新需記錄於 plan |

**技術選型變更說明**（相對於 Constitution v1.0.1）：
- IPC: `electron-trpc` → `ipcMain.handle/invoke` — 減少依賴複雜度，原生 API 更穩定
- Bundler: 明確採用 `electron-vite` — 整合 Vite 與 Electron 的標準方案

## Project Structure

### Documentation (this feature)

```text
specs/001-mvp-protocol-clients/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (IPC contracts)
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
# Electron multi-process architecture (electron-vite standard)
src/
├── main/                    # Main process (Node.js)
│   ├── index.ts             # Electron entry point
│   ├── ipc/                 # IPC handlers
│   │   ├── modbus.ts        # Modbus IPC handlers
│   │   ├── mqtt.ts          # MQTT IPC handlers
│   │   ├── opcua.ts         # OPC UA IPC handlers
│   │   └── config.ts        # Configuration IPC handlers
│   ├── protocols/           # Protocol client implementations
│   │   ├── base.ts          # Abstract protocol interface
│   │   ├── modbus/          # Modbus TCP client
│   │   ├── mqtt/            # MQTT client
│   │   └── opcua/           # OPC UA client
│   ├── virtual-server/      # Virtual Modbus Server
│   │   ├── modbus-slave.ts
│   │   └── waveform.ts
│   └── storage/             # Data persistence
│       ├── ring-buffer.ts   # 5-min DVR buffer
│       └── config-store.ts  # YAML config manager
│
├── renderer/                # Renderer process (React)
│   ├── index.html
│   ├── main.tsx             # React entry
│   ├── App.tsx
│   ├── components/          # UI components
│   │   ├── super-grid/      # Super Grid with Sparklines
│   │   ├── connection/      # Connection forms
│   │   ├── dvr/             # Data DVR controls
│   │   └── layout/          # Shell, sidebar, etc.
│   ├── stores/              # Zustand stores
│   │   ├── connection.ts    # Connection state
│   │   ├── tags.ts          # Tag values state
│   │   └── dvr.ts           # DVR playback state
│   ├── hooks/               # Custom React hooks
│   │   └── useIpc.ts        # IPC invoke wrapper
│   └── styles/              # Tailwind CSS
│
├── preload/                 # Preload scripts
│   └── index.ts             # contextBridge API exposure
│
└── shared/                  # Shared types (main + renderer)
    ├── types/               # TypeScript interfaces
    │   ├── connection.ts
    │   ├── tag.ts
    │   └── ipc.ts           # IPC channel contracts
    └── constants/           # Shared constants

tests/
├── unit/                    # Unit tests
│   ├── main/                # Main process tests (Jest)
│   └── renderer/            # Renderer tests (Vitest)
├── integration/             # Integration tests
└── e2e/                     # Playwright E2E tests
```

**Structure Decision**: 採用 electron-vite 標準的 main/renderer/preload 三層架構，shared 資料夾存放跨進程共用的 TypeScript 型別定義。

## Complexity Tracking

> 無違規項目需要 justify，技術選型符合 Constitution 原則。

| Item | Status |
|------|--------|
| Constitution violations | None |
| Extra abstraction layers | None (原生 IPC, 無 tRPC) |
| Additional modules beyond spec | None |

---

## Implementation Phases

### Dependency Graph

```
Phase 0: Foundation
┌─────────────────────────────────────────────────────────────────┐
│  [0.1] electron-vite scaffold ──► [0.2] shared types            │
│              │                         │                        │
│              ▼                         ▼                        │
│  [0.3] preload bridge ◄─────────► [0.4] Zustand IPC sync        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Phase 1: Protocol Layer (parallel)
┌─────────────────────────────────────────────────────────────────┐
│  [1.1] Modbus ──┬── [1.2] MQTT ──┬── [1.3] OPC UA               │
│        │        │        │       │        │                     │
│        └────────┴────────┴───────┴────────┘                     │
│                          │                                       │
│                          ▼                                       │
│              [1.4] Connection Manager                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Phase 2: Data Layer
┌─────────────────────────────────────────────────────────────────┐
│  [2.1] Ring Buffer ──► [2.2] DVR Controller ──► [2.3] State Sync│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Phase 3: UI Layer (parallel after Phase 0)
┌─────────────────────────────────────────────────────────────────┐
│  [3.1] App Shell ──► [3.2] Connection Forms                     │
│        │                    │                                   │
│        ▼                    ▼                                   │
│  [3.3] Super Grid ◄─── [3.4] Sparklines ◄─── [3.5] DVR Controls │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Phase 4: Virtual Server
┌─────────────────────────────────────────────────────────────────┐
│  [4.1] Modbus Slave ──► [4.2] Waveform Generator                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 0: Foundation (Week 1)

| Step | Task | Reference | Output |
|------|------|-----------|--------|
| 0.1 | **electron-vite 專案初始化** | [research.md#1](research.md#1-electron-vite-專案架構) | `electron.vite.config.ts`, 基本 main/renderer/preload 結構 |
| 0.2 | **定義共用型別** | [contracts/types.md](contracts/types.md) | `src/shared/types/*.ts` 完整實作 |
| 0.3 | **Preload bridge 實作** | [research.md#3](research.md#3-zustand-跨進程狀態管理) (Preload Bridge) | `src/preload/index.ts` |
| 0.4 | **Zustand IPC 同步機制** | [research.md#3](research.md#3-zustand-跨進程狀態管理), [contracts/ipc-channels.md#state](contracts/ipc-channels.md#state-channels) | `src/main/store.ts`, `src/renderer/stores/*.ts` |

**驗證點**: `pnpm dev` 可啟動，Renderer 能透過 IPC 取得 Main process 狀態。

---

### Phase 1: Protocol Layer (Week 2-3)

> ⚠️ 1.1-1.3 可平行開發，但需 1.4 整合

| Step | Task | Reference | Output |
|------|------|-----------|--------|
| 1.1 | **Modbus TCP Client** | [research.md#5](research.md#5-協定函式庫整合) (modbus-serial), [data-model.md#ModbusConfig](data-model.md#protocol-configs) | `src/main/protocols/modbus/client.ts` |
| 1.2 | **MQTT Client** | [research.md#5](research.md#5-協定函式庫整合) (mqtt.js), [data-model.md#MqttConfig](data-model.md#protocol-configs) | `src/main/protocols/mqtt/client.ts` |
| 1.3 | **OPC UA Client** | [research.md#5](research.md#5-協定函式庫整合) (node-opcua), [data-model.md#OpcuaConfig](data-model.md#protocol-configs) | `src/main/protocols/opcua/client.ts` |
| 1.4 | **Connection Manager** | [data-model.md#Connection](data-model.md#connection), [data-model.md#State-Transitions](data-model.md#state-transitions) | `src/main/protocols/manager.ts` |
| 1.5 | **IPC Handlers 註冊** | [contracts/ipc-channels.md#connection](contracts/ipc-channels.md#connection-channels), [contracts/ipc-channels.md#modbus](contracts/ipc-channels.md#modbus-channels) | `src/main/ipc/*.ts` |

**驗證點**: 可透過 IPC 建立 Modbus/MQTT/OPC UA 連線並讀取數據。

---

### Phase 2: Data Layer (Week 3)

| Step | Task | Reference | Output |
|------|------|-----------|--------|
| 2.1 | **Ring Buffer 實作** | [data-model.md#DataPoint](data-model.md#datapoint) (Storage Strategy) | `src/main/storage/ring-buffer.ts` |
| 2.2 | **DVR Controller** | [contracts/ipc-channels.md#dvr](contracts/ipc-channels.md#dvr-channels), [data-model.md#DvrState](data-model.md#dvrstate) | `src/main/storage/dvr-controller.ts` |
| 2.3 | **State Sync 優化** | [research.md#3](research.md#3-zustand-跨進程狀態管理) (高頻更新 batch) | 更新 `src/main/store.ts` |

**驗證點**: 5 分鐘數據緩衝可用，DVR seek 返回正確快照。

---

### Phase 3: UI Layer (Week 2-4, parallel with Phase 1)

> ⚠️ 3.1 完成後，3.2-3.5 可平行開發

| Step | Task | Reference | Output |
|------|------|-----------|--------|
| 3.1 | **App Shell & Layout** | [spec.md#FR-022](spec.md) (Dark Mode) | `src/renderer/components/layout/` |
| 3.2 | **Connection Forms** | [data-model.md#Protocol-Configs](data-model.md#protocol-configs), [spec.md#US-1](spec.md#user-story-1) | `src/renderer/components/connection/` |
| 3.3 | **Super Grid 表格** | [research.md#4](research.md#4-高效能渲染策略) (TanStack Virtual), [data-model.md#Tag](data-model.md#tag) | `src/renderer/components/super-grid/` |
| 3.4 | **Sparklines 微趨勢圖** | [research.md#4](research.md#4-高效能渲染策略) (uPlot), [spec.md#FR-011](spec.md) | `src/renderer/components/super-grid/Sparkline.tsx` |
| 3.5 | **DVR 時間軸控制** | [spec.md#US-6](spec.md#user-story-6), [contracts/ipc-channels.md#dvr](contracts/ipc-channels.md#dvr-channels) | `src/renderer/components/dvr/` |

**驗證點**: 100 Tags @ 500ms 輪詢，UI 保持 60fps。

---

### Phase 4: Virtual Server (Week 4)

| Step | Task | Reference | Output |
|------|------|-----------|--------|
| 4.1 | **Modbus TCP Slave** | [data-model.md#VirtualServer](data-model.md#virtualserver), [spec.md#US-2](spec.md#user-story-2) | `src/main/virtual-server/modbus-slave.ts` |
| 4.2 | **Waveform Generator** | [data-model.md#Waveform](data-model.md#waveform), [spec.md#FR-019](spec.md) | `src/main/virtual-server/waveform.ts` |
| 4.3 | **Virtual Server IPC** | [contracts/ipc-channels.md#virtual-server](contracts/ipc-channels.md#virtual-server-channels) | `src/main/ipc/virtual-server.ts` |

**驗證點**: Virtual Server 可被外部 Modbus 客戶端連線，Waveform 正確產生。

---

### Phase 5: Polish & Testing (Week 5)

| Step | Task | Reference | Output |
|------|------|-----------|--------|
| 5.1 | **Error Handling** | [contracts/ipc-channels.md#error-codes](contracts/ipc-channels.md#error-codes) | 統一錯誤處理 |
| 5.2 | **Unit Tests** | [quickstart.md#7](quickstart.md#7-測試策略) | `tests/unit/` |
| 5.3 | **E2E Tests** | [spec.md#Success-Criteria](spec.md#success-criteria) | `tests/e2e/` |
| 5.4 | **Cross-platform Build** | [research.md#2](research.md#2-electron-builder-打包策略) | `electron-builder.yml` |

**驗證點**: 所有 Success Criteria 測試通過。

---

## Cross-Reference Index

快速查找各主題的詳細資訊：

| Topic | Primary Reference | Secondary References |
|-------|-------------------|---------------------|
| **Electron 架構** | [research.md#1](research.md#1-electron-vite-專案架構) | [quickstart.md#4](quickstart.md#4-專案結構導覽) |
| **IPC 通道定義** | [contracts/ipc-channels.md](contracts/ipc-channels.md) | [contracts/types.md#ipc.ts](contracts/types.md#ipc.ts) |
| **資料模型** | [data-model.md](data-model.md) | [contracts/types.md](contracts/types.md) |
| **狀態管理** | [research.md#3](research.md#3-zustand-跨進程狀態管理) | [contracts/ipc-channels.md#state](contracts/ipc-channels.md#state-channels) |
| **高效能渲染** | [research.md#4](research.md#4-高效能渲染策略) | [spec.md#SC-002](spec.md#success-criteria) |
| **協定函式庫** | [research.md#5](research.md#5-協定函式庫整合) | [data-model.md#Protocol-Configs](data-model.md#protocol-configs) |
| **驗收條件** | [spec.md#User-Scenarios](spec.md#user-scenarios--testing-mandatory) | [spec.md#Success-Criteria](spec.md#success-criteria) |
