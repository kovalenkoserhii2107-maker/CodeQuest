import assert from 'node:assert/strict';
import { CityEngine, initialWorld, initialSave, readCitySave, CITY_SAVE_KEY, validateWorld } from '../js/city/engine.js';
import { createCityAPI } from '../js/city/api.js';
import { API_METHODS, API_TYPES } from '../js/city/api-reference.js';
import { LESSONS, CityLessons } from '../js/city/lessons.js';
import { buildProject } from '../js/act2/loader.js';

function richWorld() {
  const world = initialWorld();
  world.balance = 100000; world.capacity = 600; world.warehouseLevel = 6;
  world.inventory = { scrap: 40, metal: 40, parts: 20, wire: 20 };
  return world;
}
const legacy = initialWorld();
legacy.balance = 912; legacy.inventory.scrap = 13;
legacy.machineLevel = 2; legacy.job = { product: 'metal', quantity: 5, remaining: 1 };
delete legacy.lines; delete legacy.research; delete legacy.shipments; delete legacy.nextShipment; delete legacy.contracts; delete legacy.inventory.wire;
delete legacy.metrics.delivered; delete legacy.metrics.fulfilled; delete legacy.metrics.expired;
legacy.buyers = legacy.buyers.slice(0, 3).map(buyer => { delete buyer.remote; return buyer; });
const oldSave = { version: 1, world: legacy, files: { 'index.js': 'export function main(cq) { cq.buy("scrap", 1); }' }, memory: { loops: 4 } };
const storage = { getItem: key => key === CITY_SAVE_KEY ? JSON.stringify(oldSave) : null };
const migrated = readCitySave(storage).save;
assert.equal(migrated.world.balance, 912);
assert.equal(migrated.world.inventory.scrap, 13);
assert.equal(migrated.world.lines[0].level, 2);
assert.deepEqual(migrated.world.lines[0].job, legacy.job);
assert.deepEqual(migrated.files, oldSave.files); assert.deepEqual(migrated.memory, oldSave.memory);
assert.deepEqual(migrated.tutorial, { completed: [] });
const migratedEngine = new CityEngine(migrated.world);
migratedEngine.advance(); assert.equal(migratedEngine.snapshot().inventory.metal, 5);
const invalid = initialWorld(); invalid.lines[0].job = { product: 'metal', quantity: 1, remaining: 1 };
assert.throws(() => new CityEngine(invalid), /Несогласованная/);
console.log('✓ старые деньги, файлы, память и текущая партия мигрируют без сброса; повреждённая новая схема отклоняется');

const world = new CityEngine();
const operations = [], reads = [], logs = [];
const cq = createCityAPI(world, {}, { onCommand: op => operations.push(op), onRead: name => reads.push(name), onPrint: (...args) => logs.push(args) });
assert.equal(cq.world.getTime(), 0);
const detached = cq.world.getState(); detached.balance = 999999;
assert.equal(cq.world.getState().balance, 1000);
assert.equal(cq.warehouse.getStock('metal'), 0);
assert.throws(() => cq.warehouse.getStock('unknown'), /Неизвестный/);
assert.equal(cq.market.getSuppliers()[0].id, 'yard');
cq.market.buy('scrap', 10);
assert.equal(cq.warehouse.getStock('scrap'), 10);
cq.factory.start('metal', 5);
assert.equal(cq.factory.getLines()[0].job.remaining, 2);
assert.equal(cq.warehouse.getFreeSpace(), 95);
assert.equal(world.snapshot().job.remaining, 2);
const replay = new CityEngine(); replay.apply(operations);
assert.equal(replay.snapshot().job.remaining, 1);
assert.ok(reads.includes('warehouse.getFreeSpace'));
cq.memory.runs = 1; cq.print('test');
assert.equal(logs.length, 1);
assert.equal(cq.getState().balance, cq.world.getState().balance);
console.log('✓ сгруппированный API, чтение без побочных эффектов, копии, команды и совместимость старых имён');

