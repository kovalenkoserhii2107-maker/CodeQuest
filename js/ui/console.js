/**
 * Консоль корпорации — практическая часть заданий.
 *
 * Здесь игрок вызывает свои функции с настоящими значениями: результат не
 * исчезает, а попадает в базу корпорации и открывает раздел интерфейса.
 * В области видимости — все решения, которые он уже написал, и объект corp
 * с реальными данными компании.
 */
import { QUESTS } from '../data/quests.js';
import {
  state, transaction, isSolved, isPracticed, currentQuest, markPracticed,
  setCorpRecord, pushConsoleHistory, spendCredits, addCrewMember, addLog,
  db, applyDbOps, panels, resources, addResource, spendResource, CARGO_HOLD, appSource, fuelLog,
  liveFunctions,
} from '../state.js';
import { Shipyard } from '../shipyard.js';
import { LaborExchange } from '../crew.js';
import { RouteBook } from '../routes.js';
import { Market } from '../market.js';
import { ThreatLog } from '../enemy.js';
import { runConsole } from '../runner.js';
import { assembledShip, powerEfficiency, underPower } from './corp.js';
import { fittedModules, stockModules, stockUsedSpace } from '../state.js';
import { battleShip } from './combat.js';
import { fuelNeeded } from './mission.js';
import { escapeHtml } from './html.js';

const shipyard = new Shipyard();
const laborExchange = new LaborExchange();
const routeBook = new RouteBook();
const market = new Market();
const threatLog = new ThreatLog();

let historyIndex = -1;

/** Код всех решённых заданий — он доступен в консоли. */
function playerSource() {
  return appSource();
}

/**
 * Корабль и план для экспедиции — ровно в том виде, в каком их ждёт
 * runExpedition. План берётся последний утверждённый, а богатство жилы —
 * у маршрута, к которому этот план подходит по расстоянию.
 */
function expeditionInput() {
  const plan = db.last('plans');
  if (!plan) return { ship: null, plan: null };

  const route = routeBook.getRoutes().find(item => item.distance === plan.distance) ?? routeBook.getRoutes()[0];

  // Питание урезает добычу так же, как в разделе «Экспедиция»:
  // консоль и интерфейс обязаны считать одинаково
  const efficiency = powerEfficiency(fittedModules());

  return {
    ship: {
      drills: fittedModules().filter(item => item.type === 'drill').length,
      fuel: resources().fuel,
      cargo: CARGO_HOLD,
    },
    plan: {
      ...plan,
      // Заливаем столько, сколько насчитал план: с резервом, если он есть
      fuel: Number(plan.fuel) || 0,
      total: fuelNeeded(plan),
      richness: underPower(route?.richness ?? 3, efficiency),
      name: route?.name ?? 'маршрут',
    },
  };
}

/**
 * Боевой корабль для консоли.
 *
 * Атаку и щит считает функция игрока по установленным модулям — так же,
 * как раздел «Арсенал». Брать их из последней записи в базе нельзя:
 * запись устаревает, как только модуль сняли или поставили, и корабль
 * с новым орудием продолжал бы числиться безоружным.
 */
async function battleShipInput(ship) {
  if (!ship) return null;

  const live = await battleShip();
  if (live.error || !live.value) return null;

  return {
    name: ship.name ?? live.value.name,
    attack: live.value.attack,
    shield: live.value.shield,
    hull: Math.max(40, Math.round((Number(ship.mass) || 0) / 2)),
  };
}

/**
 * Корабль в его нынешнем виде.
 *
 * Запись в базе — это снимок того момента, когда игрок вызвал assembleShip.
 * Купленные позже модули в ней не отражаются, и корабль «весит» столько же,
 * сколько при сборке. Поэтому корабль пересчитывается тем же кодом игрока,
 * что и раздел «Корабль»: consoles и интерфейс обязаны показывать одно и то же.
 */
async function currentShip() {
  const assembled = await assembledShip();
  if (assembled.error || !assembled.value) return db.last('ships');

  return {
    ...db.last('ships'),
    name: assembled.value.name,
    mass: assembled.value.mass,
    energy: assembled.value.energy,
    modules: assembled.value.modules,
    // Трюм, с которым корабль возвращается: планировщик считает по гружёному
    cargo: CARGO_HOLD,
  };
}

