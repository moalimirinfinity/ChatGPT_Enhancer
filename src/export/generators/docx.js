/**
 * Logic for generating and downloading DOCX files using html-docx-js.
 *
 * Responsibilities:
 * - Prepare DOM for DOCX fidelity (code/table tweaks, direction, image normalization).
 * - Convert KaTeX to images when needed and dispatch IPC to the injected runner.
 * - Strip metadata cruft and inject DOCX-specific styles around the export root.
 */

import { DOCX_EXPORT_STYLE_BLOCK } from '../styles.js';
import { EXPORT_TURN_CLASS } from '../constants.js';
import { buildFilename } from '../utils/download.js';
import { ensureDocxRunnerLoaded, requestDocxGeneration } from '../utils/assets.js';
import { convertKatexToImages } from '../core/equations.js';

const DOCX_METADATA_CLASS = 'gpt-export-metadata';

export async function exportAsDocx(_stage, root) {
  stripDocxMetadata(root);

  prepareDocxSpecificAdjustments(root);
  normalizeImagesForDocx(root);
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

// Makes images DOCX-friendly and mitigates duplicated renders (e.g., DALL-E placeholders).
function normalizeImagesForDocx(root) {
  if (!root) {
    return;
  }
  stripPictureSources(root);
  removeHiddenImages(root);
  dedupeSequentialImages(root);
  dedupePerTurn(root);
}

function stripPictureSources(root) {
  const pictures = root.querySelectorAll('picture');
  pictures.forEach((picture) => {
    const sources = picture.querySelectorAll('source');
    sources.forEach((source) => source.remove());
  });
}

function removeHiddenImages(root) {
  const images = root.querySelectorAll('img');
  images.forEach((img) => {
    try {
      // DOCX export does not carry over ChatGPT's CSS that hides placeholders; remove them manually.
      const computed = window.getComputedStyle(img);
      const displayNone = computed.display === 'none';
      const visibilityHidden = computed.visibility === 'hidden';
      const zeroArea =
        (parseFloat(computed.width) || img.offsetWidth) <= 1 || (parseFloat(computed.height) || img.offsetHeight) <= 1;
      const ariaHidden = img.getAttribute('aria-hidden') === 'true' || img.hasAttribute('hidden');
      if (displayNone || visibilityHidden || zeroArea || ariaHidden) {
        img.remove();
      }
    } catch (error) {
      /* ignore */
    }
  });
}

// Removes immediately repeated images (same src/alt/title/srcset) to avoid multiplying layers.
function dedupeSequentialImages(container) {
  if (!container || !container.childNodes) {
    return;
  }
  let lastSignature = null;

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'img') {
        const signature = buildImageSignature(el);
        if (signature && signature === lastSignature) {
          el.remove();
          return;
        }
        lastSignature = signature;
      } else if (tag !== 'br') {
        if (hasMeaningfulContent(el)) {
          lastSignature = null;
        }
      }
      dedupeSequentialImages(el);
    } else if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue && node.nodeValue.trim()) {
        lastSignature = null;
      }
    }
  });
}

// Removes duplicate images within the same turn, even if separated by other elements,
// keeping the first occurrence of each unique src/srcset/alt/title combination.
function dedupePerTurn(root) {
  const turns = root.querySelectorAll(`.${EXPORT_TURN_CLASS}`) || [];
  turns.forEach((turn) => {
    const seen = new Set();
    Array.from(turn.querySelectorAll('img')).forEach((img) => {
      const signature = buildImageSignature(img);
      if (!signature) {
        return;
      }
      // Collapse repeated layers (placeholder + real image) within a single turn.
      if (seen.has(signature)) {
        img.remove();
        return;
      }
      seen.add(signature);
    });
  });
}

function buildImageSignature(el) {
  const src = el.getAttribute ? el.getAttribute('src') || el.src || '' : '';
  const srcset = el.getAttribute ? el.getAttribute('srcset') || '' : '';
  const alt = el.getAttribute ? el.getAttribute('alt') || '' : '';
  const title = el.getAttribute ? el.getAttribute('title') || '' : '';
  if (!src && !srcset) {
    return null;
  }
  return [src, srcset, alt, title].join('::');
}

function hasMeaningfulContent(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const text = element.textContent ? element.textContent.trim() : '';
  if (text) {
    return true;
  }
  return Array.from(element.childNodes || []).some((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return child.nodeValue && child.nodeValue.trim();
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      return hasMeaningfulContent(child);
    }
    return false;
  });
}
