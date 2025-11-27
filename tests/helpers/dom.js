const path = require('path');
const { JSDOM } = require('jsdom');

const RETENTION_PATH = path.join(__dirname, '..', '..', 'retention.js');

function createChromeMock(initialData = {}) {
  const data = { ...initialData };
  const listeners = [];

  const local = {
    data,
    get(keys, callback) {
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach((key) => {
          result[key] = data[key];
        });
        callback(result);
        return;
      }
      callback({ [keys]: data[keys] });
    },
    set(partial, callback) {
      Object.assign(data, partial);
      if (typeof callback === 'function') {
        callback();
      }
    }
  };

  return {
    chrome: {
      runtime: {},
      storage: {
        local,
        onChanged: {
          addListener(listener) {
            listeners.push(listener);
          }
        }
      }
    },
    data,
    emitChange(changes) {
      listeners.forEach((listener) => listener(changes, 'local'));
    }
  };
}

function setupDom({ storageData } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://example.com/'
  });
  const chromeMock = createChromeMock(storageData);

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.navigator = dom.window.navigator;
  dom.window.open = () => null;

  global.chrome = chromeMock.chrome;
  global.window.chrome = chromeMock.chrome;

  return {
    dom,
    chromeMock,
    cleanup() {
      dom.window.close();
      delete global.window;
      delete global.document;
      delete global.HTMLElement;
      delete global.Node;
      delete global.navigator;
      delete global.chrome;
    }
  };
}

function loadReviewManager() {
  delete require.cache[RETENTION_PATH];
  // eslint-disable-next-line global-require, import/no-dynamic-require
  require(RETENTION_PATH);
  return global.window?.ReviewManager;
}

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

module.exports = {
  setupDom,
  loadReviewManager,
  nextTick
};
