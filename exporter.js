const EXPORT_MESSAGE_TYPE = 'GPT_EXPORT_CONVERSATION';
const EXPORT_STAGE_CLASS = 'gpt-export-stage';
const EXPORT_ROOT_CLASS = 'gpt-export-root';
const EXPORT_TURN_CLASS = 'gpt-export-turn';
const EXPORT_EQUATION_CLASS = 'gpt-export-equation';
const DARK_TEXT_COLOR = 'rgb(17, 18, 34)';
const DARK_TEXT_LUMINANCE_THRESHOLD = 0.75;
const DIRECTIONAL_TAGS = new Set(['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH']);
const RTL_CHAR_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
const LTR_CHAR_REGEX = /[A-Za-z\u00C0-\u024F]/g;
const VAZIRMATN_FONT_PATH = 'fonts/Vazirmatn-VF.woff2';
const FONT_FAMILY_STACK = '"Vazirmatn", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif';
const PNG_EXPORT_PIXEL_LIMIT = 32000000;
const PNG_EXPORT_MIN_PIXEL_RATIO = 0.75;
const PNG_EXPORT_APPROX_PAGE_HEIGHT = 1200;
const EXPORT_STYLE_BLOCK = `
.${EXPORT_ROOT_CLASS} {
  font-family: ${FONT_FAMILY_STACK};
  color: ${DARK_TEXT_COLOR};
  background: #ffffff;
  padding: 32px;
  box-sizing: border-box;
  max-width: 672px;
  margin: 0 auto;
  line-height: 1.55;
}
.${EXPORT_ROOT_CLASS} *,
.${EXPORT_ROOT_CLASS} *::before,
.${EXPORT_ROOT_CLASS} *::after {
  color: inherit !important;
}
.${EXPORT_ROOT_CLASS} h1,
.${EXPORT_ROOT_CLASS} h2,
.${EXPORT_ROOT_CLASS} h3,
.${EXPORT_ROOT_CLASS} h4 {
  color: #05061a;
  font-weight: 600;
}
.${EXPORT_ROOT_CLASS} a {
  color: #1c46d6 !important;
  text-decoration: none;
}
.${EXPORT_ROOT_CLASS} a:hover {
  text-decoration: underline;
}
.${EXPORT_TURN_CLASS} {
  display: block;
  padding: 20px 0;
  border-bottom: 1px solid rgba(9, 10, 27, 0.08);
  page-break-inside: auto;
  break-inside: auto;
}
.${EXPORT_TURN_CLASS}:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.${EXPORT_ROOT_CLASS} pre {
  background: rgba(13, 17, 38, 0.92);
  color: #f5f6fb !important;
  padding: 18px;
  border-radius: 14px;
  overflow: auto;
  font-size: 13px;
  page-break-inside: avoid;
  break-inside: avoid;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.${EXPORT_ROOT_CLASS} pre *,
.${EXPORT_ROOT_CLASS} code,
.${EXPORT_ROOT_CLASS} code * {
  font-family: "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace;
  color: inherit;
}
.${EXPORT_ROOT_CLASS} code:not(pre code) {
  background: rgba(17, 20, 40, 0.08);
  padding: 2px 4px;
  border-radius: 6px;
}
.${EXPORT_ROOT_CLASS} [dir="rtl"]:not(pre):not(code) {
  direction: rtl;
  unicode-bidi: isolate;
  text-align: right;
  letter-spacing: normal !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}
.${EXPORT_ROOT_CLASS} [dir="ltr"] {
  direction: ltr;
  unicode-bidi: isolate;
  letter-spacing: normal !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}
.${EXPORT_ROOT_CLASS} .katex,
.${EXPORT_ROOT_CLASS} .katex * {
  direction: ltr !important;
  unicode-bidi: normal !important;
  text-align: left !important;
}
.${EXPORT_ROOT_CLASS} img {
  max-width: 100%;
  height: auto;
  display: block;
}
.${EXPORT_ROOT_CLASS} table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.${EXPORT_ROOT_CLASS} th,
.${EXPORT_ROOT_CLASS} td {
  border: 1px solid rgba(12, 14, 27, 0.16);
  padding: 8px 10px;
  text-align: left;
  break-inside: avoid;
  page-break-inside: avoid;
}
.${EXPORT_ROOT_CLASS} p {
  margin: 0 0 12px;
}
.${EXPORT_ROOT_CLASS} p:last-child {
  margin-bottom: 0;
}
.${EXPORT_EQUATION_CLASS} {
  display: inline-block;
  vertical-align: middle;
  direction: ltr !important;
  unicode-bidi: normal !important;
  text-align: left !important;
}
`;
const DOCX_EXPORT_STYLE_BLOCK = `
@page {
  margin: 1in;
}
body {
  font-family: ${FONT_FAMILY_STACK};
  color: ${DARK_TEXT_COLOR};
  background: #ffffff;
  margin: 0;
}
.${EXPORT_ROOT_CLASS} {
  padding: 24px 32px;
  box-sizing: border-box;
  max-width: 780px;
  margin: 0 auto;
  line-height: 1.5;
}
.${EXPORT_ROOT_CLASS} *,
.${EXPORT_ROOT_CLASS} *::before,
.${EXPORT_ROOT_CLASS} *::after {
  color: inherit !important;
}
.${EXPORT_TURN_CLASS} {
  display: block;
  padding: 18px 0;
  border-bottom: 1px solid #d0d3e7;
}
.${EXPORT_TURN_CLASS}:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.${EXPORT_ROOT_CLASS} h1,
.${EXPORT_ROOT_CLASS} h2,
.${EXPORT_ROOT_CLASS} h3,
.${EXPORT_ROOT_CLASS} h4,
.${EXPORT_ROOT_CLASS} h5,
.${EXPORT_ROOT_CLASS} h6 {
  color: #05061a;
  font-weight: 600;
  margin: 0 0 12px;
}
.${EXPORT_ROOT_CLASS} p {
  margin: 0 0 12px;
}
.${EXPORT_ROOT_CLASS} a {
  color: #1c46d6 !important;
  text-decoration: underline;
}
.${EXPORT_ROOT_CLASS} pre {
  background: #101327;
  color: #f5f6fb !important;
  padding: 18px;
  border-radius: 10px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.55;
}
.${EXPORT_ROOT_CLASS} pre *,
.${EXPORT_ROOT_CLASS} code,
.${EXPORT_ROOT_CLASS} code * {
  font-family: "Consolas", "Courier New", monospace;
  color: inherit;
}
.${EXPORT_ROOT_CLASS} code:not(pre code) {
  background: #eef1ff;
  padding: 2px 4px;
  border-radius: 6px;
}
.${EXPORT_ROOT_CLASS} blockquote {
  border-left: 4px solid #d9dcef;
  padding-left: 16px;
  margin: 0 0 16px;
  color: #111222;
}
.${EXPORT_ROOT_CLASS} ul,
.${EXPORT_ROOT_CLASS} ol {
  margin: 0 0 16px 24px;
  padding: 0;
}
.${EXPORT_ROOT_CLASS} table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.${EXPORT_ROOT_CLASS} th,
.${EXPORT_ROOT_CLASS} td {
  border: 1px solid #cdd2e5;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}
.${EXPORT_ROOT_CLASS} img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px 0;
}
.${EXPORT_ROOT_CLASS} hr {
  border: none;
  border-top: 1px solid #d0d3e7;
  margin: 24px 0;
}
.${EXPORT_EQUATION_CLASS} {
  display: inline-block;
  vertical-align: middle;
  direction: ltr !important;
  unicode-bidi: normal !important;
  text-align: left !important;
}
`;
const COLOR_PROPERTIES = [
  ['color', 'color'],
  ['backgroundColor', 'background-color'],
  ['background', 'background'],
  ['backgroundImage', 'background-image'],
  ['borderColor', 'border-color'],
  ['borderTopColor', 'border-top-color'],
  ['borderRightColor', 'border-right-color'],
  ['borderBottomColor', 'border-bottom-color'],
  ['borderLeftColor', 'border-left-color'],
  ['outlineColor', 'outline-color'],
  ['fill', 'fill'],
  ['stroke', 'stroke'],
  ['textDecorationColor', 'text-decoration-color'],
  ['boxShadow', 'box-shadow'],
  ['textShadow', 'text-shadow'],
  ['borderImageSource', 'border-image-source']
];

