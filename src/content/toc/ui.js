/**
 * DOM manipulation and rendering logic for the Table of Contents panel.
 */

export function ensurePanel(state, options) {
  if (!document || !document.body) {
    return;
  }
  if (state.panel && state.panel.isConnected) {
    return;
  }
  const { onToggleCollapse, onClick } = options || {};
  const panel = document.createElement('aside');
  panel.id = state.ids.panelId;
  panel.className = 'chatgpt-toc-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Conversation outline');

  const header = document.createElement('div');
  header.className = 'chatgpt-toc-header';
  header.title = 'Drag to reposition the panel';

  const heading = document.createElement('span');
  heading.className = 'chatgpt-toc-heading';
  heading.textContent = 'Table of contents';

  const collapseButton = document.createElement('button');
  collapseButton.type = 'button';
  collapseButton.className = 'chatgpt-toc-collapse';
  collapseButton.setAttribute('aria-label', 'Collapse outline');
  collapseButton.setAttribute('aria-pressed', 'false');
  collapseButton.textContent = '–';
  if (typeof onToggleCollapse === 'function') {
    collapseButton.addEventListener('click', onToggleCollapse);
  }

  const list = document.createElement('ol');
  list.className = 'chatgpt-toc-list';

  header.appendChild(heading);
  header.appendChild(collapseButton);
  panel.appendChild(header);
  panel.appendChild(list);
  if (typeof onClick === 'function') {
    panel.addEventListener('click', onClick);
  }
  document.body.appendChild(panel);

  state.panel = panel;
  state.list = list;
  state.collapseButton = collapseButton;
  state.heading = heading;
  state.anchorCounter = 0;
  state.listeners = {
    onToggleCollapse,
    onClick
  };
}

export function teardownPanel(state) {
  if (state.panel && state.listeners?.onClick) {
    state.panel.removeEventListener('click', state.listeners.onClick);
  }
  if (state.collapseButton && state.listeners?.onToggleCollapse) {
    state.collapseButton.removeEventListener('click', state.listeners.onToggleCollapse);
  }
  if (state.panel && state.panel.parentNode) {
    state.panel.parentNode.removeChild(state.panel);
  }
  state.panel = null;
  state.list = null;
  state.collapseButton = null;
  state.heading = null;
  state.listeners = null;
}

export function rebuildList(state, assistantMessages, helpers) {
  if (!state.list) {
    return;
  }
  const { ensureMessageAnchorId, deriveTitle, getAnchorTarget } = helpers || {};
  const messages = Array.isArray(assistantMessages) ? assistantMessages : [];
  if (!messages.length) {
    if (!state.list.querySelector('.chatgpt-toc-empty')) {
      const empty = document.createElement('li');
      empty.className = 'chatgpt-toc-empty';
      empty.textContent = 'No assistant replies yet.';
      state.list.replaceChildren(empty);
    }
    return;
  }

  const emptyNode = state.list.querySelector('.chatgpt-toc-empty');
  if (emptyNode) {
    emptyNode.remove();
  }

  const existingItems = Array.from(state.list.querySelectorAll('.chatgpt-toc-item'));
  for (let i = existingItems.length - 1; i >= messages.length; i -= 1) {
    existingItems[i].remove();
  }

  const fragment = document.createDocumentFragment();
  for (let i = existingItems.length; i < messages.length; i += 1) {
    const item = document.createElement('li');
    item.className = 'chatgpt-toc-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chatgpt-toc-entry';
    item.appendChild(button);
    fragment.appendChild(item);
  }
  if (fragment.childNodes.length) {
    state.list.appendChild(fragment);
  }

  const items = Array.from(state.list.querySelectorAll('.chatgpt-toc-item'));
  items.forEach((item, index) => {
    const message = messages[index];
    if (!message) {
      return;
    }
    const button = item.querySelector('.chatgpt-toc-entry');
    if (!button) {
      return;
    }
    const target = getAnchorTarget ? getAnchorTarget(message) : message;
    const anchorId =
      ensureMessageAnchorId && target instanceof HTMLElement ? ensureMessageAnchorId(target) : '';
    if (anchorId) {
      button.dataset.tocTarget = anchorId;
    } else {
      delete button.dataset.tocTarget;
    }
    button.dataset.tocIndex = String(index);
    const title = deriveTitle ? deriveTitle(message, index) : '';
    if (button.dataset.tocTitle !== title) {
      button.textContent = title;
      button.dataset.tocTitle = title;
    }
  });
}

export function updateCollapseButton(state, collapsed) {
  if (!state.collapseButton) {
    return;
  }
  state.collapseButton.setAttribute('aria-pressed', String(collapsed));
  state.collapseButton.setAttribute('aria-label', collapsed ? 'Expand outline' : 'Collapse outline');
  state.collapseButton.textContent = collapsed ? '+' : '–';
  state.collapseButton.dir = 'ltr';
}
