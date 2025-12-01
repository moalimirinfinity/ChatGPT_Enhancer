/**
 * Controller logic for the Table of Contents, handling navigation, state, and positioning.
 */
import { DEFAULT_SETTINGS } from '../../common/config.js';
import { MESSAGE_SELECTOR } from '../constants.js';
import { getChatGPTThemeMode, isCustomThemeActive } from '../theme/index.js';
import { ensurePanel, rebuildList, teardownPanel, updateCollapseButton } from './ui.js';

const root = document.documentElement;
const TOC_PANEL_ID = 'chatgpt-enhancer-toc-panel';
const TOC_ENTRY_ATTR = 'data-chatgpt-toc-target';
const TOC_ANCHOR_ATTR = 'data-chatgpt-toc-id';
const TOC_UPDATE_DEBOUNCE_MS = 200;
const TOC_HIGHLIGHT_DURATION_MS = 1600;
const TOC_ORIGINAL_HIGHLIGHT_COLOR = '#1c46d6';
const TOC_MAX_TITLE_LENGTH = 120;
const TOC_MAX_TITLE_WORDS = 10;
const TOC_PANEL_MIN_GAP = 12;
const TOC_PANEL_MIN_WIDTH = 190;
const TOC_PANEL_MAX_WIDTH = 420;
const TOC_PANEL_MIN_HEIGHT = 220;
const TOC_PANEL_MAX_HEIGHT = 640;
const TOC_RTL_CHAR_REGEX =
  /[\u0590-\u08FF\u200F\u202B\uFB1D-\uFDFD\uFE70-\uFEFC\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

const TOC_THEME_TOKEN_PRESETS = {
  light: {
    '--chatgpt-theme-panel': 'rgba(255, 255, 255, 0.96)',
    '--chatgpt-theme-border': 'rgba(17, 24, 39, 0.12)',
    '--chatgpt-theme-text': '#111222',
    '--chatgpt-theme-text-muted': 'rgba(17, 18, 34, 0.62)',
    '--chatgpt-theme-accent': '#1c46d6'
  },
  dark: {
    '--chatgpt-theme-panel': 'rgba(24, 28, 44, 0.92)',
    '--chatgpt-theme-border': 'rgba(255, 255, 255, 0.18)',
    '--chatgpt-theme-text': '#f5f6fb',
    '--chatgpt-theme-text-muted': 'rgba(229, 231, 235, 0.64)',
    '--chatgpt-theme-accent': '#7aa2ff'
  }
};

const state = {
  panel: null,
  list: null,
  observer: null,
  updateTimer: null,
  anchorCounter: 0,
  dragHandle: null,
  dragState: null,
  collapseButton: null,
  heading: null,
  resizeHandle: null,
  resizeState: null,
  size: null,
  isRtlPanel: false,
  highlightTimers: new Map(),
  ids: {
    panelId: TOC_PANEL_ID,
    entryAttr: TOC_ENTRY_ATTR,
    anchorAttr: TOC_ANCHOR_ATTR
  },
  listeners: null
};

let currentSettings = { ...DEFAULT_SETTINGS };
let resizeListenerAttached = false;

export const TocManager = {
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
    ['enableFix', 'tableOfContents', 'tableOfContentsCollapsed', 'tableOfContentsPosition', 'tableOfContentsSize'].forEach(
      (key) => {
        if (Object.prototype.hasOwnProperty.call(changes, key) && changes[key]) {
          next[key] = changes[key].newValue;
        }
      }
    );
    currentSettings = next;
    sync(next);
  },
  applyThemeTokens,
  handleResize,
  isActive,
  sync
};

function isActive(settings = currentSettings) {
  return Boolean(settings?.enableFix && settings.tableOfContents);
}

