/**
 * Generators for text-based formats including Markdown, JSON, and CSV.
 */
import { serializeExportRootToJson, buildCsvRows, formatCsvRow, serializeExportRootToMarkdown } from '../utils/serialization.js';
import { triggerDownload, buildFilename } from '../utils/download.js';

export async function exportAsJson(root) {
  const payload = serializeExportRootToJson(root);
  const content = JSON.stringify(payload, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, buildFilename('json'));
}

export function exportAsCsv(root) {
  const payload = serializeExportRootToJson(root);
  const rows = buildCsvRows(payload);
  const csv = rows.map(formatCsvRow).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, buildFilename('csv'));
}

export function exportAsMarkdown(root) {
  const markdown = serializeExportRootToMarkdown(root);
  const content = markdown.endsWith('\n') ? markdown : `${markdown}\n`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, buildFilename('md'));
}
