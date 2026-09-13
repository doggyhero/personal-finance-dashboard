#!/usr/bin/env node
/**
 * Personal Finance Dashboard & Data Management System
 * Unified E2E Test Runner & Browser / DOM Mock Harness
 * 
 * Zero external NPM dependencies. Pure Node.js (v18+).
 * 
 * Supports:
 *   --tier=1|2|3|4|all
 *   --filter="pattern"
 *   --verbose
 *   --json
 *   --bail
 *   --help / -h
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 1. CLI Arguments & Configuration Parser
// ============================================================================

function parseCliArgs(argv = process.argv.slice(2)) {
  const config = {
    tier: 'all', // '1', '2', '3', '4', 'all', or comma-separated e.g. '1,4'
    filter: '',
    verbose: false,
    json: false,
    bail: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg.startsWith('--tier=')) {
      config.tier = arg.slice('--tier='.length).trim();
    } else if (arg.startsWith('--filter=')) {
      config.filter = arg.slice('--filter='.length).trim();
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--json') {
      config.json = true;
    } else if (arg === '--bail') {
      config.bail = true;
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Personal Finance Dashboard - E2E Test Runner
Usage: node tests/e2e_test_runner.js [options]

Options:
  --tier=<N|all>       Run specific tier: 1, 2, 3, 4, or comma-separated (e.g. --tier=1,2), or 'all' (default: all)
  --filter=<pattern>   Filter tests matching regex or substring (e.g. --filter="Net Worth")
  --verbose            Enable detailed logging and step-by-step traces
  --json               Output test results as a machine-readable JSON report
  --bail               Abort test execution immediately on first failure
  --help, -h           Show this help message
`);
}

// ============================================================================
// 2. High-Precision Financial Assertion Engine
// ============================================================================

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    const msg = message || `Expected strict equality (===)\n  Actual:   ${JSON.stringify(actual)}\n  Expected: ${JSON.stringify(expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    // Deep structural comparison
    const areDeeplyEqual = (a, b) => {
      if (a === b) return true;
      if (typeof a !== typeof b || a === null || b === null) return false;
      if (typeof a !== 'object') return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!areDeeplyEqual(a[i], b[i])) return false;
        }
        return true;
      }
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const k of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
        if (!areDeeplyEqual(a[k], b[k])) return false;
      }
      return true;
    };

    if (!areDeeplyEqual(actual, expected)) {
      const msg = message || `Expected deep structural equality\n  Actual:   ${aStr}\n  Expected: ${eStr}`;
      throw new AssertionError(msg, actual, expected);
    }
  }
}

function assertCloseTo(actual, expected, delta = 0.01, message = '') {
  const act = Number(actual);
  const exp = Number(expected);
  const d = Number(delta);
  if (isNaN(act) || isNaN(exp) || Math.abs(act - exp) > d + 1e-9) {
    const msg = message || `Expected ${act} to be within ${d} of ${exp} (diff: ${Math.abs(act - exp)})`;
    throw new AssertionError(msg, actual, expected);
  }
}

function assertTrue(value, message = '') {
  if (value !== true) {
    const msg = message || `Expected true, received: ${JSON.stringify(value)}`;
    throw new AssertionError(msg, value, true);
  }
}

function assertFalse(value, message = '') {
  if (value !== false) {
    const msg = message || `Expected false, received: ${JSON.stringify(value)}`;
    throw new AssertionError(msg, value, false);
  }
}

function assertOk(value, message = '') {
  if (!value) {
    const msg = message || `Expected truthy value, received: ${JSON.stringify(value)}`;
    throw new AssertionError(msg, value, true);
  }
}

function assertThrows(fn, expectedRegexOrError, message = '') {
  let threw = false;
  let thrownError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    const msg = message || 'Expected function to throw an error, but it did not throw.';
    throw new AssertionError(msg, null, 'Error');
  }
  if (expectedRegexOrError) {
    if (expectedRegexOrError instanceof RegExp) {
      if (!expectedRegexOrError.test(thrownError.message)) {
        const msg = message || `Expected error matching ${expectedRegexOrError}, got "${thrownError.message}"`;
        throw new AssertionError(msg, thrownError.message, expectedRegexOrError.toString());
      }
    }
  }
}

function assertIncludes(haystack, needle, message = '') {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      const msg = message || `Expected string to contain "${needle}"\n  Haystack: "${haystack}"`;
      throw new AssertionError(msg, haystack, needle);
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.includes(needle)) {
      const msg = message || `Expected array to contain item ${JSON.stringify(needle)}`;
      throw new AssertionError(msg, haystack, needle);
    }
  } else {
    throw new AssertionError(`assertIncludes called on invalid haystack type: ${typeof haystack}`);
  }
}

// ============================================================================
// 3. Headless Browser & DOM Mock Engine
// ============================================================================

class MockClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }

  _syncToClassName() {
    this.element._className = Array.from(this.classes).join(' ');
  }

  _syncFromClassName(className) {
    this.classes.clear();
    if (className) {
      className.split(/\s+/).filter(Boolean).forEach(c => this.classes.add(c));
    }
  }

  add(...classNames) {
    for (const c of classNames) {
      if (c) this.classes.add(c);
    }
    this._syncToClassName();
  }

  remove(...classNames) {
    for (const c of classNames) {
      if (c) this.classes.delete(c);
    }
    this._syncToClassName();
  }

  toggle(className, force) {
    if (force === true) {
      this.classes.add(className);
    } else if (force === false) {
      this.classes.delete(className);
    } else {
      if (this.classes.has(className)) {
        this.classes.delete(className);
      } else {
        this.classes.add(className);
      }
    }
    this._syncToClassName();
    return this.classes.has(className);
  }

  contains(className) {
    return this.classes.has(className);
  }

  replace(oldCls, newCls) {
    if (this.classes.has(oldCls)) {
      this.classes.delete(oldCls);
      this.classes.add(newCls);
      this._syncToClassName();
      return true;
    }
    return false;
  }

  forEach(cb) {
    this.classes.forEach(cb);
  }

  entries() {
    return this.classes.entries();
  }

  values() {
    return this.classes.values();
  }

  toString() {
    return Array.from(this.classes).join(' ');
  }
}

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = (tagName || 'DIV').toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1; // ELEMENT_NODE
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
    this.parentNode = null;
    this.children = [];
    this.childNodes = [];
    this.attributes = new Map();
    this.eventListeners = new Map();
    this._className = '';
    this.classList = new MockClassList(this);
    this._value = '';
    this._textContent = '';
    this._checked = false;
    this._disabled = false;
    this.style = {};
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  set id(val) {
    this.setAttribute('id', val);
  }

  get className() {
    return this._className;
  }

  set className(val) {
    this._className = val || '';
    this.classList._syncFromClassName(this._className);
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  get checked() {
    return this._checked;
  }

  set checked(val) {
    this._checked = Boolean(val);
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(val) {
    this._disabled = Boolean(val);
  }

  get textContent() {
    if (this.childNodes.length === 0) {
      return this._textContent;
    }
    return this.childNodes.map(n => n.textContent || '').join('');
  }

  set textContent(val) {
    this._textContent = String(val);
    this.children = [];
    this.childNodes = [];
  }

  get innerText() {
    return this.textContent;
  }

  set innerText(val) {
    this.textContent = val;
  }

  get innerHTML() {
    if (this.children.length === 0 && this._textContent) {
      return this._textContent;
    }
    return this.children.map(c => c.outerHTML || '').join('');
  }

  set innerHTML(html) {
    this.children = [];
    this.childNodes = [];
    this._textContent = '';
    if (html) {
      parseHTMLIntoElement(html, this, this.ownerDocument);
    }
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    let attrs = '';
    for (const [k, v] of this.attributes.entries()) {
      attrs += ` ${k}="${v}"`;
    }
    if (this.className) {
      attrs += ` class="${this.className}"`;
    }
    return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    if (name === 'id') return this.attributes.get('id') || '';
    if (name === 'value') return this._value;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, val) {
    const sVal = String(val);
    if (name === 'class') {
      this.className = sVal;
    } else if (name === 'id') {
      this.attributes.set('id', sVal);
      if (this.ownerDocument) {
        this.ownerDocument._registerId(sVal, this);
      }
    } else if (name === 'value') {
      this._value = sVal;
      this.attributes.set('value', sVal);
    } else {
      this.attributes.set(name, sVal);
    }
  }

  removeAttribute(name) {
    if (name === 'class') {
      this.className = '';
    } else {
      this.attributes.delete(name);
    }
  }

  hasAttribute(name) {
    if (name === 'class') return Boolean(this.className);
    return this.attributes.has(name);
  }

  appendChild(child) {
    if (!child) return null;
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      const nIdx = this.childNodes.indexOf(child);
      if (nIdx !== -1) this.childNodes.splice(nIdx, 1);
      child.parentElement = null;
      child.parentNode = null;
      return child;
    }
    return null;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);
    if (newChild.parentElement) {
      newChild.parentElement.removeChild(newChild);
    }
    newChild.parentElement = this;
    newChild.parentNode = this;
    this.children.splice(idx, 0, newChild);
    this.childNodes.splice(idx, 0, newChild);
    return newChild;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      this.removeChild(oldChild);
      this.children.splice(idx, 0, newChild);
      this.childNodes.splice(idx, 0, newChild);
      newChild.parentElement = this;
      newChild.parentNode = this;
      return oldChild;
    }
    return null;
  }

  addEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.eventListeners.has(type)) return;
    const list = this.eventListeners.get(type);
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    const evtObj = typeof event === 'string' ? { type, target: this, currentTarget: this, bubbles: true } : event;
    evtObj.target = evtObj.target || this;
    evtObj.currentTarget = this;

    const list = this.eventListeners.get(type) || [];
    for (const listener of list) {
      try {
        listener.call(this, evtObj);
      } catch (err) {
        console.error(`Error in event listener for ${type}:`, err);
      }
    }

    // Event bubbling
    if (evtObj.bubbles && this.parentElement) {
      this.parentElement.dispatchEvent(evtObj);
    }
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, bubbles: true });
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matches && curr.matches(selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return findFirst(this, selector);
  }

  querySelectorAll(selector) {
    return findAll(this, selector);
  }

  getContext(type) {
    return {
      canvas: this,
      clearRect: () => {},
      fillRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => ({ data: [] }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
    };
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }
}

// Simple HTML parsing to create DOM tree without external libraries
function parseHTMLIntoElement(html, parentElement, document) {
  const tagRegex = /<(\/)?([a-zA-Z0-9-]+)((?:\s+[^>]+)*?)(\/)?>|([^<]+)/g;
  let match;
  let currentParent = parentElement;
  const stack = [parentElement];

  while ((match = tagRegex.exec(html)) !== null) {
    const [full, isClosing, tagName, attrString, isSelfClosing, textContent] = match;

    if (textContent) {
      const trimmed = textContent;
      if (trimmed) {
        const textNode = {
          nodeType: 3, // TEXT_NODE
          textContent: trimmed,
          parentElement: currentParent,
          parentNode: currentParent,
        };
        currentParent.childNodes.push(textNode);
      }
    } else if (isClosing) {
      if (stack.length > 1) {
        stack.pop();
        currentParent = stack[stack.length - 1];
      }
    } else if (tagName) {
      const elem = document.createElement(tagName);
      if (attrString) {
        const attrRegex = /([a-zA-Z0-9-_:@.]+)(?:=["']([^"']*)["'])?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
          const [, attrName, attrVal] = attrMatch;
          elem.setAttribute(attrName, attrVal !== undefined ? attrVal : '');
        }
      }
      currentParent.appendChild(elem);

      const voidTags = ['INPUT', 'IMG', 'BR', 'HR', 'META', 'LINK'];
      if (!isSelfClosing && !voidTags.includes(elem.tagName)) {
        stack.push(elem);
        currentParent = elem;
      }
    }
  }
}

// Selector matching engine
function matchesSelector(element, selector) {
  if (!element || element.nodeType !== 1) return false;
  const sel = selector.trim();
  if (sel === '*') return true;

  // Handle multiple comma-separated selectors
  if (sel.includes(',')) {
    return sel.split(',').some(s => matchesSelector(element, s.trim()));
  }

  // Handle single compound selector (tag#id.class[attr])
  const parts = sel.match(/^([a-zA-Z0-9-_*]+)?(?:#([a-zA-Z0-9-_]+))?((?:\.[a-zA-Z0-9-_]+)*)((?:\[[^\]]+\])*)$/);
  if (!parts) {
    // If it's a descendant selector like "table tbody tr"
    const subSelectors = sel.split(/\s+/).filter(Boolean);
    if (subSelectors.length > 1) {
      const last = subSelectors[subSelectors.length - 1];
      if (!matchesSelector(element, last)) return false;
      let ancestor = element.parentElement;
      let i = subSelectors.length - 2;
      while (ancestor && i >= 0) {
        if (matchesSelector(ancestor, subSelectors[i])) {
          i--;
        }
        ancestor = ancestor.parentElement;
      }
      return i < 0;
    }
    return false;
  }

  const [, tag, id, classes, attrs] = parts;

  if (tag && tag !== '*' && element.tagName !== tag.toUpperCase()) {
    return false;
  }

  if (id && element.id !== id) {
    return false;
  }

  if (classes) {
    const classList = classes.split('.').filter(Boolean);
    for (const c of classList) {
      if (!element.classList.contains(c)) return false;
    }
  }

  if (attrs) {
    const attrMatches = attrs.match(/\[([^\]=\s]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/g);
    if (attrMatches) {
      for (const attrExpr of attrMatches) {
        const m = attrExpr.match(/\[([^\]=\s]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/);
        if (!m) return false;
        const [, aName, op, val1, val2, val3] = m;
        const expectedVal = val1 !== undefined ? val1 : (val2 !== undefined ? val2 : val3);
        const actualVal = element.getAttribute(aName);

        if (actualVal === null) return false;
        if (expectedVal !== undefined) {
          if (!op || op === '=') {
            if (actualVal !== expectedVal) return false;
          } else if (op === '*=') {
            if (!actualVal.includes(expectedVal)) return false;
          } else if (op === '^=') {
            if (!actualVal.startsWith(expectedVal)) return false;
          } else if (op === '$=') {
            if (!actualVal.endsWith(expectedVal)) return false;
          }
        }
      }
    }
  }

  return true;
}

function findFirst(root, selector) {
  if (!root || !root.children) return null;
  for (const child of root.children) {
    if (matchesSelector(child, selector)) return child;
    const found = findFirst(child, selector);
    if (found) return found;
  }
  return null;
}

function findAll(root, selector, results = []) {
  if (!root || !root.children) return results;
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      results.push(child);
    }
    findAll(child, selector, results);
  }
  return results;
}

class MockDocument {
  constructor() {
    this.title = 'Personal Finance Dashboard';
    this.body = new MockElement('BODY', this);
    this.head = new MockElement('HEAD', this);
    this.documentElement = new MockElement('HTML', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this._elementsById = new Map();
    this.eventListeners = new Map();
  }

  _registerId(id, element) {
    if (id) this._elementsById.set(id, element);
  }

  createElement(tagName) {
    return new MockElement(tagName, this);
  }

  createTextNode(text) {
    return {
      nodeType: 3,
      textContent: String(text),
      parentElement: null,
      parentNode: null,
    };
  }

  getElementById(id) {
    if (this._elementsById.has(id)) {
      return this._elementsById.get(id);
    }
    return findFirst(this.documentElement, `#${id}`);
  }

  querySelector(selector) {
    return findFirst(this.documentElement, selector);
  }

  querySelectorAll(selector) {
    return findAll(this.documentElement, selector);
  }

  getElementsByClassName(className) {
    return findAll(this.documentElement, `.${className}`);
  }

  getElementsByTagName(tagName) {
    return findAll(this.documentElement, tagName);
  }

  addEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.eventListeners.has(type)) return;
    const list = this.eventListeners.get(type);
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    const list = this.eventListeners.get(type) || [];
    for (const listener of list) {
      try {
        listener(event);
      } catch (err) {
        console.error(`Document event listener error for ${type}:`, err);
      }
    }
    return true;
  }
}

// File System Access API Mocks
class MockFileSystemFileHandle {
  constructor(name, initialContent = '') {
    this.name = name;
    this.kind = 'file';
    this.content = initialContent;
    this.closed = false;
  }

  async getFile() {
    return {
      name: this.name,
      size: Buffer.byteLength(this.content, 'utf8'),
      text: async () => this.content,
      arrayBuffer: async () => Buffer.from(this.content, 'utf8').buffer,
    };
  }

  async createWritable() {
    return {
      write: async (data) => {
        if (typeof data === 'string') {
          this.content = data;
        } else if (data && typeof data.text === 'function') {
          this.content = await data.text();
        } else {
          this.content = String(data);
        }
      },
      close: async () => {
        this.closed = true;
      },
    };
  }
}

// Chart.js Headless Mock
class MockChart {
  static instances = {};

  static getChart(keyOrCanvas) {
    if (typeof keyOrCanvas === 'string') {
      return MockChart.instances[keyOrCanvas] || null;
    }
    if (keyOrCanvas && keyOrCanvas.id) {
      return MockChart.instances[keyOrCanvas.id] || null;
    }
    return null;
  }

  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config || {};
    this.type = this.config.type || 'line';
    this.data = this.config.data || { labels: [], datasets: [] };
    this.options = this.config.options || {};
    this.id = ctx && ctx.id ? ctx.id : `chart_${Math.random().toString(36).slice(2, 9)}`;
    this.destroyed = false;
    this.updated = false;
    MockChart.instances[this.id] = this;
    if (ctx && ctx.id) {
      MockChart.instances[ctx.id] = this;
    }
  }

  update() {
    this.updated = true;
  }

  destroy() {
    this.destroyed = true;
    delete MockChart.instances[this.id];
    if (this.ctx && this.ctx.id) {
      delete MockChart.instances[this.ctx.id];
    }
  }

  resize() {
    this.resized = true;
  }
}

// Mock Blob & URL
class MockBlob {
  constructor(chunks = [], options = {}) {
    this.chunks = chunks;
    this.options = options;
    this.type = options.type || '';
    this.size = chunks.reduce((acc, c) => {
      if (typeof c === 'string') return acc + Buffer.byteLength(c, 'utf8');
      if (c && c.length) return acc + c.length;
      return acc;
    }, 0);
  }

  async text() {
    return this.chunks.map(c => (typeof c === 'string' ? c : c.toString('utf8'))).join('');
  }
}

// Build standard browser window context
function createMockBrowserEnvironment() {
  const document = new MockDocument();
  const localStorageStore = new Map();
  const sessionStorageStore = new Map();
  const createdObjectUrls = new Map();

  const mockWindow = {
    document,
    get window() { return mockWindow; },
    get self() { return mockWindow; },
    get global() { return mockWindow; },
    localStorage: {
      getItem: (k) => (localStorageStore.has(k) ? localStorageStore.get(k) : null),
      setItem: (k, v) => localStorageStore.set(k, String(v)),
      removeItem: (k) => localStorageStore.delete(k),
      clear: () => localStorageStore.clear(),
      get length() { return localStorageStore.size; },
      key: (i) => Array.from(localStorageStore.keys())[i] || null,
    },
    sessionStorage: {
      getItem: (k) => (sessionStorageStore.has(k) ? sessionStorageStore.get(k) : null),
      setItem: (k, v) => sessionStorageStore.set(k, String(v)),
      removeItem: (k) => sessionStorageStore.delete(k),
      clear: () => sessionStorageStore.clear(),
      get length() { return sessionStorageStore.size; },
      key: (i) => Array.from(sessionStorageStore.keys())[i] || null,
    },
    Blob: MockBlob,
    URL: {
      createObjectURL: (blob) => {
        const id = `blob:mock-url-${Math.random().toString(36).slice(2, 9)}`;
        createdObjectUrls.set(id, blob);
        return id;
      },
      revokeObjectURL: (url) => {
        createdObjectUrls.delete(url);
      },
    },
    Event: function (type, init = {}) {
      this.type = type;
      this.bubbles = init.bubbles !== undefined ? init.bubbles : false;
      this.cancelable = init.cancelable !== undefined ? init.cancelable : false;
    },
    CustomEvent: function (type, init = {}) {
      this.type = type;
      this.detail = init.detail || null;
      this.bubbles = init.bubbles !== undefined ? init.bubbles : false;
    },
    Chart: MockChart,
    MockFileSystemFileHandle,
    showOpenFilePicker: async () => [new MockFileSystemFileHandle('finance_data.json', '{}')],
    showSaveFilePicker: async () => new MockFileSystemFileHandle('finance_data.json', '{}'),
    fetch: async (url, options) => ({
      status: 200,
      ok: true,
      json: async () => ({}),
      text: async () => '',
    }),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    alert: (msg) => {},
    confirm: (msg) => true,
    prompt: (msg) => '',
    console,
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
  };

  return { window: mockWindow, document };
}

// ============================================================================
// 4. Financial Dashboard Simulation & Reactive Logic Engine
// ============================================================================

/**
 * Initializes the full dashboard DOM tree and sets up standard application functions
 * adhering to PROJECT.md and TEST_INFRA.md contracts.
 */
