# Connex Studio v1.0 全面強化設計

> 日期：2026-03-22
> 狀態：設計草案
> 範圍：7 個子專案——lint 修復、合規矩陣、Sentry 整合、國際化、無障礙、應用內文件、推送

---

## 1. 概覽

本設計涵蓋 HANDOFF.md 中所有可在本 session 完成的待辦項。已確認排除：Dashboard/Alert UI（已完成）、浸泡測試（已完成）、程式碼簽章（等憑證）。

### 執行策略

採用子代理驅動的三批次平行策略，按檔案歸屬分組避免合併衝突：

| 批次 | 子專案 | 獨佔檔案範圍 |
|------|--------|-------------|
| 先行批 | A（lint）+ C（Sentry） | tests/、src/main/index.ts、src/renderer/main.tsx |
| 主力批 | B（合規矩陣）+ D（i18n 基礎設施 + 翻譯檔） | src/main/protocols/、src/shared/types/、src/renderer/components/（i18n 獨佔） |
| 收尾批 | E（無障礙）→ F（應用內文件） | **序列執行**：E 先完成所有既有元件修改（含 SidebarV2 語意化），F 再新增 HelpPanel 元件 + 在 SidebarV2 加入說明按鈕 + 修改 App.tsx 掛載 |

G（推送）在全部完成、測試通過後一次執行。

---

## 2. 子專案 A：修復 lint 錯誤

### 問題

`tests/integration/ipc/connection.integration.test.ts` 第 46/48/50 行使用了裸 `Function` 型別，違反 `@typescript-eslint/no-unsafe-function-type` 規則。

### 修復方案

將 `Function` 替換為 `(...args: unknown[]) => unknown`。不改動測試邏輯。

### 影響範圍

- 1 個檔案、3 行修改
- 零風險

---

## 3. 子專案 B：合規矩陣 7 項缺口

### B1. Modbus float64 讀寫（MOD-035）

**檔案**：`src/main/protocols/ModbusTcpAdapter.ts`、`src/main/protocols/byteOrderUtils.ts`

**問題**：既有的 `reorderRegisters()` 和 `encodeBufferToRegisters()` 只處理 2 個暫存器（32 位元）。float64 需要 4 個暫存器（64 位元），且 4 暫存器的位元組排列方式業界無統一標準。

**位元組順序定義（4 暫存器）**：

沿用既有 `ByteOrder` 型別（`ABCD`/`DCBA`/`BADC`/`CDAB`），語義延伸到 4 暫存器：

| byteOrder 設定 | 4 暫存器排列 | 說明 |
|----------------|-------------|------|
| `ABCD` | [R0, R1, R2, R3] | 大端序，最高位元組在前 |
| `DCBA` | [R3, R2, R1, R0] | 小端序，最低位元組在前 |
| `BADC` | [R1, R0, R3, R2] | 字組內交換 |
| `CDAB` | [R2, R3, R0, R1] | 字組間加字組內都交換 |

**新增函式**（`byteOrderUtils.ts`）：
- `reorderRegisters64(reg0, reg1, reg2, reg3, byteOrder): [number, number, number, number]` — 4 暫存器順序轉換
- `decodeFloat64(registers: number[], byteOrder): number` — 4 個 16 位元暫存器 → `DataView.getFloat64()` 結果
- `encodeFloat64(value: number, byteOrder): [number, number, number, number]` — `DataView.setFloat64()` → 4 個暫存器

**讀取路徑**（`convertValue()` 函式內）：
- 新增 `case 'float64':` — 呼叫 `decodeFloat64(registers.slice(0, 4), byteOrder)`

**寫入路徑**（`writeHoldingValue()` 函式內）：
- 新增 `case 'float64':` — 呼叫 `encodeFloat64(value, byteOrder)` 取得 4 個暫存器
- 使用 FC16（寫入多個暫存器），一次寫入 4 個暫存器

**測試**：float64 讀寫單元測試，涵蓋正數、負數、零、NaN、Infinity、各位元組順序排列。

### B2. Modbus 位址範圍驗證（MOD-047）

**檔案**：`src/main/protocols/ModbusTcpAdapter.ts`，`parseModbusAddress()` 函式

**修改**：在需要檢查的解析路徑加入上界守衛：
```typescript
if (address < 0 || address > 65535) {
  throw new Error(`Modbus address out of range: ${address} (valid: 0-65535)`)
}
```

需要加入檢查的路徑：
- **IEC 格式**（如 `HR65536`）：使用者可輸入任意數字，需顯式檢查
- **純數字格式**：直接解析為整數，需顯式檢查

