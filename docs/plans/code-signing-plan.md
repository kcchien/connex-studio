# 程式碼簽署計畫（Code Signing）

> 建立日期：2026-03-22
> 狀態：規劃階段

---

## 一、結論與建議

程式碼簽署是正式發行桌面應用程式的必要條件。未簽署的應用程式在 macOS 上會被 Gatekeeper 阻擋、在 Windows 上會觸發 SmartScreen 警告，嚴重影響使用者信任度。建議在確定發行策略（直接下載或上架應用商店）後，優先處理 macOS 與 Windows 的簽署設定。

**預估年度費用**：約 400 至 600 美元（Apple 開發者計畫 + Windows 延伸驗證憑證）。

---

## 二、各平台簽署需求

### 2.1 macOS

| 項目 | 說明 |
|------|------|
| 前提 | 加入 Apple 開發者計畫（Apple Developer Program），年費 99 美元 |
| 簽署憑證 | 開發者身分識別應用程式憑證（Developer ID Application Certificate） |
| 公證（Notarization） | 透過 `notarytool` 命令列工具提交至 Apple 伺服器進行公證 |
| 強化執行環境（Hardened Runtime） | 必須啟用，需配置權限清單（Entitlements）檔案 |

**electron-builder 設定**：

```yaml
mac:
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  hardenedRuntime: true
  entitlements: "build/entitlements.mac.plist"
  entitlementsInherit: "build/entitlements.mac.inherit.plist"
  notarize:
    teamId: "TEAM_ID"
```

**權限清單檔案需包含的項目**（依本專案需求）：

- `com.apple.security.cs.allow-jit`：允許即時編譯（JIT），Chromium 引擎需要
- `com.apple.security.cs.allow-unsigned-executable-memory`：允許未簽署的可執行記憶體
- `com.apple.security.network.client`：允許網路連線（Modbus TCP、MQTT、OPC UA 皆需要）

### 2.2 Windows

| 項目 | 說明 |
|------|------|
| 簽署憑證 | 延伸驗證程式碼簽署憑證（EV Code Signing Certificate），需向憑證機構（CA）購買 |
| 常見憑證機構 | DigiCert、Sectigo、GlobalSign |
| 年費 | 約 300 至 500 美元（依憑證機構與方案而定） |
| 硬體權杖（Token） | EV 憑證必須使用 USB 硬體權杖（如 SafeNet）儲存私鑰 |
| SmartScreen 信譽 | 使用 EV 憑證後，SmartScreen 信譽會隨簽署次數逐步建立 |

**electron-builder 設定**：

```yaml
win:
  signingHashAlgorithms:
    - sha256
  sign: "./scripts/sign.js"        # 自訂簽署指令碼（調用 signtool 或雲端簽署服務）
  certificateSubjectName: "Your Company Name"
```

**注意事項**：

- 雲端簽署（Cloud Signing）是近年趨勢，可免去實體硬體權杖的管理負擔。DigiCert KeyLocker 等服務支援遠端簽署
- 持續整合（CI）環境中使用硬體權杖需要額外設定（如 USB 透傳），雲端簽署方案更適合自動化流程

### 2.3 Linux

| 項目 | 說明 |
|------|------|
| AppImage / deb / rpm | 不需要簽署即可發行 |
| 選擇性 GPG 簽署 | 若透過套件倉庫（Package Repository）發行，可用 GPG 簽署增加可信度 |

Linux 發行不存在類似 Gatekeeper 或 SmartScreen 的系統級阻擋機制，因此簽署為選用項目。

---

## 三、費用摘要

| 項目 | 費用（年） | 必要性 |
|------|-----------|--------|
| Apple 開發者計畫 | 99 美元 | macOS 發行必要 |
| Windows EV 程式碼簽署憑證 | 300–500 美元 | Windows 發行強烈建議 |
| Linux GPG 簽署 | 免費 | 選用 |
| **合計** | **約 400–600 美元** | |

---

## 四、前置決策

在投入簽署設定之前，需先確定以下事項：

1. **發行策略**：直接下載（官網 / GitHub Releases）或上架應用商店（Mac App Store / Microsoft Store）？應用商店有各自的簽署與審核機制，需求不同
2. **持續整合流程**：是否需要在 CI 中自動簽署？若是，Windows 簽署建議採用雲端簽署方案，避免硬體權杖的管理複雜度
3. **法人主體**：簽署憑證需綁定公司或個人身分，需確認以哪個主體申請

---

## 五、建議執行順序

1. 確定發行策略與法人主體
2. 申請 Apple 開發者計畫，取得簽署憑證
3. 建立 macOS 權限清單檔案，配置 electron-builder 的公證設定
4. 購買 Windows EV 憑證，配置簽署指令碼
5. 在持續整合流程中整合自動簽署
6. 驗證：在乾淨的機器上安裝已簽署的應用程式，確認無任何安全警告

---

## 六、參考資源

- [Electron 程式碼簽署指南](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Electron 公證（macOS）](https://www.electronjs.org/docs/latest/tutorial/notarization)
- [electron-builder 程式碼簽署文件](https://www.electron.build/code-signing)
- [Apple 開發者計畫](https://developer.apple.com/programs/)
- [DigiCert EV 程式碼簽署](https://www.digicert.com/signing/code-signing-certificates)
