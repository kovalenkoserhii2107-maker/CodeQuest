/**
 * Картинки модулей.
 *
 * Файл лежит рядом с каталогом верфи, потому что это такие же данные:
 * появится новый модуль — здесь добавится строка. Если картинки для модуля
 * нет, берётся запасная: интерфейс не должен показывать пустое место.
 */

const DIR = 'assets/modules';

/** Картинка конкретного модуля каталога. */
const BY_ID = {
  'mod-reactor-1': `${DIR}/mod-reactor-1.jpg`,
  'mod-engine-1': `${DIR}/mod-engine-1.jpg`,
  'mod-drill-1': `${DIR}/mod-drill-1.jpg`,
  'mod-shield-1': `${DIR}/mod-shield-1.jpg`,
};

/** Картинка по типу — на случай, если у модуля свой id, но знакомое назначение. */
const BY_TYPE = {
  reactor: BY_ID['mod-reactor-1'],
  engine: BY_ID['mod-engine-1'],
  drill: BY_ID['mod-drill-1'],
  shield: BY_ID['mod-shield-1'],
};

export const DEFAULT_ART = `${DIR}/default.jpg`;

/** Все картинки — для офлайн-кэша и проверок сборки. */
export const ALL_ART = [...new Set([...Object.values(BY_ID), DEFAULT_ART])];

/**
 * Путь к картинке модуля: сначала по id, затем по типу, затем запасная.
 * @param {{id?: string, type?: string}} module модуль со склада или из каталога
 */
export function moduleArt(module) {
  if (!module || typeof module !== 'object') return DEFAULT_ART;
  return BY_ID[module.id] ?? BY_TYPE[module.type] ?? DEFAULT_ART;
}