const MARKDOWN_BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'canvas',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'noscript',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'thead',
  'tfoot',
  'ul'
]);

const MARKDOWN_CODE_LANGUAGE_REGEX = /language-([a-z0-9+-]+)/i;

function getExtensionAssetUrl(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    try {
      return chrome.runtime.getURL(path);
    } catch (error) {
      console.warn('[GPT Enhancer] Unable to resolve extension asset URL', error);
      return path;
    }
  }
  return path;
}

let exportFontRegistrationPromise = null;

async function registerExportFonts() {
  if (exportFontRegistrationPromise) {
    return exportFontRegistrationPromise;
  }
  if (!document.fonts || typeof document.fonts.check !== 'function' || typeof FontFace !== 'function') {
    exportFontRegistrationPromise = Promise.resolve();
    return exportFontRegistrationPromise;
  }
  if (document.fonts.check('16px "Vazirmatn"')) {
    exportFontRegistrationPromise = Promise.resolve();
    return exportFontRegistrationPromise;
  }

  exportFontRegistrationPromise = (async () => {
    const fontUrl = getExtensionAssetUrl(VAZIRMATN_FONT_PATH);
    if (!fontUrl) {
      return;
    }
    try {
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Font request failed: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const fontFace = new FontFace('Vazirmatn', buffer, {
        style: 'normal',
        weight: '100 900',
        display: 'swap'
      });
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch (error) {
      console.warn('[GPT Enhancer] Unable to register Vazirmatn font', error);
    }
  })();

  return exportFontRegistrationPromise;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== EXPORT_MESSAGE_TYPE) {
    return undefined;
  }

  handleExportRequest(message.format || 'pdf')
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error('[GPT Enhancer] Export failed', error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });

  return true;
});

async function handleExportRequest(format) {
  await registerExportFonts();
  const { root, stage, styleNode } = await prepareExportStage();
  try {
    ensureLibraries(format);
    normalizeUnsupportedColors(root);
    ensureDirectionalConsistency(root);
    await ensureExportFontsLoaded();
    if (format !== 'markdown') {
      await inlineImages(root);
    }

    switch (format) {
      case 'docx':
        prepareDocxSpecificAdjustments(root);
        await convertKatexToImages(root);
        await exportAsDocx(root);
        break;
      case 'markdown':
        exportAsMarkdown(root);
        break;
      case 'png':
        await exportAsPng(stage, root);
        break;
      default:
        const printStyle = document.createElement('style');
        printStyle.textContent = `
          @page {
            size: auto;
            
            /* 1. DEFINE THE MARGINS (like 0.6in) */
            margin-top: 0.6in;
            margin-bottom: 0.6in;
            margin-left: 0.4in;
            margin-right: 0.4in;

            /* 2. EXPLICITLY HIDE THE HEADER/FOOTER CONTENT */
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-center { content: ""; }
            @bottom-right { content: ""; }
          }

          @media print {
            body > *:not(.${EXPORT_STAGE_CLASS}) {
              display: none !important;
            }
            .${EXPORT_STAGE_CLASS} {
              opacity: 1 !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              z-index: 9999 !important;
            }
            .${EXPORT_ROOT_CLASS} {
               /* Keep padding at 0. The @page rule handles all margins. */
               padding: 0 !important; 
               
               max-width: 100% !important;
               margin: 0 !important;
               box-shadow: none !important;
               box-sizing: border-box; 
            }
          }
        `;
        document.head.appendChild(printStyle);
        window.print();
        document.head.removeChild(printStyle);
        break;
    }
  } finally {
    if (styleNode && styleNode.parentNode) {
      styleNode.parentNode.removeChild(styleNode);
    }
    stage.remove();
  }
}

async function prepareExportStage() {
  await ensureConversationContentLoaded();
  const exportRoot = collectConversation();
  if (!exportRoot) {
    throw new Error('Unable to locate conversation content on this page.');
  }

  const stage = document.createElement('div');
  stage.className = EXPORT_STAGE_CLASS;
  stage.style.position = 'fixed';
  stage.style.top = '0';
  stage.style.left = '0';
  stage.style.width = '672px';
  stage.style.opacity = '0';
  stage.style.zIndex = '-1';
  stage.style.pointerEvents = 'none';
  stage.style.userSelect = 'none';
  stage.setAttribute('aria-hidden', 'true');
  stage.setAttribute('role', 'presentation');

  const styleNode = document.createElement('style');
  styleNode.textContent = EXPORT_STYLE_BLOCK;
  stage.appendChild(styleNode);
  stage.appendChild(exportRoot);
  document.body.appendChild(stage);

  return { root: exportRoot, stage, styleNode };
}

async function ensureConversationContentLoaded() {
  const selector = '[data-testid="conversation-turn"], [data-message-author-role]';
  const main = document.querySelector('main');
  const container = main || document.body;
  if (!container) {
    return;
  }

  const scrollHost =
    main ||
    (document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : document.documentElement instanceof HTMLElement
      ? document.documentElement
      : null);
  const originalWindowScroll = { x: window.scrollX, y: window.scrollY };
  const originalScrollTop = scrollHost ? scrollHost.scrollTop : null;

  try {
    await exhaustVirtualizedContent(container, scrollHost, selector, 'start');
    await exhaustVirtualizedContent(container, scrollHost, selector, 'end');
  } finally {
    if (scrollHost && typeof originalScrollTop === 'number') {
      scrollHost.scrollTop = originalScrollTop;
    }
    window.scrollTo(originalWindowScroll.x, originalWindowScroll.y);
  }
}

