import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PROMPTS_STORAGE_KEY,
  PROMPTS_REVISION_KEY,
  PROMPTS_STORAGE_BUDGET_BYTES,
  loadPrompts,
  savePromptsWithMerge
} from '../src/popup/prompts/manager.js';
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

test('savePromptsWithMerge replaces prompts when revisions match', async (t) => {
  const { chromeMock, getStore } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [{ id: 'prompt-1', title: 'Old', text: 'old value', updatedAt: 1 }],
    [PROMPTS_REVISION_KEY]: 2
  });
  global.chrome = chromeMock;

  const result = await savePromptsWithMerge(
    [{ id: 'prompt-1', title: 'New', text: 'new value', updatedAt: 5 }],
    2
  );

  assert.equal(result.revision, 3);
  const stored = getStore();
  assert.equal(stored[PROMPTS_STORAGE_KEY][0].text, 'new value');
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

test('savePromptsWithMerge merges and preserves most recent versions when revisions differ', async (t) => {
  const { chromeMock, getStore } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [
      { id: 'prompt-a', title: 'Alpha', text: 'keep me', updatedAt: 1 },
      { id: 'prompt-b', title: 'Beta', text: 'older beta', updatedAt: 2 }
    ],
    [PROMPTS_REVISION_KEY]: 5
  });
  global.chrome = chromeMock;

  const next = [
    { id: 'prompt-b', title: 'Beta', text: 'new beta', updatedAt: 3 },
    { id: 'prompt-c', title: 'Gamma', text: 'third', updatedAt: 2 }
  ];

  const result = await savePromptsWithMerge(next, 1);

  assert.equal(result.revision, 6);
  const storedPrompts = getStore()[PROMPTS_STORAGE_KEY];
  assert.deepEqual(
    storedPrompts.map((prompt) => prompt.id),
    ['prompt-b', 'prompt-c', 'prompt-a']
  );
  assert.equal(storedPrompts.find((prompt) => prompt.id === 'prompt-b').text, 'new beta');
  t.after(() => {
    delete global.chrome;
  });
});

test('savePromptsWithMerge rejects when prompt payload exceeds quota', async (t) => {
  const { chromeMock } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [],
    [PROMPTS_REVISION_KEY]: 0
  });
  global.chrome = chromeMock;
  const oversizedText = 'x'.repeat(PROMPTS_STORAGE_BUDGET_BYTES + 1024);

  await assert.rejects(
    savePromptsWithMerge([{ id: 'huge', title: 'Big', text: oversizedText, updatedAt: 1 }], 0),
    (error) =>
      error.code === 'PROMPTS_QUOTA_EXCEEDED' &&
      error.bytes > PROMPTS_STORAGE_BUDGET_BYTES &&
      error.budget === PROMPTS_STORAGE_BUDGET_BYTES
  );

  t.after(() => {
    delete global.chrome;
  });
});
