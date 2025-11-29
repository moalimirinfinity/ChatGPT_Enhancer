/**
 * Shared constants and DOM selectors specific to the content script environment.
 */
export const MESSAGE_SELECTORS = [
  '[data-testid="conversation-turn"]',
  '[data-testid^="conversation-turn-"]',
  'article[role="presentation"]',
  '[data-testid="chat-message"]',
  'div[data-message-author-role]',
  'li[data-message-author-role]'
];

export const MESSAGE_SELECTOR = MESSAGE_SELECTORS.join(', ');

export const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const LANGUAGE_HINT_DEFAULT = 'english';
export const LANGUAGE_HINT_MESSAGE_TYPE = 'GPT_ENHANCER_DETECT_LANGUAGE';
export const LANGUAGE_DETECTION_MAX_MESSAGES = 6;
export const LANGUAGE_DETECTION_MAX_CHARS = 800;
export const LANGUAGE_DETECTION_CACHE_INTERVAL = 2000;