const contracts = new CityEngine(richWorld());
const api = createCityAPI(contracts, {});
assert.equal(api.contracts.list()[2].locked, true);
assert.throws(() => api.contracts.accept('wire-order'), /исследования/);
api.contracts.accept('metal-order'); api.contracts.accept('parts-order');
assert.throws(() => api.contracts.accept('metal-order'), /недоступен/);
const balance = contracts.snapshot().balance;
assert.equal(api.contracts.deliver('metal-order'), 140);
assert.equal(contracts.snapshot().balance, balance + 140);
assert.equal(contracts.snapshot().inventory.metal, 35);
assert.equal(contracts.snapshot().metrics.fulfilled, 1);
assert.equal(api.contracts.list()[0].status, 'cooldown');
assert.throws(() => api.contracts.deliver('metal-order'), /примите/);
for (let i = 0; i < 5; i++) contracts.advance();
assert.equal(api.contracts.list()[0].status, 'available');
for (let i = 0; i < 5; i++) contracts.advance();
assert.equal(api.contracts.list()[1].status, 'available');
assert.equal(contracts.snapshot().metrics.expired, 1);
api.contracts.accept('metal-order');
const insufficient = new CityEngine();
insufficient.acceptContract('metal-order');
assert.throws(() => insufficient.deliverContract('metal-order'), /Недостаточно товара/);
console.log('✓ контракты: принятие, товары, фиксированная награда, обновление, сроки и блокировка технологии');

const logistics = new CityEngine(richWorld());
const delivery = createCityAPI(logistics, {});
assert.throws(() => delivery.market.sell('parts', 1, 'district'), /доставку/);
const quote = delivery.market.quote('parts', 4, 'district', 'rail');
assert.equal(quote.gross, 352); assert.equal(quote.fee, 8); assert.equal(quote.net, 344);
const starting = logistics.snapshot().balance;
const shipment = delivery.logistics.dispatch('parts', 4, 'district', 'rail');
assert.equal(logistics.snapshot().balance, starting - 8);
assert.equal(logistics.snapshot().inventory.parts, 16);
assert.equal(shipment.unitPrice, 88);
assert.equal(delivery.logistics.getRoutes().find(r => r.id === 'rail').busy, true);
assert.throws(() => delivery.logistics.dispatch('parts', 1, 'district', 'rail'), /недоступна/);
logistics.advance(); logistics.advance();
assert.equal(logistics.snapshot().balance, starting - 8);
logistics.advance();
assert.equal(logistics.snapshot().balance, starting + 344);
assert.equal(logistics.snapshot().metrics.delivered, 4);
assert.equal(delivery.logistics.getShipments().length, 0);
assert.equal(delivery.logistics.getRoutes().find(r => r.id === 'rail').busy, false);
assert.equal(delivery.market.quote('parts', 1, 'district').canTrade, false);
assert.throws(() => delivery.logistics.dispatch('parts', 13, 'district', 'courier'));
assert.throws(() => delivery.market.quote('parts', 1, 'district', 'unknown'));
console.log('✓ доставка: плата, снятие товара, занятость, задержка, закреплённая цена и удалённые покупатели');

const production = new CityEngine(richWorld());
const factory = createCityAPI(production, {});
assert.equal(factory.factory.getRecipes().length, 2);
assert.throws(() => factory.factory.start('wire', 1), /исследуйте/);
factory.research.unlock('wire');
assert.equal(factory.factory.getRecipes().length, 3);
assert.throws(() => factory.research.unlock('wire'), /уже/);
factory.research.unlock('efficiency');
assert.equal(factory.factory.getRecipes().find(r => r.product === 'metal').energy, 1);
const second = factory.factory.purchaseLine();
assert.equal(second, 'line-2');
const cash = production.snapshot().balance;
factory.factory.start('metal', 5, 'line-1');
factory.factory.start('parts', 4, second);
assert.equal(production.snapshot().balance, cash - 5 - 20);
assert.equal(factory.factory.getLines().filter(l => l.job).length, 2);
production.advance(); production.advance();
assert.equal(production.snapshot().lines[0].job, null);
assert.equal(production.snapshot().lines[1].job.remaining, 1);
production.advance();
assert.equal(production.snapshot().lines[1].job, null);
factory.factory.upgrade(second);
assert.equal(production.snapshot().lines[1].level, 2);
assert.equal(production.snapshot().machineLevel, 1);
factory.factory.start('wire', 3, second); production.advance();
assert.equal(production.snapshot().inventory.wire, 23);
factory.factory.purchaseLine(); factory.factory.purchaseLine();
assert.throws(() => factory.factory.purchaseLine(), /четырёх/);
assert.throws(() => factory.factory.start('metal', 1, 'invalid'), /не найдена/);
const rollback = production.snapshot();
assert.throws(() => production.apply([{ method: 'buy', args: ['scrap', 1] }, { method: 'unlock', args: ['wire'] }]));
assert.deepEqual(production.snapshot(), rollback);
validateWorld(production.snapshot());
console.log('✓ параллельные линии, исследования, экономия энергии, лимиты и атомарный откат новых команд');

