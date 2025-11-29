import { DEFAULT_SETTINGS, FONT_STACKS } from '../../common/config.js';

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

const root = document.documentElement;
let messageSelector = '*';
const FONT_VARIABLES = ['--font-body'];
const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
let fontImportStyle = null;
let fontObserver = null;
let fontObserverReconnectTimer = null;
let fontSyncIntervalId = null;
let pendingFontSync = false;
const FONT_SYNC_INTERVAL_MS = 5000;
let cachedSettings = { ...DEFAULT_SETTINGS };

export function isActive(settings = cachedSettings) {
  return Boolean(settings && settings.enableFix && settings.fontsEnabled);
}

export function clearGlobalFontVariables(fontVariables) {
  if (!root) {
    return;
  }
  fontVariables.forEach((variable) => {
    root.style.removeProperty(variable);
  });
}

function setGlobalFontVariables(font, fontVariables = FONT_VARIABLES) {
  if (!root || !font) {
    return;
  }
  fontVariables.forEach((variable) => {
    root.style.setProperty(variable, font);
  });
}

export function resetMessageFontClasses(selector, fontVariables) {
  document.querySelectorAll(selector).forEach((message) => {
    if (message instanceof HTMLElement) {
      message.classList.remove('chatgpt-font-persian');
      message.classList.remove('chatgpt-font-message');
      message.style.removeProperty('--chatgpt-font-message-english');
      message.style.removeProperty('--chatgpt-font-message-persian');
      fontVariables.forEach((variable) => {
        message.style.removeProperty(variable);
      });
    }
  });
}

export function applyFontsToMessage(element, englishFont, persianFont, options = {}) {
  const { fontVariables = FONT_VARIABLES, persianRegex = PERSIAN_CHAR_REGEX } = options;
  if (!(element instanceof HTMLElement)) {
    return;
  }
  if (!isActive()) {
    return;
  }
  element.classList.add('chatgpt-font-message');
  const textContent = element.textContent || '';
  const hasPersian = persianRegex.test(textContent);
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
    fontVariables.forEach((variable) => {
      element.style.setProperty(variable, targetFont);
    });
  } else {
    fontVariables.forEach((variable) => {
      element.style.removeProperty(variable);
    });
  }
}

export function handleFontMutations(mutations, hooks) {
  const isEnabled = hooks && typeof hooks.isFontControlActive === 'function' ? hooks.isFontControlActive() : isActive();
  if (!isEnabled) {
    return;
  }
  const englishFont = root ? root.style.getPropertyValue('--chatgpt-font-english') : null;
  const persianFont = root ? root.style.getPropertyValue('--chatgpt-font-persian') : null;
  const messagesToUpdate = new Set();
  let shouldRescan = false;

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => hooks.collectMessageElements(node, messagesToUpdate));
      shouldRescan = shouldRescan || mutation.addedNodes.length > 0;
    } else if (mutation.type === 'characterData') {
      const parent = mutation.target && mutation.target.parentElement;
      if (parent) {
        const message = parent.closest(hooks.messageSelector || messageSelector || '*');
        if (message) {
          messagesToUpdate.add(message);
        }
      }
    }
  }

  if (messagesToUpdate.size) {
    messagesToUpdate.forEach((message) => hooks.applyFontsToMessage(message, englishFont, persianFont));
  }

  if (shouldRescan && hooks.scheduleFontSync) {
    hooks.scheduleFontSync();
  }
}

export function scheduleFontSync(callback) {
  if (pendingFontSync || !isActive()) {
    return;
  }
  pendingFontSync = true;
  const invoke = () => {
    pendingFontSync = false;
    if (!isActive()) {
      return;
    }
    callback();
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(invoke);
  } else {
    setTimeout(invoke, 16);
  }
}

export function setMessageSelector(selector) {
  messageSelector = selector || '*';
}

export function apply(settings) {
  cachedSettings = { ...cachedSettings, ...(settings || {}) };
  if (!root) {
    return;
  }
  const enabled = isActive(cachedSettings);
  root.classList.toggle('chatgpt-font-control-enabled', enabled);
  if (!enabled) {
    root.style.removeProperty('--chatgpt-font-english');
    root.style.removeProperty('--chatgpt-font-persian');
    clearGlobalFontVariables(FONT_VARIABLES);
    disconnectFontObserver();
    resetMessageFontClasses(messageSelector, FONT_VARIABLES);
    stopFontSyncInterval();
    return;
  }

  ensureFontImports();

  const englishKey = cachedSettings.fontEnglish || DEFAULT_SETTINGS.fontEnglish;
  const persianKey = cachedSettings.fontPersian || DEFAULT_SETTINGS.fontPersian;
  const englishFont = FONT_STACKS.english[englishKey] || FONT_STACKS.english[DEFAULT_SETTINGS.fontEnglish];
  const persianFont = FONT_STACKS.persian[persianKey] || FONT_STACKS.persian[DEFAULT_SETTINGS.fontPersian];

  setGlobalFontVariables(englishFont);
  root.style.setProperty('--chatgpt-font-english', englishFont);
  root.style.setProperty('--chatgpt-font-persian', persianFont);

  updateFontsForExistingMessages();
  scheduleFontSync(updateFontsForExistingMessages);
  connectFontObserver();
  startFontSyncInterval();
}

export function update(changes) {
  if (!changes) {
    return;
  }
  const next = { ...cachedSettings };
  ['enableFix', 'fontsEnabled', 'fontEnglish', 'fontPersian'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(changes, key) && changes[key]) {
      next[key] = changes[key].newValue;
    }
  });
  apply(next);
}

export const FontManager = {
  init(settings) {
    apply(settings);
  },
  update(changes) {
    update(changes);
  },
  apply,
  isActive,
  handleFontMutations,
  scheduleFontSync,
  resetMessageFontClasses,
  applyFontsToMessage,
  clearGlobalFontVariables,
  setMessageSelector
};

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
    if (isActive()) {
      fontObserverReconnectTimer = setTimeout(connectFontObserver, 500);
    }
    return;
  }
  if (!fontObserver) {
    fontObserver = new MutationObserver((mutations) => handleFontMutations(mutations, { collectMessageElements, applyFontsToMessage }));
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
  if (fontSyncIntervalId || !isActive()) {
    return;
  }
  fontSyncIntervalId = setInterval(() => {
    if (!isActive()) {
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

function updateFontsForExistingMessages() {
  if (!isActive()) {
    return;
  }
  const englishFont = root ? root.style.getPropertyValue('--chatgpt-font-english') : null;
  const persianFont = root ? root.style.getPropertyValue('--chatgpt-font-persian') : null;
  document.querySelectorAll(messageSelector || '*').forEach((message) => {
    applyFontsToMessage(message, englishFont, persianFont);
  });
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
    if (element.matches && element.matches('*')) {
      bucket.add(element);
    }
    if (element.querySelectorAll) {
      element.querySelectorAll('*').forEach((found) => bucket.add(found));
    }
  }
}