/** Данные корпорации, доступные в команде как corp. */
async function corpData() {
  const hiredIds = state.crew.map(member => member.id);
  const expedition = expeditionInput();
  const ship = await currentShip();

  return {
    corp: {
      battleShip: await battleShipInput(ship),
      threats: threatLog.getThreats(),
      targets: threatLog.getTargets(),
      ore: resources().ore,
      fuel: resources().fuel,
      fuelLog: fuelLog(),
      offers: market.getOffers(),
      expeditionShip: expedition.ship,
      expeditionPlan: expedition.plan,
      credits: state.credits,
      commander: db.last('commanders')
        ? { ...db.last('commanders'), credits: state.credits, crew: state.crew.map(member => ({ ...member })) }
        : null,
      catalog: shipyard.getCatalog(),
      modules: fittedModules(),
      stock: stockModules(),
      stockUsed: stockUsedSpace(),
      crew: state.crew.map(member => ({ ...member })),
      candidates: laborExchange.getCandidates().filter(candidate => !hiredIds.includes(candidate.id)).map(c => ({ ...c })),
      warehouseCapacity: db.last('warehouses')?.capacity ?? null,
      ship,
      report: db.last('reports'),
    },
  };
}

/** Всё, что уходит в воркер: данные, снимок базы и список панелей. */
async function consolePayload() {
  return { data: await corpData(), dbStore: db.snapshot(), panels: panels() };
}

/**
 * Что можно вызвать прямо сейчас — короткая справка сбоку.
 *
 * Функция, написанная в несколько этапов, остаётся одной строкой списка:
 * вызывается она одна, работает последняя проверенная версия.
 */
function availableFunctions() {
  return liveFunctions().map(({ fn, stage }) => ({
    fn,
    title: stage.title,
    example: stage.practice.example,
  }));
}

/* --- Действия, которые консоль может совершить над корпорацией ----------- */

const commitApi = {
  setRecord: (key, value) => setCorpRecord(key, value),

  /** Найм по результату функции игрока: списываем ровно его сумму. */
  hireCandidate(candidateId, spent) {
    const candidate = laborExchange.getCandidates().find(item => item.id === candidateId);
    if (!candidate) return 'Кандидат не найден на бирже';
    if (!Number.isFinite(spent) || spent <= 0) return 'Ваша функция не списала кредиты — найм не засчитан';
    if (!spendCredits(spent)) throw new Error('На счету не хватило кредитов');

    addCrewMember(laborExchange.hire(candidateId) ?? candidate);
    return `${candidate.name} принят в экипаж за ${spent.toLocaleString()} ¢`;
  },

  /**
   * Итоги рейса: топливо списываем, руду принимаем в бункер.
   * Суммы берём из результата функции игрока, но сверяем с реальностью —
   * в баке не может убыть больше, чем там было.
   */
  deliverExpedition(report) {
    const { fuel } = resources();
    const burned = Math.max(0, fuel - (Number(report.fuelLeft) || 0));
    const mined = Math.max(0, Number(report.ore) || 0);

    if (burned > 0 && !spendResource('fuel', burned)) {
      throw new Error('Расход топлива не сошёлся с баком — рейс не засчитан');
    }

    const delivered = addResource('ore', mined);
    addLog(`Рейс завершён: +${delivered} т руды за ${burned} т топлива`, 'success');

    return delivered < mined
      ? `Доставлено ${delivered} т руды: бункер полон, ${mined - delivered} т пришлось бросить`
      : `Доставлено ${delivered} т руды, сожжено ${burned} т топлива`;
  },

  /**
   * Премия за первый бой. По отчёту нельзя понять, кого именно одолели —
   * там только исход и остатки корпусов, — поэтому консоль платит
   * фиксированную ставку за перехват. Премии за конкретных противников
   * начисляет раздел «Бой»: там игра сама знает, кого вы перехватили.
   */
  claimBounty(report) {
    if (report.winner !== 'ship') return 'Премия не выплачена: победы нет';

    const bounty = threatLog.getThreats()[0]?.bounty ?? 0;
    state.credits += bounty;
    addLog(`Первый перехват: премия ${bounty.toLocaleString()} ¢`, 'success');

    return `Противник выведен из строя за ${report.rounds} раундов, премия ${bounty.toLocaleString()} ¢`;
  },

  /** Итоги продажи: руду отдаём, выручку зачисляем на счёт. */
  settleDeal(report) {
    const sold = Math.max(0, Number(report.sold) || 0);
    const revenue = Math.max(0, Number(report.revenue) || 0);

    if (sold <= 0 || revenue <= 0) return 'Продажа не состоялась: ваша функция ничего не продала';
    if (!spendResource('ore', sold)) throw new Error('В бункере меньше руды, чем в плане продажи');

    state.credits += revenue;
    addLog(`Продано ${sold} т руды за ${revenue.toLocaleString()} ¢`, 'success');
    return `Продано ${sold} т руды, на счёт зачислено ${revenue.toLocaleString()} ¢`;
  },
};

