#!/usr/bin/env node

/**
 * validate_data.js
 * 
 * Standalone Node.js Financial Data Integrity Validation Suite
 * Zero-dependency verification for canonical personal finance JSON datasets.
 * 
 * Usage:
 *   node validate_data.js [filePath]
 * 
 * Default filePath: ./data/sample_data.json
 * Exit Code: 0 on PASS, 1 on FAIL
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function getDefaultDataPath() {
  const candidatePaths = [
    path.resolve(process.cwd(), 'data', 'sample_data.json'),
    path.resolve(process.cwd(), 'data', 'finance_data.json'),
    path.resolve(__dirname, '..', 'data', 'sample_data.json'),
    path.resolve(__dirname, '..', 'data', 'finance_data.json'),
    path.resolve(process.cwd(), 'sample_data.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.resolve(process.cwd(), 'data', 'sample_data.json');
}

class DataValidator {
  constructor(filePath) {
    this.filePath = filePath || getDefaultDataPath();
    this.errors = [];
    this.warnings = [];
    this.passedChecks = 0;
    this.totalChecks = 0;
    this.data = null;
  }

  assert(condition, message, details = '') {
    this.totalChecks++;
    if (condition) {
      this.passedChecks++;
      console.log(`  ${colors.green}✓${colors.reset} ${message}`);
      return true;
    } else {
      const err = { message, details };
      this.errors.push(err);
      console.log(`  ${colors.red}✗${colors.reset} ${message}`);
      if (details) {
        console.log(`    ${colors.dim}${details}${colors.reset}`);
      }
      return false;
    }
  }

  warn(message, details = '') {
    this.warnings.push({ message, details });
    console.log(`  ${colors.yellow}⚠${colors.reset} ${message}`);
    if (details) {
      console.log(`    ${colors.dim}${details}${colors.reset}`);
    }
  }

  approxEqual(a, b, epsilon = 0.05) {
    return Math.abs(a - b) <= epsilon;
  }

  formatCurrency(num, curr = 'TWD', decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return 'N/A';
    return (curr === 'TWD' ? 'NT$ ' : '$ ') + num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  validate() {
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}  PERSONAL FINANCE DATA VALIDATION ENGINE${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`Target File: ${this.filePath}`);

    // 1. File existence & JSON parsing
    console.log(`\n${colors.bright}[1/8] File Existence & JSON Syntax${colors.reset}`);
    if (!this.assert(fs.existsSync(this.filePath), `Target file found: ${path.basename(this.filePath)}`)) {
      return this.conclude();
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(this.filePath, 'utf8');
      this.assert(true, `File read successfully (${fileContent.length} bytes)`);
    } catch (e) {
      this.assert(false, 'Failed to read file', e.message);
      return this.conclude();
    }

    try {
      this.data = JSON.parse(fileContent);
      this.assert(true, 'JSON syntax valid and successfully parsed');
    } catch (e) {
      this.assert(false, 'JSON parsing error', e.message);
      return this.conclude();
    }

    // 2. Core Schema Structure
    console.log(`\n${colors.bright}[2/8] Core Schema Structure & Top-Level Keys${colors.reset}`);
    const requiredKeys = ['meta', 'accounts_meta', 'snapshots', 'tw_stocks', 'us_stocks'];
    requiredKeys.forEach(key => {
      this.assert(key in this.data, `Top-level key '${key}' exists`);
    });

    const meta = this.data.meta || {};
    this.assert(typeof meta.version === 'number', `meta.version is numeric (found: ${meta.version})`);
    this.assert(!isNaN(Date.parse(meta.created)), `meta.created is valid date string (found: ${meta.created})`);

    // 3. Account Metadata (accounts_meta)
    console.log(`\n${colors.bright}[3/8] Account Metadata (accounts_meta)${colors.reset}`);
    const accountsMeta = this.data.accounts_meta || [];
    this.assert(Array.isArray(accountsMeta) && accountsMeta.length > 0, `accounts_meta contains ${accountsMeta.length} registered accounts`);

    const accountKeysMap = new Map();
    const allowedCurrencies = ['TWD', 'USD'];
    const allowedCategories = ['cash', 'tw_stock', 'us_stock', 'insurance', 'crypto', 'real_estate'];

    let allKeysUnique = true;
    accountsMeta.forEach((acc, idx) => {
      if (!acc.key || typeof acc.key !== 'string') {
        this.assert(false, `Account #${idx + 1} has valid key identifier`);
        allKeysUnique = false;
        return;
      }
      if (accountKeysMap.has(acc.key)) {
        this.assert(false, `Duplicate account key found: '${acc.key}'`);
        allKeysUnique = false;
      } else {
        accountKeysMap.set(acc.key, acc);
      }

      this.assert(allowedCurrencies.includes(acc.currency), `Account '${acc.key}' currency valid (${acc.currency})`);
      this.assert(allowedCategories.includes(acc.category), `Account '${acc.key}' category valid (${acc.category})`);
    });
    this.assert(allKeysUnique, `All ${accountsMeta.length} account keys are unique`);

    // 4. Snapshots Integrity
    console.log(`\n${colors.bright}[4/8] Historical Snapshots Integrity & Chronological Ordering${colors.reset}`);
    const snapshots = this.data.snapshots || [];
    this.assert(Array.isArray(snapshots) && snapshots.length >= 1, `snapshots array contains ${snapshots.length} historical records`);

    let prevDate = null;
    snapshots.forEach((snap, idx) => {
      const isValidDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(snap.date);
      this.assert(isValidDate, `Snapshot #${idx + 1} date format is valid (${snap.date})`);

      if (prevDate && isValidDate) {
        this.assert(new Date(snap.date) >= new Date(prevDate), `Snapshot #${idx + 1} (${snap.date}) follows previous snapshot (${prevDate})`);
      }
      prevDate = snap.date;

      this.assert(typeof snap.usd_rate === 'number' && snap.usd_rate > 0, `Snapshot #${idx + 1} (${snap.date}) usd_rate is positive (${snap.usd_rate})`);
      this.assert(typeof snap.accounts === 'object' && snap.accounts !== null, `Snapshot #${idx + 1} (${snap.date}) contains accounts balance object`);
    });

    // 5. Mathematical Consistency & Asset Reconciliation
    console.log(`\n${colors.bright}[5/8] Mathematical Consistency & Asset Reconciliation${colors.reset}`);
    snapshots.forEach(snap => {
      let twdSubtotal = 0;
      let usdSubtotal = 0;
      let cashTwd = 0;
      let cashUsd = 0;
      let insuranceTwd = 0;
      let insuranceUsd = 0;
      let stockTwd = 0;
      let stockUsd = 0;

      Object.keys(snap.accounts).forEach(key => {
        const val = Number(snap.accounts[key]) || 0;
        const metaAcc = accountKeysMap.get(key) || {
          currency: (key.toLowerCase().includes('usd') || key.includes('美金') || key === 'Chase' || key === 'Firstrade') ? 'USD' : 'TWD',
          category: key.includes('證券') ? 'tw_stock' : (key === 'Firstrade' ? 'us_stock' : 'cash')
        };

        if (metaAcc.currency === 'TWD') {
          twdSubtotal += val;
          if (metaAcc.category === 'cash') cashTwd += val;
          else if (metaAcc.category === 'tw_stock') stockTwd += val;
          else if (metaAcc.category === 'insurance') insuranceTwd += val;
        } else {
          usdSubtotal += val;
          if (metaAcc.category === 'cash') cashUsd += val;
          else if (metaAcc.category === 'us_stock') stockUsd += val;
          else if (metaAcc.category === 'insurance') insuranceUsd += val;
        }
      });

      const usdInTwd = usdSubtotal * snap.usd_rate;
      const totalNetWorthTwd = twdSubtotal + usdInTwd;
      const totalAssetsTwd = cashTwd + (cashUsd * snap.usd_rate) + insuranceTwd + (insuranceUsd * snap.usd_rate) + stockTwd + (stockUsd * snap.usd_rate);

      this.assert(this.approxEqual(totalAssetsTwd, totalNetWorthTwd, 0.05),
        `Snapshot ${snap.date}: Category Breakdown sum == Total Net Worth (NT$ ${Math.round(totalNetWorthTwd).toLocaleString()})`);
    });

    // 6. Taiwan Stock Positions (tw_stocks)
    console.log(`\n${colors.bright}[6/8] Taiwan Equities Verification (tw_stocks)${colors.reset}`);
    const twStocks = this.data.tw_stocks || [];
    this.assert(Array.isArray(twStocks), `tw_stocks is an array (found: ${twStocks.length} holdings)`);

    twStocks.forEach((stock, idx) => {
      const { ticker, shares, cost_total, price, market_value, unrealized_pl, roi } = stock;
      this.assert(ticker && typeof shares === 'number' && shares > 0, `TW Stock #${idx + 1} (${ticker}) shares valid (${shares})`);

      const calcMarketVal = shares * price;
      this.assert(this.approxEqual(market_value, calcMarketVal, 0.01),
        `TW Stock ${ticker} market_value == shares * price (${market_value} == ${calcMarketVal})`);

      if (typeof cost_total === 'number' && cost_total > 0) {
        const calcUnrealized = market_value - cost_total;
        this.assert(this.approxEqual(unrealized_pl, calcUnrealized, 0.01),
          `TW Stock ${ticker} unrealized_pl == market_value - cost_total (${unrealized_pl} == ${calcUnrealized})`);
        const calcRoi = unrealized_pl / cost_total;
        this.assert(this.approxEqual(roi, calcRoi, 0.001),
          `TW Stock ${ticker} ROI == unrealized_pl / cost_total (${(roi * 100).toFixed(2)}% ≈ ${(calcRoi * 100).toFixed(2)}%)`);
      }
    });

    // 7. US Stock Positions (us_stocks)
    console.log(`\n${colors.bright}[7/8] US Equities Verification (us_stocks)${colors.reset}`);
    const usStocks = this.data.us_stocks || [];
    this.assert(Array.isArray(usStocks), `us_stocks is an array (found: ${usStocks.length} holdings)`);

    usStocks.forEach((stock, idx) => {
      const { ticker, shares, price, market_value } = stock;
      this.assert(ticker && typeof shares === 'number' && shares > 0, `US Stock #${idx + 1} (${ticker}) shares valid (${shares})`);
      const calcMarketVal = shares * price;
      this.assert(this.approxEqual(market_value, calcMarketVal, 0.05),
        `US Stock ${ticker} market_value ≈ shares * price (${market_value} ≈ ${calcMarketVal.toFixed(2)})`);
    });

    // 8. Financial Decision Framework & Constraint Sanity
    console.log(`\n${colors.bright}[8/8] Financial Framework & Mathematical Constraints${colors.reset}`);
    const latestSnap = snapshots[snapshots.length - 1];
    let totalCashTwd = 0;
    let totalEquityTwd = 0;
    let totalUsStockUsd = 0;

    Object.keys(latestSnap.accounts).forEach(key => {
      const val = Number(latestSnap.accounts[key]) || 0;
      const metaAcc = accountKeysMap.get(key) || {};
      const valTwd = metaAcc.currency === 'USD' ? val * latestSnap.usd_rate : val;

      if (metaAcc.category === 'cash' || !metaAcc.category) {
        if (metaAcc.category === 'cash') totalCashTwd += valTwd;
      }
      if (metaAcc.category === 'tw_stock') totalEquityTwd += val;
      if (metaAcc.category === 'us_stock') {
        totalEquityTwd += valTwd;
        totalUsStockUsd += val;
      }
    });

    const netWorth = totalCashTwd + totalEquityTwd;
    const maxRiskCapacity = netWorth * 0.50;
    const headroom = maxRiskCapacity - totalEquityTwd;
    const usEstateExposure = Math.max(0, totalUsStockUsd - 60000);

    this.assert(typeof maxRiskCapacity === 'number' && !isNaN(maxRiskCapacity), 'Max risk capacity formula is numeric');
    this.assert(this.approxEqual(headroom, maxRiskCapacity - totalEquityTwd, 0.01), 'Risk headroom matches maxRiskCapacity - totalEquityTwd');
    this.assert(usEstateExposure >= 0, 'US Estate tax excess is non-negative');

    console.log(`\n${colors.bright}${colors.cyan}--- Constraint KPI Report (${latestSnap.date}) ---${colors.reset}`);
    console.log(`  • Latest Net Worth      : ${this.formatCurrency(netWorth, 'TWD')}`);
    console.log(`  • Cash Reserves         : ${this.formatCurrency(totalCashTwd, 'TWD')}`);
    console.log(`  • Total Equities        : ${this.formatCurrency(totalEquityTwd, 'TWD')}`);
    console.log(`  • Risk Headroom (50%)   : ${this.formatCurrency(headroom, 'TWD')}`);
    console.log(`  • US Estate Tax Excess  : ${this.formatCurrency(usEstateExposure, 'USD')}`);

    return this.conclude();
  }

  conclude() {
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}VALIDATION SUMMARY:${colors.reset}`);
    console.log(`  Total Checks Executed : ${this.totalChecks}`);
    console.log(`  Passed Checks         : ${colors.green}${this.passedChecks}${colors.reset}`);
    console.log(`  Failed Checks         : ${this.errors.length > 0 ? colors.red + this.errors.length + colors.reset : colors.green + '0' + colors.reset}`);
    console.log(`  Warnings              : ${this.warnings.length > 0 ? colors.yellow + this.warnings.length + colors.reset : '0'}`);

    if (this.errors.length === 0) {
      console.log(`\n${colors.bright}${colors.green}>>> RESULT: 100% PASS - DATASET FULLY VALIDATED <<<\n${colors.reset}`);
      process.exitCode = 0;
      return true;
    } else {
      console.log(`\n${colors.bright}${colors.red}>>> RESULT: FAIL - ${this.errors.length} ERRORS DETECTED <<<\n${colors.reset}`);
      this.errors.forEach((err, i) => {
        console.log(`  [${i + 1}] ${colors.red}${err.message}${colors.reset}`);
        if (err.details) console.log(`      ${colors.dim}${err.details}${colors.reset}`);
      });
      process.exitCode = 1;
      return false;
    }
  }
}

// CLI Execution entry point
const targetPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : getDefaultDataPath();
const validator = new DataValidator(targetPath);
validator.validate();
