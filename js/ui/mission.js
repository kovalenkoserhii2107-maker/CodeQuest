/**
 * Разделы Шага 4: «Маршруты», «Экспедиция» и «Рынок».
 *
 * Каждый работает на коде игрока: расход топлива считает его planFlight,
 * рейс проводит его runExpedition, распродажу ведёт его sellOre. Игра
 * только даёт исходные данные и записывает последствия.
 */
import { RouteBook } from '../routes.js';
import { Market } from '../market.js';
import {
  state, addLog, spendCredits, addResource, spendResource, resources,
  TANK_CAPACITY, ORE_CAPACITY, CARGO_HOLD, FUEL_PRICE, db, fuelLog,
} from '../state.js';
import { runPlayerCode, errorPanel } from './sim.js';
import { assembledShip, drillCount, shipName, fittedModules, powerEfficiency, powerPercent, underPower } from './corp.js';
import { escapeHtml, showValue } from './html.js';
import { fillBar, barChart } from './charts.js';

const routeBook = new RouteBook();
const market = new Market();

const json = value => JSON.stringify(value);

/** Выбранный на экране маршрут: живёт до перезагрузки страницы. */
let chosenRoute = routeBook.getRoutes()[0]?.id ?? null;

/** Последний отчёт о рейсе — чтобы его было видно после перерисовки. */
let lastFlight = null;

/* --- Маршруты ------------------------------------------------------------ */

/**
 * Сколько топлива реально заливать под рейс.
 *
 * Пока игрок не дописал резерв, в плане есть только расход — берём его.
 * Как только появляется поле total, заправка начинает спрашивать именно
 * его: доработка функции сразу меняет поведение корпорации.
 */
export function fuelNeeded(plan) {
  const total = Number(plan?.total);
  return Number.isFinite(total) && total > 0 ? total : (Number(plan?.fuel) || 0);
}

/** План для одного маршрута: считает функция игрока. */
async function planFor(ship, distance) {
  const { value, error } = await runPlayerCode('plan', `return planFlight(${json(ship)}, ${distance});`);
  return error ? { error } : { plan: value };
}

