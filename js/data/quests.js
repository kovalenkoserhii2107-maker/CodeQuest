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
];

/** Задание по идентификатору. */
export function questById(id) {
  return QUESTS.find(quest => quest.id === id) ?? null;
}

/** Задание, которое открывает указанный раздел интерфейса. */
export function questForView(viewId) {
  return QUESTS.find(quest => quest.unlocks?.view === viewId) ?? null;
}