const lessons = new CityLessons();
const host = new CityEngine();
function run(body, { automatic = false, preview = false, modules = ['index.js'] } = {}) {
  const before = host.snapshot(), local = new CityEngine(before), ops = [], reads = [], logs = [];
  const api = createCityAPI(local, run.memory || {}, {
    onCommand: op => ops.push(op), onRead: name => reads.push(name),
    onPrint: (...args) => logs.push(args.map(String).join(' '))
  });
  body(api);
  if (!preview) { host.apply(ops); run.memory = api.memory; }
  return lessons.evaluate({ before, after: host.snapshot(), operations: ops, reads, logs, memory: api.memory, modules, automatic, preview });
}
assert.equal(run(cq => { cq.world.getState(); cq.print('balance'); cq.print('stock'); }, { preview: true }), null);
assert.equal(lessons.current().id, 'inspect');
assert.equal(run(cq => { const s = cq.world.getState(); cq.print(s.balance); cq.print(s.inventory); }).id, 'inspect');
assert.equal(run(cq => { cq.market.getSuppliers(); cq.market.buy('scrap', 10); }).id, 'supply');
assert.equal(run(cq => { cq.factory.getRecipes(); cq.factory.start('metal', 5); }).id, 'batch');
host.advance();
assert.equal(run(cq => cq.print(cq.warehouse.getStock('metal'))).id, 'time');
assert.equal(run(cq => { const b = cq.market.getBuyers('metal')[0]; cq.market.sell('metal', 5, b.id); }).id, 'trade');
assert.equal(run(cq => { cq.memory.runs = 1; }, { automatic: true }), null);
assert.equal(run(cq => { cq.memory.runs++; }, { automatic: true }), null);
assert.equal(run(cq => { cq.memory.runs++; }, { automatic: true }).id, 'memory');
assert.deepEqual(lessons.snapshot().completed, LESSONS.slice(0, 6).map(l => l.id));
const restored = new CityLessons(lessons.snapshot());
assert.equal(restored.current().id, 'contract');
assert.equal(lessons.evaluate({ preview: true }), null);
console.log('✓ первые шесть заданий проходятся через настоящий API; проба не засчитывается; учебный прогресс восстанавливается');

const referenceAPI = createCityAPI(new CityEngine(richWorld()), {});
for (const item of API_METHODS) {
  const parts = item.path.split('.').slice(1);
  let value = referenceAPI; for (const part of parts) value = value[part];
  assert.equal(typeof value, item.property ? 'object' : 'function', item.path);
  new Function('cq', item.example);
}
assert.ok(API_TYPES.includes('interface CityAPI')); assert.ok(API_TYPES.includes('dispatch('));
for (const lesson of LESSONS) for (const path of lesson.api) assert.ok(API_METHODS.some(item => item.path === path), path);
const built = buildProject(new Map([
  ['index.js', 'import { amount } from "./strategy.js"; export function main(cq) { cq.market.buy("scrap", amount); }'],
  ['strategy.js', 'export const amount = 3;']
]), 'index.js', text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
const entry = await import(built.url); const moduleOps = [];
entry.main(createCityAPI(new CityEngine(), {}, { onCommand: op => moduleOps.push(op) }));
const moduleHost = new CityEngine(); moduleHost.apply(moduleOps);
assert.equal(moduleHost.snapshot().inventory.scrap, 3);
assert.equal(LESSONS.find(l => l.id === 'modules').check({ modules: built.order }), true);
console.log('✓ документация соответствует API; заготовки ссылаются на существующие методы; реальные ES-модули работают');
