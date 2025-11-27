const path = require('path');
const assert = require('assert/strict');
const { setupDom, nextTick } = require('../helpers/dom');

const HELP_PATH = path.join(__dirname, '..', '..', 'help.js');

function loadHelpScript() {
  delete require.cache[HELP_PATH];
  // eslint-disable-next-line global-require, import/no-dynamic-require
  require(HELP_PATH);
}

function buildHelpDom(doc) {
  const englishButton = doc.createElement('button');
  englishButton.className = 'help-page__lang-btn';
  englishButton.dataset.lang = 'english';

  const persianButton = doc.createElement('button');
  persianButton.className = 'help-page__lang-btn';
  persianButton.dataset.lang = 'persian';

  const englishSection = doc.createElement('section');
  englishSection.className = 'help-page__section';
  englishSection.dataset.lang = 'english';

  const persianSection = doc.createElement('section');
  persianSection.className = 'help-page__section';
  persianSection.dataset.lang = 'persian';

  const version = doc.createElement('div');
  version.id = 'help-version';

  doc.body.append(
    englishButton,
    persianButton,
    englishSection,
    persianSection,
    version
  );

  return {
    englishButton,
    persianButton,
    englishSection,
    persianSection,
    version
  };
}

test('uses saved language preference and displays manifest version', async () => {
  const env = setupDom({
    storageData: { helpLanguage: 'persian' },
    runtime: { getManifest: () => ({ version: '2.3.4' }) }
  });
  try {
    const ui = buildHelpDom(document);
    loadHelpScript();
    document.dispatchEvent(new env.dom.window.Event('DOMContentLoaded'));
    await nextTick();

    assert.equal(ui.version.textContent, 'v2.3.4');
    assert.ok(ui.persianButton.classList.contains('is-active'));
    assert.equal(ui.persianButton.getAttribute('aria-selected'), 'true');
    assert.equal(ui.englishButton.getAttribute('tabindex'), '-1');
    assert.equal(ui.englishSection.getAttribute('hidden'), 'true');
    assert.ok(!ui.persianSection.hasAttribute('hidden'));
  } finally {
    env.cleanup();
  }
});

test('clicking a language toggles sections and saves preference', async () => {
  const env = setupDom({
    storageData: { helpLanguage: 'english' },
    runtime: { getManifest: () => ({ version: '1.0.0' }) }
  });
  try {
    const ui = buildHelpDom(document);
    loadHelpScript();
    document.dispatchEvent(new env.dom.window.Event('DOMContentLoaded'));
    await nextTick();

    ui.persianButton.click();
    await nextTick();

    assert.ok(ui.persianButton.classList.contains('is-active'));
    assert.equal(env.chromeMock.setCalls[0].helpLanguage, 'persian');
    assert.equal(ui.englishButton.getAttribute('tabindex'), '-1');
    assert.equal(ui.englishSection.getAttribute('hidden'), 'true');
    assert.ok(!ui.persianSection.hasAttribute('hidden'));
  } finally {
    env.cleanup();
  }
});

test('falls back to the default version label when manifest is unavailable', async () => {
  const env = setupDom();
  try {
    const ui = buildHelpDom(document);
    loadHelpScript();
    document.dispatchEvent(new env.dom.window.Event('DOMContentLoaded'));
    await nextTick();

    assert.equal(ui.version.textContent, 'v1.1.0');
  } finally {
    env.cleanup();
  }
});
