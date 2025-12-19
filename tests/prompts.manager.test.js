import assert from 'node:assert/strict';
import test from 'node:test';

import { PROMPTS_STORAGE_KEY, PROMPTS_REVISION_KEY, loadPrompts, savePromptsWithMerge } from '../src/popup/prompts/manager.js';
import { createChromeStorageMock } from './helpers/chrome-mock.js';

test('loadPrompts falls back when storage is unavailable', async (t) => {
  delete global.chrome;
  const result = await loadPrompts();
  assert.deepEqual(result, { prompts: [], revision: 0 });
  t.after(() => {
    delete global.chrome;
  });
});

test('loadPrompts reads stored prompts', async (t) => {
  const { chromeMock } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [{ id: 'one', title: 'Saved', text: 'hello' }],
    [PROMPTS_REVISION_KEY]: 3
  });
  global.chrome = chromeMock;

  const result = await loadPrompts();
  assert.equal(result.prompts.length, 1);
  assert.equal(result.prompts[0].text, 'hello');
  assert.equal(result.revision, 3);

  t.after(() => {
    delete global.chrome;
  });
});

test('savePrompts writes to storage and surfaces errors', async (t) => {
  const { chromeMock, getStore, triggerErrorOnce } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: []
  });
  global.chrome = chromeMock;

  const firstSave = await savePromptsWithMerge([{ id: 'a', text: 'hi' }], 0);
  assert.equal(getStore()[PROMPTS_STORAGE_KEY][0].text, 'hi');
  assert.equal(getStore()[PROMPTS_REVISION_KEY], firstSave.revision);
  assert.equal(firstSave.revision, 1);

  triggerErrorOnce(new Error('quota'));
  await assert.rejects(() => savePromptsWithMerge([{ id: 'b', text: 'fail' }], firstSave.revision), /quota/);

  t.after(() => {
    delete global.chrome;
  });
});