async function exhaustVirtualizedContent(container, scrollHost, selector, direction) {
  const maxAttempts = 8;
  let previousCount = container.querySelectorAll(selector).length;
  let idleAttempts = 0;

  for (let attempt = 0; attempt < maxAttempts && idleAttempts < 2; attempt += 1) {
    const nodes = container.querySelectorAll(selector);
    if (!nodes.length) {
      await delay(80);
      continue;
    }

    if (direction === 'end') {
      const last = nodes[nodes.length - 1];
      if (last && typeof last.scrollIntoView === 'function') {
        last.scrollIntoView({ block: 'end', inline: 'nearest' });
      }
      if (scrollHost) {
        scrollHost.scrollTop = scrollHost.scrollHeight;
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    } else {
      const first = nodes[0];
      if (first && typeof first.scrollIntoView === 'function') {
        first.scrollIntoView({ block: 'start', inline: 'nearest' });
      }
      if (scrollHost) {
        scrollHost.scrollTop = 0;
      } else {
        window.scrollTo(0, 0);
      }
    }

    await delay(180);
    const currentCount = container.querySelectorAll(selector).length;
    if (currentCount === previousCount) {
      idleAttempts += 1;
    } else {
      previousCount = currentCount;
      idleAttempts = 0;
    }
  }
}

function collectConversation() {
  const exportRoot = document.createElement('div');
  exportRoot.className = EXPORT_ROOT_CLASS;

  const turnSelectors = [
    '[data-testid="conversation-turn"]',
    '[data-message-author-role]'
  ];

  let nodes = [];
  for (const selector of turnSelectors) {
    nodes = Array.from(document.querySelectorAll(selector));
    if (nodes.length) {
      break;
    }
  }

  if (!nodes.length) {
    const main = document.querySelector('main');
    if (main) {
      nodes = Array.from(main.children);
    }
  }

  const cleaned = nodes
    .map((node) => node.cloneNode(true))
    .map((node) => {
      sanitizeExportNode(node);
      node.classList.add(EXPORT_TURN_CLASS);
      node.style.setProperty('page-break-inside', 'avoid', 'important');
      node.style.setProperty('break-inside', 'avoid', 'important');
      return node;
    })
    .filter(hasRenderableContent);

  cleaned.forEach((node) => exportRoot.appendChild(node));

  if (!exportRoot.children.length) {
    return null;
  }

  removeTrailingWhitespace(exportRoot);
  return exportRoot;
}

function sanitizeExportNode(node) {
  const removableSelectors = [
    'button',
    'form',
    'textarea',
    'input',
    'nav',
    'aside',
    'header',
    'footer',
    '[role="navigation"]',
    '[data-testid="chat-composer"]',
    '[data-testid="clipboard-button"]',
    '[data-testid="toolbar"]',
    '[data-testid="conversation-turn-actions"]',
    '[data-testid="bottom-controls"]'
  ];

  removableSelectors.forEach((selector) => {
    node.querySelectorAll(selector).forEach((element) => element.remove());
  });

  // Remove extraneous attributes that can interfere with export rendering.
  node.querySelectorAll('[contenteditable]').forEach((element) => {
    element.removeAttribute('contenteditable');
  });
}

function removeTrailingWhitespace(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const toTrim = [];
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    if (textNode.nodeValue) {
      const trimmed = textNode.nodeValue.trimEnd();
      if (trimmed.length !== textNode.nodeValue.length) {
        toTrim.push({ node: textNode, value: trimmed });
      }
    }
  }
  toTrim.forEach(({ node, value }) => {
    node.nodeValue = value;
  });
}

function hasRenderableContent(node) {
  const text = node.textContent ? node.textContent.trim() : '';
  if (text.length) {
    return true;
  }
  return Boolean(
    node.querySelector('img, svg, pre, code, .katex, .katex-display, video, audio')
  );
}

function normalizeUnsupportedColors(root) {
  const elements = [root, ...root.querySelectorAll('*')];
  elements.forEach((element) => {
    const computed = window.getComputedStyle(element);
    COLOR_PROPERTIES.forEach(([styleName, cssName]) => {
      const value =
        typeof computed.getPropertyValue === 'function'
          ? computed.getPropertyValue(cssName)
          : computed[styleName];
      if (value && value.includes('oklch')) {
        const normalized = replaceOklchFunctions(value);
        if (normalized && normalized !== value) {
          element.style.setProperty(cssName, normalized, 'important');
        }
      }
    });

    if (computed.length && typeof computed.item === 'function') {
      for (let index = 0; index < computed.length; index += 1) {
        const name = computed.item(index);
        if (!name || !name.startsWith('--')) {
          continue;
        }
        const value = computed.getPropertyValue(name);
        if (value && value.includes('oklch')) {
          const normalized = replaceOklchFunctions(value);
          if (normalized && normalized !== value) {
            element.style.setProperty(name, normalized, 'important');
          }
        }
      }
    }

    maybeForceReadableTextColor(element, computed);
  });
}

function ensureDirectionalConsistency(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  while (walker.nextNode()) {
    const element = walker.currentNode;
    if (!shouldAdjustDirection(element)) {
      continue;
    }

    const text = extractRelevantText(element);
    if (!text) {
      continue;
    }

    const { rtlCount, ltrCount } = countDirectionCharacters(text);
    if (rtlCount === 0 || rtlCount <= ltrCount) {
      continue;
    }

    element.setAttribute('dir', 'rtl');
    element.style.removeProperty('direction');
    element.style.removeProperty('unicode-bidi');
    element.style.removeProperty('text-align');
  }
}

