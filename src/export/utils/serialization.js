import { EXPORT_EQUATION_CLASS, RTL_CHAR_REGEX, LTR_CHAR_REGEX } from '../constants.js';

const JSON_BLOCK_LEVEL_SELECTOR = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'table',
  'hr',
  'figure',
  '.katex',
  '.' + EXPORT_EQUATION_CLASS
].join(', ');

const MARKDOWN_BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'canvas',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'noscript',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'thead',
  'tfoot',
  'ul'
]);

const MARKDOWN_CODE_LANGUAGE_REGEX = /language-([a-z0-9+-]+)/i;

export function serializeExportRootToJson(root) {
  const turns = Array.from(root.children || [])
    .map((turn, index) => serializeTurnNodeToJson(turn, index))
    .filter(Boolean);

  return {
    title: document.title || 'ChatGPT Conversation',
    sourceUrl: typeof window !== 'undefined' && window.location ? window.location.href : '',
    exportedAt: new Date().toISOString(),
    turnCount: turns.length,
    turns
  };
}

export function serializeTurnNodeToJson(turnNode, index) {
  if (!turnNode) {
    return null;
  }

  const direction = resolveNodeDirection(turnNode, serializeInlineText(turnNode));
  const blocks = serializeChildNodesToBlocks(turnNode);
  if (!blocks.length) {
    return null;
  }

  return {
    index,
    role: detectTurnRole(turnNode),
    direction,
    blocks
  };
}

export function detectTurnRole(turnNode) {
  const directRole = (turnNode.getAttribute('data-message-author-role') || '').trim();
  if (directRole) {
    return directRole.toLowerCase();
  }
  const nestedRole = turnNode.querySelector('[data-message-author-role]');
  if (nestedRole && nestedRole.getAttribute('data-message-author-role')) {
    return nestedRole.getAttribute('data-message-author-role').toLowerCase();
  }
  const testId = (turnNode.getAttribute('data-testid') || '').toLowerCase();
  if (testId.includes('user')) {
    return 'user';
  }
  if (testId.includes('assistant')) {
    return 'assistant';
  }
  return 'unknown';
}

function resolveNodeDirection(node, fallbackText) {
  if (!node) {
    return null;
  }
  const dirAttr = node.getAttribute && node.getAttribute('dir');
  if (dirAttr === 'rtl' || dirAttr === 'ltr') {
    return dirAttr;
  }
  const sourceText = fallbackText && fallbackText.trim() ? fallbackText : extractRelevantText(node);
  if (!sourceText) {
    return null;
  }
  const { rtlCount, ltrCount } = countDirectionCharacters(sourceText);
  if (rtlCount === 0 && ltrCount === 0) {
    return null;
  }
  return rtlCount > ltrCount ? 'rtl' : 'ltr';
}

function isBlockLevel(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  return node.matches(JSON_BLOCK_LEVEL_SELECTOR);
}

export function serializeChildNodesToBlocks(container) {
  if (!container) {
    return [];
  }

  const blocks = [];
  let inlineGroup = [];

  const flushInlineGroup = () => {
    if (!inlineGroup.length) {
      return;
    }
    const temp = document.createElement('div');
    inlineGroup.forEach((node) => temp.appendChild(node.cloneNode(true)));
    const content = serializeInlineFragments(temp);
    if (content.length) {
      blocks.push({
        type: 'paragraph',
        content,
        direction: resolveNodeDirection(temp, serializeInlineText(temp))
      });
    }
    inlineGroup = [];
  };

  Array.from(container.childNodes || []).forEach((node) => {
    if (isBlockLevel(node)) {
      flushInlineGroup();
      const block = serializeBlockToJson(node);
      if (block) {
        blocks.push(block);
      }
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue && node.nodeValue.trim()) {
        inlineGroup.push(node);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      inlineGroup.push(node);
    }
  });

  flushInlineGroup();

  return blocks;
}

export function serializeBlockToJson(node) {
  const tag = node.tagName ? node.tagName.toLowerCase() : '';
  const direction = resolveNodeDirection(node);

  if (isEquationNode(node)) {
    return serializeEquationBlock(node, direction);
  }

  switch (tag) {
    case 'p':
      return serializeParagraphBlock(node, direction);
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return serializeHeadingBlock(node, direction, Number(tag[1]));
    case 'blockquote':
      return serializeBlockquoteBlock(node, direction);
    case 'pre':
      return serializeCodeBlock(node, direction);
    case 'ul':
    case 'ol':
      return serializeListBlock(node, direction, tag === 'ol');
    case 'table':
      return serializeTableBlock(node, direction);
    case 'hr':
      return { type: 'separator', direction };
    case 'figure':
      return serializeFigureBlock(node, direction);
    default:
      return serializeGenericBlock(node, direction);
  }
}

