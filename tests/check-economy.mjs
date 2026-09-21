/**
 * Проверки экономики корпорации (запуск: node tests/check-economy.mjs).
 *
 * Классы Шага 1–2 из CLAUDE.md: бюджет игрока, склад, верфь и биржа труда.
 * Модули работают без DOM, поэтому проверяются обычными тестами в Node.
 */
import { PlayerState } from '../js/player.js';
import { Warehouse } from '../js/warehouse.js';
import { Shipyard } from '../js/shipyard.js';
import { LaborExchange, CrewMember } from '../js/crew.js';
import { powerEfficiency, powerPercent, underPower, thrustDraw } from '../js/ui/corp.js';
import {
  state, resetProgress, spendCredits, refundCredits, addInventoryItem,
  salvagePrice, SALVAGE_RATE, installModule, uninstallModule, sellStockModule,
  stockModules, fittedModules, stockUsedSpace,
} from '../js/state.js';

let failures = 0;
const check = (ok, message, extra = '') => {
  if (ok) console.log('✓', message);
  else {
    failures += 1;
    console.error('✖', message, extra);
  }
};

/* --- Бюджет -------------------------------------------------------------- */

resetProgress();
const player = new PlayerState();

check(player.credits === 0, 'новая корпорация стартует с нулевым бюджетом');
check(spendCredits(100) === false, 'нельзя потратить больше, чем есть');

state.credits = 1000;
check(spendCredits(400) === true && player.credits === 600, 'списание уменьшает бюджет');
check(spendCredits(0) === false && player.credits === 600, 'списание нуля отклоняется');
check(spendCredits(-500) === false && player.credits === 600, 'отрицательная сумма не пополняет бюджет');
check(spendCredits(600) === true && player.credits === 0, 'можно потратить всё до копейки');
check(refundCredits(250) === true && player.credits === 250, 'возврат кредитов работает');
check(refundCredits(-10) === false && player.credits === 250, 'возврат отрицательной суммы отклоняется');

/* --- Склад --------------------------------------------------------------- */

resetProgress();
const warehouse = new Warehouse(300);

check(warehouse.getUsedSpace() === 0, 'пустой склад ничего не занимает');
check(warehouse.addItem({ name: 'Реактор', weight: 150 }) === true, 'модуль помещается на склад');
check(warehouse.getUsedSpace() === 150, 'занятое место считается по весу');
check(warehouse.addItem({ name: 'Двигатель', weight: 200 }) === false, 'перегруз склада отклоняется');
check(warehouse.getUsedSpace() === 150, 'отклонённый модуль не попал на склад');
check(warehouse.addItem({ name: 'Бур', weight: 150 }) === true, 'модуль ровно по остатку помещается');
check(warehouse.items.length === 2, 'склад хранит принятые модули');

/* --- Верфь --------------------------------------------------------------- */

const shipyard = new Shipyard();
check(shipyard.getCatalog().length > 0, 'каталог верфи не пустой');
check(
  shipyard.getCatalog().every(m => m.id && m.name && m.type && m.price > 0 && m.weight > 0),
  'у каждого модуля каталога есть id, название, тип, цена и вес',
);

const bought = shipyard.getModule(shipyard.getCatalog()[0].id);
check(bought && bought.uniqueId, 'купленный модуль получает собственный uniqueId');
check(shipyard.getCatalog()[0].uniqueId === undefined, 'каталог не меняется при покупке');
check(shipyard.getModule('нет-такого') === null, 'неизвестный модуль не выдаётся');

const twice = [shipyard.getModule('mod-reactor-1'), shipyard.getModule('mod-reactor-1')];
check(twice[0].id === twice[1].id, 'один и тот же модуль можно купить дважды');

/* --- Биржа труда --------------------------------------------------------- */

const exchange = new LaborExchange();
const total = exchange.getCandidates().length;
check(total > 0, 'на бирже есть кандидаты');
check(
  exchange.getCandidates().every(c => c instanceof CrewMember && c.role && c.hireCost > 0),
  'у каждого кандидата есть специализация и стоимость найма',
);

const hired = exchange.hire(exchange.getCandidates()[0].id);
check(hired instanceof CrewMember, 'найм возвращает объект члена экипажа');
check(exchange.getCandidates().length === total - 1, 'нанятый кандидат уходит с биржи');
check(exchange.hire(hired.id) === null, 'повторный найм того же кандидата невозможен');
check(exchange.hire('нет-такого') === null, 'найм несуществующего кандидата отклоняется');

