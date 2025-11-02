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

const FONT_DEFAULTS = {
  english: 'inter',
  persian: 'vazirmatn'
};
const FONT_LANGUAGES = ['english', 'persian'];
const THEME_COMPATIBILITY = {
  midnight: 'dark',
  aurora: 'dark',
  nebula: 'dark',
  paper: 'light',
  daybreak: 'light'
};
const STORAGE_THEME_MODE_KEY = 'chatgptEnhancerBaseTheme';

const controls = {};
let currentSettings = { ...DEFAULT_SETTINGS };
let isBusy = false;
let currentFontTab = FONT_LANGUAGES[0];
let helpLanguage = 'english';
let lastFocusedBeforeHelp = null;
let chatBaseThemeMode = null;
const REFRESH_LABEL_DEFAULT = 'Refresh ChatGPT';
const REFRESH_LABEL_OPEN = 'Open ChatGPT';
const REFRESH_LABEL_BUSY = 'Refreshing…';
const DONATION_URL = 'https://donito.me/u-qd7d6';
const DONATE_LABEL_DEFAULT = 'Support';
const DONATE_LABEL_BUSY = 'Opening…';
const EXPORT_LABEL_DEFAULT = 'Export conversation';
const EXPORT_LABEL_BUSY = 'Exporting…';
const EXPORT_LABEL_ERROR = 'Export failed';
const EXPORT_LABEL_UNAVAILABLE = 'Open ChatGPT to export';

