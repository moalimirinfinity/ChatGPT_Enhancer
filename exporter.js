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
const PDF_PAGE_HEIGHT_PX = 960;
const ZWNJ = '\u200c';
const ZWJ = '\u200d';
const TATWEEL = '\u0640';
const LTR_SEGMENT_REGEX = /[A-Za-z0-9@#$%^&*()_+\-=\/\\|{}\[\]:;"',.<>?!]+/g;
const NEUTRAL_PUNCTUATION_REGEX = /[،؛؟!?%٪٫٬٫٬\u060C\u061B\u061F\.]/g;
const PERSIAN_DIGIT_MAP = {
  '0': '۰',
  '1': '۱',
  '2': '۲',
  '3': '۳',
  '4': '۴',
  '5': '۵',
  '6': '۶',
  '7': '۷',
  '8': '۸',
  '9': '۹'
};
const ARABIC_CHAR_FORMS = new Map([
  ['\u0621', { isolated: '\uFE80', final: null, initial: null, medial: null, joinPrev: false, joinNext: false }],
  ['\u0622', { isolated: '\uFE81', final: '\uFE82', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0623', { isolated: '\uFE83', final: '\uFE84', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0624', { isolated: '\uFE85', final: '\uFE86', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0625', { isolated: '\uFE87', final: '\uFE88', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0626', { isolated: '\uFE89', final: '\uFE8A', initial: '\uFE8B', medial: '\uFE8C', joinPrev: true, joinNext: true }],
  ['\u0627', { isolated: '\uFE8D', final: '\uFE8E', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0628', { isolated: '\uFE8F', final: '\uFE90', initial: '\uFE91', medial: '\uFE92', joinPrev: true, joinNext: true }],
  ['\u0629', { isolated: '\uFE93', final: '\uFE94', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u062A', { isolated: '\uFE95', final: '\uFE96', initial: '\uFE97', medial: '\uFE98', joinPrev: true, joinNext: true }],
  ['\u062B', { isolated: '\uFE99', final: '\uFE9A', initial: '\uFE9B', medial: '\uFE9C', joinPrev: true, joinNext: true }],
  ['\u062C', { isolated: '\uFE9D', final: '\uFE9E', initial: '\uFE9F', medial: '\uFEA0', joinPrev: true, joinNext: true }],
  ['\u062D', { isolated: '\uFEA1', final: '\uFEA2', initial: '\uFEA3', medial: '\uFEA4', joinPrev: true, joinNext: true }],
  ['\u062E', { isolated: '\uFEA5', final: '\uFEA6', initial: '\uFEA7', medial: '\uFEA8', joinPrev: true, joinNext: true }],
  ['\u062F', { isolated: '\uFEA9', final: '\uFEAA', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0630', { isolated: '\uFEAB', final: '\uFEAC', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0631', { isolated: '\uFEAD', final: '\uFEAE', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0632', { isolated: '\uFEAF', final: '\uFEB0', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0633', { isolated: '\uFEB1', final: '\uFEB2', initial: '\uFEB3', medial: '\uFEB4', joinPrev: true, joinNext: true }],
  ['\u0634', { isolated: '\uFEB5', final: '\uFEB6', initial: '\uFEB7', medial: '\uFEB8', joinPrev: true, joinNext: true }],
  ['\u0635', { isolated: '\uFEB9', final: '\uFEBA', initial: '\uFEBB', medial: '\uFEBC', joinPrev: true, joinNext: true }],
  ['\u0636', { isolated: '\uFEBD', final: '\uFEBE', initial: '\uFEBF', medial: '\uFEC0', joinPrev: true, joinNext: true }],
  ['\u0637', { isolated: '\uFEC1', final: '\uFEC2', initial: '\uFEC3', medial: '\uFEC4', joinPrev: true, joinNext: true }],
  ['\u0638', { isolated: '\uFEC5', final: '\uFEC6', initial: '\uFEC7', medial: '\uFEC8', joinPrev: true, joinNext: true }],
  ['\u0639', { isolated: '\uFEC9', final: '\uFECA', initial: '\uFECB', medial: '\uFECC', joinPrev: true, joinNext: true }],
  ['\u063A', { isolated: '\uFECD', final: '\uFECE', initial: '\uFECF', medial: '\uFED0', joinPrev: true, joinNext: true }],
  ['\u0641', { isolated: '\uFED1', final: '\uFED2', initial: '\uFED3', medial: '\uFED4', joinPrev: true, joinNext: true }],
  ['\u0642', { isolated: '\uFED5', final: '\uFED6', initial: '\uFED7', medial: '\uFED8', joinPrev: true, joinNext: true }],
  ['\u0643', { isolated: '\uFED9', final: '\uFEDA', initial: '\uFEDB', medial: '\uFEDC', joinPrev: true, joinNext: true }],
  ['\u0644', { isolated: '\uFEDD', final: '\uFEDE', initial: '\uFEDF', medial: '\uFEE0', joinPrev: true, joinNext: true }],
  ['\u0645', { isolated: '\uFEE1', final: '\uFEE2', initial: '\uFEE3', medial: '\uFEE4', joinPrev: true, joinNext: true }],
  ['\u0646', { isolated: '\uFEE5', final: '\uFEE6', initial: '\uFEE7', medial: '\uFEE8', joinPrev: true, joinNext: true }],
  ['\u0647', { isolated: '\uFEE9', final: '\uFEEA', initial: '\uFEEB', medial: '\uFEEC', joinPrev: true, joinNext: true }],
  ['\u0648', { isolated: '\uFEED', final: '\uFEEE', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u0649', { isolated: '\uFEEF', final: '\uFEF0', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u064A', { isolated: '\uFEF1', final: '\uFEF2', initial: '\uFEF3', medial: '\uFEF4', joinPrev: true, joinNext: true }],
  ['\u067E', { isolated: '\uFB56', final: '\uFB57', initial: '\uFB58', medial: '\uFB59', joinPrev: true, joinNext: true }],
  ['\u0686', { isolated: '\uFB7A', final: '\uFB7B', initial: '\uFB7C', medial: '\uFB7D', joinPrev: true, joinNext: true }],
  ['\u0698', { isolated: '\uFB8A', final: '\uFB8B', initial: null, medial: null, joinPrev: true, joinNext: false }],
  ['\u06A9', { isolated: '\uFB8E', final: '\uFB8F', initial: '\uFB90', medial: '\uFB91', joinPrev: true, joinNext: true }],
  ['\u06AF', { isolated: '\uFB92', final: '\uFB93', initial: '\uFB94', medial: '\uFB95', joinPrev: true, joinNext: true }],
  ['\u06CC', { isolated: '\uFBFC', final: '\uFBFD', initial: '\uFBFE', medial: '\uFBFF', joinPrev: true, joinNext: true }]
]);
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

function getJsPdfConstructor() {
  if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
    return window.jspdf.jsPDF;
  }
  if (typeof window.jsPDF === 'function') {
    return window.jsPDF;
  }
  return null;
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
    if (format === 'pdf') {
      reshapeRtlTextNodes(root);
    }
    await ensureExportFontsLoaded();
    await inlineImages(root);

    if (format === 'docx') {
      prepareDocxSpecificAdjustments(root);
      await convertKatexToImages(root);
      await exportAsDocx(root);
    } else {
      adjustLargeBlocksForPdf(root);
      relaxOversizedTurnBreaks(root);
      await exportAsPdf(root);
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

  const originalWindowScroll = { x: window.scrollX, y: window.scrollY };
  const originalMainScrollTop = main ? main.scrollTop : null;

  let previousCount = container.querySelectorAll(selector).length;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const nodes = container.querySelectorAll(selector);
    if (!nodes.length) {
      await delay(80);
      continue;
    }

    const last = nodes[nodes.length - 1];
    if (last && typeof last.scrollIntoView === 'function') {
      last.scrollIntoView({ block: 'end', inline: 'nearest' });
    }
    window.scrollTo(0, document.body.scrollHeight);

    await delay(160);
    const currentCount = container.querySelectorAll(selector).length;
    if (currentCount === previousCount) {
      break;
    }
    previousCount = currentCount;
  }

  if (typeof originalMainScrollTop === 'number' && main) {
    main.scrollTop = originalMainScrollTop;
  }
  window.scrollTo(originalWindowScroll.x, originalWindowScroll.y);
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

    const { rtlCount } = countDirectionCharacters(text);
    if (rtlCount === 0) {
      continue;
    }

    element.setAttribute('dir', 'rtl');
    element.style.removeProperty('direction');
    element.style.removeProperty('unicode-bidi');
    element.style.removeProperty('text-align');
  }
}

function reshapeRtlTextNodes(root) {
  if (!root) {
    return;
  }
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => processRtlTextNode(node));
}

function processRtlTextNode(node) {
  const value = node.nodeValue;
  if (!value || !containsRtlCharacters(value)) {
    return;
  }
  if (shouldSkipArabicReshape(node)) {
    return;
  }

  const segments = splitTextForDirectionalRuns(value);
  if (!segments) {
    const converted = convertAsciiDigitsToPersian(value);
    node.nodeValue = reshapeArabicText(converted);
    return;
  }

  const parent = node.parentNode;
  if (!parent) {
    return;
  }

  const fragment = document.createDocumentFragment();
  segments.forEach((segment) => {
    if (!segment.value) {
      return;
    }
    if (segment.type === 'ltr') {
      const span = document.createElement('span');
      span.setAttribute('dir', 'ltr');
      span.textContent = segment.value;
      fragment.appendChild(span);
    } else if (segment.type === 'neutral') {
      const span = document.createElement('span');
      span.setAttribute('dir', 'rtl');
      span.textContent = convertAsciiDigitsToPersian(segment.value);
      fragment.appendChild(span);
    } else {
      const converted = convertAsciiDigitsToPersian(segment.value);
      if (containsRtlCharacters(converted)) {
        fragment.appendChild(document.createTextNode(reshapeArabicText(converted)));
      } else {
        fragment.appendChild(document.createTextNode(converted));
      }
    }
  });

  parent.replaceChild(fragment, node);
}

function splitTextForDirectionalRuns(value) {
  LTR_SEGMENT_REGEX.lastIndex = 0;
  let match;
  let lastIndex = 0;
  let hasLtr = false;
  const segments = [];

  while ((match = LTR_SEGMENT_REGEX.exec(value))) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      segments.push({ type: 'rtl', value: value.slice(lastIndex, matchStart) });
    }
    segments.push({ type: 'ltr', value: match[0] });
    hasLtr = true;
    lastIndex = matchStart + match[0].length;
  }

  if (!hasLtr) {
    return null;
  }

  if (lastIndex < value.length) {
    segments.push({ type: 'rtl', value: value.slice(lastIndex) });
  }

  if (!segments.length) {
    return null;
  }

  const expanded = [];
  segments.forEach((segment) => {
    if (segment.type !== 'rtl') {
      expanded.push(segment);
      return;
    }
    const subSegments = splitNeutralSegments(segment.value);
    subSegments.forEach((subSegment) => expanded.push(subSegment));
  });

  return expanded;
}

function shouldSkipArabicReshape(textNode) {
  let current = textNode.parentNode;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName ? current.tagName.toLowerCase() : '';
    if (tag === 'pre' || tag === 'code' || tag === 'script' || tag === 'style') {
      return true;
    }
    if (current.classList && current.classList.contains(EXPORT_EQUATION_CLASS)) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function reshapeArabicText(input) {
  const chars = Array.from(input);
  const output = [];
  for (let index = 0; index < chars.length; index += 1) {
    const currentChar = chars[index];
    if (currentChar === ZWNJ) {
      output.push(currentChar);
      continue;
    }
    if (currentChar === TATWEEL) {
      output.push(currentChar);
      continue;
    }
    const currentForm = ARABIC_CHAR_FORMS.get(currentChar);
    if (!currentForm) {
      output.push(currentChar);
      continue;
    }

    const prevInfo = findPreviousConnectable(chars, index);
    const nextInfo = findNextConnectable(chars, index);
    const connectPrev = Boolean(prevInfo && prevInfo.form.joinNext && currentForm.joinPrev);
    const connectNext = Boolean(nextInfo && currentForm.joinNext && nextInfo.form.joinPrev);

    let shaped = currentForm.isolated || currentChar;
    if (connectPrev && connectNext && currentForm.medial) {
      shaped = currentForm.medial;
    } else if (connectPrev && currentForm.final) {
      shaped = currentForm.final;
    } else if (connectNext && currentForm.initial) {
      shaped = currentForm.initial;
    }

    output.push(shaped);
  }
  return output.join('');
}

function findPreviousConnectable(chars, startIndex) {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const candidate = chars[index];
    if (candidate === ZWNJ) {
      return null;
    }
    if (candidate === ZWJ) {
      continue;
    }
    if (candidate === TATWEEL) {
      continue;
    }
    const form = ARABIC_CHAR_FORMS.get(candidate);
    if (!form) {
      if (isArabicCombiningMark(candidate)) {
        continue;
      }
      if (!isWhitespaceLike(candidate)) {
        return null;
      }
      continue;
    }
    return { char: candidate, form };
  }
  return null;
}

function findNextConnectable(chars, startIndex) {
  for (let index = startIndex + 1; index < chars.length; index += 1) {
    const candidate = chars[index];
    if (candidate === ZWNJ) {
      return null;
    }
    if (candidate === ZWJ) {
      continue;
    }
    if (candidate === TATWEEL) {
      continue;
    }
    const form = ARABIC_CHAR_FORMS.get(candidate);
    if (!form) {
      if (isArabicCombiningMark(candidate)) {
        continue;
      }
      if (!isWhitespaceLike(candidate)) {
        return null;
      }
      continue;
    }
    return { char: candidate, form };
  }
  return null;
}

function isWhitespaceLike(char) {
  if (!char) {
    return false;
  }
  return /\s/.test(char);
}

function containsRtlCharacters(value) {
  if (!value) {
    return false;
  }
  RTL_CHAR_REGEX.lastIndex = 0;
  return RTL_CHAR_REGEX.test(value);
}

function isArabicCombiningMark(char) {
  if (!char) {
    return false;
  }
  const code = char.codePointAt(0);
  if (code === undefined) {
    return false;
  }
  return (
    (code >= 0x0610 && code <= 0x061A) ||
    (code >= 0x064B && code <= 0x065F) ||
    (code >= 0x0670 && code <= 0x0671) ||
    (code >= 0x06D6 && code <= 0x06DC) ||
    (code >= 0x06DF && code <= 0x06E8) ||
    (code >= 0x06EA && code <= 0x06ED)
  );
}

function splitNeutralSegments(value) {
  const result = [];
  if (!value) {
    return result;
  }
  NEUTRAL_PUNCTUATION_REGEX.lastIndex = 0;
  let match;
  let lastIndex = 0;
  while ((match = NEUTRAL_PUNCTUATION_REGEX.exec(value))) {
    const index = match.index;
    if (index > lastIndex) {
      result.push({ type: 'rtl', value: value.slice(lastIndex, index) });
    }
    result.push({ type: 'neutral', value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) {
    result.push({ type: 'rtl', value: value.slice(lastIndex) });
  }
  return result;
}

function convertAsciiDigitsToPersian(value) {
  if (!value) {
    return value;
  }
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    result += PERSIAN_DIGIT_MAP[char] || char;
  }
  return result;
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
  if (format === 'pdf' && typeof window.html2pdf !== 'function') {
    throw new Error('html2pdf library missing');
  }
  if (format === 'docx') {
    if (!window.htmlDocx) {
      throw new Error('htmlDocx library missing');
    }
    if (!window.htmlToImage) {
      throw new Error('htmlToImage library missing');
    }
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

function adjustLargeBlocksForPdf(root) {
  const threshold = PDF_PAGE_HEIGHT_PX * 0.92;
  const selectors = ['pre', 'table', 'blockquote', 'section', 'article', 'ul', 'ol', 'dl'];
  const targets = root.querySelectorAll(selectors.join(','));

  targets.forEach((node) => {
    const height = getElementHeight(node);
    if (height <= threshold) {
      return;
    }

    allowPageSplits(node);

    if (node.matches('pre')) {
      node.style.setProperty('white-space', 'pre-wrap', 'important');
      node.style.setProperty('word-break', 'break-word', 'important');
      node.style.setProperty('overflow-wrap', 'anywhere', 'important');
    }

    if (node.matches('table')) {
      node.style.setProperty('table-layout', 'fixed', 'important');
    }

  });
}

function relaxOversizedTurnBreaks(root) {
  const threshold = PDF_PAGE_HEIGHT_PX * 0.95;
  const turns = root.querySelectorAll('.' + EXPORT_TURN_CLASS);
  turns.forEach((turn) => {
    const height = getElementHeight(turn);
    if (height <= threshold) {
      return;
    }

    allowPageSplits(turn);

    const innerSelectors = ['pre', 'table', 'blockquote', 'section', 'article', 'ul', 'ol', 'dl'];
    innerSelectors.forEach((selector) => {
      turn.querySelectorAll(selector).forEach((node) => allowPageSplits(node));
    });
  });
}

function allowPageSplits(node) {
  node.style.setProperty('page-break-inside', 'auto', 'important');
  node.style.setProperty('break-inside', 'auto', 'important');
}

function getElementHeight(node) {
  const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null;
  if (rect && rect.height) {
    return rect.height;
  }
  return Math.max(node.scrollHeight || 0, node.offsetHeight || 0);
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
      const dataUrl = await window.htmlToImage.toPng(node, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });
      const latex = extractLatex(node);
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

function containsRtlContent(root) {
  if (!root) {
    return false;
  }
  if (root.querySelector('[dir="rtl"]')) {
    return true;
  }
  if (!root.textContent) {
    return false;
  }
  return containsRtlCharacters(root.textContent);
}

async function exportAsPdf(root) {
  if (containsRtlContent(root)) {
    const rasterized = await exportAsRasterizedPdf(root);
    if (rasterized) {
      return;
    }
  }

  const filename = buildFilename('pdf');
  const html2pdf = window.html2pdf;
  const options = {
    margin: 0.5,
    filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    pagebreak: {
      mode: ['css', 'legacy']
    }
  };
  await html2pdf().set(options).from(root).save();
}

async function exportAsRasterizedPdf(root) {
  const jsPdfConstructor = getJsPdfConstructor();
  if (!jsPdfConstructor || !window.htmlToImage || typeof window.htmlToImage.toCanvas !== 'function') {
    return false;
  }

  try {
    const canvas = await window.htmlToImage.toCanvas(root, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPdfConstructor({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const filename = buildFilename('pdf');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const scaledHeight = canvas.height * (usableWidth / canvas.width);
    const step = pageHeight - margin * 2;

    let offset = 0;
    while (offset < scaledHeight) {
      pdf.addImage(imgData, 'PNG', margin, margin - offset, usableWidth, scaledHeight);
      offset += step;
      if (offset < scaledHeight) {
        pdf.addPage();
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.warn('[GPT Enhancer] Rasterized PDF export failed', error);
    return false;
  }
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
