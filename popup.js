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
  skylight: 'light'
};
const STORAGE_THEME_MODE_KEY = 'chatgptEnhancerBaseTheme';
const PROMPTS_STORAGE_KEY = 'chatgptEnhancerPrompts';
const PROMPT_TITLE_MAX_LENGTH = 80;
const PROMPT_TEXT_MAX_LENGTH = 8000; // NEW CONSTANT
const PROMPT_COPY_RESET_DELAY = 1600;
const PROMPTS_EMPTY_DEFAULT_PRIMARY = 'You have no saved prompts yet.';
const PROMPTS_EMPTY_DEFAULT_SECONDARY = 'Create your first prompt to see it here.';
const PROMPTS_EMPTY_FILTERED_PRIMARY = 'No prompts match your search.';
const PROMPTS_EMPTY_FILTERED_SECONDARY = 'Try a different keyword or clear the search.';
const PROMPT_ACTION_LABELS = {
  copy: 'Copy prompt',
  edit: 'Edit prompt',
  delete: 'Delete prompt'
};
const PROMPT_ACTION_ICONS = {
  copy: `
    <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path>
    </svg>
  `,
  edit: `
    <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487a2.15 2.15 0 0 1 3.041 3.041L9.03 17.401 4.5 18.5 5.599 13.97 16.862 3.487z"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M15.5 5l3.5 3.5"></path>
    </svg>
  `,
  delete: `
    <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M10 11v6"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M14 11v6"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z"></path>
    </svg>
  `
};
const PROMPT_COPY_SUCCESS_ICON = `
  <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"></path>
  </svg>
`;

function normalizeThemeAlias(theme) {
  if (typeof theme !== 'string') {
    return theme;
  }
  const normalized = theme.trim().toLowerCase();
  return normalized === 'daybreak' ? 'skylight' : normalized;
}

