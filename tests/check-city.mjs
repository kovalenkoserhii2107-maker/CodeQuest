import assert from 'node:assert/strict';
import {
  CityEngine, initialWorld, initialSave, CITY_SAVE_KEY, readCitySave, validateFiles, validateMemory
} from '../js/city/engine.js';
import { buildProject } from '../js/act2/loader.js';

const engine = new CityEngine();
for (const quantity of [0, -1, 1.5, NaN, Infinity, '10', 1000001]) {
  assert.throws(() => engine.buy('scrap', quantity), /целое число/);
}
assert.throws(() => engine.buy('metal', 1), /только scrap/);
assert.throws(() => engine.produce('toString', 1), /рецепты/);
assert.throws(() => engine.sell('metal', 1, 'missing'), /Покупатель/);
assert.throws(() => engine.upgrade('balance'), /Улучшения/);
engine.buy('scrap', 10);
assert.equal(engine.snapshot().balance, 960);
engine.produce('metal', 5);
assert.equal(engine.snapshot().balance, 950);
assert.equal(engine.snapshot().inventory.scrap, 0);
assert.throws(() => engine.produce('metal', 1), /занят/);
engine.advance();
assert.equal(engine.snapshot().job.remaining, 1);
engine.advance();
assert.equal(engine.snapshot().inventory.metal, 5);
assert.equal(engine.snapshot().job, null);
const price = engine.snapshot().buyers.find(b => b.id === 'foundry').price;
assert.equal(engine.sell('metal', 5, 'foundry'), 5 * price);
assert.equal(engine.snapshot().balance, 950 + 5 * price);
assert.equal(engine.snapshot().metrics.revenue, 5 * price);
assert.throws(() => engine.sell('metal', 1, 'foundry'), /недостаточно товара/);
console.log('✓ закупка → производство → ожидание → продажа; некорректные команды отклоняются');

const before = engine.snapshot();
assert.throws(() => engine.apply([
  { method: 'buy', args: ['scrap', 1] },
  { method: 'buy', args: ['scrap', -10] }
]));
assert.deepEqual(engine.snapshot(), before);
assert.throws(() => engine.apply([{ method: 'snapshot', args: [] }]), /команда/);
assert.throws(() => engine.apply(Array.from({ length: 101 }, () => ({ method: 'buy', args: ['scrap', 1] }))), /100 команд/);
assert.deepEqual(engine.snapshot(), before);
const detached = engine.snapshot();
detached.balance = 999999; detached.inventory.parts = 999999;
assert.deepEqual(engine.snapshot(), before);
console.log('✓ атомарный откат, ограничения числа команд, изоляция копии мира');

const reserved = new CityEngine();
reserved.buy('scrap', 100); reserved.produce('metal', 8);
reserved.buy('scrap', 8);
assert.throws(() => reserved.buy('scrap', 1), /места/);
reserved.advance(); reserved.advance();
assert.equal(Object.values(reserved.snapshot().inventory).reduce((a, b) => a + b, 0), 100);
console.log('✓ место для готовой партии резервируется при производстве');

const partsWorld = initialWorld();
partsWorld.inventory.metal = 10;
const parts = new CityEngine(partsWorld);
parts.produce('parts', 5);
parts.advance(); parts.advance();
assert.equal(parts.snapshot().inventory.parts, 0);
parts.advance();
assert.equal(parts.snapshot().inventory.parts, 5);
assert.equal(parts.snapshot().balance, 970);
assert.throws(() => parts.sell('parts', 5, 'foundry'), /не принимает/);
assert.ok(parts.sell('parts', 5, 'repair') > 0);
const poor = new CityEngine({ ...initialWorld(), balance: 3 });
assert.throws(() => poor.buy('scrap', 1), /денег/);
assert.equal(poor.snapshot().inventory.scrap, 0);
const capped = new CityEngine({ ...initialWorld(), balance: 100000 });
for (let i = 0; i < 5; i++) capped.upgrade('warehouse');
assert.equal(capped.snapshot().capacity, 600);
assert.throws(() => capped.upgrade('warehouse'), /максимальный/);
console.log('✓ детали, затраты энергии, покупатели, нехватка денег и улучшение склада');

const replay = new CityEngine();
replay.apply([{ method: 'buy', args: ['scrap', 2], fakeBalance: 999999 }]);
assert.equal(replay.snapshot().balance, 992);
assert.equal(replay.snapshot().tick, 1);
assert.equal(replay.snapshot().metrics.runs, 1);
const clone = new CityEngine(replay.snapshot());
clone.apply([{ method: 'produce', args: ['metal', 1] }]);
assert.equal(replay.snapshot().job, null);
console.log('✓ результат определяется командами движка; пробный запуск изолирован');

const records = new Map([['codequest.progress.v2', '{"credits":123,"solved":["commander"]}']]);
const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) };
const save = initialSave();
save.world = replay.snapshot(); save.files['strategy.js'] = 'export const amount = 2;';
save.memory = { runs: 1 };
storage.setItem(CITY_SAVE_KEY, JSON.stringify(save));
assert.deepEqual(readCitySave(storage).save, save);
assert.equal(records.get('codequest.progress.v2'), '{"credits":123,"solved":["commander"]}');
storage.setItem(CITY_SAVE_KEY, '{broken');
assert.ok(readCitySave(storage).warning);
assert.equal(records.get(CITY_SAVE_KEY), '{broken');
assert.ok(readCitySave({ getItem: () => { throw new Error('denied'); } }).warning);
assert.ok(readCitySave(undefined).warning);
storage.setItem(CITY_SAVE_KEY, JSON.stringify({ ...save, world: { ...save.world, balance: -1 } }));
assert.ok(readCitySave(storage).warning);
assert.throws(() => validateMemory({ data: 'x'.repeat(16385) }), /16 КБ/);
assert.throws(() => validateMemory([]));
assert.throws(() => validateFiles({ 'index.js': '', '../escape.js': '' }));
assert.throws(() => validateFiles({ 'index.js': 'x'.repeat(200001) }), /200 КБ/);
console.log('✓ отдельное сохранение; повреждённые данные и недоступное хранилище обрабатываются');

const files = new Map([
  ['index.js', 'import { amount } from "./strategy.js"; export function main(cq) { cq.buy("scrap", amount); }'],
  ['strategy.js', 'export const amount = 3;']
]);
const project = buildProject(files, 'index.js', source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const entry = await import(project.url);
const operations = [];
entry.main({ buy: (...args) => operations.push({ method: 'buy', args }) });
const modules = new CityEngine();
modules.apply(operations);
assert.equal(modules.snapshot().inventory.scrap, 3);
assert.equal(modules.snapshot().balance, 988);
console.log('✓ настоящие import/export выполняют стратегию из нескольких файлов');
