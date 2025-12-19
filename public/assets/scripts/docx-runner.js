(() => {
  const REQUEST_EVENT = 'GPT_ENHANCER_DOCX_REQUEST';
  const RESULT_EVENT = 'GPT_ENHANCER_DOCX_RESULT';
  const FLAG = '__GPT_ENHANCER_DOCX_RUNNER__';

  if (window[FLAG]) {
    return;
  }
  window[FLAG] = true;

  const waitForHtmlDocx = () =>
    new Promise((resolve) => {
      if (window.htmlDocx) {
        resolve(window.htmlDocx);
        return;
      }
      const interval = window.setInterval(() => {
        if (window.htmlDocx) {
          window.clearInterval(interval);
          resolve(window.htmlDocx);
        }
      }, 50);
    });

  const triggerDownload = (blob, filename) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 0);
  };

  const dispatchResult = (detail) => {
    document.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail }));
  };

  const handleRequest = async (event) => {
    const detail = event?.detail || {};
    const { requestId, html, filename } = detail;
    if (!requestId || !html || !filename) {
      dispatchResult({ requestId, ok: false, error: 'Invalid DOCX request payload' });
      return;
    }
    try {
      const htmlDocx = await waitForHtmlDocx();
      if (!htmlDocx) {
        throw new Error('htmlDocx library not available');
      }
      const blob = htmlDocx.asBlob(html);
      triggerDownload(blob, filename);
      dispatchResult({ requestId, ok: true });
    } catch (error) {
      dispatchResult({ requestId, ok: false, error: error?.message || 'DOCX export failed' });
    }
  };

  document.addEventListener(REQUEST_EVENT, handleRequest);
})();