function sync(settings = currentSettings) {
  if (!isActive(settings)) {
    teardown();
    disconnectObserver();
    cancelUpdate();
    return;
  }
  ensurePanel(state, {
    onToggleCollapse: toggleCollapsed,
    onClick: handleClick
  });
  if (!state.panel) {
    return;
  }
  enableDragging();
  enableResizing();
  applySize(settings);
  applyPlacement(settings);
  applyThemeTokens();
  setCollapsed(Boolean(settings.tableOfContentsCollapsed), false);
  connectObserver();
  scheduleUpdate();
}

function teardown() {
  disableDragging();
  disableResizing();
  teardownPanel(state);
  clearThemeTokens();
  state.size = null;
  state.isRtlPanel = false;
  state.anchorCounter = 0;
  state.highlightTimers.forEach((timer, element) => {
    clearTimeout(timer);
    if (element && element.classList) {
      element.classList.remove('chatgpt-toc-highlight-active');
      element.removeAttribute('data-chatgpt-toc-highlighted');
    }
  });
  state.highlightTimers.clear();
}

function connectObserver() {
  if (!isActive()) {
    return;
  }
  const container = document.querySelector('main') || document.body || document.documentElement;
  if (!container) {
    return;
  }
  if (!state.observer) {
    state.observer = new MutationObserver(handleMutations);
  }
  state.observer.disconnect();
  state.observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function disconnectObserver() {
  if (state.observer) {
    state.observer.disconnect();
  }
}

function handleMutations(mutations) {
  if (!isActive()) {
    return;
  }
  const shouldUpdate = mutations.some((mutation) => {
    if (mutation.type === 'childList') {
      return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
    }
    return mutation.type === 'characterData';
  });
  if (shouldUpdate) {
    scheduleUpdate();
  }
}

function scheduleUpdate() {
  if (!isActive()) {
    return;
  }
  if (state.updateTimer) {
    clearTimeout(state.updateTimer);
  }
  state.updateTimer = setTimeout(() => {
    state.updateTimer = null;
    rebuildListInternal();
  }, TOC_UPDATE_DEBOUNCE_MS);
}

function cancelUpdate() {
  if (state.updateTimer) {
    clearTimeout(state.updateTimer);
    state.updateTimer = null;
  }
}

function rebuildListInternal() {
  if (!isActive() || !state.list) {
    return;
  }
  const assistantMessages = collectAssistantMessages();
  rebuildList(state, assistantMessages, {
    ensureMessageAnchorId,
    deriveTitle,
    getAnchorTarget: getMessageAnchorTarget
  });
  updatePanelDirection();
  if (state.size || currentSettings.tableOfContentsSize) {
    applySize(currentSettings);
  }
}

function applySize(settings = currentSettings) {
  if (!state.panel) {
    return;
  }
  const normalized = normalizeSize(settings.tableOfContentsSize);
  if (normalized) {
    setCustomSize(normalized);
  } else {
    resetSize();
  }
}

function normalizeSize(size) {
  if (!size || typeof size !== 'object' || !state.panel) {
    return null;
  }
  let { width, height } = size;
  const viewportMaxWidth = Math.max(TOC_PANEL_MIN_WIDTH, window.innerWidth - TOC_PANEL_MIN_GAP * 2);
  const viewportMaxHeight = Math.max(TOC_PANEL_MIN_HEIGHT, window.innerHeight - TOC_PANEL_MIN_GAP * 2);
  const maxWidth = Math.min(TOC_PANEL_MAX_WIDTH, viewportMaxWidth);
  const maxHeight = Math.min(TOC_PANEL_MAX_HEIGHT, viewportMaxHeight);
  width = clamp(Number(width), TOC_PANEL_MIN_WIDTH, maxWidth);
  height = clamp(Number(height), TOC_PANEL_MIN_HEIGHT, maxHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  return { width, height };
}

function setCustomSize(size) {
  if (!state.panel) {
    return;
  }
  const width = Math.round(size.width);
  const height = Math.round(size.height);
  state.panel.style.width = `${width}px`;
  state.panel.style.minWidth = `${Math.max(width, TOC_PANEL_MIN_WIDTH)}px`;
  state.panel.style.maxWidth = `${width}px`;
  state.panel.style.height = `${height}px`;
  state.panel.style.maxHeight = `${height}px`;
  state.size = { width, height };
  updateListHeight(height);
}

function resetSize() {
  if (!state.panel) {
    return;
  }
  state.panel.style.width = '';
  state.panel.style.minWidth = '';
  state.panel.style.maxWidth = '';
  state.panel.style.height = '';
  state.panel.style.maxHeight = '';
  if (state.list) {
    state.list.style.maxHeight = '';
  }
  state.size = null;
}

function updateListHeight(targetHeight) {
  if (!state.panel || !state.list || !targetHeight) {
    return;
  }
  const header = state.panel.querySelector('.chatgpt-toc-header');
  const headerHeight = header && header.getBoundingClientRect ? header.getBoundingClientRect().height : 0;
  const styles = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(state.panel) : null;
  const paddingTop = styles ? parseFloat(styles.paddingTop) || 0 : 0;
  const paddingBottom = styles ? parseFloat(styles.paddingBottom) || 0 : 0;
  const available = Math.max(
    120,
    Math.round(targetHeight - headerHeight - paddingTop - paddingBottom - 6)
  );
  state.list.style.maxHeight = `${available}px`;
}

function applyPlacement(settings = currentSettings) {
  if (!state.panel) {
    return;
  }
  const normalized = normalizePosition(settings.tableOfContentsPosition);
  if (normalized) {
    setCustomPosition(normalized);
  } else {
    resetPosition();
  }
}

function normalizePosition(position) {
  if (!position || typeof position !== 'object' || !state.panel) {
    return null;
  }
  const top = Number(position.top);
  let left = Number(position.left);
  const savedRightGap = Number(position.rightGap);
  if (!Number.isFinite(top)) {
    return null;
  }
  const rect = state.panel.getBoundingClientRect();
  if (Number.isFinite(savedRightGap)) {
    const candidateLeft = window.innerWidth - rect.width - savedRightGap;
    if (Number.isFinite(candidateLeft)) {
      left = candidateLeft;
    }
  }
  if (!Number.isFinite(left)) {
    return null;
  }
  const maxLeft = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - rect.width - TOC_PANEL_MIN_GAP);
  const maxTop = Math.max(TOC_PANEL_MIN_GAP, window.innerHeight - rect.height - TOC_PANEL_MIN_GAP);
  return {
    top: clamp(top, TOC_PANEL_MIN_GAP, maxTop),
    left: clamp(left, TOC_PANEL_MIN_GAP, maxLeft)
  };
}

function setCustomPosition(position) {
  if (!state.panel) {
    return;
  }
  state.panel.style.top = `${Math.round(position.top)}px`;
  state.panel.style.left = `${Math.round(position.left)}px`;
  state.panel.style.right = 'auto';
  state.panel.style.bottom = 'auto';
}

function resetPosition() {
  if (!state.panel) {
    return;
  }
  state.panel.style.top = '';
  state.panel.style.left = '';
  state.panel.style.right = '';
  state.panel.style.bottom = '';
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function toggleCollapsed() {
  if (!state.panel) {
    return;
  }
  const next = !state.panel.classList.contains('is-collapsed');
  setCollapsed(next, true);
}

function setCollapsed(collapsed, persist) {
  if (!state.panel) {
    return;
  }
  state.panel.classList.toggle('is-collapsed', collapsed);
  if (state.list) {
    state.list.hidden = collapsed;
  }
  updateCollapseButton(state, collapsed);
  if (!collapsed && (state.size || currentSettings.tableOfContentsSize)) {
    applySize(currentSettings);
  }
  if (persist) {
    currentSettings.tableOfContentsCollapsed = collapsed;
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ tableOfContentsCollapsed: collapsed }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          // console.error(chrome.runtime.lastError);
        }
      });
    }
  }
}

