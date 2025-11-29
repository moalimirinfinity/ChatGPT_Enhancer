import { DEFAULT_SETTINGS } from '../../common/config.js';

export const PROMPTS_STORAGE_KEY = 'chatgptEnhancerPrompts';

function getSyncStorage() {
  return chrome?.storage?.sync || null;
}

export async function loadPrompts() {
  const storage = getSyncStorage();
  if (!storage) {
    return [];
  }
  return new Promise((resolve, reject) => {
    storage.get({ [PROMPTS_STORAGE_KEY]: [] }, (stored) => {
      if (chrome.runtime?.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const value = stored ? stored[PROMPTS_STORAGE_KEY] : [];
      resolve(Array.isArray(value) ? value : []);
    });
  });
}

export async function savePrompts(prompts) {
  const storage = getSyncStorage();
  if (!storage) {
    return;
  }
  return new Promise((resolve, reject) => {
    storage.set({ [PROMPTS_STORAGE_KEY]: prompts || [] }, () => {
      if (chrome.runtime?.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

export function getDefaults() {
  return DEFAULT_SETTINGS;
}