/* --- Состояние переживает сброс ------------------------------------------ */

resetProgress();
addInventoryItem({ name: 'Проверка', weight: 1 });
check(state.inventory.length === 1, 'инвентарь пополняется');
resetProgress();
check(state.inventory.length === 0 && state.crew.length === 0, 'сброс очищает склад и экипаж');

/* --- Питание модулей ------------------------------------------------------ */

/*
 * Нехватка энергии делится между всеми потребителями поровну: буры
 * крутятся медленнее, орудия бьют слабее. До этого отрицательный баланс
 * ни на что не влиял, и игрок не понимал, зачем за ним следить.
 */
const power = list => powerEfficiency(list.map(energy => ({ energy })));

check(power([120, -60, -40]) === 1, 'при достатке энергии КПД полный');
check(power([]) === 1, 'пустому кораблю терять нечего');
check(power([120]) === 1, 'реактор без потребителей не снижает КПД');
check(power([-60, -40]) === 0, 'без реактора модули стоят');
check(Math.abs(power([120, -60, -40, -30, -50, -90]) - 120 / 270) < 1e-9, 'КПД равен отношению выработки к потреблению');
check(power([300, -60, -40]) === 1, 'избыток энергии не даёт КПД выше единицы');
check(powerPercent([{ energy: 120 }, { energy: -270 }]) === 44, 'КПД показывается целыми процентами');
check(powerEfficiency('не массив') === 1, 'мусор вместо модулей не роняет расчёт');
check(powerEfficiency([null, { energy: 'нечисло' }]) === 1, 'нечисловая энергия игнорируется');

check(underPower(3, 1) === 3, 'при полном питании значение не меняется');
check(underPower(3, 120 / 270) === 1, 'бур на 44% питания даёт треть выработки');
check(underPower(40, 120 / 270) === 18, 'атака падает пропорционально питанию');
check(underPower(40, 0) === 0, 'без питания модуль мёртв');
check(underPower(0, 1) === 0, 'нечему падать, если исходно ноль');
check(underPower(3, 0.01) === 1, 'работающий модуль не обнуляется округлением');

/* --- Тяга ------------------------------------------------------------------ */

/*
 * Масса корабля стоит энергии: чем он тяжелее, тем больше уходит на тягу.
 * Раньше вес не влиял на энергобаланс вовсе, и навесить можно было что угодно.
 */
check(thrustDraw([{ type: 'engine', weight: 500 }]) === 10, 'тяга растёт от массы корабля');
check(thrustDraw([{ type: 'drill', weight: 500 }]) === 0, 'без двигателя корабль не летит и тяги не просит');
check(thrustDraw([]) === 0, 'пустому кораблю тяга не нужна');
check(thrustDraw('не массив') === 0, 'мусор вместо модулей не роняет расчёт тяги');
check(thrustDraw([{ type: 'engine', weight: 1 }]) === 1, 'даже лёгкий корабль тратит на тягу хотя бы единицу');

/* --- Баланс каталога ------------------------------------------------------ */

/*
 * Корабль с полным набором потребителей должен поддаваться балансировке.
 * Раньше это не выполнялось: шесть модулей давали -150, второй обычный
 * реактор вытягивал только до -30, а третий уже не помещался на склад.
 * Игрок оказывался с вечным минусом и без выхода.
 */
const catalogAll = new Shipyard().getCatalog();
const reactors = catalogAll.filter(module => module.energy > 0);
const consumers = catalogAll.filter(module => module.energy < 0);

check(reactors.length >= 2, 'в каталоге есть из чего выбрать источник энергии');

const strongest = reactors.reduce((best, module) => (module.energy > best.energy ? module : best));
check(
  strongest.energy >= Math.abs(Math.min(...consumers.map(module => module.energy))) * 2,
  'самый мощный реактор перекрывает хотя бы двух прожорливых потребителей',
);

// Жадно набиваем корабль потребителями: сначала лёгкие, пока влезают
const HOLD = 1000;
let greedyMass = strongest.weight;
let greedyEnergy = strongest.energy;

for (const module of [...consumers].sort((a, b) => a.weight - b.weight)) {
  if (greedyMass + module.weight > HOLD) continue;
  greedyMass += module.weight;
  greedyEnergy += module.energy;
}