export function serializeParagraphBlock(node, direction) {
  const content = serializeInlineFragments(node);
  if (!content.length) {
    return null;
  }
  return {
    type: 'paragraph',
    content,
    direction
  };
}

export function serializeHeadingBlock(node, direction, level) {
  const content = serializeInlineFragments(node);
  return {
    type: 'heading',
    level: Number.isFinite(level) ? level : null,
    content,
    direction
  };
}

export function serializeBlockquoteBlock(node, direction) {
  const content = serializeInlineFragments(node);
  const nested = serializeNestedBlocks(node);
  return {
    type: 'blockquote',
    content: content.length ? content : undefined,
    blocks: nested.length ? nested : undefined,
    direction
  };
}

export function serializeCodeBlock(node, direction) {
  const codeNode = node.querySelector('code');
  const raw = codeNode ? codeNode.textContent || '' : node.textContent || '';
  const language = codeNode && codeNode.className ? extractCodeLanguage(codeNode.className) : '';
  const code = sanitizeCodeBlockContent(raw);
  return {
    type: 'code',
    language: language || null,
    code,
    direction
  };
}

export function serializeListBlock(node, direction, ordered) {
  const items = Array.from(node.children || [])
    .filter((child) => child.tagName && child.tagName.toLowerCase() === 'li')
    .map((item, index) => {
      const content = serializeInlineFragments(item);
      const nestedBlocks = serializeChildNodesToBlocks(item);
      const childLists = nestedBlocks.filter((block) => block && block.type === 'list');
      const otherBlocks = nestedBlocks.filter((block) => block && block.type !== 'list');
      return {
        index,
        content: content.length ? content : undefined,
        direction: resolveNodeDirection(item, serializeInlineText(item)),
        children: childLists.length ? childLists : undefined,
        blocks: otherBlocks.length ? otherBlocks : undefined
      };
    })
    .filter((entry) => entry && (entry.content || (entry.children && entry.children.length) || (entry.blocks && entry.blocks.length)));

  return {
    type: 'list',
    ordered: Boolean(ordered),
    items,
    direction
  };
}

export function serializeTableBlock(table, direction) {
  const rows = Array.from(table.querySelectorAll('tr'))
    .map((row) => {
      const cells = Array.from(row.children || [])
        .filter((cell) => cell.tagName && ['td', 'th'].includes(cell.tagName.toLowerCase()))
        .map((cell) => ({
          type: cell.tagName.toLowerCase() === 'th' ? 'header' : 'cell',
          content: serializeInlineFragments(cell),
          colSpan: parseSpanValue(cell.getAttribute('colspan')),
          rowSpan: parseSpanValue(cell.getAttribute('rowspan')),
          direction: resolveNodeDirection(cell)
        }))
        .filter((cell) => (cell.content && cell.content.length) || cell.colSpan || cell.rowSpan);
      if (!cells.length) {
        return null;
      }
      return { cells };
    })
    .filter(Boolean);

  return {
    type: 'table',
    rows,
    direction
  };
}

function parseSpanValue(value) {
  const numeric = parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 1) {
    return null;
  }
  return numeric;
}

export function serializeFigureBlock(node, direction) {
  const image = node.querySelector('img');
  const captionNode = node.querySelector('figcaption');
  const caption = captionNode ? serializeInlineFragments(captionNode) : [];
  const nestedBlocks = serializeChildNodesToBlocks(node).filter((block) => block && block.type !== 'image');
  const imageBlock = image ? serializeImageBlock(image, resolveNodeDirection(image), false) : null;

  return {
    type: 'figure',
    image: imageBlock,
    caption: caption.length ? caption : null,
    blocks: nestedBlocks.length ? nestedBlocks : undefined,
    direction
  };
}