function applyThemeTokens() {
  if (!state.panel) {
    return;
  }
  if (isCustomThemeActive()) {
    clearThemeTokens();
    return;
  }
  const mode = getChatGPTThemeMode();
  const tokens = mode === 'dark' ? TOC_THEME_TOKEN_PRESETS.dark : TOC_THEME_TOKEN_PRESETS.light;
  Object.entries(tokens).forEach(([name, value]) => {
    state.panel.style.setProperty(name, value);
  });
}

function clearThemeTokens() {
  if (!state.panel) {
    return;
  }
  Object.keys(TOC_THEME_TOKEN_PRESETS.dark).forEach((name) => {
    state.panel.style.removeProperty(name);
  });
}

function enableDragging() {
  if (!state.panel || state.dragHandle) {
    return;
  }
  const handle = state.panel.querySelector('.chatgpt-toc-header');
  if (!handle) {
    return;
  }
  state.dragHandle = handle;
  handle.addEventListener('pointerdown', handlePointerDown);
}

function disableDragging() {
  if (state.dragHandle) {
    state.dragHandle.removeEventListener('pointerdown', handlePointerDown);
  }
  state.dragHandle = null;
  cancelDragging();
}

function handlePointerDown(event) {
  if (!state.panel) {
    return;
  }
  if (state.collapseButton && event.target instanceof Node && state.collapseButton.contains(event.target)) {
    return;
  }
  if (event.button !== 0 && event.pointerType !== 'touch') {
    return;
  }
  event.preventDefault();
  const rect = state.panel.getBoundingClientRect();
  state.dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: rect.left,
    offsetY: rect.top,
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
  const left = clamp(
    state.dragState.offsetX + deltaX,
    TOC_PANEL_MIN_GAP,
    Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - state.dragState.width - TOC_PANEL_MIN_GAP)
  );
  const top = clamp(
    state.dragState.offsetY + deltaY,
    TOC_PANEL_MIN_GAP,
    Math.max(TOC_PANEL_MIN_GAP, window.innerHeight - state.dragState.height - TOC_PANEL_MIN_GAP)
  );
  state.dragState.lastLeft = left;
  state.dragState.lastTop = top;
  const rightGap = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - state.dragState.width - left);
  setCustomPosition({ top, left });
  currentSettings.tableOfContentsPosition = { top, left, rightGap };
}

