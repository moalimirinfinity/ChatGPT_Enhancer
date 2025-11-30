/**
 * Centralized loader for external libraries and fonts required by exports.
 */
import { VAZIRMATN_FONT_PATH, HTML_DOCX_PATH } from '../constants.js';
import { resolveRuntimeUrl } from './download.js';

let htmlDocxLib = null;
let htmlDocxLoadPromise = null;
let exportFontRegistrationPromise = null;

function evaluateHtmlDocxSource(source) {
  try {
    const exports = {};
    const module = { exports };
    const requireStub = (name) => {
      if (typeof globalThis !== 'undefined' && name in globalThis) {
        return globalThis[name];
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
      `${source}\nreturn module.exports || exports || globalThis.htmlDocx || (typeof htmlDocx !== 'undefined' ? htmlDocx : null);`
    );
    return executor(exports, module, requireStub, globalThis, globalThis, globalThis, globalThis);
  } catch (error) {
    return null;
  }
}

async function importHtmlDocxAsModule(source) {
  try {
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    const mod = await import(blobUrl);
    URL.revokeObjectURL(blobUrl);
    return mod?.default || mod?.htmlDocx || (typeof globalThis !== 'undefined' ? globalThis.htmlDocx : null) || null;
  } catch (error) {
    return null;
  }
}

async function loadHtmlDocxFromSource() {
  const url = resolveRuntimeUrl(HTML_DOCX_PATH);
  if (!url) {
    throw new Error('html-docx URL unavailable');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`html-docx request failed: ${response.status}`);
  }
  const source = await response.text();
  const evaluated = evaluateHtmlDocxSource(source);
  if (evaluated) {
    return evaluated;
  }
  const imported = await importHtmlDocxAsModule(source);
  if (imported) {
    return imported;
  }
  throw new Error('html-docx evaluation did not produce a library');
}

async function loadHtmlDocxViaSandbox() {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.onload = () => {
      try {
        const script = iframe.contentDocument.createElement('script');
        script.src = resolveRuntimeUrl(HTML_DOCX_PATH);
        script.onload = () => {
          try {
            const lib =
              iframe.contentWindow?.htmlDocx ||
              iframe.contentDocument?.defaultView?.htmlDocx ||
              null;
            if (lib) {
              resolve(lib);
            } else {
              reject(new Error('html-docx not exposed in sandbox'));
            }
          } catch (error) {
            reject(error);
          } finally {
            iframe.remove();
          }
        };
        script.onerror = () => {
          iframe.remove();
          reject(new Error('Failed to load html-docx in sandbox'));
        };
        iframe.contentDocument.head.appendChild(script);
      } catch (error) {
        iframe.remove();
        reject(error);
      }
    };
    iframe.onerror = () => {
      iframe.remove();
      reject(new Error('Sandbox iframe load failed'));
    };
    document.documentElement.appendChild(iframe);
  });
}

export async function ensureHtmlDocxLoaded() {
  if (htmlDocxLib) {
    return htmlDocxLib;
  }
  if (htmlDocxLoadPromise) {
    return htmlDocxLoadPromise;
  }

  htmlDocxLoadPromise = (async () => {
    // Prefer sandboxed iframe load first to avoid page CSP/isolation issues.
    try {
      htmlDocxLib = await loadHtmlDocxViaSandbox();
      return htmlDocxLib;
    } catch (error) {
      /* fall through to source-based load */
    }

    try {
      htmlDocxLib = await loadHtmlDocxFromSource();
      return htmlDocxLib;
    } catch (error) {
      /* fall through to script tag injection */
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-gpt-enhancer-docx]');
      if (existing) {
        const handleResolve = () => {
          htmlDocxLib =
            (typeof window !== 'undefined' ? window.htmlDocx : null) ||
            (typeof globalThis !== 'undefined' ? globalThis.htmlDocx : null);
          if (htmlDocxLib) {
            resolve(htmlDocxLib);
          } else {
            // As a final fallback, re-fetch and eval to populate in the isolated world.
            loadHtmlDocxFromSource().then(resolve).catch(reject);
          }
        };
        if (existing.dataset.loaded === 'true') {
          handleResolve();
          return;
        }
        existing.addEventListener('load', handleResolve, { once: true });
        existing.addEventListener('error', () => {
          loadHtmlDocxFromSource().then(resolve).catch(() => reject(new Error('Failed to load html-docx library')));
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.dataset.gptEnhancerDocx = 'true';
      script.src = resolveRuntimeUrl(HTML_DOCX_PATH);
      script.onload = () => {
        script.dataset.loaded = 'true';
        htmlDocxLib =
          (typeof window !== 'undefined' ? window.htmlDocx : null) ||
          (typeof globalThis !== 'undefined' ? globalThis.htmlDocx : null);
        if (!htmlDocxLib) {
          // Try fetch/eval in the extension world if page-world injection did not expose the global.
          loadHtmlDocxFromSource()
            .then((lib) => resolve(lib))
            .catch(() => reject(new Error('htmlDocx library missing after load')));
          return;
        }
        resolve(htmlDocxLib);
      };
      script.onerror = () => {
        loadHtmlDocxFromSource()
          .then((lib) => resolve(lib))
          .catch(() => reject(new Error('Failed to load html-docx library')));
      };
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
