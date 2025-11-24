const DEFAULT_SETTINGS = {
  enableFix: true,
  fixKatex: true,
  fixCode: true,
  fixTables: true,
  copyKatex: true,
  tableOfContents: true,
  tableOfContentsCollapsed: false,
  tableOfContentsPosition: null,
  tableOfContentsSize: null,
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
const TOC_RTL_CHAR_REGEX =
  /[\u0590-\u08FF\u200F\u202B\uFB1D-\uFDFD\uFE70-\uFEFC\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
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
const TOC_PANEL_ID = 'chatgpt-enhancer-toc-panel';
const TOC_ENTRY_ATTR = 'data-chatgpt-toc-target';
const TOC_ANCHOR_ATTR = 'data-chatgpt-toc-id';
const TOC_UPDATE_DEBOUNCE_MS = 200;
const TOC_HIGHLIGHT_DURATION_MS = 1600;
const TOC_ORIGINAL_HIGHLIGHT_COLOR = '#9ca3af';
const TOC_MAX_TITLE_LENGTH = 120;
const TOC_MAX_TITLE_WORDS = 10;
const TOC_PANEL_MIN_GAP = 12;
const TOC_PANEL_MIN_WIDTH = 190;
const TOC_PANEL_MAX_WIDTH = 420;
const TOC_PANEL_MIN_HEIGHT = 220;
const TOC_PANEL_MAX_HEIGHT = 640;
const TOC_THEME_TOKEN_PRESETS = {
  light: {
    '--chatgpt-theme-panel': 'rgba(255, 255, 255, 0.96)',
    '--chatgpt-theme-border': 'rgba(17, 24, 39, 0.12)',
    '--chatgpt-theme-text': '#111222',
    '--chatgpt-theme-text-muted': 'rgba(17, 18, 34, 0.62)',
    '--chatgpt-theme-accent': '#1c46d6'
  },
  dark: {
    '--chatgpt-theme-panel': 'rgba(24, 28, 44, 0.92)',
    '--chatgpt-theme-border': 'rgba(255, 255, 255, 0.18)',
    '--chatgpt-theme-text': '#f5f6fb',
    '--chatgpt-theme-text-muted': 'rgba(229, 231, 235, 0.64)',
    '--chatgpt-theme-accent': '#7aa2ff'
  }
};
const LANGUAGE_HINT_DEFAULT = 'english';
const LANGUAGE_HINT_MESSAGE_TYPE = 'GPT_ENHANCER_DETECT_LANGUAGE';
const LANGUAGE_DETECTION_MAX_MESSAGES = 6;
const LANGUAGE_DETECTION_MAX_CHARS = 800;
const LANGUAGE_DETECTION_CACHE_INTERVAL = 2000;
let lastLanguageHintCache = {
  value: LANGUAGE_HINT_DEFAULT,
  signature: '',
  timestamp: 0,
  sampleLength: 0
};

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
  tableOfContents.sync(settings);
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
      // console.info(
      //   `[GPT Enhancer] Skipping theme "${requested}" because ChatGPT is currently in ${mode || 'unknown'} mode.`
      // );
    }
    appliedThemeClass = null;
    tableOfContents.applyThemeTokens();
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
  tableOfContents.applyThemeTokens();
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

const tableOfContents = (() => {
  const state = {
    panel: null,
    list: null,
    observer: null,
    updateTimer: null,
    anchorCounter: 0,
    dragHandle: null,
    dragState: null,
    collapseButton: null,
    heading: null,
    resizeHandle: null,
    resizeState: null,
    size: null,
    isRtlPanel: false,
    highlightTimers: new Map()
  };

  function isActive(settings = currentSettings) {
    return Boolean(settings?.enableFix && settings.tableOfContents);
  }

  function sync(settings = currentSettings) {
    if (!isActive(settings)) {
      teardown();
      disconnectObserver();
      cancelUpdate();
      return;
    }
    ensurePanel();
    applySize(settings);
    applyPlacement(settings);
    applyThemeTokens();
    setCollapsed(Boolean(settings.tableOfContentsCollapsed), false);
    connectObserver();
    scheduleUpdate();
  }

  function ensurePanel() {
    if (!document || !document.body) {
      return;
    }
    if (state.panel && state.panel.isConnected) {
      return;
    }
    const panel = document.createElement('aside');
    panel.id = TOC_PANEL_ID;
    panel.className = 'chatgpt-toc-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Conversation outline');

    const header = document.createElement('div');
    header.className = 'chatgpt-toc-header';
    header.title = 'Drag to reposition the panel';

    const heading = document.createElement('span');
    heading.className = 'chatgpt-toc-heading';
    heading.textContent = 'Table of contents';

    const collapseButton = document.createElement('button');
    collapseButton.type = 'button';
    collapseButton.className = 'chatgpt-toc-collapse';
    collapseButton.setAttribute('aria-label', 'Collapse outline');
    collapseButton.setAttribute('aria-pressed', 'false');
    collapseButton.textContent = '–';
    collapseButton.addEventListener('click', toggleCollapsed);

    const list = document.createElement('ol');
    list.className = 'chatgpt-toc-list';

    header.appendChild(heading);
    header.appendChild(collapseButton);
    panel.appendChild(header);
    panel.appendChild(list);
    panel.addEventListener('click', handleClick);
    document.body.appendChild(panel);
    state.panel = panel;
    state.list = list;
    state.collapseButton = collapseButton;
    state.heading = heading;
    state.anchorCounter = 0;
    enableDragging();
    enableResizing();
    applyThemeTokens();
  }

  function teardown() {
    disableDragging();
    disableResizing();
    if (state.panel) {
      state.panel.removeEventListener('click', handleClick);
      if (state.panel.parentNode) {
        state.panel.parentNode.removeChild(state.panel);
      }
      clearThemeTokens();
    }
    if (state.collapseButton) {
      state.collapseButton.removeEventListener('click', toggleCollapsed);
    }
    state.panel = null;
    state.list = null;
    state.collapseButton = null;
    state.heading = null;
    state.resizeHandle = null;
    state.resizeState = null;
    state.size = null;
    state.isRtlPanel = false;
    state.anchorCounter = 0;
    state.highlightTimers.forEach((timer, element) => {
      clearTimeout(timer);
      if (element && element.classList) {
        element.classList.remove('chatgpt-toc-highlight-active');
        element.removeAttribute('data-chatgpt-toc-highlighted');
      }
    });
    state.highlightTimers.clear();
  }

  function connectObserver() {
    if (!isActive()) {
      return;
    }
    const container = document.querySelector('main') || document.body || document.documentElement;
    if (!container) {
      return;
    }
    if (!state.observer) {
      state.observer = new MutationObserver(handleMutations);
    }
    state.observer.disconnect();
    state.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function disconnectObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }
  }

  function handleMutations(mutations) {
    if (!isActive()) {
      return;
    }
    const shouldUpdate = mutations.some((mutation) => {
      if (mutation.type === 'childList') {
        return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
      }
      return mutation.type === 'characterData';
    });
    if (shouldUpdate) {
      scheduleUpdate();
    }
  }

  function scheduleUpdate() {
    if (!isActive()) {
      return;
    }
    if (state.updateTimer) {
      clearTimeout(state.updateTimer);
    }
    state.updateTimer = setTimeout(() => {
      state.updateTimer = null;
      rebuildList();
    }, TOC_UPDATE_DEBOUNCE_MS);
  }

  function cancelUpdate() {
    if (state.updateTimer) {
      clearTimeout(state.updateTimer);
      state.updateTimer = null;
    }
  }

  function applySize(settings = currentSettings) {
    if (!state.panel) {
      return;
    }
    const normalized = normalizeSize(settings.tableOfContentsSize);
    if (normalized) {
      setCustomSize(normalized);
    } else {
      resetSize();
    }
  }

  function normalizeSize(size) {
    if (!size || typeof size !== 'object' || !state.panel) {
      return null;
    }
    let { width, height } = size;
    const viewportMaxWidth = Math.max(TOC_PANEL_MIN_WIDTH, window.innerWidth - TOC_PANEL_MIN_GAP * 2);
    const viewportMaxHeight = Math.max(TOC_PANEL_MIN_HEIGHT, window.innerHeight - TOC_PANEL_MIN_GAP * 2);
    const maxWidth = Math.min(TOC_PANEL_MAX_WIDTH, viewportMaxWidth);
    const maxHeight = Math.min(TOC_PANEL_MAX_HEIGHT, viewportMaxHeight);
    width = clamp(Number(width), TOC_PANEL_MIN_WIDTH, maxWidth);
    height = clamp(Number(height), TOC_PANEL_MIN_HEIGHT, maxHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    return { width, height };
  }

  function setCustomSize(size) {
    if (!state.panel) {
      return;
    }
    const width = Math.round(size.width);
    const height = Math.round(size.height);
    state.panel.style.width = `${width}px`;
    state.panel.style.minWidth = `${Math.max(width, TOC_PANEL_MIN_WIDTH)}px`;
    state.panel.style.maxWidth = `${width}px`;
    state.panel.style.height = `${height}px`;
    state.panel.style.maxHeight = `${height}px`;
    state.size = { width, height };
    updateListHeight(height);
  }

  function resetSize() {
    if (!state.panel) {
      return;
    }
    state.panel.style.width = '';
    state.panel.style.minWidth = '';
    state.panel.style.maxWidth = '';
    state.panel.style.height = '';
    state.panel.style.maxHeight = '';
    if (state.list) {
      state.list.style.maxHeight = '';
    }
    state.size = null;
  }

  function updateListHeight(targetHeight) {
    if (!state.panel || !state.list || !targetHeight) {
      return;
    }
    const header = state.panel.querySelector('.chatgpt-toc-header');
    const headerHeight = header && header.getBoundingClientRect ? header.getBoundingClientRect().height : 0;
    const styles = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(state.panel) : null;
    const paddingTop = styles ? parseFloat(styles.paddingTop) || 0 : 0;
    const paddingBottom = styles ? parseFloat(styles.paddingBottom) || 0 : 0;
    const available = Math.max(
      120,
      Math.round(targetHeight - headerHeight - paddingTop - paddingBottom - 6)
    );
    state.list.style.maxHeight = `${available}px`;
  }

  function applyPlacement(settings = currentSettings) {
    if (!state.panel) {
      return;
    }
    const normalized = normalizePosition(settings.tableOfContentsPosition);
    if (normalized) {
      setCustomPosition(normalized);
    } else {
      resetPosition();
    }
  }

  function normalizePosition(position) {
    if (!position || typeof position !== 'object' || !state.panel) {
      return null;
    }
    const top = Number(position.top);
    let left = Number(position.left);
    const savedRightGap = Number(position.rightGap);
    if (!Number.isFinite(top)) {
      return null;
    }
    const rect = state.panel.getBoundingClientRect();
    if (Number.isFinite(savedRightGap)) {
      const candidateLeft = window.innerWidth - rect.width - savedRightGap;
      if (Number.isFinite(candidateLeft)) {
        left = candidateLeft;
      }
    }
    if (!Number.isFinite(left)) {
      return null;
    }
    const maxLeft = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - rect.width - TOC_PANEL_MIN_GAP);
    const maxTop = Math.max(TOC_PANEL_MIN_GAP, window.innerHeight - rect.height - TOC_PANEL_MIN_GAP);
    return {
      top: clamp(top, TOC_PANEL_MIN_GAP, maxTop),
      left: clamp(left, TOC_PANEL_MIN_GAP, maxLeft)
    };
  }

  function setCustomPosition(position) {
    if (!state.panel) {
      return;
    }
    state.panel.style.top = `${Math.round(position.top)}px`;
    state.panel.style.left = `${Math.round(position.left)}px`;
    state.panel.style.right = 'auto';
    state.panel.style.bottom = 'auto';
  }

  function resetPosition() {
    if (!state.panel) {
      return;
    }
    state.panel.style.top = '';
    state.panel.style.left = '';
    state.panel.style.right = '';
    state.panel.style.bottom = '';
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
      return min;
    }
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  function toggleCollapsed() {
    if (!state.panel) {
      return;
    }
    const next = !state.panel.classList.contains('is-collapsed');
    setCollapsed(next, true);
  }

  function setCollapsed(collapsed, persist) {
    if (!state.panel) {
      return;
    }
    state.panel.classList.toggle('is-collapsed', collapsed);
    if (state.list) {
      state.list.hidden = collapsed;
    }
    updateCollapseButtonVisual(collapsed);
    if (!collapsed && (state.size || currentSettings.tableOfContentsSize)) {
      applySize(currentSettings);
    }
    if (persist) {
      currentSettings.tableOfContentsCollapsed = collapsed;
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ tableOfContentsCollapsed: collapsed }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            // console.error(chrome.runtime.lastError);
          }
        });
      }
    }
  }

  function applyThemeTokens() {
    if (!state.panel) {
      return;
    }
    if (isCustomThemeActive()) {
      clearThemeTokens();
      return;
    }
    const mode = getChatGPTThemeMode();
    const tokens = mode === 'dark' ? TOC_THEME_TOKEN_PRESETS.dark : TOC_THEME_TOKEN_PRESETS.light;
    Object.entries(tokens).forEach(([name, value]) => {
      state.panel.style.setProperty(name, value);
    });
  }

  function clearThemeTokens() {
    if (!state.panel) {
      return;
    }
    Object.keys(TOC_THEME_TOKEN_PRESETS.dark).forEach((name) => {
      state.panel.style.removeProperty(name);
    });
  }

  function isCustomThemeActive() {
    if (!root) {
      return false;
    }
    return CUSTOM_THEME_CLASSES.some((className) => root.classList.contains(className));
  }

  function enableDragging() {
    if (!state.panel || state.dragHandle) {
      return;
    }
    const handle = state.panel.querySelector('.chatgpt-toc-header');
    if (!handle) {
      return;
    }
    state.dragHandle = handle;
    handle.addEventListener('pointerdown', handlePointerDown);
  }

  function disableDragging() {
    if (state.dragHandle) {
      state.dragHandle.removeEventListener('pointerdown', handlePointerDown);
    }
    state.dragHandle = null;
    cancelDragging();
  }

  function handlePointerDown(event) {
    if (!state.panel) {
      return;
    }
    if (state.collapseButton && event.target instanceof Node && state.collapseButton.contains(event.target)) {
      return;
    }
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }
    event.preventDefault();
    const rect = state.panel.getBoundingClientRect();
    state.dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: rect.left,
      offsetY: rect.top,
      width: rect.width,
      height: rect.height,
      lastLeft: rect.left,
      lastTop: rect.top
    };
    state.panel.classList.add('is-dragging');
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUpOrCancel);
    document.addEventListener('pointercancel', handlePointerUpOrCancel);
  }

  function handlePointerMove(event) {
    if (!state.dragState) {
      return;
    }
    if (typeof state.dragState.pointerId === 'number' && event.pointerId !== state.dragState.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.dragState.startX;
    const deltaY = event.clientY - state.dragState.startY;
    const left = clamp(
      state.dragState.offsetX + deltaX,
      TOC_PANEL_MIN_GAP,
      Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - state.dragState.width - TOC_PANEL_MIN_GAP)
    );
    const top = clamp(
      state.dragState.offsetY + deltaY,
      TOC_PANEL_MIN_GAP,
      Math.max(TOC_PANEL_MIN_GAP, window.innerHeight - state.dragState.height - TOC_PANEL_MIN_GAP)
    );
    state.dragState.lastLeft = left;
    state.dragState.lastTop = top;
    const rightGap = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - state.dragState.width - left);
    setCustomPosition({ top, left });
    currentSettings.tableOfContentsPosition = { top, left, rightGap };
  }

  function handlePointerUpOrCancel(event) {
    if (!state.dragState) {
      return;
    }
    if (typeof state.dragState.pointerId === 'number' && event.pointerId !== state.dragState.pointerId) {
      return;
    }
    const finalPosition = state.dragState.lastTop != null && state.dragState.lastLeft != null
      ? { top: state.dragState.lastTop, left: state.dragState.lastLeft }
      : null;
    cancelDragging();
    if (finalPosition) {
      const rightGap =
        state.dragState && Number.isFinite(state.dragState.width)
          ? Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - state.dragState.width - finalPosition.left)
          : null;
      const position = rightGap != null ? { ...finalPosition, rightGap } : finalPosition;
      savePosition(position);
    }
  }

  function cancelDragging() {
    if (!state.dragState) {
      return;
    }
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUpOrCancel);
    document.removeEventListener('pointercancel', handlePointerUpOrCancel);
    if (state.panel) {
      state.panel.classList.remove('is-dragging');
    }
    state.dragState = null;
  }

  function savePosition(position) {
    currentSettings.tableOfContentsPosition = position;
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      return;
    }
    chrome.storage.sync.set({ tableOfContentsPosition: position }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        // console.error(chrome.runtime.lastError);
      }
    });
  }

  function enableResizing() {
    if (!state.panel || state.resizeHandle) {
      return;
    }
    const handle = document.createElement('div');
    handle.className = 'chatgpt-toc-resizer';
    handle.title = 'Drag to resize the panel';
    handle.addEventListener('pointerdown', handleResizePointerDown);
    state.panel.appendChild(handle);
    state.resizeHandle = handle;
  }

  function disableResizing() {
    if (state.resizeHandle) {
      state.resizeHandle.removeEventListener('pointerdown', handleResizePointerDown);
      if (state.resizeHandle.parentNode) {
        state.resizeHandle.parentNode.removeChild(state.resizeHandle);
      }
    }
    state.resizeHandle = null;
    cancelResizing();
  }

  function handleResizePointerDown(event) {
    if (!state.panel || (event.button !== 0 && event.pointerType !== 'touch')) {
      return;
    }
    event.preventDefault();
    const rect = state.panel.getBoundingClientRect();
    state.resizeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      top: rect.top,
      left: rect.left
    };
    state.panel.classList.add('is-resizing');
    document.addEventListener('pointermove', handleResizePointerMove);
    document.addEventListener('pointerup', handleResizePointerUpOrCancel);
    document.addEventListener('pointercancel', handleResizePointerUpOrCancel);
  }

  function handleResizePointerMove(event) {
    if (!state.resizeState) {
      return;
    }
    if (typeof state.resizeState.pointerId === 'number' && event.pointerId !== state.resizeState.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.resizeState.startX;
    const deltaY = event.clientY - state.resizeState.startY;
    const plannedWidth = state.resizeState.startWidth + deltaX;
    const plannedHeight = state.resizeState.startHeight + deltaY;
    const maxWidth = Math.min(
      TOC_PANEL_MAX_WIDTH,
      Math.max(TOC_PANEL_MIN_WIDTH, window.innerWidth - state.resizeState.left - TOC_PANEL_MIN_GAP)
    );
    const maxHeight = Math.min(
      TOC_PANEL_MAX_HEIGHT,
      Math.max(TOC_PANEL_MIN_HEIGHT, window.innerHeight - state.resizeState.top - TOC_PANEL_MIN_GAP)
    );
    const width = clamp(plannedWidth, TOC_PANEL_MIN_WIDTH, maxWidth);
    const height = clamp(plannedHeight, TOC_PANEL_MIN_HEIGHT, maxHeight);
    setCustomSize({ width, height });
  }

  function handleResizePointerUpOrCancel(event) {
    if (!state.resizeState) {
      return;
    }
    if (typeof state.resizeState.pointerId === 'number' && event.pointerId !== state.resizeState.pointerId) {
      return;
    }
    const finalSize = state.size;
    cancelResizing();
    if (finalSize) {
      saveSize(finalSize);
      if (currentSettings.tableOfContentsPosition && state.panel) {
        const rect = state.panel.getBoundingClientRect();
        const rightGap = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - rect.width - rect.left);
        savePosition({ ...currentSettings.tableOfContentsPosition, top: rect.top, left: rect.left, rightGap });
      }
    }
  }

  function cancelResizing() {
    if (!state.resizeState) {
      return;
    }
    document.removeEventListener('pointermove', handleResizePointerMove);
    document.removeEventListener('pointerup', handleResizePointerUpOrCancel);
    document.removeEventListener('pointercancel', handleResizePointerUpOrCancel);
    if (state.panel) {
      state.panel.classList.remove('is-resizing');
    }
    state.resizeState = null;
  }

  function saveSize(size) {
    currentSettings.tableOfContentsSize = size;
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      return;
    }
    chrome.storage.sync.set({ tableOfContentsSize: size }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        // console.error(chrome.runtime.lastError);
      }
    });
  }

  function updatePanelDirection() {
    if (!state.panel) {
      return;
    }
    const content = state.list && state.list.textContent ? state.list.textContent : '';
    const isRtl = TOC_RTL_CHAR_REGEX.test(content);
    state.isRtlPanel = isRtl;
    const dir = isRtl ? 'rtl' : 'ltr';
    if (state.panel.getAttribute('dir') !== dir) {
      state.panel.setAttribute('dir', dir);
    }
    state.panel.classList.toggle('is-rtl', isRtl);
    state.panel.setAttribute('aria-label', isRtl ? 'فهرست مطالب' : 'Conversation outline');
    if (state.heading) {
      state.heading.textContent = isRtl ? 'فهرست مطالب' : 'Table of contents';
    }
    updateCollapseButtonVisual(Boolean(currentSettings?.tableOfContentsCollapsed));
  }

  function rebuildList() {
    if (!isActive() || !state.list) {
      return;
    }
    const assistantMessages = collectAssistantMessages();
    state.list.innerHTML = '';
    if (!assistantMessages.length) {
      const empty = document.createElement('li');
      empty.className = 'chatgpt-toc-empty';
      empty.textContent = 'No assistant replies yet.';
      state.list.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      assistantMessages.forEach((message, index) => {
        const anchorId = ensureMessageAnchorId(message);
        if (!anchorId) {
          return;
        }
        const title = deriveTitle(message, index);
        const item = document.createElement('li');
        item.className = 'chatgpt-toc-item';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chatgpt-toc-entry';
        button.dataset.tocTarget = anchorId;
        button.textContent = title;
        item.appendChild(button);
        fragment.appendChild(item);
      });
      state.list.appendChild(fragment);
    }
    updatePanelDirection();
    if (state.size || currentSettings.tableOfContentsSize) {
      applySize(currentSettings);
    }
  }

  function updateCollapseButtonVisual(collapsed) {
    if (!state.collapseButton) {
      return;
    }
    state.collapseButton.setAttribute('aria-pressed', String(collapsed));
    state.collapseButton.setAttribute('aria-label', collapsed ? 'Expand outline' : 'Collapse outline');
    state.collapseButton.textContent = collapsed ? '+' : '–';
    state.collapseButton.dir = 'ltr';
  }

  function collectAssistantMessages() {
    const nodes = document.querySelectorAll(MESSAGE_SELECTOR);
    if (!nodes || !nodes.length) {
      return [];
    }
    return Array.from(nodes).filter((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }
      const role = node.getAttribute('data-message-author-role') || (node.dataset ? node.dataset.messageAuthorRole : null);
      return role === 'assistant';
    });
  }

  function deriveTitle(message, index) {
    const heading = pluckHeading(message);
    if (heading) {
      return heading;
    }
    const snippet = extractSnippet(message);
    if (snippet) {
      return snippet;
    }
    return `Response ${index + 1}`;
  }

  function pluckHeading(message) {
    if (!(message instanceof HTMLElement)) {
      return '';
    }
    const markdown = message.querySelector('.markdown');
    if (!markdown) {
      return '';
    }
    const heading = markdown.querySelector('h1, h2, h3, h4, h5, h6');
    if (!heading || !heading.textContent) {
      return '';
    }
    return formatTitle(heading.textContent);
  }

  function extractSnippet(message) {
    if (!(message instanceof HTMLElement)) {
      return '';
    }
    const markdown = message.querySelector('.markdown');
    const target = markdown || message;
    const raw = target && target.textContent ? target.textContent : '';
    if (!raw) {
      return '';
    }
    const firstLine = raw
      .split('\n')
      .map((line) => line.trim())
      .find((line) => Boolean(line));
    if (!firstLine) {
      return '';
    }
    return formatTitle(firstLine);
  }

  function formatTitle(text) {
    if (!text) {
      return '';
    }
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    let candidate = normalized;
    const clauseMatch = candidate.match(/^[^.!?]+/);
    if (clauseMatch && clauseMatch[0].length >= 24) {
      candidate = clauseMatch[0];
    }
    const words = candidate.split(' ').filter(Boolean);
    if (words.length > TOC_MAX_TITLE_WORDS) {
      candidate = words.slice(0, TOC_MAX_TITLE_WORDS).join(' ');
    }
    if (candidate.length > TOC_MAX_TITLE_LENGTH) {
      candidate = candidate.slice(0, TOC_MAX_TITLE_LENGTH - 1).trim();
    }
    if (candidate.length < normalized.length) {
      candidate = candidate.replace(/[.,;:!?-]+$/, '').trim();
      if (candidate && !candidate.endsWith('...')) {
        candidate = `${candidate}...`;
      }
    }
    return candidate || normalized.slice(0, TOC_MAX_TITLE_LENGTH);
  }

  function ensureMessageAnchorId(message) {
    if (!(message instanceof HTMLElement)) {
      return '';
    }
    const existing = message.getAttribute(TOC_ANCHOR_ATTR);
    if (existing) {
      return existing;
    }
    state.anchorCounter += 1;
    const identifier = `chatgpt-toc-${Date.now().toString(36)}-${state.anchorCounter}`;
    message.setAttribute(TOC_ANCHOR_ATTR, identifier);
    return identifier;
  }

  function handleClick(event) {
    const target = event.target instanceof HTMLElement ? event.target.closest('.chatgpt-toc-entry') : null;
    if (!target) {
      return;
    }
    const anchorId = target.dataset ? target.dataset.tocTarget : null;
    if (!anchorId) {
      return;
    }
    const selector = `[${TOC_ANCHOR_ATTR}="${escapeAttribute(anchorId)}"]`;
    const message = document.querySelector(selector);
    if (!message) {
      return;
    }
    event.preventDefault();
    scrollIntoView(message);
    highlight(message);
    if (event.detail && typeof target.blur === 'function') {
      target.blur();
    }
  }

  function escapeAttribute(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/["\\\]\[]/g, '\\$&');
  }

  function scrollIntoView(element) {
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } catch (error) {
      element.scrollIntoView(true);
    }
  }

  function resolveHighlightColor() {
    if (!root) {
      return null;
    }
    return isCustomThemeActive() ? null : TOC_ORIGINAL_HIGHLIGHT_COLOR;
  }

  function highlight(element) {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    const existingTimer = state.highlightTimers.get(element);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    element.classList.remove('chatgpt-toc-highlight-active');
    element.style.removeProperty('--toc-highlight-color');
    void element.offsetWidth;
    const highlightColor = resolveHighlightColor();
    if (highlightColor) {
      element.style.setProperty('--toc-highlight-color', highlightColor);
    }
    element.classList.add('chatgpt-toc-highlight-active');
    element.setAttribute('data-chatgpt-toc-highlighted', 'true');
    const timer = setTimeout(() => {
      element.classList.remove('chatgpt-toc-highlight-active');
      element.removeAttribute('data-chatgpt-toc-highlighted');
      element.style.removeProperty('--toc-highlight-color');
      state.highlightTimers.delete(element);
    }, TOC_HIGHLIGHT_DURATION_MS);
    state.highlightTimers.set(element, timer);
  }

  function handleResize() {
    if (!isActive() || !state.panel) {
      return;
    }
    applySize(currentSettings);
    if (currentSettings.tableOfContentsPosition) {
      applyPlacement(currentSettings);
    }
  }

  return {
    applyThemeTokens,
    handleResize,
    isActive,
    sync
  };
})();

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