const controls = {};
let currentSettings = { ...DEFAULT_SETTINGS };
let isBusy = false;
let currentFontTab = FONT_LANGUAGES[0];
let helpLanguage = 'english';
let lastFocusedBeforeHelp = null;
let chatBaseThemeMode = null;
let activePanelView = 'settings';
let prompts = [];
let editingPromptId = null;
const promptCopyTimers = new Map();
let promptDragState = null;
let promptSearchQuery = '';
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
  controls.promptFormAccordionHeader = document.getElementById('prompt-form-accordion-header');
  controls.promptFormSection = document.getElementById('prompt-form-section');
  if (
    controls.promptFormAccordionHeader &&
    !controls.accordionHeaders.includes(controls.promptFormAccordionHeader)
  ) {
    controls.accordionHeaders.push(controls.promptFormAccordionHeader);
  }
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
  controls.tabSettings = document.getElementById('panel-tab-settings');
  controls.tabPrompts = document.getElementById('panel-tab-prompts');
  controls.viewSettings = document.getElementById('panel-view-settings');
  controls.viewPrompts = document.getElementById('panel-view-prompts');
  controls.promptsCount = document.getElementById('prompts-count');
  controls.promptsCountLabel = document.querySelector('.prompts-count__label');
  controls.promptForm = document.getElementById('prompt-form');
  controls.promptNameInput = document.getElementById('prompt-name');
  controls.promptTextInput = document.getElementById('prompt-text');
  // NEW: Create and insert the character counter
  if (controls.promptTextInput && controls.promptTextInput.parentElement) {
    const metaDiv = document.createElement('div');
    metaDiv.className = 'prompt-form__meta';
    
    controls.promptCharCount = document.createElement('span');
    controls.promptCharCount.id = 'prompt-char-count';
    controls.promptCharCount.className = 'prompt-form__char-count';
    
    metaDiv.appendChild(controls.promptCharCount);

    // MODIFICATION: Insert *after* the parent .prompt-form__field, not inside it.
    // This makes it a sibling to the field and the action buttons.
    controls.promptTextInput.parentElement.after(metaDiv);
  }
  controls.promptCancelButton = document.getElementById('prompt-cancel-button');
  controls.promptSubmitButton = document.querySelector('.prompt-form__submit');
  controls.promptList = document.getElementById('prompt-list');
  controls.promptsEmpty = document.getElementById('prompts-empty');
  controls.promptsEmptyPrimary = document.querySelector('.prompts-empty__primary');
  controls.promptsEmptySecondary = document.querySelector('.prompts-empty__secondary');
  controls.promptError = document.getElementById('prompt-error');
  controls.promptSearch = document.getElementById('prompt-search');
  if (controls.promptsEmptyPrimary) {
    controls.promptsEmptyPrimary.textContent = PROMPTS_EMPTY_DEFAULT_PRIMARY;
  }
  if (controls.promptsEmptySecondary) {
    controls.promptsEmptySecondary.textContent = PROMPTS_EMPTY_DEFAULT_SECONDARY;
  }

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
  if (controls.promptSearch) {
    controls.promptSearch.addEventListener('input', handlePromptSearch);
  }
  if (controls.promptTextInput) {
    const updateInputState = () => {
      autoResizeTextarea(controls.promptTextInput);
      updatePromptCharCount(); // NEW function call
    };
    controls.promptTextInput.addEventListener('input', updateInputState);
    updateInputState(); // Call it once on load
  }
  if (controls.promptFormAccordionHeader && controls.promptFormSection) {
    setAccordionExpanded(controls.promptFormAccordionHeader, controls.promptFormSection, false);
  }
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
      setAccordionExpanded(header, content, !expanded);
    });
  });

  setActiveFontTab(currentFontTab);

  initPanelTabs();
  initPromptFeature();

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
    if (Object.prototype.hasOwnProperty.call(changes, PROMPTS_STORAGE_KEY)) {
      const { newValue } = changes[PROMPTS_STORAGE_KEY];
      synchronizePromptsFromStorage(newValue);
    }
    const filteredEntries = Object.entries(changes).filter(([key]) => key !== PROMPTS_STORAGE_KEY);
    if (!filteredEntries.length) {
      return;
    }
    const next = { ...currentSettings };
    filteredEntries.forEach(([key, { newValue }]) => {
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
  if (settings && typeof settings.theme === 'string') {
    const normalizedTheme = normalizeThemeAlias(settings.theme);
    if (normalizedTheme !== settings.theme) {
      settings = { ...settings, theme: normalizedTheme };
      updateSetting('theme', normalizedTheme);
    }
  }
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
  theme = normalizeThemeAlias(theme);
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
  // console.error('[GPT Enhancer] Export failed:', message);
  if (context) {
    const normalized = normalizeErrorContext(context);
    if (normalized !== undefined) {
      // console.error('[GPT Enhancer] Export details:', normalized);
    }
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

function normalizeErrorContext(value) {
  return normalizeErrorValue(value, new WeakSet());
}

function normalizeErrorValue(value, seen) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeErrorValue(item, seen));
  }

  if (typeof Node !== 'undefined' && value instanceof Node) {
    return `<${value.nodeName?.toLowerCase() || 'node'}>`;
  }

  const result = {};

  if (typeof value.message === 'string' && !('message' in result)) {
    result.message = value.message;
  }
  if (typeof value.code !== 'undefined' && !('code' in result)) {
    result.code = value.code;
  }
  if (typeof value.stack === 'string' && !('stack' in result)) {
    result.stack = value.stack;
  }

  Object.keys(value).forEach((key) => {
    const entry = value[key];
    if (typeof entry === 'function') {
      return;
    }
    result[key] = normalizeErrorValue(entry, seen);
  });

  const keys = Object.keys(result);
  if (!keys.length) {
    return '[Unserializable object]';
  }

  return result;
}

function initPanelTabs() {
  if (!controls.tabSettings || !controls.tabPrompts || !controls.viewSettings || !controls.viewPrompts) {
    return;
  }

  controls.tabSettings.addEventListener('click', () => setActivePanelView('settings'));
  controls.tabPrompts.addEventListener('click', () => setActivePanelView('prompts'));

  setActivePanelView(activePanelView);
}

function setActivePanelView(view) {
  if (view !== 'settings' && view !== 'prompts') {
    return;
  }
  const hasChanged = activePanelView !== view;
  const mapping = {
    settings: { tab: controls.tabSettings, panel: controls.viewSettings },
    prompts: { tab: controls.tabPrompts, panel: controls.viewPrompts }
  };

  Object.entries(mapping).forEach(([key, entry]) => {
    const isActive = key === view;
    const tab = entry.tab;
    const panel = entry.panel;
    if (tab) {
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    }
    if (panel) {
      panel.classList.toggle('is-active', isActive);
      if (isActive) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', 'true');
      }
    }
  });

  activePanelView = view;
  if (view === 'prompts' && controls.promptNameInput && hasChanged) {
    controls.promptNameInput.focus();
  }
}

