import assert from 'node:assert/strict';
import test from 'node:test';

import { setupDom } from './helpers/dom.js';

let katexModuleCounter = 0;
async function loadKatexModule() {
  katexModuleCounter += 1;
  const url = new URL(`../src/content/fixers/katex.js?test=${katexModuleCounter}`, import.meta.url);
  return import(url.href);
}

test('katex protection applies to inline and display nodes in tables', async () => {
  const { cleanup } = setupDom();
  const { KatexManager } = await loadKatexModule();

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="katex-display"><span class="katex"><span class="katex-html"></span></span></div>
    <table><tr><td><span class="katex"><span class="katex-html"></span></span></td></tr></table>
  `;
  document.body.appendChild(container);

  KatexManager.apply(container);

  const display = container.querySelector('.katex-display');
  const inline = container.querySelector('table .katex');

  assert.ok(display?.classList.contains('gpt-enhancer-katex-protected'));
  assert.ok(inline?.classList.contains('gpt-enhancer-katex-protected'));

  cleanup();
});