不需要的路徑：
- **Modicon 格式**（如 `40001-49999`）：已有隱性範圍限制，超範圍輸入會落入「無效格式」錯誤

**測試**：邊界值 0、65535、65536、-1。

### B3. MQTT 保留訊息（MQT-010）

**現況釐清**：目前 `MqttAdapter` 只有訂閱功能（`subscribe`/`readTags`），沒有發布方法。mqtt.js 預設已能接收保留訊息（訂閱時 broker 會推送），所以「接收端」不需改動。

**範圍決策**：本次僅處理**接收端語義標記**——在訂閱回呼中辨識 `packet.retain` 旗標，讓 UI 能顯示「此訊息為保留訊息」的標記。不新增完整的發布功能（那是獨立的功能需求，超出合規矩陣缺口修復的範圍）。

**型別擴充**（`src/shared/types/tag.ts`，`TagValue` 或對等結構）：
```typescript
isRetained?: boolean  // 此值是否來自保留訊息
```

**實作**（`src/main/protocols/MqttAdapter.ts`）：
1. `setupEventHandlers()` 中的 `this.client.on('message', ...)` 回呼需加入第三參數 `packet: IPublishPacket`（mqtt.js 的 `message` 事件完整簽名為 `(topic, payload, packet)`）
2. `handleMessage()` 方法簽名新增 `packet: IPublishPacket` 參數
3. 從 `packet.retain` 讀取保留旗標，標記到標籤值上
- 合規矩陣標記為「已實作（接收端）」

**UI**：標籤值顯示中，若 `isRetained` 為 true，顯示小圖示或標記。

### B4. MQTT 遺囑訊息（MQT-011）

**型別擴充**（`MqttConfig`）：
```typescript
willTopic?: string
willPayload?: string
willQos?: 0 | 1 | 2
willRetain?: boolean
```

**實作**：連線時若 `willTopic` 有值，組裝 `options.will` 物件傳入 mqtt.js。

**UI**：MQTT 連線表單新增「遺囑訊息」可摺疊區段（主題、內容、QoS、保留）。

### B5. MQTT 乾淨連線（MQT-012）

**型別擴充**（`MqttConfig`）：
```typescript
cleanSession?: boolean  // 預設 true
```

**實作**：`connect()` 方法中的 `clean: true` 改為 `clean: this.config.cleanSession ?? true`。

**UI**：MQTT 連線表單新增「乾淨連線階段」勾選框（預設勾選）。

### B6-B7. OPC UA 憑證驗證（OPC-008 + OPC-012）

**現況**：`getUserIdentity()` 中有一段被註解的程式碼，使用 `config.certificateId` + `certStore` 模式。

**設計決策**：**棄用** `certificateId` + 憑證存儲模式，改為**直接檔案路徑模式**。理由：
- 憑證存儲模組（`getOpcUaCertificateStore`）目前未實作，是空殼
- 直接路徑模式更簡單、更透明，使用者可以直接指定 `.pem` 檔案
- 與 OPC UA 工具生態一致（多數 OPC UA 客戶端都用檔案路徑）

**實作**：
1. **刪除**被註解的 `certificateId` + `certStore` 程式碼
2. 新增直接路徑驗證邏輯：
   - 路徑安全檢查：`path.resolve()` 後確認在使用者家目錄（`os.homedir()`）或應用程式資料目錄（`app.getPath('userData')`）之下，拒絕其他路徑（防路徑穿越）
   - 讀取檔案後驗證 PEM 格式（開頭 `-----BEGIN CERTIFICATE-----`）
   - 私鑰同理（`-----BEGIN PRIVATE KEY-----` 或 `BEGIN RSA PRIVATE KEY`）
3. 驗證失敗時拋出明確錯誤訊息，不靜默回退到匿名驗證

**型別擴充**（`OpcUaConfig`）：
```typescript
authCertificatePath?: string   // PEM 憑證檔案絕對路徑
authPrivateKeyPath?: string    // PEM 私鑰檔案絕對路徑
```

**UI**：OPC UA 連線表單的驗證方式下拉新增「憑證」選項，出現時顯示 Electron 原生檔案選擇器（`dialog.showOpenDialog`），過濾 `.pem`/`.crt`/`.key` 檔案。

**測試**：有效/無效 PEM、路徑穿越嘗試（`../../../etc/passwd`）、白名單目錄外的路徑、缺少欄位。

---

## 4. 子專案 C：Sentry 整合

### 架構

