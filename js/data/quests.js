/**
 * Секторы карты и учебные задачи.
 *
 * Тест задачи описывается одним из двух способов:
 *   { name, args: [...], expected }  — функцию вызовут с этими аргументами;
 *   { name, expr: 'return ...', expected } — тело функции, внутри доступна
 *   решаемая функция (или класс) по имени. Второй способ нужен там, где
 *   аргумент — колбэк или объект с методами (такое нельзя передать в воркер).
 *
 * Результат сравнивается глубоким сравнением; промисы ожидаются через await.
 */

export const SECTORS = [
  {
    id: 'dock',
    name: 'Док «Гелиос-9»',
    x: 120,
    y: 300,
    module: 'reactor',
    brief: 'Стартовая орбита. Пока реактор не выведен на режим, дальше не уйти.',
    requires: [],
  },
  {
    id: 'belt',
    name: 'Пояс астероидов',
    x: 340,
    y: 170,
    module: 'cargo',
    brief: 'Здесь корпорация добывает руду. Нужно навести порядок в трюме.',
    requires: ['fuel-percent', 'reactor-status'],
  },
  {
    id: 'relay',
    name: 'Ретранслятор R-14',
    x: 560,
    y: 330,
    module: 'comms',
    brief: 'Станция ловит обрывки сигналов. Их нужно расшифровать и разобрать.',
    requires: ['total-mass'],
  },
  {
    id: 'mars',
    name: 'Орбита Марса',
    x: 780,
    y: 180,
    module: 'navigation',
    brief: 'Транспортный узел: десятки маршрутов, и все нужно отсортировать.',
    requires: ['decode-signal'],
  },
  {
    id: 'deep',
    name: 'Сектор Ξ-7',
    x: 960,
    y: 380,
    module: 'shields',
    brief: 'Аномалия за поясом. Щиты держатся на честном слове, зонды молчат.',
    requires: ['sort-routes'],
  },
];

/** Связи между секторами — по ним рисуются маршруты на карте. */
export const ROUTES = [
  ['dock', 'belt'],
  ['belt', 'relay'],
  ['relay', 'mars'],
  ['mars', 'deep'],
  ['dock', 'relay'],
];

