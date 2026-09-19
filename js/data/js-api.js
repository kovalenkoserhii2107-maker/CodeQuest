/**
 * Справочник по встроенным возможностям JavaScript: он питает автодополнение
 * и окно с описанием. Ничего лишнего — только то, что нужно для задач игры.
 *
 * Поля записи:
 *   name      — как вставится в код;
 *   owner     — где живёт: Array, String, Object, Math, Number, JSON, Promise,
 *               console, global (функции и ключевые слова);
 *   kind      — метод / свойство / функция / ключевое слово / шаблон;
 *   signature — сигнатура для заголовка окна;
 *   summary   — одна строка: что делает;
 *   details   — подробности и подводные камни;
 *   returns   — что возвращает;
 *   example   — короткий рабочий пример;
 *   insert    — что вставить (по умолчанию name + скобки для методов);
 *   mutates   — true, если метод меняет исходные данные (важно для обучения).
 */

const array = [
  {
    name: 'map',
    signature: 'array.map(callback)',
    summary: 'Создаёт новый массив, применив функцию к каждому элементу.',
    details: 'Длина результата совпадает с исходной. Исходный массив не меняется.',
    returns: 'Новый массив',
    example: "[1, 2, 3].map(n => n * 2) // [2, 4, 6]",
  },
  {
    name: 'filter',
    signature: 'array.filter(callback)',
    summary: 'Оставляет только те элементы, для которых функция вернула true.',
    details: 'Если не подошёл никто — вернётся пустой массив, а не null.',
    returns: 'Новый массив',
    example: "[1, 2, 3, 4].filter(n => n % 2 === 0) // [2, 4]",
  },
  {
    name: 'reduce',
    signature: 'array.reduce(callback, начальноеЗначение)',
    summary: 'Сворачивает массив в одно значение: сумму, объект, строку — что угодно.',
    details:
      'Колбэк получает (накопитель, элемент, индекс). Начальное значение лучше указывать всегда: ' +
      'без него reduce по пустому массиву выбросит ошибку.',
    returns: 'Накопленное значение',
    example: "[10, 20, 30].reduce((sum, n) => sum + n, 0) // 60",
  },
  {
    name: 'forEach',
    signature: 'array.forEach(callback)',
    summary: 'Проходит по элементам ради побочного действия.',
    details: 'Ничего не возвращает (undefined). Если нужен результат — берите map или reduce.',
    returns: 'undefined',
    example: "['а', 'б'].forEach(x => console.log(x))",
  },
  {
    name: 'find',
    signature: 'array.find(callback)',
    summary: 'Возвращает первый подходящий элемент.',
    details: 'Если ничего не нашлось — undefined. Часто дополняют через ?? null.',
    returns: 'Элемент или undefined',
    example: "[{id: 1}, {id: 2}].find(x => x.id === 2) // {id: 2}",
  },
  {
    name: 'findIndex',
    signature: 'array.findIndex(callback)',
    summary: 'Возвращает индекс первого подходящего элемента.',
    details: 'Если не нашёл — вернёт -1, а не undefined.',
    returns: 'Число',
    example: "[5, 8, 13].findIndex(n => n > 6) // 1",
  },
  {
    name: 'some',
    signature: 'array.some(callback)',
    summary: 'Проверяет, есть ли хотя бы один подходящий элемент.',
    details: 'Останавливается на первом совпадении. Для пустого массива — false.',
    returns: 'true или false',
    example: "[1, 3, 5].some(n => n % 2 === 0) // false",
  },
  {
    name: 'every',
    signature: 'array.every(callback)',
    summary: 'Проверяет, подходят ли все элементы.',
    details: 'Для пустого массива возвращает true — это не ошибка, а соглашение.',
    returns: 'true или false',
    example: "[2, 4].every(n => n % 2 === 0) // true",
  },
  {
    name: 'includes',
    signature: 'array.includes(значение)',
    summary: 'Есть ли такое значение в массиве.',
    details: 'Сравнивает строго. Объекты сравниваются по ссылке, а не по содержимому.',
    returns: 'true или false',
    example: "[1, 2, 3].includes(2) // true",
  },
  {
    name: 'indexOf',
    signature: 'array.indexOf(значение)',
    summary: 'Индекс первого вхождения значения.',
    details: 'Если значения нет — -1. Именно поэтому часто пишут indexOf(x) !== -1.',
    returns: 'Число',
    example: "['a', 'b', 'c'].indexOf('c') // 2",
  },
  {
    name: 'slice',
    signature: 'array.slice(начало, конец)',
    summary: 'Копирует кусок массива, не трогая исходный.',
    details: 'Конец не включается. slice() без аргументов — простой способ скопировать массив.',
    returns: 'Новый массив',
    example: "[1, 2, 3, 4].slice(1, 3) // [2, 3]",
  },
  {
    name: 'splice',
    signature: 'array.splice(индекс, сколькоУдалить, ...новые)',
    summary: 'Удаляет и вставляет элементы прямо в исходном массиве.',
    details: 'Меняет исходный массив! Если это нежелательно — сделайте копию через [...arr].',
    returns: 'Массив удалённых элементов',
    example: "const a = [1, 2, 3]; a.splice(1, 1) // a стал [1, 3]",
    mutates: true,
  },
  {
    name: 'sort',
    signature: 'array.sort(компаратор)',
    summary: 'Сортирует массив на месте.',
    details:
      'Без компаратора сортирует как строки: [10, 9] станет [10, 9]. Для чисел нужен (a, b) => a - b. ' +
      'Меняет исходный массив, поэтому обычно сортируют копию: [...arr].sort(...)',
    returns: 'Тот же массив',
    example: "[10, 9, 100].sort((a, b) => a - b) // [9, 10, 100]",
    mutates: true,
  },
  {
    name: 'join',
    signature: 'array.join(разделитель)',
    summary: 'Склеивает элементы в строку.',
    details: 'По умолчанию разделитель — запятая.',
    returns: 'Строка',
    example: "['a', 'b'].join(' — ') // 'a — b'",
  },
  {
    name: 'push',
    signature: 'array.push(значение)',
    summary: 'Добавляет элемент в конец.',
    details: 'Меняет исходный массив и возвращает новую длину.',
    returns: 'Число (новая длина)',
    example: 'const a = []; a.push(7) // a стал [7]',
    mutates: true,
  },
  {
    name: 'pop',
    signature: 'array.pop()',
    summary: 'Забирает последний элемент.',
    details: 'Меняет массив. Для пустого массива вернёт undefined.',
    returns: 'Удалённый элемент',
    example: '[1, 2].pop() // 2',
    mutates: true,
  },
  {
    name: 'concat',
    signature: 'array.concat(другойМассив)',
    summary: 'Соединяет массивы в новый.',
    details: 'Не меняет исходные. То же можно сделать через [...a, ...b].',
    returns: 'Новый массив',
    example: '[1].concat([2, 3]) // [1, 2, 3]',
  },
  {
    name: 'flat',
    signature: 'array.flat(глубина)',
    summary: 'Разворачивает вложенные массивы.',
    details: 'По умолчанию глубина 1. flat(Infinity) развернёт всё.',
    returns: 'Новый массив',
    example: '[[1, 2], [3]].flat() // [1, 2, 3]',
  },
  {
    name: 'reverse',
    signature: 'array.reverse()',
    summary: 'Переворачивает порядок элементов.',
    details: 'Меняет исходный массив — копируйте, если он ещё нужен.',
    returns: 'Тот же массив',
    example: '[1, 2, 3].reverse() // [3, 2, 1]',
    mutates: true,
  },
  {
    name: 'at',
    signature: 'array.at(индекс)',
    summary: 'Элемент по индексу, в том числе с конца.',
    details: 'at(-1) — последний элемент, это короче чем arr[arr.length - 1].',
    returns: 'Элемент или undefined',
    example: '[1, 2, 3].at(-1) // 3',
  },
  {
    name: 'length',
    kind: 'свойство',
    signature: 'array.length',
    summary: 'Количество элементов.',
    details: 'Это свойство, а не метод — скобки не нужны.',
    returns: 'Число',
    example: '[1, 2, 3].length // 3',
    insert: 'length',
  },
];

