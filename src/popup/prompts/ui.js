/**
 * Renders prompt cards and manages DOM updates for the prompt library.
 */
const PROMPT_ACTION_LABELS = {
  copy: 'Copy prompt',
  edit: 'Edit prompt',
  delete: 'Delete prompt'
};

const PROMPT_ACTION_ICONS = {
  copy: `
    <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path>
    </svg>
  `,
  edit: `
    <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487a2.15 2.15 0 0 1 3.041 3.041L9.03 17.401 4.5 18.5 5.599 13.97 16.862 3.487z"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M15.5 5l3.5 3.5"></path>
    </svg>
  `,
  delete: `
    <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M10 11v6"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M14 11v6"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z"></path>
    </svg>
  `
};

const PROMPT_COPY_SUCCESS_ICON = `
  <svg class="prompt-card__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"></path>
  </svg>
`;

export function buildPromptCard(prompt, handlers = {}, { disableDrag, titleMaxLength = 80 } = {}) {
  const { onDragStart, onDragEnd, onHandleKeyDown } = handlers;
  const card = document.createElement('li');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;
  card.setAttribute('role', 'listitem');

  card.addEventListener('mouseleave', () => {
    card.classList.remove('is-active');
  });

  const front = document.createElement('div');
  front.className = 'prompt-card__front';

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'prompt-card__handle';
  handle.draggable = !disableDrag;
  handle.classList.toggle('prompt-card__handle--disabled', Boolean(disableDrag));
  handle.setAttribute('aria-label', `Reorder prompt "${getPromptDisplayTitle(prompt, titleMaxLength)}"`);
  const handleIcon = document.createElement('span');
  handleIcon.setAttribute('aria-hidden', 'true');
  handleIcon.textContent = '⋮⋮';
  handle.appendChild(handleIcon);
  if (typeof onDragStart === 'function') {
    handle.addEventListener('dragstart', onDragStart);
  }
  if (typeof onDragEnd === 'function') {
    handle.addEventListener('dragend', onDragEnd);
  }
  if (typeof onHandleKeyDown === 'function') {
    handle.addEventListener('keydown', onHandleKeyDown);
  }

  const title = document.createElement('h3');
  title.className = 'prompt-card__title';
  title.textContent = getPromptDisplayTitle(prompt, titleMaxLength);

  const header = document.createElement('div');
  header.className = 'prompt-card__header';
  header.appendChild(handle);
  header.appendChild(title);

  const copyAction = buildPromptActionButton('copy');
  const editAction = buildPromptActionButton('edit');
  const deleteAction = buildPromptActionButton('delete');
  const actions = document.createElement('div');
  actions.className = 'prompt-card__actions';
  actions.appendChild(copyAction);
  actions.appendChild(editAction);
  actions.appendChild(deleteAction);

  front.appendChild(header);
  front.appendChild(actions);

  const back = document.createElement('div');
  back.className = 'prompt-card__back';
  const backTitle = document.createElement('h4');
  backTitle.className = 'prompt-card__back-title';
  backTitle.textContent = 'Prompt Preview';

  const backText = document.createElement('p');
  backText.className = 'prompt-card__text';
  backText.textContent = prompt.text || 'This prompt is empty.';

  back.appendChild(backTitle);
  back.appendChild(backText);

  card.appendChild(front);
  card.appendChild(back);
  front.title = `Prompt: "${getPromptDisplayTitle(prompt, titleMaxLength)}"`;
  return card;
}

function buildPromptActionButton(action) {
  const label = PROMPT_ACTION_LABELS[action] || action;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prompt-card__action';
  button.classList.add(`prompt-card__action--${action}`);
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.innerHTML = `${getPromptActionIcon(action)}<span class="visually-hidden">${label}</span>`;
  button.dataset.originalMarkup = button.innerHTML;
  button.dataset.originalAriaLabel = label;
  return button;
}

function getPromptActionIcon(action) {
  return PROMPT_ACTION_ICONS[action] || '';
}

export function getPromptCopySuccessMarkup() {
  return PROMPT_COPY_SUCCESS_ICON;
}

export function restorePromptActionButton(button) {
  if (!(button instanceof HTMLElement)) {
    return;
  }
  const action = button.dataset.action;
  const label = button.dataset.originalAriaLabel || PROMPT_ACTION_LABELS[action] || 'Prompt action';
  const markup =
    button.dataset.originalMarkup ||
    `${getPromptActionIcon(action)}<span class="visually-hidden">${label}</span>`;
  button.innerHTML = markup;
  button.dataset.originalMarkup = markup;
  button.setAttribute('aria-label', label);
  button.disabled = false;
  button.classList.remove('is-copied');
}

