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
