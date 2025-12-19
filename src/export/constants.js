/**
 * Configuration constants, class names, and regex patterns used throughout the export module.
 */

export const EXPORT_MESSAGE_TYPE = 'GPT_EXPORT_CONVERSATION';
export const EXPORT_STAGE_CLASS = 'gpt-export-stage';
export const EXPORT_ROOT_CLASS = 'gpt-export-root';
export const EXPORT_TURN_CLASS = 'gpt-export-turn';
export const EXPORT_EQUATION_CLASS = 'gpt-export-equation';
export const DARK_TEXT_COLOR = 'rgb(17, 18, 34)';
export const DARK_TEXT_LUMINANCE_THRESHOLD = 0.75;
export const DIRECTIONAL_TAGS = new Set(['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH']);
export const RTL_CHAR_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
export const LTR_CHAR_REGEX = /[A-Za-z\u00C0-\u024F]/g;
export const ARABIC_LETTER_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const VAZIRMATN_FONT_PATH = 'assets/fonts/Vazirmatn-VF.woff2';
export const FONT_FAMILY_STACK = '"Vazirmatn", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif';
export const PNG_EXPORT_PIXEL_LIMIT = 32000000;
export const PNG_EXPORT_MIN_PIXEL_RATIO = 0.75;
export const PNG_EXPORT_APPROX_PAGE_HEIGHT = 1200;