function initPromptFeature() {
  if (controls.promptForm) {
    controls.promptForm.addEventListener('submit', handlePromptFormSubmit);
  }
  if (controls.promptCancelButton) {
    controls.promptCancelButton.addEventListener('click', () => {
      exitPromptEditMode();
      clearPromptError();
      if (controls.promptTextInput) {
        controls.promptTextInput.focus();
      }
    });
  }
  if (controls.promptList) {
    controls.promptList.addEventListener('click', handlePromptListClick);
    controls.promptList.addEventListener('click', handlePromptCardClick);
    controls.promptList.addEventListener('dragover', handlePromptDragOver);
    controls.promptList.addEventListener('drop', handlePromptDrop);
  }

  exitPromptEditMode();
  loadPromptsFromStorage();
}

function loadPromptsFromStorage() {
  if (!chrome?.storage?.sync) {
    prompts = [];
    renderPromptsWithCurrentFilter({ scrollToTop: true });
    return;
  }

  chrome.storage.sync.get({ [PROMPTS_STORAGE_KEY]: [] }, (stored) => {
    if (chrome.runtime.lastError) {
      // console.error('[GPT Enhancer] Failed to load prompts', chrome.runtime.lastError);
      showPromptError('Unable to load prompts from storage.');
      prompts = [];
      renderPromptsWithCurrentFilter({ scrollToTop: true });
      return;
    }
    const storedPrompts = stored ? stored[PROMPTS_STORAGE_KEY] : [];
    prompts = normalizePromptCollection(storedPrompts);
    renderPromptsWithCurrentFilter({ scrollToTop: true });
    clearPromptError();
  });
}

function synchronizePromptsFromStorage(value) {
  prompts = normalizePromptCollection(value);
  renderPromptsWithCurrentFilter({ scrollToTop: true });
}

function getFilteredPrompts() {
  const query = promptSearchQuery;
  if (!query) {
    return prompts;
  }
  const loweredQuery = query.toLowerCase();
  return prompts.filter((prompt) => {
    const title = typeof prompt.title === 'string' ? prompt.title.toLowerCase() : '';
    const text = typeof prompt.text === 'string' ? prompt.text.toLowerCase() : '';
    return title.includes(loweredQuery) || text.includes(loweredQuery);
  });
}

function renderPrompts(promptsToRender = prompts, options = {}) {
  if (!controls.promptList) {
    return;
  }

  const list = Array.isArray(promptsToRender) ? promptsToRender : [];
  const isFiltered = Boolean(promptSearchQuery);

  promptCopyTimers.forEach((timer, button) => {
    clearTimeout(timer);
    if (button && button instanceof HTMLElement) {
      restorePromptActionButton(button);
    }
  });
  promptCopyTimers.clear();

  const fragment = document.createDocumentFragment();
  list.forEach((prompt) => {
    const card = buildPromptCard(prompt, { disableDrag: isFiltered });
    fragment.appendChild(card);
  });

  controls.promptList.replaceChildren(fragment);
  controls.promptList.setAttribute('data-filtered', String(isFiltered));
  updatePromptsEmptyState(list);

  if (options.scrollToTop && controls.promptList) {
    controls.promptList.scrollTop = 0;
  }

  if (options.focusId) {
    window.requestAnimationFrame(() => {
      const handle = controls.promptList?.querySelector(
        `.prompt-card[data-id="${options.focusId}"] .prompt-card__handle`
      );
      if (handle && typeof handle.focus === 'function') {
        handle.focus();
      }
    });
  }
}

function renderPromptsWithCurrentFilter(options = {}) {
  renderPrompts(getFilteredPrompts(), options);
}

function setAccordionExpanded(header, content, expanded) {
  if (!header || !content) {
    return;
  }
  header.setAttribute('aria-expanded', String(expanded));
  content.classList.toggle('is-open', expanded);
}

function handlePromptSearch(event) {
  const value = event?.target?.value || '';
  promptSearchQuery = value.toLowerCase().trim();
  renderPromptsWithCurrentFilter({ scrollToTop: true });
  clearPromptError();
}

function autoResizeTextarea(element) {
  if (!element) {
    return;
  }
  element.style.height = 'auto';
  const computed = window.getComputedStyle(element);
  const minHeight = parseInt(computed.minHeight, 10) || 0;
  const nextHeight = Math.max(element.scrollHeight + 2, minHeight);
  element.style.height = `${nextHeight}px`;
}