function collectLanguageSample(limitMessages, limitChars) {
  const container = document.querySelector('main') || document.body;
  if (!container) {
    return '';
  }
  const nodes = container.querySelectorAll(MESSAGE_SELECTOR);
  if (!nodes || !nodes.length) {
    return '';
  }
  const maxMessages = Math.max(1, Math.min(Number.isFinite(limitMessages) ? Math.floor(limitMessages) : 0, 20));
  const maxChars = Math.max(32, Math.min(Number.isFinite(limitChars) ? Math.floor(limitChars) : 0, 4000));
  let collected = '';
  let inspected = 0;
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    const raw = node.textContent;
    if (!raw) {
      continue;
    }
    const normalized = raw.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      continue;
    }
    const remaining = maxChars - collected.length;
    if (remaining <= 0) {
      break;
    }
    collected += normalized.slice(0, remaining);
    inspected += 1;
    if (collected.length >= maxChars || inspected >= maxMessages) {
      break;
    }
  }
  return collected;
}

function detectConversationLanguageHint(maxMessages, maxChars) {
  const sample = collectLanguageSample(maxMessages, maxChars);
  const signature = sample.slice(0, 64);
  const now = Date.now();
  if (
    signature === lastLanguageHintCache.signature &&
    now - lastLanguageHintCache.timestamp < LANGUAGE_DETECTION_CACHE_INTERVAL
  ) {
    return {
      language: lastLanguageHintCache.value,
      sampledCharacters: lastLanguageHintCache.sampleLength
    };
  }
  const hasPersian = Boolean(sample) && PERSIAN_CHAR_REGEX.test(sample);
  const language = hasPersian ? 'persian' : LANGUAGE_HINT_DEFAULT;
  lastLanguageHintCache = {
    value: language,
    signature,
    timestamp: now,
    sampleLength: sample.length
  };
  return {
    language,
    sampledCharacters: sample.length
  };
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
    // console.error('Failed to copy equation', error);
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

if (typeof window !== 'undefined') {
  window.addEventListener('resize', tableOfContents.handleResize);
}

if (chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') {
      return;
    }
    if (message.type === LANGUAGE_HINT_MESSAGE_TYPE) {
      const maxMessages =
        typeof message.maxMessages === 'number' ? message.maxMessages : LANGUAGE_DETECTION_MAX_MESSAGES;
      const maxChars =
        typeof message.maxChars === 'number' ? message.maxChars : LANGUAGE_DETECTION_MAX_CHARS;
      const result = detectConversationLanguageHint(maxMessages, maxChars);
      sendResponse({
        ok: true,
        language: result.language,
        sampledCharacters: result.sampledCharacters
      });
    }
  });
}

// chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
//   if (message && message.type === 'GPT_INJECT_PROMPT') {
//     const textArea = document.getElementById('prompt-textarea');
//     if (textArea && textArea instanceof HTMLTextAreaElement) {
//       textArea.value = typeof message.text === 'string' ? message.text : '';
//       textArea.focus();
//       textArea.dispatchEvent(new Event('input', { bubbles: true }));
//       textArea.style.height = 'auto';
//       textArea.style.height = `${textArea.scrollHeight}px`;
//       sendResponse({ ok: true });
//     } else {
//       sendResponse({ ok: false });
//     }
//     return false;
//   }
//   return false;
// });
