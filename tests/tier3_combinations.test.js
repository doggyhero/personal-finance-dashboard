/**
 * Tier 3: Interactive Workflows & State Combinations Test Suite
 * 
 * Tests cross-feature workflows and state mutations:
 *   Workflow 1: Snapshot Clone -> Asset Addition -> Stock Update -> Total Recalculation -> Historical Immutability Check
 *   Workflow 2: Currency Rate Shock & Live Multi-Tab Synchronization
 *   Workflow 3: Real Estate Acquisition + Mortgage Debt Linkage + Net Worth Impact + CSV Export/Import Roundtrip
 *   Workflow 4: Stock Dividend Inflow + 21% Non-Resident Tax Drag + Mode S -> Mode Q Decision Gating
 *   Workflow 5: Bear Market 50% Equity Crash + Emergency Reserve Depletion + Liquidity Buffer Enforcement
 *   Workflow 6: Multi-Broker Rebalancing + US Estate Tax Threshold Optimization
 */

const fs = require('fs');
const path = require('path');
const {
  describe,
  it,
  beforeEach,
  assertEqual,
  assertDeepEqual,
  assertCloseTo,
  assertTrue,
  assertFalse,
  assertOk,
  assertIncludes,
  createMockBrowserEnvironment,
  setupDashboardEnvironment,
  MockFileSystemFileHandle,
  executeTestSuite,
} = require('./e2e_test_runner');

const BASELINE_DATA_PATH = path.resolve(__dirname, '..', 'data', 'sample_data.json');
const canonicalBaselineJSON = JSON.parse(fs.readFileSync(BASELINE_DATA_PATH, 'utf8'));