export function getPromptDisplayTitle(prompt, maxLength = 80) {
  const title = typeof prompt.title === 'string' ? prompt.title.trim() : '';
  if (title) {
    return title;
  }
  const text = typeof prompt.text === 'string' ? prompt.text.trim() : '';
  if (!text) {
    return 'Untitled prompt';
  }
  return truncateText(text, maxLength);
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  const sliceLength = Math.max(1, maxLength - 1);
  return `${text.slice(0, sliceLength).trimEnd()}…`;
}

export function updatePromptsEmptyState(controls, prompts, options) {
  const {
    isFiltered,
    emptyDefaultPrimary,
    emptyDefaultSecondary,
    emptyFilteredPrimary,
    emptyFilteredSecondary,
    onRequireExpand
  } = options || {};
  const collection = Array.isArray(prompts) ? prompts : [];
  const hasPrompts = collection.length > 0;

  if (controls.promptsEmpty) {
    controls.promptsEmpty.hidden = hasPrompts;
  }
  if (controls.promptList) {
    controls.promptList.setAttribute('data-has-items', String(hasPrompts));
  }
  if (!hasPrompts && controls.promptsEmptyPrimary && controls.promptsEmptySecondary) {
    if (isFiltered) {
      controls.promptsEmptyPrimary.textContent = emptyFilteredPrimary || '';
      controls.promptsEmptySecondary.textContent = emptyFilteredSecondary || '';
    } else {
      controls.promptsEmptyPrimary.textContent = emptyDefaultPrimary || '';
      controls.promptsEmptySecondary.textContent = emptyDefaultSecondary || '';
      if (typeof onRequireExpand === 'function') {
        onRequireExpand();
      }
    }
  }
}

export function setAccordionExpanded(header, content, expanded) {
  if (!header || !content) {
    return;
  }
  header.setAttribute('aria-expanded', String(expanded));
  content.classList.toggle('is-open', expanded);
  if (expanded) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        header.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    });
  }
}

export function showPromptError(controls, message) {
  if (!controls.promptError) {
    return;
  }
  controls.promptError.textContent = message;
  controls.promptError.hidden = false;
}

export function clearPromptError(controls) {
  if (!controls.promptError) {
    return;
  }
  controls.promptError.hidden = true;
  controls.promptError.textContent = '';
}

export function autoResizeTextarea(element) {
  if (!element) {
    return;
  }
  element.style.height = 'auto';
  const computed = window.getComputedStyle(element);
  const minHeight = parseInt(computed.minHeight, 10) || 0;
  const nextHeight = Math.max(element.scrollHeight + 2, minHeight);
  element.style.height = `${nextHeight}px`;
}

export function updatePromptCharCount(controls, maxLength) {
  if (!controls.promptTextInput || !controls.promptCharCount) {
    return;
  }
  const len = controls.promptTextInput.value.length;
  controls.promptCharCount.textContent = `${len} / ${maxLength}`;

  const isOverLimit = len > maxLength;
  controls.promptCharCount.classList.toggle('is-over-limit', isOverLimit);
  controls.promptTextInput.classList.toggle('is-over-limit', isOverLimit);

  if (controls.promptSubmitButton) {
    controls.promptSubmitButton.disabled = isOverLimit;
  }
}

export function generatePromptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizePromptCollection(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set();
  const normalized = [];

  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const text = typeof entry.text === 'string' ? entry.text.trim() : '';
    if (!text) {
      return;
    }
    let id = typeof entry.id === 'string' && entry.id ? entry.id : generatePromptId();
    while (seenIds.has(id)) {
      id = generatePromptId();
    }
    seenIds.add(id);
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    const createdAt = Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now();
    const updatedAt = Number.isFinite(entry.updatedAt) ? entry.updatedAt : createdAt;
    normalized.push({
      id,
      title,
      text,
      createdAt,
      updatedAt
    });
  });

  return normalized;
}