export function serializeImageBlock(node, direction, inline = false) {
  const src = node.getAttribute ? node.getAttribute('src') || node.src || '' : '';
  const alt = node.getAttribute ? node.getAttribute('alt') || '' : '';
  const title = node.getAttribute ? node.getAttribute('title') || '' : '';
  if (!src && !alt) {
    return null;
  }
  return {
    type: 'image',
    src,
    alt: alt || null,
    title: title || null,
    inline,
    direction
  };
}

export function serializeEquationBlock(node, direction) {
  const latex = extractLatex(node);
  const text = normalizeJsonText(latex || node.textContent || '');
  if (!latex && !text) {
    return null;
  }
  return {
    type: 'equation',
    latex: latex || null,
    text,
    displayMode: node.classList.contains('katex-display'),
    direction
  };
}

export function serializeGenericBlock(node, direction) {
  const nestedBlocks = serializeNestedBlocks(node);
  if (nestedBlocks.length) {
    return {
      type: 'container',
      tag: node.tagName ? node.tagName.toLowerCase() : null,
      blocks: nestedBlocks,
      direction
    };
  }
  const content = serializeInlineFragments(node);
  if (!content.length) {
    return null;
  }
  return {
    type: 'block',
    tag: node.tagName ? node.tagName.toLowerCase() : null,
    content,
    direction
  };
}

function serializeNestedBlocks(container) {
  return serializeChildNodesToBlocks(container);
}

export function serializeInlineText(element, options = {}) {
  const { excludeSelectors = [] } = options;
  const baseExcludes = ['.' + EXPORT_EQUATION_CLASS, '.katex', '.katex-display'];
  const selectorExtras = Array.isArray(excludeSelectors) ? excludeSelectors : [];
  const selectorParts = [...baseExcludes, ...selectorExtras].filter(Boolean);
  const excludeSelector = selectorParts.length ? selectorParts.join(',') : null;

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (textNode) => {
        if (!textNode || !textNode.nodeValue || !textNode.nodeValue.trim()) {
          return NodeFilter.FILTER_SKIP;
        }
        if (excludeSelector && textNode.parentElement && textNode.parentElement.closest(excludeSelector)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  const textParts = [];
  while (walker.nextNode()) {
    textParts.push(textNodeValue(walker.currentNode));
  }
  return normalizeJsonText(textParts.join(' '));
}

function textNodeValue(node) {
  return (node && node.nodeValue ? node.nodeValue : '').replace(/\u00a0/g, ' ');
}

export function normalizeJsonText(text) {
  if (!text) {
    return '';
  }
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildCsvRows(payload) {
  const rows = [['turn_index', 'role', 'direction', 'block_index', 'block_type', 'text']];
  const turns = payload && Array.isArray(payload.turns) ? payload.turns : [];
  if (!turns.length) {
    return rows;
  }

  turns.forEach((turn, turnIdx) => {
    const blocks = Array.isArray(turn && turn.blocks) ? turn.blocks : [];
    const turnIndex = Number.isFinite(turn && turn.index) ? turn.index : turnIdx;

    if (!blocks.length) {
      rows.push([turnIndex, turn?.role || '', turn?.direction || '', '', '', '']);
      return;
    }

    blocks.forEach((block, blockIdx) => {
      const rawText = blockToPlainText(block, 0);
      const text = typeof rawText === 'string' ? rawText.replace(/\s+$/g, '') : '';
      rows.push([
        turnIndex,
        turn?.role || '',
        turn?.direction || '',
        blockIdx + 1,
        block && block.type ? block.type : '',
        text
      ]);
    });
  });

  return rows;
}

export function formatCsvRow(columns) {
  return columns.map((value) => escapeCsvValue(value == null ? '' : value)).join(',');
}

export function escapeCsvValue(value) {
  const stringValue = typeof value === 'string' ? value : String(value);
  const normalized = stringValue.replace(/\r\n?/g, '\n');
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function blocksToPlainText(blocks, depth = 0) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return '';
  }
  const parts = blocks
    .map((block) => blockToPlainText(block, depth))
    .filter((part) => typeof part === 'string' && part.trim());
  return parts.join('\n');
}

export function blockToPlainText(block, depth = 0) {
  if (!block || typeof block !== 'object') {
    return '';
  }

  const parts = [];
  const pushIfText = (value) => {
    if (typeof value === 'string' && value.trim()) {
      parts.push(value);
    }
  };

  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'block':
    case 'container': {
      pushIfText(inlineFragmentsToPlainText(block.content || []));
      pushIfText(blocksToPlainText(block.blocks, depth + 1));
      return parts.join('\n');
    }
    case 'blockquote': {
      pushIfText(inlineFragmentsToPlainText(block.content || []));
      pushIfText(blocksToPlainText(block.blocks, depth + 1));
      return parts.join('\n');
    }
    case 'code':
      return typeof block.code === 'string' ? block.code : '';
    case 'list': {
      const indent = '  '.repeat(Math.max(0, depth));
      const lines = (block.items || [])
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return '';
          }
          const itemParts = [];
          const itemContent = inlineFragmentsToPlainText(item.content || []);
          if (itemContent.trim()) {
            itemParts.push(itemContent);
          }
          const nestedBlocks = blocksToPlainText(item.blocks, depth + 1);
          if (nestedBlocks.trim()) {
            itemParts.push(nestedBlocks);
          }
          const childLists = blocksToPlainText(item.children, depth + 1);
          if (childLists.trim()) {
            itemParts.push(childLists);
          }
          const line = itemParts.join('\n').replace(/\s+$/g, '');
          if (!line.trim()) {
            return '';
          }
          return `${indent}- ${line}`;
        })
        .filter((line) => line && line.trim());
      return lines.join('\n');
    }
    case 'table': {
      const lines = (block.rows || [])
        .map((row) => {
          if (!row || !Array.isArray(row.cells)) {
            return '';
          }
          const cellText = row.cells
            .map((cell) => inlineFragmentsToPlainText(cell?.content || []))
            .filter((value) => value && value.trim());
          if (!cellText.length) {
            return '';
          }
          return cellText.join(' | ');
        })
        .filter((line) => line && line.trim());
      return lines.join('\n');
    }
    case 'image':
      return block.alt || block.title || block.src || '[image]';
    case 'figure': {
      const figureParts = [];
      if (block.image) {
        figureParts.push(blockToPlainText(block.image, depth + 1));
      }
      if (Array.isArray(block.caption)) {
        const captionText = inlineFragmentsToPlainText(block.caption);
        if (captionText.trim()) {
          figureParts.push(captionText);
        }
      }
      const nested = blocksToPlainText(block.blocks, depth + 1);
      if (nested.trim()) {
        figureParts.push(nested);
      }
      return figureParts.filter((value) => value && value.trim()).join('\n');
    }
    case 'equation':
      return block.latex || block.text || '';
    case 'separator':
      return '---';
    default: {
      const inline = inlineFragmentsToPlainText(block.content || []);
      const nested = blocksToPlainText(block.blocks, depth + 1);
      pushIfText(inline);
      pushIfText(nested);
      return parts.join('\n');
    }
  }
}

