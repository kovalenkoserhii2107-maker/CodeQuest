/**
 * Состояние игрока и его сохранение. Прогресс лежит в localStorage,
 * поэтому игра переживает перезагрузку и работает офлайн.
 */
import { QUESTS, questById } from './data/quests.js';

const STORAGE_KEY = 'codequest.progress.v2';
const XP_PER_LEVEL = 200;

const listeners = new Set();

/** Состояние по умолчанию — с него начинается новая игра. */
function emptyState() {
  return {
    version: 1,
    credits: 0,
    xp: 0,
    solved: {},     // questId -> { at, withSolution }
    solutions: {},  // questId -> код, прошедший тесты: на нём работает Мостик
    drafts: {},     // questId -> исходный код игрока
    log: [],
    inventory: [],  // купленные на верфи модули
    crew: [],       // нанятый на бирже экипаж
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
    return s;
  } catch {
    // Повреждённое или недоступное хранилище не должно ломать игру.
    return emptyState();
  }
}

export const state = readStorage();

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

/** Задания по порядку цепочки. */
export function questChain() {
  return [...QUESTS].sort((a, b) => a.order - b.order);
}

/** Текущее задание — первое нерешённое в цепочке. */
export function currentQuest() {
  return questChain().find(quest => !isSolved(quest.id)) ?? null;
}

/**
 * Задание доступно, если оно уже решено или стало текущим.
 * Дальше по цепочке заглянуть нельзя: сюжет открывается по одному шагу.
 */
export function isQuestAvailable(questId) {
  if (isSolved(questId)) return true;
  return currentQuest()?.id === questId;
}

/** Раздел интерфейса открыт, если решено задание, которое его включает. */
export function isViewUnlocked(viewId) {
  const quest = QUESTS.find(item => item.unlocks?.view === viewId);
  if (!quest) return true;  // базовые разделы доступны всегда
  return isSolved(quest.id);
}

/** Открытые разделы — для меню и маршрутизации. */
export function unlockedViews() {
  return QUESTS.filter(quest => isSolved(quest.id)).map(quest => quest.unlocks?.view).filter(Boolean);
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

  const unlockedView = quest.unlocks ?? null;
  if (unlockedView) addLog(`Открыт раздел «${unlockedView.label}»`, 'unlock');

  const next = currentQuest();
  if (next) addLog(`Следующее задание: «${next.title}»`, 'info');

  const levelUp = playerLevel() > levelBefore;
  if (levelUp) addLog(`Повышение: уровень пилота ${playerLevel()}`, 'unlock');

  emit();
  return { credits, xp, levelUp, unlockedView, next: currentQuest() };
}

/** Полный сброс прогресса. */
export function resetProgress() {
  Object.assign(state, emptyState());
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

export function addCrewMember(crewMember) {
  if (!state.crew) state.crew = [];
  state.crew.push(crewMember);
  emit();
}
