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
    brief:
      'Напишите функцию createCommander(name), которая возвращает объект командира с полями:\n' +
      '• name — переданное имя;\n' +
      '• rank — строка "Командир";\n' +
      '• experience — 0;\n' +
      '• credits — 0.',
    theory: [
      'Объект записывается фигурными скобками: { ключ: значение, другой: 1 }.',
      'Если имя свойства совпадает с именем переменной, работает сокращение: { name } вместо { name: name }.',
      'Строки пишут в кавычках, числа — без: rank: "Командир", experience: 0.',
    ],
    fn: 'createCommander',
    starter:
      'function createCommander(name) {\n' +
      '  // верните объект командира с четырьмя полями\n' +
      '}\n',
    hints: [
      'Функция должна вернуть объект целиком: return { ... };',
      'return { name, rank: "Командир", experience: 0, credits: 0 };',
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
    brief:
      'Напишите функцию createShipyard(name, modules), которая возвращает объект с полями ' +
      'name и modules и двумя методами:\n' +
      '• getCatalog() — возвращает массив модулей;\n' +
      '• findModule(id) — возвращает модуль с таким id или null, если такого нет.',
    theory: [
      'Метод — функция внутри объекта: { getCatalog() { return this.modules; } }.',
      'Ключевое слово this внутри метода указывает на сам объект.',
      'find возвращает первый подходящий элемент или undefined — превратить его в null помогает ?? null.',
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
      'getCatalog() { return this.modules; },',
      'findModule(id) { return this.modules.find(m => m.id === id) ?? null; }',
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
    brief:
      'Напишите функцию createWarehouse(capacity), которая возвращает склад — объект с полями ' +
      'capacity и items (пустой массив) и методами:\n' +
      '• usedSpace() — суммарный вес всех принятых модулей (для пустого склада 0);\n' +
      '• addItem(item) — если модуль помещается, кладёт его в items и возвращает true; ' +
      'если не помещается — ничего не меняет и возвращает false.',
    theory: [
      'reduce удобно считает сумму: this.items.reduce((sum, item) => sum + item.weight, 0).',
      'Методы могут вызывать друг друга через this: внутри addItem доступен this.usedSpace().',
      'Модуль ровно по остатку помещается — сравнивайте через <=, а не <.',
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
      'usedSpace() { return this.items.reduce((sum, item) => sum + item.weight, 0); },',
      'addItem(item) { if (this.usedSpace() + item.weight > this.capacity) return false; this.items.push(item); return true; }',
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
    brief:
      'Напишите функцию hireCrewMember(commander, candidate), которая возвращает НОВЫЙ объект командира:\n' +
      '• если кредитов хватает (credits >= candidate.hireCost) — списывает стоимость и добавляет ' +
      'кандидата в массив crew;\n' +
      '• если не хватает — возвращает копию командира без изменений.\n' +
      'Исходный объект commander менять нельзя.',
    theory: [
      'Копия объекта с изменениями: { ...commander, credits: 0 }.',
      'Копия массива с новым элементом: [...commander.crew, candidate].',
      'Сравнение «хватает ли денег» — это credits >= hireCost.',
    ],
    fn: 'hireCrewMember',
    starter:
      'function hireCrewMember(commander, candidate) {\n' +
      '  // верните нового командира: с нанятым кандидатом или без изменений\n' +
      '}\n',
    hints: [
      'Сначала проверьте: if (commander.credits < candidate.hireCost) return { ...commander };',
      'return { ...commander, credits: commander.credits - candidate.hireCost, crew: [...commander.crew, candidate] };',
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
    brief:
      'Напишите функцию assembleShip(name, modules), которая возвращает объект корабля:\n' +
      '• name — название;\n' +
      '• modules — переданный массив;\n' +
      '• mass — сумма weight всех модулей;\n' +
      '• energy — сумма energy всех модулей (у реактора она положительная, у потребителей отрицательная).\n' +
      'Для пустого списка модулей mass и energy равны 0.',
    theory: [
      'reduce складывает поле каждого элемента: modules.reduce((sum, m) => sum + m.weight, 0).',
      'Стартовое значение 0 обязательно — иначе пустой массив выбросит ошибку.',
      'Считать можно двумя вызовами reduce: отдельно массу, отдельно энергию.',
    ],
    fn: 'assembleShip',
    starter:
      'function assembleShip(name, modules) {\n' +
      '  // посчитайте массу и энергобаланс, верните объект корабля\n' +
      '}\n',
    hints: [
      'const mass = modules.reduce((sum, module) => sum + module.weight, 0);',
      'return { name, modules, mass, energy };',
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
    brief:
      'Напишите функцию checkReadiness(ship, crew), которая возвращает объект ' +
      '{ ready, problems }:\n' +
      '• problems — массив строк с найденными проблемами в таком порядке:\n' +
      '  «Нет двигателя» — если среди ship.modules нет модуля с type "engine";\n' +
      '  «Не хватает энергии» — если ship.energy меньше 0;\n' +
      '  «Нет капитана» — если в crew нет человека с role "Капитан";\n' +
      '• ready — true, если проблем нет.',
    theory: [
      'some проверяет, есть ли хотя бы один подходящий элемент: modules.some(m => m.type === "engine").',
      'Собирать проблемы удобно в массив: const problems = []; problems.push("...").',
      'Пустой массив — это «проблем нет»: ready = problems.length === 0.',
    ],
    fn: 'checkReadiness',
    starter:
      'function checkReadiness(ship, crew) {\n' +
      '  const problems = [];\n' +
      '  // проверьте двигатель, энергию и капитана\n' +
      '  return { ready: problems.length === 0, problems };\n' +
      '}\n',
    hints: [
      'if (!ship.modules.some(module => module.type === "engine")) problems.push("Нет двигателя");',
      'if (!crew.some(member => member.role === "Капитан")) problems.push("Нет капитана");',
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
    brief:
      'Напишите функцию collectionStats(records), которая по массиву записей возвращает объект:\n' +
      '• count — сколько записей;\n' +
      '• totalMass — сумма поля mass у всех записей (для пустого массива 0);\n' +
      '• heaviest — имя (поле name) записи с наибольшей mass, или null, если записей нет.',
    theory: [
      'Сумма по полю: records.reduce((sum, record) => sum + record.mass, 0).',
      'Самую тяжёлую запись можно найти обычным циклом, запоминая лучшую.',
      'Для пустого массива честный ответ — count 0, totalMass 0 и heaviest null.',
    ],
    fn: 'collectionStats',
    starter:
      'function collectionStats(records) {\n' +
      '  // посчитайте количество, сумму масс и самую тяжёлую запись\n' +
      '}\n',
    hints: [
      'const totalMass = records.reduce((sum, record) => sum + (record.mass ?? 0), 0);',
      'Самую тяжёлую ищите циклом: if (!best || record.mass > best.mass) best = record;',
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
    brief:
      'Напишите функцию shipPanel(db), которая возвращает описание панели:\n' +
      '• title — строка "Корабль";\n' +
      '• если в коллекции ships есть записи — value равно массе последней записи, ' +
      'unit — строка "т", note — строка вида "Энергобаланс 60";\n' +
      '• если кораблей нет — value равно строке "не собран", а unit и note не нужны.\n' +
      'Последнюю запись даёт db.last("ships").',
    theory: [
      'Панель — обычный объект: { title, value, unit, note }. Игра сама его нарисует.',
      'db.last("ships") вернёт последнюю запись коллекции или null.',
      'Строку удобно собрать шаблоном: `Энергобаланс ${ship.energy}`.',
    ],
    fn: 'shipPanel',
    starter:
      'function shipPanel(db) {\n' +
      '  const ship = db.last("ships");\n' +
      '  // верните описание панели\n' +
      '}\n',
    hints: [
      'Если корабля нет: return { title: "Корабль", value: "не собран" };',
      'Иначе: return { title: "Корабль", value: ship.mass, unit: "т", note: `Энергобаланс ${ship.energy}` };',
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
    brief:
      'Напишите функцию planFlight(ship, distance), которая возвращает объект плана:\n' +
      '• distance — переданное расстояние;\n' +
      '• fuel — расход топлива: масса корабля × расстояние ÷ 1000, округлённое ВВЕРХ;\n' +
      '• hours — время в пути: расстояние ÷ 12, округлённое ВВЕРХ.\n' +
      'Топливо и часы дробными не бывают: бак заправляют целыми тоннами, ' +
      'а смену считают целыми часами.',
    theory: [
      'Math.ceil(4.1) вернёт 5 — округление вверх, даже если остаток крошечный.',
      'Масса корабля лежит в ship.mass: объект приходит целиком, поле берите точкой.',
      'Порядок действий обычный: ship.mass * distance / 1000.',
    ],
    fn: 'planFlight',
    starter:
      'function planFlight(ship, distance) {\n' +
      '  // посчитайте расход топлива и время в пути\n' +
      '}\n',
    hints: [
      'Расход: Math.ceil(ship.mass * distance / 1000).',
      'Часы: Math.ceil(distance / 12).',
      'Верните объект целиком: return { distance, fuel, hours };',
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
    brief:
      'Напишите функцию runExpedition(ship, plan), которая проводит рейс.\n' +
      'ship: { drills, fuel, cargo } — число буров, топливо в баке, вместимость трюма.\n' +
      'plan: { hours, fuel, richness } — часы работы, нужное топливо, тонн руды с бура за час.\n\n' +
      'Если топлива в баке меньше, чем требует план, рейс не состоится:\n' +
      'верните { ok: false, ore: 0, hours: 0, fuelLeft: ship.fuel, full: false }.\n\n' +
      'Иначе за каждый час добывается ship.drills × plan.richness тонн.\n' +
      'Как только руды набралось не меньше вместимости трюма — трюм полон, ' +
      'груз равен ровно ship.cargo, и рейс прерывается досрочно.\n' +
      'Верните { ok: true, ore, hours, fuelLeft, full }, где hours — сколько часов ' +
      'реально отработали, fuelLeft — остаток топлива, full — забился ли трюм.',
    theory: [
      'Счётчик до нужного числа: for (let hour = 1; hour <= plan.hours; hour += 1) { … }',
      'Накопление идёт в переменной снаружи цикла: let ore = 0; внутри ore += добыча.',
      'break прерывает цикл досрочно — ровно то, что нужно для полного трюма.',
      'Проверку топлива делайте до цикла: незачем считать рейс, которого не будет.',
    ],
    fn: 'runExpedition',
    starter:
      'function runExpedition(ship, plan) {\n' +
      '  // сначала проверьте топливо, потом ведите цикл по часам\n' +
      '}\n',
    hints: [
      'Отказ: if (ship.fuel < plan.fuel) return { ok: false, ore: 0, hours: 0, fuelLeft: ship.fuel, full: false };',
      'В цикле запоминайте отработанный час: hours = hour;',
      'Полный трюм: if (ore >= ship.cargo) { ore = ship.cargo; full = true; break; }',
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
    brief:
      'Напишите функцию sellOre(amount, offers), которая распродаёт руду выгоднее всего.\n' +
      'offers — массив предложений { buyer, price, limit }.\n\n' +
      'Идите от самой высокой цены к низкой. Каждому покупателю отдавайте ' +
      'столько, сколько он готов взять, но не больше остатка руды.\n' +
      'Верните { sold, revenue, deals }, где deals — массив совершённых сделок ' +
      '{ buyer, amount, sum } в порядке продажи.\n' +
      'Покупателей, которым ничего не досталось, в deals быть не должно.\n' +
      'Исходный массив offers менять нельзя — отсортируйте копию.',
    theory: [
      'Копия массива: [...offers] — sort меняет массив на месте, а чужие данные портить нельзя.',
      'По убыванию цены: sort((a, b) => b.price - a.price).',
      'Сколько отдать этому покупателю: Math.min(остаток, offer.limit).',
      'Когда руда кончилась, дальше идти незачем: if (left === 0) break;',
    ],
    fn: 'sellOre',
    starter:
      'function sellOre(amount, offers) {\n' +
      '  // отсортируйте копию предложений и распродайте руду\n' +
      '}\n',
    hints: [
      'const sorted = [...offers].sort((a, b) => b.price - a.price);',
      'Внутри цикла: const take = Math.min(left, offer.limit); if (take === 0) continue;',
      'Выручка копится: revenue += take * offer.price; а остаток уменьшается: left -= take;',
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
    brief:
      'Напишите функцию combatStats(modules), которая возвращает боевую сводку:\n' +
      '• attack — сумма поля attack у модулей с type "weapon";\n' +
      '• shield — сумма поля shield у модулей с type "shield";\n' +
      '• weapons — массив названий (name) установленных орудий, в том же порядке.\n' +
      'Мирные модули — двигатели, реакторы, буры — в сводку не попадают.\n' +
      'Для пустого списка верните нули и пустой массив.',
    theory: [
      'filter отбирает по условию: modules.filter(m => m.type === "weapon").',
      'map превращает объекты в другое: weapons.map(m => m.name).',
      'reduce складывает: weapons.reduce((sum, m) => sum + m.attack, 0).',
      'Цепочку можно писать подряд: отфильтровали, потом сложили.',
    ],
    fn: 'combatStats',
    starter:
      'function combatStats(modules) {\n' +
      '  // отберите орудия и щиты, посчитайте сумму\n' +
      '}\n',
    hints: [
      'const weapons = modules.filter(module => module.type === "weapon");',
      'const shields = modules.filter(module => module.type === "shield");',
      'Суммы считайте через reduce, названия — через map.',
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
    brief:
      'Напишите функцию strike(attacker, defender), которая считает один выстрел.\n' +
      'attacker: { attack } — сила залпа.\n' +
      'defender: { shield, hull } — щит и прочность корпуса.\n\n' +
      'Щит гасит урон: проходит attack − shield. Но полностью закрыться нельзя — ' +
      'сквозь любой щит просачивается минимум 1 единица.\n' +
      'Корпус в минус не уходит: меньше нуля прочность не бывает.\n\n' +
      'Верните { damage, hull }, где damage — прошедший урон, hull — прочность после выстрела.',
    theory: [
      'Math.max(1, x) вернёт x, а если он меньше единицы — то 1.',
      'Math.max(0, x) тем же приёмом не даёт значению уйти в минус.',
      'Сначала считайте урон, потом вычитайте его из корпуса — по шагам.',
    ],
    fn: 'strike',
    starter:
      'function strike(attacker, defender) {\n' +
      '  // посчитайте прошедший урон и остаток корпуса\n' +
      '}\n',
    hints: [
      'const damage = Math.max(1, attacker.attack - defender.shield);',
      'const hull = Math.max(0, defender.hull - damage);',
      'Верните оба числа: return { damage, hull };',
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
    brief:
      'Напишите функцию runBattle(ship, enemy), которая проводит бой до конца.\n' +
      'Обе стороны: { name, attack, shield, hull }.\n\n' +
      'Раунд идёт так: сначала стреляет ваш корабль, потом — противник, ' +
      'но только если он ещё жив (его корпус больше нуля).\n' +
      'Урон считается как в прошлом задании: сквозь щит проходит минимум 1, ' +
      'корпус не уходит ниже нуля.\n\n' +
      'Бой идёт, пока оба живы, но не дольше 20 раундов.\n' +
      'Верните { winner, rounds, shipHull, enemyHull }, где winner — строка ' +
      '"ship", если противник выведен из строя, "enemy", если ваш корабль, ' +
      'и "draw", если через 20 раундов оба ещё держатся.',
    theory: [
      'while (условие) { … } крутится, пока условие истинно — число раундов заранее неизвестно.',
      'Счётчик раундов ведите сами: rounds += 1 в начале каждого круга.',
      'Ограничение на 20 раундов обязательно: без него бой двух неубиваемых кораблей зависнет.',
      'Прочность удобно держать в отдельных переменных, а не менять чужие объекты.',
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
      'Условие цикла: while (shipHull > 0 && enemyHull > 0 && rounds < 20)',
      'Урон по противнику: const hit = Math.max(1, ship.attack - enemy.shield);',
      'Ответный огонь только если enemyHull > 0 — иначе стреляет выбывший.',
      'Победителя определяйте после цикла: если enemyHull === 0 — "ship".',
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