export function inlineFragmentsToPlainText(fragments) {
  if (!Array.isArray(fragments)) {
    return '';
  }
  const pieces = fragments
    .map((fragment) => {
      if (!fragment || typeof fragment !== 'object') {
        return '';
      }
      switch (fragment.type) {
        case 'text':
          return (fragment.text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
        case 'linebreak':
          return '\n';
        case 'strong':
        case 'em':
        case 'link':
          return inlineFragmentsToPlainText(fragment.content || []);
        case 'code':
          return fragment.text || '';
        case 'image':
          return fragment.alt || fragment.title || fragment.src || '[image]';
        case 'equation':
          return fragment.latex || fragment.text || '';
        default:
          return '';
      }
    })
    .filter(Boolean);
  return pieces.join('');
}

function isEquationNode(node) {
  if (!node || !node.classList) {
    return false;
  }
  return node.classList.contains(EXPORT_EQUATION_CLASS) || node.classList.contains('katex');
}

export function serializeInlineFragments(container) {
  const fragments = [];

  const appendFragment = (fragment) => {
    if (!fragment) {
      return;
    }
    if (fragment.type === 'text') {
      if (!fragment.text) {
        return;
      }
      const last = fragments[fragments.length - 1];
      if (last && last.type === 'text') {
        last.text += fragment.text;
        return;
      }
    }
    fragments.push(fragment);
  };

  const walk = (node) => {
    if (!node) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = textNodeValue(node);
      if (text) {
        appendFragment({ type: 'text', text });
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node;
    if (element.classList.contains('katex') || element.classList.contains(EXPORT_EQUATION_CLASS)) {
      const eqFragment = serializeEquationFragment(element);
      if (eqFragment) {
        appendFragment(eqFragment);
      }
      return;
    }

    const tag = element.tagName.toLowerCase();
    switch (tag) {
      case 'br':
        appendFragment({ type: 'linebreak' });
        return;
      case 'strong':
      case 'b':
        appendFragment({
          type: 'strong',
          content: serializeInlineFragments(element)
        });
        return;
      case 'em':
      case 'i':
        appendFragment({
          type: 'em',
          content: serializeInlineFragments(element)
        });
        return;
      case 'code':
        if (!element.closest('pre')) {
          const codeText = normalizeJsonText(element.textContent || '');
          if (codeText) {
            appendFragment({ type: 'code', text: codeText });
          }
        }
        return;
      case 'a': {
        const href = element.getAttribute('href') || '';
        const title = element.getAttribute('title') || null;
        appendFragment({
          type: 'link',
          href,
          title,
          content: serializeInlineFragments(element)
        });
        return;
      }
      case 'img': {
        const src = element.getAttribute('src') || element.src || '';
        if (!src) {
          return;
        }
        appendFragment({
          type: 'image',
          src,
          alt: element.getAttribute('alt') || '',
          title: element.getAttribute('title') || null
        });
        return;
      }
      default: {
        serializeInlineFragments(element).forEach(appendFragment);
      }
    }
  };

  Array.from(container.childNodes || []).forEach(walk);

  return fragments.filter((fragment) => {
    if (fragment.type === 'text') {
      return Boolean(normalizeJsonText(fragment.text));
    }
    return true;
  });
}

export function serializeEquationFragment(node) {
  const latex = extractLatex(node);
  const text = normalizeJsonText(latex || node.textContent || '');
  const direction = resolveNodeDirection(node, text);
  if (!latex && !text) {
    return null;
  }
  return {
    type: 'equation',
    latex: latex || null,
    text,
    displayMode: node.classList.contains('katex-display'),
    direction
  };
}

function extractLatex(element) {
  const annotation = element.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
  if (annotation && annotation.textContent) {
    return annotation.textContent.trim();
  }
  const fallback = element.querySelector('.katex-mathml annotation');
  if (fallback && fallback.textContent) {
    return fallback.textContent.trim();
  }
  return element.textContent ? element.textContent.trim() : '';
}

export function serializeExportRootToMarkdown(root) {
  const segments = [];
  const context = { listDepth: 0, preserveWhitespace: false, inLink: false };
  Array.from(root.childNodes).forEach((child) => {
    const chunk = serializeNodeToMarkdown(child, context);
    if (chunk && chunk.trim()) {
      segments.push(chunk.trim());
    }
  });
  return segments.join('\n\n');
}

function serializeNodeToMarkdown(node, context) {
  if (node.nodeType === Node.TEXT_NODE) {
    return serializeTextNode(node, context);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case 'br':
      return '\n';
    case 'hr':
      return '---';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const depth = Number(tag[1]);
      const headingContent = serializeInlineChildren(node, context).trim();
      if (!headingContent) {
        return '';
      }
      return `${'#'.repeat(depth)} ${headingContent}`;
    }
    case 'p':
      return serializeInlineChildren(node, context).trim();
    case 'blockquote':
      return serializeBlockquote(node, context);
    case 'pre':
      return serializePreformattedBlock(node);
    case 'ul':
      return serializeList(node, context, false);
    case 'ol':
      return serializeList(node, context, true);
    case 'table':
      return serializeTable(node, context);
    case 'thead':
    case 'tbody':
    case 'tfoot':
      return serializeBlockChildren(node, context);
    case 'li':
      return serializeBlockChildren(node, context);
    case 'strong':
    case 'b': {
      const strongContent = serializeInlineChildren(node, context).trim();
      return strongContent ? `**${strongContent}**` : '';
    }
    case 'em':
    case 'i': {
      const italicContent = serializeInlineChildren(node, context).trim();
      return italicContent ? `*${italicContent}*` : '';
    }
    case 'del':
    case 's': {
      const strikeContent = serializeInlineChildren(node, context).trim();
      return strikeContent ? `~~${strikeContent}~~` : '';
    }
    case 'code':
    case 'kbd':
      return serializeInlineCode(node, context);
    case 'a':
      return serializeLink(node, context);
    case 'img':
      return serializeImage(node);
    case 'sup': {
      const supContent = serializeInlineChildren(node, context).trim();
      return supContent ? `^(${supContent})` : '';
    }
    case 'sub': {
      const subContent = serializeInlineChildren(node, context).trim();
      return subContent ? `~(${subContent})` : '';
    }
    case 'mark': {
      const markContent = serializeInlineChildren(node, context).trim();
      return markContent ? `==${markContent}==` : '';
    }
    case 'span':
    case 'small':
    case 'label':
    case 'summary':
    case 'details':
    case 'figure':
    case 'figcaption':
    case 'section':
    case 'article':
    case 'main':
    case 'header':
    case 'footer':
    case 'aside':
    case 'div':
      return serializeGenericMarkdownBlock(node, context);
    default:
      return serializeGenericMarkdownBlock(node, context);
  }
}

function serializeGenericMarkdownBlock(node, context) {
  if (hasBlockDescendant(node)) {
    return serializeBlockChildren(node, context);
  }
  return serializeInlineChildren(node, context).trim();
}

function serializeInlineChildren(node, context) {
  const childContext = { ...context };
  const parts = [];
  node.childNodes.forEach((child) => {
    const chunk = serializeNodeToMarkdown(child, childContext);
    if (chunk) {
      parts.push(chunk);
    }
  });
  const combined = parts.join('');
  if (context && context.preserveWhitespace) {
    return combined;
  }
  return combined.replace(/\s*\n\s*/g, '\n').replace(/[ \t]{2,}/g, ' ');
}

function serializeBlockChildren(node, context) {
  const childContext = { ...context };
  const pieces = [];
  node.childNodes.forEach((child) => {
    const chunk = serializeNodeToMarkdown(child, childContext);
    if (chunk) {
      const trimmed = chunk.replace(/\s+$/g, '');
      if (trimmed.trim()) {
        pieces.push(trimmed);
      }
    }
  });
  return pieces.join('\n\n');
}

function serializeTextNode(node, context) {
  let text = node.nodeValue || '';
  if (!text) {
    return '';
  }
  text = text.replace(/\u00a0/g, ' ');
  if (context && context.preserveWhitespace) {
    return text;
  }
  return escapeMarkdownText(text.replace(/\s+/g, ' '));
}

function serializeBlockquote(node, context) {
  const content = serializeBlockChildren(node, context);
  if (!content) {
    return '';
  }
  return content
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');
}

function serializePreformattedBlock(node) {
  const codeNode = node.querySelector('code');
  const raw = codeNode ? codeNode.textContent || '' : node.textContent || '';
  const language = codeNode && codeNode.className ? extractCodeLanguage(codeNode.className) : '';
  const content = sanitizeCodeBlockContent(raw);
  const fenceLength = Math.max(3, longestStreak(content, '`') + 1);
  const fence = '`'.repeat(fenceLength);
  return `${fence}${language}\n${content}\n${fence}`;
}

function serializeInlineCode(node, context) {
  if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
    return '';
  }
  const childContext = { ...context, preserveWhitespace: true };
  let content = serializeInlineChildren(node, childContext);
  if (!content) {
    return '';
  }
  let codeText = content.replace(/\r\n?/g, '\n').replace(/\n/g, ' ');
  const fenceLength = Math.max(1, longestStreak(codeText, '`') + 1);
  if (
    codeText.startsWith(' ') ||
    codeText.endsWith(' ') ||
    codeText.startsWith('`') ||
    codeText.endsWith('`')
  ) {
    codeText = ` ${codeText} `;
  }
  const fence = '`'.repeat(fenceLength);
  return `${fence}${codeText}${fence}`;
}

