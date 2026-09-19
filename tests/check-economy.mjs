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
import { state, resetProgress, spendCredits, refundCredits, addInventoryItem } from '../js/state.js';

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

console.log(failures === 0 ? '\nЭкономика: все проверки пройдены' : `\nЭкономика: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
