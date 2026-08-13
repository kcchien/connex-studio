> **歸檔註記（2026-08-14）**：本計劃已退役。v1.0 收尾工作由 wayfinder 地圖接手：https://github.com/kcchien/connex-studio/issues/5
> Phase 0 已完成；Phase 1 殘項由持久化盤點票追蹤；Phase 2 的 openExternal 白名單已修；Phase 3-4 商用項目劃出 v1.0 範圍。

# Connex Studio 商用化升級計劃（v1）

## 目標
將目前 Connex Studio 從「可運行的原型/內測版」提升到「可持續發布的商用軟體水準」，建立可驗證的品質閘門、安全基線、可維運能力與發布治理。

## 成功定義（Definition of Done）
- `lint` / `typecheck` / `unit` / `e2e-smoke` / `build` 在 CI 全綠。
- 核心功能（連線、輪詢、Tag、Profile、Workspace）具備可持久化與重啟後一致行為。
- 安全基線達標：Electron hardening、IPC 輸入驗證、敏感資料保護、外部連結控制。
- 發布流程可重現：版本化、簽章/打包、Release note、回滾策略。
- 文件齊全：運維手冊、故障排除、測試矩陣、已知限制。

## 範圍
- In scope: 程式品質、測試基礎設施、安全與發布工程、運維可觀測性。
- Out of scope（本輪）: 全新大型功能擴充（例如新增全新 protocol 類別）。

## 里程碑與時程（建議 6 週）

### Phase 0（第 1 週）品質閘門復原
狀態：`pending`

工作項目：
1. 修復 ESLint v9 設定（改用 `eslint.config.*`）。
2. 修復 renderer 測試基礎注入（全域 `window.electronAPI` mock 與 hook 介面對齊）。
3. 將 `npm test` 拆成可定位的 pipeline 步驟（unit-main / unit-renderer / e2e-smoke）。
4. 建立最小 CI workflow（PR gate）。

驗收：
- 本機與 CI 可穩定重現：`lint/typecheck/test:main/test:unit/build` 全綠。

---

### Phase 1（第 2-3 週）功能真實化與資料一致性
狀態：`pending`

工作項目：
1. 移除 `CollectionRunner` 模擬執行，改為真實 read/write 路徑。
2. 補齊 Dashboard/Bridge/Alert/Environment 的持久化儲存（至少 JSON/SQLite 一致策略）。
3. 定義資料遷移策略（schema version + migration）。
4. 補足高風險流程測試：重啟後恢復、異常中斷、匯入匯出一致性。

驗收：
- 重啟後資料不遺失，關鍵設定可恢復。
- Collection 不再使用 random/simulated 值。

---

### Phase 2（第 3-4 週）安全基線與防禦性設計
狀態：`pending`

工作項目：
1. Electron hardening：評估/啟用 `sandbox`，補 CSP 與 webPreferences 最小化。
2. `openExternal` 加 allowlist/協定白名單。
3. IPC payload schema 驗證（zod 或等價方案）與錯誤碼標準化。
4. 憑證與密鑰治理：OPC UA 憑證流程完成度補齊（含 server cert 取得流程）。
5. 威脅模型（STRIDE-lite）與安全測試清單。

驗收：
- 安全檢查清單全部通過，無高風險未緩解項。

---

### Phase 3（第 4-5 週）可維運性與可靠度
狀態：`pending`

工作項目：
1. 統一結構化 logging 與 correlation id。
2. 關鍵指標：連線成功率、重連次數、讀取延遲、錯誤率、Bridge 丟包率。
3. 異常分級與用戶可操作訊息（可回報、可定位）。
4. 長時間穩定測試（soak test 8~24 小時）。

驗收：
- 有可追蹤指標與故障診斷路徑，長時間執行無重大資源洩漏。

---

### Phase 4（第 5-6 週）發布工程與商用就緒
狀態：`pending`

工作項目：
1. 發布流程標準化：版本號、changelog、artifact、簽章/公證（依平台）。
2. 建立 release checklist（法遵、授權、相依套件風險、回滾）。
3. Beta/UAT 計劃：目標客戶場域、驗證腳本、收斂機制。
4. GA Gate Review：Go/No-Go 會議資料模板。

驗收：
- 可以按文件從 0 到發布完整走完一次，且可回滾。

## 風險與對策
1. 需求漂移：每週 freeze 一次 scope，變更走 CR。
2. 測試不穩定：建立 flaky quarantine 與重跑策略。
3. 工控現場差異大：建立裝置相容矩陣與最小支援清單。
4. 發布阻塞（簽章/公證）：提前做 dry-run 發布。

## 角色建議
- Tech Lead：架構與品質 gate owner
- QA Lead：測試策略與驗收 owner
- Security owner：hardening 與 threat model owner
- Release owner：CI/CD 與發布流程 owner

## 本週優先（立即開始）
1. 修 ESLint v9 config 與 renderer test mock。
2. 新增 `.github/workflows/ci.yml`，先跑 lint/typecheck/unit/build。
3. 把 `CollectionRunner` 模擬邏輯改成實際執行骨架（可測可追蹤）。
4. 建立商用發布 checklist 初版。

## 決策記錄
- 先修「品質閘門」再做「功能擴充」。
- 先達到 Beta-ready，再進行 GA-ready。
