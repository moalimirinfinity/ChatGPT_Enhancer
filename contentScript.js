const DEFAULT_SETTINGS = {
  enableFix: true,
  fixKatex: true,
  fixCode: true,
  fixTables: true,
  copyKatex: true,
  theme: 'original'
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
  'chatgpt-theme-paper'
];

const LEGACY_THEME_CLASSES = [
  'chatgpt-theme-original',
  'chatgpt-theme-original-dark',
  'chatgpt-theme-original-light'
];
let appliedThemeClass = null;

function resolveThemeClass(theme) {
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

  if (settings.enableFix) {
    applyTheme(settings.theme);
  } else {
    removeTheme();
  }
  scheduleClassResetFlag();
}

function applyTheme(theme) {
  if (!root) {
    return;
  }
  CUSTOM_THEME_CLASSES.forEach((className) => {
    root.classList.remove(className);
  });
  appliedThemeClass = null;
  LEGACY_THEME_CLASSES.forEach((className) => {
    root.classList.remove(className);
  });
  const themeClass = resolveThemeClass(theme);
  if (themeClass) {
    root.classList.add(themeClass);
    appliedThemeClass = themeClass;
  }
}

function removeTheme() {
  if (!root) {
    return;
  }
  applyTheme(null);
}

function classesInSync(settings) {
  if (!root) {
    return true;
  }

  const toggles = [
    ['chatgpt-direction-fix-enabled', settings.enableFix],
    ['chatgpt-direction-fix-katex', settings.enableFix && settings.fixKatex],
    ['chatgpt-direction-fix-code', settings.enableFix && settings.fixCode],
    ['chatgpt-direction-fix-tables', settings.enableFix && settings.fixTables]
  ];

  for (const [className, shouldHave] of toggles) {
    const hasClass = root.classList.contains(className);
    if (hasClass !== shouldHave) {
      return false;
    }
  }

  const desiredThemeClass = settings.enableFix ? resolveThemeClass(settings.theme) : null;
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
  rootObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
}