document.addEventListener('DOMContentLoaded', () => {
  controls.enableFix = document.getElementById('toggle-enable');
  controls.fixKatex = document.getElementById('toggle-katex');
  controls.fixCode = document.getElementById('toggle-code');
  controls.fixTables = document.getElementById('toggle-tables');
  controls.copyKatex = document.getElementById('toggle-copy');
  controls.refreshBtn = document.getElementById('refresh-btn');
  controls.donateBtn = document.getElementById('donate-btn');
  controls.themeCards = Array.from(document.querySelectorAll('.theme-card'));
  controls.accordionHeaders = Array.from(document.querySelectorAll('.accordion__header'));
  controls.fontToggle = document.getElementById('toggle-fonts');
  controls.fontControl = document.querySelector('.font-control');
  controls.fontTabs = Array.from(document.querySelectorAll('.font-tab'));
  controls.fontOptionLists = Array.from(document.querySelectorAll('.font-options'));
  controls.fontOptions = Array.from(document.querySelectorAll('.font-option'));
  controls.exportFormatRadios = Array.from(document.querySelectorAll('input[name="export-format"]'));
  controls.exportBtn = document.getElementById('export-btn');
  controls.helpBtn = document.getElementById('help-btn');
  controls.helpPanel = document.getElementById('help-panel');
  controls.helpCloseBtn = document.getElementById('help-close-btn');
  controls.helpLangButtons = Array.from(document.querySelectorAll('.help-panel__lang-btn'));
  controls.helpSections = Array.from(document.querySelectorAll('.help-panel__section'));

  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(STORAGE_THEME_MODE_KEY, (stored) => {
      if (chrome.runtime.lastError) {
        return;
      }
      chatBaseThemeMode =
        stored && typeof stored[STORAGE_THEME_MODE_KEY] === 'string'
          ? stored[STORAGE_THEME_MODE_KEY].toLowerCase()
          : null;
      if (chatBaseThemeMode !== 'dark' && chatBaseThemeMode !== 'light') {
        chatBaseThemeMode = null;
      }
      updateThemeCardAvailability();
    });
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    applySettingsToUI({ ...DEFAULT_SETTINGS, ...stored });
  });

  Object.entries({
    enableFix: controls.enableFix,
    fixKatex: controls.fixKatex,
    fixCode: controls.fixCode,
    fixTables: controls.fixTables,
    copyKatex: controls.copyKatex
  }).forEach(([key, input]) => {
    input.addEventListener('change', () => {
      if (isBusy) {
        return;
      }
      updateSetting(key, input.checked);
      if (key === 'enableFix' && !input.checked && currentSettings.fontsEnabled) {
        updateSetting('fontsEnabled', false);
      }
    });
  });

  controls.refreshBtn.addEventListener('click', handleRefresh);
  controls.donateBtn.addEventListener('click', handleDonate);
  if (controls.fontToggle) {
    controls.fontToggle.addEventListener('change', () => {
      if (isBusy) {
        return;
      }
      const enabled = controls.fontToggle.checked && currentSettings.enableFix;
      const toggledOn = enabled;
      if (!enabled) {
        controls.fontToggle.checked = false;
      }
      setFontControlsDisabled(!toggledOn);
      if (enabled !== currentSettings.fontsEnabled) {
        updateSetting('fontsEnabled', enabled);
      }
    });
  }
  controls.fontTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const { lang } = tab.dataset;
      if (!lang || lang === currentFontTab) {
        return;
      }
      setActiveFontTab(lang);
    });
  });
  controls.fontOptions.forEach((option) => {
    option.addEventListener('click', () => {
      if (isBusy) {
        return;
      }
      if (controls.fontToggle && !controls.fontToggle.checked) {
        return;
      }
      const { lang, value } = option.dataset;
      if (!lang || !value) {
        return;
      }
      const targetKey = lang === 'persian' ? 'fontPersian' : 'fontEnglish';
      if (currentSettings[targetKey] === value) {
        return;
      }
      updateSetting(targetKey, value);
    });
  });
  controls.exportFormatRadios.forEach((input) => {
    input.addEventListener('change', () => {
      if (isBusy) {
        return;
      }
      updateSetting('exportFormat', input.value);
    });
  });
  if (controls.exportBtn) {
    controls.exportBtn.addEventListener('click', handleExport);
  }
  if (controls.helpBtn) {
    controls.helpBtn.addEventListener('click', () => {
      if (isHelpPanelOpen()) {
        closeHelpPanel();
      } else {
        openHelpPanel();
      }
    });
  }
  if (controls.helpCloseBtn) {
    controls.helpCloseBtn.addEventListener('click', closeHelpPanel);
  }
  controls.helpLangButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { lang } = button.dataset;
      if (!lang || lang === helpLanguage) {
        return;
      }
      setHelpLanguage(lang);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isHelpPanelOpen()) {
      event.preventDefault();
      closeHelpPanel();
    }
  });
  controls.themeCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (card.disabled) {
        return;
      }
      const { theme } = card.dataset;
      if (!currentSettings.enableFix) {
        return;
      }
      if (!theme || theme === currentSettings.theme) {
        return;
      }
      setActiveTheme(theme);
      updateSetting('theme', theme);
    });
  });

  controls.accordionHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target;
      if (!targetId) {
        return;
      }
      const content = document.getElementById(targetId);
      if (!content) {
        return;
      }
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      content.classList.toggle('is-open', !expanded);
    });
  });

  setActiveFontTab(currentFontTab);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (Object.prototype.hasOwnProperty.call(changes, STORAGE_THEME_MODE_KEY)) {
        const nextValue = changes[STORAGE_THEME_MODE_KEY].newValue;
        chatBaseThemeMode =
          typeof nextValue === 'string' ? nextValue.toLowerCase() : null;
        if (chatBaseThemeMode !== 'dark' && chatBaseThemeMode !== 'light') {
          chatBaseThemeMode = null;
        }
        updateThemeCardAvailability();
      }
      return;
    }
    if (area !== 'sync') {
      return;
    }
    const next = { ...currentSettings };
    Object.entries(changes).forEach(([key, { newValue }]) => {
      next[key] = newValue;
    });
    applySettingsToUI(next);
  });
});

function updateSetting(key, value) {
  const payload = { [key]: value };
  chrome.storage.sync.set(payload, () => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    }
  });
}

function applySettingsToUI(settings) {
  currentSettings = settings;

  isBusy = true;
  controls.enableFix.checked = settings.enableFix;
  controls.fixKatex.checked = settings.fixKatex;
  controls.fixCode.checked = settings.fixCode;
  controls.fixTables.checked = settings.fixTables;
  controls.copyKatex.checked = settings.copyKatex;
  if (controls.fontToggle) {
    const fontsEnabled = settings.enableFix && settings.fontsEnabled;
    controls.fontToggle.checked = fontsEnabled;
  }
  updateFontOptionSelection('english', settings.fontEnglish);
  updateFontOptionSelection('persian', settings.fontPersian);
  setActiveFontTab(currentFontTab);
  setFontControlsDisabled(!(settings.enableFix && settings.fontsEnabled));
  const targetFormat = settings.exportFormat || DEFAULT_SETTINGS.exportFormat;
  controls.exportFormatRadios.forEach((input) => {
    input.checked = input.value === targetFormat;
  });
  isBusy = false;

  const dependentsDisabled = !settings.enableFix;
  [controls.fixKatex, controls.fixCode, controls.fixTables, controls.copyKatex].forEach((input) => {
    input.disabled = dependentsDisabled;
    const toggle = input.closest('.toggle');
    if (toggle) {
      toggle.classList.toggle('toggle--disabled', dependentsDisabled);
    }
  });
  if (controls.fontToggle) {
    if (dependentsDisabled) {
      controls.fontToggle.checked = false;
      if (currentSettings.fontsEnabled) {
        updateSetting('fontsEnabled', false);
      }
    }
  }

  controls.refreshBtn.disabled = false;
  controls.refreshBtn.textContent = REFRESH_LABEL_DEFAULT;
  controls.donateBtn.disabled = false;
  controls.donateBtn.textContent = DONATE_LABEL_DEFAULT;
  setActiveTheme(settings.theme);
  setThemeCardsDisabled(dependentsDisabled);
  setHelpLanguage(helpLanguage);
}

