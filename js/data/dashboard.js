/**
 * Виджеты Мостика. Каждый виджет привязан к задаче: пока задача не решена,
 * прибор «не откалиброван». После решения показания считает функция игрока —
 * её код выполняется в воркере на настоящих данных корабля из ship-data.js.
 *
 * expr    — тело функции, внутри доступна функция (или класс) игрока;
 * render  — как показать полученное значение.
 */
import { SHIP } from './ship-data.js';
import { Shipyard } from '../shipyard.js';
import { escapeHtml, showValue } from '../ui/html.js';

const json = value => JSON.stringify(value);

/** Каталог настоящей верфи: приборы считают на тех же данных, что и дашборд. */
const SHIPYARD_CATALOG = new Shipyard().getCatalog();

/** Полоска со значением в процентах. */
function gauge(percent, tone = '') {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  return `<div class="progress widget__gauge"><div class="progress__bar ${tone}" style="width: ${safe}%"></div></div>`;
}

function list(items) {
  if (!Array.isArray(items) || items.length === 0) return '<p class="widget__empty">Список пуст</p>';
  return `<ul class="widget__list">${items.map(item => `<li>${escapeHtml(showValue(item))}</li>`).join('')}</ul>`;
}

/** Сетка щита: подсвечивает ячейку по координатам, если они переданы. */
function shieldGrid(grid, weak = null) {
  if (!Array.isArray(grid) || grid.length === 0) return '<p class="widget__empty">Матрица пуста</p>';
  const rows = grid
    .map((row, rowIndex) =>
      row
        .map((cell, colIndex) => {
          const isWeak = weak && weak.row === rowIndex && weak.col === colIndex;
          return `<span class="shield-cell${isWeak ? ' is-weak' : ''}">${escapeHtml(showValue(cell))}</span>`;
        })
        .join(''),
    )
    .join('');
  return `<div class="shield-grid" style="grid-template-columns: repeat(${grid[0].length}, 1fr)">${rows}</div>`;
}

