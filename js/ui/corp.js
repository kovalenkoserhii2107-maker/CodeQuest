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