function serializeLink(node, context) {
  const href = node.getAttribute('href') || '';
  const title = node.getAttribute('title');
  const text = serializeInlineChildren(node, { ...context, inLink: true }).trim() || href;
  if (!href) {
    return text;
  }
  const destination = escapeLinkDestination(href);
  const titlePart = title ? ` "${escapeMarkdownText(title)}"` : '';
  return `[${text}](${destination}${titlePart})`;
}

function serializeImage(node) {
  const alt = escapeMarkdownText((node.getAttribute('alt') || '').trim());
  const src = node.getAttribute('src') || '';
  if (!src) {
    return alt ? `![${alt}]()` : '';
  }
  const title = node.getAttribute('title');
  const destination = escapeLinkDestination(src);
  const titlePart = title ? ` "${escapeMarkdownText(title)}"` : '';
  return `![${alt}](${destination}${titlePart})`;
}

function serializeList(node, context, ordered) {
  const depth = typeof context.listDepth === 'number' ? context.listDepth : 0;
  const items = [];
  const startAttr = ordered ? parseInt(node.getAttribute('start'), 10) : null;
  let index = Number.isFinite(startAttr) ? startAttr : 1;

  Array.from(node.children).forEach((child) => {
    if (!child || child.nodeType !== Node.ELEMENT_NODE || child.tagName.toLowerCase() !== 'li') {
      return;
    }
    const itemContent = serializeListItem(child, { ...context, listDepth: depth + 1 });
    if (itemContent === null) {
      return;
    }
    const lines = itemContent.split('\n');
    if (!lines.length) {
      return;
    }
    const indent = '  '.repeat(depth);
    const prefix = ordered ? `${index}. ` : '- ';
    const continuationIndent = ordered ? `${indent}${' '.repeat(prefix.length)}` : `${indent}  `;
    const formatted = lines
      .map((line, lineIndex) => {
        if (!line.trim()) {
          return '';
        }
        if (lineIndex === 0) {
          return `${indent}${prefix}${line}`;
        }
        if (/^\s/.test(line)) {
          return line;
        }
        return `${continuationIndent}${line}`;
      })
      .join('\n');
    if (formatted) {
      items.push(formatted);
    }
    if (ordered) {
      index += 1;
    }
  });

  return items.join('\n');
}

