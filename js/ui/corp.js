/**
 * Общие данные корпорации для разделов интерфейса.
 *
 * Имена, лимиты и состав корабля берутся из базы и со склада — то есть из
 * того, что игрок сам создал своими вызовами. Разделы ничего не считают
 * сами: характеристики корабля тоже приходят из его функции assembleShip.
 */
import { Warehouse } from '../warehouse.js';
import { corpRecord } from '../state.js';
import { runPlayerCode } from './sim.js';

export const commanderName = () => corpRecord('commander')?.name ?? 'Командир';
export const shipyardName = () => corpRecord('shipyard')?.name ?? 'Орион';
export const shipName = () => corpRecord('ship')?.name ?? 'Квест';
export const warehouseCapacity = () => corpRecord('warehouseCapacity') ?? 1000;
export const warehouse = () => new Warehouse(warehouseCapacity());

/**
 * Коэффициент полезного действия корабля.
 *
 * Реакторы вырабатывают энергию, остальные модули её потребляют. Если
 * выработки не хватает, питание делится между всеми потребителями поровну:
 * буры крутятся медленнее, орудия бьют слабее, щит держит хуже.
 *
 * @param {Array<{energy?: number}>} modules модули на борту
 * @returns {number} доля от 0 до 1; единица означает, что энергии вдоволь
 */
export function powerEfficiency(modules = []) {
  const list = Array.isArray(modules) ? modules : [];

  const produced = list.reduce((sum, item) => sum + Math.max(0, Number(item?.energy) || 0), 0);
  const consumed = list.reduce((sum, item) => sum - Math.min(0, Number(item?.energy) || 0), 0);

  if (consumed === 0) return 1;            // потреблять нечему — терять нечего
  return Math.min(1, produced / consumed);
}

/** КПД в процентах — для подписей в интерфейсе. */
export function powerPercent(modules = []) {
  return Math.round(powerEfficiency(modules) * 100);
}

/**
 * Значение с учётом просадки питания. Округляем вниз к целому, но не
 * обнуляем то, что при полном питании работало: совсем мёртвым модуль
 * становится только когда энергии нет вовсе.
 */
export function underPower(value, efficiency) {
  const base = Number(value) || 0;
  if (base <= 0 || efficiency <= 0) return 0;
  return Math.max(1, Math.round(base * efficiency));
}

/** Сколько буров стоит на корабле — от этого зависит добыча. */
export function drillCount() {
  return warehouse().items.filter(item => item.type === 'drill').length;
}

/**
 * Характеристики собранного корабля — их считает функция игрока.
 * @returns {Promise<{value: {name, mass, energy, modules}|null, error: string|null}>}
 */
export function assembledShip() {
  const modules = warehouse().items;
  return runPlayerCode(
    'assemble',
    `const ship = assembleShip(${JSON.stringify(shipName())}, ${JSON.stringify(modules)});\n` +
    `return { name: ship.name, mass: ship.mass, energy: ship.energy, modules: ship.modules };`,
  );
}