function handleRefresh() {
  controls.refreshBtn.disabled = true;
  controls.refreshBtn.textContent = REFRESH_LABEL_BUSY;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs.length) {
      controls.refreshBtn.textContent = REFRESH_LABEL_OPEN;
      controls.refreshBtn.disabled = false;
      return;
    }

    const activeTab = tabs[0];
    const url = activeTab.url || '';
    const onChatGPT =
      url.startsWith('https://chat.openai.com') || url.startsWith('https://chatgpt.com');

    if (!onChatGPT) {
      chrome.tabs.update(activeTab.id, { url: 'https://chat.openai.com/' }, () => {
        if (chrome.runtime.lastError) {
          controls.refreshBtn.textContent = REFRESH_LABEL_OPEN;
          controls.refreshBtn.disabled = false;
          return;
        }
        window.setTimeout(() => window.close(), 300);
      });
      return;
    }

    chrome.tabs.reload(activeTab.id, {}, () => {
      if (chrome.runtime.lastError) {
        controls.refreshBtn.textContent = REFRESH_LABEL_OPEN;
        controls.refreshBtn.disabled = false;
        return;
      }
      window.setTimeout(() => window.close(), 300);
    });
  });
}

function setActiveTheme(theme) {
  if (!controls.themeCards) {
    return;
  }

  controls.themeCards.forEach((card) => {
    const isActive = card.dataset.theme === theme;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

function setThemeCardsDisabled(disabled) {
  if (!controls.themeCards) {
    return;
  }

  controls.themeCards.forEach((card) => {
    if (!card) {
      return;
    }
    card.dataset.dependentsDisabled = String(Boolean(disabled));
  });
  updateThemeCardAvailability();
}

function updateThemeCardAvailability() {
  if (!controls.themeCards) {
    return;
  }
  controls.themeCards.forEach((card) => {
    if (!card) {
      return;
    }
    const dependentsDisabled = card.dataset.dependentsDisabled === 'true';
    const { theme } = card.dataset;
    const requiredMode = theme ? THEME_COMPATIBILITY[theme] : null;
    const incompatibilityKnown = Boolean(requiredMode && chatBaseThemeMode);
    const incompatible =
      incompatibilityKnown && requiredMode && chatBaseThemeMode && requiredMode !== chatBaseThemeMode;
    card.classList.toggle('theme-card--forbidden', incompatible);
    const disableForDependents = dependentsDisabled;
    const disableForIncompatibility = incompatible;
    const finalDisabled = disableForDependents || disableForIncompatibility;
    card.disabled = finalDisabled;
    card.classList.toggle('is-disabled', disableForDependents);
    if (finalDisabled) {
      card.setAttribute('aria-disabled', 'true');
    } else {
      card.removeAttribute('aria-disabled');
    }
    if (incompatible) {
      const message =
        requiredMode === 'dark'
          ? 'Enable ChatGPT dark mode to use this theme.'
          : 'Enable ChatGPT light mode to use this theme.';
      card.dataset.forbiddenTooltip = message;
      card.title = message;
    } else if (card.dataset.forbiddenTooltip) {
      card.removeAttribute('title');
      delete card.dataset.forbiddenTooltip;
    }
  });
}

function setActiveFontTab(language) {
  if (!controls.fontTabs || !controls.fontOptionLists) {
    return;
  }
  if (!FONT_LANGUAGES.includes(language)) {
    language = FONT_LANGUAGES[0];
  }
  currentFontTab = language;
  controls.fontTabs.forEach((tab) => {
    if (!tab) {
      return;
    }
    const { lang } = tab.dataset;
    const isActive = lang === language;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    if (isActive) {
      tab.removeAttribute('tabindex');
    } else {
      tab.setAttribute('tabindex', '-1');
    }
  });
  controls.fontOptionLists.forEach((group) => {
    if (!group) {
      return;
    }
    const isActive = group.dataset.lang === language;
    group.classList.toggle('is-active', isActive);
    if (isActive) {
      group.removeAttribute('hidden');
    } else {
      group.setAttribute('hidden', 'true');
    }
  });
}

function updateFontOptionSelection(language, value) {
  if (!controls.fontOptions) {
    return;
  }
  const options = controls.fontOptions.filter(
    (option) => option && option.dataset.lang === language
  );
  if (!options.length) {
    return;
  }
  const hasExactMatch =
    typeof value === 'string' && options.some((option) => option.dataset.value === value);
  const defaultOption = options.find(
    (option) => option.dataset.value === FONT_DEFAULTS[language]
  );
  const fallback =
    (defaultOption && defaultOption.dataset.value) ||
    (options[0] ? options[0].dataset.value : null);
  const selectedValue = hasExactMatch ? value : fallback;
  const settingsKey = language === 'persian' ? 'fontPersian' : 'fontEnglish';
  if (currentSettings[settingsKey] !== selectedValue) {
    currentSettings[settingsKey] = selectedValue;
    if (!hasExactMatch && selectedValue) {
      updateSetting(settingsKey, selectedValue);
    }
  }
  options.forEach((option) => {
    const isActive = option.dataset.value === selectedValue;
    option.classList.toggle('is-active', isActive);
    option.setAttribute('aria-pressed', String(isActive));
  });
}

function setFontControlsDisabled(disabled) {
  if (controls.fontControl) {
    controls.fontControl.classList.toggle('font-control--disabled', disabled);
  }
  controls.fontTabs.forEach((tab) => {
    if (!tab) {
      return;
    }
    tab.disabled = disabled;
    if (disabled) {
      tab.setAttribute('aria-disabled', 'true');
    } else {
      tab.removeAttribute('aria-disabled');
    }
  });
  controls.fontOptions.forEach((option) => {
    if (!option) {
      return;
    }
    option.disabled = disabled;
    if (disabled) {
      option.setAttribute('aria-disabled', 'true');
    } else {
      option.removeAttribute('aria-disabled');
    }
  });
}

function handleDonate() {
  controls.donateBtn.disabled = true;
  controls.donateBtn.textContent = DONATE_LABEL_BUSY;

  chrome.tabs.create({ url: DONATION_URL }, () => {
    if (chrome.runtime.lastError) {
      controls.donateBtn.disabled = false;
      controls.donateBtn.textContent = DONATE_LABEL_DEFAULT;
      return;
    }

    window.setTimeout(() => window.close(), 300);
  });
}

function handleExport() {
  if (!controls.exportBtn) {
    return;
  }
  clearExportErrorTooltip();
  setExportBusyState(EXPORT_LABEL_BUSY);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabQueryError = chrome.runtime.lastError;
    if (tabQueryError || !tabs.length) {
      const message = buildExportErrorMessage(null, tabQueryError) || 'Unable to access active tab.';
      reportExportError(message, { runtimeError: tabQueryError });
      setExportErrorTooltip(message);
      setExportIdleState(EXPORT_LABEL_ERROR);
      resetExportLabelSoon();
      return;
    }

    const activeTab = tabs[0];
    if (!isChatGPTUrl(activeTab.url || '')) {
      const message = 'Open ChatGPT in the current tab before exporting.';
      reportExportError(message, { url: activeTab.url });
      setExportErrorTooltip(message);
      setExportIdleState(EXPORT_LABEL_UNAVAILABLE);
      resetExportLabelSoon();
      return;
    }

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: 'GPT_EXPORT_CONVERSATION',
        format: getSelectedExportFormat()
      },
      (response) => {
        const messageError = chrome.runtime.lastError;
        if (messageError || !response || !response.ok) {
          const { message, originalMessage } = buildHandledExportError({
            response,
            runtimeError: messageError
          });
          reportExportError(message, {
            runtimeError: messageError,
            response,
            originalMessage
          });
          setExportErrorTooltip(message);
          setExportIdleState(EXPORT_LABEL_ERROR);
          resetExportLabelSoon();
          return;
        }
        clearExportErrorTooltip();
        setExportIdleState(EXPORT_LABEL_DEFAULT);
        window.setTimeout(() => window.close(), 400);
      }
    );
  });
}

