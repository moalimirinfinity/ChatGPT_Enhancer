const EXPORT_MESSAGE_TYPE = 'GBT_EXPORT_CONVERSATION';
const EXPORT_STAGE_CLASS = 'gbt-export-stage';
const EXPORT_ROOT_CLASS = 'gbt-export-root';
const EXPORT_TURN_CLASS = 'gbt-export-turn';
const EXPORT_EQUATION_CLASS = 'gbt-export-equation';
const DARK_TEXT_COLOR = 'rgb(17, 18, 34)';
const DARK_TEXT_LUMINANCE_THRESHOLD = 0.75;
const EXPORT_STYLE_BLOCK = `
.${EXPORT_ROOT_CLASS} {
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  color: ${DARK_TEXT_COLOR};
  background: #ffffff;
  padding: 32px 40px;
  box-sizing: border-box;
  max-width: 820px;
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== EXPORT_MESSAGE_TYPE) {
    return undefined;
  }

  handleExportRequest(message.format || 'pdf')
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error('[GBT Enhancer] Export failed', error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });

  return true;
});

async function handleExportRequest(format) {
  const { root, stage, styleNode } = prepareExportStage();
  try {
    ensureLibraries(format);
    normalizeUnsupportedColors(root);
    await inlineImages(root);

    if (format === 'docx') {
      await convertKatexToImages(root);
      await exportAsDocx(root);
    } else {
      await exportAsPdf(root);
    }
  } finally {
    if (styleNode && styleNode.parentNode) {
      styleNode.parentNode.removeChild(styleNode);
    }
    stage.remove();
  }
}

function prepareExportStage() {
  const exportRoot = collectConversation();
  if (!exportRoot) {
    throw new Error('Unable to locate conversation content on this page.');
  }

  const stage = document.createElement('div');
  stage.className = EXPORT_STAGE_CLASS;
  stage.style.position = 'fixed';
  stage.style.top = '-20000px';
  stage.style.left = '-20000px';
  stage.style.width = '720px';
  stage.style.zIndex = '-1';
  stage.style.pointerEvents = 'none';

  const styleNode = document.createElement('style');
  styleNode.textContent = EXPORT_STYLE_BLOCK;
  stage.appendChild(styleNode);
  stage.appendChild(exportRoot);
  document.body.appendChild(stage);

  return { root: exportRoot, stage, styleNode };
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
          console.warn('[GBT Enhancer] Unable to inline image', error, fallbackError);
        }
      }
    })
  );
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
      console.warn('[GBT Enhancer] Failed to rasterize equation', error);
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

async function exportAsPdf(root) {
  const filename = buildFilename('pdf');
  const html2pdf = window.html2pdf;
  const options = {
    margin: 0.5,
    filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  await html2pdf().set(options).from(root).save();
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
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<style>${EXPORT_STYLE_BLOCK}</style>`,
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
