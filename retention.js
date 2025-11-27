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
    exportDelayMs: 30 * 1000,
    exportThreshold: 3,
    usageThreshold: 16,
    cooldownMs: 4 * 24 * 60 * 60 * 1000,
    snoozeMs: 12 * 24 * 60 * 60 * 1000,
    usagePromptChance: 0.4,
    dismissLimit: 3
  };

  const COPY = {
    english: {
      title: 'Enjoying GPT Enhancer?',
      body: 'Let us know your thoughts to help us improve.',
      cta: 'Rate GPT Enhancer',
      dismiss: 'Maybe later'
    },
    persian: {
      title: 'از GPT Enhancer راضی هستی؟',
      body: 'نظرت رو حتما بده تا کمک کنی بهتر شیم.',
      cta: 'ثبت نظر',
      dismiss: 'فعلاً نه'
    }
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
    usageCount: 0,
    exportCount: 0,
    lastShown: 0,
    snoozeUntil: 0,
    dismissCount: 0,
    hasReviewed: false,
    sessionShown: false,
    popup: null,
    nodes: null,
    listenersAttached: false,
    options: { ...DEFAULT_OPTIONS }
  };

  // Public API ----------------------------------------------------------------
  function init(options = {}) {
    state.options = normalizeOptions(options);
    if (state.initialized) {
      return state.ready || Promise.resolve();
    }
    state.initialized = true;
    state.ready = hydrateFromStorage().then(() => {
      attachExportListener();
      if (state.options.forceShow) {
        maybeShow('init', true);
      }
    });
    return state.ready;
  }

  function recordUsage() {
    ensureReady().then(() => {
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
      chrome.storage.local.get(CONFIG.storageKeys, (data) => {
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
      state.ready = hydrateFromStorage();
    }
    return state.ready;
  }

  // Trigger handling ----------------------------------------------------------
  function attachExportListener() {
    if (state.listenersAttached || typeof document === 'undefined') {
      return;
    }
    document.addEventListener(CONFIG.exportEvent, () => {
      const delay = Math.max(0, CONFIG.exportDelayMs || 0);
      state.exportCount += 1;
      persist({ [CONFIG.storageKeys.exports]: state.exportCount });
      window.setTimeout(() => {
        if (state.exportCount >= CONFIG.exportThreshold) {
          maybeShow('export');
        }
      }, delay);
    });
    state.listenersAttached = true;
  }

  async function maybeShow(reason = '', force = false) {
    await ensureReady();
    if (!document || !document.body) {
      return;
    }
    if (state.popup || state.hasReviewed) {
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
    popup.setAttribute('aria-label', 'Rate GPT Enhancer');
    applyStyles(popup, containerStyles());

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'chatgpt-review-close';
    close.textContent = '×';
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
    state.nodes = { title, body, cta, dismiss };
    syncPopupLanguage();
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
      outline: 'none',
      'pointer-events': 'auto',
      color: 'inherit',
      'background-color': 'transparent'
    };

    if (variant === 'primary') {
      return {
        ...base,
        background: 'linear-gradient(135deg, #f2c14f, #e3b23c)',
        color: '#0b1023',
        '-webkit-text-fill-color': '#0b1023',
        'border-color': '#f4d075',
        'box-shadow': '0 10px 28px rgba(244, 192, 79, 0.35)'
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

  function syncPopupLanguage() {
    if (!state.popup || !state.nodes) {
      return;
    }
    const copy = COPY[state.language] || COPY.english;
    state.popup.setAttribute('dir', state.language === 'persian' ? 'rtl' : 'ltr');
    state.nodes.title.textContent = copy.title;
    state.nodes.body.textContent = copy.body;
    state.nodes.cta.textContent = copy.cta;
    state.nodes.dismiss.textContent = copy.dismiss;
  }

  // Event handlers ------------------------------------------------------------
  function handleRateClick() {
    try {
      window.open(CONFIG.reviewUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      window.location.href = CONFIG.reviewUrl;
    }
    state.hasReviewed = true;
    persist({ [CONFIG.storageKeys.reviewed]: true });
    teardownPopup();
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
    teardownPopup();
  }

  function handleClose() {
    markShown(Date.now());
    teardownPopup();
  }

  function teardownPopup() {
    if (state.popup && state.popup.parentNode) {
      state.popup.parentNode.removeChild(state.popup);
    }
    state.popup = null;
    state.nodes = null;
  }

  window.ReviewManager = {
    init,
    recordUsage,
    setLanguage,
    showNow: () => maybeShow('manual', true)
  };
})();
