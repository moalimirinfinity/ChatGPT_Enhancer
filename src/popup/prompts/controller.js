/**
 * Business logic for managing prompt CRUD operations, filtering, and drag-and-drop.
 */
import { loadPrompts, savePromptsWithMerge } from './manager.js';
import {
  buildPromptCard,
  getPromptCopySuccessMarkup,
  restorePromptActionButton,
  updatePromptsEmptyState,
  updatePromptsCount
} from './ui.js';

export function createPromptController(deps) {
  const {
    controls,
    normalizePromptCollection,
    generatePromptId,
    PROMPT_TEXT_MAX_LENGTH,
    PROMPTS_EMPTY_DEFAULT_PRIMARY,
    PROMPTS_EMPTY_DEFAULT_SECONDARY,
    PROMPTS_EMPTY_FILTERED_PRIMARY,
    PROMPTS_EMPTY_FILTERED_SECONDARY,
    setAccordionExpanded,
    promptSearchQueryRef,
    promptCopyTimers,
    showPromptError,
    clearPromptError,
    setPromptsCountLabel,
    focusPromptHandle
  } = deps;

  let prompts = [];
  let editingPromptId = null;
  let promptSearchQuery = '';
  let promptDragState = null;
  let promptDragReordered = false;
  let promptsRevision = 0;

  function setDragState(state) {
    promptDragState = state;
    promptDragReordered = false;
  }

  function clearDragState() {
    promptDragState = null;
    promptDragReordered = false;
  }

  function setDragReordered(value) {
    promptDragReordered = Boolean(value);
  }

  function setPrompts(next) {
    prompts = Array.isArray(next) ? next : [];
  }

  function setPromptSearchQuery(value) {
    promptSearchQuery = value;
    if (promptSearchQueryRef) {
      promptSearchQueryRef.value = promptSearchQuery;
    }
  }

  function getFilteredPrompts() {
    const query = promptSearchQuery;
    if (!query) {
      return prompts;
    }
    const loweredQuery = query.toLowerCase();
    return prompts.filter((prompt) => {
      const title = typeof prompt.title === 'string' ? prompt.title.toLowerCase() : '';
      const text = typeof prompt.text === 'string' ? prompt.text.toLowerCase() : '';
      return title.includes(loweredQuery) || text.includes(loweredQuery);
    });
  }

  function getPromptById(id) {
    return prompts.find((prompt) => prompt && prompt.id === id);
  }

  function renderPrompts(promptsToRender = prompts, options = {}) {
    if (!controls.promptList) {
      return;
    }

    const list = Array.isArray(promptsToRender) ? promptsToRender : [];
    const isFiltered = Boolean(promptSearchQuery);

    promptCopyTimers.forEach((timer, button) => {
      clearTimeout(timer);
      if (button && button instanceof HTMLElement) {
        restorePromptActionButton(button);
      }
    });
    promptCopyTimers.clear();

    const fragment = document.createDocumentFragment();
    list.forEach((prompt) => {
      const card = buildPromptCard(
        prompt,
        {
          onDragStart: handlePromptDragStart,
          onDragEnd: handlePromptDragEnd,
          onHandleKeyDown: handlePromptHandleKeyDown
        },
        { disableDrag: isFiltered, titleMaxLength: 80 }
      );
      fragment.appendChild(card);
    });

    controls.promptList.replaceChildren(fragment);
    controls.promptList.setAttribute('data-filtered', String(isFiltered));
    updatePromptsEmptyState(controls, list, {
      isFiltered,
      emptyDefaultPrimary: PROMPTS_EMPTY_DEFAULT_PRIMARY,
      emptyDefaultSecondary: PROMPTS_EMPTY_DEFAULT_SECONDARY,
      emptyFilteredPrimary: PROMPTS_EMPTY_FILTERED_PRIMARY,
      emptyFilteredSecondary: PROMPTS_EMPTY_FILTERED_SECONDARY,
      onRequireExpand: () => {
        if (controls.promptFormAccordionHeader && controls.promptFormSection) {
          setAccordionExpanded(controls.promptFormAccordionHeader, controls.promptFormSection, true);
        }
      }
    });
    updatePromptsCount(controls, prompts);
    if (typeof setPromptsCountLabel === 'function') {
      setPromptsCountLabel(prompts.length);
    }

    if (options.scrollToTop && controls.promptListContainer) {
      controls.promptListContainer.scrollTop = 0;
    }

    if (options.focusId) {
      window.requestAnimationFrame(() => {
        focusPromptHandle(options.focusId);
      });
    }
  }

  function renderPromptsWithCurrentFilter(options = {}) {
    renderPrompts(getFilteredPrompts(), options);
  }

  function synchronizePromptsFromStorage(value) {
    if (value && value.revision !== undefined) {
      promptsRevision = Number(value.revision) || promptsRevision;
    }
    prompts = normalizePromptCollection(value && value.prompts ? value.prompts : value);
    renderPromptsWithCurrentFilter({ scrollToTop: true });
  }

  async function persistPrompts(nextPrompts) {
    const payload = nextPrompts.map((prompt) => ({
      id: prompt.id,
      title: typeof prompt.title === 'string' ? prompt.title : '',
      text: typeof prompt.text === 'string' ? prompt.text : '',
      createdAt: Number.isFinite(prompt.createdAt) ? prompt.createdAt : Date.now(),
      updatedAt: Number.isFinite(prompt.updatedAt) ? prompt.updatedAt : Date.now()
    }));

    const result = await savePromptsWithMerge(payload, promptsRevision);
    promptsRevision = Number.isFinite(result?.revision) ? result.revision : promptsRevision;
    return result;
  }

  function handlePersistFailure(error, fallbackMessage) {
    const isQuota = error && (error.code === 'PROMPTS_QUOTA_EXCEEDED' || error.message?.toLowerCase().includes('quota'));
    if (isQuota) {
      showPromptError('Unable to save changes because storage is full. Delete or shorten prompts and try again.');
    } else {
      showPromptError(fallbackMessage || 'Unable to save changes. Please try again.');
    }
    loadPromptsFromStorage();
    return { ok: false, error };
  }

  async function loadPromptsFromStorage() {
    try {
      const stored = await loadPrompts();
      promptsRevision = Number.isFinite(stored?.revision) ? stored.revision : 0;
      prompts = normalizePromptCollection(stored?.prompts || []);
      renderPromptsWithCurrentFilter({ scrollToTop: true });
      clearPromptError();
    } catch {
      showPromptError('Unable to load prompts from storage.');
      prompts = [];
      renderPromptsWithCurrentFilter({ scrollToTop: true });
    }
  }

  async function handlePromptFormSubmit({ title, text }) {
    const now = Date.now();
    let nextPrompts;
    let focusId;
    if (editingPromptId) {
      const index = prompts.findIndex((item) => item.id === editingPromptId);
      if (index === -1) {
        editingPromptId = null;
        return { ok: false, reason: 'missing' };
      }
      const updatedPrompt = {
        ...prompts[index],
        title,
        text,
        updatedAt: now
      };
      nextPrompts = prompts.slice();
      nextPrompts[index] = updatedPrompt;
      focusId = updatedPrompt.id;
    } else {
      const newPrompt = {
        id: generatePromptId(),
        title,
        text,
        createdAt: now,
        updatedAt: now
      };
      nextPrompts = [newPrompt, ...prompts];
      focusId = newPrompt.id;
    }
    prompts = nextPrompts;
    const renderOptions = { focusId };
    renderPromptsWithCurrentFilter(renderOptions);
    try {
      const result = await persistPrompts(nextPrompts);
      if (result?.prompts) {
        prompts = normalizePromptCollection(result.prompts);
        renderPromptsWithCurrentFilter(renderOptions);
      }
      clearPromptError();
      return { ok: true, prompts };
    } catch (error) {
      return handlePersistFailure(error, 'Unable to save your prompt. Please try again.');
    }
  }

  function handlePromptSearch(value) {
    promptSearchQuery = value.toLowerCase().trim();
    renderPromptsWithCurrentFilter({ scrollToTop: true });
    clearPromptError();
  }

  function writeTextToClipboard(text) {
    if (!text) {
      return Promise.resolve();
    }
    if (navigator?.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!successful) {
          reject(new Error('execCommand failed'));
          return;
        }
        resolve();
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function showCopyFeedback(button) {
    if (!button) {
      return;
    }
    if (promptCopyTimers.has(button)) {
      clearTimeout(promptCopyTimers.get(button));
    }
    if (!button.dataset.originalMarkup) {
      button.dataset.originalMarkup = button.innerHTML;
    }
    if (!button.dataset.originalAriaLabel) {
      const action = button.dataset.action;
      const defaultLabel = action === 'copy' ? 'Copy prompt' : 'Prompt action';
      button.dataset.originalAriaLabel = defaultLabel;
    }
    button.disabled = true;
    button.classList.add('is-copied');
    button.setAttribute('aria-label', 'Copied!');
    button.innerHTML = `${getPromptCopySuccessMarkup()}<span class="visually-hidden">Copied!</span>`;
    const timer = window.setTimeout(() => {
      restorePromptActionButton(button);
      promptCopyTimers.delete(button);
    }, 1600);
    promptCopyTimers.set(button, timer);
  }

  async function copyPromptToClipboard(promptId, button) {
    const prompt = getPromptById(promptId);
    if (!prompt || typeof prompt.text !== 'string' || !prompt.text.trim()) {
      showPromptError('This prompt is empty and cannot be copied.');
      return { ok: false };
    }
    try {
      await writeTextToClipboard(prompt.text);
      showCopyFeedback(button);
      clearPromptError();
      return { ok: true };
    } catch (error) {
      showPromptError('Unable to copy prompt to clipboard.');
      return { ok: false, error };
    }
  }

  function handlePromptCardClick(event) {
    if (
      event.target.closest('.prompt-card__action') ||
      event.target.closest('.prompt-card__handle')
    ) {
      return;
    }
    const card = event.target.closest('.prompt-card');
    if (card) {
      card.classList.toggle('is-active');
    }
  }

  function handlePromptListClick(event, hooks = {}) {
    const target = event.target instanceof Element ? event.target.closest('.prompt-card__action') : null;
    if (!target) {
      return;
    }
    const card = target.closest('.prompt-card');
    if (!card) {
      return;
    }
    if (card.classList.contains('is-active')) {
      card.classList.remove('is-active');
    }
    const promptId = card.dataset.id;
    if (!promptId) {
      return;
    }
    const prompt = getPromptById(promptId);
    if (!prompt) {
      showPromptError('Selected prompt could not be found.');
      return;
    }
    switch (target.dataset.action) {
      case 'copy':
        copyPromptToClipboard(promptId, target);
        break;
      case 'edit':
        if (typeof hooks.onEdit === 'function') {
          hooks.onEdit(prompt);
        }
        break;
      case 'delete':
        confirmPromptDeletion(promptId, hooks.confirmFn).then((result) => {
          if (result?.ok && typeof hooks.onDelete === 'function') {
            hooks.onDelete(promptId);
          }
        });
        break;
      default:
        break;
    }
  }

  function confirmPromptDeletion(promptId, confirmFn = window.confirm) {
    const current = prompts || [];
    const prompt = current.find((item) => item.id === promptId);
    if (!prompt) {
      showPromptError('Prompt not found.');
      return Promise.resolve({ ok: false });
    }
    const shouldDelete = typeof confirmFn === 'function' ? confirmFn('Delete this prompt? This action cannot be undone.') : true;
    if (!shouldDelete) {
      return Promise.resolve({ ok: false });
    }
    const result = deletePromptById(promptId);
    setPrompts(result.prompts);
    renderPromptsWithCurrentFilter();
    return persistPrompts(result.prompts)
      .then(() => {
        clearPromptError();
        return { ok: true, deletedId: promptId };
      })
      .catch((error) => handlePersistFailure(error, 'Unable to delete the prompt. Please try again.'));
  }

  function handlePromptDragStart(event) {
    if (promptSearchQuery) {
      showPromptError('Clear the search to reorder prompts.');
      event.preventDefault();
      return;
    }
    const handle = event.currentTarget;
    if (!(handle instanceof HTMLElement)) {
      return;
    }
    const card = handle.closest('.prompt-card');
    if (!card) {
      event.preventDefault();
      return;
    }
    const promptId = card.dataset.id;
    if (!promptId) {
      event.preventDefault();
      return;
    }
    const dragState = {
      id: promptId,
      card,
      reordered: false
    };
    setDragState(dragState);
    card.classList.add('prompt-card--dragging');
    if (event.dataTransfer) {
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', promptId);
        event.dataTransfer.setDragImage(card, card.offsetWidth / 2, card.offsetHeight / 2);
      } catch (error) {
        // Ignore drag image issues.
      }
    }
  }

  function handlePromptDragEnd() {
    const dragState = promptDragState;
    if (!dragState) {
      return;
    }
    const { card, reordered, id } = dragState;
    if (card) {
      card.classList.remove('prompt-card--dragging');
    }
    clearDragState();
    if (!reordered) {
      renderPromptsWithCurrentFilter({ focusId: id });
    }
  }

  function handlePromptDragOver(event) {
    if (promptSearchQuery) {
      event.preventDefault();
      return;
    }
    if (!promptDragState || !controls.promptList) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const draggingCard = promptDragState.card;
    if (!draggingCard) {
      return;
    }
    const targetCard = event.target instanceof Element ? event.target.closest('.prompt-card') : null;
    if (!targetCard || targetCard === draggingCard) {
      if (!targetCard) {
        controls.promptList.appendChild(draggingCard);
      }
      return;
    }
    const targetRect = targetCard.getBoundingClientRect();
    const shouldInsertAfter = event.clientY > targetRect.top + targetRect.height / 2;
    if (shouldInsertAfter) {
      if (targetCard.nextSibling !== draggingCard) {
        controls.promptList.insertBefore(draggingCard, targetCard.nextSibling);
      }
    } else if (targetCard !== draggingCard.nextSibling) {
      controls.promptList.insertBefore(draggingCard, targetCard);
    }
  }

  function handlePromptDrop(event) {
    if (promptSearchQuery) {
      event.preventDefault();
      return;
    }
    if (!promptDragState) {
      return;
    }
    event.preventDefault();
    applyPromptOrderFromDom({ focusId: promptDragState.id });
  }

  async function applyPromptOrderFromDom(options = {}) {
    if (promptSearchQuery) {
      renderPromptsWithCurrentFilter();
      showPromptError('Clear the search to reorder prompts.');
      return { ok: false, reason: 'search-active' };
    }
    if (!controls.promptList) {
      return { ok: false, reason: 'no-list' };
    }
    const orderedCards = Array.from(controls.promptList.querySelectorAll('.prompt-card'));
    if (!orderedCards.length) {
      renderPromptsWithCurrentFilter();
      showPromptError('Unable to read the current prompt order. Please try again.');
      return { ok: false, reason: 'no-cards' };
    }

    const orderedIds = orderedCards.map((card) => card.dataset.id).filter(Boolean);
    if (!orderedIds.length) {
      renderPromptsWithCurrentFilter();
      if (promptDragState) {
        setDragReordered(true);
      }
      return { ok: false, reason: 'no-ids' };
    }

    const currentList = prompts || [];
    const currentMap = new Map(currentList.map((prompt) => [prompt.id, prompt]));
    const next = [];
    let changed = false;

    orderedIds.forEach((id, index) => {
      const prompt = currentMap.get(id);
      if (!prompt) {
        return;
      }
      next.push(prompt);
      if (!changed && currentList[index] !== prompt) {
        changed = true;
      }
    });

    if (next.length !== currentList.length || !changed) {
      renderPromptsWithCurrentFilter({
        focusId: options.focusId || (promptDragState ? promptDragState.id : null)
      });
      if (promptDragState) {
        setDragReordered(true);
      }
      return { ok: false, reason: 'unchanged' };
    }

    setPrompts(next);
    renderPromptsWithCurrentFilter({
      focusId: options.focusId || (promptDragState ? promptDragState.id : null)
    });
    if (promptDragState) {
      setDragReordered(true);
    }

    try {
      await persistPrompts(next);
      clearPromptError();
      return { ok: true, prompts: next };
    } catch (error) {
      return handlePersistFailure(error, 'Unable to save the new prompt order. Please try again.');
    }
  }

  function handlePromptHandleKeyDown(event) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }
    if (promptSearchQuery) {
      showPromptError('Clear the search to reorder prompts.');
      return;
    }
    event.preventDefault();
    const handle = event.currentTarget;
    if (!(handle instanceof HTMLElement)) {
      return;
    }
    const card = handle.closest('.prompt-card');
    if (!card) {
      return;
    }
    const promptId = card.dataset.id;
    if (!promptId) {
      return;
    }
    const delta = event.key === 'ArrowUp' ? -1 : 1;
    movePromptByKeyboard(promptId, delta);
  }

  function movePromptByKeyboard(promptId, delta) {
    if (!delta) {
      return;
    }
    if (promptSearchQuery) {
      showPromptError('Clear the search to reorder prompts.');
      return;
    }
    const currentList = prompts || [];
    const index = currentList.findIndex((prompt) => prompt.id === promptId);
    if (index === -1) {
      return;
    }
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= currentList.length) {
      return;
    }
    const next = currentList.slice();
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setPrompts(next);
    renderPromptsWithCurrentFilter({ focusId: promptId });
    persistPrompts(next)
      .then(() => {
        clearPromptError();
      })
      .catch((error) => handlePersistFailure(error, 'Unable to reorder prompts. Please try again.'));
  }

  function setEditingPromptId(id) {
    editingPromptId = id;
  }

  function deletePromptById(id) {
    if (!id) {
      return { ok: false, prompts };
    }
    const current = prompts || [];
    const next = current.filter((item) => item && item.id !== id);
    if (next.length === current.length) {
      return { ok: false, prompts };
    }
    prompts = next;
    return { ok: true, prompts };
  }

  return {
    loadPromptsFromStorage,
    renderPromptsWithCurrentFilter,
    synchronizePromptsFromStorage,
    handlePromptFormSubmit,
    handlePromptSearch,
    handlePromptListClick,
    handlePromptCardClick,
    handlePromptDragStart,
    handlePromptDragEnd,
    handlePromptDragOver,
    handlePromptDrop,
    handlePromptHandleKeyDown,
    applyPromptOrderFromDom,
    movePromptByKeyboard,
    copyPromptToClipboard,
    confirmPromptDeletion,
    setEditingPromptId,
    deletePromptById,
    getPromptById,
    setPrompts,
    setPromptSearchQuery,
    get dragState() {
      return promptDragState;
    },
    get dragReordered() {
      return promptDragReordered;
    },
    setDragReordered,
    get prompts() {
      return prompts;
    },
    get editingPromptId() {
      return editingPromptId;
    },
    setDragState,
    clearDragState
  };
}