const string = [
  {
    name: 'split',
    signature: 'string.split(разделитель)',
    summary: 'Разбивает строку на массив.',
    details: "split('') разберёт строку на отдельные символы.",
    returns: 'Массив строк',
    example: "'a;b;c'.split(';') // ['a', 'b', 'c']",
  },
  {
    name: 'trim',
    signature: 'string.trim()',
    summary: 'Убирает пробелы по краям.',
    details: 'Внутри строки пробелы остаются. Есть также trimStart и trimEnd.',
    returns: 'Новая строка',
    example: "'  привет  '.trim() // 'привет'",
  },
  {
    name: 'toLowerCase',
    signature: 'string.toLowerCase()',
    summary: 'Переводит строку в нижний регистр.',
    details: 'Строки неизменяемы: возвращается новая строка, исходная остаётся прежней.',
    returns: 'Новая строка',
    example: "'СИГНАЛ'.toLowerCase() // 'сигнал'",
  },
  {
    name: 'toUpperCase',
    signature: 'string.toUpperCase()',
    summary: 'Переводит строку в верхний регистр.',
    details: 'Удобно для сравнения без учёта регистра.',
    returns: 'Новая строка',
    example: "'сигнал'.toUpperCase() // 'СИГНАЛ'",
  },
  {
    name: 'replace',
    signature: 'string.replace(что, наЧто)',
    summary: 'Заменяет первое вхождение.',
    details: 'Строковый аргумент заменит только первое совпадение — для всех нужен replaceAll.',
    returns: 'Новая строка',
    example: "'а-а'.replace('а', 'о') // 'о-а'",
  },
  {
    name: 'replaceAll',
    signature: 'string.replaceAll(что, наЧто)',
    summary: 'Заменяет все вхождения.',
    details: 'Самый простой способ вычистить шум из строки.',
    returns: 'Новая строка',
    example: "'a#b#c'.replaceAll('#', '') // 'abc'",
  },
  {
    name: 'includes',
    signature: 'string.includes(подстрока)',
    summary: 'Есть ли подстрока внутри строки.',
    details: 'Регистр важен: includes("А") и includes("а") — разные проверки.',
    returns: 'true или false',
    example: "'орбита'.includes('бит') // true",
  },
  {
    name: 'startsWith',
    signature: 'string.startsWith(подстрока)',
    summary: 'Начинается ли строка с подстроки.',
    details: 'Есть парный метод endsWith.',
    returns: 'true или false',
    example: "'CQ-1047'.startsWith('CQ') // true",
  },
  {
    name: 'endsWith',
    signature: 'string.endsWith(подстрока)',
    summary: 'Заканчивается ли строка подстрокой.',
    details: 'Удобно для проверки расширений и суффиксов.',
    returns: 'true или false',
    example: "'отчёт.txt'.endsWith('.txt') // true",
  },
  {
    name: 'slice',
    signature: 'string.slice(начало, конец)',
    summary: 'Вырезает часть строки.',
    details: 'Отрицательные индексы считаются с конца: slice(-3) — последние три символа.',
    returns: 'Новая строка',
    example: "'орбита'.slice(0, 3) // 'орб'",
  },
  {
    name: 'padStart',
    signature: 'string.padStart(длина, чем)',
    summary: 'Дополняет строку слева до нужной длины.',
    details: 'Классика — вывод времени: String(5).padStart(2, "0") даст "05".',
    returns: 'Новая строка',
    example: "'7'.padStart(3, '0') // '007'",
  },
  {
    name: 'repeat',
    signature: 'string.repeat(сколько)',
    summary: 'Повторяет строку несколько раз.',
    details: 'Пригодится для полосок прогресса и звёзд сложности.',
    returns: 'Новая строка',
    example: "'★'.repeat(3) // '★★★'",
  },
  {
    name: 'charAt',
    signature: 'string.charAt(индекс)',
    summary: 'Символ по индексу.',
    details: 'То же даёт обращение по индексу: str[0].',
    returns: 'Строка из одного символа',
    example: "'орбита'.charAt(0) // 'о'",
  },
  {
    name: 'length',
    kind: 'свойство',
    signature: 'string.length',
    summary: 'Длина строки в символах.',
    details: 'Свойство, скобки не нужны.',
    returns: 'Число',
    example: "'орбита'.length // 6",
    insert: 'length',
  },
];

