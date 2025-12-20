/**
 * Handles PDF generation via the browser's native print dialog.
 */

import { EXPORT_STAGE_CLASS, EXPORT_ROOT_CLASS } from '../constants.js';

export function exportAsPdf(stage) {
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @page {
      size: auto;
      margin-top: 0.6in;
      margin-bottom: 0.6in;
      margin-left: 0.4in;
      margin-right: 0.4in;
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
        position: static !important;
        z-index: 9999 !important;
      }
      /* Override table styles to allow edge alignment based on direction */
      .${EXPORT_ROOT_CLASS} table {
        width: auto !important;
        max-width: 100% !important;
        table-layout: auto !important;
      }
      /* Force code blocks to retain dark styling when printing */
      .${EXPORT_ROOT_CLASS} pre {
        background-color: #000 !important;
        color: #fff !important;
        border-radius: 6px !important;
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
      .${EXPORT_ROOT_CLASS} .katex {
        display: inline-flex !important;
        align-items: center;
        vertical-align: -0.05em !important;
      }
      .${EXPORT_ROOT_CLASS} .katex-display > .katex {
        display: block !important;
        align-items: initial;
        vertical-align: baseline !important;
        text-align: center !important;
      }
      .${EXPORT_ROOT_CLASS} .katex-display {
        text-align: center !important;
        margin: 16px auto;
      }
    }
  `;
  document.head.appendChild(printStyle);
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      if (done) {
        return;
      }
      done = true;
      window.clearTimeout(timeout);
      window.removeEventListener('afterprint', cleanup);
      if (printStyle.parentNode) {
        printStyle.parentNode.removeChild(printStyle);
      }
      resolve();
    };
    const timeout = window.setTimeout(cleanup, 5000);
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  });
}
