import assert from 'node:assert/strict';
import test from 'node:test';

import { setupDom } from './helpers/dom.js';
import { ensurePanel, rebuildList } from '../src/content/toc/ui.js';

let tocModuleCounter = 0;
async function loadTocLogic() {
  tocModuleCounter += 1;
  const url = new URL(`../src/content/toc/logic.js?test=${tocModuleCounter}`, import.meta.url);
  return import(url.href);
}

function setupTocDom() {
  const dom = setupDom();
  if (!globalThis.chrome) {
    globalThis.chrome = {
      storage: {
        local: {
          set: () => {},
          remove: () => {}
        }
      }
    };
  }
  if (!globalThis.MutationObserver) {
    globalThis.MutationObserver =
      window.MutationObserver ||
      class MutationObserver {
        constructor() {}
        observe() {}
        disconnect() {}
      };
  }
  return {
    ...dom,
    cleanup: () => {
      dom.cleanup();
      delete globalThis.chrome;
      delete globalThis.MutationObserver;
    }
  };
}

function createConversationMessage({ role = 'assistant', text = 'Hello' } = {}) {
  const message = document.createElement('article');
  message.setAttribute('data-testid', 'conversation-turn');
  if (role) {
    message.setAttribute('data-message-author-role', role);
  }
  const markdown = document.createElement('div');
  markdown.className = 'markdown';
  markdown.textContent = text;
  message.appendChild(markdown);
  return { message, markdown };
}

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('toc rebuildList reuses entries and updates titles when changed', () => {
  const { cleanup } = setupTocDom();
  document.body.innerHTML = '';

  const state = {
    panel: null,
    list: null,
    collapseButton: null,
    heading: null,
    ids: { panelId: 'chatgpt-enhancer-toc-panel' }
  };

  ensurePanel(state, {});

  const msg1 = document.createElement('article');
  msg1.textContent = 'First response';
  const msg2 = document.createElement('article');
  msg2.textContent = 'Second response';

  const ensureMessageAnchorId = (target) => {
    if (!target.getAttribute('data-chatgpt-toc-id')) {
      target.setAttribute('data-chatgpt-toc-id', `toc-${Math.random().toString(36).slice(2, 8)}`);
    }
    return target.getAttribute('data-chatgpt-toc-id');
  };
  const deriveTitle = (message) => message.textContent.trim();

  rebuildList(state, [msg1, msg2], { ensureMessageAnchorId, deriveTitle });

  const firstItem = state.list.children[0];
  const firstButton = firstItem.querySelector('.chatgpt-toc-entry');

  rebuildList(state, [msg1, msg2], { ensureMessageAnchorId, deriveTitle });
  assert.equal(state.list.children[0], firstItem);
  assert.equal(state.list.querySelector('.chatgpt-toc-entry'), firstButton);

  msg1.textContent = 'Updated response';
  rebuildList(state, [msg1, msg2], { ensureMessageAnchorId, deriveTitle });
  assert.equal(firstButton.textContent, 'Updated response');

  cleanup();
});

test('toc uses index navigation when anchor attributes are missing', async (t) => {
  const { cleanup } = setupTocDom();
  const { TocManager } = await loadTocLogic();
  document.body.innerHTML = '';

  const main = document.createElement('main');
  document.body.appendChild(main);
  const messages = [
    createConversationMessage({ text: 'First' }),
    createConversationMessage({ text: 'Second' }),
    createConversationMessage({ text: 'Third' })
  ];
  messages.forEach(({ message }) => main.appendChild(message));

  let lastScrolled = null;
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
    lastScrolled = this;
  };

  t.after(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    TocManager.init({ enableFix: false, tableOfContents: false });
    cleanup();
  });

  TocManager.init({ enableFix: true, tableOfContents: true });
  await waitFor(300);

  const entries = document.querySelectorAll('.chatgpt-toc-entry');
  assert.equal(entries.length, 3);

  messages.forEach(({ markdown }) => {
    markdown.removeAttribute('data-chatgpt-toc-id');
  });

  entries[1].click();
  assert.equal(lastScrolled, messages[1].markdown);
});

test('toc anchors to the right when saved anchor is right', async () => {
  const { cleanup } = setupTocDom();
  const { TocManager } = await loadTocLogic();
  document.body.innerHTML = '';

  const main = document.createElement('main');
  document.body.appendChild(main);

  TocManager.init({
    enableFix: true,
    tableOfContents: true,
    tableOfContentsPosition: { top: 80, left: 700, rightGap: 20, anchor: 'right' }
  });

  const panel = document.querySelector('.chatgpt-toc-panel');
  assert.ok(panel);
  assert.equal(panel.style.right, '20px');
  assert.ok(panel.style.left === 'auto' || panel.style.left === '');

  TocManager.init({ enableFix: false, tableOfContents: false });
  await waitFor(250);
  cleanup();
});

test('toc mutation filter only reacts to assistant messages', async () => {
  const { cleanup } = setupTocDom();
  const { __test__ } = await loadTocLogic();
  document.body.innerHTML = '';

  const main = document.createElement('main');
  document.body.appendChild(main);

  const assistant = createConversationMessage({ role: 'assistant', text: 'Answer' });
  const user = createConversationMessage({ role: 'user', text: 'Question' });
  main.appendChild(assistant.message);
  main.appendChild(user.message);

  const assistantText = assistant.markdown.firstChild;
  const input = document.createElement('textarea');
  input.appendChild(document.createTextNode('draft'));
  document.body.appendChild(input);
  const inputText = input.firstChild;

  const messageSelector = '[data-testid="conversation-turn"]';

  assert.equal(
    __test__.mutationTouchesAssistant({ type: 'characterData', target: assistantText }, messageSelector),
    true
  );
  assert.equal(
    __test__.mutationTouchesAssistant({ type: 'characterData', target: inputText }, messageSelector),
    false
  );
  const added = createConversationMessage({ role: 'assistant', text: 'New reply' });
  assert.equal(
    __test__.mutationTouchesAssistant(
      { type: 'childList', target: main, addedNodes: [added.message], removedNodes: [] },
      messageSelector
    ),
    true
  );

  cleanup();
});
