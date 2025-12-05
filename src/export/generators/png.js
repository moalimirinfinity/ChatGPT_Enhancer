/**
 * Logic for rasterizing the conversation into a single long PNG image.
 */
import * as htmlToImage from 'html-to-image';
import { PNG_EXPORT_PIXEL_LIMIT, PNG_EXPORT_MIN_PIXEL_RATIO, PNG_EXPORT_APPROX_PAGE_HEIGHT } from '../constants.js';
import { dataUrlToBlob } from '../utils/blob.js';
import { buildFilename, triggerDownload } from '../utils/download.js';
import { createExportError, wrapHtmlToImageError, renderNodeToPngSafely } from './shared.js';

export async function exportAsPng(stage, root) {
  const originalStageStyles = {
    opacity: stage.style.opacity,
    pointerEvents: stage.style.pointerEvents,
    position: stage.style.position,
    top: stage.style.top,
    left: stage.style.left,
    right: stage.style.right,
    width: stage.style.width,
    maxWidth: stage.style.maxWidth,
    padding: stage.style.padding,
    background: stage.style.background
  };
  const originalRootDisplay = root.style.display;

  const computedRoot = window.getComputedStyle(root);
  const clone = root.cloneNode(true);
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.maxWidth = 'none';
  clone.style.width = 'auto';
  clone.style.boxSizing = computedRoot.boxSizing || 'border-box';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  wrapper.style.background = '#ffffff';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.maxWidth = 'none';
  wrapper.style.paddingTop = computedRoot.paddingTop || '32px';
  wrapper.style.paddingRight = computedRoot.paddingRight || '32px';
  wrapper.style.paddingBottom = computedRoot.paddingBottom || '32px';
  wrapper.style.paddingLeft = computedRoot.paddingLeft || '32px';
  wrapper.style.direction = computedRoot.direction || 'ltr';
  wrapper.appendChild(clone);

  root.style.display = 'none';
  stage.style.opacity = '1';
  stage.style.pointerEvents = 'none';
  stage.style.position = 'static';
  stage.style.top = '';
  stage.style.left = '';
  stage.style.right = '';
  stage.style.width = 'auto';
  stage.style.maxWidth = 'none';
  stage.style.padding = '0';
  stage.style.background = '#ffffff';

  stage.appendChild(wrapper);

  try {
    const images = Array.from(wrapper.querySelectorAll('img'));
    if (images.length > 0) {
      // Wait until each image is decoded so layout measurements include their natural size.
      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }
          return img.decode().catch(() => Promise.resolve());
        })
      );
      // Allow a short pause for layout to settle after decoding finishes.
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const rect = wrapper.getBoundingClientRect();
    const measuredWidth = Math.max(rect.width, wrapper.scrollWidth);
    const measuredHeight = Math.max(rect.height, wrapper.scrollHeight);
    const width = Math.max(1, Math.ceil(measuredWidth));
    const height = Math.max(1, Math.ceil(measuredHeight));

    const pixelArea = width * height;
    if (!Number.isFinite(pixelArea) || pixelArea <= 0) {
      throw createExportError('png-invalid-dimensions', 'Unable to determine export size for image export.', { width, height });
    }

    const basePixelRatio = 2;
    let pixelRatio = basePixelRatio;
    if (pixelArea * pixelRatio * pixelRatio > PNG_EXPORT_PIXEL_LIMIT) {
      const adjustedRatio = Math.sqrt(PNG_EXPORT_PIXEL_LIMIT / pixelArea);
      pixelRatio = Math.max(PNG_EXPORT_MIN_PIXEL_RATIO, Math.min(basePixelRatio, adjustedRatio));
    }

    const estimatedPages = estimatePageCount(height);
    if (pixelArea * pixelRatio * pixelRatio > PNG_EXPORT_PIXEL_LIMIT) {
      const message = `Conversation is too large to export as a single image (estimated ${estimatedPages} pages). Please use PDF or DOCX export instead.`;
      throw createExportError('png-too-large', message, { width, height, pixelRatio, estimatedPages });
    }

    let renderOutcome;
    try {
      renderOutcome = await renderNodeToPngSafely(wrapper, {
        pixelRatio,
        cacheBust: true,
        backgroundColor: '#ffffff',
        width,
        height,
        style: { width: `${width}px`, height: `${height}px`, margin: '0', boxSizing: 'border-box' }
      });
    } catch (error) {
      throw wrapHtmlToImageError(error, { width, height, pixelRatio, estimatedPages, suppressedWarnings: error && error.suppressedHtmlToImageLogs ? error.suppressedHtmlToImageLogs : undefined });
    }

    const blob = dataUrlToBlob(renderOutcome.dataUrl);
    triggerDownload(blob, buildFilename('png'));
  } finally {
    wrapper.remove();
    root.style.display = originalRootDisplay;
    stage.style.opacity = originalStageStyles.opacity;
    stage.style.pointerEvents = originalStageStyles.pointerEvents;
    stage.style.position = originalStageStyles.position;
    stage.style.top = originalStageStyles.top;
    stage.style.left = originalStageStyles.left;
    stage.style.right = originalStageStyles.right;
    stage.style.width = originalStageStyles.width;
    stage.style.maxWidth = originalStageStyles.maxWidth;
    stage.style.padding = originalStageStyles.padding;
    stage.style.background = originalStageStyles.background;
  }
}

function estimatePageCount(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(height / PNG_EXPORT_APPROX_PAGE_HEIGHT));
}