function handlePointerUpOrCancel(event) {
  if (!state.dragState) {
    return;
  }
  if (typeof state.dragState.pointerId === 'number' && event.pointerId !== state.dragState.pointerId) {
    return;
  }
  const finalPosition =
    state.dragState.lastTop != null && state.dragState.lastLeft != null
      ? { top: state.dragState.lastTop, left: state.dragState.lastLeft }
      : null;
  cancelDragging();
  if (finalPosition) {
    const rightGap =
      state.dragState && Number.isFinite(state.dragState.width)
        ? Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - state.dragState.width - finalPosition.left)
        : null;
    const position = rightGap != null ? { ...finalPosition, rightGap } : finalPosition;
    savePosition(position);
  }
}

function cancelDragging() {
  if (!state.dragState) {
    return;
  }
  document.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('pointerup', handlePointerUpOrCancel);
  document.removeEventListener('pointercancel', handlePointerUpOrCancel);
  if (state.panel) {
    state.panel.classList.remove('is-dragging');
  }
  state.dragState = null;
}

function savePosition(position) {
  currentSettings.tableOfContentsPosition = position;
  if (!chrome || !chrome.storage || !chrome.storage.sync) {
    return;
  }
  chrome.storage.sync.set({ tableOfContentsPosition: position }, () => {
    if (chrome.runtime && chrome.runtime.lastError) {
      // console.error(chrome.runtime.lastError);
    }
  });
}