async function ensureExportFontsLoaded() {
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    return;
  }

  await registerExportFonts();

  try {
    await document.fonts.load('16px "Vazirmatn"');
  } catch (error) {
    console.warn('[GPT Enhancer] Unable to load Vazirmatn font', error);
  }

  if (typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
    try {
      await document.fonts.ready;
    } catch (error) {
      console.warn('[GPT Enhancer] Font readiness check failed', error);
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldAdjustDirection(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (!DIRECTIONAL_TAGS.has(element.tagName)) {
    return false;
  }
  if (element.classList.contains(EXPORT_ROOT_CLASS) || element.classList.contains(EXPORT_TURN_CLASS)) {
    return false;
  }
  if (element.hasAttribute('dir')) {
    return false;
  }
  if (element.closest('pre, code, .' + EXPORT_EQUATION_CLASS + ', .katex, svg')) {
    return false;
  }
  const ancestorWithDir = element.parentElement ? element.parentElement.closest('[dir]') : null;
  if (ancestorWithDir && ancestorWithDir !== document.documentElement) {
    return false;
  }
  const display = window.getComputedStyle(element).display;
  if (display === 'inline' || display === 'inline-block') {
    return false;
  }
  return true;
}

function extractRelevantText(element) {
  if (!element.textContent) {
    return '';
  }
  return element.textContent.replace(/\s+/g, ' ').trim();
}

function countDirectionCharacters(text) {
  const rtlMatches = text.match(RTL_CHAR_REGEX);
  const ltrMatches = text.match(LTR_CHAR_REGEX);
  return {
    rtlCount: rtlMatches ? rtlMatches.length : 0,
    ltrCount: ltrMatches ? ltrMatches.length : 0
  };
}

function replaceOklchFunctions(value) {
  return value.replace(/oklch\(([^)]+)\)/gi, (match) => {
    const converted = oklchToRgba(match);
    return converted || match;
  });
}

function oklchToRgba(input) {
  const regex =
    /oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.+-]+(?:deg|rad|grad|turn)?)\s*(?:\/\s*([0-9.]+%?))?\s*\)/i;
  const match = input.match(regex);
  if (!match) {
    return null;
  }

  const [, lRaw, cRaw, hRaw, alphaRaw] = match;
  const l = parseComponent(lRaw, true);
  const c = parseComponent(cRaw, false);
  const h = parseHue(hRaw);
  const alpha = alphaRaw ? parseAlpha(alphaRaw) : 1;

  if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h) || Number.isNaN(alpha)) {
    return null;
  }

  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l1 = l + 0.3963377774 * a + 0.2158037573 * b;
  const m1 = l - 0.1055613458 * a - 0.0638541728 * b;
  const s1 = l - 0.0894841775 * a - 1.291485548 * b;

  const l2 = l1 ** 3;
  const m2 = m1 ** 3;
  const s2 = s1 ** 3;

  let r = 4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2;
  let g = -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2;
  let b2 = -0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2;

  r = linearToSrgb(r);
  g = linearToSrgb(g);
  b2 = linearToSrgb(b2);

  r = clamp255(r * 255);
  g = clamp255(g * 255);
  b2 = clamp255(b2 * 255);

  return `rgba(${r}, ${g}, ${b2}, ${Math.max(0, Math.min(1, alpha))})`;
}

function parseComponent(value, isLightness) {
  if (value.endsWith('%')) {
    const numeric = parseFloat(value);
    return Number.isNaN(numeric) ? NaN : numeric / 100;
  }

  const numeric = parseFloat(value);
  if (Number.isNaN(numeric)) {
    return NaN;
  }
  return isLightness ? numeric : numeric;
}

function parseHue(value) {
  if (value.endsWith('deg')) {
    return (parseFloat(value) * Math.PI) / 180;
  }
  if (value.endsWith('rad')) {
    return parseFloat(value);
  }
  if (value.endsWith('turn')) {
    return parseFloat(value) * 2 * Math.PI;
  }
  if (value.endsWith('grad')) {
    return (parseFloat(value) * Math.PI) / 200;
  }
  return (parseFloat(value) * Math.PI) / 180;
}

function parseAlpha(value) {
  if (value.endsWith('%')) {
    const numeric = parseFloat(value);
    return Number.isNaN(numeric) ? NaN : numeric / 100;
  }
  return parseFloat(value);
}

function linearToSrgb(x) {
  const clamped = Math.max(0, Math.min(1, x));
  if (clamped <= 0.0031308) {
    return clamped * 12.92;
  }
  return 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function clamp255(value) {
  const rounded = Math.round(value);
  if (Number.isNaN(rounded)) {
    return 0;
  }
  return Math.min(255, Math.max(0, rounded));
}

function maybeForceReadableTextColor(element, computed) {
  if (!shouldForceDarkText(element)) {
    return;
  }
  const colorValue = computed.getPropertyValue('color');
  const forced = forceReadableTextColor(colorValue);
  if (forced) {
    element.style.setProperty('color', forced, 'important');
  }
}

function shouldForceDarkText(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  if (element.closest('pre, code, .katex, .' + EXPORT_EQUATION_CLASS + ', svg')) {
    return false;
  }
  if (element.matches('img, video, audio, canvas')) {
    return false;
  }
  return true;
}

function forceReadableTextColor(colorValue) {
  const parsed = parseColorString(colorValue);
  if (!parsed) {
    return null;
  }

  if (parsed.a < 0.1) {
    return DARK_TEXT_COLOR;
  }

  const luminance = relativeLuminance(parsed);
  if (luminance > DARK_TEXT_LUMINANCE_THRESHOLD) {
    return DARK_TEXT_COLOR;
  }

  return null;
}

function parseColorString(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const rgbaMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 3) {
      return null;
    }
    const rawR = parseFloat(parts[0]);
    const rawG = parseFloat(parts[1]);
    const rawB = parseFloat(parts[2]);
    if ([rawR, rawG, rawB].some((component) => Number.isNaN(component))) {
      return null;
    }
    const r = clamp255(rawR);
    const g = clamp255(rawG);
    const b = clamp255(rawB);
    const alphaValue = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    const a = Number.isNaN(alphaValue) ? 1 : Math.max(0, Math.min(1, alphaValue));
    return { r, g, b, a };
  }

  if (value.startsWith('#')) {
    return parseHexColor(value);
  }

  return null;
}

function parseHexColor(value) {
  const hex = value.replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b, a: 1 };
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  return null;
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((component) => {
    const value = component / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function ensureLibraries(format) {
  if (format === 'docx' && !window.htmlDocx) {
    throw new Error('htmlDocx library missing');
  }
  if ((format === 'docx' || format === 'png') && !window.htmlToImage) {
    throw new Error('htmlToImage library missing');
  }
}

async function inlineImages(root) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) {
        return;
      }

      try {
        const absoluteUrl = img.src;
        const response = await fetch(absoluteUrl, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        img.setAttribute('src', dataUrl);
        img.removeAttribute('srcset');
      } catch (error) {
        try {
          const dataUrl = await window.htmlToImage.toPng(img, {
            pixelRatio: 2,
            cacheBust: true,
            backgroundColor: '#ffffff'
          });
          img.setAttribute('src', dataUrl);
          img.removeAttribute('srcset');
        } catch (fallbackError) {
          console.warn('[GPT Enhancer] Unable to inline image', error, fallbackError);
        }
      }
    })
  );
}

