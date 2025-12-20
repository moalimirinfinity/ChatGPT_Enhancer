import assert from 'node:assert/strict';
import test from 'node:test';

import { createPromptController } from '../src/popup/prompts/controller.js';
import { PROMPTS_REVISION_KEY, PROMPTS_STORAGE_KEY } from '../src/popup/prompts/manager.js';
import { createChromeStorageMock } from './helpers/chrome-mock.js';
import { setupDom, createPromptControls } from './helpers/dom.js';
import { createIdGenerator, createNormalizePromptCollection } from './helpers/prompts.js';

function buildPromptController() {
  const { cleanup } = setupDom();
  const controls = createPromptControls();
  const generatePromptId = createIdGenerator();
  const normalizePromptCollection = createNormalizePromptCollection(generatePromptId);
  const errors = [];
  const promptCopyTimers = new Map();
  const promptSearchQueryRef = { value: '' };

  const controller = createPromptController({
    controls,
    normalizePromptCollection,
    generatePromptId,
    PROMPT_TEXT_MAX_LENGTH: 8000,
    PROMPTS_EMPTY_DEFAULT_PRIMARY: 'No prompts yet.',
    PROMPTS_EMPTY_DEFAULT_SECONDARY: 'Add your first prompt.',
    PROMPTS_EMPTY_FILTERED_PRIMARY: 'No matches found.',
    PROMPTS_EMPTY_FILTERED_SECONDARY: 'Try a different search.',
    setAccordionExpanded: () => {},
    promptSearchQueryRef,
    promptCopyTimers,
    showPromptError: (message) => errors.push(message),
    clearPromptError: () => {
      errors.length = 0;
    },
    setPromptsCountLabel: (count) => {
      if (controls.promptsCountLabel) {
        controls.promptsCountLabel.textContent = count === 1 ? 'prompt' : 'prompts';
      }
    },
    focusPromptHandle: () => {}
  });

  return { controller, controls, errors, cleanup };
}

test('loadPromptsFromStorage renders stored prompts and counts', async (t) => {
  const { chromeMock } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [{ id: 'prompt-1', title: 'Saved', text: 'Hello world', updatedAt: 1 }],
    [PROMPTS_REVISION_KEY]: 2
  });
  global.chrome = chromeMock;

  const { controller, controls, errors, cleanup } = buildPromptController();
  t.after(() => {
    cleanup();
    delete global.chrome;
  });

  await controller.loadPromptsFromStorage();

  assert.equal(controls.promptList.children.length, 1);
  assert.equal(controls.promptsCount.textContent, '1');
  assert.equal(errors.length, 0);
  assert.equal(controls.promptsEmpty.hidden, true);
});

test('handlePromptFormSubmit adds and edits prompts while persisting to storage', async (t) => {
  const { chromeMock, getStore } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [],
    [PROMPTS_REVISION_KEY]: 0
  });
  global.chrome = chromeMock;

  const { controller, controls, errors, cleanup } = buildPromptController();
  t.after(() => {
    cleanup();
    delete global.chrome;
  });

  await controller.loadPromptsFromStorage();

  const added = await controller.handlePromptFormSubmit({ title: 'First', text: 'Hello prompt' });
  assert.ok(added.ok);
  assert.equal(controller.prompts.length, 1);
  assert.equal(controls.promptList.children.length, 1);
  assert.equal(controls.promptsCount.textContent, '1');

  const storedAfterAdd = getStore()[PROMPTS_STORAGE_KEY];
  const promptId = storedAfterAdd[0].id;

  controller.setEditingPromptId(promptId);
  const updated = await controller.handlePromptFormSubmit({
    title: 'First updated',
    text: 'Updated prompt text'
  });
  assert.ok(updated.ok);
  assert.equal(controller.prompts[0].text, 'Updated prompt text');
  assert.equal(getStore()[PROMPTS_STORAGE_KEY][0].text, 'Updated prompt text');
  assert.equal(errors.length, 0);
});

