/**
 * Logic for generating and downloading DOCX files using html-docx-js.
 */
import { DOCX_EXPORT_STYLE_BLOCK } from '../styles.js';
import { EXPORT_TURN_CLASS } from '../constants.js';
import { buildFilename } from '../utils/download.js';
import { ensureDocxRunnerLoaded, requestDocxGeneration } from '../utils/assets.js';
import { convertKatexToImages } from '../core/equations.js';

const DOCX_METADATA_CLASS = 'gpt-export-metadata';
const DOCX_METADATA_ITEM_CLASS = 'gpt-export-metadata__item';
const DOCX_METADATA_LABEL_CLASS = 'gpt-export-metadata__label';
const DOCX_METADATA_VALUE_CLASS = 'gpt-export-metadata__value';
const DOCX_METADATA_TITLE_FALLBACK = 'ChatGPT Conversation';
const DOCX_METADATA_MAX_LENGTH = 220;
const DOCUMENT_TITLE_SUFFIXES = [' - ChatGPT', ' | ChatGPT', ' · ChatGPT'];

export async function exportAsDocx(_stage, root) {
  stripDocxMetadata(root);

  prepareDocxSpecificAdjustments(root);
  await convertKatexToImages(root);

  const filename = buildFilename('docx');
  const htmlContent = wrapForDocx(root.outerHTML);
  await ensureDocxRunnerLoaded();
  await requestDocxGeneration(htmlContent, filename);
}

