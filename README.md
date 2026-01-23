# Connex Studio

[English](#english) | [繁體中文](#繁體中文)

---

## English

### Overview

**Connex Studio** is a professional Industrial IoT (IIoT) communication testing platform built with Electron, React, and TypeScript. It provides real-time protocol connectivity, data visualization, and testing capabilities for industrial automation systems.

### Key Features

#### 🔌 Multi-Protocol Support
- **Modbus TCP**: Full support for FC01-FC06, FC15-FC16 operations
- **MQTT**: Pub/Sub messaging with QoS support (Coming in Phase 8)
- **OPC UA**: Secure industrial communication (Coming in Phase 9)

#### 🎯 Advanced Data Handling
- **Byte Order Support**: Big-Endian, Little-Endian, Mid-Big, Mid-Little
- **Data Types**: bool, int16/32/64, uint16/32/64, float32/64, string, json
- **Auto-Reconnection**: Exponential backoff retry mechanism
- **Real-time Polling**: Configurable polling intervals per tag

#### 📊 Visualization (Coming Soon)
- **Super Grid**: High-performance virtualized data table with sparklines
- **Sparklines**: Canvas-based micro-trend charts (uPlot)
- **Data DVR**: Time-travel replay for the last 5 minutes of data
- **Dark Mode**: Professional dark theme UI

#### 🔧 Virtual Servers
- **Modbus TCP Slave Simulator**: Test your Modbus clients (Coming in Phase 4)
- **Waveform Generators**: Sine, random, sawtooth, step patterns (Coming in Phase 4)

### Tech Stack

#### Core Framework
- **Electron** 34.5.8 - Cross-platform desktop application framework
- **React** 19.2.3 - Modern UI library with concurrent features
- **TypeScript** 5.9.3 - Type-safe development
- **Vite** 5.4.21 - Lightning-fast build tool
- **electron-vite** 2.3.0 - Electron + Vite integration

#### Protocol Libraries
- **modbus-serial** 8.0.23 - Modbus TCP/RTU implementation
- **mqtt** 5.14.1 - MQTT client
- **node-opcua** 2.161.0 - OPC UA client

#### State & Storage
- **Zustand** 5.0.10 - Lightweight state management
- **better-sqlite3** 11.10.0 - Fast embedded database

#### UI & Visualization
- **Tailwind CSS** 3.4.19 - Utility-first CSS framework
- **uPlot** 1.6.32 - High-performance charts (100k+ points @ 60fps)
- **ECharts** 5.6.0 - Rich interactive charts
- **TanStack Virtual** 3.13.18 - Virtual scrolling for large datasets

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ React UI   │  │ Zustand Store│  │ IPC API Bridge  │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ IPC Communication
┌───────────────────────────┴─────────────────────────────┐
│                    Preload Bridge                        │
│              (contextBridge Security Layer)              │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                     Main Process                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Zustand Main Store                     │ │
│  │           (Single Source of Truth)                  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Connection Manager (Singleton)            │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │ │
│  │ │ Modbus Client│  │  MQTT Client │  │ OPC UA    │ │ │
│  │ │   (Phase 3)  │  │  (Phase 8)   │  │ (Phase 9) │ │ │
│  │ └──────────────┘  └──────────────┘  └───────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              IPC Handlers                           │ │
│  │  connection:*, modbus:*, mqtt:*, opcua:*           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Installation

```bash
# Clone the repository
git clone git@github.com:kcchien/connex-studio.git
cd connex-studio

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Package for distribution
pnpm build:win   # Windows
pnpm build:mac   # macOS
pnpm build:linux # Linux
```

### Development Status

#### ✅ Completed Phases (Phase 1-3)
- [x] **Phase 1**: Project setup and dependencies
- [x] **Phase 2**: Foundational types and IPC infrastructure
- [x] **Phase 3**: Modbus TCP client with byte order support

#### 🚧 In Progress / Planned
- [ ] **Phase 4**: Virtual Modbus TCP Server (US2)
- [ ] **Phase 5**: Super Grid UI with sparklines (US5)
- [ ] **Phase 6**: Data DVR - Time travel replay (US6)
- [ ] **Phase 7**: Cross-platform packaging (US7)
- [ ] **Phase 8**: MQTT client (US3)
- [ ] **Phase 9**: OPC UA client (US4)
- [ ] **Phase 10**: Polish and testing

### Project Structure

```
connex-studio/
├── src/
│   ├── main/              # Main process (Node.js)
│   │   ├── protocols/     # Protocol clients
│   │   │   ├── base.ts    # Abstract protocol base
│   │   │   ├── manager.ts # Connection manager
│   │   │   └── modbus/    # Modbus implementation
│   │   ├── ipc/           # IPC handlers
│   │   └── store.ts       # Zustand main store
│   ├── preload/           # Preload bridge (Security)
│   │   └── index.ts       # contextBridge API
│   ├── renderer/          # Renderer process (React)
│   │   └── src/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── App.tsx
│   └── shared/            # Shared types
│       └── types/         # TypeScript definitions
├── specs/                 # Feature specifications
│   └── 001-mvp-protocol-clients/
│       ├── spec.md        # Feature requirements
│       ├── plan.md        # Technical plan
│       ├── tasks.md       # Task breakdown
│       └── contracts/     # API contracts
└── CHANGELOG.md           # Version history
```

### Contributing

This project follows the [Constitution v1.0.3](https://github.com/kcchien/connex-studio/tree/main/.specify) development workflow.

### License

MIT License - See [LICENSE](LICENSE) for details

---

## 繁體中文

### 概述

**Connex Studio** 是一個專業的工業物聯網（IIoT）通訊測試平台，採用 Electron、React 和 TypeScript 構建。提供工業自動化系統的即時協定連線、數據視覺化和測試功能。

### 核心功能

#### 🔌 多協定支援
- **Modbus TCP**: 完整支援 FC01-FC06、FC15-FC16 操作
- **MQTT**: 支援 QoS 的發布/訂閱訊息傳遞（Phase 8 開發中）
- **OPC UA**: 安全的工業通訊協定（Phase 9 開發中）

#### 🎯 進階數據處理
- **Byte Order 支援**: Big-Endian、Little-Endian、Mid-Big、Mid-Little
- **數據類型**: bool、int16/32/64、uint16/32/64、float32/64、string、json
- **自動重連**: 指數退避重試機制
- **即時輪詢**: 每個標籤可設定不同輪詢間隔

#### 📊 數據視覺化（即將推出）
- **Super Grid**: 高效能虛擬化數據表格與微型趨勢圖
- **Sparklines**: Canvas 渲染的微型趨勢圖（uPlot）
- **Data DVR**: 最近 5 分鐘數據的時光回溯
- **暗色模式**: 專業暗色主題 UI

#### 🔧 虛擬伺服器
- **Modbus TCP Slave 模擬器**: 測試您的 Modbus 客戶端（Phase 4 開發中）
- **波形產生器**: 正弦波、隨機、鋸齒波、階梯波（Phase 4 開發中）

### 技術堆疊

#### 核心框架
- **Electron** 34.5.8 - 跨平台桌面應用程式框架
- **React** 19.2.3 - 現代化 UI 函式庫
- **TypeScript** 5.9.3 - 型別安全開發
- **Vite** 5.4.21 - 極速建置工具
- **electron-vite** 2.3.0 - Electron + Vite 整合

#### 協定函式庫
- **modbus-serial** 8.0.23 - Modbus TCP/RTU 實作
- **mqtt** 5.14.1 - MQTT 客戶端
- **node-opcua** 2.161.0 - OPC UA 客戶端

#### 狀態與儲存
- **Zustand** 5.0.10 - 輕量級狀態管理
- **better-sqlite3** 11.10.0 - 高效能嵌入式資料庫

#### UI 與視覺化
- **Tailwind CSS** 3.4.19 - Utility-first CSS 框架
- **uPlot** 1.6.32 - 高效能圖表（60fps 渲染 10 萬點以上）
- **ECharts** 5.6.0 - 豐富的互動式圖表
- **TanStack Virtual** 3.13.18 - 大數據集虛擬滾動

### 架構設計

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer 進程                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ React UI   │  │ Zustand Store│  │ IPC API 橋接    │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ IPC 通訊
┌───────────────────────────┴─────────────────────────────┐
│                    Preload 橋接層                        │
│              (contextBridge 安全層)                      │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                     Main 進程                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Zustand Main Store                     │ │
│  │           (單一真相來源 SSOT)                        │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Connection Manager (單例模式)             │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │ │
│  │ │ Modbus 客戶端│  │  MQTT 客戶端 │  │ OPC UA    │ │ │
│  │ │   (Phase 3)  │  │  (Phase 8)   │  │ (Phase 9) │ │ │
│  │ └──────────────┘  └──────────────┘  └───────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              IPC 處理器                             │ │
│  │  connection:*, modbus:*, mqtt:*, opcua:*           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 安裝步驟

```bash
# 複製專案
git clone git@github.com:kcchien/connex-studio.git
cd connex-studio

# 安裝依賴項
pnpm install

# 啟動開發伺服器
pnpm dev

# 建置生產版本
pnpm build

# 打包發佈版本
pnpm build:win   # Windows
pnpm build:mac   # macOS
pnpm build:linux # Linux
```

### 開發進度

#### ✅ 已完成階段（Phase 1-3）
- [x] **Phase 1**: 專案初始化與依賴項安裝
- [x] **Phase 2**: 基礎型別系統與 IPC 基礎設施
- [x] **Phase 3**: Modbus TCP 客戶端與 Byte Order 支援

#### 🚧 開發中 / 規劃中
- [ ] **Phase 4**: Virtual Modbus TCP Server（US2）
- [ ] **Phase 5**: Super Grid UI 與 Sparklines（US5）
- [ ] **Phase 6**: Data DVR - 時光回溯（US6）
- [ ] **Phase 7**: 跨平台打包（US7）
- [ ] **Phase 8**: MQTT 客戶端（US3）
- [ ] **Phase 9**: OPC UA 客戶端（US4）
- [ ] **Phase 10**: 優化與測試

### 專案結構

```
connex-studio/
├── src/
│   ├── main/              # Main 進程（Node.js）
│   │   ├── protocols/     # 協定客戶端
│   │   │   ├── base.ts    # 抽象協定基礎類別
│   │   │   ├── manager.ts # 連線管理器
│   │   │   └── modbus/    # Modbus 實作
│   │   ├── ipc/           # IPC 處理器
│   │   └── store.ts       # Zustand main store
│   ├── preload/           # Preload 橋接層（安全性）
│   │   └── index.ts       # contextBridge API
│   ├── renderer/          # Renderer 進程（React）
│   │   └── src/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── App.tsx
│   └── shared/            # 共享型別
│       └── types/         # TypeScript 定義
├── specs/                 # 功能規格
│   └── 001-mvp-protocol-clients/
│       ├── spec.md        # 功能需求
│       ├── plan.md        # 技術計畫
│       ├── tasks.md       # 任務分解
│       └── contracts/     # API 契約
└── CHANGELOG.md           # 版本歷史
```

### 貢獻指南

本專案遵循 [Constitution v1.0.3](https://github.com/kcchien/connex-studio/tree/main/.specify) 開發流程。

### 授權條款

MIT License - 詳見 [LICENSE](LICENSE)

---

**Made with ❤️ for Industrial IoT**
