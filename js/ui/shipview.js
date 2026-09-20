/**
 * Схема корабля: модули со склада зажигают свои слоты.
 *
 * Чертёж один и тот же, меняется только подсветка — так видно,
 * чего кораблю не хватает, ещё до предстартовой диагностики.
 */
import { escapeHtml } from './html.js';
import { moduleArt } from '../data/module-art.js';

/**
 * Слоты чертежа. Координаты — в системе viewBox 540×250:
 * ходовые модули стоят на корпусе, боевые вынесены над ним.
 */
export const SLOTS = [
  { type: 'engine', label: 'Двигатель', x: 132, y: 150 },
  { type: 'reactor', label: 'Реактор', x: 240, y: 150 },
  { type: 'drill', label: 'Бур', x: 348, y: 150 },
  { type: 'shield', label: 'Щит', x: 186, y: 44 },
  { type: 'weapon', label: 'Орудие', x: 294, y: 44 },
];

/**
 * Чертёж корабля по списку модулей.
 * @param {Array<{type?: string, name?: string}>} modules модули на борту
 * @param {{name?: string, ready?: boolean|null}} options подпись и статус
 */
// Чертёж рисуется в нескольких разделах сразу, поэтому id обрезки должны
// различаться: одинаковые id в одном документе перебивают друг друга.
let schematicCount = 0;

export function shipSchematic(modules = [], { name = 'Корабль', ready = null } = {}) {
  const list = Array.isArray(modules) ? modules : [];
  const uid = `ship${schematicCount += 1}`;

  // Считаем модули по типам: слот может быть занят несколькими одинаковыми.
  // Заодно запоминаем первый модуль типа — его картинка ляжет в слот.
  const byType = new Map();
  for (const module of list) {
    const type = String(module?.type ?? 'прочее');
    const seen = byType.get(type);
    if (seen) seen.count += 1;
    else byType.set(type, { count: 1, module });
  }

  const extra = [...byType.entries()].filter(([type]) => !SLOTS.some(slot => slot.type === type));

  const slots = SLOTS.map(slot => {
    const found = byType.get(slot.type);
    const count = found?.count ?? 0;
    const filled = count > 0;
    const clip = `${uid}-${slot.type}`;

    return `
      <g class="ship__slot ${filled ? 'is-filled' : 'is-empty'}" transform="translate(${slot.x} ${slot.y})">
        ${filled ? `<clipPath id="${clip}"><circle r="31"/></clipPath>` : ''}
        <circle class="ship__slot-ring" r="${filled ? 33 : 26}"/>
        ${
          filled
            ? `<image class="ship__slot-art" href="${escapeHtml(moduleArt(found.module))}"
                      x="-31" y="-31" width="62" height="62"
                      preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`
            : '<circle class="ship__slot-core" r="14"/>'
        }
        ${count > 1 ? `<text class="ship__slot-count" x="${filled ? 34 : 26}" y="${filled ? -28 : -22}" text-anchor="middle">×${count}</text>` : ''}
        <text class="ship__slot-label" y="${filled ? 52 : 46}" text-anchor="middle">${escapeHtml(slot.label)}</text>
        ${filled ? '' : '<text class="ship__slot-miss" y="5" text-anchor="middle">?</text>'}
      </g>`;
  }).join('');

  const status = ready === null
    ? ''
    : `<span class="badge ${ready ? 'badge--ok' : 'badge--danger'}">${ready ? 'готов к вылету' : 'вылет запрещён'}</span>`;

  return `
    <div class="ship-scheme">
      <div class="ship-scheme__head">
        <h3 class="panel__title">Чертёж «${escapeHtml(String(name))}»</h3>
        ${status}
      </div>
      <svg viewBox="0 0 540 250" class="ship" role="img" aria-label="Схема корабля">
        <path class="ship__hull" d="M36 150 L116 96 L424 96 L504 150 L424 204 L116 204 Z"/>
        <path class="ship__hull-inner" d="M128 150 L184 114 L396 114 L448 150 L396 186 L184 186 Z"/>
        <path class="ship__thrust" d="M36 150 L4 134 L12 150 L4 166 Z"/>
        ${slots}
        <text class="ship__caption" x="270" y="236" text-anchor="middle">${list.length} модулей на борту</text>
      </svg>
      ${
        extra.length
          ? `<p class="ship-scheme__extra mono">Вне схемы: ${escapeHtml(extra.map(([type, found]) => `${type} ×${found.count}`).join(', '))}</p>`
          : ''
      }
    </div>`;
}
