import assert from 'node:assert/strict';
import test from 'node:test';

import { RETENTION_COPY } from '../src/common/i18n.js';
import { createChromeStorageMock } from './helpers/chrome-mock.js';
import { setupDom } from './helpers/dom.js';

let retentionModuleCounter = 0;
async function loadRetentionModule() {
  retentionModuleCounter += 1;
  const url = new URL(`../src/content/retention.js?test=${retentionModuleCounter}`, import.meta.url);
  return import(url.href);
}

function tick(delay = 0) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

test('review popup is suppressed when extension is disabled', async (t) => {
  const { cleanup } = setupDom();
  const { chromeMock } = createChromeStorageMock({ enableFix: false });
  global.chrome = chromeMock;

  await loadRetentionModule();
  await tick();

  window.ReviewManager.showNow();
  await tick();

  assert.equal(document.querySelector('.chatgpt-review-popup'), null);

  t.after(() => {
    if (global.window && global.window.ReviewManager) {
      delete global.window.ReviewManager;
    }
    cleanup();
    delete global.chrome;
  });
});

test('review popup shows and reports blocked popups without navigating away', async (t) => {
  const { cleanup } = setupDom();
  const { chromeMock, getStore } = createChromeStorageMock();
  global.chrome = chromeMock;
  window.open = () => null;

  await loadRetentionModule();
  await tick();

  window.ReviewManager.showNow();
  await tick();

  const popup = document.querySelector('.chatgpt-review-popup');
  assert.ok(popup);
  const body = popup.querySelector('.chatgpt-review-body');
  const cta = popup.querySelector('.chatgpt-review-button');
  assert.ok(cta);
  cta.click();
  await tick();

  assert.equal(body.textContent, RETENTION_COPY.english.popupBlocked);
  assert.ok(document.querySelector('.chatgpt-review-popup'));
  assert.equal(getStore().gptEnhancerReviewCompleted, undefined);

  t.after(() => {
    if (global.window && global.window.ReviewManager) {
      delete global.window.ReviewManager;
    }
    cleanup();
    delete global.chrome;
  });
});

test('review popup stays hidden once review is completed', async (t) => {
  const { cleanup } = setupDom();
  const { chromeMock } = createChromeStorageMock({ gptEnhancerReviewCompleted: true });
  global.chrome = chromeMock;

  await loadRetentionModule();
  await tick();

  window.ReviewManager.showNow();
  await tick();

  assert.equal(document.querySelector('.chatgpt-review-popup'), null);

  t.after(() => {
    if (global.window && global.window.ReviewManager) {
      delete global.window.ReviewManager;
    }
    cleanup();
    delete global.chrome;
  });
});

test('disabling the extension hides an active review popup', async (t) => {
  const { cleanup } = setupDom();
  const { chromeMock } = createChromeStorageMock();
  global.chrome = chromeMock;

  await loadRetentionModule();
  await tick();

  window.ReviewManager.showNow();
  await tick();

  assert.ok(document.querySelector('.chatgpt-review-popup'));

  chrome.storage.local.set({ enableFix: false }, () => {});
  await tick();

  assert.equal(document.querySelector('.chatgpt-review-popup'), null);

  t.after(() => {
    if (global.window && global.window.ReviewManager) {
      delete global.window.ReviewManager;
    }
    cleanup();
    delete global.chrome;
  });
});
