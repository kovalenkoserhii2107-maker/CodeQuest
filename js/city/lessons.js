const scaffold = body => '/** @param {CityAPI} cq */\nexport function main(cq) {\n' +
  body.split('\n').map(line => '  ' + line).join('\n') + '\n}\n';
export const LESSONS = [
  {
    id: 'inspect', stage: 'Первые шаги', title: '1. Познакомьтесь с мастерской',
    objective: 'Прочитайте cq.world.getState() и выведите две строки: баланс и содержимое склада.',
    concepts: 'Объект, свойства, вызов функции, вывод.',
    api: ['cq.world.getState', 'cq.print'],
    scaffold: scaffold('const world = cq.world.getState();\n// Выведите world.balance через cq.print.\n// Второй строкой выведите world.inventory.'),
    hints: ['getState() возвращает объект, который можно сохранить в const world.', 'cq.print("Баланс:", world.balance);\ncq.print("Склад:", world.inventory);'],
    expectation: 'Успешный реальный шаг: вызов getState() и минимум две строки вывода. Проба не засчитывается.',
    check: ctx => ctx.reads.includes('world.getState') && ctx.logs.length >= 2
  },
  {
    id: 'supply', stage: 'Первые шаги', title: '2. Найдите поставщика',
    objective: 'Прочитайте список поставщиков и купите 10 лома. scrap — программный ID лома; цена — 4 ₽ за единицу.',
    concepts: 'Массив, первый элемент, аргументы функции, расходы.',
    api: ['cq.market.getSuppliers', 'cq.market.buy', 'cq.warehouse.getStock'],
    scaffold: scaffold('const supplier = cq.market.getSuppliers()[0];\ncq.print("Поставщик:", supplier);\n// Если лома меньше 10, купите недостающее количество.'),
    hints: ['supplier.product содержит "scrap", supplier.price — 4. За 10 единиц нужно 40 ₽.', 'const missing = 10 - cq.warehouse.getStock("scrap");\nif (missing > 0) cq.market.buy("scrap", missing);'],
    expectation: 'Прочитан getSuppliers(); статистика купленного лома — не менее 10. Повторная закупка при уже имеющемся сырье не нужна.',
    check: ctx => ctx.reads.includes('market.getSuppliers') && ctx.after.metrics.bought >= 10
  },
  {
    id: 'batch', stage: 'Первые шаги', title: '3. Запустите первую партию',
    objective: 'Изучите рецепт metal. Запустите 5 металла на line-1: понадобится 10 лома и 10 ₽ энергии.',
    concepts: 'Поиск в массиве, условия, состояние оборудования.',
    api: ['cq.factory.getRecipes', 'cq.factory.getLines', 'cq.factory.start'],
    scaffold: scaffold('const recipes = cq.factory.getRecipes();\ncq.print(recipes);\nconst line = cq.factory.getLines()[0];\n// Если line.job === null, запустите 5 metal.'),
    hints: ['metal = 2 scrap + 2 ₽, время — 2 шага. Сырьё уйдёт сразу, товар появится позже.', 'if (line.job === null && cq.warehouse.getStock("scrap") >= 10) {\n  cq.factory.start("metal", 5, line.id);\n}'],
    expectation: 'Прочитан getRecipes(); успешно вызвана команда start("metal", 5) или партия большего размера.',
    check: ctx => ctx.reads.includes('factory.getRecipes') && ctx.operations.some(op => op.method === 'produce' && op.args[0] === 'metal' && op.args[1] >= 5)
  },
  {
    id: 'time', stage: 'Первые шаги', title: '4. Дождитесь результата',
    objective: 'Нажмите «Пропустить шаг», чтобы завершилась партия. Затем прочитайте количество metal через getStock и напечатайте его.',
    concepts: 'Время симуляции, отложенный результат, чтение склада.',
    api: ['cq.world.getTime', 'cq.warehouse.getStock', 'cq.factory.getLines'],
    scaffold: scaffold('const metal = cq.warehouse.getStock("metal");\ncq.print("Металл:", metal);\ncq.print("Шаг:", cq.world.getTime());'),
    hints: ['Запуск кода сам переводит время на 1 шаг. У metal duration=2, поэтому после запуска остаётся ещё один шаг.', 'Ожидание не запускает ваш код. Оно переводит мир на один шаг и завершает готовые партии.'],
    expectation: 'На складе минимум 5 metal; успешный код вызвал getStock() и напечатал результат.',
    check: ctx => ctx.after.inventory.metal >= 5 && ctx.reads.includes('warehouse.getStock') && ctx.logs.length > 0
  },
  {
    id: 'trade', stage: 'Первые шаги', title: '5. Выберите покупателя',
    objective: 'Изучите покупателей металла. Выберите местного покупателя и продайте 5 metal.',
    concepts: 'filter, sort или find; Math.min; цена и спрос.',
    api: ['cq.market.getBuyers', 'cq.market.quote', 'cq.market.sell'],
    scaffold: scaffold('const buyers = cq.market.getBuyers("metal");\ncq.print(buyers);\n// Выберите покупателя с !remote и demand >= 5.\n// Продайте 5 metal по его ID.'),
    hints: ['Имя покупателя для человека, id для кода. foundry принимает металл сразу; district работает только с доставкой.', 'const buyer = buyers.filter(b => !b.remote && b.demand >= 5)\n  .sort((a, b) => b.price - a.price)[0];\nif (buyer && cq.warehouse.getStock("metal") >= 5) cq.market.sell("metal", 5, buyer.id);'],
    expectation: 'Прочитан getBuyers(); через sell продано минимум 5 metal в этом шаге.',
    check: ctx => ctx.reads.includes('market.getBuyers') &&
      ctx.operations.filter(op => op.method === 'sell' && op.args[0] === 'metal').reduce((sum, op) => sum + op.args[1], 0) >= 5
  },
  {
    id: 'memory', stage: 'Первые шаги', title: '6. Сохраните память скрипта',
    objective: 'В cq.memory.runs заведите счётчик. Включите автоматизацию и доведите его до 3; затем остановите её.',
    concepts: 'Состояние между запусками, ??, повторное выполнение.',
    api: ['cq.memory', 'cq.print'],
    scaffold: scaffold('// Увеличьте cq.memory.runs на 1.\ncq.print("Запусков:", cq.memory.runs);'),
    hints: ['const в main создаётся заново на каждом шаге. cq.memory сохраняется между шагами и после перезагрузки.', 'cq.memory.runs = (cq.memory.runs ?? 0) + 1;'],
    expectation: 'Реальный шаг автоматизации завершился; cq.memory.runs — число не меньше 3.',
    check: ctx => ctx.automatic && Number.isSafeInteger(ctx.memory.runs) && ctx.memory.runs >= 3
  },
  {
    id: 'contract', stage: 'Развитие мастерской', title: '7. Выполните городской заказ',
    objective: 'Примите metal-order, произведите и сдайте 5 metal до срока. Награда — 140 ₽, рынок её не меняет.',
    concepts: 'Конечный автомат: доступен → принят → выполнен; сроки.',
    api: ['cq.contracts.list', 'cq.contracts.accept', 'cq.contracts.deliver'],
    scaffold: scaffold('const order = cq.contracts.list().find(c => c.id === "metal-order");\ncq.print(order);\n// available: принять; active: произвести товар и сдать до deadline.\n// Проверяйте сырьё и занятость линии, чтобы не запускать лишнюю партию.'),
    hints: ['Начните с cq.contracts.accept("metal-order"). Срок — 6 шагов с момента принятия; ещё можно покупать сырьё и производить.', 'Для сдачи: cq.contracts.deliver("metal-order"). Нужно 5 metal на складе. Просрочка не отнимает деньги; заказ становится доступен снова.'],
    expectation: 'После успешного шага статистика выполненных контрактов не меньше 1.',
    check: ctx => ctx.after.metrics.fulfilled >= 1
  },
  {
    id: 'research', stage: 'Развитие мастерской', title: '8. Откройте новый рецепт',
    objective: 'Изучите технологии и откройте wire за 400 ₽. Провод: 1 metal + 3 ₽, 1 шаг.',
    concepts: 'Каталог возможностей, проверка бюджета, развитие.',
    api: ['cq.research.list', 'cq.research.unlock', 'cq.factory.getRecipes'],
    scaffold: scaffold('const technologies = cq.research.list();\ncq.print(technologies);\n// Найдите wire и откройте, если хватает денег и !unlocked.'),
    hints: ['Исследования доступны сразу; wire стоит 400 ₽, efficiency — 600 ₽.', 'if (!cq.research.list().find(t => t.id === "wire").unlocked && cq.world.getState().balance >= 400) {\n  cq.research.unlock("wire");\n}'],
    expectation: 'В мире открыта технология wire.',
    check: ctx => ctx.after.research.includes('wire')
  },
  {
    id: 'delivery', stage: 'Развитие мастерской', title: '9. Отправьте первую доставку',
    objective: 'Произведите wire и отправьте в electronics. Дождитесь оплаты. Цена закрепляется при отправке.',
    concepts: 'Расчёт сделки, очередь событий, товар и деньги в пути.',
    api: ['cq.market.quote', 'cq.logistics.getRoutes', 'cq.logistics.dispatch', 'cq.logistics.getShipments'],
    scaffold: scaffold('const routes = cq.logistics.getRoutes();\ncq.print(routes);\n// Произведите wire, затем рассчитайте quote для electronics.\n// Если canTrade, отправьте груз и дождитесь оплаты.'),
    hints: ['Прямая sell в electronics не работает: buyer.remote=true. Фургон courier стоит 5 ₽ и едет 1 шаг.', 'const q = cq.market.quote("wire", 1, "electronics", "courier");\nif (q.canTrade) cq.logistics.dispatch("wire", 1, "electronics", "courier");'],
    expectation: 'Мир завершил доставку хотя бы одной единицы товара.',
    check: ctx => ctx.after.metrics.delivered >= 1
  },
  {
    id: 'parallel', stage: 'Свободная стратегия', title: '10. Разверните две линии',
    objective: 'Заработайте на вторую линию (1200 ₽) и запускайте партии независимо: металл на одной, детали или провод на другой.',
    concepts: 'Планирование ресурсов, цикл по оборудованию, параллельность.',
    api: ['cq.factory.purchaseLine', 'cq.factory.getLines', 'cq.factory.start'],
    scaffold: scaffold('const lines = cq.factory.getLines();\ncq.print(lines);\n// Заработайте на purchaseLine().\n// При запуске передавайте line.id третьим аргументом start().'),
    hints: ['Все линии используют общий склад и баланс. Свободное место резервируется под партии каждой линии.', 'Цена новой линии: 1200 × текущее число линий. Максимум четыре; уровень каждой улучшается отдельно.'],
    expectation: 'Куплены минимум две линии и обе одновременно имеют активные партии после шага.',
    check: ctx => ctx.after.lines.length >= 2 && ctx.after.lines.filter(line => line.job !== null).length >= 2
  },
  {
    id: 'modules', stage: 'Свободная стратегия', title: '11. Соберите стратегию из модулей',
    objective: 'Создайте strategy.js, экспортируйте функцию выбора покупателя и импортируйте её в index.js. Запустите проект.',
    concepts: 'import/export, функции, разделение ответственности.',
    api: ['cq.market.getBuyers', 'cq.memory'],
    scaffold: 'import { bestBuyer } from "./strategy.js";\n/** @param {CityAPI} cq */\nexport function main(cq) {\n  cq.print(bestBuyer(cq.market.getBuyers("metal")));\n}\n',
    hints: ['Создайте strategy.js и напишите:\nexport function bestBuyer(buyers) {\n  return buyers.filter(b => !b.remote && b.demand > 0).sort((a, b) => b.price - a.price)[0];\n}', 'В памяти cq.memory храните данные, а не функции. Обычное состояние модулей не переносится в следующий шаг.'],
    expectation: 'Успешно выполнен проект, в графе импортов которого минимум два файла.',
    check: ctx => ctx.modules.length >= 2
  }
];
export class CityLessons {
  #completed;
  constructor(progress = { completed: [] }) {
    this.#completed = [...progress.completed].filter(id => LESSONS.some(lesson => lesson.id === id));
  }
  snapshot() { return { completed: [...this.#completed] }; }
  current() { return LESSONS.find(lesson => !this.#completed.includes(lesson.id)) || null; }
  isDone(id) { return this.#completed.includes(id); }
  evaluate(context) {
    const lesson = this.current();
    if (!lesson || context.preview || !lesson.check(context)) return null;
    this.#completed.push(lesson.id);
    return lesson;
  }
}
