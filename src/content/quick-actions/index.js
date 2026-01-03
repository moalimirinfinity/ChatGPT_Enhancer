/**
 * Floating export quick action panel with draggable positioning.
 */

import { DEFAULT_SETTINGS } from '../../common/config.js';
import { saveSettings } from '../../common/storage.js';

const EXPORT_REQUEST_EVENT = 'GPT_ENHANCER_EXPORT_REQUEST';
const EXPORT_PROGRESS_EVENT = 'GPT_ENHANCER_EXPORT_PROGRESS';
const QUICK_ACTION_CLASS = 'gpt-export-quick-action';
const QUICK_ACTION_MIN_GAP = 12;
const QUICK_ACTION_DEFAULT_GAP = 20;
const QUICK_ACTION_EXPORT_BUSY_LABEL = 'Exporting...';
const QUICK_ACTION_EXPORT_IDLE_LABEL = 'Export';
const BUSY_STATUSES = new Set(['starting', 'loading-content', 'normalizing', 'fonts', 'images', 'generating']);
const COLLAPSED_STORAGE_KEY = 'gptEnhancerExportQuickActionCollapsed';
const DRAG_THRESHOLD_PX = 4;

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'png', label: 'Image' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' }
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All messages' },
  { value: 'assistant', label: 'Assistant only' }
];

const state = {
  panel: null,
  header: null,
  collapseButton: null,
  exportButton: null,
  formatInputs: [],
  scopeInputs: [],
  dragState: null,
  listeners: null,
  isCollapsed: false,
  dragStartedOnCollapse: false,
  dragMoved: false,
  ignoreNextCollapseToggle: false
};

let currentSettings = { ...DEFAULT_SETTINGS };
let progressListenerAttached = false;
let resizeListenerAttached = false;
let collapsedPreference = null;

export const QuickActionManager = {
  init(settings) {
    currentSettings = { ...currentSettings, ...(settings || {}) };
    sync(currentSettings);
    attachResizeListener();
  },
  update(changes) {
    if (!changes) {
      return;
    }
    const next = { ...currentSettings };
    ['enableFix', 'exportQuickAction', 'exportFormat', 'exportScope', 'exportQuickActionPosition'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(changes, key) && changes[key]) {
        next[key] = changes[key].newValue;
      }
    });
    currentSettings = next;
    sync(next);
  },
  isActive,
  sync
};

function isActive(settings = currentSettings) {
  return Boolean(settings?.enableFix && settings.exportQuickAction);
}

function sync(settings = currentSettings) {
  if (!isActive(settings)) {
    teardown();
    return;
  }
  ensurePanel();
  applyCollapsedState(getCollapsedPreference());
  applySelections(settings);
  applyPosition(settings);
}

function ensurePanel() {
  if (state.panel && state.panel.isConnected) {
    return;
  }
  if (!document.body) {
    return;
  }

  const panel = document.createElement('aside');
  panel.className = QUICK_ACTION_CLASS;
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Quick export');

  const header = document.createElement('div');
  header.className = 'gpt-export-qa-header';
  header.title = 'Drag to move';
  header.addEventListener('pointerdown', handlePointerDown);

  const title = document.createElement('span');
  title.className = 'gpt-export-qa-title';
  title.textContent = 'Quick export';

  const collapseButton = document.createElement('button');
  collapseButton.type = 'button';
  collapseButton.className = 'gpt-export-qa-collapse';
  collapseButton.setAttribute('aria-label', 'Collapse quick export');
  collapseButton.textContent = '-';
  collapseButton.addEventListener('click', handleCollapseToggle);

  header.appendChild(title);
  header.appendChild(collapseButton);
  panel.appendChild(header);

  const formatGroup = buildOptionGroup('Format', 'gpt-export-qa-format', FORMAT_OPTIONS, handleFormatChange);
  const scopeGroup = buildOptionGroup('Content', 'gpt-export-qa-scope', SCOPE_OPTIONS, handleScopeChange);

  panel.appendChild(formatGroup.container);
  panel.appendChild(scopeGroup.container);

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'gpt-export-qa-button';
  exportButton.textContent = QUICK_ACTION_EXPORT_IDLE_LABEL;
  exportButton.addEventListener('click', handleExportClick);

  panel.appendChild(exportButton);
  document.body.appendChild(panel);

  state.panel = panel;
  state.header = header;
  state.collapseButton = collapseButton;
  state.exportButton = exportButton;
  state.formatInputs = formatGroup.inputs;
  state.scopeInputs = scopeGroup.inputs;
  state.listeners = { onHeaderPointerDown: handlePointerDown };

  if (!progressListenerAttached) {
    document.addEventListener(EXPORT_PROGRESS_EVENT, handleExportProgress);
    progressListenerAttached = true;
  }
}

