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
];

/** Задание по идентификатору. */
export function questById(id) {
  return QUESTS.find(quest => quest.id === id) ?? null;
}

/** Задание, которое открывает указанный раздел интерфейса. */
export function questForView(viewId) {
  return QUESTS.find(quest => quest.unlocks?.view === viewId) ?? null;
}