const object = [
  {
    name: 'keys',
    owner: 'Object',
    signature: 'Object.keys(объект)',
    summary: 'Массив имён свойств.',
    details: 'Порядок — как при создании объекта (для строковых ключей).',
    returns: 'Массив строк',
    example: "Object.keys({a: 1, b: 2}) // ['a', 'b']",
  },
  {
    name: 'values',
    owner: 'Object',
    signature: 'Object.values(объект)',
    summary: 'Массив значений свойств.',
    details: 'Удобно сразу считать сумму: Object.values(o).reduce(...)',
    returns: 'Массив значений',
    example: 'Object.values({a: 1, b: 2}) // [1, 2]',
  },
  {
    name: 'entries',
    owner: 'Object',
    signature: 'Object.entries(объект)',
    summary: 'Массив пар [ключ, значение].',
    details: 'Идеально для перебора: for (const [key, value] of Object.entries(o)).',
    returns: 'Массив пар',
    example: "Object.entries({a: 1}) // [['a', 1]]",
  },
  {
    name: 'fromEntries',
    owner: 'Object',
    signature: 'Object.fromEntries(пары)',
    summary: 'Собирает объект из пар [ключ, значение].',
    details: 'Обратная операция к Object.entries.',
    returns: 'Объект',
    example: "Object.fromEntries([['a', 1]]) // {a: 1}",
  },
];

