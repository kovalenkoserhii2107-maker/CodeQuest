/**
 * Разделы корпорации. Каждый считается кодом игрока: интерфейс только
 * показывает то, что вернули его функции из решённых заданий.
 */
import { PlayerState } from './player.js';
import { Warehouse } from './warehouse.js';
import { Shipyard } from './shipyard.js';
import { LaborExchange } from './crew.js';
import {
  state, subscribe, isSolved, refundCredits, spendCredits,
  addCrewMember, addLog, solvedCount, totalCount, corpRecord,
} from './state.js';
import { runPlayerCode, errorPanel } from './ui/sim.js';
import { escapeHtml, showValue } from './ui/html.js';

const player = new PlayerState();
const shipyard = new Shipyard();
const laborExchange = new LaborExchange();

/*
 * Имена и лимиты берутся из базы корпорации — это то, что игрок сам создал
 * в консоли своими вызовами. Значения по умолчанию нужны только до практики.
 */
const commanderName = () => corpRecord('commander')?.name ?? 'Командир';
const shipyardName = () => corpRecord('shipyard')?.name ?? 'Орион';
const shipName = () => corpRecord('ship')?.name ?? 'Квест';
const warehouseCapacity = () => corpRecord('warehouseCapacity') ?? 1000;
const warehouse = () => new Warehouse(warehouseCapacity());

const json = value => JSON.stringify(value);

export function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.append(node);
  setTimeout(() => node.remove(), 4000);
}

/* --- Командный центр ----------------------------------------------------- */

