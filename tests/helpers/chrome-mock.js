/**
 * Minimal Chrome storage mock for unit tests.
 */
export function createChromeStorageMock(initialState = {}) {
  let store = { ...initialState };
  let nextError = null;
  const listeners = new Set();

  const runtime = { lastError: null };

  const storage = {
    local: {
      get(defaults, callback) {
        runtime.lastError = nextError;
        nextError = null;
        const result = runtime.lastError ? undefined : { ...defaults, ...store };
        callback(result);
      },
      set(entries, callback) {
        runtime.lastError = nextError;
        nextError = null;
        if (!runtime.lastError) {
          store = { ...store, ...entries };
        }
        callback();
        listeners.forEach((fn) => fn({ ...entries }, 'local'));
      }
    },
    onChanged: {
      addListener(fn) {
        listeners.add(fn);
      },
      removeListener(fn) {
        listeners.delete(fn);
      }
    }
  };

  const chromeMock = { storage, runtime };

  return {
    chromeMock,
    getStore: () => ({ ...store }),
    setStore: (next) => {
      store = { ...next };
    },
    triggerErrorOnce: (error) => {
      nextError = error;
    },
    reset: () => {
      store = { ...initialState };
      runtime.lastError = null;
      nextError = null;
      listeners.clear();
    }
  };
}
