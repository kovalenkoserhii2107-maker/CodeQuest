import { escapeHtml } from '../ui/html.js';

export const API_GROUPS = [
  ['world', 'Мир и время'], ['warehouse', 'Склад'], ['market', 'Рынок'],
  ['factory', 'Производство'], ['contracts', 'Контракты'], ['logistics', 'Доставка'],
  ['research', 'Исследования'], ['analytics','Аналитика'], ['project','Проект'], ['code', 'Вывод и память']
];
const p = (name, type, description, optional = false) => ({ name, type, description, optional });
const quantity = () => p('quantity', 'number', 'Положительное целое количество, до 1 000 000.');
const production = () => p('product', '"metal" | "parts" | "wire" | "circuit"', 'ID готового товара. wire требует wire; circuit — circuits.');
const buyer = () => p('buyerId', 'string', 'ID из cq.market.getBuyers(), например foundry.');
const line = () => p('lineId', 'string', 'ID линии из getLines(). По умолчанию line-1.', true);
const method = (group, name, description, params, returns, example, errors = []) =>
  ({ group, name, description, params, returns, example, errors, path: group === 'code' ? 'cq.' + name : 'cq.' + group + '.' + name });
export const API_METHODS = [
  method('factory','quote','Проверяет партию без списания: inputQuantity, energyCost, duration, canStart и reasons.',[production(),quantity(),line()],'CityProductionQuote','const q = cq.factory.quote("metal", 5);\nif (q.canStart) cq.factory.start("metal", 5);\nelse cq.print(q.reasons);'),
  method('market','getOrders','История до 48 отложенных продаж: pending/filled/cancelled/expired. pending содержит currentPrice и reasons ожидания.',[],'CitySaleOrder[]','cq.print(cq.market.getOrders());'),
  method('market','placeOrder','Создаёт отложенную продажу по минимальной цене. До 8 активных. Склад и деньги не резервируются; заявки проверяются по порядку после обновления цен и производства. Для remote укажите совместимый маршрут; исполнение создаёт доставку.',[p('options','CitySaleOrderOptions','product, quantity, buyerId, minPrice (1–1000); routeId по умолчанию null; expiresIn 2–120, по умолчанию 24. На шаге expiresAt заявка уже не исполняется.')],'CitySaleOrder','if (!cq.market.getOrders().some(o=>o.status==="pending")) {\n  cq.market.placeOrder({product:"metal",quantity:5,buyerId:"foundry",minPrice:19,expiresIn:24});\n}'),
  method('market','cancelOrder','Отменяет активную продажу без штрафа. Уже исполненную доставку не отменяет.',[p('id','number','Числовой ID заявки.')],'CitySaleOrder','const o = cq.market.getOrders().find(o=>o.status==="pending");\nif (o) cq.market.cancelOrder(o.id);',['Активная продажа не найдена.']),
  method('analytics','getUnitCosts','Минимальная оценка затрат на товар: доступное сырьё + энергия открытых рецептов. null — нет цепочки. Не включает оборудование, разрешения, доставку и ограничения текущих запасов.',[],'Record<string, number | null>','cq.print(cq.analytics.getUnitCosts());'),
  method('analytics','getAlerts','Подсказки: оборотные деньги, свободное место, близкие сроки заказов и простаивающие линии.',[],'CityAlert[]','cq.analytics.getAlerts().forEach(a=>cq.print(a.level,a.text));'),
  method('warehouse','discard','Безвозвратно списывает товар со склада, освобождая место. Денег не приносит. Используйте для излишков.',[p('product','string','ID товара.'),quantity()],'number','// Только если этот запас больше не нужен:\ncq.warehouse.discard("scrap", 5);',['Не хватает товара.']),

  method('world','getRegions','Регионы: id, name, cost, description, unlocked. Порт стоит 600 ₽, Северные высоты — 1000 ₽.',[],'CityRegion[]','cq.print(cq.world.getRegions());'),
  method('world','getEvents','Периодические события регионов: active, priceBonus и changesIn. Цена отправленного груза не меняется.',[],'CityEvent[]','cq.print(cq.world.getEvents());'),
  method('world','explore','Оплачивает доступ к поставщикам, покупателям и маршрутам региона.',[p('id','"port" | "highlands"','ID региона.')],'string','if (!cq.world.getRegions().find(r=>r.id==="port").unlocked && cq.world.getState().balance>=600) cq.world.explore("port");',['Регион открыт или не хватает денег.']),
  method('analytics','getHistory','До 120 снимков: tick, balance, revenue, spent, inventory, prices. Проба историю не меняет.',[p('limit','number','От 1 до 120, по умолчанию 120.',true)],'CityHistoryPoint[]','cq.print(cq.analytics.getHistory(30).map(p=>p.balance));'),
  method('project','listFiles','Пути файлов проекта с папками.',[],'string[]','cq.print(cq.project.listFiles());'),
  method('project','readFile','Исходник файла как строка. Не меняет проект.',[p('path','string','Точный путь.')],'string','cq.print(cq.project.readFile("index.js"));',['Файл не найден.']),
  method('world', 'getState', 'Полная копия мира. Чтение не тратит деньги и не переводит время.', [], 'CityState',
    'const s = cq.world.getState();\ncq.print("Баланс:", s.balance);\ncq.print("Склад:", s.inventory);'),
  method('world', 'getTime', 'Номер текущего шага. Все чтения внутри main видят один и тот же номер.', [], 'number',
    'cq.print("Шаг:", cq.world.getTime());'),
  method('warehouse', 'getStock', 'Количество одного товара на складе. Товары в пути и незавершённая партия сюда не входят.',
    [p('product', '"scrap" | "metal" | "parts" | "wire" | "circuit"', 'ID товара, а не русское название.')], 'number',
    'const scrap = cq.warehouse.getStock("scrap");\nif (scrap < 10) cq.market.buy("scrap", 10 - scrap);', ['Неизвестный товар.']),
  method('warehouse', 'getFreeSpace', 'Свободное место с учётом резерва под готовые партии всех линий.', [], 'number',
    'cq.print("Свободно:", cq.warehouse.getFreeSpace());'),
  method('warehouse', 'upgrade', 'Добавляет 100 мест. Стоимость: 500 ₽ × текущий уровень склада, максимум 6.', [], 'number',
    'const s = cq.world.getState();\nif (s.warehouseLevel < 6 && s.balance >= 500 * s.warehouseLevel) cq.warehouse.upgrade();', ['Недостаточно денег.', 'Максимальный уровень.']),
  method('market', 'getSuppliers', 'Поставщики: id, product, price, stock, region, locked. yard продаёт лом за 4 ₽, port-yard — за 3 ₽, northern-metal — металл за 12 ₽. Закрытый регион сначала откройте.', [], 'CitySupplier[]',
    'const supplier = cq.market.getSuppliers()[0];\ncq.print(supplier.id, supplier.price, supplier.stock);'),
  method('market', 'getBuyers', 'Покупатели, цены, спрос, region, locked и remote. locked=true означает закрытый регион; remote=true требует доставки.',
    [p('product', 'string', 'Необязательный фильтр по товару.', true)], 'CityBuyer[]',
    'const best = cq.market.getBuyers("metal")\n  .filter(b => !b.locked && !b.remote && b.demand > 0)\n  .sort((a, b) => b.price - a.price)[0];\ncq.print(best);'),
  method('market', 'quote', 'Расчёт продажи: gross — выручка, fee — доставка, net — выручка минус доставка; estimatedUnitCost и estimatedMargin оценивают сырьё и энергию; reasons объясняют отказ; canTrade проверяет текущие ограничения. Ничего не списывает. net не учитывает затраты производства. estimatedMargin — оценка по доступной цепочке, а не фактическая прибыль запасов.',
    [production(), quantity(), buyer(), p('routeId', 'string | null', 'Маршрут доставки. Без него — прямая продажа.', true)], 'CityQuote',
    'const q = cq.market.quote("metal", 5, "foundry");\nif (q.canTrade) cq.market.sell("metal", 5, "foundry");', ['Неизвестный покупатель или маршрут.']),
  method('market', 'buy', 'Мгновенная покупка: баланс и запас поставщика уменьшаются, склад пополняется.',
    [p('product','"scrap" | "metal"','Товар выбранного поставщика.'),quantity(),p('supplierId','string','ID поставщика; по умолчанию yard.',true)], 'number',
    'cq.market.buy("scrap", 10);\n// +10 лома, -40 ₽.', ['Неверное количество.', 'Не хватает денег, места или сырья у поставщика.']),
  method('market', 'sell', 'Мгновенная продажа местному покупателю по текущей цене. Возвращает выручку.',
    [production(), quantity(), buyer()], 'number',
    'const b = cq.market.getBuyers("metal").find(b => b.id === "foundry");\nconst amount = Math.min(cq.warehouse.getStock("metal"), b.demand);\nif (amount > 0) cq.print(cq.market.sell("metal", amount, b.id));', ['Не хватает товара или спроса.', 'Для remote нужна доставка.']),
  method('factory', 'getRecipes', 'Открытые рецепты: product, input, amount, energy, duration. energy учитывает энергосбережение.', [], 'CityRecipe[]',
    'cq.factory.getRecipes().forEach(r => cq.print(r.product, r.input, r.amount, r.energy, r.duration));'),
  method('factory', 'getLines', 'Линии: id, level, job. job=null — свободна; job.remaining — шаги до готовности.', [], 'CityLine[]',
    'cq.print(cq.factory.getLines().find(line => line.job === null));'),
  method('factory', 'start', 'Запускает партию. Сырьё и энергия списываются сразу; товар появляется после duration шагов. На каждой линии своя партия.',
    [production(), quantity(), line()], 'CityJob',
    'if (!cq.factory.getLines()[0].job && cq.warehouse.getStock("scrap") >= 10) {\n  cq.factory.start("metal", 5, "line-1");\n}', ['Линия занята или не найдена.', 'Не хватает сырья, денег или мощности.', 'Рецепт не исследован.']),
  method('factory', 'upgrade', 'Мощность выбранной линии: +8 единиц. Цена 750 ₽ × текущий уровень, максимум 6.',
    [line()], 'number', 'cq.factory.upgrade("line-1");', ['Недостаточно денег.', 'Максимальный уровень.']),
  method('factory', 'purchaseLine', 'Независимая линия уровня 1. Цена 1200 ₽ × число имеющихся линий, максимум 4.', [], 'string',
    'cq.print("Новая линия:", cq.factory.purchaseLine());', ['Недостаточно денег.', 'Уже четыре линии.']),
  method('contracts', 'list', 'Заказы: товар, количество, награда, срок duration, status, deadline, locked. Весь заказ сдаётся одной командой.', [], 'CityContract[]',
    'cq.contracts.list().forEach(c => cq.print(c.id, c.quantity, c.reward, c.status));'),
  method('contracts', 'accept', 'Принимает заказ бесплатно. Срок начинается сейчас; можно вести два заказа.',
    [p('id', 'string', 'ID из list(), например metal-order.')], 'CityContract',
    'cq.contracts.accept("metal-order");', ['Заказ недоступен или требует исследования.', 'Уже два активных заказа.']),
  method('contracts', 'deliver', 'Забирает требуемый товар и начисляет фиксированную награду. Через 5 шагов заказ доступен снова.',
    [p('id', 'string', 'ID активного заказа.')], 'number',
    'const c = cq.contracts.list().find(c => c.id === "metal-order");\nif (c.status === "active" && cq.warehouse.getStock(c.product) >= c.quantity) {\n  cq.print("Награда:", cq.contracts.deliver(c.id));\n}', ['Заказ не принят, просрочен или не хватает товара.']),
  method('logistics', 'getRoutes', 'Маршруты: id, duration, fee, capacity, busy, regions, locked. Фургон: 1 шаг / 5 ₽ / 12 ед.; трамвай: 3 шага / 8 ₽ / 40 ед. Один груз на маршрут.', [], 'CityRoute[]',
    'cq.print(cq.logistics.getRoutes());'),
  method('logistics', 'getShipments', 'Грузы в пути. unitPrice закреплена при отправке, remaining — шаги до оплаты.', [], 'CityShipment[]',
    'cq.logistics.getShipments().forEach(s => cq.print(s.id, s.product, s.remaining));'),
  method('logistics', 'dispatch', 'Товар, спрос и плата за маршрут списываются сейчас; выручка придёт при доставке по закреплённой цене.',
    [production(), quantity(), buyer(), p('routeId', 'string', 'courier, rail или barge. Проверяйте regions маршрута и регион покупателя. По умолчанию courier.', true)], 'CityShipment',
    'const q = cq.market.quote("parts", 4, "district", "rail");\nif (q.canTrade) cq.logistics.dispatch("parts", 4, "district", "rail");', ['Маршрут занят или груз слишком велик.', 'Не хватает товара, спроса или денег.']),
  method('research', 'list', 'Технологии: id, cost, description, unlocked. throughput ускоряет партии, logistics — доставки на 1 шаг (минимум 1). wire открывает провод; circuits — схемы из 3 wire за 4 шага; efficiency уменьшает энергию на 1 ₽ за единицу.', [], 'CityResearch[]',
    'cq.print(cq.research.list());'),
  method('research', 'unlock', 'Покупает технологию. Эффект действует для новых партий; запущенные партии не пересчитываются.',
    [p('id', '"wire" | "efficiency" | "circuits" | "throughput" | "logistics"', 'ID технологии.')], 'string',
    'const t = cq.research.list().find(t => t.id === "wire");\nif (!t.unlocked && cq.world.getState().balance >= t.cost) cq.research.unlock("wire");', ['Технология уже открыта или не хватает денег.']),
  method('code', 'print', 'Печатает значения в журнал. Также работает console.log.',
    [p('values', 'any[]', 'Любые значения через запятую.')], 'void', 'cq.print("Баланс:", cq.world.getState().balance);'),
  { group: 'code', name: 'memory', path: 'cq.memory', params: [], returns: 'Record<string, any>',
    description: 'JSON-объект между шагами, до 16 КБ. Обычные переменные модулей создаются заново. Не сохраняйте функции, BigInt и циклические ссылки.',
    example: 'cq.memory.runs = (cq.memory.runs ?? 0) + 1;\ncq.print("Запусков:", cq.memory.runs);',
    errors: ['Память не является объектом или превышает 16 КБ.'], property: true }
];
const TYPES = [
  'interface CityJob { product: string; quantity: number; remaining: number; }',
  'interface CityLine { id: string; level: number; job: CityJob | null; }',
  'interface CityBuyer { id: string; name: string; product: string; price: number; demand: number; limit: number; remote: boolean; region: string; locked?: boolean; }',
  'interface CitySupplier { id: string; product: string; price: number; stock: number; region: string; locked?: boolean; }',
  'interface CityRecipe { product: string; input: string; amount: number; energy: number; duration: number; research: string | null; }',
  'interface CityContract { id: string; name: string; product: string; quantity: number; reward: number; duration: number; status: "available" | "active" | "cooldown"; deadline: number | null; refreshAt: number | null; locked: boolean; }',
  'interface CityRoute { id: string; name: string; duration: number; fee: number; capacity: number; busy: boolean; regions: string[]; locked: boolean; }',
  'interface CityShipment { id: number; product: string; quantity: number; buyerId: string; routeId: string; unitPrice: number; remaining: number; }',
  'interface CityResearch { id: string; name: string; cost: number; description: string; unlocked: boolean; }',
  'interface CityAlert { level: "warn" | "info"; text: string; }',
  'interface CitySaleOrderOptions { product: string; quantity: number; buyerId: string; minPrice: number; routeId?: string | null; expiresIn?: number; }',
  'interface CitySaleOrder extends CitySaleOrderOptions { id: number; status: "pending" | "filled" | "cancelled" | "expired"; createdAt: number; expiresAt: number; closedAt: number | null; unitPrice?: number; currentPrice?: number; reasons?: string[]; }',
  'interface CityProductionQuote { product: string; quantity: number; lineId: string; input: string; inputQuantity: number; energyCost: number; duration: number; canStart: boolean; reasons: string[]; }',
  'interface CityQuote { product: string; quantity: number; buyerId: string; unitPrice: number; gross: number; fee: number; net: number; duration: number; canTrade: boolean; reasons: string[]; estimatedUnitCost: number | null; estimatedMargin: number | null; }',
  'interface CityRegion { id: string; name: string; cost: number; description: string; unlocked: boolean; }',
  'interface CityEvent { id: string; region: string; name: string; active: boolean; priceBonus: number; changesIn: number; }',
  'interface CityHistoryPoint { tick: number; balance: number; revenue: number; spent: number; inventory: Record<string,number>; prices: Record<string,number>; }',
  'interface DashboardViewContext { inputs: Record<string,string | number | boolean>; }',
  'interface CustomDashboard { title?: string; columns?: number; widgets?: any[]; html?: string; css?: string; height?: number; controls?: any[]; }',
  'interface CityState { tick: number; balance: number; capacity: number; warehouseLevel: number; machineLevel: number;',
  ' inventory: { scrap: number; metal: number; parts: number; wire: number; circuit: number }; job: CityJob | null;',
  ' supplier: { product: string; price: number; stock: number }; buyers: CityBuyer[]; metrics: Record<string, number>;',
  ' orders: CitySaleOrder[]; nextOrder: number; schema: number; regions: string[]; suppliers: CitySupplier[]; history: CityHistoryPoint[]; lines: CityLine[]; research: string[]; shipments: CityShipment[]; nextShipment: number; contracts: Array<{ id: string; status: "available" | "active" | "cooldown"; deadline: number | null; refreshAt: number | null }>; }'
].join('\n');
function declaration(item) {
  const params = item.name === 'print' ? '...values: any[]' : item.params.map(p => p.name + (p.optional ? '?' : '') + ': ' + p.type).join(', ');
  return '/** ' + item.description + ' */\n' + item.name + (item.property ? ': ' + item.returns : '(' + params + '): ' + item.returns) + ';';
}
export const API_TYPES = TYPES + '\ninterface CityAPI {\n' +
  API_GROUPS.filter(([id]) => id !== 'code').map(([id]) =>
    id + ': {\n' + API_METHODS.filter(m => m.group === id).map(declaration).join('\n') + '\n};').join('\n') +
  '\n' + API_METHODS.filter(m => m.group === 'code').map(declaration).join('\n') +
  '\n/** Первая версия API. */ getState(): CityState; buy(product: "scrap" | "metal", quantity: number, supplierId?: string): number;' +
  '\nproduce(product: "metal" | "parts" | "wire" | "circuit", quantity: number, lineId?: string): CityJob;' +
  '\nsell(product: string, quantity: number, buyerId: string): number; upgrade(target: "warehouse" | "machine", lineId?: string): number;\n}';

