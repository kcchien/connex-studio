# Findings（商用化規劃依據）

## 已確認事實
1. `typecheck` 通過。
2. `build` 通過。
3. `lint` 失敗（ESLint v9 設定檔缺失）。
4. `npm test` 因 renderer 測試失敗而失敗。
5. `test:main` 通過，但含多個 OPC UA `it.todo`（代表覆蓋率與完成度不足）。
6. `test:e2e` 出現 `Process failed to launch`，可作為環境/啟動路徑風險訊號。

## 架構/產品面風險
1. 多個服務層功能仍有 TODO（載入/持久化/實作完整度）。
2. CollectionRunner 有模擬執行跡象（random value），不符合商用驗證預期。
3. Bridge 自動恢復流程接線完整度需再次驗證。
4. OPC UA 憑證管理有未完成區塊（server cert retrieval TODO）。
5. 缺少 CI workflow，無法形成穩定發布閘門。

## 工業物聯網商用判斷（摘要）
- 目前屬於「可展示功能 + 部分可用」，未達「可承諾 SLA 的商用等級」。
- 最優先是可驗證性、可恢復性、可追蹤性，而非新增功能數量。
