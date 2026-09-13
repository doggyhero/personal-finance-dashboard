# E2E Test Infra: Personal Finance Dashboard & Data Management System

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests validate system behavior, financial mathematics, file contracts, state mutations, and UI data representations against authoritative user requirements and domain constraints without coupling to brittle internal markup details.
- **Zero-Dependency Native Architecture**: The test runner (`tests/e2e_test_runner.js`) executes in standard Node.js environments with built-in DOM/Browser mocking (`window`, `document`, `localStorage`, File System Access API, `Chart.js`) and financial assertion primitives (`assertCloseTo`, `assertEqual`, `assertDeepEqual`).
- **Deterministic Golden Baseline**: Tested against canonical demonstration dataset (`data/sample_data.json`) validating multi-currency cash balances, TW equities, US equities, and historical snapshots.
- **Comprehensive Multi-Tier Hierarchy**: Feature Coverage, Boundary Value Analysis, Pairwise Combinatorial Testing, Real-World Workload Scenarios, and Adversarial Resilience.

---

## Feature Inventory & Test Mapping

| # | Feature Domain | Test Focus | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | **Account Categorization & State** | Account metadata, currency classification, dynamic addition/removal | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | **Dashboard Navigation & Tabs** | 6 functional tabs, active tab switching, modal open/close | ✓ | ✓ | - | - | - |
| 3 | **Financial Math & Formulas** | Net worth calculations, FX conversion, ROI%, unrealized P&L | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | **Snapshot Lifecycle & Cloning** | Snapshot creation, deep cloning, historical immutability | ✓ | ✓ | ✓ | ✓ | - |
| 5 | **Data I/O & CSV Export** | UTF-8 BOM CSV generation, JSON import/export, File System Access API | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | **Stock Positions & Sync** | TW and US stock tracking, cost basis, live market value sync | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | **Chart.js Reactive Extraction** | Visual data synchronization, dataset mutation, chart reactivity | ✓ | ✓ | - | ✓ | - |
| 8 | **Risk Constraints & Tax Limits** | 50% equity cap, emergency reserve calculation, US NRA estate tax ($60k threshold) | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Test Architecture & Directory Layout

```
tests/
├── e2e_test_runner.js         # Unified test runner, CLI args parser, DOM/FSA mock harness, reporter
├── tier1_features.test.js     # Tier 1: Schema & Feature Coverage
├── tier2_boundaries.test.js   # Tier 2: Boundary & Mathematical Constraints
├── tier3_combinations.test.js # Tier 3: Cross-Feature Multi-Step Workflows
├── tier4_scenarios.test.js    # Tier 4: Real-World Application Workload Scenarios
└── tier5_adversarial.test.js  # Tier 5: Adversarial Stress & XSS Hardening
```

### Test Runner Invocation
```bash
# Run all tiers
node tests/e2e_test_runner.js

# Run specific tier
node tests/e2e_test_runner.js --tier=1
node tests/e2e_test_runner.js --tier=2
node tests/e2e_test_runner.js --tier=3
node tests/e2e_test_runner.js --tier=4
node tests/e2e_test_runner.js --tier=5

# Run with verbose reporting or filter
node tests/e2e_test_runner.js --verbose
node tests/e2e_test_runner.js --filter="Rebalancing"
```

### Pass/Fail Semantics
- Exit code `0`: All assertions across requested test suites passed.
- Exit code `1`: One or more test assertions failed, or an unhandled exception occurred.
- Formatted ANSI terminal scoreboard with execution duration, tier breakdown, pass/fail counts, and failure stack traces.

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario Name | Features Exercised | Domain Invariants |
|---|---|---|---|
| 1 | **Annual Financial Review** | Multi-snapshot ingestion, YoY delta & %, asset class migration | Evaluates chronological snapshots, growth attribution, and cash vs equity allocation shifts. |
| 2 | **Portfolio Rebalancing Check** | Target vs actual equity gap, cash DCA deployment | Detects asset drift, calculates systematic DCA deployment tranches to restore allocation. |
| 3 | **Cross-Border Tax Monitoring** | US NRA estate tax ($60k limit, excess tracking), dividend withholding | Evaluates US equity vs $60,000 threshold and tracks cross-border tax exemption limits. |
| 4 | **Cash Runway & Emergency Stress Test** | Equity crash simulation, living expense inflation, income pause | Multi-factor shock stress testing: verifies household solvency and intact emergency reserve. |
| 5 | **Multi-Currency Complete Lifecycle** | Inflow/FX conversion -> Stock Buy -> Dividends -> Mark-to-Market -> CSV/JSON roundtrip | End-to-end multi-phase lifecycle preserving mathematical conservation of capital across currencies. |