const COMMAND_PATHS = new Set([
  'cq.world.explore', 'cq.warehouse.upgrade', 'cq.warehouse.discard',
  'cq.market.buy', 'cq.market.sell', 'cq.market.placeOrder', 'cq.market.cancelOrder',
  'cq.factory.start', 'cq.factory.upgrade', 'cq.factory.purchaseLine',
  'cq.contracts.accept', 'cq.contracts.deliver', 'cq.logistics.dispatch', 'cq.research.unlock'
]);
export const apiEffect = item => COMMAND_PATHS.has(item.path) ? 'command' : item.group === 'code' ? 'code' : 'read';

export function mountReference(root) {
  root.innerHTML = '<h2>Справочник API мира</h2>' +
    '<div class="city-api-guide"><strong>Чтение → проверка → команда → один шаг</strong><p>В main(cq) чтение видит результат предыдущих команд этого запуска. Время идёт только после успешного main. Ошибка отменяет все команды и изменения памяти.</p><p><b>Дашборд render(cq, view)</b> получает снимок мира: чтение разрешено, команды запрещены. Пробный запуск показывает прогноз без сохранения. Примеры методов ниже предназначены для main(cq); в render используйте только чтение.</p></div>' +
    '<label class="city-api-search">Найти метод <input type="search" data-api-search placeholder="Например: свободное место, доставка, start" aria-label="Поиск API мира"></label>' +
    '<label class="city-api-kind">Тип метода <select data-api-kind aria-label="Тип метода API"><option value="all">Все методы</option><option value="read">Чтение · доступно в дашборде</option><option value="command">Команды · меняют мир</option><option value="code">Вывод и память</option></select></label>' +
    '<div class="city-api-groups" role="group" aria-label="Разделы API"><button type="button" data-group="all" aria-pressed="true">Все</button>' +
    API_GROUPS.map(([id, name]) => '<button type="button" data-group="' + id + '" aria-pressed="false">' + name + '</button>').join('') +
    '</div><p data-api-count role="status" class="city-muted"></p><div data-api-list></div>' +
    '<button type="button" data-api-back>Вернуться к коду</button><details><summary>Код из первой версии</summary><p>cq.getState, cq.buy, cq.produce, cq.sell и cq.upgrade работают как раньше. В новых примерах используйте cq.world, cq.market, cq.factory и cq.warehouse.</p></details>';
  let group = 'all', query = '', kind = 'all';
  const expanded = new Set(), search = root.querySelector('[data-api-search]');
  const effects = {read:'Чтение · дашборд ✓',command:'Команда · меняет мир',code:'Вывод / память'};
  function render() {
    const methods = API_METHODS.filter(item => (group === 'all' || group === item.group) &&
      (kind === 'all' || kind === apiEffect(item)) &&
      (item.path + ' ' + item.description + ' ' + item.example).toLowerCase().includes(query));
    root.querySelector('[data-api-count]').textContent = 'Найдено методов: ' + methods.length + ' из ' + API_METHODS.length;
    root.querySelectorAll('[data-group]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.group === group)));
    root.querySelector('[data-api-list]').innerHTML = methods.map(item => {
      const signature = item.path + (item.property ? '' : '(' + item.params.map(p => p.name + (p.optional ? '?' : '')).join(', ') + ')');
      const effect = apiEffect(item);
      return '<details class="city-api-method" data-api-path="' + item.path + '"' + (expanded.has(item.path)?' open':'') + '><summary><code>' + escapeHtml(signature) + '</code><span class="city-api-effect" data-effect="' + effect + '">' + effects[effect] + '</span></summary><p>' + escapeHtml(item.description) + '</p>' +
        (item.params.length ? '<div class="city-table-scroll"><table><caption>Аргументы</caption><thead><tr><th>Имя / тип</th><th>Что передавать</th></tr></thead><tbody>' +
          item.params.map(p => '<tr><td><code>' + escapeHtml(p.name) + '</code><br><code>' + escapeHtml(p.type) + '</code></td><td>' + escapeHtml(p.description) +
            (p.optional ? ' Необязательный аргумент.' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p>Аргументы не требуются.</p>') +
        '<p>Возвращает: <code>' + escapeHtml(item.returns) + '</code>.</p><pre data-api-example>' + escapeHtml(item.example) + '</pre>' +
        '<div class="city-api-example-actions"><button type="button" data-api-copy>Копировать пример</button><button type="button" data-api-main>Копировать main(cq)</button></div><p data-api-copy-status class="city-muted" role="status">Пример не запускается автоматически. Команды выполняйте в index.js.</p>' +
        (item.errors.length ? '<p class="city-muted">Возможные ошибки: ' + item.errors.map(escapeHtml).join(' ') + '</p>' : '') + '</details>';
    }).join('') || '<div class="city-empty">Ничего не найдено. Попробуйте другое название или раздел. <button type="button" data-api-clear>Сбросить фильтры</button></div>';
    root.querySelectorAll('[data-api-path]').forEach(detail => {
      const item = API_METHODS.find(m => m.path === detail.dataset.apiPath);
      detail.addEventListener('toggle', () => { if(!detail.isConnected)return; if(detail.open)expanded.add(item.path);else expanded.delete(item.path); });
      for (const button of detail.querySelectorAll('[data-api-copy], [data-api-main]')) button.onclick = async () => {
        const code = button.hasAttribute('data-api-main') ? 'export function main(cq) {\n' + item.example.split('\n').map(line=>'  '+line).join('\n') + '\n}' : item.example;
        const status = detail.querySelector('[data-api-copy-status]');
        try { await navigator.clipboard.writeText(code); status.textContent = 'Скопировано. Вставьте в нужное место редактора.'; }
        catch {
          const pre = detail.querySelector('[data-api-example]'); pre.textContent = code;
          const range=document.createRange();range.selectNodeContents(pre);
          const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
          status.textContent = 'Буфер обмена недоступен. Код выделен — скопируйте вручную.';
        }
      };
    });
    root.querySelector('[data-api-clear]')?.addEventListener('click',reset);
  }
  function reset(){group='all';kind='all';query='';search.value='';root.querySelector('[data-api-kind]').value='all';render();}
  search.addEventListener('input',event=>{query=event.target.value.toLowerCase().trim();render();});
  search.addEventListener('keydown',event=>{if(event.key==='Escape'){reset();search.focus();}});
  root.querySelector('[data-api-kind]').onchange=event=>{kind=event.target.value;render();};
  root.querySelectorAll('[data-group]').forEach(button=>button.onclick=()=>{group=button.dataset.group;render();});
  root.querySelector('[data-api-back]').onclick=()=>root.dispatchEvent(new CustomEvent('city-api-back',{bubbles:true}));
  render();
  const help=document.createElement('details');help.innerHTML='<summary>Как написать собственный дашборд</summary><p>Создайте dashboards/my-dashboard.js и экспортируйте render(cq, view). Возвращайте widgets или html и css. Дашборд только читает мир, без перевода времени; изменяйте экономику в index.js.</p><pre>'+escapeHtml('export function render(cq, view) {\n const s=cq.world.getState();\n return {title:"Моя аналитика",columns:2,widgets:[\n {id:"cash",type:"stat",title:"Баланс",value:s.balance,unit:"₽"},\n {id:"trend",type:"chart",title:"Баланс",points:cq.analytics.getHistory().map(p=>p.balance)}]};\n}')+'</pre><p>Виджеты: stat (value/unit/tone), text (text), table (columns/rows), chart (points/labels). У каждого уникальный id и width (1–4). Порядок, ширина и видимость настраиваются на экране. Для свободного дизайна верните html, css и height (200–1200).</p><p>controls: массив {id,type,label,value,options}, type — select/text/number; варианты select — {value,label}. Значения доступны как view.inputs[id]. Скрипты внутри HTML не исполняются; логику пишите в render и импортируемых модулях.</p>';root.append(help);
  return { open(path) {
    if(!API_METHODS.some(item=>item.path===path))return;
    expanded.add(path); reset(); search.value=path;query=path.toLowerCase();render();
    const detail=root.querySelector('[data-api-path="'+path+'"]');
    detail.open=true;detail.querySelector('summary').focus({preventScroll:true});
    detail.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }};
}
