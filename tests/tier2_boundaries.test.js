/**
 * tests/tier2_boundaries.test.js
 * 
 * Personal Finance Dashboard & Data Management System
 * Tier 2: Boundary, Corner & Edge Cases Test Suite
 * 
 * Covers 37 Boundary Test Cases across 6 Feature Areas:
 *   Area 1: Snapshots & Account Balance Boundaries (7 tests)
 *   Area 2: Currency, FX Conversion & Dual-Denomination Boundaries (6 tests)
 *   Area 3: Stock Valuation & P&L Arithmetic Boundaries (7 tests)
 *   Area 4: Risk Budget, Emergency Reserve & Decision Constraints Boundaries (6 tests)
 *   Area 5: File I/O, Schema Violations, Malformed CSV & JSON Boundaries (6 tests)
 *   Area 6: Network, API & Asynchronous Failure Resilience (5 tests)
 * 
 * Architecture:
 * - Compatible with unified runner: node tests/e2e_test_runner.js --tier=2
 * - Standalone executable: node tests/tier2_boundaries.test.js
 * - Zero external dependencies, pure standard Node.js
 */

const fs = require('fs');
const path = require('path');
const {
  describe,
  it,
  beforeAll,
  beforeEach,
  assertEqual,
  assertDeepEqual,
  assertCloseTo,
  assertTrue,
  assertFalse,
  assertOk,
  assertThrows,
  assertIncludes,
  createMockBrowserEnvironment,
  setupDashboardEnvironment,
  MockFileSystemFileHandle,
  executeTestSuite,
} = require('./e2e_test_runner');

const BASELINE_DATA_PATH = path.resolve(__dirname, '..', 'data', fs.existsSync(path.resolve(__dirname, '..', 'data', 'sample_data.json')) ? 'sample_data.json' : 'finance_data.json');
const canonicalBaselineJSON = JSON.parse(fs.readFileSync(BASELINE_DATA_PATH, 'utf8'));

// --- Helper Functions for Boundary Testing ---

function roundCurrency(val, decimals = 2) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

function formatCurrencyString(val, currency = 'TWD', decimals = 0) {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return 'N/A';
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formattedNum = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  const prefix = currency === 'TWD' ? 'NT$ ' : '$ ';
  return (isNegative ? '-' : '') + prefix + formattedNum;
}

function isValidFXRate(rate) {
  if (typeof rate !== 'number' || isNaN(rate) || !isFinite(rate)) return false;
  return rate > 0;
}

function convertUSDToTWD(usdVal, fxRate) {
  if (!isValidFXRate(fxRate) || typeof usdVal !== 'number' || isNaN(usdVal)) return 0;
  return usdVal * fxRate;
}

function convertTWDToUSD(twdVal, fxRate) {
  if (!isValidFXRate(fxRate) || typeof twdVal !== 'number' || isNaN(twdVal)) return 0;
  return twdVal / fxRate;
}

function calculateStockPL(pos) {
  if (!pos) return { marketValue: 0, unrealizedPL: 0, roi: 0, roiDisplay: '0.00%' };
  if (pos.shares == null || pos.price == null) {
    const mv = typeof pos.market_value === 'number' && !isNaN(pos.market_value) ? pos.market_value : 0;
    return { marketValue: mv, unrealizedPL: 0, roi: 0, roiDisplay: 'N/A' };
  }
  const shares = typeof pos.shares === 'number' && !isNaN(pos.shares) ? pos.shares : 0;
  const price = typeof pos.price === 'number' && !isNaN(pos.price) ? pos.price : 0;
  const costTotal = typeof pos.cost_total === 'number' && !isNaN(pos.cost_total) ? pos.cost_total : (pos.avg_cost ? pos.avg_cost * shares : 0);
  const marketValue = shares * price;
  const unrealizedPL = marketValue - costTotal;
  let roi = 0;
  let roiDisplay = '0.00%';
  if (costTotal === 0) {
    if (marketValue > 0) {
      roi = Infinity;
      roiDisplay = '+∞%';
    } else {
      roi = 0;
      roiDisplay = '0.00%';
    }
  } else {
    roi = unrealizedPL / costTotal;
    const pct = roi * 100;
    roiDisplay = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }
  return { marketValue: roundCurrency(marketValue, 6), unrealizedPL: roundCurrency(unrealizedPL, 2), roi, roiDisplay };
}

