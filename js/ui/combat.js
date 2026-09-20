/**
 * Разделы Шага 5: «Арсенал», «Полигон» и «Бой».
 *
 * Боевую сводку считает combatStats игрока, урон по мишени — его strike,
 * а весь бой целиком — его runBattle. Игра выдаёт противников и записывает
 * последствия: премию за победу и повреждения корабля.
 */
import { ThreatLog } from '../enemy.js';
import { Shipyard } from '../shipyard.js';
import { state, addLog, db } from '../state.js';
import { runPlayerCode, errorPanel } from './sim.js';
import { assembledShip, warehouse } from './corp.js';
import { escapeHtml, showValue } from './html.js';
import { fillBar, barChart } from './charts.js';
import { moduleArt } from '../data/module-art.js';

const threatLog = new ThreatLog();
const shipyard = new Shipyard();

const json = value => JSON.stringify(value);

/** Выбранный противник и последний отчёт — живут до перезагрузки страницы. */
let chosenThreat = threatLog.getThreats()[0]?.id ?? null;
let lastBattle = null;

/**
 * Боевой корабль так, как его увидит код игрока: корпус растёт от массы,
 * атака и щит приходят из его же combatStats.
 */
export async function battleShip() {
  const ship = await assembledShip();
  if (ship.error) return { error: ship.error };

  const modules = warehouse().items;
  const stats = await runPlayerCode('arsenal', `return combatStats(${json(modules)});`);
  if (stats.error) return { error: stats.error };

  const mass = Number(ship.value?.mass) || 0;

  return {
    value: {
      name: ship.value?.name ?? 'Квест',
      attack: Number(stats.value?.attack) || 0,
      shield: Number(stats.value?.shield) || 0,
      // Прочность корпуса — половина массы: тяжёлый корабль держит дольше
      hull: Math.max(40, Math.round(mass / 2)),
      weapons: Array.isArray(stats.value?.weapons) ? stats.value.weapons : [],
    },
    error: null,
  };
}

/* --- Арсенал ------------------------------------------------------------- */

export async function renderArsenal() {
  const summary = document.getElementById('arsenal-summary');
  const catalog = document.getElementById('arsenal-catalog');
  if (!summary || !catalog) return;

  const ship = await battleShip();
  if (ship.error) {
    summary.innerHTML = errorPanel(escapeHtml(ship.error));
    catalog.innerHTML = '';
    return;
  }

  const { attack, shield, hull, weapons, name } = ship.value;
  const combatModules = shipyard.getCatalog().filter(module => module.type === 'weapon' || module.type === 'shield');
  const owned = warehouse().items;

  summary.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Боевая сводка «${escapeHtml(showValue(name))}»</h3>
      <span class="panel__hint">combatStats из вашего кода</span>
    </div>
    <div class="grid grid--split">
      <div>
        <div class="widget__row"><span>Атака</span><b class="mono ${attack > 0 ? 'is-ok' : 'is-danger'}">${attack}</b></div>
        <div class="widget__row"><span>Щит</span><b class="mono">${shield}</b></div>
      </div>
      <div>
        <div class="widget__row"><span>Прочность корпуса</span><b class="mono">${hull}</b></div>
        <div class="widget__row"><span>Орудий на борту</span><b class="mono">${weapons.length}</b></div>
      </div>
    </div>
    ${
      weapons.length
        ? `<ul class="widget__list">${weapons.map(weapon => `<li>${escapeHtml(showValue(weapon))}</li>`).join('')}</ul>`
        : '<p class="widget__note">Орудий нет: в бою корабль сможет только получать урон.</p>'
    }
    ${barChart({ items: [{ label: 'Атака', value: attack }, { label: 'Щит', value: shield }] })}`;

  catalog.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Боевые модули верфи</h3>
      <span class="panel__hint">покупка — в разделе «Верфь»</span>
    </div>
    <div class="grid grid--cards">
      ${combatModules
        .map(module => {
          const count = owned.filter(item => item.id === module.id).length;
          return `
            <article class="widget${count ? ' is-live' : ''}">
              <img class="module-art" src="${escapeHtml(moduleArt(module))}" alt="" loading="lazy" width="512" height="512">
              <header class="widget__head">
                <div>
                  <h3 class="widget__title">${escapeHtml(module.name)}</h3>
                  <p class="widget__unit">${module.type === 'weapon' ? 'орудие' : 'щит'}</p>
                </div>
                ${count ? `<span class="badge badge--ok">на борту ×${count}</span>` : `<span class="badge badge--info">${module.price.toLocaleString()} ¢</span>`}
              </header>
              <div class="widget__body">
                <div class="widget__row">
                  <span>${module.type === 'weapon' ? 'Атака' : 'Щит'}</span>
                  <b class="mono">${module.attack ?? module.shield}</b>
                </div>
                <div class="widget__row"><span>Масса</span><b class="mono">${module.weight} т</b></div>
                <div class="widget__row"><span>Энергия</span><b class="mono">${module.energy}</b></div>
              </div>
            </article>`;
        })
        .join('')}
    </div>`;
}

