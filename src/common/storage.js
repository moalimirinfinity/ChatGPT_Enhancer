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
  if (!storage) {
    return Promise.resolve({ ...DEFAULT_SETTINGS });
  }
  return new Promise((resolve) => {
    storage.get(DEFAULT_SETTINGS, (stored) => {
      resolve({ ...DEFAULT_SETTINGS, ...(stored || {}) });
    });
  });
}

export function saveSettings(patch) {
  const storage = getChromeStorage();
  if (!storage || !patch || typeof patch !== 'object') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    storage.set(patch, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}
