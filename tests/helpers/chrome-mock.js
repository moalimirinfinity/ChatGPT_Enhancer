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
          const nextStore = { ...store, ...entries };
          const changes = {};
          Object.keys(entries || {}).forEach((key) => {
            changes[key] = { oldValue: store[key], newValue: nextStore[key] };
          });
          store = nextStore;
          listeners.forEach((fn) => fn(changes, 'local'));
        }
        callback();
      },
      remove(keys, callback) {
        runtime.lastError = nextError;
        nextError = null;
        if (!runtime.lastError) {
          const normalized = Array.isArray(keys) ? keys : [keys];
          const updated = { ...store };
          const changes = {};
          normalized.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(updated, key)) {
              changes[key] = { oldValue: updated[key], newValue: undefined };
              delete updated[key];
            }
          });
          store = updated;
          listeners.forEach((fn) => fn(changes, 'local'));
        }
        callback();
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
