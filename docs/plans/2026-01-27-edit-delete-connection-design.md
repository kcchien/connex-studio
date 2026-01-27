# Edit & Delete Connection Feature Design

**Date**: 2026-01-27
**Status**: Approved

## Overview

新增「編輯連線」和「刪除連線」功能，改善連線管理的 UX。目前系統只能建立連線，若要修改設定必須刪除重建，體驗不佳。

## Design Decisions

| 決策項目 | 選擇 | 理由 |
|---------|------|------|
| 編輯後行為 | 自動重連 | 允許編輯已連線的連線，儲存後自動 disconnect → update → reconnect |
| UI 入口點 | ⋮ 更多選項按鈕 | 主次分明：高頻操作(Connect)直接可見，低頻操作(Edit/Delete)收納在選單 |
| 協議可否更改 | 不可更改 | 建立後固定，想換協議就刪除重建 |
| 刪除確認 | 需要確認對話框 | 破壞性操作，避免誤刪 |
| 已連線狀態刪除 | 必須先斷開 | 維持現有行為，避免意外刪除正在使用的連線 |

## Architecture

### SSOT Principle

**Main process 的 ConnectionManager 是唯一真相來源**，Renderer 只透過 IPC 同步狀態。

```
┌─────────────────────────────────────────────────────────────────┐
│ Renderer                          │ Main (SSOT)                 │
├───────────────────────────────────┼─────────────────────────────┤
│                                   │                             │
│ 1. User clicks Save               │                             │
│         │                         │                             │
│         ▼                         │                             │
│ 2. IPC invoke ─────────────────────▶ 3. ConnectionManager       │
│    'connection:update'            │    .updateConnection()      │
│                                   │         │                   │
│                                   │         ▼                   │
│                                   │    4. 更新內部狀態           │
│                                   │       (disconnect/reconnect)│
│                                   │         │                   │
│                                   │         ▼                   │
│ 6. connectionStore ◀─────────────── 5. IPC emit                 │
│    .updateConnection()            │    'connection:updated'     │
│    (sync from Main)               │    (帶完整 Connection 物件)  │
│                                   │                             │
└───────────────────────────────────┴─────────────────────────────┘
```

### Key Design Points

1. **Renderer 不直接修改 store** — EditConnectionDialog 只負責收集 input
2. **Main process 回傳完整物件** — IPC response 帶回更新後的完整 Connection 物件
3. **狀態變更走事件** — 連線狀態透過既有的 `connection:status-changed` 事件同步

## Components

### New Files

| 檔案 | 說明 |
|------|------|
| `src/renderer/components/connection/ConnectionMenu.tsx` | ⋮ 下拉選單元件 |
| `src/renderer/components/connection/EditConnectionDialog.tsx` | 編輯連線對話框 |
| `src/renderer/components/connection/DeleteConfirmDialog.tsx` | 刪除確認對話框 |

### Modified Files

| 檔案 | 變更內容 |
|------|----------|
| `src/shared/constants/ipc-channels.ts` | 新增 `CONNECTION_UPDATE` |
| `src/main/ipc/connection.ts` | 新增 `connection:update` handler |
| `src/main/services/ConnectionManager.ts` | 新增 `updateConnection()` 方法 |
| `src/renderer/components/connection/ConnectionCard.tsx` | 移除 Delete 按鈕，整合 ConnectionMenu |
| `src/renderer/hooks/useConnection.ts` | 新增 `update()` 方法 |
| `src/preload/index.ts` | 暴露 `connection.update` API |
| `src/shared/types/ipc.ts` | 新增 UpdateConnectionParams 型別 |

## UI Design

### ConnectionCard (Modified)

```
┌─────────────────────────────────────┐
│  My PLC                    ● ⋮     │  ← 狀態燈 + 更多選項
│  Modbus TCP · 192.168.1.100:502    │
│                                     │
│  [Connect]              ← 主要操作  │
└─────────────────────────────────────┘
```

### ConnectionMenu

```
┌─────────────────┐
│ ✏️  Edit        │
├─────────────────┤
│ 🗑️  Delete      │  ← disabled when connected
└─────────────────┘
```

### EditConnectionDialog

```
┌────────────────────────────────────┐
│ Edit Connection              [X]  │
├────────────────────────────────────┤
│ Protocol: [Modbus TCP] (disabled) │
│                                    │
│ Name:     [___________________]   │
│ Host:     [___________] Port:[__] │
│                                    │
│ ▶ Advanced Options                │
│                                    │
│        [Cancel] [Test] [Save]     │
└────────────────────────────────────┘
```

### DeleteConfirmDialog

```
┌────────────────────────────────────┐
│ Delete Connection                  │
├────────────────────────────────────┤
│ ⚠️ Are you sure you want to delete │
│ "My PLC"?                          │
│                                    │
│ This action cannot be undone.      │
│                                    │
│           [Cancel] [Delete]        │
└────────────────────────────────────┘
```

## Type Definitions

```typescript
// src/shared/types/connection.ts
export interface ConnectionUpdates {
  name?: string
  config?: Partial<ModbusTcpConfig> | Partial<MqttConfig> | Partial<OpcUaConfig>
}

// src/shared/types/ipc.ts
export interface UpdateConnectionParams {
  connectionId: string
  updates: ConnectionUpdates
}

export interface UpdateConnectionResult {
  success: boolean
  connection?: Connection
  error?: string
}
```

## ConnectionManager.updateConnection()

```typescript
// src/main/services/ConnectionManager.ts
async updateConnection(
  connectionId: string,
  updates: ConnectionUpdates
): Promise<Connection> {
  const conn = this.connections.get(connectionId)
  const wasConnected = conn.status === 'connected'

  // 1. Disconnect if connected
  if (wasConnected) await this.disconnect(connectionId)

  // 2. Apply updates (SSOT mutation happens here)
  conn.name = updates.name ?? conn.name
  conn.config = { ...conn.config, ...updates.config }

  // 3. Persist to storage
  this.saveConnections()

  // 4. Reconnect if was connected
  if (wasConnected) await this.connect(connectionId)

  // 5. Return updated connection
  return conn
}
```

## Implementation Order

```
Phase 1: Backend Foundation
├─ 1.1 Add CONNECTION_UPDATE IPC channel
├─ 1.2 ConnectionManager.updateConnection() method
└─ 1.3 connection.ts IPC handler

Phase 2: Frontend Bridge
├─ 2.1 Preload: expose connection.update API
└─ 2.2 useConnection hook: add update()

Phase 3: UI Components
├─ 3.1 DeleteConfirmDialog (simplest, do first)
├─ 3.2 ConnectionMenu
├─ 3.3 EditConnectionDialog
└─ 3.4 Modify ConnectionCard to integrate above
```

## Testing Strategy

| Level | Test Items |
|-------|------------|
| **Unit (Main)** | `ConnectionManager.updateConnection()` - verify disconnect → update → reconnect flow |
| **Unit (Renderer)** | `EditConnectionDialog` - form validation, initial field values |
| **Unit (Renderer)** | `DeleteConfirmDialog` - confirm/cancel callbacks |
| **E2E** | Full flow: create connection → edit → verify updated values |
| **E2E** | Delete flow: disconnect → delete → confirm → verify removed |

## Acceptance Criteria

- [ ] Edit connected connection → auto disconnect, apply new config, auto reconnect
- [ ] Edit disconnected connection → directly apply new config
- [ ] Protocol field is disabled/readonly in edit mode
- [ ] Delete option is disabled when connected
- [ ] Show confirmation dialog before delete
- [ ] All state changes follow SSOT (Main → Renderer unidirectional flow)
