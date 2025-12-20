/**
 * Monitors and corrects text direction (RTL/LTR) for code blocks, tables, and mixed content.
 * KaTeX direction protection lives in KatexManager to avoid overlapping inline fixes.
 */

import { DEFAULT_SETTINGS } from '../../common/config.js';
import { selectCodeNodes, selectTableNodes } from '../selectors.js';

const root = document.documentElement;
const RESET_VALUES = {
  direction: 'ltr',
  unicodeBidi: 'isolate',
  textAlign: 'left'
};

let currentSettings = { ...DEFAULT_SETTINGS };
let pendingApply = null;

export function applyDirectionFixes(scope = getConversationRoot()) {
  if (!isEnabled() || !scope) {
    return;
  }

  const codeNodes = selectCodeNodes(scope).nodes;
  const tableNodes = selectTableNodes(scope).nodes;

  // Always clear before reapplying to avoid stale inline values when toggling repeatedly.
  clearStyles(codeNodes);
  clearStyles(tableNodes);

  if (currentSettings.fixTables && tableNodes.length) {
    applyStyles(tableNodes, {
      direction: RESET_VALUES.direction,
      unicodeBidi: RESET_VALUES.unicodeBidi
    });
  }

  if (currentSettings.fixCode && codeNodes.length) {
    applyStyles(codeNodes, {
      direction: RESET_VALUES.direction,
      unicodeBidi: RESET_VALUES.unicodeBidi,
      textAlign: RESET_VALUES.textAlign
    });
  }
}

export function clearDirectionFixes(scope = getConversationRoot()) {
  if (!scope) {
    return;
  }
  clearStyles(selectCodeNodes(scope).nodes);
  clearStyles(selectTableNodes(scope).nodes);
}

export function init(settings) {
  currentSettings = { ...currentSettings, ...(settings || {}) };
  syncRootClasses();
  if (isEnabled()) {
    clearDisabledFeatures({}, currentSettings);
    applyDirectionFixes();
  } else {
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
  } else {
    clearDirectionFixes();
  }
}

export const DirectionFixer = {
  init,
  update,
  apply: applyDirectionFixes,
  clear: clearDirectionFixes,
  handleMutations
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
      element.style.setProperty(name, value, 'important');
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

function syncRootClasses() {
  if (!root) {
    return;
  }
  const enabled = isEnabled();
  root.classList.toggle('chatgpt-direction-fix-enabled', enabled);
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
  if (previous.fixCode && !next.fixCode) {
    clearStyles(selectCodeNodes(scope).nodes);
  }
  if (previous.fixTables && !next.fixTables) {
    clearStyles(selectTableNodes(scope).nodes);
  }
}
