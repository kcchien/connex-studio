# Research: MVP Protocol Clients

**Date**: 2026-01-22  
**Phase**: 0 (Outline & Research)  
**Status**: Complete

---

## 1. electron-vite 專案架構

### Decision
採用 `electron-vite` 標準架構，配合 `@vitejs/plugin-react` 與 TypeScript。

### Rationale
electron-vite 提供開箱即用的 Vite + Electron 整合，自動處理 main/renderer/preload 三個進程的建置差異，內建 HMR 支援，並能正確處理原生模組。

### Key Pattern
```ts
// electron.vite.config.ts
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'node-opcua', 'modbus-serial']
      }
    }
  },
  preload: {
    build: { externalizeDeps: false }
  },
  renderer: {
    plugins: [react()]
  }
})
```

### Alternatives Rejected
- **手動 Vite + Electron 配置**: 過多 boilerplate
- **electron-forge + Vite plugin**: 配置複雜度較高
- **Webpack 方案**: HMR 較慢，配置繁瑣

---

## 2. electron-builder 打包策略

### Decision
使用 `electron-builder` 搭配 `nativeRebuilder: "sequential"` 進行跨平台打包。

### Rationale
electron-builder 有最佳的跨平台支援，自動處理原生模組重編譯，內建 auto-update 基礎設施。

### Key Pattern
```json
{
  "build": {
    "appId": "com.connexstudio.app",
    "productName": "Connex Studio",
    "nativeRebuilder": "sequential",
    "mac": { "target": ["dmg", "zip"] },
    "win": { "target": ["nsis"] },
    "linux": { "target": ["AppImage", "deb"] },
    "asarUnpack": ["**/*.node"]
  }
}
```

### Alternatives Rejected
- **electron-packager**: 無 auto-update，需手動處理原生模組
- **nativeRebuilder: "parallel"**: 複雜原生模組可能產生 race condition

---

## 3. Zustand 跨進程狀態管理

### Decision
Main process 為 single source of truth，使用 `zustand/vanilla`；Renderer 透過 IPC 同步。

### Rationale
避免狀態重複與 race condition。對於 500ms 輪詢頻率（2 updates/sec）完全在效能允許範圍內。

### Key Pattern

**Main Process (Source of Truth):**
```ts
// main/store.ts
import { createStore } from 'zustand/vanilla'

export const mainStore = createStore((set, get) => ({
  tags: new Map<string, TagValue>(),
  
  updateTag: (id: string, value: TagValue) => {
    set(state => {
      const tags = new Map(state.tags)
      tags.set(id, value)
      return { tags }
    })
    // Broadcast to renderers
    broadcastState(get())
  }
}))
```

**Preload Bridge:**
```ts
// preload/index.ts
contextBridge.exposeInMainWorld('storeAPI', {
  getState: () => ipcRenderer.invoke('state:get'),
  dispatch: (action, payload) => ipcRenderer.invoke('state:action', action, payload),
  subscribe: (cb) => ipcRenderer.on('state:update', (_, state) => cb(state))
})
```

**Renderer Hook:**
```ts
// renderer/hooks/useMainStore.ts
export const useMainStore = create((set) => ({ tags: new Map() }))

export function useSyncWithMain() {
  useEffect(() => {
    window.storeAPI.getState().then(state => useMainStore.setState(state))
    window.storeAPI.subscribe(state => useMainStore.setState(state))
  }, [])
}
```

### Alternatives Rejected
- **Redux + electron-redux**: 過度工程化
- **雙 Store 同步**: 狀態重複、race condition 風險
- **每個 component 直接 IPC**: 無集中狀態管理

---

## 4. 高效能渲染策略

### Decision
- **Sparklines**: uPlot（Canvas-based，50KB，100k+ points @ 60fps）
- **Super Grid**: TanStack Virtual 虛擬化

### Rationale
uPlot 專為時序資料設計，渲染效能極佳。TanStack Virtual 只渲染可見列，支援動態高度。

### Key Pattern

**uPlot Sparkline:**
```tsx
const opts: uPlot.Options = {
  width: 80,
  height: 24,
  cursor: { show: false },
  legend: { show: false },
  axes: [{ show: false }, { show: false }],
  series: [{}, { stroke: '#4CAF50', width: 1 }],
}
```

**TanStack Virtual:**
```tsx
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
  overscan: 5,
})
```

**60fps 動畫策略:**
1. 使用 `requestAnimationFrame`
2. 高頻更新用 ref + 直接 DOM 操作，避免 React state
3. 使用 CSS `transform` 和 `opacity`（GPU 加速）

### Alternatives Rejected
- **Chart.js / ECharts for Sparklines**: CPU 使用量高 10-40x
- **react-virtualized**: API 較舊，維護頻率低

---

## 5. 協定函式庫整合

### Decision
所有協定客戶端運行於 Main Process，使用 Singleton Manager pattern + 自動重連。

### Rationale
協定函式庫需要完整 Node.js 環境。Main process 提供穩定運行環境，透過 IPC 與 Renderer 通訊。

### Key Pattern

**modbus-serial:**
```ts
import ModbusRTU from 'modbus-serial'

const client = new ModbusRTU()
client.setTimeout(1000)
await client.connectTCP(host, { port })
client.setID(unitId)
```

**node-opcua:**
```ts
import { OPCUAClient } from 'node-opcua'

const client = OPCUAClient.create({
  connectionStrategy: { initialDelay: 1000, maxRetry: 3 },
})
await client.connect(endpointUrl)
const session = await client.createSession()
```

**mqtt.js:**
```ts
import mqtt from 'mqtt'

const client = mqtt.connect(brokerUrl, {
  reconnectPeriod: 1000,
  connectTimeout: 30000,
})
```

### Alternatives Rejected
- **UtilityProcess/Worker Threads**: 增加複雜度，Main process 足以處理
- **Renderer + nodeIntegration**: 安全風險，Electron 不推薦
- **獨立 Node.js server**: 過度工程化

---

## Dependencies Summary

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Bundler | electron-vite | 3.x | Vite + Electron 整合 |
| Bundler | @vitejs/plugin-react | 4.x | React HMR 支援 |
| Packaging | electron-builder | 25.x | 跨平台打包 |
| State | zustand | 5.x | 輕量狀態管理 |
| Charts | uplot | 1.6.x | 高效能 Canvas 圖表 |
| Virtual | @tanstack/react-virtual | 3.x | 列表虛擬化 |
| Protocol | modbus-serial | 8.x | Modbus TCP/RTU |
| Protocol | node-opcua | 2.x | OPC UA 客戶端 |
| Protocol | mqtt | 5.x | MQTT 客戶端 |
| Storage | better-sqlite3 | 11.x | 環形緩衝區儲存 |

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| electron-trpc vs 原生 IPC | 採用原生 ipcMain.handle/invoke，減少依賴 |
| Main vs Renderer 狀態管理 | Main process 為 SSOT，Renderer 同步 |
| Sparklines 渲染方案 | uPlot Canvas，非 SVG/DOM |
| 虛擬化方案 | TanStack Virtual (headless) |
