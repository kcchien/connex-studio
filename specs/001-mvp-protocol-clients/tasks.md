# 任務清單: MVP Protocol Clients

**Feature Branch**: `001-mvp-protocol-clients`  
**Generated**: 2026-01-22  
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

---

## Summary

| 指標 | 數值 |
|------|------|
| 總任務數 | 54 |
| Setup Phase 任務 | 8 |
| Foundational Phase 任務 | 6 |
| User Story 任務 | 36 |
| Polish Phase 任務 | 4 |

### 任務分布（按 User Story）

| User Story | Priority | 任務數 | 說明 |
|------------|----------|--------|------|
| US1 - Modbus TCP | P1 | 7 | 核心協定客戶端 |
| US2 - Virtual Server | P1 | 4 | 虛擬伺服器模擬 |
| US5 - Super Grid | P1 | 7 | 即時數據呈現 |
| US6 - Data DVR | P1 | 5 | 時光回溯功能 |
| US7 - 跨平台 | P1 | 3 | 應用程式打包 |
| US3 - MQTT | P2 | 5 | MQTT 客戶端 |
| US4 - OPC UA | P2 | 5 | OPC UA 客戶端 |

---

## Phase Mapping

> ⚠️ tasks.md 按 **User Story 優先級** 排序，非技術依賴順序。
> 技術依賴請參考 [plan.md#Dependency-Graph](plan.md#dependency-graph)。

| tasks.md Phase | plan.md Phase | 說明 |
|----------------|---------------|------|
| Phase 1-2 | Phase 0 | Setup + Foundational |
| Phase 3 (US1) | Phase 1.1, 1.4, 1.5 | Modbus TCP |
| Phase 4 (US2) | Phase 4 | Virtual Server |
| Phase 5 (US5) | Phase 3 | Super Grid UI |
| Phase 6 (US6) | Phase 2 | Data DVR |
| Phase 7 (US7) | Phase 5.4 | Cross-platform Build |
| Phase 8 (US3) | Phase 1.2 | MQTT (P2, 可與 US1 平行) |
| Phase 9 (US4) | Phase 1.3 | OPC UA (P2, 可與 US1 平行) |
| Phase 10 | Phase 5 | Polish & Testing |

---

## Phase 1: Setup（專案初始化）

> 目標：建立 electron-vite 專案骨架與開發環境

- [x] T001 執行 `pnpm create @nicepkg/electron-vite` 初始化專案
- [x] T002 [P] 安裝核心依賴：React 19, Tailwind CSS, Shadcn/ui
- [x] T003 [P] 安裝協定依賴：modbus-serial 8.x, mqtt.js 5.x, node-opcua 2.x
- [x] T004 [P] 安裝工具依賴：better-sqlite3 11.x, zustand, @tanstack/react-virtual
- [x] T005 [P] 安裝圖表依賴：uplot 1.6.x, echarts 5.x
- [x] T006 設定 electron.vite.config.ts（main/renderer/preload 入口點）
- [x] T007 設定 tailwind.config.ts 與 Shadcn/ui 初始化
- [x] T008 驗證：`pnpm dev` 可啟動空白 Electron 應用程式

---

## Phase 2: Foundational（阻塞前置任務）

> 目標：建立跨進程共用型別與 IPC 基礎設施
> ⚠️ 必須在所有 User Story 開始前完成

- [x] T009 建立共用型別結構 `src/shared/types/index.ts`（匯出點）
- [x] T010 [P] 實作連線型別 `src/shared/types/connection.ts`（依 [contracts/types.md](contracts/types.md#connection.ts)）
- [x] T011 [P] 實作 Tag 型別 `src/shared/types/tag.ts`（依 [contracts/types.md](contracts/types.md#tag.ts)）
- [x] T012 [P] 實作 IPC 通道型別 `src/shared/types/ipc.ts`（依 [contracts/types.md](contracts/types.md#ipc.ts)）
- [x] T013 實作 Preload Bridge `src/preload/index.ts`（contextBridge API 暴露）
- [x] T014 實作 Zustand Main Store `src/main/store.ts` 與 IPC 同步機制（依 [research.md#3](research.md#3-zustand-跨進程狀態管理)）

**驗證點**: Renderer 可透過 IPC 取得 Main process 狀態。

---

## Phase 3: User Story 1 — Modbus TCP 連線與數據讀取

> 🎯 目標：用戶可連線 Modbus TCP 設備並讀取 Holding Registers
> 📋 Story: [spec.md#US-1](spec.md#user-story-1)
> 
> **獨立測試**: 連線到任意 Modbus TCP Slave（或 Phase 6 的 Virtual Server）讀取 Register 值

- [x] T015 [US1] 實作 Protocol Base Interface `src/main/protocols/base.ts`
- [x] T016 [US1] 實作 Modbus TCP Client `src/main/protocols/modbus/client.ts`（依 [research.md#5](research.md#5-協定函式庫整合)）
- [x] T016a [US1] 實作 Byte Order 解析邏輯 `src/main/protocols/modbus/byte-order.ts`（依 [spec.md#FR-012a](spec.md)：Big-Endian 預設，支援 Little-Endian/Mid-Big/Mid-Little）
- [x] T017 [US1] 實作 Connection Manager `src/main/protocols/manager.ts`（依 [data-model.md#Connection](data-model.md#connection)，含自動重連機制 [FR-005](spec.md)）
- [x] T018 [US1] 實作 Modbus IPC Handlers `src/main/ipc/modbus.ts`（依 [contracts/ipc-channels.md#modbus](contracts/ipc-channels.md#modbus-channels)）
- [x] T019 [US1] 實作 Connection IPC Handlers `src/main/ipc/connection.ts`（依 [contracts/ipc-channels.md#connection](contracts/ipc-channels.md#connection-channels)）
- [x] T020 [US1] 實作 Renderer Connection Store `src/renderer/stores/connection.ts`

**驗證點**: 可透過 IPC 建立 Modbus TCP 連線並讀取 Holding Registers。

---

## Phase 4: User Story 2 — Virtual Modbus Server 模擬器

> 🎯 目標：用戶可啟動虛擬 Modbus Server 供外部客戶端連線
> 📋 Story: [spec.md#US-2](spec.md#user-story-2)
> 
> **獨立測試**: 啟動 Virtual Server 後使用任意 Modbus 客戶端工具連線

- [ ] T021 [US2] 實作 Virtual Server 型別 `src/shared/types/virtual-server.ts`（依 [contracts/types.md](contracts/types.md#virtual-server.ts)）
- [ ] T022 [US2] 實作 Modbus TCP Slave `src/main/virtual-server/modbus-slave.ts`（依 [data-model.md#VirtualServer](data-model.md#virtualserver)）
- [ ] T023 [US2] 實作 Waveform Generator `src/main/virtual-server/waveform.ts`（依 [data-model.md#Waveform](data-model.md#waveform)）
- [ ] T024 [US2] 實作 Virtual Server IPC Handlers `src/main/ipc/virtual-server.ts`（依 [contracts/ipc-channels.md#virtual-server](contracts/ipc-channels.md#virtual-server-channels)）

**驗證點**: Virtual Server 可被外部 Modbus 客戶端連線，Waveform 正確產生。

---

## Phase 5: User Story 5 — Super Grid 即時數據呈現與 Sparklines

> 🎯 目標：以高效能表格呈現即時數據與微型趨勢圖
> 📋 Story: [spec.md#US-5](spec.md#user-story-5)
> 
> **獨立測試**: 透過任一協定連線後觀察 Super Grid 表格與 Sparklines 即時更新

- [ ] T025 [US5] 實作 App Shell 與 Layout `src/renderer/components/layout/Shell.tsx`
- [ ] T026 [US5] 實作 Dark Mode 主題切換 `src/renderer/components/layout/ThemeProvider.tsx`
- [ ] T027 [US5] 實作 Connection Forms `src/renderer/components/connection/ModbusForm.tsx`
- [ ] T027a [US5] 實作 Byte Order 設定 UI `src/renderer/components/super-grid/ByteOrderSelector.tsx`（Connection 層級預設 + Tag 層級覆寫，依 [spec.md#FR-012a](spec.md)）
- [ ] T028 [US5] 實作 Super Grid 表格 `src/renderer/components/super-grid/Grid.tsx`（依 [research.md#4](research.md#4-高效能渲染策略)）
- [ ] T029 [US5] 實作 Sparklines 微趨勢圖 `src/renderer/components/super-grid/Sparkline.tsx`（uPlot Canvas）
- [ ] T030 [US5] 實作 Renderer Tags Store `src/renderer/stores/tags.ts`（含 30 秒數據緩衝）

**驗證點**: 100 Tags @ 500ms 輪詢，UI 保持 60fps，Sparklines 顯示過去 30 秒波形。

---

## Phase 6: User Story 6 — Data DVR 時光回溯

> 🎯 目標：用戶可暫停並回溯過去 5 分鐘的數據
> 📋 Story: [spec.md#US-6](spec.md#user-story-6)
> 
> **獨立測試**: 透過任一協定連線後，在任意時間點暫停並拖動時間軸驗證回溯

- [ ] T031 [US6] 實作 DVR 型別 `src/shared/types/dvr.ts`（依 [contracts/types.md](contracts/types.md#dvr.ts)）
- [ ] T032 [US6] 實作 Ring Buffer `src/main/storage/ring-buffer.ts`（依 [data-model.md#DataPoint](data-model.md#datapoint)）
- [ ] T033 [US6] 實作 DVR Controller `src/main/storage/dvr-controller.ts`（依 [contracts/ipc-channels.md#dvr](contracts/ipc-channels.md#dvr-channels)）
- [ ] T034 [US6] 實作 DVR Timeline UI `src/renderer/components/dvr/Timeline.tsx`
- [ ] T035 [US6] 實作 Renderer DVR Store `src/renderer/stores/dvr.ts`

**驗證點**: 5 分鐘數據緩衝可用，DVR seek 返回正確快照。

---

## Phase 7: User Story 7 — 跨平台桌面應用體驗

> 🎯 目標：在 Windows、macOS、Linux 上提供一致的原生桌面體驗
> 📋 Story: [spec.md#US-7](spec.md#user-story-7)
> 
> **獨立測試**: 在三個作業系統上分別啟動應用程式並執行基本連線操作

- [ ] T036 [US7] 設定 electron-builder.yml 跨平台打包配置（依 [research.md#2](research.md#2-electron-builder-打包策略)）
- [ ] T037 [US7] 實作 macOS Glassmorphism 效果 `src/renderer/components/layout/Sidebar.tsx`
- [ ] T038 [US7] 驗證跨平台啟動時間 ≤ 5 秒（Windows/macOS/Linux）

**驗證點**: 應用程式可在三個平台成功打包並啟動。

---

## Phase 8: User Story 3 — MQTT 客戶端連線與訂閱

> 🎯 目標：用戶可連線 MQTT Broker 並訂閱 Topic
> 📋 Story: [spec.md#US-3](spec.md#user-story-3)
> 
> **獨立測試**: 連線到公開 MQTT Broker（如 `test.mosquitto.org`）訂閱 Topic

- [ ] T039 [US3] 實作 MQTT Client `src/main/protocols/mqtt/client.ts`（依 [research.md#5](research.md#5-協定函式庫整合)）
- [ ] T040 [US3] 實作 MQTT IPC Handlers `src/main/ipc/mqtt.ts`（依 [contracts/ipc-channels.md#mqtt](contracts/ipc-channels.md#mqtt-channels)）
- [ ] T041 [US3] 實作 MQTT Connection Form `src/renderer/components/connection/MqttForm.tsx`
- [ ] T042 [US3] 實作 JSON Payload Viewer `src/renderer/components/response/JsonViewer.tsx`
- [ ] T043 [US3] 更新 Connection Manager 支援 MQTT 協定

**驗證點**: 可透過 IPC 建立 MQTT 連線並接收訂閱訊息。

---

## Phase 9: User Story 4 — OPC UA 客戶端連線與節點瀏覽

> 🎯 目標：用戶可連線 OPC UA Server 並瀏覽節點結構
> 📋 Story: [spec.md#US-4](spec.md#user-story-4)
> 
> **獨立測試**: 連線到公開 OPC UA Server 或內建 Virtual OPC UA Server

- [ ] T044 [US4] 實作 OPC UA Client `src/main/protocols/opcua/client.ts`（依 [research.md#5](research.md#5-協定函式庫整合)）
- [ ] T045 [US4] 實作 OPC UA IPC Handlers `src/main/ipc/opcua.ts`（依 [contracts/ipc-channels.md#opcua](contracts/ipc-channels.md#opcua-channels)）
- [ ] T046 [US4] 實作 OPC UA Connection Form `src/renderer/components/connection/OpcuaForm.tsx`
- [ ] T047 [US4] 實作 Node Browser Tree `src/renderer/components/opcua/NodeBrowser.tsx`
- [ ] T048 [US4] 更新 Connection Manager 支援 OPC UA 協定

**驗證點**: 可透過 IPC 建立 OPC UA 連線並瀏覽節點樹。

---

## Phase 10: Polish & Cross-Cutting Concerns

> 目標：統一錯誤處理、測試覆蓋、最終驗證

- [ ] T049 實作統一錯誤處理與 Error Codes `src/main/errors/index.ts`（依 [contracts/ipc-channels.md#error-codes](contracts/ipc-channels.md#error-codes)）
- [ ] T050 [P] 撰寫 Main Process 單元測試 `tests/unit/main/`（Jest）
- [ ] T051 [P] 撰寫 Renderer 單元測試 `tests/unit/renderer/`（Vitest）
- [ ] T052 撰寫 E2E 測試 `tests/e2e/`（Playwright，驗證所有 Success Criteria）

---

## Dependencies & Execution Order

### 依賴圖

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ─────────────────┐
    │                                    │
    ├──────────────────┬────────────────┼────────────────┐
    ▼                  ▼                ▼                ▼
Phase 3 (US1)     Phase 5 (US5)    Phase 6 (US6)   Phase 7 (US7)
Modbus TCP        Super Grid        Data DVR        跨平台
    │                  │                │
    ▼                  │                │
Phase 4 (US2)         │                │
Virtual Server        │                │
    │                  │                │
    └──────────────────┼────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    ▼                                     ▼
Phase 8 (US3)                        Phase 9 (US4)
MQTT                                 OPC UA
    │                                     │
    └─────────────────┬───────────────────┘
                      ▼
              Phase 10 (Polish)
```

### 平行執行機會

| 階段 | 可平行任務 | 說明 |
|------|------------|------|
| Phase 1 | T002, T003, T004, T005 | 依賴安裝互不影響 |
| Phase 2 | T010, T011, T012 | 型別定義互不依賴 |
| Phase 3-7 | Phase 5, 6, 7 可與 Phase 3 平行 | UI 層不阻塞協定層 |
| Phase 8-9 | Phase 8, 9 可平行 | MQTT 與 OPC UA 互不依賴 |
| Phase 10 | T050, T051 | 測試可平行撰寫 |

---

## Implementation Strategy

### MVP Scope（建議）

**MVP 最小範圍**: Phase 1-6 (T001-T035)
- Setup + Foundational
- US1 (Modbus TCP) + US2 (Virtual Server)
- US5 (Super Grid) + US6 (Data DVR)

**MVP 驗證**: 用戶可透過 Modbus TCP 連線（含 Virtual Server 自測）並在 Super Grid 即時監控數據，支援 DVR 回溯。

### 增量交付策略

1. **Sprint 1** (Week 1-2): Phase 1-4 → Modbus 完整功能
2. **Sprint 2** (Week 2-3): Phase 5-6 → 資料呈現與 DVR
3. **Sprint 3** (Week 4): Phase 7-9 → 跨平台 + MQTT + OPC UA
4. **Sprint 4** (Week 5): Phase 10 → 測試與 Polish

---

## Format Validation

✅ 所有 54 個任務皆遵循 checklist 格式：
- `- [ ]` checkbox
- `[TaskID]` 序號（T001-T052, T016a, T027a）
- `[P]` 平行標記（適用時）
- `[USx]` User Story 標籤（Phase 3-9）
- 描述含檔案路徑