function serializeListItem(node, context) {
  const content = serializeBlockChildren(node, context);
  if (!content) {
    return null;
  }
  return content;
}

function serializeTable(node, context) {
  const rows = Array.from(node.querySelectorAll('tr'));
  if (!rows.length) {
    return '';
  }

  const matrix = rows
    .map((row) => {
      const cells = Array.from(row.children).filter((cell) => {
        if (!cell || cell.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        const tagName = cell.tagName.toLowerCase();
        return tagName === 'td' || tagName === 'th';
      });
      if (!cells.length) {
        return null;
      }
      return cells.map((cell) => escapeTableCell(serializeInlineChildren(cell, context).trim()));
    })
    .filter(Boolean);

  if (!matrix.length) {
    return '';
  }

  const columnCount = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const normalizedRows = matrix.map((row) => {
    const copy = row.slice();
    while (copy.length < columnCount) {
      copy.push('');
    }
    return copy;
  });

  let headerIndex = rows.findIndex((row) => row.querySelector('th'));
  if (headerIndex < 0) {
    headerIndex = 0;
  }

  const headerRow = normalizedRows[headerIndex];
  const bodyRows = normalizedRows.filter((_, idx) => idx !== headerIndex);

  const headerLine = `| ${headerRow.join(' | ')} |`;
  const separatorLine = `| ${new Array(columnCount).fill('---').join(' | ')} |`;
  const bodyLines = bodyRows.length ? bodyRows.map((row) => `| ${row.join(' | ')} |`) : [];
  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function escapeTableCell(text) {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function sanitizeCodeBlockContent(text) {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/\s+$/, '');
}

function longestStreak(value, character) {
  if (!value || !character) {
    return 0;
  }
  let max = 0;
  let current = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === character) {
      current += 1;
      if (current > max) {
        max = current;
      }
    } else {
      current = 0;
    }
  }
  return max;
}

function extractCodeLanguage(className) {
  const match = className.match(MARKDOWN_CODE_LANGUAGE_REGEX);
  return match ? match[1].toLowerCase() : '';
}

function escapeMarkdownText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/([`*_{}\[\]()#+\-!.>])/g, '\\$1');
}

function escapeLinkDestination(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\s/g, '%20');
}

function hasBlockDescendant(node) {
  return Array.from(node.childNodes).some((child) => {
    if (!child || child.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    return MARKDOWN_BLOCK_TAGS.has(child.tagName.toLowerCase());
  });
}

function extractRelevantText(element) {
  if (!element.textContent) {
    return '';
  }
  return element.textContent.replace(/\s+/g, ' ').trim();
}

function countDirectionCharacters(text) {
  const rtlMatches = text.match(RTL_CHAR_REGEX);
  const ltrMatches = text.match(LTR_CHAR_REGEX);
  return {
    rtlCount: rtlMatches ? rtlMatches.length : 0,
    ltrCount: ltrMatches ? ltrMatches.length : 0
  };
}
