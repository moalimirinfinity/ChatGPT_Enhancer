import { JSDOM } from 'jsdom';

export function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.com'
  });
  const { window } = dom;

  Object.defineProperty(global, 'window', { value: window, configurable: true, writable: true });
  Object.defineProperty(global, 'document', { value: window.document, configurable: true, writable: true });
  Object.defineProperty(global, 'HTMLElement', { value: window.HTMLElement, configurable: true, writable: true });
  Object.defineProperty(global, 'Element', { value: window.Element, configurable: true, writable: true });
  Object.defineProperty(global, 'Node', { value: window.Node, configurable: true, writable: true });
  Object.defineProperty(global, 'NodeFilter', { value: window.NodeFilter, configurable: true, writable: true });
  Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
  Object.defineProperty(global, 'getComputedStyle', {
    value: window.getComputedStyle.bind(window),
    configurable: true,
    writable: true
  });

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  }
  Object.defineProperty(global, 'requestAnimationFrame', {
    value: window.requestAnimationFrame.bind(window),
    configurable: true,
    writable: true
  });

  // jsdom lacks scrollIntoView; stub to avoid errors in tests.
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }

  // Provide a clipboard stub when absent.
  if (!navigator.clipboard) {
    navigator.clipboard = {
      writeText: async () => {}
    };
  }

  // execCommand is used as a fallback copy path.
  if (!document.execCommand) {
    document.execCommand = () => true;
  }

  return {
    dom,
    cleanup: () => {
      dom.window.close();
      delete global.window;
      delete global.document;
      delete global.HTMLElement;
      delete global.Element;
      delete global.Node;
      delete global.NodeFilter;
      delete global.navigator;
      delete global.getComputedStyle;
      delete global.requestAnimationFrame;
    }
  };
}

export function createPromptControls() {
  document.body.innerHTML = `
    <div id="prompt-error"></div>
    <div id="prompts-empty" class="prompts-empty">
      <p class="prompts-empty__primary"></p>
      <p class="prompts-empty__secondary"></p>
    </div>
    <div class="prompts-count">
      <span id="prompts-count"></span>
      <span class="prompts-count__label"></span>
    </div>
    <div class="prompt-list-container">
      <ul id="prompt-list"></ul>
    </div>
    <button id="prompt-form-accordion-header" class="accordion__header" data-target="prompt-form-section"></button>
    <div id="prompt-form-section" class="accordion__content"></div>
  `;

  return {
    promptList: document.getElementById('prompt-list'),
    promptListContainer: document.querySelector('.prompt-list-container'),
    promptsEmpty: document.getElementById('prompts-empty'),
    promptsEmptyPrimary: document.querySelector('.prompts-empty__primary'),
    promptsEmptySecondary: document.querySelector('.prompts-empty__secondary'),
    promptError: document.getElementById('prompt-error'),
    promptsCount: document.getElementById('prompts-count'),
    promptsCountLabel: document.querySelector('.prompts-count__label'),
    promptFormAccordionHeader: document.getElementById('prompt-form-accordion-header'),
    promptFormSection: document.getElementById('prompt-form-section')
  };
}
