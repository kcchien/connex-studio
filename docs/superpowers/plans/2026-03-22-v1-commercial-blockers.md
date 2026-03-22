# v1.0 商用發布阻擋項 — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除三個商用發布阻擋項（全域錯誤處理、自動更新、程式碼簽章配置），加上快速補齊項（LICENSE、跨平台 CI）

**Architecture:** 主行程加入未捕獲例外處理器 + 崩潰紀錄；渲染行程加入 React ErrorBoundary 包裹整個應用，錯誤透過既有 ToastContainer 回饋使用者；安裝 electron-updater 並在主行程初始化自動更新、渲染行程新增更新通知橫幅；electron-builder.yml 加入 publish 設定與簽章佔位配置。

**Tech Stack:** Electron 39, React 19, TypeScript, electron-updater, electron-log, Zustand, Tailwind CSS

---

## 檔案結構

### 新建檔案

| 檔案 | 職責 |
|------|------|
| `src/renderer/components/common/ErrorBoundary.tsx` | React ErrorBoundary — 捕獲渲染錯誤、顯示回退畫面 |
| `src/main/updater.ts` | 自動更新邏輯 — 初始化 electron-updater、發送事件到渲染行程 |
| `src/renderer/components/common/UpdateBanner.tsx` | 更新通知橫幅 — 顯示可用更新、下載進度、重啟按鈕 |
| `LICENSE` | MIT 授權文件 |
| `dev-app-update.yml` | 開發環境更新設定（electron-updater 開發用） |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/main/index.ts` | 加入 process.on('unhandledRejection'/'uncaughtException')、匯入 updater |
| `src/renderer/main.tsx` | 加入 window.onerror / onunhandledrejection、掛載 ErrorBoundary |
| `src/renderer/App.tsx` | 掛載 ToastContainer + UpdateBanner |
| `src/preload/index.ts` | 新增 updater IPC 通道（checkForUpdates, onUpdateAvailable, installUpdate） |
| `electron-builder.yml` | 加入 publish 設定（GitHub Releases） |
| `.github/workflows/ci.yml` | 加入 macOS / Windows 矩陣、建置產物上傳 |
| `package.json` | 加入 electron-updater 依賴 |

---

## Task 1: 全域錯誤處理 — 主行程

**Files:**
- Modify: `src/main/index.ts:9-11`

- [ ] **Step 1: 寫失敗測試 — 驗證未處理 rejection 處理器存在**

```typescript
// tests/unit/main/error-handling.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