function prepareDocxSpecificAdjustments(root) {
  const codeBlocks = root.querySelectorAll('pre');
  codeBlocks.forEach((block) => {
    block.style.setProperty('background-color', '#101327', 'important');
    block.style.setProperty('color', '#f5f6fb', 'important');
    block.style.setProperty('padding', '18px', 'important');
    block.style.setProperty('border-radius', '14px', 'important');
    block.style.setProperty('white-space', 'pre-wrap', 'important');
    block.style.setProperty('font-family', '"Consolas", "Courier New", monospace', 'important');
    block.style.setProperty('word-break', 'break-word', 'important');
    block.style.setProperty('word-wrap', 'break-word', 'important');
    block.style.setProperty('overflow-wrap', 'anywhere', 'important');
    block.style.setProperty('overflow-x', 'auto', 'important');
  });

  const inlineCodeNodes = root.querySelectorAll('code:not(pre code)');
  inlineCodeNodes.forEach((node) => {
    node.style.setProperty('background-color', '#eef1ff', 'important');
    node.style.setProperty('color', '#101327', 'important');
    node.style.setProperty('padding', '2px 4px', 'important');
    node.style.setProperty('border-radius', '6px', 'important');
    node.style.setProperty('font-family', '"Consolas", "Courier New", monospace', 'important');
  });

  const blockquotes = root.querySelectorAll('blockquote');
  blockquotes.forEach((node) => {
    node.style.setProperty('border-left', '4px solid #d9dcef', 'important');
    node.style.setProperty('padding-left', '16px', 'important');
    node.style.setProperty('margin', '0 0 16px', 'important');
  });

  const lists = root.querySelectorAll('ul, ol');
  lists.forEach((node) => {
    node.style.setProperty('margin', '0 0 16px 24px', 'important');
    node.style.setProperty('padding', '0', 'important');
  });

  const tables = root.querySelectorAll('table');
  tables.forEach((table) => {
    table.style.setProperty('width', '100%', 'important');
    table.style.setProperty('border-collapse', 'collapse', 'important');
    table.style.setProperty('margin-bottom', '16px', 'important');
  });

  const tableCells = root.querySelectorAll('th, td');
  tableCells.forEach((cell) => {
    cell.style.setProperty('border', '1px solid #cdd2e5', 'important');
    cell.style.setProperty('padding', '8px 10px', 'important');
    cell.style.setProperty('text-align', 'left', 'important');
    cell.style.setProperty('vertical-align', 'top', 'important');
    cell.style.setProperty('word-wrap', 'break-word', 'important');
    cell.style.setProperty('overflow-wrap', 'anywhere', 'important');
  });

  const images = root.querySelectorAll('img');
  images.forEach((img) => {
    img.style.setProperty('max-width', '100%', 'important');
    img.style.setProperty('height', 'auto', 'important');
    img.style.setProperty('display', 'block', 'important');
    img.style.setProperty('margin', '12px 0', 'important');
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function convertKatexToImages(root) {
  const katexNodes = Array.from(root.querySelectorAll('.katex'));
  if (!katexNodes.length) {
    return;
  }

  const uniqueNodes = katexNodes.filter((node) => !node.querySelector('.katex'));

  for (const node of uniqueNodes) {
    try {
      const latex = extractLatex(node);
      if (node.closest('td, th')) {
        // Use text fallback inside table cells to avoid DOCX rendering issues.
        const textEquation = document.createElement('span');
        textEquation.className = EXPORT_EQUATION_CLASS;
        textEquation.setAttribute('dir', 'ltr');
        textEquation.style.setProperty('direction', 'ltr', 'important');
        textEquation.style.setProperty('unicode-bidi', 'normal', 'important');
        textEquation.textContent = latex || (node.textContent ? node.textContent.trim() : 'Equation');
        node.replaceWith(textEquation);
        continue;
      }

      const dataUrl = await window.htmlToImage.toPng(node, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = latex ? `TeX: ${latex}` : 'Equation';
      image.className = EXPORT_EQUATION_CLASS;
      image.setAttribute('dir', 'ltr');
      image.style.setProperty('direction', 'ltr', 'important');
      image.style.setProperty('unicode-bidi', 'normal', 'important');
      image.style.setProperty('text-align', 'left', 'important');
      node.replaceWith(image);
    } catch (error) {
      console.warn('[GPT Enhancer] Failed to rasterize equation', error);
    }
  }
}

function extractLatex(element) {
  const annotation = element.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
  if (annotation && annotation.textContent) {
    return annotation.textContent.trim();
  }
  const fallback = element.querySelector('.katex-mathml annotation');
  if (fallback && fallback.textContent) {
    return fallback.textContent.trim();
  }
  return element.textContent ? element.textContent.trim() : '';
}

function exportAsMarkdown(root) {
  const markdown = serializeExportRootToMarkdown(root);
  const content = markdown.endsWith('\n') ? markdown : `${markdown}\n`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, buildFilename('md'));
}

async function exportAsPng(stage, root) {
  const originalStageStyles = {
    opacity: stage.style.opacity,
    pointerEvents: stage.style.pointerEvents,
    position: stage.style.position,
    top: stage.style.top,
    left: stage.style.left,
    right: stage.style.right,
    width: stage.style.width,
    maxWidth: stage.style.maxWidth,
    padding: stage.style.padding,
    background: stage.style.background
  };
  const originalRootDisplay = root.style.display;

  const computedRoot = window.getComputedStyle(root);
  const clone = root.cloneNode(true);
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.maxWidth = 'none';
  clone.style.width = 'auto';
  clone.style.boxSizing = computedRoot.boxSizing || 'border-box';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  wrapper.style.background = '#ffffff';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.maxWidth = 'none';
  wrapper.style.paddingTop = computedRoot.paddingTop || '32px';
  wrapper.style.paddingRight = computedRoot.paddingRight || '32px';
  wrapper.style.paddingBottom = computedRoot.paddingBottom || '32px';
  wrapper.style.paddingLeft = computedRoot.paddingLeft || '32px';
  wrapper.style.direction = computedRoot.direction || 'ltr';
  wrapper.appendChild(clone);

  root.style.display = 'none';
  stage.style.opacity = '1';
  stage.style.pointerEvents = 'none';
  stage.style.position = 'static';
  stage.style.top = '';
  stage.style.left = '';
  stage.style.right = '';
  stage.style.width = 'auto';
  stage.style.maxWidth = 'none';
  stage.style.padding = '0';
  stage.style.background = '#ffffff';

  stage.appendChild(wrapper);

  try {
    const rect = wrapper.getBoundingClientRect();
    const measuredWidth = Math.max(rect.width, wrapper.scrollWidth);
    const measuredHeight = Math.max(rect.height, wrapper.scrollHeight);
    const width = Math.max(1, Math.ceil(measuredWidth));
    const height = Math.max(1, Math.ceil(measuredHeight));

    const pixelArea = width * height;
    if (!Number.isFinite(pixelArea) || pixelArea <= 0) {
      throw createExportError('png-invalid-dimensions', 'Unable to determine export size for image export.', {
        width,
        height
      });
    }

    const basePixelRatio = 2;
    let pixelRatio = basePixelRatio;
    if (pixelArea * pixelRatio * pixelRatio > PNG_EXPORT_PIXEL_LIMIT) {
      const adjustedRatio = Math.sqrt(PNG_EXPORT_PIXEL_LIMIT / pixelArea);
      pixelRatio = Math.max(PNG_EXPORT_MIN_PIXEL_RATIO, Math.min(basePixelRatio, adjustedRatio));
    }

    const estimatedPages = estimatePageCount(height);
    if (pixelArea * pixelRatio * pixelRatio > PNG_EXPORT_PIXEL_LIMIT) {
      const message = `Conversation is too large to export as a single image (estimated ${estimatedPages} pages). Please use PDF or DOCX export instead.`;
      console.warn('[GPT Enhancer] PNG export aborted: dimensions exceed safe limits.', {
        width,
        height,
        pixelRatio,
        estimatedPages
      });
      throw createExportError('png-too-large', message, {
        width,
        height,
        pixelRatio,
        estimatedPages
      });
    }

    if (pixelRatio < basePixelRatio) {
      console.warn('[GPT Enhancer] PNG export resolution reduced to avoid browser memory limits.', {
        width,
        height,
        requestedPixelRatio: basePixelRatio,
        appliedPixelRatio: pixelRatio,
        estimatedPages
      });
    }

    let renderOutcome;
    try {
      renderOutcome = await renderNodeToPngSafely(wrapper, {
        pixelRatio,
        cacheBust: true,
        backgroundColor: '#ffffff',
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          margin: '0',
          boxSizing: 'border-box'
        }
      });
    } catch (error) {
      throw wrapHtmlToImageError(error, {
        width,
        height,
        pixelRatio,
        estimatedPages,
        suppressedWarnings: error && error.suppressedHtmlToImageLogs ? error.suppressedHtmlToImageLogs : undefined
      });
    }

    const blob = dataUrlToBlob(renderOutcome.dataUrl);
    triggerDownload(blob, buildFilename('png'));
  } finally {
    wrapper.remove();
    root.style.display = originalRootDisplay;
    stage.style.opacity = originalStageStyles.opacity;
    stage.style.pointerEvents = originalStageStyles.pointerEvents;
    stage.style.position = originalStageStyles.position;
    stage.style.top = originalStageStyles.top;
    stage.style.left = originalStageStyles.left;
    stage.style.right = originalStageStyles.right;
    stage.style.width = originalStageStyles.width;
    stage.style.maxWidth = originalStageStyles.maxWidth;
    stage.style.padding = originalStageStyles.padding;
    stage.style.background = originalStageStyles.background;
  }
}

function serializeExportRootToMarkdown(root) {
  const segments = [];
  const context = { listDepth: 0, preserveWhitespace: false, inLink: false };
  Array.from(root.childNodes).forEach((child) => {
    const chunk = serializeNodeToMarkdown(child, context);
    if (chunk && chunk.trim()) {
      segments.push(chunk.trim());
    }
  });
  return segments.join('\n\n');
}

function serializeNodeToMarkdown(node, context) {
  if (node.nodeType === Node.TEXT_NODE) {
    return serializeTextNode(node, context);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case 'br':
      return '\n';
    case 'hr':
      return '---';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const depth = Number(tag[1]);
      const headingContent = serializeInlineChildren(node, context).trim();
      if (!headingContent) {
        return '';
      }
      return `${'#'.repeat(depth)} ${headingContent}`;
    }
    case 'p':
      return serializeInlineChildren(node, context).trim();
    case 'blockquote':
      return serializeBlockquote(node, context);
    case 'pre':
      return serializePreformattedBlock(node);
    case 'ul':
      return serializeList(node, context, false);
    case 'ol':
      return serializeList(node, context, true);
    case 'table':
      return serializeTable(node, context);
    case 'thead':
    case 'tbody':
    case 'tfoot':
      return serializeBlockChildren(node, context);
    case 'li':
      return serializeBlockChildren(node, context);
    case 'strong':
    case 'b': {
      const strongContent = serializeInlineChildren(node, context).trim();
      return strongContent ? `**${strongContent}**` : '';
    }
    case 'em':
    case 'i': {
      const italicContent = serializeInlineChildren(node, context).trim();
      return italicContent ? `*${italicContent}*` : '';
    }
    case 'del':
    case 's': {
      const strikeContent = serializeInlineChildren(node, context).trim();
      return strikeContent ? `~~${strikeContent}~~` : '';
    }
    case 'code':
    case 'kbd':
      return serializeInlineCode(node, context);
    case 'a':
      return serializeLink(node, context);
    case 'img':
      return serializeImage(node);
    case 'sup': {
      const supContent = serializeInlineChildren(node, context).trim();
      return supContent ? `^(${supContent})` : '';
    }
    case 'sub': {
      const subContent = serializeInlineChildren(node, context).trim();
      return subContent ? `~(${subContent})` : '';
    }
    case 'mark': {
      const markContent = serializeInlineChildren(node, context).trim();
      return markContent ? `==${markContent}==` : '';
    }
    case 'span':
    case 'small':
    case 'label':
    case 'summary':
    case 'details':
    case 'figure':
    case 'figcaption':
    case 'section':
    case 'article':
    case 'main':
    case 'header':
    case 'footer':
    case 'aside':
    case 'div':
      return serializeGenericBlock(node, context);
    default:
      return serializeGenericBlock(node, context);
  }
}

function serializeGenericBlock(node, context) {
  if (hasBlockDescendant(node)) {
    return serializeBlockChildren(node, context);
  }
  return serializeInlineChildren(node, context).trim();
}

function serializeInlineChildren(node, context) {
  const childContext = { ...context };
  const parts = [];
  node.childNodes.forEach((child) => {
    const chunk = serializeNodeToMarkdown(child, childContext);
    if (chunk) {
      parts.push(chunk);
    }
  });
  const combined = parts.join('');
  if (context && context.preserveWhitespace) {
    return combined;
  }
  return combined.replace(/\s*\n\s*/g, '\n').replace(/[ \t]{2,}/g, ' ');
}

function serializeBlockChildren(node, context) {
  const childContext = { ...context };
  const pieces = [];
  node.childNodes.forEach((child) => {
    const chunk = serializeNodeToMarkdown(child, childContext);
    if (chunk) {
      const trimmed = chunk.replace(/\s+$/g, '');
      if (trimmed.trim()) {
        pieces.push(trimmed);
      }
    }
  });
  return pieces.join('\n\n');
}

function serializeTextNode(node, context) {
  let text = node.nodeValue || '';
  if (!text) {
    return '';
  }
  text = text.replace(/\u00a0/g, ' ');
  if (context && context.preserveWhitespace) {
    return text;
  }
  return escapeMarkdownText(text.replace(/\s+/g, ' '));
}

function serializeBlockquote(node, context) {
  const content = serializeBlockChildren(node, context);
  if (!content) {
    return '';
  }
  return content
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');
}

function serializePreformattedBlock(node) {
  const codeNode = node.querySelector('code');
  const raw = codeNode ? codeNode.textContent || '' : node.textContent || '';
  const language = codeNode && codeNode.className ? extractCodeLanguage(codeNode.className) : '';
  const content = sanitizeCodeBlockContent(raw);
  const fenceLength = Math.max(3, longestStreak(content, '`') + 1);
  const fence = '`'.repeat(fenceLength);
  return `${fence}${language}\n${content}\n${fence}`;
}

function serializeInlineCode(node, context) {
  if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
    return '';
  }
  const childContext = { ...context, preserveWhitespace: true };
  let content = serializeInlineChildren(node, childContext);
  if (!content) {
    return '';
  }
  let codeText = content.replace(/\r\n?/g, '\n').replace(/\n/g, ' ');
  const fenceLength = Math.max(1, longestStreak(codeText, '`') + 1);
  if (
    codeText.startsWith(' ') ||
    codeText.endsWith(' ') ||
    codeText.startsWith('`') ||
    codeText.endsWith('`')
  ) {
    codeText = ` ${codeText} `;
  }
  const fence = '`'.repeat(fenceLength);
  return `${fence}${codeText}${fence}`;
}

