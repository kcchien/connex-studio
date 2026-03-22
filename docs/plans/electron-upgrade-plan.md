# Electron 升級計畫

> 建立日期：2026-03-21
> 最後更新：2026-03-22

---

## 一、Electron 33 → 39 升級（已完成）

> 狀態：**已完成** — 2026-03-21 執行完畢

### 1.1 升級摘要

Electron 33.4.11 → 39.8.3 的升級已順利完成，涵蓋以下變更：

| 元件 | 升級前 | 升級後 |
|------|--------|--------|
| Electron | 33.4.11 | 39.8.3 |
| electron-vite | 2.3.0 | 5.0.0 |
| Vite | 5.4.x | 7.3.1 |
| @vitejs/plugin-react | 4.x | 5.2.0 |
| better-sqlite3 | 11.10.0 | 12.8.0 |
| electron-rebuild | 3.2.9 | @electron/rebuild 4.0.3 |
| Node.js（Electron 內建） | 20.18.0 | 22.20.0 |

### 1.2 已完成的工作

1. **建構工具鏈升級**：electron-vite 升至 5.0，Vite 升至 7.x，處理了 `externalizeDepsPlugin` 棄用等破壞性變更
2. **Electron 本體升級**：跨越 6 個大版號（34 → 39），期間無需任何應用程式介面層的程式碼修改
3. **原生模組升級**：better-sqlite3 升至 12.x 以配合 Node.js 22；重新編譯 `@serialport/bindings-cpp`
4. **keytar 移除**：已停止維護的 keytar 全面替換為 Electron 內建的 `safeStorage` 介面（參見提交 `4dcc681`）
5. **electron-rebuild 遷移**：從舊版 `electron-rebuild` 遷移至官方維護的 `@electron/rebuild`

### 1.3 升級過程中的要點

- Electron 34 至 39 的破壞性變更與本專案完全無關，零程式碼修改
- Node.js 從 20 升至 22（發生在 Electron 35）是最大的風險點，但 better-sqlite3 12.x 與 `@serialport/bindings-cpp`（使用 Node-API）均順利相容
- macOS 最低版本需求從 macOS 11 提升至 macOS 12（Electron 38 起）

---

## 二、Electron 39 → 40+ 升級路線圖（規劃中）

> 狀態：**等待中** — 建議在 Node.js 24 進入長期支援版本（LTS）後再執行

### 2.1 核心挑戰

Electron 40 將內建的 Node.js 從 22 升至 **24**，這是一次重大的執行環境變更。以下是需要處理的相依性：

| 相依性 | 目前版本 | 需要升級至 | 風險等級 | 說明 |
|--------|---------|-----------|---------|------|
| better-sqlite3 | 12.8.0 | 待確認（可能需要 13.x） | 高 | 需針對 Node.js 24 的二進位介面（ABI）重新編譯或升級大版號 |
| @serialport/bindings-cpp | 間接依賴 | 待驗證 | 中 | 使用 Node-API（N-API），跨版本相容性通常良好，但仍須實際驗證 |
| @vitejs/plugin-react | 5.2.0 | 6.x | 中 | 6.x 版本需要 Vite 8，意味著建構工具鏈需要連動升級 |
| electron-vite | 5.0.0 | 待確認（可能 6.x） | 中 | 需等待 electron-vite 發布支援 Electron 40 建置目標的版本 |
| Vite | 7.3.1 | 8.x | 中 | 配合 @vitejs/plugin-react 6.x 的需求 |

### 2.2 升級步驟（草案）

1. **驗證原生模組相容性**
   - 在 Node.js 24 環境下單獨測試 better-sqlite3 是否能正常編譯與運作
   - 測試 modbus-serial 的間接依賴 `@serialport/bindings-cpp` 在 Node.js 24 下的行為
   - 確認 node-opcua 及其原生子依賴（如有）的相容性

2. **升級建構工具鏈**
   - Vite 7 → 8
   - @vitejs/plugin-react 5.x → 6.x
   - electron-vite 5.x → 支援 Electron 40 的版本

