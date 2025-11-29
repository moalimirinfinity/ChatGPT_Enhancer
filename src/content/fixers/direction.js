/**
 * Monitors and corrects text direction (RTL/LTR) for code blocks, tables, and mixed content.
 */
import { DEFAULT_SETTINGS, SELECTORS } from '../../common/config.js';

const root = document.documentElement;
const RESET_VALUES = {
  direction: 'ltr',
  unicodeBidi: 'isolate',
  textAlign: 'left'
};

let currentSettings = { ...DEFAULT_SETTINGS };
let observer = null;
let reconnectTimer = null;
let pendingApply = null;

export function applyDirectionFixes(scope = getConversationRoot()) {
  if (!isEnabled() || !scope) {
    return;
  }

  if (currentSettings.fixKatex) {
    applyStyles(scope.querySelectorAll(SELECTORS.katex), {
      direction: RESET_VALUES.direction,
      unicodeBidi: RESET_VALUES.unicodeBidi
    });
  }

  if (currentSettings.fixCode) {
    applyStyles(scope.querySelectorAll(SELECTORS.code), {
      direction: RESET_VALUES.direction,
      unicodeBidi: RESET_VALUES.unicodeBidi,
      textAlign: RESET_VALUES.textAlign
    });
  }

  if (currentSettings.fixTables) {
    applyStyles(scope.querySelectorAll(SELECTORS.tables), {
      direction: RESET_VALUES.direction,
      unicodeBidi: RESET_VALUES.unicodeBidi
    });
  }
}

export function clearDirectionFixes(scope = getConversationRoot()) {
  if (!scope) {
    return;
  }
  clearStyles(scope.querySelectorAll(SELECTORS.katex));
  clearStyles(scope.querySelectorAll(SELECTORS.code));
  clearStyles(scope.querySelectorAll(SELECTORS.tables));
}

export function init(settings) {
  currentSettings = { ...currentSettings, ...(settings || {}) };
  syncRootClasses();
  if (isEnabled()) {
    clearDisabledFeatures({}, currentSettings);
    applyDirectionFixes();
    ensureObserver();
  } else {
    teardownObserver();
    clearDirectionFixes();
  }
}

export function update(changes) {
  if (!changes) {
    return;
  }
  const previous = { ...currentSettings };
  const next = { ...currentSettings };
  ['enableFix', 'fixKatex', 'fixCode', 'fixTables'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(changes, key) && changes[key]) {
      next[key] = changes[key].newValue;
    }
  });
  currentSettings = next;
  syncRootClasses();
  if (isEnabled()) {
    clearDisabledFeatures(previous, next);
    applyDirectionFixes();
    ensureObserver();
  } else {
    teardownObserver();
    clearDirectionFixes();
  }
}

export const DirectionFixer = {
  init,
  update,
  apply: applyDirectionFixes,
  clear: clearDirectionFixes
};

function isEnabled(settings = currentSettings) {
  return Boolean(settings?.enableFix);
}

function applyStyles(elements, styles) {
  if (!elements) {
    return;
  }
  elements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    Object.entries(styles).forEach(([name, value]) => {
      element.style.setProperty(name, value);
    });
  });
}

function clearStyles(elements) {
  if (!elements) {
    return;
  }
  elements.forEach((element) => {
    if (!(element instanceof HTMLElement) || !element.style) {
      return;
    }
    Object.keys(RESET_VALUES).forEach((name) => {
      element.style.removeProperty(name);
    });
  });
}

function ensureObserver() {
  const target = getConversationRoot();
  if (!target) {
    scheduleReconnect();
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (!observer) {
    observer = new MutationObserver(handleMutations);
  }
  observer.disconnect();
  observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function teardownObserver() {
  if (observer) {
    observer.disconnect();
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function handleMutations(mutations) {
  if (!isEnabled()) {
    return;
  }
  const shouldApply = mutations.some(
    (mutation) => mutation.type === 'childList' || mutation.type === 'characterData'
  );
  if (!shouldApply) {
    return;
  }
  scheduleApply();
}

function scheduleApply() {
  if (pendingApply || !isEnabled()) {
    return;
  }
  const invoke = () => {
    pendingApply = null;
    applyDirectionFixes();
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    pendingApply = window.requestAnimationFrame(invoke);
  } else {
    pendingApply = setTimeout(invoke, 16);
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isEnabled()) {
      ensureObserver();
    }
  }, 500);
}

function syncRootClasses() {
  if (!root) {
    return;
  }
  const enabled = isEnabled();
  root.classList.toggle('chatgpt-direction-fix-enabled', enabled);
  root.classList.toggle('chatgpt-direction-fix-katex', enabled && currentSettings.fixKatex);
  root.classList.toggle('chatgpt-direction-fix-code', enabled && currentSettings.fixCode);
  root.classList.toggle('chatgpt-direction-fix-tables', enabled && currentSettings.fixTables);
}

function getConversationRoot() {
  return document.querySelector('main') || document.body || document.documentElement;
}

function clearDisabledFeatures(previous, next) {
  if (!previous || !previous.enableFix) {
    return;
  }
  const scope = getConversationRoot();
  if (!scope) {
    return;
  }
  if (previous.fixKatex && !next.fixKatex) {
    clearStyles(scope.querySelectorAll(SELECTORS.katex));
  }
  if (previous.fixCode && !next.fixCode) {
    clearStyles(scope.querySelectorAll(SELECTORS.code));
  }
  if (previous.fixTables && !next.fixTables) {
    clearStyles(scope.querySelectorAll(SELECTORS.tables));
  }
}
