/**
 * CSS styles injected into the export stage for consistent formatting across formats.
 */
import {
  EXPORT_ROOT_CLASS,
  EXPORT_TURN_CLASS,
  EXPORT_EQUATION_CLASS,
  FONT_FAMILY_STACK,
  DARK_TEXT_COLOR
} from './constants.js';

export const EXPORT_STYLE_BLOCK = `
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
.${EXPORT_ROOT_CLASS} .katex {
  direction: ltr !important;
  unicode-bidi: normal !important;
  text-align: left !important;
}
.${EXPORT_ROOT_CLASS} .katex * {
  direction: ltr !important;
  unicode-bidi: normal !important;
}
.${EXPORT_ROOT_CLASS} .katex-display {
  text-align: center !important;
  margin: 16px auto;
}
.${EXPORT_ROOT_CLASS} .katex-display > .katex {
  text-align: center !important;
}
.${EXPORT_ROOT_CLASS} .katex {
  vertical-align: -0.05em !important;
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
@media print {
  .${EXPORT_ROOT_CLASS} .katex {
    display: inline-flex !important;
    align-items: center;
    vertical-align: -0.05em !important;
  }
  .${EXPORT_ROOT_CLASS} {
    font-kerning: normal !important;
    font-variant-ligatures: common-ligatures contextual !important;
    font-feature-settings: "kern" 1, "liga" 1, "clig" 1, "calt" 1 !important;
    font-variation-settings: "wght" 400 !important;
    font-synthesis: none !important;
    text-rendering: optimizeLegibility !important;
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
  .${EXPORT_ROOT_CLASS} b,
  .${EXPORT_ROOT_CLASS} strong {
    font-weight: 700 !important;
    font-variation-settings: "wght" 700 !important;
    font-synthesis: none !important;
    letter-spacing: 0.05px !important;
  }
}
`;

export const DOCX_EXPORT_STYLE_BLOCK = `
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
.${EXPORT_ROOT_CLASS} .gpt-export-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  color: #5b6078;
}
.${EXPORT_ROOT_CLASS} .gpt-export-metadata__item {
  min-width: 160px;
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}
.${EXPORT_ROOT_CLASS} .gpt-export-metadata__label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 2px;
  color: #1f1f3a;
}
.${EXPORT_ROOT_CLASS} .gpt-export-metadata__value {
  font-size: 0.95rem;
  font-weight: 500;
  color: #111222;
  word-break: break-word;
}
.${EXPORT_ROOT_CLASS} .gpt-export-metadata__value a {
  color: inherit;
  text-decoration: underline;
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
.${EXPORT_ROOT_CLASS} .katex-display {
  text-align: center;
  width: 75%;
  margin: 20px auto 12px;
  padding: 6px 0;
  display: block;
}
.${EXPORT_ROOT_CLASS} .katex-display > .${EXPORT_EQUATION_CLASS} {
  display: block;
  max-width: 100%;
  margin: 0 auto;
  padding: 4px 0;
}
.${EXPORT_ROOT_CLASS} .katex-display + .katex-display {
  margin-top: 28px;
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
  white-space: pre-wrap;
  font-family: "Cambria Math", "Consolas", "Courier New", monospace;
  font-size: 0.95em;
  line-height: 1.25;
}
`;
