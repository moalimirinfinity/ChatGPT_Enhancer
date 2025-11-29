/**
 * Registry and factory method for instantiating the appropriate export generator.
 */
import { exportAsDocx } from './docx.js';
import { exportAsPng } from './png.js';
import { exportAsJson, exportAsCsv, exportAsMarkdown } from './text.js';
import { exportAsPdf } from './pdf.js';

const registry = {
  docx: exportAsDocx,
  png: exportAsPng,
  json: exportAsJson,
  csv: exportAsCsv,
  markdown: exportAsMarkdown,
  pdf: exportAsPdf
};

export function getGenerator(format) {
  return registry[format] || null;
}
