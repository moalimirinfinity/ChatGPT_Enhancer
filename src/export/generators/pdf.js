/**
 * Handles PDF generation via the browser's native print dialog.
 */

import { EXPORT_STAGE_CLASS, EXPORT_ROOT_CLASS } from '../constants.js';

export async function exportAsPdf(stage) {
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
  window.print();
  document.head.removeChild(printStyle);
}
