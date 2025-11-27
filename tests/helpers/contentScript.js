const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const CONTENT_SCRIPT_PATH = path.join(__dirname, '..', '..', 'contentScript.js');

function createChromeMock({ syncData = {}, localData = {} } = {}) {
  const changeListeners = [];
  const messageListeners = [];
  const data = {
    sync: { ...syncData },
    local: { ...localData }
  };

  function emitChange(areaName, changes) {
    changeListeners.forEach((listener) => listener(changes, areaName));
  }

  function buildGetResult(keys, store) {
    if (Array.isArray(keys)) {
      return keys.reduce((acc, key) => ({ ...acc, [key]: store[key] }), {});
    }
    if (keys && typeof keys === 'object') {
      const defaults = { ...keys };
      return Object.keys(defaults).reduce((acc, key) => {
        acc[key] = store[key] !== undefined ? store[key] : defaults[key];
        return acc;
      }, {});
    }
    if (typeof keys === 'string') {
      return { [keys]: store[keys] };
    }
    return { ...store };
  }

  function makeArea(areaName) {
    const store = data[areaName];
    return {
      get(keys, callback) {
        callback(buildGetResult(keys, store));
      },
      set(partial, callback) {
        const changes = {};
        Object.entries(partial || {}).forEach(([key, value]) => {
          changes[key] = { newValue: value, oldValue: store[key] };
          store[key] = value;
        });
        emitChange(areaName, changes);
        if (typeof callback === 'function') {
          callback();
        }
      },
      remove(keys, callback) {
        const removed = Array.isArray(keys) ? keys : [keys];
        const changes = {};
        removed.forEach((key) => {
          changes[key] = { newValue: undefined, oldValue: store[key] };
          delete store[key];
        });
        emitChange(areaName, changes);
        if (typeof callback === 'function') {
          callback();
        }
      }
    };
  }

  const chromeObject = {
    runtime: {
      lastError: null,
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      },
      getURL: (targetPath) => targetPath
    },
    storage: {
      local: makeArea('local'),
      sync: makeArea('sync'),
      onChanged: {
        addListener(listener) {
          changeListeners.push(listener);
        }
      }
    }
  };

  return {
    chrome: chromeObject,
    data,
    messageListeners,
    changeListeners,
    emitMessage(message, sender = {}, sendResponse = () => {}) {
      messageListeners.forEach((listener) => listener(message, sender, sendResponse));
    }
  };
}

function runContentScript({ syncData, localData, url = 'https://chat.openai.com/', timers = 'immediate' } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url });
  const chromeMock = createChromeMock({ syncData, localData });

  const sandbox = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    CSS: dom.window.CSS,
    URL: dom.window.URL,
    console,
    chrome: chromeMock.chrome,
    module: { exports: {} },
    exports: {},
    setTimeout: dom.window.setTimeout.bind(dom.window),
    clearTimeout: dom.window.clearTimeout.bind(dom.window),
    setInterval: dom.window.setInterval.bind(dom.window),
    clearInterval: dom.window.clearInterval.bind(dom.window)
  };

  sandbox.window.chrome = chromeMock.chrome;
  sandbox.global = sandbox.window;
  sandbox.self = sandbox.window;

  if (!sandbox.window.requestAnimationFrame) {
    sandbox.window.requestAnimationFrame = (fn) => {
      if (typeof fn === 'function') {
        fn();
      }
    };
  }

  if (timers === 'immediate') {
    const immediate = (fn) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0;
    };
    sandbox.setTimeout = sandbox.window.setTimeout = immediate;
    sandbox.clearTimeout = sandbox.window.clearTimeout = () => {};
    sandbox.setInterval = sandbox.window.setInterval = immediate;
    sandbox.clearInterval = sandbox.window.clearInterval = () => {};
  }

  const source = fs.readFileSync(CONTENT_SCRIPT_PATH, 'utf8');
  const script = new vm.Script(
    `${source}
module.exports = {
  normalizeThemeAlias,
  resolveThemeClass,
  getApplicableTheme,
  fontControlEnabledInSettings,
  fontControlIsActive,
  tableOfContents,
  getChatGPTThemeMode,
  collectLanguageSample,
  detectConversationLanguageHint,
  mergeSettings,
  LANGUAGE_HINT_MESSAGE_TYPE,
  DEFAULT_SETTINGS,
  getCurrentSettings: () => currentSettings
};`
  );
  script.runInNewContext(sandbox);

  return {
    dom,
    chromeMock,
    sandbox,
    exports: sandbox.module.exports,
    cleanup() {
      dom.window.close();
    }
  };
}

module.exports = {
  createChromeMock,
  runContentScript
};
