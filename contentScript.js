// Apply LTR direction to KaTeX formulas and code blocks under the given node.
function fixDirection(node) {
  const katexElements = node.querySelectorAll('.katex, .katex-display');
  katexElements.forEach((el) => {
    el.style.direction = 'ltr';
    el.style.unicodeBidi = 'isolate';
  });

  const codeElements = node.querySelectorAll('pre code, code');
  codeElements.forEach((el) => {
    el.style.direction = 'ltr';
    el.style.unicodeBidi = 'isolate';
  });

  const tables = node.querySelectorAll('table');
  tables.forEach((el) => {
    el.style.direction = 'ltr';
  });
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((added) => {
      if (added.nodeType === Node.ELEMENT_NODE) {
        fixDirection(added);
      }
    });
  });
});

const start = () => {
  const chatContainer = document.querySelector('main');
  if (!chatContainer) {
    return false;
  }

  observer.observe(chatContainer, { childList: true, subtree: true });
  fixDirection(chatContainer);
  return true;
};

if (!start()) {
  const retryInterval = setInterval(() => {
    if (start()) {
      clearInterval(retryInterval);
    }
  }, 500);
}
