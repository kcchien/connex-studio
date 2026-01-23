# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-01-24

### Added

- **Phase 1: 專案鷹架** (T001-T010)
  - Electron 33 + Vite 5 + React 19 專案初始化
  - TypeScript 設定與路徑別名 (`@main/*`, `@renderer/*`, `@shared/*`)
  - Tailwind CSS 配置含 IIoT 狀態顏色 (connected/connecting/error)
  - Shadcn/ui 元件庫整合準備
  - 完整目錄結構建立
  - Preload 腳本含完整型別安全 contextBridge API
  - electron-log 日誌系統初始化
  - Jest (Main)、Vitest (Renderer)、Playwright (E2E) 測試配置

- **Phase 2: 基礎設施層** (T011-T030)
  - **共用型別系統** (`src/shared/types/`)
    - Connection、Tag、DataPoint、Profile 等核心實體型別
    - IPC 通道常數定義 (`src/shared/constants/ipc-channels.ts`)
    - 型別安全 IPC 包裝器 (`src/renderer/lib/ipc.ts`)

  - **資料層 (SQLite + 憑證儲存)**
    - SQLite 環形緩衝區架構 (`src/main/db/schema.sql`)
    - DataBuffer 服務：ROWID 驅動的資料淘汰、WAL 模式、LTTB 降採樣
    - CredentialService：keytar 整合 OS 原生金鑰鏈

  - **協議適配器介面**
    - ProtocolAdapter 抽象基類與工廠註冊機制
    - ModbusTcpAdapter 完整實作
      - 支援 Modicon 與 IEC 位址格式解析
      - 資料型別轉換 (INT16/UINT16/INT32/UINT32/FLOAT32/BOOLEAN/STRING)
    - ModbusTcpAdapter 單元測試

  - **日誌基礎設施**
    - LogService：檔案輪替、記憶體日誌緩衝、Renderer 日誌捕獲
    - 完整 Log IPC 處理器 (getLogs/add/clear/export/openFolder/setLevel)

- **IIoT Protocol Studio 規格文件** (`specs/002-iiot-protocol-studio/`)
  - `spec.md` - 7 個使用者故事 (P1/P2 優先級)
  - `plan.md` - 15 階段實作計畫
  - `research.md` - 技術選型與效能基準
  - `data-model.md` - 實體關聯與 SQLite 架構
  - `contracts/ipc-channels.md` - 完整 IPC 通道規格
  - `contracts/types.ts` - TypeScript 型別合約
  - `quickstart.md` - 開發與測試快速指南
  - `tasks.md` - 145 項任務分解 (30 項已完成)

### Changed

- `package.json` 更新相依套件版本
  - Vite 6 → 5.4.11 (相容 electron-vite)
  - Electron 33.2.0 → 33.4.11
  - 新增 @electron-toolkit/utils
- `electron.vite.config.ts` 移除內嵌 PostCSS 設定，改用外部 postcss.config.js
- `tsconfig.json` 新增 `jsx: "react-jsx"` 支援 React 19

### Fixed

- 修正 electron-log ESM 匯入路徑 (`electron-log/main.js`)
- 修正 IpcResult<void> 型別定義問題
- 修正 React 19 JSX.Element → React.ReactElement 型別

## [0.1.0] - 2025-01-23

### Added

- **專案治理框架**
  - 建立 `.specify/memory/constitution.md` v2.0.0 專案憲法
  - 定義 7 大原則類別、16+ 子原則
  - 包含 AI 助理行為準則與安全執行規則

- **開發者指南**
  - 新增 `CLAUDE.md` 提供 Claude Code 操作指引
  - 涵蓋開發指令、架構概覽、IPC 模式範例
  - 整合效能目標與技術堆疊說明

- **MVP 規格文件** (`specs/001-mvp-protocol-clients/`)
  - `spec.md` - 7 個使用者故事與驗收條件
  - `plan.md` - 5 階段實作計畫與依賴圖
  - `data-model.md` - 實體定義與狀態轉換
  - `contracts/ipc-channels.md` - IPC 通道合約
  - `contracts/types.md` - TypeScript 型別定義
  - `quickstart.md` - 開發環境設定指南
  - `tasks.md` - 任務分解與執行順序
  - `research.md` - 技術研究與選型依據

- **Speckit 範本系統** (`.specify/templates/`)
  - `spec-template.md` - 功能規格範本
  - `plan-template.md` - 實作計畫範本
  - `tasks-template.md` - 任務清單範本
  - `checklist-template.md` - 檢查清單範本

### Changed

- 更新 `README.md` 加入專案架構圖與開發進度
- Constitution 從範本佔位符升級為完整原則定義

### Fixed

- 無

---

## Version History

| 版本 | 日期 | 說明 |
|------|------|------|
| 0.2.0 | 2025-01-24 | Phase 1-2 實作：專案鷹架與基礎設施層 |
| 0.1.0 | 2025-01-23 | 初始專案結構與 MVP 規格 |

[Unreleased]: https://github.com/kcchien/connex-studio/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kcchien/connex-studio/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kcchien/connex-studio/releases/tag/v0.1.0