/* --- Полигон ------------------------------------------------------------- */

export async function renderRange() {
  const host = document.getElementById('range-targets');
  if (!host) return;

  const ship = await battleShip();
  if (ship.error) {
    host.innerHTML = errorPanel(escapeHtml(ship.error));
    return;
  }

  const targets = threatLog.getTargets();
  const shots = await Promise.all(
    targets.map(target => runPlayerCode('strike', `return strike(${json(ship.value)}, ${json(target)});`)),
  );

  host.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Стрельба по мишеням</h3>
      <span class="panel__hint">strike из вашего кода · атака ${ship.value.attack}</span>
    </div>
    ${ship.value.attack === 0 ? '<p class="widget__note">Орудий нет — сквозь щит проходит только минимальная единица урона.</p>' : ''}
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Мишень</th><th>Щит</th><th>Корпус</th><th>Урон залпа</th><th>Останется</th><th>Залпов до пробоя</th></tr></thead>
        <tbody>
          ${targets
            .map((target, index) => {
              const shot = shots[index];
              if (shot.error) {
                return `<tr><td>${escapeHtml(target.name)}</td><td colspan="5">${escapeHtml(shot.error)}</td></tr>`;
              }

              const damage = Number(shot.value?.damage) || 0;
              const volleys = damage > 0 ? Math.ceil(target.hull / damage) : '∞';
              return `
                <tr>
                  <td><span class="table__ship-name">${escapeHtml(target.name)}</span></td>
                  <td class="table__num">${target.shield}</td>
                  <td class="table__num">${target.hull}</td>
                  <td class="table__num ${damage > 1 ? 'is-ok' : 'is-danger'}">${damage}</td>
                  <td class="table__num">${escapeHtml(showValue(shot.value?.hull))}</td>
                  <td class="table__num">${volleys}</td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="widget__note">Щит вычитается из залпа, но единица проходит всегда — поэтому «∞» здесь не бывает.</p>`;
}

/* --- Бой ----------------------------------------------------------------- */

export async function renderBattle() {
  const launch = document.getElementById('battle-launch');
  const report = document.getElementById('battle-report');
  if (!launch || !report) return;

  const ship = await battleShip();
  if (ship.error) {
    launch.innerHTML = errorPanel(escapeHtml(ship.error));
    report.innerHTML = '';
    return;
  }

  const threat = threatLog.getThreat(chosenThreat) ?? threatLog.getThreats()[0];
  const armed = ship.value.attack > 0;

  launch.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Кого перехватываем</h3>
      <span class="panel__hint">runBattle из вашего кода</span>
    </div>

    <div class="route-picker">
      ${threatLog
        .getThreats()
        .map(item => `
          <button class="route-card${item.id === threat.id ? ' is-active' : ''}" type="button" data-threat="${escapeHtml(item.id)}">
            <span class="route-card__name">${escapeHtml(item.name)}</span>
            <span class="route-card__meta mono">атака ${item.attack} · щит ${item.shield} · корпус ${item.hull}</span>
            <span class="route-card__meta">премия ${item.bounty.toLocaleString()} ¢</span>
          </button>`)
        .join('')}
    </div>

    <div class="duel">
      ${duelSide('Ваш корабль', ship.value)}
      <span class="duel__vs mono" aria-hidden="true">vs</span>
      ${duelSide('Противник', threat)}
    </div>

    <p class="widget__note">${escapeHtml(threat.note)}</p>

    <div class="task__actions">
      <button class="btn btn--primary" type="button" id="start-battle" ${armed ? '' : 'disabled'}>
        Принять бой
      </button>
      ${armed ? '' : '<a class="btn btn--ghost btn--sm" href="#/shipyard">Купить орудие</a>'}
    </div>
    ${armed ? '' : '<p class="widget__note">Без орудий бой не выиграть: сквозь щит проходит по единице за раунд.</p>'}`;

  report.innerHTML = lastBattle ?? `
    <div class="panel__head"><h3 class="panel__title">Отчёт о бое</h3></div>
    <p class="empty-state">Боёв ещё не было. Выберите цель и примите бой.</p>`;

  for (const button of launch.querySelectorAll('[data-threat]')) {
    button.addEventListener('click', () => {
      chosenThreat = button.dataset.threat;
      renderBattle();
    });
  }

  const start = launch.querySelector('#start-battle');
  if (start) start.addEventListener('click', () => fight(start));
}

/** Карточка одной стороны поединка. */
function duelSide(role, side) {
  return `
    <div class="duel__side">
      <p class="duel__role">${escapeHtml(role)}</p>
      <p class="duel__name">${escapeHtml(showValue(side.name))}</p>
      <div class="widget__row"><span>Атака</span><b class="mono">${escapeHtml(showValue(side.attack))}</b></div>
      <div class="widget__row"><span>Щит</span><b class="mono">${escapeHtml(showValue(side.shield))}</b></div>
      <div class="widget__row"><span>Корпус</span><b class="mono">${escapeHtml(showValue(side.hull))}</b></div>
    </div>`;
}

/** Бой: исход считает код игрока, премию и потери записывает игра. */
async function fight(button) {
  button.disabled = true;

  const ship = await battleShip();
  const threat = threatLog.getThreat(chosenThreat) ?? threatLog.getThreats()[0];
  if (ship.error) {
    button.disabled = false;
    return;
  }

  const { value, error } = await runPlayerCode(
    'battle',
    `return runBattle(${json(ship.value)}, ${json(threat)});`,
  );

  if (error) {
    showBattleReport(`<p class="report__error">${escapeHtml(error)}</p>`);
    return;
  }

  const won = value?.winner === 'ship';
  const bounty = won ? threat.bounty : 0;
  if (bounty > 0) state.credits += bounty;

  db.insert('battles', {
    enemy: threat.name,
    winner: String(value?.winner ?? 'draw'),
    rounds: Number(value?.rounds) || 0,
    shipHull: Number(value?.shipHull) || 0,
    bounty,
  });

  addLog(
    won
      ? `Победа: ${threat.name} выведен из строя, премия ${bounty.toLocaleString()} ¢`
      : `Бой (${threat.name}) закончился без победы`,
    won ? 'success' : 'info',
  );

  showBattleReport(battleReportHtml(value, { ship: ship.value, threat, bounty }));
}

/** Разметка отчёта: видно, чем кончился бой и сколько корпуса осталось. */
function battleReportHtml(value, { ship, threat, bounty }) {
  const winner = String(value?.winner ?? 'draw');
  const label = winner === 'ship' ? 'победа' : winner === 'enemy' ? 'корабль выбит' : 'ничья';
  const badge = winner === 'ship' ? 'badge--ok' : winner === 'enemy' ? 'badge--danger' : 'badge--warn';

  const shipHull = Number(value?.shipHull) || 0;
  const enemyHull = Number(value?.enemyHull) || 0;

  return `
    <div class="panel__head">
      <h3 class="panel__title">Бой: ${escapeHtml(threat.name)}</h3>
      <span class="badge ${badge}">${label}</span>
    </div>
    ${bounty > 0 ? `<p class="widget__value mono">${bounty.toLocaleString()} <small>¢ премии</small></p>` : ''}
    <div class="widget__row"><span>Раундов</span><b class="mono">${escapeHtml(showValue(value?.rounds))}</b></div>
    ${fillBar({ value: shipHull, max: ship.hull, label: `Корпус — ${ship.name}`, unit: '', tone: 'progress' })}
    ${fillBar({ value: enemyHull, max: threat.hull, label: `Корпус — ${threat.name}`, unit: '' })}
    ${winner === 'enemy' ? '<p class="widget__note">Корабль выведен из строя. Усильте щит или огневую мощь и повторите вылет.</p>' : ''}
    ${winner === 'draw' ? '<p class="widget__note">Двадцать раундов ничего не решили: нужен корабль помощнее.</p>' : ''}`;
}

function showBattleReport(html) {
  lastBattle = html;
  renderBattle();
}
