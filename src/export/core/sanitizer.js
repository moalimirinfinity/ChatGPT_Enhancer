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

export function hasRenderableContent(node) {
  const text = node.textContent ? node.textContent.trim() : '';
  if (text.length) {
    return true;
  }
  return Boolean(node.querySelector(`img, svg, pre, code, .katex, .katex-display, video, audio, .${EXPORT_EQUATION_CLASS}`));
}