const math = [
  { name: 'round', owner: 'Math', signature: 'Math.round(число)', summary: 'Округляет до ближайшего целого.', details: 'Ровно 0.5 округляется вверх.', returns: 'Число', example: 'Math.round(41.6) // 42' },
  { name: 'floor', owner: 'Math', signature: 'Math.floor(число)', summary: 'Округляет вниз.', details: 'Для отрицательных уходит дальше от нуля: Math.floor(-1.2) = -2.', returns: 'Число', example: 'Math.floor(4.9) // 4' },
  { name: 'ceil', owner: 'Math', signature: 'Math.ceil(число)', summary: 'Округляет вверх.', details: 'Классика для «сколько контейнеров нужно».', returns: 'Число', example: 'Math.ceil(4.1) // 5' },
  { name: 'abs', owner: 'Math', signature: 'Math.abs(число)', summary: 'Модуль числа.', details: 'Убирает знак.', returns: 'Число', example: 'Math.abs(-7) // 7' },
  { name: 'min', owner: 'Math', signature: 'Math.min(a, b, ...)', summary: 'Наименьшее из чисел.', details: 'Массив передают через спред: Math.min(...arr).', returns: 'Число', example: 'Math.min(3, 9) // 3' },
  { name: 'max', owner: 'Math', signature: 'Math.max(a, b, ...)', summary: 'Наибольшее из чисел.', details: 'Ограничение сверху: Math.min(value, 100).', returns: 'Число', example: 'Math.max(3, 9) // 9' },
  { name: 'random', owner: 'Math', signature: 'Math.random()', summary: 'Случайное число от 0 до 1.', details: 'Единица не включается. Для целых: Math.floor(Math.random() * n).', returns: 'Число', example: 'Math.floor(Math.random() * 6) + 1' },
  { name: 'pow', owner: 'Math', signature: 'Math.pow(основание, степень)', summary: 'Возведение в степень.', details: 'То же делает оператор **: 2 ** 10.', returns: 'Число', example: 'Math.pow(2, 10) // 1024' },
  { name: 'sqrt', owner: 'Math', signature: 'Math.sqrt(число)', summary: 'Квадратный корень.', details: 'Для отрицательных вернёт NaN.', returns: 'Число', example: 'Math.sqrt(144) // 12' },
];