export async function renderCommand() {
  const card = document.getElementById('commander-card');
  const stats = document.getElementById('command-stats');
  if (!card || !stats) return;

  const { value, error } = await runPlayerCode('commander', `return createCommander(${json(commanderName())});`);

  card.innerHTML = error
    ? errorPanel(escapeHtml(error))
    : `
      <div class="panel__head">
        <h3 class="panel__title">Личное дело</h3>
        <span class="panel__hint">createCommander</span>
      </div>
      ${[
        ['Имя', value?.name],
        ['Звание', value?.rank],
        ['Опыт', value?.experience],
      ]
        .map(([key, val]) => `<div class="widget__row"><span>${key}</span><b class="mono">${escapeHtml(showValue(val))}</b></div>`)
        .join('')}
      <p class="widget__note">Карточку собрала ваша функция из первого задания.</p>`;

  const crew = player.crew;
  stats.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Счёт корпорации</h3>
      <span class="panel__hint">реальное состояние</span>
    </div>
    <p class="widget__value mono">${player.credits.toLocaleString()} <small>¢</small></p>
    <div class="widget__row"><span>Заданий решено</span><b class="mono">${solvedCount()} / ${totalCount()}</b></div>
    <div class="widget__row"><span>Модулей на складе</span><b class="mono">${warehouse().items.length}</b></div>
    <div class="widget__row"><span>Экипаж</span><b class="mono">${crew.length}</b></div>`;
}

/* --- Верфь --------------------------------------------------------------- */

export async function renderShipyard() {
  const host = document.getElementById('shipyard-catalog');
  const source = document.getElementById('shipyard-source');
  if (!host) return;

  const catalog = shipyard.getCatalog();
  const { value, error } = await runPlayerCode(
    'shipyard',
    `const yard = createShipyard(${json(shipyardName())}, ${json(catalog)});\n` +
    `return { name: yard.name, modules: yard.getCatalog() };`,
  );

  if (error) {
    host.innerHTML = errorPanel(escapeHtml(error));
    if (source) source.textContent = '—';
    return;
  }

  const modules = Array.isArray(value?.modules) ? value.modules : [];
  if (source) source.textContent = `верфь «${showValue(value?.name)}» · ${modules.length} модулей`;

  host.innerHTML = modules
    .map(
      module => `
        <article class="widget">
          <header class="widget__head">
            <div>
              <h3 class="widget__title">${escapeHtml(showValue(module.name))}</h3>
              <p class="widget__unit">${escapeHtml(showValue(module.type))}</p>
            </div>
            <span class="badge badge--info">${escapeHtml(showValue(module.price))} ¢</span>
          </header>
          <div class="widget__body">
            <div class="widget__row"><span>Масса</span><b class="mono">${escapeHtml(showValue(module.weight))} т</b></div>
            <div class="widget__row"><span>Энергия</span><b class="mono">${module.energy > 0 ? '+' : ''}${escapeHtml(showValue(module.energy))}</b></div>
          </div>
          <footer class="widget__foot">
            <code class="mono widget__call">findModule("${escapeHtml(showValue(module.id))}")</code>
            <button class="btn btn--primary btn--sm" type="button" data-module="${escapeHtml(showValue(module.id))}">Купить</button>
          </footer>
        </article>`,
    )
    .join('');

  for (const button of host.querySelectorAll('[data-module]')) {
    button.addEventListener('click', () => buyModule(button.dataset.module, button));
  }
}

/** Покупка идёт через findModule игрока: его код ищет деталь в каталоге. */
async function buyModule(moduleId, button) {
  button.disabled = true;
  const catalog = shipyard.getCatalog();

  const { value: found, error } = await runPlayerCode(
    'shipyard',
    `const yard = createShipyard(${json(shipyardName())}, ${json(catalog)});\n` +
    `return yard.findModule(${json(moduleId)});`,
  );

  if (error || !found) {
    button.disabled = false;
    toast(error ? 'Ваш findModule вернул ошибку' : 'Ваш findModule не нашёл модуль');
    return;
  }

  if (warehouse().getUsedSpace() + found.weight > warehouse().capacity) {
    button.disabled = false;
    toast('На складе нет места');
    return;
  }

  if (!spendCredits(found.price)) {
    button.disabled = false;
    toast('Недостаточно кредитов — решайте задания');
    return;
  }

  const item = { ...found, uniqueId: `${found.id}-${Date.now()}` };
  if (!warehouse().addItem(item)) {
    refundCredits(found.price);
    button.disabled = false;
    toast('Склад отказал, кредиты возвращены');
    return;
  }

  addLog(`Куплен модуль «${found.name}» за ${found.price} ¢`, 'info');
  toast(`Куплен: ${found.name}`);
}

/* --- Склад --------------------------------------------------------------- */

export async function renderWarehouse() {
  const host = document.getElementById('warehouse-content');
  const capacity = document.getElementById('warehouse-capacity');
  if (!host) return;

  const items = warehouse().items;
  const { value, error } = await runPlayerCode(
    'warehouse',
    `const store = createWarehouse(${warehouseCapacity()});\n` +
    `const accepted = ${json(items)}.filter(item => store.addItem(item));\n` +
    `return { used: store.usedSpace(), accepted: accepted.length, capacity: store.capacity };`,
  );

  if (error) {
    host.innerHTML = errorPanel(escapeHtml(error));
    if (capacity) capacity.textContent = '—';
    return;
  }

  const used = Number(value?.used) || 0;
  const percent = Math.min(100, Math.round((used / warehouseCapacity()) * 100));
  if (capacity) capacity.textContent = `${used} / ${warehouseCapacity()} т`;

  host.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Занято ${used} т</h3>
      <span class="panel__hint">usedSpace() из вашего кода</span>
    </div>
    <div class="progress"><div class="progress__bar${percent > 85 ? ' progress__bar--warn' : ''}" style="width: ${percent}%"></div></div>
    ${
      items.length === 0
        ? '<p class="empty-state">Склад пуст. Купите модуль на верфи.</p>'
        : `<div class="table-wrap">
             <table class="table">
               <thead><tr><th>Модуль</th><th>Тип</th><th>Масса</th><th>Энергия</th></tr></thead>
               <tbody>
                 ${items
                   .map(item => `
                     <tr>
                       <td><span class="table__ship-name">${escapeHtml(showValue(item.name))}</span></td>
                       <td>${escapeHtml(showValue(item.type))}</td>
                       <td class="table__num">${escapeHtml(showValue(item.weight))} т</td>
                       <td class="table__num">${item.energy > 0 ? '+' : ''}${escapeHtml(showValue(item.energy))}</td>
                     </tr>`)
                   .join('')}
               </tbody>
             </table>
           </div>`
    }`;
}

/* --- Экипаж -------------------------------------------------------------- */

