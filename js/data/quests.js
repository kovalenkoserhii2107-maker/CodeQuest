/**
 * Цепочка заданий: строгая прогрессия по сюжету.
 *
 * Задания идут одно за другим — следующее открывается только после решения
 * предыдущего. Каждое задание включает механику корпорации и открывает
 * соответствующую вкладку интерфейса: пока код не написан, раздела нет.
 *
 * Поля задания:
 *   id, order      — порядок в цепочке;
 *   story          — сюжетная подводка (зачем это нужно корпорации);
 *   brief          — само условие;
 *   theory         — что понадобится;
 *   fn             — имя функции или класса, которое ждут тесты;
 *   starter        — заготовка в редакторе;
 *   hints          — подсказки по нажатию;
 *   solution       — эталон (можно подсмотреть за половину награды);
 *   tests          — { name, args, expected } или { name, expr, expected };
 *   unlocks        — какой раздел интерфейса открывает решение.
 */

export const QUESTS = [
  /* ---------------------------------------------------------------- 1 -- */
  {
    id: 'commander',
    order: 1,
    title: 'Личное дело командира',
    topic: 'Объекты: поля и значения',
    difficulty: 1,
    reward: { credits: 20000, xp: 50 },
    unlocks: { view: 'command', label: 'Командный центр' },
    story:
      'Совет Колоний не выдаёт лицензию безымянным. Пока в реестре нет вашего ' +
      'личного дела, корпорации не существует — ни счёта, ни доступа к сети верфей.',
    signature: 'createCommander(name) → объект',
    brief: 
      'Напишите функцию createCommander, которая принимает имя и возвращает объект командира.\n' +
      'На входе: name — строка с именем.\n' +
      'Вернуть нужно объект ровно с четырьмя полями:\n' +
      '• name — то самое переданное имя, без изменений;\n' +
      '• rank — строка "Командир" у всех одинаковая;\n' +
      '• experience — число 0, новичок ещё ничего не налетал;\n' +
      '• credits — число 0, счёт пока пуст.\n' +
      'Например, createCommander("Аня") должна вернуть\n' +
      '{ name: "Аня", rank: "Командир", experience: 0, credits: 0 }.',
    theory: [
      'Объект: { ключ: значение, другой: 1 } — поля через запятую.',
      'Строки в кавычках: rank: "Командир". Числа без кавычек: experience: 0.',
      'Сокращение { name } работает, когда имя поля совпадает с именем переменной.',
      'Без return функция вернёт undefined, и тест этого не примет.',
    ],
    lesson: [
      {
        title: 'Объект — это набор пар «имя поля: значение»',
        text:
          'Объект записывают фигурными скобками. Слева от двоеточия имя поля, справа — значение. Поля разделяют запятой. Строки берут в кавычки, числа пишут без них.',
        code:
          'const ship = {\n' +
          '  name: "Квест",\n' +
          '  mass: 430,\n' +
          '  ready: true,\n' +
          '};\n' +
          '\n' +
          'ship.name   // "Квест"\n' +
          'ship.mass   // 430',
      },
      {
        title: 'Функция возвращает объект через return',
        text:
          'Без return функция не отдаёт ничего — вызов даст undefined. Объект можно собрать прямо в return, отдельная переменная не нужна.',
        code:
          'function createShip(name) {\n' +
          '  return { name: name, mass: 0 };\n' +
          '}\n' +
          '\n' +
          'createShip("Квест")   // { name: "Квест", mass: 0 }',
      },
      {
        title: 'Сокращённая запись, когда имена совпадают',
        text:
          'Если поле называется так же, как переменная, из которой берут значение, двоеточие и повтор можно опустить. Записи { name: name } и { name } означают одно и то же.',
        code:
          'function createShip(name) {\n' +
          '  // то же, что { name: name, mass: 0 }\n' +
          '  return { name, mass: 0 };\n' +
          '}',
      },
    ],
    fn: 'createCommander',
    starter:
      'function createCommander(name) {\n' +
      '  // верните объект командира с четырьмя полями\n' +
      '}\n',
    hints: [
      'Функция должна не просто создать объект, а вернуть его: начните строку с return.',
      'Три поля из четырёх одинаковы у всех командиров — их значения впишите прямо, не вычисляя.',
      'Каркас: return { name: ..., rank: ..., experience: ..., credits: ... }; подставьте значения.',
    ],
    solution:
      'function createCommander(name) {\n' +
      '  return { name, rank: "Командир", experience: 0, credits: 0 };\n' +
      '}\n',
    practice: {
      title: 'Занесите себя в реестр',
      hint: 'Тесты — это теория. Теперь вызовите свою функцию в консоли и укажите своё имя: объект попадёт в базу корпорации.',
      example: 'createCommander("Сергей Коваленко")',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть объект командира';
        if (typeof value.name !== 'string' || value.name.trim().length < 2) return 'В объекте нет осмысленного имени — передайте своё имя аргументом';
        if (value.rank !== 'Командир') return 'Поле rank должно быть строкой «Командир»';
        return true;
      },
      commit: (value, api) => {
        const name = value.name.trim();
        api.setRecord('commander', { name, rank: value.rank, experience: value.experience ?? 0 });
        return `Личное дело «${name}» занесено в реестр корпорации`;
      },
    },
    tests: [
      {
        name: 'Личное дело заведено',
        args: ['Сергей Коваленко'],
        expected: { name: 'Сергей Коваленко', rank: 'Командир', experience: 0, credits: 0 },
      },
      {
        name: 'Имя подставляется, а не зашивается',
        args: ['Анна Кравец'],
        expected: { name: 'Анна Кравец', rank: 'Командир', experience: 0, credits: 0 },
      },
      { name: 'Опыт — число', expr: 'return typeof createCommander("Тест").experience;', expected: 'number' },
    ],
  },

  /* ---------------------------------------------------------------- 2 -- */
  {
    id: 'shipyard',
    order: 2,
    title: 'Космоверфь',
    topic: 'Объекты с методами, this',
    difficulty: 2,
    reward: { credits: 30000, xp: 70 },
    unlocks: { view: 'shipyard', label: 'Верфь' },
    story:
      'Лицензия есть — пора договариваться с верфью. Каталог модулей бесполезен, ' +
      'пока по нему нельзя искать: диспетчер должен уметь ответить, есть ли нужная деталь.',
    signature: 'createShipyard(name, modules) → объект с методами',
    brief: 
      'Напишите функцию createShipyard, которая собирает объект верфи.\n' +
      'На входе: name — название верфи, modules — массив модулей, у каждого есть поле id.\n' +
      'Вернуть нужно объект с двумя полями и двумя методами:\n' +
      '• name — переданное название;\n' +
      '• modules — переданный массив;\n' +
      '• getCatalog() — метод, возвращает массив модулей целиком;\n' +
      '• findModule(id) — метод, возвращает модуль с таким id, а если его нет — null.\n' +
      'Методы должны брать данные из самого объекта через this, а не из переменных снаружи.',
    theory: [
      'Метод записывают прямо в объекте: getCatalog() { ... } — скобки и тело как у функции.',
      'this.modules внутри метода — это поле того же объекта.',
      'find возвращает первый подходящий элемент или undefined, если ничего не нашлось.',
      'Оператор ?? подставляет запасное значение: undefined ?? null даст null.',
    ],
    lesson: [
      {
        title: 'Метод — это функция внутри объекта',
        text:
          'Поле объекта может хранить не только число или строку, но и функцию. Такое поле называют методом и вызывают со скобками.',
        code:
          'const yard = {\n' +
          '  name: "Орион",\n' +
          '  greet() {\n' +
          '    return "Верфь на связи";\n' +
          '  },\n' +
          '};\n' +
          '\n' +
          'yard.greet()   // "Верфь на связи"',
      },
      {
        title: 'this — сам объект, у которого вызвали метод',
        text:
          'Внутри метода this указывает на объект слева от точки. Через this метод добирается до соседних полей, не зная, как называется переменная снаружи.',
        code:
          'const yard = {\n' +
          '  name: "Орион",\n' +
          '  modules: [{ id: "a" }, { id: "b" }],\n' +
          '  count() {\n' +
          '    return this.modules.length;   // не просто modules\n' +
          '  },\n' +
          '};\n' +
          '\n' +
          'yard.count()   // 2',
      },
      {
        title: 'find ищет первый подходящий элемент',
        text:
          'Метод массива find перебирает элементы и возвращает первый, для которого условие истинно. Если не нашёл ни одного, вернёт undefined — а по условию задачи нужен null.',
        code:
          'const modules = [{ id: "a" }, { id: "b" }];\n' +
          '\n' +
          'modules.find(m => m.id === "b")   // { id: "b" }\n' +
          'modules.find(m => m.id === "x")   // undefined\n' +
          '\n' +
          '// ?? подставит запасное вместо undefined и null\n' +
          'modules.find(m => m.id === "x") ?? null   // null',
      },
    ],
    fn: 'createShipyard',
    starter:
      'function createShipyard(name, modules) {\n' +
      '  return {\n' +
      '    name,\n' +
      '    modules,\n' +
      '    // добавьте методы getCatalog и findModule\n' +
      '  };\n' +
      '}\n',
    hints: [
      'Верфь — обычный объект: два поля с данными и два поля, в которых лежат функции.',
      'Внутри методов обращайтесь к массиву через this.modules — так метод не зависит от переменных снаружи.',
      'В findModule пригодится find с проверкой m.id === id, а результат прогоните через ?? null.',
    ],
    solution:
      'function createShipyard(name, modules) {\n' +
      '  return {\n' +
      '    name,\n' +
      '    modules,\n' +
      '    getCatalog() {\n' +
      '      return this.modules;\n' +
      '    },\n' +
      '    findModule(id) {\n' +
      '      return this.modules.find(module => module.id === id) ?? null;\n' +
      '    },\n' +
      '  };\n' +
      '}\n',
    practice: {
      title: 'Подключите верфь к каталогу',
      hint: 'В консоли доступен объект corp: corp.catalog — настоящий каталог модулей. Передайте его своей функции.',
      example: 'createShipyard("Орион", corp.catalog)',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть объект верфи';
        if (typeof value.name !== 'string' || !value.name.trim()) return 'У верфи нет названия';
        if (!Array.isArray(value.modules) || value.modules.length === 0) return 'В верфь не передан каталог модулей: используйте corp.catalog';
        return true;
      },
      commit: (value, api) => {
        api.setRecord('shipyard', { name: value.name.trim(), modules: value.modules.length });
        return `Верфь «${value.name.trim()}» подключена: ${value.modules.length} модулей в каталоге`;
      },
    },
    tests: [
      { name: 'Название верфи сохранено', expr: 'return createShipyard("Орион", []).name;', expected: 'Орион' },
      {
        name: 'Каталог возвращается целиком',
        expr:
          'const yard = createShipyard("Орион", [{ id: "a", name: "Бур" }, { id: "b", name: "Реактор" }]);\n' +
          'return yard.getCatalog();',
        expected: [{ id: 'a', name: 'Бур' }, { id: 'b', name: 'Реактор' }],
      },
      {
        name: 'Поиск находит модуль по id',
        expr:
          'const yard = createShipyard("Орион", [{ id: "a", name: "Бур" }, { id: "b", name: "Реактор" }]);\n' +
          'return yard.findModule("b").name;',
        expected: 'Реактор',
      },
      {
        name: 'Неизвестный модуль даёт null',
        expr: 'return createShipyard("Орион", [{ id: "a" }]).findModule("нет-такого");',
        expected: null,
      },
      { name: 'Пустая верфь не ломается', expr: 'return createShipyard("Пустая", []).getCatalog().length;', expected: 0 },
    ],
  },

  /* ---------------------------------------------------------------- 3 -- */
  {
    id: 'warehouse',
    order: 3,
    title: 'Склад корпорации',
    topic: 'Методы, состояние объекта, валидация',
    difficulty: 3,
    reward: { credits: 26000, xp: 90 },
    unlocks: { view: 'warehouse', label: 'Склад' },
    story:
      'Купленные модули нужно где-то держать. Склад не резиновый: если принять груз ' +
      'сверх вместимости, перекрытия не выдержат — приёмка обязана уметь отказывать.',
    signature: 'createWarehouse(capacity) → объект со состоянием',
    brief: 
      'Напишите функцию createWarehouse, которая создаёт склад с ограниченной вместимостью.\n' +
      'На входе: capacity — число, сколько тонн склад вмещает.\n' +
      'Вернуть нужно объект:\n' +
      '• capacity — переданная вместимость;\n' +
      '• items — массив принятых модулей, изначально пустой;\n' +
      '• usedSpace() — метод, возвращает сумму weight всех принятых модулей; у пустого склада 0;\n' +
      '• addItem(item) — метод приёмки.\n' +
      'addItem работает так: если после приёмки занятое место не превысит capacity — кладёт модуль в items и возвращает true. Если модуль не влезает — ничего не меняет и возвращает false.\n' +
      'Отказ должен быть честным: при false массив items обязан остаться прежним.',
    theory: [
      'items начинается пустым массивом: items: [].',
      'usedSpace считают через reduce с начальным значением 0.',
      'Влезает ли модуль: this.usedSpace() + item.weight <= this.capacity.',
      'push добавляет элемент в конец массива и меняет сам массив.',
    ],
    lesson: [
      {
        title: 'Объект помнит своё состояние между вызовами',
        text:
          'Массив внутри объекта никуда не исчезает после вызова метода. Один метод кладёт в него значения, другой их считает — так объект накапливает состояние.',
        code:
          'const box = {\n' +
          '  items: [],\n' +
          '  add(thing) {\n' +
          '    this.items.push(thing);\n' +
          '  },\n' +
          '};\n' +
          '\n' +
          'box.add("гайка");\n' +
          'box.add("болт");\n' +
          'box.items.length   // 2',
      },
      {
        title: 'reduce складывает поле у всех элементов',
        text:
          'reduce идёт по массиву и накапливает одно значение. Первый аргумент — функция, которая получает накопленное и очередной элемент, второй — с чего начать.',
        code:
          'const items = [{ weight: 150 }, { weight: 200 }];\n' +
          '\n' +
          'items.reduce((sum, item) => sum + item.weight, 0);   // 350\n' +
          '//            ^накопили  ^элемент                ^старт\n' +
          '\n' +
          '// Ноль в конце обязателен: иначе пустой массив\n' +
          '// бросит ошибку\n' +
          '[].reduce((sum, item) => sum + item.weight, 0);      // 0',
      },
      {
        title: 'Сначала проверка, потом изменение',
        text:
          'Если метод может отказать, проверку делают до того, как что-то менять. Ранний return с отказом избавляет от вложенных условий и от половинчатых изменений.',
        code:
          'addItem(item) {\n' +
          '  if (не влезает) {\n' +
          '    return false;      // вышли, ничего не тронув\n' +
          '  }\n' +
          '\n' +
          '  this.items.push(item);\n' +
          '  return true;\n' +
          '}',
      },
    ],
    fn: 'createWarehouse',
    starter:
      'function createWarehouse(capacity) {\n' +
      '  return {\n' +
      '    capacity,\n' +
      '    items: [],\n' +
      '    // добавьте методы usedSpace и addItem\n' +
      '  };\n' +
      '}\n',
    hints: [
      'Склад — объект с двумя полями данных и двумя методами; items создайте сразу пустым массивом.',
      'usedSpace каждый раз считает сумму заново по this.items — отдельное поле-счётчик не нужно.',
      'В addItem сначала посчитайте, каким станет занятое место, и при перевесе выйдите через return false.',
    ],
    solution:
      'function createWarehouse(capacity) {\n' +
      '  return {\n' +
      '    capacity,\n' +
      '    items: [],\n' +
      '    usedSpace() {\n' +
      '      return this.items.reduce((sum, item) => sum + item.weight, 0);\n' +
      '    },\n' +
      '    addItem(item) {\n' +
      '      if (this.usedSpace() + item.weight > this.capacity) return false;\n' +
      '      this.items.push(item);\n' +
      '      return true;\n' +
      '    },\n' +
      '  };\n' +
      '}\n',
    practice: {
      title: 'Разверните склад',
      hint: 'Создайте склад на 1000 тонн — эта вместимость станет настоящим лимитом корпорации.',
      example: 'createWarehouse(1000)',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть объект склада';
        if (typeof value.capacity !== 'number' || value.capacity <= 0) return 'У склада нет положительной вместимости';
        if (!Array.isArray(value.items)) return 'У склада нет массива items';
        return true;
      },
      commit: (value, api) => {
        api.setRecord('warehouseCapacity', value.capacity);
        return `Склад развёрнут: вместимость ${value.capacity} т`;
      },
    },
    tests: [
      { name: 'Пустой склад ничего не занимает', expr: 'return createWarehouse(500).usedSpace();', expected: 0 },
      {
        name: 'Модуль принят',
        expr:
          'const w = createWarehouse(500);\n' +
          'const ok = w.addItem({ name: "Реактор", weight: 150 });\n' +
          'return { ok, used: w.usedSpace(), count: w.items.length };',
        expected: { ok: true, used: 150, count: 1 },
      },
      {
        name: 'Перегруз отклонён и склад не изменился',
        expr:
          'const w = createWarehouse(200);\n' +
          'w.addItem({ name: "Реактор", weight: 150 });\n' +
          'const ok = w.addItem({ name: "Двигатель", weight: 200 });\n' +
          'return { ok, used: w.usedSpace(), count: w.items.length };',
        expected: { ok: false, used: 150, count: 1 },
      },
      {
        name: 'Ровно по остатку помещается',
        expr:
          'const w = createWarehouse(300);\n' +
          'w.addItem({ weight: 150 });\n' +
          'return w.addItem({ weight: 150 });',
        expected: true,
      },
      {
        name: 'Два склада не делят один массив',
        expr:
          'const a = createWarehouse(500);\n' +
          'const b = createWarehouse(500);\n' +
          'a.addItem({ weight: 10 });\n' +
          'return b.items.length;',
        expected: 0,
      },
    ],
  },

  /* ---------------------------------------------------------------- 4 -- */
  {
    id: 'hire',
    order: 4,
    title: 'Биржа труда',
    topic: 'Копии объектов, спред, условия',
    difficulty: 3,
    reward: { credits: 24000, xp: 100 },
    unlocks: { view: 'crew', label: 'Экипаж' },
    story:
      'Корабль без людей — груда железа. На бирже есть кандидаты, но найм обязан ' +
      'считать деньги: нельзя нанимать в долг.',
    signature: 'hireCrewMember(commander, candidate) → новый объект командира',
    brief: 
      'Напишите функцию hireCrewMember, которая нанимает человека на бирже труда.\n' +
      'На входе: commander — объект с полями credits (число) и crew (массив), candidate — кандидат с полем hireCost.\n' +
      'Функция всегда возвращает НОВЫЙ объект командира, а переданный менять нельзя.\n' +
      'Если денег хватает, то есть commander.credits >= candidate.hireCost:\n' +
      '• credits уменьшается на hireCost;\n' +
      '• candidate добавляется в конец массива crew.\n' +
      'Если денег не хватает — верните копию командира без единого изменения.\n' +
      'Проверка строгая: после вызова исходный commander должен остаться ровно таким, каким был.',
    theory: [
      'Копия объекта с изменением: { ...commander, credits: 0 }.',
      'Копия массива с добавленным элементом: [...commander.crew, candidate].',
      'push менять оригинал — здесь нельзя: он испортит переданный объект.',
      'Условие «денег хватает» — это commander.credits >= candidate.hireCost.',
    ],
    lesson: [
      {
        title: 'Объекты передаются по ссылке',
        text:
          'Переменная хранит не сам объект, а ссылку на него. Меняя поле через одну переменную, вы меняете тот же объект и для всех остальных. Поэтому «просто вычесть credits» испортит исходные данные.',
        code:
          'const a = { credits: 100 };\n' +
          'const b = a;         // не копия, та же самая ссылка\n' +
          '\n' +
          'b.credits = 0;\n' +
          'a.credits            // 0 — пострадал и a',
      },
      {
        title: 'Спред делает копию',
        text:
          'Три точки перед объектом рассыпают его поля в новый объект. Поля, перечисленные после спреда, перекрывают скопированные — так получается «копия с изменением».',
        code:
          'const commander = { name: "Аня", credits: 100 };\n' +
          '\n' +
          'const poorer = { ...commander, credits: 40 };\n' +
          '\n' +
          'poorer              // { name: "Аня", credits: 40 }\n' +
          'commander.credits   // 100 — оригинал цел',
      },
      {
        title: 'Массив копируют тем же спредом',
        text:
          'push добавляет элемент в существующий массив и тем самым портит оригинал. Чтобы получить новый массив с добавленным элементом, рассыпьте старый и допишите нужное.',
        code:
          'const crew = [{ name: "Аня" }];\n' +
          '\n' +
          'const bigger = [...crew, { name: "Пётр" }];\n' +
          '\n' +
          'bigger.length   // 2\n' +
          'crew.length     // 1 — оригинал цел\n' +
          '\n' +
          '// crew.push(...) так бы не смог: он меняет сам crew',
      },
    ],
    fn: 'hireCrewMember',
    starter:
      'function hireCrewMember(commander, candidate) {\n' +
      '  // верните нового командира: с нанятым кандидатом или без изменений\n' +
      '}\n',
    hints: [
      'Обе ветки возвращают новый объект: разница только в том, поменялись ли credits и crew.',
      'Случай «денег не хватает» проще — начните с него и выйдите из функции сразу через return.',
      'Для успешного найма нужен объект { ...commander, credits: ..., crew: ... }; crew соберите из старого массива и кандидата.',
    ],
    solution:
      'function hireCrewMember(commander, candidate) {\n' +
      '  if (commander.credits < candidate.hireCost) {\n' +
      '    return { ...commander };\n' +
      '  }\n' +
      '\n' +
      '  return {\n' +
      '    ...commander,\n' +
      '    credits: commander.credits - candidate.hireCost,\n' +
      '    crew: [...commander.crew, candidate],\n' +
      '  };\n' +
      '}\n',
    practice: {
      title: 'Наймите первого человека',
      hint: 'В консоли есть corp.commander (ваше личное дело со счётом) и corp.candidates — биржа труда. Найм спишет деньги по вашей формуле.',
      example: 'hireCrewMember(corp.commander, corp.candidates[0])',
      validate: (value, context) => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть объект командира';
        if (!Array.isArray(value.crew)) return 'В результате нет массива crew';
        const before = context.corp.commander?.crew?.length ?? 0;
        if (value.crew.length <= before) return 'Ваша функция отказала в найме: проверьте, хватает ли кредитов';
        if (typeof value.credits !== 'number') return 'В результате нет числового поля credits';
        return true;
      },
      commit: (value, api, context) => {
        const hired = value.crew[value.crew.length - 1];
        const spent = (context.corp.commander?.credits ?? 0) - value.credits;
        return api.hireCandidate(hired?.id, spent);
      },
    },
    tests: [
      {
        name: 'Кандидат нанят, деньги списаны',
        args: [
          { name: 'Сергей', credits: 20000, crew: [] },
          { id: 'c1', name: 'Анна Кравец', role: 'Капитан', hireCost: 15000 },
        ],
        expected: {
          name: 'Сергей',
          credits: 5000,
          crew: [{ id: 'c1', name: 'Анна Кравец', role: 'Капитан', hireCost: 15000 }],
        },
      },
      {
        name: 'Денег не хватает — экипаж прежний',
        args: [
          { name: 'Сергей', credits: 1000, crew: [] },
          { id: 'c1', name: 'Анна Кравец', role: 'Капитан', hireCost: 15000 },
        ],
        expected: { name: 'Сергей', credits: 1000, crew: [] },
      },
      {
        name: 'Ровно по бюджету найм проходит',
        expr:
          'const result = hireCrewMember({ name: "С", credits: 15000, crew: [] }, { hireCost: 15000 });\n' +
          'return result.credits;',
        expected: 0,
      },
      {
        name: 'Исходный командир не изменился',
        expr:
          'const commander = { name: "С", credits: 20000, crew: [] };\n' +
          'hireCrewMember(commander, { hireCost: 15000 });\n' +
          'return { credits: commander.credits, crew: commander.crew.length };',
        expected: { credits: 20000, crew: 0 },
      },
    ],
  },

  /* ---------------------------------------------------------------- 5 -- */
  {
    id: 'assemble',
    order: 5,
    title: 'Сборка корабля',
    topic: 'reduce по объектам, агрегация',
    difficulty: 4,
    reward: { credits: 28000, xp: 120 },
    unlocks: { view: 'ship', label: 'Корабль' },
    story:
      'Модули лежат на складе по отдельности. Корабль — это их сумма: общая масса ' +
      'и энергобаланс решают, полетит он или останется в доке.',
    signature: 'assembleShip(name, modules) → объект корабля',
    brief: 
      'Напишите функцию assembleShip, которая собирает корабль из модулей.\n' +
      'На входе: name — название корабля, modules — массив модулей; у каждого есть weight (масса в тоннах) и energy (энергия).\n' +
      'Вернуть нужно объект:\n' +
      '• name — переданное название;\n' +
      '• modules — переданный массив как есть;\n' +
      '• mass — сумма weight всех модулей;\n' +
      '• energy — сумма energy всех модулей.\n' +
      'У реактора energy положительная — он вырабатывает. У двигателя и бура отрицательная — они потребляют. Складывать нужно всё подряд: так и получается энергобаланс.\n' +
      'Для пустого массива модулей mass и energy равны 0.',
    theory: [
      'reduce: modules.reduce((sum, module) => sum + module.weight, 0).',
      'Ноль в конце — начальное значение, без него пустой массив бросит ошибку.',
      'Массу и энергию считают двумя отдельными вызовами reduce.',
      'modules возвращают тем же массивом, который пришёл, — пересобирать его не нужно.',
    ],
    lesson: [
      {
        title: 'reduce сворачивает массив в одно значение',
        text:
          'Цикл со счётчиком и переменной-накопителем можно записать короче. reduce принимает функцию, которая получает накопленное значение и очередной элемент, и возвращает новое накопленное.',
        code:
          'const modules = [\n' +
          '  { weight: 150 }, { weight: 200 }, { weight: 80 },\n' +
          '];\n' +
          '\n' +
          '// Через цикл\n' +
          'let mass = 0;\n' +
          'for (const module of modules) {\n' +
          '  mass = mass + module.weight;\n' +
          '}\n' +
          '\n' +
          '// То же через reduce\n' +
          'const mass2 = modules.reduce(\n' +
          '  (sum, module) => sum + module.weight,\n' +
          '  0,\n' +
          ');',
      },
      {
        title: 'Начальное значение решает судьбу пустого массива',
        text:
          'Второй аргумент reduce — с чего начинать накопление. Для сумм это 0. Если его не указать, на пустом массиве reduce бросит ошибку, а тест на пустой список есть в каждой такой задаче.',
        code:
          '[].reduce((sum, m) => sum + m.weight, 0);  // 0 — как надо\n' +
          '[].reduce((sum, m) => sum + m.weight);      // TypeError',
      },
      {
        title: 'Отрицательные слагаемые складываются сами',
        text:
          'Не нужно отдельно считать выработку и потребление. Плюс и минус складываются обычной арифметикой, и сумма сразу даёт баланс: если он ниже нуля, энергии не хватает.',
        code:
          'const modules = [\n' +
          '  { energy: 120 },   // реактор вырабатывает\n' +
          '  { energy: -60 },   // двигатель потребляет\n' +
          '  { energy: -40 },   // бур потребляет\n' +
          '];\n' +
          '\n' +
          'modules.reduce((sum, m) => sum + m.energy, 0);   // 20',
      },
    ],
    fn: 'assembleShip',
    starter:
      'function assembleShip(name, modules) {\n' +
      '  // посчитайте массу и энергобаланс, верните объект корабля\n' +
      '}\n',
    hints: [
      'Две суммы считаются независимо: одна по weight, другая по energy.',
      'Не пишите отдельных проверок на пустой массив — начальное значение 0 закрывает этот случай само.',
      'Посчитайте mass и energy в отдельные переменные, а потом соберите объект из четырёх полей.',
    ],
    solution:
      'function assembleShip(name, modules) {\n' +
      '  const mass = modules.reduce((sum, module) => sum + module.weight, 0);\n' +
      '  const energy = modules.reduce((sum, module) => sum + module.energy, 0);\n' +
      '\n' +
      '  return { name, modules, mass, energy };\n' +
      '}\n',
    practice: {
      title: 'Соберите корабль',
      hint: 'corp.modules — то, что реально лежит у вас на складе. Соберите из них корабль: его характеристики станут характеристиками корпорации.',
      example: 'assembleShip("Квест", corp.modules)',
      validate: (value, context) => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть объект корабля';
        if (typeof value.mass !== 'number' || typeof value.energy !== 'number') return 'В корабле нет числовых полей mass и energy';
        if ((context.corp.modules?.length ?? 0) > 0 && value.mass === 0) return 'Масса нулевая — передайте модули со склада: corp.modules';
        return true;
      },
      commit: (value, api) => {
        // Модули храним массивом: следующему заданию нужен состав, а не счётчик
        api.setRecord('ship', {
          name: value.name ?? 'Без имени',
          mass: value.mass,
          energy: value.energy,
          modules: Array.isArray(value.modules) ? value.modules : [],
        });
        const count = Array.isArray(value.modules) ? value.modules.length : 0;
        return `Корабль «${value.name ?? 'Без имени'}» собран: ${count} модулей, ${value.mass} т, энергобаланс ${value.energy > 0 ? '+' : ''}${value.energy}`;
      },
    },
    tests: [
      {
        name: 'Масса и энергия посчитаны',
        expr:
          'const ship = assembleShip("Квест", [\n' +
          '  { name: "Реактор", weight: 150, energy: 120 },\n' +
          '  { name: "Двигатель", weight: 200, energy: -60 },\n' +
          ']);\n' +
          'return { name: ship.name, mass: ship.mass, energy: ship.energy };',
        expected: { name: 'Квест', mass: 350, energy: 60 },
      },
      {
        name: 'Пустой корабль — нули',
        expr: 'const ship = assembleShip("Каркас", []); return { mass: ship.mass, energy: ship.energy };',
        expected: { mass: 0, energy: 0 },
      },
      {
        name: 'Энергобаланс уходит в минус',
        expr:
          'return assembleShip("Тест", [{ weight: 10, energy: -40 }, { weight: 10, energy: -30 }]).energy;',
        expected: -70,
      },
      {
        name: 'Модули сохранены в корабле',
        expr: 'return assembleShip("Тест", [{ weight: 1, energy: 1 }]).modules.length;',
        expected: 1,
      },
    ],
  },

  /* ---------------------------------------------------------------- 6 -- */
  {
    id: 'preflight',
    order: 6,
    title: 'Предстартовая диагностика',
    topic: 'Массив проблем, some, проверки',
    difficulty: 4,
    reward: { credits: 32000, xp: 150 },
    unlocks: { view: 'flight', label: 'Диагностика' },
    story:
      'Диспетчер не выпустит корабль без проверки. Нужен отчёт: готов к вылету или ' +
      'список причин, почему нет.',
    signature: 'checkReadiness(ship, crew) → { ready, problems }',
    brief: 
      'Напишите функцию checkReadiness, которая решает, выпускать ли корабль.\n' +
      'На входе: ship — объект с полями modules (массив) и energy (число), crew — массив людей, у каждого есть поле role.\n' +
      'Вернуть нужно объект с двумя полями: problems и ready.\n' +
      'problems — массив строк с найденными неполадками, строго в этом порядке:\n' +
      '• "Нет двигателя" — если среди ship.modules нет ни одного с type "engine";\n' +
      '• "Не хватает энергии" — если ship.energy меньше нуля;\n' +
      '• "Нет капитана" — если в crew нет человека с role "Капитан".\n' +
      'ready — true, если массив problems пуст, и false, если в нём хоть что-то есть.\n' +
      'Порядок важен: тесты сравнивают массив целиком, а не просто ищут в нём строки.',
    theory: [
      'some(условие) вернёт true, если хотя бы один элемент подходит.',
      'Восклицательный знак переворачивает ответ: !some(...) — это «ни одного такого нет».',
      'push добавляет строку в конец массива проблем.',
      'ready считают как problems.length === 0, а не через if (problems).',
    ],
    lesson: [
      {
        title: 'some отвечает на вопрос «есть ли хоть один»',
        text:
          'some перебирает массив и возвращает true, как только находит элемент, подходящий под условие. Он не выдаёт сам элемент — только да или нет. Это ровно то, что нужно для проверок.',
        code:
          'const modules = [\n' +
          '  { type: "reactor" }, { type: "engine" },\n' +
          '];\n' +
          '\n' +
          'modules.some(m => m.type === "engine")   // true\n' +
          'modules.some(m => m.type === "drill")    // false\n' +
          '\n' +
          '// Восклицательный знак переворачивает ответ\n' +
          '!modules.some(m => m.type === "engine")   // false: он есть',
      },
      {
        title: 'Проблемы копятся в массиве',
        text:
          'Заведите пустой массив и добавляйте в него строку каждый раз, когда проверка не прошла. Порядок добавления и есть порядок в результате, поэтому проверки пишут в нужной последовательности.',
        code:
          'const problems = [];\n' +
          '\n' +
          'if (нет двигателя) problems.push("Нет двигателя");\n' +
          'if (энергии мало) problems.push("Не хватает энергии");\n' +
          'if (нет капитана) problems.push("Нет капитана");\n' +
          '\n' +
          'problems   // [] если всё в порядке',
      },
      {
        title: 'Пустой массив — это ещё не false',
        text:
          'В JavaScript пустой массив считается истинным значением, поэтому if (problems) сработает всегда. Проверять надо длину: ready истинно, когда длина равна нулю.',
        code:
          'const problems = [];\n' +
          '\n' +
          'if (problems) { }         // сработает и для пустого!\n' +
          '\n' +
          'problems.length === 0     // вот это правильная проверка\n' +
          'const ready = problems.length === 0;',
      },
    ],
    fn: 'checkReadiness',
    starter:
      'function checkReadiness(ship, crew) {\n' +
      '  const problems = [];\n' +
      '  // проверьте двигатель, энергию и капитана\n' +
      '  return { ready: problems.length === 0, problems };\n' +
      '}\n',
    hints: [
      'Заведите пустой массив problems и проведите три независимые проверки одну за другой.',
      'Каждая проверка — это отдельный if: условие не прошло, значит в массив уходит строка.',
      'В конце верните { ready: problems.length === 0, problems } — поля можно записать в любом порядке.',
    ],
    solution:
      'function checkReadiness(ship, crew) {\n' +
      '  const problems = [];\n' +
      '\n' +
      '  if (!ship.modules.some(module => module.type === "engine")) {\n' +
      '    problems.push("Нет двигателя");\n' +
      '  }\n' +
      '  if (ship.energy < 0) {\n' +
      '    problems.push("Не хватает энергии");\n' +
      '  }\n' +
      '  if (!crew.some(member => member.role === "Капитан")) {\n' +
      '    problems.push("Нет капитана");\n' +
      '  }\n' +
      '\n' +
      '  return { ready: problems.length === 0, problems };\n' +
      '}\n',
    practice: {
      title: 'Проведите диагностику',
      hint: 'corp.ship — собранный вами корабль, corp.crew — нанятый экипаж. Отчёт вашей функции станет допуском к вылету.',
      example: 'checkReadiness(corp.ship, corp.crew)',
      validate: (value, context) => {
        if (!context.corp.ship) return 'Сначала соберите корабль в предыдущем задании';
        if (!value || typeof value !== 'object') return 'Команда должна вернуть объект отчёта';
        if (typeof value.ready !== 'boolean') return 'В отчёте нет логического поля ready';
        if (!Array.isArray(value.problems)) return 'В отчёте нет массива problems';
        return true;
      },
      commit: (value, api) => {
        api.setRecord('report', { ready: value.ready, problems: value.problems });
        return value.ready
          ? 'Диспетчер выдал допуск к вылету'
          : `Отчёт принят: замечаний — ${value.problems.length}`;
      },
    },
    tests: [
      {
        name: 'Корабль готов к вылету',
        args: [
          { modules: [{ type: 'engine' }, { type: 'reactor' }], energy: 60 },
          [{ role: 'Капитан' }],
        ],
        expected: { ready: true, problems: [] },
      },
      {
        name: 'Нет двигателя',
        args: [{ modules: [{ type: 'reactor' }], energy: 120 }, [{ role: 'Капитан' }]],
        expected: { ready: false, problems: ['Нет двигателя'] },
      },
      {
        name: 'Три проблемы сразу и в нужном порядке',
        args: [{ modules: [], energy: -10 }, []],
        expected: { ready: false, problems: ['Нет двигателя', 'Не хватает энергии', 'Нет капитана'] },
      },
      {
        name: 'Нулевая энергия проблемой не считается',
        args: [{ modules: [{ type: 'engine' }], energy: 0 }, [{ role: 'Капитан' }]],
        expected: { ready: true, problems: [] },
      },
    ],
  },

  /* ---------------------------------------------------------------- 7 -- */
  {
    id: 'stats',
    order: 7,
    title: 'Сводка по базе',
    topic: 'Массивы записей: reduce, сравнение',
    difficulty: 4,
    reward: { credits: 26000, xp: 140 },
    unlocks: { view: 'database', label: 'База данных' },
    story:
      'Бортовая база копит записи: командиров, верфи, корабли, отчёты. Совет ' +
      'требует сводку — и считать её должна ваша функция, а не бухгалтер.',
    signature: 'collectionStats(records) → { count, totalMass, heaviest }',
    brief: 
      'Напишите функцию collectionStats, которая делает сводку по записям из базы.\n' +
      'На входе: records — массив записей; у каждой есть поля name и mass.\n' +
      'Вернуть нужно объект:\n' +
      '• count — сколько всего записей;\n' +
      '• totalMass — сумма поля mass у всех записей, для пустого массива 0;\n' +
      '• heaviest — имя (поле name) самой тяжёлой записи, а если записей нет — null.\n' +
      'Если у нескольких записей масса одинаковая и наибольшая, берите первую из них.',
    theory: [
      'Количество записей — это records.length.',
      'Сумма: records.reduce((sum, record) => sum + (record.mass ?? 0), 0).',
      'Максимум ищут циклом с переменной best, начатой с null.',
      'heaviest — это имя записи, то есть best.name, а не сама запись.',
    ],
    lesson: [
      {
        title: 'Поиск максимума — это цикл с памятью',
        text:
          'Заведите переменную для лучшего пока элемента и сравнивайте с ней каждый следующий. Начальное значение null означает «ещё ничего не видели» — и заодно решает случай пустого массива.',
        code:
          'let best = null;\n' +
          '\n' +
          'for (const record of records) {\n' +
          '  if (best === null || record.mass > best.mass) {\n' +
          '    best = record;\n' +
          '  }\n' +
          '}\n' +
          '\n' +
          '// best — самая тяжёлая запись или null для пустого',
      },
      {
        title: 'Строгое «больше» оставляет первого из равных',
        text:
          'Сравнение через > меняет лучшего только когда новый действительно тяжелее. Если написать >=, каждый следующий с такой же массой будет вытеснять предыдущего, и вместо первого из равных вы получите последнего.',
        code:
          'const records = [\n' +
          '  { name: "А", mass: 100 }, { name: "Б", mass: 100 },\n' +
          '];\n' +
          '\n' +
          '// с >   останется "А" — первый из равных\n' +
          '// с >=  останется "Б" — а тест ждёт "А"',
      },
      {
        title: 'Осторожно с полем, которого может не быть',
        text:
          'Если у записи нет поля mass, обращение к нему даёт undefined, а сложение с undefined превращает всю сумму в NaN. Оператор ?? подставляет ноль вместо пропуска.',
        code:
          '0 + undefined            // NaN — испорчена вся сумма\n' +
          '0 + (undefined ?? 0)     // 0 — порядок\n' +
          '\n' +
          'records.reduce((sum, r) => sum + (r.mass ?? 0), 0);',
      },
    ],
    fn: 'collectionStats',
    starter:
      'function collectionStats(records) {\n' +
      '  // посчитайте количество, сумму масс и самую тяжёлую запись\n' +
      '}\n',
    hints: [
      'Три поля считаются независимо: длина, сумма и поиск самой тяжёлой.',
      'Для максимума заведите переменную best = null и пройдите по массиву обычным for…of.',
      'В конце не забудьте: heaviest — это строка best.name, а при пустом массиве null.',
    ],
    solution:
      'function collectionStats(records) {\n' +
      '  const totalMass = records.reduce((sum, record) => sum + (record.mass ?? 0), 0);\n' +
      '\n' +
      '  let best = null;\n' +
      '  for (const record of records) {\n' +
      '    if (!best || (record.mass ?? 0) > (best.mass ?? 0)) best = record;\n' +
      '  }\n' +
      '\n' +
      '  return { count: records.length, totalMass, heaviest: best ? best.name : null };\n' +
      '}\n',
    practice: {
      title: 'Сохраните сводку в базу',
      hint: 'Прочитайте коллекцию из базы своей командой и положите результат обратно: db.all читает, db.insert записывает.',
      example: 'db.insert("reports", collectionStats(db.all("ships")))',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённую запись';
        if (typeof value.count !== 'number') return 'В записи нет числового поля count — сохраните результат collectionStats';
        if (typeof value.id !== 'number') return 'Запись не попала в базу: оберните результат в db.insert("reports", …)';
        return true;
      },
      commit: value => `Сводка сохранена в коллекцию reports: ${value.count} записей, ${value.totalMass ?? 0} т`,
    },
    tests: [
      {
        name: 'Три записи',
        args: [[{ name: 'Квест', mass: 350 }, { name: 'Титан', mass: 500 }, { name: 'Зонд', mass: 40 }]],
        expected: { count: 3, totalMass: 890, heaviest: 'Титан' },
      },
      { name: 'Пустая коллекция', args: [[]], expected: { count: 0, totalMass: 0, heaviest: null } },
      {
        name: 'Одна запись',
        args: [[{ name: 'Квест', mass: 350 }]],
        expected: { count: 1, totalMass: 350, heaviest: 'Квест' },
      },
      {
        name: 'Первая из равных по массе',
        args: [[{ name: 'А', mass: 100 }, { name: 'Б', mass: 100 }]],
        expected: { count: 2, totalMass: 200, heaviest: 'А' },
      },
    ],
  },

  /* ---------------------------------------------------------------- 8 -- */
  {
    id: 'panel',
    order: 8,
    title: 'Своя панель на дашборде',
    topic: 'Функция как виджет, работа с базой',
    difficulty: 4,
    reward: { credits: 30000, xp: 160 },
    unlocks: { view: 'panels', label: 'Панели' },
    story:
      'Командный центр показывает то, что нужно диспетчеру. А вам нужна своя ' +
      'панель — и её вы напишете сами: функция читает базу и возвращает то, ' +
      'что показать.',
    signature: 'shipPanel(db) → описание панели',
    brief: 
      'Напишите функцию shipPanel — она станет виджетом на вашем дашборде.\n' +
      'На входе: db — бортовая база данных. Вызов db.last("ships") даёт последнюю запись о корабле или null, если кораблей ещё нет.\n' +
      'Вернуть нужно объект-описание панели, а рисовать её игра будет сама.\n' +
      'Если корабль есть:\n' +
      '• title — строка "Корабль";\n' +
      '• value — масса корабля, то есть поле mass записи;\n' +
      '• unit — строка "т";\n' +
      '• note — строка вида "Энергобаланс 60", где число берётся из поля energy.\n' +
      'Если корабля нет, вернуть только два поля: title со строкой "Корабль" и value со строкой "не собран". Полей unit и note быть не должно.',
    theory: [
      'db.last("ships") вернёт последнюю запись коллекции или null.',
      'Проверка «записи нет» короче всего пишется как if (!ship).',
      'Шаблонная строка: `Энергобаланс ${ship.energy}` в обратных кавычках.',
      'Игра нарисует то, что вы вернули: title, value, unit и note.',
    ],
    lesson: [
      {
        title: 'Функция как описание, а не как рисование',
        text:
          'Ваша функция ничего не выводит на экран. Она возвращает объект, который описывает, что показать, — а отрисовкой занимается игра. Такой объект часто называют спецификацией.',
        code:
          '// Функция отдаёт описание…\n' +
          'function fuelPanel() {\n' +
          '  return { title: "Топливо", value: 192, unit: "т" };\n' +
          '}\n' +
          '\n' +
          '// …а игра превращает его в карточку на дашборде',
      },
      {
        title: 'Шаблонная строка подставляет значения',
        text:
          'Обратные кавычки позволяют вставлять значения прямо в текст через ${...}. Это короче и надёжнее, чем склейка плюсами.',
        code:
          'const energy = -40;\n' +
          '\n' +
          '"Энергобаланс " + energy      // "Энергобаланс -40"\n' +
          '`Энергобаланс ${energy}`     // то же, но читается лучше\n' +
          '\n' +
          '// Кавычки обратные — на клавише с буквой Ё',
      },
      {
        title: 'Две ветки — два разных набора полей',
        text:
          'Когда корабля нет, лишние поля не нужно заполнять пустыми значениями — их просто не должно быть в объекте. Проще всего выйти из функции сразу, отдельным return.',
        code:
          'function shipPanel(db) {\n' +
          '  const ship = db.last("ships");\n' +
          '\n' +
          '  if (!ship) {\n' +
          '    return { title: "Корабль", value: "не собран" };\n' +
          '  }\n' +
          '\n' +
          '  // сюда попадаем, только если корабль есть\n' +
          '}',
      },
    ],
    fn: 'shipPanel',
    starter:
      'function shipPanel(db) {\n' +
      '  const ship = db.last("ships");\n' +
      '  // верните описание панели\n' +
      '}\n',
    hints: [
      'Сначала достаньте запись из базы в переменную, а потом решайте, что возвращать.',
      'Случай «корабля нет» закройте отдельным ранним return — он короткий.',
      'Во второй ветке верните четыре поля; note соберите шаблонной строкой в обратных кавычках.',
    ],
    solution:
      'function shipPanel(db) {\n' +
      '  const ship = db.last("ships");\n' +
      '  if (!ship) {\n' +
      '    return { title: "Корабль", value: "не собран" };\n' +
      '  }\n' +
      '\n' +
      '  return {\n' +
      '    title: "Корабль",\n' +
      '    value: ship.mass,\n' +
      '    unit: "т",\n' +
      '    note: `Энергобаланс ${ship.energy}`,\n' +
      '  };\n' +
      '}\n',
    practice: {
      title: 'Повесьте панель на дашборд',
      hint: 'Зарегистрируйте свою функцию: игра сохранит её и будет запускать при каждой отрисовке Командного центра.',
      example: 'dashboard.add("ship", shipPanel)',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть описание панели';
        if (typeof value.title !== 'string') return 'У панели нет строкового поля title';
        if (value.value === undefined) return 'У панели нет поля value';
        return true;
      },
      commit: value => `Панель «${value.title}» повешена на дашборд`,
    },
    tests: [
      {
        name: 'Корабль есть',
        expr:
          'const db = { last: () => ({ name: "Квест", mass: 350, energy: 60 }) };\n' +
          'return shipPanel(db);',
        expected: { title: 'Корабль', value: 350, unit: 'т', note: 'Энергобаланс 60' },
      },
      {
        name: 'Кораблей нет',
        expr: 'const db = { last: () => null };\nreturn shipPanel(db).value;',
        expected: 'не собран',
      },
      {
        name: 'Заголовок всегда на месте',
        expr: 'const db = { last: () => null };\nreturn shipPanel(db).title;',
        expected: 'Корабль',
      },
      {
        name: 'Отрицательный энергобаланс попадает в подпись',
        expr:
          'const db = { last: () => ({ name: "Тест", mass: 10, energy: -40 }) };\n' +
          'return shipPanel(db).note;',
        expected: 'Энергобаланс -40',
      },
    ],
  },
  /* ---------------------------------------------------------------- 9 -- */
  {
    id: 'plan',
    order: 9,
    title: 'Полётный план',
    topic: 'Арифметика и округление вверх',
    difficulty: 3,
    reward: { credits: 30000, xp: 170 },
    unlocks: { view: 'routes', label: 'Маршруты' },
    story:
      'Корабль собран и допущен к вылету, но диспетчер не выпустит его без ' +
      'расчёта: сколько топлива сжечь и сколько часов лететь. Тяжёлый корабль ' +
      'ест больше — это и придётся посчитать.',
    signature: 'planFlight(ship, distance) → { distance, fuel, hours }',
    brief: 
      'Напишите функцию planFlight, которая считает план рейса.\n' +
      'На входе: ship — объект корабля с полем mass (масса в тоннах), distance — расстояние до цели в километрах.\n' +
      'Вернуть нужно объект:\n' +
      '• distance — то же расстояние, что пришло;\n' +
      '• fuel — расход топлива: масса умножается на расстояние и делится на 1000;\n' +
      '• hours — время в пути: расстояние делится на 12.\n' +
      'И топливо, и часы округляются ВВЕРХ до целого: бак заправляют целыми тоннами, а смену диспетчер считает целыми часами.\n' +
      'Например, при массе 430 и расстоянии 240 получится 104 тонны и 20 часов.',
    theory: [
      'Math.ceil(4.1) вернёт 5 — округление вверх даже при крошечном остатке.',
      'Масса лежит в ship.mass: объект приходит целиком, поле берут через точку.',
      'Расход: Math.ceil(ship.mass * distance / 1000).',
      'Часы: Math.ceil(distance / 12).',
    ],
    lesson: [
      {
        title: 'Три способа округлить — и они разные',
        text:
          'Math.round округляет к ближайшему целому, Math.floor отбрасывает дробную часть вниз, а Math.ceil поднимает до ближайшего целого вверх. Для запасов топлива годится только ceil: недолить нельзя, а лишняя тонна не помешает.',
        code:
          'Math.round(103.2)   // 103\n' +
          'Math.floor(103.9)   // 103\n' +
          'Math.ceil(103.2)    // 104\n' +
          'Math.ceil(104.0)    // 104 — целое остаётся целым',
      },
      {
        title: 'Порядок действий обычный, школьный',
        text:
          'Умножение и деление выполняются слева направо, до сложения. Выражение ship.mass * distance / 1000 сначала умножит, потом разделит — именно так и нужно.',
        code:
          'const mass = 430;\n' +
          'const distance = 240;\n' +
          '\n' +
          'mass * distance          // 103200\n' +
          'mass * distance / 1000   // 103.2\n' +
          '\n' +
          'Math.ceil(mass * distance / 1000);   // 104',
      },
      {
        title: 'Ноль тоже должен считаться',
        text:
          'Если расстояние нулевое, и топлива, и часов должно выйти ровно ноль. Формула даёт это сама — отдельная проверка на ноль не нужна и только запутает.',
        code:
          'Math.ceil(430 * 0 / 1000)   // 0\n' +
          'Math.ceil(0 / 12)           // 0',
      },
    ],
    fn: 'planFlight',
    starter:
      'function planFlight(ship, distance) {\n' +
      '  // посчитайте расход топлива и время в пути\n' +
      '}\n',
    hints: [
      'Обе величины считаются по одной формуле каждая — сложных условий здесь нет.',
      'Округлять нужно ВВЕРХ: из трёх функций Math подходит только одна.',
      'Посчитайте fuel и hours в переменные, а потом верните объект из трёх полей.',
    ],
    solution:
      'function planFlight(ship, distance) {\n' +
      '  const fuel = Math.ceil(ship.mass * distance / 1000);\n' +
      '  const hours = Math.ceil(distance / 12);\n' +
      '\n' +
      '  return { distance, fuel, hours };\n' +
      '}\n',
    practice: {
      title: 'Утвердите план у диспетчера',
      hint:
        'Посчитайте план для своего корабля и положите его в базу. Корабль ' +
        'лежит в corp.ship — это запись, которую вы сами туда занесли.',
      example: 'db.insert("plans", planFlight(corp.ship, 240))',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённый план полёта';
        if (typeof value.fuel !== 'number' || typeof value.hours !== 'number') {
          return 'В плане нет числовых полей fuel и hours — передайте результат planFlight';
        }
        if (value.fuel <= 0) return 'Расход топлива получился нулевым: проверьте массу корабля в corp.ship';
        if (typeof value.id !== 'number') return 'План не попал в базу: оберните результат в db.insert("plans", …)';
        return true;
      },
      commit: value =>
        `План утверждён: ${value.fuel} т топлива на ${value.hours} ч пути`,
    },
    tests: [
      { name: 'Ближний рейс', args: [{ mass: 430 }, 240], expected: { distance: 240, fuel: 104, hours: 20 } },
      { name: 'Дальний рейс', args: [{ mass: 430 }, 680], expected: { distance: 680, fuel: 293, hours: 57 } },
      { name: 'Лёгкий корабль', args: [{ mass: 100 }, 100], expected: { distance: 100, fuel: 10, hours: 9 } },
      {
        name: 'Остаток округляется вверх',
        expr: 'return planFlight({ mass: 1 }, 1).fuel;',
        expected: 1,
      },
      { name: 'Нулевое расстояние', args: [{ mass: 430 }, 0], expected: { distance: 0, fuel: 0, hours: 0 } },
    ],
  },

  /* --------------------------------------------------------------- 10 -- */
  {
    id: 'expedition',
    order: 10,
    title: 'Первая экспедиция',
    topic: 'Цикл с накоплением и выходом',
    difficulty: 4,
    reward: { credits: 35000, xp: 190 },
    unlocks: { view: 'expedition', label: 'Экспедиция' },
    story:
      'План есть, бак полон, буры на месте. Осталось написать саму экспедицию: ' +
      'корабль уходит к поясу, час за часом грызёт породу и возвращается, ' +
      'когда кончится время или забьётся трюм.',
    signature: 'runExpedition(ship, plan) → { ok, ore, hours, fuelLeft, full }',
    brief: 
      'Напишите функцию runExpedition, которая проводит добывающий рейс.\n' +
      'На входе два объекта. В ship лежит корабль:\n' +
      '• drills — сколько буров на борту;\n' +
      '• fuel — сколько топлива в баке;\n' +
      '• cargo — вместимость трюма в тоннах.\n' +
      'В plan лежит утверждённый план рейса:\n' +
      '• hours — сколько часов запланировано работать;\n' +
      '• fuel — сколько топлива нужно на рейс;\n' +
      '• richness — сколько тонн руды даёт один бур за час.\n' +
      'Сначала проверьте топливо. Если в баке меньше, чем требует план, рейс не состоится: верните { ok: false, ore: 0, hours: 0, fuelLeft: ship.fuel, full: false }.\n' +
      'Если топлива хватает, рейс идёт по часам. За каждый час добывается ship.drills × plan.richness тонн руды.\n' +
      'Как только добытого стало не меньше вместимости трюма, груз равен ровно ship.cargo, и рейс прерывается досрочно — дальше грузить некуда.\n' +
      'Вернуть нужно объект:\n' +
      '• ok — состоялся ли рейс;\n' +
      '• ore — сколько руды привезли;\n' +
      '• hours — сколько часов реально отработали;\n' +
      '• fuelLeft — остаток топлива в баке;\n' +
      '• full — забился ли трюм.',
    theory: [
      'Счётчик: for (let hour = 1; hour <= plan.hours; hour += 1) { … }',
      'Накопитель объявляют до цикла: let ore = 0, внутри ore += добыча.',
      'break прерывает цикл досрочно — им и закрывают полный трюм.',
      'Проверку топлива делают до цикла: незачем считать рейс, которого не будет.',
    ],
    lesson: [
      {
        title: 'Цикл со счётчиком, когда число шагов известно',
        text:
          'Форма for с тремя частями читается так: с чего начать, пока что продолжать, что делать в конце круга. Переменная hour живёт только внутри цикла.',
        code:
          'for (let hour = 1; hour <= 5; hour += 1) {\n' +
          '  console.log(hour);   // 1, 2, 3, 4, 5\n' +
          '}\n' +
          '\n' +
          '// hour += 1 — то же, что hour = hour + 1',
      },
      {
        title: 'Накопитель живёт снаружи цикла',
        text:
          'Переменную, в которой копится результат, объявляют ДО цикла. Если объявить её внутри, она будет создаваться заново на каждом круге и обнулять всё сделанное.',
        code:
          'let ore = 0;                 // снаружи — накапливается\n' +
          '\n' +
          'for (let hour = 1; hour <= 3; hour += 1) {\n' +
          '  ore += 10;\n' +
          '}\n' +
          '\n' +
          'ore   // 30',
      },
      {
        title: 'break прерывает цикл досрочно',
        text:
          'Иногда идти до конца незачем: трюм полон, и следующие часы ничего не изменят. break немедленно выходит из цикла, а строки после него на этом круге не выполняются.',
        code:
          'let ore = 0;\n' +
          'let hours = 0;\n' +
          '\n' +
          'for (let hour = 1; hour <= 20; hour += 1) {\n' +
          '  hours = hour;          // запомнили отработанный час\n' +
          '  ore += 24;\n' +
          '\n' +
          '  if (ore >= 150) {\n' +
          '    ore = 150;           // сверх трюма не увезти\n' +
          '    break;               // выходим, не досчитав до 20\n' +
          '  }\n' +
          '}',
      },
      {
        title: 'Ранний выход бережёт от лишней работы',
        text:
          'Проверку топлива делают до цикла. Если рейс не состоится, считать часы бессмысленно — проще сразу вернуть отказ и не заводить вложенных условий.',
        code:
          'if (ship.fuel < plan.fuel) {\n' +
          '  return {\n' +
          '    ok: false, ore: 0, hours: 0,\n' +
          '    fuelLeft: ship.fuel, full: false,\n' +
          '  };\n' +
          '}\n' +
          '\n' +
          '// ниже этой строки топлива заведомо хватает',
      },
    ],
    fn: 'runExpedition',
    starter:
      'function runExpedition(ship, plan) {\n' +
      '  // сначала проверьте топливо, потом ведите цикл по часам\n' +
      '}\n',
    hints: [
      'Отказ по топливу — отдельный случай: закройте его до цикла и выйдите через return.',
      'Внутри цикла запоминайте отработанный час в переменную, иначе после break вы не узнаете, сколько прошло.',
      'Полный трюм: если добытого стало не меньше ship.cargo, приравняйте груз к ship.cargo, поднимите флаг и прервите цикл.',
    ],
    solution:
      'function runExpedition(ship, plan) {\n' +
      '  if (ship.fuel < plan.fuel) {\n' +
      '    return { ok: false, ore: 0, hours: 0, fuelLeft: ship.fuel, full: false };\n' +
      '  }\n' +
      '\n' +
      '  let ore = 0;\n' +
      '  let hours = 0;\n' +
      '  let full = false;\n' +
      '\n' +
      '  for (let hour = 1; hour <= plan.hours; hour += 1) {\n' +
      '    hours = hour;\n' +
      '    ore += ship.drills * plan.richness;\n' +
      '\n' +
      '    if (ore >= ship.cargo) {\n' +
      '      ore = ship.cargo;\n' +
      '      full = true;\n' +
      '      break;\n' +
      '    }\n' +
      '  }\n' +
      '\n' +
      '  return { ok: true, ore, hours, fuelLeft: ship.fuel - plan.fuel, full };\n' +
      '}\n',
    practice: {
      title: 'Отправьте корабль в рейс',
      hint:
        'Проведите рейс своей функцией и запишите результат в базу. Корабль и ' +
        'план возьмите из corp: corp.expeditionShip и corp.expeditionPlan уже ' +
        'собраны по вашим модулям, баку и последнему плану.',
      example: 'db.insert("expeditions", runExpedition(corp.expeditionShip, corp.expeditionPlan))',
      validate: (value, context) => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённый отчёт о рейсе';
        if (typeof value.ore !== 'number') return 'В отчёте нет числового поля ore — передайте результат runExpedition';
        if (value.ok !== true) {
          const fuel = context?.corp?.expeditionShip?.fuel ?? 0;
          const need = context?.corp?.expeditionPlan?.fuel ?? 0;
          return `Рейс не состоялся: в баке ${fuel} т, а нужно ${need} т. Заправьтесь в разделе «Маршруты»`;
        }
        if (value.ore <= 0) return 'Рейс прошёл, но руды нет: купите бур на верфи — добывать нечем';
        if (typeof value.id !== 'number') return 'Отчёт не попал в базу: оберните результат в db.insert("expeditions", …)';
        return true;
      },
      commit: (value, api) => {
        const delivered = api.deliverExpedition(value);
        return delivered;
      },
    },
    tests: [
      {
        name: 'Обычный рейс',
        args: [{ drills: 1, fuel: 200, cargo: 150 }, { hours: 20, fuel: 104, richness: 3 }],
        expected: { ok: true, ore: 60, hours: 20, fuelLeft: 96, full: false },
      },
      {
        name: 'Трюм забился досрочно',
        args: [{ drills: 3, fuel: 200, cargo: 150 }, { hours: 20, fuel: 104, richness: 3 }],
        expected: { ok: true, ore: 150, hours: 17, fuelLeft: 96, full: true },
      },
      {
        name: 'Не хватило топлива',
        args: [{ drills: 2, fuel: 50, cargo: 150 }, { hours: 20, fuel: 104, richness: 3 }],
        expected: { ok: false, ore: 0, hours: 0, fuelLeft: 50, full: false },
      },
      {
        name: 'Без буров руды нет',
        args: [{ drills: 0, fuel: 200, cargo: 150 }, { hours: 20, fuel: 104, richness: 3 }],
        expected: { ok: true, ore: 0, hours: 20, fuelLeft: 96, full: false },
      },
      {
        name: 'Топлива ровно впритык — рейс идёт',
        expr: 'return runExpedition({ drills: 1, fuel: 104, cargo: 150 }, { hours: 10, fuel: 104, richness: 2 }).ok;',
        expected: true,
      },
    ],
  },

  /* --------------------------------------------------------------- 11 -- */
  {
    id: 'trade',
    order: 11,
    title: 'Торговля рудой',
    topic: 'Сортировка и распределение по лимитам',
    difficulty: 5,
    reward: { credits: 40000, xp: 220 },
    unlocks: { view: 'market', label: 'Рынок' },
    story:
      'Трюм полон, а счёт пуст. Покупатели на бирже дают разную цену и берут ' +
      'разный объём: тот, кто платит больше всех, возьмёт совсем немного. ' +
      'Продать нужно так, чтобы выручка была наибольшей.',
    signature: 'sellOre(amount, offers) → { sold, revenue, deals }',
    brief: 
      'Напишите функцию sellOre, которая распродаёт руду как можно выгоднее.\n' +
      'На входе: amount — сколько тонн руды у вас есть, offers — массив предложений; у каждого есть buyer (название), price (цена за тонну) и limit (сколько тонн готов взять).\n' +
      'Продавать нужно по убыванию цены: сначала самому щедрому, потом следующему. Каждому отдавайте столько, сколько он готов взять, но не больше, чем у вас осталось.\n' +
      'Вернуть нужно объект:\n' +
      '• sold — сколько тонн удалось продать всего;\n' +
      '• revenue — общая выручка;\n' +
      '• deals — массив совершённых сделок { buyer, amount, sum } в порядке продажи.\n' +
      'Покупателей, которым ничего не досталось, в deals быть не должно.\n' +
      'Массив offers менять нельзя: сортировать нужно его копию.\n' +
      'Спроса может не хватить на весь груз — тогда sold окажется меньше amount, и это нормально.',
    theory: [
      'Копия массива: [...offers] — sort меняет массив на месте, а чужие данные портить нельзя.',
      'По убыванию цены: sort((a, b) => b.price - a.price).',
      'Сколько отдать этому покупателю: Math.min(остаток, offer.limit).',
      'Когда руда кончилась, прервите цикл через break.',
    ],
    lesson: [
      {
        title: 'sort меняет сам массив',
        text:
          'В отличие от map и filter, которые создают новый массив, sort переставляет элементы прямо в том массиве, у которого его вызвали. Чужие данные так портить нельзя, поэтому сортируют копию.',
        code:
          'const offers = [{ price: 540 }, { price: 900 }];\n' +
          '\n' +
          'offers.sort(...);          // испортили исходный массив\n' +
          '\n' +
          'const copy = [...offers];  // копия спредом\n' +
          'copy.sort(...);            // offers остался нетронутым',
      },
      {
        title: 'Функция сравнения задаёт порядок',
        text:
          'sort вызывает вашу функцию для пар элементов. Если она вернула отрицательное число, первый встанет раньше. Поэтому b минус a даёт убывание, а a минус b — возрастание.',
        code:
          'const offers = [\n' +
          '  { price: 540 }, { price: 900 }, { price: 720 },\n' +
          '];\n' +
          '\n' +
          '[...offers].sort((a, b) => b.price - a.price);\n' +
          '// 900, 720, 540 — по убыванию, то что нужно\n' +
          '\n' +
          '[...offers].sort((a, b) => a.price - b.price);\n' +
          '// 540, 720, 900 — по возрастанию',
      },
      {
        title: 'Math.min выбирает, сколько реально отдать',
        text:
          'Покупатель ограничен своим лимитом, вы — остатком груза. Отдать можно только меньшее из двух, и Math.min отвечает на этот вопрос одной строкой.',
        code:
          'let left = 60;                    // осталось руды\n' +
          'const limit = 40;             // больше он не возьмёт\n' +
          '\n' +
          'const take = Math.min(left, limit);   // 40\n' +
          '\n' +
          'left -= take;                 // осталось 20 следующему',
      },
      {
        title: 'Когда груз кончился, дальше идти незачем',
        text:
          'После нескольких сделок руда может закончиться, а покупатели в списке останутся. Добавлять сделки на ноль тонн нельзя — тест этого не примет. Прервите цикл через break.',
        code:
          'for (const offer of sorted) {\n' +
          '  if (left <= 0) break;     // продавать больше нечего\n' +
          '\n' +
          '  const take = Math.min(left, offer.limit);\n' +
          '  if (take <= 0) continue;  // этот ничего не берёт\n' +
          '\n' +
          '  // …записываем сделку\n' +
          '}',
      },
    ],
    fn: 'sellOre',
    starter:
      'function sellOre(amount, offers) {\n' +
      '  // отсортируйте копию предложений и распродайте руду\n' +
      '}\n',
    hints: [
      'Сначала отсортируйте копию предложений по убыванию цены — дальше идите по списку подряд.',
      'Ведите две переменные: сколько руды осталось и сколько выручки накопилось.',
      'В deals кладите объект { buyer, amount, sum } только когда реально что-то продали; sold удобно посчитать как amount минус остаток.',
    ],
    solution:
      'function sellOre(amount, offers) {\n' +
      '  const sorted = [...offers].sort((a, b) => b.price - a.price);\n' +
      '\n' +
      '  let left = amount;\n' +
      '  let revenue = 0;\n' +
      '  const deals = [];\n' +
      '\n' +
      '  for (const offer of sorted) {\n' +
      '    if (left <= 0) break;\n' +
      '\n' +
      '    const take = Math.min(left, offer.limit);\n' +
      '    if (take <= 0) continue;\n' +
      '\n' +
      '    deals.push({ buyer: offer.buyer, amount: take, sum: take * offer.price });\n' +
      '    revenue += take * offer.price;\n' +
      '    left -= take;\n' +
      '  }\n' +
      '\n' +
      '  return { sold: amount - left, revenue, deals };\n' +
      '}\n',
    practice: {
      title: 'Продайте добытое',
      hint:
        'Руда в бункере лежит в corp.ore, предложения покупателей — в corp.offers. ' +
        'Продайте и запишите сделку: выручка попадёт на счёт корпорации.',
      example: 'db.insert("deals", sellOre(corp.ore, corp.offers))',
      validate: (value, context) => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённый отчёт о продаже';
        if (typeof value.revenue !== 'number') return 'В отчёте нет числового поля revenue — передайте результат sellOre';
        if (!Array.isArray(value.deals)) return 'В отчёте нет массива deals со сделками';
        if (value.revenue <= 0) {
          const ore = context?.corp?.ore ?? 0;
          return ore > 0
            ? 'Выручка нулевая: проверьте, что цена умножается на объём'
            : 'В бункере нет руды — сначала сходите в экспедицию';
        }
        if (typeof value.id !== 'number') return 'Сделка не попала в базу: оберните результат в db.insert("deals", …)';
        return true;
      },
      commit: (value, api) => api.settleDeal(value),
    },
    tests: [
      {
        name: 'Хватает самому дорогому',
        args: [30, [{ buyer: 'Гефест', price: 900, limit: 40 }, { buyer: 'Орион', price: 720, limit: 90 }]],
        expected: { sold: 30, revenue: 27000, deals: [{ buyer: 'Гефест', amount: 30, sum: 27000 }] },
      },
      {
        name: 'Руда делится между двумя',
        args: [60, [{ buyer: 'Гефест', price: 900, limit: 40 }, { buyer: 'Орион', price: 720, limit: 90 }]],
        expected: {
          sold: 60,
          revenue: 50400,
          deals: [
            { buyer: 'Гефест', amount: 40, sum: 36000 },
            { buyer: 'Орион', amount: 20, sum: 14400 },
          ],
        },
      },
      {
        name: 'Порядок предложений не важен',
        expr:
          'const offers = [{ buyer: "Склады", price: 540, limit: 500 }, { buyer: "Гефест", price: 900, limit: 40 }];\n' +
          'return sellOre(40, offers).revenue;',
        expected: 36000,
      },
      {
        name: 'Исходный массив не меняется',
        expr:
          'const offers = [{ buyer: "Склады", price: 540, limit: 500 }, { buyer: "Гефест", price: 900, limit: 40 }];\n' +
          'sellOre(100, offers);\n' +
          'return offers[0].buyer;',
        expected: 'Склады',
      },
      {
        name: 'Продавать нечего',
        args: [0, [{ buyer: 'Гефест', price: 900, limit: 40 }]],
        expected: { sold: 0, revenue: 0, deals: [] },
      },
      {
        name: 'Спрос меньше груза',
        args: [100, [{ buyer: 'Гефест', price: 900, limit: 40 }]],
        expected: { sold: 40, revenue: 36000, deals: [{ buyer: 'Гефест', amount: 40, sum: 36000 }] },
      },
    ],
  },
  /* --------------------------------------------------------------- 12 -- */
  {
    id: 'arsenal',
    order: 12,
    title: 'Боевая сводка',
    topic: 'filter, map и агрегация по типу',
    difficulty: 3,
    reward: { credits: 34000, xp: 200 },
    unlocks: { view: 'arsenal', label: 'Арсенал' },
    story:
      'В поясе стало людно: рейдеры бьют по одиночным рудовозам. Совет ' +
      'разрешил корпорациям вооружаться, и верфь выкатила орудия и тяжёлые ' +
      'щиты. Первым делом штабу нужна сводка: чем корабль вообще может драться.',
    signature: 'combatStats(modules) → { attack, shield, weapons }',
    brief: 
      'Напишите функцию combatStats, которая делает боевую сводку по модулям корабля.\n' +
      'На входе: modules — массив модулей. У каждого есть name и type. У орудий (type "weapon") есть поле attack, у щитов (type "shield") — поле shield.\n' +
      'Вернуть нужно объект:\n' +
      '• attack — сумма поля attack у всех орудий;\n' +
      '• shield — сумма поля shield у всех щитов;\n' +
      '• weapons — массив названий орудий, в том же порядке, в каком они шли в modules.\n' +
      'Мирные модули — двигатели, реакторы, буры — в сводку не входят вообще.\n' +
      'Для пустого массива вернуть нули и пустой массив названий.',
    theory: [
      'filter отбирает по условию: modules.filter(m => m.type === "weapon").',
      'map превращает объекты в другое: weapons.map(m => m.name).',
      'reduce складывает: weapons.reduce((sum, m) => sum + m.attack, 0).',
      'Отобранное удобно положить в переменную: орудия нужны и для суммы, и для названий.',
    ],
    lesson: [
      {
        title: 'filter отбирает подходящие элементы',
        text:
          'filter проходит по массиву и оставляет те элементы, для которых условие истинно. Получается новый массив — исходный не меняется.',
        code:
          'const modules = [\n' +
          '  { name: "Лазер", type: "weapon", attack: 40 },\n' +
          '  { name: "Бур", type: "drill" },\n' +
          '];\n' +
          '\n' +
          'modules.filter(m => m.type === "weapon");\n' +
          '// [{ name: "Лазер", type: "weapon", attack: 40 }]',
      },
      {
        title: 'map превращает каждый элемент в другое',
        text:
          'map тоже возвращает новый массив, но той же длины: каждый элемент заменяется тем, что вернула ваша функция. Из объектов так достают одно поле.',
        code:
          'const weapons = [\n' +
          '  { name: "Лазер" }, { name: "Рельсотрон" },\n' +
          '];\n' +
          '\n' +
          'weapons.map(m => m.name);   // ["Лазер", "Рельсотрон"]',
      },
      {
        title: 'Методы массива выстраиваются в цепочку',
        text:
          'Каждый из них возвращает массив, а значит у результата можно сразу вызвать следующий. Сначала отбираем, потом превращаем или складываем.',
        code:
          '// В одну цепочку\n' +
          'modules\n' +
          '  .filter(m => m.type === "weapon")\n' +
          '  .reduce((sum, m) => sum + m.attack, 0);\n' +
          '\n' +
          '// Или через промежуточную переменную — так понятнее,\n' +
          '// когда отобранное нужно использовать дважды\n' +
          'const weapons = modules.filter(m => m.type === "weapon");\n' +
          'const attack = weapons.reduce(\n' +
          '  (sum, m) => sum + m.attack, 0,\n' +
          ');\n' +
          'const names = weapons.map(m => m.name);',
      },
    ],
    fn: 'combatStats',
    starter:
      'function combatStats(modules) {\n' +
      '  // отберите орудия и щиты, посчитайте сумму\n' +
      '}\n',
    hints: [
      'Орудия и щиты — две независимые выборки по полю type.',
      'Отобранные орудия нужны дважды: и для суммы атаки, и для списка названий, — сохраните их в переменную.',
      'Суммы считайте через reduce с нулём в конце: он же закроет случай пустого массива.',
    ],
    solution:
      'function combatStats(modules) {\n' +
      '  const weapons = modules.filter(module => module.type === "weapon");\n' +
      '  const shields = modules.filter(module => module.type === "shield");\n' +
      '\n' +
      '  return {\n' +
      '    attack: weapons.reduce((sum, module) => sum + module.attack, 0),\n' +
      '    shield: shields.reduce((sum, module) => sum + module.shield, 0),\n' +
      '    weapons: weapons.map(module => module.name),\n' +
      '  };\n' +
      '}\n',
    practice: {
      title: 'Сдайте сводку в штаб',
      hint:
        'Модули со склада лежат в corp.modules. Посчитайте по ним сводку и ' +
        'положите её в базу — штаб читает оттуда.',
      example: 'db.insert("arsenals", combatStats(corp.modules))',
      validate: value => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённую боевую сводку';
        if (typeof value.attack !== 'number' || typeof value.shield !== 'number') {
          return 'В сводке нет числовых полей attack и shield — передайте результат combatStats';
        }
        if (!Array.isArray(value.weapons)) return 'В сводке нет массива weapons с названиями орудий';
        if (typeof value.id !== 'number') return 'Сводка не попала в базу: оберните результат в db.insert("arsenals", …)';
        return true;
      },
      commit: value =>
        value.weapons.length === 0
          ? `Сводка принята: орудий нет, щит ${value.shield}. Верфь ждёт вас`
          : `Сводка принята: атака ${value.attack}, щит ${value.shield}, орудий ${value.weapons.length}`,
    },
    tests: [
      {
        name: 'Орудие и щит',
        args: [[
          { name: 'Лазер «Игла»', type: 'weapon', attack: 40 },
          { name: 'Генератор поля', type: 'shield', shield: 25 },
        ]],
        expected: { attack: 40, shield: 25, weapons: ['Лазер «Игла»'] },
      },
      {
        name: 'Мирные модули не в счёт',
        args: [[
          { name: 'Бур «Крот»', type: 'drill' },
          { name: 'Реактор', type: 'reactor' },
        ]],
        expected: { attack: 0, shield: 0, weapons: [] },
      },
      {
        name: 'Два орудия складываются',
        args: [[
          { name: 'Лазер', type: 'weapon', attack: 40 },
          { name: 'Рельсотрон', type: 'weapon', attack: 95 },
        ]],
        expected: { attack: 135, shield: 0, weapons: ['Лазер', 'Рельсотрон'] },
      },
      { name: 'Пустой список', args: [[]], expected: { attack: 0, shield: 0, weapons: [] } },
      {
        name: 'Щиты тоже суммируются',
        expr:
          'return combatStats([\n' +
          '  { name: "Поле", type: "shield", shield: 25 },\n' +
          '  { name: "Бастион", type: "shield", shield: 60 },\n' +
          ']).shield;',
        expected: 85,
      },
    ],
  },

  /* --------------------------------------------------------------- 13 -- */
  {
    id: 'strike',
    order: 13,
    title: 'Обмен ударами',
    topic: 'Ограничение значений, Math.max',
    difficulty: 3,
    reward: { credits: 36000, xp: 210 },
    unlocks: { view: 'range', label: 'Полигон' },
    story:
      'Орудия на месте, но стрелять пока некуда. На полигоне у космопорта ' +
      'стоят списанные корпуса — на них и проверим, что ваш расчёт урона ' +
      'работает до того, как в вас начнут стрелять в ответ.',
    signature: 'strike(attacker, defender) → { damage, hull }',
    brief: 
      'Напишите функцию strike, которая считает один выстрел.\n' +
      'На входе: attacker — объект с полем attack (сила залпа), defender — объект с полями shield (щит) и hull (прочность корпуса).\n' +
      'Щит гасит часть урона: проходит attack минус shield.\n' +
      'Но закрыться полностью нельзя — сквозь любой щит просачивается минимум 1 единица, даже если щит сильнее залпа.\n' +
      'Корпус в минус не уходит: если урон больше прочности, остаётся ровно 0.\n' +
      'Вернуть нужно объект:\n' +
      '• damage — сколько урона прошло;\n' +
      '• hull — прочность корпуса после выстрела.',
    theory: [
      'Math.max(1, x) вернёт x, а если он меньше единицы — то 1.',
      'Math.max(0, x) тем же приёмом не даёт значению уйти в минус.',
      'Сначала считают урон, потом вычитают его из корпуса — по шагам.',
      'Обе величины возвращают в одном объекте: { damage, hull }.',
    ],
    lesson: [
      {
        title: 'Math.max как нижняя граница',
        text:
          'Math.max возвращает большее из двух чисел. Если одно из них — это граница, получается приём «не меньше чем»: результат никогда не упадёт ниже неё.',
        code:
          'Math.max(1, 25)    // 25 — обычный случай\n' +
          'Math.max(1, -80)   // 1  — граница сработала\n' +
          'Math.max(0, -50)   // 0  — то же с нулём',
      },
      {
        title: 'Две границы — две разные задачи',
        text:
          'Урон не может быть меньше единицы, а прочность — меньше нуля. Это два независимых ограничения, и применяются они к разным величинам в разном порядке.',
        code:
          '// Сколько прошло сквозь щит: минимум 1\n' +
          'const damage = Math.max(\n' +
          '  1, attacker.attack - defender.shield,\n' +
          ');\n' +
          '\n' +
          '// Что осталось от корпуса: минимум 0\n' +
          'const hull = Math.max(0, defender.hull - damage);',
      },
      {
        title: 'Почему без нижней границы игра ломается',
        text:
          'Если оставить голое вычитание, при сильном щите урон станет отрицательным — и выстрелы начнут лечить цель. Единица, проходящая всегда, заодно гарантирует, что любой бой когда-нибудь закончится.',
        code:
          'const attack = 10;\n' +
          'const shield = 90;\n' +
          '\n' +
          'attack - shield                 // -80: корпус вырос бы\n' +
          'Math.max(1, attack - shield)   // 1: урон всё же прошёл',
      },
    ],
    fn: 'strike',
    starter:
      'function strike(attacker, defender) {\n' +
      '  // посчитайте прошедший урон и остаток корпуса\n' +
      '}\n',
    hints: [
      'Здесь две строки вычислений и один return: никаких условий не нужно.',
      'Каждую величину ограничивают снизу — подумайте, какое число будет границей для урона, а какое для корпуса.',
      'Посчитайте damage первым: hull зависит от него, а не наоборот.',
    ],
    solution:
      'function strike(attacker, defender) {\n' +
      '  const damage = Math.max(1, attacker.attack - defender.shield);\n' +
      '  const hull = Math.max(0, defender.hull - damage);\n' +
      '\n' +
      '  return { damage, hull };\n' +
      '}\n',
    practice: {
      title: 'Проверьте орудия на полигоне',
      hint:
        'Ваш корабль с его боевой сводкой лежит в corp.battleShip, мишени — ' +
        'в corp.targets. Выстрелите по первой и запишите результат.',
      example: 'db.insert("strikes", strike(corp.battleShip, corp.targets[0]))',
      validate: (value, context) => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённый результат выстрела';
        if (typeof value.damage !== 'number' || typeof value.hull !== 'number') {
          return 'В результате нет числовых полей damage и hull — передайте результат strike';
        }
        if (value.damage < 1) return 'Сквозь щит всегда проходит минимум 1 единица урона';
        if ((context?.corp?.battleShip?.attack ?? 0) === 0) {
          return 'На корабле нет орудий: купите лазер или рельсотрон на верфи';
        }
        if (typeof value.id !== 'number') return 'Выстрел не попал в базу: оберните результат в db.insert("strikes", …)';
        return true;
      },
      commit: value => `Залп зачтён: ${value.damage} урона, в корпусе мишени осталось ${value.hull}`,
    },
    tests: [
      { name: 'Щит гасит часть', args: [{ attack: 40 }, { shield: 15, hull: 100 }], expected: { damage: 25, hull: 75 } },
      { name: 'Щита нет', args: [{ attack: 40 }, { shield: 0, hull: 100 }], expected: { damage: 40, hull: 60 } },
      {
        name: 'Сквозь мощный щит проходит единица',
        args: [{ attack: 10 }, { shield: 90, hull: 100 }],
        expected: { damage: 1, hull: 99 },
      },
      {
        name: 'Корпус не уходит в минус',
        args: [{ attack: 200 }, { shield: 0, hull: 30 }],
        expected: { damage: 200, hull: 0 },
      },
      {
        name: 'Ровно добитый корпус',
        expr: 'return strike({ attack: 50 }, { shield: 0, hull: 50 }).hull;',
        expected: 0,
      },
    ],
  },

  /* --------------------------------------------------------------- 14 -- */
  {
    id: 'battle',
    order: 14,
    title: 'Боевой вылет',
    topic: 'Цикл while и состояние боя',
    difficulty: 5,
    reward: { credits: 45000, xp: 260 },
    unlocks: { view: 'battle', label: 'Бой' },
    story:
      'Полигон пройден. В поясе замечен чужой корабль, и уклониться уже не ' +
      'выйдет. Бой идёт раундами, пока кто-то не выйдет из строя — этот ' +
      'обмен ударами вам и предстоит написать.',
    signature: 'runBattle(ship, enemy) → { winner, rounds, shipHull, enemyHull }',
    brief: 
      'Напишите функцию runBattle, которая проводит бой до конца.\n' +
      'На входе два объекта одинакового устройства: name, attack, shield и hull.\n' +
      'Бой идёт раундами. В каждом раунде сначала стреляет ваш корабль, а потом отвечает противник — но только если он ещё жив, то есть его корпус больше нуля.\n' +
      'Урон считается так же, как в прошлом задании: сквозь щит проходит минимум 1, корпус не опускается ниже нуля.\n' +
      'Бой продолжается, пока обе стороны живы, но не дольше 20 раундов.\n' +
      'Вернуть нужно объект:\n' +
      '• winner — строка "ship", если противник выведен из строя; "enemy", если ваш корабль; "draw", если через 20 раундов оба ещё держатся;\n' +
      '• rounds — сколько раундов прошло;\n' +
      '• shipHull и enemyHull — прочность корпусов в конце боя.\n' +
      'Переданные объекты менять нельзя: прочность ведите в отдельных переменных.',
    theory: [
      'while (условие) { … } крутится, пока условие истинно — число раундов заранее неизвестно.',
      'Счётчик раундов ведите сами: rounds += 1 в начале каждого круга.',
      'Ограничение на 20 раундов обязательно: без него бой двух неуязвимых кораблей зависнет.',
      'Прочность держат в отдельных переменных, а не меняют чужие объекты.',
    ],
    lesson: [
      {
        title: 'while — когда число шагов заранее неизвестно',
        text:
          'for со счётчиком годится, когда известно, сколько раз повторять. Бой может кончиться и на втором раунде, и на двадцатом, поэтому условие проверяют перед каждым кругом.',
        code:
          'let rounds = 0;\n' +
          '\n' +
          'while (shipHull > 0 && enemyHull > 0 && rounds < 20) {\n' +
          '  rounds += 1;\n' +
          '  // …обмен ударами\n' +
          '}\n' +
          '\n' +
          '// && значит «и»: цикл идёт, пока верно всё сразу',
      },
      {
        title: 'Лимит раундов — это не перестраховка',
        text:
          'Если у обоих щит сильнее чужого залпа, каждый раунд снимает по единице. Без ограничения такой бой затянется на сотни кругов, а при нулевом уроне — навсегда, и вкладка повиснет. Лимит превращает это в честную ничью.',
        code:
          '// Без лимита: условие может не стать ложным никогда\n' +
          'while (shipHull > 0 && enemyHull > 0) { }  // рискованно\n' +
          '\n' +
          '// С лимитом: цикл гарантированно закончится\n' +
          'while (жив && жив && rounds < 20) { }      // безопасно',
      },
      {
        title: 'Выбывший не стреляет',
        text:
          'Внутри раунда порядок важен. Если противник уже уничтожен вашим залпом, ответного огня быть не должно — иначе корабль будет получать урон от обломков.',
        code:
          '// Ваш залп\n' +
          'const hit = Math.max(1, ship.attack - enemy.shield);\n' +
          'enemyHull = Math.max(0, enemyHull - hit);\n' +
          '\n' +
          '// Ответ — только если противник выжил\n' +
          'if (enemyHull > 0) {\n' +
          '  const back = Math.max(\n' +
          '    1, enemy.attack - ship.shield,\n' +
          '  );\n' +
          '  shipHull = Math.max(0, shipHull - back);\n' +
          '}',
      },
      {
        title: 'Победителя определяют после цикла',
        text:
          'Когда цикл закончился, достаточно посмотреть на корпуса. Ничья — это случай, когда оба уцелели, то есть цикл вышел по лимиту раундов.',
        code:
          'let winner = "draw";\n' +
          '\n' +
          'if (enemyHull === 0) winner = "ship";\n' +
          'else if (shipHull === 0) winner = "enemy";\n' +
          '\n' +
          '// Порядок проверок важен: свой залп идёт первым,\n' +
          '// поэтому при обоюдном нуле победа за кораблём',
      },
    ],
    fn: 'runBattle',
    starter:
      'function runBattle(ship, enemy) {\n' +
      '  let shipHull = ship.hull;\n' +
      '  let enemyHull = enemy.hull;\n' +
      '  let rounds = 0;\n' +
      '\n' +
      '  // проведите бой раунд за раундом\n' +
      '}\n',
    hints: [
      'Заготовка уже завела три переменные — цикл и разбор итога дописываются к ним.',
      'В условии цикла три требования сразу: жив первый, жив второй и лимит не исчерпан.',
      'Ответный огонь заверните в if: стрелять может только тот, у кого корпус ещё больше нуля.',
    ],
    solution:
      'function runBattle(ship, enemy) {\n' +
      '  let shipHull = ship.hull;\n' +
      '  let enemyHull = enemy.hull;\n' +
      '  let rounds = 0;\n' +
      '\n' +
      '  while (shipHull > 0 && enemyHull > 0 && rounds < 20) {\n' +
      '    rounds += 1;\n' +
      '\n' +
      '    const hit = Math.max(1, ship.attack - enemy.shield);\n' +
      '    enemyHull = Math.max(0, enemyHull - hit);\n' +
      '\n' +
      '    if (enemyHull > 0) {\n' +
      '      const back = Math.max(1, enemy.attack - ship.shield);\n' +
      '      shipHull = Math.max(0, shipHull - back);\n' +
      '    }\n' +
      '  }\n' +
      '\n' +
      '  let winner = "draw";\n' +
      '  if (enemyHull === 0) winner = "ship";\n' +
      '  else if (shipHull === 0) winner = "enemy";\n' +
      '\n' +
      '  return { winner, rounds, shipHull, enemyHull };\n' +
      '}\n',
    practice: {
      title: 'Примите бой',
      hint:
        'Ваш корабль — corp.battleShip, противники — corp.threats. Проведите ' +
        'бой и запишите отчёт: за победу штаб выплатит премию.',
      example: 'db.insert("battles", runBattle(corp.battleShip, corp.threats[0]))',
      validate: (value, context) => {
        if (!value || typeof value !== 'object') return 'Команда должна вернуть сохранённый отчёт о бое';
        if (typeof value.winner !== 'string') return 'В отчёте нет строкового поля winner — передайте результат runBattle';
        if (typeof value.rounds !== 'number') return 'В отчёте нет числа раундов';
        if ((context?.corp?.battleShip?.attack ?? 0) === 0) {
          return 'На корабле нет орудий: без них бой не выиграть — загляните на верфь';
        }
        if (value.winner !== 'ship') {
          return value.winner === 'enemy'
            ? 'Корабль выведен из строя. Усильте вооружение или щит и повторите бой'
            : 'Двадцать раундов без результата: нужен корабль помощнее';
        }
        if (typeof value.id !== 'number') return 'Отчёт не попал в базу: оберните результат в db.insert("battles", …)';
        return true;
      },
      commit: (value, api) => api.claimBounty(value),
    },
    tests: [
      {
        // Дрон бьёт на 18 при щите 25 — но единица всё равно проходит
        name: 'Лёгкая победа: щит держит, но не насухо',
        args: [
          { name: 'Квест', attack: 40, shield: 25, hull: 200 },
          { name: 'Дрон', attack: 18, shield: 5, hull: 60 },
        ],
        expected: { winner: 'ship', rounds: 2, shipHull: 199, enemyHull: 0 },
      },
      {
        name: 'Корабль без орудий проигрывает',
        args: [
          { name: 'Рудовоз', attack: 0, shield: 0, hull: 50 },
          { name: 'Рейдер', attack: 45, shield: 20, hull: 140 },
        ],
        expected: { winner: 'enemy', rounds: 2, shipHull: 0, enemyHull: 138 },
      },
      {
        name: 'Ничья по лимиту раундов',
        expr:
          'return runBattle(\n' +
          '  { name: "А", attack: 10, shield: 100, hull: 500 },\n' +
          '  { name: "Б", attack: 10, shield: 100, hull: 500 },\n' +
          ').winner;',
        expected: 'draw',
      },
      {
        name: 'Ничья длится ровно двадцать раундов',
        expr:
          'return runBattle(\n' +
          '  { name: "А", attack: 10, shield: 100, hull: 500 },\n' +
          '  { name: "Б", attack: 10, shield: 100, hull: 500 },\n' +
          ').rounds;',
        expected: 20,
      },
      {
        name: 'Выбывший не отвечает',
        expr:
          'return runBattle(\n' +
          '  { name: "А", attack: 100, shield: 0, hull: 50 },\n' +
          '  { name: "Б", attack: 999, shield: 0, hull: 60 },\n' +
          ').shipHull;',
        expected: 50,
      },
    ],
  },
];

/** Задание по идентификатору. */
export function questById(id) {
  return QUESTS.find(quest => quest.id === id) ?? null;
}

/** Задание, которое открывает указанный раздел интерфейса. */
export function questForView(viewId) {
  return QUESTS.find(quest => quest.unlocks?.view === viewId) ?? null;
}
