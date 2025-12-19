import assert from 'node:assert/strict';
import test from 'node:test';

import { PROMPTS_STORAGE_KEY, loadPrompts, savePrompts } from '../src/popup/prompts/manager.js';
import { createChromeStorageMock } from './helpers/chrome-mock.js';

test('loadPrompts falls back when storage is unavailable', async (t) => {
  delete global.chrome;
  const result = await loadPrompts();
  assert.deepEqual(result, []);
  t.after(() => {
    delete global.chrome;
  });
});

test('loadPrompts reads stored prompts', async (t) => {
  const { chromeMock } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [{ id: 'one', title: 'Saved', text: 'hello' }]
  });
  global.chrome = chromeMock;

  const prompts = await loadPrompts();
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].text, 'hello');

  t.after(() => {
    delete global.chrome;
  });
});

test('savePrompts writes to storage and surfaces errors', async (t) => {
  const { chromeMock, getStore, triggerErrorOnce } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: []
  });
  global.chrome = chromeMock;

  await savePrompts([{ id: 'a', text: 'hi' }]);
  assert.equal(getStore()[PROMPTS_STORAGE_KEY][0].text, 'hi');

  triggerErrorOnce(new Error('quota'));
  await assert.rejects(() => savePrompts([{ id: 'b', text: 'fail' }]), /quota/);

  t.after(() => {
    delete global.chrome;
  });
});