export async function renderCrew() {
  const hired = document.getElementById('hired-crew');
  const exchange = document.getElementById('exchange-candidates');
  if (!hired || !exchange) return;

  const crew = player.crew;
  hired.innerHTML = crew.length
    ? crew
        .map(
          member => `
            <article class="crew-card" style="display: block; margin-bottom: 12px">
              <div style="display: flex; align-items: center; gap: 12px">
                <span class="crew-card__avatar" aria-hidden="true">${escapeHtml(showValue(member.initials))}</span>
                <div>
                  <h3 class="crew-card__name">${escapeHtml(showValue(member.name))}</h3>
                  <p class="crew-card__role">${escapeHtml(showValue(member.role))}</p>
                </div>
              </div>
              <p class="crew-card__stats mono" style="margin-top: 8px">Зарплата ${escapeHtml(showValue(member.salary))} ¢</p>
            </article>`,
        )
        .join('')
    : '<p class="empty-state">Экипаж не нанят.</p>';

  const hiredIds = crew.map(member => member.id);
  const candidates = laborExchange.getCandidates().filter(candidate => !hiredIds.includes(candidate.id));

  exchange.innerHTML = candidates.length
    ? candidates
        .map(
          candidate => `
            <article class="crew-card" style="display: block; margin-bottom: 12px">
              <div style="display: flex; align-items: center; gap: 12px">
                <span class="crew-card__avatar" aria-hidden="true">${escapeHtml(candidate.initials)}</span>
                <div>
                  <h3 class="crew-card__name">${escapeHtml(candidate.name)}</h3>
                  <p class="crew-card__role">${escapeHtml(candidate.role)}</p>
                </div>
              </div>
              <p class="crew-card__stats mono" style="margin-top: 8px">Рейсов ${candidate.stats.flights} · рейтинг ${candidate.stats.rating}</p>
              <button class="btn btn--ghost btn--sm" style="margin-top: 12px; width: 100%" type="button" data-candidate="${candidate.id}">
                Нанять за ${candidate.hireCost.toLocaleString()} ¢
              </button>
            </article>`,
        )
        .join('')
    : '<p class="empty-state">Все кандидаты наняты.</p>';

  for (const button of exchange.querySelectorAll('[data-candidate]')) {
    button.addEventListener('click', () => hireCandidate(button.dataset.candidate, button));
  }
}

/** Найм проходит через функцию игрока: она решает, хватает ли денег. */
async function hireCandidate(candidateId, button) {
  button.disabled = true;
  const candidate = laborExchange.getCandidates().find(item => item.id === candidateId);
  if (!candidate) return;

  const commander = { name: commanderName(), credits: state.credits, crew: player.crew.map(member => ({ id: member.id })) };
  const { value, error } = await runPlayerCode(
    'hire',
    `return hireCrewMember(${json(commander)}, ${json({ ...candidate })});`,
  );

  if (error) {
    button.disabled = false;
    toast('Ваша функция найма вернула ошибку');
    return;
  }

  const hiredNow = (value?.crew?.length ?? 0) > commander.crew.length;
  if (!hiredNow) {
    button.disabled = false;
    toast('Ваша функция отказала: не хватает кредитов');
    return;
  }

  // Списываем ровно ту сумму, которую посчитал код игрока
  const spent = commander.credits - (value.credits ?? commander.credits);
  if (!spendCredits(spent)) {
    button.disabled = false;
    toast('Бюджет не сошёлся, найм отменён');
    return;
  }

  addCrewMember(laborExchange.hire(candidateId) ?? candidate);
  addLog(`Нанят ${candidate.name} за ${spent} ¢`, 'info');
  toast(`Нанят: ${candidate.name}`);
}

/* --- Корабль ------------------------------------------------------------- */

