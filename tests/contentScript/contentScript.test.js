const assert = require('assert/strict');
const { runContentScript } = require('../helpers/contentScript');

test('normalizes theme aliases and resolves custom theme classes', () => {
  const env = runContentScript();
  try {
    const { normalizeThemeAlias, resolveThemeClass } = env.exports;

    assert.equal(normalizeThemeAlias(' Daybreak '), 'skylight');
    assert.equal(resolveThemeClass('midnight'), 'chatgpt-theme-midnight');
    assert.equal(resolveThemeClass('original'), null);
    assert.equal(resolveThemeClass('unknown-theme'), null);
  } finally {
    env.cleanup();
  }
});

test('getApplicableTheme enforces compatibility with ChatGPT theme mode', () => {
  const env = runContentScript();
  try {
    const { getApplicableTheme } = env.exports;

    const blocked = getApplicableTheme('midnight', 'light');
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.theme, null);
    assert.equal(blocked.requiredMode, 'dark');

    const allowed = getApplicableTheme('paper', 'light');
    assert.equal(allowed.blocked, false);
    assert.equal(allowed.theme, 'paper');
    assert.equal(allowed.requiredMode, 'light');
  } finally {
    env.cleanup();
  }
});

test('font control only activates when both toggles are enabled', () => {
  const env = runContentScript();
  try {
    const { fontControlEnabledInSettings, fontControlIsActive, mergeSettings } = env.exports;

    assert.equal(fontControlEnabledInSettings({ enableFix: true, fontsEnabled: true }), true);
    assert.equal(fontControlEnabledInSettings({ enableFix: true, fontsEnabled: false }), false);
    assert.equal(fontControlEnabledInSettings({ enableFix: false, fontsEnabled: true }), false);

    mergeSettings({ fontsEnabled: true });
    assert.equal(fontControlIsActive(), true);
  } finally {
    env.cleanup();
  }
});

test('language hint message handler reports detected language and sample size', () => {
  const env = runContentScript();
  try {
    const { document } = env.dom.window;

    const main = document.createElement('main');
    const message = document.createElement('div');
    message.dataset.messageAuthorRole = 'assistant';
    message.textContent = 'این یک پیام فارسی است و باید شناسایی شود.';
    main.appendChild(message);
    document.body.appendChild(main);

    let response;
    env.chromeMock.emitMessage(
      { type: env.exports.LANGUAGE_HINT_MESSAGE_TYPE, maxMessages: 3, maxChars: 200 },
      {},
      (result) => {
        response = result;
      }
    );

    assert.equal(response.ok, true);
    assert.equal(response.language, 'persian');
    assert.ok(response.sampledCharacters > 0);
  } finally {
    env.cleanup();
  }
});

test('table of contents size is clamped within viewport bounds', () => {
  const env = runContentScript();
  try {
    const { window } = env.dom;
    const { document } = window;
    window.innerWidth = 500;
    window.innerHeight = 500;

    env.exports.mergeSettings({ tableOfContentsSize: { width: 2000, height: 2000 } });

    const panel = document.getElementById('chatgpt-enhancer-toc-panel');
    assert.ok(panel, 'panel should exist');
    assert.equal(panel.style.width, '420px');
    assert.equal(panel.style.height, '476px');
    assert.equal(panel.style.maxWidth, '420px');
    assert.equal(panel.style.maxHeight, '476px');
  } finally {
    env.cleanup();
  }
});

test('table of contents placement is clamped and respects saved right gap', () => {
  const env = runContentScript();
  try {
    const { window } = env.dom;
    const { document } = window;
    window.innerWidth = 360;
    window.innerHeight = 360;

    const panel = document.getElementById('chatgpt-enhancer-toc-panel');
    assert.ok(panel, 'panel should exist before placement');

    panel.getBoundingClientRect = () => ({
      width: 280,
      height: 220,
      top: 0,
      left: 0,
      right: 280,
      bottom: 220
    });

    env.exports.mergeSettings({ tableOfContentsPosition: { top: -100, left: -50, rightGap: 9999 } });

    assert.equal(panel.style.top, '12px');
    assert.equal(panel.style.left, '12px');
  } finally {
    env.cleanup();
  }
});

test('classes and panel lifecycle respond to setting changes', () => {
  const env = runContentScript();
  try {
    const root = env.dom.window.document.documentElement;
    const initialPanel = env.dom.window.document.getElementById('chatgpt-enhancer-toc-panel');

    assert.ok(initialPanel, 'panel should exist initially');
    assert.ok(root.classList.contains('chatgpt-direction-fix-enabled'));
    assert.ok(!root.classList.contains('chatgpt-font-control-enabled'));

    env.exports.mergeSettings({ enableFix: false });
    assert.ok(!root.classList.contains('chatgpt-direction-fix-enabled'));
    assert.ok(!env.dom.window.document.getElementById('chatgpt-enhancer-toc-panel'));

    env.exports.mergeSettings({ enableFix: true, fontsEnabled: true });
    const restoredPanel = env.dom.window.document.getElementById('chatgpt-enhancer-toc-panel');
    assert.ok(restoredPanel, 'panel should be restored when re-enabled');
    assert.ok(root.classList.contains('chatgpt-direction-fix-enabled'));
    assert.ok(root.classList.contains('chatgpt-font-control-enabled'));
  } finally {
    env.cleanup();
  }
});
