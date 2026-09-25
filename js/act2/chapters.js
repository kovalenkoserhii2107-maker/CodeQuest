/**
 * Второй акт: главы комбината «Передел».
 *
 * В первом акте игрок писал функцию. Здесь он ведёт проект: файлы,
 * импорты, точка входа. Поэтому у главы два вида проверок — структура
 * проекта (появился ли файл, связан ли импортом) и поведение кода,
 * который движок грузит настоящими модулями.
 */
import { SAMPLE_BATCH, PRICES, BURN_LOSS } from './scrap.js';

/** Партия для проверок: та же, что в примерах задания. */
const BATCH = SAMPLE_BATCH;

/** Вторая партия — на ней видно, что решение не подогнано под первую. */
const OTHER_BATCH = [
  { id: 'B-1', kind: 'copper', mass: 25 },
  { id: 'B-2', kind: 'steel', mass: 50 },
  { id: 'B-3', kind: 'slag', mass: 5 },
];

export const CHAPTERS = [
  {
    id: 'intake',
    order: 1,
    title: 'Приёмка и первый модуль',
    topic: 'Точка входа, экспорт, импорт',
    reward: { credits: 40000, xp: 220 },
    story:
      'Комбинат достался вам вместе с горой лома и пустым пультом. Линия не тронется, '
      + 'пока на пульте нет программы: диспетчер запускает файл index.js и ждёт от него смену.',
    brief:
      'Проект начинается с двух файлов.\n'
      + '• Создайте файл sort.js и экспортируйте из него функцию sortScrap(batch).\n'
      + '  На входе партия — массив объектов { kind, mass }. Вернуть нужно объект с массой по фракциям:\n'
      + '  { сталь, медь, отходы } — всё, что не сталь и не медь, идёт в отходы.\n'
      + '• В index.js импортируйте sortScrap из ./sort.js и экспортируйте функцию runShift(batch),\n'
      + '  которая вернёт { принято, фракции }: принято — общая масса партии, фракции — результат сортировки.\n'
      + 'Массы целые, складывайте как есть.',
    lesson: [
      {
        title: 'Файл сам по себе ничего не отдаёт наружу',
        text:
          'Пока перед функцией не написано export, для соседнего файла её не существует. '
          + 'Экспорт — это список того, что модуль показывает другим.',
        code: 'export function sortScrap(batch) {\n  return { сталь: 0, медь: 0, отходы: 0 };\n}',
      },
      {
        title: 'Импорт называет и файл, и имя',
        text:
          'Путь начинается с ./ — это «файл рядом со мной». Имя в фигурных скобках должно '
          + 'совпадать с экспортированным: движок ищет именно его.',
        code: "import { sortScrap } from './sort.js';",
      },
      {
        title: 'Точка входа — это тоже модуль',
        text:
          'index.js ничем не особеннее остальных файлов. Особенное у него одно: диспетчер '
          + 'запускает именно его и вызывает то, что он экспортировал.',
        code: "import { sortScrap } from './sort.js';\n\nexport function runShift(batch) {\n  return { принято: 0, фракции: sortScrap(batch) };\n}",
      },
    ],
    hints: [
      'Файл создаётся кнопкой «Новый файл» слева. Назовите его ровно sort.js.',
      'Сумму массы удобно копить reduce, но обычный цикл for…of тоже подойдёт.',
      'Всё, что не steel и не copper, попадает в отходы — отдельная ветка else.',
    ],
    starters: {
      'index.js':
        '// Точка входа: диспетчер запускает этот файл и вызывает runShift\n'
        + '\n'
        + 'export function runShift(batch) {\n'
        + '  return { принято: 0, фракции: { сталь: 0, медь: 0, отходы: 0 } };\n'
        + '}\n',
    },
    structure: [
      {
        name: 'В проекте есть sort.js',
        test: files => typeof files['sort.js'] === 'string' && files['sort.js'].trim().length > 0,
        fix: 'Создайте файл sort.js кнопкой «Новый файл».',
      },
      {
        name: 'sort.js экспортирует sortScrap',
        test: files => /export\s+(?:function\s+sortScrap|const\s+sortScrap|\{[^}]*\bsortScrap\b)/.test(files['sort.js'] ?? ''),
        fix: 'Перед функцией нужно слово export, иначе index.js её не увидит.',
      },
      {
        name: 'index.js импортирует ./sort.js',
        test: files => /from\s*['"]\.\/sort\.js['"]/.test(files['index.js'] ?? ''),
        fix: 'Добавьте в index.js строку импорта из ./sort.js.',
      },
    ],
    checks: [
      {
        name: 'Учебная партия',
        fn: 'runShift',
        args: [BATCH],
        expected: { принято: 100, фракции: { сталь: 70, медь: 12, отходы: 18 } },
      },
      {
        name: 'Другая партия — тот же расчёт',
        fn: 'runShift',
        args: [OTHER_BATCH],
        expected: { принято: 80, фракции: { сталь: 50, медь: 25, отходы: 5 } },
      },
      {
        name: 'Пустая партия ничего не ломает',
        fn: 'runShift',
        args: [[]],
        expected: { принято: 0, фракции: { сталь: 0, медь: 0, отходы: 0 } },
      },
    ],
    solution: {
      'sort.js':
        'export function sortScrap(batch) {\n'
        + '  const фракции = { сталь: 0, медь: 0, отходы: 0 };\n'
        + '\n'
        + '  for (const item of batch) {\n'
        + '    if (item.kind === "steel") фракции.сталь += item.mass;\n'
        + '    else if (item.kind === "copper") фракции.медь += item.mass;\n'
        + '    else фракции.отходы += item.mass;\n'
        + '  }\n'
        + '\n'
        + '  return фракции;\n'
        + '}\n',
      'index.js':
        'import { sortScrap } from "./sort.js";\n'
        + '\n'
        + 'export function runShift(batch) {\n'
        + '  const принято = batch.reduce((sum, item) => sum + item.mass, 0);\n'
        + '\n'
        + '  return { принято, фракции: sortScrap(batch) };\n'
        + '}\n',
    },
  },

  {
    id: 'furnace',
    order: 2,
    title: 'Печь помнит садку',
    topic: 'Состояние модуля и время его жизни',
    reward: { credits: 55000, xp: 260 },
    story:
      'Сталь поехала к печи. Печь не плавит по одной чушке: в неё набирают садку, '
      + 'а потом дают жар. Значит, кто-то должен помнить, сколько уже набрано.',
    brief:
      'Создайте файл furnace.js и экспортируйте из него две функции.\n'
      + '• charge(mass) — добавляет массу в садку и возвращает, сколько в ней стало.\n'
      + '• melt() — плавит всё, что набрано: возвращает металл с угаром 8 % '
      + '(масса × 0.92, округление до сотых) и оставляет печь пустой.\n'
      + 'Набранное между вызовами должно сохраняться — держите его переменной на уровне модуля.\n'
      + 'В index.js догрузите сталь в печь и верните из runShift ещё одно поле: металл.',
    lesson: [
      {
        title: 'Тело модуля выполняется один раз за прогон',
        text:
          'Строки вне функций срабатывают при первом импорте — и больше не повторяются, '
          + 'сколько бы раз вы ни вызвали экспортированные функции. Поэтому переменная '
          + 'на уровне модуля живёт между вызовами.',
        code: 'let садка = 0;            // выполнится один раз\n\nexport function charge(mass) {\n  садка += mass;          // а это — на каждый вызов\n  return садка;\n}',
      },
      {
        title: 'Но между прогонами память не переносится',
        text:
          'Каждый запуск смены собирает проект заново, в чистой среде: печь снова пуста. '
          + 'Это не баг, а свойство среды — на него опирается повторяемость расчёта.',
        code: '// прогон 1: charge(10) → 10\n// прогон 2: charge(10) → 10, а не 20',
      },
      {
        title: 'Состояние прячут за функциями',
        text:
          'Саму переменную наружу не отдают. Экспортируются действия — charge и melt, — '
          + 'и только они решают, как меняется садка.',
      },
    ],
    hints: [
      'Переменную объявляйте до функций, вне их тела: let садка = 0;',
      'melt должен не только вернуть металл, но и обнулить садку.',
      'Округление до сотых: Math.round(x * 100) / 100.',
    ],
    structure: [
      {
        name: 'В проекте есть furnace.js',
        test: files => typeof files['furnace.js'] === 'string' && files['furnace.js'].trim().length > 0,
        fix: 'Создайте файл furnace.js.',
      },
      {
        name: 'Садка хранится на уровне модуля',
        test: files => /^\s*(?:let|var)\s+\S+\s*=/m.test(files['furnace.js'] ?? ''),
        fix: 'Объявите переменную садки вне функций — тогда она переживёт вызов.',
      },
      {
        name: 'index.js импортирует ./furnace.js',
        test: files => /from\s*['"]\.\/furnace\.js['"]/.test(files['index.js'] ?? ''),
        fix: 'Подключите печь к точке входа.',
      },
    ],
    checks: [
      {
        name: 'Садка копится',
        fn: 'charge',
        entry: 'furnace.js',
        args: [10],
        expected: 10,
      },
      {
        name: 'Смена считает металл',
        fn: 'runShift',
        args: [BATCH],
        expected: { принято: 100, фракции: { сталь: 70, медь: 12, отходы: 18 }, металл: 64.4 },
      },
      {
        name: 'Другая партия — другой металл',
        fn: 'runShift',
        args: [OTHER_BATCH],
        expected: { принято: 80, фракции: { сталь: 50, медь: 25, отходы: 5 }, металл: 46 },
      },
    ],
    solution: {
      'furnace.js':
        '// Эта строка выполняется один раз за прогон — на ней и держится память печи\n'
        + 'let садка = 0;\n'
        + '\n'
        + 'export function charge(mass) {\n'
        + '  садка += mass;\n'
        + '  return садка;\n'
        + '}\n'
        + '\n'
        + 'export function melt() {\n'
        + '  const металл = Math.round(садка * 0.92 * 100) / 100;\n'
        + '  садка = 0;\n'
        + '\n'
        + '  return металл;\n'
        + '}\n',
      'index.js':
        'import { sortScrap } from "./sort.js";\n'
        + 'import { charge, melt } from "./furnace.js";\n'
        + '\n'
        + 'export function runShift(batch) {\n'
        + '  const принято = batch.reduce((sum, item) => sum + item.mass, 0);\n'
        + '  const фракции = sortScrap(batch);\n'
        + '\n'
        + '  charge(фракции.сталь);\n'
        + '\n'
        + '  return { принято, фракции, металл: melt() };\n'
        + '}\n',
    },
  },

  {
    id: 'settings',
    order: 3,
    title: 'Настройки среды',
    topic: 'Конфигурация отдельно от логики',
    reward: { credits: 70000, xp: 300 },
    story:
      'Угар печи и цены на отгрузке меняются каждый квартал. Сейчас они вписаны прямо в код, '
      + 'и правка одного числа означает поход по всем файлам. Так на производстве не работают.',
    brief:
      'Вынесите числа в отдельный файл config.js и экспортируйте из него:\n'
      + `• УГАР — доля потерь при плавке (${BURN_LOSS});\n`
      + `• ЦЕНА_СТАЛИ — ${PRICES.steel} ¢ за тонну;\n`
      + `• ЦЕНА_МЕДИ — ${PRICES.copper} ¢ за тонну.\n`
      + 'furnace.js должен брать угар оттуда, а не держать 0.92 у себя.\n'
      + 'Создайте market.js с функцией revenue(металл, медь) — выручка смены, целое число.\n'
      + 'runShift возвращает ещё одно поле: выручка.',
    lesson: [
      {
        title: 'Число в коде живёт в одном месте',
        text:
          'Как только значение нужно двум файлам, оно переезжает в конфигурацию. '
          + 'Иначе в проекте появляются две правды, и однажды они разойдутся.',
        code: 'export const УГАР = 0.08;\nexport const ЦЕНА_СТАЛИ = 320;',
      },
      {
        title: 'Импорт константы ничем не отличается от импорта функции',
        text: 'Модуль отдаёт наружу любые значения — движку всё равно, функция это или число.',
        code: 'import { УГАР } from "./config.js";',
      },
      {
        title: 'Так появляются среды',
        text:
          'Один и тот же код с разным config.js — это тестовый стенд и боевая линия. '
          + 'Дальше в акте появится вторая конфигурация, и менять придётся ровно один файл.',
      },
    ],
    hints: [
      'В furnace.js остаётся расчёт, а число уезжает: масса × (1 - УГАР).',
      'revenue считает по двум ценам: металл × ЦЕНА_СТАЛИ + медь × ЦЕНА_МЕДИ.',
      'Выручку округляйте до целого: Math.round(...).',
    ],
    structure: [
      {
        name: 'В проекте есть config.js',
        test: files => typeof files['config.js'] === 'string' && files['config.js'].trim().length > 0,
        fix: 'Создайте config.js и вынесите туда числа.',
      },
      {
        name: 'В проекте есть market.js',
        test: files => typeof files['market.js'] === 'string' && files['market.js'].trim().length > 0,
        fix: 'Создайте market.js с функцией revenue.',
      },
      {
        name: 'furnace.js берёт угар из настроек',
        test: files => /from\s*['"]\.\/config\.js['"]/.test(files['furnace.js'] ?? ''),
        fix: 'Печь должна импортировать УГАР из ./config.js, а не хранить 0.92.',
      },
      {
        name: 'В печи не осталось зашитого числа',
        test: files => !/0\.92/.test(files['furnace.js'] ?? ''),
        fix: 'Замените 0.92 на расчёт через УГАР.',
      },
    ],
    checks: [
      {
        name: 'Настройки отдают числа',
        fn: 'revenue',
        entry: 'market.js',
        args: [10, 1],
        expected: PRICES.steel * 10 + PRICES.copper,
      },
      {
        name: 'Смена считает выручку',
        fn: 'runShift',
        args: [BATCH],
        expected: {
          принято: 100,
          фракции: { сталь: 70, медь: 12, отходы: 18 },
          металл: 64.4,
          выручка: Math.round(64.4 * PRICES.steel + 12 * PRICES.copper),
        },
      },
      {
        name: 'Другая партия — своя выручка',
        fn: 'runShift',
        args: [OTHER_BATCH],
        expected: {
          принято: 80,
          фракции: { сталь: 50, медь: 25, отходы: 5 },
          металл: 46,
          выручка: Math.round(46 * PRICES.steel + 25 * PRICES.copper),
        },
      },
    ],
    solution: {
      'config.js':
        '// Одно место, где живут числа комбината\n'
        + `export const УГАР = ${BURN_LOSS};\n`
        + `export const ЦЕНА_СТАЛИ = ${PRICES.steel};\n`
        + `export const ЦЕНА_МЕДИ = ${PRICES.copper};\n`,
      'market.js':
        'import { ЦЕНА_СТАЛИ, ЦЕНА_МЕДИ } from "./config.js";\n'
        + '\n'
        + 'export function revenue(металл, медь) {\n'
        + '  return Math.round(металл * ЦЕНА_СТАЛИ + медь * ЦЕНА_МЕДИ);\n'
        + '}\n',
      'furnace.js':
        'import { УГАР } from "./config.js";\n'
        + '\n'
        + 'let садка = 0;\n'
        + '\n'
        + 'export function charge(mass) {\n'
        + '  садка += mass;\n'
        + '  return садка;\n'
        + '}\n'
        + '\n'
        + 'export function melt() {\n'
        + '  const металл = Math.round(садка * (1 - УГАР) * 100) / 100;\n'
        + '  садка = 0;\n'
        + '\n'
        + '  return металл;\n'
        + '}\n',
      'index.js':
        'import { sortScrap } from "./sort.js";\n'
        + 'import { charge, melt } from "./furnace.js";\n'
        + 'import { revenue } from "./market.js";\n'
        + '\n'
        + 'export function runShift(batch) {\n'
        + '  const принято = batch.reduce((sum, item) => sum + item.mass, 0);\n'
        + '  const фракции = sortScrap(batch);\n'
        + '\n'
        + '  charge(фракции.сталь);\n'
        + '  const металл = melt();\n'
        + '\n'
        + '  return { принято, фракции, металл, выручка: revenue(металл, фракции.медь) };\n'
        + '}\n',
    },
  },
];

export function chapterById(id) {
  return CHAPTERS.find(chapter => chapter.id === id) ?? null;
}

/** Главы по порядку: следующая открывается за предыдущей. */
export function chapterChain() {
  return [...CHAPTERS].sort((a, b) => a.order - b.order);
}
