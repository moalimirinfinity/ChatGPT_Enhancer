/**
 * Main orchestrator for the export pipeline, managing the lifecycle from request to download.
 */
import { EXPORT_MESSAGE_TYPE, EXPORT_STAGE_CLASS, EXPORT_ROOT_CLASS } from './constants.js';
import { EXPORT_STYLE_BLOCK } from './styles.js';
import { ensureExportFontsLoaded } from './utils/assets.js';
import { ensureConversationContentLoaded, collectConversation } from './core/scraper.js';
import { sanitizeExportNode, removeTrailingWhitespace, hasRenderableContent } from './core/sanitizer.js';
import {
  normalizeUnsupportedColors,
  ensureDirectionalConsistency,
  insertRtlWeightBoundaries
} from './core/normalizer.js';
import { inlineImages } from './core/images.js';
import { getGenerator } from './generators/index.js';

function normalizeExportFormat(format) {
  if (!format || typeof format !== 'string') {
    return 'pdf';
  }
  const normalized = format.trim().toLowerCase();
  if (normalized === 'md') {
    return 'markdown';
  }
  if (['pdf', 'docx', 'png', 'json', 'markdown', 'csv'].includes(normalized)) {
    return normalized;
  }
  return 'pdf';
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== EXPORT_MESSAGE_TYPE) {
    return undefined;
  }

  handleExportRequest(message.format || 'pdf')
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });

  return true;
});

function dispatchExportSuccessEvent() {
  if (typeof document === 'undefined') {
    return;
  }
  const event = new CustomEvent('GPT_ENHANCER_EXPORT_SUCCESS');
  document.dispatchEvent(event);
}

async function handleExportRequest(format) {
  const exportFormat = normalizeExportFormat(format);
  const { root, stage, styleNode } = await prepareExportStage();
  try {
    normalizeUnsupportedColors(root);
    ensureDirectionalConsistency(root);
    insertRtlWeightBoundaries(root);
    await ensureExportFontsLoaded();
    await inlineImages(root);

    const generator = getGenerator(exportFormat);
    if (!generator) {
      throw new Error(`No generator available for format: ${exportFormat}`);
    }
    await generator(exportFormat === 'png' ? stage : root, root);
    dispatchExportSuccessEvent();
  } finally {
    if (styleNode && styleNode.parentNode) {
      styleNode.parentNode.removeChild(styleNode);
    }
    if (stage && typeof stage.remove === 'function') {
      stage.remove();
    } else if (stage && stage.parentNode) {
      stage.parentNode.removeChild(stage);
    }
  }
}

async function prepareExportStage() {
  await ensureConversationContentLoaded();
  const exportRoot = collectConversation(sanitizeExportNode, hasRenderableContent, removeTrailingWhitespace);
  if (!exportRoot) {
    throw new Error('Unable to locate conversation content on this page.');
  }

  const stage = document.createElement('div');
  stage.className = EXPORT_STAGE_CLASS;
  stage.style.position = 'fixed';
  stage.style.top = '0';
  stage.style.left = '0';
  stage.style.width = '672px';
  stage.style.opacity = '0';
  stage.style.zIndex = '-1';
  stage.style.pointerEvents = 'none';
  stage.style.userSelect = 'none';
  stage.setAttribute('aria-hidden', 'true');
  stage.setAttribute('role', 'presentation');

  const styleNode = document.createElement('style');
  styleNode.textContent = EXPORT_STYLE_BLOCK;
  stage.appendChild(styleNode);
  stage.appendChild(exportRoot);
  document.body.appendChild(stage);

  return { root: exportRoot, stage, styleNode };
}

export { handleExportRequest };