3. **升級 Electron**
   - `pnpm add -D electron@^40`
   - `npx @electron/rebuild`

4. **完整驗證**
   - 型別檢查、單元測試、建置、打包、手動煙霧測試

### 2.3 時程建議

| 時間點 | 行動 |
|--------|------|
| 2026 年 10 月（Node.js 24 LTS 預計發布） | 開始評估，確認生態系成熟度 |
| 2026 年 11 月 | 若生態系就緒，執行升級 |
| 2026 年 12 月 | 後備時間，處理非預期問題 |

**預估工作量**：2 至 3 個工作天（假設原生模組無重大相容性問題）。

### 2.4 為什麼建議等待

1. **Node.js 24 尚未達到 LTS 狀態**：目前為當前版本（Current），預計 2026 年 10 月進入 LTS。在此之前，原生模組生態系的支援可能不完整
2. **Electron 39 仍在支援期內**：支援至 2026 年 5 月 5 日，短期內無安全性疑慮
3. **建構工具鏈連動升級**：Vite 8 與 @vitejs/plugin-react 6.x 的穩定性需要時間驗證
4. **降低風險**：等生態系成熟後再升級，可大幅減少踩坑的可能性

### 2.5 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| better-sqlite3 在 Node.js 24 上需要大版號升級 | 高 | 高 | 追蹤 better-sqlite3 的發行說明，確認何時正式支援 Node.js 24 |
| @serialport/bindings-cpp 不相容 Node.js 24 | 低 | 高 | Node-API 設計目標即為跨版本穩定，但仍需實測 |
| Vite 8 引入破壞性變更影響建置流程 | 中 | 中 | 先在獨立分支測試 Vite 8 升級，與 Electron 升級分開處理 |
| electron-vite 未及時支援 Electron 40 | 中 | 中 | 如同本次升級經驗，electron-vite 的建置目標不影響執行，可先升 Electron 再等 electron-vite 更新 |

---

## 三、Electron 版本對照表

| Electron | Chromium | Node.js | 穩定版發行日 | 支援結束日 | 狀態 |
|----------|----------|---------|------------|-----------|------|
| 33 | 130 | 20.18.0 | 2024-10-15 | 2025-04-29 | 已結束支援 |
| 34 | 132 | 20.18.1 | 2025-01-14 | 2025-06-24 | 已結束支援 |
| 35 | 134 | **22.14.0** | 2025-03-04 | 2025-09-02 | 已結束支援 |
| 36 | 136 | 22.14.0 | 2025-04-29 | 2025-10-28 | 已結束支援 |
| 37 | 138 | 22.16.0 | 2025-06-24 | 2026-01-13 | 已結束支援 |
| 38 | 140 | 22.18.0 | 2025-09-02 | 2026-03-10 | 已結束支援 |
| **39** | **142** | **22.20.0** | **2025-10-28** | **2026-05-05** | **目前使用中** |
| 40 | 144 | **24.11.1** | 2026-01-13 | 2026-06-30 | 穩定 |
| 41 | 146 | 24.14.0 | 2026-03-10 | 2026-08-25 | 穩定（最新） |
| 42 | 148 | 24.14.0 | 2026-05-05（預計） | 2026-09-22 | 預發行 |

**粗體**標示 Node.js 大版號升級的分界點。

---

## 四、參考資源

- [Electron 破壞性變更文件](https://www.electronjs.org/docs/latest/breaking-changes)
- [Electron 發行時程表](https://releases.electronjs.org/schedule)
- [electron-vite 變更日誌](https://github.com/alex8088/electron-vite/blob/master/CHANGELOG.md)
- [better-sqlite3 Node.js 24 相容性議題](https://github.com/WiseLibs/better-sqlite3/issues/1376)
- [Electron safeStorage 介面文件](https://www.electronjs.org/docs/latest/api/safe-storage)
- [@electron/rebuild 套件](https://github.com/electron/rebuild)
