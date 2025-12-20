import assert from 'node:assert/strict';
import test from 'node:test';

import { setupDom } from './helpers/dom.js';

let pngModuleCounter = 0;
async function loadPngModule() {
  pngModuleCounter += 1;
  const url = new URL(`../src/export/generators/png.js?test=${pngModuleCounter}`, import.meta.url);
  return import(url.href);
}

test('png sizing plan rejects oversized dimensions', async () => {
  const { cleanup } = setupDom();
  const { __test__ } = await loadPngModule();

  let error;
  try {
    __test__.computePngRenderPlan(2000, 30000);
  } catch (err) {
    error = err;
  }

  assert.ok(error);
  assert.equal(error.code, 'png-too-large');

  cleanup();
});

test('png sizing plan keeps high quality for normal sizes', async () => {
  const { cleanup } = setupDom();
  const { __test__ } = await loadPngModule();

  const plan = __test__.computePngRenderPlan(1000, 1200);
  assert.equal(plan.pixelRatio, 2);
  assert.equal(plan.estimatedPages, 1);

  cleanup();
});

test('png export replaces cross-origin images with placeholders', async () => {
  const { cleanup } = setupDom();
  const { __test__ } = await loadPngModule();

  const container = document.createElement('div');
  const sameOrigin = document.createElement('img');
  sameOrigin.src = '/local.png';
  sameOrigin.alt = 'local';
  const crossOrigin = document.createElement('img');
  crossOrigin.src = 'https://cdn.example.com/remote.png';
  crossOrigin.alt = 'remote';
  container.append(sameOrigin, crossOrigin);

  __test__.scrubCrossOriginImages(container);

  const images = container.querySelectorAll('img');
  assert.equal(images.length, 1);
  assert.equal(images[0].getAttribute('src'), '/local.png');
  const placeholder = container.querySelector('[data-export-omitted="image"]');
  assert.ok(placeholder);
  assert.ok(placeholder.textContent.includes('remote'));

  cleanup();
});