const number = [
  { name: 'isInteger', owner: 'Number', signature: 'Number.isInteger(значение)', summary: 'Целое ли число.', details: 'Строки не приводит: Number.isInteger("5") даст false.', returns: 'true или false', example: 'Number.isInteger(5.0) // true' },
  { name: 'parseFloat', owner: 'Number', signature: 'Number.parseFloat(строка)', summary: 'Читает дробное число из начала строки.', details: '«12.5кг» превратится в 12.5.', returns: 'Число', example: "Number.parseFloat('12.5кг') // 12.5" },
  { name: 'parseInt', owner: 'Number', signature: 'Number.parseInt(строка, основание)', summary: 'Читает целое число из начала строки.', details: 'Основание 10 указывают явно, чтобы не было сюрпризов.', returns: 'Число', example: "Number.parseInt('42px', 10) // 42" },
  { name: 'toFixed', owner: 'Number', kind: 'метод', signature: 'число.toFixed(знаков)', summary: 'Округляет до нужного числа знаков после запятой.', details: 'Возвращает строку, а не число!', returns: 'Строка', example: '(3.14159).toFixed(2) // "3.14"' },
];

const globals = [
  { name: 'console.log', owner: 'global', signature: 'console.log(...значения)', summary: 'Печатает значения — вывод виден под тестами.', details: 'Лучший способ понять, что реально пришло в функцию.', returns: 'undefined', example: "console.log('груз:', cargo)", insert: 'console.log' },
  { name: 'Number', owner: 'global', signature: 'Number(значение)', summary: 'Превращает значение в число.', details: 'Number("82") даст 82, Number("восемь") — NaN.', returns: 'Число', example: "Number('82') + 1 // 83" },
  { name: 'String', owner: 'global', signature: 'String(значение)', summary: 'Превращает значение в строку.', details: 'Работает и с числами, и с массивами.', returns: 'Строка', example: 'String(42).length // 2' },
  { name: 'Array.isArray', owner: 'global', signature: 'Array.isArray(значение)', summary: 'Проверяет, массив ли это.', details: 'typeof для массива даёт "object", поэтому нужен отдельный метод.', returns: 'true или false', example: 'Array.isArray([]) // true', insert: 'Array.isArray' },
  { name: 'Promise.resolve', owner: 'global', signature: 'Promise.resolve(значение)', summary: 'Готовый выполненный промис.', details: 'Удобно для заглушек в асинхронных задачах.', returns: 'Промис', example: 'await Promise.resolve(5) // 5', insert: 'Promise.resolve' },
  { name: 'Promise.all', owner: 'global', signature: 'Promise.all(массивПромисов)', summary: 'Ждёт все промисы разом.', details: 'Падает целиком, если хотя бы один промис отклонён.', returns: 'Промис с массивом', example: 'await Promise.all([p1, p2])', insert: 'Promise.all' },
];

