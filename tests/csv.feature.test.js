import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeExportRootToJson, buildCsvRows, formatCsvRow } from '../src/export/utils/serialization.js';
import { setupDom } from './helpers/dom.js';

function createTurn(role = 'user') {
  const turn = document.createElement('article');
  turn.setAttribute('data-message-author-role', role);
  return turn;
}

test('csv export preserves ordered list numbering', () => {
  const { cleanup } = setupDom();

  const root = document.createElement('div');
  const turn = createTurn('assistant');
  turn.innerHTML = '<ol start="3"><li>First</li><li>Second</li></ol>';
  root.appendChild(turn);

  const payload = serializeExportRootToJson(root);
  const rows = buildCsvRows(payload);
  const listRow = rows.find((row) => row[4] === 'list');

  assert.ok(listRow, 'expected a list block row');
  assert.equal(listRow[5], '3. First\n4. Second');

  cleanup();
});

test('csv export escapes formula-like text', () => {
  const { cleanup } = setupDom();

  const root = document.createElement('div');
  const turn = createTurn('user');
  turn.innerHTML = '<p>=SUM(1,2)</p>';
  root.appendChild(turn);

  const payload = serializeExportRootToJson(root);
  const rows = buildCsvRows(payload);
  const paragraphRow = rows.find((row) => row[4] === 'paragraph');

  assert.ok(paragraphRow, 'expected a paragraph row');
  const formatted = formatCsvRow(paragraphRow);
  assert.ok(formatted.includes("\"'=SUM(1,2)\""));

  cleanup();
});
