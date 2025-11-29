import * as htmlToImage from 'html-to-image';

export function createExportError(code, message, details) {
  const error = new Error(message);
  error.name = 'ExportError';
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}

export function wrapHtmlToImageError(error, context) {
  const estimatedPages = context && Number.isFinite(context.estimatedPages) ? context.estimatedPages : null;
  let message = 'Unable to render conversation as PNG.';

  if (error && typeof error.message === 'string') {
    if (/canvas is tainted|tainted canv/i.test(error.message)) {
      message = 'PNG export failed because some images block cross-origin rendering. Try PDF or Markdown instead.';
    } else if (/data url is too long|the string to be encoded/i.test(error.message)) {
      message = 'PNG export produced data that is too large for the browser to serialize. Please try PDF or DOCX export instead.';
    } else if (/memory|array buffer|alloc/i.test(error.message)) {
      message = 'PNG export ran out of memory. The conversation is likely too long; try PDF or DOCX instead.';
    }
  }

  if (context && Array.isArray(context.suppressedWarnings) && context.suppressedWarnings.length) {
    message += ' Some remote styles or assets could not be embedded and were skipped.';
  }

  if (estimatedPages && estimatedPages > 10) {
    message += ' Large conversations are better suited for PDF or DOCX exports.';
  }

  return createExportError('png-render-failed', message, { ...context, cause: error });
}

export async function renderNodeToPngSafely(node, options) {
  const suppressedLogs = [];
  const release = interceptHtmlToImageConsole((level, args) => {
    const captured = captureSuppressedHtmlToImageLog(args);
    if (!captured) {
      return false;
    }
    suppressedLogs.push({ level, ...captured });
    return true;
  });

  try {
    const dataUrl = await htmlToImage.toPng(node, options);
    return { dataUrl, warnings: suppressedLogs };
  } catch (error) {
    if (error && typeof error === 'object') {
      error.suppressedHtmlToImageLogs = suppressedLogs;
    }
    throw error;
  } finally {
    release();
  }
}

function interceptHtmlToImageConsole(handler) {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args) => {
    if (!handler || !handler('error', args)) {
      originalError.apply(console, args);
    }
  };
  console.warn = (...args) => {
    if (!handler || !handler('warn', args)) {
      originalWarn.apply(console, args);
    }
  };

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
}

function captureSuppressedHtmlToImageLog(args) {
  if (!Array.isArray(args) || !args.length) {
    return null;
  }

  const stringInputs = args.filter((value) => typeof value === 'string' && value);
  const candidates = [...stringInputs];
  const normalized = normalizeConsoleMessage(args);
  if (normalized) {
    candidates.push(normalized);
  }
  const derived = args.map((value) => stringifyConsoleArg(value)).filter((value) => value && !candidates.includes(value));
  candidates.push(...derived);

  const message = candidates.find((candidate) => shouldSuppressHtmlToImageMessage(candidate));
  if (!message) {
    return null;
  }

  const summary = summarizeSuppressedWarning(message, args);
  return { summary, message, rawArgs: args };
}

function normalizeConsoleMessage(args) {
  if (!args || !args.length) {
    return '';
  }
  const [first] = args;
  if (typeof first === 'string') {
    return first;
  }
  if (first instanceof Error && typeof first.message === 'string') {
    return first.message;
  }
  return '';
}

function stringifyConsoleArg(arg) {
  if (!arg) {
    return '';
  }
  if (typeof arg === 'string') {
    return arg;
  }
  if (arg instanceof Error) {
    return arg.message || arg.name || '';
  }
  if (typeof DOMException !== 'undefined' && arg instanceof DOMException) {
    return arg.message || arg.name || '';
  }
  if (typeof arg === 'object') {
    if (typeof arg.message === 'string') {
      return arg.message;
    }
    if (typeof arg.toString === 'function') {
      const result = arg.toString();
      if (result && result !== '[object Object]') {
        return result;
      }
    }
  }
  return '';
}

function shouldSuppressHtmlToImageMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes('error inlining remote css') ||
    lower.includes('error loading remote stylesheet') ||
    lower.includes('error while reading css rules') ||
    lower.includes('failed to fetch resource')
  );
}

function summarizeSuppressedWarning(message, args) {
  let sanitized = sanitizeSuppressedMessage(message);
  if (sanitized && /^\\[object\\s+[^\\]]+\\]$/i.test(sanitized)) {
    sanitized = '';
  }

  const url = extractFirstUrl(args);
  const descriptor = extractErrorDescriptor(args);

  if (!sanitized && url) {
    sanitized = descriptor ? `${url} (${descriptor})` : url;
  } else if (sanitized && url && !sanitized.includes(url)) {
    sanitized = `${url} — ${sanitized}`;
  }

  if (!sanitized && descriptor) {
    sanitized = descriptor;
  }

  if (!sanitized) {
    sanitized = 'Remote asset could not be embedded.';
  }

  return sanitized;
}

function sanitizeSuppressedMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }
  let sanitized = message.trim();
  const patterns = [
    /^error inlining remote css file[:\\s]*/i,
    /^error loading remote stylesheet[:\\s]*/i,
    /^error while reading css rules from[:\\s]*/i,
    /^failed to fetch resource[:\\s]*/i
  ];
  patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });
  sanitized = sanitized.replace(/\\s+/g, ' ').trim();
  return sanitized;
}

function extractFirstUrl(args) {
  if (!Array.isArray(args)) {
    return '';
  }
  const urlRegex = /(https?:\/\/[^\s"'()<>]+[\w/#?&=%+-])/i;
  for (const arg of args) {
    if (typeof arg === 'string') {
      const match = arg.match(urlRegex);
      if (match) {
        return match[1];
      }
    }
  }
  return '';
}

function extractErrorDescriptor(args) {
  if (!Array.isArray(args)) {
    return '';
  }
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    if (arg instanceof Error) {
      return arg.message || arg.name || '';
    }
    if (typeof DOMException !== 'undefined' && arg instanceof DOMException) {
      return `${arg.name}${arg.code ? ` (${arg.code})` : ''}`;
    }
    if (typeof arg === 'object') {
      const message = typeof arg.message === 'string' ? arg.message : null;
      if (message) {
        return message;
      }
      const name = typeof arg.name === 'string' ? arg.name : null;
      if (name) {
        return name;
      }
    }
    if (typeof arg === 'string') {
      if (/domexception/i.test(arg)) {
        return arg;
      }
      if (/security/i.test(arg)) {
        return arg;
      }
    }
  }
  return '';
}
