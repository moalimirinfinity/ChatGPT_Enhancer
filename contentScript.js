const DEFAULT_SETTINGS = {
  enableFix: true,
  fixKatex: true,
  fixCode: true,
  fixTables: true,
  copyKatex: true,
  exportFormat: 'pdf',
  theme: 'original',
  fontsEnabled: false,
  fontEnglish: 'inter',
  fontPersian: 'vazirmatn'
};

let currentSettings = { ...DEFAULT_SETTINGS };
const root = document.documentElement;
let isApplyingClasses = false;
let classResetTimer = null;
let pendingClassSync = false;
let isCopyListenerActive = false;

const SELECTORS = {
  katex: '.katex, .katex-display',
  code: 'pre, pre code, code',
  tables: 'table'
};

const RESET_VALUES = {
  direction: 'ltr',
  unicodeBidi: 'isolate',
  textAlign: 'left'
};

const CUSTOM_THEME_CLASSES = [
  'chatgpt-theme-midnight',
  'chatgpt-theme-aurora',
  'chatgpt-theme-nebula',
  'chatgpt-theme-paper',
  'chatgpt-theme-skylight'
];

const LEGACY_THEME_CLASSES = [
  'chatgpt-theme-original',
  'chatgpt-theme-original-dark',
  'chatgpt-theme-original-light'
];
const DEPRECATED_THEME_CLASSES = ['chatgpt-theme-daybreak'];
let appliedThemeClass = null;
const THEME_COMPATIBILITY = {
  midnight: 'dark',
  aurora: 'dark',
  nebula: 'dark',
  paper: 'light',
  skylight: 'light'
};
const STORAGE_THEME_MODE_KEY = 'chatgptEnhancerBaseTheme';
let lastKnownChatThemeMode = null;
let themeModeSyncTimer = null;
let lastThemeBlockNotice = null;

function normalizeThemeAlias(theme) {
  if (typeof theme !== 'string') {
    return theme;
  }
  const normalized = theme.trim().toLowerCase();
  return normalized === 'daybreak' ? 'skylight' : normalized;
}

const FONT_STACKS = {
  english: {
    inter: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    'source-sans-3': '"Source Sans 3", "Segoe UI", system-ui, -apple-system, sans-serif',
    roboto: '"Roboto", "Segoe UI", system-ui, -apple-system, sans-serif',
    'noto-sans': '"Noto Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    'work-sans': '"Work Sans", "Segoe UI", system-ui, -apple-system, sans-serif'
  },
  persian: {
    vazirmatn: '"Vazirmatn", "Noto Sans Arabic", "Tahoma", "Arial", sans-serif',
    'noto-naskh-arabic': '"Noto Naskh Arabic", "Vazirmatn", "Tahoma", "Arial", sans-serif',
    'noto-sans-arabic': '"Noto Sans Arabic", "Vazirmatn", "Tahoma", "Arial", sans-serif',
    sahel: '"Sahel", "Vazirmatn", "Tahoma", "Arial", sans-serif',
    shabnam: '"Shabnam", "Vazirmatn", "Tahoma", "Arial", sans-serif'
  }
};

