/**
 * Чертёж корабля: ортогональная проекция сбоку, как на настоящем
 * конструкторском листе.
 *
 * Корпус рисуется всегда, а модули — это узлы на нём: установленный узел
 * вычерчен линией и объёмом, отсутствующий остаётся призраком из штриховой
 * линии. Так видно, чего кораблю не хватает, ещё до диагностики.
 *
 * Система координат — viewBox 960×380, ось корабля на y = 200, нос справа.
 */
import { escapeHtml } from './html.js';

/** «3 модуля», а не «3 модулей»: подпись читает человек. */
function modulesWord(count) {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return 'модулей';
  const last = count % 10;
  if (last === 1) return 'модуль';
  if (last >= 2 && last <= 4) return 'модуля';
  return 'модулей';
}

/** Слоты чертежа: тип модуля, подпись и то, как к ней ведёт выноска. */
export const SLOTS = [
  { type: 'engine', label: 'Двигатель', lead: { x: 96, y: 262, to: 356, text: 'start' } },
  { type: 'reactor', label: 'Реактор', lead: { x: 392, y: 118, to: 74, text: 'start' } },
  { type: 'shield', label: 'Щит', lead: { x: 226, y: 272, to: 318, text: 'start' } },
  { type: 'drill', label: 'Бур', lead: { x: 596, y: 288, to: 356, text: 'start' } },
  { type: 'weapon', label: 'Орудие', lead: { x: 560, y: 110, to: 48, text: 'start' } },
];

/* --- Узлы корабля --------------------------------------------------------- */

/*
 * Каждый узел — отдельная функция: так его можно перерисовать, не трогая
 * соседей. Классы у деталей общие, а вид переключает состояние группы,
 * поэтому пустой слот не требует второго набора фигур.
 */

/** Маршевый двигатель: колокол сопла, рубашка охлаждения и турбонасос. */
function engineShape() {
  // Рубашка — семь линий, равномерно разложенных между верхней и нижней
  // кромкой колокола: та же кривая, сдвинутая по вертикали пропорционально.
  const jacket = [];
  for (let i = 1; i <= 7; i += 1) {
    const t = i / 8;
    jacket.push(
      `<path class="bp__hair" d="M150 ${174 + t * 52} C 120 ${176 + t * 48} 90 ${150 + t * 100} 60 ${124 + t * 152}"/>`,
    );
  }

  return `
    <path class="bp__part" d="M150 174 C 120 176 90 150 60 124 L60 276 C 90 250 120 224 150 226 Z"/>
    ${jacket.join('')}
    <path class="bp__hair" d="M150 174 L150 226"/>
    <rect class="bp__part" x="152" y="182" width="26" height="36" rx="4"/>
    <circle class="bp__hair" cx="192" cy="164" r="13"/>
    <circle class="bp__hair" cx="192" cy="236" r="13"/>
    <path class="bp__hair" d="M179 164 H165 M179 236 H165"/>
    <path class="bp__hair" d="M60 124 L46 118 M60 276 L46 282"/>`;
}

/** Реактор: активная зона в корпусе и панели радиаторов сверху и снизу. */
function reactorShape() {
  const fins = [];
  for (let x = 330; x <= 452; x += 12) {
    fins.push(`<path class="bp__hair" d="M${x} 108 L${x + 8} 140 M${x} 292 L${x + 8} 260"/>`);
  }

  return `
    <path class="bp__part" d="M324 140 L336 106 L460 106 L456 140 Z"/>
    <path class="bp__part" d="M324 260 L336 294 L460 294 L456 260 Z"/>
    ${fins.join('')}
    <circle class="bp__part" cx="392" cy="200" r="22"/>
    <circle class="bp__hair" cx="392" cy="200" r="13"/>
    <circle class="bp__hair" cx="392" cy="200" r="5"/>
    <path class="bp__hair" d="M392 178 V148 M392 222 V252 M370 200 H344 M414 200 H440"/>`;
}

