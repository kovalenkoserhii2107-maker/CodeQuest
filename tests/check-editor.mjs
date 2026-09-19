/**
 * Проверки редактора кода (запуск: node tests/check-editor.mjs).
 * Тестируется чистая логика: парные скобки, отступы, подсветка и подсказки.
 */
import {
  handleEnter, handleChar, handleBackspace, handleTab, toggleComment, dedentClosingBrace, INDENT,
} from '../js/editor/edit-ops.js';
import { tokenize, highlight } from '../js/editor/highlight.js';
import { suggest, inferType, localNames, completionContext } from '../js/editor/complete.js';
import { JS_API } from '../js/data/js-api.js';
import {
  boxNearCaret, clampBox, defaultSize, moveBox, resizeBox, MIN_WIDTH, MIN_HEIGHT,
} from '../js/editor/hint-box.js';

let failures = 0;
const check = (ok, message, extra = '') => {
  if (ok) {
    console.log('✓', message);
  } else {
    failures += 1;
    console.error('✖', message, extra);
  }
};
const eq = (actual, expected, message) =>
  check(JSON.stringify(actual) === JSON.stringify(expected), message, `→ получено ${JSON.stringify(actual)}`);

/* --- Парные скобки ------------------------------------------------------ */

eq(handleChar('', 0, 0, '('), { value: '()', start: 1, end: 1 }, 'скобка закрывается автоматически');
eq(handleChar('', 0, 0, '{'), { value: '{}', start: 1, end: 1 }, 'фигурная скобка закрывается');
eq(handleChar('', 0, 0, "'"), { value: "''", start: 1, end: 1 }, 'кавычка закрывается');
eq(handleChar('()', 1, 1, ')'), { value: '()', start: 2, end: 2 }, 'закрывающая скобка проскакивает, а не дублируется');
eq(handleChar('word', 0, 4, '('), { value: '(word)', start: 1, end: 5 }, 'выделение оборачивается в скобки');
check(handleChar("don", 3, 3, "'") === null, 'апостроф внутри слова не превращается в пару');
check(handleChar('abc', 0, 0, '(') === null, 'перед словом пара не подставляется');
eq(handleBackspace('()', 1, 1), { value: '', cursor: 0 }, 'Backspace между скобками убирает обе');
check(handleBackspace('(a)', 2, 2) === null, 'Backspace внутри текста работает обычно');

/* --- Отступы ------------------------------------------------------------ */

eq(
  handleEnter('function f() {}', 14, 14),
  { value: 'function f() {\n  \n}', cursor: 17 },
  'Enter между скобками раскрывает блок и ставить закрывающую скобку под ним',
);
eq(
  handleEnter('  const a = 1;', 14, 14),
  { value: '  const a = 1;\n  ', cursor: 17 },
  'Enter сохраняет отступ строки',
);
eq(
  handleEnter('if (x) {', 8, 8),
  { value: 'if (x) {\n  ', cursor: 11 },
  'после открывающей скобки отступ увеличивается',
);
eq(
  handleTab('a\nb', 0, 3, false),
  { value: '  a\n  b', start: 2, end: 7 },
  'Tab сдвигает выделенные строки',
);
eq(
  handleTab('  a\n  b', 0, 7, true),
  { value: 'a\nb', start: 0, end: 3 },
  'Shift+Tab убирает отступ',
);
eq(
  handleTab('ab', 1, 1, false),
  { value: `a${INDENT}b`, start: 3, end: 3 },
  'Tab без выделения вставляет пробелы',
);
eq(
  dedentClosingBrace('if (x) {\n    ', 13, '}'),
  { value: 'if (x) {\n  }', start: 12, end: 12 },
  'закрывающая скобка подтягивается влево',
);
check(dedentClosingBrace('const a = {', 11, '}') === null, 'скобка в середине строки не двигается');

/* --- Комментарии -------------------------------------------------------- */

eq(
  toggleComment('let x = 1;', 0, 0).value,
  '// let x = 1;',
  'Ctrl+/ комментирует строку',
);
eq(
  toggleComment('// let x = 1;', 0, 0).value,
  'let x = 1;',
  'повторное нажатие снимает комментарий',
);

/* --- Подсветка ---------------------------------------------------------- */

const tokens = tokenize('const x = "текст"; // хвост');
check(tokens.some(t => t.type === 'keyword' && t.text === 'const'), 'ключевое слово распознано');
check(tokens.some(t => t.type === 'string' && t.text === '"текст"'), 'строка распознана');
check(tokens.some(t => t.type === 'comment'), 'комментарий распознан');
check(tokenize('sum(1)').some(t => t.type === 'call' && t.text === 'sum'), 'вызов функции распознан');
const dangerous = highlight('<script>alert(1)</script>');
check(dangerous.includes('&lt;') && dangerous.includes('&gt;') && !dangerous.includes('<script'),
  'опасные символы экранируются');
