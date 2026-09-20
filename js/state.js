/**
 * Состояние игрока и его сохранение. Прогресс лежит в localStorage,
 * поэтому игра переживает перезагрузку и работает офлайн.
 */
import { QUESTS, questById } from './data/quests.js';
import { Database } from './db.js';

const STORAGE_KEY = 'codequest.progress.v2';
const XP_PER_LEVEL = 200;

const listeners = new Set();

/** Состояние по умолчанию — с него начинается новая игра. */
function emptyState() {
  return {
    version: 1,
    credits: 0,
    xp: 0,
    solved: {},     // questId -> { at, withSolution }: тесты пройдены
    practiced: {},  // questId -> { at }: функция введена в строй через консоль
    db: {},         // бортовая база данных: коллекции записей игрока
    panels: [],     // панели дашборда, написанные игроком
    consoleHistory: [],
    solutions: {},  // questId -> код, прошедший тесты: на нём работает Мостик
    drafts: {},     // questId -> исходный код игрока
    log: [],
    inventory: [],  // купленные на верфи модули
    crew: [],       // нанятый на бирже экипаж
    resources: { fuel: 0, ore: 0 },  // бак и рудный бункер, в тоннах
  };
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const s = { ...emptyState(), ...parsed };
    if (!s.inventory) s.inventory = [];
    if (!s.crew) s.crew = [];
    if (!s.practiced) s.practiced = {};
    if (!s.db) s.db = {};
    if (!s.panels) s.panels = [];
    if (!s.consoleHistory) s.consoleHistory = [];
    if (!s.resources) s.resources = { fuel: 0, ore: 0 };
    return s;
  } catch {
    // Повреждённое или недоступное хранилище не должно ломать игру.
    return emptyState();
  }
}

export const state = readStorage();

/** Бортовая база данных: единственное место, где живут записи корпорации. */
export const db = new Database(state.db, () => emit());

/** Коллекция, в которой лежит запись определённого типа. */
const RECORD_COLLECTIONS = {
  commander: 'commanders',
  plan: 'plans',
  expedition: 'expeditions',
  deal: 'deals',
  arsenal: 'arsenals',
  battle: 'battles',
  shipyard: 'shipyards',
  warehouse: 'warehouses',
  warehouseCapacity: 'warehouses',
  ship: 'ships',
  report: 'reports',
};

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* приватный режим браузера — играем без сохранения */
  }
}

/** Подписка на изменения состояния. Возвращает функцию отписки. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  persist();
  listeners.forEach(listener => listener(state));
}

/* --- Производные значения ---------------------------------------------- */

export function isSolved(questId) {
  return Boolean(state.solved[questId]);
}

/** Практика пройдена: функция вызвана в консоли и результат принят. */
export function isPracticed(questId) {
  return Boolean(state.practiced[questId]);
}

/** Задание закрыто целиком: и тесты, и практика. */
export function isQuestClosed(questId) {
  return isSolved(questId) && isPracticed(questId);
}

/** Задания по порядку цепочки. */
export function questChain() {
  return [...QUESTS].sort((a, b) => a.order - b.order);
}

/** Текущее задание — первое незакрытое в цепочке. */
export function currentQuest() {
  return questChain().find(quest => !isQuestClosed(quest.id)) ?? null;
}

/**
 * Задание доступно, если оно уже решено или стало текущим.
 * Дальше по цепочке заглянуть нельзя: сюжет открывается по одному шагу.
 */
export function isQuestAvailable(questId) {
  if (isSolved(questId)) return true;
  return currentQuest()?.id === questId;
}

/** Консоль открывается, как только пройдены тесты первого задания. */
export function isConsoleUnlocked() {
  return QUESTS.some(quest => isSolved(quest.id));
}

/**
 * Раздел открыт, если задание закрыто целиком: тесты пройдены И функция
 * введена в строй в консоли. Одной теории мало — нужен реальный вызов.
 */
export function isViewUnlocked(viewId) {
  if (viewId === 'console') return isConsoleUnlocked();
  const quest = QUESTS.find(item => item.unlocks?.view === viewId);
  if (!quest) return true;  // базовые разделы доступны всегда
  return isQuestClosed(quest.id);
}

/** Открытые разделы — для меню и маршрутизации. */
export function unlockedViews() {
  return QUESTS.filter(quest => isQuestClosed(quest.id)).map(quest => quest.unlocks?.view).filter(Boolean);
}