function enableResizing() {
  if (!state.panel || state.resizeHandle) {
    return;
  }
  const handle = document.createElement('div');
  handle.className = 'chatgpt-toc-resizer';
  handle.title = 'Drag to resize the panel';
  handle.addEventListener('pointerdown', handleResizePointerDown);
  state.panel.appendChild(handle);
  state.resizeHandle = handle;
}

function disableResizing() {
  if (state.resizeHandle) {
    state.resizeHandle.removeEventListener('pointerdown', handleResizePointerDown);
    if (state.resizeHandle.parentNode) {
      state.resizeHandle.parentNode.removeChild(state.resizeHandle);
    }
  }
  state.resizeHandle = null;
  cancelResizing();
}

function handleResizePointerDown(event) {
  if (!state.panel || (event.button !== 0 && event.pointerType !== 'touch')) {
    return;
  }
  event.preventDefault();
  const rect = state.panel.getBoundingClientRect();
  state.resizeState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: rect.width,
    startHeight: rect.height,
    top: rect.top,
    left: rect.left
  };
  state.panel.classList.add('is-resizing');
  document.addEventListener('pointermove', handleResizePointerMove);
  document.addEventListener('pointerup', handleResizePointerUpOrCancel);
  document.addEventListener('pointercancel', handleResizePointerUpOrCancel);
}

function handleResizePointerMove(event) {
  if (!state.resizeState) {
    return;
  }
  if (typeof state.resizeState.pointerId === 'number' && event.pointerId !== state.resizeState.pointerId) {
    return;
  }
  const deltaX = event.clientX - state.resizeState.startX;
  const deltaY = event.clientY - state.resizeState.startY;
  const plannedWidth = state.resizeState.startWidth + deltaX;
  const plannedHeight = state.resizeState.startHeight + deltaY;
  const maxWidth = Math.min(
    TOC_PANEL_MAX_WIDTH,
    Math.max(TOC_PANEL_MIN_WIDTH, window.innerWidth - state.resizeState.left - TOC_PANEL_MIN_GAP)
  );
  const maxHeight = Math.min(
    TOC_PANEL_MAX_HEIGHT,
    Math.max(TOC_PANEL_MIN_HEIGHT, window.innerHeight - state.resizeState.top - TOC_PANEL_MIN_GAP)
  );
  const width = clamp(plannedWidth, TOC_PANEL_MIN_WIDTH, maxWidth);
  const height = clamp(plannedHeight, TOC_PANEL_MIN_HEIGHT, maxHeight);
  setCustomSize({ width, height });
}

function handleResizePointerUpOrCancel(event) {
  if (!state.resizeState) {
    return;
  }
  if (typeof state.resizeState.pointerId === 'number' && event.pointerId !== state.resizeState.pointerId) {
    return;
  }
  const finalSize = state.size;
  cancelResizing();
  if (finalSize) {
    saveSize(finalSize);
    if (currentSettings.tableOfContentsPosition && state.panel) {
      const rect = state.panel.getBoundingClientRect();
      const rightGap = Math.max(TOC_PANEL_MIN_GAP, window.innerWidth - rect.width - rect.left);
      savePosition({ ...currentSettings.tableOfContentsPosition, top: rect.top, left: rect.left, rightGap });
    }
  }
}

function cancelResizing() {
  if (!state.resizeState) {
    return;
  }
  document.removeEventListener('pointermove', handleResizePointerMove);
  document.removeEventListener('pointerup', handleResizePointerUpOrCancel);
  document.removeEventListener('pointercancel', handleResizePointerUpOrCancel);
  if (state.panel) {
    state.panel.classList.remove('is-resizing');
  }
  state.resizeState = null;
}

function saveSize(size) {
  currentSettings.tableOfContentsSize = size;
  if (!chrome || !chrome.storage || !chrome.storage.sync) {
    return;
  }
  chrome.storage.sync.set({ tableOfContentsSize: size }, () => {
    if (chrome.runtime && chrome.runtime.lastError) {
      // console.error(chrome.runtime.lastError);
    }
  });
}