function updatePromptCharCount() {
  if (!controls.promptTextInput || !controls.promptCharCount) {
    return;
  }
  const len = controls.promptTextInput.value.length;
  controls.promptCharCount.textContent = `${len} / ${PROMPT_TEXT_MAX_LENGTH}`;
  
  const isOverLimit = len > PROMPT_TEXT_MAX_LENGTH;
  controls.promptCharCount.classList.toggle('is-over-limit', isOverLimit);
  controls.promptTextInput.classList.toggle('is-over-limit', isOverLimit);
  
  if (controls.promptSubmitButton) {
    controls.promptSubmitButton.disabled = isOverLimit;
  }
}

function buildPromptCard(prompt, { disableDrag } = {}) {
  const card = document.createElement('li');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;
  card.setAttribute('role', 'listitem');
  
  // NEW: Add mouseleave listener to the card itself to flip back
  card.addEventListener('mouseleave', () => {
    card.classList.remove('is-active');
  });
  // --- NEW: Create the front face (wrapper) ---
  const front = document.createElement('div');
  front.className = 'prompt-card__front';
  // --- Build existing front content (handle, title, actions) ---
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'prompt-card__handle';
  handle.draggable = !disableDrag;
  handle.classList.toggle('prompt-card__handle--disabled', Boolean(disableDrag));
  handle.setAttribute('aria-label', `Reorder prompt "${getPromptDisplayTitle(prompt)}"`);
  const handleIcon = document.createElement('span');
  handleIcon.setAttribute('aria-hidden', 'true');
  handleIcon.textContent = '⋮⋮';
  handle.appendChild(handleIcon);
  handle.addEventListener('dragstart', handlePromptDragStart);
  handle.addEventListener('dragend', handlePromptDragEnd);
  handle.addEventListener('keydown', handlePromptHandleKeyDown);
  const title = document.createElement('h3');
  title.className = 'prompt-card__title';
  title.textContent = getPromptDisplayTitle(prompt);
  const header = document.createElement('div');
  header.className = 'prompt-card__header';
  header.appendChild(handle);
  header.appendChild(title);
  const copyAction = buildPromptActionButton('copy');
  const editAction = buildPromptActionButton('edit');
  const deleteAction = buildPromptActionButton('delete');
  const actions = document.createElement('div');
  actions.className = 'prompt-card__actions';
  actions.appendChild(copyAction);
  actions.appendChild(editAction);
  actions.appendChild(deleteAction);
  // Append header and actions to the FRONT face
  front.appendChild(header);
  front.appendChild(actions);
  // --- NEW: Build the back face ---
  const back = document.createElement('div');
  back.className = 'prompt-card__back';
  const backTitle = document.createElement('h4');
  backTitle.className = 'prompt-card__back-title';
  backTitle.textContent = 'Prompt Preview';
  
  const backText = document.createElement('p');
  backText.className = 'prompt-card__text';
  backText.textContent = prompt.text || 'This prompt is empty.';
  // Append title and text to the BACK face
  back.appendChild(backTitle);
  back.appendChild(backText);
  // --- Assemble the card ---
  // Append front and back faces to the main card
  card.appendChild(front);
  card.appendChild(back);
  // Keep the original title attribute for accessibility on the front
  front.title = `Prompt: "${getPromptDisplayTitle(prompt)}"`;
  return card;
}

function buildPromptActionButton(action) {
  const label = PROMPT_ACTION_LABELS[action] || action;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prompt-card__action';
  button.classList.add(`prompt-card__action--${action}`);
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.innerHTML = `${getPromptActionIcon(action)}<span class="visually-hidden">${label}</span>`;
  button.dataset.originalMarkup = button.innerHTML;
  button.dataset.originalAriaLabel = label;
  return button;
}

function getPromptActionIcon(action) {
  return PROMPT_ACTION_ICONS[action] || '';
}

function getPromptCopySuccessMarkup() {
  return PROMPT_COPY_SUCCESS_ICON;
}

function restorePromptActionButton(button) {
  if (!(button instanceof HTMLElement)) {
    return;
  }
  const action = button.dataset.action;
  const label = button.dataset.originalAriaLabel || PROMPT_ACTION_LABELS[action] || 'Prompt action';
  const markup =
    button.dataset.originalMarkup ||
    `${getPromptActionIcon(action)}<span class="visually-hidden">${label}</span>`;
  button.innerHTML = markup;
  button.dataset.originalMarkup = markup;
  button.setAttribute('aria-label', label);
  button.disabled = false;
  button.classList.remove('is-copied');
}