export async function renderRoutes() {
  const tankHost = document.getElementById('tank-panel');
  const listHost = document.getElementById('routes-list');
  const hint = document.getElementById('routes-tank');
  if (!tankHost || !listHost) return;

  const { fuel } = resources();
  if (hint) hint.textContent = `в баке ${fuel} / ${TANK_CAPACITY} т`;

  const ship = await assembledShip();
  if (ship.error) {
    tankHost.innerHTML = errorPanel(escapeHtml(ship.error));
    listHost.innerHTML = '';
    return;
  }

  const mass = Number(ship.value?.mass) || 0;

  // Обратно корабль идёт гружёным: планировщик обязан это учитывать
  const planShip = { mass, cargo: CARGO_HOLD };

  tankHost.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Топливный бак</h3>
      <span class="panel__hint">${FUEL_PRICE} ¢ за тонну</span>
    </div>
    ${fillBar({ value: fuel, max: TANK_CAPACITY, label: 'Заправлено', unit: 'т' })}
    <div class="grid grid--split">
      <div>
        <div class="widget__row"><span>Корабль</span><b class="mono">«${escapeHtml(showValue(ship.value?.name))}», ${mass} т</b></div>
            <div class="widget__row"><span>Буров на борту</span><b class="mono">${drillCount()}</b></div>
        <div class="widget__row">
          <span>Питание</span>
          <b class="mono ${powerPercent(fittedModules()) < 100 ? 'is-danger' : 'is-ok'}">${powerPercent(fittedModules())}%</b>
        </div>
      </div>
      <div>
        <div class="widget__row"><span>Трюм корабля</span><b class="mono">${CARGO_HOLD} т</b></div>
        <div class="widget__row"><span>Рудный бункер</span><b class="mono">${resources().ore} / ${ORE_CAPACITY} т</b></div>
      </div>
    </div>
    <div class="fuel-buy">
      ${[50, 200, 400]
        .map(amount => `
          <button class="btn btn--ghost btn--sm" type="button" data-fuel="${amount}">
            +${amount} т · ${(amount * FUEL_PRICE).toLocaleString()} ¢
          </button>`)
        .join('')}
    </div>
    <p class="widget__note">Топливо расходуется за рейс целиком: сколько насчитал ваш план, столько и спишется.</p>`;

  const routes = routeBook.getRoutes();
  const plans = await Promise.all(routes.map(route => planFor(planShip, route.distance)));

  listHost.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Направления</h3>
      <span class="panel__hint">planFlight из вашего кода</span>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>Направление</th><th>Путь</th><th>Топливо</th><th>Часы</th><th>Руда с бура</th></tr>
        </thead>
        <tbody>
          ${routes
            .map((route, index) => {
              const outcome = plans[index];
              if (outcome.error) {
                return `<tr><td>${escapeHtml(route.name)}</td><td colspan="4">${escapeHtml(outcome.error)}</td></tr>`;
              }

              const need = fuelNeeded(outcome.plan);
              const reserve = Number(outcome.plan?.reserve) || 0;
              const enough = fuel >= need;

              // Тяжёлый корабль может не вытянуть дальний рейс даже с полным баком —
              // об этом лучше сказать прямо, а не оставлять игрока гадать
              const impossible = need > TANK_CAPACITY;

              return `
                <tr class="${enough ? '' : 'is-short'}">
                  <td>
                    <span class="table__ship-name">${escapeHtml(route.name)}</span>
                    <span class="route__note">${
                      impossible
                        ? `Не хватит даже полного бака: корабль слишком тяжёлый`
                        : escapeHtml(route.note)
                    }</span>
                  </td>
                  <td class="table__num">${route.distance} км</td>
                  <td class="table__num ${enough ? '' : 'is-danger'}">
                    ${need} т${reserve > 0 ? ` <small>из них резерв ${reserve}</small>` : ''}
                  </td>
                  <td class="table__num">${escapeHtml(showValue(outcome.plan?.hours))}</td>
                  <td class="table__num">${route.richness} т/ч</td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="widget__note">
      Красным — рейсы, на которые не хватает топлива в баке.
      Расход посчитан для гружёного корабля: обратно он идёт с рудой.
    </p>`;

  for (const button of tankHost.querySelectorAll('[data-fuel]')) {
    button.addEventListener('click', () => buyFuel(Number(button.dataset.fuel), button));
  }
}

/** Покупка топлива: сначала проверяем бак, потом трогаем счёт. */
function buyFuel(amount, button) {
  button.disabled = true;

  const { fuel } = resources();
  if (fuel + amount > TANK_CAPACITY) {
    button.disabled = false;
    toastFromMission(`В бак столько не влезет: свободно ${TANK_CAPACITY - fuel} т`);
    return;
  }

  const price = amount * FUEL_PRICE;
  if (!spendCredits(price)) {
    button.disabled = false;
    toastFromMission('Не хватает кредитов на заправку');
    return;
  }

  const added = addResource('fuel', amount);
  if (added === 0) {
    // Заправка сорвалась после списания — деньги возвращаем
    state.credits += price;
    button.disabled = false;
    toastFromMission('Заправка не прошла, кредиты возвращены');
    return;
  }

  addLog(`Заправка: +${added} т топлива за ${price.toLocaleString()} ¢`, 'info');
  toastFromMission(`Залито ${added} т топлива`);
}

/* --- Экспедиция ---------------------------------------------------------- */

/** Корабль и план так, как их увидит код игрока. */
async function expeditionInput() {
  const ship = await assembledShip();
  if (ship.error) return { error: ship.error };

  const route = routeBook.getRoute(chosenRoute) ?? routeBook.getRoutes()[0];
  const mass = Number(ship.value?.mass) || 0;

  const planned = await runPlayerCode(
    'plan',
    `return planFlight(${json({ mass, cargo: CARGO_HOLD })}, ${route.distance});`,
  );
  if (planned.error) return { error: planned.error };

  // При нехватке энергии буры работают вполсилы: жила та же, а выработка ниже
  const efficiency = powerEfficiency(fittedModules());

  return {
    route,
    efficiency,
    ship: { drills: drillCount(), fuel: resources().fuel, cargo: CARGO_HOLD },
    plan: {
      ...planned.value,
      // Рейс тратит столько, сколько насчитал план: с резервом, если он есть
      fuel: Number(planned.value?.fuel) || 0,
      total: fuelNeeded(planned.value),
      onRoute: Number(planned.value?.fuel) || 0,
      reserve: Number(planned.value?.reserve) || 0,
      richness: underPower(route.richness, efficiency),
      name: route.name,
    },
  };
}

export async function renderExpedition() {
  const launch = document.getElementById('expedition-launch');
  const report = document.getElementById('expedition-report');
  if (!launch || !report) return;

  const input = await expeditionInput();
  if (input.error) {
    launch.innerHTML = errorPanel(escapeHtml(input.error));
    report.innerHTML = '';
    return;
  }

  const { route, ship, plan, efficiency } = input;
  const enough = ship.fuel >= fuelNeeded(plan);
  const ore = resources().ore;
  const percent = Math.round(efficiency * 100);

  launch.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Подготовка к рейсу</h3>
      <span class="panel__hint">runExpedition из вашего кода</span>
    </div>

    <div class="route-picker">
      ${routeBook
        .getRoutes()
        .map(item => `
          <button class="route-card${item.id === route.id ? ' is-active' : ''}" type="button" data-route="${escapeHtml(item.id)}">
            <span class="route-card__name">${escapeHtml(item.name)}</span>
            <span class="route-card__meta mono">${item.distance} км · ${item.richness} т/ч</span>
          </button>`)
        .join('')}
    </div>

    <div class="widget__row"><span>Топливо в баке</span><b class="mono ${enough ? 'is-ok' : 'is-danger'}">${ship.fuel} т</b></div>
    <div class="widget__row">
      <span>Нужно залить</span>
      <b class="mono">${escapeHtml(showValue(fuelNeeded(plan)))} т${
        plan.reserve > 0 ? ` <small>${plan.onRoute} на рейс + ${plan.reserve} резерв</small>` : ''
      }</b>
    </div>
    <div class="widget__row"><span>Часов в пути</span><b class="mono">${escapeHtml(showValue(plan.hours))}</b></div>
    <div class="widget__row"><span>Буров на борту</span><b class="mono">${ship.drills}</b></div>
    <div class="widget__row">
      <span>Питание</span>
      <b class="mono ${percent < 100 ? 'is-danger' : 'is-ok'}">${percent}%</b>
    </div>
    <div class="widget__row">
      <span>Добыча с бура</span>
      <b class="mono">${escapeHtml(showValue(plan.richness))} т/ч${
        plan.richness < route.richness ? ` <small>вместо ${route.richness}</small>` : ''
      }</b>
    </div>
    <div class="widget__row"><span>Трюм</span><b class="mono">${ship.cargo} т</b></div>
    ${fillBar({ value: ore, max: ORE_CAPACITY, label: 'Руды в бункере', unit: 'т' })}

    <div class="task__actions">
      <button class="btn btn--primary" type="button" id="launch-expedition" ${enough ? '' : 'disabled'}>
        Отправить корабль
      </button>
      ${enough ? '' : '<a class="btn btn--ghost btn--sm" href="#/routes">Заправиться</a>'}
      ${ship.drills === 0 ? '<a class="btn btn--ghost btn--sm" href="#/shipyard">Купить бур</a>' : ''}
    </div>
    ${ship.drills === 0 ? '<p class="widget__note">Без бура рейс пройдёт впустую: добывать нечем.</p>' : ''}
    ${
      percent < 100
        ? `<p class="widget__note">Энергии не хватает: модули работают на ${percent}%. `
          + 'Снимите потребителя на складе или поставьте реактор помощнее.</p>'
        : ''
    }`;

  report.innerHTML = lastFlight ?? `
    <div class="panel__head"><h3 class="panel__title">Отчёт о рейсе</h3></div>
    <p class="empty-state">Рейсов ещё не было. Выберите направление и отправьте корабль.</p>`;

  for (const button of launch.querySelectorAll('[data-route]')) {
    button.addEventListener('click', () => {
      chosenRoute = button.dataset.route;
      renderExpedition();
    });
  }

  const start = launch.querySelector('#launch-expedition');
  if (start) start.addEventListener('click', () => flyExpedition(start));
}