function updatePanelDirection() {
  if (!state.panel) {
    return;
  }
  const content = state.list && state.list.textContent ? state.list.textContent : '';
  const isRtl = TOC_RTL_CHAR_REGEX.test(content);
  state.isRtlPanel = isRtl;
  const dir = isRtl ? 'rtl' : 'ltr';
  if (state.panel.getAttribute('dir') !== dir) {
    state.panel.setAttribute('dir', dir);
  }
  state.panel.classList.toggle('is-rtl', isRtl);
  state.panel.setAttribute('aria-label', isRtl ? 'فهرست مطالب' : 'Conversation outline');
  if (state.heading) {
    state.heading.textContent = isRtl ? 'فهرست مطالب' : 'Table of contents';
  }
  updateCollapseButton(state, Boolean(currentSettings?.tableOfContentsCollapsed));
}

function collectAssistantMessages() {
  const nodes = document.querySelectorAll(MESSAGE_SELECTOR);
  if (!nodes || !nodes.length) {
    return [];
  }
  const seen = new Set();
  const results = [];

  nodes.forEach((node) => {
    const root = findMessageRoot(node);
    if (!root || seen.has(root)) {
      return;
    }
    seen.add(root);
    if (isAssistantTurn(root)) {
      results.push(root);
    }
  });

  return results;
}

function findMessageRoot(node) {
  if (!(node instanceof HTMLElement)) {
    return null;
  }
  let current = node.closest(MESSAGE_SELECTOR);
  let lastMatch = null;
  while (current && current instanceof HTMLElement) {
    lastMatch = current;
    const parentMatch = current.parentElement ? current.parentElement.closest(MESSAGE_SELECTOR) : null;
    if (!parentMatch || parentMatch === current) {
      break;
    }
    current = parentMatch;
  }
  return lastMatch;
}

function isAssistantTurn(node) {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  const directRole = node.getAttribute('data-message-author-role') || (node.dataset ? node.dataset.messageAuthorRole : null);
  if (directRole === 'assistant') {
    return true;
  }
  const testId = (node.getAttribute('data-testid') || '').toLowerCase();
  if (testId.includes('assistant')) {
    return true;
  }
  const nestedRole = node.querySelector('[data-message-author-role]');
  if (nestedRole && nestedRole.getAttribute('data-message-author-role') === 'assistant') {
    return true;
  }
  return false;
}

function deriveTitle(message, index) {
  const heading = pluckHeading(message);
  if (heading) {
    return heading;
  }
  const snippet = extractSnippet(message);
  if (snippet) {
    return snippet;
  }
  return `Response ${index + 1}`;
}

function pluckHeading(message) {
  if (!(message instanceof HTMLElement)) {
    return '';
  }
  const markdown = message.querySelector('.markdown');
  if (!markdown) {
    return '';
  }
  const heading = markdown.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading || !heading.textContent) {
    return '';
  }
  return formatTitle(heading.textContent);
}

function extractSnippet(message) {
  if (!(message instanceof HTMLElement)) {
    return '';
  }
  const markdown = message.querySelector('.markdown');
  const target = markdown || message;
  const raw = target && target.textContent ? target.textContent : '';
  if (!raw) {
    return '';
  }
  const firstLine = raw
    .split('\n')
    .map((line) => line.trim())
    .find((line) => Boolean(line));
  if (!firstLine) {
    return '';
  }
  return formatTitle(firstLine);
}

