/**
 * Cleans the exported DOM by removing interactive elements and unwanted metadata.
 */

import { EXPORT_EQUATION_CLASS } from '../constants.js';

export function sanitizeExportNode(node) {
  const removableSelectors = [
    'button',
    'form',
    'textarea',
    'input',
    'nav',
    'aside',
    'header',
    'footer',
    '[role="navigation"]',
    '[data-testid="chat-composer"]',
    '[data-testid="clipboard-button"]',
    '[data-testid="toolbar"]',
    '[data-testid="conversation-turn-actions"]',
    '[data-testid="bottom-controls"]'
  ];

  removableSelectors.forEach((selector) => {
    node.querySelectorAll(selector).forEach((element) => element.remove());
  });

  node.querySelectorAll('[contenteditable]').forEach((element) => {
    element.removeAttribute('contenteditable');
  });
}

export function removeTrailingWhitespace(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const toTrim = [];
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    if (textNode.nodeValue) {
      const parent = textNode.parentNode;
      if (!parent || !isBlockElement(parent)) {
        continue;
      }

      const nextSibling = textNode.nextSibling;
      if (nextSibling && !isBlockElement(nextSibling)) {
        continue;
      }

      const trimmed = textNode.nodeValue.trimEnd();
      if (trimmed.length !== textNode.nodeValue.length) {
        toTrim.push({ node: textNode, value: trimmed });
      }
    }
  }
  toTrim.forEach(({ node, value }) => {
    node.nodeValue = value;
  });
}

function isBlockElement(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const computed = window.getComputedStyle(node);
  const display = computed ? computed.display : '';
  return ['block', 'flex', 'grid', 'table', 'flow-root', 'list-item'].includes(display) || node.tagName === 'BR';
}

export function hasRenderableContent(node) {
  const text = node.textContent ? node.textContent.trim() : '';
  if (text.length) {
    return true;
  }
  return Boolean(node.querySelector(`img, svg, pre, code, .katex, .katex-display, video, audio, .${EXPORT_EQUATION_CLASS}`));
}