export async function renderShip() {
  const summary = document.getElementById('ship-summary');
  const modulesHost = document.getElementById('ship-modules');
  if (!summary || !modulesHost) return;

  const modules = warehouse().items;
  const { value, error } = await runPlayerCode(
    'assemble',
    `const ship = assembleShip(${json(shipName())}, ${json(modules)});\n` +
    `return { name: ship.name, mass: ship.mass, energy: ship.energy, count: ship.modules.length };`,
  );

  if (error) {
    summary.innerHTML = errorPanel(escapeHtml(error));
    modulesHost.innerHTML = '';
    return;
  }

  const energy = Number(value?.energy) || 0;
  summary.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Корабль «${escapeHtml(showValue(value?.name))}»</h3>
      <span class="panel__hint">assembleShip</span>
    </div>
    <p class="widget__value mono">${escapeHtml(showValue(value?.mass))} <small>т общая масса</small></p>
    <div class="widget__row"><span>Энергобаланс</span><b class="mono" style="color: ${energy < 0 ? 'var(--color-danger)' : 'var(--color-ok)'}">${energy > 0 ? '+' : ''}${energy}</b></div>
    <div class="widget__row"><span>Модулей в сборке</span><b class="mono">${escapeHtml(showValue(value?.count))}</b></div>
    ${corpRecord('ship') ? `<p class="widget__note">В базе корпорации: «${escapeHtml(showValue(corpRecord('ship').name))}», ${escapeHtml(showValue(corpRecord('ship').mass))} т</p>` : ''}
    ${energy < 0 ? '<p class="widget__note">Потребление выше выработки — нужен реактор.</p>' : ''}`;

  modulesHost.innerHTML = `
    <div class="panel__head"><h3 class="panel__title">Состав</h3></div>
    ${
      modules.length === 0
        ? '<p class="empty-state">Модулей нет — купите их на верфи.</p>'
        : modules
            .map(
              module => `
                <div class="widget__row">
                  <span>${escapeHtml(showValue(module.name))}</span>
                  <b class="mono">${escapeHtml(showValue(module.weight))} т · ${module.energy > 0 ? '+' : ''}${escapeHtml(showValue(module.energy))}</b>
                </div>`,
            )
            .join('')
    }`;
}

/* --- Диагностика --------------------------------------------------------- */

export async function renderFlight() {
  const host = document.getElementById('flight-report');
  if (!host) return;

  const modules = warehouse().items;
  const crew = player.crew.map(member => ({ role: member.role, name: member.name }));

  const assembled = await runPlayerCode(
    'assemble',
    `const ship = assembleShip(${json(shipName())}, ${json(modules)});\n` +
    `return { modules: ship.modules, energy: ship.energy, mass: ship.mass };`,
  );

  if (assembled.error) {
    host.innerHTML = errorPanel(escapeHtml(assembled.error));
    return;
  }

  const { value, error } = await runPlayerCode(
    'preflight',
    `return checkReadiness(${json(assembled.value)}, ${json(crew)});`,
  );

  if (error) {
    host.innerHTML = errorPanel(escapeHtml(error));
    return;
  }

  const problems = Array.isArray(value?.problems) ? value.problems : [];
  host.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Отчёт диспетчера</h3>
      <span class="panel__hint">checkReadiness</span>
    </div>
    <p class="widget__value">
      <span class="badge ${value?.ready ? 'badge--ok' : 'badge--danger'}">${value?.ready ? 'готов к вылету' : 'вылет запрещён'}</span>
    </p>
    ${
      problems.length
        ? `<ul class="widget__list">${problems.map(problem => `<li>${escapeHtml(showValue(problem))}</li>`).join('')}</ul>`
        : '<p class="widget__note">Все проверки пройдены: двигатель на месте, энергии хватает, капитан в экипаже.</p>'
    }
    <div class="widget__row"><span>Масса</span><b class="mono">${escapeHtml(showValue(assembled.value?.mass))} т</b></div>
    <div class="widget__row"><span>Энергобаланс</span><b class="mono">${escapeHtml(showValue(assembled.value?.energy))}</b></div>
    <div class="widget__row"><span>Экипаж</span><b class="mono">${crew.length} чел.</b></div>`;
}

/** Перерисовка раздела по его идентификатору. */
export function renderView(viewId) {
  const renderers = {
    command: renderCommand,
    shipyard: renderShipyard,
    warehouse: renderWarehouse,
    crew: renderCrew,
    ship: renderShip,
    flight: renderFlight,
  };
  return renderers[viewId]?.();
}

/** Название корпорации в боковой панели появляется после первого задания. */
export function corporationName() {
  const commander = corpRecord('commander');
  return commander ? `Командир ${commander.name}` : 'Корпорация не создана';
}

subscribe(() => {
  const active = document.querySelector('.view:not([hidden])');
  const viewId = active?.id.replace('view-', '');
  if (viewId) renderView(viewId);
});