check(greedyMass <= HOLD, 'забитый корабль умещается в стандартный склад');
check(
  greedyEnergy >= 0,
  'корабль, забитый потребителями под завязку, можно вывести в плюс',
  `баланс ${greedyEnergy} при массе ${greedyMass}`,
);

/* --- Склад и корабль ------------------------------------------------------- */

/*
 * Склад и корабль — разные места. Модуль, лежащий на складе, не даёт ни
 * массы, ни энергии; установленный не занимает склад. Раньше это было одно
 * и то же множество, из-за чего вес корабля включал и запасные детали.
 */
resetProgress();

const catalog = new Shipyard().getCatalog();
const spec = id => catalog.find(module => module.id === id);
const partSpec = spec('mod-reactor-1');
addInventoryItem({ ...partSpec, uniqueId: 'part-1' });

check(stockModules().length === 1, 'купленный модуль приезжает на склад');
check(fittedModules().length === 0, 'на корабль он сам не встаёт');
check(stockUsedSpace() === partSpec.weight, 'лежащий модуль занимает место на складе');

const installed = installModule('part-1');
check(installed?.uniqueId === 'part-1', 'модуль устанавливается на корабль');
check(fittedModules().length === 1 && stockModules().length === 0, 'после установки он числится только на корабле');
check(stockUsedSpace() === 0, 'установленный модуль склад не занимает');
check(installModule('нет-такого') === null, 'нельзя установить то, чего на складе нет');

const back = uninstallModule('part-1', 1000);
check(back.ok === true, 'модуль снимается с корабля на склад');
check(stockModules().length === 1 && fittedModules().length === 0, 'после демонтажа он снова на складе');

// Склад не резиновый: снять некуда — значит нельзя
addInventoryItem({ ...spec('mod-railgun-1'), uniqueId: 'filler' });
installModule('part-1');
const noRoom = uninstallModule('part-1', partSpec.weight);
check(noRoom.ok === false, 'демонтаж отменяется, если на складе нет места');
check(typeof noRoom.reason === 'string' && noRoom.reason.length > 10, 'отказ объясняется словами');
check(fittedModules().length === 1, 'неудачный демонтаж оставляет модуль на корабле');

check(sellStockModule('part-1') === null, 'установленный модуль сдать нельзя');

/* --- Демонтаж модулей ----------------------------------------------------- */

/*
 * Без демонтажа ошибку в закупке нельзя исправить: склад можно забить
 * потребителями так, что реактор уже не влезает, и корабль навсегда
 * остаётся с отрицательным энергобалансом.
 */
resetProgress();

const reactorSpec = spec('mod-reactor-1');
const railgunSpec = spec('mod-railgun-1');

check(salvagePrice(reactorSpec) === Math.round(reactorSpec.price * SALVAGE_RATE), 'возврат считается от цены модуля');
check(salvagePrice(null) === 0, 'за пустоту ничего не возвращают');
check(salvagePrice({}) === 0, 'модуль без цены не приносит денег');

// Забиваем склад так, что реактор уже не влезает
for (const [id, count] of [['mod-railgun-1', 2], ['mod-engine-1', 2], ['mod-drill-1', 1]]) {
  for (let i = 0; i < count; i += 1) {
    addInventoryItem({ ...spec(id), uniqueId: `${id}-${i}` });
  }
}

check(stockUsedSpace() === 920, 'склад забит потребителями под завязку');
check(stockUsedSpace() + reactorSpec.weight > 1000, 'реактор в такой склад уже не помещается');

state.credits = 0;
const refund = sellStockModule('mod-railgun-1-0');

check(refund === salvagePrice(railgunSpec), 'верфь платит за модуль полцены');
check(state.credits === refund, 'выручка зачисляется на счёт');
check(state.inventory.every(item => item.uniqueId !== 'mod-railgun-1-0'), 'сданный модуль уходит со склада');
check(stockUsedSpace() === 920 - railgunSpec.weight, 'место на складе освобождается');
check(
  stockUsedSpace() + reactorSpec.weight <= 1000,
  'после сдачи реактор помещается — из тупика есть выход',
);

check(sellStockModule('нет-такого') === null, 'несуществующий модуль не сдаётся');
check(state.credits === refund, 'неудачная сдача не начисляет денег');

resetProgress();
check(state.inventory.length === 0 && state.fitted.length === 0, 'сброс очищает и склад, и корабль');

console.log(failures === 0 ? '\nЭкономика: все проверки пройдены' : `\nЭкономика: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
