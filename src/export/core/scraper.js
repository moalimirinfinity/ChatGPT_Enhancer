/**
 * Handles virtualization scrolling and extraction of conversation nodes from the DOM.
 */

import { EXPORT_ROOT_CLASS, EXPORT_TURN_CLASS } from '../constants.js';
import { delay } from '../utils/time.js';
import { MESSAGE_SELECTOR } from '../../content/constants.js';

const MAX_VIRTUAL_SCROLL_ATTEMPTS = 16;
const IDLE_ATTEMPTS_THRESHOLD = 3;
const SCAN_DELAY_MS = 180;
const EMPTY_DELAY_MS = 120;

export async function ensureConversationContentLoaded() {
  const selector = MESSAGE_SELECTOR;
  const main = document.querySelector('main');
  const container = main || document.body;
  if (!container) {
    return;
  }

  const scrollHost =
    main ||
    (document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : document.documentElement instanceof HTMLElement
      ? document.documentElement
      : null);
  const originalWindowScroll = { x: window.scrollX, y: window.scrollY };
  const originalScrollTop = scrollHost ? scrollHost.scrollTop : null;

  try {
    await exhaustVirtualizedContent(container, scrollHost, selector, 'start');
    await exhaustVirtualizedContent(container, scrollHost, selector, 'end');
  } finally {
    if (scrollHost && typeof originalScrollTop === 'number') {
      scrollHost.scrollTop = originalScrollTop;
    }
    window.scrollTo(originalWindowScroll.x, originalWindowScroll.y);
  }
}

async function exhaustVirtualizedContent(container, scrollHost, selector, direction) {
  const maxAttempts = MAX_VIRTUAL_SCROLL_ATTEMPTS;
  let previousCount = container.querySelectorAll(selector).length;
  let idleAttempts = 0;

  for (let attempt = 0; attempt < maxAttempts && idleAttempts < IDLE_ATTEMPTS_THRESHOLD; attempt += 1) {
    const nodes = container.querySelectorAll(selector);
    if (!nodes.length) {
      await delay(EMPTY_DELAY_MS);
      continue;
    }

    if (direction === 'end') {
      const last = nodes[nodes.length - 1];
      if (last && typeof last.scrollIntoView === 'function') {
        last.scrollIntoView({ block: 'end', inline: 'nearest' });
      }
      if (scrollHost) {
        scrollHost.scrollTop = scrollHost.scrollHeight;
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    } else {
      const first = nodes[0];
      if (first && typeof first.scrollIntoView === 'function') {
        first.scrollIntoView({ block: 'start', inline: 'nearest' });
      }
      if (scrollHost) {
        scrollHost.scrollTop = 0;
      } else {
        window.scrollTo(0, 0);
      }
    }

    await delay(SCAN_DELAY_MS);
    const currentCount = container.querySelectorAll(selector).length;
    if (currentCount === previousCount) {
      idleAttempts += 1;
    } else {
      previousCount = currentCount;
      idleAttempts = 0;
    }
  }
}

export function collectConversation(sanitizeFn, hasRenderableContentFn, finalizeFn) {
  const exportRoot = document.createElement('div');
  exportRoot.className = EXPORT_ROOT_CLASS;

  let nodes = Array.from(document.querySelectorAll(MESSAGE_SELECTOR));
  nodes = nodes.filter((node, _, collection) => {
    return !collection.some((other) => other !== node && other.contains(node));
  });

  if (!nodes.length) {
    const main = document.querySelector('main');
    if (main) {
      nodes = Array.from(main.children);
    }
  }

  const cleaned = nodes
    .map((node) => node.cloneNode(true))
    .map((node) => {
      sanitizeFn(node);
      node.classList.add(EXPORT_TURN_CLASS);
      node.style.setProperty('page-break-inside', 'avoid', 'important');
      node.style.setProperty('break-inside', 'avoid', 'important');
      return node;
    })
    .filter(hasRenderableContentFn);

  cleaned.forEach((node) => exportRoot.appendChild(node));

  if (!exportRoot.children.length) {
    return null;
  }

  finalizeFn(exportRoot);
  return exportRoot;
}
