export function createIdGenerator(prefix = 'prompt') {
  let count = 0;
  return () => `${prefix}-${++count}`;
}

export function createNormalizePromptCollection(generateId) {
  return (value) => {
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
      let id = typeof entry.id === 'string' && entry.id ? entry.id : generateId();
      while (seenIds.has(id)) {
        id = generateId();
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
  };
}
