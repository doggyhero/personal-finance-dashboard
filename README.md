# 個人財務管理儀表板 (Personal Finance Dashboard)

專為台灣與海外跨國資產配置打造的純前端個人財務儀表板。免裝伺服器、無須資料庫、零外部依賴，本機瀏覽器直接開啟即可追蹤台美雙幣淨值、股權配置與被動現金流。

> [!IMPORTANT]
> **免責聲明 (Disclaimer)**
>
> 本專案為個人開源財務整理與資訊展示工具，不構成任何形式之投資、理財、稅務或法律建議。所有數據計算與分析僅供參考，實際投資與資產配置決策請使用者自行審慎評估，並自負風險。
>
> *This project is for personal use and informational purposes only. It is not intended as financial, investment, tax, or legal advice. Use at your own risk.*

---

## 特色

- **100% 本機離線運作**：純 HTML/JS 單頁應用，雙擊即可開啟。所有財務資料均儲存在本機瀏覽器的 LocalStorage，絕不上傳第三方伺服器，嚴格保護個人資產隱私。
- **台美跨國雙幣整合**：支援 TWD 與 USD 跨幣別資產即時換算，完整追蹤銀行活定存、台美股持股成本、即時市價與未實現損益。
- **彈性帳戶與資產配置**：可自由新增或刪除銀行、券商帳戶，內建緊急預備金跑道分析與風險承受度檢視。
- **資料匯出與備份**：支援匯出相容 Excel / Google Sheets 的 UTF-8 BOM CSV 報表，並提供完整 JSON 格式時間戳備份。
- **AI 策略輔助**：支援串接 Google Gemini API，快速提供跨期淨值走勢與資產配置的健康度診斷。

---

## 快速上手

1. **開啟程式**：下載本專案後，直接以任一瀏覽器（Chrome、Edge、Safari、Firefox）開啟 `dashboard.html`。
2. **體驗示範情境**：點擊頂部工具列的「🎲 隨機情境」，即可自動載入不同配置風格的示範數據並體驗圖表互動。
3. **建立自己的帳戶**：點擊頂部「🏦 帳戶管理」自訂您的銀行與券商清單，即可開始在「快照管理」中記錄個人資產。

---

## 測試與驗證

本專案採零依賴設計，直接使用 Node.js (v18+) 內建模組即可執行完整測試套件：

```bash
# 1. 驗證示範數據的結構與數學邏輯
node scripts/validate_data.js data/sample_data.json

# 2. 執行 171 項端到端與對抗性測試
node tests/e2e_test_runner.js
```

---

## 授權條款

本專案採用 [MIT License](./LICENSE) 釋出。