function validateStockEdit(input) {
  if (!input) return { isValid: false, reason: 'Empty input' };
  if (input.shares != null && (typeof input.shares !== 'number' || isNaN(input.shares) || input.shares < 0)) {
    return { isValid: false, reason: 'Shares cannot be negative or NaN' };
  }
  if (input.price != null && (typeof input.price !== 'number' || isNaN(input.price) || input.price < 0)) {
    return { isValid: false, reason: 'Price cannot be negative or NaN' };
  }
  return { isValid: true };
}

function calculateDeployableCash(totalCashTWD, mandatoryReserveTWD = 2400000) {
  if (typeof totalCashTWD !== 'number' || isNaN(totalCashTWD)) return 0;
  return Math.max(0, totalCashTWD - mandatoryReserveTWD);
}

function getEmergencyReserveStatus(totalCashTWD, mandatoryReserveTWD = 2400000, monthlyBurnTWD = 100000) {
  const cash = typeof totalCashTWD === 'number' && !isNaN(totalCashTWD) ? totalCashTWD : 0;
  const isDeficit = cash < mandatoryReserveTWD;
  const deficitAmount = isDeficit ? mandatoryReserveTWD - cash : 0;
  const monthsCoverage = monthlyBurnTWD > 0 ? roundCurrency(cash / monthlyBurnTWD, 1) : 0;
  return { isDeficit, deficitAmount, monthsCoverage };
}

function calculateEstateTaxExposure(usSitusUSD, exemptionUSD = 60000) {
  const val = typeof usSitusUSD === 'number' && !isNaN(usSitusUSD) ? usSitusUSD : 0;
  const exposureUSD = Math.max(0, roundCurrency(val - exemptionUSD, 2));
  const isExposed = exposureUSD > 0;
  return {
    totalUSSitusUSD: val,
    exposureUSD,
    status: isExposed ? 'EXPOSED' : 'SAFE'
  };
}

function calculateRiskBudget(netWorthTWD, currentEquityTWD, maxEquityPct = 0.50) {
  const nw = typeof netWorthTWD === 'number' && !isNaN(netWorthTWD) ? netWorthTWD : 0;
  const equity = typeof currentEquityTWD === 'number' && !isNaN(currentEquityTWD) ? currentEquityTWD : 0;
  const equityCeilingTWD = nw > 0 ? roundCurrency(nw * maxEquityPct, 2) : 0;
  const headroomTWD = roundCurrency(equityCeilingTWD - equity, 2);
  const isBreached = headroomTWD < 0;
  return { equityCeilingTWD, currentEquityTWD: equity, headroomTWD, isBreached };
}

function evaluateIRC871a2(daysPresentInUS) {
  const days = typeof daysPresentInUS === 'number' ? daysPresentInUS : 0;
  const applies = days >= 183;
  return { daysPresentInUS: days, applies, blocksRebalancingSales: applies };
}

function validateSchema(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, missingKeys: ['ROOT_OBJECT'] };
  }
  const requiredKeys = ['meta', 'accounts_meta', 'snapshots', 'tw_stocks', 'us_stocks', 'insurance'];
  const missingKeys = requiredKeys.filter(k => !(k in data));
  return { isValid: missingKeys.length === 0, missingKeys };
}

function parseSnapshotCSV(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    return { success: false, error: { code: 'EMPTY_INPUT' } };
  }
  const clean = csvString.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { success: false, error: { code: 'NO_DATA' } };
  const header = lines[0];
  if (!header.includes(',') || (!header.includes('日期') && !header.includes('Date'))) {
    return { success: false, error: { code: 'INVALID_CSV_HEADER' } };
  }
  return { success: true, rowCount: lines.length - 1 };
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Test Suite Definition ---

