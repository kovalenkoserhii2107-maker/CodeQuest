const copy = value => JSON.parse(JSON.stringify(value));
export const CITY_SAVE_KEY = 'codequest.city.v1';
export const RECIPES = Object.freeze({
  metal: Object.freeze({ input: 'scrap', amount: 2, energy: 2, duration: 2 }),
  parts: Object.freeze({ input: 'metal', amount: 2, energy: 6, duration: 3 })
});
export function initialWorld() {
  return {
    tick: 0, balance: 1000, capacity: 100, machineLevel: 1, warehouseLevel: 1,
    inventory: { scrap: 0, metal: 0, parts: 0 }, job: null,
    supplier: { product: 'scrap', price: 4, stock: 120 },
    buyers: [
      { id: 'foundry', name: 'Литейный двор', product: 'metal', price: 18, demand: 12, limit: 12 },
      { id: 'builders', name: 'Стройартель', product: 'metal', price: 16, demand: 20, limit: 20 },
      { id: 'repair', name: 'Ремонтное депо', product: 'parts', price: 68, demand: 6, limit: 6 }
    ],
    metrics: { bought: 0, produced: 0, sold: 0, revenue: 0, spent: 0, runs: 0 }
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
  for (const product of ['scrap', 'metal', 'parts']) {
    if (!Number.isSafeInteger(world.inventory?.[product]) || world.inventory[product] < 0) {
      throw new Error('Некорректный склад.');
    }
  }
  if (world.supplier?.product !== 'scrap' || world.supplier.price !== 4 ||
      !Number.isSafeInteger(world.supplier.stock) || world.supplier.stock < 0 || world.supplier.stock > 120) {
    throw new Error('Некорректный поставщик.');
  }
  const defaults = initialWorld().buyers;
  if (!Array.isArray(world.buyers) || world.buyers.length !== defaults.length) throw new Error('Некорректный рынок.');
  for (let i = 0; i < defaults.length; i++) {
    const buyer = world.buyers[i], expected = defaults[i];
    if (buyer.id !== expected.id || buyer.product !== expected.product || buyer.limit !== expected.limit ||
        !Number.isSafeInteger(buyer.price) || buyer.price < 1 || buyer.price > 100 ||
        !Number.isSafeInteger(buyer.demand) || buyer.demand < 0 || buyer.demand > buyer.limit) throw new Error('Некорректный покупатель.');
  }
  for (const key of Object.keys(initialWorld().metrics)) {
    if (!Number.isSafeInteger(world.metrics?.[key]) || world.metrics[key] < 0) throw new Error('Некорректная статистика.');
  }
  if (world.job !== null) {
    const job = world.job;
    if (!Object.hasOwn(RECIPES, job?.product) || !Number.isSafeInteger(job.quantity) || job.quantity < 1 ||
        job.quantity > 8 * world.machineLevel || !Number.isSafeInteger(job.remaining) ||
        job.remaining < 1 || job.remaining > RECIPES[job.product].duration) throw new Error('Некорректная партия.');
  }
  const used = Object.values(world.inventory).reduce((sum, value) => sum + value, 0) + (world.job?.quantity || 0);
  if (used > world.capacity) throw new Error('Склад переполнен.');
  return world;
}
export class CityEngine {
  #world;
  constructor(world = initialWorld()) { this.#world = copy(validateWorld(world)); }
  snapshot() { return copy(this.#world); }
  #space() {
    return this.#world.capacity - Object.values(this.#world.inventory).reduce((sum, value) => sum + value, 0)
      - (this.#world.job?.quantity || 0);
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
  produce(product, quantity) {
    integer(quantity, 'Размер партии');
    const recipe = Object.hasOwn(RECIPES, product) ? RECIPES[product] : null, w = this.#world;
    if (!recipe) throw new Error('Доступные рецепты: metal, parts.');
    if (w.job) throw new Error('Станок занят. Дождитесь завершения партии.');
    if (quantity > 8 * w.machineLevel) throw new Error('Партия превышает мощность станка.');
    const input = quantity * recipe.amount;
    if (w.inventory[recipe.input] < input) throw new Error('Недостаточно сырья: ' + recipe.input + '.');
    if (quantity > this.#space() + input) throw new Error('Недостаточно места для готовой партии.');
    this.#pay(quantity * recipe.energy);
    w.inventory[recipe.input] -= input;
    w.job = { product, quantity, remaining: recipe.duration };
    return copy(w.job);
  }
  sell(product, quantity, buyerId) {
    integer(quantity, 'Количество');
    const w = this.#world, buyer = w.buyers.find(item => item.id === buyerId);
    if (!buyer || buyer.product !== product) throw new Error('Покупатель не принимает этот товар.');
    if (quantity > buyer.demand) throw new Error('Покупателю не требуется столько товара.');
    if (quantity > w.inventory[product]) throw new Error('На складе недостаточно товара.');
    const revenue = quantity * buyer.price;
    w.inventory[product] -= quantity; buyer.demand -= quantity; w.balance += revenue;
    w.metrics.sold += quantity; w.metrics.revenue += revenue;
    return revenue;
  }
  upgrade(target) {
    const w = this.#world;
    if (target !== 'warehouse' && target !== 'machine') throw new Error('Улучшения: warehouse, machine.');
    const key = target + 'Level', level = w[key];
    if (level >= 6) throw new Error('Достигнут максимальный уровень.');
    const price = (target === 'warehouse' ? 500 : 750) * level;
    this.#pay(price); w[key]++;
    if (target === 'warehouse') w.capacity = 100 * w.warehouseLevel;
    return w[key];
  }
  advance() {
    const w = this.#world;
    w.tick++;
    w.supplier.stock = Math.min(120, w.supplier.stock + 4);
    w.buyers.forEach((buyer, i) => {
      buyer.demand = Math.min(buyer.limit, buyer.demand + 1);
      buyer.price = [18, 16, 68][i] + ((w.tick + i * 2) % 7) - 3;
    });
    if (w.job && --w.job.remaining === 0) {
      w.inventory[w.job.product] += w.job.quantity;
      w.metrics.produced += w.job.quantity;
      w.job = null;
    }
    return this.snapshot();
  }
  apply(operations, { advance = true } = {}) {
    if (!Array.isArray(operations) || operations.length > 100) throw new Error('Допускается до 100 команд за шаг.');
    // Replay on a copy: neither a failed command nor a forged worker snapshot can change this world.
    const candidate = new CityEngine(this.#world);
    for (const operation of operations) {
      if (!operation || !['buy', 'produce', 'sell', 'upgrade'].includes(operation.method) ||
          !Array.isArray(operation.args) || operation.args.length > 3) throw new Error('Неизвестная команда.');
      candidate[operation.method](...operation.args);
    }
    candidate.#world.metrics.runs++;
    if (advance) candidate.advance();
    validateWorld(candidate.#world);
    this.#world = candidate.#world;
    return this.snapshot();
  }
}
export const STARTER_CODE = 'export function main(cq) {\n  const state = cq.getState();\n  cq.print("Баланс:", state.balance, "₽");\n  // Первое задание: купите 10 единиц лома.\n  // cq.buy("scrap", 10);\n}\n';
export function initialSave() {
  return { version: 1, world: initialWorld(), files: { 'index.js': STARTER_CODE }, memory: {} };
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
    return { save: { version: 1, world: copy(validateWorld(data.world)), files: validateFiles(data.files), memory: validateMemory(data.memory) }, warning: '' };
  } catch {
    return { save: initialSave(), warning: 'Сохранение комбината повреждено. Оно сохранено в браузере; новая игра заменит его после первого действия.' };
  }
}