function teardown() {
  if (state.header && state.listeners?.onHeaderPointerDown) {
    state.header.removeEventListener('pointerdown', state.listeners.onHeaderPointerDown);
  }
  if (state.collapseButton) {
    state.collapseButton.removeEventListener('click', handleCollapseToggle);
  }
  if (state.panel && state.panel.parentNode) {
    state.panel.parentNode.removeChild(state.panel);
  }
  state.panel = null;
  state.header = null;
  state.collapseButton = null;
  state.exportButton = null;
  state.formatInputs = [];
  state.scopeInputs = [];
  state.dragState = null;
  state.listeners = null;
  state.isCollapsed = false;
}

function buildOptionGroup(titleText, groupName, options, onChange) {
  const container = document.createElement('div');
  container.className = 'gpt-export-qa-group';

  const title = document.createElement('span');
  title.className = 'gpt-export-qa-group-title';
  title.textContent = titleText;
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'gpt-export-qa-options';

  const inputs = options.map((option) => {
    const label = document.createElement('label');
    label.className = 'gpt-export-qa-option';

    const input = document.createElement('input');
    input.className = 'gpt-export-qa-input';
    input.type = 'radio';
    input.name = groupName;
    input.value = option.value;
    input.addEventListener('change', onChange);

    const span = document.createElement('span');
    span.className = 'gpt-export-qa-label';
    span.textContent = option.label;

    label.appendChild(input);
    label.appendChild(span);
    list.appendChild(label);

    return input;
  });

  container.appendChild(list);
  return { container, inputs };
}

function applySelections(settings) {
  const format = normalizeExportFormat(settings?.exportFormat);
  const scope = normalizeExportScope(settings?.exportScope);
  state.formatInputs.forEach((input) => {
    input.checked = input.value === format;
  });
  state.scopeInputs.forEach((input) => {
    input.checked = input.value === scope;
  });
}

function handleFormatChange(event) {
  const next = normalizeExportFormat(event?.target?.value);
  if (!next || next === currentSettings.exportFormat) {
    return;
  }
  currentSettings.exportFormat = next;
  void saveSettings({ exportFormat: next }).catch(() => {});
}

function handleScopeChange(event) {
  const next = normalizeExportScope(event?.target?.value);
  if (!next || next === currentSettings.exportScope) {
    return;
  }
  currentSettings.exportScope = next;
  void saveSettings({ exportScope: next }).catch(() => {});
}

function handleExportClick() {
  if (!state.panel) {
    return;
  }
  const format = normalizeExportFormat(currentSettings.exportFormat);
  const scope = normalizeExportScope(currentSettings.exportScope);
  const event = new CustomEvent(EXPORT_REQUEST_EVENT, { detail: { format, scope } });
  document.dispatchEvent(event);
}

function handleExportProgress(event) {
  if (!state.exportButton) {
    return;
  }
  const status = event?.detail?.status || '';
  if (BUSY_STATUSES.has(status)) {
    setBusyState(true);
    return;
  }
  if (status === 'done' || status === 'cleanup' || status === 'error' || status === 'aborted') {
    setBusyState(false);
  }
}

function setBusyState(isBusy) {
  if (!state.exportButton) {
    return;
  }
  state.exportButton.disabled = isBusy;
  state.exportButton.textContent = isBusy ? QUICK_ACTION_EXPORT_BUSY_LABEL : QUICK_ACTION_EXPORT_IDLE_LABEL;
  if (state.panel) {
    state.panel.classList.toggle('is-busy', isBusy);
  }
}

function handleCollapseToggle() {
  if (state.ignoreNextCollapseToggle) {
    state.ignoreNextCollapseToggle = false;
    return;
  }
  applyCollapsedState(!state.isCollapsed);
  applyPosition(currentSettings, true);
  persistCollapsedPreference(state.isCollapsed);
}

function applyCollapsedState(collapsed) {
  if (!state.panel || !state.collapseButton) {
    return;
  }
  state.isCollapsed = Boolean(collapsed);
  state.panel.classList.toggle('is-collapsed', state.isCollapsed);
  state.collapseButton.setAttribute(
    'aria-label',
    state.isCollapsed ? 'Expand quick export' : 'Collapse quick export'
  );
  state.collapseButton.setAttribute('aria-pressed', String(state.isCollapsed));
  state.collapseButton.textContent = state.isCollapsed ? 'Quick Export' : '-';
}

function getCollapsedPreference() {
  if (collapsedPreference !== null) {
    return collapsedPreference;
  }
  let raw = null;
  if (typeof window !== 'undefined') {
    try {
      raw = window.localStorage?.getItem(COLLAPSED_STORAGE_KEY) || null;
    } catch (error) {
      raw = null;
    }
  }
  collapsedPreference = raw === 'true';
  return collapsedPreference;
}

function persistCollapsedPreference(next) {
  collapsedPreference = Boolean(next);
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (collapsedPreference) {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(COLLAPSED_STORAGE_KEY);
    }
  } catch (error) {
    /* ignore */
  }
}

function attachResizeListener() {
  if (resizeListenerAttached || typeof window === 'undefined') {
    return;
  }
  resizeListenerAttached = true;
  window.addEventListener('resize', () => {
    if (!state.panel) {
      return;
    }
    applyPosition(currentSettings, true);
  });
}

