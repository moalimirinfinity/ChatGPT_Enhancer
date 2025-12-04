/**
 * Handles fetching and inlining of external images as Base64 data.
 */
import * as htmlToImage from 'html-to-image';

const INLINE_CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 8000;

export async function inlineImages(root) {
  const images = Array.from(root.querySelectorAll('img')).filter((img) => {
    const src = img.getAttribute('src') || '';
    return src && !src.startsWith('data:');
  });

  await runWithConcurrency(images, INLINE_CONCURRENCY, inlineSingleImage);
}

async function inlineSingleImage(img) {
  const absoluteUrl = img.src;
  if (!absoluteUrl) {
    return;
  }

  // Prefer credentialed fetch to avoid CORS-restricted buckets; fall back to local rasterization
  // for same-origin assets. All failures are swallowed so a single bad image never blocks export.
  try {
    const dataUrl = await fetchImageAsDataUrl(absoluteUrl);
    if (dataUrl) {
      setImageData(img, dataUrl);
      return;
    }
  } catch {
    /* ignore */
  }

  if (isSameOrigin(absoluteUrl)) {
    try {
      const dataUrl = await rasterizeImageElement(img);
      if (dataUrl) {
        setImageData(img, dataUrl);
      }
    } catch {
      /* ignore */
    }
  }
}

function setImageData(img, dataUrl) {
  img.setAttribute('src', dataUrl);
  img.removeAttribute('srcset');
}

function fetchImageAsDataUrl(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { mode: 'cors', credentials: 'include', signal: controller.signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => blobToDataUrl(blob))
    .finally(() => window.clearTimeout(timeout));
}

async function rasterizeImageElement(img) {
  const clone = img.cloneNode(true);
  clone.removeAttribute('srcset');
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  wrapper.style.background = '#ffffff';
  wrapper.appendChild(clone);
  return htmlToImage.toPng(wrapper, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff'
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function runWithConcurrency(items, limit, worker) {
  if (!Array.isArray(items) || !items.length) {
    return Promise.resolve();
  }

  let index = 0;
  const runners = [];

  const next = async () => {
    const current = index;
    index += 1;
    const item = items[current];
    if (!item) {
      return;
    }
    try {
      await worker(item);
    } catch {
      // Fail soft: individual errors should not halt the queue.
    }
    if (index < items.length) {
      await next();
    }
  };

  const bucket = Math.max(1, Math.min(limit || 1, items.length));
  for (let i = 0; i < bucket; i += 1) {
    runners.push(next());
  }
  return Promise.all(runners);
}

function isSameOrigin(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}
