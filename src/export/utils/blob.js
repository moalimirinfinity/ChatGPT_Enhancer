export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid data URL');
  }
  const meta = parts[0];
  const base64 = parts[1];
  const mimeMatch = meta.match(/data:([^;]+)(;base64)?/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const isBase64 = Boolean(mimeMatch && mimeMatch[2]);

  if (!isBase64) {
    const decoded = decodeURIComponent(base64);
    return new Blob([decoded], { type: mimeType });
  }

  const binary = atob(base64);
  const length = binary.length;
  const buffer = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    buffer[index] = binary.charCodeAt(index);
  }
  return new Blob([buffer], { type: mimeType });
}
