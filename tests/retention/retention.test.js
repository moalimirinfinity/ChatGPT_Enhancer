const assert = require('assert');

const STORAGE_KEYS = {
  usage: 'gptEnhancerReviewUsageCount',
  exports: 'gptEnhancerReviewExportCount',
  lastShown: 'gptEnhancerReviewLastShown',
  reviewed: 'gptEnhancerReviewCompleted',
  snoozeUntil: 'gptEnhancerReviewSnoozeUntil',
  dismissCount: 'gptEnhancerReviewDismissCount'
};

function createMockEnvironment(initialStorage = {}) {
  const onChangedListeners = [];
  const store = { ...initialStorage };

  const chrome = {
    runtime: { lastError: null }
  };

  chrome.storage = {
    local: {
      get(keys, cb) {
        const list = Array.isArray(keys) ? keys : Object.keys(keys || {});
        const result = {};
        list.forEach((key) => {
          result[key] = store[key];
        });
        cb(result);
      },
      set(obj, cb) {
        const changes = {};
        Object.entries(obj || {}).forEach(([key, value]) => {
          const oldValue = store[key];
          store[key] = value;
          changes[key] = { oldValue, newValue: value };
        });
        if (typeof cb === 'function') {
          cb();
        }
        onChangedListeners.forEach((fn) => fn(changes, 'local'));
      }
    },
    onChanged: {
      addListener(fn) {
        onChangedListeners.push(fn);
      }
    }
  };

  class MockEvent {
    constructor(type, props = {}) {
      this.type = type;
      this.key = props.key || '';
      this.shiftKey = Boolean(props.shiftKey);
      this.defaultPrevented = false;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
  }

  class MockElement {
    constructor(tag, doc) {
      this.tagName = tag.toUpperCase();
      this.ownerDocument = doc;
      this.children = [];
      this.parentNode = null;
      this.attributes = {};
      this.style = {
        setProperty: (key, value) => {
          this.style[key] = value;
        }
      };
      this.className = '';
      this.textContent = '';
      this.tabIndex = 0;
      this.eventListeners = {};
    }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
      return child;
    }
    setAttribute(name, value) {
      const stringValue = String(value);
      this.attributes[name] = stringValue;
      if (name === 'id') {
        this.id = stringValue;
      }
      if (name === 'class') {
        this.className = stringValue;
      }
    }
    getAttribute(name) {
      return this.attributes[name];
    }
    addEventListener(type, handler) {
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(handler);
    }
    removeEventListener(type, handler) {
      if (!this.eventListeners[type]) {
        return;
      }
      this.eventListeners[type] = this.eventListeners[type].filter((fn) => fn !== handler);
    }
    dispatchEvent(event) {
      const handlers = this.eventListeners[event.type] || [];
      handlers.forEach((fn) => fn(event));
      return !event.defaultPrevented;
    }
    focus() {
      if (this.ownerDocument) {
        this.ownerDocument.activeElement = this;
      }
    }
  }

  class MockDocument extends MockElement {
    constructor() {
      super('#document', null);
      this.ownerDocument = this;
      this.body = new MockElement('body', this);
      this.head = new MockElement('head', this);
      this.documentElement = new MockElement('html', this);
      this.activeElement = this.body;
      this.eventListeners = {};
    }
    createElement(tag) {
      return new MockElement(tag, this);
    }
    getElementById(id) {
      const search = (node) => {
        if (node.id === id) {
          return node;
        }
        for (const child of node.children) {
          const found = search(child);
          if (found) {
            return found;
          }
        }
        return null;
      };
      return search(this.body) || search(this.head) || search(this.documentElement);
    }
  }

  MockDocument.prototype.addEventListener = MockElement.prototype.addEventListener;
  MockDocument.prototype.removeEventListener = MockElement.prototype.removeEventListener;
  MockDocument.prototype.dispatchEvent = MockElement.prototype.dispatchEvent;

  const document = new MockDocument();
  const windowObj = {
    document,
    chrome,
    setTimeout: (fn) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
    addEventListener: (...args) => document.addEventListener(...args),
    removeEventListener: (...args) => document.removeEventListener(...args),
    open: (url) => {
      windowObj.openedUrl = url;
      return null;
    },
    location: { href: '' }
  };
  document.defaultView = windowObj;

  global.window = windowObj;
  global.document = document;
  global.chrome = chrome;
  global.HTMLElement = MockElement;
  global.Event = MockEvent;
  global.CustomEvent = MockEvent;

  const scriptPath = require.resolve('../../retention.js');
  delete require.cache[scriptPath];
  require(scriptPath);

  const ReviewManager = windowObj.ReviewManager;

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  return { ReviewManager, chrome, document, window: windowObj, store, Event: MockEvent, flush };
}

