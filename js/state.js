/**
 * Состояние игрока и его сохранение. Прогресс лежит в localStorage,
 * поэтому игра переживает перезагрузку и работает офлайн.
 */
import { QUESTS, SECTORS, questById } from './data/quests.js';
import { MODULES } from './data/modules.js';

const STORAGE_KEY = 'codequest.progress.v1';
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
  };
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return { ...emptyState(), ...parsed };
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

/** Уровень модуля = число решённых задач его ветки. */
export function moduleLevel(moduleId) {
  return QUESTS.filter(quest => quest.module === moduleId && isSolved(quest.id)).length;
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

/** Сектор открыт, если решены все задачи из его requires. */
export function isSectorUnlocked(sector) {
  return sector.requires.every(questId => isSolved(questId));
}

/** Сектор, где сейчас находится корабль: последний открытый по порядку карты. */
export function currentSector() {
  const unlocked = SECTORS.filter(sector => isSectorUnlocked(sector));
  return unlocked[unlocked.length - 1] ?? SECTORS[0];
}

export function solvedCount() {
  return Object.keys(state.solved).length;
}

export function totalCount() {
  return QUESTS.length;
}

/** Суммарная «мощность» корабля — просто приятное число для шапки. */
export function shipPower() {
  return MODULES.reduce((sum, module) => sum + moduleLevel(module.id) * 10, 0);
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

  const unlockedSectors = SECTORS.filter(
    sector => sector.requires.includes(questId) && isSectorUnlocked(sector),
  );
  unlockedSectors.forEach(sector => addLog(`Открыт сектор «${sector.name}»`, 'unlock'));

  const levelUp = playerLevel() > levelBefore;
  if (levelUp) addLog(`Повышение: уровень пилота ${playerLevel()}`, 'unlock');

  emit();
  return { credits, xp, levelUp, unlockedSectors };
}

/** Полный сброс прогресса. */
export function resetProgress() {
  Object.assign(state, emptyState());
  addLog('Прогресс сброшен, полёт начинается заново', 'info');
  emit();
}