function serializeLink(node, context) {
  const href = node.getAttribute('href') || '';
  const title = node.getAttribute('title');
  const text = serializeInlineChildren(node, { ...context, inLink: true }).trim() || href;
  if (!href) {
    return text;
  }
  const destination = escapeLinkDestination(href);
  const titlePart = title ? ` "${escapeMarkdownText(title)}"` : '';
  return `[${text}](${destination}${titlePart})`;
}

function serializeImage(node) {
  const alt = escapeMarkdownText((node.getAttribute('alt') || '').trim());
  const src = node.getAttribute('src') || '';
  if (!src) {
    return alt ? `![${alt}]()` : '';
  }
  const title = node.getAttribute('title');
  const destination = escapeLinkDestination(src);
  const titlePart = title ? ` "${escapeMarkdownText(title)}"` : '';
  return `![${alt}](${destination}${titlePart})`;
}

function serializeList(node, context, ordered) {
  const depth = typeof context.listDepth === 'number' ? context.listDepth : 0;
  const items = [];
  const startAttr = ordered ? parseInt(node.getAttribute('start'), 10) : null;
  let index = Number.isFinite(startAttr) ? startAttr : 1;

  Array.from(node.children).forEach((child) => {
    if (!child || child.nodeType !== Node.ELEMENT_NODE || child.tagName.toLowerCase() !== 'li') {
      return;
    }
    const itemContent = serializeListItem(child, { ...context, listDepth: depth + 1 });
    if (itemContent === null) {
      return;
    }
    const lines = itemContent.split('\n');
    if (!lines.length) {
      return;
    }
    const indent = '  '.repeat(depth);
    const prefix = ordered ? `${index}. ` : '- ';
    const continuationIndent = ordered ? `${indent}${' '.repeat(prefix.length)}` : `${indent}  `;
    const formatted = lines
      .map((line, lineIndex) => {
        if (!line.trim()) {
          return '';
        }
        if (lineIndex === 0) {
          return `${indent}${prefix}${line}`;
        }
        if (/^\s/.test(line)) {
          return line;
        }
        return `${continuationIndent}${line}`;
      })
      .join('\n');
    if (formatted) {
      items.push(formatted);
    }
    if (ordered) {
      index += 1;
    }
  });

  return items.join('\n');
}

