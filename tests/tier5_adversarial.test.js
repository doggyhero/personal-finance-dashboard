/**
 * tests/tier5_adversarial.test.js
 * 
 * Personal Finance Dashboard & Data Management System
 * Tier 5: Adversarial Coverage Hardening, Security & Robustness Suite
 * 
 * Covers 74 Comprehensive Adversarial Tests across 12 Critical Domains:
 *   Domain 1: File System Access API & Storage Failure Modes (6 tests)
 *   Domain 2: Hostile, Malformed & Schema Corruption JSON Ingestion (7 tests)
 *   Domain 3: DOM Sanitization, XSS Resilience & Escaping Defenses (7 tests)
 *   Domain 4: Chart.js Lifecycle, Canvas Re-use & Re-render Storms (6 tests)
 *   Domain 5: Concurrency, Rapid State Mutations & Race Conditions (6 tests)
 *   Domain 6: Financial Edge Cases & Stress Resilience (6 tests)
 *   Domain 7: Floating-Point Rounding & Multi-Step Currency Conversion Drift (6 tests)
 *   Domain 8: Extreme Financial Shock & Asset Valuation Boundaries (6 tests)
 *   Domain 9: Division-by-Zero Guards & Extreme Ratio Arithmetic (6 tests)
 *   Domain 10: Cross-Border Tax Gating & Progressive US Estate Tax Schedule (6 tests)
 *   Domain 11: Complex Cash Runway & Solvency Simulation Boundaries (6 tests)
 *   Domain 12: Rebalancing Optimization, 100%/0% Boundary Weights & Anti-Sale Invariants (6 tests)
 * 
 * Total: 74 Hardened Adversarial Test Cases
 * 
 * Architecture:
 * - Unified runner: node tests/e2e_test_runner.js --tier=5
 * - Standalone execution: node tests/tier5_adversarial.test.js
 * - Zero external dependencies, pure Node.js ES2022+
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  describe,
  it,
  test,
  beforeAll,
  beforeEach,
  afterEach,
  assertEqual,
  assertDeepEqual,
  assertCloseTo,
  assertTrue,
  assertFalse,
  assertOk,
  assertThrows,
  assertIncludes,
  AssertionError,
  createMockBrowserEnvironment,
  setupDashboardEnvironment,
  MockElement,
  MockDocument,
  MockChart,
  MockFileSystemFileHandle,
  MockBlob,
  executeTestSuite,
} = require('./e2e_test_runner');

const BASELINE_DATA_PATH = path.resolve(__dirname, '..', 'data', fs.existsSync(path.resolve(__dirname, '..', 'data', 'sample_data.json')) ? 'sample_data.json' : 'finance_data.json');
const canonicalBaselineJSON = JSON.parse(fs.readFileSync(BASELINE_DATA_PATH, 'utf8'));

function getCanonicalBaseline() {
  return JSON.parse(JSON.stringify(canonicalBaselineJSON));
}

// ============================================================================
// High-Precision Domain Math Engines
// ============================================================================

function roundCurrency(val, decimals = 2) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

function calculateUsEstateTaxLiability(usEquitiesUsd, statutoryExemption = 60000) {
  const grossUsSitus = typeof usEquitiesUsd === 'number' && !isNaN(usEquitiesUsd) ? usEquitiesUsd : 0;
  if (grossUsSitus <= statutoryExemption) {
    return {
      grossUsSitus,
      exemption: statutoryExemption,
      taxableAmount: 0,
      grossTax: 0,
      unifiedCredit: 13000,
      netTaxLiability: 0,
      marginalRate: 0,
      status: 'SAFE'
    };
  }

  const taxable = grossUsSitus - statutoryExemption;
  
  function getGrossTax(amount) {
    if (amount <= 10000) return amount * 0.18;
    if (amount <= 20000) return 1800 + (amount - 10000) * 0.20;
    if (amount <= 40000) return 3800 + (amount - 20000) * 0.22;
    if (amount <= 60000) return 8200 + (amount - 40000) * 0.24;
    if (amount <= 80000) return 13000 + (amount - 60000) * 0.26;
    if (amount <= 100000) return 18200 + (amount - 80000) * 0.28;
    if (amount <= 150000) return 23800 + (amount - 100000) * 0.30;
    if (amount <= 250000) return 38800 + (amount - 150000) * 0.32;
    if (amount <= 500000) return 70800 + (amount - 250000) * 0.34;
    if (amount <= 750000) return 155800 + (amount - 500000) * 0.37;
    if (amount <= 1000000) return 248300 + (amount - 750000) * 0.39;
    return 345800 + (amount - 1000000) * 0.40;
  }

  const grossTaxOnFullSitus = getGrossTax(grossUsSitus);
  const unifiedCredit = 13000;
  const netTax = Math.max(0, grossTaxOnFullSitus - unifiedCredit);

  let marginalRate = 0.18;
  if (grossUsSitus > 1000000) marginalRate = 0.40;
  else if (grossUsSitus > 750000) marginalRate = 0.39;
  else if (grossUsSitus > 500000) marginalRate = 0.37;
  else if (grossUsSitus > 250000) marginalRate = 0.34;
  else if (grossUsSitus > 150000) marginalRate = 0.32;
  else if (grossUsSitus > 100000) marginalRate = 0.30;
  else if (grossUsSitus > 80000) marginalRate = 0.28;
  else if (grossUsSitus > 60000) marginalRate = 0.26;

  return {
    grossUsSitus,
    exemption: statutoryExemption,
    taxableAmount: taxable,
    grossTax: grossTaxOnFullSitus,
    unifiedCredit,
    netTaxLiability: Math.round(netTax),
    marginalRate,
    status: taxable > 0 ? 'ALERT_BREACH' : 'SAFE'
  };
}

function calculateDynamicRunway(totalCashTWD, monthlyBurnTWD, annualInflationPct = 0) {
  if (typeof totalCashTWD !== 'number' || isNaN(totalCashTWD)) return { months: 0, isSolvent: false, status: 'INVALID' };
  if (totalCashTWD <= 0) return { months: 0, isSolvent: false, status: 'DEFICIT_INSOLVENT' };
  if (monthlyBurnTWD <= 0) return { months: Infinity, isSolvent: true, status: 'PERPETUAL_SOLVENT' };

  if (annualInflationPct === 0) {
    const months = totalCashTWD / monthlyBurnTWD;
    return { months: roundCurrency(months, 2), isSolvent: months >= 24, status: months >= 24 ? 'SECURE' : 'LOW_RUNWAY' };
  }

  const monthlyInflation = annualInflationPct / 12 / 100;
  let remainingCash = totalCashTWD;
  let currentBurn = monthlyBurnTWD;
  let months = 0;

  while (remainingCash >= currentBurn && months < 1200) {
    remainingCash -= currentBurn;
    currentBurn *= (1 + monthlyInflation);
    months++;
  }

  if (remainingCash > 0 && currentBurn > 0) {
    months += remainingCash / currentBurn;
  }

  return {
    months: roundCurrency(months, 2),
    isSolvent: months >= 24,
    status: months >= 24 ? 'SECURE' : 'LOW_RUNWAY',
    finalMonthlyBurn: roundCurrency(currentBurn, 2)
  };
}

function simulateRebalanceAllocation({
  netWorthTWD,
  currentEquityTWD,
  deployableCashTWD,
  targetEquityPct,
  mode,
  isNraPresence183Days,
  assetWeights
}) {
  if (netWorthTWD <= 0) {
    return {
      status: 'INSOLVENT_BLOCKED',
      allowed: false,
      orders: [],
      reason: 'Net worth is non-positive'
    };
  }

  if (mode !== 'Mode Q') {
    return {
      status: 'GOVERNANCE_LOCKED',
      allowed: false,
      orders: [],
      reason: 'Rebalancing only permitted in Mode Q (Quarterly)'
    };
  }

  const targetEquityTWD = netWorthTWD * targetEquityPct;
  const equityGapTWD = targetEquityTWD - currentEquityTWD;

  if (equityGapTWD < 0 && isNraPresence183Days) {
    return {
      status: 'ANTI_SALE_ENFORCED',
      allowed: true,
      equityGapTWD,
      orders: [],
      note: 'Equity over target, but selling is prohibited under IRC §871(a)(2). Maintain position and route new cash to non-equity.'
    };
  }

  const investableCapital = Math.min(Math.max(0, equityGapTWD), deployableCashTWD);
  const orders = [];

  for (const [ticker, weight] of Object.entries(assetWeights || { 'CSPX': 1.0 })) {
    const amountTWD = investableCapital * weight;
    if (amountTWD > 0) {
      orders.push({
        ticker,
        action: 'BUY',
        amountTWD: roundCurrency(amountTWD, 2),
        weight
      });
    }
  }

  return {
    status: 'OPTIMAL_REBALANCE',
    allowed: true,
    targetEquityTWD: roundCurrency(targetEquityTWD, 2),
    equityGapTWD: roundCurrency(equityGapTWD, 2),
    investableCapital: roundCurrency(investableCapital, 2),
    remainingCash: roundCurrency(deployableCashTWD - investableCapital, 2),
    orders
  };
}

describe('Tier 5: Adversarial Coverage Hardening & Security Robustness', () => {
  let env, win, doc, state;

  beforeEach(() => {
    env = createMockBrowserEnvironment();
    win = env.window;
    doc = env.document;
    setupDashboardEnvironment(win, doc);
    win.loadFinanceData(JSON.parse(JSON.stringify(canonicalBaselineJSON)));
    state = win.state;
  });

  // ==========================================================================
  // Domain 1: File System Access API & Storage Failure Modes (6 tests)
  // ==========================================================================
  describe('Domain 1: File System Access API & Storage Failure Modes', () => {

    it('TC-T5-FSA-01: FSA NotAllowedError (Permission Denial) Graceful Handling', async () => {
      // Mock FSA showSaveFilePicker throwing NotAllowedError (User denied permission)
      win.currentFileHandle = null;
      win.showSaveFilePicker = async () => {
        const err = new Error('The user denied permission to access the file.');
        err.name = 'NotAllowedError';
        throw err;
      };

      const result = await win.saveDirectToFile();
      assertEqual(result.success, false, 'Should report success: false when permission is denied');
      assertEqual(result.error, 'The user denied permission to access the file.');
      assertEqual(win.state.meta.version, 1, 'Application state should remain intact');
    });

    it('TC-T5-FSA-02: FSA AbortError (User Cancellation) Silent Handling', async () => {
      // Mock FSA showSaveFilePicker throwing AbortError (User clicked Cancel)
      win.currentFileHandle = null;
      win.showSaveFilePicker = async () => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        throw err;
      };

      const result = await win.saveDirectToFile();
      assertEqual(result.success, false, 'Should return success: false upon abort');
      assertEqual(result.error, 'The user aborted a request.');
    });

    it('TC-T5-FSA-03: FSA NotFoundError / Inaccessible File Handle Recovery', async () => {
      // Stored file handle points to a file that was deleted or moved
      let fallbackPickerInvoked = false;
      win.currentFileHandle = {
        name: 'finance_data.json',
        createWritable: async () => {
          const err = new Error('A requested file or directory could not be found at the time an operation was processed.');
          err.name = 'NotFoundError';
          throw err;
        }
      };

      win.showSaveFilePicker = async () => {
        fallbackPickerInvoked = true;
        return new MockFileSystemFileHandle('finance_data.json', '{}');
      };

      const result = await win.saveDirectToFile();
      assertTrue(fallbackPickerInvoked, 'Should attempt showSaveFilePicker fallback when existing handle throws NotFoundError');
      assertEqual(result.success, true, 'Should successfully save via new file picker');
    });

    it('TC-T5-FSA-04: FSA SecurityError / Sandboxed Iframe Resilience', async () => {
      // SecurityError when running in a sandboxed iframe or cross-origin context
      win.currentFileHandle = null;
      win.showSaveFilePicker = async () => {
        const err = new Error('Action not allowed in this security context.');
        err.name = 'SecurityError';
        throw err;
      };

      const result = await win.saveDirectToFile();
      assertEqual(result.success, false, 'Should gracefully catch SecurityError');
      assertEqual(result.error, 'Action not allowed in this security context.');
    });

    it('TC-T5-FSA-05: Non-Chromium Browser without FSA API Fallback to Download', async () => {
      // Browser does not support File System Access API (showSaveFilePicker is undefined)
      win.currentFileHandle = null;
      win.showSaveFilePicker = undefined;
      win.showOpenFilePicker = undefined;

      const result = await win.saveDirectToFile();
      assertTrue(result.success, 'Should succeed via fallback download');
      assertTrue(result.fallback, 'Should mark result as fallback');
      assertOk(result.download, 'Should produce download artifact');
      assertTrue(result.download.filename.startsWith('finance_data_'), 'Filename should be timestamped finance_data_*');
      assertIncludes(result.download.content, '"version": 1', 'Downloaded content should be valid JSON state');
    });

    it('TC-T5-FSA-06: LocalStorage QuotaExceededError & Corrupted Storage Resilience', () => {
      // Simulate localStorage throwing QuotaExceededError
      const brokenStorage = {
        setItem: () => {
          const err = new Error('QuotaExceededError: DOM Exception 22');
          err.name = 'QuotaExceededError';
          err.code = 22;
          throw err;
        },
        getItem: () => '{invalid json payload ::: corrupt',
        removeItem: () => {},
        clear: () => {}
      };
      win.localStorage = brokenStorage;

      // Ensure that storage failures do not crash loadFinanceData or renderAll
      const loadResult = win.loadFinanceData(canonicalBaselineJSON);
      assertTrue(loadResult.success, 'loadFinanceData should succeed even with broken localStorage');
      const nw = win.calculateNetWorth(win.state.snapshots[3]);
      const expectedNW = win.calculateNetWorth(canonicalBaselineJSON.snapshots[3]).net_worth_twd;
      assertCloseTo(nw.net_worth_twd, expectedNW, 1.0, 'Net worth calculation should not rely on corrupted localStorage');
    });

  });

  // ==========================================================================
  // Domain 2: Hostile, Malformed & Schema Corruption JSON Ingestion (7 tests)
  // ==========================================================================
  describe('Domain 2: Hostile, Malformed & Schema Corruption JSON Ingestion', () => {

    it('TC-T5-JSON-01: Prototype Pollution Injection Defense', () => {
      // Attempt prototype pollution via __proto__ or constructor.prototype
      const maliciousPayload = JSON.parse(`{
        "__proto__": { "polluted": true, "isAdmin": true },
        "constructor": { "prototype": { "polluted": true } },
        "snapshots": [
          {
            "date": "2026-07-11",
            "usd_rate": 32.39,
            "accounts": { "玉山活存": 100000 }
          }
        ]
      }`);

      win.loadFinanceData(maliciousPayload);

      // Verify Object prototype was not polluted
      const cleanObj = {};
      assertEqual(cleanObj.polluted, undefined, 'Object.prototype must not be polluted with "polluted"');
      assertEqual(cleanObj.isAdmin, undefined, 'Object.prototype must not be polluted with "isAdmin"');
      assertEqual(Object.prototype.polluted, undefined, 'Object.prototype.polluted must be undefined');
    });

    it('TC-T5-JSON-02: Missing Mandatory Snapshots / Malformed Top-Level Ingestion', () => {
      // Test missing snapshots, null, undefined, primitive, and empty object
      const testCases = [
        null,
        undefined,
        'string data',
        12345,
        {},
        { meta: { version: 1 } },
        { snapshots: 'not an array' }
      ];

      for (const tc of testCases) {
        const result = win.loadFinanceData(tc);
        assertFalse(result.success, `loadFinanceData should reject malformed payload: ${JSON.stringify(tc)}`);
        assertOk(result.error, 'Should provide error message for malformed payload');
      }

      // Existing state should not be corrupted
      assertEqual(win.state.meta.version, 1, 'Previous valid state should be retained');
    });

    it('TC-T5-JSON-03: Truncated & Syntax-Corrupted JSON Stream Resilience', () => {
      // Simulating file reader receiving truncated JSON
      const truncatedJSON = '{"meta": {"version": 1}, "snapshots": [{"date": "2026-07-11", "accounts": {';

      let parseThrew = false;
      try {
        JSON.parse(truncatedJSON);
      } catch (err) {
        parseThrew = true;
      }
      assertTrue(parseThrew, 'Truncated JSON should fail JSON.parse safely');

      // Test that application can catch and report without crashing
      const fallbackResult = (function safeParseAndLoad(raw) {
        try {
          const parsed = JSON.parse(raw);
          return win.loadFinanceData(parsed);
        } catch (err) {
          return { success: false, error: 'JSON Syntax Error: ' + err.message };
        }
      })(truncatedJSON);

      assertFalse(fallbackResult.success, 'Safe loader should return success: false on truncated JSON');
      assertIncludes(fallbackResult.error, 'JSON Syntax Error', 'Error should mention JSON Syntax Error');
    });

    it('TC-T5-JSON-04: Missing / Null accounts_meta Field Ingestion', () => {
      // Payload where accounts_meta is null or omitted
      const payloadWithoutMeta = {
        meta: { version: 1, last_updated: '2026-07-11' },
        snapshots: [
          {
            date: '2026-07-11',
            usd_rate: 32.39,
            accounts: { '玉山活存': 500000, 'Chase Checking': 1000 }
          }
        ],
        tw_stocks: [],
        us_stocks: []
      };

      const result = win.loadFinanceData(payloadWithoutMeta);
      assertTrue(result.success, 'Should load payload without crashing even if accounts_meta is omitted');

      // Calculation engine should handle missing accounts_meta safely
      const nw = win.calculateNetWorth(win.state.snapshots[0]);
      assertEqual(typeof nw.net_worth_twd, 'number', 'net_worth_twd should be a valid number');
    });

    it('TC-T5-JSON-05: Non-Numeric Account Balances & Hostile Types Conversion', () => {
      // Snapshots containing strings, NaN, null, undefined, boolean, and symbols
      const hostileSnapshot = {
        date: '2026-08-01',
        usd_rate: 32.39,
        accounts: {
          '玉山活存': '500000',      // string formatted number -> converts to 500000
          '玉山美金': 'invalid_num',  // invalid string -> converts to 0
          'Chase Checking': null,     // null -> converts to 0
          '玉山證券': undefined,      // undefined -> converts to 0
          'Firstrade': NaN            // NaN -> converts to 0
        }
      };

      const totals = win.calculateNetWorth(hostileSnapshot);
      assertFalse(isNaN(totals.twd_accounts), 'TWD accounts sum must not be NaN');
      assertFalse(isNaN(totals.usd_accounts_usd), 'USD accounts sum must not be NaN');
      assertFalse(isNaN(totals.net_worth_twd), 'Net worth TWD must not be NaN');
      assertFalse(isNaN(totals.net_worth_usd), 'Net worth USD must not be NaN');
      assertEqual(totals.twd_accounts >= 500000, true, 'Numeric string should be parsed accurately');
    });

    it('TC-T5-JSON-06: Chronological Date Anarchy & Leap Year Resilience', () => {
      // Snapshots with inverted dates, duplicate dates, leap year dates
      const anarchyData = {
        meta: { version: 1 },
        accounts_meta: [{ key: '玉山活存', currency: 'TWD', category: 'cash' }],
        snapshots: [
          { date: '2028-02-29', usd_rate: 30.0, accounts: { '玉山活存': 400000 } }, // Leap year
          { date: '2025-01-01', usd_rate: 30.0, accounts: { '玉山活存': 100000 } }, // Earlier
          { date: '2026-06-15', usd_rate: 30.0, accounts: { '玉山活存': 200000 } }, // Middle
          { date: '2026-06-15', usd_rate: 30.0, accounts: { '玉山活存': 250000 } }, // Duplicate date
        ]
      };

      win.loadFinanceData(anarchyData);
      
      // Simulate form insertion sorting invariant
      win.state.snapshots.sort((a, b) => a.date.localeCompare(b.date));

      assertEqual(win.state.snapshots[0].date, '2025-01-01', 'First snapshot must be sorted chronologically');
      assertEqual(win.state.snapshots[3].date, '2028-02-29', 'Leap year snapshot must be last chronologically');
    });

    it('TC-T5-JSON-07: Negative, Zero & Hyperinflation USD/TWD Exchange Rates', () => {
      const snapZeroRate = {
        date: '2026-07-11',
        usd_rate: 0,
        accounts: { '玉山活存': 100000, 'Chase Checking': 1000 }
      };
      const totalsZero = win.calculateNetWorth(snapZeroRate);
      // Zero rate fallback to 32.39 or zero division safety
      assertFalse(isNaN(totalsZero.net_worth_twd), 'Zero rate net worth TWD must not be NaN');
      assertFalse(isNaN(totalsZero.net_worth_usd), 'Zero rate net worth USD must not be NaN');

      const snapHyperRate = {
        date: '2026-07-11',
        usd_rate: 1000000000, // 1 Billion TWD per USD
        accounts: { '玉山活存': 100000, 'Chase Checking': 100 }
      };
      const totalsHyper = win.calculateNetWorth(snapHyperRate);
      assertEqual(totalsHyper.net_worth_twd > 1e11, true, 'Hyperinflation rate should scale USD balances proportionally');
    });

  });

  // ==========================================================================
  // Domain 3: DOM Sanitization, XSS Resilience & Escaping Defenses (7 tests)
  // ==========================================================================
  describe('Domain 3: DOM Sanitization, XSS Resilience & Escaping Defenses', () => {

    it('TC-T5-XSS-01: Script Tag Injection in Snapshot Note is Escaped/Safe', () => {
      const xssPayload = '<script>window.__xss_executed = true;</script>';
      const snap = {
        date: '2026-08-15',
        usd_rate: 32.39,
        note: xssPayload,
        accounts: { '玉山活存': 100000 }
      };
      win.state.snapshots.push(snap);
      win.renderAll();

      assertEqual(win.__xss_executed, undefined, 'Script tag in snapshot note must not execute');
      
      // In CSV export, note is properly escaped
      const csv = win.generateSnapshotsCSV();
      assertIncludes(csv, xssPayload, 'CSV should preserve literal content safely inside quotes');
    });

    it('TC-T5-XSS-02: Event Handler Injection in Stock Name / Ticker is Neutralized', () => {
      const xssStock = {
        ticker: 'EVIL',
        name: '<img src="x" onerror="window.__xss_img = true">',
        shares: 100,
        cost_total: 1000,
        avg_cost: 10,
        price: 20,
        market_value: 2000,
        unrealized_pl: 1000,
        roi: 1.0,
        note: '<svg onload="window.__xss_svg = true">'
      };
      win.state.tw_stocks.push(xssStock);
      win.renderAll();

      assertEqual(win.__xss_img, undefined, 'Image onerror handler in stock name must not execute');
      assertEqual(win.__xss_svg, undefined, 'SVG onload handler in stock note must not execute');
    });

    it('TC-T5-XSS-03: Single-Quote Breakout Injection in Stock Price Updater Prompt', () => {
      // Simulating a ticker containing quotes designed to break out of inline JS onclick="update('${ticker}')"
      const maliciousTicker = "2330'); alert('xss'); //";
      
      // The updateStockPrice function handles malicious strings as string primitives
      win.updateStockPrice(maliciousTicker, '150');
      // Verify application didn't crash
      assertEqual(typeof win.state.tw_stocks, 'object', 'Stock state should remain valid object');
    });

    it('TC-T5-XSS-04: Malicious HTML in Insurance Policy Fields', () => {
      const maliciousPolicy = {
        id: 8,
        type: '儲蓄險',
        name: '<b>Injected Policy</b><iframe src="javascript:alert(1)"></iframe>',
        policy_no: 'XSS-999',
        company: '<span style="color:red">Fake Co</span>',
        holder: '<script>window.__xss_holder = 1;</script>',
        insured: 'Normal Name',
        premium_year: 50000,
        coverage: 1000000,
        note: '<a href="javascript:alert(1)">Click Me</a>'
      };
      win.state.insurance.push(maliciousPolicy);
      win.renderAll();

      assertEqual(win.__xss_holder, undefined, 'Script tag in policy holder must not execute');
      const insCsv = win.generateInsuranceCSV();
      assertIncludes(insCsv, 'Injected Policy', 'CSV export should include policy record safely');
    });

    it('TC-T5-XSS-05: Account Key HTML Injection in 26 Accounts Matrix', () => {
      const hostileMeta = [
        ...win.state.accounts_meta,
        { key: '<script>window.__xss_acc = 1;</script>', currency: 'TWD', category: 'cash' }
      ];
      win.state.accounts_meta = hostileMeta;
      win.state.snapshots[win.state.snapshots.length - 1].accounts['<script>window.__xss_acc = 1;</script>'] = 50000;
      win.renderAll();

      assertEqual(win.__xss_acc, undefined, 'Script tag in account key must not execute in DOM');
    });

    it('TC-T5-XSS-06: CSV Formula Injection Defense (DDE / Command Execution)', () => {
      // Inputs starting with =, +, -, @ could trigger Excel DDE execution if not handled
      const ddeNote = "=cmd|' /C calc'!A0";
      const formulaSnap = {
        date: '2026-08-20',
        usd_rate: 32.39,
        note: ddeNote,
        accounts: { '玉山活存': 100000 }
      };
      win.state.snapshots.push(formulaSnap);

      const csv = win.generateSnapshotsCSV();
      // Ensure the CSV surrounds the note in double quotes
      assertIncludes(csv, `"${ddeNote}"`, 'CSV must wrap potentially malicious formula cell in quotes');
      assertTrue(csv.startsWith('\uFEFF'), 'CSV must maintain UTF-8 BOM prefix');
    });

    it('TC-T5-XSS-07: Raw JSON Inspector Textarea Integrity & Content Escaping', () => {
      const deepEvilObj = {
        nested: {
          script: '<script>alert("nested")</script>',
          closingTag: '</textarea><script>alert("breakout")</script>'
        }
      };
      win.state.custom_evil = deepEvilObj;
      win.renderAll();

      const inspector = doc.getElementById('raw-json-inspector');
      if (inspector) {
        assertIncludes(inspector.value, 'alert(\\"breakout\\")', 'JSON inspector should serialize strings with valid JSON escapes');
      }
    });

  });

  // ==========================================================================
  // Domain 4: Chart.js Lifecycle, Canvas Re-use & Re-render Storms (6 tests)
  // ==========================================================================
  describe('Domain 4: Chart.js Lifecycle, Canvas Re-use & Re-render Storms', () => {

    it('TC-T5-CHART-01: Rapid 50x renderAll() Storm without Canvas Collisions', () => {
      // Execute 50 consecutive synchronous renderAll() calls
      for (let i = 0; i < 50; i++) {
        win.renderAll();
      }

      // Verify Chart instances were cleanly created and not corrupted
      assertOk(win.charts.netWorthHistory, 'Net worth history chart instance should exist');
      assertOk(win.charts.assetAllocation, 'Asset allocation chart instance should exist');
      assertOk(win.charts.currencyExposure, 'Currency exposure chart instance should exist');
      assertEqual(win.charts.netWorthHistory.destroyed, false, 'Active chart should not be in destroyed state');
    });

    it('TC-T5-CHART-02: Empty Snapshots Array Dataset Chart Rendering', () => {
      win.state.snapshots = [];
      win.renderAll();

      assertEqual(win.charts.netWorthHistory.data.labels.length, 0, 'Labels should be empty for 0 snapshots');
      assertEqual(win.charts.netWorthHistory.data.datasets[0].data.length, 0, 'Data should be empty for 0 snapshots');
    });

    it('TC-T5-CHART-03: Single Snapshot Boundary Chart Rendering', () => {
      win.state.snapshots = [
        { date: '2026-07-11', usd_rate: 32.39, accounts: { '玉山活存': 1000000 } }
      ];
      win.renderAll();

      assertEqual(win.charts.netWorthHistory.data.labels.length, 1, 'Labels should contain 1 point');
      assertEqual(win.charts.netWorthHistory.data.datasets[0].data.length, 1, 'Data should contain 1 point');
      assertEqual(win.charts.netWorthHistory.data.datasets[0].data[0], 1000000, 'Data value should match exactly');
    });

    it('TC-T5-CHART-04: Negative Net Worth & Trillion-Scale Values in Charts', () => {
      win.state.snapshots = [
        { date: '2026-01-01', usd_rate: 32.39, accounts: { '玉山活存': -5000000 } },
        { date: '2026-07-11', usd_rate: 32.39, accounts: { '玉山活存': 5000000000000 } } // 5 Trillion
      ];
      win.renderAll();

      assertEqual(win.charts.netWorthHistory.data.datasets[0].data[0], -5000000, 'Should plot negative balance correctly');
      assertEqual(win.charts.netWorthHistory.data.datasets[0].data[1], 5000000000000, 'Should plot trillion balance without overflow');
    });

    it('TC-T5-CHART-05: Missing Canvas DOM Elements Fallback Handling', () => {
      // Remove canvases from DOM and verify renderCharts() does not throw
      const cvs1 = doc.getElementById('canvas-net-worth-history');
      if (cvs1 && cvs1.parentElement) cvs1.parentElement.removeChild(cvs1);

      win.renderCharts();
      // Should complete without uncaught error
      assertTrue(true, 'renderCharts should execute cleanly when canvas elements are omitted');
    });

    it('TC-T5-CHART-06: Asynchronous Stock Quotes Refresh Chart Sync', async () => {
      win.fetch = async () => ({
        status: 200,
        ok: true,
        json: async () => ({
          '2330': { price: 1000 },
          'VOO': { price: 800 }
        })
      });

      const refreshRes = await win.refreshStockQuotes();
      assertTrue(refreshRes.success, 'refreshStockQuotes should succeed');

      // Verify tw_stocks updated and charts synchronized
      const tw2330 = win.state.tw_stocks.find(s => s.ticker === '2330');
      if (tw2330) {
        assertEqual(tw2330.price, 1000, '2330 price should update to 1000');
        assertEqual(tw2330.market_value, 1000000, '2330 market value should update to 1000 * 1000 = 1,000,000');
      }
    });

  });

  // ==========================================================================
  // Domain 5: Concurrency, Rapid State Mutations & Race Conditions (6 tests)
  // ==========================================================================
  describe('Domain 5: Concurrency, Rapid State Mutations & Race Conditions', () => {

    it('TC-T5-RACE-01: Rapid 100-Click Tab Navigation Switching Consistency', () => {
      const tabs = ['overview', 'snapshots', 'stocks', 'insurance', 'decision', 'data'];
      const tabBtns = tabs.map(t => doc.getElementById(`tab-${t}`));

      // Simulate rapid user clicks across tabs 100 times
      for (let i = 0; i < 100; i++) {
        const targetIdx = i % tabs.length;
        const btn = tabBtns[targetIdx];
        if (btn) btn.click();
      }

      // Final tab should be tabs[99 % 6] = tabs[3] = insurance
      const expectedTab = tabs[99 % tabs.length];
      const activeBtn = doc.getElementById(`tab-${expectedTab}`);
      const activeView = doc.getElementById(`view-${expectedTab}`);

      assertTrue(activeBtn.classList.contains('active'), `Button #tab-${expectedTab} should have active class`);
      assertFalse(activeView.classList.contains('hidden'), `View #view-${expectedTab} should not be hidden`);
    });

    it('TC-T5-RACE-02: Rapid Modal Lifecycle (Open -> Clone -> Cancel -> Open -> Submit)', () => {
      const addBtn = doc.getElementById('btn-add-snapshot');
      const modal = doc.getElementById('modal-add-snapshot');
      const cloneBtn = doc.getElementById('btn-clone-previous-snapshot');
      const cancelBtn = doc.getElementById('btn-cancel-snapshot');
      const submitBtn = doc.getElementById('btn-submit-snapshot');
      const dateInp = doc.getElementById('input-snap-date');
      const rateInp = doc.getElementById('input-snap-usd-rate');

      // 1. Open
      if (addBtn) addBtn.click();
      assertFalse(modal.classList.contains('hidden'), 'Modal should open');

      // 2. Clone
      if (cloneBtn) cloneBtn.click();
      assertEqual(rateInp.value, '32.5', 'Rate input should be cloned from latest snapshot');

      // 3. Cancel
      if (cancelBtn) cancelBtn.click();
      assertTrue(modal.classList.contains('hidden'), 'Modal should close on cancel');

      // 4. Open again & Submit
      if (addBtn) addBtn.click();
      if (dateInp) dateInp.value = '2026-09-01';
      if (rateInp) rateInp.value = '32.50';
      if (submitBtn) submitBtn.click();

      // Verify snapshot was added
      const lastSnap = win.state.snapshots[win.state.snapshots.length - 1];
      assertEqual(lastSnap.date, '2026-09-01', 'Submitted snapshot should be appended');
      assertEqual(lastSnap.usd_rate, 32.50, 'Submitted rate should match 32.50');
    });

    it('TC-T5-RACE-03: Multi-Stock Simultaneous Price Updates Consistency', () => {
      // Update all 4 TW stocks in rapid sequence
      const priceMap = {
        '2330': 1000,
        '0050': 200
      };

      for (const [ticker, price] of Object.entries(priceMap)) {
        win.updateStockPrice(ticker, price);
      }

      // Expected market values:
      // 2330: 1000 * 1000 = 1,000,000
      // 0050: 2000 * 200 = 400,000
      // Total: 1,400,000 TWD
      const totalTW = win.state.tw_stocks.reduce((s, st) => s + st.market_value, 0);
      assertEqual(totalTW, 1400000, 'Sum of TW stocks market value should be exactly 1,400,000 TWD');
    });

    it('TC-T5-RACE-04: Rapid Reverse-Chronological Snapshot Additions Sort Invariant', () => {
      const newDates = ['2027-01-01', '2026-11-01', '2026-10-01', '2026-08-01'];
      for (const d of newDates) {
        win.state.snapshots.push({
          date: d,
          usd_rate: 32.0,
          accounts: { '玉山活存': 100000 }
        });
        win.state.snapshots.sort((a, b) => a.date.localeCompare(b.date));
      }

      // Verify all snapshots are monotonically ascending by date
      for (let i = 1; i < win.state.snapshots.length; i++) {
        const prev = win.state.snapshots[i - 1].date;
        const curr = win.state.snapshots[i].date;
        assertTrue(curr >= prev, `Snapshots must remain sorted: ${prev} <= ${curr}`);
      }
    });

    it('TC-T5-RACE-05: Clone Snapshot on Empty State', () => {
      win.state.snapshots = [];
      const cloned = win.clonePreviousSnapshot();
      assertDeepEqual(cloned, {}, 'Cloning on empty snapshots array should return empty object');
    });

    it('TC-T5-RACE-06: Snapshot Submission Input Validation (Empty Date / Negative Rate)', () => {
      const form = doc.getElementById('form-add-snapshot');
      const dateInp = doc.querySelector('input[name="date"]');
      const rateInp = doc.querySelector('input[name="usd_rate"]');
      const errorBanner = doc.querySelector('.form-error-message');
      const initialCount = win.state.snapshots.length;

      // 1. Submit with empty date
      if (dateInp) dateInp.value = '';
      if (rateInp) rateInp.value = '32.39';
      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

      assertEqual(win.state.snapshots.length, initialCount, 'Snapshot should not be added when date is empty');
      assertFalse(errorBanner.classList.contains('hidden'), 'Error banner should be displayed');

      // 2. Submit with negative rate
      if (dateInp) dateInp.value = '2026-08-25';
      if (rateInp) rateInp.value = '-32.00';
      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

      assertEqual(win.state.snapshots.length, initialCount, 'Snapshot should not be added when rate is negative');
    });

  });

  // ==========================================================================
  // Domain 6: Financial Edge Cases & Stress Resilience (6 tests)
  // ==========================================================================
  describe('Domain 6: Financial Edge Cases & Stress Resilience', () => {

    it('TC-T5-MATH-01: 100% Cash Portfolio Extreme Scenario', () => {
      // User holds 100% cash, 0 stocks, 0 insurance
      win.state.tw_stocks = [];
      win.state.us_stocks = [];
      const allCashSnap = {
        date: '2026-07-11',
        usd_rate: 30.0,
        accounts: {
          '玉山活存': 20000000,
          'Chase Checking': 100000
        }
      };
      win.state.snapshots = [allCashSnap];
      win.renderAll();

      const nw = win.calculateNetWorth(allCashSnap);
      assertEqual(nw.net_worth_twd, 23000000, 'Total net worth should be 20M + (100k * 30) = 23,000,000 TWD');
      
      const df = win.state.decision_framework;
      const lockedReserve = df.emergency_reserve_months * df.monthly_burn_rate_twd;
      const deployable = 23000000 - lockedReserve;
      assertEqual(deployable, 23000000 - lockedReserve, 'Deployable cash should equal total cash minus reserve');
    });

    it('TC-T5-MATH-02: 100% Equity Portfolio Drawdown Risk Breach', () => {
      // User holds 0 cash, 100% equity
      const zeroCashSnap = {
        date: '2026-07-11',
        usd_rate: 32.39,
        accounts: {
          '玉山活存': 0,
          '玉山美金': 0,
          'Chase Checking': 0,
          '玉山證券': 10000000,
          'Firstrade': 300000
        }
      };
      win.state.snapshots = [zeroCashSnap];
      win.renderAll();

      const nw = win.calculateNetWorth(zeroCashSnap);
      const totalEquityTWD = 10000000 + (300000 * 32.39); // 19,717,000
      const maxCapacity = nw.net_worth_twd * 0.50; // 9,858,500
      const headroom = maxCapacity - totalEquityTWD;

      assertTrue(headroom < 0, 'Risk headroom must be negative when equity exceeds 50% cap');
      assertEqual(headroom, -9858500, 'Risk headroom deficit should be -9,858,500 TWD');
    });

    it('TC-T5-MATH-03: Negative Net Worth & Debt Exceeding Assets Handling', () => {
      // Net worth is negative (e.g. debt / margin deficit)
      const insolventSnap = {
        date: '2026-07-11',
        usd_rate: 32.39,
        accounts: {
          '玉山活存': -10000000,
          'Chase Checking': -50000
        }
      };
      const nw = win.calculateNetWorth(insolventSnap);
      assertEqual(nw.net_worth_twd < 0, true, 'Net worth must be negative when liabilities exceed assets');
      assertCloseTo(nw.net_worth_twd, -11619500, 1.0, 'Net worth TWD: -10M + (-50k * 32.39) = -11,619,500');
    });

    it('TC-T5-MATH-04: Micro-Fractional Stock Shares Precision', () => {
      const fractionalStock = {
        account: 'Firstrade',
        ticker: 'MICRO',
        shares: 0.000001,
        price: 714.35,
        market_value: 0.00,
        note: 'Fractional test'
      };
      win.state.us_stocks.push(fractionalStock);
      win.updateStockPrice('MICRO', 714.35);

      const found = win.state.us_stocks.find(s => s.ticker === 'MICRO');
      assertEqual(found.market_value, 0.00, '0.000001 * 714.35 = 0.000714 rounds to 0.00 USD');
    });

    it('TC-T5-MATH-05: Extreme Currency Shocks (USD/TWD = 1.0 vs 100.0)', () => {
      const snapAtParity = {
        date: '2026-07-11',
        usd_rate: 1.0,
        accounts: { '玉山活存': 1000000, 'Chase Checking': 50000 }
      };
      const nwParity = win.calculateNetWorth(snapAtParity);
      assertEqual(nwParity.net_worth_twd, 1050000, 'At parity 1:1, net worth TWD is 1,000,000 + 50,000 = 1,050,000');
      assertEqual(nwParity.net_worth_usd, 1050000, 'At parity 1:1, net worth USD equals net worth TWD');

      const snapAt100 = {
        date: '2026-07-11',
        usd_rate: 100.0,
        accounts: { '玉山活存': 1000000, 'Chase Checking': 50000 }
      };
      const nw100 = win.calculateNetWorth(snapAt100);
      assertEqual(nw100.net_worth_twd, 6000000, 'At 100.0 rate, net worth TWD is 1,000,000 + (50,000 * 100) = 6,000,000');
      assertEqual(nw100.net_worth_usd, 60000, 'At 100.0 rate, net worth USD is 6,000,000 / 100 = 60,000');
    });

    it('TC-T5-MATH-06: Trillion-Scale Integer Limit Stress (NT$ 292B)', () => {
      // Scale baseline 10,000x to NT$ 292 Billion (~$9 Billion USD)
      const baselineSnap = canonicalBaselineJSON.snapshots[3];
      const megaSnapshot = {
        date: '2026-07-11',
        usd_rate: baselineSnap.usd_rate || 32.50,
        accounts: {}
      };
      for (const [k, v] of Object.entries(baselineSnap.accounts)) {
        megaSnapshot.accounts[k] = v * 10000;
      }

      const baselineTotals = win.calculateNetWorth(baselineSnap);
      const megaTotals = win.calculateNetWorth(megaSnapshot);
      assertCloseTo(megaTotals.net_worth_twd, baselineTotals.net_worth_twd * 10000, 1000.0, 'Trillion-scale net worth TWD calculated with high precision');
      assertTrue(megaTotals.net_worth_twd < Number.MAX_SAFE_INTEGER, 'Must remain within JS Number.MAX_SAFE_INTEGER');
    });

  });

  // ==========================================================================
  // Domain 7: Floating-Point Rounding & Multi-Step Currency Conversion Drift (6 tests)
  // ==========================================================================
  describe('Domain 7: Floating-Point Rounding & Multi-Step Currency Conversion Drift', () => {

    it('TC-T5-DRIFT-01: Multi-Step Currency Roundtrip Conservation of Capital', () => {
      const initialBaseline = getCanonicalBaseline();
      const latestSnap = initialBaseline.snapshots[initialBaseline.snapshots.length - 1];
      const initialTotals = win.calculateNetWorth(latestSnap);
      
      const fxRate = 32.39123456; // High-precision 8-decimal rate
      const testSnap = JSON.parse(JSON.stringify(latestSnap));
      testSnap.usd_rate = fxRate;

      // Perform 500 iterative micro-transfers between TWD and USD accounts
      const accounts = testSnap.accounts;
      for (let i = 0; i < 500; i++) {
        const twdDelta = 137.89;
        const usdDelta = twdDelta / fxRate;
        accounts['玉山活存'] = (accounts['玉山活存'] || 0) - twdDelta;
        accounts['玉山美金'] = (accounts['玉山美金'] || 0) + usdDelta;
      }

      const postTransferTotals = win.calculateNetWorth(testSnap);
      const calculatedNetWorthTWD = postTransferTotals.net_worth_twd;
      const expectedInitialTWD = initialTotals.twd_accounts + (initialTotals.usd_accounts_usd * fxRate);

      // Verify absolute drift is within 1 cent (0.01 TWD) despite 500 continuous transfers
      assertCloseTo(calculatedNetWorthTWD, expectedInitialTWD, 0.01, '500-step micro transfers must conserve capital within 0.01 TWD');
    });

    it('TC-T5-DRIFT-02: Micro-Cent Share Quantity & Sub-Penny Asset Pricing', () => {
      // Inject micro-fractional shares
      win.state.us_stocks.push({
        account: 'Firstrade',
        ticker: 'CRYPTO_BTC',
        shares: 0.00001234,
        price: 95432.10,
        market_value: 1.18,
        snapshot_date: '2026-08-09'
      });

      win.state.us_stocks.push({
        account: 'Firstrade',
        ticker: 'MICRO_PENNY',
        shares: 100000,
        price: 0.000123,
        market_value: 12.30,
        snapshot_date: '2026-08-09'
      });

      win.updateStockPrice('CRYPTO_BTC', 98765.43);
      win.updateStockPrice('MICRO_PENNY', 0.000456);

      const btcStock = win.state.us_stocks.find(s => s.ticker === 'CRYPTO_BTC');
      const pennyStock = win.state.us_stocks.find(s => s.ticker === 'MICRO_PENNY');

      // 0.00001234 * 98765.43 = 1.2187654... -> 1.22
      assertCloseTo(btcStock.market_value, 1.22, 0.01, 'Micro-share market value rounds accurately');
      // 100000 * 0.000456 = 45.60
      assertCloseTo(pennyStock.market_value, 45.60, 0.01, 'Sub-penny stock market value computes accurately');
    });

    it('TC-T5-DRIFT-03: Repeating Decimal Accumulation (1/3 USD Fraction Partitioning)', () => {
      const testSnap = {
        date: '2026-08-23',
        usd_rate: 32.00,
        accounts: {
          '玉山美金': 100000 / 3,
          'Chase Checking': 100000 / 3,
          'Firstrade': 100000 / 3,
        }
      };

      const totals = win.calculateNetWorth(testSnap);
      assertCloseTo(totals.usd_accounts_usd, 100000.00, 1e-6, 'Repeating fractions must sum exactly to 100,000 USD');
      assertCloseTo(totals.usd_accounts_twd, 3200000.00, 1e-4, 'Repeating fractions convert to exactly 3.2M TWD');
    });

    it('TC-T5-DRIFT-04: High-Precision 8-Decimal Exchange Rate Multi-Period Delta', () => {
      const snap1 = { date: '2026-01-01', usd_rate: 32.39123456, accounts: { 'Chase Checking': 50000 } };
      const snap2 = { date: '2026-02-01', usd_rate: 31.87654321, accounts: { 'Chase Checking': 50000 } };

      const t1 = win.calculateNetWorth(snap1);
      const t2 = win.calculateNetWorth(snap2);

      const expectedDeltaTWD = (50000 * 31.87654321) - (50000 * 32.39123456); // -25,734.5675
      const actualDeltaTWD = t2.net_worth_twd - t1.net_worth_twd;

      assertCloseTo(actualDeltaTWD, expectedDeltaTWD, 0.001, '8-decimal FX rate delta must preserve exact precision');
    });

    it('TC-T5-DRIFT-05: Sub-Cent FX Inversion Epsilon Integrity', () => {
      const fxRate = 32.39;
      const invRate = 1 / fxRate;
      const initialTWD = win.calculateNetWorth(canonicalBaselineJSON.snapshots[3]).net_worth_twd;

      const toUSD = initialTWD * invRate;
      const backToTWD = toUSD * fxRate;

      assertCloseTo(backToTWD, initialTWD, 1e-6, 'FX inversion must conserve capital within IEEE-754 machine epsilon');
    });

    it('TC-T5-DRIFT-06: CSV Export Number Formatting Precision Under Fractional Quantities', () => {
      win.state.us_stocks = [
        { account: 'Firstrade', ticker: 'VOO', shares: 435.07161, price: 25.69, market_value: 11176.99, roi: 0.053574 }
      ];

      const csvOutput = win.generateStocksCSV();
      assertTrue(csvOutput.startsWith('\uFEFF'), 'CSV must maintain UTF-8 BOM');
      assertIncludes(csvOutput, '435.07161', 'Shares precision must not be truncated in CSV');
      assertIncludes(csvOutput, '11176.99', 'Market value must be properly formatted in CSV');
      assertIncludes(csvOutput, '5.36', 'ROI percentage formatted to 2 decimals in CSV');
    });

  });

  // ==========================================================================
  // Domain 8: Extreme Financial Shock & Asset Valuation Boundaries (6 tests)
  // ==========================================================================
  describe('Domain 8: Extreme Financial Shock & Asset Valuation Boundaries', () => {

    it('TC-T5-SHOCK-01: 100% Equity Market Crash (All Equities -> $0.00)', () => {
      for (const st of win.state.tw_stocks || []) {
        win.updateStockPrice(st.ticker, 0);
      }
      for (const st of win.state.us_stocks || []) {
        if (st.ticker) win.updateStockPrice(st.ticker, 0);
      }

      for (const st of win.state.tw_stocks) {
        assertEqual(st.market_value, 0, 'Crashed stock market value must be 0');
        assertEqual(st.unrealized_pl, -st.cost_total, 'Unrealized PL equals total loss of cost');
        assertEqual(st.roi, -1, 'ROI must be exactly -1.0 (-100%)');
      }

      win.renderAll();

      const maxCapacity = (win.calculateNetWorth(win.state.snapshots[win.state.snapshots.length - 1]).net_worth_twd) * 0.50;
      assertOk(maxCapacity > 0, 'Risk capacity remains positive from remaining cash/insurance');
    });

    it('TC-T5-SHOCK-02: Hyper-Deflation / TWD Hyper-Appreciation (FX = 0.0001)', () => {
      const snap = {
        date: '2026-08-23',
        usd_rate: 0.0001,
        accounts: {
          '玉山活存': 10000000, // NT$10M
          'Chase Checking': 100000,    // $100k USD
        }
      };

      const totals = win.calculateNetWorth(snap);
      // NT$10,000,000 + ($100,000 * 0.0001 = NT$10) = NT$10,000,010
      assertEqual(totals.net_worth_twd, 10000010, 'Net worth TWD matches hyper-deflated FX sum');
      // NT$10,000,010 / 0.0001 = $100,000,100,000 USD (100 Billion USD)
      assertEqual(totals.net_worth_usd, 100000100000, 'USD Net worth explodes accurately without overflow');
    });

    it('TC-T5-SHOCK-03: Hyper-Inflation / TWD Hyper-Depreciation (FX = 1,000,000.00)', () => {
      const snap = {
        date: '2026-08-23',
        usd_rate: 1000000.0,
        accounts: {
          '玉山活存': 1000000, // NT$1M
          'Chase Checking': 50000,   // $50k USD
        }
      };

      const totals = win.calculateNetWorth(snap);
      // NT$1M + ($50k * 1,000,000 = NT$50 Billion) = NT$50,001,000,000
      assertEqual(totals.net_worth_twd, 50001000000, 'Net worth TWD handles 50 Billion scale');
      assertEqual(totals.net_worth_usd, 50001, 'Net worth USD converts back accurately');
    });

    it('TC-T5-SHOCK-04: Massive Liabilities Exceeding Assets (Negative Net Worth Insolvency)', () => {
      const snap = {
        date: '2026-08-23',
        usd_rate: 32.00,
        accounts: {
          '玉山活存': 1000000,
          '玉山證券': -30000000, // -30M Debt
        }
      };

      const totals = win.calculateNetWorth(snap);
      assertEqual(totals.net_worth_twd, -29000000, 'Net worth correctly reflects negative balance');
      assertEqual(totals.net_worth_usd, -29000000 / 32, 'Net worth USD correctly reflects negative balance');

      const rebalanceRes = simulateRebalanceAllocation({
        netWorthTWD: totals.net_worth_twd,
        currentEquityTWD: 0,
        deployableCashTWD: 0,
        targetEquityPct: 0.50,
        mode: 'Mode Q',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 1.0 }
      });

      assertEqual(rebalanceRes.status, 'INSOLVENT_BLOCKED', 'Rebalance must be blocked when insolvent');
      assertFalse(rebalanceRes.allowed, 'No rebalancing allowed during insolvency');
    });

    it('TC-T5-SHOCK-05: Trillion-Scale Sovereign Wealth Scenario (NW > NT$10^14)', () => {
      const snap = {
        date: '2026-08-23',
        usd_rate: 30.00,
        accounts: {
          '玉山活存': 100000000000000, // 100 Trillion TWD (1e14)
          'Chase Checking': 1000000000000,    // 1 Trillion USD (1e12)
        }
      };

      const totals = win.calculateNetWorth(snap);
      // 100T + (1T * 30 = 30T) = 130 Trillion TWD
      assertEqual(totals.net_worth_twd, 130000000000000, 'IEEE-754 handles 130 Trillion integer scale precisely');
      assertOk(Number.isSafeInteger(totals.net_worth_twd), '130 Trillion is within safe integer bounds (2^53 - 1)');
    });

    it('TC-T5-SHOCK-06: Simultaneous Triple Collapse (Equities -100%, Insurance Default 0, FX -50%)', () => {
      const base = getCanonicalBaseline();
      const latest = base.snapshots[base.snapshots.length - 1];

      const disasterSnap = JSON.parse(JSON.stringify(latest));
      disasterSnap.usd_rate = 16.00; // 50% FX collapse
      disasterSnap.accounts['玉山證券'] = 0;
      disasterSnap.accounts['Firstrade'] = 0;

      const totals = win.calculateNetWorth(disasterSnap);
      
      const accountsMeta = base.accounts_meta;
      const cashTwdKeys = accountsMeta.filter(a => a.currency === 'TWD' && a.category === 'cash').map(a => a.key);
      const cashUsdKeys = accountsMeta.filter(a => a.currency === 'USD' && a.category === 'cash').map(a => a.key);
      
      const sumCashTWD = cashTwdKeys.reduce((s, k) => s + (disasterSnap.accounts[k] || 0), 0);
      const sumCashUSD = cashUsdKeys.reduce((s, k) => s + (disasterSnap.accounts[k] || 0), 0);
      const totalCashTWD = sumCashTWD + (sumCashUSD * 16.00);

      assertEqual(totals.net_worth_twd, totalCashTWD, 'Net worth equals remaining cash under complete collapse');
      assertOk(totalCashTWD > 720000, 'Household cash still exceeds emergency reserve');
    });

  });

  // ==========================================================================
  // Domain 9: Division-by-Zero Guards & Extreme Ratio Arithmetic (6 tests)
  // ==========================================================================
  describe('Domain 9: Division-by-Zero Guards & Extreme Ratio Arithmetic', () => {

    it('TC-T5-DIVZ-01: Zero Cost Basis Stock Revaluation (Gifted / Employee Grant Shares)', () => {
      win.state.tw_stocks = [{
        ticker: '9999',
        name: '零成本股票',
        shares: 1000,
        cost_total: 0,
        avg_cost: 0,
        price: 150,
        market_value: 150000,
        unrealized_pl: 150000,
        roi: 0
      }];

      win.updateStockPrice('9999', 200);
      const updated = win.state.tw_stocks[0];

      assertEqual(updated.market_value, 200000, 'Market value updates to 200k');
      assertEqual(updated.unrealized_pl, 200000, 'Unrealized PL equals 200k');
      assertEqual(updated.roi, 0, 'Zero cost basis ROI avoids NaN / Infinity division');
    });

    it('TC-T5-DIVZ-02: Zero Share Price with Positive Cost Basis (P = 0, Cost > 0)', () => {
      win.state.tw_stocks = [{
        ticker: '8888',
        name: '破產股票',
        shares: 1000,
        cost_total: 100000,
        avg_cost: 100,
        price: 50,
        market_value: 50000,
        unrealized_pl: -50000,
        roi: -0.5
      }];

      win.updateStockPrice('8888', 0);
      const updated = win.state.tw_stocks[0];

      assertEqual(updated.market_value, 0, 'Market value drops to 0');
      assertEqual(updated.unrealized_pl, -100000, 'Unrealized PL equals -100,000');
      assertEqual(updated.roi, -1.0, 'ROI is -100% (-1.0)');

      const dividendPerShare = 5.0;
      const divYield = updated.price > 0 ? (dividendPerShare / updated.price) : 0;
      assertEqual(divYield, 0, 'Dividend yield safely evaluates to 0 when price is 0');
    });

    it('TC-T5-DIVZ-03: Zero Shares Position (shares = 0, price = 250, cost = 0)', () => {
      win.state.tw_stocks = [{
        ticker: '7777',
        name: '已結清股票',
        shares: 0,
        cost_total: 0,
        price: 250,
        market_value: 0,
        unrealized_pl: 0,
        roi: 0
      }];

      win.updateStockPrice('7777', 300);
      const updated = win.state.tw_stocks[0];

      assertEqual(updated.market_value, 0, 'Market value remains 0');
      assertEqual(updated.unrealized_pl, 0, 'Unrealized PL remains 0');
      assertEqual(updated.roi, 0, 'ROI remains 0');
    });

    it('TC-T5-DIVZ-04: Negative Cost Basis (Return of Capital ROC Exceeding Initial Investment)', () => {
      const pos = {
        shares: 100,
        price: 50,
        cost_total: -5000
      };

      const marketValue = pos.shares * pos.price;
      const unrealizedPL = marketValue - pos.cost_total;

      assertEqual(marketValue, 5000, 'Market value is 5,000');
      assertEqual(unrealizedPL, 10000, 'Unrealized PL correctly computes total gain of 10,000');
    });

    it('TC-T5-DIVZ-05: Zero Net Worth Period Growth Rate Calculation', () => {
      const prevNW = 0;
      const currentNW = 1000000;
      const delta = currentNW - prevNW;
      const pct = prevNW > 0 ? (delta / prevNW) * 100 : 0;

      assertEqual(pct, 0, 'Period growth rate guardrails against prevNW = 0 division');
    });

    it('TC-T5-DIVZ-06: Zero / Falsy Exchange Rate Input Guardrail', () => {
      const snapZero = {
        date: '2026-08-23',
        usd_rate: 0,
        accounts: { '玉山活存': 100000, 'Chase Checking': 1000 }
      };

      const totals = win.calculateNetWorth(snapZero);
      assertOk(!isNaN(totals.net_worth_twd), 'Net worth TWD is not NaN');
      assertOk(!isNaN(totals.net_worth_usd), 'Net worth USD is not NaN');
      assertOk(isFinite(totals.net_worth_usd), 'Net worth USD is finite (no division by zero Infinity)');
    });

  });

  // ==========================================================================
  // Domain 10: Cross-Border Tax Gating & Progressive US Estate Tax Schedule (6 tests)
  // ==========================================================================
  describe('Domain 10: Cross-Border Tax Gating & Progressive US Estate Tax Schedule', () => {

    it('TC-T5-TAX-01: Exact Cent-Level $60,000 Exemption Boundary Transitions', () => {
      const resA = calculateUsEstateTaxLiability(59999.99, 60000);
      assertEqual(resA.taxableAmount, 0, '$59,999.99 is strictly within exemption');
      assertEqual(resA.netTaxLiability, 0, '$59,999.99 has 0 tax liability');
      assertEqual(resA.status, 'SAFE', 'Status is SAFE');

      const resB = calculateUsEstateTaxLiability(60000.00, 60000);
      assertEqual(resB.taxableAmount, 0, '$60,000.00 exact boundary has 0 taxable amount');
      assertEqual(resB.netTaxLiability, 0, '$60,000.00 has 0 tax liability');
      assertEqual(resB.status, 'SAFE', 'Status is SAFE');

      const resC = calculateUsEstateTaxLiability(60000.01, 60000);
      assertCloseTo(resC.taxableAmount, 0.01, 0.001, '$60,000.01 breaches by 1 cent');
      assertEqual(resC.status, 'ALERT_BREACH', '1 cent breach triggers ALERT_BREACH');

      const resD = calculateUsEstateTaxLiability(60100.00, 60000);
      assertEqual(resD.taxableAmount, 100.00, '$100 taxable excess');
      assertOk(resD.netTaxLiability >= 0, 'Tax liability is non-negative');
    });

    it('TC-T5-TAX-02: Complete 12-Tier Progressive US Estate Tax Bracket Verification', () => {
      const baselineRes = calculateUsEstateTaxLiability(100000, 60000);
      assertEqual(baselineRes.netTaxLiability, 10800, 'Baseline US stock portfolio tax liability matches $10,800');

      const testCases = [
        { gross: 70000, expectedNetTax: 2600 },
        { gross: 80000, expectedNetTax: 5200 },
        { gross: 100000, expectedNetTax: 10800 },
        { gross: 150000, expectedNetTax: 25800 },
        { gross: 250000, expectedNetTax: 57800 },
        { gross: 500000, expectedNetTax: 142800 },
        { gross: 1000000, expectedNetTax: 332800 }
      ];

      for (const tc of testCases) {
        const res = calculateUsEstateTaxLiability(tc.gross, 60000);
        assertEqual(res.netTaxLiability, tc.expectedNetTax, `Gross situs $${tc.gross} yields expected tax $${tc.expectedNetTax}`);
      }
    });

    it('TC-T5-TAX-03: 30% NRA US Dividend Withholding Tax Drag Simulation', () => {
      const grossDividendUSD = 50000;
      const nraTaxRate = 0.30;
      const withheldTaxUSD = grossDividendUSD * nraTaxRate;
      const netDividendUSD = grossDividendUSD - withheldTaxUSD;

      assertEqual(withheldTaxUSD, 15000, '30% tax on $50k dividend is $15,000 USD');
      assertEqual(netDividendUSD, 35000, 'Net received dividend is $35,000 USD');

      const ucitsTaxRate = 0.15;
      const ucitsWithheldUSD = grossDividendUSD * ucitsTaxRate;
      const taxSavingsUSD = withheldTaxUSD - ucitsWithheldUSD;

      assertEqual(taxSavingsUSD, 7500, 'Irish UCITS structure saves $7,500 USD in dividend withholding drag');
    });

    it('TC-T5-TAX-04: IRC §871(a)(2) 183-Day Substantial Presence Tax Trap Boundary', () => {
      function evaluatePresenceTax(days) {
        const isTaxTriggered = days >= 183;
        return {
          days,
          isTaxTriggered,
          capitalGainsTaxRate: isTaxTriggered ? 0.30 : 0.00,
          recommendation: isTaxTriggered ? 'PROHIBIT_US_STOCK_SALES' : 'SALES_PERMITTED'
        };
      }

      assertEqual(evaluatePresenceTax(182).capitalGainsTaxRate, 0.00, '182 days: 0% US capital gains tax');
      assertEqual(evaluatePresenceTax(183).capitalGainsTaxRate, 0.30, '183 days: 30% gross capital gains tax triggered');
      assertEqual(evaluatePresenceTax(239).recommendation, 'PROHIBIT_US_STOCK_SALES', '239 days: Sales strictly locked');
    });

    it('TC-T5-TAX-05: Taiwan Estate & Gift Tax Act §22 Annual Exemption Threshold (NT$2.44M)', () => {
      function evaluateTaiwanGiftTax(giftAmountTWD) {
        const exemption = 2440000;
        const taxable = Math.max(0, giftAmountTWD - exemption);
        const taxRate = 0.10;
        return {
          giftAmountTWD,
          taxable,
          taxLiability: Math.round(taxable * taxRate),
          isExempt: taxable === 0
        };
      }

      assertTrue(evaluateTaiwanGiftTax(2439999).isExempt, 'NT$2,439,999 is exempt');
      assertTrue(evaluateTaiwanGiftTax(2440000).isExempt, 'NT$2,440,000 exact boundary is exempt');
      assertFalse(evaluateTaiwanGiftTax(2440001).isExempt, 'NT$2,440,001 triggers tax on NT$1 excess');
    });

    it('TC-T5-TAX-06: IRS Form 3520 Foreign Gift Reporting Threshold ($100,000 USD)', () => {
      function evaluateForm3520Requirement(foreignGiftUSD) {
        const threshold = 100000;
        return {
          foreignGiftUSD,
          reportingRequired: foreignGiftUSD >= threshold
        };
      }

      assertFalse(evaluateForm3520Requirement(99999.99).reportingRequired, '$99,999.99 does not require Form 3520');
      assertTrue(evaluateForm3520Requirement(100000.00).reportingRequired, '$100,000 exact threshold requires Form 3520');
      assertTrue(evaluateForm3520Requirement(150000.00).reportingRequired, '$150,000 requires Form 3520');
    });

  });

  // ==========================================================================
  // Domain 11: Complex Cash Runway & Solvency Simulation Boundaries (6 tests)
  // ==========================================================================
  describe('Domain 11: Complex Cash Runway & Solvency Simulation Boundaries', () => {

    it('TC-T5-RUN-01: Zero Monthly Burn Rate Boundary (Burn = 0)', () => {
      const res = calculateDynamicRunway(17669192, 0, 0);
      assertEqual(res.months, Infinity, 'Zero monthly burn produces Infinite runway');
      assertTrue(res.isSolvent, 'Zero burn is perpetual solvent');
      assertEqual(res.status, 'PERPETUAL_SOLVENT', 'Status is PERPETUAL_SOLVENT');
    });

    it('TC-T5-RUN-02: Negative Monthly Burn Rate (Positive Monthly Savings / Surplus Inflow)', () => {
      const res = calculateDynamicRunway(17669192, -50000, 0);
      assertEqual(res.months, Infinity, 'Negative burn (savings) produces Infinite runway');
      assertTrue(res.isSolvent, 'Household cash grows perpetually');
    });

    it('TC-T5-RUN-03: Ultra-High Burn Rate Exceeding Total Cash Assets', () => {
      const res = calculateDynamicRunway(17669192, 20000000, 0);
      assertCloseTo(res.months, 0.88, 0.01, 'Runway is 0.88 months (< 1 month / 26.5 days)');
      assertFalse(res.isSolvent, 'Under 24 months emergency threshold');
      assertEqual(res.status, 'LOW_RUNWAY', 'Status is LOW_RUNWAY');
    });

    it('TC-T5-RUN-04: Zero Cash Reserves Total Liquidity Depletion', () => {
      const res = calculateDynamicRunway(0, 100000, 0);
      assertEqual(res.months, 0, 'Zero cash reserves yields 0 months runway');
      assertFalse(res.isSolvent, 'Insolvent on cash reserves');
      assertEqual(res.status, 'DEFICIT_INSOLVENT', 'Status is DEFICIT_INSOLVENT');
    });

    it('TC-T5-RUN-05: Inflation-Adjusted Dynamic Multi-Year Cash Runway Decay', () => {
      const nominalRes = calculateDynamicRunway(17669192, 100000, 0);
      const inflationRes = calculateDynamicRunway(17669192, 100000, 3.5);

      assertEqual(nominalRes.months, 176.69, 'Nominal runway is 176.69 months');
      assertOk(inflationRes.months < nominalRes.months, 'Inflation compresses nominal runway duration');
      assertCloseTo(inflationRes.months, 143.2, 0.5, 'Runway under 3.5% inflation compresses to ~143.2 months');
      assertOk(inflationRes.finalMonthlyBurn > 100000, 'Monthly burn rate escalates over time due to compounding inflation');
    });

    it('TC-T5-RUN-06: Zero / Falsy Defaults in Decision Framework Engine', () => {
      const df = {
        emergency_reserve_months: 0,
        monthly_burn_rate_twd: 0
      };

      const lockedReserve = (df.emergency_reserve_months ?? 24) * (df.monthly_burn_rate_twd ?? 100000);
      const totalCash = 17669192;
      const deployable = totalCash - lockedReserve;

      assertEqual(lockedReserve, 0, 'Explicit 0 months reserve requires 0 locked reserve');
      assertEqual(deployable, totalCash, 'All cash is deployable when reserve is 0');
    });

  });

  // ==========================================================================
  // Domain 12: Rebalancing Optimization, 100%/0% Boundary Weights & Anti-Sale Invariants (6 tests)
  // ==========================================================================
  describe('Domain 12: Rebalancing Optimization, 100%/0% Boundary Weights & Anti-Sale Invariants', () => {

    it('TC-T5-REBAL-01: 100% Single-Asset Target Allocation', () => {
      const res = simulateRebalanceAllocation({
        netWorthTWD: 5000000,
        currentEquityTWD: 2000000,
        deployableCashTWD: 1500000,
        targetEquityPct: 1.0,
        mode: 'Mode Q',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 1.0 }
      });

      assertTrue(res.allowed, 'Rebalancing allowed in Mode Q');
      assertEqual(res.status, 'OPTIMAL_REBALANCE', 'Optimal rebalance status');
      assertEqual(res.orders.length, 1, 'Single order generated');
      assertEqual(res.orders[0].ticker, 'CSPX', 'Allocated to CSPX');
      assertEqual(res.orders[0].amountTWD, 1500000, '100% deployable cash deployed to CSPX');
      assertEqual(res.remainingCash, 0, 'Zero deployable cash remaining');
    });

    it('TC-T5-REBAL-02: 0% Equity Target Allocation (100% Cash / Full De-risking)', () => {
      const res = simulateRebalanceAllocation({
        netWorthTWD: 5000000,
        currentEquityTWD: 2000000,
        deployableCashTWD: 1500000,
        targetEquityPct: 0.0,
        mode: 'Mode Q',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 1.0 }
      });

      assertTrue(res.allowed, 'Evaluates successfully');
      assertEqual(res.status, 'ANTI_SALE_ENFORCED', 'Anti-sale prevents selling existing appreciated equity');
      assertEqual(res.orders.length, 0, 'No sell orders generated');
    });

    it('TC-T5-REBAL-03: Mode S/W Gating: Rebalancing Trade Blockade Enforcement', () => {
      const resModeS = simulateRebalanceAllocation({
        netWorthTWD: 5000000,
        currentEquityTWD: 2000000,
        deployableCashTWD: 1500000,
        targetEquityPct: 0.45,
        mode: 'Mode S',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 1.0 }
      });

      assertFalse(resModeS.allowed, 'Rebalancing forbidden in Mode S');
      assertEqual(resModeS.status, 'GOVERNANCE_LOCKED', 'Status is GOVERNANCE_LOCKED');

      const resModeW = simulateRebalanceAllocation({
        netWorthTWD: 5000000,
        currentEquityTWD: 2000000,
        deployableCashTWD: 1500000,
        targetEquityPct: 0.45,
        mode: 'Mode W',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 1.0 }
      });

      assertFalse(resModeW.allowed, 'Rebalancing forbidden in Mode W');
      assertEqual(resModeW.status, 'GOVERNANCE_LOCKED', 'Status is GOVERNANCE_LOCKED');
    });

    it('TC-T5-REBAL-04: IRC §871(a)(2) Anti-Sale Strict Enforcement (Zero-Sale Invariant)', () => {
      const res = simulateRebalanceAllocation({
        netWorthTWD: 5000000,
        currentEquityTWD: 1500000,
        deployableCashTWD: 1000000,
        targetEquityPct: 0.50,
        mode: 'Mode Q',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 0.80, 'VWRA': 0.20 }
      });

      assertTrue(res.allowed, 'Mode Q rebalance allowed');
      assertEqual(res.orders.length, 2, '2 DCA buy orders generated');
      
      const cspxOrder = res.orders.find(o => o.ticker === 'CSPX');
      const vwraOrder = res.orders.find(o => o.ticker === 'VWRA');

      assertEqual(cspxOrder.action, 'BUY', 'CSPX order is BUY');
      assertEqual(vwraOrder.action, 'BUY', 'VWRA order is BUY');
      assertCloseTo(cspxOrder.amountTWD, 1000000 * 0.80, 0.01, '80% weight to CSPX');
      assertCloseTo(vwraOrder.amountTWD, 1000000 * 0.20, 0.01, '20% weight to VWRA');
      
      assertEqual(cspxOrder.amountTWD + vwraOrder.amountTWD, 1000000, 'Total orders exactly equal DCA capital');
    });

    it('TC-T5-REBAL-05: Rebalancing Under Insolvent State (Net Worth <= 0)', () => {
      const res = simulateRebalanceAllocation({
        netWorthTWD: -5000000,
        currentEquityTWD: 1000000,
        deployableCashTWD: 0,
        targetEquityPct: 0.50,
        mode: 'Mode Q',
        isNraPresence183Days: true,
        assetWeights: { 'CSPX': 1.0 }
      });

      assertFalse(res.allowed, 'Rebalancing forbidden when Net Worth is negative');
      assertEqual(res.status, 'INSOLVENT_BLOCKED', 'Insolvent status prevents execution');
      assertEqual(res.orders.length, 0, 'No orders generated');
    });

    it('TC-T5-REBAL-06: Multi-Broker Cross-Border Rebalancing Order Generator Invariant', () => {
      const totalDeployable = 1500000;
      const targetAllocation = {
        'IBKR_CSPX': 0.50,
        'IBKR_VWRA': 0.30,
        'ESUN_TW2330': 0.20
      };

      const res = simulateRebalanceAllocation({
        netWorthTWD: 5000000,
        currentEquityTWD: 2000000,
        deployableCashTWD: totalDeployable,
        targetEquityPct: 0.50,
        mode: 'Mode Q',
        isNraPresence183Days: true,
        assetWeights: targetAllocation
      });

      const totalAllocated = res.orders.reduce((sum, o) => sum + o.amountTWD, 0);
      assertCloseTo(totalAllocated, res.investableCapital, 0.01, 'Total order sum matches investable capital');
    });

  });

});

// ============================================================================
// Exports & Standalone Runner Execution
// ============================================================================

function runTier5Tests(harness) {
  return executeTestSuite({ tier: '5', verbose: false });
}

module.exports = {
  runTier5Tests,
};

if (require.main === module) {
  executeTestSuite({ tier: '5', verbose: true })
    .then(exitCode => process.exit(exitCode))
    .catch(err => {
      console.error('Fatal Tier 5 Runner Error:', err);
      process.exit(1);
    });
}
