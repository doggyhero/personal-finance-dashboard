# E2E Test Suite Ready

## Test Runner
- Command: `node tests/e2e_test_runner.js`
- Sub-tier Commands:
  - `node tests/e2e_test_runner.js --tier=1` (Tier 1: Feature & Baseline Integrity)
  - `node tests/e2e_test_runner.js --tier=2` (Tier 2: Boundary & Mathematical Constraints)
  - `node tests/e2e_test_runner.js --tier=3` (Tier 3: Interactive Workflows & State Combinations)
  - `node tests/e2e_test_runner.js --tier=4` (Tier 4: Real-World Application Scenarios)
  - `node tests/e2e_test_runner.js --tier=5` (Tier 5: Adversarial Stress & Resiliency)
- Expected Result: **All tests pass with exit code 0** (0 failures, 0 skipped, execution duration < 1s).

---

## Coverage Summary

| Tier | Category | Description |
|------|:--------:|-------------|
| **1. Feature Coverage** | Features | Verification of accounts metadata, 6 dashboard tabs UI navigation, financial math formulas, snapshot clone lifecycle, CSV UTF-8 BOM `\uFEFF` / JSON I/O, quote API fallback, Chart.js reactive synchronization. |
| **2. Boundary & Corner Cases** | Boundaries | Extreme FX rates (0/negative/hyper), zero cost basis stock P&L division-by-zero protection, integer limits, sub-cent currency rounding, cash reserve deficit warnings, $60k US estate tax threshold, schema violation handling, XSS escaping, and API resilience. |
| **3. Cross-Feature Combinations** | Workflows | Multi-step interactive workflows testing snapshot cloning with historical immutability, global FX rate shock multi-tab live sync, debt linkage with CSV/JSON roundtrip, stock dividend tax drag, market crash buffer enforcement, and multi-broker rebalancing. |
| **4. Real-World Application Scenarios** | Scenarios | End-to-end user workflows: Annual Financial Review (YoY growth & attribution), Portfolio Rebalancing, Cross-Border Estate ($60k limit) & Tax Monitoring, Cash Runway Stress Testing, and Multi-Currency Complete Lifecycle. |
| **5. Adversarial Stress & Security** | Security | Deep property tampering, prototype poisoning defenses, extreme floating-point precision drift, DOM sanitization against script injection. |

---

## Technical Attestation
- **Zero External Dependencies**: Pure Node.js native ES2022+ architecture.
- **Cross-Platform Verification**: Verified across Windows, macOS, and Linux environments.
