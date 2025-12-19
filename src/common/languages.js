/**
 * Central language registry that drives detection and styling.
 * Only this file needs to be updated when you add another script/language.
 */

export const SUPPORTED_LANGUAGES = [
  {
    id: 'persian',
    label: 'Persian',
    regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
    settingsKey: 'fontPersian',
    variable: '--chatgpt-font-message-persian'
  },
  {
    id: 'chinese',
    label: 'Chinese',
    // Includes: CJK Unified Ideographs A/B plus Supplementary Ideographs
    regex: /[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}]/u,
    settingsKey: 'fontChinese',
    variable: '--chatgpt-font-message-chinese'
  }
];

/**
 * Scans the text for the first matching language and returns its ID.
 */

export function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.regex.test(text)) {
      return lang.id;
    }
  }
  return null;
}
