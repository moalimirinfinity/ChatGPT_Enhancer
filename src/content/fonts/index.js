/**
 * Handles injection and application of custom fonts for English and Persian text.
 */
import { DEFAULT_SETTINGS, FONT_STACKS } from '../../common/config.js';

const root = document.documentElement;
let messageSelector = '*';
const FONT_VARIABLES = ['--font-body'];
const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_CHAR_REGEX = /[A-Za-z\u00C0-\u024F]/g;
let fontImportStyle = null;
let fontObserver = null;
let fontObserverReconnectTimer = null;
let pendingFontSync = false;
let fontSyncInterval = null;
let cachedSettings = { ...DEFAULT_SETTINGS };
const FONT_FACE_DEFINITIONS = [
  { family: 'Inter', path: 'assets/fonts/Inter-Variable-latin.woff2', weight: '100 900' },
  { family: 'Source Sans 3', path: 'assets/fonts/SourceSans3-Variable-latin.woff2', weight: '200 900' },
  { family: 'Roboto', path: 'assets/fonts/Roboto-Variable-latin.woff2', weight: '100 900' },
  { family: 'Noto Sans', path: 'assets/fonts/NotoSans-Variable-latin.woff2', weight: '100 900' },
  { family: 'Work Sans', path: 'assets/fonts/WorkSans-Variable-latin.woff2', weight: '200 800' },
  { family: 'Vazirmatn', path: 'assets/fonts/Vazirmatn-VF.woff2', weight: '100 900' },
  { family: 'Noto Sans Arabic', path: 'assets/fonts/NotoSansArabic-400-600.woff2', weight: '400 600' },
  { family: 'Noto Naskh Arabic', path: 'assets/fonts/NotoNaskhArabic-400-600.woff2', weight: '400 600' },
  { family: 'Sahel', path: 'assets/fonts/Sahel-Regular.woff2', weight: '400' },
  { family: 'Sahel', path: 'assets/fonts/Sahel-Bold.woff2', weight: '700' },
  { family: 'Shabnam', path: 'assets/fonts/Shabnam-Regular.woff2', weight: '400' },
  { family: 'Shabnam', path: 'assets/fonts/Shabnam-Bold.woff2', weight: '700' }
];

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
  const hasPersian = isPersianDominant(textContent, persianRegex);
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

  resetCodeBlocksToMonospace(element);
}

export function handleFontMutations(mutations, hooks) {
  const isEnabled = hooks && typeof hooks.isFontControlActive === 'function' ? hooks.isFontControlActive() : isActive();
  if (!isEnabled) {
    return;
  }
  const englishFont = root ? root.style.getPropertyValue('--chatgpt-font-english') : null;
  const persianFont = root ? root.style.getPropertyValue('--chatgpt-font-persian') : null;
  const messagesToUpdate = new Set();

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) =>
        collectMessageCandidates(node, messagesToUpdate, hooks.messageSelector || messageSelector)
      );
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

function stopFontSyncInterval() {
  if (fontSyncInterval) {
    clearInterval(fontSyncInterval);
    fontSyncInterval = null;
  }
  pendingFontSync = false;
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
  connectFontObserver();
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
  resetMessageFontClasses,
  applyFontsToMessage,
  clearGlobalFontVariables,
  setMessageSelector
};

function ensureFontImports() {
  if (fontImportStyle || !document.head) {
    return;
  }
  const rules = FONT_FACE_DEFINITIONS.map((definition) => {
    const url = resolveRuntimeUrl(definition.path);
    if (!url) {
      return '';
    }
    return `
@font-face {
  font-family: "${definition.family}";
  font-style: normal;
  font-weight: ${definition.weight};
  font-display: swap;
  src: url("${url}") format("woff2");
}
`;
  }).filter(Boolean).join('\n');
  if (!rules) {
    return;
  }
  fontImportStyle = document.createElement('style');
  fontImportStyle.textContent = rules;
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
  collectMessageCandidates(node, bucket, messageSelector);
}

function collectMessageCandidates(node, bucket, selector) {
  if (!node || !bucket || !selector) {
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node;
    if (element.matches(selector)) {
      bucket.add(element);
    }
    element.querySelectorAll(selector).forEach((match) => bucket.add(match));
  } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    node.childNodes.forEach((child) => collectMessageCandidates(child, bucket, selector));
  }
}

function isPersianDominant(text, regex) {
  if (!text) {
    return false;
  }
  const persianMatches = text.match(regex);
  const latinMatches = text.match(LATIN_CHAR_REGEX);
  const persianCount = persianMatches ? persianMatches.length : 0;
  const latinCount = latinMatches ? latinMatches.length : 0;
  if (persianCount === 0 && latinCount === 0) {
    return false;
  }
  return persianCount > latinCount;
}

function resetCodeBlocksToMonospace(message) {
  if (!(message instanceof HTMLElement)) {
    return;
  }
  const monospace = '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace';
  const codeNodes = message.querySelectorAll('pre, code');
  codeNodes.forEach((node) => {
    if (node && node.style) {
      node.style.setProperty('font-family', monospace, 'important');
      node.style.removeProperty('--font-body');
      node.style.removeProperty('--chatgpt-font-message-english');
      node.style.removeProperty('--chatgpt-font-message-persian');
    }
  });
}

function resolveRuntimeUrl(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    try {
      return chrome.runtime.getURL(path);
    } catch (error) {
      return path;
    }
  }
  return path;
}