export const WIDGETS = [
  {
    id: 'commander',
    questId: 'create-commander',
    title: 'Личное дело',
    unit: 'карточка командира',
    call: `createCommander("${SHIP.corporation.commander}")`,
    expr: `return createCommander(${json(SHIP.corporation.commander)});`,
    render: value => {
      if (!value || typeof value !== 'object') {
        return `<p class="widget__value mono">${escapeHtml(showValue(value))}</p>`;
      }
      const rows = [
        ['Имя', value.name],
        ['Звание', value.rank],
        ['Опыт', value.experience],
        ['Счёт', `${showValue(value.credits)} ¢`],
      ];
      return rows
        .map(([key, val]) => `<div class="widget__row"><span>${escapeHtml(key)}</span><b class="mono">${escapeHtml(showValue(val))}</b></div>`)
        .join('');
    },
  },
  {
    id: 'shipyard-object',
    questId: 'create-shipyard',
    title: 'Космоверфь',
    unit: 'каталог на ваших методах',
    call: `createShipyard("${SHIP.corporation.shipyard}", каталог).getCatalog()`,
    expr:
      `const yard = createShipyard(${json(SHIP.corporation.shipyard)}, ${json(SHIPYARD_CATALOG)});\n` +
      `const found = yard.findModule(${json(SHIPYARD_CATALOG[0].id)});\n` +
      `const missing = yard.findModule("нет-такого");\n` +
      `return { name: yard.name, count: yard.getCatalog().length, found: found ? found.name : null, missing };`,
    render: value => {
      if (!value || typeof value !== 'object') {
        return `<p class="widget__value mono">${escapeHtml(showValue(value))}</p>`;
      }
      return `
        <p class="widget__value mono">${escapeHtml(showValue(value.count))} <small>модулей</small></p>
        <div class="widget__row"><span>Верфь</span><b class="mono">${escapeHtml(showValue(value.name))}</b></div>
        <div class="widget__row"><span>findModule</span><b class="mono">${escapeHtml(showValue(value.found))}</b></div>
        <div class="widget__row"><span>Если не найдено</span><b class="mono">${escapeHtml(showValue(value.missing))}</b></div>
      `;
    },
  },
  {
    id: 'fuel',
    questId: 'fuel-percent',
    title: 'Топливо',
    unit: 'заполненность бака',
    call: `fuelPercent(${SHIP.fuel.current}, ${SHIP.fuel.capacity})`,
    expr: `return fuelPercent(${SHIP.fuel.current}, ${SHIP.fuel.capacity});`,
    render: value => `
      <p class="widget__value mono">${escapeHtml(showValue(value))} <small>%</small></p>
      ${gauge(value, Number(value) < 30 ? 'progress__bar--danger' : '')}
      <p class="widget__note">${SHIP.fuel.current} т из ${SHIP.fuel.capacity} т</p>
    `,
  },
  {
    id: 'reactor',
    questId: 'reactor-status',
    title: 'Реактор',
    unit: 'состояние по датчикам',
    call: `reactorStatus(${SHIP.reactor.temperature}, ${SHIP.reactor.pressure})`,
    expr: `return reactorStatus(${SHIP.reactor.temperature}, ${SHIP.reactor.pressure});`,
    render: value => {
      const tone = value === 'тревога' ? 'badge--danger' : value === 'внимание' ? 'badge--warn' : 'badge--ok';
      return `
        <p class="widget__value"><span class="badge ${tone}">${escapeHtml(showValue(value))}</span></p>
        <p class="widget__note">${SHIP.reactor.temperature} °C · давление ${SHIP.reactor.pressure} атм</p>
      `;
    },
  },
  {
    id: 'cargo-mass',
    questId: 'total-mass',
    title: 'Масса груза',
    unit: 'сумма по трюму',
    call: 'totalMass(cargo)',
    expr: `return totalMass(${json(SHIP.cargo)});`,
    render: value => `
      <p class="widget__value mono">${escapeHtml(showValue(value))} <small>т</small></p>
      <p class="widget__note">${SHIP.cargo.length} контейнеров в трюме</p>
    `,
  },
  {
    id: 'heavy',
    questId: 'heavy-cargo',
    title: 'Тяжёлые контейнеры',
    unit: `масса больше ${SHIP.heavyLimit} т`,
    call: `heavyCargo(cargo, ${SHIP.heavyLimit})`,
    expr: `return heavyCargo(${json(SHIP.cargo)}, ${SHIP.heavyLimit});`,
    render: value => list(value),
  },
  {
    id: 'containers',
    questId: 'pack-containers',
    title: 'Погрузка',
    unit: `контейнеры по ${SHIP.containerCapacity} т`,
    call: `packContainers(массы, ${SHIP.containerCapacity})`,
    expr: `return packContainers(${json(SHIP.cargo.map(item => item.mass))}, ${SHIP.containerCapacity});`,
    render: value => `
      <p class="widget__value mono">${escapeHtml(showValue(value))} <small>шт.</small></p>
      <p class="widget__note">Ящики: ${SHIP.cargo.map(item => item.mass).join(', ')} т</p>
    `,
  },
  {
    id: 'signal',
    questId: 'decode-signal',
    title: 'Входящий сигнал',
    unit: 'расшифровка помех',
    call: 'decodeSignal(signal)',
    expr: `return decodeSignal(${json(SHIP.signal)});`,
    render: value => `
      <p class="widget__text mono">«${escapeHtml(showValue(value))}»</p>
      <p class="widget__note">Принято: ${escapeHtml(SHIP.signal)}</p>
    `,
  },
  {
    id: 'telemetry',
    questId: 'parse-telemetry',
    title: 'Телеметрия',
    unit: 'строка разобрана в объект',
    call: 'parseTelemetry(raw)',
    expr: `return parseTelemetry(${json(SHIP.telemetry)});`,
    render: value => {
      if (!value || typeof value !== 'object') return `<p class="widget__value mono">${escapeHtml(showValue(value))}</p>`;
      const rows = Object.entries(value)
        .map(([key, val]) => `<div class="widget__row"><span>${escapeHtml(key)}</span><b class="mono">${escapeHtml(showValue(val))}</b></div>`)
        .join('');
      return rows || '<p class="widget__empty">Объект пуст</p>';
    },
  },
  {
    id: 'queue',
    questId: 'sort-routes',
    title: 'Очередь на вылет',
    unit: 'маршруты по времени',
    call: 'sortRoutes(routes)',
    expr: `return sortRoutes(${json(SHIP.routes)});`,
    render: value => {
      if (!Array.isArray(value)) return `<p class="widget__value mono">${escapeHtml(showValue(value))}</p>`;
      return value
        .map(route => `<div class="widget__row"><span>${escapeHtml(showValue(route?.to))}</span><b class="mono">${escapeHtml(showValue(route?.hours))} ч</b></div>`)
        .join('') || '<p class="widget__empty">Маршрутов нет</p>';
    },
  },
  {
    id: 'lookup',
    questId: 'find-route',
    title: 'Поиск маршрута',
    unit: `цель: ${SHIP.lookupRoute}`,
    call: `findRoute(routes, "${SHIP.lookupRoute}")`,
    expr: `return findRoute(${json(SHIP.routes)}, ${json(SHIP.lookupRoute)});`,
    render: value =>
      value
        ? `<p class="widget__value mono">${escapeHtml(showValue(value.to))} · ${escapeHtml(showValue(value.hours))} ч</p>
           <p class="widget__note">Награда ${escapeHtml(showValue(value.reward))} ¢</p>`
        : '<p class="widget__empty">Маршрут не найден</p>',
  },
  {
    id: 'best',
    questId: 'best-route',
    title: 'Лучший курс',
    unit: 'максимум награды за час',
    call: 'bestRoute(routes, r => r.reward / r.hours)',
    expr: `return bestRoute(${json(SHIP.routes)}, route => route.reward / route.hours);`,
    render: value =>
      value
        ? `<p class="widget__value mono">${escapeHtml(showValue(value.to))}</p>
           <p class="widget__note">${escapeHtml(showValue(value.reward))} ¢ за ${escapeHtml(showValue(value.hours))} ч</p>`
        : '<p class="widget__empty">Курс не выбран</p>',
  },
  {
    id: 'breach',
    questId: 'shield-matrix',
    title: 'Пробоина в щите',
    unit: 'самая слабая ячейка',
    call: 'weakestCell(grid)',
    expr: `return weakestCell(${json(SHIP.shieldGrid)});`,
    render: value => `
      ${value ? `<p class="widget__value mono">строка ${escapeHtml(showValue(value.row))}, столбец ${escapeHtml(showValue(value.col))} — ${escapeHtml(showValue(value.value))}</p>` : '<p class="widget__empty">Матрица цела</p>'}
      ${shieldGrid(SHIP.shieldGrid, value)}
    `,
  },
  {
    id: 'reinforce',
    questId: 'reinforce-shields',
    title: 'Щит после усиления',
    unit: `+${SHIP.reinforceAmount} к каждой ячейке`,
    call: `reinforce(grid, ${SHIP.reinforceAmount})`,
    expr: `return reinforce(${json(SHIP.shieldGrid)}, ${SHIP.reinforceAmount});`,
    render: value => shieldGrid(value),
  },
  {
    id: 'module-card',
    questId: 'module-class',
    title: 'Карточка модуля',
    unit: 'класс ShipModule',
    call: 'new ShipModule("Щиты", 1).upgrade().describe()',
    expr: 'return new ShipModule("Щиты", 1).upgrade().describe();',
    render: value => `<p class="widget__value">${escapeHtml(showValue(value))}</p>`,
  },
  {
    id: 'probe',
    questId: 'probe-scan',
    title: 'Замеры зонда',
    unit: 'три чтения подряд',
    call: 'collectSamples(probe, 3)',
    expr: `
      const values = ${json(SHIP.probeSamples)};
      let index = 0;
      const probe = { read: () => Promise.resolve(values[index++]) };
      return collectSamples(probe, 3);
    `,
    render: value => list(value),
  },
];