function formatTitle(text) {
  if (!text) {
    return '';
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  let candidate = normalized;
  const clauseMatch = candidate.match(/^[^.!?]+/);
  if (clauseMatch && clauseMatch[0].length >= 24) {
    candidate = clauseMatch[0];
  }
  const words = candidate.split(' ').filter(Boolean);
  if (words.length > TOC_MAX_TITLE_WORDS) {
    candidate = words.slice(0, TOC_MAX_TITLE_WORDS).join(' ');
  }
  if (candidate.length > TOC_MAX_TITLE_LENGTH) {
    candidate = candidate.slice(0, TOC_MAX_TITLE_LENGTH - 1).trim();
  }
  if (candidate.length < normalized.length) {
    candidate = candidate.replace(/[.,;:!?-]+$/, '').trim();
    if (candidate && !candidate.endsWith('...')) {
      candidate = `${candidate}...`;
    }
  }
  return candidate || normalized.slice(0, TOC_MAX_TITLE_LENGTH);
}

function getMessageAnchorTarget(message) {
  if (!(message instanceof HTMLElement)) {
    return null;
  }
  const markdown = message.querySelector('.markdown');
  if (markdown instanceof HTMLElement) {
    return markdown;
  }
  return message;
}

function ensureMessageAnchorId(message) {
  if (!(message instanceof HTMLElement)) {
    return '';
  }
  const existing = message.getAttribute(TOC_ANCHOR_ATTR);
  if (existing) {
    return existing;
  }
  state.anchorCounter += 1;
  const identifier = `chatgpt-toc-${Date.now().toString(36)}-${state.anchorCounter}`;
  message.setAttribute(TOC_ANCHOR_ATTR, identifier);
  return identifier;
}

function handleClick(event) {
  const target = event.target instanceof HTMLElement ? event.target.closest('.chatgpt-toc-entry') : null;
  if (!target) {
    return;
  }
  const anchorId = target.dataset ? target.dataset.tocTarget : null;
  if (!anchorId) {
    return;
  }
  const selector = `[${TOC_ANCHOR_ATTR}="${escapeAttribute(anchorId)}"]`;
  const message = document.querySelector(selector);
  if (!message) {
    return;
  }
  event.preventDefault();
  scrollIntoView(message);
  highlight(message);
  if (event.detail && typeof target.blur === 'function') {
    target.blur();
  }
}

function escapeAttribute(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\\]\[]/g, '\\$&');
}

function scrollIntoView(element) {
  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  } catch (error) {
    element.scrollIntoView(true);
  }
}

function resolveHighlightColor() {
  if (!root) {
    return null;
  }
  if (isCustomThemeActive()) {
    return null;
  }
  const accent = getComputedStyle(root).getPropertyValue('--chatgpt-theme-accent');
  const fallback = TOC_ORIGINAL_HIGHLIGHT_COLOR;
  return (accent && accent.trim()) || fallback;
}

function highlight(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  const existingTimer = state.highlightTimers.get(element);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  element.classList.remove('chatgpt-toc-highlight-active');
  element.style.removeProperty('--toc-highlight-color');
  void element.offsetWidth;
  const highlightColor = resolveHighlightColor();
  if (highlightColor) {
    element.style.setProperty('--toc-highlight-color', highlightColor);
  }
  element.classList.add('chatgpt-toc-highlight-active');
  element.classList.add('chatgpt-toc-highlight-pulse');
  element.setAttribute('data-chatgpt-toc-highlighted', 'true');
  const timer = setTimeout(() => {
    element.classList.remove('chatgpt-toc-highlight-active');
    element.classList.remove('chatgpt-toc-highlight-pulse');
    element.removeAttribute('data-chatgpt-toc-highlighted');
    element.style.removeProperty('--toc-highlight-color');
    state.highlightTimers.delete(element);
  }, TOC_HIGHLIGHT_DURATION_MS);
  state.highlightTimers.set(element, timer);
}

function handleResize() {
  if (!isActive() || !state.panel) {
    return;
  }
  applySize(currentSettings);
  if (currentSettings.tableOfContentsPosition) {
    applyPlacement(currentSettings);
  }
}

function attachResizeListener() {
  if (resizeListenerAttached || typeof window === 'undefined') {
    return;
  }
  window.addEventListener('resize', handleResize);
  resizeListenerAttached = true;
}
