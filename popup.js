const DEFAULT_SETTINGS = {
  enableFix: true,
  fixKatex: true,
  fixCode: true,
  fixTables: true
};

const controls = {};
let currentSettings = { ...DEFAULT_SETTINGS };
let isBusy = false;
const REFRESH_LABEL_DEFAULT = 'Refresh ChatGPT';
const REFRESH_LABEL_OPEN = 'Open ChatGPT';
const REFRESH_LABEL_BUSY = 'Refreshing…';
const DONATION_URL = 'https://zarinp.al/moalimirinfinity';
const DONATE_LABEL_DEFAULT = 'Donate (Rial)';
const DONATE_LABEL_BUSY = 'Opening…';

document.addEventListener('DOMContentLoaded', () => {
  controls.enableFix = document.getElementById('toggle-enable');
  controls.fixKatex = document.getElementById('toggle-katex');
  controls.fixCode = document.getElementById('toggle-code');
  controls.fixTables = document.getElementById('toggle-tables');
  controls.statusChip = document.getElementById('status-chip');
  controls.refreshBtn = document.getElementById('refresh-btn');
  controls.donateBtn = document.getElementById('donate-btn');

  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    applySettingsToUI({ ...DEFAULT_SETTINGS, ...stored });
  });

  Object.entries({
    enableFix: controls.enableFix,
    fixKatex: controls.fixKatex,
    fixCode: controls.fixCode,
    fixTables: controls.fixTables
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
  isBusy = false;

  const dependentsDisabled = !settings.enableFix;
  [controls.fixKatex, controls.fixCode, controls.fixTables].forEach((input) => {
    input.disabled = dependentsDisabled;
    const toggle = input.closest('.toggle');
    if (toggle) {
      toggle.classList.toggle('toggle--disabled', dependentsDisabled);
    }
  });

  updateStatusChip(settings);
  controls.refreshBtn.disabled = false;
  controls.refreshBtn.textContent = REFRESH_LABEL_DEFAULT;
  controls.donateBtn.disabled = false;
  controls.donateBtn.textContent = DONATE_LABEL_DEFAULT;
}

function updateStatusChip(settings) {
  const chip = controls.statusChip;
  chip.classList.remove('status-chip--active', 'status-chip--inactive', 'status-chip--custom');

  if (!settings.enableFix) {
    chip.textContent = 'Paused';
    chip.classList.add('status-chip--inactive');
    return;
  }

  const allEnabled = settings.fixKatex && settings.fixCode && settings.fixTables;
  if (allEnabled) {
    chip.textContent = 'Active';
    chip.classList.add('status-chip--active');
  } else {
    chip.textContent = 'Custom';
    chip.classList.add('status-chip--custom');
  }
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