/** Щит: два эмиттера на корпусе и дуги поля вокруг него. */
function shieldShape() {
  return `
    <path class="bp__part" d="M200 148 a26 22 0 0 1 52 0 Z"/>
    <path class="bp__part" d="M200 252 a26 22 0 0 0 52 0 Z"/>
    <path class="bp__hair" d="M214 134 V126 M238 134 V126 M214 266 V274 M238 266 V274"/>
    <path class="bp__field" d="M166 124 Q 226 92 286 124"/>
    <path class="bp__field" d="M166 276 Q 226 308 286 276"/>`;
}

/** Бур: сложенная стрела вдоль борта и шнек с коронкой. */
function drillShape() {
  // Витки шнека идут по стреле, слегка разворачиваясь вместе с ней
  const flights = [];
  for (let i = 0; i < 5; i += 1) {
    const x = 644 + i * 14;
    const y = 300 + i * 5;
    flights.push(`<path class="bp__hair" d="M${x} ${y} q 7 -8 14 5"/>`);
  }

  return `
    <rect class="bp__part" x="520" y="252" width="34" height="18" rx="3"/>
    <path class="bp__part" d="M540 262 L638 296 L630 312 L532 278 Z"/>
    <path class="bp__part" d="M638 292 L700 314 L694 330 L632 310 Z"/>
    <path class="bp__part" d="M700 314 L726 322 L714 340 L694 330 Z"/>
    ${flights.join('')}
    <circle class="bp__hair" cx="540" cy="262" r="7"/>
    <path class="bp__hair" d="M560 272 L556 282 M584 281 L580 291 M608 290 L604 300"/>`;
}

/** Орудие: рельса на пилонах с дульным тормозом. */
function weaponShape() {
  return `
    <path class="bp__part" d="M496 110 H620 L634 120 L620 130 H496 Z"/>
    <rect class="bp__part" x="620" y="112" width="26" height="16" rx="3"/>
    <path class="bp__hair" d="M626 112 V128 M634 112 V128 M640 112 V128"/>
    <path class="bp__part" d="M512 130 L520 148 H504 Z"/>
    <path class="bp__part" d="M600 130 L608 148 H592 Z"/>
    <path class="bp__hair" d="M496 120 H620"/>`;
}

const SHAPES = {
  engine: engineShape,
  reactor: reactorShape,
  shield: shieldShape,
  drill: drillShape,
  weapon: weaponShape,
};

/* --- Лист чертежа --------------------------------------------------------- */

// Чертёж рисуется в нескольких разделах сразу, поэтому id заливок должны
// различаться: одинаковые id в одном документе перебивают друг друга.
let schematicCount = 0;

/** Рёбра жёсткости корпуса: тонкие линии через равные промежутки. */
function hullRibs() {
  const ribs = [];
  for (let x = 220; x <= 660; x += 44) {
    ribs.push(`<path class="bp__rib" d="M${x} 148 V252"/>`);
  }
  return ribs.join('');
}

/** Номера шпангоутов — внутри корпуса, у самой оси, как на настоящем листе. */
function stations() {
  return [240, 320, 560, 740]
    .map((x, index) => `
      <path class="bp__tick" d="M${x} 194 V206"/>
      <text class="bp__station" x="${x}" y="222" text-anchor="middle">СТ-${index + 1}</text>`)
    .join('');
}

/**
 * Чертёж корабля по списку модулей.
 * @param {Array<{type?: string, name?: string}>} modules модули на борту
 * @param {{name?: string, ready?: boolean|null, mass?: number|null}} options подпись, статус и масса
 */