```
@sentry/electron 安裝（若不支援 Electron 39，退而使用 @sentry/node + @sentry/browser）
├── src/main/index.ts        → Sentry.init() 主行程（生產模式守衛）
└── src/renderer/main.tsx    → Sentry.init() 渲染行程
```

### 設計原則

- `SENTRY_DSN` 各自從環境變數讀取：`import.meta.env.VITE_SENTRY_DSN`（渲染行程）和 `process.env.SENTRY_DSN`（主行程），不在 `constants.ts` 硬編碼
- 空值時自動停用——開發模式零干擾
- 不啟用效能監控（Performance），僅錯誤回報
- 既有 `ErrorBoundary` 和全域處理器不需修改，Sentry 自動掛鉤
- `electron-builder.yml` 新增 Source Map 上傳設定（可選，需 Sentry auth token）

### 環境區分

```typescript
Sentry.init({
  dsn: SENTRY_DSN,
  environment: is.dev ? 'development' : 'production',
  release: `connex-studio@${app.getVersion()}`,
  enabled: !!SENTRY_DSN && !is.dev,
})
```

---

## 5. 子專案 D：國際化（i18n）

### 技術選型

| 方案 | 優點 | 缺點 |
|------|------|------|
| **react-i18next**（選用） | React 生態標準、Hooks 支援、命名空間分割、豐富插值 | 套件較大 |
| react-intl | ICU 訊息格式、原生 Intl API | API 較冗長 |
| lingui | 編譯時優化、小包體 | 社群較小 |

選 **react-i18next**（+ i18next），理由：React 生態市佔最高，Electron 桌面應用不需在意包體大小。

### 翻譯檔結構

```
src/renderer/
├── i18n/
│   ├── index.ts              # i18next 初始化
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json   # 共用（按鈕、對話框、狀態）
│   │   │   ├── connection.json
│   │   │   ├── modbus.json
│   │   │   ├── mqtt.json
│   │   │   ├── opcua.json
│   │   │   ├── dashboard.json
│   │   │   ├── alert.json
│   │   │   ├── collection.json
│   │   │   ├── calculator.json
│   │   │   ├── dvr.json
│   │   │   ├── bridge.json
│   │   │   ├── diagnostics.json
│   │   │   ├── export.json
│   │   │   └── help.json
│   │   └── zh-TW/
│   │       └── （同上結構，繁體中文翻譯）
│   └── types.ts              # 型別安全的翻譯鍵
```

### 整合方式

1. **main.tsx**：在 `ErrorBoundary` 內、`<App />` 外包裹 `<I18nextProvider>`
2. **元件中**：`const { t } = useTranslation('connection')` 取代硬編碼字串
3. **語言持久化**：擴充 `uiStore` 新增 `language: 'en' | 'zh-TW'`，存入 localStorage
4. **語言切換 UI**：在 SidebarV2 的主題切換旁新增語言切換器（下拉選單，兩個選項）
5. **初始偵測**：`navigator.language` 自動偵測，fallback 為 `en`
6. **缺失鍵處理**：設定 `fallbackLng: 'en'`，開發模式啟用 `saveMissing` + 主控台警告，確保缺失翻譯顯示英文原文而非翻譯鍵名

### 翻譯範圍（約 450 字串）

| 命名空間 | 估計字串數 | 優先度 |
|----------|-----------|--------|
| common | ~80 | 高 |
| connection | ~60 | 高 |
| modbus | ~50 | 高 |
| mqtt | ~30 | 高 |
| opcua | ~40 | 高 |
| dashboard | ~30 | 中 |
| alert | ~30 | 中 |
| collection | ~30 | 中 |
| calculator | ~25 | 中 |
| dvr | ~15 | 低 |
| bridge | ~15 | 低 |
| diagnostics | ~15 | 低 |
| export | ~15 | 低 |
| help | ~15 | 低 |

### 實作策略

分三輪子代理，每輪處理一個優先度層級：
- 第一輪：抽取 common + connection + modbus + mqtt + opcua（核心功能）
- 第二輪：dashboard + alert + collection + calculator
- 第三輪：dvr + bridge + diagnostics + export + help

每輪子代理負責：建立翻譯 JSON → 修改元件替換硬編碼 → 驗證編譯通過。

---

## 6. 子專案 E：無障礙（WCAG 2.1 AA）

### 範圍界定

本次聚焦四個面向，不做完整 WCAG 審計：