/**
 * Задание, чью карточку сейчас можно обновить повторным вызовом.
 *
 * Карточка в реестре — снимок на момент первой практики. Купили модуль,
 * пересобрали корабль — и снимок устарел. Такие задания помечены
 * practice.refresh: их функцию можно вызвать заново, и запись обновится.
 * Помечены только те, чья практика ничего не тратит и не начисляет.
 */
function refreshableQuest(input) {
  return QUESTS.find(quest =>
    quest.practice.refresh
    && isPracticed(quest.id)
    && new RegExp(`\\b${quest.fn}\\b`).test(input)) ?? null;
}

/**
 * Проверка практики: если команда вызвала нужную функцию и результат
 * подошёл — задание закрывается и открывается раздел.
 *
 * У уже закрытого задания повторный вызов не засчитывается второй раз,
 * но может обновить его карточку в реестре.
 */
function tryPractice(input, value, context) {
  const quest = currentQuest();

  if (!quest || !isSolved(quest.id) || isPracticed(quest.id) || !input.includes(quest.fn)) {
    const stale = refreshableQuest(input);
    if (!stale) return null;

    const verdict = stale.practice.validate(value, context);
    if (verdict !== true) return null;   // мусор просто не обновляет запись

    const note = stale.practice.commit(value, commitApi, context);
    addLog(note, 'info');
    return { ok: true, message: note, quest: stale, refreshed: true };
  }

  const verdict = quest.practice.validate(value, context);
  if (verdict !== true) return { ok: false, message: verdict };

  const note = quest.practice.commit(value, commitApi, context);
  const result = markPracticed(quest.id, { note });
  return { ok: Boolean(result), message: note, quest };
}

/* --- Отрисовка ----------------------------------------------------------- */

/** Текст строки вывода: новый формат — объект с уровнем, старый — строка. */
function logText(line) {
  return typeof line === 'string' ? line : String(line?.text ?? '');
}

function entryHtml(entry) {
  const output = entry.error
    ? `<p class="console__error">${escapeHtml(entry.error)}</p>`
    : `<p class="console__value mono">${escapeHtml(entry.preview ?? 'undefined')}</p>`;

  // В истории могут лежать записи старого формата — там строка, а не объект
  const logs = entry.logs?.length
    ? `<pre class="console__logs mono">${escapeHtml(entry.logs.map(logText).join('\n'))}</pre>`
    : '';

  const note = entry.note
    ? `<p class="console__note">${escapeHtml(entry.note)}</p>`
    : '';

  const dbNote = entry.db
    ? `<p class="console__db">${escapeHtml(entry.db)}</p>`
    : '';

  const warn = entry.warn
    ? `<p class="console__warn">${escapeHtml(entry.warn)}</p>`
    : '';

  return `
    <div class="console__entry">
      <p class="console__command mono"><span class="console__prompt">›</span> ${escapeHtml(entry.input)}</p>
      ${output}
      ${logs}
      ${dbNote}
      ${note}
      ${warn}
    </div>`;
}

function renderOutput() {
  const host = document.getElementById('console-output');
  if (!host) return;

  const entries = state.consoleHistory;
  host.innerHTML = entries.length
    ? [...entries].reverse().map(entryHtml).join('')
    : `<p class="empty-state">Консоль пуста. Вызовите свою функцию — например, ${escapeHtml(
        currentQuest()?.practice.example ?? 'createCommander("Ваше имя")',
      )}</p>`;
  host.scrollTop = host.scrollHeight;
}

