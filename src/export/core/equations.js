import { EXPORT_EQUATION_CLASS } from '../constants.js';
import { renderNodeToPngSafely } from '../generators/shared.js';

const STANDALONE_EQUATION_CONTAINER_SELECTOR = [
  'p',
  'div',
  'section',
  'article',
  'main',
  'li',
  'blockquote',
  'dd',
  'dt',
  'figure',
  'figcaption'
].join(',');

export async function convertKatexToImages(root) {
  const katexNodes = Array.from(root.querySelectorAll('.katex'));
  if (!katexNodes.length) {
    return;
  }

  const uniqueNodes = katexNodes.filter((node) => !node.querySelector('.katex'));

  for (const node of uniqueNodes) {
    try {
      const latex = extractLatex(node);
      let displayContainer = node.closest('.katex-display');
      const standaloneBlock = !displayContainer && isStandaloneEquationBlock(node);
      const inTableCell = Boolean(node.closest('td, th'));
      if (!displayContainer && standaloneBlock && !inTableCell) {
        const wrapped = wrapInlineEquationInDisplayContainer(node);
        if (wrapped) {
          displayContainer = wrapped;
        }
      }
      const isDisplayMode = Boolean(displayContainer);
      const shouldUseTextFallback = inTableCell || !isDisplayMode;

      if (displayContainer && !inTableCell) {
        displayContainer.style.setProperty('text-align', 'center', 'important');
        displayContainer.style.setProperty('margin', '20px auto 12px', 'important');
        displayContainer.style.setProperty('width', '75%', 'important');
        displayContainer.style.setProperty('max-width', '75%', 'important');
        displayContainer.style.setProperty('display', 'block', 'important');
        displayContainer.style.setProperty('padding', '6px 0', 'important');
      }

      if (shouldUseTextFallback) {
        const replacementTag = isDisplayMode ? 'div' : 'span';
        const textEquation = document.createElement(replacementTag);
        textEquation.className = EXPORT_EQUATION_CLASS;
        textEquation.setAttribute('dir', 'ltr');
        textEquation.style.setProperty('direction', 'ltr', 'important');
        textEquation.style.setProperty('unicode-bidi', 'normal', 'important');
        textEquation.style.setProperty('white-space', 'pre-wrap', 'important');
        textEquation.style.setProperty('font-family', '"Cambria Math", "Consolas", "Courier New", monospace', 'important');
        textEquation.style.setProperty('display', isDisplayMode ? 'block' : 'inline-block', 'important');
        textEquation.style.setProperty('vertical-align', isDisplayMode ? 'baseline' : 'middle', 'important');
        textEquation.style.setProperty('line-height', isDisplayMode ? '1.35' : '1.1', 'important');
        if (isDisplayMode) {
          textEquation.style.setProperty('text-align', 'center', 'important');
          textEquation.style.setProperty('margin', '0 auto', 'important');
          textEquation.style.setProperty('padding', '4px 0', 'important');
        }
        textEquation.textContent = latex || (node.textContent ? node.textContent.trim() : 'Equation');
        node.replaceWith(textEquation);
        continue;
      }

      const { dataUrl } = await renderNodeToPngSafely(node, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        skipFonts: true
      });
      if (!dataUrl) {
        throw new Error('Equation rasterization did not return a data URL.');
      }
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = latex ? `TeX: ${latex}` : 'Equation';
      image.className = EXPORT_EQUATION_CLASS;
      image.setAttribute('dir', 'ltr');
      image.style.setProperty('direction', 'ltr', 'important');
      image.style.setProperty('unicode-bidi', 'normal', 'important');
      image.style.setProperty('text-align', 'left', 'important');
      image.style.setProperty('display', 'inline-block', 'important');
      image.style.setProperty('margin', '6px auto', 'important');
      image.style.setProperty('max-width', '75%', 'important');
      image.style.setProperty('height', 'auto', 'important');
      node.replaceWith(image);
    } catch (error) {
      /* ignore */
    }
  }
}

function isStandaloneEquationBlock(node) {
  if (!node || !(node instanceof HTMLElement)) {
    return false;
  }
  if (node.closest('pre, code')) {
    return false;
  }
  const block = node.closest(STANDALONE_EQUATION_CONTAINER_SELECTOR);
  if (!block) {
    return false;
  }
  const residual = extractNonEquationText(block);
  return residual.length === 0;
}

function extractNonEquationText(container) {
  if (!container) {
    return '';
  }
  const clone = container.cloneNode(true);
  const equations = clone.querySelectorAll('.katex');
  equations.forEach((equation) => equation.remove());
  const text = clone.textContent || '';
  return text.replace(/\s+/g, '').trim();
}

function wrapInlineEquationInDisplayContainer(node) {
  if (!node || !node.parentNode) {
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'katex-display';
  node.parentNode.insertBefore(wrapper, node);
  wrapper.appendChild(node);
  return wrapper;
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