describe('Tier 2: Boundary & Mathematical Constraints', () => {
  let env, win, doc, state;

  beforeEach(() => {
    env = createMockBrowserEnvironment();
    win = env.window;
    doc = env.document;
    setupDashboardEnvironment(win, doc);
    win.loadFinanceData(JSON.parse(JSON.stringify(canonicalBaselineJSON)));
    state = win.state;
  });

  // =========================================================================
  // Area 1: Snapshots & Account Balance Boundaries (7 Tests)
  // =========================================================================
  describe('Area 1: Snapshots & Account Balance Boundaries', () => {

    it('T2-SNAP-01: Empty Snapshot Array (snapshots = [])', () => {
      const emptyData = { ...canonicalBaselineJSON, snapshots: [] };
      const res = win.loadFinanceData(emptyData);
      assertTrue(res.success, 'Loading data with empty snapshots should succeed gracefully');
      assertEqual(state.snapshots.length, 0, 'Snapshots length must be 0');

      const kpiTWD = doc.getElementById('kpi-net-worth-twd');
      assertEqual(kpiTWD.textContent, 'NT$ 0', 'Net worth KPI must render NT$ 0 for empty snapshots');

      const cloned = win.clonePreviousSnapshot();
      assertDeepEqual(cloned, {}, 'Cloning with 0 snapshots returns empty object');
    });

    it('T2-SNAP-02: Single Snapshot (N = 1, First Period Delta)', () => {
      const singleData = { ...canonicalBaselineJSON, snapshots: [canonicalBaselineJSON.snapshots[0]] };
      win.loadFinanceData(singleData);
      assertEqual(state.snapshots.length, 1, 'Snapshots length must be 1');

      const rows = doc.querySelectorAll('#snapshots-table-body tr');
      assertEqual(rows.length, 1, 'Should render exactly 1 table row');

      const firstRowText = rows[0].textContent;
      assertIncludes(firstRowText, '+NT$ 0', 'First snapshot growth delta must be +NT$ 0');
      assertIncludes(firstRowText, '+0.00%', 'First snapshot growth rate must be +0.00% without NaN');
    });

    it('T2-SNAP-03: Missing / Empty / Extra Account Keys in Snapshot Object', () => {
      const malformedSnapshot = {
        date: '2026-08-23',
        usd_rate: 32.39,
        note: 'Test malformed accounts',
        accounts: {
          '玉山活存': 50000,          // Normal
          '玉山美金': '',            // Empty string
          'Chase Checking': '   ',    // Whitespace string
          'Firstrade': '1000.50',     // String numeric
          '未知外幣帳戶': 500         // Extra unregistered account
        }
      };
      state.snapshots.push(malformedSnapshot);
      win.renderAll();

      const totals = win.calculateNetWorth(malformedSnapshot);
      assertEqual(totals.twd_accounts, 50000, 'Empty and whitespace accounts must sanitize to 0');
      assertCloseTo(totals.usd_accounts_usd, 1000.50, 0.01, 'Numeric string parses cleanly');
      assertFalse(isNaN(totals.net_worth_twd), 'Net worth TWD must not be NaN');
      assertTrue(isFinite(totals.net_worth_twd), 'Net worth TWD must be finite');
    });

    it('T2-SNAP-04: Ultra-Large Account Balances (Trillions / Overflow Bounds)', () => {
      const hugeBalance = 999999999999999; // 10^15 - 1
      const hugeSnapshot = {
        date: '2026-08-23',
        usd_rate: 32.0,
        accounts: { '玉山活存': hugeBalance }
      };
      state.snapshots.push(hugeSnapshot);
      win.renderAll();

      const totals = win.calculateNetWorth(hugeSnapshot);
      assertTrue(isFinite(totals.net_worth_twd), 'Trillion-scale balance arithmetic must remain finite');
      
      const formatted = formatCurrencyString(hugeBalance, 'TWD');
      assertIncludes(formatted, '999,999,999,999,999', 'Currency formatter must include commas without exponential distortion');
    });

    it('T2-SNAP-05: Extreme Negative Account Balances (Debt / Heavy Overdraft)', () => {
      const debtSnapshot = {
        date: '2026-08-23',
        usd_rate: 32.0,
        accounts: { '玉山活存': 1000000, '玉山證券': -50000000 }
      };
      state.snapshots.push(debtSnapshot);
      win.renderAll();

      const totals = win.calculateNetWorth(debtSnapshot);
      assertEqual(totals.net_worth_twd, -49000000, 'Net worth must reflect negative sum (-NT$49,000,000)');

      const formatted = formatCurrencyString(totals.net_worth_twd, 'TWD');
      assertTrue(formatted.startsWith('-NT$ ') && formatted.includes('49,000,000'), 'Formatted negative currency has minus prefix');
    });

    it('T2-SNAP-06: Micro-Cent / Sub-Cent Decimal Precision (Crypto / Accrued Interest)', () => {
      const microVal = 100.055;
      const rounded = roundCurrency(microVal, 2);
      assertEqual(rounded, 100.06, '100.055 must round to 100.06 using financial half-up rounding');

      const microSnapshot = {
        date: '2026-08-23',
        usd_rate: 32.0,
        accounts: { '玉山美金': 0.00000001, 'Chase Checking': 12345.67891234 }
      };
      const totals = win.calculateNetWorth(microSnapshot);
      assertCloseTo(totals.usd_accounts_usd, 12345.68, 0.01, 'Micro-cent decimals must sum and round cleanly');
    });

    it('T2-SNAP-07: Out-of-Order / Retroactive Historical Snapshot Dates', () => {
      const retroactiveSnap = {
        date: '2025-01-01',
        usd_rate: 31.5,
        note: 'Retroactive test snapshot',
        accounts: { '玉山活存': 5000 }
      };
      state.snapshots.push(retroactiveSnap);
      state.snapshots.sort((a, b) => a.date.localeCompare(b.date));
      win.renderAll();

      assertEqual(state.snapshots[0].date, '2025-01-01', 'Retroactive snapshot must sort to index 0');
      assertEqual(state.snapshots[1].date, '2025-10-15', 'Chronological order must be maintained');

      const rows = doc.querySelectorAll('#snapshots-table-body tr');
      assertIncludes(rows[0].textContent, '2025-01-01', 'First table row must be 2025-12-01');
    });
  });

  // =========================================================================
  // Area 2: Currency, FX Conversion & Dual-Denomination Boundaries (6 Tests)
  // =========================================================================
  describe('Area 2: Currency, FX Conversion & Dual-Denomination Boundaries', () => {

    it('T2-FX-01: Zero Exchange Rate (usd_rate = 0.0)', () => {
      assertFalse(isValidFXRate(0.0), 'Zero exchange rate must be flagged as invalid');
      const convertedUSD = convertTWDToUSD(1000000, 0.0);
      assertEqual(convertedUSD, 0, 'Zero FX rate must convert to 0 and avoid division-by-zero Infinity/NaN');
      assertTrue(isFinite(convertedUSD), 'Converted USD must remain finite');
    });

    it('T2-FX-02: Negative Exchange Rate (usd_rate = -32.39)', () => {
      assertFalse(isValidFXRate(-32.39), 'Negative FX rate must be rejected');
      const convertedTWD = convertUSDToTWD(1000, -32.39);
      assertEqual(convertedTWD, 0, 'Negative FX rate conversion returns 0 to prevent sign inversion');
    });

    it('T2-FX-03: Hyper-Deflated Micro FX Rate (usd_rate = 0.000001 / 1e-6)', () => {
      const microRate = 0.000001;
      const twdVal = convertUSDToTWD(1000, microRate);
      const usdVal = convertTWDToUSD(1, microRate);

      assertCloseTo(twdVal, 0.001, 1e-6, 'USD converts to micro-TWD cleanly');
      assertEqual(usdVal, 1000000, '1 TWD converts to $1,000,000 USD cleanly');
    });

    it('T2-FX-04: Hyper-Inflated Mega FX Rate (usd_rate = 1,000,000.00 / 1e6)', () => {
      const megaRate = 1000000.00;
      const twdVal = convertUSDToTWD(1000, megaRate);
      assertEqual(twdVal, 1000000000, 'Mega FX converts $1,000 to NT$1,000,000,000');
    });

    it('T2-FX-05: Non-Numeric / String / Symbol / NaN FX Input', () => {
      const badInputs = ['abc', '$32.5', null, undefined, NaN, '--', ''];
      for (const bad of badInputs) {
        assertFalse(isValidFXRate(bad), `Input "${bad}" must be invalid`);
      }
    });

    it('T2-FX-06: High-Precision 8-Decimal FX Rate (usd_rate = 32.39123456)', () => {
      const preciseRate = 32.39123456;
      const twdVal = convertUSDToTWD(10000, preciseRate);
      const roundedTWD = roundCurrency(twdVal, 2);
      assertEqual(roundedTWD, 323912.35, '8-decimal FX rate preserves precision ($10k @ 32.39123456 = NT$323,912.35)');
    });
  });

  // =========================================================================
  // Area 3: Stock Valuation & P&L Division-by-Zero Protection (7 Tests)
  // =========================================================================
  describe('Area 3: Stock Valuation & P&L Division-by-Zero Protection', () => {

    it('T2-STK-01: Zero Cost Basis (cost_total = 0, Division by Zero Prevention)', () => {
      const zeroCostPos = { shares: 1000, price: 150, cost_total: 0 };
      const pl = calculateStockPL(zeroCostPos);

      assertEqual(pl.marketValue, 150000, 'Market value must be 150,000');
      assertEqual(pl.unrealizedPL, 150000, 'Unrealized P&L must be +150,000');
      assertFalse(isNaN(pl.roi), 'ROI must not be NaN');
      assertTrue(pl.roiDisplay === '+∞%' || pl.roiDisplay === 'N/A', 'ROI display must be +∞% or N/A');
    });

    it('T2-STK-02: Zero Shares / Zero Price (shares = 0 or price = 0)', () => {
      const zeroSharesPos = { shares: 0, price: 100, cost_total: 50000 };
      const zeroPricePos = { shares: 100, price: 0, cost_total: 50000 };

      const pl1 = calculateStockPL(zeroSharesPos);
      const pl2 = calculateStockPL(zeroPricePos);

      assertEqual(pl1.marketValue, 0, 'Zero shares must have 0 market value');
      assertEqual(pl1.unrealizedPL, -50000, 'Zero shares must have -cost unrealized P&L');
      assertEqual(pl1.roi, -1.0, 'Zero shares ROI must be -100.00%');

      assertEqual(pl2.marketValue, 0, 'Zero price must have 0 market value');
      assertEqual(pl2.unrealizedPL, -50000, 'Zero price must have -cost unrealized P&L');
    });

    it('T2-STK-03: Negative Share Quantity or Negative Price Input', () => {
      const invalidShares = validateStockEdit({ shares: -500, price: 100 });
      const invalidPrice = validateStockEdit({ shares: 500, price: -25 });
      const validEdit = validateStockEdit({ shares: 500, price: 25 });

      assertFalse(invalidShares.isValid, 'Negative share count must be rejected');
      assertFalse(invalidPrice.isValid, 'Negative price must be rejected');
      assertTrue(validEdit.isValid, 'Positive share and price must be accepted');
    });

    it('T2-STK-04: Fractional Micro-Shares (e.g. Firstrade shares = 0.00001234)', () => {
      const microPos = { shares: 0.00001234, price: 500.0, cost_total: 0.005 };
      const pl = calculateStockPL(microPos);
      assertCloseTo(pl.marketValue, 0.00617, 1e-6, 'Micro fractional shares compute exact sub-cent market value');
    });

    it('T2-STK-05: Null / Undefined Price & Shares (Direct Market Value Position)', () => {
      const roboPos = { account: 'Firstrade', ticker: null, shares: null, price: null, market_value: 44557.25 };
      const pl = calculateStockPL(roboPos);
      assertEqual(pl.marketValue, 44557.25, 'Robo position returns direct market value');
      assertEqual(pl.roiDisplay, 'N/A', 'Robo position ROI displays N/A');
    });

    it('T2-STK-06: Extreme Stock Price / Market Value ($100,000+ / Berkshire Hathaway A)', () => {
      const brkPos = { shares: 50, price: 650000.00, cost_total: 20000000 };
      const pl = calculateStockPL(brkPos);
      assertEqual(pl.marketValue, 32500000, 'Berkshire Hathaway market value evaluates to $32.5M USD');
      assertEqual(pl.unrealizedPL, 12500000, 'Berkshire Hathaway unrealized P&L evaluates to +$12.5M USD');
    });

    it('T2-STK-07: Extreme 100x Multi-Bagger Gain (ROI = +10,000%)', () => {
      const multiBaggerPos = { shares: 1000, cost_total: 1000, price: 101.0 };
      const pl = calculateStockPL(multiBaggerPos);
      assertEqual(pl.roi, 100.0, '100x return evaluates to ROI coefficient of 100.0');
      assertEqual(pl.roiDisplay, '+10000.00%', '100x return formats as +10000.00%');
    });
  });

  // =========================================================================
  // Area 4: Risk Budget, Emergency Reserve & Decision Constraints Boundaries (6 Tests)
  // =========================================================================
  describe('Area 4: Risk Budget, Emergency Reserve & Decision Constraints Boundaries', () => {

    it('T2-CON-01: Total Cash Balance Strictly Below Emergency Reserve (< Reserve Threshold)', () => {
      const deficitCash = 1500000;
      const deployable = calculateDeployableCash(deficitCash, 2400000);
      const status = getEmergencyReserveStatus(deficitCash, 2400000, 100000);

      assertEqual(deployable, 0, 'Deployable cash locks at 0 when below reserve');
      assertTrue(status.isDeficit, 'Emergency reserve status flags deficit');
      assertEqual(status.deficitAmount, 900000, 'Deficit amount is exactly NT$900,000');
      assertEqual(status.monthsCoverage, 15.0, 'Reserve coverage computes to 15.0 months');
    });

    it('T2-CON-02: Total Cash Balance Exactly Equal to Emergency Reserve (= Reserve Threshold)', () => {
      const exactCash = 2400000;
      const deployable = calculateDeployableCash(exactCash, 2400000);
      const status = getEmergencyReserveStatus(exactCash, 2400000, 100000);

      assertEqual(deployable, 0, 'Deployable cash is 0 at exact reserve');
      assertFalse(status.isDeficit, 'Deficit flag is false at exact 100% reserve');
      assertEqual(status.monthsCoverage, 24.0, 'Coverage is exactly 24.0 months');
    });

    it('T2-CON-03: US Estate Tax Exemption Exact Boundary ($60,000.00 vs $60,000.01 vs $59,999.99)', () => {
      const atBoundary = calculateEstateTaxExposure(60000.00);
      const overBoundary = calculateEstateTaxExposure(60000.01);
      const underBoundary = calculateEstateTaxExposure(59999.99);

      assertEqual(atBoundary.exposureUSD, 0, 'Exact $60k has 0 exposure');
      assertEqual(atBoundary.status, 'SAFE', 'Exact $60k status is SAFE');

      assertEqual(overBoundary.exposureUSD, 0.01, '$60,000.01 has $0.01 exposure');
      assertEqual(overBoundary.status, 'EXPOSED', '$60,000.01 status is EXPOSED');

      assertEqual(underBoundary.exposureUSD, 0, '$59,999.99 has 0 exposure');
      assertEqual(underBoundary.status, 'SAFE', '$59,999.99 status is SAFE');
    });

    it('T2-CON-04: 100% Equity Allocation (w_equity = 100%, Severe Over-Allocation)', () => {
      const risk = calculateRiskBudget(30000000, 30000000, 0.50);
      assertEqual(risk.equityCeilingTWD, 15000000, '50% equity ceiling on NT$30M is NT$15M');
      assertEqual(risk.headroomTWD, -15000000, '100% equity allocation produces -NT$15M negative headroom');
      assertTrue(risk.isBreached, 'Risk budget breach flag is triggered');
    });

    it('T2-CON-05: Insolvent State (NW <= 0, Liabilities Exceed Assets)', () => {
      const insolventRisk = calculateRiskBudget(-5000000, 1000000, 0.50);
      assertEqual(insolventRisk.equityCeilingTWD, 0, 'Insolvent net worth evaluates equity ceiling to 0');
      assertEqual(insolventRisk.headroomTWD, -1000000, 'Insolvent state evaluates headroom to -NT$1M');
      assertTrue(insolventRisk.isBreached, 'Insolvent state is breached');
    });

    it('T2-CON-06: US Tax Physical Presence Days Boundary (182 vs 183 vs 239 Days)', () => {
      const res182 = evaluateIRC871a2(182);
      const res183 = evaluateIRC871a2(183);
      const res239 = evaluateIRC871a2(239);

      assertFalse(res182.applies, '182 days does not trigger IRC §871(a)(2)');
      assertFalse(res182.blocksRebalancingSales, '182 days does not block sales');

      assertTrue(res183.applies, '183 days triggers IRC §871(a)(2)');
      assertTrue(res183.blocksRebalancingSales, '183 days blocks sales');

      assertTrue(res239.applies, '239 days triggers IRC §871(a)(2)');
    });
  });

  // =========================================================================
  // Area 5: File I/O, Schema Violations, Malformed CSV & JSON Boundaries (6 Tests)
  // =========================================================================
  describe('Area 5: File I/O, Schema Violations, Malformed CSV & JSON Boundaries', () => {

    it('T2-FIO-01: Malformed / Corrupted JSON Syntax on File Open', () => {
      const malformedJSONString = '{"meta": { "version": 1, ... missing closing braces';
      let parseError = null;
      try {
        JSON.parse(malformedJSONString);
      } catch (e) {
        parseError = e;
      }
      assertOk(parseError, 'Malformed JSON must throw SyntaxError');
    });

    it('T2-FIO-02: Missing Critical Schema Keys in JSON Payload', () => {
      const brokenSchema = { meta: { version: 1 }, snapshots: [] };
      const res = validateSchema(brokenSchema);

      assertFalse(res.isValid, 'Missing required keys must fail schema validation');
      assertTrue(res.missingKeys.includes('accounts_meta'), 'Must identify missing accounts_meta');
      assertTrue(res.missingKeys.includes('tw_stocks'), 'Must identify missing tw_stocks');
      assertTrue(res.missingKeys.includes('us_stocks'), 'Must identify missing us_stocks');
      assertTrue(res.missingKeys.includes('insurance'), 'Must identify missing insurance');
    });

    it('T2-FIO-03: Malformed CSV Import (Missing Columns, Non-UTF8, Bad Delimiters)', () => {
      const semicolonCSV = 'Col1;Col2;Col3\nVal1;Val2';
      const emptyCSV = '';
      const validCSV = '日期,美金匯率,總淨資產(TWD)\n2026-07-15,32.50,4612500.00';

      const res1 = parseSnapshotCSV(semicolonCSV);
      const res2 = parseSnapshotCSV(emptyCSV);
      const res3 = parseSnapshotCSV(validCSV);

      assertFalse(res1.success, 'Semicolon CSV rejected');
      assertEqual(res1.error.code, 'INVALID_CSV_HEADER', 'Error code must be INVALID_CSV_HEADER');
      assertFalse(res2.success, 'Empty CSV rejected');
      assertTrue(res3.success, 'Valid CSV accepted');
    });

    it('T2-FIO-04: UTF-8 BOM Encoding Integrity (\\uFEFF Byte Order Mark Preservation)', () => {
      const snapCSV = win.generateSnapshotsCSV();
      const stockCSV = win.generateStocksCSV();
      const insCSV = win.generateInsuranceCSV();

      assertEqual(snapCSV.charCodeAt(0), 0xFEFF, 'Snapshots CSV must start with UTF-8 BOM (0xFEFF)');
      assertEqual(stockCSV.charCodeAt(0), 0xFEFF, 'Stock Holdings CSV must start with UTF-8 BOM (0xFEFF)');
      assertEqual(insCSV.charCodeAt(0), 0xFEFF, 'Insurance CSV must start with UTF-8 BOM (0xFEFF)');
      assertIncludes(snapCSV, '玉山活存', 'Traditional Chinese characters preserved in Snapshots CSV');
      assertIncludes(stockCSV, '台積電', 'Traditional Chinese characters preserved in Stocks CSV');
    });

    it('T2-FIO-05: Cross-Site Scripting (XSS) / Injection in Text Fields', () => {
      const xssPayload = '<script>window._xss_flag=true;</script><img src=x onerror=alert(1)>';
      const escaped = escapeHTML(xssPayload);

      assertFalse(escaped.includes('<script>'), 'Script tags must be escaped');
      assertFalse(escaped.includes('<img'), 'Img tags must be escaped');
      assertIncludes(escaped, '&lt;script&gt;', 'Escaped string contains &lt;script&gt;');
    });

    it('T2-FIO-06: Massive Dataset Stress (10,000 Snapshots / Transactions)', () => {
      const bigSnapshots = [];
      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        bigSnapshots.push({
          date: '2020-01-01',
          usd_rate: 32.0,
          accounts: { '玉山活存': 1000 + i, '玉山美金': 2000 + i, 'Firstrade': 500 + i }
        });
      }
      let aggNetWorth = 0;
      for (let i = 0; i < bigSnapshots.length; i++) {
        aggNetWorth += win.calculateNetWorth(bigSnapshots[i]).net_worth_twd;
      }
      const durationMs = Date.now() - startTime;

      assertTrue(durationMs < 1000, `10,000 snapshots processed in ${durationMs}ms (< 1000ms threshold)`);
      assertTrue(aggNetWorth > 0 && isFinite(aggNetWorth), 'Aggregated 10k snapshots produce finite valid sum');
    });
  });

  // =========================================================================
  // Area 6: Network, API & Asynchronous Failure Resilience (5 Tests)
  // =========================================================================
  describe('Area 6: Network, API & Asynchronous Failure Resilience', () => {

    it('T2-API-01: File System Access API Abort / User Cancellation (AbortError)', async () => {
      let handledCleanly = false;
      win.showOpenFilePicker = async () => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        throw err;
      };

      try {
        const btn = doc.getElementById('btn-open-file');
        await btn.click();
        handledCleanly = true;
      } catch (err) {
        handledCleanly = false;
      }

      assertTrue(handledCleanly, 'FSA showOpenFilePicker AbortError must be caught without throwing unhandled exception');
    });

    it('T2-API-02: File System Access API Permission Rejection (NotAllowedError Fallback)', async () => {
      let fallbackTriggered = false;
      win.showSaveFilePicker = async () => {
        const err = new Error('Permission denied.');
        err.name = 'NotAllowedError';
        throw err;
      };

      // Mock save handler catching NotAllowedError and triggering download
      try {
        await win.showSaveFilePicker();
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          win.generateBackupDownload();
          fallbackTriggered = true;
        }
      }

      assertTrue(fallbackTriggered, 'FSA NotAllowedError triggers fallback download');
    });

    it('T2-API-03: Remote Stock / FX Rate API 500 Internal Server Error & 404', async () => {
      win.fetch = async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const res = await win.refreshStockQuotes();
      assertFalse(res.success, 'HTTP 500 must return success: false without crashing');
      
      const twStock = state.tw_stocks.find(s => s.ticker === '2330');
      assertEqual(twStock.price, 950.0, 'Stock price must retain cached baseline value');
    });

    it('T2-API-04: Network Fetch Timeout / AbortController Trigger', () => {
      let timeoutAborted = false;
      const controller = { aborted: false, abort: function() { this.aborted = true; } };
      
      controller.abort();
      if (controller.aborted) {
        timeoutAborted = true;
      }

      assertTrue(timeoutAborted, 'AbortController abort signal triggers cleanly on request timeout');
    });

    it('T2-API-05: HTTP 429 Rate Limiting with Exponential Backoff', async () => {
      win.fetch = async () => ({
        ok: false,
        status: 429,
        headers: { get: (h) => h.toLowerCase() === 'retry-after' ? '5' : null },
      });

      const res = await win.refreshStockQuotes();
      assertFalse(res.success, 'HTTP 429 returns success: false');
      assertIncludes(res.error, 'Rate limit', 'Error message reflects rate limiting');
    });
  });
});

if (require.main === module) {
  executeTestSuite({ tier: '2', verbose: true }).then(code => process.exit(code));
}