function setExportBusyState(label) {
  controls.exportBtn.disabled = true;
  controls.exportBtn.textContent = label;
}

function setExportIdleState(label) {
  controls.exportBtn.disabled = false;
  controls.exportBtn.textContent = label;
}

function resetExportLabelSoon() {
  window.setTimeout(() => {
    if (controls.exportBtn && controls.exportBtn.textContent !== EXPORT_LABEL_BUSY) {
      controls.exportBtn.textContent = EXPORT_LABEL_DEFAULT;
    }
  }, 2000);
}

function getSelectedExportFormat() {
  const checked = controls.exportFormatRadios.find((input) => input.checked);
  return checked ? checked.value : DEFAULT_SETTINGS.exportFormat;
}

function isChatGPTUrl(url) {
  return url.startsWith('https://chat.openai.com') || url.startsWith('https://chatgpt.com');
}

function buildExportErrorMessage(response, runtimeError) {
  if (runtimeError) {
    return runtimeError.message || safeStringify(runtimeError);
  }

  if (!response) {
    return 'No response received from the page.';
  }

  const { error } = response;
  if (!error) {
    return 'Export failed for an unknown reason.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error.message === 'string') {
    return error.message;
  }

  return safeStringify(error);
}

function buildHandledExportError({ response, runtimeError }) {
  const baseMessage = buildExportErrorMessage(response, runtimeError);
  if (!runtimeError || !runtimeError.message) {
    return { message: baseMessage, originalMessage: baseMessage };
  }

  if (runtimeError.message.includes('Receiving end does not exist')) {
    const guidance = 'Reload ChatGPT in this tab so the export helper can load, then try again once the page finishes.';
    return {
      message: guidance,
      originalMessage: baseMessage
    };
  }

  return { message: baseMessage, originalMessage: baseMessage };
}

