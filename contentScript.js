const DEFAULT_SETTINGS = {
  enableFix: true,
  fixKatex: true,
  fixCode: true,
  fixTables: true,
  copyKatex: true,
  tableOfContents: false,
  tableOfContentsPosition: null,
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
const TOC_PANEL_ID = 'chatgpt-enhancer-toc-panel';
const TOC_ENTRY_ATTR = 'data-chatgpt-toc-target';
const TOC_ANCHOR_ATTR = 'data-chatgpt-toc-id';
const TOC_UPDATE_DEBOUNCE_MS = 200;
const TOC_HIGHLIGHT_DURATION_MS = 1600;
const TOC_MAX_TITLE_LENGTH = 120;
const TOC_MAX_TITLE_WORDS = 12;
const TOC_PANEL_MIN_GAP = 12;
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
let tocPanel = null;
let tocListElement = null;
let tocObserver = null;
let tocUpdateTimer = null;
let tocAnchorCounter = 0;
const tocHighlightTimers = new Map();
let tocDragHandle = null;
let tocDragState = null;
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
  syncTableOfContentsState();
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
    applyTableOfContentsThemeTokens();
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
  applyTableOfContentsThemeTokens();
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

function tableOfContentsIsActive() {
  return Boolean(currentSettings.enableFix && currentSettings.tableOfContents);
}

function syncTableOfContentsState() {
  if (!tableOfContentsIsActive()) {
    teardownTableOfContentsPanel();
    disconnectTableOfContentsObserver();
    cancelTableOfContentsUpdate();
    return;
  }
  ensureTableOfContentsPanel();
  applyTableOfContentsPlacement();
  applyTableOfContentsThemeTokens();
  connectTableOfContentsObserver();
  scheduleTableOfContentsUpdate();
}

function ensureTableOfContentsPanel() {
  if (!document || !document.body) {
    return;
  }
  if (tocPanel && tocPanel.isConnected) {
    return;
  }
  tocPanel = document.createElement('aside');
  tocPanel.id = TOC_PANEL_ID;
  tocPanel.className = 'chatgpt-toc-panel';
  tocPanel.setAttribute('role', 'complementary');
  tocPanel.setAttribute('aria-label', 'Conversation outline');

  const header = document.createElement('div');
  header.className = 'chatgpt-toc-header';
  header.textContent = 'Table of contents';
  header.title = 'Drag to reposition the panel';

  tocListElement = document.createElement('ol');
  tocListElement.className = 'chatgpt-toc-list';

  tocPanel.appendChild(header);
  tocPanel.appendChild(tocListElement);
  tocPanel.addEventListener('click', handleTableOfContentsClick);
  document.body.appendChild(tocPanel);
  enableTableOfContentsDragging();
  applyTableOfContentsThemeTokens();
}

function teardownTableOfContentsPanel() {
  disableTableOfContentsDragging();
  if (tocPanel) {
    tocPanel.removeEventListener('click', handleTableOfContentsClick);
    if (tocPanel.parentNode) {
      tocPanel.parentNode.removeChild(tocPanel);
    }
    clearTableOfContentsThemeTokens();
  }
  tocPanel = null;
  tocListElement = null;
  tocHighlightTimers.forEach((timer, element) => {
    clearTimeout(timer);
    if (element && element.classList) {
      element.classList.remove('chatgpt-toc-highlight');
    }
  });
  tocHighlightTimers.clear();
}

function connectTableOfContentsObserver() {
  if (!tableOfContentsIsActive()) {
    return;
  }
  const container = document.querySelector('main') || document.body || document.documentElement;
  if (!container) {
    return;
  }
  if (!tocObserver) {
    tocObserver = new MutationObserver(handleTableOfContentsMutations);
  }
  tocObserver.disconnect();
  tocObserver.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function disconnectTableOfContentsObserver() {
  if (tocObserver) {
    tocObserver.disconnect();
  }
}

function handleTableOfContentsMutations(mutations) {
  if (!tableOfContentsIsActive()) {
    return;
  }
  const shouldUpdate = mutations.some((mutation) => {
    if (mutation.type === 'childList') {
      return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
    }
    return mutation.type === 'characterData';
  });
  if (shouldUpdate) {
    scheduleTableOfContentsUpdate();
  }
}

function scheduleTableOfContentsUpdate() {
  if (!tableOfContentsIsActive()) {
    return;
  }
  if (tocUpdateTimer) {
    clearTimeout(tocUpdateTimer);
  }
  tocUpdateTimer = setTimeout(() => {
    tocUpdateTimer = null;
    rebuildTableOfContents();
  }, TOC_UPDATE_DEBOUNCE_MS);
}

function cancelTableOfContentsUpdate() {
  if (tocUpdateTimer) {
    clearTimeout(tocUpdateTimer);
    tocUpdateTimer = null;
  }
}

function applyTableOfContentsPlacement() {
  if (!tocPanel) {
    return;
  }
  const normalized = normalizeTableOfContentsPosition(currentSettings.tableOfContentsPosition);
  if (normalized) {
    setTocPanelCustomPosition(normalized);
  } else {
    resetTocPanelPosition();
  }
}

function normalizeTableOfContentsPosition(position) {
  if (!position || typeof position !== 'object' || !tocPanel) {
    return null;
  }
  const top = Number(position.top);
  const left = Number(position.left);
  if (!Number.isFinite(top) || !Number.isFinite(left)) {
    return null;
  }
  const rect = tocPanel.getBoundingClientRect();
  const maxLeft = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - rect.width - TOC_PANEL_MIN_GAP);
  const maxTop = Math.max(TOC_PANEL_MIN_GAP, window.innerHeight - rect.height - TOC_PANEL_MIN_GAP);
  return {
    top: clamp(top, TOC_PANEL_MIN_GAP, maxTop),
    left: clamp(left, TOC_PANEL_MIN_GAP, maxLeft)
  };
}

function setTocPanelCustomPosition(position) {
  if (!tocPanel) {
    return;
  }
  tocPanel.style.top = `${Math.round(position.top)}px`;
  tocPanel.style.left = `${Math.round(position.left)}px`;
  tocPanel.style.right = 'auto';
  tocPanel.style.bottom = 'auto';
}

function resetTocPanelPosition() {
  if (!tocPanel) {
    return;
  }
  tocPanel.style.top = '';
  tocPanel.style.left = '';
  tocPanel.style.right = '';
  tocPanel.style.bottom = '';
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

function applyTableOfContentsThemeTokens() {
  if (!tocPanel) {
    return;
  }
  if (isCustomThemeActive()) {
    clearTableOfContentsThemeTokens();
    return;
  }
  const mode = getChatGPTThemeMode();
  const tokens = mode === 'dark' ? TOC_THEME_TOKEN_PRESETS.dark : TOC_THEME_TOKEN_PRESETS.light;
  Object.entries(tokens).forEach(([name, value]) => {
    tocPanel.style.setProperty(name, value);
  });
}

function clearTableOfContentsThemeTokens() {
  if (!tocPanel) {
    return;
  }
  Object.keys(TOC_THEME_TOKEN_PRESETS.dark).forEach((name) => {
    tocPanel.style.removeProperty(name);
  });
}

function isCustomThemeActive() {
  if (!root) {
    return false;
  }
  return CUSTOM_THEME_CLASSES.some((className) => root.classList.contains(className));
}

function enableTableOfContentsDragging() {
  if (!tocPanel || tocDragHandle) {
    return;
  }
  const handle = tocPanel.querySelector('.chatgpt-toc-header');
  if (!handle) {
    return;
  }
  tocDragHandle = handle;
  handle.addEventListener('pointerdown', handleTocPointerDown);
}

function disableTableOfContentsDragging() {
  if (tocDragHandle) {
    tocDragHandle.removeEventListener('pointerdown', handleTocPointerDown);
    tocDragHandle = null;
  }
  cancelTocDragging();
}

function handleTocPointerDown(event) {
  if (!tocPanel) {
    return;
  }
  if (event.button !== 0 && event.pointerType !== 'touch') {
    return;
  }
  event.preventDefault();
  const rect = tocPanel.getBoundingClientRect();
  tocDragState = {
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
  tocPanel.classList.add('is-dragging');
  document.addEventListener('pointermove', handleTocPointerMove);
  document.addEventListener('pointerup', handleTocPointerUpOrCancel);
  document.addEventListener('pointercancel', handleTocPointerUpOrCancel);
}

function handleTocPointerMove(event) {
  if (!tocDragState) {
    return;
  }
  if (typeof tocDragState.pointerId === 'number' && event.pointerId !== tocDragState.pointerId) {
    return;
  }
  const deltaX = event.clientX - tocDragState.startX;
  const deltaY = event.clientY - tocDragState.startY;
  const left = clamp(
    tocDragState.offsetX + deltaX,
    TOC_PANEL_MIN_GAP,
    Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - tocDragState.width - TOC_PANEL_MIN_GAP)
  );
  const top = clamp(
    tocDragState.offsetY + deltaY,
    TOC_PANEL_MIN_GAP,
    Math.max(TOC_PANEL_MIN_GAP, window.innerHeight - tocDragState.height - TOC_PANEL_MIN_GAP)
  );
  tocDragState.lastLeft = left;
  tocDragState.lastTop = top;
  setTocPanelCustomPosition({ top, left });
  currentSettings.tableOfContentsPosition = { top, left };
}

function handleTocPointerUpOrCancel(event) {
  if (!tocDragState) {
    return;
  }
  if (typeof tocDragState.pointerId === 'number' && event.pointerId !== tocDragState.pointerId) {
    return;
  }
  const finalPosition = tocDragState.lastTop != null && tocDragState.lastLeft != null
    ? { top: tocDragState.lastTop, left: tocDragState.lastLeft }
    : null;
  cancelTocDragging();
  if (finalPosition) {
    saveTableOfContentsPosition(finalPosition);
  }
}

function cancelTocDragging() {
  if (!tocDragState) {
    return;
  }
  document.removeEventListener('pointermove', handleTocPointerMove);
  document.removeEventListener('pointerup', handleTocPointerUpOrCancel);
  document.removeEventListener('pointercancel', handleTocPointerUpOrCancel);
  if (tocPanel) {
    tocPanel.classList.remove('is-dragging');
  }
  tocDragState = null;
}

function saveTableOfContentsPosition(position) {
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

function rebuildTableOfContents() {
  if (!tableOfContentsIsActive() || !tocListElement) {
    return;
  }
  const assistantMessages = collectAssistantMessages();
  tocListElement.innerHTML = '';
  if (!assistantMessages.length) {
    const empty = document.createElement('li');
    empty.className = 'chatgpt-toc-empty';
    empty.textContent = 'No assistant replies yet.';
    tocListElement.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  assistantMessages.forEach((message, index) => {
    const anchorId = ensureMessageAnchorId(message);
    if (!anchorId) {
      return;
    }
    const title = deriveTocTitle(message, index);
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
  tocListElement.appendChild(fragment);
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

function deriveTocTitle(message, index) {
  const heading = pluckHeadingText(message);
  if (heading) {
    return heading;
  }
  const snippet = extractMessageSnippet(message);
  if (snippet) {
    return snippet;
  }
  return `Response ${index + 1}`;
}

function pluckHeadingText(message) {
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
  return formatTocTitle(heading.textContent);
}

function extractMessageSnippet(message) {
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
  return formatTocTitle(firstLine);
}

function formatTocTitle(text) {
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
  tocAnchorCounter += 1;
  const identifier = `chatgpt-toc-${Date.now().toString(36)}-${tocAnchorCounter}`;
  message.setAttribute(TOC_ANCHOR_ATTR, identifier);
  return identifier;
}

function handleTableOfContentsClick(event) {
  const target = event.target instanceof HTMLElement ? event.target.closest('.chatgpt-toc-entry') : null;
  if (!target) {
    return;
  }
  const anchorId = target.dataset ? target.dataset.tocTarget : null;
  if (!anchorId) {
    return;
  }
  const selector = `[${TOC_ANCHOR_ATTR}="${escapeCssAttributeValue(anchorId)}"]`;
  const message = document.querySelector(selector);
  if (!message) {
    return;
  }
  event.preventDefault();
  scrollMessageIntoView(message);
  highlightMessage(message);
}

function escapeCssAttributeValue(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\\]\[]/g, '\\$&');
}

function scrollMessageIntoView(element) {
  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  } catch (error) {
    element.scrollIntoView(true);
  }
}

function highlightMessage(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  const existingTimer = tocHighlightTimers.get(element);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  element.classList.add('chatgpt-toc-highlight');
  const timer = setTimeout(() => {
    element.classList.remove('chatgpt-toc-highlight');
    tocHighlightTimers.delete(element);
  }, TOC_HIGHLIGHT_DURATION_MS);
  tocHighlightTimers.set(element, timer);
}

function handleTableOfContentsResize() {
  if (!tableOfContentsIsActive() || !tocPanel) {
    return;
  }
  if (!currentSettings.tableOfContentsPosition) {
    return;
  }
  applyTableOfContentsPlacement();
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
  window.addEventListener('resize', handleTableOfContentsResize);
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
