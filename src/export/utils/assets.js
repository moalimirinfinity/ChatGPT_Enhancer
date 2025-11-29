/**
 * Centralized loader for external libraries and fonts required by exports.
 */
import { VAZIRMATN_FONT_PATH, HTML_DOCX_PATH } from '../constants.js';
import { resolveRuntimeUrl } from './download.js';

let htmlDocxLib = null;
let htmlDocxLoadPromise = null;
let exportFontRegistrationPromise = null;

export async function ensureHtmlDocxLoaded() {
  if (htmlDocxLib) {
    return htmlDocxLib;
  }
  if (htmlDocxLoadPromise) {
    return htmlDocxLoadPromise;
  }

  htmlDocxLoadPromise = (async () => {
    try {
      const url = resolveRuntimeUrl(HTML_DOCX_PATH);
      const response = await fetch(url);
      if (response.ok) {
        const source = await response.text();
        try {
          const exports = {};
          const module = { exports };
          const requireStub = (name) => {
            if (typeof window !== 'undefined') {
              return window[name] || null;
            }
            return null;
          };
          const executor = new Function(
            'exports',
            'module',
            'require',
            'global',
            'window',
            'self',
            'globalThis',
            `${source}\nreturn module.exports || exports || globalThis.htmlDocx || null;`
          );
          const evaluated = executor(exports, module, requireStub, globalThis, globalThis, globalThis, globalThis);
          htmlDocxLib =
            evaluated || module.exports || exports.htmlDocx || exports.default || window.htmlDocx || globalThis.htmlDocx || null;
          if (htmlDocxLib) {
            return htmlDocxLib;
          }
        } catch (evalError) {
          /* fall through to script tag injection */
        }
      }
    } catch (error) {
      /* fall through to script tag injection */
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-gpt-enhancer-docx]');
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          htmlDocxLib = window.htmlDocx || null;
          if (htmlDocxLib) {
            resolve(htmlDocxLib);
            return;
          }
        }
        existing.addEventListener(
          'load',
          () => {
            htmlDocxLib = window.htmlDocx || null;
            htmlDocxLib ? resolve(htmlDocxLib) : reject(new Error('htmlDocx library missing after load'));
          },
          { once: true }
        );
        existing.addEventListener(
          'error',
          () => reject(new Error('Failed to load html-docx library')),
          { once: true }
        );
        return;
      }

      const script = document.createElement('script');
      script.dataset.gptEnhancerDocx = 'true';
      script.src = resolveRuntimeUrl(HTML_DOCX_PATH);
      script.onload = () => {
        script.dataset.loaded = 'true';
        htmlDocxLib = window.htmlDocx || null;
        if (!htmlDocxLib) {
          reject(new Error('htmlDocx library missing after load'));
          return;
        }
        resolve(htmlDocxLib);
      };
      script.onerror = () => reject(new Error('Failed to load html-docx library'));
      (document.head || document.documentElement).appendChild(script);
    });
  })();

  return htmlDocxLoadPromise;
}

export async function ensureExportFontsLoaded() {
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    return;
  }

  await registerExportFonts();

  try {
    await Promise.all([document.fonts.load('400 16px "Vazirmatn"'), document.fonts.load('700 16px "Vazirmatn"')]);
  } catch (error) {
    /* ignore */
  }

  if (typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
    try {
      await document.fonts.ready;
    } catch (error) {
      /* ignore */
    }
  }
}

function registerExportFonts() {
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
    const fontUrl = resolveRuntimeUrl(VAZIRMATN_FONT_PATH);
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
      /* ignore */
    }
  })();

  return exportFontRegistrationPromise;
}