function applyPosition(settings, skipSave = false) {
  if (!state.panel) {
    return;
  }
  const rect = state.panel.getBoundingClientRect();
  const stored = settings?.exportQuickActionPosition;
  let left;
  let top;
  if (stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)) {
    left = stored.left;
    top = stored.top;
  } else {
    left = window.innerWidth - rect.width - QUICK_ACTION_DEFAULT_GAP;
    top = window.innerHeight - rect.height - QUICK_ACTION_DEFAULT_GAP;
  }
  const clamped = clampPosition(left, top, rect.width, rect.height);
  setPanelPosition(clamped.left, clamped.top);
  if (!skipSave && (!stored || stored.left !== clamped.left || stored.top !== clamped.top)) {
    currentSettings.exportQuickActionPosition = { left: clamped.left, top: clamped.top };
  }
}

function setPanelPosition(left, top) {
  if (!state.panel) {
    return;
  }
  state.panel.style.left = `${Math.round(left)}px`;
  state.panel.style.top = `${Math.round(top)}px`;
  state.panel.style.right = 'auto';
  state.panel.style.bottom = 'auto';
}

function handlePointerDown(event) {
  if (!state.panel || event.button !== 0 && event.pointerType !== 'touch') {
    return;
  }
  const collapseTarget =
    state.collapseButton && event.target instanceof Node && state.collapseButton.contains(event.target);
  if (collapseTarget && !state.isCollapsed) {
    return;
  }
  if (!collapseTarget) {
    event.preventDefault();
  }
  state.dragStartedOnCollapse = collapseTarget;
  state.dragMoved = false;
  state.ignoreNextCollapseToggle = false;
  const rect = state.panel.getBoundingClientRect();
  state.dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: rect.left,
    startTop: rect.top,
    width: rect.width,
    height: rect.height,
    lastLeft: rect.left,
    lastTop: rect.top
  };
  state.panel.classList.add('is-dragging');
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUpOrCancel);
  document.addEventListener('pointercancel', handlePointerUpOrCancel);
}

function handlePointerMove(event) {
  if (!state.dragState) {
    return;
  }
  if (typeof state.dragState.pointerId === 'number' && event.pointerId !== state.dragState.pointerId) {
    return;
  }
  const deltaX = event.clientX - state.dragState.startX;
  const deltaY = event.clientY - state.dragState.startY;
  if (!state.dragMoved && (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX)) {
    state.dragMoved = true;
  }
  const left = state.dragState.startLeft + deltaX;
  const top = state.dragState.startTop + deltaY;
  const clamped = clampPosition(left, top, state.dragState.width, state.dragState.height);
  state.dragState.lastLeft = clamped.left;
  state.dragState.lastTop = clamped.top;
  setPanelPosition(clamped.left, clamped.top);
}

function handlePointerUpOrCancel(event) {
  if (!state.dragState) {
    return;
  }
  if (typeof state.dragState.pointerId === 'number' && event.pointerId !== state.dragState.pointerId) {
    return;
  }
  if (state.dragStartedOnCollapse && state.dragMoved) {
    state.ignoreNextCollapseToggle = true;
  }
  state.dragStartedOnCollapse = false;
  state.dragMoved = false;
  const nextPosition = {
    left: Math.round(state.dragState.lastLeft),
    top: Math.round(state.dragState.lastTop)
  };
  state.dragState = null;
  if (state.panel) {
    state.panel.classList.remove('is-dragging');
  }
  document.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('pointerup', handlePointerUpOrCancel);
  document.removeEventListener('pointercancel', handlePointerUpOrCancel);
  currentSettings.exportQuickActionPosition = nextPosition;
  void saveSettings({ exportQuickActionPosition: nextPosition }).catch(() => {});
}

function clampPosition(left, top, width, height) {
  const maxLeft = Math.max(QUICK_ACTION_MIN_GAP, window.innerWidth - width - QUICK_ACTION_MIN_GAP);
  const maxTop = Math.max(QUICK_ACTION_MIN_GAP, window.innerHeight - height - QUICK_ACTION_MIN_GAP);
  return {
    left: clamp(left, QUICK_ACTION_MIN_GAP, maxLeft),
    top: clamp(top, QUICK_ACTION_MIN_GAP, maxTop)
  };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeExportFormat(format) {
  if (!format || typeof format !== 'string') {
    return DEFAULT_SETTINGS.exportFormat;
  }
  const normalized = format.trim().toLowerCase();
  if (normalized === 'md') {
    return 'markdown';
  }
  if (FORMAT_OPTIONS.some((option) => option.value === normalized)) {
    return normalized;
  }
  return DEFAULT_SETTINGS.exportFormat;
}

function normalizeExportScope(scope) {
  if (!scope || typeof scope !== 'string') {
    return DEFAULT_SETTINGS.exportScope;
  }
  const normalized = scope.trim().toLowerCase();
  if (normalized === 'assistant' || normalized === 'all') {
    return normalized;
  }
  return DEFAULT_SETTINGS.exportScope;
}