function serializeListItem(node, context) {
  const content = serializeBlockChildren(node, context);
  if (!content) {
    return null;
  }
  return content;
}

function serializeTable(node, context) {
  const rows = Array.from(node.querySelectorAll('tr'));
  if (!rows.length) {
    return '';
  }

  const matrix = rows
    .map((row) => {
      const cells = Array.from(row.children).filter((cell) => {
        if (!cell || cell.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        const tagName = cell.tagName.toLowerCase();
        return tagName === 'td' || tagName === 'th';
      });
      if (!cells.length) {
        return null;
      }
      return cells.map((cell) => escapeTableCell(serializeInlineChildren(cell, context).trim()));
    })
    .filter(Boolean);

  if (!matrix.length) {
    return '';
  }

  const columnCount = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const normalizedRows = matrix.map((row) => {
    const copy = row.slice();
    while (copy.length < columnCount) {
      copy.push('');
    }
    return copy;
  });

  let headerIndex = rows.findIndex((row) => row.querySelector('th'));
  if (headerIndex < 0) {
    headerIndex = 0;
  }

  const headerRow = normalizedRows[headerIndex];
  const bodyRows = normalizedRows.filter((_, idx) => idx !== headerIndex);

  const headerLine = `| ${headerRow.join(' | ')} |`;
  const separatorLine = `| ${new Array(columnCount).fill('---').join(' | ')} |`;
  const bodyLines = bodyRows.length ? bodyRows.map((row) => `| ${row.join(' | ')} |`) : [];
  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function escapeTableCell(text) {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function sanitizeCodeBlockContent(text) {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/\s+$/, '');
}

function longestStreak(value, character) {
  if (!value || !character) {
    return 0;
  }
  let max = 0;
  let current = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === character) {
      current += 1;
      if (current > max) {
        max = current;
      }
    } else {
      current = 0;
    }
  }
  return max;
}

function estimatePageCount(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(height / PNG_EXPORT_APPROX_PAGE_HEIGHT));
}

function createExportError(code, message, details) {
  const error = new Error(message);
  error.name = 'ExportError';
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}

function wrapHtmlToImageError(error, context) {
  const estimatedPages = context && Number.isFinite(context.estimatedPages) ? context.estimatedPages : null;
  let message = 'Unable to render conversation as PNG.';

  if (error && typeof error.message === 'string') {
    if (/canvas is tainted|tainted canv/i.test(error.message)) {
      message = 'PNG export failed because some images block cross-origin rendering. Try PDF or Markdown instead.';
    } else if (/data url is too long|the string to be encoded/i.test(error.message)) {
      message =
        'PNG export produced data that is too large for the browser to serialize. Please try PDF or DOCX export instead.';
    } else if (/memory|array buffer|alloc/i.test(error.message)) {
      message =
        'PNG export ran out of memory. The conversation is likely too long; try PDF or DOCX export instead.';
    }
  }

  if (context && Array.isArray(context.suppressedWarnings) && context.suppressedWarnings.length) {
    message += ' Some remote styles or assets could not be embedded and were skipped.';
  }

  if (estimatedPages && estimatedPages > 10) {
    message += ' Large conversations are better suited for PDF or DOCX exports.';
  }

  console.error('[GPT Enhancer] PNG export failed.', { cause: error, context });
  return createExportError('png-render-failed', message, {
    ...context,
    cause: error
  });
}

async function renderNodeToPngSafely(node, options) {
  const suppressedLogs = [];
  const release = interceptHtmlToImageConsole((level, args) => {
    const captured = captureSuppressedHtmlToImageLog(args);
    if (!captured) {
      return false;
    }
    suppressedLogs.push({ level, ...captured });
    return true;
  });

  try {
    const dataUrl = await window.htmlToImage.toPng(node, options);
    if (suppressedLogs.length) {
      const exampleLines = suppressedLogs
        .slice(0, 3)
        .map((entry) => `  • ${entry.summary || 'Remote asset could not be embedded.'}`)
        .join('\n');
      const suffix =
        suppressedLogs.length > 3 ? `\n  • (${suppressedLogs.length - 3} more similar message${suppressedLogs.length - 3 === 1 ? '' : 's'})` : '';
      // console.warn(
      //   `[GPT Enhancer] PNG export skipped ${suppressedLogs.length} remote asset${suppressedLogs.length === 1 ? '' : 's'} that could not be embedded.\n${exampleLines}${suffix}`
      // );
    }
    return { dataUrl, warnings: suppressedLogs };
  } catch (error) {
    if (error && typeof error === 'object') {
      error.suppressedHtmlToImageLogs = suppressedLogs;
    }
    throw error;
  } finally {
    release();
  }
}