/** Уровень пилота по накопленному опыту. */
export function playerLevel() {
  return Math.floor(state.xp / XP_PER_LEVEL) + 1;
}

/** Прогресс до следующего уровня, 0…1 — для полоски опыта. */
export function levelProgress() {
  return (state.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function xpToNextLevel() {
  return XP_PER_LEVEL - (state.xp % XP_PER_LEVEL);
}

export function solvedCount() {
  return Object.keys(state.solved).length;
}

export function totalCount() {
  return QUESTS.length;
}

/* --- Действия ----------------------------------------------------------- */

export function addLog(text, kind = 'info') {
  state.log.unshift({ text, kind, time: new Date().toISOString() });
  state.log = state.log.slice(0, 40);
}

/** Сохранить черновик кода задачи (без уведомления подписчиков). */
export function saveDraft(questId, code) {
  state.drafts[questId] = code;
  persist();
}

export function draftOf(questId) {
  return state.drafts[questId] ?? null;
}

/**
 * Код, которым решена задача. Для прогресса, сохранённого до появления
 * Мостика, откатываемся на черновик — он почти всегда и есть рабочий код.
 */
export function solutionOf(questId) {
  return state.solutions[questId] ?? state.drafts[questId] ?? null;
}

/**
 * Засчитать решённую задачу. Награда за подсмотренное решение — половинная,
 * уровень модуля растёт в любом случае: главное, что материал пройден.
 */
export function completeQuest(questId, { withSolution = false, source = null } = {}) {
  const quest = questById(questId);
  if (!quest) return null;

  if (isSolved(questId)) {
    // Награда не повторяется, но более свежий рабочий код приборам пригодится.
    if (source) {
      state.solutions[questId] = source;
      emit();
    }
    return null;
  }

  const factor = withSolution ? 0.5 : 1;
  const credits = Math.round(quest.reward.credits * factor);
  const xp = Math.round(quest.reward.xp * factor);
  const levelBefore = playerLevel();

  state.solved[questId] = { at: new Date().toISOString(), withSolution };
  if (source) state.solutions[questId] = source;
  state.credits += credits;
  state.xp += xp;

  addLog(`Задача «${quest.title}» решена: +${credits} ¢, +${xp} XP`, 'success');

  addLog(`Осталась практика: вызовите ${quest.fn} в консоли`, 'info');

  const levelUp = playerLevel() > levelBefore;
  if (levelUp) addLog(`Повышение: уровень пилота ${playerLevel()}`, 'unlock');

  emit();
  return { credits, xp, levelUp, quest, next: currentQuest() };
}

/**
 * Практика пройдена: результат вызова записан в базу корпорации,
 * раздел интерфейса открывается именно здесь.
 */
export function markPracticed(questId, { note = '' } = {}) {
  const quest = questById(questId);
  if (!quest || isPracticed(questId)) return null;

  state.practiced[questId] = { at: new Date().toISOString() };
  addLog(note || `Функция ${quest.fn} введена в строй`, 'success');
  if (quest.unlocks) addLog(`Открыт раздел «${quest.unlocks.label}»`, 'unlock');

  const next = currentQuest();
  if (next) addLog(`Следующее задание: «${next.title}»`, 'info');

  emit();
  return { quest, next };
}

/** Записать объект, созданный игроком, в базу корпорации. */
export function setCorpRecord(key, value) {
  const collection = RECORD_COLLECTIONS[key] ?? 'logs';
  const record = key === 'warehouseCapacity' ? { capacity: value } : value;
  db.insert(collection, typeof record === 'object' && record !== null ? record : { value: record });
}

/** Последняя запись нужного типа — то, чем сейчас живёт корпорация. */
export function corpRecord(key) {
  const collection = RECORD_COLLECTIONS[key];
  if (!collection) return null;

  const record = db.last(collection);
  if (!record) return null;
  return key === 'warehouseCapacity' ? record.capacity ?? null : record;
}

/**
 * Применить операции, которые код игрока выполнил над копией базы в воркере.
 * Возвращает короткий отчёт — его показывает консоль.
 */
export function applyDbOps(ops = []) {
  const report = { inserted: 0, updated: 0, removed: 0, panels: 0, errors: [] };

  for (const op of ops) {
    try {
      if (op.type === 'insert') {
        db.insert(op.name, op.record);
        report.inserted += 1;
      } else if (op.type === 'update') {
        if (db.update(op.name, op.id, op.patch)) report.updated += 1;
      } else if (op.type === 'remove') {
        if (db.remove(op.name, op.id)) report.removed += 1;
      } else if (op.type === 'panel.add') {
        addPanel(op);
        report.panels += 1;
      } else if (op.type === 'panel.remove') {
        removePanel(op.name);
        report.panels += 1;
      }
    } catch (error) {
      report.errors.push(error.message);
    }
  }

  if (report.inserted || report.updated || report.removed || report.panels) emit();
  return report;
}

/* --- Панели дашборда, написанные игроком --------------------------------- */

export function panels() {
  return state.panels.map(panel => ({ ...panel }));
}

export function addPanel({ name, source, title }) {
  const existing = state.panels.findIndex(panel => panel.name === name);
  const panel = { name, source, title: title ?? name, at: new Date().toISOString() };

  if (existing === -1) state.panels.push(panel);
  else state.panels[existing] = panel;

  addLog(`Панель «${panel.title}» ${existing === -1 ? 'добавлена на' : 'обновлена на'} дашборде`, 'success');
  emit();
  return panel;
}

export function removePanel(name) {
  const index = state.panels.findIndex(panel => panel.name === name);
  if (index === -1) return false;

  const [removed] = state.panels.splice(index, 1);
  addLog(`Панель «${removed.title}» снята с дашборда`, 'info');
  emit();
  return true;
}

/** История команд консоли — она переживает перезагрузку. */
export function pushConsoleHistory(entry) {
  state.consoleHistory.unshift(entry);
  state.consoleHistory = state.consoleHistory.slice(0, 50);
  persist();
}

/** Полный сброс прогресса. */
export function resetProgress() {
  const fresh = emptyState();

  // Хранилище базы чистим на месте: экземпляр Database держит ссылку на него,
  // и подмена объекта оставила бы базу работать со старыми записями.
  for (const name of Object.keys(state.db)) delete state.db[name];

  Object.assign(state, { ...fresh, db: state.db });
  addLog('Прогресс сброшен, полёт начинается заново', 'info');
  emit();
}

/* --- Действия экономики (Верфь и Экипаж) -------------------------------- */

export function spendCredits(amount) {
  if (amount > 0 && state.credits >= amount) {
    state.credits -= amount;
    emit();
    return true;
  }
  return false;
}

/** Возврат кредитов: нужен, когда покупка сорвалась уже после списания. */
export function refundCredits(amount) {
  if (amount <= 0) return false;
  state.credits += amount;
  emit();
  return true;
}

export function addInventoryItem(item) {
  if (!state.inventory) state.inventory = [];
  state.inventory.push(item);
  emit();
}

/* --- Ресурсы: топливо и руда --------------------------------------------- */

/** Ёмкости хранилищ космопорта, в тоннах. */
export const TANK_CAPACITY = 600;
export const ORE_CAPACITY = 300;

/** Вместимость грузового трюма корабля — сколько руды влезет за рейс. */
export const CARGO_HOLD = 150;

/** Цена тонны топлива на космопорте. */
export const FUEL_PRICE = 40;

const LIMITS = { fuel: TANK_CAPACITY, ore: ORE_CAPACITY };

/** Текущие запасы. Возвращается копия: менять только через действия. */
export function resources() {
  return { ...state.resources };
}

/**
 * Пополнить запас. Сверх ёмкости не принимаем и честно говорим, сколько влезло.
 * @returns {number} сколько тонн реально добавлено
 */
export function addResource(kind, amount) {
  const limit = LIMITS[kind];
  if (!limit || !Number.isFinite(amount) || amount <= 0) return 0;

  const free = limit - state.resources[kind];
  const added = Math.min(free, amount);
  if (added <= 0) return 0;

  state.resources[kind] += added;
  emit();
  return added;
}

/** Списать запас. Если не хватает — не списываем ничего. */
export function spendResource(kind, amount) {
  if (!LIMITS[kind] || !Number.isFinite(amount) || amount <= 0) return false;
  if (state.resources[kind] < amount) return false;

  state.resources[kind] -= amount;
  emit();
  return true;
}

export function addCrewMember(crewMember) {
  if (!state.crew) state.crew = [];
  state.crew.push(crewMember);
  // Экипаж — такие же записи базы: их можно читать из своего кода
  db.insert('crew', {
    memberId: crewMember.id,
    name: crewMember.name,
    role: crewMember.role,
    salary: crewMember.salary,
  });
  emit();
}
