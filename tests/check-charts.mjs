/**
 * Проверки графики (запуск: node tests/check-charts.mjs).
 *
 * Данные для шкал и графиков приходят из кода игрока, поэтому главное —
 * что ни NaN, ни строка, ни разметка в подписи не ломают картинку.
 */
import {
  num, shortNumber, fillBar, balanceBar, gauge, barChart, sparkline, chartFromSpec,
} from '../js/ui/charts.js';
import { shipSchematic, SLOTS } from '../js/ui/shipview.js';
import { mapMarkup } from '../js/ui/map.js';
import { resetProgress } from '../js/state.js';
import { QUESTS } from '../js/data/quests.js';

let failures = 0;
const check = (ok, message, extra = '') => {
  if (ok) console.log('✓', message);
  else {
    failures += 1;
    console.error('✖', message, extra);
  }
};

/* --- Приведение чисел ---------------------------------------------------- */

check(num(12) === 12, 'число проходит как есть');
check(num('12') === 12, 'числовая строка приводится к числу');
check(num(NaN) === 0, 'NaN заменяется значением по умолчанию');
check(num(Infinity) === 0, 'бесконечность заменяется значением по умолчанию');
check(num(undefined, 5) === 5, 'undefined берёт указанный запасной вариант');
check(num({}) === 0, 'объект не превращается в число');

check(shortNumber(1500) === '1.5k', 'тысячи сокращаются');
check(shortNumber(2_000_000) === '2M', 'миллионы сокращаются');
check(shortNumber(42) === '42', 'малые числа остаются как есть');

/* --- Полоса заполненности ------------------------------------------------ */

const half = fillBar({ value: 50, max: 100, label: 'Трюм' });
check(half.includes('width: 50%'), 'полоса считает процент');
check(half.includes('meter__bar--neutral'), 'половина трюма — нейтральный цвет, без сигнала');
check(fillBar({ value: 95, max: 100 }).includes('meter__bar--danger'), 'почти полный трюм — тревожный цвет');
check(fillBar({ value: 500, max: 100 }).includes('width: 100%'), 'перебор обрезается по максимуму');
check(fillBar({ value: -20, max: 100 }).includes('width: 0%'), 'отрицательное значение не уходит влево');
check(fillBar({ value: 1, max: 0 }).includes('width: 100%'), 'нулевой максимум не делит на ноль');

check(
  fillBar({ value: 3, max: 3, tone: 'progress' }).includes('meter__bar--ok'),
  'полный прогресс — зелёный, а не тревожный',
);
check(
  fillBar({ value: 0, max: 3, tone: 'progress' }).includes('meter__bar--neutral'),
  'незаконченный прогресс не притворяется проблемой',
);

/* --- Диверг-шкала -------------------------------------------------------- */

check(balanceBar({ value: 20, max: 100 }).includes('is-positive'), 'плюс рисуется вправо');
check(balanceBar({ value: -20, max: 100 }).includes('is-negative'), 'минус рисуется влево');
check(balanceBar({ value: 20, max: 100 }).includes('+20'), 'плюс показан со знаком');
check(balanceBar({ value: 0 }).includes('balance__bar'), 'нулевой баланс не роняет разметку');

/* --- Круговая шкала ------------------------------------------------------ */

const g = gauge({ value: 50, max: 100, label: 'Масса', unit: 'т' });
check(g.includes('<svg'), 'шкала рисуется как SVG');
check(g.includes('Масса, т'), 'подпись и единица склеиваются через запятую');
check(!gauge({ value: 1, max: 2, unit: 'т' }).includes('>, т<'), 'без подписи запятая не появляется');
check(
  gauge({ value: 3, max: 3, tone: 'progress' }).includes('gauge__value--ok'),
  'полная шкала прогресса — зелёная',
);

/* --- Столбики и линия ---------------------------------------------------- */