function wrapForDocx(innerHtml) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<style>${DOCX_EXPORT_STYLE_BLOCK}</style>`,
    '</head>',
    '<body>',
    innerHtml,
    '</body>',
    '</html>'
  ].join('');
}

function stripDocxMetadata(root) {
  if (!root) {
    return;
  }
  const metadataNodes = root.querySelectorAll(`.${DOCX_METADATA_CLASS}`);
  metadataNodes.forEach((node) => node.remove());
}

function prepareDocxSpecificAdjustments(root) {
  const codeBlocks = root.querySelectorAll('pre');
  codeBlocks.forEach((block) => {
    block.style.setProperty('background-color', '#101327', 'important');
    block.style.setProperty('color', '#f5f6fb', 'important');
    block.style.setProperty('padding', '18px', 'important');
    block.style.setProperty('border-radius', '14px', 'important');
    block.style.setProperty('white-space', 'pre-wrap', 'important');
    block.style.setProperty('font-family', '"Consolas", "Courier New", monospace', 'important');
    block.style.setProperty('word-break', 'break-word', 'important');
    block.style.setProperty('word-wrap', 'break-word', 'important');
    block.style.setProperty('overflow-wrap', 'anywhere', 'important');
    block.style.setProperty('overflow-x', 'auto', 'important');
  });

  const inlineCodeNodes = root.querySelectorAll('code:not(pre code)');
  inlineCodeNodes.forEach((node) => {
    node.style.setProperty('background-color', '#eef1ff', 'important');
    node.style.setProperty('color', '#101327', 'important');
    node.style.setProperty('padding', '2px 4px', 'important');
    node.style.setProperty('border-radius', '6px', 'important');
    node.style.setProperty('font-family', '"Consolas", "Courier New", monospace', 'important');
  });

  const blockquotes = root.querySelectorAll('blockquote');
  blockquotes.forEach((node) => {
    node.style.setProperty('border-left', '4px solid #d9dcef', 'important');
    node.style.setProperty('padding-left', '16px', 'important');
    node.style.setProperty('margin', '0 0 16px', 'important');
  });

  const lists = root.querySelectorAll('ul, ol');
  lists.forEach((node) => {
    node.style.setProperty('margin', '0 0 16px 24px', 'important');
    node.style.setProperty('padding', '0', 'important');
  });

  const tables = root.querySelectorAll('table');
  tables.forEach((table) => {
    table.style.setProperty('width', '100%', 'important');
    table.style.setProperty('border-collapse', 'collapse', 'important');
    table.style.setProperty('margin-bottom', '16px', 'important');
  });

  const tableCells = root.querySelectorAll('th, td');
  tableCells.forEach((cell) => {
    cell.style.setProperty('border', '1px solid #cdd2e5', 'important');
    cell.style.setProperty('padding', '8px 10px', 'important');
    const cellDir = (cell.getAttribute('dir') || '').toLowerCase();
    const cellAlign = cellDir === 'rtl' ? 'right' : 'left';
    cell.style.setProperty('text-align', cellAlign, 'important');
    cell.style.setProperty('vertical-align', 'top', 'important');
    cell.style.setProperty('word-wrap', 'break-word', 'important');
    cell.style.setProperty('overflow-wrap', 'anywhere', 'important');
  });

  const images = root.querySelectorAll('img');
  images.forEach((img) => {
    img.style.setProperty('max-width', '100%', 'important');
    img.style.setProperty('height', 'auto', 'important');
    img.style.setProperty('display', 'block', 'important');
    img.style.setProperty('margin', '12px 0', 'important');
  });

  const directionalNodes = root.querySelectorAll('[dir]');
  directionalNodes.forEach((element) => {
    const dir = (element.getAttribute('dir') || '').toLowerCase();
    if (dir !== 'rtl' && dir !== 'ltr') {
      return;
    }
    element.style.setProperty('direction', dir, 'important');
    element.style.setProperty('unicode-bidi', 'isolate', 'important');
    if (!element.closest('pre, code')) {
      element.style.setProperty('text-align', dir === 'rtl' ? 'right' : 'left', 'important');
    }
  });
}

function buildDocxMetadata(root) {
  if (!root) {
    return null;
  }
  const title = sanitizeMetadataValue(trimDocumentTitle(document.title || DOCX_METADATA_TITLE_FALLBACK));
  const url =
    typeof window !== 'undefined' && window.location
      ? sanitizeMetadataValue(window.location.href, 320)
      : '';
  const timestamp = formatExportTimestamp(new Date());
  const turnCount =
    typeof root.querySelectorAll === 'function'
      ? root.querySelectorAll(`.${EXPORT_TURN_CLASS}`).length
      : 0;

  const items = [];
  if (title) {
    items.push({ label: 'Conversation', value: title });
  }
  if (timestamp) {
    items.push({ label: 'Exported', value: timestamp });
  }
  if (Number.isFinite(turnCount)) {
    items.push({ label: 'Turns', value: String(turnCount) });
  }
  if (url) {
    items.push({ label: 'Source', value: url });
  }

  return items.length ? items : null;
}

function insertDocxMetadata(root, items) {
  if (!root || !items || !items.length) {
    return null;
  }
  const container = document.createElement('section');
  container.className = DOCX_METADATA_CLASS;
  container.setAttribute('role', 'presentation');
  container.setAttribute('aria-label', 'Conversation details');

  items.forEach((item) => {
    if (!item?.value) {
      return;
    }
    const entry = document.createElement('div');
    entry.className = DOCX_METADATA_ITEM_CLASS;
    const labelNode = document.createElement('span');
    labelNode.className = DOCX_METADATA_LABEL_CLASS;
    labelNode.textContent = `${item.label}:`;
    const valueNode = document.createElement('span');
    valueNode.className = DOCX_METADATA_VALUE_CLASS;
    valueNode.textContent = item.value;
    entry.appendChild(labelNode);
    entry.appendChild(valueNode);
    container.appendChild(entry);
  });

  const firstChild = root.firstElementChild;
  if (firstChild) {
    root.insertBefore(container, firstChild);
  } else {
    root.appendChild(container);
  }

  return container;
}

function trimDocumentTitle(value) {
  if (!value || typeof value !== 'string') {
    return DOCX_METADATA_TITLE_FALLBACK;
  }
  let trimmed = value.trim();
  DOCUMENT_TITLE_SUFFIXES.forEach((suffix) => {
    if (trimmed.endsWith(suffix)) {
      trimmed = trimmed.slice(0, -suffix.length).trim();
    }
  });
  return trimmed || DOCX_METADATA_TITLE_FALLBACK;
}

function sanitizeMetadataValue(value, maxLength = DOCX_METADATA_MAX_LENGTH) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function formatExportTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  try {
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return date.toISOString();
  }
}
