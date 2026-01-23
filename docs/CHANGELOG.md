# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
| 0.1.0 | 2025-01-23 | 初始專案結構與 MVP 規格 |

[Unreleased]: https://github.com/kcchien/connex-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kcchien/connex-studio/releases/tag/v0.1.0
