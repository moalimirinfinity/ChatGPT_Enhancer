import { DOCX_EXPORT_STYLE_BLOCK } from '../styles.js';
import { buildFilename, triggerDownload } from '../utils/download.js';
import { ensureHtmlDocxLoaded } from '../utils/assets.js';
import { convertKatexToImages } from '../core/equations.js';

export async function exportAsDocx(_stage, root) {
  prepareDocxSpecificAdjustments(root);
  await convertKatexToImages(root);

  const htmlDocx = await ensureHtmlDocxLoaded();
  if (!htmlDocx) {
    throw new Error('DOCX export failed: html-docx library not available');
  }
  const filename = buildFilename('docx');
  const htmlContent = wrapForDocx(root.outerHTML);
  const blob = htmlDocx.asBlob(htmlContent);
  triggerDownload(blob, filename);
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
