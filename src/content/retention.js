/**
 * Manages the review solicitation popup logic based on usage metrics.
 */
import {
  LANGUAGE_DETECTION_CACHE_INTERVAL,
  LANGUAGE_DETECTION_MAX_CHARS,
  LANGUAGE_DETECTION_MAX_MESSAGES,
  LANGUAGE_HINT_DEFAULT,
  LANGUAGE_HINT_MESSAGE_TYPE,
  PERSIAN_CHAR_REGEX
} from './constants.js';
import { selectMessageNodes } from './selectors.js';
import { RETENTION_COPY } from '../common/i18n.js';
import { loadSettings } from '../common/storage.js';

(() => {
  const CONFIG = {
    reviewUrl:
      'https://chromewebstore.google.com/detail/gpt-enhancer-for-chatgpt/deobmkpgnanhnoojdecfpndfmgjhaddk/reviews',
    storageKeys: {
      usage: 'gptEnhancerReviewUsageCount',
      exports: 'gptEnhancerReviewExportCount',
      lastShown: 'gptEnhancerReviewLastShown',
      reviewed: 'gptEnhancerReviewCompleted',
      snoozeUntil: 'gptEnhancerReviewSnoozeUntil',
      dismissCount: 'gptEnhancerReviewDismissCount'
    },
    exportEvent: 'GPT_ENHANCER_EXPORT_SUCCESS',
    exportDelayMs: 10 * 1000,
    exportThreshold: 3,
    usageThreshold: 16,
    cooldownMs: 4 * 24 * 60 * 60 * 1000,
    snoozeMs: 12 * 24 * 60 * 60 * 1000,
    usagePromptChance: 0.4,
    dismissLimit: 3
  };

  const DEFAULT_OPTIONS = {
    forceShow: false,
    usageThreshold: CONFIG.usageThreshold,
    cooldownMs: CONFIG.cooldownMs,
    snoozeMs: CONFIG.snoozeMs,
    usagePromptChance: CONFIG.usagePromptChance
  };

  const state = {
    initialized: false,
    ready: null,
    language: 'english',
    enabled: true,
    usageCount: 0,
    exportCount: 0,
    lastShown: 0,
    snoozeUntil: 0,
    dismissCount: 0,
    hasReviewed: false,
    sessionShown: false,
    popup: null,
    nodes: null,
    focusCleanup: null,
    previouslyFocused: null,
    listenersAttached: false,
    options: { ...DEFAULT_OPTIONS }
  };

  let reviewLanguageObserver = null;
  let reviewLanguageSyncTimer = null;
  let exportListenerHandler = null;
  let lastLanguageHintCache = {
    value: LANGUAGE_HINT_DEFAULT,
    signature: '',
    timestamp: 0,
    sampleLength: 0
  };

  // Public API ----------------------------------------------------------------
  function init(options = {}) {
    state.options = normalizeOptions(options);
    if (state.initialized) {
      return state.ready || Promise.resolve();
    }
    state.initialized = true;
    state.ready = Promise.all([hydrateFromStorage(), hydrateSettings()]).then(() => {
      attachStorageListener();
      if (state.enabled) {
        attachExportListener();
        initLanguageTracking();
        if (state.options.forceShow) {
          maybeShow('init', true);
        }
      }
    });
    return state.ready;
  }

  function recordUsage() {
    ensureReady().then(() => {
      if (!state.enabled || state.hasReviewed) {
        return;
      }
      state.usageCount += 1;
      persist({ [CONFIG.storageKeys.usage]: state.usageCount });
      maybeShow('usage');
    });
  }

  function setLanguage(language) {
    state.language = language === 'persian' ? 'persian' : 'english';
    syncPopupLanguage();
  }

  // Initialization helpers ----------------------------------------------------
  function normalizeOptions(options) {
    return {
      forceShow: Boolean(options.forceShow),
      usageThreshold: pickNumber(options.usageThreshold, CONFIG.usageThreshold),
      cooldownMs: pickNumber(options.cooldownMs, CONFIG.cooldownMs),
      snoozeMs: pickNumber(options.snoozeMs, CONFIG.snoozeMs),
      usagePromptChance: pickNumber(options.usagePromptChance, CONFIG.usagePromptChance)
    };
  }

  function pickNumber(candidate, fallback) {
    return Number.isFinite(candidate) ? candidate : fallback;
  }

  function hydrateFromStorage() {
    return new Promise((resolve) => {
      if (!chrome?.storage?.local) {
        resolve();
        return;
      }
      const keys = Object.values(CONFIG.storageKeys);
      chrome.storage.local.get(keys, (data) => {
        state.usageCount = Number(data?.[CONFIG.storageKeys.usage]) || 0;
        state.exportCount = Number(data?.[CONFIG.storageKeys.exports]) || 0;
        state.lastShown = Number(data?.[CONFIG.storageKeys.lastShown]) || 0;
        state.snoozeUntil = Number(data?.[CONFIG.storageKeys.snoozeUntil]) || 0;
        state.dismissCount = Number(data?.[CONFIG.storageKeys.dismissCount]) || 0;
        state.hasReviewed = Boolean(data?.[CONFIG.storageKeys.reviewed]);
        resolve();
      });
    });
  }

  function hydrateSettings() {
    return loadSettings()
      .then((settings) => {
        updateEnabled(settings?.enableFix !== false);
      })
      .catch(() => {
        updateEnabled(true);
      });
  }

  function persist(partial) {
    if (!chrome?.storage?.local || !partial) {
      return;
    }
    chrome.storage.local.set(partial, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        // Ignore storage errors.
      }
    });
  }

  function ensureReady() {
    if (!state.ready) {
      state.ready = Promise.all([hydrateFromStorage(), hydrateSettings()]);
    }
    return state.ready;
  }

  function refreshReviewedStatus() {
    return new Promise((resolve) => {
      if (state.hasReviewed || !chrome?.storage?.local) {
        resolve();
        return;
      }
      chrome.storage.local.get(CONFIG.storageKeys.reviewed, (data) => {
        const reviewed = Boolean(data?.[CONFIG.storageKeys.reviewed]);
        if (reviewed) {
          state.hasReviewed = true;
          suspendReviewExperience();
        }
        resolve();
      });
    });
  }

  function updateEnabled(value) {
    const nextEnabled = Boolean(value);
    if (nextEnabled === state.enabled) {
      return;
    }
    state.enabled = nextEnabled;
    if (!nextEnabled) {
      suspendReviewExperience();
      return;
    }
    if (!state.hasReviewed) {
      attachExportListener();
      initLanguageTracking();
    }
  }

  function suspendReviewExperience() {
    teardownPopup();
    detachExportListener();
    detachReviewLanguageObserver();
    clearReviewLanguageTimer();
  }

  // Trigger handling ----------------------------------------------------------
  function attachExportListener() {
    if (state.listenersAttached || typeof document === 'undefined' || !state.enabled || state.hasReviewed) {
      return;
    }
    exportListenerHandler = () => {
      const delay = Math.max(0, CONFIG.exportDelayMs || 0);
      state.exportCount += 1;
      persist({ [CONFIG.storageKeys.exports]: state.exportCount });
      window.setTimeout(() => {
        if (!state.enabled || state.hasReviewed) {
          return;
        }
        if (state.exportCount >= CONFIG.exportThreshold) {
          maybeShow('export');
        }
      }, delay);
    };
    document.addEventListener(CONFIG.exportEvent, exportListenerHandler);
    state.listenersAttached = true;
  }

  function detachExportListener() {
    if (!state.listenersAttached || !exportListenerHandler || typeof document === 'undefined') {
      return;
    }
    document.removeEventListener(CONFIG.exportEvent, exportListenerHandler);
    exportListenerHandler = null;
    state.listenersAttached = false;
  }

  function attachStorageListener() {
    if (!chrome?.storage?.onChanged) {
      return;
    }
    chrome.storage.onChanged.addListener(handleStorageChanges);
  }

  function handleStorageChanges(changes, areaName) {
    if (areaName === 'sync' || areaName === 'local') {
      if ('enableFix' in changes) {
        updateEnabled(changes.enableFix?.newValue !== false);
      }
    }
    if (areaName !== 'local') {
      return;
    }
    const keys = CONFIG.storageKeys;
    if (keys.usage in changes) {
      state.usageCount = Number(changes[keys.usage]?.newValue) || state.usageCount;
    }
    if (keys.exports in changes) {
      state.exportCount = Number(changes[keys.exports]?.newValue) || state.exportCount;
    }
    if (keys.lastShown in changes) {
      state.lastShown = Number(changes[keys.lastShown]?.newValue) || state.lastShown;
    }
    if (keys.snoozeUntil in changes) {
      state.snoozeUntil = Number(changes[keys.snoozeUntil]?.newValue) || state.snoozeUntil;
    }
    if (keys.dismissCount in changes) {
      state.dismissCount = Number(changes[keys.dismissCount]?.newValue) || state.dismissCount;
    }
    if (keys.reviewed in changes) {
      const reviewed = Boolean(changes[keys.reviewed]?.newValue);
      state.hasReviewed = reviewed;
      if (reviewed) {
        suspendReviewExperience();
      }
    }
  }

  // Language detection --------------------------------------------------------
  function collectLanguageSample(limitMessages, limitChars) {
    const container = document.querySelector('main') || document.body;
    if (!container) {
      return '';
    }
    const nodes = selectMessageNodes(container).nodes;
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

  function syncReviewLanguage() {
    const result = detectConversationLanguageHint(
      LANGUAGE_DETECTION_MAX_MESSAGES,
      LANGUAGE_DETECTION_MAX_CHARS
    );
    setLanguage(result.language);
  }

  function scheduleReviewLanguageSync(delay = 600) {
    if (!state.enabled || state.hasReviewed) {
      return;
    }
    if (reviewLanguageSyncTimer) {
      clearTimeout(reviewLanguageSyncTimer);
    }
    reviewLanguageSyncTimer = setTimeout(() => {
      syncReviewLanguage();
    }, delay);
  }

  function attachReviewLanguageObserver() {
    if (!state.enabled || state.hasReviewed) {
      return;
    }
    const container = document.body || document.documentElement;
    if (!container || typeof MutationObserver === 'undefined') {
      return;
    }
    if (!reviewLanguageObserver) {
      reviewLanguageObserver = new MutationObserver(() => scheduleReviewLanguageSync());
    }
    reviewLanguageObserver.disconnect();
    reviewLanguageObserver.observe(container, { childList: true, subtree: true });
  }

  function initLanguageTracking() {
    if (!state.enabled || state.hasReviewed) {
      return;
    }
    attachReviewLanguageObserver();
    scheduleReviewLanguageSync(0);
  }

  function detachReviewLanguageObserver() {
    if (reviewLanguageObserver) {
      reviewLanguageObserver.disconnect();
    }
  }

  function clearReviewLanguageTimer() {
    if (reviewLanguageSyncTimer) {
      clearTimeout(reviewLanguageSyncTimer);
      reviewLanguageSyncTimer = null;
    }
  }

  async function maybeShow(reason = '', force = false) {
    await ensureReady();
    await refreshReviewedStatus();
    if (!document || !document.body) {
      return;
    }
    if (!state.enabled || state.popup || state.hasReviewed) {
      return;
    }
    if (!force && (state.sessionShown || state.dismissCount >= CONFIG.dismissLimit)) {
      return;
    }

    const now = Date.now();
    const triggeredByExport = reason === 'export';
    if (!force) {
      if (now < state.snoozeUntil) {
        return;
      }
      if (now - state.lastShown < state.options.cooldownMs) {
        return;
      }
      if (triggeredByExport) {
        if (state.exportCount < CONFIG.exportThreshold) {
          return;
        }
      } else {
        if (state.usageCount < state.options.usageThreshold) {
          return;
        }
        if (Math.random() > state.options.usagePromptChance) {
          return;
        }
      }
    }

    renderPopup();
    markShown(now);
  }

  function markShown(timestamp) {
    state.lastShown = timestamp;
    state.sessionShown = true;
    persist({ [CONFIG.storageKeys.lastShown]: timestamp });
  }

  // Rendering -----------------------------------------------------------------
  function renderPopup() {
    teardownPopup();
    if (!document || !document.body) {
      return;
    }

    const popup = document.createElement('div');
    popup.className = 'chatgpt-review-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-live', 'polite');
    popup.setAttribute('aria-modal', 'true');
    popup.tabIndex = -1;
    applyStyles(popup, containerStyles());

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'chatgpt-review-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    applyStyles(close, closeButtonStyles());
    close.addEventListener('click', handleClose);

    const title = document.createElement('div');
    title.className = 'chatgpt-review-title';

    const body = document.createElement('div');
    body.className = 'chatgpt-review-body';

    const actions = document.createElement('div');
    actions.className = 'chatgpt-review-actions';

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'chatgpt-review-button';
    applyStyles(cta, buttonStyles('primary'));
    cta.addEventListener('click', handleRateClick);

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'chatgpt-review-dismiss';
    applyStyles(dismiss, buttonStyles('ghost'));
    dismiss.addEventListener('click', handleDismiss);

    actions.appendChild(cta);
    actions.appendChild(dismiss);
    popup.appendChild(title);
    popup.appendChild(body);
    popup.appendChild(actions);
    popup.appendChild(close);
    document.body.appendChild(popup);

    state.popup = popup;
    state.nodes = { title, body, cta, dismiss, close };
    syncPopupLanguage();
    setupFocusManagement(popup, [cta, dismiss, close]);
  }

  function containerStyles() {
    return {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      'z-index': '12000',
      background: 'linear-gradient(135deg, #0d1633, #0a122b)',
      color: '#f4e7c5',
      border: '1px solid #d4af37',
      'border-radius': '14px',
      'box-shadow':
        '0 18px 42px rgba(5, 7, 18, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      padding: '14px 16px 16px',
      'text-align': 'center',
      filter: 'none',
      'mix-blend-mode': 'normal',
      'box-sizing': 'border-box'
    };
  }

  function buttonStyles(variant) {
    const base = {
      appearance: 'none',
      'border-radius': '10px',
      padding: '9px 14px',
      'font-weight': '700',
      'font-size': '13px',
      'line-height': '1.25',
      'font-family': 'inherit',
      cursor: 'pointer',
      'border-width': '1px',
      'border-style': 'solid',
      'min-width': '120px',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'text-shadow': 'none',
      'mix-blend-mode': 'normal',
      'box-sizing': 'border-box',
      'pointer-events': 'auto',
      color: 'inherit',
      'background-color': 'transparent'
    };

    if (variant === 'primary') {
      return {
        ...base,
        background: '#f2c14f',
        color: '#0b1023',
        '-webkit-text-fill-color': '#0b1023',
        'border-color': '#f4d075',
        'box-shadow': 'none'
      };
    }

    return {
      ...base,
      background: 'rgba(255, 255, 255, 0.02)',
      color: '#dbe6ff',
      '-webkit-text-fill-color': '#dbe6ff',
      'border-color': 'rgba(244, 208, 117, 0.35)',
      'box-shadow': 'none'
    };
  }

  function closeButtonStyles() {
    return {
      appearance: 'none',
      background: 'transparent',
      border: 'none',
      color: '#f4e7c5',
      '-webkit-text-fill-color': '#f4e7c5',
      'font-size': '16px',
      'font-weight': '700',
      cursor: 'pointer',
      padding: '6px 10px',
      position: 'absolute',
      top: '6px',
      right: '6px',
      'line-height': '1'
    };
  }

  function applyStyles(target, styles) {
    if (!target || !target.style || !styles) {
      return;
    }
    Object.entries(styles).forEach(([key, value]) => {
      target.style.setProperty(key, value, 'important');
    });
  }

  function setupFocusManagement(popup, focusables) {
    if (!popup) {
      return;
    }
    const focusableNodes = (focusables || []).filter(Boolean);
    state.previouslyFocused =
      document?.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      if (!focusableNodes.length) {
        return;
      }
      const currentIndex = focusableNodes.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      let nextIndex = currentIndex + direction;

      if (currentIndex === -1) {
        nextIndex = direction === 1 ? 0 : focusableNodes.length - 1;
      } else {
        if (nextIndex < 0) {
          nextIndex = focusableNodes.length - 1;
        }
        if (nextIndex >= focusableNodes.length) {
          nextIndex = 0;
        }
      }

      event.preventDefault();
      focusableNodes[nextIndex].focus();
    };

    popup.addEventListener('keydown', handleKeydown);
    const initialTarget = focusableNodes[0] || popup;
    window.setTimeout(() => {
      if (initialTarget && typeof initialTarget.focus === 'function') {
        initialTarget.focus({ preventScroll: true });
      }
    }, 0);

    state.focusCleanup = () => {
      popup.removeEventListener('keydown', handleKeydown);
      const previous = state.previouslyFocused;
      state.previouslyFocused = null;
      if (previous && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: true });
      }
      state.focusCleanup = null;
    };
  }

  function syncPopupLanguage() {
    if (!state.popup || !state.nodes) {
      return;
    }
    const copy = RETENTION_COPY[state.language] || RETENTION_COPY.english;
    const isRtl = state.language === 'persian';
    state.popup.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    state.popup.setAttribute('aria-label', copy.title);
    if (state.nodes.close) {
      state.nodes.close.setAttribute('aria-label', isRtl ? 'بستن' : 'Close');
    }
    state.nodes.title.textContent = copy.title;
    state.nodes.body.textContent = copy.body;
    state.nodes.cta.textContent = copy.cta;
    state.nodes.dismiss.textContent = copy.dismiss;
  }

  // Event handlers ------------------------------------------------------------
  function handleRateClick() {
    const copy = RETENTION_COPY[state.language] || RETENTION_COPY.english;
    let opened = null;
    try {
      opened = window.open(CONFIG.reviewUrl, '_blank', 'noopener,noreferrer');
    } catch {
      opened = null;
    }
    if (!opened) {
      if (state.nodes?.body) {
        state.nodes.body.textContent = copy.popupBlocked || copy.body;
      }
      return;
    }
    state.hasReviewed = true;
    persist({ [CONFIG.storageKeys.reviewed]: true });
    suspendReviewExperience();
  }

  function handleDismiss() {
    state.dismissCount += 1;
    const snoozeUntil = Date.now() + state.options.snoozeMs;
    state.snoozeUntil = snoozeUntil;
    const updates = {
      [CONFIG.storageKeys.dismissCount]: state.dismissCount,
      [CONFIG.storageKeys.snoozeUntil]: snoozeUntil
    };
    if (state.dismissCount >= CONFIG.dismissLimit) {
      state.hasReviewed = true;
      updates[CONFIG.storageKeys.reviewed] = true;
    }
    persist(updates);
    if (state.hasReviewed) {
      suspendReviewExperience();
      return;
    }
    teardownPopup();
  }

  function handleClose() {
    markShown(Date.now());
    teardownPopup();
  }

  function teardownPopup() {
    if (state.focusCleanup) {
      state.focusCleanup();
    }
    if (state.popup && state.popup.parentNode) {
      state.popup.parentNode.removeChild(state.popup);
    }
    state.popup = null;
    state.nodes = null;
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

  window.ReviewManager = {
    init,
    recordUsage,
    setLanguage,
    showNow: () => maybeShow('manual', true)
  };

  init({ forceShow: false });
  recordUsage();
})();