function interceptHtmlToImageConsole(handler) {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args) => {
    if (!handler || !handler('error', args)) {
      originalError.apply(console, args);
    }
  };
  console.warn = (...args) => {
    if (!handler || !handler('warn', args)) {
      originalWarn.apply(console, args);
    }
  };

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
}

function normalizeConsoleMessage(args) {
  if (!args || !args.length) {
    return '';
  }
  const [first] = args;
  if (typeof first === 'string') {
    return first;
  }
  if (first instanceof Error && typeof first.message === 'string') {
    return first.message;
  }
  return '';
}

function captureSuppressedHtmlToImageLog(args) {
  if (!Array.isArray(args) || !args.length) {
    return null;
  }

  const stringInputs = args.filter((value) => typeof value === 'string' && value);
  const candidates = [...stringInputs];
  const normalized = normalizeConsoleMessage(args);
  if (normalized) {
    candidates.push(normalized);
  }
  const derived = args
    .map((value) => stringifyConsoleArg(value))
    .filter((value) => value && !candidates.includes(value));
  candidates.push(...derived);

  const message = candidates.find((candidate) => shouldSuppressHtmlToImageMessage(candidate));
  if (!message) {
    return null;
  }

  const summary = summarizeSuppressedWarning(message, args);
  return {
    summary,
    message,
    rawArgs: args
  };
}

function shouldSuppressHtmlToImageMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes('error inlining remote css') ||
    lower.includes('error loading remote stylesheet') ||
    lower.includes('error while reading css rules') ||
    lower.includes('failed to fetch resource')
  );
}

function summarizeSuppressedWarning(message, args) {
  let sanitized = sanitizeSuppressedMessage(message);
  if (sanitized && /^\[object\s+[^\]]+\]$/i.test(sanitized)) {
    sanitized = '';
  }

  const url = extractFirstUrl(args);
  const descriptor = extractErrorDescriptor(args);

  if (!sanitized && url) {
    sanitized = descriptor ? `${url} (${descriptor})` : url;
  } else if (sanitized && url && !sanitized.includes(url)) {
    sanitized = `${url} — ${sanitized}`;
  }

  if (!sanitized && descriptor) {
    sanitized = descriptor;
  }

  if (!sanitized) {
    sanitized = 'Remote asset could not be embedded.';
  }

  return sanitized;
}

function sanitizeSuppressedMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }
  let sanitized = message.trim();
  const patterns = [
    /^error inlining remote css file[:\s]*/i,
    /^error loading remote stylesheet[:\s]*/i,
    /^error while reading css rules from[:\s]*/i,
    /^failed to fetch resource[:\s]*/i
  ];
  patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  return sanitized;
}

function extractFirstUrl(args) {
  if (!Array.isArray(args)) {
    return '';
  }
  const urlRegex = /(https?:\/\/[^\s"'()<>]+[\w/#?&=%+-])/i;
  for (const arg of args) {
    if (typeof arg === 'string') {
      const match = arg.match(urlRegex);
      if (match) {
        return match[1];
      }
    }
  }
  return '';
}

function extractErrorDescriptor(args) {
  if (!Array.isArray(args)) {
    return '';
  }
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    if (arg instanceof Error) {
      return arg.message || arg.name || '';
    }
    if (typeof DOMException !== 'undefined' && arg instanceof DOMException) {
      return `${arg.name}${arg.code ? ` (${arg.code})` : ''}`;
    }
    if (typeof arg === 'object') {
      const message = typeof arg.message === 'string' ? arg.message : null;
      if (message) {
        return message;
      }
      const name = typeof arg.name === 'string' ? arg.name : null;
      if (name) {
        return name;
      }
    }
    if (typeof arg === 'string') {
      if (/domexception/i.test(arg)) {
        return arg;
      }
      if (/security/i.test(arg)) {
        return arg;
      }
    }
  }
  return '';
}

function stringifyConsoleArg(arg) {
  if (!arg) {
    return '';
  }
  if (typeof arg === 'string') {
    return arg;
  }
  if (arg instanceof Error) {
    return arg.message || arg.name || '';
  }
  if (typeof DOMException !== 'undefined' && arg instanceof DOMException) {
    return arg.message || arg.name || '';
  }
  if (typeof arg === 'object') {
    if (typeof arg.message === 'string') {
      return arg.message;
    }
    if (typeof arg.toString === 'function') {
      const result = arg.toString();
      if (result && result !== '[object Object]') {
        return result;
      }
    }
  }
  return '';
}
function extractCodeLanguage(className) {
  const match = className.match(MARKDOWN_CODE_LANGUAGE_REGEX);
  return match ? match[1].toLowerCase() : '';
}

function escapeMarkdownText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/([`*_{}\[\]()#+\-!.>])/g, '\\$1');
}

function escapeLinkDestination(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\s/g, '%20');
}

function hasBlockDescendant(node) {
  return Array.from(node.childNodes).some((child) => {
    if (!child || child.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    return MARKDOWN_BLOCK_TAGS.has(child.tagName.toLowerCase());
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid data URL');
  }
  const meta = parts[0];
  const base64 = parts[1];
  const mimeMatch = meta.match(/data:([^;]+)(;base64)?/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const isBase64 = Boolean(mimeMatch && mimeMatch[2]);

  if (!isBase64) {
    const decoded = decodeURIComponent(base64);
    return new Blob([decoded], { type: mimeType });
  }

  const binary = atob(base64);
  const length = binary.length;
  const buffer = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    buffer[index] = binary.charCodeAt(index);
  }
  return new Blob([buffer], { type: mimeType });
}

async function exportAsDocx(root) {
  const htmlDocx = window.htmlDocx;
  const filename = buildFilename('docx');
  const htmlContent = wrapForDocx(root.outerHTML);
  const blob = htmlDocx.asBlob(htmlContent);
  triggerDownload(blob, filename);
}

function wrapForDocx(innerHtml) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<style>${DOCX_EXPORT_STYLE_BLOCK}</style>`,
    '</head>',
    '<body>',
    innerHtml,
    '</body>',
    '</html>'
  ].join('');
}

function triggerDownload(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 0);
}

function buildFilename(extension) {
  const title = document.title || 'chatgpt-conversation';
  const timestamp = new Date().toISOString().split('T')[0];
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)+/g, '');
  const base = safeTitle || 'chatgpt-conversation';
  return `${base}-${timestamp}.${extension}`;
}