const FONT_IMPORT_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Noto+Sans:wght@400;600&family=Noto+Sans+Arabic:wght@400;600&family=Noto+Naskh+Arabic:wght@400;600&family=Roboto:wght@400;600&family=Source+Sans+3:wght@400;600&family=Work+Sans:wght@400;600&family=Vazirmatn:wght@400;700&display=swap");
@font-face {
  font-family: "Sahel";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/Sahel.woff2") format("woff2");
}
@font-face {
  font-family: "Sahel";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/Sahel-Bold.woff2") format("woff2");
}
@font-face {
  font-family: "Shabnam";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("https://cdn.jsdelivr.net/gh/rastikerdar/shabnam-font@v5.0.1/dist/Shabnam.woff2") format("woff2");
}
@font-face {
  font-family: "Shabnam";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("https://cdn.jsdelivr.net/gh/rastikerdar/shabnam-font@v5.0.1/dist/Shabnam-Bold.woff2") format("woff2");
}
`;

const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const MESSAGE_SELECTOR = [
  '[data-testid="conversation-turn"]',
  '[data-testid^="conversation-turn-"]',
  'article[role="presentation"]',
  '[data-testid="chat-message"]',
  'div[data-message-author-role]',
  'li[data-message-author-role]'
].join(', ');
const FONT_VARIABLES = ['--font-body'];
let fontImportStyle = null;
let fontObserver = null;
let pendingFontSync = false;
let fontObserverReconnectTimer = null;
const FONT_SYNC_INTERVAL_MS = 5000;
let fontSyncIntervalId = null;

function fontControlEnabledInSettings(settings) {
  return Boolean(settings && settings.enableFix && settings.fontsEnabled);
}

function fontControlIsActive() {
  return fontControlEnabledInSettings(currentSettings);
}

function resolveThemeClass(theme) {
  theme = normalizeThemeAlias(theme);
  if (!theme || theme === 'original') {
    return null;
  }

  const candidate = `chatgpt-theme-${theme}`;
  return CUSTOM_THEME_CLASSES.includes(candidate) ? candidate : null;
}

function toggleClass(name, shouldEnable) {
  if (!root) {
    return;
  }
  root.classList.toggle(name, shouldEnable);
}

function scheduleClassResetFlag() {
  if (classResetTimer) {
    clearTimeout(classResetTimer);
  }
  classResetTimer = setTimeout(() => {
    isApplyingClasses = false;
    classResetTimer = null;
  }, 0);
}

function scheduleClassSync() {
  if (pendingClassSync) {
    return;
  }

  pendingClassSync = true;
  const invoke = () => {
    pendingClassSync = false;
    if (!classesInSync(currentSettings)) {
      applySettings(currentSettings);
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(invoke);
  } else {
    setTimeout(invoke, 16);
  }
}

function applySettings(settings) {
  if (!root) {
    return;
  }

  isApplyingClasses = true;
  toggleClass('chatgpt-direction-fix-enabled', settings.enableFix);
  toggleClass(
    'chatgpt-direction-fix-katex',
    settings.enableFix && settings.fixKatex
  );
  toggleClass(
    'chatgpt-direction-fix-code',
    settings.enableFix && settings.fixCode
  );
  toggleClass(
    'chatgpt-direction-fix-tables',
    settings.enableFix && settings.fixTables
  );

  const environmentThemeMode = getChatGPTThemeMode();
  if (settings.enableFix) {
    applyTheme(settings.theme, environmentThemeMode);
  } else {
    removeTheme();
  }
  applyFontControl(settings);
  scheduleClassResetFlag();
}

function applyTheme(theme, environmentThemeMode) {
  if (!root) {
    return;
  }
  const mode = typeof environmentThemeMode === 'string' ? environmentThemeMode : getChatGPTThemeMode();
  const { theme: applicableTheme, blocked, requested, requiredMode } = getApplicableTheme(theme, mode);
  resetThemeClasses();
  if (blocked && requested) {
    const key = `${requested}:${requiredMode}:${mode || 'unknown'}`;
    if (lastThemeBlockNotice !== key) {
      lastThemeBlockNotice = key;
      console.info(
        `[GPT Enhancer] Skipping theme "${requested}" because ChatGPT is currently in ${mode || 'unknown'} mode.`
      );
    }
    appliedThemeClass = null;
    return;
  }
  const themeClass = resolveThemeClass(applicableTheme);
  if (themeClass) {
    root.classList.add(themeClass);
    appliedThemeClass = themeClass;
    lastThemeBlockNotice = null;
  } else {
    appliedThemeClass = null;
    lastThemeBlockNotice = null;
  }
}

function removeTheme() {
  if (!root) {
    return;
  }
  resetThemeClasses();
  lastThemeBlockNotice = null;
}

function resetThemeClasses() {
  if (!root) {
    return;
  }
  CUSTOM_THEME_CLASSES.forEach((className) => {
    root.classList.remove(className);
  });
  LEGACY_THEME_CLASSES.forEach((className) => {
    root.classList.remove(className);
  });
  DEPRECATED_THEME_CLASSES.forEach((className) => {
    root.classList.remove(className);
  });
  appliedThemeClass = null;
}

function getApplicableTheme(theme, environmentThemeMode) {
  const normalized = typeof theme === 'string' ? normalizeThemeAlias(theme) : '';
  if (!normalized || normalized === 'original') {
    return {
      theme: null,
      blocked: false,
      requested: normalized || null,
      requiredMode: null,
      environmentMode: environmentThemeMode || null
    };
  }
  const requiredMode = THEME_COMPATIBILITY[normalized] || null;
  if (requiredMode && environmentThemeMode && requiredMode !== environmentThemeMode) {
    return {
      theme: null,
      blocked: true,
      requested: normalized,
      requiredMode,
      environmentMode: environmentThemeMode
    };
  }
  return {
    theme: normalized,
    blocked: false,
    requested: normalized,
    requiredMode,
    environmentMode: environmentThemeMode || null
  };
}

function getChatGPTThemeMode() {
  const detected = detectChatGPTThemeMode();
  syncDetectedThemeMode(detected);
  return detected;
}

function detectChatGPTThemeMode() {
  const tokens = gatherChatGPTThemeTokens();
  const fromAttributes = interpretThemeTokens(tokens.attributes);
  if (fromAttributes) {
    return fromAttributes;
  }
  const fromClasses = interpretThemeTokens(tokens.classes);
  if (fromClasses) {
    return fromClasses;
  }
  const fromStorage = interpretThemeTokens(tokens.storage);
  if (fromStorage) {
    return fromStorage;
  }
  return prefersDarkScheme() ? 'dark' : 'light';
}

function gatherChatGPTThemeTokens() {
  const groups = {
    attributes: [],
    classes: [],
    storage: []
  };
  if (!root) {
    return groups;
  }
  const attributeCandidates = [
    'data-theme',
    'data-color-mode',
    'data-chat-theme',
    'data-chat-base-theme',
    'data-theme-mode',
    'data-app-theme'
  ];
  attributeCandidates.forEach((name) => {
    const value = root.getAttribute(name);
    if (value) {
      groups.attributes.push(value);
    }
  });
  if (root.dataset) {
    if (root.dataset.theme) {
      groups.attributes.push(root.dataset.theme);
    }
    if (root.dataset.colorMode) {
      groups.attributes.push(root.dataset.colorMode);
    }
    if (root.dataset.chatTheme) {
      groups.attributes.push(root.dataset.chatTheme);
    }
  }
  if (root.classList) {
    root.classList.forEach((className) => {
      if (className) {
        groups.classes.push(className);
      }
    });
  }
  try {
    const storageKeys = ['theme', 'chatgpt-theme', 'color-theme', 'chakra-ui-color-mode'];
    storageKeys.forEach((key) => {
      const value = window.localStorage.getItem(key);
      if (value) {
        groups.storage.push(value);
      }
    });
  } catch (error) {
    // Ignore storage access errors (e.g., when disabled by policy).
  }
  return groups;
}

function interpretThemeTokens(tokens) {
  if (!tokens || !tokens.length) {
    return null;
  }
  let candidate = null;
  let sawSystem = false;

  for (const token of tokens) {
    const rawValue = String(token).trim();
    if (!rawValue) {
      continue;
    }
    const value = rawValue.toLowerCase();
    if (value.includes('darkreader')) {
      continue;
    }
    const hasDark = value.includes('dark');
    const hasLight = value.includes('light');
    if (hasDark && !hasLight) {
      return 'dark';
    }
    if (hasLight && !hasDark && candidate !== 'dark') {
      candidate = 'light';
      continue;
    }
    if (!hasDark && !hasLight && (value === 'system' || value === 'auto')) {
      sawSystem = true;
    }
  }

  if (candidate) {
    return candidate;
  }

  if (sawSystem) {
    return prefersDarkScheme() ? 'dark' : 'light';
  }

  return null;
}

function prefersDarkScheme() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncDetectedThemeMode(mode) {
  if (mode === lastKnownChatThemeMode && !themeModeSyncTimer) {
    return;
  }
  lastKnownChatThemeMode = mode;
  if (!chrome?.storage?.local) {
    return;
  }
  if (themeModeSyncTimer) {
    clearTimeout(themeModeSyncTimer);
    themeModeSyncTimer = null;
  }
  themeModeSyncTimer = setTimeout(() => {
    if (!chrome?.storage?.local) {
      return;
    }
    if (mode) {
      chrome.storage.local.set({ [STORAGE_THEME_MODE_KEY]: mode });
    } else {
      chrome.storage.local.remove(STORAGE_THEME_MODE_KEY);
    }
    themeModeSyncTimer = null;
  }, 50);
}

function applyFontControl(settings) {
  if (!root) {
    return;
  }
  const enabled = fontControlEnabledInSettings(settings);
  toggleClass('chatgpt-font-control-enabled', enabled);
  if (!enabled) {
    root.style.removeProperty('--chatgpt-font-english');
    root.style.removeProperty('--chatgpt-font-persian');
    clearGlobalFontVariables();
    disconnectFontObserver();
    resetMessageFontClasses();
    stopFontSyncInterval();
    return;
  }

  ensureFontImports();

  const englishKey = settings.fontEnglish || DEFAULT_SETTINGS.fontEnglish;
  const persianKey = settings.fontPersian || DEFAULT_SETTINGS.fontPersian;
  const englishFont = FONT_STACKS.english[englishKey] || FONT_STACKS.english[DEFAULT_SETTINGS.fontEnglish];
  const persianFont = FONT_STACKS.persian[persianKey] || FONT_STACKS.persian[DEFAULT_SETTINGS.fontPersian];

  setGlobalFontVariables(englishFont);
  root.style.setProperty('--chatgpt-font-english', englishFont);
  root.style.setProperty('--chatgpt-font-persian', persianFont);

  updateFontsForExistingMessages();
  scheduleFontSync();
  connectFontObserver();
  startFontSyncInterval();
}

function ensureFontImports() {
  if (fontImportStyle || !document.head) {
    return;
  }
  fontImportStyle = document.createElement('style');
  fontImportStyle.textContent = FONT_IMPORT_CSS;
  document.head.appendChild(fontImportStyle);
}

function connectFontObserver() {
  const conversationRoot = document.querySelector('main') || document.body || document.documentElement;
  if (fontObserverReconnectTimer) {
    clearTimeout(fontObserverReconnectTimer);
    fontObserverReconnectTimer = null;
  }
  if (!conversationRoot) {
    disconnectFontObserver();
    if (fontControlIsActive()) {
      fontObserverReconnectTimer = setTimeout(connectFontObserver, 500);
    }
    return;
  }
  if (!fontObserver) {
    fontObserver = new MutationObserver(handleFontMutations);
  }
  fontObserver.disconnect();
  fontObserver.observe(conversationRoot, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function disconnectFontObserver() {
  if (fontObserver) {
    fontObserver.disconnect();
  }
  if (fontObserverReconnectTimer) {
    clearTimeout(fontObserverReconnectTimer);
    fontObserverReconnectTimer = null;
  }
}

function startFontSyncInterval() {
  if (fontSyncIntervalId || !fontControlIsActive()) {
    return;
  }
  fontSyncIntervalId = setInterval(() => {
    if (!fontControlIsActive()) {
      stopFontSyncInterval();
      return;
    }
    updateFontsForExistingMessages();
  }, FONT_SYNC_INTERVAL_MS);
}

function stopFontSyncInterval() {
  if (fontSyncIntervalId) {
    clearInterval(fontSyncIntervalId);
    fontSyncIntervalId = null;
  }
}

function setGlobalFontVariables(font) {
  if (!root || !font) {
    return;
  }
  FONT_VARIABLES.forEach((variable) => {
    root.style.setProperty(variable, font);
  });
}

function clearGlobalFontVariables() {
  if (!root) {
    return;
  }
  FONT_VARIABLES.forEach((variable) => {
    root.style.removeProperty(variable);
  });
}

function scheduleFontSync() {
  if (pendingFontSync || !fontControlIsActive()) {
    return;
  }
  pendingFontSync = true;
  const invoke = () => {
    pendingFontSync = false;
    if (!fontControlIsActive()) {
      return;
    }
    updateFontsForExistingMessages();
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(invoke);
  } else {
    setTimeout(invoke, 16);
  }
}


function handleFontMutations(mutations) {
  if (!fontControlIsActive()) {
    return;
  }
  const englishFont = root ? root.style.getPropertyValue('--chatgpt-font-english') : null;
  const persianFont = root ? root.style.getPropertyValue('--chatgpt-font-persian') : null;
  const messagesToUpdate = new Set();
  let shouldRescan = false;

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => collectMessageElements(node, messagesToUpdate));
      shouldRescan = shouldRescan || mutation.addedNodes.length > 0;
    } else if (mutation.type === 'characterData') {
      const parent = mutation.target && mutation.target.parentElement;
      if (parent) {
        const message = parent.closest(MESSAGE_SELECTOR);
        if (message) {
          messagesToUpdate.add(message);
        }
      }
    }
  }

  if (messagesToUpdate.size) {
    messagesToUpdate.forEach((message) => applyFontsToMessage(message, englishFont, persianFont));
  }

  if (shouldRescan) {
    scheduleFontSync();
  }
}

function collectMessageElements(node, bucket) {
  if (!node) {
    return;
  }
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    node.childNodes.forEach((child) => collectMessageElements(child, bucket));
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node;
    if (element.matches && element.matches(MESSAGE_SELECTOR)) {
      bucket.add(element);
    }
    if (element.querySelectorAll) {
      element.querySelectorAll(MESSAGE_SELECTOR).forEach((found) => bucket.add(found));
    }
  }
}


function updateFontsForExistingMessages() {
  if (!fontControlIsActive()) {
    return;
  }
  const englishFont = root ? root.style.getPropertyValue('--chatgpt-font-english') : null;
  const persianFont = root ? root.style.getPropertyValue('--chatgpt-font-persian') : null;
  document.querySelectorAll(MESSAGE_SELECTOR).forEach((message) => {
    applyFontsToMessage(message, englishFont, persianFont);
  });
}

function resetMessageFontClasses() {
  document.querySelectorAll(MESSAGE_SELECTOR).forEach((message) => {
    if (message instanceof HTMLElement) {
      message.classList.remove('chatgpt-font-persian');
      message.classList.remove('chatgpt-font-message');
      message.style.removeProperty('--chatgpt-font-message-english');
      message.style.removeProperty('--chatgpt-font-message-persian');
      FONT_VARIABLES.forEach((variable) => {
        message.style.removeProperty(variable);
      });
    }
  });
}

function applyFontsToMessage(element, englishFont, persianFont) {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  if (!fontControlIsActive()) {
    return;
  }
  element.classList.add('chatgpt-font-message');
  const textContent = element.textContent || '';
  const hasPersian = PERSIAN_CHAR_REGEX.test(textContent);
  element.classList.toggle('chatgpt-font-persian', hasPersian);

  if (englishFont) {
    element.style.setProperty('--chatgpt-font-message-english', englishFont);
  } else {
    element.style.removeProperty('--chatgpt-font-message-english');
  }

  if (hasPersian && persianFont) {
    element.style.setProperty('--chatgpt-font-message-persian', persianFont);
  } else {
    element.style.removeProperty('--chatgpt-font-message-persian');
  }

  const targetFont = hasPersian && persianFont ? persianFont : englishFont;
  if (targetFont) {
    FONT_VARIABLES.forEach((variable) => {
      element.style.setProperty(variable, targetFont);
    });
  } else {
    FONT_VARIABLES.forEach((variable) => {
      element.style.removeProperty(variable);
    });
  }
}

function classesInSync(settings) {
  if (!root) {
    return true;
  }

  const toggles = [
    ['chatgpt-direction-fix-enabled', settings.enableFix],
    ['chatgpt-direction-fix-katex', settings.enableFix && settings.fixKatex],
    ['chatgpt-direction-fix-code', settings.enableFix && settings.fixCode],
    ['chatgpt-direction-fix-tables', settings.enableFix && settings.fixTables],
    ['chatgpt-font-control-enabled', fontControlEnabledInSettings(settings)]
  ];

  for (const [className, shouldHave] of toggles) {
    const hasClass = root.classList.contains(className);
    if (hasClass !== shouldHave) {
      return false;
    }
  }

  const environmentThemeMode = getChatGPTThemeMode();
  const { theme: desiredTheme } = settings.enableFix
    ? getApplicableTheme(settings.theme, environmentThemeMode)
    : { theme: null };
  const desiredThemeClass = settings.enableFix ? resolveThemeClass(desiredTheme) : null;
  if (!desiredThemeClass) {
    for (const themeClass of CUSTOM_THEME_CLASSES) {
      if (root.classList.contains(themeClass)) {
        return false;
      }
    }
  } else {
    if (!root.classList.contains(desiredThemeClass)) {
      return false;
    }
    for (const themeClass of CUSTOM_THEME_CLASSES) {
      if (themeClass !== desiredThemeClass && root.classList.contains(themeClass)) {
        return false;
      }
    }
  }
  for (const legacyClass of LEGACY_THEME_CLASSES) {
    if (root.classList.contains(legacyClass)) {
      return false;
    }
  }
  for (const deprecatedClass of DEPRECATED_THEME_CLASSES) {
    if (root.classList.contains(deprecatedClass)) {
      return false;
    }
  }

  return true;
}

function clearLegacyInlineStyles(scope) {
  if (!scope) {
    return;
  }

  scope.querySelectorAll(SELECTORS.katex).forEach((element) => {
    if (!element.style) {
      return;
    }
    if (
      element.style.direction === RESET_VALUES.direction &&
      element.style.unicodeBidi === RESET_VALUES.unicodeBidi
    ) {
      element.style.direction = '';
      element.style.unicodeBidi = '';
    }
  });

  scope.querySelectorAll(SELECTORS.code).forEach((element) => {
    if (!element.style) {
      return;
    }
    if (
      element.style.direction === RESET_VALUES.direction &&
      element.style.unicodeBidi === RESET_VALUES.unicodeBidi
    ) {
      element.style.direction = '';
      element.style.unicodeBidi = '';
    }
    if (element.style.textAlign === RESET_VALUES.textAlign) {
      element.style.textAlign = '';
    }
  });

  scope.querySelectorAll(SELECTORS.tables).forEach((element) => {
    if (!element.style) {
      return;
    }
    if (element.style.direction === RESET_VALUES.direction) {
      element.style.direction = '';
    }
    if (element.style.unicodeBidi === RESET_VALUES.unicodeBidi) {
      element.style.unicodeBidi = '';
    }
  });
}

function mergeSettings(partial) {
  if (partial && typeof partial.theme === 'string') {
    partial = { ...partial, theme: normalizeThemeAlias(partial.theme) };
  }
  currentSettings = { ...currentSettings, ...partial };
  applySettings(currentSettings);
  const cleanupScope = document.querySelector('main') || document;
  clearLegacyInlineStyles(cleanupScope);
  syncEquationCopyListener();
}

applySettings(currentSettings);
syncEquationCopyListener();

chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
  mergeSettings(stored);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') {
    return;
  }

  const updated = Object.keys(changes).reduce((acc, key) => {
    acc[key] = changes[key].newValue;
    return acc;
  }, {});

  mergeSettings(updated);
});

function extractLatex(element) {
  const preferred = element.querySelector(
    '.katex-mathml annotation[encoding="application/x-tex"]'
  );
  if (preferred && preferred.textContent) {
    return preferred.textContent.trim();
  }

  const anyAnnotation = element.querySelector('.katex-mathml annotation');
  if (anyAnnotation && anyAnnotation.textContent) {
    return anyAnnotation.textContent.trim();
  }

  return element.textContent ? element.textContent.trim() : '';
}

async function copyTextToClipboard(text) {
  if (!text) {
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

let toastNode = null;
let toastTimer = null;

function showToast(message, referenceRect) {
  if (!document.body) {
    return;
  }

  if (!toastNode) {
    toastNode = document.createElement('div');
    toastNode.className = 'chatgpt-direction-fix-toast';
    document.body.appendChild(toastNode);
  }

  toastNode.textContent = message;
  toastNode.classList.add('is-visible');

  if (referenceRect) {
    const top = Math.max(referenceRect.top + window.scrollY - 40, 12);
    let left = referenceRect.left + window.scrollX + referenceRect.width / 2;
    toastNode.style.left = `${left}px`;
    toastNode.style.top = `${top}px`;
    toastNode.style.transform = 'translate(-50%, -100%)';
  } else {
    toastNode.style.left = '50%';
    toastNode.style.top = '24px';
    toastNode.style.transform = 'translate(-50%, 0)';
  }

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    if (toastNode) {
      toastNode.classList.remove('is-visible');
    }
  }, 1800);
}

function markEquationCopied(element) {
  element.classList.add('chatgpt-katex-copied');
  setTimeout(() => {
    element.classList.remove('chatgpt-katex-copied');
  }, 400);
}

async function handleEquationClick(event) {
  if (!currentSettings.enableFix || !currentSettings.copyKatex) {
    return;
  }

  if (event.defaultPrevented) {
    return;
  }

  if (
    (typeof event.button === 'number' && event.button !== 0) ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const katexElement = target.closest('.katex, .katex-display');
  if (!katexElement) {
    return;
  }

  try {
    const latex = extractLatex(katexElement);
    await copyTextToClipboard(latex);
    markEquationCopied(katexElement);
    showToast('Equation copied', katexElement.getBoundingClientRect());
  } catch (error) {
    console.error('Failed to copy equation', error);
    showToast('Unable to copy equation');
  }
}

function syncEquationCopyListener() {
  if (!document) {
    return;
  }

  const shouldListen = currentSettings.enableFix && currentSettings.copyKatex;
  if (shouldListen && !isCopyListenerActive) {
    document.addEventListener('click', handleEquationClick, true);
    isCopyListenerActive = true;
  } else if (!shouldListen && isCopyListenerActive) {
    document.removeEventListener('click', handleEquationClick, true);
    isCopyListenerActive = false;
  }
}

const rootObserver = new MutationObserver((mutations) => {
  if (isApplyingClasses) {
    return;
  }

  const hasClassMutation = mutations.some(
    (mutation) => mutation.type === 'attributes' && mutation.attributeName === 'class'
  );

  if (hasClassMutation && !classesInSync(currentSettings)) {
    scheduleClassSync();
  }
});

if (root) {
  rootObserver.observe(root, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-color-mode', 'data-chat-theme']
  });
}

try {
  const colorSchemeMedia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  if (colorSchemeMedia) {
    const handleColorSchemeChange = () => {
      const mode = getChatGPTThemeMode();
      if (currentSettings.enableFix) {
        applyTheme(currentSettings.theme, mode);
      }
    };
    if (typeof colorSchemeMedia.addEventListener === 'function') {
      colorSchemeMedia.addEventListener('change', handleColorSchemeChange);
    } else if (typeof colorSchemeMedia.addListener === 'function') {
      colorSchemeMedia.addListener(handleColorSchemeChange);
    }
  }
} catch (error) {
  // Ignore matchMedia issues.
}