check(tokenize('const a = 1;').map(t => t.text).join('') === 'const a = 1;', 'текст собирается обратно без потерь');

/* --- Подсказки ---------------------------------------------------------- */

const arrayCode = 'const routes = [];\nroutes.';
eq(completionContext(arrayCode, arrayCode.length).kind, 'member', 'после точки включается режим методов');
check(inferType(arrayCode, 'routes') === 'Array', 'тип переменной выведен из объявления');
check(inferType("const s = 'abc'; s", 's') === 'String', 'строковая переменная распознана');
check(inferType('Math', 'Math') === 'Math', 'Math распознан');

const arraySuggestions = suggest(arrayCode, arrayCode.length).items.map(item => item.name);
check(arraySuggestions.includes('reduce') && arraySuggestions.includes('indexOf'),
  'для массива предлагаются reduce и indexOf');
check(!arraySuggestions.includes('toLowerCase'), 'строковые методы не попадают в список массива');

const strCode = "const signal = 'sos';\nsignal.to";
const strSuggestions = suggest(strCode, strCode.length).items.map(item => item.name);
eq(strSuggestions, ['toLowerCase', 'toUpperCase'], 'для строки предлагаются строковые методы по префиксу');

const mathCode = 'Math.ro';
eq(suggest(mathCode, mathCode.length).items.map(i => i.name), ['round'], 'Math.ro предлагает round');

const unknownCode = 'function f(param) {\n  param.';
const unknownSuggestions = suggest(unknownCode, unknownCode.length).items.map(item => item.name);
check(unknownSuggestions.includes('map') && unknownSuggestions.includes('trim'),
  'для неизвестного типа показываются методы всех значений');

const wordCode = 'function totalMass(cargo) {\n  car';
check(suggest(wordCode, wordCode.length).items.some(item => item.name === 'cargo'),
  'имена из кода игрока попадают в подсказки');
check(localNames('function f(a, b) { const c = 1; }').sort().join(',') === 'a,b,c,f',
  'имена функций, параметров и переменных собираются');

/* --- Справочник --------------------------------------------------------- */

for (const item of JS_API) {
  if (!item.summary || !item.details || !item.example || !item.signature) {
    check(false, `у записи ${item.name} неполное описание`);
    break;
  }
}
check(JS_API.every(item => item.insert && item.summary.length > 10), 'все записи справочника заполнены');
check(JS_API.find(i => i.name === 'sort').mutates === true, 'sort помечен как меняющий массив');

/* --- Окно подсказок ------------------------------------------------------ */

const area = { width: 600, height: 400 };

const nearCaret = boxNearCaret({ top: 20, left: 100, lineHeight: 20 }, { width: 520, height: 240 }, area);
check(nearCaret.top === 46, 'окно встаёт под строкой с кареткой');
check(nearCaret.left + nearCaret.width + 8 <= area.width, 'окно не вылезает за правый край');

const flipped = boxNearCaret({ top: 360, left: 10, lineHeight: 20 }, { width: 520, height: 240 }, area);
check(flipped.top + flipped.height <= area.height, 'у нижнего края окно переворачивается вверх');

const moved = moveBox({ left: 100, top: 100, width: 300, height: 200 }, 50, -40, area);
check(moved.left === 150 && moved.top === 60, 'окно перетаскивается на смещение мыши');

const pushed = moveBox({ left: 100, top: 100, width: 300, height: 200 }, 900, 900, area);
check(pushed.left + pushed.width <= area.width && pushed.top + pushed.height <= area.height,
  'перетаскивание удерживает окно внутри редактора');

const grown = resizeBox({ left: 0, top: 0, width: 300, height: 200 }, 1000, 1000, area);
check(grown.width <= area.width && grown.height <= area.height, 'размер ограничен размерами редактора');

const shrunk = resizeBox({ left: 0, top: 0, width: 300, height: 200 }, -500, -500, area);
check(shrunk.width === MIN_WIDTH && shrunk.height === MIN_HEIGHT, 'окно не ужимается меньше минимума');

const tiny = clampBox({ left: 0, top: 0, width: 520, height: 260 }, { width: 320, height: 220 });
check(tiny.width <= 320 && tiny.height <= 220, 'на узком экране окно ужимается под редактор');
check(defaultSize({ width: 300, height: 200 }).width >= MIN_WIDTH, 'размер по умолчанию не меньше минимального');

console.log(failures === 0 ? '\nРедактор: все проверки пройдены' : `\nРедактор: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