export function initPromptUI(controls, promptController, options) {
  const {
    promptTextMaxLength,
    setActivePanelView,
    promptFormAccordionHeader,
    promptFormSection
  } = options || {};

  const handlePromptSearch = (event) => {
    const value = event?.target?.value || '';
    promptController.handlePromptSearch(value.toLowerCase().trim());
  };

  const enterPromptEditMode = (prompt) => {
    if (!prompt || !controls.promptForm) {
      return;
    }
    promptController.setEditingPromptId?.(prompt.id);
    controls.promptForm.classList.add('prompt-form--editing');
    if (controls.promptNameInput) {
      controls.promptNameInput.value = prompt.title || '';
    }
    if (controls.promptTextInput) {
      controls.promptTextInput.value = prompt.text || '';
      autoResizeTextarea(controls.promptTextInput);
    }
    if (controls.promptCancelButton) {
      controls.promptCancelButton.hidden = false;
    }
    if (controls.promptSubmitButton) {
      controls.promptSubmitButton.textContent = 'Save changes';
    }
    if (controls.promptNameInput) {
      controls.promptNameInput.focus();
    }
    updatePromptCharCount(controls, promptTextMaxLength);
  };

  const exitPromptEditMode = () => {
    promptController.setEditingPromptId?.(null);
    if (controls.promptForm) {
      controls.promptForm.classList.remove('prompt-form--editing');
      controls.promptForm.reset();
    }
    if (controls.promptNameInput) {
      controls.promptNameInput.value = '';
    }
    if (controls.promptTextInput) {
      controls.promptTextInput.value = '';
      autoResizeTextarea(controls.promptTextInput);
    }
    if (controls.promptCancelButton) {
      controls.promptCancelButton.hidden = true;
    }
    if (controls.promptSubmitButton) {
      controls.promptSubmitButton.textContent = 'Save prompt';
      controls.promptSubmitButton.disabled = false;
    }
    updatePromptCharCount(controls, promptTextMaxLength);
  };

  const handlePromptFormSubmit = async (event) => {
    event.preventDefault();
    if (!controls.promptTextInput) {
      return;
    }
    const title = controls.promptNameInput ? controls.promptNameInput.value.trim() : '';
    const text = controls.promptTextInput.value.trim();
    if (!text) {
      showPromptError(controls, 'Prompt text cannot be empty.');
      controls.promptTextInput.focus();
      return;
    }
    if (promptTextMaxLength && text.length > promptTextMaxLength) {
      showPromptError(
        controls,
        `Error: Prompt is too long. Please shorten it to ${promptTextMaxLength} characters or less.`
      );
      controls.promptTextInput.focus();
      return;
    }
    clearPromptError(controls);
    const result = await promptController.handlePromptFormSubmit({ title, text });
    if (!result?.ok) {
      if (result?.reason === 'missing') {
        showPromptError(controls, 'That prompt no longer exists. We refreshed your list.');
        exitPromptEditMode();
        await promptController.loadPromptsFromStorage();
        if (controls.promptTextInput) {
          controls.promptTextInput.focus();
          autoResizeTextarea(controls.promptTextInput);
        }
        return;
      }
      showPromptError(controls, 'Unable to save your prompt. Please try again.');
      return;
    }
    exitPromptEditMode();
    if (controls.promptTextInput) {
      controls.promptTextInput.focus();
      autoResizeTextarea(controls.promptTextInput);
    }
  };

  if (controls.promptForm) {
    controls.promptForm.addEventListener('submit', handlePromptFormSubmit);
  }
  if (controls.promptCancelButton) {
    controls.promptCancelButton.addEventListener('click', () => {
      exitPromptEditMode();
      clearPromptError(controls);
      if (controls.promptTextInput) {
        controls.promptTextInput.focus();
      }
    });
  }
  if (controls.promptList) {
    controls.promptList.addEventListener('click', (event) =>
      promptController.handlePromptListClick(event, {
        onEdit: (prompt) => {
          setActivePanelView('prompts');
          if (promptFormAccordionHeader && promptFormSection) {
            setAccordionExpanded(promptFormAccordionHeader, promptFormSection, true);
          }
          enterPromptEditMode(prompt);
        },
        onDelete: (id) => {
          if (promptController.editingPromptId === id) {
            exitPromptEditMode();
          }
        },
        confirmFn: window.confirm
      })
    );
    controls.promptList.addEventListener('click', promptController.handlePromptCardClick);
    controls.promptList.addEventListener('dragover', promptController.handlePromptDragOver);
    controls.promptList.addEventListener('drop', promptController.handlePromptDrop);
  }

  if (controls.promptSearch) {
    controls.promptSearch.addEventListener('input', handlePromptSearch);
  }

  if (controls.promptTextInput) {
    const updateInputState = () => {
      autoResizeTextarea(controls.promptTextInput);
      updatePromptCharCount(controls, promptTextMaxLength);
    };
    controls.promptTextInput.addEventListener('input', updateInputState);
    updateInputState();
  }

  if (promptFormAccordionHeader && promptFormSection) {
    setAccordionExpanded(promptFormAccordionHeader, promptFormSection, false);
  }

  exitPromptEditMode();
  promptController.loadPromptsFromStorage();
}

export function updatePromptsCount(controls, prompts) {
  const count = Array.isArray(prompts) ? prompts.length : 0;
  if (controls.promptsCount) {
    controls.promptsCount.textContent = String(count);
  }
  if (controls.promptsCountLabel) {
    controls.promptsCountLabel.textContent = count === 1 ? 'prompt' : 'prompts';
  }
}
