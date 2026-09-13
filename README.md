# 📊 個人財務管理儀表板 (Personal Finance Dashboard)

一個專注於個人跨國資產配置、淨值追蹤、投資決策與 AI 智能分析的現代化單頁面前端系統（SPA）。

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Tests: 171 Passing](https://img.shields.io/badge/Tests-171%20Passed-brightgreen.svg)](./tests/)
[![Architecture: Zero Backend](https://img.shields.io/badge/Architecture-100%25%20Client--Side-blue.svg)](./dashboard.html)

---

## 🌟 核心亮點 (Key Features)

- 🌐 **純前端單頁架構 (Zero-Backend SPA)**：雙擊 `dashboard.html` 即可在任何現代瀏覽器（Chrome、Edge、Safari、Firefox）直接開啟，無需安裝伺服器或資料庫。
- 🔒 **隱私優先與本機離線安全**：所有財務數據預設持久化於瀏覽器的 `LocalStorage`，絕不主動向外傳輸您的個人資產隱私。
- 🏦 **動態金融機構與帳戶管理**：
  - 支援自由**新增**或**刪除**銀行活存、定儲、台股與美股券商（如玉山、富邦、Chase、Firstrade、Interactive Brokers 等）及保險帳戶。
  - 自動依幣別（TWD / USD）與資產性質即時歸類並重新計算總淨值。
- 🎲 **隨機示範情境骰子 (Snapshot Randomizer)**：
  - 頂部工具列提供 🎲 按鈕，可一鍵隨機生成多種財務情境（小資存股族、美股科技派、穩健資產守護）。
  - 自動隨機擾動帳戶餘額、匯率與持股損益，方便快速體驗圖表連動與全功能操作。
- 📈 **跨國與雙幣別資產整合**：
  - 支援 TWD 與 USD 跨國匯率即時折算。
  - 台股與美股逐筆持股追蹤、持有成本、即時市價與未實現損益（ROI）分析。
- 🤖 **AI 財務總結與策略顧問**：
  - 整合 Google Gemini API，支援輸入金鑰後針對各期快照差異、資產配置健康度與跨國遺產稅/扣繳風險進行智慧診斷。
- 💾 **多格式匯入與備份機制**：
  - 支援一鍵匯出相容於 Excel / Google Sheets 的 UTF-8 BOM CSV 報表。
  - 支援本機 JSON 數據檔快速匯入與時間戳備份下載。
- 🧪 **企業級工程品質**：
  - 內建 171 項純原生 Node.js E2E 與對抗性測試（Tier 1 ~ Tier 5），全面涵蓋數學精確度、極端市場崩盤壓力測試與 XSS 安全防禦。

---

## 🏗️ 專案目錄結構 (Project Structure)

```text
personal-finance-dashboard/
├── 🌐 dashboard.html          # 前端核心應用 (雙擊即可直接以瀏覽器開啟)
│
├── 🔒 config/                 # [環境配置]
│   └── env.example.js         # ✅ [範本] Gemini API Key 設定範本
│
├── 📊 data/                   # [資料層]
│   └── sample_data.json       # ✅ [示範數據] 脫敏示範數據 (供快速展示與測試)
│
├── 🛠️ scripts/                # [工具程式]
│   └── validate_data.js       # 數據一致性與算術邏輯稽核引擎
│
├── 🧪 tests/                  # [測試套件] 全方位 171 項 E2E 與極端邊界測試
│   ├── e2e_test_runner.js     # 原生測試執行器
│   └── tier1 ~ tier5...js     # 5 個階層的功能、數學與對抗性測試
│
├── 📝 docs/                   # [系統規範]
│   └── specs/                 # 架構定義與測試規範 (PROJECT.md, TEST_INFRA.md 等)
│
├── 🛡️ .gitignore              # Git 安全排除規則 (已排除私人數據與金鑰)
├── 📜 LICENSE                 # MIT 開源授權條款
└── 📖 README.md               # 專案說明文件
```

---

## 🚀 快速開始 (Quick Start)

### 1. 本地直接執行
1. 下載或複製本專案後，直接使用瀏覽器開啟根目錄的 [`dashboard.html`](./dashboard.html)。
2. 點擊頂部工具列的 🎲 **「隨機情境」** 按鈕，即可立即看到不同的示範資產走勢與圖表！
3. 若需啟用 AI 分析功能，複製 `config/env.example.js` 為 `config/env.js` 並填入您的 Gemini API Key 即可（或於 AI 彈窗中直接輸入）。

### 2. 管理您自己的財務資料
- **自訂帳戶**：點擊頂部工具列的 🏦 **「帳戶管理」**，新增您平常使用的銀行或券商，並刪除不需要的示範帳戶。
- **紀錄快照**：前往「📝 快照管理與輸入」分頁，點擊「➕ 新增資產快照」紀錄最新一期的帳戶結餘。
- **資料匯入/匯出**：前往「💾 資料匯出與備份」分頁，可隨時下載完整的 JSON 備份檔，或載入先前備份的數據。

---

## 🧪 測試與資料稽核 (Testing & Validation)

本專案堅持 **零外部 NPM 依賴 (Zero external dependencies)**，所有測試與驗證皆使用純原生 Node.js (v18+) 執行：

```bash
# 1. 驗證資料集架構與數學一致性
node scripts/validate_data.js data/sample_data.json

# 2. 執行全套 171 項自動化 E2E 測試
node tests/e2e_test_runner.js
```

測試套件涵蓋 5 大階層：
- **Tier 1**：功能完整性與基礎架構（42 項測試）
- **Tier 2**：邊界條件與數學約束（37 項測試）
- **Tier 3**：使用者互動流程與狀態組合（6 項測試）
- **Tier 4**：真實世界金融情境與極端壓力測試（12 項測試）
- **Tier 5**：對抗性防禦、精確度漂移與 XSS 防護（74 項測試）

---

## 📄 授權條款 (License)

本專案基於 [MIT License](./LICENSE) 釋出，您可以自由地使用、修改、整合與商業應用。
