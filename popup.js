const DEFAULT_SETTINGS = {
  enableFix: true,
  fixKatex: true,
  fixCode: true,
  fixTables: true,
  copyKatex: true,
  exportFormat: 'pdf',
  theme: 'original'
};

const controls = {};
let currentSettings = { ...DEFAULT_SETTINGS };
let isBusy = false;
const REFRESH_LABEL_DEFAULT = 'Refresh ChatGPT';
const REFRESH_LABEL_OPEN = 'Open ChatGPT';
const REFRESH_LABEL_BUSY = 'Refreshing…';
const DONATION_URL = 'https://zarinp.al/moalimirinfinity';
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
  controls.exportFormatRadios = Array.from(document.querySelectorAll('input[name="export-format"]'));
  controls.exportBtn = document.getElementById('export-btn');

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
    });
  });

  controls.refreshBtn.addEventListener('click', handleRefresh);
  controls.donateBtn.addEventListener('click', handleDonate);
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
  controls.themeCards.forEach((card) => {
    card.addEventListener('click', () => {
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

  chrome.storage.onChanged.addListener((changes, area) => {
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

  controls.refreshBtn.disabled = false;
  controls.refreshBtn.textContent = REFRESH_LABEL_DEFAULT;
  controls.donateBtn.disabled = false;
  controls.donateBtn.textContent = DONATE_LABEL_DEFAULT;
  setActiveTheme(settings.theme);
  setThemeCardsDisabled(dependentsDisabled);
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
    card.classList.toggle('is-disabled', disabled);
    if (disabled) {
      card.setAttribute('aria-disabled', 'true');
    } else {
      card.removeAttribute('aria-disabled');
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
  setExportBusyState(EXPORT_LABEL_BUSY);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs.length) {
      setExportIdleState(EXPORT_LABEL_ERROR);
      return;
    }

    const activeTab = tabs[0];
    if (!isChatGPTUrl(activeTab.url || '')) {
      setExportIdleState(EXPORT_LABEL_UNAVAILABLE);
      resetExportLabelSoon();
      return;
    }

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: 'GBT_EXPORT_CONVERSATION',
        format: getSelectedExportFormat()
      },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          console.error(chrome.runtime.lastError || response?.error || 'Export failed');
          setExportIdleState(EXPORT_LABEL_ERROR);
          resetExportLabelSoon();
          return;
        }
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