export const QUESTS = [
  /* ------------------------------------------------------------------ */
  /* Сектор: Док «Гелиос-9» — реактор                                    */
  /* ------------------------------------------------------------------ */
  {
    id: 'fuel-percent',
    sector: 'dock',
    module: 'reactor',
    title: 'Датчик топлива',
    difficulty: 1,
    topic: 'Переменные, числа, Math',
    reward: { credits: 80, xp: 40 },
    brief:
      'Бортовой датчик показывает запас топлива в тоннах, а экипажу нужен процент. ' +
      'Напишите функцию fuelPercent(current, capacity): она возвращает заполненность ' +
      'бака в процентах, округлённую до целого. Если ёмкость равна нулю, верните 0 — ' +
      'делить на ноль нельзя.',
    theory: [
      'Числа в JavaScript делятся без остатка целочисленности: 1 / 3 даст 0.333…',
      'Math.round(x) округляет до ближайшего целого: Math.round(41.6) → 42.',
      'Условие можно записать коротко: if (capacity === 0) return 0;',
    ],
    fn: 'fuelPercent',
    starter:
      'function fuelPercent(current, capacity) {\n' +
      '  // 1. защититесь от нулевой ёмкости\n' +
      '  // 2. посчитайте долю и переведите её в проценты\n' +
      '  // 3. округлите результат\n' +
      '}\n',
    hints: [
      'Доля = current / capacity. Проценты — это доля, умноженная на 100.',
      'Округление: Math.round(current / capacity * 100).',
    ],
    solution:
      'function fuelPercent(current, capacity) {\n' +
      '  if (capacity === 0) return 0;\n' +
      '  return Math.round((current / capacity) * 100);\n' +
      '}\n',
    tests: [
      { name: 'Полный бак', args: [400, 400], expected: 100 },
      { name: 'Половина бака', args: [200, 400], expected: 50 },
      { name: 'Округление вверх', args: [123, 400], expected: 31 },
      { name: 'Пустой бак', args: [0, 400], expected: 0 },
      { name: 'Нулевая ёмкость', args: [50, 0], expected: 0 },
    ],
  },
  {
    id: 'reactor-status',
    sector: 'dock',
    module: 'reactor',
    title: 'Диагностика реактора',
    difficulty: 1,
    topic: 'Условия, логические операторы',
    reward: { credits: 110, xp: 55 },
    brief:
      'Функция reactorStatus(temperature, pressure) возвращает строку состояния:\n' +
      '• "тревога" — если температура 900 и выше ИЛИ давление 12 и выше;\n' +
      '• "внимание" — если температура 700 и выше ИЛИ давление 9 и выше;\n' +
      '• "норма" — во всех остальных случаях.\n' +
      'Порядок проверок важен: сначала самое опасное.',
    theory: [
      'Оператор || («или») истинен, когда истинно хотя бы одно условие.',
      'if / else if / else проверяются сверху вниз — первое подошедшее и сработает.',
      'Сравнение «больше или равно» — это >=.',
    ],
    fn: 'reactorStatus',
    starter:
      'function reactorStatus(temperature, pressure) {\n' +
      '  // сначала проверьте аварийные пороги, затем предупреждающие\n' +
      '}\n',
    hints: [
      'Начните с самого строгого условия: if (temperature >= 900 || pressure >= 12) ...',
      'Последним поставьте return "норма" — это ветка else.',
    ],
    solution:
      'function reactorStatus(temperature, pressure) {\n' +
      '  if (temperature >= 900 || pressure >= 12) return "тревога";\n' +
      '  if (temperature >= 700 || pressure >= 9) return "внимание";\n' +
      '  return "норма";\n' +
      '}\n',
    tests: [
      { name: 'Спокойный режим', args: [520, 4], expected: 'норма' },
      { name: 'Горячий реактор', args: [740, 5], expected: 'внимание' },
      { name: 'Высокое давление', args: [500, 10], expected: 'внимание' },
      { name: 'Критическая температура', args: [905, 3], expected: 'тревога' },
      { name: 'Критическое давление', args: [600, 12], expected: 'тревога' },
      { name: 'Граница нормы', args: [699, 8], expected: 'норма' },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Сектор: Пояс астероидов — грузовой трюм                             */
  /* ------------------------------------------------------------------ */
  {
    id: 'total-mass',
    sector: 'belt',
    module: 'cargo',
    title: 'Опись груза',
    difficulty: 2,
    topic: 'Массивы: reduce',
    reward: { credits: 130, xp: 60 },
    brief:
      'В трюме лежит массив контейнеров вида { name: "Руда", mass: 120 }. ' +
      'Функция totalMass(cargo) должна вернуть суммарную массу всех контейнеров. ' +
      'Для пустого трюма — 0.',
    theory: [
      'reduce «сворачивает» массив в одно значение: arr.reduce((acc, item) => ..., 0).',
      'acc — накопитель, второй аргумент reduce — его стартовое значение.',
      'То же можно сделать обычным циклом for…of — оба решения верны.',
    ],
    fn: 'totalMass',
    starter:
      'function totalMass(cargo) {\n' +
      '  // сложите поле mass каждого контейнера\n' +
      '}\n',
    hints: [
      'cargo.reduce((sum, item) => sum + item.mass, 0)',
      'Не забудьте стартовое значение 0 — иначе пустой массив выбросит ошибку.',
    ],
    solution:
      'function totalMass(cargo) {\n' +
      '  return cargo.reduce((sum, item) => sum + item.mass, 0);\n' +
      '}\n',
    tests: [
      {
        name: 'Три контейнера',
        args: [[{ name: 'Руда', mass: 120 }, { name: 'Вода', mass: 40 }, { name: 'Ячейки', mass: 15 }]],
        expected: 175,
      },
      { name: 'Один контейнер', args: [[{ name: 'Титан', mass: 860 }]], expected: 860 },
      { name: 'Пустой трюм', args: [[]], expected: 0 },
    ],
  },
  {
    id: 'heavy-cargo',
    sector: 'belt',
    module: 'cargo',
    title: 'Перегруз',
    difficulty: 2,
    topic: 'Массивы: filter + map',
    reward: { credits: 140, xp: 65 },
    brief:
      'Функция heavyCargo(cargo, limit) возвращает массив названий контейнеров, ' +
      'масса которых строго больше limit. Порядок — как в исходном массиве. ' +
      'Если таких нет, вернётся пустой массив.',
    theory: [
      'filter оставляет элементы, для которых колбэк вернул true.',
      'map превращает каждый элемент в новое значение.',
      'Методы можно соединять в цепочку: arr.filter(...).map(...)',
    ],
    fn: 'heavyCargo',
    starter:
      'function heavyCargo(cargo, limit) {\n' +
      '  // отберите тяжёлые контейнеры и верните только их названия\n' +
      '}\n',
    hints: [
      'Сначала filter по item.mass > limit, затем map в item.name.',
      'Строго больше — это >, а не >=.',
    ],
    solution:
      'function heavyCargo(cargo, limit) {\n' +
      '  return cargo.filter(item => item.mass > limit).map(item => item.name);\n' +
      '}\n',
    tests: [
      {
        name: 'Два тяжёлых',
        args: [[{ name: 'Руда', mass: 120 }, { name: 'Вода', mass: 40 }, { name: 'Титан', mass: 300 }], 100],
        expected: ['Руда', 'Титан'],
      },
      {
        name: 'Граница не считается',
        args: [[{ name: 'Руда', mass: 100 }], 100],
        expected: [],
      },
      { name: 'Пустой трюм', args: [[], 10], expected: [] },
    ],
  },
  {
    id: 'pack-containers',
    sector: 'belt',
    module: 'cargo',
    title: 'Погрузка по контейнерам',
    difficulty: 3,
    topic: 'Циклы и накопление состояния',
    reward: { credits: 170, xp: 80 },
    brief:
      'Ящики грузят по порядку в контейнеры вместимостью capacity тонн. ' +
      'Если очередной ящик не влезает в текущий контейнер — берут новый. ' +
      'Функция packContainers(boxes, capacity) принимает массив чисел (массы ящиков) ' +
      'и возвращает количество использованных контейнеров. Пустой список — 0.',
    theory: [
      'Заведите переменные: счётчик контейнеров и текущую загрузку.',
      'Цикл for…of перебирает значения массива по очереди.',
      'Ящик, равный вместимости, помещается ровно — это не перегруз.',
    ],
    fn: 'packContainers',
    starter:
      'function packContainers(boxes, capacity) {\n' +
      '  // идите по ящикам и открывайте новый контейнер, когда место кончилось\n' +
      '}\n',
    hints: [
      'Стартуйте с containers = 0 и current = 0, первый же ящик откроет контейнер.',
      'Если current + box > capacity — увеличьте счётчик и обнулите current.',
    ],
    solution:
      'function packContainers(boxes, capacity) {\n' +
      '  let containers = 0;\n' +
      '  let current = 0;\n' +
      '  for (const box of boxes) {\n' +
      '    if (containers === 0 || current + box > capacity) {\n' +
      '      containers += 1;\n' +
      '      current = 0;\n' +
      '    }\n' +
      '    current += box;\n' +
      '  }\n' +
      '  return containers;\n' +
      '}\n',
    tests: [
      { name: 'Ровно один контейнер', args: [[40, 30, 30], 100], expected: 1 },
      { name: 'Нужен второй', args: [[40, 30, 40], 100], expected: 2 },
      { name: 'Каждый ящик свой', args: [[90, 95, 100], 100], expected: 3 },
      { name: 'Пустая погрузка', args: [[], 100], expected: 0 },
      { name: 'Ящик ровно по объёму', args: [[100, 100], 100], expected: 2 },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Сектор: Ретранслятор R-14 — связь                                   */
  /* ------------------------------------------------------------------ */
  {
    id: 'decode-signal',
    sector: 'relay',
    module: 'comms',
    title: 'Расшифровка сигнала',
    difficulty: 2,
    topic: 'Строки: replace, split, trim',
    reward: { credits: 150, xp: 70 },
    brief:
      'Сигнал приходит с помехами: символ "#" — это шум, символ "_" — пробел, ' +
      'регистр произвольный. Функция decodeSignal(signal) должна убрать все "#", ' +
      'заменить "_" на пробелы, привести текст к нижнему регистру и обрезать ' +
      'пробелы по краям.',
    theory: [
      'replaceAll("#", "") удаляет все вхождения символа.',
      'split("_").join(" ") — ещё один способ заменить разделитель.',
      'toLowerCase() и trim() возвращают новую строку, исходная не меняется.',
    ],
    fn: 'decodeSignal',
    starter:
      'function decodeSignal(signal) {\n' +
      '  // уберите шум, замените подчёркивания, приведите к нижнему регистру\n' +
      '}\n',
    hints: [
      'Методы строк можно вызывать цепочкой: signal.replaceAll(...).replaceAll(...)',
      'trim() применяйте в самом конце, когда подчёркивания уже стали пробелами.',
    ],
    solution:
      'function decodeSignal(signal) {\n' +
      '  return signal\n' +
      '    .replaceAll("#", "")\n' +
      '    .replaceAll("_", " ")\n' +
      '    .toLowerCase()\n' +
      '    .trim();\n' +
      '}\n',
    tests: [
      { name: 'Простой сигнал', args: ['SOS_ГЕЛИОС'], expected: 'sos гелиос' },
      { name: 'С шумом', args: ['A#VRO#RA_НА_КУРСЕ'], expected: 'avrora на курсе' },
      { name: 'Пробелы по краям', args: ['_ТРЕВОГА_'], expected: 'тревога' },
      { name: 'Только шум', args: ['###'], expected: '' },
    ],
  },
  {
    id: 'parse-telemetry',
    sector: 'relay',
    module: 'comms',
    title: 'Разбор телеметрии',
    difficulty: 3,
    topic: 'Строки → объект, Number',
    reward: { credits: 180, xp: 85 },
    brief:
      'Телеметрия приходит строкой вида "fuel=82;shield=54;crew=12". ' +
      'Функция parseTelemetry(raw) должна вернуть объект { fuel: 82, shield: 54, crew: 12 } — ' +
      'значения именно числами, а не строками. Пустая строка даёт пустой объект {}.',
    theory: [
      'split(";") разобьёт строку на пары "ключ=значение".',
      'Каждую пару можно снова разбить: const [key, value] = pair.split("=").',
      'Number("82") превращает строку в число 82.',
    ],
    fn: 'parseTelemetry',
    starter:
      'function parseTelemetry(raw) {\n' +
      '  const result = {};\n' +
      '  // разберите строку на пары и заполните объект\n' +
      '  return result;\n' +
      '}\n',
    hints: [
      'Если raw пустая — сразу верните {}.',
      'Записать свойство по вычисляемому имени: result[key] = Number(value);',
    ],
    solution:
      'function parseTelemetry(raw) {\n' +
      '  const result = {};\n' +
      '  if (raw === "") return result;\n' +
      '  for (const pair of raw.split(";")) {\n' +
      '    const [key, value] = pair.split("=");\n' +
      '    result[key] = Number(value);\n' +
      '  }\n' +
      '  return result;\n' +
      '}\n',
    tests: [
      { name: 'Три параметра', args: ['fuel=82;shield=54;crew=12'], expected: { fuel: 82, shield: 54, crew: 12 } },
      { name: 'Один параметр', args: ['fuel=100'], expected: { fuel: 100 } },
      { name: 'Пустая строка', args: [''], expected: {} },
      { name: 'Значения — числа', args: ['x=7'], expected: { x: 7 } },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Сектор: Орбита Марса — навигация                                    */
  /* ------------------------------------------------------------------ */
  {
    id: 'sort-routes',
    sector: 'mars',
    module: 'navigation',
    title: 'Очередь на вылет',
    difficulty: 3,
    topic: 'Сортировка без мутации',
    reward: { credits: 190, xp: 90 },
    brief:
      'Функция sortRoutes(routes) принимает массив маршрутов { to, hours } и возвращает ' +
      'НОВЫЙ массив, отсортированный по hours по возрастанию. При равном времени — ' +
      'по названию to в алфавитном порядке. Исходный массив менять нельзя.',
    theory: [
      'sort сортирует массив на месте, поэтому сначала делают копию: [...routes].',
      'Компаратор возвращает отрицательное число, ноль или положительное.',
      'Строки сравнивают через localeCompare: a.to.localeCompare(b.to).',
    ],
    fn: 'sortRoutes',
    starter:
      'function sortRoutes(routes) {\n' +
      '  // скопируйте массив и отсортируйте копию\n' +
      '}\n',
    hints: [
      'Копия массива: const copy = [...routes]; или routes.slice().',
      'Компаратор: (a, b) => a.hours - b.hours || a.to.localeCompare(b.to)',
    ],
    solution:
      'function sortRoutes(routes) {\n' +
      '  return [...routes].sort((a, b) => a.hours - b.hours || a.to.localeCompare(b.to));\n' +
      '}\n',
    tests: [
      {
        name: 'Сортировка по времени',
        args: [[{ to: 'Церера', hours: 40 }, { to: 'Титан', hours: 12 }, { to: 'Марс', hours: 26 }]],
        expected: [{ to: 'Титан', hours: 12 }, { to: 'Марс', hours: 26 }, { to: 'Церера', hours: 40 }],
      },
      {
        name: 'Равное время — по алфавиту',
        args: [[{ to: 'Фобос', hours: 9 }, { to: 'Деймос', hours: 9 }]],
        expected: [{ to: 'Деймос', hours: 9 }, { to: 'Фобос', hours: 9 }],
      },
      {
        name: 'Исходный массив не изменился',
        expr:
          'const input = [{ to: "Церера", hours: 40 }, { to: "Титан", hours: 12 }];\n' +
          'sortRoutes(input);\n' +
          'return input.map(r => r.to);',
        expected: ['Церера', 'Титан'],
      },
    ],
  },
  {
    id: 'find-route',
    sector: 'mars',
    module: 'navigation',
    title: 'Поиск маршрута',
    difficulty: 2,
    topic: 'find, некорректные данные',
    reward: { credits: 160, xp: 75 },
    brief:
      'Функция findRoute(routes, destination) возвращает первый маршрут, у которого ' +
      'поле to совпадает с destination. Если такого нет — null (именно null, не undefined).',
    theory: [
      'find возвращает первый подходящий элемент или undefined.',
      'Оператор ?? подставляет запасное значение: value ?? null.',
      'Строгое сравнение === не приводит типы и потому безопаснее.',
    ],
    fn: 'findRoute',
    starter:
      'function findRoute(routes, destination) {\n' +
      '  // найдите маршрут и не забудьте про null\n' +
      '}\n',
    hints: [
      'routes.find(route => route.to === destination)',
      'Замените undefined на null: ... ?? null',
    ],
    solution:
      'function findRoute(routes, destination) {\n' +
      '  return routes.find(route => route.to === destination) ?? null;\n' +
      '}\n',
    tests: [
      {
        name: 'Маршрут найден',
        args: [[{ to: 'Титан', hours: 12 }, { to: 'Марс', hours: 26 }], 'Марс'],
        expected: { to: 'Марс', hours: 26 },
      },
      {
        name: 'Маршрута нет',
        args: [[{ to: 'Титан', hours: 12 }], 'Плутон'],
        expected: null,
      },
      { name: 'Пустой список', args: [[], 'Марс'], expected: null },
    ],
  },
  {
    id: 'best-route',
    sector: 'mars',
    module: 'navigation',
    title: 'Лучший курс',
    difficulty: 4,
    topic: 'Функции высшего порядка',
    reward: { credits: 220, xp: 110 },
    brief:
      'Функция bestRoute(routes, score) принимает массив маршрутов и функцию оценки. ' +
      'Она возвращает маршрут с максимальной оценкой score(route). Если оценки равны, ' +
      'побеждает тот, кто встретился раньше. Пустой массив — null.',
    theory: [
      'Функцию можно передать в другую функцию как обычное значение.',
      'Вызов колбэка выглядит так: const value = score(route);',
      'Идти циклом и хранить лучшего — надёжнее, чем сортировать весь массив.',
    ],
    fn: 'bestRoute',
    starter:
      'function bestRoute(routes, score) {\n' +
      '  // переберите маршруты и запомните лучший по score()\n' +
      '}\n',
    hints: [
      'Заведите best = null и bestValue = -Infinity.',
      'Обновляйте лучшего только при строгом «больше» — тогда первый выиграет ничью.',
    ],
    solution:
      'function bestRoute(routes, score) {\n' +
      '  let best = null;\n' +
      '  let bestValue = -Infinity;\n' +
      '  for (const route of routes) {\n' +
      '    const value = score(route);\n' +
      '    if (value > bestValue) {\n' +
      '      bestValue = value;\n' +
      '      best = route;\n' +
      '    }\n' +
      '  }\n' +
      '  return best;\n' +
      '}\n',
    tests: [
      {
        name: 'Максимальная награда',
        expr:
          'const routes = [{ to: "Титан", reward: 120 }, { to: "Марс", reward: 300 }];\n' +
          'return bestRoute(routes, r => r.reward).to;',
        expected: 'Марс',
      },
      {
        name: 'Минимальное время через минус',
        expr:
          'const routes = [{ to: "Титан", hours: 40 }, { to: "Марс", hours: 12 }];\n' +
          'return bestRoute(routes, r => -r.hours).to;',
        expected: 'Марс',
      },
      {
        name: 'Ничья — побеждает первый',
        expr:
          'const routes = [{ to: "Фобос", reward: 10 }, { to: "Деймос", reward: 10 }];\n' +
          'return bestRoute(routes, r => r.reward).to;',
        expected: 'Фобос',
      },
      { name: 'Пустой массив', expr: 'return bestRoute([], r => r.reward);', expected: null },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Сектор: Ξ-7 — щиты и лаборатория                                    */
  /* ------------------------------------------------------------------ */
  {
    id: 'shield-matrix',
    sector: 'deep',
    module: 'shields',
    title: 'Пробоина в щите',
    difficulty: 4,
    topic: 'Вложенные массивы и циклы',
    reward: { credits: 230, xp: 115 },
    brief:
      'Щит — это матрица чисел (массив массивов), где число — прочность ячейки. ' +
      'Функция weakestCell(grid) возвращает объект { row, col, value } самой слабой ячейки. ' +
      'Если минимумов несколько — берётся первый при обходе сверху вниз и слева направо. ' +
      'Для пустой матрицы верните null.',
    theory: [
      'Вложенный цикл: внешний идёт по строкам, внутренний — по ячейкам строки.',
      'Индексы удобно брать через обычный for (let row = 0; row < grid.length; row++).',
      'Строгое «меньше» при сравнении сохранит первый найденный минимум.',
    ],
    fn: 'weakestCell',
    starter:
      'function weakestCell(grid) {\n' +
      '  // пройдите матрицу и найдите минимальное значение с его координатами\n' +
      '}\n',
    hints: [
      'Стартовое значение минимума — Infinity, тогда первая же ячейка его заменит.',
      'grid[row][col] — обращение к ячейке по координатам.',
    ],
    solution:
      'function weakestCell(grid) {\n' +
      '  let best = null;\n' +
      '  let min = Infinity;\n' +
      '  for (let row = 0; row < grid.length; row++) {\n' +
      '    for (let col = 0; col < grid[row].length; col++) {\n' +
      '      if (grid[row][col] < min) {\n' +
      '        min = grid[row][col];\n' +
      '        best = { row, col, value: min };\n' +
      '      }\n' +
      '    }\n' +
      '  }\n' +
      '  return best;\n' +
      '}\n',
    tests: [
      {
        name: 'Минимум в середине',
        args: [[[80, 75, 90], [60, 42, 70], [88, 91, 55]]],
        expected: { row: 1, col: 1, value: 42 },
      },
      {
        name: 'Первый из одинаковых',
        args: [[[10, 10], [10, 10]]],
        expected: { row: 0, col: 0, value: 10 },
      },
      { name: 'Одна строка', args: [[[9, 3, 7]]], expected: { row: 0, col: 1, value: 3 } },
      { name: 'Пустая матрица', args: [[]], expected: null },
    ],
  },
  {
    id: 'reinforce-shields',
    sector: 'deep',
    module: 'shields',
    title: 'Усиление щита',
    difficulty: 4,
    topic: 'map по вложенным массивам, неизменяемость',
    reward: { credits: 210, xp: 100 },
    brief:
      'Функция reinforce(grid, amount) возвращает НОВУЮ матрицу щита, где каждая ячейка ' +
      'усилена на amount, но не больше 100. Исходную матрицу менять нельзя.',
    theory: [
      'map можно применять вложенно: grid.map(row => row.map(cell => ...)).',
      'map всегда создаёт новый массив, поэтому исходные данные остаются целыми.',
      'Ограничить сверху помогает Math.min(value, 100).',
    ],
    fn: 'reinforce',
    starter:
      'function reinforce(grid, amount) {\n' +
      '  // пройдите строки и ячейки, вернув новую матрицу\n' +
      '}\n',
    hints: [
      'Внешний map идёт по строкам, внутренний — по ячейкам строки.',
      'Значение ячейки: Math.min(cell + amount, 100).',
    ],
    solution:
      'function reinforce(grid, amount) {\n' +
      '  return grid.map(row => row.map(cell => Math.min(cell + amount, 100)));\n' +
      '}\n',
    tests: [
      {
        name: 'Обычное усиление',
        args: [[[10, 20], [30, 40]], 5],
        expected: [[15, 25], [35, 45]],
      },
      {
        name: 'Потолок в 100',
        args: [[[95, 100], [80, 99]], 10],
        expected: [[100, 100], [90, 100]],
      },
      { name: 'Пустая матрица', args: [[], 10], expected: [] },
      {
        name: 'Исходная матрица не изменилась',
        expr:
          'const grid = [[10, 20]];\n' +
          'reinforce(grid, 5);\n' +
          'return grid;',
        expected: [[10, 20]],
      },
    ],
  },
  {
    id: 'module-class',
    sector: 'deep',
    module: 'lab',
    title: 'Чертёж модуля',
    difficulty: 4,
    topic: 'Классы, методы, this',
    reward: { credits: 240, xp: 120 },
    brief:
      'Опишите класс ShipModule:\n' +
      '• конструктор принимает name и level (по умолчанию 1);\n' +
      '• метод upgrade() поднимает уровень на 1, но не выше 3, и возвращает сам объект (this);\n' +
      '• метод describe() возвращает строку вида "Реактор (ур. 2)".',
    theory: [
      'Значение по умолчанию задаётся прямо в параметрах: constructor(name, level = 1).',
      'Внутри методов к полям обращаются через this: this.level += 1.',
      'Возврат this позволяет писать цепочки: module.upgrade().upgrade().',
    ],
    fn: 'ShipModule',
    starter:
      'class ShipModule {\n' +
      '  constructor(name, level = 1) {\n' +
      '    // сохраните поля\n' +
      '  }\n' +
      '\n' +
      '  upgrade() {\n' +
      '    // поднимите уровень и верните this\n' +
      '  }\n' +
      '\n' +
      '  describe() {\n' +
      '    // верните строку "Имя (ур. N)"\n' +
      '  }\n' +
      '}\n',
    hints: [
      'Ограничить уровень поможет Math.min(this.level + 1, 3).',
      'Строку удобно собрать шаблоном: `${this.name} (ур. ${this.level})`',
    ],
    solution:
      'class ShipModule {\n' +
      '  constructor(name, level = 1) {\n' +
      '    this.name = name;\n' +
      '    this.level = level;\n' +
      '  }\n' +
      '\n' +
      '  upgrade() {\n' +
      '    this.level = Math.min(this.level + 1, 3);\n' +
      '    return this;\n' +
      '  }\n' +
      '\n' +
      '  describe() {\n' +
      '    return `${this.name} (ур. ${this.level})`;\n' +
      '  }\n' +
      '}\n',
    tests: [
      {
        name: 'Уровень по умолчанию',
        expr: 'return new ShipModule("Реактор").describe();',
        expected: 'Реактор (ур. 1)',
      },
      {
        name: 'Улучшение поднимает уровень',
        expr: 'return new ShipModule("Щиты", 1).upgrade().describe();',
        expected: 'Щиты (ур. 2)',
      },
      {
        name: 'Выше третьего не растёт',
        expr: 'return new ShipModule("Трюм", 3).upgrade().level;',
        expected: 3,
      },
      {
        name: 'upgrade возвращает сам объект',
        expr: 'const m = new ShipModule("Антенна"); return m.upgrade() === m;',
        expected: true,
      },
    ],
  },
  {
    id: 'probe-scan',
    sector: 'deep',
    module: 'lab',
    title: 'Данные с зонда',
    difficulty: 5,
    topic: 'Промисы, async/await',
    reward: { credits: 260, xp: 130 },
    brief:
      'Зонд умеет отдавать замеры по одному: probe.read() возвращает промис с числом. ' +
      'Напишите асинхронную функцию collectSamples(probe, count): она делает count замеров ' +
      'по очереди и возвращает промис с массивом полученных чисел. При count = 0 — пустой массив.',
    theory: [
      'async function всегда возвращает промис, даже если внутри обычный return.',
      'await приостанавливает функцию до выполнения промиса: const value = await probe.read().',
      'Замеры «по очереди» — это await внутри обычного цикла for.',
    ],
    fn: 'collectSamples',
    starter:
      'async function collectSamples(probe, count) {\n' +
      '  // сделайте count замеров и соберите их в массив\n' +
      '}\n',
    hints: [
      'Соберите результаты в массив: const samples = []; samples.push(await probe.read());',
      'Цикл for (let i = 0; i < count; i++) выполнит ровно count замеров.',
    ],
    solution:
      'async function collectSamples(probe, count) {\n' +
      '  const samples = [];\n' +
      '  for (let i = 0; i < count; i++) {\n' +
      '    samples.push(await probe.read());\n' +
      '  }\n' +
      '  return samples;\n' +
      '}\n',
    tests: [
      {
        name: 'Три замера по очереди',
        expr:
          'let n = 0;\n' +
          'const probe = { read: () => Promise.resolve(++n * 10) };\n' +
          'return collectSamples(probe, 3);',
        expected: [10, 20, 30],
      },
      {
        name: 'Ноль замеров',
        expr:
          'const probe = { read: () => Promise.resolve(1) };\n' +
          'return collectSamples(probe, 0);',
        expected: [],
      },
      {
        name: 'Возвращается именно промис',
        expr:
          'const probe = { read: () => Promise.resolve(5) };\n' +
          'const result = collectSamples(probe, 1);\n' +
          'return typeof result.then === "function";',
        expected: true,
      },
      {
        name: 'Замеры идут строго по очереди',
        expr:
          'const order = [];\n' +
          'let n = 0;\n' +
          'const probe = { read: () => { const id = ++n; order.push(id); return Promise.resolve(id); } };\n' +
          'return collectSamples(probe, 3).then(() => order.join(","));',
        expected: '1,2,3',
      },
    ],
  },
];

/** Задачи выбранного сектора в порядке объявления. */
export function questsOfSector(sectorId) {
  return QUESTS.filter(quest => quest.sector === sectorId);
}

/** Задача по идентификатору. */
export function questById(id) {
  return QUESTS.find(quest => quest.id === id) ?? null;
}