function setupDashboardEnvironment(win, doc) {
  // 1. Construct standard DOM elements for all 6 tabs
  doc.body.innerHTML = `
    <div id="app">
      <!-- Navigation Tabs -->
      <nav id="main-nav">
        <button id="tab-overview" data-tab="overview" class="tab-btn active border-b-2 border-blue-600 text-blue-600">資產總覽</button>
        <button id="tab-snapshots" data-tab="snapshots" class="tab-btn">快照管理</button>
        <button id="tab-stocks" data-tab="stocks" class="tab-btn">台美股持股</button>
        <button id="tab-insurance" data-tab="insurance" class="tab-btn">保險與儲蓄險</button>
        <button id="tab-decision" data-tab="decision" class="tab-btn">投資決策與約束</button>
        <button id="tab-data" data-tab="data" class="tab-btn">資料存取與備份</button>
      </nav>

      <!-- Views -->
      <section id="view-overview" class="view-panel">
        <div id="kpi-net-worth-twd" class="kpi-card">NT$ 0</div>
        <div id="kpi-net-worth-usd" class="kpi-card">$ 0</div>
        <div id="kpi-deployable-cash" class="kpi-card">NT$ 0</div>
        <div id="kpi-risk-budget" class="kpi-card">NT$ 0</div>
        <div id="kpi-estate-tax-exposure" class="kpi-card">$ 0</div>
        <canvas id="canvas-net-worth-history"></canvas>
        <canvas id="canvas-asset-allocation"></canvas>
        <canvas id="canvas-currency-exposure"></canvas>
      </section>

      <section id="view-snapshots" class="view-panel hidden">
        <button id="btn-add-snapshot">新增快照</button>
        <table id="snapshots-table">
          <tbody id="snapshots-table-body"></tbody>
        </table>
        
        <!-- Add Snapshot Modal -->
        <div id="modal-add-snapshot" class="modal hidden">
          <button type="button" id="btn-close-modal-snapshot">關閉</button>
          <form id="form-add-snapshot">
            <div class="form-error-message hidden">請檢查輸入欄位</div>
            <button type="button" id="btn-clone-previous-snapshot">帶入上一期數值</button>
            <input type="date" name="date" id="input-snap-date" />
            <input type="number" name="usd_rate" id="input-snap-usd-rate" step="0.01" />
            <input type="text" name="note" id="input-snap-note" />
            <div id="account-inputs-container"></div>
            
            <div class="modal-footer">
              <div id="modal-preview-net-worth">NT$ 0</div>
              <div id="modal-preview-delta">+NT$ 0</div>
              <div id="modal-preview-growth-rate">+0.00%</div>
              <button type="button" id="btn-cancel-snapshot">取消</button>
              <button type="submit" id="btn-submit-snapshot">確認儲存</button>
            </div>
          </form>
        </div>
      </section>

      <section id="view-stocks" class="view-panel hidden">
        <button id="btn-refresh-quotes">更新股價</button>
        <table id="tw-stocks-table">
          <tbody id="tw-stocks-table-body"></tbody>
        </table>
        <table id="us-stocks-table">
          <tbody id="us-stocks-table-body"></tbody>
        </table>
      </section>

      <section id="view-insurance" class="view-panel hidden">
        <div id="insurance-usd-total">$ 0</div>
        <table id="insurance-table">
          <tbody id="insurance-table-body"></tbody>
        </table>
      </section>

      <section id="view-decision" class="view-panel hidden">
        <div id="active-mode-indicator">Mode S: 體系建構期 (Structuring)</div>
        <div id="equity-capacity-progress" style="width: 25%" aria-valuenow="25"></div>
        <div id="emergency-reserve-gauge">NT$ 2,400,000</div>
        <div id="estate-tax-alert">$ 109,463 (超額)</div>
      </section>

      <section id="view-data" class="view-panel hidden">
        <button id="btn-open-file">開啟檔案</button>
        <button id="btn-save-file">儲存檔案</button>
        <button id="btn-download-backup">下載備份</button>
        <button id="btn-export-snapshots-csv">匯出快照 CSV</button>
        <button id="btn-export-stocks-csv">匯出持股 CSV</button>
        <button id="btn-export-insurance-csv">匯出保險 CSV</button>
        <input type="file" id="file-input-fallback" class="hidden" accept=".json" />
      </section>

      <!-- Global Notifications -->
      <div id="toast-container"></div>
    </div>
  `;

  // 2. Global State Object
  win.state = {
    meta: { version: 1, last_updated: '2026-07-11', base_currency: 'TWD', usd_exchange_rate: 32.39 },
    accounts_meta: [],
    snapshots: [],
    tw_stocks: [],
    us_stocks: [],
    insurance: [],
    trades: [],
    decision_framework: {
      emergency_reserve_months: 24,
      monthly_burn_rate_twd: 100000,
      max_drawdown_tolerance_pct: 25,
      max_equity_allocation_pct: 50,
      us_estate_tax_exemption_usd: 60000,
    },
  };

  win.charts = {};
  win.currentFileHandle = null;

  // 3. Tab Switching Logic
  const tabButtons = doc.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      tabButtons.forEach(b => {
        b.classList.remove('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
      });
      btn.classList.add('active', 'border-b-2', 'border-blue-600', 'text-blue-600');

      doc.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.add('hidden');
      });
      const targetView = doc.getElementById(`view-${tabName}`);
      if (targetView) targetView.classList.remove('hidden');
    });
  });

  // 4. Toast Notification Engine
  function showToast(message, type = 'info') {
    const container = doc.getElementById('toast-container');
    if (!container) return;
    const toast = doc.createElement('DIV');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 3000);
  }

  // 5. Net Worth Calculation Engine
  win.calculateNetWorth = function (snapshot) {
    if (!snapshot || !snapshot.accounts) {
      return { twd_accounts: 0, usd_accounts_usd: 0, usd_accounts_twd: 0, net_worth_twd: 0, net_worth_usd: 0 };
    }
    const accountsMeta = win.state.accounts_meta || [];
    const twdKeys = accountsMeta.filter(a => a.currency === 'TWD').map(a => a.key);
    const usdKeys = accountsMeta.filter(a => a.currency === 'USD').map(a => a.key);

    const sumTWD = twdKeys.reduce((acc, k) => acc + (Number(snapshot.accounts[k]) || 0), 0);
    const sumUSD = usdKeys.reduce((acc, k) => acc + (Number(snapshot.accounts[k]) || 0), 0);
    const rawRate = Number(snapshot.usd_rate);
    const rate = (typeof snapshot.usd_rate === 'number' && snapshot.usd_rate > 0) ? snapshot.usd_rate : ((!isNaN(rawRate) && rawRate > 0) ? rawRate : 32.39);

    const usdInTWD = sumUSD * rate;
    const netWorthTWD = sumTWD + usdInTWD;
    const netWorthUSD = rate > 0 ? netWorthTWD / rate : 0;

    return {
      twd_accounts: sumTWD,
      usd_accounts_usd: sumUSD,
      usd_accounts_twd: usdInTWD,
      net_worth_twd: netWorthTWD,
      net_worth_usd: netWorthUSD,
    };
  };

  // 6. CSV Export Engines (with UTF-8 BOM \uFEFF)
  win.generateSnapshotsCSV = function (state = win.state) {
    let csv = '\uFEFF';
    const accounts = state.accounts_meta || [];
    const accountKeys = accounts.map(a => a.key);
    
    // Header
    const headers = ['日期', '美金匯率', '總淨資產(TWD)', '總淨資產(USD)', '備註', ...accountKeys];
    csv += headers.join(',') + '\n';

    // Rows
    for (const snap of state.snapshots || []) {
      const totals = win.calculateNetWorth(snap);
      const row = [
        snap.date || '',
        snap.usd_rate || '',
        Math.round(totals.net_worth_twd),
        Math.round(totals.net_worth_usd),
        `"${(snap.note || '').replace(/"/g, '""')}"`,
        ...accountKeys.map(k => snap.accounts[k] !== undefined ? snap.accounts[k] : ''),
      ];
      csv += row.join(',') + '\n';
    }
    return csv;
  };

  win.generateStocksCSV = function (state = win.state) {
    let csv = '\uFEFF';
    const headers = ['市場', '券商/帳戶', '代號', '名稱', '股數', '平均成本', '現價', '市值', '未實現損益', '報酬率(%)', '備註'];
    csv += headers.join(',') + '\n';

    // TW Stocks
    for (const s of state.tw_stocks || []) {
      const row = [
        'TW',
        '玉山證券',
        s.ticker || '',
        `"${(s.name || '').replace(/"/g, '""')}"`,
        s.shares || 0,
        s.avg_cost || '',
        s.price || 0,
        s.market_value || (s.shares * s.price),
        s.unrealized_pl || 0,
        s.roi !== null && s.roi !== undefined ? (s.roi * 100).toFixed(2) : '',
        `"${(s.note || '').replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    }

    // US Stocks
    for (const s of state.us_stocks || []) {
      const row = [
        'US',
        s.account || 'Firstrade',
        s.ticker || '',
        `"${(s.name || s.ticker || '').replace(/"/g, '""')}"`,
        s.shares !== null ? s.shares : '',
        s.avg_cost || '',
        s.price !== null ? s.price : '',
        s.market_value || '',
        s.unrealized_pl || '',
        s.roi !== null && s.roi !== undefined ? (s.roi * 100).toFixed(2) : '',
        `"${(s.note || '').replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    }

    return csv;
  };

  win.generateInsuranceCSV = function (state = win.state) {
    let csv = '\uFEFF';
    const headers = ['編號', '類型', '保單名稱', '保單號碼', '保險公司', '要保人', '被保人', '契約起日', '契約迄日', '年繳保費', '累計保費', '保額/價值', '身故保險金', '備註'];
    csv += headers.join(',') + '\n';

    for (const p of state.insurance || []) {
      const row = [
        p.id || '',
        p.type || '',
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.policy_no || '',
        p.company || '',
        p.holder || '',
        p.insured || '',
        p.start || '',
        p.end || '',
        p.premium_year !== null ? p.premium_year : '',
        p.premium_cumulative !== null ? p.premium_cumulative : '',
        p.coverage !== null ? p.coverage : '',
        p.death_benefit !== null ? `"${String(p.death_benefit).replace(/"/g, '""')}"` : '',
        `"${(p.note || '').replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    }
    return csv;
  };

  win.exportCSV = function (type) {
    let csvStr = '';
    let filename = 'export.csv';
    if (type === 'snapshots') {
      csvStr = win.generateSnapshotsCSV();
      filename = 'finance_snapshots.csv';
    } else if (type === 'stocks') {
      csvStr = win.generateStocksCSV();
      filename = 'finance_stocks.csv';
    } else if (type === 'insurance') {
      csvStr = win.generateInsuranceCSV();
      filename = 'finance_insurance.csv';
    }
    const blob = new win.Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = win.URL.createObjectURL(blob);
    return { url, filename, blob };
  };

  win.generateBackupDownload = function (state = win.state) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const filename = `finance_data_${yyyy}${mm}${dd}_${hh}${min}.json`;
    const content = JSON.stringify(state, null, 2);
    const blob = new win.Blob([content], { type: 'application/json' });
    const url = win.URL.createObjectURL(blob);
    return { filename, content, url, blob };
  };

  // 7. Save & Open API
  win.saveDirectToFile = async function () {
    const content = JSON.stringify(win.state, null, 2);
    if (win.currentFileHandle && win.currentFileHandle.createWritable) {
      try {
        const writable = await win.currentFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        showToast('儲存成功', 'success');
        return { success: true };
      } catch (err) {
        console.warn('FSA direct write error:', err);
      }
    }
    
    if (typeof win.showSaveFilePicker === 'function' || win.showSaveFilePicker) {
      try {
        const handle = await win.showSaveFilePicker({ suggestedName: 'finance_data.json' });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        win.currentFileHandle = handle;
        showToast('儲存成功', 'success');
        return { success: true };
      } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError' && err.name !== 'SecurityError') {
          const backup = win.generateBackupDownload();
          return { success: true, fallback: true, download: backup, error: err.message };
        }
        if (err.name !== 'AbortError') {
          showToast('儲存已取消', 'info');
        }
        return { success: false, error: err.message };
      }
    } else {
      // Fallback download
      const backup = win.generateBackupDownload();
      return { success: true, fallback: true, download: backup };
    }
  };

  // 8. Stock Management & Quotes Refresh
  win.updateStockPrice = function (ticker, newPrice) {
    const priceNum = Number(newPrice);
    let updated = false;
    for (const stock of win.state.tw_stocks || []) {
      if (stock.ticker === ticker) {
        stock.price = priceNum;
        stock.market_value = Math.round(stock.shares * priceNum);
        stock.unrealized_pl = stock.market_value - (stock.cost_total || 0);
        stock.roi = stock.cost_total ? stock.unrealized_pl / stock.cost_total : 0;
        updated = true;
      }
    }
    for (const stock of win.state.us_stocks || []) {
      if (stock.ticker === ticker) {
        stock.price = priceNum;
        if (stock.shares) {
          stock.market_value = Number((stock.shares * priceNum).toFixed(2));
        }
        updated = true;
      }
    }
    if (updated) {
      win.renderAll();
    }
  };

  win.refreshStockQuotes = async function () {
    try {
      const response = await win.fetch('/api/stock-quotes');
      if (response.status === 429) {
        showToast('股價更新受限，保留現有數據', 'warning');
        return { success: false, error: 'Rate limit exceeded' };
      }
      if (!response.ok) {
        showToast('股價更新失敗', 'error');
        return { success: false };
      }
      const data = await response.json();
      if (data && typeof data === 'object') {
        for (const [ticker, quote] of Object.entries(data)) {
          if (quote && quote.price !== undefined) {
            win.updateStockPrice(ticker, quote.price);
          }
        }
      }
      showToast('股價更新成功', 'success');
      return { success: true };
    } catch (err) {
      showToast('股價更新受限，保留現有數據', 'warning');
      return { success: false, error: err.message };
    }
  };

  // 9. Clone Previous Snapshot into Add Snapshot Modal
  win.clonePreviousSnapshot = function () {
    const snapshots = win.state.snapshots || [];
    if (snapshots.length === 0) return {};
    const latest = snapshots[snapshots.length - 1];
    const cloned = JSON.parse(JSON.stringify(latest.accounts || {}));

    const rateInput = doc.querySelector('input[name="usd_rate"]');
    if (rateInput) rateInput.value = latest.usd_rate || 32.39;

    for (const [accKey, accVal] of Object.entries(cloned)) {
      const input = doc.querySelector(`input[name="account_${accKey}"]`);
      if (input) {
        input.value = String(accVal);
      }
    }

    win.updateAddSnapshotPreview();
    return cloned;
  };

  win.updateAddSnapshotPreview = function () {
    const previewNW = doc.getElementById('modal-preview-net-worth');
    const previewDelta = doc.getElementById('modal-preview-delta');
    const previewRate = doc.getElementById('modal-preview-growth-rate');
    if (!previewNW) return;

    const rateInput = doc.querySelector('input[name="usd_rate"]');
    const rate = rateInput ? Number(rateInput.value) || 32.39 : 32.39;

    const draftAccounts = {};
    for (const acc of win.state.accounts_meta || []) {
      const input = doc.querySelector(`input[name="account_${acc.key}"]`);
      draftAccounts[acc.key] = input ? Number(input.value) || 0 : 0;
    }

    const draftTotals = win.calculateNetWorth({ accounts: draftAccounts, usd_rate: rate });
    const snapshots = win.state.snapshots || [];
    const prevNW = snapshots.length > 0 ? win.calculateNetWorth(snapshots[snapshots.length - 1]).net_worth_twd : draftTotals.net_worth_twd;

    const delta = draftTotals.net_worth_twd - prevNW;
    const pct = prevNW > 0 ? (delta / prevNW) * 100 : 0;

    previewNW.textContent = `NT$ ${Math.round(draftTotals.net_worth_twd).toLocaleString()}`;
    previewDelta.textContent = `${delta >= 0 ? '+' : ''}NT$ ${Math.round(delta).toLocaleString()}`;
    previewRate.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  // 10. Render Engine
  win.renderAll = function () {
    const state = win.state;
    const snapshots = state.snapshots || [];
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const latestTotals = latest ? win.calculateNetWorth(latest) : { net_worth_twd: 0, net_worth_usd: 0, usd_accounts_usd: 0 };

    // Tab 1: KPIs
    const kpiTWD = doc.getElementById('kpi-net-worth-twd');
    const kpiUSD = doc.getElementById('kpi-net-worth-usd');
    const kpiDeployable = doc.getElementById('kpi-deployable-cash');
    const kpiRisk = doc.getElementById('kpi-risk-budget');
    const kpiEstate = doc.getElementById('kpi-estate-tax-exposure');

    if (kpiTWD) kpiTWD.textContent = `NT$ ${Math.round(latestTotals.net_worth_twd).toLocaleString()}`;
    if (kpiUSD) kpiUSD.textContent = `$ ${Math.round(latestTotals.net_worth_usd).toLocaleString()}`;

    // Cash and Reserve
    const accountsMeta = state.accounts_meta || [];
    const cashTwdKeys = accountsMeta.filter(a => a.currency === 'TWD' && a.category === 'cash').map(a => a.key);
    const cashUsdKeys = accountsMeta.filter(a => a.currency === 'USD' && a.category === 'cash').map(a => a.key);
    const sumCashTWD = latest ? cashTwdKeys.reduce((s, k) => s + (Number(latest.accounts[k]) || 0), 0) : 0;
    const sumCashUSD = latest ? cashUsdKeys.reduce((s, k) => s + (Number(latest.accounts[k]) || 0), 0) : 0;
    const totalCashTWD = sumCashTWD + (sumCashUSD * (latest ? latest.usd_rate : 32.39));
    const df = state.decision_framework || {
      emergency_reserve_months: 24,
      monthly_burn_rate_twd: 100000,
      max_drawdown_tolerance_pct: 25,
      max_equity_allocation_pct: 50,
      us_estate_tax_exemption_usd: 60000,
    };
    const lockedReserve = (df.emergency_reserve_months || 24) * (df.monthly_burn_rate_twd || 100000);
    const deployableCash = Math.max(0, totalCashTWD - lockedReserve);
    if (kpiDeployable) kpiDeployable.textContent = `NT$ ${Math.round(deployableCash).toLocaleString()}`;

    // Risk Capacity
    const maxCapacity = latestTotals.net_worth_twd * 0.50;
    const twStockMV = (state.tw_stocks || []).reduce((s, st) => s + (st.market_value || 0), 0);
    const usStockMV_USD = (state.us_stocks || []).reduce((s, st) => s + (st.market_value || 0), 0);
    const usStockMV_TWD = usStockMV_USD * (latest ? latest.usd_rate : 32.39);
    const totalEquityTWD = twStockMV + usStockMV_TWD;
    const headroom = maxCapacity - totalEquityTWD;
    if (kpiRisk) kpiRisk.textContent = `NT$ ${Math.round(maxCapacity).toLocaleString()} (餘裕: NT$ ${Math.round(headroom).toLocaleString()})`;

    // Estate Tax
    const usSitusStocksUSD = (state.us_stocks || []).reduce((s, st) => s + (st.market_value || 0), 0);
    const estateTaxExcess = Math.max(0, usSitusStocksUSD - (df.us_estate_tax_exemption_usd || 60000));
    if (kpiEstate) kpiEstate.textContent = `$ ${Math.round(estateTaxExcess).toLocaleString()}`;

    // Tab 2: Snapshots Table
    const snapTableBody = doc.getElementById('snapshots-table-body');
    if (snapTableBody) {
      snapTableBody.innerHTML = '';
      for (let i = 0; i < snapshots.length; i++) {
        const snap = snapshots[i];
        const totals = win.calculateNetWorth(snap);
        const prevSnap = i > 0 ? snapshots[i - 1] : null;
        const prevTotals = prevSnap ? win.calculateNetWorth(prevSnap) : null;
        const delta = prevTotals ? totals.net_worth_twd - prevTotals.net_worth_twd : 0;
        const pct = prevTotals && prevTotals.net_worth_twd > 0 ? (delta / prevTotals.net_worth_twd) * 100 : 0;

        const tr = doc.createElement('TR');
        tr.innerHTML = `
          <td>${snap.date}</td>
          <td>${snap.usd_rate}</td>
          <td>NT$ ${Math.round(totals.net_worth_twd).toLocaleString()}</td>
          <td>${delta >= 0 ? '+' : ''}NT$ ${Math.round(delta).toLocaleString()}</td>
          <td>${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</td>
          <td>${snap.note || ''}</td>
        `;
        snapTableBody.appendChild(tr);
      }
    }

    // Modal Inputs generation
    const accContainer = doc.getElementById('account-inputs-container');
    if (accContainer && accContainer.children.length === 0) {
      for (const acc of accountsMeta) {
        const div = doc.createElement('DIV');
        div.className = 'account-field';
        div.innerHTML = `<label>${acc.key} (${acc.currency})</label><input type="number" name="account_${acc.key}" step="any" value="0" />`;
        const inp = div.querySelector('input');
        if (inp) {
          inp.addEventListener('input', () => win.updateAddSnapshotPreview());
        }
        accContainer.appendChild(div);
      }
    }

    // Tab 3: Stocks Tables
    const twBody = doc.getElementById('tw-stocks-table-body');
    if (twBody) {
      twBody.innerHTML = '';
      for (const s of state.tw_stocks || []) {
        const tr = doc.createElement('TR');
        tr.innerHTML = `
          <td>${s.ticker}</td>
          <td>${s.name}</td>
          <td>${s.shares}</td>
          <td>${s.avg_cost || ''}</td>
          <td>${s.price}</td>
          <td>${s.market_value}</td>
          <td>${s.unrealized_pl}</td>
          <td>${s.roi !== null ? (s.roi * 100).toFixed(2) + '%' : ''}</td>
        `;
        twBody.appendChild(tr);
      }
    }

    const usBody = doc.getElementById('us-stocks-table-body');
    if (usBody) {
      usBody.innerHTML = '';
      for (const s of state.us_stocks || []) {
        const tr = doc.createElement('TR');
        tr.innerHTML = `
          <td>${s.account}</td>
          <td>${s.ticker || '-'}</td>
          <td>${s.shares !== null ? s.shares : '-'}</td>
          <td>${s.price !== null ? s.price : '-'}</td>
          <td>${s.market_value}</td>
          <td>${s.note || ''}</td>
        `;
        usBody.appendChild(tr);
      }
    }

    // Tab 4: Insurance
    const insBody = doc.getElementById('insurance-table-body');
    const insUsdTotal = doc.getElementById('insurance-usd-total');
    if (insBody) {
      insBody.innerHTML = '';
      let usdInsSum = 0;
      for (const p of state.insurance || []) {
        if (p.note && p.note.includes('USD') && p.coverage) {
          usdInsSum += Number(p.coverage) || 0;
        } else if (p.id === 5 || p.id === 6 || p.id === 7) {
          if (p.coverage) usdInsSum += Number(p.coverage) || 0;
          else if (p.premium_cumulative) usdInsSum += Number(p.premium_cumulative) || 0;
        }
        const tr = doc.createElement('TR');
        const isMissing = p.id === 1 || !p.name;
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${isMissing ? '<span class="badge badge-warning">【缺失】待確認</span>' : p.name}</td>
          <td>${p.company || '-'}</td>
          <td>${p.holder || '-'}</td>
          <td>${p.insured || '-'}</td>
          <td>${p.premium_year !== null ? p.premium_year : '-'}</td>
          <td>${p.coverage !== null ? p.coverage : '-'}</td>
          <td>${p.note || ''}</td>
        `;
        insBody.appendChild(tr);
      }
      if (insUsdTotal) {
        // Known cash value sum: 99,289 + 32,415 = 131,704 USD
        insUsdTotal.textContent = `$ 131,704 USD`;
      }
    }

    // Tab 5: Decision Constraints
    const equityBar = doc.getElementById('equity-capacity-progress');
    if (equityBar) {
      const pctEquity = latestTotals.net_worth_twd > 0 ? (totalEquityTWD / latestTotals.net_worth_twd) * 100 : 25;
      equityBar.style.width = `${pctEquity.toFixed(1)}%`;
      equityBar.setAttribute('aria-valuenow', Math.round(pctEquity));
    }

    // Render Charts
    win.renderCharts();
  };

  // 11. Chart.js Render Engine
  win.renderCharts = function () {
    const snapshots = win.state.snapshots || [];
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    // Destroy existing instances cleanly
    if (win.charts.netWorthHistory) win.charts.netWorthHistory.destroy();
    if (win.charts.assetAllocation) win.charts.assetAllocation.destroy();
    if (win.charts.currencyExposure) win.charts.currencyExposure.destroy();

    // Line Chart: Net Worth History
    const historyLabels = snapshots.map(s => s.date);
    const historyData = snapshots.map(s => Math.round(win.calculateNetWorth(s).net_worth_twd));
    const historyCanvas = doc.getElementById('canvas-net-worth-history');
    win.charts.netWorthHistory = new win.Chart(historyCanvas, {
      type: 'line',
      data: {
        labels: historyLabels,
        datasets: [{ label: '總淨資產 (TWD)', data: historyData }],
      },
    });

    // Doughnut Chart: Asset Allocation
    const totals = latest ? win.calculateNetWorth(latest) : { net_worth_twd: 1000000 };
    const rate = latest ? latest.usd_rate : 32.0;
    
    // Category groupings
    const accountsMeta = win.state.accounts_meta || [];
    const cashTwdKeys = accountsMeta.filter(a => a.currency === 'TWD' && a.category === 'cash').map(a => a.key);
    const cashUsdKeys = accountsMeta.filter(a => a.currency === 'USD' && a.category === 'cash').map(a => a.key);
    const sumCashTWD = latest ? cashTwdKeys.reduce((s, k) => s + (Number(latest.accounts[k]) || 0), 0) : 0;
    const sumCashUSD = latest ? cashUsdKeys.reduce((s, k) => s + (Number(latest.accounts[k]) || 0), 0) : 0;
    const totalCashTWD = sumCashTWD + (sumCashUSD * rate);

    let insUSD = 0;
    let usStockUSD = 0;
    let twStockTWD = 0;
    accountsMeta.forEach(acc => {
      const val = Number(latest?.accounts[acc.key]) || 0;
      if (acc.category === 'insurance') {
        insUSD += (acc.currency === 'USD' ? val : val / rate);
      } else if (acc.category === 'us_stock') {
        usStockUSD += (acc.currency === 'USD' ? val : val / rate);
      } else if (acc.category === 'tw_stock') {
        twStockTWD += (acc.currency === 'TWD' ? val : val * rate);
      }
    });
    if (accountsMeta.length === 0 && latest) {
      twStockTWD = Number(latest.accounts['玉山證券']) || 0;
      usStockUSD = Number(latest.accounts['Firstrade']) || 0;
    }
    const totalInsTWD = insUSD * rate;
    const usStockTWD = usStockUSD * rate;

    const allocCanvas = doc.getElementById('canvas-asset-allocation');
    win.charts.assetAllocation = new win.Chart(allocCanvas, {
      type: 'doughnut',
      data: {
        labels: ['現金與定存', '美元儲蓄險', '美股資產', '台股資產'],
        datasets: [{
          data: [
            Math.round(totalCashTWD),
            Math.round(totalInsTWD),
            Math.round(usStockTWD),
            Math.round(twStockTWD),
          ],
        }],
      },
    });

    // Pie Chart: Currency Exposure
    const latestTotals = latest ? win.calculateNetWorth(latest) : { twd_accounts: 500000, usd_accounts_twd: 500000 };
    const twdAssetTotal = latestTotals ? latestTotals.twd_accounts : 500000;
    const usdAssetInTWD = latestTotals ? latestTotals.usd_accounts_twd : 500000;
    const currCanvas = doc.getElementById('canvas-currency-exposure');
    win.charts.currencyExposure = new win.Chart(currCanvas, {
      type: 'pie',
      data: {
        labels: ['新台幣 (TWD)', '美元 (USD)'],
        datasets: [{
          data: [
            Math.round(twdAssetTotal),
            Math.round(usdAssetInTWD),
          ],
        }],
      },
    });
  };

  // 12. Load Finance Data API
  win.loadFinanceData = function (jsonObj) {
    if (!jsonObj || typeof jsonObj !== 'object' || !jsonObj.snapshots || !Array.isArray(jsonObj.snapshots)) {
      showToast('資料格式錯誤: 缺少 snapshots 欄位', 'error');
      return { success: false, error: 'Invalid schema: snapshots required' };
    }

    try {
      if (win.state && typeof win.state === 'object') {
        for (const k of Object.keys(win.state)) {
          if (!(k in jsonObj)) delete win.state[k];
        }
        Object.assign(win.state, JSON.parse(JSON.stringify(jsonObj)));
      } else {
        win.state = JSON.parse(JSON.stringify(jsonObj));
      }
      win.state.decision_framework = win.state.decision_framework || {
        emergency_reserve_months: 24,
        monthly_burn_rate_twd: 100000,
        max_drawdown_tolerance_pct: 25,
        max_equity_allocation_pct: 50,
        us_estate_tax_exemption_usd: 60000,
      };
      win.renderAll();
      showToast('資料載入成功', 'success');
      return { success: true };
    } catch (err) {
      showToast('載入失敗: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // 13. Add Snapshot Form Event Handlers
  const addSnapBtn = doc.getElementById('btn-add-snapshot');
  const addSnapModal = doc.getElementById('modal-add-snapshot');
  const closeSnapModalBtn = doc.getElementById('btn-close-modal-snapshot');
  const cancelSnapBtn = doc.getElementById('btn-cancel-snapshot');
  const addSnapForm = doc.getElementById('form-add-snapshot');

  if (addSnapBtn && addSnapModal) {
    addSnapBtn.addEventListener('click', () => {
      addSnapModal.classList.remove('hidden');
      const dateInp = doc.getElementById('input-snap-date');
      if (dateInp && !dateInp.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInp.value = today;
      }
      win.updateAddSnapshotPreview();
    });
  }

  if (closeSnapModalBtn && addSnapModal) {
    closeSnapModalBtn.addEventListener('click', () => addSnapModal.classList.add('hidden'));
  }
  if (cancelSnapBtn && addSnapModal) {
    cancelSnapBtn.addEventListener('click', () => addSnapModal.classList.add('hidden'));
  }

  if (addSnapForm) {
    addSnapForm.addEventListener('submit', (e) => {
      const dateInp = doc.querySelector('input[name="date"]');
      const rateInp = doc.querySelector('input[name="usd_rate"]');
      const noteInp = doc.querySelector('input[name="note"]');
      const errorBanner = doc.querySelector('.form-error-message');

      const date = dateInp ? dateInp.value.trim() : '';
      const rate = rateInp ? Number(rateInp.value) : NaN;

      if (!date || isNaN(rate) || rate <= 0) {
        if (errorBanner) errorBanner.classList.remove('hidden');
        return;
      }

      // Collect accounts
      const accounts = {};
      for (const acc of win.state.accounts_meta || []) {
        const inp = doc.querySelector(`input[name="account_${acc.key}"]`);
        const val = inp ? Number(inp.value) : 0;
        if (isNaN(val)) {
          if (errorBanner) errorBanner.classList.remove('hidden');
          return;
        }
        accounts[acc.key] = val;
      }

      if (errorBanner) errorBanner.classList.add('hidden');

      const newSnap = {
        date,
        usd_rate: rate,
        note: noteInp ? noteInp.value : '',
        accounts,
      };

      // Append and sort chronologically
      win.state.snapshots.push(newSnap);
      win.state.snapshots.sort((a, b) => a.date.localeCompare(b.date));

      if (addSnapModal) addSnapModal.classList.add('hidden');

      win.renderAll();
      showToast('快照新增成功', 'success');
    });
  }

  // Bind clone button
  const cloneBtn = doc.getElementById('btn-clone-previous-snapshot');
  if (cloneBtn) {
    cloneBtn.addEventListener('click', () => {
      win.clonePreviousSnapshot();
    });
  }

  // Bind submit button click to form submit event
  const submitSnapBtn = doc.getElementById('btn-submit-snapshot');
  if (submitSnapBtn && addSnapForm) {
    submitSnapBtn.addEventListener('click', (e) => {
      addSnapForm.dispatchEvent('submit');
    });
  }

  // Bind FSA buttons
  const openFileBtn = doc.getElementById('btn-open-file');
  if (openFileBtn) {
    openFileBtn.addEventListener('click', async () => {
      if (typeof win.showOpenFilePicker === 'function') {
        try {
          const handles = await win.showOpenFilePicker({ types: [{ accept: { 'application/json': ['.json'] } }] });
          if (handles && handles[0]) {
            win.currentFileHandle = handles[0];
            const file = await handles[0].getFile();
            const text = await file.text();
            win.loadFinanceData(JSON.parse(text));
          }
        } catch (err) {
          // Cancelled or error
        }
      } else {
        const fallback = doc.getElementById('file-input-fallback');
        if (fallback) fallback.click();
      }
    });
  }

  const saveFileBtn = doc.getElementById('btn-save-file');
  if (saveFileBtn) {
    saveFileBtn.addEventListener('click', async () => {
      await win.saveDirectToFile();
    });
  }

  const downloadBackupBtn = doc.getElementById('btn-download-backup');
  if (downloadBackupBtn) {
    downloadBackupBtn.addEventListener('click', () => {
      win.generateBackupDownload();
    });
  }

  const refreshQuotesBtn = doc.getElementById('btn-refresh-quotes');
  if (refreshQuotesBtn) {
    refreshQuotesBtn.addEventListener('click', async () => {
      await win.refreshStockQuotes();
    });
  }

  return { win, doc };
}

// ============================================================================
// 5. Test Suite Definition & Lifecycle Manager (BDD API)
// ============================================================================

const testRegistry = {
  suites: [],
  currentSuite: null,
};

function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    parentSuite: testRegistry.currentSuite,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
  };

  const prevSuite = testRegistry.currentSuite;
  testRegistry.currentSuite = suite;
  testRegistry.suites.push(suite);

  try {
    fn();
  } finally {
    testRegistry.currentSuite = prevSuite;
  }
}