/** Рейс: считает код игрока, последствия записывает игра. */
async function flyExpedition(button) {
  button.disabled = true;

  const input = await expeditionInput();
  if (input.error) {
    button.disabled = false;
    toastFromMission('Раздел работает на вашем коде: поправьте решение');
    return;
  }

  const { route, ship, plan } = input;
  const { value, error } = await runPlayerCode(
    'expedition',
    `return runExpedition(${json(ship)}, ${json(plan)});`,
  );

  if (error) {
    button.disabled = false;
    showFlightReport(`<p class="report__error">${escapeHtml(error)}</p>`, route);
    return;
  }

  if (value?.ok !== true) {
    button.disabled = false;
    showFlightReport(
      `<p class="report__error">Ваша функция отказала в вылете: в баке ${ship.fuel} т, а нужно ${plan.fuel} т.</p>`,
      route,
    );
    return;
  }

  // Списываем ровно то топливо, которое насчитал код игрока
  const burned = ship.fuel - (Number(value.fuelLeft) || 0);
  if (burned > 0 && !spendResource('fuel', burned)) {
    button.disabled = false;
    toastFromMission('Расход топлива не сошёлся, рейс отменён');
    return;
  }

  const mined = Math.max(0, Number(value.ore) || 0);
  const delivered = addResource('ore', mined);

  db.insert('expeditions', {
    route: route.name,
    ore: mined,
    delivered,
    hours: Number(value.hours) || 0,
    fuel: burned,
    full: Boolean(value.full),
  });

  addLog(`Рейс на ${route.name}: +${delivered} т руды за ${burned} т топлива`, 'success');
  showFlightReport(flightReportHtml(value, { route, burned, delivered, mined }), route);
}

