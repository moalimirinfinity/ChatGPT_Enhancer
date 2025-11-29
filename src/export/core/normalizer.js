import {
  DARK_TEXT_COLOR,
  DARK_TEXT_LUMINANCE_THRESHOLD,
  DIRECTIONAL_TAGS,
  RTL_CHAR_REGEX,
  LTR_CHAR_REGEX,
  ARABIC_LETTER_REGEX,
  EXPORT_ROOT_CLASS,
  EXPORT_TURN_CLASS,
  EXPORT_EQUATION_CLASS
} from '../constants.js';

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

export function normalizeUnsupportedColors(root) {
  const elements = [root, ...root.querySelectorAll('*')];
  elements.forEach((element) => {
    const computed = window.getComputedStyle(element);
    COLOR_PROPERTIES.forEach(([styleName, cssName]) => {
      const value =
        typeof computed.getPropertyValue === 'function' ? computed.getPropertyValue(cssName) : computed[styleName];
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

export function insertRtlWeightBoundaries(root) {
  const boldNodes = root.querySelectorAll('b, strong');
  boldNodes.forEach((node) => {
    if (!isRtlElement(node)) {
      return;
    }

    const firstText = firstTextNode(node);
    const lastText = lastTextNode(node);
    const prevText = adjacentTextNode(node, 'previous');
    const nextText = adjacentTextNode(node, 'next');

    if (prevText && firstText && needsLeadingSeparator(prevText.nodeValue, firstText.nodeValue)) {
      prependZwnj(firstText);
    }
    if (nextText && lastText && needsTrailingSeparator(lastText.nodeValue, nextText.nodeValue)) {
      appendZwnj(lastText);
    }
  });
}

export function ensureDirectionalConsistency(root) {
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

function isRtlElement(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const dir = element.getAttribute('dir');
  if (dir) {
    return dir.toLowerCase() === 'rtl';
  }
  const computed = window.getComputedStyle(element);
  return computed && computed.direction === 'rtl';
}

function firstTextNode(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  return walker.nextNode();
}

function lastTextNode(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let last = null;
  while (walker.nextNode()) {
    last = walker.currentNode;
  }
  return last;
}

function adjacentTextNode(node, direction) {
  let current = node;
  while (current) {
    const sibling = direction === 'previous' ? current.previousSibling : current.nextSibling;
    if (sibling) {
      let candidate = sibling;
      while (candidate && candidate.lastChild && direction === 'previous') {
        candidate = candidate.lastChild;
      }
      while (candidate && candidate.firstChild && direction === 'next') {
        candidate = candidate.firstChild;
      }
      if (candidate && candidate.nodeType === Node.TEXT_NODE) {
        return candidate;
      }
      current = candidate;
      continue;
    }
    current = current.parentNode;
  }
  return null;
}

function needsLeadingSeparator(prevValue, currentValue) {
  const prevChar = lastSignificantChar(prevValue);
  const nextChar = firstSignificantChar(currentValue);
  if (!prevChar || !nextChar) {
    return false;
  }
  return ARABIC_LETTER_REGEX.test(prevChar) && ARABIC_LETTER_REGEX.test(nextChar) && nextChar !== '\u200c';
}

function needsTrailingSeparator(currentValue, nextValue) {
  const lastChar = lastSignificantChar(currentValue);
  const nextChar = firstSignificantChar(nextValue);
  if (!lastChar || !nextChar) {
    return false;
  }
  return ARABIC_LETTER_REGEX.test(lastChar) && ARABIC_LETTER_REGEX.test(nextChar) && lastChar !== '\u200c';
}

function prependZwnj(textNode) {
  if (textNode.nodeValue && textNode.nodeValue.startsWith('\u200c')) {
    return;
  }
  textNode.nodeValue = '\u200c' + textNode.nodeValue;
}

function appendZwnj(textNode) {
  if (textNode.nodeValue && textNode.nodeValue.endsWith('\u200c')) {
    return;
  }
  textNode.nodeValue = textNode.nodeValue + '\u200c';
}

function firstSignificantChar(value) {
  if (!value) {
    return '';
  }
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return '';
}

function lastSignificantChar(value) {
  if (!value) {
    return '';
  }
  for (let i = value.length - 1; i >= 0; i -= 1) {
    const ch = value[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return '';
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
  if (element.closest(`pre, code, .katex, .${EXPORT_EQUATION_CLASS}, svg`)) {
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
  if (element.closest(`pre, code, .${EXPORT_EQUATION_CLASS}, .katex, svg`)) {
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
