/**
 * Handles fetching and inlining of external images as Base64 data.
 */
import * as htmlToImage from 'html-to-image';

export async function inlineImages(root) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) {
        return;
      }

      try {
        const absoluteUrl = img.src;
        const response = await fetch(absoluteUrl, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        img.setAttribute('src', dataUrl);
        img.removeAttribute('srcset');
      } catch (error) {
        try {
          const dataUrl = await htmlToImage.toPng(img, {
            pixelRatio: 2,
            cacheBust: true,
            backgroundColor: '#ffffff'
          });
          img.setAttribute('src', dataUrl);
          img.removeAttribute('srcset');
        } catch (fallbackError) {
          /* ignore */
        }
      }
    })
  );
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
