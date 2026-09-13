# Project: Personal Finance Dashboard & Data Management System

## Architecture
- **Type**: Standalone Single-Page Application (SPA) & Zero-Backend Data Management
- **Tech Stack**: HTML5, Vanilla JavaScript (ES2022+), Tailwind CSS (CDN), Chart.js (CDN), File System Access API
- **Data Layer**: Browser LocalStorage & Local `data/sample_data.json` adhering to canonical open schema; automated JSON backup export
- **Testing Architecture**: Multi-tier opaque-box test runner (`tests/e2e_test_runner.js` / Node.js test harness + DOM/browser assertion suite)

```
personal-finance-dashboard/
├── dashboard.html          # Main SPA with 6 functional tabs & dynamic recalculation
├── data/
│   └── sample_data.json   # Canonical demonstration dataset (5 accounts, TW/US stock positions)
├── config/
│   └── env.example.js     # Gemini API configuration template
├── scripts/
│   └── validate_data.js   # Dataset schema & arithmetic validation engine
├── tests/                 # Comprehensive Multi-Tier E2E Test Suite (Tiers 1-5)
│   ├── e2e_test_runner.js # Node.js automated test runner & test reporter
│   ├── tier1_features.test.js
│   ├── tier2_boundaries.test.js
│   ├── tier3_combinations.test.js
│   ├── tier4_scenarios.test.js
│   └── tier5_adversarial.test.js
└── docs/specs/            # Technical specifications & test documentation
```

---

## Feature Inventory

| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | Zero-Backend Client Architecture | 100% client-side execution in any modern browser without web servers | Core Architecture | VERIFIED |
| 2 | Dynamic Account Management | Real-time creation, deletion, and categorization of bank and broker accounts | Core Feature | VERIFIED |
| 3 | Schema & Arithmetic Validation | Verify net worth, multi-currency sums, and balance integrity | Data Layer | VERIFIED |
| 4 | Tab 1: 資產總覽 (Overview) | Net worth KPIs (TWD/USD), Asset Allocation Doughnut, Currency Ratio, Historical Net Worth Line Chart | Dashboard UI | VERIFIED |
| 5 | Tab 2: 快照管理 (Snapshots) | Chronological snapshot table, detail view, and "新增快照" modal | Dashboard UI | VERIFIED |
| 6 | Clone Snapshot ("帶入上一期數值") | 1-click clone previous snapshot account values into new snapshot entry with live total preview | Dashboard UI | VERIFIED |
| 7 | Tab 3: 台美股持股管理 (Stocks) | In-line editable stock tables (TW & US), share counts, avg cost, current price, dynamic P&L and ROI% | Dashboard UI | VERIFIED |
| 8 | Stock Market Value Recalculation | Real-time reactive updates to unrealized gains, portfolio totals, and asset allocation upon stock edit | Dashboard UI | VERIFIED |
| 9 | Tab 4: 保險與儲蓄險 (Insurance) | Policy records table, policy terms, maturity dates, annual premium, USD/TWD cash values | Dashboard UI | VERIFIED |
| 10 | Tab 5: 投資決策與約束 (Constraints) | Drawdown risk capacity gauge (50% equity cap with headroom calculation) | Dashboard UI | VERIFIED |
| 11 | Emergency Runway Reserve | Configurable emergency reserve tracking true deployable cash | Dashboard UI | VERIFIED |
| 12 | US Estate Tax Exposure Monitor | US-situs stock total vs $60,000 NRA exemption with exposure warning | Dashboard UI | VERIFIED |
| 13 | AI Financial Analysis & Rule Engine | Google Gemini API integration and instant built-in deterministic rule engine | AI Diagnostics | VERIFIED |
| 14 | Tab 6: 資料存取與備份 (Data I/O) | File System Access API `showOpenFilePicker()` / `showSaveFilePicker()` for direct disk sync | Data Management | VERIFIED |
| 15 | File I/O Fallback Support | Standard `<input type="file">` and Blob download for non-Chromium or unsupported environments | Data Management | VERIFIED |
| 16 | 1-Click Timestamped Backup | Generate and download `finance_data_backup_YYYYMMDD_HHMMSS.json` | Data Management | VERIFIED |
| 17 | CSV Export with UTF-8 BOM | Export Portfolio, Snapshots History, and Account Balances with `\uFEFF` for Excel | Data Management | VERIFIED |
| 18 | Dynamic Recalculation Engine | Full reactive dependency graph across FX rates, account balances, stock prices, and KPIs | Engine | VERIFIED |
| 19 | Responsive Dark/Modern Styling | Clean Tailwind CSS typography, color-coded positive/negative badges, mobile & desktop layouts | UI/UX | VERIFIED |
| 20 | E2E Test Suite (Tiers 1-5) | Requirement-driven & adversarial test suite validating all functionality | Quality Assurance | VERIFIED |

---

## Technical Standards
- **Zero Dependencies**: Core application runs natively without build steps, bundlers, or package managers.
- **Privacy First**: Financial data resides purely in browser memory or local storage.
- **Cross-Platform Compatibility**: Full functionality across Chrome, Edge, Firefox, Safari, and mobile viewports.
