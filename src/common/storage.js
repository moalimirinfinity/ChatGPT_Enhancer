/**
 * Abstraction layer for Chrome storage operations with fallback and error handling.
 */
import { DEFAULT_SETTINGS } from './config.js';

function getChromeStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    return chrome.storage.sync;
  }
  return null;
}

export function loadSettings() {
  const storage = getChromeStorage();
  const defaults = { ...DEFAULT_SETTINGS };
  if (!storage) {
    return Promise.resolve(defaults);
  }

  const RETRY_ATTEMPTS = 1;
  const RETRY_DELAY_MS = 50;

  return new Promise((resolve, reject) => {
    const attemptLoad = (remainingRetries) => {
      try {
        storage.get(DEFAULT_SETTINGS, (stored) => {
          const runtimeError = chrome?.runtime?.lastError || null;
          if (runtimeError) {
            if (remainingRetries > 0) {
              setTimeout(() => attemptLoad(remainingRetries - 1), RETRY_DELAY_MS);
              return;
            }
            reject(runtimeError);
            return;
          }
          resolve({ ...defaults, ...(stored || {}) });
        });
      } catch (error) {
        if (remainingRetries > 0) {
          setTimeout(() => attemptLoad(remainingRetries - 1), RETRY_DELAY_MS);
          return;
        }
        reject(error);
      }
    };

    attemptLoad(RETRY_ATTEMPTS);
  });
}

export function saveSettings(patch) {
  const storage = getChromeStorage();
  if (!storage || !patch || typeof patch !== 'object') {
    return Promise.reject(new Error('Settings storage unavailable or invalid payload.'));
  }
  return new Promise((resolve, reject) => {
    try {
      storage.set(patch, () => {
        const runtimeError = chrome?.runtime?.lastError || null;
        if (runtimeError) {
          reject(runtimeError);
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