/** Разметка отчёта: по часам видно, как набирался груз. */
function flightReportHtml(value, { route, burned, delivered, mined }) {
  const hours = Math.max(0, Number(value.hours) || 0);
  const perHour = hours > 0 ? mined / hours : 0;

  // Лента по часам: наглядно, на каком часу трюм наполнился
  const steps = Array.from({ length: Math.min(hours, 24) }, (_, index) => ({
    label: `${index + 1} ч`,
    value: Math.round(perHour * (index + 1)),
  }));

  return `
    <div class="panel__head">
      <h3 class="panel__title">Рейс на ${escapeHtml(route.name)}</h3>
      <span class="badge ${value.full ? 'badge--warn' : 'badge--ok'}">${value.full ? 'трюм забился' : 'рейс завершён'}</span>
    </div>
    <p class="widget__value mono">${delivered} <small>т руды доставлено</small></p>
    ${mined !== delivered ? `<p class="widget__note">Добыто ${mined} т, но бункер вместил только ${delivered} т.</p>` : ''}
    <div class="widget__row"><span>Часов отработано</span><b class="mono">${hours}</b></div>
    <div class="widget__row"><span>Топлива сожжено</span><b class="mono">${burned} т</b></div>
    <div class="widget__row"><span>Осталось в баке</span><b class="mono">${escapeHtml(showValue(value.fuelLeft))} т</b></div>
    ${steps.length > 1 ? `<p class="trace__title mono">Накопление груза</p>${barChart({ items: steps, unit: 'т' })}` : ''}
    <a class="btn btn--primary btn--sm" href="#/market">Продать руду</a>`;
}

function showFlightReport(html, route) {
  lastFlight = html;
  const report = document.getElementById('expedition-report');
  if (report) report.innerHTML = html;
  if (route) renderExpedition();
}

/* --- Рынок --------------------------------------------------------------- */

