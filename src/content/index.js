import { DEFAULT_SETTINGS } from '../common/config.js';
import { loadSettings } from '../common/storage.js';
import {
  ThemeManager,
  applyTheme,
  getChatGPTThemeMode,
  normalizeThemeAlias,
  registerThemeTokenApplier,
  removeTheme
} from './theme/index.js';
import { DirectionFixer } from './fixers/direction.js';
import { FontManager } from './fonts/index.js';
import { TocManager } from './toc/index.js';
import { KatexCopyFixer } from './fixers/katex.js';
import { MESSAGE_SELECTOR } from './constants.js';

const root = document.documentElement;
const THEME_MANAGER_FLAG = '__CHATGPT_ENHANCER_THEME_MANAGER_ENABLED';
const FIXER_MANAGER_FLAG = '__CHATGPT_ENHANCER_FIXER_MANAGER_ENABLED';
const THEME_ATTRIBUTE_FILTER = [
  'class',
  'data-theme',
  'data-color-mode',
  'data-chat-theme',
  'data-chat-base-theme',
  'data-theme-mode',
  'data-app-theme'
];

let currentSettings = { ...DEFAULT_SETTINGS };
let pendingThemeSync = null;
let suppressThemeObserver = false;

setThemeManagerEnabled(true);
setFixerManagerEnabled(true);
bootstrap();

async function bootstrap() {
  registerThemeTokenApplier(() => TocManager.applyThemeTokens());
  FontManager.setMessageSelector(MESSAGE_SELECTOR);
  try {
    const stored = await loadSettings();
    currentSettings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
  } catch (error) {
    currentSettings = { ...DEFAULT_SETTINGS };
  }
  initializeManagers(currentSettings);
  attachWatchers();
}

function initializeManagers(settings) {
  suppressThemeObserver = true;
  try {
    ThemeManager.init(settings);
  } catch (error) {
    console.error('[GPT Enhancer] ThemeManager init failed.', error);
    setThemeManagerEnabled(false);
  }
  DirectionFixer.init(settings);
  FontManager.init(settings);
  TocManager.init(settings);
  KatexCopyFixer.init(settings);
  scheduleObserverRelease();
}

function setThemeManagerEnabled(enabled) {
  if (typeof window === 'undefined') {
    return;
  }
  window[THEME_MANAGER_FLAG] = Boolean(enabled);
}

function setFixerManagerEnabled(enabled) {
  if (typeof window === 'undefined') {
    return;
  }
  window[FIXER_MANAGER_FLAG] = Boolean(enabled);
}

function attachWatchers() {
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener(handleStorageChanges);
  }
  attachThemeObserver();
  attachColorSchemeListener();
}

function handleStorageChanges(changes, areaName) {
  if (areaName !== 'sync' && areaName !== 'local') {
    return;
  }
  const { hasChanges, picked, nextSettings } = extractRelevantChanges(changes);
  if (!hasChanges) {
    return;
  }
  currentSettings = nextSettings;
  suppressThemeObserver = true;
  try {
    ThemeManager.update(picked);
  } catch (error) {
    console.error('[GPT Enhancer] ThemeManager update failed.', error);
    setThemeManagerEnabled(false);
  }
  DirectionFixer.update(picked);
  FontManager.update(picked);
  TocManager.update(picked);
  KatexCopyFixer.update(picked);
  scheduleObserverRelease();
}

function extractRelevantChanges(changes) {
  const nextSettings = { ...currentSettings };
  const picked = {};
  let hasChanges = false;

  const keys = [
    'enableFix',
    'fixKatex',
    'fixCode',
    'fixTables',
    'theme',
    'fontsEnabled',
    'fontEnglish',
    'fontPersian',
    'tableOfContents',
    'tableOfContentsCollapsed',
    'tableOfContentsPosition',
    'tableOfContentsSize',
    'copyKatex'
  ];

  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      picked[key] = changes[key];
      hasChanges = true;
      if (key === 'theme') {
        const normalized = normalizeThemeAlias(changes[key]?.newValue);
        if (typeof normalized === 'string' && normalized) {
          nextSettings.theme = normalized;
        }
      } else if (key === 'tableOfContentsPosition' || key === 'tableOfContentsSize') {
        nextSettings[key] = changes[key]?.newValue || null;
      } else {
        nextSettings[key] = changes[key]?.newValue;
      }
    }
  });

  return { hasChanges, picked, nextSettings };
}

function attachThemeObserver() {
  if (!root || typeof MutationObserver === 'undefined') {
    return;
  }
  const observer = new MutationObserver((mutations) => {
    if (suppressThemeObserver || !isThemeManagerEnabled()) {
      return;
    }
    const hasRelevantMutation = mutations.some(
      (mutation) => mutation.type === 'attributes' && THEME_ATTRIBUTE_FILTER.includes(mutation.attributeName)
    );
    if (hasRelevantMutation) {
      scheduleThemeSync();
    }
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: THEME_ATTRIBUTE_FILTER
  });
}

function attachColorSchemeListener() {
  try {
    const media =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    if (!media) {
      return;
    }
    const handleChange = () => scheduleThemeSync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handleChange);
    }
  } catch (error) {
    console.error('[GPT Enhancer] Unable to attach color scheme listener.', error);
  }
}

function scheduleThemeSync(environmentMode) {
  if (pendingThemeSync || !isThemeManagerEnabled()) {
    return;
  }
  const schedule =
    typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => setTimeout(callback, 16);
  pendingThemeSync = schedule(() => {
    pendingThemeSync = null;
    syncTheme(environmentMode);
  });
}

function syncTheme(environmentMode) {
  if (!isThemeManagerEnabled()) {
    return;
  }
  suppressThemeObserver = true;
  if (currentSettings.enableFix) {
    const mode = typeof environmentMode === 'string' ? environmentMode : getChatGPTThemeMode();
    applyTheme(currentSettings.theme, mode);
  } else {
    removeTheme();
  }
  scheduleObserverRelease();
}

function isThemeManagerEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }
  return Boolean(window[THEME_MANAGER_FLAG]);
}

function scheduleObserverRelease() {
  const release =
    typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => setTimeout(callback, 16);
  release(() => {
    suppressThemeObserver = false;
  });
}
