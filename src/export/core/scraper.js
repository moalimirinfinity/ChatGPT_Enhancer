/**
 * Handles virtualization scrolling and extraction of conversation nodes from the DOM.
 *
 * Responsibilities:
 * - Drive virtualized ChatGPT threads to load all turns (sentinels + mutation observation).
 * - Collect message nodes, sanitize/normalize them, and assemble an export root.
 * - Fall back gracefully when selectors change, while avoiding scroll fights with the user.
 */

import { EXPORT_ROOT_CLASS, EXPORT_TURN_CLASS } from '../constants.js';
import { MESSAGE_SELECTOR } from '../../content/constants.js';

const VIRTUAL_IDLE_MS = 600;
const VIRTUAL_PASS_TIMEOUT_MS = 12000;
const VIRTUAL_GLOBAL_TIMEOUT_MS = 20000;

// Uses invisible sentinels + mutation tracking to gently drive virtualized lists
// without fighting the user's scroll. We scroll sentinels into view, wait for
// DOM mutations to settle, and bail early if the user touches the page.
export async function ensureConversationContentLoaded() {
  const selector = MESSAGE_SELECTOR;
  const main = document.querySelector('main');
  const container = main || document.body;
  if (!container) {
    return;
  }

  const scrollHost = resolveScrollHost(main);
  const originalScroll = snapshotScrollPosition(scrollHost);
  const { topSentinel, bottomSentinel, cleanup: cleanupSentinels } = injectSentinels(container);
  const mutationTracker = createMutationTracker(container, selector);
  const scrollGuard = createScrollGuard(scrollHost);
  const globalDeadline = performance.now() + VIRTUAL_GLOBAL_TIMEOUT_MS;

  try {
    await driveVirtualizedSweep('end', {
      sentinel: bottomSentinel,
      mutationTracker,
      scrollGuard,
      deadline: globalDeadline
    });
    await driveVirtualizedSweep('start', {
      sentinel: topSentinel,
      mutationTracker,
      scrollGuard,
      deadline: globalDeadline
    });
  } finally {
    cleanupSentinels();
    mutationTracker.disconnect();
    scrollGuard.dispose();
    restoreScrollPosition(scrollHost, originalScroll);
  }
}

async function driveVirtualizedSweep(direction, context) {
  const { sentinel, mutationTracker, scrollGuard } = context;
  let passDeadline = context.deadline;
  if (!Number.isFinite(passDeadline)) {
    passDeadline = performance.now() + VIRTUAL_PASS_TIMEOUT_MS;
  } else {
    passDeadline = Math.min(passDeadline, performance.now() + VIRTUAL_PASS_TIMEOUT_MS);
  }

  let previousCount = mutationTracker.getCount();
  const scrollBlock = direction === 'end' ? 'end' : 'start';

  while (performance.now() < passDeadline) {
    scrollGuard.runProgrammatic(() => {
      sentinel.scrollIntoView({ block: scrollBlock, inline: 'nearest', behavior: 'auto' });
    });

    const idleState = await waitForQuietWindow(mutationTracker, scrollGuard, passDeadline);
    if (idleState === 'interrupted') {
      throw createUserScrollError();
    }
    if (idleState === 'timeout') {
      break;
    }

    const currentCount = mutationTracker.getCount();
    if (idleState === 'idle' && currentCount === previousCount) {
      break;
    }
    previousCount = currentCount;
  }
}

function createMutationTracker(container, selector) {
  let lastMutationTs = performance.now();
  const countMessages = () => {
    try {
      return container.querySelectorAll(selector).length;
    } catch (error) {
      return 0;
    }
  };

  let messageCount = countMessages();
  const observer = new MutationObserver((mutations) => {
    if (!mutations || !mutations.length) {
      return;
    }
    lastMutationTs = performance.now();
    messageCount = countMessages();
  });
  observer.observe(container, { childList: true, subtree: true });

  return {
    getCount: () => messageCount,
    idleFor: () => performance.now() - lastMutationTs,
    disconnect: () => observer.disconnect()
  };
}

