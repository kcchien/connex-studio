# Quickstart: MVP Protocol Clients

**目標讀者**: 新加入的開發者  
**預計時間**: 30 分鐘

---

## 1. 環境需求

| 工具 | 版本 | 驗證指令 |
|------|------|----------|
| Node.js | 22 LTS | `node -v` |
| pnpm | 9.x | `pnpm -v` |
| Git | 2.x | `git --version` |

**作業系統支援**: Windows 10+, macOS 12+, Ubuntu 20.04+

---

## 2. 專案初始化

```bash
# Clone repository
git clone <repo-url> connex-studio
cd connex-studio

# 切換到 feature branch
git checkout 001-mvp-protocol-clients

# 安裝依賴
pnpm install

# 重建原生模組
pnpm rebuild
```

---

## 3. 開發伺服器啟動

```bash
# 啟動開發模式（HMR 支援）
pnpm dev
```

這會同時啟動：
- Vite dev server (renderer process)
- Electron main process
- Hot Module Replacement

**首次啟動預期**:
1. 終端顯示 Vite 啟動訊息
2. Electron 視窗在 ~3 秒內開啟
3. React DevTools 可用於 Renderer process

---

## 4. 專案結構導覽

```
src/
├── main/                 # Main Process (Node.js)
│   ├── index.ts          # Electron 入口
│   ├── ipc/              # IPC handlers
│   └── protocols/        # 協定客戶端
│
├── renderer/             # Renderer Process (React)
│   ├── main.tsx          # React 入口
│   ├── components/       # UI 元件
│   └── stores/           # Zustand stores
│
├── preload/              # Preload scripts
│   └── index.ts          # contextBridge API
│
└── shared/               # 共用型別
    └── types/            # TypeScript interfaces
```

**關鍵檔案**:
- `electron.vite.config.ts` - Vite + Electron 配置
- `src/shared/types/ipc.ts` - IPC channel 定義
- `src/main/protocols/base.ts` - 協定抽象介面

---

## 5. 常用開發指令

```bash
# 開發模式
pnpm dev

# 型別檢查
pnpm typecheck

# Lint
pnpm lint

# 單元測試
pnpm test

# E2E 測試
pnpm test:e2e

# 建置 production
pnpm build

# 打包（目前平台）
pnpm package

# 打包（所有平台）
pnpm package:all
```

---

## 6. 新增功能開發流程

### 6.1 新增 IPC Channel

1. 定義型別 (`src/shared/types/ipc.ts`)
2. 實作 handler (`src/main/ipc/*.ts`)
3. 註冊 handler (`src/main/index.ts`)
4. Renderer 端呼叫 (`window.api.invoke()`)

**範例 - 新增讀取溫度 channel:**

```ts
// 1. src/shared/types/ipc.ts
export const IPC_CHANNELS = {
  // ... existing
  TEMPERATURE_READ: 'temperature:read',
} as const

// 2. src/main/ipc/temperature.ts
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'

export function registerTemperatureHandlers() {
  ipcMain.handle(IPC_CHANNELS.TEMPERATURE_READ, async (_, deviceId: string) => {
    // implementation
    return { success: true, data: { value: 25.5 } }
  })
}

// 3. src/main/index.ts
import { registerTemperatureHandlers } from './ipc/temperature'
registerTemperatureHandlers()

// 4. src/renderer/hooks/useTemperature.ts
export function useTemperature(deviceId: string) {
  return useQuery({
    queryKey: ['temperature', deviceId],
    queryFn: () => window.api.invoke('temperature:read', deviceId)
  })
}
```

### 6.2 新增 UI 元件

1. 建立元件檔案 (`src/renderer/components/MyComponent.tsx`)
2. 使用 Shadcn/ui 基礎元件
3. 加入 Tailwind CSS 樣式
4. 連接 Zustand store

### 6.3 新增協定客戶端

1. 繼承 `BaseProtocolClient` (`src/main/protocols/base.ts`)
2. 實作必要方法
3. 註冊至 `ProtocolManager`
4. 建立對應 IPC handlers

---

## 7. 測試策略

| 層級 | 位置 | 框架 | 執行指令 |
|------|------|------|----------|
| Unit (Renderer) | `tests/unit/renderer/` | Vitest | `pnpm test:unit` |
| Unit (Main) | `tests/unit/main/` | Jest | `pnpm test:main` |
| Integration | `tests/integration/` | Vitest | `pnpm test:integration` |
| E2E | `tests/e2e/` | Playwright | `pnpm test:e2e` |

**測試優先順序**:
1. Protocol handlers (Main) - 核心業務邏輯
2. IPC channel contracts - 跨進程通訊
3. Zustand stores - 狀態管理
4. UI components - 使用者介面

---

## 8. 除錯技巧

### Main Process 除錯

```bash
# 啟動帶有 inspector 的開發模式
pnpm dev --inspect
```

然後在 Chrome 開啟 `chrome://inspect`

### Renderer Process 除錯

1. 按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux)
2. 使用 React DevTools 檢查元件樹
3. 使用 Sources 面板設定斷點

### IPC 追蹤

```ts
// src/main/index.ts (開發模式)
if (!app.isPackaged) {
  ipcMain.on('*', (event, ...args) => {
    console.log('[IPC]', event, args)
  })
}
```

---

## 9. 常見問題

### Q: 原生模組載入失敗

```bash
# 解決方案：重建原生模組
pnpm rebuild
```

### Q: HMR 不生效

確認 `electron.vite.config.ts` 中 renderer 配置正確，並檢查 Vite dev server 是否正在運行。

### Q: TypeScript 型別錯誤

```bash
# 重新生成型別
pnpm typecheck --build
```

### Q: Electron 視窗空白

檢查 Console 是否有錯誤，確認 preload script 正確載入：

```ts
// src/main/index.ts
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
}
```

---

## 10. 相關文件

| 文件 | 說明 |
|------|------|
| [spec.md](spec.md) | 功能規格 |
| [plan.md](plan.md) | 實作計畫 |
| [data-model.md](data-model.md) | 資料模型 |
| [contracts/ipc-channels.md](contracts/ipc-channels.md) | IPC 合約 |
| [contracts/types.md](contracts/types.md) | TypeScript 型別 |
| [research.md](research.md) | 技術研究 |

---

## 11. 下一步

1. 閱讀 [spec.md](spec.md) 了解功能需求
2. 查看 [data-model.md](data-model.md) 理解資料結構
3. 檢查 [contracts/](contracts/) 了解 IPC 介面
4. 執行 `pnpm dev` 開始開發！
