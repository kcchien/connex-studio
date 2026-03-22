# Phase 0 執行票據（商用化第一階段）

目標：在 1 週內恢復品質閘門，讓 PR 有可依賴的「可驗證完成」標準。

## Ticket P0-1：建立 ESLint v9 Flat Config
- 目的：修復 `npm run lint` 目前不可用。
- 範圍：
  - 新增 `eslint.config.mjs`（或 `eslint.config.js`）
  - 對齊 TypeScript + React + Vitest 測試檔規則
  - 移除舊 `.eslintrc*` 依賴（若存在）
- 驗收條件：
  - 本機 `npm run lint` 可執行且無錯誤。
  - CI 可成功跑 lint job。
- 工時估算：4-6 小時
- 相依：無
- 風險：中（規則過嚴可能一次噴大量歷史問題）
- 建議策略：先「可運行」，歷史債另開清理票。

## Ticket P0-2：Renderer 測試基礎設施穩定化
- 目的：讓 `npm test` 不因 `window.electronAPI` 初始化時序失敗。
- 範圍：
  - 在 `tests/unit/renderer/vitest.setup.ts` 建立完整 `window.electronAPI` 基礎 mock（至少覆蓋常用子 API 與事件訂閱函式）
  - 調整個別測試（如 DataExplorer/SidebarV2）避免重複且不完整 mock
  - 補 `onStatusChanged` 等 hook 需求 API
- 驗收條件：
  - `npm run test:unit` 全綠。
  - `npm test` 不再因 renderer 測試失敗。
- 工時估算：6-10 小時
- 相依：P0-1（建議先完成）
- 風險：中高（測試耦合與 preload API 擴張）

## Ticket P0-3：測試命令分層與 smoke gate
- 目的：建立可診斷、可短路的測試流程。
- 範圍：
  - 新增 script：`test:renderer`、`test:smoke`（最小 e2e）
  - 將既有 `test` 拆為明確順序：typecheck -> unit-main -> unit-renderer -> build -> e2e-smoke
  - e2e smoke 僅保留「應用可啟動 + 核心頁面可見」
- 驗收條件：
  - `npm run test:smoke` 在 CI headless 可執行。
  - 一旦 smoke 失敗，pipeline 可快速停止。
- 工時估算：4-8 小時
- 相依：P0-2
- 風險：中（Electron + Playwright 啟動路徑差異）

## Ticket P0-4：建立 CI Workflow（PR Gate）
- 目的：把品質閘門制度化，避免回歸。
- 範圍：
  - 建立 `.github/workflows/ci.yml`
  - Job 順序：install -> lint -> typecheck -> unit-main -> unit-renderer -> build -> smoke
  - 啟用 PR/Push 觸發與失敗阻擋
- 驗收條件：
  - 新 PR 會自動觸發 CI。
  - 任一 gate fail 時 PR 顯示失敗。
- 工時估算：3-5 小時
- 相依：P0-1 ~ P0-3
- 風險：低

## Ticket P0-5：文件與開發者工作流同步
- 目的：避免文件與實際指令不一致。
- 範圍：
  - 更新 README 的 build/package/test 指令
  - 新增「本地品質檢查順序」段落
  - 補充常見錯誤排查（lint config、electron e2e 啟動）
- 驗收條件：
  - 新成員可依 README 一次跑通檢查。
  - 指令與 `package.json` 一致。
- 工時估算：2-3 小時
- 相依：P0-3
- 風險：低

## 建議執行順序（1 週）
1. Day 1：P0-1
2. Day 2-3：P0-2
3. Day 4：P0-3
4. Day 5：P0-4 + P0-5

## Gate（Phase 0 完成判定）
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:main` ✅
- `npm run test:unit` ✅
- `npm run build` ✅
- `npm run test:smoke` ✅
- GitHub PR CI ✅

## 人力配置（最小）
- 1 位前端/測試工程師（P0-2, P0-3）
- 1 位平台工程師（P0-1, P0-4）
- 1 位 Tech Lead 兼 reviewer（全程）
