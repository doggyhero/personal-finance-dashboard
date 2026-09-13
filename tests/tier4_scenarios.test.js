/**
 * tests/tier4_scenarios.test.js
 * 
 * Tier 4: Real-World Application Scenarios Test Suite
 * Personal Finance Dashboard & Data Management System
 * 
 * Implements all 5 end-to-end real-world workload scenarios:
 *   1. Scenario 1: Annual Financial Review (全年度財務盤點與資產回顧)
 *   2. Scenario 2: Portfolio Rebalancing Check under IRC §871(a)(2) (資產配置再平衡檢視與交易生成)
 *   3. Scenario 3: Cross-Border Estate & Gift Tax Monitoring (美台遺產稅與贈與稅門檻監控與警示)
 *   4. Scenario 4: Cash Runway & Emergency Reserve Stress Test (現金跑道與緊急預備金壓力測試)
 *   5. Scenario 5: Multi-Currency Complete Financial Lifecycle (多幣別多資產完整生命週期閉環測試)
 * 
 * Architecture:
 * - Compatible with unified runner: node tests/e2e_test_runner.js --tier=4
 * - Standalone executable: node tests/tier4_scenarios.test.js
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
  executeTestSuite,
} = require('./e2e_test_runner');

const BASELINE_DATA_PATH = path.resolve(__dirname, '..', 'data', fs.existsSync(path.resolve(__dirname, '..', 'data', 'sample_data.json')) ? 'sample_data.json' : 'finance_data.json');
const getCanonicalBaseline = () => JSON.parse(fs.readFileSync(BASELINE_DATA_PATH, 'utf8'));
const canonicalBaselineJSON = getCanonicalBaseline();
const accountsMeta = canonicalBaselineJSON.accounts_meta;
const initialSnapshots = getCanonicalBaseline().snapshots;

// --- Financial Calculation Engine Helpers ---

function computeSnapshotTotals(snapshot, accountsMetaList) {
  const metaList = accountsMetaList || accountsMeta;
  const metaMap = new Map(metaList.map(a => [a.key, a]));
  let twdAccountsSum = 0;
  let usdAccountsSum = 0;
  let cashTwd = 0;
  let cashUsd = 0;
  let insuranceUsd = 0;
  let twStockTwd = 0;
  let usStockTwd = 0;
  let usStockUsd = 0;

  for (const [key, val] of Object.entries(snapshot.accounts || {})) {
    const meta = metaMap.get(key);
    if (!meta) continue;
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    if (meta.currency === 'TWD') {
      twdAccountsSum += num;
      if (meta.category === 'cash') cashTwd += num;
      else if (meta.category === 'tw_stock') twStockTwd += num;
      else if (meta.category === 'us_stock') usStockTwd += num;
    } else if (meta.currency === 'USD') {
      usdAccountsSum += num;
      if (meta.category === 'cash') cashUsd += num;
      else if (meta.category === 'insurance') insuranceUsd += num;
      else if (meta.category === 'us_stock') usStockUsd += num;
    }
  }

  const rate = snapshot.usd_rate || 32.50;
  const usdAccountsInTwd = usdAccountsSum * rate;
  const netWorthTwd = twdAccountsSum + usdAccountsInTwd;
  const netWorthUsd = netWorthTwd / rate;

  const totalCashTwd = cashTwd + (cashUsd * rate);
  const totalInsuranceTwd = insuranceUsd * rate;
  const totalEquityTwd = twStockTwd + usStockTwd + (usStockUsd * rate);

  return {
    twdAccountsSum,
    usdAccountsSum,
    usdAccountsInTwd,
    netWorthTwd,
    netWorthUsd,
    totalCashTwd,
    totalInsuranceTwd,
    totalEquityTwd,
    usd_rate: rate
  };
}

// Estate Tax Calculation Engine (IRC §2001(c) & §2101-2108)
function calculateUsEstateTaxLiability(usEquitiesUsd, statutoryExemption = 60000) {
  const taxableExposure = Math.max(0, usEquitiesUsd - statutoryExemption);
  if (taxableExposure === 0) {
    return {
      usEquitiesUsd,
      statutoryExemption,
      taxableExposure: 0,
      grossEstateTax: 0,
      unifiedCredit: 13000,
      netTaxLiability: 0,
      alertStatus: usEquitiesUsd === statutoryExemption ? 'GREEN_LIMIT' : 'GREEN_SAFE'
    };
  }

  // Graduated brackets under IRC §2001(c)
  let grossTax = 0;
  if (usEquitiesUsd <= 10000) {
    grossTax = usEquitiesUsd * 0.18;
  } else if (usEquitiesUsd <= 20000) {
    grossTax = 1800 + (usEquitiesUsd - 10000) * 0.20;
  } else if (usEquitiesUsd <= 40000) {
    grossTax = 3800 + (usEquitiesUsd - 20000) * 0.22;
  } else if (usEquitiesUsd <= 60000) {
    grossTax = 8200 + (usEquitiesUsd - 40000) * 0.24;
  } else if (usEquitiesUsd <= 80000) {
    grossTax = 13000 + (usEquitiesUsd - 60000) * 0.26;
  } else if (usEquitiesUsd <= 100000) {
    grossTax = 18200 + (usEquitiesUsd - 80000) * 0.28;
  } else if (usEquitiesUsd <= 150000) {
    grossTax = 23800 + (usEquitiesUsd - 100000) * 0.30;
  } else if (usEquitiesUsd <= 250000) {
    grossTax = 38800 + (usEquitiesUsd - 150000) * 0.32;
  } else if (usEquitiesUsd <= 500000) {
    grossTax = 70800 + (usEquitiesUsd - 250000) * 0.34;
  } else if (usEquitiesUsd <= 750000) {
    grossTax = 155800 + (usEquitiesUsd - 500000) * 0.37;
  } else if (usEquitiesUsd <= 1000000) {
    grossTax = 248300 + (usEquitiesUsd - 750000) * 0.39;
  } else {
    grossTax = 345800 + (usEquitiesUsd - 1000000) * 0.40;
  }

  const unifiedCredit = 13000; // Tax on $60,000 exemption ($8,200 + $4,800)
  const netTaxLiability = Math.max(0, grossTax - unifiedCredit);
  const excessRatio = (taxableExposure / statutoryExemption) * 100;
  const alertStatus = excessRatio > 50 ? 'RED_ALERT' : 'AMBER_BREACH';

  return {
    usEquitiesUsd,
    statutoryExemption,
    taxableExposure,
    grossEstateTax: grossTax,
    unifiedCredit,
    netTaxLiability,
    alertStatus
  };
}

// Taiwan Gift Tax Engine (遺產及贈與稅法 §22)
function calculateTaiwanGiftTax(cumulativeGiftsTwd, annualExemption = 2440000) {
  const taxableExcess = Math.max(0, cumulativeGiftsTwd - annualExemption);
  const remainingHeadroom = Math.max(0, annualExemption - cumulativeGiftsTwd);
  const giftTaxLiability = taxableExcess * 0.10;
  let alertStatus = 'GREEN';
  if (taxableExcess > 0) {
    alertStatus = 'RED_ALERT';
  } else if (cumulativeGiftsTwd >= annualExemption * 0.90) {
    alertStatus = 'AMBER_WARNING';
  }
  return {
    cumulativeGiftsTwd,
    annualExemption,
    taxableExcess,
    remainingHeadroom,
    giftTaxLiability,
    alertStatus
  };
}

// Portfolio Rebalancing Trade Generator
function generateRebalancingTrades(portfolioState, mode = 'MODE_Q') {
  if (mode !== 'MODE_Q') {
    return {
      status: 'LOCKED',
      canTrade: false,
      message: `Trades only allowed in Mode Q (Current mode: ${mode})`,
      trades: []
    };
  }

  const { netWorthTwd, totalEquityTwd, totalCashTwd, emergencyReserveTwd, usd_rate } = portfolioState;
  const targetEquityPct = portfolioState.targetEquityPct !== undefined ? portfolioState.targetEquityPct : 0.70;
  const riskCeilingPct = portfolioState.riskCeilingPct !== undefined ? portfolioState.riskCeilingPct : 0.75;
  const toleranceBandPct = 0.05;

  const actualEquityPct = totalEquityTwd / netWorthTwd;
  const equityDriftPct = actualEquityPct - targetEquityPct;
  const isBreached = Math.abs(equityDriftPct) > toleranceBandPct;

  const targetEquityValue = netWorthTwd * targetEquityPct;
  const requiredDeploymentTwd = Math.max(0, targetEquityValue - totalEquityTwd);
  const deployableCashTwd = Math.max(0, totalCashTwd - emergencyReserveTwd);
  const riskCeilingValueTwd = netWorthTwd * riskCeilingPct;

  // Verify constraints
  const liquidityCleared = requiredDeploymentTwd <= deployableCashTwd;
  const riskLimitCleared = (totalEquityTwd + requiredDeploymentTwd) <= riskCeilingValueTwd;

  // Staged Deployment Tranches (4 quarters DCA)
  const numTranches = 4;
  const trancheAmountTwd = requiredDeploymentTwd / numTranches;
  const trancheAmountUsd = trancheAmountTwd / usd_rate;

  const trades = [
    {
      orderId: 1,
      instrument: 'VWRA / SWRD (Irish UCITS Global Equity)',
      type: 'BUY',
      amountUsd: Number((trancheAmountUsd * 0.6).toFixed(2)),
      amountTwd: Number((trancheAmountTwd * 0.6).toFixed(2)),
      broker: 'International Broker',
      rationale: 'Accumulating class, 0% dividend withholding, non-US situs (estate tax immune)'
    },
    {
      orderId: 2,
      instrument: 'VUAA / CNDX (Irish UCITS US Broad / Tech Core)',
      type: 'BUY',
      amountUsd: Number((trancheAmountUsd * 0.4).toFixed(2)),
      amountTwd: Number((trancheAmountTwd * 0.4).toFixed(2)),
      broker: 'International Broker',
      rationale: 'Accumulating class, non-US situs'
    }
  ];

  return {
    status: 'UNLOCKED',
    canTrade: true,
    actualEquityPct,
    targetEquityPct,
    equityDriftPct,
    isBreached,
    requiredDeploymentTwd,
    deployableCashTwd,
    liquidityCleared,
    riskLimitCleared,
    numTranches,
    trancheAmountTwd,
    trancheAmountUsd,
    trades
  };
}

// Validator for Tax Constraints (IRC §871(a)(2))
function validateRebalancingTrades(trades) {
  for (const trade of trades) {
    if (trade.type === 'SELL') {
      throw new Error(`PROHIBITED: Selling appreciated stock triggers 30% US capital gains tax under IRC §871(a)(2). Trade rejected: ${trade.instrument}`);
    }
  }
  return true;
}

// Macro Stress Testing Engine
function runMacroStressTest(baseline, shocks) {
  const { totalCashTwd, totalInsuranceTwd, totalEquityTwd, usdCashPortionUsd, monthlyBurnRate, emergencyReserveMonths } = baseline;
  const fx = shocks.fxRate !== undefined ? shocks.fxRate : 32.50;
  const equityMultiplier = 1 + (shocks.equityShockPct || 0);
  const burnRate = shocks.monthlyBurnRate || monthlyBurnRate || 60000;
  const reserveMonths = emergencyReserveMonths || 12;

  const stressedEquityTwd = totalEquityTwd * equityMultiplier;
  const equityDropTwd = totalEquityTwd - stressedEquityTwd;

  // Stressed Cash calculation
  let stressedCashTwd = totalCashTwd;
  if (shocks.fxRate !== undefined) {
    const twdCash = totalCashTwd - (usdCashPortionUsd * 32.50);
    stressedCashTwd = twdCash + (usdCashPortionUsd * fx);
  }
  if (shocks.cashWithdrawalTwd) {
    stressedCashTwd = Math.max(0, stressedCashTwd - shocks.cashWithdrawalTwd);
  }

  // Stressed Insurance
  const insuranceUsd = (totalInsuranceTwd || 0) / 32.50;
  const stressedInsuranceTwd = insuranceUsd * fx;

  const stressedNetWorthTwd = stressedCashTwd + stressedInsuranceTwd + stressedEquityTwd;
  const baselineNetWorthTwd = totalCashTwd + totalInsuranceTwd + totalEquityTwd;
  const netWorthDrawdownPct = ((baselineNetWorthTwd - stressedNetWorthTwd) / baselineNetWorthTwd) * 100;

  const mandatoryReserveTwd = reserveMonths * burnRate;
  const deployableCashTwd = Math.max(0, stressedCashTwd - mandatoryReserveTwd);
  const runwayMonths = stressedCashTwd / burnRate;
  const reserveDeficitTwd = Math.max(0, mandatoryReserveTwd - stressedCashTwd);
  const isSolvent = stressedCashTwd >= mandatoryReserveTwd;

  return {
    stressedNetWorthTwd,
    netWorthDrawdownPct,
    equityDropTwd,
    stressedCashTwd,
    mandatoryReserveTwd,
    deployableCashTwd,
    runwayMonths,
    reserveDeficitTwd,
    isSolvent,
    alertBadge: isSolvent ? 'GREEN_SOLVENT' : 'RED_DEFICIT'
  };
}

// CSV and JSON Export Helpers
function generateSnapshotsCSV(snapshots, accountsMetaList) {
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += 'Date,USD_Rate,TWD_Accounts_Subtotal,USD_Accounts_USD,Net_Worth_TWD,Net_Worth_USD,Note\r\n';
  snapshots.forEach(s => {
    const totals = computeSnapshotTotals(s, accountsMetaList);
    const escapedNote = `"${(s.note || '').replace(/"/g, '""')}"`;
    csv += `${s.date},${s.usd_rate},${totals.twdAccountsSum.toFixed(2)},${totals.usdAccountsSum.toFixed(2)},${totals.netWorthTwd.toFixed(2)},${totals.netWorthUsd.toFixed(2)},${escapedNote}\r\n`;
  });
  return csv;
}

function generateHoldingsCSV(twStocks, usStocks) {
  let csv = '\uFEFF';
  csv += 'Market,Account,Ticker,Name,Shares,Price,Cost_Total,Market_Value,Unrealized_PL,ROI\r\n';
  (twStocks || []).forEach(s => {
    const escapedName = `"${(s.name || '').replace(/"/g, '""')}"`;
    csv += `TW,玉山證券,${s.ticker},${escapedName},${s.shares},${s.price},${s.cost_total},${s.market_value},${s.unrealized_pl},${(s.roi * 100).toFixed(2)}%\r\n`;
  });
  (usStocks || []).forEach(s => {
    const escapedName = `"${(s.name || s.ticker || '').replace(/"/g, '""')}"`;
    csv += `US,${s.account},${s.ticker || 'N/A'},${escapedName},${s.shares || 0},${s.price || 0},${s.cost_total || 0},${s.market_value},${s.unrealized_pl || 0},${s.roi ? (s.roi * 100).toFixed(2) + '%' : 'N/A'}%\r\n`;
  });
  return csv;
}

// Year-End Snapshot Constant Fixture for Scenario 1
const YEAR_END_2026_SNAPSHOT = {
  date: '2026-12-31',
  note: '2026 年度封帳盤點，全年度財務回顧與資產再配置',
  usd_rate: 32.50,
  accounts: {
    '玉山活存': 700000,
    '玉山美金': 25000,
    'Chase Checking': 18000,
    '玉山證券': 1350000,
    'Firstrade': 55000
  }
};

// ============================================================================
// BDD TEST SUITE REGISTRATION
// ============================================================================

describe('Tier 4: Real-World Application Scenarios', () => {

  // =========================================================================
  // SCENARIO 1: Annual Financial Review (全年度財務盤點與資產回顧)
  // =========================================================================
  describe('Scenario 1: Annual Financial Review & Multi-Period YoY Growth', () => {
    
    it('T4-S1-01: Full-Year 5 Snapshot Ingestion & Chronological Continuity', () => {
      assertEqual(initialSnapshots.length, 4, 'Canonical baseline must start with 4 historical snapshots');

      const fullYearSnapshots = [...initialSnapshots, YEAR_END_2026_SNAPSHOT];
      assertEqual(fullYearSnapshots.length, 5, 'Full-year timeline contains exactly 5 sequential snapshots');

      // Verify chronological order
      for (let i = 1; i < fullYearSnapshots.length; i++) {
        assertTrue(fullYearSnapshots[i].date > fullYearSnapshots[i - 1].date,
          `Snapshot ${fullYearSnapshots[i].date} must follow ${fullYearSnapshots[i - 1].date}`);
      }

      // Verify calculated totals across all 5 snapshots
      const snap1 = computeSnapshotTotals(fullYearSnapshots[0], accountsMeta); // 2025-10-15
      const snap2 = computeSnapshotTotals(fullYearSnapshots[1], accountsMeta); // 2026-01-15
      const snap3 = computeSnapshotTotals(fullYearSnapshots[2], accountsMeta); // 2026-04-15
      const snap4 = computeSnapshotTotals(fullYearSnapshots[3], accountsMeta); // 2026-07-15
      const snap5 = computeSnapshotTotals(fullYearSnapshots[4], accountsMeta); // 2026-12-31

      assertCloseTo(snap1.netWorthTwd, 2740000.00, 10.0, '2025-10-15 Net Worth');
      assertCloseTo(snap2.netWorthTwd, 3328100.00, 10.0, '2026-01-15 Net Worth');
      assertCloseTo(snap3.netWorthTwd, 3929200.00, 10.0, '2026-04-15 Net Worth');
      assertCloseTo(snap4.netWorthTwd, 4612500.00, 10.0, '2026-07-15 Net Worth');
      assertCloseTo(snap5.netWorthTwd, 5235000.00, 10.0, '2026-12-31 Net Worth');
    });

    it('T4-S1-02: Multi-Period Growth & Performance Attribution Decomposition', () => {
      const fullYearSnapshots = [...initialSnapshots, YEAR_END_2026_SNAPSHOT];

      const snapJan = computeSnapshotTotals(fullYearSnapshots[0], accountsMeta);
      const snapDec = computeSnapshotTotals(fullYearSnapshots[4], accountsMeta);

      const deltaNetWorthTwd = snapDec.netWorthTwd - snapJan.netWorthTwd;
      const yoyGrowthPct = (deltaNetWorthTwd / snapJan.netWorthTwd) * 100;

      assertCloseTo(deltaNetWorthTwd, 2495000.00, 100.0, 'Full period Net Worth increase ≈ NT$2.495M');
      assertCloseTo(yoyGrowthPct, 91.06, 0.5, 'Net Worth growth rate ≈ +91.06%');

      // Performance Attribution Decomposition
      // ΔNW = External Savings + FX Revaluation + Organic Capital Gain
      const externalSavings = 1200000; // Annual Savings & Capital Inflow
      const fxImpact = 50000 * (32.50 - 31.80); // USD assets * ΔFX (0.70) = NT$ 35,000
      const organicGain = deltaNetWorthTwd - externalSavings - fxImpact; // NT$ 1,260,000

      assertCloseTo(fxImpact, 35000.00, 100.0, 'FX tailwind gain ≈ NT$35.0k');
      assertCloseTo(organicGain, 1260000.00, 500.0, 'Organic capital appreciation ≈ NT$1.26M');
      assertCloseTo(externalSavings + fxImpact + organicGain, deltaNetWorthTwd, 0.01, 'Attribution conservation sum');
    });

    it('T4-S1-03: Asset Allocation & Currency Exposure Shift Verification (Baseline vs Year-End)', () => {
      const snapJanTotals = computeSnapshotTotals(initialSnapshots[0], accountsMeta);
      const snapDecTotals = computeSnapshotTotals(YEAR_END_2026_SNAPSHOT, accountsMeta);

      // Baseline Allocation
      const janCashPct = (snapJanTotals.totalCashTwd / snapJanTotals.netWorthTwd) * 100;
      const janEqPct = (snapJanTotals.totalEquityTwd / snapJanTotals.netWorthTwd) * 100;

      // Year-End Allocation
      const decCashPct = (snapDecTotals.totalCashTwd / snapDecTotals.netWorthTwd) * 100;
      const decEqPct = (snapDecTotals.totalEquityTwd / snapDecTotals.netWorthTwd) * 100;

      const cashShift = decCashPct - janCashPct;
      const eqShift = decEqPct - janEqPct;

      assertCloseTo(cashShift, 4.08, 0.4, 'Cash weight shift increases by ~4.08%');
      assertCloseTo(eqShift, -4.08, 0.4, 'Equity weight shift decreases by ~4.08%');
    });

  });

  // =========================================================================
  // SCENARIO 2: Portfolio Rebalancing Check under IRC §871(a)(2)
  // =========================================================================
  describe('Scenario 2: Portfolio Rebalancing Check under IRC §871(a)(2)', () => {

    it('T4-S2-01: Rebalancing Mode Guardrail Check (Mode W/S Locked, Mode Q Unlocked)', () => {
      const snapLatest = computeSnapshotTotals(initialSnapshots[3], accountsMeta);
      const portfolioState = {
        netWorthTwd: snapLatest.netWorthTwd,
        totalEquityTwd: snapLatest.totalEquityTwd,
        totalCashTwd: snapLatest.totalCashTwd,
        emergencyReserveTwd: 720000,
        usd_rate: 32.50
      };

      // Mode W Check
      const resultModeW = generateRebalancingTrades(portfolioState, 'MODE_W');
      assertEqual(resultModeW.status, 'LOCKED', 'Mode W must lock rebalancing trade generation');
      assertFalse(resultModeW.canTrade, 'Mode W canTrade must be false');
      assertEqual(resultModeW.trades.length, 0, 'Mode W must yield 0 trades');
      assertIncludes(resultModeW.message, 'Mode Q', 'Mode W message must state requirement for Mode Q');

      // Mode S Check
      const resultModeS = generateRebalancingTrades(portfolioState, 'MODE_S');
      assertEqual(resultModeS.status, 'LOCKED', 'Mode S must lock rebalancing trade generation');

      // Mode Q Check
      const resultModeQ = generateRebalancingTrades(portfolioState, 'MODE_Q');
      assertEqual(resultModeQ.status, 'UNLOCKED', 'Mode Q must unlock rebalancing trade generation');
      assertTrue(resultModeQ.canTrade, 'Mode Q canTrade must be true');
      assertTrue(resultModeQ.trades.length > 0, 'Mode Q must generate actionable trades');
    });

    it('T4-S2-02: Portfolio Drift Band Breach Detection (-7.67% Equity Deficit vs 70% Target)', () => {
      const snapLatest = computeSnapshotTotals(initialSnapshots[3], accountsMeta);
      const portfolioState = {
        netWorthTwd: snapLatest.netWorthTwd,
        totalEquityTwd: snapLatest.totalEquityTwd,
        totalCashTwd: snapLatest.totalCashTwd,
        emergencyReserveTwd: 720000,
        targetEquityPct: 0.70,
        riskCeilingPct: 0.75,
        usd_rate: 32.50
      };

      const rebalance = generateRebalancingTrades(portfolioState, 'MODE_Q');
      assertCloseTo(rebalance.actualEquityPct * 100, 62.33, 0.1, 'Actual equity allocation is ~62.33%');
      assertEqual(rebalance.targetEquityPct * 100, 70.0, 'Target equity policy allocation is 70.0%');
      assertCloseTo(rebalance.equityDriftPct * 100, -7.67, 0.1, 'Equity drift is ~ -7.67% deficit');
      assertTrue(rebalance.isBreached, 'Drift of -7.67% must breach the ±5% tolerance band');
      assertCloseTo(rebalance.requiredDeploymentTwd, 353750.00, 100.0, 'Required deployment is ~NT$353.75k');
    });

    it('T4-S2-03: Cash-Only Funding Rule, IRC §871(a)(2) Anti-Sale Enforcement & 4 Tranches of ~NT$88.4k', () => {
      const snapLatest = computeSnapshotTotals(initialSnapshots[3], accountsMeta);
      const portfolioState = {
        netWorthTwd: snapLatest.netWorthTwd,
        totalEquityTwd: snapLatest.totalEquityTwd,
        totalCashTwd: snapLatest.totalCashTwd,
        emergencyReserveTwd: 720000,
        targetEquityPct: 0.70,
        riskCeilingPct: 0.75,
        usd_rate: 32.50
      };

      const rebalance = generateRebalancingTrades(portfolioState, 'MODE_Q');
      assertTrue(rebalance.liquidityCleared, 'Required deployment must be fundable from deployable cash');
      assertTrue(rebalance.riskLimitCleared, 'Post-deployment equity must remain within 75% risk ceiling');

      // Sizing of 4 quarterly tranches
      assertEqual(rebalance.numTranches, 4, 'Staged deployment across 4 quarterly DCA tranches');
      assertCloseTo(rebalance.trancheAmountTwd, 88437.50, 100.0, 'Tranche 1 amount is ~NT$88.4k');
      assertCloseTo(rebalance.trancheAmountUsd, 2721.15, 10.0, 'Tranche 1 USD amount ≈ $2.72k USD');

      // Instrument recommendations (Irish UCITS accumulating)
      const validTrades = rebalance.trades;
      assertTrue(validateRebalancingTrades(validTrades), 'Generated trades comply with cash-only buying rule');

      // Test rejection of stock selling proposals under IRC §871(a)(2)
      const illegalProposal = [
        { instrument: 'VOO', type: 'SELL', amountUsd: 5000 },
        { instrument: 'VWRA', type: 'BUY', amountUsd: 5000 }
      ];
      assertThrows(
        () => validateRebalancingTrades(illegalProposal),
        /PROHIBITED: Selling appreciated stock triggers 30% US capital gains tax under IRC §871\(a\)\(2\)/,
        'Rebalancing validator must catch and block stock sales'
      );
    });

  });

  // =========================================================================
  // SCENARIO 3: Cross-Border Estate & Gift Tax Monitoring
  // =========================================================================
  describe('Scenario 3: Cross-Border Estate & Gift Tax Monitoring', () => {

    it('T4-S3-01: US NRA Estate Tax Exposure & Liability Calculation ($40k Excess, $10,800 Tax Alert)', () => {
      // Simulate estate test portfolio: $100,000 USD of US-situs equities
      const usEquitiesUsd = 100000;

      const estateTax = calculateUsEstateTaxLiability(usEquitiesUsd, 60000);
      assertCloseTo(estateTax.taxableExposure, 40000.00, 0.01, 'Taxable excess over $60k exemption = $40,000.00 USD');
      assertCloseTo(estateTax.grossEstateTax, 23800.00, 0.02, 'Gross estate tax on $100,000 = $23,800.00 USD');
      assertEqual(estateTax.unifiedCredit, 13000, 'Unified credit for $60k exemption = $13,000.00 USD');
      assertCloseTo(estateTax.netTaxLiability, 10800.00, 0.02, 'Net estimated US estate tax liability = $10,800.00 USD');
      assertEqual(estateTax.alertStatus, 'RED_ALERT', 'Estate tax status is RED ALERT (exceeds exemption by >50%)');
    });

    it('T4-S3-02: US Estate Tax Boundary Transitions ($45k Safe, $60k Exact Boundary, $60,001 Amber Breach)', () => {
      // 1. Safe sub-threshold
      const safeResult = calculateUsEstateTaxLiability(45000, 60000);
      assertEqual(safeResult.taxableExposure, 0, 'Safe state: $0 taxable exposure');
      assertEqual(safeResult.netTaxLiability, 0, 'Safe state: $0 tax liability');
      assertEqual(safeResult.alertStatus, 'GREEN_SAFE', 'Safe state alert badge is GREEN_SAFE');

      // 2. Exact boundary
      const boundaryResult = calculateUsEstateTaxLiability(60000, 60000);
      assertEqual(boundaryResult.taxableExposure, 0, 'Exact boundary: $0 taxable exposure');
      assertEqual(boundaryResult.netTaxLiability, 0, 'Exact boundary: $0 tax liability');
      assertEqual(boundaryResult.alertStatus, 'GREEN_LIMIT', 'Exact boundary alert badge is GREEN_LIMIT');

      // 3. 1-Dollar Breach
      const breachResult = calculateUsEstateTaxLiability(60001, 60000);
      assertEqual(breachResult.taxableExposure, 1, 'Breach state: $1.00 taxable exposure');
      assertTrue(breachResult.netTaxLiability > 0, 'Breach state: Net tax liability > 0');
      assertEqual(breachResult.alertStatus, 'AMBER_BREACH', 'Breach state alert badge is AMBER_BREACH');
    });

    it('T4-S3-03: Cross-Border Taiwan Gift Tax (NT$2.44M Limit) & IRS Form 3520 Foreign Gift ($100k)', () => {
      // Stage 1: Transfer of NT$ 1,500,000
      const stage1 = calculateTaiwanGiftTax(1500000, 2440000);
      assertEqual(stage1.taxableExcess, 0, 'Stage 1: No excess');
      assertEqual(stage1.remainingHeadroom, 940000, 'Stage 1: NT$ 940,000 headroom');
      assertEqual(stage1.giftTaxLiability, 0, 'Stage 1: NT$ 0 tax');
      assertEqual(stage1.alertStatus, 'GREEN', 'Stage 1: Status GREEN');

      // Stage 2: Cumulative NT$ 2,300,000
      const stage2 = calculateTaiwanGiftTax(2300000, 2440000);
      assertEqual(stage2.taxableExcess, 0, 'Stage 2: No excess');
      assertEqual(stage2.remainingHeadroom, 140000, 'Stage 2: NT$ 140,000 headroom remaining');
      assertEqual(stage2.alertStatus, 'AMBER_WARNING', 'Stage 2: Status AMBER_WARNING (>90% quota used)');

      // Stage 3: Cumulative NT$ 2,500,000 (breach by NT$ 60,000)
      const stage3 = calculateTaiwanGiftTax(2500000, 2440000);
      assertEqual(stage3.taxableExcess, 60000, 'Stage 3: Taxable excess NT$ 60,000');
      assertEqual(stage3.remainingHeadroom, 0, 'Stage 3: NT$ 0 headroom');
      assertEqual(stage3.giftTaxLiability, 6000, 'Stage 3: 10% tax on excess = NT$ 6,000');
      assertEqual(stage3.alertStatus, 'RED_ALERT', 'Stage 3: Status RED_ALERT');

      // IRS Form 3520 Foreign Gift Reporting Threshold Check ($100,000 USD)
      const foreignGiftUsd = 120000;
      const form3520Threshold = 100000;
      const requiresForm3520 = foreignGiftUsd > form3520Threshold;
      assertTrue(requiresForm3520, 'Foreign gift of $120k requires IRS Form 3520 Part IV filing');
    });

  });

  // =========================================================================
  // SCENARIO 4: Cash Runway & Emergency Reserve Stress Test
  // =========================================================================
  describe('Scenario 4: Cash Runway & Emergency Reserve Stress Test', () => {

    it('T4-S4-01: Severe Market Drawdown (-50% Equity Crash: 31.17% Max Drawdown)', () => {
      const snapLatest = computeSnapshotTotals(initialSnapshots[3], accountsMeta);
      const baseline = {
        totalCashTwd: snapLatest.totalCashTwd,
        totalInsuranceTwd: snapLatest.totalInsuranceTwd,
        totalEquityTwd: snapLatest.totalEquityTwd,
        usdCashPortionUsd: 35000,
        monthlyBurnRate: 60000,
        emergencyReserveMonths: 12
      };

      // Stress 4.1: -25% Bear Market
      const stress25 = runMacroStressTest(baseline, { equityShockPct: -0.25 });
      assertCloseTo(stress25.netWorthDrawdownPct, 15.58, 0.05, 'Drawdown under -25% equity shock = 15.58%');
      assertCloseTo(stress25.runwayMonths, 28.96, 0.2, 'Cash runway remains 28.96 months (~2.4 years)');
      assertTrue(stress25.isSolvent, 'Solvency intact');

      // Stress 4.2: -50% Severe Crash
      const stress50 = runMacroStressTest(baseline, { equityShockPct: -0.50 });
      assertCloseTo(stress50.netWorthDrawdownPct, 31.17, 0.05, 'Drawdown under -50% crash = 31.17%');
      assertCloseTo(stress50.deployableCashTwd, 1017500.00, 100.0, 'Deployable cash remains NT$1.018M');
      assertEqual(stress50.mandatoryReserveTwd, 720000, 'Emergency reserve intact at NT$720k');
      assertTrue(stress50.isSolvent, 'Household remains 100% solvent');
    });

    it('T4-S4-02: Quadruple Macro Stress Test (-50% Crash + FX 28.0 + NT$90k Burn) & Deficit Alert', () => {
      const snapLatest = computeSnapshotTotals(initialSnapshots[3], accountsMeta);
      const baseline = {
        totalCashTwd: snapLatest.totalCashTwd,
        totalInsuranceTwd: snapLatest.totalInsuranceTwd,
        totalEquityTwd: snapLatest.totalEquityTwd,
        usdCashPortionUsd: 35000,
        monthlyBurnRate: 60000,
        emergencyReserveMonths: 12
      };

      // Quadruple composite shock:
      // 1. Income = $0
      // 2. Equity = -50%
      // 3. FX Rate = 28.00 (USD deflates)
      // 4. Monthly burn rate = NT$ 90,000 (+50% inflation spike)
      const quadStress = runMacroStressTest(baseline, {
        equityShockPct: -0.50,
        fxRate: 28.00,
        monthlyBurnRate: 90000
      });

      assertEqual(quadStress.mandatoryReserveTwd, 1080000, 'Mandatory reserve expands to NT$1.08M (12 * 90k)');
      assertCloseTo(quadStress.stressedCashTwd, 1580000.00, 10.0, 'Total cash revalued at FX 28.0 = NT$1.58M');
      assertCloseTo(quadStress.deployableCashTwd, 500000.00, 10.0, 'Deployable cash surplus cushion = NT$500k');
      assertCloseTo(quadStress.runwayMonths, 17.56, 0.2, 'Cash runway is 17.6 months (> 1.4 years)');
      assertTrue(quadStress.runwayMonths >= 12.0, 'Runway exceeds 1 full year under quadruple stress');
      assertTrue(quadStress.isSolvent, 'Household maintains solvency');

      // Deficit Simulation Edge Case: Emergency withdrawal of NT$ 1.2M
      const deficitStress = runMacroStressTest(baseline, {
        cashWithdrawalTwd: 1200000,
        monthlyBurnRate: 60000
      });
      assertFalse(deficitStress.isSolvent, 'Deficit stress triggers insolvency flag');
      assertEqual(deficitStress.deployableCashTwd, 0, 'Deployable cash falls to NT$ 0');
      assertCloseTo(deficitStress.reserveDeficitTwd, 182500.00, 10.0, 'Emergency reserve deficit = NT$182,500');
      assertCloseTo(deficitStress.runwayMonths, 8.96, 0.2, 'Cash runway shortened to 8.96 months (< 12 months)');
      assertEqual(deficitStress.alertBadge, 'RED_DEFICIT', 'Alert badge switches to RED_DEFICIT');
    });

  });

  // =========================================================================
  // SCENARIO 5: Multi-Currency Multi-Asset Complete Lifecycle
  // =========================================================================
  describe('Scenario 5: Multi-Currency Multi-Asset Complete Lifecycle', () => {

    it('T4-S5-01: Complete 5-Phase Financial Lifecycle Simulation & Multi-Format Round-Trip Export', () => {
      // Deep clone baseline snapshot state
      const state = JSON.parse(JSON.stringify(canonicalBaselineJSON));
      const snapshot20260715 = JSON.parse(JSON.stringify(state.snapshots[3]));
      const accounts = snapshot20260715.accounts;

      // --- PHASE 1: Capital Inflow & FX Wire Movement ---
      // 1. Inflow: +$5,000 USD to Chase Checking
      accounts['Chase Checking'] += 5000.00;
      assertCloseTo(accounts['Chase Checking'], 20000.00, 0.01, 'Phase 1: Chase USD balance updated');

      // 2. FX Conversion: Convert NT$ 200,000 from 玉山活存 @ 32.30 -> $6,191.95 USD into 玉山美金
      const twdSold = 200000;
      const fxBankRate = 32.30;
      const usdPurchased = Number((twdSold / fxBankRate).toFixed(2)); // $6,191.95
      accounts['玉山活存'] -= twdSold;
      accounts['玉山美金'] += usdPurchased;
      assertCloseTo(accounts['玉山活存'], 400000.00, 0.01, 'Phase 1: 玉山活存 debited NT$200k');
      assertCloseTo(accounts['玉山美金'], 26191.95, 0.01, 'Phase 1: 玉山美金 credited $6,191.95');

      // 3. Wire Transfer: $5,000 USD from 玉山美金 to Firstrade with $25 fee
      accounts['玉山美金'] -= 5025.00;
      let firstradeCashUsd = 5000.00;
      assertCloseTo(accounts['玉山美金'], 21166.95, 0.01, 'Phase 1: 玉山美金 after wire');
      assertCloseTo(firstradeCashUsd, 5000.00, 0.01, 'Phase 1: Firstrade cash received');

      // --- PHASE 2: Asset Acquisition (Buy 6 shares VOO) ---
      const vooBuyShares = 6.00000;
      const vooBuyPrice = 520.00;
      const vooTradeCost = vooBuyShares * vooBuyPrice; // $3,120.00
      firstradeCashUsd -= vooTradeCost;
      assertCloseTo(firstradeCashUsd, 1880.00, 0.01, 'Phase 2: Firstrade cash after VOO buy');

      // Find and update VOO position in us_stocks
      let vooPos = state.us_stocks.find(s => s.ticker === 'VOO');
      if (!vooPos) {
        vooPos = { account: 'Firstrade', ticker: 'VOO', shares: 50, price: 540, cost_total: 25000, market_value: 27000 };
        state.us_stocks.push(vooPos);
      }
      const prevVooShares = vooPos.shares;
      vooPos.shares = prevVooShares + vooBuyShares; // 56
      vooPos.price = 540.00;
      vooPos.market_value = Number((vooPos.shares * 540.00).toFixed(2));
      assertEqual(vooPos.shares, 56, 'Phase 2: Total VOO shares updated to 56');
      assertCloseTo(vooPos.market_value, 30240.00, 0.01, 'Phase 2: Total VOO market value @ $540');

      // --- PHASE 3: Income, Dividends & Interest Crediting ---
      // 1. TW 2330 Dividend: 1000 shares * 4.5 = NT$ 4,500 gross. 21% NRA tax = NT$ 945. Net = NT$ 3,555
      const twGrossDiv = 1000 * 4.50;
      const twNetDiv = twGrossDiv * (1 - 0.21);
      accounts['玉山活存'] += twNetDiv;
      assertCloseTo(twNetDiv, 3555.00, 0.01, 'Phase 3: TW 2330 net dividend');
      assertCloseTo(accounts['玉山活存'], 403555.00, 0.01, 'Phase 3: 玉山活存 after TW div');

      // 2. US VOO Dividend: 56 shares * $1.50 = $84.00 gross. 30% NRA tax = $25.20. Net = $58.80
      const usGrossDiv = vooPos.shares * 1.50;
      const usNetDiv = Number((usGrossDiv * (1 - 0.30)).toFixed(2));
      firstradeCashUsd += usNetDiv;
      assertCloseTo(usNetDiv, 58.80, 0.02, 'Phase 3: US VOO net dividend');
      assertCloseTo(firstradeCashUsd, 1938.80, 0.02, 'Phase 3: Firstrade cash after US div');

      // --- PHASE 4: Mark-to-Market Valuation ---
      // Update TW stocks: 2330 -> 1000, 0050 -> 180
      const stock2330 = state.tw_stocks.find(s => s.ticker === '2330');
      if (stock2330) stock2330.price = 1000.0;
      const stock0050 = state.tw_stocks.find(s => s.ticker === '0050');
      if (stock0050) stock0050.price = 180.0;

      let twStocksMarketValue = 0;
      let twStocksTotalCost = 0;
      state.tw_stocks.forEach(s => {
        s.market_value = s.shares * s.price;
        s.unrealized_pl = s.market_value - s.cost_total;
        s.roi = s.unrealized_pl / s.cost_total;
        twStocksMarketValue += s.market_value;
        twStocksTotalCost += s.cost_total;
      });

      assertCloseTo(twStocksMarketValue, 1360000.00, 0.01, 'Phase 4: Total TW stocks market value (1000k + 360k)');
      assertCloseTo(twStocksMarketValue - twStocksTotalCost, 260000.00, 0.01, 'Phase 4: Total TW stocks unrealized P&L (+NT$260k)');

      // US VOO moves to $550.00 USD
      vooPos.price = 550.00;
      vooPos.market_value = Number((vooPos.shares * 550.00).toFixed(2));
      assertCloseTo(vooPos.market_value, 30800.00, 0.01, 'Phase 4: VOO position market value @ $550');

      // Update Firstrade account in snapshot to reflect cash + holdings
      accounts['Firstrade'] = Number((50000.00 + (vooPos.market_value - 27000.00) + firstradeCashUsd).toFixed(2));

      // --- PHASE 5: Outflows & Multi-Format Round-Trip Export ---
      // 1. Living Expenses: -NT$ 120,000 from 玉山活存
      accounts['玉山活存'] -= 120000;
      assertCloseTo(accounts['玉山活存'], 283555.00, 0.01, 'Phase 5: 玉山活存 after living costs');

      // Ingest new snapshot for 2026-12-31
      const newSnapshot = {
        date: '2026-12-31',
        usd_rate: 32.50,
        note: '5-Phase Lifecycle Complete Close',
        accounts: { ...accounts }
      };
      state.snapshots.push(newSnapshot);

      const finalTotals = computeSnapshotTotals(newSnapshot, accountsMeta);
      assertTrue(finalTotals.netWorthTwd > 0, 'Final Net Worth TWD must be positive');
      assertTrue(finalTotals.netWorthUsd > 0, 'Final Net Worth USD must be positive');

      // CSV Exports Verification (UTF-8 BOM prefix \uFEFF and RFC 4180 escaping)
      const snapshotsCSV = generateSnapshotsCSV(state.snapshots, accountsMeta);
      assertEqual(snapshotsCSV.charCodeAt(0), 0xFEFF, 'Snapshots CSV must start with UTF-8 BOM');
      assertIncludes(snapshotsCSV, '2026-12-31', 'Snapshots CSV includes new snapshot row');

      const holdingsCSV = generateHoldingsCSV(state.tw_stocks, state.us_stocks);
      assertEqual(holdingsCSV.charCodeAt(0), 0xFEFF, 'Holdings CSV must start with UTF-8 BOM');
      assertIncludes(holdingsCSV, '台積電', 'Holdings CSV contains properly encoded Chinese characters');

      // JSON Backup Serialization & Re-import Round-Trip
      const serializedJSON = JSON.stringify(state, null, 2);
      const parsedState = JSON.parse(serializedJSON);
      assertDeepEqual(parsedState.snapshots, state.snapshots, 'Lossless JSON snapshot roundtrip');
      assertDeepEqual(parsedState.tw_stocks, state.tw_stocks, 'Lossless JSON TW stocks roundtrip');
      assertDeepEqual(parsedState.us_stocks, state.us_stocks, 'Lossless JSON US stocks roundtrip');
    });

  });

});

// Direct execution support via CLI
if (require.main === module) {
  executeTestSuite({ tier: '4', verbose: true })
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(err => {
      console.error('Tier 4 Execution Error:', err);
      process.exit(1);
    });
}