function updatePromptsEmptyState(list) {
  const collection = Array.isArray(list) ? list : [];
  const hasPrompts = collection.length > 0;
  if (controls.promptsEmpty) {
    controls.promptsEmpty.hidden = hasPrompts;
  }
  if (controls.promptList) {
    controls.promptList.setAttribute('data-has-items', String(hasPrompts));
  }
  if (!hasPrompts && controls.promptsEmptyPrimary && controls.promptsEmptySecondary) {
    if (promptSearchQuery) {
      controls.promptsEmptyPrimary.textContent = PROMPTS_EMPTY_FILTERED_PRIMARY;
      controls.promptsEmptySecondary.textContent = PROMPTS_EMPTY_FILTERED_SECONDARY;
    } else {
      controls.promptsEmptyPrimary.textContent = PROMPTS_EMPTY_DEFAULT_PRIMARY;
      controls.promptsEmptySecondary.textContent = PROMPTS_EMPTY_DEFAULT_SECONDARY;
      if (controls.promptFormAccordionHeader && controls.promptFormSection) {
        setAccordionExpanded(controls.promptFormAccordionHeader, controls.promptFormSection, true);
      }
    }
  }
  updatePromptsCount();
}

function updatePromptsCount() {
  if (controls.promptsCount) {
    controls.promptsCount.textContent = String(prompts.length);
  }
  if (controls.promptsCountLabel) {
    controls.promptsCountLabel.textContent = prompts.length === 1 ? 'prompt' : 'prompts';
  }
}

function getPromptDisplayTitle(prompt) {
  const title = typeof prompt.title === 'string' ? prompt.title.trim() : '';
  if (title) {
    return title;
  }
  const text = typeof prompt.text === 'string' ? prompt.text.trim() : '';
  if (!text) {
    return 'Untitled prompt';
  }
  return truncateText(text, PROMPT_TITLE_MAX_LENGTH);
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  const sliceLength = Math.max(1, maxLength - 1);
  return `${text.slice(0, sliceLength).trimEnd()}…`;
}

async function handlePromptFormSubmit(event) {
  event.preventDefault();
  if (!controls.promptTextInput) {
    return;
  }
  const title = controls.promptNameInput ? controls.promptNameInput.value.trim() : '';
  const text = controls.promptTextInput.value.trim();
  if (!text) {
    showPromptError('Prompt text cannot be empty.');
    controls.promptTextInput.focus();
    return;
  }
  // --- NEW PROACTIVE CHECK ---
  if (text.length > PROMPT_TEXT_MAX_LENGTH) {
    showPromptError(`Error: Prompt is too long. Please shorten it to ${PROMPT_TEXT_MAX_LENGTH} characters or less.`);
    controls.promptTextInput.focus();
    return;
  }
  // --- END NEW CHECK ---
  clearPromptError();
  const now = Date.now();
  const previousPrompts = prompts.slice();
  let nextPrompts;
  let focusId;
  if (editingPromptId) {
    const index = prompts.findIndex((item) => item.id === editingPromptId);
    if (index === -1) {
      showPromptError('Unable to locate the prompt you are editing.');
      exitPromptEditMode();
      return;
    }
    const updatedPrompt = {
      ...prompts[index],
      title,
      text,
      updatedAt: now
    };
    nextPrompts = prompts.slice();
    nextPrompts[index] = updatedPrompt;
    focusId = updatedPrompt.id;
  } else {
    const newPrompt = {
      id: generatePromptId(),
      title,
            text,
      createdAt: now,
      updatedAt: now
    };
    nextPrompts = [newPrompt, ...prompts];
    focusId = newPrompt.id;
  }
  prompts = nextPrompts;
  const renderOptions = { focusId };
  if (!promptSearchQuery && !editingPromptId) {
    renderOptions.scrollToTop = true;
  }
  renderPromptsWithCurrentFilter(renderOptions);
  try {
    await persistPrompts(nextPrompts);
    clearPromptError();
    exitPromptEditMode();
    if (controls.promptTextInput) {
      controls.promptTextInput.focus();
      autoResizeTextarea(controls.promptTextInput);
    }
  } catch (error) {
    // --- MODIFICATION START ---
    // 1. Fix the console.error log
    // console.error(chrome.runtime.lastError);
    // 2. Revert the optimistic UI update
    prompts = previousPrompts;
    renderPromptsWithCurrentFilter({ focusId: editingPromptId || null });
    // 3. Show a specific, user-friendly error message
    let userMessage = 'Unable to save your prompt. Please try again.';
    if (error && error.message && error.message.toLowerCase().includes('quota')) {
      // This is the error for TOTAL storage being full
      userMessage = 'Error: Storage quota exceeded. You have too many saved prompts. Please remove some older prompts to save this new one.';
    }
    
    showPromptError(userMessage);
    
    // --- MODIFICATION END ---
  }
}