const bars = barChart({ items: [{ label: 'Руда', value: 10 }, { label: 'Лёд', value: 5 }] });
check((bars.match(/bar-row"/g) ?? []).length === 2, 'на каждый элемент — своя строка');
check(bars.includes('width: 100%'), 'наибольшее значение занимает всю ширину');
check(barChart({ items: [['Руда', 10]] }).includes('Руда'), 'пары [подпись, значение] тоже работают');
check(barChart({ items: [] }).includes('empty-state'), 'пустой список объясняет, что данных нет');
check(barChart({ items: 'не массив' }).includes('empty-state'), 'не массив не ломает график');
check(
  (barChart({ items: Array.from({ length: 40 }, (_, i) => ({ label: 'м' + i, value: i })) }).match(/bar-row"/g) ?? []).length === 12,
  'длинный список обрезается, чтобы не растянуть панель',
);

check(sparkline({ points: [1, 2, 3] }).includes('<svg'), 'линия рисуется по трём точкам');
check(sparkline({ points: [5] }).includes('empty-state'), 'одной точки для линии мало');
check(sparkline({ points: [2, 2, 2] }).includes('<svg'), 'одинаковые значения не делят на ноль');

/* --- Выбор графика по описанию ------------------------------------------- */

check(chartFromSpec({ type: 'gauge', value: 1, max: 2 }).includes('gauge'), 'type gauge даёт круговую шкалу');
check(chartFromSpec({ type: 'bar', items: [['a', 1]] }).includes('bar-row'), 'type bar даёт столбики');
check(chartFromSpec({ type: 'spark', points: [1, 2] }).includes('spark'), 'type spark даёт линию');
check(chartFromSpec({ type: 'что-то' }) === '', 'незнакомый тип не рисует ничего');
check(chartFromSpec({}) === '', 'описание без типа не рисует ничего');

/* --- Экранирование ------------------------------------------------------- */

const evil = '<img src=x onerror=alert(1)>';
check(!fillBar({ value: 1, max: 2, label: evil }).includes('<img'), 'подпись полосы экранируется');
check(!barChart({ items: [{ label: evil, value: 1 }] }).includes('<img'), 'подпись столбика экранируется');
check(!gauge({ value: 1, max: 2, label: evil }).includes('<img'), 'подпись шкалы экранируется');

/* --- Схема корабля ------------------------------------------------------- */

const empty = shipSchematic([]);
check((empty.match(/ship__slot /g) ?? []).length === SLOTS.length, 'на чертеже слот под каждый тип модуля');
check((empty.match(/is-empty/g) ?? []).length === SLOTS.length, 'без модулей все слоты пустые');
check(SLOTS.some(slot => slot.type === 'weapon'), 'на чертеже есть слот орудия');

const fitted = shipSchematic([{ type: 'engine' }, { type: 'reactor' }, { type: 'reactor' }]);
check((fitted.match(/is-filled/g) ?? []).length === 2, 'занятыми считаются только свои слоты');
check(fitted.includes('×2'), 'два одинаковых модуля показаны количеством');
check(fitted.includes('3 модулей на борту'), 'подпись считает все модули');
check(shipSchematic([{ type: 'тахион' }]).includes('Вне схемы'), 'незнакомый тип выносится отдельной строкой');
check(shipSchematic('не массив').includes('<svg'), 'не массив не ломает чертёж');
check(!shipSchematic([], { name: evil }).includes('<img'), 'имя корабля экранируется');
check(shipSchematic([], { ready: true }).includes('готов к вылету'), 'статус готовности показывается');
check(!shipSchematic([]).includes('badge--'), 'без статуса значка нет');

/* --- Карта --------------------------------------------------------------- */

resetProgress();
const map = mapMarkup();
check(map.includes('<svg'), 'карта рисуется как SVG');
check((map.match(/map__station/g) ?? []).length === QUESTS.length, 'на карте по станции на задание');
check((map.match(/map__station is-active/g) ?? []).length === 1, 'активная станция ровно одна');
check(map.includes('map__pulse'), 'текущая станция пульсирует');
check((map.match(/map__station is-locked/g) ?? []).length === QUESTS.length - 1, 'остальные станции закрыты');
check(map.includes('???'), 'названия будущих станций скрыты');
check(!map.includes('map__route--done'), 'без пройденных заданий светящейся линии нет');
check(map.includes('map__scroll'), 'карта живёт в прокручиваемой обёртке');

console.log(failures === 0 ? '\nГрафика: все проверки пройдены' : `\nГрафика: провалено ${failures}`);
process.exit(failures === 0 ? 0 : 1);
