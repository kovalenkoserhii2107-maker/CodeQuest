/**
 * Мини-подсветка синтаксиса JavaScript: превращает код в HTML со span-ами.
 * Этого достаточно для учебного редактора и не тянет за собой библиотеку.
 */

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'of', 'in', 'while',
  'do', 'break', 'continue', 'switch', 'case', 'default', 'class', 'extends', 'new',
  'this', 'super', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'delete',
  'async', 'await', 'yield', 'export', 'import', 'from',
]);

const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const TOKEN = new RegExp(
  [
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)',                              // 1 комментарий
    "('(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\"|`(?:\\\\.|[^`\\\\])*`)", // 2 строка
    '(\\b\\d+(?:\\.\\d+)?\\b)',                                            // 3 число
    '([A-Za-z_$][\\w$]*)(?=\\s*\\()',                                      // 4 вызов функции
    '([A-Za-z_$][\\w$]*)',                                                 // 5 слово
  ].join('|'),
  'g',
);

const escape = text =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

/** Классы токенов — пригодятся тестам и стилям. */
export function tokenize(code) {
  const tokens = [];
  let lastIndex = 0;

  for (const match of code.matchAll(TOKEN)) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', text: code.slice(lastIndex, match.index) });
    }

    const [text, comment, string, number, call, word] = match;
    if (comment) tokens.push({ type: 'comment', text });
    else if (string) tokens.push({ type: 'string', text });
    else if (number) tokens.push({ type: 'number', text });
    else if (call) tokens.push({ type: KEYWORDS.has(call) ? 'keyword' : 'call', text });
    else if (word) {
      if (KEYWORDS.has(word)) tokens.push({ type: 'keyword', text });
      else if (LITERALS.has(word)) tokens.push({ type: 'literal', text });
      else tokens.push({ type: 'word', text });
    }

    lastIndex = match.index + text.length;
  }

  if (lastIndex < code.length) tokens.push({ type: 'plain', text: code.slice(lastIndex) });
  return tokens;
}

/** HTML для слоя подсветки под текстовым полем. */
export function highlight(code) {
  return tokenize(code)
    .map(token => (token.type === 'plain' ? escape(token.text) : `<span class="tok-${token.type}">${escape(token.text)}</span>`))
    .join('');
}
