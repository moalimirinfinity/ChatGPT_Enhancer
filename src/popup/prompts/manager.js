/**
 * Persistence layer for loading and saving prompts to Chrome storage with merge and size safeguards.
 */
import { DEFAULT_SETTINGS } from '../../common/config.js';

export const PROMPTS_STORAGE_KEY = 'chatgptEnhancerPrompts';
export const PROMPTS_REVISION_KEY = 'chatgptEnhancerPromptsRevision';
export const PROMPTS_STORAGE_BUDGET_BYTES = Math.floor(4.5 * 1024 * 1024); // Keep under Chrome's 5MB local quota.

function getLocalStorageArea() {
  if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
    return null;
  }
  return chrome.storage.local;
}

export async function loadPrompts() {
  const storage = getLocalStorageArea();
  if (!storage) {
    return { prompts: [], revision: 0 };
  }
  return new Promise((resolve, reject) => {
    storage.get({ [PROMPTS_STORAGE_KEY]: [], [PROMPTS_REVISION_KEY]: 0 }, (stored) => {
      if (chrome.runtime?.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const prompts = Array.isArray(stored?.[PROMPTS_STORAGE_KEY]) ? stored[PROMPTS_STORAGE_KEY] : [];
      const revision = Number.isFinite(stored?.[PROMPTS_REVISION_KEY]) ? stored[PROMPTS_REVISION_KEY] : 0;
      resolve({ prompts, revision });
    });
  });
}

export async function savePromptsWithMerge(nextPrompts, expectedRevision = 0) {
  const storage = getLocalStorageArea();
  if (!storage) {
    throw new Error('Storage unavailable.');
  }

  const { prompts: currentPrompts, revision: currentRevision } = await loadPrompts();
  const mergedPrompts =
    Number(currentRevision) === Number(expectedRevision)
      ? nextPrompts || []
      : mergePromptCollections(currentPrompts, nextPrompts);

  const estimatedBytes = estimatePromptBytes(mergedPrompts);
  if (estimatedBytes > PROMPTS_STORAGE_BUDGET_BYTES) {
    const error = new Error('Prompt storage limit exceeded.');
    error.code = 'PROMPTS_QUOTA_EXCEEDED';
    error.bytes = estimatedBytes;
    error.budget = PROMPTS_STORAGE_BUDGET_BYTES;
    throw error;
  }

  const nextRevision = Math.max(Number.isFinite(currentRevision) ? currentRevision : 0, Number(expectedRevision) || 0) + 1;

  return new Promise((resolve, reject) => {
    storage.set(
      {
        [PROMPTS_STORAGE_KEY]: mergedPrompts || [],
        [PROMPTS_REVISION_KEY]: nextRevision
      },
      () => {
        if (chrome.runtime?.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve({ prompts: mergedPrompts, revision: nextRevision });
      }
    );
  });
}

export function getDefaults() {
  return DEFAULT_SETTINGS;
}

function mergePromptCollections(existing, incoming) {
  const current = Array.isArray(existing) ? existing : [];
  const next = Array.isArray(incoming) ? incoming : [];
  const map = new Map();

  current.forEach((prompt) => {
    if (prompt && typeof prompt.id === 'string') {
      map.set(prompt.id, prompt);
    }
  });

  next.forEach((prompt) => {
    if (!prompt || typeof prompt.id !== 'string') {
      return;
    }
    const existingPrompt = map.get(prompt.id);
    if (!existingPrompt || Number(prompt.updatedAt || 0) >= Number(existingPrompt.updatedAt || 0)) {
      map.set(prompt.id, prompt);
    }
  });

  const incomingOrder = next
    .map((prompt) => (prompt && map.get(prompt.id)) || null)
    .filter(Boolean);
  const extras = current.filter((prompt) => prompt && !next.some((candidate) => candidate?.id === prompt.id));

  return [...incomingOrder, ...extras].filter(Boolean);
}

function estimatePromptBytes(prompts) {
  try {
    const text = JSON.stringify(prompts || []);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text).length;
    }
    const buffer = typeof globalThis !== 'undefined' ? globalThis.Buffer : null;
    if (buffer && typeof buffer.byteLength === 'function') {
      return buffer.byteLength(text, 'utf8');
    }
    return text.length * 2; // Rough UTF-16 fallback.
  } catch (error) {
    return PROMPTS_STORAGE_BUDGET_BYTES + 1;
  }
}