test('confirmPromptDeletion removes prompts when confirmed', async (t) => {
  const { chromeMock, getStore } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [],
    [PROMPTS_REVISION_KEY]: 0
  });
  global.chrome = chromeMock;

  const { controller, controls, cleanup } = buildPromptController();
  t.after(() => {
    cleanup();
    delete global.chrome;
  });

  await controller.handlePromptFormSubmit({ title: 'One', text: 'First prompt' });
  await controller.handlePromptFormSubmit({ title: 'Two', text: 'Second prompt' });

  const firstId = controller.prompts[0].id;
  const deletion = await controller.confirmPromptDeletion(firstId, () => true);

  assert.ok(deletion.ok);
  assert.equal(controller.prompts.length, 1);
  assert.equal(controls.promptList.children.length, 1);
  assert.equal(getStore()[PROMPTS_STORAGE_KEY].length, 1);
});

test('handlePromptSearch filters prompts and disables drag handles', async (t) => {
  const { chromeMock } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [],
    [PROMPTS_REVISION_KEY]: 0
  });
  global.chrome = chromeMock;

  const { controller, controls, cleanup } = buildPromptController();
  t.after(() => {
    cleanup();
    delete global.chrome;
  });

  await controller.handlePromptFormSubmit({ title: 'Alpha', text: 'alpha prompt' });
  await controller.handlePromptFormSubmit({ title: 'Beta', text: 'beta prompt' });

  controller.handlePromptSearch('beta');

  assert.equal(controls.promptList.children.length, 1);
  assert.equal(controls.promptList.getAttribute('data-filtered'), 'true');
  const handle = controls.promptList.querySelector('.prompt-card__handle');
  assert.ok(handle);
  assert.equal(handle.draggable, false);
});

test('applyPromptOrderFromDom persists manual reorders', async (t) => {
  const { chromeMock, getStore } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [],
    [PROMPTS_REVISION_KEY]: 0
  });
  global.chrome = chromeMock;

  const { controller, controls, cleanup } = buildPromptController();
  t.after(() => {
    cleanup();
    delete global.chrome;
  });

  await controller.handlePromptFormSubmit({ title: 'First', text: 'first prompt' });
  await controller.handlePromptFormSubmit({ title: 'Second', text: 'second prompt' });

  const [firstCard, secondCard] = controls.promptList.querySelectorAll('.prompt-card');
  controls.promptList.insertBefore(secondCard, firstCard);
  await controller.applyPromptOrderFromDom();

  const orderedIds = controller.prompts.map((prompt) => prompt.id);
  const storedIds = getStore()[PROMPTS_STORAGE_KEY].map((prompt) => prompt.id);
  assert.deepEqual(orderedIds, storedIds);
  assert.equal(orderedIds[0], secondCard.dataset.id);
});

test('copyPromptToClipboard shows success feedback and handles failures', async (t) => {
  const { chromeMock } = createChromeStorageMock({
    [PROMPTS_STORAGE_KEY]: [],
    [PROMPTS_REVISION_KEY]: 0
  });
  global.chrome = chromeMock;

  const { controller, controls, errors, cleanup } = buildPromptController();
  t.after(() => {
    cleanup();
    delete global.chrome;
  });

  await controller.handlePromptFormSubmit({ title: 'Copy me', text: 'copy content' });
  const copyButton = controls.promptList.querySelector('.prompt-card__action--copy');
  let clipboardValue = '';
  navigator.clipboard.writeText = async (value) => {
    clipboardValue = value;
  };

  const success = await controller.copyPromptToClipboard(controller.prompts[0].id, copyButton);
  assert.ok(success.ok);
  assert.equal(clipboardValue, 'copy content');
  assert.equal(copyButton.disabled, true);
  assert.ok(copyButton.classList.contains('is-copied'));
  assert.equal(errors.length, 0);

  navigator.clipboard.writeText = async () => {
    throw new Error('clipboard blocked');
  };
  const failure = await controller.copyPromptToClipboard(controller.prompts[0].id, copyButton);
  assert.equal(failure.ok, false);
  assert.ok(errors.some((message) => message.includes('Unable to copy prompt')));
});
