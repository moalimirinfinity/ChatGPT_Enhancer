import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeExportRootToJson, inlineFragmentsToPlainText, blocksToPlainText } from '../src/export/utils/serialization.js';
import { setupDom } from './helpers/dom.js';

function createTurn(role = 'user') {
  const turn = document.createElement('article');
  turn.setAttribute('data-message-author-role', role);
  return turn;
}

test('json export keeps list inline text with nested blocks and preserves numbering', () => {
  const { cleanup } = setupDom();

  const root = document.createElement('div');
  const turn = createTurn('assistant');
  turn.innerHTML = '<ol start="3"><li>Intro <pre><code>const x = 1;</code></pre> tail</li></ol>';
  root.appendChild(turn);

  const payload = serializeExportRootToJson(root);
  const list = payload.turns[0].blocks[0];

  assert.equal(list.type, 'list');
  assert.equal(list.ordered, true);
  assert.equal(list.start, 3);

  const item = list.items[0];
  const inlineText = inlineFragmentsToPlainText(item.content || []);
  assert.equal(item.number, 3);
  assert.equal(inlineText, 'Intro tail');
  assert.equal(item.blocks.length, 1);
  assert.equal(item.blocks[0].type, 'code');
  assert.equal(item.blocks[0].code, 'const x = 1;');

  cleanup();
});

test('json export avoids nested list text duplication in parent items', () => {
  const { cleanup } = setupDom();

  const root = document.createElement('div');
  const turn = createTurn('user');
  turn.innerHTML = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>';
  root.appendChild(turn);

  const payload = serializeExportRootToJson(root);
  const list = payload.turns[0].blocks[0];
  const parentItem = list.items[0];
  const parentText = inlineFragmentsToPlainText(parentItem.content || []);
  const childList = parentItem.children[0];
  const childText = inlineFragmentsToPlainText(childList.items[0].content || []);

  assert.equal(parentText, 'Parent');
  assert.equal(childText, 'Child');

  cleanup();
});

test('json export avoids table cell content duplication when blocks exist', () => {
  const { cleanup } = setupDom();

  const root = document.createElement('div');
  const turn = createTurn('assistant');
  turn.innerHTML = '<table><tr><td><p>Cell</p><ul><li>Item</li></ul></td></tr></table>';
  root.appendChild(turn);

  const payload = serializeExportRootToJson(root);
  const table = payload.turns[0].blocks[0];
  const cell = table.rows[0].cells[0];
  const inlineText = inlineFragmentsToPlainText(cell.content || []);
  const blockText = blocksToPlainText(cell.blocks || [], 0);

  assert.equal(inlineText, '');
  assert.ok(blockText.includes('Cell'));
  assert.ok(blockText.includes('Item'));

  cleanup();
});
