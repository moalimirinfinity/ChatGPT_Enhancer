/**
 * Centralized user-facing strings to simplify localization and updates.
 */

export const RETENTION_COPY = {
  english: {
    title: 'Enjoying GPT Enhancer?',
    body: 'Let us know your thoughts to help us improve.',
    cta: 'Rate GPT Enhancer',
    dismiss: 'Maybe later'
  },
  persian: {
    title: 'از GPT Enhancer راضی هستی؟',
    body: 'نظرت رو حتما بده تا کمک کنی بهتر شیم.',
    cta: 'ثبت نظر',
    dismiss: 'فعلاً نه'
  }
};

export const PROMPTS_EMPTY_MESSAGES = {
  defaultPrimary: 'You have no saved prompts yet.',
  defaultSecondary: 'Create your first prompt to see it here.',
  filteredPrimary: 'No prompts match your search.',
  filteredSecondary: 'Try a different keyword or clear the search.'
};

export const EXPORT_ERROR_MESSAGES = {
  accessActiveTab: 'Unable to access active tab.',
  mustOpenChat: 'Open ChatGPT in the current tab before exporting.',
  noResponse: 'No response received from the page.',
  unknownFailure: 'Export failed for an unknown reason.',
  reloadGuidance: 'Reload ChatGPT in this tab so the export helper can load, then try again once the page finishes.'
};

export const POPUP_LABELS = {
  refresh: {
    default: 'Refresh ChatGPT',
    open: 'Open ChatGPT',
    busy: 'Refreshing…'
  },
  donate: {
    default: 'Support',
    busy: 'Opening…'
  },
  export: {
    default: 'Export conversation',
    busy: 'Exporting…',
    error: 'Export failed',
    unavailable: 'Open ChatGPT to export'
  },
  prompts: {
    countSingular: 'prompt',
    countPlural: 'prompts'
  }
};

export const POPUP_COPY = {
  prompts: {
    addHeader: 'Add New Prompt',
    titleLabel: 'Title',
    titlePlaceholder: 'Optional title',
    promptLabel: 'Prompt',
    promptPlaceholder: 'Write your prompt',
    save: 'Save prompt',
    cancel: 'Cancel edit',
    searchPlaceholder: 'Search...',
    searchAriaLabel: 'Search saved prompts'
  }
};