function reportExportError(message, context) {
  if (context) {
    console.error('[GPT Enhancer] Export failed:', message, context);
  } else {
    console.error('[GPT Enhancer] Export failed:', message);
  }
}

function setExportErrorTooltip(message) {
  if (controls.exportBtn) {
    controls.exportBtn.title = message;
  }
}

function clearExportErrorTooltip() {
  if (controls.exportBtn) {
    controls.exportBtn.removeAttribute('title');
  }
}

function openHelpPanel() {
  if (!controls.helpPanel) {
    return;
  }
  setHelpLanguage(helpLanguage);
  lastFocusedBeforeHelp =
    document.activeElement && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  controls.helpPanel.classList.add('is-open');
  controls.helpPanel.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(() => {
    const container = controls.helpPanel?.querySelector('.help-panel__container');
    if (container && container instanceof HTMLElement) {
      container.focus();
    }
  });
}

function closeHelpPanel() {
  if (!controls.helpPanel) {
    return;
  }
  controls.helpPanel.classList.remove('is-open');
  controls.helpPanel.setAttribute('aria-hidden', 'true');
  const targetToFocus = lastFocusedBeforeHelp || controls.helpBtn;
  if (targetToFocus && typeof targetToFocus.focus === 'function') {
    targetToFocus.focus();
  }
  lastFocusedBeforeHelp = null;
}

function isHelpPanelOpen() {
  return Boolean(controls.helpPanel && controls.helpPanel.classList.contains('is-open'));
}

function setHelpLanguage(language) {
  if (!controls.helpLangButtons || !controls.helpSections || !language) {
    return;
  }
  if (!['english', 'persian'].includes(language)) {
    language = 'english';
  }
  helpLanguage = language;
  controls.helpLangButtons.forEach((button) => {
    if (!button) {
      return;
    }
    const isActive = button.dataset.lang === language;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    if (isActive) {
      button.removeAttribute('tabindex');
    } else {
      button.setAttribute('tabindex', '-1');
    }
  });
  controls.helpSections.forEach((section) => {
    if (!section) {
      return;
    }
    const isActive = section.dataset.lang === language;
    section.classList.toggle('is-active', isActive);
    if (isActive) {
      section.removeAttribute('hidden');
    } else {
      section.setAttribute('hidden', 'true');
    }
  });
}

function safeStringify(value) {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return value.toString();
    }
  }
  return String(value);
}
