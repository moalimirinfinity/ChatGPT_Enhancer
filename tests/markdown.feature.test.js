import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeExportRootToMarkdown } from '../src/export/utils/serialization.js';
import { setupDom } from './helpers/dom.js';

function createTurn(role = 'user') {
  const turn = document.createElement('article');
  turn.setAttribute('data-message-author-role', role);
  return turn;
}

test('markdown export preserves hard line breaks and encodes link destinations', () => {
  const { cleanup } = setupDom();
  document.title = 'Markdown Test';

  const root = document.createElement('div');
  const turn = createTurn('user');
  turn.innerHTML = '<p>Hello<br>World <a href="https://example.com/foo_(bar)">link</a></p>';
  root.appendChild(turn);

  const output = serializeExportRootToMarkdown(root);

  assert.ok(output.includes('Hello<br>World'));
  assert.ok(output.includes('[link](https://example.com/foo_%28bar%29)'));

  cleanup();
});

test('markdown export avoids extra equation padding and uses pre class language', () => {
  const { cleanup } = setupDom();
  document.title = 'Markdown Test';

  const root = document.createElement('div');
  const turn = createTurn('assistant');
  turn.innerHTML = `
    <p>Before</p>
    <div class="katex katex-display">
      <span class="katex-mathml">
        <annotation encoding="application/x-tex">\\int_0^1 x dx</annotation>
      </span>
    </div>
    <p>After</p>
    <pre class="language-js"><code>const x = 1;</code></pre>
  `;
  root.appendChild(turn);

  const output = serializeExportRootToMarkdown(root);

  assert.ok(output.includes('$$\n\\int_0^1 x dx\n$$'));
  assert.equal(output.includes('Before\n\n\n$$'), false);
  assert.equal(output.includes('$$\n\n\nAfter'), false);
  assert.ok(output.includes('```js\nconst x = 1;\n```'));

  cleanup();
});
