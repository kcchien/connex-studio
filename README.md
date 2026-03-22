# Connex Studio

[English](#english) | [繁體中文](#繁體中文)

---

## English

### Overview

**Connex Studio** is an open-source Industrial IoT (IIoT) communication testing platform built with Electron, React, and TypeScript. It supports Modbus TCP, MQTT, and OPC UA protocols with real-time data visualization, bilingual UI (English / Traditional Chinese), and cross-platform packaging.

### Download

Pre-built installers are available on the [Releases](https://github.com/kcchien/connex-studio/releases) page:

| Platform | File | Notes |
|----------|------|-------|
| **macOS** (Apple Silicon) | `Connex-Studio-*-arm64.dmg` | See [macOS installation](#macos-unsigned-app) |
| **macOS** (Intel) | `Connex-Studio-*-x64.dmg` | See [macOS installation](#macos-unsigned-app) |
| **Windows** | `connex-studio-*-setup.exe` | See [Windows installation](#windows-smartscreen) |
| **Windows** (portable) | `connex-studio-*-portable.exe` | No installation needed |
| **Linux** | `connex-studio-*.AppImage` | `chmod +x` then run |
| **Linux** (Debian) | `connex-studio-*.deb` | `sudo dpkg -i` |

#### macOS (unsigned app)

The app is not code-signed. macOS will show a security warning on first launch:

1. Open the `.dmg` and drag the app to Applications
2. On first launch, macOS will block the app
3. Go to **System Settings → Privacy & Security** → scroll down and click **Open Anyway**
4. Or run in Terminal: `xattr -cr /Applications/Connex\ Studio.app`

#### Windows (SmartScreen)

Windows SmartScreen may show "Windows protected your PC":

1. Click **More info**
2. Click **Run anyway**

This is expected for unsigned apps and does not indicate malware.

### Key Features

- **Multi-Protocol**: Modbus TCP (FC01–FC16), MQTT (QoS 0/1/2, will messages, retained), OPC UA (browse, subscribe, certificate auth)
- **Data Types**: bool, int16/32, uint16/32, float32/64, string — with 4 byte order modes
- **Real-time Grid**: Virtualized tag table with sparkline trends and color-coded status
- **Dashboard**: Configurable widgets — number cards, charts, gauges, LEDs
- **Alerts**: Rule-based alerts with threshold monitoring and notification history
- **Data DVR**: Time-travel replay of the last 5 minutes of data
- **Collection Runner**: Automated test sequences with assertions
- **Modbus Calculator**: CRC calculator, float decoder, byte order converter, packet analyzer
- **Device Bridge**: Route data between protocols
- **Data Export**: CSV, JSON, Excel export with report generation
- **Diagnostics**: Frame-level protocol debugging
- **Bilingual UI**: English and Traditional Chinese with one-click switching
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation (WCAG 2.1 AA)
- **Help Panel**: In-app quick start guide, protocol reference, and keyboard shortcuts
- **Dark Mode**: System-aware theme with manual override
- **Auto Update**: Built-in update mechanism via GitHub Releases

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 39, Node.js 22 LTS |
| Frontend | React 19, Vite 6, Tailwind CSS |
| State | Zustand with cross-process sync |
| Protocols | modbus-serial 8.x, mqtt.js 5.x, node-opcua 2.x |
| Charts | uPlot (sparklines), ECharts (dashboard) |
| Storage | better-sqlite3 (ring buffer), YAML (config) |
| i18n | react-i18next |
| Error Tracking | Sentry (optional, via env var) |
| Testing | Vitest (renderer), Jest (main), Playwright (E2E) |

### Development

```bash
# Prerequisites: Node.js 22+, pnpm 9+

git clone https://github.com/kcchien/connex-studio.git
cd connex-studio
pnpm install
pnpm dev            # Start with HMR

# Quality checks
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm test           # All tests (828 passing)
pnpm build          # Production build
```

### Protocol Conformance

All three protocols are at **100% conformance** (85/85 items):

- Modbus TCP: 32/32 — FC01–FC06, FC15–FC16, float32/64, byte order, address validation
- MQTT: 18/18 — subscribe, QoS, clean session, will messages, retained messages, TLS
- OPC UA: 35/35 — browse, subscribe, read/write, security modes, certificate auth

See [`docs/protocol-conformance-matrix.md`](docs/protocol-conformance-matrix.md) for details.

### License

MIT — See [LICENSE](LICENSE)

---

## 繁體中文

### 概述

**Connex Studio** 是一款開源的工業物聯網（IIoT）通訊測試平台，採用 Electron、React 和 TypeScript 構建。支援 Modbus TCP、MQTT 和 OPC UA 三大工業協定，提供即時資料視覺化、雙語介面（英文／繁體中文）和跨平台安裝檔。

### 下載安裝

前往 [Releases](https://github.com/kcchien/connex-studio/releases) 頁面下載安裝檔：

| 平台 | 檔案 | 說明 |
|------|------|------|
| **macOS**（Apple Silicon） | `Connex-Studio-*-arm64.dmg` | 見下方 [macOS 安裝說明](#macos-未簽章應用程式) |
| **macOS**（Intel） | `Connex-Studio-*-x64.dmg` | 見下方 [macOS 安裝說明](#macos-未簽章應用程式) |
| **Windows** | `connex-studio-*-setup.exe` | 見下方 [Windows 安裝說明](#windows-smartscreen-警告) |
| **Windows**（免安裝版） | `connex-studio-*-portable.exe` | 直接執行 |
| **Linux** | `connex-studio-*.AppImage` | `chmod +x` 後執行 |
| **Linux**（Debian） | `connex-studio-*.deb` | `sudo dpkg -i` 安裝 |

#### macOS（未簽章應用程式）

本應用未經 Apple 程式碼簽章，首次開啟時 macOS 會阻擋：

1. 打開 `.dmg`，將應用程式拖入「應用程式」資料夾
2. 首次啟動會被阻擋
3. 前往 **系統設定 → 隱私權與安全性** → 向下捲動，點擊 **仍要打開**
4. 或在終端機執行：`xattr -cr /Applications/Connex\ Studio.app`

#### Windows（SmartScreen 警告）

Windows SmartScreen 可能會顯示「Windows 已保護您的電腦」：

1. 點擊 **其他資訊**
2. 點擊 **仍要執行**

這是未簽章應用的正常行為，並非惡意軟體。

### 核心功能

- **多協定支援**：Modbus TCP（FC01–FC16）、MQTT（QoS 0/1/2、遺囑訊息、保留訊息）、OPC UA（瀏覽、訂閱、憑證驗證）
- **資料型別**：bool、int16/32、uint16/32、float32/64、string — 支援 4 種位元組順序
- **即時標籤表格**：虛擬化捲動、微型趨勢圖、色彩狀態指示
- **儀表板**：可自訂元件 — 數字卡片、圖表、儀表、LED 指示燈
- **告警系統**：規則式告警、閾值監控、通知歷史
- **資料錄播（DVR）**：回溯最近 5 分鐘的資料
- **測試集合**：自動化測試序列與斷言
- **Modbus 計算器**：CRC 計算、浮點數解碼、位元組順序轉換、封包分析
- **設備橋接**：跨協定資料路由
- **資料匯出**：CSV、JSON、Excel 匯出與報表生成
- **協定診斷**：封包層級除錯
- **雙語介面**：英文與繁體中文一鍵切換
- **無障礙支援**：語意化 HTML、ARIA 標記、鍵盤導航（WCAG 2.1 AA）
- **應用內說明**：快速入門、協定指南、鍵盤快捷鍵
- **暗色模式**：跟隨系統或手動切換
- **自動更新**：透過 GitHub Releases 內建更新機制

### 技術堆疊

| 層級 | 技術 |
|------|------|
| 執行環境 | Electron 39、Node.js 22 LTS |
| 前端 | React 19、Vite 6、Tailwind CSS |
| 狀態管理 | Zustand（跨行程同步） |
| 協定函式庫 | modbus-serial 8.x、mqtt.js 5.x、node-opcua 2.x |
| 圖表 | uPlot（微型趨勢圖）、ECharts（儀表板） |
| 儲存 | better-sqlite3（環形緩衝區）、YAML（設定檔） |
| 國際化 | react-i18next |
| 錯誤追蹤 | Sentry（選用，透過環境變數） |
| 測試 | Vitest（渲染行程）、Jest（主行程）、Playwright（端對端） |

### 開發

```bash
# 前置需求：Node.js 22+、pnpm 9+

git clone https://github.com/kcchien/connex-studio.git
cd connex-studio
pnpm install
pnpm dev            # 啟動開發模式（含熱模組替換）

# 品質檢查
pnpm lint           # ESLint 檢查
pnpm typecheck      # TypeScript 型別檢查
pnpm test           # 全部測試（828 個通過）
pnpm build          # 生產建置
```

### 協定合規度

三大協定均達到 **100% 合規**（85/85 項）：

- Modbus TCP：32/32 — FC01–FC06、FC15–FC16、float32/64、位元組順序、位址驗證
- MQTT：18/18 — 訂閱、QoS、乾淨連線、遺囑訊息、保留訊息、TLS
- OPC UA：35/35 — 瀏覽、訂閱、讀寫、安全模式、憑證驗證

詳見 [`docs/protocol-conformance-matrix.md`](docs/protocol-conformance-matrix.md)。

### 授權條款

MIT — 詳見 [LICENSE](LICENSE)