function enterPromptEditMode(prompt) {
  if (!prompt || !controls.promptForm) {
    return;
  }
  editingPromptId = prompt.id;
  if (controls.promptForm) {
    controls.promptForm.classList.add('prompt-form--editing');
  }
  if (controls.promptNameInput) {
    controls.promptNameInput.value = prompt.title || '';
  }
  if (controls.promptTextInput) {
    controls.promptTextInput.value = prompt.text || '';
    autoResizeTextarea(controls.promptTextInput);
  }
  if (controls.promptCancelButton) {
    controls.promptCancelButton.hidden = false;
  }
  if (controls.promptSubmitButton) {
    controls.promptSubmitButton.textContent = 'Save changes';
  }
  if (controls.promptNameInput) {
    controls.promptNameInput.focus();
  }
}

function exitPromptEditMode() {
  editingPromptId = null;
  if (controls.promptForm) {
    controls.promptForm.classList.remove('prompt-form--editing');
    controls.promptForm.reset();
  }
  if (controls.promptNameInput) {
    controls.promptNameInput.value = '';
  }
  if (controls.promptTextInput) {
    controls.promptTextInput.value = '';
    autoResizeTextarea(controls.promptTextInput);
  }
  if (controls.promptCancelButton) {
    controls.promptCancelButton.hidden = true;
  }
  if (controls.promptSubmitButton) {
    controls.promptSubmitButton.textContent = 'Save prompt';
    controls.promptSubmitButton.disabled = false; // NEW: Re-enable button
  }
  updatePromptCharCount(); // NEW: Reset counter UI
}

function handlePromptListClick(event) {
  const target = event.target instanceof Element ? event.target.closest('.prompt-card__action') : null;
  if (!target) {
    return;
  }
  
  const card = target.closest('.prompt-card');
  if (!card) {
    return;
  }
  // NEW: Reset the card view *before* processing the action
  // This ensures the UI is clean if the user edits/deletes from the preview.
  if (card.classList.contains('is-active')) {
    card.classList.remove('is-active');
  }
  const promptId = card.dataset.id;
  if (!promptId) {
    return;
  }
  const prompt = prompts.find((item) => item.id === promptId);
  if (!prompt) {
    showPromptError('Selected prompt could not be found.');
    return;
  }
  switch (target.dataset.action) {
    case 'copy':
      copyPromptToClipboard(prompt, target);
      break;
    case 'edit':
      setActivePanelView('prompts');
      // Add this block to open the accordion
      if (controls.promptFormAccordionHeader && controls.promptFormSection) {
        setAccordionExpanded(controls.promptFormAccordionHeader, controls.promptFormSection, true);
      }
      enterPromptEditMode(prompt);
      break;
    case 'delete':
      confirmPromptDeletion(promptId);
      break;
    default:
      break;
  }
}

function handlePromptCardClick(event) {
  // IMPORTANT: Check if the click was on an interactive element.
  // If so, do nothing and let 'handlePromptListClick' take over.
  if (
    event.target.closest('.prompt-card__action') || // Ignore action buttons
    event.target.closest('.prompt-card__handle')    // Ignore drag handle
  ) {
    return;
  }
  // If the click was not on a button, find the card
  const card = event.target.closest('.prompt-card');
  if (card) {
    // Toggle the 'is-active' class to trigger the CSS animation
    card.classList.toggle('is-active');
  }
}

function copyPromptToClipboard(prompt, button) {
  if (!prompt || typeof prompt.text !== 'string' || !prompt.text.trim()) {
    showPromptError('This prompt is empty and cannot be copied.');
    return;
  }
  try {
    writeTextToClipboard(prompt.text);
    showCopyFeedback(button);
    clearPromptError();
  } catch (error) {
    // console.error('[GPT Enhancer] Failed to copy prompt', error);
    showPromptError('Unable to copy prompt to clipboard.');
  }
}

function showCopyFeedback(button) {
  if (!button) {
    return;
  }
  if (promptCopyTimers.has(button)) {
    clearTimeout(promptCopyTimers.get(button));
  }
  if (!button.dataset.originalMarkup) {
    button.dataset.originalMarkup = button.innerHTML;
  }
  if (!button.dataset.originalAriaLabel) {
    const action = button.dataset.action;
    button.dataset.originalAriaLabel = PROMPT_ACTION_LABELS[action] || 'Copy prompt';
  }
  button.disabled = true;
  button.classList.add('is-copied');
  button.setAttribute('aria-label', 'Copied!');
  button.innerHTML = `${getPromptCopySuccessMarkup()}<span class="visually-hidden">Copied!</span>`;
  const timer = window.setTimeout(() => {
    restorePromptActionButton(button);
    promptCopyTimers.delete(button);
  }, PROMPT_COPY_RESET_DELAY);
  promptCopyTimers.set(button, timer);
}