function findByClass(root, className) {
  if (!root) {
    return null;
  }
  const classes = root.className ? root.className.split(/\s+/) : [];
  if (classes.includes(className)) {
    return root;
  }
  for (const child of root.children) {
    const found = findByClass(child, className);
    if (found) {
      return found;
    }
  }
  return null;
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

(async () => {
  await runTest('hydrates persisted usage counts before recording', async () => {
    const env = createMockEnvironment({ [STORAGE_KEYS.usage]: 10 });
    await env.ReviewManager.init();
    env.ReviewManager.recordUsage();
    await env.flush();
    assert.strictEqual(env.store[STORAGE_KEYS.usage], 11);
  });

  await runTest('respects cooldown and does not render during it', async () => {
    const now = Date.now();
    const env = createMockEnvironment({
      [STORAGE_KEYS.usage]: 20,
      [STORAGE_KEYS.lastShown]: now
    });
    await env.ReviewManager.init({ usagePromptChance: 1 });
    env.ReviewManager.recordUsage();
    await env.flush();
    const popup = findByClass(env.document.body, 'chatgpt-review-popup');
    assert.strictEqual(popup, null);
  });

  await runTest('renders when eligible and traps focus correctly', async () => {
    const env = createMockEnvironment({
      [STORAGE_KEYS.usage]: 20,
      [STORAGE_KEYS.lastShown]: Date.now() - 10 * 24 * 60 * 60 * 1000
    });
    env.document.body.focus();
    await env.ReviewManager.init({ usagePromptChance: 1, cooldownMs: 0, usageThreshold: 1 });
    env.ReviewManager.recordUsage();
    await env.flush();

    const popup = findByClass(env.document.body, 'chatgpt-review-popup');
    assert.ok(popup, 'popup should render');
    const cta = findByClass(popup, 'chatgpt-review-button');
    const dismiss = findByClass(popup, 'chatgpt-review-dismiss');
    const close = findByClass(popup, 'chatgpt-review-close');

    assert.ok(cta && dismiss && close, 'popup buttons should exist');

    const styleNode = env.document.getElementById('chatgpt-review-popup-styles');
    assert.ok(styleNode, 'focus style should be injected');

    assert.strictEqual(env.document.activeElement, cta, 'initial focus goes to CTA');

    popup.dispatchEvent(new env.Event('keydown', { key: 'Tab' }));
    assert.strictEqual(env.document.activeElement, dismiss, 'Tab moves focus forward');

    popup.dispatchEvent(new env.Event('keydown', { key: 'Tab' }));
    assert.strictEqual(env.document.activeElement, close, 'Tab cycles through elements');

    popup.dispatchEvent(new env.Event('keydown', { key: 'Tab' }));
    assert.strictEqual(env.document.activeElement, cta, 'Tab wraps to first');

    popup.dispatchEvent(new env.Event('keydown', { key: 'Tab', shiftKey: true }));
    assert.strictEqual(env.document.activeElement, close, 'Shift+Tab wraps backwards');

    popup.dispatchEvent(new env.Event('keydown', { key: 'Escape' }));
    await env.flush();

    const afterClose = findByClass(env.document.body, 'chatgpt-review-popup');
    assert.strictEqual(afterClose, null, 'popup should close on Escape');
    assert.strictEqual(env.document.activeElement, env.document.body, 'focus restores to previous element');
  });

  await runTest('localizes aria labels when language changes', async () => {
    const env = createMockEnvironment({
      [STORAGE_KEYS.usage]: 20,
      [STORAGE_KEYS.lastShown]: 0
    });
    await env.ReviewManager.init({ usagePromptChance: 1, cooldownMs: 0, usageThreshold: 0 });
    await env.ReviewManager.showNow();
    await env.flush();

    env.ReviewManager.setLanguage('persian');
    const popup = findByClass(env.document.body, 'chatgpt-review-popup');
    assert.ok(popup, 'popup should exist');
    assert.strictEqual(popup.getAttribute('dir'), 'rtl', 'direction switches to RTL');
    assert.strictEqual(popup.getAttribute('aria-label'), 'از GPT Enhancer راضی هستی؟');

    const close = findByClass(popup, 'chatgpt-review-close');
    assert.strictEqual(close.getAttribute('aria-label'), 'بستن', 'close label localized');
  });
})();