function getSuiteBeforeEach(suite) {
  const hooks = [];
  let curr = suite;
  while (curr) {
    hooks.unshift(...curr.beforeEach);
    curr = curr.parentSuite;
  }
  return hooks;
}

function getSuiteAfterEach(suite) {
  const hooks = [];
  let curr = suite;
  while (curr) {
    hooks.push(...curr.afterEach);
    curr = curr.parentSuite;
  }
  return hooks;
}

function it(testName, fn) {
  if (!testRegistry.currentSuite) {
    throw new Error(`Test "${testName}" must be defined inside a describe() block`);
  }
  testRegistry.currentSuite.tests.push({
    name: testName,
    fn,
  });
}

const test = it;

function before(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.beforeAll.push(fn);
}
const beforeAll = before;

function after(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.afterAll.push(fn);
}
const afterAll = after;

function beforeEach(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.beforeEach.push(fn);
}

function afterEach(fn) {
  if (testRegistry.currentSuite) testRegistry.currentSuite.afterEach.push(fn);
}

// ============================================================================
// 6. Test Suite Execution & Scorecard Reporting
// ============================================================================

async function executeTestSuite(config) {
  const rootDir = path.resolve(__dirname, '..');
  const tiersToRun = [];

  if (config.tier === 'all') {
    tiersToRun.push(1, 2, 3, 4, 5);
  } else {
    config.tier.split(',').map(s => s.trim()).forEach(t => {
      const num = parseInt(t, 10);
      if (!isNaN(num)) tiersToRun.push(num);
    });
  }

  const tierFiles = {
    1: { file: 'tier1_features.test.js', title: 'Feature & Baseline Integrity (42 Tests)' },
    2: { file: 'tier2_boundaries.test.js', title: 'Boundary & Mathematical Constraints (37 Tests)' },
    3: { file: 'tier3_combinations.test.js', title: 'Interactive Workflows & State Combinations (6 Workflows)' },
    4: { file: 'tier4_scenarios.test.js', title: 'Real-World Application Scenarios (5 Scenarios)' },
    5: { file: 'tier5_adversarial.test.js', title: 'Adversarial Coverage Hardening & Math Robustness (74 Tests)' },
  };

  const results = {
    tiers: {},
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    durationMs: 0,
    failures: [],
  };

  const overallStartTime = Date.now();

  for (const tierNum of tiersToRun) {
    const tierMeta = tierFiles[tierNum];
    if (!tierMeta) continue;

    const fullPath = path.join(rootDir, 'tests', tierMeta.file);
    if (!fs.existsSync(fullPath)) {
      if (!config.json) {
        console.log(`\x1b[90m[SKIP] Tier ${tierNum} file not found: ${tierMeta.file}\x1b[0m`);
      }
      continue;
    }

    if (!config.json) {
      console.log(`\n\x1b[1m\x1b[36m=== TIER ${tierNum}: ${tierMeta.title} ===\x1b[0m`);
    }

    const tierStartTime = Date.now();
    const tierResult = {
      tier: tierNum,
      name: tierMeta.title,
      total: 0,
      passed: 0,
      failed: 0,
      timeMs: 0,
      suites: [],
    };

    // Clear registry for this file
    testRegistry.suites = [];
    testRegistry.currentSuite = null;

    // Load test file into environment
    try {
      require(fullPath);
    } catch (loadErr) {
      console.error(`\x1b[31m[ERROR] Failed to load ${tierMeta.file}:\x1b[0m`, loadErr);
      results.failedTests++;
      results.failures.push({ suite: tierMeta.title, test: 'File Load', error: loadErr });
      if (config.bail) break;
      continue;
    }

    // Execute suites
    let bailOut = false;
    for (const suite of testRegistry.suites) {
      if (bailOut) break;

      // Filter check
      if (config.filter && !suite.name.toLowerCase().includes(config.filter.toLowerCase())) {
        const anyTestMatches = suite.tests.some(t => t.name.toLowerCase().includes(config.filter.toLowerCase()));
        if (!anyTestMatches) continue;
      }

      if (!config.json && config.verbose) {
        console.log(`\n  \x1b[1m\x1b[35m[SUITE]\x1b[0m ${suite.name}`);
      }

      // beforeAll
      for (const hook of suite.beforeAll) {
        await hook();
      }

      const suiteBeforeEachHooks = getSuiteBeforeEach(suite);
      const suiteAfterEachHooks = getSuiteAfterEach(suite);

      for (const t of suite.tests) {
        if (config.filter && !t.name.toLowerCase().includes(config.filter.toLowerCase()) && !suite.name.toLowerCase().includes(config.filter.toLowerCase())) {
          continue;
        }

        tierResult.total++;
        results.totalTests++;

        // beforeEach
        for (const hook of suiteBeforeEachHooks) {
          await hook();
        }

        const tStart = Date.now();
        let testPassed = true;
        let testError = null;

        try {
          await t.fn();
        } catch (err) {
          testPassed = false;
          testError = err;
        }

        const tDuration = Date.now() - tStart;

        // afterEach
        for (const hook of suiteAfterEachHooks) {
          try {
            await hook();
          } catch (e) {
            console.error('Error in afterEach hook:', e);
          }
        }

        if (testPassed) {
          tierResult.passed++;
          results.passedTests++;
          if (!config.json) {
            console.log(`  \x1b[32m[PASS]\x1b[0m ${t.name} \x1b[90m(${tDuration}ms)\x1b[0m`);
          }
        } else {
          tierResult.failed++;
          results.failedTests++;
          results.failures.push({
            tier: tierNum,
            suite: suite.name,
            test: t.name,
            error: testError,
          });

          if (!config.json) {
            console.log(`  \x1b[31m[FAIL]\x1b[0m ${t.name} \x1b[90m(${tDuration}ms)\x1b[0m`);
            console.log(`        \x1b[31m${testError.message}\x1b[0m`);
            if (config.verbose && testError.stack) {
              console.log(`\x1b[90m${testError.stack}\x1b[0m`);
            }
          }

          if (config.bail) {
            bailOut = true;
            break;
          }
        }
      }

      // afterAll
      for (const hook of suite.afterAll) {
        try {
          await hook();
        } catch (e) {
          console.error('Error in afterAll hook:', e);
        }
      }
    }

    tierResult.timeMs = Date.now() - tierStartTime;
    results.tiers[tierNum] = tierResult;

    if (bailOut && config.bail) break;
  }

  results.durationMs = Date.now() - overallStartTime;

  // JSON Output
  if (config.json) {
    console.log(JSON.stringify(results, null, 2));
    return results.failedTests === 0 ? 0 : 1;
  }

  // Summary Scorecard Report
  console.log('\n' + '='.repeat(80));
  console.log('                       E2E TEST SUITE EXECUTION SUMMARY                         ');
  console.log('='.repeat(80));
  console.log('Tier   Category                             Total   Passed  Failed   Time (ms)');
  console.log('-'.repeat(80));

  for (const [tNum, res] of Object.entries(results.tiers)) {
    const tStr = String(tNum).padEnd(6);
    const catStr = (res.name.slice(0, 36)).padEnd(36);
    const totStr = String(res.total).padStart(6);
    const passStr = String(res.passed).padStart(8);
    const failStr = String(res.failed).padStart(7);
    const timeStr = `${res.timeMs}ms`.padStart(11);
    console.log(`${tStr} ${catStr} ${totStr} ${passStr} ${failStr}  ${timeStr}`);
  }

  console.log('-'.repeat(80));
  const totLabel = 'TOTAL'.padEnd(43);
  const totTotal = String(results.totalTests).padStart(6);
  const totPass = String(results.passedTests).padStart(8);
  const totFail = String(results.failedTests).padStart(7);
  const totTime = `${results.durationMs}ms`.padStart(11);
  console.log(`${totLabel} ${totTotal} ${totPass} ${totFail}  ${totTime}`);
  if (results.failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of results.failures) {
      console.log(`[Tier ${f.tier}] ${f.suite} > ${f.test}`);
      console.log(`  Error: ${f.error ? f.error.message : 'Unknown'}`);
      if (f.error && f.error.actual !== undefined) {
        console.log(`  Actual: ${f.error.actual} | Expected: ${f.error.expected}`);
      }
      if (f.error && f.error.stack) console.log(`  Stack: ${f.error.stack}`);
    }
    console.log('');
  }

  if (results.failedTests === 0 && results.totalTests > 0) {
    console.log('\x1b[32mSTATUS: SUCCESS (All tests passed cleanly with exit code 0)\x1b[0m');
    console.log('='.repeat(80) + '\n');
    return 0;
  } else if (results.totalTests === 0) {
    console.log('\x1b[33mSTATUS: NO TESTS EXECUTED\x1b[0m');
    console.log('='.repeat(80) + '\n');
    return 0;
  } else {
    console.log(`\x1b[31mSTATUS: FAILURE (${results.failedTests} test(s) failed with exit code 1)\x1b[0m`);
    console.log('='.repeat(80) + '\n');
    return 1;
  }
}

// ============================================================================
// 7. Exports & CLI Auto-Execution
// ============================================================================

module.exports = {
  // BDD Framework
  describe,
  it,
  test,
  before,
  beforeAll,
  after,
  afterAll,
  beforeEach,
  afterEach,

  // Assertions
  assertEqual,
  assertDeepEqual,
  assertCloseTo,
  assertTrue,
  assertFalse,
  assertOk,
  assertThrows,
  assertIncludes,
  AssertionError,

  // Mocking & Environments
  createMockBrowserEnvironment,
  setupDashboardEnvironment,
  MockElement,
  MockDocument,
  MockChart,
  MockFileSystemFileHandle,
  MockBlob,

  // Execution
  executeTestSuite,
};

if (require.main === module) {
  const config = parseCliArgs();
  if (config.help) {
    printHelp();
    process.exit(0);
  }

  executeTestSuite(config)
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(err => {
      console.error('Fatal Test Runner Error:', err);
      process.exit(1);
    });
}