export async function renderMarket() {
  const offersHost = document.getElementById('market-offers');
  const dealHost = document.getElementById('market-deal');
  const hint = document.getElementById('market-bunker');
  if (!offersHost || !dealHost) return;

  const ore = resources().ore;
  const offers = market.getOffers();
  if (hint) hint.textContent = `в бункере ${ore} / ${ORE_CAPACITY} т`;

  offersHost.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Покупатели</h3>
      <span class="panel__hint">спрос ${market.totalDemand()} т</span>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Покупатель</th><th>Цена</th><th>Возьмёт</th></tr></thead>
        <tbody>
          ${offers
            .map(offer => `
              <tr>
                <td>
                  <span class="table__ship-name">${escapeHtml(offer.buyer)}</span>
                  <span class="route__note">${escapeHtml(offer.note)}</span>
                </td>
                <td class="table__num">${offer.price.toLocaleString()} ¢/т</td>
                <td class="table__num">${offer.limit} т</td>
              </tr>`)
            .join('')}
        </tbody>
      </table>
    </div>`;

  if (ore <= 0) {
    dealHost.innerHTML = `
      <div class="panel__head"><h3 class="panel__title">Продажа</h3></div>
      ${fillBar({ value: 0, max: ORE_CAPACITY, label: 'Руды в бункере', unit: 'т' })}
      <p class="empty-state">Бункер пуст. Сходите в экспедицию — и возвращайтесь с грузом.</p>
      <a class="btn btn--primary btn--sm" href="#/expedition">В экспедицию</a>`;
    return;
  }

  const { value, error } = await runPlayerCode('trade', `return sellOre(${ore}, ${json(offers)});`);
  if (error) {
    dealHost.innerHTML = errorPanel(escapeHtml(error));
    return;
  }

  const deals = Array.isArray(value?.deals) ? value.deals : [];

  dealHost.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Продажа</h3>
      <span class="panel__hint">sellOre из вашего кода</span>
    </div>
    ${fillBar({ value: ore, max: ORE_CAPACITY, label: 'Руды в бункере', unit: 'т' })}
    <p class="widget__value mono">${Number(value?.revenue ?? 0).toLocaleString()} <small>¢ выручки</small></p>
    ${
      deals.length
        ? deals
            .map(deal => `
              <div class="widget__row">
                <span>${escapeHtml(showValue(deal.buyer))}</span>
                <b class="mono">${escapeHtml(showValue(deal.amount))} т · ${Number(deal.sum ?? 0).toLocaleString()} ¢</b>
              </div>`)
            .join('')
        : '<p class="widget__note">Ваша функция не нашла, кому продать.</p>'
    }
    ${Number(value?.sold) < ore ? `<p class="widget__note">Спроса хватит только на ${escapeHtml(showValue(value?.sold))} т — остальное придётся придержать.</p>` : ''}
    <div class="task__actions">
      <button class="btn btn--primary" type="button" id="sell-ore" ${deals.length ? '' : 'disabled'}>
        Продать по этому плану
      </button>
    </div>`;

  const sell = dealHost.querySelector('#sell-ore');
  if (sell) sell.addEventListener('click', () => sellByPlan(value, sell));
}

/** Продажа: списываем ровно тот объём, который распределил код игрока. */
function sellByPlan(plan, button) {
  button.disabled = true;

  const sold = Math.max(0, Number(plan?.sold) || 0);
  const revenue = Math.max(0, Number(plan?.revenue) || 0);

  if (sold <= 0 || revenue <= 0) {
    button.disabled = false;
    toastFromMission('Ваша функция ничего не продала');
    return;
  }

  if (!spendResource('ore', sold)) {
    button.disabled = false;
    toastFromMission('В бункере меньше руды, чем в плане продажи');
    return;
  }

  state.credits += revenue;
  db.insert('deals', { sold, revenue, buyers: (plan.deals ?? []).length });
  addLog(`Продано ${sold} т руды за ${revenue.toLocaleString()} ¢`, 'success');
  toastFromMission(`Выручка ${revenue.toLocaleString()} ¢ зачислена`);
}

/* --- Мелочь -------------------------------------------------------------- */

/**
 * Всплывающее сообщение. Импортировать toast из ui.js нельзя: тот модуль
 * сам подключает этот, и вышло бы кольцо импортов.
 */
function toastFromMission(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.append(node);
  setTimeout(() => node.remove(), 4000);
}
