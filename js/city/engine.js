import { RECIPES, PRODUCTS, BUYERS, RESEARCH, ROUTES, CONTRACTS, COMMANDS } from './catalog.js';
export { RECIPES } from './catalog.js';
const copy = value => JSON.parse(JSON.stringify(value));
export const CITY_SAVE_KEY = 'codequest.city.v1';
export function initialWorld() {
  return {
    tick: 0, balance: 1000, capacity: 100, machineLevel: 1, warehouseLevel: 1,
    inventory: { scrap: 0, metal: 0, parts: 0, wire: 0 }, job: null,
    lines: [{ id: 'line-1', level: 1, job: null }], research: [], shipments: [], nextShipment: 1,
    contracts: CONTRACTS.map(item => ({ id: item.id, status: 'available', deadline: null, refreshAt: null })),
    supplier: { product: 'scrap', price: 4, stock: 120 },
    buyers: BUYERS.map(item => ({ ...item, demand: item.limit })),
    metrics: { bought: 0, produced: 0, sold: 0, revenue: 0, spent: 0, runs: 0, delivered: 0, fulfilled: 0, expired: 0 }
  };
}
function integer(value, name) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000000) {
    throw new Error(name + ': требуется положительное целое число (до 1 000 000).');
  }
}
export function validateWorld(world) {
  if (!world || typeof world !== 'object') throw new Error('Некорректное сохранение мира.');
  for (const key of ['tick', 'balance', 'capacity', 'machineLevel', 'warehouseLevel']) {
    if (!Number.isSafeInteger(world[key]) || world[key] < 0) throw new Error('Некорректное поле: ' + key);
  }
  if (world.machineLevel < 1 || world.machineLevel > 6 || world.warehouseLevel < 1 || world.warehouseLevel > 6 ||
      world.capacity !== 100 * world.warehouseLevel) throw new Error('Некорректные уровни оборудования.');
  for (const product of Object.keys(PRODUCTS)) {
    if (!Number.isSafeInteger(world.inventory?.[product]) || world.inventory[product] < 0) {
      throw new Error('Некорректный склад.');
    }
  }
  if (world.supplier?.product !== 'scrap' || world.supplier.price !== 4 ||
      !Number.isSafeInteger(world.supplier.stock) || world.supplier.stock < 0 || world.supplier.stock > 120) {
    throw new Error('Некорректный поставщик.');
  }
  const defaults = BUYERS;
  if (!Array.isArray(world.buyers) || world.buyers.length !== defaults.length) throw new Error('Некорректный рынок.');
  for (let i = 0; i < defaults.length; i++) {
    const buyer = world.buyers[i], expected = defaults[i];
    if (buyer.id !== expected.id || buyer.product !== expected.product || buyer.limit !== expected.limit || buyer.remote !== expected.remote ||
        !Number.isSafeInteger(buyer.price) || buyer.price < 1 || buyer.price > 100 ||
        !Number.isSafeInteger(buyer.demand) || buyer.demand < 0 || buyer.demand > buyer.limit) throw new Error('Некорректный покупатель.');
  }
  for (const key of Object.keys(initialWorld().metrics)) {
    if (!Number.isSafeInteger(world.metrics?.[key]) || world.metrics[key] < 0) throw new Error('Некорректная статистика.');
  }
  if (!Array.isArray(world.research) || new Set(world.research).size !== world.research.length ||
      world.research.some(id => !RESEARCH.some(item => item.id === id))) throw new Error('Некорректные исследования.');
  if (!Array.isArray(world.lines) || world.lines.length < 1 || world.lines.length > 4) throw new Error('Некорректные линии.');
  world.lines.forEach((line, index) => {
    if (line.id !== 'line-' + (index + 1) || !Number.isSafeInteger(line.level) || line.level < 1 || line.level > 6) throw new Error('Некорректная линия.');
    if (line.job !== null) {
      const job = line.job, recipe = RECIPES[job?.product];
      if (!Object.hasOwn(RECIPES, job?.product) || (recipe.research && !world.research.includes(recipe.research)) ||
          !Number.isSafeInteger(job.quantity) || job.quantity < 1 || job.quantity > 8 * line.level ||
          !Number.isSafeInteger(job.remaining) || job.remaining < 1 || job.remaining > recipe.duration) throw new Error('Некорректная партия.');
    }
  });
  if (world.machineLevel !== world.lines[0].level || JSON.stringify(world.job) !== JSON.stringify(world.lines[0].job)) throw new Error('Несогласованная первая линия.');
  const used = Object.values(world.inventory).reduce((sum, value) => sum + value, 0) +
    world.lines.reduce((sum, line) => sum + (line.job?.quantity || 0), 0);
  if (used > world.capacity) throw new Error('Склад переполнен.');
  if (!Array.isArray(world.contracts) || world.contracts.length !== CONTRACTS.length) throw new Error('Некорректные контракты.');
  world.contracts.forEach((item, i) => {
    if (item.id !== CONTRACTS[i].id || !['available', 'active', 'cooldown'].includes(item.status)) throw new Error('Некорректный контракт.');
    if (item.status === 'active' && (!Number.isSafeInteger(item.deadline) || item.deadline <= world.tick)) throw new Error('Некорректный срок контракта.');
    if (item.status === 'cooldown' && (!Number.isSafeInteger(item.refreshAt) || item.refreshAt <= world.tick)) throw new Error('Некорректный срок обновления.');
  });
  if (world.contracts.filter(item => item.status === 'active').length > 2) throw new Error('Слишком много контрактов.');
  if (!Array.isArray(world.shipments) || world.shipments.length > ROUTES.length || !Number.isSafeInteger(world.nextShipment) || world.nextShipment < 1) throw new Error('Некорректные перевозки.');
  const routeIds = new Set();
  for (const shipment of world.shipments) {
    const route = ROUTES.find(item => item.id === shipment.routeId), buyer = BUYERS.find(item => item.id === shipment.buyerId);
    if (!route || !buyer || routeIds.has(route.id) || shipment.product !== buyer.product ||
        !Number.isSafeInteger(shipment.id) || shipment.id < 1 || shipment.id >= world.nextShipment ||
        !Number.isSafeInteger(shipment.quantity) || shipment.quantity < 1 || shipment.quantity > route.capacity ||
        !Number.isSafeInteger(shipment.remaining) || shipment.remaining < 1 || shipment.remaining > route.duration ||
        !Number.isSafeInteger(shipment.unitPrice) || shipment.unitPrice < 1 || shipment.unitPrice > 100) throw new Error('Некорректная поставка.');
    routeIds.add(route.id);
  }
  return world;
}
export class CityEngine {
  #world;
  constructor(world = initialWorld()) { this.#world = copy(validateWorld(migrateWorld(world))); }
  snapshot() { return copy(this.#world); }
  #space() {
    return this.#world.capacity - Object.values(this.#world.inventory).reduce((sum, value) => sum + value, 0)
      - this.#world.lines.reduce((sum, line) => sum + (line.job?.quantity || 0), 0);
  }
  #sync() {
    this.#world.machineLevel = this.#world.lines[0].level;
    this.#world.job = copy(this.#world.lines[0].job);
  }
  getFreeSpace() { return this.#space(); }
  getRecipes() {
    return Object.entries(RECIPES).filter(([, r]) => !r.research || this.#world.research.includes(r.research))
      .map(([product, recipe]) => ({ product, ...recipe, energy: Math.max(0, recipe.energy - (this.#world.research.includes('efficiency') ? 1 : 0)) }));
  }
  getContracts() {
    return CONTRACTS.map(def => ({ ...def, ...copy(this.#world.contracts.find(item => item.id === def.id)),
      locked: Boolean(RECIPES[def.product].research && !this.#world.research.includes(RECIPES[def.product].research)) }));
  }
  getResearch() { return RESEARCH.map(item => ({ ...item, unlocked: this.#world.research.includes(item.id) })); }
  getRoutes() {
    return ROUTES.map(item => ({ ...item, busy: this.#world.shipments.some(shipment => shipment.routeId === item.id) }));
  }
  getQuote(product, quantity, buyerId, routeId = null) {
    integer(quantity, 'Количество');
    const buyer = this.#world.buyers.find(item => item.id === buyerId);
    if (!buyer || buyer.product !== product) throw new Error('Покупатель не принимает этот товар.');
    const route = routeId === null ? null : ROUTES.find(item => item.id === routeId);
    if (routeId !== null && !route) throw new Error('Маршрут не найден.');
    const gross = buyer.price * quantity, fee = route?.fee || 0;
    return { product, quantity, buyerId, unitPrice: buyer.price, gross, fee, net: gross - fee,
      duration: route?.duration || 0, canTrade: quantity <= buyer.demand &&
        quantity <= this.#world.inventory[product] && (route ? quantity <= route.capacity &&
          !this.#world.shipments.some(item => item.routeId === route.id) && this.#world.balance >= fee : !buyer.remote) };
  }
  #pay(amount) {
    if (this.#world.balance < amount) throw new Error('Недостаточно денег: нужно ' + amount + ' ₽.');
    this.#world.balance -= amount;
    this.#world.metrics.spent += amount;
  }
  buy(product, quantity) {
    integer(quantity, 'Количество');
    const w = this.#world;
    if (product !== 'scrap') throw new Error('Поставщик продаёт только scrap — лом.');
    if (quantity > w.supplier.stock) throw new Error('У поставщика недостаточно лома.');
    if (quantity > this.#space()) throw new Error('На складе недостаточно свободного места.');
    this.#pay(quantity * w.supplier.price);
    w.supplier.stock -= quantity; w.inventory.scrap += quantity; w.metrics.bought += quantity;
    return quantity;
  }
  produce(product, quantity, lineId = 'line-1') {
    integer(quantity, 'Размер партии');
    const recipe = Object.hasOwn(RECIPES, product) ? RECIPES[product] : null, w = this.#world;
    if (!recipe) throw new Error('Доступные рецепты: metal, parts.');
    const line = w.lines.find(item => item.id === lineId);
    if (!line) throw new Error('Линия не найдена: ' + lineId);
    if (recipe.research && !w.research.includes(recipe.research)) throw new Error('Сначала исследуйте технологию: ' + recipe.research);
    if (line.job) throw new Error('Станок занят. Дождитесь завершения партии.');
    if (quantity > 8 * line.level) throw new Error('Партия превышает мощность станка.');
    const input = quantity * recipe.amount;
    if (w.inventory[recipe.input] < input) throw new Error('Недостаточно сырья: ' + recipe.input + '.');
    if (quantity > this.#space() + input) throw new Error('Недостаточно места для готовой партии.');
    this.#pay(quantity * Math.max(0, recipe.energy - (w.research.includes('efficiency') ? 1 : 0)));
    w.inventory[recipe.input] -= input;
    line.job = { product, quantity, remaining: recipe.duration };
    this.#sync();
    return copy(line.job);
  }
  sell(product, quantity, buyerId) {
    integer(quantity, 'Количество');
    const w = this.#world, buyer = w.buyers.find(item => item.id === buyerId);
    if (!buyer || buyer.product !== product) throw new Error('Покупатель не принимает этот товар.');
    if (buyer.remote) throw new Error('Этот покупатель принимает доставку через cq.logistics.dispatch.');
    if (quantity > buyer.demand) throw new Error('Покупателю не требуется столько товара.');
    if (quantity > w.inventory[product]) throw new Error('На складе недостаточно товара.');
    const revenue = quantity * buyer.price;
    w.inventory[product] -= quantity; buyer.demand -= quantity; w.balance += revenue;
    w.metrics.sold += quantity; w.metrics.revenue += revenue;
    return revenue;
  }
  upgrade(target, lineId = 'line-1') {
    const w = this.#world;
    if (target !== 'warehouse' && target !== 'machine') throw new Error('Улучшения: warehouse, machine.');
    const line = w.lines.find(item => item.id === lineId);
    if (target === 'machine' && !line) throw new Error('Линия не найдена: ' + lineId);
    const key = target + 'Level', level = target === 'machine' ? line.level : w[key];
    if (level >= 6) throw new Error('Достигнут максимальный уровень.');
    const price = (target === 'warehouse' ? 500 : 750) * level;
    this.#pay(price);
    if (target === 'machine') { line.level++; this.#sync(); } else w[key]++;
    if (target === 'warehouse') w.capacity = 100 * w.warehouseLevel;
    return target === 'machine' ? line.level : w[key];
  }
  purchaseLine() {
    const w = this.#world;
    if (w.lines.length >= 4) throw new Error('Доступно не более четырёх линий.');
    this.#pay(1200 * w.lines.length);
    const line = { id: 'line-' + (w.lines.length + 1), level: 1, job: null };
    w.lines.push(line); return line.id;
  }
  unlock(id) {
    const item = RESEARCH.find(item => item.id === id), w = this.#world;
    if (!item) throw new Error('Исследование не найдено.');
    if (w.research.includes(id)) throw new Error('Технология уже исследована.');
    this.#pay(item.cost); w.research.push(id); return id;
  }
  acceptContract(id) {
    const w = this.#world, item = w.contracts.find(item => item.id === id), definition = CONTRACTS.find(item => item.id === id);
    if (!item || item.status !== 'available') throw new Error('Контракт недоступен.');
    if (w.contracts.filter(item => item.status === 'active').length >= 2) throw new Error('Можно вести не более двух контрактов одновременно.');
    const recipe = RECIPES[definition.product];
    if (recipe.research && !w.research.includes(recipe.research)) throw new Error('Контракт требует исследования: ' + recipe.research);
    item.status = 'active'; item.deadline = w.tick + definition.duration; item.refreshAt = null;
    return copy({ ...definition, ...item, locked: false });
  }
  deliverContract(id) {
    const w = this.#world, item = w.contracts.find(item => item.id === id), definition = CONTRACTS.find(item => item.id === id);
    if (!item || item.status !== 'active') throw new Error('Сначала примите контракт.');
    if (w.tick >= item.deadline) throw new Error('Срок контракта истёк.');
    if (w.inventory[definition.product] < definition.quantity) throw new Error('Недостаточно товара для выполнения контракта.');
    w.inventory[definition.product] -= definition.quantity;
    w.balance += definition.reward; w.metrics.revenue += definition.reward;
    w.metrics.sold += definition.quantity; w.metrics.fulfilled++;
    item.status = 'cooldown'; item.deadline = null; item.refreshAt = w.tick + 5;
    return definition.reward;
  }
  dispatch(product, quantity, buyerId, routeId = 'courier') {
    integer(quantity, 'Количество');
    const w = this.#world, quote = this.getQuote(product, quantity, buyerId, routeId);
    if (!quote.canTrade) throw new Error('Доставка недоступна: проверьте товар, спрос, размер партии, маршрут и деньги на перевозку.');
    const route = ROUTES.find(item => item.id === routeId), buyer = w.buyers.find(item => item.id === buyerId);
    this.#pay(route.fee); w.inventory[product] -= quantity; buyer.demand -= quantity;
    const shipment = { id: w.nextShipment++, product, quantity, buyerId, routeId, unitPrice: quote.unitPrice, remaining: route.duration };
    w.shipments.push(shipment); return copy(shipment);
  }
  advance() {
    const w = this.#world;
    w.tick++;
    w.supplier.stock = Math.min(120, w.supplier.stock + 4);
    w.buyers.forEach((buyer, i) => {
      buyer.demand = Math.min(buyer.limit, buyer.demand + 1);
      buyer.price = BUYERS[i].price + ((w.tick + i * 2) % 7) - 3;
    });
    for (const line of w.lines) {
      if (line.job && --line.job.remaining === 0) {
        w.inventory[line.job.product] += line.job.quantity;
        w.metrics.produced += line.job.quantity; line.job = null;
      }
    }
    this.#sync();
    w.shipments = w.shipments.filter(shipment => {
      if (--shipment.remaining > 0) return true;
      const revenue = shipment.quantity * shipment.unitPrice;
      w.balance += revenue; w.metrics.revenue += revenue; w.metrics.sold += shipment.quantity;
      w.metrics.delivered += shipment.quantity; return false;
    });
    w.contracts.forEach(item => {
      if (item.status === 'active' && w.tick >= item.deadline) {
        item.status = 'available'; item.deadline = null; w.metrics.expired++;
      }
      if (item.status === 'cooldown' && w.tick >= item.refreshAt) {
        item.status = 'available'; item.refreshAt = null;
      }
    });
    return this.snapshot();
  }
  apply(operations, { advance = true } = {}) {
    if (!Array.isArray(operations) || operations.length > 100) throw new Error('Допускается до 100 команд за шаг.');
    // Replay on a copy: neither a failed command nor a forged worker snapshot can change this world.
    const candidate = new CityEngine(this.#world);
    for (const operation of operations) {
      if (!operation || !COMMANDS.includes(operation.method) ||
          !Array.isArray(operation.args) || operation.args.length > 4) throw new Error('Неизвестная команда.');
      candidate[operation.method](...operation.args);
    }
    candidate.#world.metrics.runs++;
    if (advance) candidate.advance();
    validateWorld(candidate.#world);
    this.#world = candidate.#world;
    return this.snapshot();
  }
}
/** Upgrade the first sandbox schema without erasing balance, source files or memory. */
export function migrateWorld(source) {
  const world = copy(source);
  // Old saves have no lines field. An invalid new-format save must not be silently repaired.
  if (!Object.hasOwn(world, 'lines')) {
    const defaults = initialWorld();
    world.inventory = { ...world.inventory, wire: 0 };
    world.lines = [{ id: 'line-1', level: world.machineLevel, job: copy(world.job) }];
    world.research = []; world.shipments = []; world.nextShipment = 1; world.contracts = defaults.contracts;
    world.metrics = { ...defaults.metrics, ...world.metrics };
    world.buyers = defaults.buyers.map(buyer => {
      const old = world.buyers?.find(item => item.id === buyer.id);
      return old ? { ...old, remote: buyer.remote } : buyer;
    });
  }
  return world;
}
export const STARTER_CODE = '/** @param {CityAPI} cq */\nexport function main(cq) {\n  // Первое задание: изучите состояние своей мастерской.\n  const world = cq.world.getState();\n  // cq.print("Баланс:", world.balance);\n  // cq.print("Склад:", world.inventory);\n}\n';
export function initialSave() {
  return { version: 1, world: initialWorld(), files: { 'index.js': STARTER_CODE }, memory: {}, tutorial: { completed: [] } };
}
export function validateMemory(memory) {
  if (!memory || typeof memory !== 'object' || Array.isArray(memory)) throw new Error('cq.memory должен быть объектом.');
  let json;
  try { json = JSON.stringify(memory); } catch { throw new Error('Память должна содержать только JSON-данные.'); }
  if (json.length > 16384) throw new Error('Память скрипта превышает 16 КБ.');
  return JSON.parse(json);
}
export function validateFiles(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files) ||
      typeof files['index.js'] !== 'string' || Object.keys(files).length > 20) throw new Error('Некорректные файлы проекта.');
  let total = 0;
  for (const [name, code] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9_-]+\.js$/.test(name) || typeof code !== 'string') throw new Error('Используйте имена вида helpers.js.');
    total += code.length;
  }
  if (total > 200000) throw new Error('Размер проекта превышает 200 КБ.');
  return { ...files };
}
export function readCitySave(storage) {
  let text;
  try { if (!storage) throw new Error('storage unavailable'); text = storage.getItem(CITY_SAVE_KEY); } catch { return { save: initialSave(), warning: 'Хранилище недоступно. Прогресс останется только до закрытия страницы.' }; }
  if (!text) return { save: initialSave(), warning: '' };
  try {
    const data = JSON.parse(text);
    if (data.version !== 1) throw new Error('Версия сохранения не поддерживается.');
    return { save: { version: 1, world: copy(validateWorld(migrateWorld(data.world))), files: validateFiles(data.files), memory: validateMemory(data.memory), tutorial: validateTutorial(data.tutorial) }, warning: '' };
  } catch {
    return { save: initialSave(), warning: 'Сохранение комбината повреждено. Оно сохранено в браузере; новая игра заменит его после первого действия.' };
  }
}

export function validateTutorial(value) {
  if (value === undefined) return { completed: [] };
  if (!value || !Array.isArray(value.completed) || value.completed.length > 30 ||
      value.completed.some(id => typeof id !== 'string') || new Set(value.completed).size !== value.completed.length) throw new Error('Некорректный учебный прогресс.');
  return { completed: [...value.completed] };
}