function renderSide() {
  const host = document.getElementById('console-side');
  if (!host) return;

  const quest = currentQuest();
  const needsPractice = quest && isSolved(quest.id) && !isPracticed(quest.id);

  const practiceCard = needsPractice
    ? `
      <div class="console__task">
        <p class="console__task-label">Практика задания ${quest.order}</p>
        <h3 class="console__task-title">${escapeHtml(quest.practice.title)}</h3>
        <p class="console__task-hint">${escapeHtml(quest.practice.hint)}</p>
        <code class="console__example mono">${escapeHtml(quest.practice.example)}</code>
        <button class="btn btn--primary btn--sm" type="button" id="console-fill">Подставить в строку</button>
      </div>`
    : quest
      ? `<p class="console__task-hint">Сначала пройдите тесты задания «${escapeHtml(quest.title)}» — после этого здесь появится практика.</p>`
      : '<p class="console__task-hint">Все задания закрыты. Консоль остаётся для экспериментов.</p>';

  const functions = availableFunctions();
  host.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Что делать</h3>
      <span class="panel__hint">практика</span>
    </div>
    ${practiceCard}
    <div class="console__reference">
      <p class="console__ref-title">Ваши функции</p>
      ${
        functions.length
          ? functions
              .map(item => `<button class="console__ref-item mono" type="button" data-fill="${escapeHtml(item.example)}">${escapeHtml(item.fn)}()</button>`)
              .join('')
          : '<p class="console__task-hint">Пока ни одна функция не написана.</p>'
      }
      <p class="console__ref-title">Данные корпорации</p>
      <p class="console__ref-list mono">corp.credits · corp.commander · corp.catalog · corp.modules · corp.crew · corp.candidates · corp.ship</p>
      <p class="console__ref-title">Бортовая база</p>
      <p class="console__ref-list mono">db.insert(коллекция, запись) · db.all(коллекция) · db.last(коллекция) · db.find(коллекция, условие) · db.count(коллекция)</p>
      <p class="console__ref-title">Свои панели</p>
      <p class="console__ref-list mono">dashboard.add(имя, функция) · dashboard.remove(имя)</p>
    </div>`;

  document.getElementById('console-fill')?.addEventListener('click', () => fillInput(quest.practice.example));
  for (const button of host.querySelectorAll('[data-fill]')) {
    button.addEventListener('click', () => fillInput(button.dataset.fill));
  }
}

function fillInput(text) {
  const input = document.getElementById('console-input');
  if (!input) return;
  input.value = text;
  input.focus();
  input.setSelectionRange(text.length, text.length);
}

/* --- Выполнение ---------------------------------------------------------- */

async function execute(input) {
  const source = playerSource();
  const result = await runConsole(source, input, await consolePayload());

  // Операции над базой применяем к настоящему хранилищу
  const context = await corpData();
  let practice = null;
  let dbReport = { errors: [] };
  if (!result.error) {
    try {
      transaction(() => {
        dbReport = applyDbOps(result.ops ?? []);
        if (dbReport.errors.length) throw new Error(dbReport.errors.join('; '));
        practice = tryPractice(input, result.value, context);
        if (practice && !practice.ok) throw new Error(practice.message);
      });
    } catch (error) {
      result.error = error.message;
      dbReport = { errors: [] };
    }
  }

  const entry = {
    input,
    preview: result.preview,
    logs: result.logs,
    error: result.error,
    at: new Date().toISOString(),
  };

  const changes = [];
  if (dbReport.inserted) changes.push(`записей добавлено: ${dbReport.inserted}`);
  if (dbReport.updated) changes.push(`изменено: ${dbReport.updated}`);
  if (dbReport.removed) changes.push(`удалено: ${dbReport.removed}`);
  if (dbReport.panels) changes.push('панель обновлена');
  if (changes.length) entry.db = `База данных: ${changes.join(', ')}`;
  if (dbReport.errors.length) entry.warn = `База отказала: ${dbReport.errors.join('; ')}`;

  if (!result.error) {

    if (practice?.refreshed) entry.note = `Запись в реестре обновлена: ${practice.message}`;
    else if (practice?.ok) entry.note = `✓ ${practice.message}`;
    else if (practice && !practice.ok) entry.warn = `Практика не засчитана: ${practice.message}`;
  }

  pushConsoleHistory(entry);
  historyIndex = -1;
  renderOutput();
  renderSide();
  return entry;
}

/** Отрисовать консоль и подключить обработчики. */
export function renderConsole() {
  renderOutput();
  renderSide();

  const form = document.getElementById('console-form');
  const input = document.getElementById('console-input');
  if (!form || !input || form.dataset.ready === 'yes') return;

  form.dataset.ready = 'yes';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;

    input.value = '';
    input.disabled = true;
    await execute(command);
    input.disabled = false;
    input.focus();
  });

  // Стрелки листают историю команд, как в настоящем терминале
  input.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const history = state.consoleHistory.map(entry => entry.input);
    if (history.length === 0) return;

    event.preventDefault();
    if (event.key === 'ArrowUp') historyIndex = Math.min(historyIndex + 1, history.length - 1);
    else historyIndex = Math.max(historyIndex - 1, -1);

    input.value = historyIndex === -1 ? '' : history[historyIndex];
    input.setSelectionRange(input.value.length, input.value.length);
  });
}
