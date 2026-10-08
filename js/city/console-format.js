/** Portable text snapshots: logging never keeps live references to world data. */
export function formatConsoleValues(values) {
  const format = value => {
    if (typeof value === 'string') return value;
    if (value === undefined) return 'undefined';
    if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
    if (typeof value === 'bigint') return String(value) + 'n';
    if (typeof value === 'function' || typeof value === 'symbol') return String(value);
    if (value instanceof Error) return value.name + ': ' + value.message;
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (_key, item) => {
        if (typeof item === 'number' && !Number.isFinite(item)) return String(item);
        if (typeof item === 'bigint') return String(item) + 'n';
        if (item instanceof Error) return { name: item.name, message: item.message };
        if (item && typeof item === 'object') {
          if (seen.has(item)) return '[Повторная ссылка]';
          seen.add(item);
        }
        return item;
      }) ?? String(value);
    } catch { try { return String(value); } catch { return '[Не удалось вывести значение]'; } }
  };
  return values.map(format).join(' ').slice(0, 2000);
}
export function scriptLocation(stack = '') {
  const match = String(stack).match(/city\/([\w./-]+\.js):(\d+):(\d+)/);
  return match ? { path: match[1], line: Number(match[2]), column: Number(match[3]) } : null;
}