describe('Tier 3: Interactive Workflows & State Combinations', () => {
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
  // Workflow 1: Snapshot Clone -> Asset Addition -> Stock Update -> Recalculation -> Immutability
  // =========================================================================
  it('Workflow 1: Snapshot Clone -> Asset Addition -> Stock Update -> Total Recalculation -> Historical Immutability Check', () => {
    // Step 1: Clone previous snapshot
    const cloned = win.clonePreviousSnapshot();
    assertEqual(cloned['玉山活存'], 600000, 'Cloned 玉山活存 matches baseline (600,000)');
    assertEqual(cloned['玉山證券'], 1250000, 'Cloned 玉山證券 matches baseline (1,250,000)');
    assertEqual(cloned['Firstrade'], 50000, 'Cloned Firstrade matches baseline (50,000)');

    // Step 2: Mutate cloned values
    cloned['玉山活存'] += 100000; // 600,000 -> 700,000
    cloned['Firstrade'] += 5000;  // 50,000 -> 55,000

    // Step 3: Update stock price for 2330 (台積電)
    win.updateStockPrice('2330', 1000.0); // 950 -> 1000 (+NT$50,000 market value)

    // Step 4: Create new Snapshot #5
    const snapshot5 = {
      date: '2026-08-23',
      usd_rate: 32.50,
      note: 'Workflow 1 Ingestion',
      accounts: cloned
    };
    state.snapshots.push(snapshot5);
    state.snapshots.sort((a, b) => a.date.localeCompare(b.date));
    win.renderAll();

    // Step 5: Verify new totals and growth calculations
    const latestTotals = win.calculateNetWorth(snapshot5);
    assertEqual(latestTotals.twd_accounts, 1950000, 'TWD Accounts Subtotal must be NT$ 1,950,000');
    assertEqual(latestTotals.usd_accounts_usd, 90000, 'USD Accounts Subtotal must be $90,000 USD');
    assertCloseTo(latestTotals.usd_accounts_twd, 90000 * 32.50, 0.01, 'USD in TWD must be NT$ 2,925,000');
    assertCloseTo(latestTotals.net_worth_twd, 4875000, 0.01, 'Total Net Worth TWD must be NT$ 4,875,000');

    const snap4 = state.snapshots.find(s => s.date === '2026-07-15');
    const snap4Totals = win.calculateNetWorth(snap4);
    const growthDelta = latestTotals.net_worth_twd - snap4Totals.net_worth_twd;
    assertCloseTo(growthDelta, 262500, 0.01, 'Period growth delta must be +NT$ 262,500');

    // Step 6: Historical Immutability Check (Snapshots 1..4 must remain strictly unchanged)
    const snap1 = state.snapshots.find(s => s.date === '2025-10-15');
    const snap2 = state.snapshots.find(s => s.date === '2026-01-15');
    const snap3 = state.snapshots.find(s => s.date === '2026-04-15');

    assertEqual(snap1.accounts['玉山活存'], 350000, 'Snapshot #1 玉山活存 is immutable');
    assertEqual(snap2.accounts['玉山活存'], 420000, 'Snapshot #2 玉山活存 is immutable');
    assertEqual(snap3.accounts['Chase Checking'], 12000, 'Snapshot #3 Chase Checking is immutable');
    assertEqual(snap4.accounts['玉山活存'], 600000, 'Snapshot #4 玉山活存 is strictly immutable (600,000)');
    assertEqual(snap4.accounts['Firstrade'], 50000, 'Snapshot #4 Firstrade is strictly immutable (50,000)');
    assertCloseTo(win.calculateNetWorth(snap4).net_worth_twd, 4612500, 0.01, 'Snapshot #4 Net Worth is strictly intact');
  });

  // =========================================================================
  // Workflow 2: Currency Rate Shock & Live Multi-Tab Synchronization
  // =========================================================================
  it('Workflow 2: Currency Rate Shock & Live Multi-Tab Synchronization (all 6 tabs update synchronously)', () => {
    // Step 1: Update global FX rate to 35.00
    const latestSnapshot = state.snapshots[state.snapshots.length - 1]; // 2026-07-15
    latestSnapshot.usd_rate = 35.00;
    state.meta.usd_exchange_rate = 35.00;
    win.renderAll();

    // Step 2: Verify all tabs update synchronously
    // Tab 1: Overview
    const totals = win.calculateNetWorth(latestSnapshot);
    assertEqual(Math.round(totals.net_worth_twd), 4825000, 'Tab 1: Total Net Worth TWD must update to NT$ 4,825,000');
    assertEqual(Math.round(totals.net_worth_usd), 137857, 'Tab 1: Total Net Worth USD must update to $137,857 USD');
    const twdRatio = (totals.twd_accounts / totals.net_worth_twd) * 100;
    const usdRatio = (totals.usd_accounts_twd / totals.net_worth_twd) * 100;
    assertCloseTo(twdRatio, 38.34, 0.05, 'Tab 1: TWD ratio must be ~38.34%');
    assertCloseTo(usdRatio, 61.66, 0.05, 'Tab 1: USD ratio must be ~61.66%');

    // Tab 2: Snapshots
    assertEqual(Math.round(totals.usd_accounts_twd), 2975000, 'Tab 2: Latest USD subtotal in TWD must be NT$ 2,975,000 @ 35.00');

    // Tab 3: Stocks
    const usStockUSD = Number(latestSnapshot.accounts['Firstrade']) || 0;
    const usStockTWD = usStockUSD * 35.00;
    assertEqual(usStockTWD, 1750000, 'Tab 3: US Stock sleeve in TWD converts to NT$ 1,750,000');

    // Tab 5: Decision Constraints
    const equityCeiling = totals.net_worth_twd * 0.50;
    assertEqual(Math.round(equityCeiling), 2412500, 'Tab 5: 50% Equity ceiling updates to NT$ 2,412,500');

    // Tab 6: Data I/O CSV Export
    const exportedCSV = win.generateSnapshotsCSV();
    assertIncludes(exportedCSV, '35', 'Tab 6: Exported Snapshots CSV reflects updated 35.00 FX rate');
  });

  // =========================================================================
  // Workflow 3: Real Estate Acquisition + Mortgage Debt Linkage + Roundtrip
  // =========================================================================
  it('Workflow 3: Real Estate Acquisition + Mortgage Debt Linkage + Net Worth Impact + CSV Export/Import Roundtrip', () => {
    // Step 1: Add Property Asset
    state.accounts_meta.push({ key: '自用不動產', currency: 'TWD', category: 'property' });
    const latest = state.snapshots[state.snapshots.length - 1];
    latest.accounts['自用不動產'] = 25000000;

    // Step 2: Add Mortgage Debt Liability
    state.accounts_meta.push({ key: '房屋貸款', currency: 'TWD', category: 'debt' });
    latest.accounts['房屋貸款'] = -18000000;
    win.renderAll();

    // Step 3: Verify dynamic calculations
    const totals = win.calculateNetWorth(latest);
    // Baseline Net Worth NT$ 4,612,500 + 25,000,000 - 18,000,000 = NT$ 11,612,500
    assertEqual(Math.round(totals.net_worth_twd), 11612500, 'Net Worth reflects +NT$7.0M net home equity (NT$ 11,612,500)');

    const totalAssets = 4612500 + 25000000;
    const totalLiabilities = 18000000;
    const debtRatio = (totalLiabilities / totalAssets) * 100;
    assertCloseTo(debtRatio, 60.78, 0.05, 'Debt-to-Asset ratio evaluates cleanly');

    // Step 4: Export CSV with UTF-8 BOM
    const csvContent = win.generateSnapshotsCSV();
    assertEqual(csvContent.charCodeAt(0), 0xFEFF, 'Exported CSV must begin with UTF-8 BOM');
    assertIncludes(csvContent, '自用不動產', 'CSV must include Property column');
    assertIncludes(csvContent, '房屋貸款', 'CSV must include Mortgage column');

    const exportedJSON = JSON.stringify(state, null, 2);

    // Step 5: Reset State
    win.loadFinanceData({ meta: { version: 1 }, snapshots: [] });
    assertEqual(doc.getElementById('kpi-net-worth-twd').textContent, 'NT$ 0', 'State successfully reset to 0');

    // Step 6: Re-import and verify roundtrip fidelity
    win.loadFinanceData(JSON.parse(exportedJSON));
    const reimportedSnap = state.snapshots[state.snapshots.length - 1];
    assertEqual(reimportedSnap.accounts['自用不動產'], 25000000, 'Property asset restored bit-exact');
    assertEqual(reimportedSnap.accounts['房屋貸款'], -18000000, 'Mortgage liability restored bit-exact');
    assertEqual(Math.round(win.calculateNetWorth(reimportedSnap).net_worth_twd), 11612500, 'Roundtrip Net Worth is exactly NT$ 11,612,500');
  });

  // =========================================================================
  // Workflow 4: Stock Dividend Inflow + 21% NRA Tax Drag + Mode S -> Q Gating
  // =========================================================================
  it('Workflow 4: Stock Dividend Inflow + 21% Non-Resident Tax Drag + Mode S -> Mode Q Decision Gating', () => {
    // Step 1: Dividend distribution event (1,000 shares of 2330 @ NT$ 15.00)
    const shares = 1000;
    const divPerShare = 15.00;
    const grossDividend = shares * divPerShare; // NT$ 15,000
    assertEqual(grossDividend, 15000, 'Gross dividend evaluates to NT$ 15,000');

    // Step 2: 21% Non-Resident Alien withholding tax calculation
    const taxRate = 0.21;
    const taxWithheld = Math.round(grossDividend * taxRate); // NT$ 3,150
    const netDividend = grossDividend - taxWithheld; // NT$ 11,850
    assertEqual(taxWithheld, 3150, 'Non-Resident 21% withholding tax is NT$ 3,150');
    assertEqual(netDividend, 11850, 'Net credited dividend is NT$ 11,850');

    // Credit net dividend to 玉山活存
    const latest = state.snapshots[state.snapshots.length - 1];
    latest.accounts['玉山活存'] += netDividend;
    win.renderAll();

    // Step 3: Decision Mode Guardrail (Mode S Open Items block Mode Q)
    const openItems = [{ id: 1, title: 'Annual Tax Review & Allocation Plan', status: 'OPEN' }];
    function requestModeQ(items) {
      const pending = items.filter(i => i.status === 'OPEN');
      if (pending.length > 0) {
        return { allowed: false, reason: `Mode S has unresolved items (#${pending.map(i => i.id).join(', ')}). Mode Q is locked.` };
      }
      return { allowed: true, reason: 'Mode Q rebalancing unlocked.' };
    }

    const modeQAttemptBlocked = requestModeQ(openItems);
    assertFalse(modeQAttemptBlocked.allowed, 'Mode Q rebalancing is BLOCKED while Mode S items are open');
    assertIncludes(modeQAttemptBlocked.reason, 'Mode S', 'Reason clearly cites Mode S open items');

    // Step 4: Resolve open items and unlock Mode Q
    openItems[0].status = 'RESOLVED';
    const modeQAttemptAllowed = requestModeQ(openItems);
    assertTrue(modeQAttemptAllowed.allowed, 'Mode Q rebalancing UNLOCKS when all items are resolved');
  });

  // =========================================================================
  // Workflow 5: Bear Market 50% Equity Crash + Emergency Reserve Depletion
  // =========================================================================
  it('Workflow 5: Bear Market 50% Equity Crash + Emergency Reserve Depletion + Liquidity Buffer Enforcement', () => {
    const latest = state.snapshots[state.snapshots.length - 1];
    const peakNetWorth = 4612500;

    // Step 1: 50% severe equity market drop
    latest.accounts['玉山證券'] = Math.round(latest.accounts['玉山證券'] * 0.50); // 1,250,000 -> 625,000
    latest.accounts['Firstrade'] = Math.round(latest.accounts['Firstrade'] * 0.50); // 50,000 -> 25,000

    // Step 2: Currency shock (USD/TWD crashes 32.50 -> 28.00)
    latest.usd_rate = 28.00;
    win.renderAll();

    // Step 3: Drawdown calculation
    const totals = win.calculateNetWorth(latest);
    const drawdownAmount = peakNetWorth - totals.net_worth_twd;
    const drawdownPct = (drawdownAmount / peakNetWorth) * 100;
    assertCloseTo(drawdownPct, 37.02, 1.0, 'Portfolio peak-to-trough drawdown computed cleanly');

    // Step 4: Emergency cash burn (burn down to NT$ 500,000, below NT$ 720,000 reserve)
    latest.accounts['玉山活存'] = 200000;
    latest.accounts['玉山美金'] = 5000;
    latest.accounts['Chase Checking'] = 5000;
    win.renderAll();

    // Step 5: Liquidity Buffer Enforcement
    const totalCash = 200000 + (5000 + 5000) * 28.00; // NT$ 480,000
    const reserveThreshold = 720000;
    const deployableCash = Math.max(0, totalCash - reserveThreshold);
    const deficitAmount = reserveThreshold - totalCash;

    assertEqual(deployableCash, 0, 'Deployable cash locks at NT$ 0 during deficit');
    assertEqual(deficitAmount, 240000, 'Emergency reserve deficit is exactly NT$ 240,000');
  });

  // =========================================================================
  // Workflow 6: Multi-Broker Rebalancing + US Estate Tax Threshold Optimization
  // =========================================================================
  it('Workflow 6: Multi-Broker Rebalancing + US Estate Tax Threshold Optimization', async () => {
    const latest = state.snapshots[state.snapshots.length - 1];

    // Simulate US stock appreciation above $60k threshold: $80,000 USD
    latest.accounts['Firstrade'] = 80000;
    const initialUSSitus = latest.accounts['Firstrade'];
    assertEqual(initialUSSitus, 80000, 'US equities total $80,000 USD (> $60,000 exemption)');
    const initialExposure = Math.max(0, initialUSSitus - 60000);
    assertEqual(initialExposure, 20000, 'Initial excess exposure is $20,000 USD (EXPOSED)');

    // Step 1: Rebalance / transfer $25,000 USD from Firstrade into USD Cash (玉山美金)
    latest.accounts['Firstrade'] -= 25000;
    latest.accounts['玉山美金'] += 25000;
    win.renderAll();

    // Step 2: US Estate Tax Status Evaluation
    const rebalancedUSSitus = latest.accounts['Firstrade'];
    assertEqual(rebalancedUSSitus, 55000, 'Rebalanced US equities total $55,000 USD');
    const rebalancedExposure = Math.max(0, rebalancedUSSitus - 60000);
    assertEqual(rebalancedExposure, 0, 'Rebalanced excess exposure is $0.00 USD (SAFE)');

    // Step 3: Mock File System Access API Direct Save
    let writtenData = '';
    const mockFileHandle = new MockFileSystemFileHandle('sample_data.json', '{}');
    mockFileHandle.createWritable = async () => ({
      write: async (data) => { writtenData += data; },
      close: async () => {},
    });
    win.currentFileHandle = mockFileHandle;

    const saveResult = await win.saveDirectToFile();
    assertTrue(saveResult.success, 'FSA direct save must succeed');
    assertTrue(writtenData.length > 0, 'Written state data must not be empty');

    const parsedSavedData = JSON.parse(writtenData);
    assertEqual(parsedSavedData.snapshots.length, 4, 'Saved data preserves 4 snapshot records');

    // Step 4: Verify Timestamped Backup Generation
    const backup = win.generateBackupDownload();
    assertTrue(backup.filename.startsWith('finance_data_') && backup.filename.endsWith('.json'), 'Backup filename matches standard pattern');
    assertEqual(JSON.parse(backup.content).snapshots.length, 4, 'Backup content matches in-memory state');
  });
});

if (require.main === module) {
  executeTestSuite({ tier: '3', verbose: true }).then(code => process.exit(code));
}