export function shipSchematic(modules = [], { name = 'Корабль', ready = null, mass = null } = {}) {
  const list = Array.isArray(modules) ? modules : [];
  const uid = `ship${schematicCount += 1}`;

  // Считаем модули по типам: слот может быть занят несколькими одинаковыми.
  // Заодно запоминаем первый модуль типа — его имя пойдёт в выноску.
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
    const { x, y, to, text } = slot.lead;
    const title = filled ? String(found.module?.name ?? slot.label) : slot.label;

    return `
      <g class="ship__slot ship__slot--${slot.type} ${filled ? 'is-filled' : 'is-empty'}">
        ${SHAPES[slot.type]()}

        <path class="bp__lead" d="M${x} ${y} V${to} H${x + 18}"/>
        <circle class="bp__lead-dot" cx="${x}" cy="${y}" r="2.5"/>
        <text class="bp__label" x="${x + 24}" y="${to + 4}" text-anchor="${text}">
          ${escapeHtml(title)}${count > 1 ? ` ×${count}` : ''}
        </text>
        ${
          filled
            ? ''
            : `<text class="bp__miss" x="${x + 24}" y="${to + 20}" text-anchor="${text}">нет на борту</text>`
        }
      </g>`;
  }).join('');

  const status = ready === null
    ? ''
    : `<span class="badge ${ready ? 'badge--ok' : 'badge--danger'}">${ready ? 'готов к вылету' : 'вылет запрещён'}</span>`;

  const massRow = Number.isFinite(Number(mass)) && Number(mass) > 0
    ? `<text class="bp__title-key" x="754" y="352">МАССА</text>
       <text class="bp__title-val" x="936" y="352" text-anchor="end">${Math.round(Number(mass))} т</text>`
    : '';

  return `
    <div class="ship-scheme">
      <div class="ship-scheme__head">
        <h3 class="panel__title">Чертёж «${escapeHtml(String(name))}»</h3>
        ${status}
      </div>
      <div class="ship-scheme__sheet">
      <svg viewBox="0 0 960 380" class="ship blueprint" role="img"
           aria-label="Чертёж корабля: ${list.length} ${modulesWord(list.length)} на борту">
        <defs>
          <linearGradient id="${uid}-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(var(--ink), 0.03)"/>
            <stop offset="20%" stop-color="rgba(var(--ink), 0.13)"/>
            <stop offset="36%" stop-color="rgba(var(--ink), 0.20)"/>
            <stop offset="60%" stop-color="rgba(var(--ink), 0.08)"/>
            <stop offset="100%" stop-color="rgba(var(--ink), 0.02)"/>
          </linearGradient>
          <pattern id="${uid}-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path class="bp__grid" d="M24 0 V24 M0 24 H24"/>
          </pattern>
          <clipPath id="${uid}-hull">
            <path d="M170 148 H690 C 760 150 800 170 820 200 C 800 230 760 250 690 252 H170 Z"/>
          </clipPath>
        </defs>

        <rect class="bp__sheet" x="8" y="8" width="944" height="364" rx="6" fill="url(#${uid}-grid)"/>

        <path class="bp__axis" d="M30 200 H930"/>

        <g clip-path="url(#${uid}-hull)">
          <rect x="140" y="140" width="700" height="120" fill="url(#${uid}-body)"/>
          <path class="bp__gloss" d="M170 170 H800"/>
          ${hullRibs()}
        </g>

        <path class="bp__hull" d="M170 148 H690 C 760 150 800 170 820 200 C 800 230 760 250 690 252 H170 Z"/>
        <path class="bp__hair" d="M690 148 V252 M300 148 V252 M470 148 V252 M650 148 V252"/>
        <path class="bp__hair" d="M700 168 h60 M700 232 h60"/>

        ${slots}
        ${stations()}

        <g class="bp__title">
          <path class="bp__title-box" d="M744 300 H936 V366 H744 Z M744 322 H936"/>
          <text class="bp__title-key" x="754" y="316">КОРАБЛЬ</text>
          <text class="bp__title-val" x="936" y="316" text-anchor="end">${escapeHtml(String(name))}</text>
          <text class="bp__title-key" x="754" y="338">МОДУЛЕЙ</text>
          <text class="bp__title-val" x="936" y="338" text-anchor="end">${list.length}</text>
          ${massRow}
        </g>

        <text class="ship__caption" x="30" y="40">${list.length} ${modulesWord(list.length)} на борту</text>
      </svg>
      </div>
      ${
        extra.length
          ? `<p class="ship-scheme__extra mono">Вне схемы: ${escapeHtml(extra.map(([type, found]) => `${type} ×${found.count}`).join(', '))}</p>`
          : ''
      }
    </div>`;
}