function writeTextToClipboard(text) {
  if (!text) {
    return Promise.resolve();
  }
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!successful) {
        reject(new Error('execCommand failed'));
        return;
      }
      resolve();
    } catch (error) {
      document.body.removeChild(textarea);
      reject(error);
    }
  });
}

function showPromptError(message) {
  if (!controls.promptError) {
    return;
  }
  controls.promptError.textContent = message;
  controls.promptError.hidden = false;
}

function clearPromptError() {
  if (!controls.promptError) {
    return;
  }
  controls.promptError.hidden = true;
  controls.promptError.textContent = '';
}

function persistPrompts(nextPrompts) {
  if (!chrome?.storage?.sync) {
    return Promise.resolve();
  }
  const payload = nextPrompts.map((prompt) => ({
    id: prompt.id,
    title: typeof prompt.title === 'string' ? prompt.title : '',
    text: typeof prompt.text === 'string' ? prompt.text : '',
    createdAt: Number.isFinite(prompt.createdAt) ? prompt.createdAt : Date.now(),
    updatedAt: Number.isFinite(prompt.updatedAt) ? prompt.updatedAt : Date.now()
  }));

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [PROMPTS_STORAGE_KEY]: payload }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

function normalizePromptCollection(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set();
  const normalized = [];

  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const text = typeof entry.text === 'string' ? entry.text.trim() : '';
    if (!text) {
      return;
    }
    let id = typeof entry.id === 'string' && entry.id ? entry.id : generatePromptId();
    while (seenIds.has(id)) {
      id = generatePromptId();
    }
    seenIds.add(id);
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    const createdAt = Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now();
    const updatedAt = Number.isFinite(entry.updatedAt) ? entry.updatedAt : createdAt;
    normalized.push({
      id,
      title,
      text,
      createdAt,
      updatedAt
    });
  });

  return normalized;
}

function generatePromptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function handlePromptDragStart(event) {
  if (promptSearchQuery) {
    showPromptError('Clear the search to reorder prompts.');
    event.preventDefault();
    return;
  }
  const handle = event.currentTarget;
  if (!(handle instanceof HTMLElement)) {
    return;
  }
  const card = handle.closest('.prompt-card');
  if (!card) {
    event.preventDefault();
    return;
  }
  const promptId = card.dataset.id;
  if (!promptId) {
    event.preventDefault();
    return;
  }
  promptDragState = {
    id: promptId,
    card,
    reordered: false
  };
  card.classList.add('prompt-card--dragging');
  if (event.dataTransfer) {
    try {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', promptId);
      event.dataTransfer.setDragImage(card, card.offsetWidth / 2, card.offsetHeight / 2);
    } catch (error) {
      // Ignore drag image issues.
    }
  }
}

function handlePromptDragEnd() {
  if (!promptDragState) {
    return;
  }
  const { card, reordered, id } = promptDragState;
  if (card) {
    card.classList.remove('prompt-card--dragging');
  }
  promptDragState = null;
  if (!reordered) {
    renderPromptsWithCurrentFilter({ focusId: id });
  }
}

function handlePromptDragOver(event) {
  if (promptSearchQuery) {
    event.preventDefault();
    return;
  }
  if (!promptDragState || !controls.promptList) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  const draggingCard = promptDragState.card;
  if (!draggingCard) {
    return;
  }
  const targetCard = event.target instanceof Element ? event.target.closest('.prompt-card') : null;
  if (!targetCard || targetCard === draggingCard) {
    if (!targetCard) {
      controls.promptList.appendChild(draggingCard);
    }
    return;
  }
  const targetRect = targetCard.getBoundingClientRect();
  const shouldInsertAfter = event.clientY > targetRect.top + targetRect.height / 2;
  if (shouldInsertAfter) {
    if (targetCard.nextSibling !== draggingCard) {
      controls.promptList.insertBefore(draggingCard, targetCard.nextSibling);
    }
  } else if (targetCard !== draggingCard.nextSibling) {
    controls.promptList.insertBefore(draggingCard, targetCard);
  }
}

function handlePromptDrop(event) {
  if (promptSearchQuery) {
    event.preventDefault();
    return;
  }
  if (!promptDragState) {
    return;
  }
  event.preventDefault();
  applyPromptOrderFromDom({ focusId: promptDragState.id });
}