function createScrollGuard(scrollHost) {
  let interrupted = false;
  let programmaticDepth = 0;

  const host = scrollHost || window;
  // If the user scrolls while we're driving virtualization, abort to avoid a tug-of-war.
  const onScroll = () => {
    if (programmaticDepth === 0) {
      interrupted = true;
    }
  };
  host.addEventListener('scroll', onScroll, { passive: true });

  return {
    runProgrammatic(fn) {
      programmaticDepth += 1;
      try {
        fn();
      } finally {
        programmaticDepth = Math.max(0, programmaticDepth - 1);
      }
    },
    isInterrupted: () => interrupted,
    dispose() {
      host.removeEventListener('scroll', onScroll);
    }
  };
}

function waitForQuietWindow(mutationTracker, scrollGuard, deadline) {
  return new Promise((resolve) => {
    // Poll using requestIdleCallback (or setTimeout) until we see a quiet window
    // with no mutations for VIRTUAL_IDLE_MS, or until the deadline is hit.
    const check = () => {
      if (scrollGuard.isInterrupted()) {
        resolve('interrupted');
        return;
      }
      const now = performance.now();
      if (now >= deadline) {
        resolve('timeout');
        return;
      }
      if (mutationTracker.idleFor() >= VIRTUAL_IDLE_MS) {
        resolve('idle');
        return;
      }
      const remainingIdle = Math.max(16, VIRTUAL_IDLE_MS - mutationTracker.idleFor());
      const remainingBudget = Math.max(16, Math.min(remainingIdle, deadline - now));
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(check, { timeout: remainingBudget });
      } else {
        window.setTimeout(check, Math.min(120, remainingBudget));
      }
    };
    check();
  });
}

function snapshotScrollPosition(scrollHost) {
  if (scrollHost) {
    return { top: scrollHost.scrollTop, left: scrollHost.scrollLeft };
  }
  return { top: window.scrollY, left: window.scrollX };
}

function restoreScrollPosition(scrollHost, snapshot) {
  if (!snapshot) {
    return;
  }
  if (scrollHost) {
    scrollHost.scrollTo({ top: snapshot.top, left: snapshot.left });
    return;
  }
  window.scrollTo(snapshot.left, snapshot.top);
}

function resolveScrollHost(main) {
  if (main && isScrollable(main)) {
    return main;
  }
  if (document.scrollingElement instanceof HTMLElement && isScrollable(document.scrollingElement)) {
    return document.scrollingElement;
  }
  if (document.documentElement instanceof HTMLElement && isScrollable(document.documentElement)) {
    return document.documentElement;
  }
  if (document.body instanceof HTMLElement && isScrollable(document.body)) {
    return document.body;
  }
  return null;
}

function isScrollable(element) {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  return element.scrollHeight - element.clientHeight > 8;
}

function injectSentinels(container) {
  const createSentinel = () => {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    sentinel.style.margin = '0';
    sentinel.style.padding = '0';
    sentinel.style.border = '0';
    sentinel.style.position = 'relative';
    return sentinel;
  };

  const topSentinel = createSentinel();
  const bottomSentinel = createSentinel();
  container.prepend(topSentinel);
  container.appendChild(bottomSentinel);

  return {
    topSentinel,
    bottomSentinel,
    cleanup() {
      topSentinel.remove();
      bottomSentinel.remove();
    }
  };
}

function createUserScrollError() {
  const error = new Error('Export paused because you scrolled during capture. Please retry when the page is idle.');
  error.code = 'export-interrupted';
  return error;
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
    const fallbackContainer = document.querySelector('main') || document.body;
    if (fallbackContainer) {
      // Soft fallback: if selectors no longer match, clone the main container
      // so we can still attempt an export instead of failing outright.
      const fallback = fallbackContainer.cloneNode(true);
      sanitizeFn(fallback);
      fallback.classList.add(EXPORT_TURN_CLASS);
      fallback.style.setProperty('page-break-inside', 'avoid', 'important');
      fallback.style.setProperty('break-inside', 'avoid', 'important');
      if (hasRenderableContentFn(fallback)) {
        exportRoot.appendChild(fallback);
      }
    }
  }

  if (!exportRoot.children.length) {
    return null;
  }

  finalizeFn(exportRoot);
  return exportRoot;
}
