const assert = require('assert/strict');
const { setupDom, loadReviewManager, nextTick } = require('../helpers/dom');

test('showNow renders popup and updates language copy', async () => {
  const env = setupDom();
  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });
    await ReviewManager.showNow();

    const popup = document.querySelector('.chatgpt-review-popup');
    assert.ok(popup, 'popup should render');
    assert.equal(popup.getAttribute('dir'), 'ltr');

    const cta = popup.querySelector('.chatgpt-review-button');
    const dismiss = popup.querySelector('.chatgpt-review-dismiss');
    assert.equal(cta.textContent, 'Rate GPT Enhancer');
    assert.equal(dismiss.textContent, 'Maybe later');

    ReviewManager.setLanguage('persian');
    assert.equal(popup.getAttribute('dir'), 'rtl');
    assert.equal(cta.textContent, 'ثبت نظر');
    assert.equal(dismiss.textContent, 'فعلاً نه');
  } finally {
    env.cleanup();
  }
});

test('recordUsage shows popup once the usage threshold is reached', async () => {
  const env = setupDom();
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usageThreshold: 2, usagePromptChance: 1, cooldownMs: 0 });

    ReviewManager.recordUsage();
    await nextTick();
    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'should wait until threshold');

    ReviewManager.recordUsage();
    await nextTick();
    assert.ok(document.querySelector('.chatgpt-review-popup'), 'should render after threshold met');
  } finally {
    Math.random = originalRandom;
    env.cleanup();
  }
});

test('usage prompt chance gates rendering even when threshold is met', async () => {
  const env = setupDom();
  const originalRandom = Math.random;
  Math.random = () => 0.99;

  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usageThreshold: 0, usagePromptChance: 0.1, cooldownMs: 0 });

    ReviewManager.recordUsage();
    await nextTick();

    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'popup should not render when chance fails');
  } finally {
    Math.random = originalRandom;
    env.cleanup();
  }
});

test('snooze and cooldown windows prevent the popup from showing', async () => {
  const baseTime = 10000;
  const env = setupDom({
    storageData: {
      gptEnhancerReviewUsageCount: 5,
      gptEnhancerReviewSnoozeUntil: baseTime + 5000,
      gptEnhancerReviewLastShown: baseTime - 100
    }
  });
  const originalNow = Date.now;
  Date.now = () => baseTime;

  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usageThreshold: 0, usagePromptChance: 1, cooldownMs: 1000 });

    ReviewManager.recordUsage();
    await nextTick();
    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'popup should respect snooze and cooldown windows');
  } finally {
    Date.now = originalNow;
    env.cleanup();
  }
});

test('dismissing the popup updates storage and removes the dialog', async () => {
  const env = setupDom();
  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });
    await ReviewManager.showNow();

    const popup = document.querySelector('.chatgpt-review-popup');
    assert.ok(popup, 'popup should render before dismiss');

    const dismissButton = popup.querySelector('.chatgpt-review-dismiss');
    dismissButton.click();
    await nextTick();

    const data = env.chromeMock.data;
    assert.equal(data.gptEnhancerReviewDismissCount, 1);
    assert.ok(
      typeof data.gptEnhancerReviewSnoozeUntil === 'number' &&
        data.gptEnhancerReviewSnoozeUntil > Date.now(),
      'snoozeUntil should be set in the future'
    );
    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'popup should be removed');
  } finally {
    env.cleanup();
  }
});

test('cta click marks the flow as reviewed and closes the popup', async () => {
  const env = setupDom();
  let openedUrl;
  env.dom.window.open = (url) => {
    openedUrl = url;
    return null;
  };

  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });
    await ReviewManager.showNow();

    document.querySelector('.chatgpt-review-button').click();
    await nextTick();

    assert.equal(env.chromeMock.data.gptEnhancerReviewCompleted, true);
    assert.equal(openedUrl, 'https://chromewebstore.google.com/detail/gpt-enhancer-for-chatgpt/deobmkpgnanhnoojdecfpndfmgjhaddk/reviews');
    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'popup should be removed after rating');
  } finally {
    env.cleanup();
  }
});

test('export success events trigger the prompt once the threshold is met', async () => {
  const env = setupDom({ storageData: { gptEnhancerReviewExportCount: 2 } });
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = (fn) => {
    fn();
    return 0;
  };

  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });

    document.dispatchEvent(new env.dom.window.Event('GPT_ENHANCER_EXPORT_SUCCESS'));
    await nextTick();

    assert.equal(env.chromeMock.data.gptEnhancerReviewExportCount, 3);
    assert.ok(document.querySelector('.chatgpt-review-popup'), 'popup should render after export threshold');
  } finally {
    window.setTimeout = originalSetTimeout;
    env.cleanup();
  }
});

test('storage updates marking reviewed tear down the popup and block future renders', async () => {
  const env = setupDom();
  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });
    await ReviewManager.showNow();
    assert.ok(document.querySelector('.chatgpt-review-popup'), 'popup should render before storage change');

    env.chromeMock.emitChange({
      gptEnhancerReviewCompleted: { newValue: true }
    });
    await nextTick();

    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'popup should be removed after review completion');

    await ReviewManager.showNow();
    await nextTick();
    assert.ok(!document.querySelector('.chatgpt-review-popup'), 'popup should stay hidden when marked reviewed');
  } finally {
    env.cleanup();
  }
});

test('reaching the dismiss limit marks the flow as reviewed for future sessions', async () => {
  const env = setupDom({ storageData: { gptEnhancerReviewDismissCount: 2 } });
  let persistedData;
  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });
    await ReviewManager.showNow();

    document.querySelector('.chatgpt-review-dismiss').click();
    await nextTick();
    persistedData = { ...env.chromeMock.data };

    assert.equal(persistedData.gptEnhancerReviewDismissCount, 3);
    assert.equal(persistedData.gptEnhancerReviewCompleted, true);
  } finally {
    env.cleanup();
  }

  const env2 = setupDom({ storageData: persistedData });
  try {
    const ReviewManager = loadReviewManager();
    await ReviewManager.init({ usagePromptChance: 1 });
    await ReviewManager.showNow();
    await nextTick();

    assert.ok(
      !document.querySelector('.chatgpt-review-popup'),
      'reviewed users should not see the popup even when forced'
    );
  } finally {
    env2.cleanup();
  }
});