| 面向 | 具體做法 |
|------|---------|
| **語意化 HTML** | `<div>` 按鈕改 `<button>`、導航區加 `<nav>`、主內容加 `<main>`、清單加 `<ul>/<li>` |
| **ARIA 標記** | 所有互動元素加 `aria-label`（使用 i18n 翻譯鍵）、狀態指示器加 `aria-live` |
| **鍵盤導航** | 確保所有功能可純鍵盤操作、焦點順序合理、模態對話框焦點陷阱 |
| **色彩對比** | 檢查並修正對比度不足的文字/背景組合（目標 4.5:1） |

### 依賴

- 依賴子專案 D（i18n）完成，因為 `aria-label` 值需使用翻譯鍵
- Radix UI 已內建部分 ARIA 支援（Dialog、DropdownMenu），只需補齊自訂元件

### 不做的事

- 不做完整的自動化無障礙測試套件（axe-core 整合留給未來）
- 不做螢幕助讀器端對端測試
- 不做 RTL（從右到左）語系支援

---

## 7. 子專案 F：應用內說明文件

### 設計

新增一個 `HelpPanel` 元件，以抽屜（drawer）形式從右側滑出，內容分為：

| 區段 | 內容 |
|------|------|
| 快速入門 | 3 步驟：建立連線 → 新增標籤 → 開始監控 |
| 協定指南 | Modbus TCP、MQTT、OPC UA 各一頁，含常見設定範例 |
| 快捷鍵 | 列出所有鍵盤快捷鍵（從既有 `useKeyboardShortcuts` 提取） |
| 關於 | 版本號、授權、GitHub 連結 |

### 實作方式

- 內容以 Markdown 格式儲存在翻譯檔中（`help.json` 的 `en` 和 `zh-TW`），隨語系切換
- 元件使用 `react-markdown` 渲染（或簡單的 JSX，視字串複雜度）
- 觸發方式：SidebarV2 新增「說明」圖示按鈕 + `Ctrl+?` / `Cmd+?` 快捷鍵
- 抽屜寬度 400px，不遮蔽主內容

### 不做的事

- 不做互動式教學導覽（product tour）
- 不做搜尋功能
- 不做影片嵌入

---

## 8. 子專案 G：推送到遠端

在所有變更提交並通過測試後執行 `git push origin main`。

---

## 9. 依賴關係圖

```
A（lint）────────────┐
C（Sentry）──────────┤
B（合規矩陣）────────┼──→ 測試通過 ──→ G（推送）
D（i18n）────────────┤        ↑
    ↓                │        │
E（無障礙）──────────┘        │
F（應用內文件）───────────────┘
```

- A、B、C、D 無互相依賴，可完全平行
- E 依賴 D（ARIA 標籤用翻譯鍵）
- F 依賴 D（說明內容需翻譯）
- G 依賴全部完成

---

## 10. 驗收標準

| 子專案 | 通過條件 |
|--------|---------|
| A | `pnpm lint` 零錯誤 |
| B | 合規矩陣從 78/85 提升至 85/85（原 3 項 N/A 重新分類為「已實作」，4 項 Partial 升級為「已實作」），新增測試全部通過 |
| C | 生產建置中 Sentry 初始化成功、開發模式不啟用 |
| D | 雙語切換功能正常、所有 UI 文字來自翻譯檔、無硬編碼字串殘留 |
| E | 核心功能（建立/編輯/刪除連線、新增/移除標籤、切換語言/主題、開關說明面板）可純鍵盤操作。所有可互動元素有 `aria-label`，所有動態狀態變化有 `aria-live`。 |
| F | 說明面板可開啟/關閉、內容隨語系切換 |
| G | `git push` 成功、CI 三平台通過 |

---

## 11. 風險與緩解

| 風險 | 緩解措施 |
|------|---------|
| i18n 改動 84 個檔案，可能引入語法錯誤 | 每輪子代理完成後跑 `pnpm typecheck`，即時修正 |
| OPC UA 憑證驗證需要真實憑證測試 | 用自簽憑證做單元測試，不依賴外部 CA |
| 翻譯品質（機器翻譯 vs 人工翻譯） | 先用 AI 產生初版翻譯，標記為「待人工審閱」 |
| Sentry DSN 未設定時的行為 | 空值守衛 + 開發模式測試 |
| `@sentry/electron` 不支援 Electron 39 | 退而使用 `@sentry/node`（主行程）+ `@sentry/browser`（渲染行程）分別初始化 |
| i18n 語言切換觸發全域重渲染，影響 Super Grid 效能 | 命名空間分割（namespace splitting）搭配 `React.memo` 限制重渲染範圍；語言切換為低頻操作，短暫延遲可接受 |