const keywords = [
  { name: 'const', owner: 'global', kind: 'ключевое слово', signature: 'const имя = значение', summary: 'Объявляет переменную, которую нельзя переприсвоить.', details: 'Содержимое массива или объекта менять при этом можно.', returns: '—', example: 'const limit = 100;', insert: 'const ' },
  { name: 'let', owner: 'global', kind: 'ключевое слово', signature: 'let имя = значение', summary: 'Переменная, которую можно менять.', details: 'Нужна для счётчиков и накопителей.', returns: '—', example: 'let total = 0;', insert: 'let ' },
  { name: 'return', owner: 'global', kind: 'ключевое слово', signature: 'return значение', summary: 'Возвращает результат из функции.', details: 'Забытый return — причина большинства «получено undefined».', returns: '—', example: 'return total;', insert: 'return ' },
  { name: 'function', owner: 'global', kind: 'шаблон', signature: 'function имя(параметры) { }', summary: 'Объявление функции.', details: 'Имя должно совпадать с тем, что ждут тесты.', returns: '—', example: 'function totalMass(cargo) {\n  \n}', insert: 'function имя() {\n  \n}' },
  { name: 'for...of', owner: 'global', kind: 'шаблон', signature: 'for (const item of массив) { }', summary: 'Перебор значений массива.', details: 'Даёт сами элементы, а не индексы — читается лучше обычного for.', returns: '—', example: 'for (const item of cargo) {\n  total += item.mass;\n}', insert: 'for (const item of массив) {\n  \n}' },
  { name: 'for', owner: 'global', kind: 'шаблон', signature: 'for (let i = 0; i < n; i++) { }', summary: 'Цикл со счётчиком.', details: 'Нужен, когда важны индексы — например, при обходе матрицы.', returns: '—', example: 'for (let i = 0; i < grid.length; i++) {\n  \n}', insert: 'for (let i = 0; i < n; i++) {\n  \n}' },
  { name: 'if', owner: 'global', kind: 'шаблон', signature: 'if (условие) { }', summary: 'Выполняет блок кода, если условие истинно.', details: 'Проверки пишут от самой строгой к самой мягкой.', returns: '—', example: 'if (capacity === 0) return 0;', insert: 'if (условие) {\n  \n}' },
  { name: 'class', owner: 'global', kind: 'шаблон', signature: 'class Имя { constructor() {} }', summary: 'Объявление класса.', details: 'Поля сохраняют через this внутри constructor.', returns: '—', example: 'class ShipModule {\n  constructor(name) {\n    this.name = name;\n  }\n}', insert: 'class Имя {\n  constructor() {\n    \n  }\n}' },
  { name: 'async', owner: 'global', kind: 'ключевое слово', signature: 'async function имя() { }', summary: 'Делает функцию асинхронной.', details: 'Такая функция всегда возвращает промис, внутри работает await.', returns: '—', example: 'async function load() {\n  const data = await read();\n}', insert: 'async ' },
  { name: 'await', owner: 'global', kind: 'ключевое слово', signature: 'await промис', summary: 'Ждёт выполнения промиса.', details: 'Работает только внутри async-функции.', returns: 'Значение промиса', example: 'const value = await probe.read();', insert: 'await ' },
];

/** Полный список записей с проставленными значениями по умолчанию. */
export const JS_API = [
  ...array.map(item => ({ owner: 'Array', kind: 'метод', ...item })),
  ...string.map(item => ({ owner: 'String', kind: 'метод', ...item })),
  ...object.map(item => ({ kind: 'статический метод', ...item })),
  ...math.map(item => ({ kind: 'статический метод', ...item })),
  ...number.map(item => ({ kind: 'статический метод', ...item })),
  ...globals.map(item => ({ kind: 'функция', ...item })),
  ...keywords,
].map(item => ({
  ...item,
  insert: item.insert ?? (item.kind.includes('метод') || item.kind === 'функция' ? `${item.name}(` : item.name),
}));

/** Записи, доступные через точку у значения конкретного типа. */
export const MEMBERS_BY_TYPE = {
  Array: JS_API.filter(item => item.owner === 'Array'),
  String: JS_API.filter(item => item.owner === 'String'),
  Object: JS_API.filter(item => item.owner === 'Object'),
  Math: JS_API.filter(item => item.owner === 'Math'),
  Number: JS_API.filter(item => item.owner === 'Number'),
};

/** Запись по полному имени — для окна описания. */
export function apiByName(name, owner) {
  return JS_API.find(item => item.name === name && (!owner || item.owner === owner)) ?? null;
}
