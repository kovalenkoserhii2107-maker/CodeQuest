/**
 * Схема корабля: модули со склада зажигают свои слоты.
 *
 * Чертёж один и тот же, меняется только подсветка — так видно,
 * чего кораблю не хватает, ещё до предстартовой диагностики.
 */
import { escapeHtml } from './html.js';

/**
 * Слоты чертежа. Координаты — в системе viewBox 540×250:
 * три слота стоят на корпусе, щит вынесен над ним.
 */
const SLOTS = [
  { type: 'engine', label: 'Двигатель', x: 150, y: 150 },
  { type: 'reactor', label: 'Реактор', x: 262, y: 150 },
  { type: 'drill', label: 'Бур', x: 378, y: 150 },
  { type: 'shield', label: 'Щит', x: 262, y: 44 },
];

/**
 * Чертёж корабля по списку модулей.
 * @param {Array<{type?: string, name?: string}>} modules модули на борту
 * @param {{name?: string, ready?: boolean|null}} options подпись и статус
 */
export function shipSchematic(modules = [], { name = 'Корабль', ready = null } = {}) {
  const list = Array.isArray(modules) ? modules : [];

  // Считаем модули по типам: слот может быть занят несколькими одинаковыми
  const byType = new Map();
  for (const module of list) {
    const type = String(module?.type ?? 'прочее');
    byType.set(type, (byType.get(type) ?? 0) + 1);
  }

  const extra = [...byType.entries()].filter(([type]) => !SLOTS.some(slot => slot.type === type));

  const slots = SLOTS.map(slot => {
    const count = byType.get(slot.type) ?? 0;
    const filled = count > 0;
    return `
      <g class="ship__slot ${filled ? 'is-filled' : 'is-empty'}" transform="translate(${slot.x} ${slot.y})">
        <circle class="ship__slot-ring" r="26"/>
        <circle class="ship__slot-core" r="14"/>
        ${count > 1 ? `<text class="ship__slot-count" x="20" y="-16" text-anchor="middle">×${count}</text>` : ''}
        <text class="ship__slot-label" y="46" text-anchor="middle">${escapeHtml(slot.label)}</text>
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
          ? `<p class="ship-scheme__extra mono">Вне схемы: ${escapeHtml(extra.map(([type, count]) => `${type} ×${count}`).join(', '))}</p>`
          : ''
      }
    </div>`;
}