function applyPromptOrderFromDom(options = {}) {
  if (promptSearchQuery) {
    renderPromptsWithCurrentFilter();
    showPromptError('Clear the search to reorder prompts.');
    return;
  }
  if (!controls.promptList) {
    return;
  }
  const orderedCards = Array.from(controls.promptList.querySelectorAll('.prompt-card'));
  if (!orderedCards.length) {
    prompts = [];
    renderPromptsWithCurrentFilter();
    persistPrompts([]);
    if (promptDragState) {
      promptDragState.reordered = true;
    }
    return;
  }

  const orderedIds = orderedCards.map((card) => card.dataset.id).filter(Boolean);
  if (!orderedIds.length) {
    renderPromptsWithCurrentFilter();
    if (promptDragState) {
      promptDragState.reordered = true;
    }
    return;
  }

  const currentMap = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const next = [];
  let changed = false;

  orderedIds.forEach((id, index) => {
    const prompt = currentMap.get(id);
    if (!prompt) {
      return;
    }
    next.push(prompt);
    if (!changed && prompts[index] !== prompt) {
      changed = true;
    }
  });

  if (next.length !== prompts.length || !changed) {
    renderPromptsWithCurrentFilter({ focusId: options.focusId || (promptDragState ? promptDragState.id : null) });
    if (promptDragState) {
      promptDragState.reordered = true;
    }
    return;
  }

  const previousPrompts = prompts.slice();
  prompts = next;
  renderPromptsWithCurrentFilter({ focusId: options.focusId || (promptDragState ? promptDragState.id : null) });
  if (promptDragState) {
    promptDragState.reordered = true;
  }

  persistPrompts(next)
    .then(() => {
      clearPromptError();
    })
    .catch((error) => {
      // console.error('[GPT Enhancer] Failed to persist reordered prompts', error);
      prompts = previousPrompts;
      renderPromptsWithCurrentFilter({ focusId: options.focusId || null });
      showPromptError('Unable to save the new prompt order. Please try again.');
    });
}

function handlePromptHandleKeyDown(event) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return;
  }
  if (promptSearchQuery) {
    showPromptError('Clear the search to reorder prompts.');
    return;
  }
  event.preventDefault();
  const handle = event.currentTarget;
  if (!(handle instanceof HTMLElement)) {
    return;
  }
  const card = handle.closest('.prompt-card');
  if (!card) {
    return;
  }
  const promptId = card.dataset.id;
  if (!promptId) {
    return;
  }
  const delta = event.key === 'ArrowUp' ? -1 : 1;
  movePromptByKeyboard(promptId, delta);
}

function movePromptByKeyboard(promptId, delta) {
  if (!delta) {
    return;
  }
  if (promptSearchQuery) {
    showPromptError('Clear the search to reorder prompts.');
    return;
  }
  const index = prompts.findIndex((prompt) => prompt.id === promptId);
  if (index === -1) {
    return;
  }
  const targetIndex = index + delta;
  if (targetIndex < 0 || targetIndex >= prompts.length) {
    return;
  }
  const previousPrompts = prompts.slice();
  const next = prompts.slice();
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  prompts = next;
  renderPromptsWithCurrentFilter({ focusId: promptId });
  persistPrompts(next)
    .then(() => {
      clearPromptError();
    })
    .catch((error) => {
      // console.error('[GPT Enhancer] Failed to reorder prompts via keyboard', error);
      prompts = previousPrompts;
      renderPromptsWithCurrentFilter({ focusId: promptId });
      showPromptError('Unable to reorder prompts. Please try again.');
    });
}

function confirmPromptDeletion(promptId) {
  const prompt = prompts.find((item) => item.id === promptId);
  if (!prompt) {
    showPromptError('Prompt not found.');
    return;
  }
  const shouldDelete = window.confirm('Delete this prompt? This action cannot be undone.');
  if (!shouldDelete) {
    return;
  }
  const previousPrompts = prompts.slice();
  const next = prompts.filter((item) => item.id !== promptId);
  prompts = next;
  renderPromptsWithCurrentFilter();
  if (editingPromptId === promptId) {
    exitPromptEditMode();
  }
  persistPrompts(next)
    .then(() => {
      clearPromptError();
    })
    .catch((error) => {
      // console.error('[GPT Enhancer] Failed to delete prompt', error);
      prompts = previousPrompts;
      renderPromptsWithCurrentFilter();
      showPromptError('Unable to delete the prompt. Please try again.');
    });
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