describe('Main process error handling', () => {
  it('should have unhandledRejection handler registered', () => {
    const listeners = process.listeners('unhandledRejection')
    // At minimum, our handler should be registered
    expect(listeners.length).toBeGreaterThan(0)
  })

  it('should have uncaughtException handler registered', () => {
    const listeners = process.listeners('uncaughtException')
    expect(listeners.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `pnpm test:main -- --testPathPattern=error-handling`
Expected: FAIL — 沒有註冊處理器

- [ ] **Step 3: 在主行程加入全域錯誤處理器**

在 `src/main/index.ts` 的 electron-log 設定之後（約第 18 行後）加入：

```typescript
// Global error handlers — prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  // Show error dialog to user before crashing
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred:\n\n${error.message}\n\nThe application will restart.`
  )
  app.quit()
})
```

- [ ] **Step 4: 執行測試確認通過**

Run: `pnpm test:main -- --testPathPattern=error-handling`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/main/index.ts tests/unit/main/error-handling.test.ts
git commit -m "feat: add global error handlers to main process"
```

---

## Task 2: 全域錯誤處理 — 渲染行程（ErrorBoundary + 全域 handler）

**Files:**
- Create: `src/renderer/components/common/ErrorBoundary.tsx`
- Modify: `src/renderer/main.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: 寫 ErrorBoundary 元件測試**

```typescript
// tests/unit/renderer/components/ErrorBoundary.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@renderer/components/common/ErrorBoundary'

function ThrowError(): never {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console output in tests
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeDefined()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something went wrong/i)).toBeDefined()
  })

  it('shows reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /reload/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `pnpm test:unit -- --run --reporter=verbose tests/unit/renderer/components/ErrorBoundary.test.tsx`
Expected: FAIL — ErrorBoundary 不存在

- [ ] **Step 3: 建立 ErrorBoundary 元件**

```typescript
// src/renderer/components/common/ErrorBoundary.tsx
import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-[#0A0E14]">
          <div className="text-center max-w-md mx-auto p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Something Went Wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 4: 匯出 ErrorBoundary**

在 `src/renderer/components/common/index.ts` 加入：
```typescript
export { ErrorBoundary } from './ErrorBoundary'
```

- [ ] **Step 5: 在 main.tsx 掛載 ErrorBoundary + 全域 handler**

```typescript
// src/renderer/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from '@renderer/components/common'
import './styles/globals.css'

// Global error handlers for renderer process
window.onerror = (_message, _source, _lineno, _colno, error) => {
  console.error('[window.onerror]', error)
}

window.onunhandledrejection = (event) => {
  console.error('[unhandledrejection]', event.reason)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

- [ ] **Step 6: 在 App.tsx 掛載 ToastContainer**

在 `src/renderer/App.tsx` 的 return JSX 最外層 div 內底部加入：

```tsx
import { ToastContainer } from '@renderer/components/common'

// ... 在 </main> 之後、</div> 之前：
<ToastContainer />
```

- [ ] **Step 7: 執行測試確認通過**

Run: `pnpm test:unit -- --run --reporter=verbose tests/unit/renderer/components/ErrorBoundary.test.tsx`
Expected: PASS

- [ ] **Step 8: 執行全部測試確認無迴歸**

Run: `pnpm test`
Expected: 全部通過

- [ ] **Step 9: 提交**

```bash
git add src/renderer/components/common/ErrorBoundary.tsx src/renderer/components/common/index.ts src/renderer/main.tsx src/renderer/App.tsx tests/unit/renderer/components/ErrorBoundary.test.tsx
git commit -m "feat: add ErrorBoundary, global error handlers, mount ToastContainer"
```

---

## Task 3: 自動更新 — 安裝依賴 + 主行程邏輯

**Files:**
- Create: `src/main/updater.ts`
- Create: `dev-app-update.yml`
- Modify: `src/main/index.ts`
- Modify: `package.json`

- [ ] **Step 1: 安裝 electron-updater**

```bash
pnpm add electron-updater
```

- [ ] **Step 2: 建立開發環境更新設定**

```yaml
# dev-app-update.yml
provider: generic
url: https://example.com/auto-updates
```

- [ ] **Step 3: 建立 updater 模組**

```typescript
// src/main/updater.ts
import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log/main.js'

// Use electron-log for updater logging
autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export function initializeUpdater(mainWindow: BrowserWindow): void {
  // Notify renderer of update events
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`Update available: ${info.version}`)
    mainWindow.webContents.send('updater:update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('No update available')
    mainWindow.webContents.send('updater:update-not-available')
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow.webContents.send('updater:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`Update downloaded: ${info.version}`)
    mainWindow.webContents.send('updater:update-downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (error) => {
    log.error('Updater error:', error)
  })

  // IPC handlers
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { updateAvailable: result?.updateInfo != null }
    } catch (error) {
      log.error('Check for updates failed:', error)
      return { updateAvailable: false }
    }
  })

  ipcMain.handle('updater:download', async () => {
    await autoUpdater.downloadUpdate()
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  // Check for updates after a short delay (avoid blocking startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Auto-update check failed:', err)
    })
  }, 10_000)
}
```

- [ ] **Step 4: 在主行程初始化 updater**

在 `src/main/index.ts` 的 `app.whenReady()` 內，`createWindow()` 之後加入：

```typescript
import { initializeUpdater } from './updater'

// ... 在 createWindow() 之後：
// Initialize auto-updater (skip in dev)
if (!is.dev) {
  initializeUpdater(mainWindow!)
}
```

- [ ] **Step 5: 執行型別檢查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/main/updater.ts src/main/index.ts dev-app-update.yml package.json pnpm-lock.yaml
git commit -m "feat: add electron-updater with auto-update logic"
```

---

## Task 4: 自動更新 — 渲染行程 UI + Preload 通道

**Files:**
- Create: `src/renderer/components/common/UpdateBanner.tsx`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: 寫 UpdateBanner 元件測試**

```typescript
// tests/unit/renderer/components/UpdateBanner.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpdateBanner } from '@renderer/components/common/UpdateBanner'

describe('UpdateBanner', () => {
  it('renders nothing when no update info', () => {
    const { container } = render(<UpdateBanner />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: 在 preload 加入更新通道**

在 `src/preload/index.ts` 的 electronAPI 物件內加入：

```typescript
updater: {
  check: (): Promise<{ updateAvailable: boolean }> =>
    ipcRenderer.invoke('updater:check'),
  download: (): Promise<void> =>
    ipcRenderer.invoke('updater:download'),
  install: (): void => {
    ipcRenderer.invoke('updater:install')
  },
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string; releaseNotes?: string }) => callback(info)
    ipcRenderer.on('updater:update-available', handler)
    return () => { ipcRenderer.removeListener('updater:update-available', handler) }
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('updater:update-not-available', handler)
    return () => { ipcRenderer.removeListener('updater:update-not-available', handler) }
  },
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: { percent: number }) => callback(progress)
    ipcRenderer.on('updater:download-progress', handler)
    return () => { ipcRenderer.removeListener('updater:download-progress', handler) }
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('updater:update-downloaded', handler)
    return () => { ipcRenderer.removeListener('updater:update-downloaded', handler) }
  },
},
```

- [ ] **Step 3: 建立 UpdateBanner 元件**

```typescript
// src/renderer/components/common/UpdateBanner.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready'

export function UpdateBanner(): React.ReactElement | null {
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubs = [
      window.electronAPI.updater.onUpdateAvailable((info) => {
        setVersion(info.version)
        setState('available')
        setDismissed(false)
      }),
      window.electronAPI.updater.onDownloadProgress((p) => {
        setState('downloading')
        setProgress(Math.round(p.percent))
      }),
      window.electronAPI.updater.onUpdateDownloaded(() => {
        setState('ready')
      }),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  const handleDownload = useCallback(() => {
    setState('downloading')
    window.electronAPI.updater.download()
  }, [])

  const handleInstall = useCallback(() => {
    window.electronAPI.updater.install()
  }, [])

  if (state === 'idle' || dismissed) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 text-sm">
      <Download className="w-4 h-4 text-blue-500 flex-shrink-0" />

      {state === 'available' && (
        <>
          <span className="text-gray-700 dark:text-gray-300">
            Version {version} is available.
          </span>
          <button
            onClick={handleDownload}
            className="ml-auto px-3 py-1 rounded bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            Download
          </button>
        </>
      )}

      {state === 'downloading' && (
        <span className="text-gray-700 dark:text-gray-300">
          Downloading update... {progress}%
        </span>
      )}

      {state === 'ready' && (
        <>
          <span className="text-gray-700 dark:text-gray-300">
            Update ready. Restart to apply.
          </span>
          <button
            onClick={handleInstall}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Restart
          </button>
        </>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 匯出 UpdateBanner 並掛載到 App**

在 `src/renderer/components/common/index.ts` 加入：
```typescript
export { UpdateBanner } from './UpdateBanner'
```

在 `src/renderer/App.tsx` 的 return JSX 中，`<main>` 標籤內最上方加入：
```tsx
<UpdateBanner />
```

- [ ] **Step 5: 執行測試**

Run: `pnpm test`
Expected: 全部通過

- [ ] **Step 6: 提交**

```bash
git add src/renderer/components/common/UpdateBanner.tsx src/renderer/components/common/index.ts src/preload/index.ts src/renderer/App.tsx tests/unit/renderer/components/UpdateBanner.test.tsx
git commit -m "feat: add update notification banner with download/install UI"
```

---

## Task 5: electron-builder publish 設定 + 簽章佔位

**Files:**
- Modify: `electron-builder.yml`

- [ ] **Step 1: 在 electron-builder.yml 加入 publish 設定**

在檔案頂部 `productName` 之後加入：

```yaml
publish:
  provider: github
  owner: kcchien
  repo: connex-studio
```

- [ ] **Step 2: macOS 區段加入簽章佔位設定**

mac 區段已有 `hardenedRuntime: true` 和 `entitlements`，確認正確即可。程式碼簽章需要環境變數：
- `CSC_LINK` — .p12 憑證路徑或 base64
- `CSC_KEY_PASSWORD` — 憑證密碼
- `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` — 公證用

這些由 CI 秘密變數提供，不需寫入 yml。

- [ ] **Step 3: 提交**

```bash
git add electron-builder.yml
git commit -m "feat: add GitHub Releases publish config to electron-builder"
```

---

## Task 6: 跨平台 CI + 建置產物上傳

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: 改寫 CI 為矩陣策略**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main
      - master

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit tests (main)
        run: pnpm test:main

      - name: Unit tests (renderer)
        run: pnpm test:renderer

  build:
    needs: quality-gate
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Package
        run: pnpm package
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: false

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: connex-studio-${{ matrix.os }}
          path: |
            dist/*.dmg
            dist/*.zip
            dist/*.exe
            dist/*.AppImage
            dist/*.deb
          retention-days: 14
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add cross-platform build matrix with artifact upload"
```

---

## Task 7: LICENSE 檔案

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: 建立 MIT LICENSE**

```text
MIT License

Copyright (c) 2026 Connex Studio Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: 提交**

```bash
git add LICENSE
git commit -m "chore: add MIT LICENSE file"
```

---

## 依賴順序

```
Task 1 (主行程錯誤處理) ──┐
Task 2 (渲染行程 ErrorBoundary) ──┤── 可並行
Task 7 (LICENSE) ──────────────────┘

Task 3 (updater 主行程) → Task 4 (updater 渲染 UI)  ── 有序依賴

Task 5 (electron-builder publish) ──┐
Task 6 (CI 矩陣) ──────────────────┘── 可並行，與其他無依賴
```

**建議分派策略：**
- 第一波（並行）：Task 1 + Task 2 + Task 7 + Task 5 + Task 6
- 第二波（序列）：Task 3 → Task 4（依賴 pnpm add electron-updater 先完成）

---

## 驗收標準

- [ ] `pnpm typecheck` 通過
- [ ] `pnpm test` 全部通過（含新增測試）
- [ ] `pnpm build` 通過
- [ ] `pnpm lint` 通過
- [ ] 主行程有 unhandledRejection + uncaughtException 處理器
- [ ] 渲染行程有 ErrorBoundary 包裹 `<App />`
- [ ] ToastContainer 已掛載
- [ ] electron-updater 已安裝且主行程初始化
- [ ] UpdateBanner 元件已掛載
- [ ] electron-builder.yml 有 publish 設定
- [ ] CI 有 macOS + Windows runner
- [ ] LICENSE 檔案存在
