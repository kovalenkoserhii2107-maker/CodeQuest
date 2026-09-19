/**
 * Графика разделов: небольшие SVG-примитивы без внешних библиотек.
 *
 * Все функции возвращают строку разметки и сами защищаются от чужих данных:
 * числа приходят из кода игрока, поэтому каждое значение проходит через
 * `num()` — NaN, Infinity и строки не должны ломать картинку.
 */
import { escapeHtml } from './html.js';

/** Безопасное число: всё, что не конечное число, становится значением по умолчанию. */
export function num(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Ограничение значения отрезком — чтобы полоса не уехала за пределы. */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Короткая запись числа: 1200 → 1,2k. Длинные подписи ломают вёрстку. */
export function shortNumber(value) {
  const n = num(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return String(Math.round(n * 100) / 100);
}

/**
 * Полоса заполненности: занято из лимита.
 *
 * `tone` решает, что считать плохим. Для запасов («usage») опасен полный
 * трюм, для прогресса («progress») полная полоса — наоборот, цель.
 */
export function fillBar({ value, max, label = '', unit = '', tone = 'usage' } = {}) {
  const limit = Math.max(1, num(max, 1));
  const used = clamp(num(value), 0, limit);
  const percent = Math.round((used / limit) * 100);
  const level = tone === 'progress'
    ? (percent >= 100 ? 'ok' : percent >= 50 ? 'warn' : 'danger')
    : (percent >= 90 ? 'danger' : percent >= 70 ? 'warn' : 'ok');

  return `
    <div class="chart chart--fill">
      <div class="chart__caption">
        <span>${escapeHtml(label)}</span>
        <b class="mono">${shortNumber(used)} / ${shortNumber(limit)}${unit ? ` ${escapeHtml(unit)}` : ''}</b>
      </div>
      <div class="meter" role="img" aria-label="${percent}%">
        <span class="meter__bar meter__bar--${level}" style="width: ${percent}%"></span>
      </div>
      <p class="chart__note mono">${percent}%</p>
    </div>`;
}

/**
 * Диверг-шкала: значение может быть отрицательным (энергобаланс, прибыль).
 * Ноль посередине, полоса растёт влево или вправо.
 */
export function balanceBar({ value, max, label = '', unit = '' } = {}) {
  const current = num(value);
  const limit = Math.max(1, num(max, Math.abs(current) || 1));
  const share = clamp(Math.abs(current) / limit, 0, 1) * 50;
  const negative = current < 0;

  return `
    <div class="chart chart--balance">
      <div class="chart__caption">
        <span>${escapeHtml(label)}</span>
        <b class="mono ${negative ? 'is-danger' : 'is-ok'}">${current > 0 ? '+' : ''}${shortNumber(current)}${unit ? ` ${escapeHtml(unit)}` : ''}</b>
      </div>
      <div class="balance" role="img" aria-label="${current}">
        <span class="balance__zero"></span>
        <span class="balance__bar ${negative ? 'is-negative' : 'is-positive'}"
              style="${negative ? `right: 50%; width: ${share}%` : `left: 50%; width: ${share}%`}"></span>
      </div>
    </div>`;
}

/** Круговая шкала: доля от максимума дугой. */
export function gauge({ value, max, label = '', unit = '', tone = 'usage' } = {}) {
  const limit = Math.max(1, num(max, 100));
  const current = clamp(num(value), 0, limit);
  const share = current / limit;

  // Полукруг радиусом 52 — длина дуги π·r, её и «закрашиваем» штрихом
  const arc = Math.PI * 52;
  const level = tone === 'progress'
    ? (share >= 1 ? 'ok' : share >= 0.5 ? 'warn' : 'danger')
    : (share >= 0.9 ? 'danger' : share >= 0.7 ? 'warn' : 'ok');

  return `
    <div class="chart chart--gauge">
      <svg viewBox="0 0 128 76" class="gauge" role="img" aria-label="${Math.round(share * 100)}%">
        <path class="gauge__track" d="M12 66a52 52 0 0 1 104 0" fill="none" stroke-width="10" stroke-linecap="round"/>
        <path class="gauge__value gauge__value--${level}" d="M12 66a52 52 0 0 1 104 0" fill="none" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="${arc.toFixed(1)}"
              stroke-dashoffset="${(arc * (1 - share)).toFixed(1)}"/>
        <text class="gauge__text" x="64" y="60" text-anchor="middle">${shortNumber(current)}</text>
      </svg>
      <p class="chart__caption chart__caption--center">
        <span>${escapeHtml([label, unit].filter(Boolean).join(', '))}</span>
        <b class="mono">из ${shortNumber(limit)}</b>
      </p>
    </div>`;
}

/**
 * Столбики: список «подпись — значение».
 * Масштаб по наибольшему значению, чтобы разница читалась.
 */
export function barChart({ items = [], unit = '' } = {}) {
  const rows = (Array.isArray(items) ? items : [])
    .slice(0, 12)
    .map(item => (Array.isArray(item)
      ? { label: item[0], value: num(item[1]) }
      : { label: item?.label ?? item?.name ?? '—', value: num(item?.value) }));

  if (rows.length === 0) return '<p class="empty-state">Нет данных для графика.</p>';

  const peak = Math.max(...rows.map(row => Math.abs(row.value)), 1);

  return `
    <div class="chart chart--bars">
      ${rows
        .map(
          row => `
            <div class="bar-row">
              <span class="bar-row__label">${escapeHtml(String(row.label))}</span>
              <span class="bar-row__track">
                <span class="bar-row__bar" style="width: ${clamp((Math.abs(row.value) / peak) * 100, 2, 100)}%"></span>
              </span>
              <b class="bar-row__value mono">${shortNumber(row.value)}${unit ? ` ${escapeHtml(unit)}` : ''}</b>
            </div>`,
        )
        .join('')}
    </div>`;
}

/** Линия по точкам: динамика значения во времени. */
export function sparkline({ points = [], unit = '' } = {}) {
  const values = (Array.isArray(points) ? points : []).map(point => num(point)).slice(-40);
  if (values.length < 2) return '<p class="empty-state">Для линии нужно минимум две точки.</p>';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);

  const path = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(2)} ${(32 - ((value - min) / span) * 28).toFixed(2)}`)
    .join(' ');

  return `
    <div class="chart chart--spark">
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" class="spark" role="img" aria-label="динамика">
        <path class="spark__area" d="${path} L100 36 L0 36 Z"/>
        <path class="spark__line" d="${path}" fill="none" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="chart__caption">
        <span class="mono">мин ${shortNumber(min)}</span>
        <b class="mono">макс ${shortNumber(max)}${unit ? ` ${escapeHtml(unit)}` : ''}</b>
      </div>
    </div>`;
}

/**
 * График по описанию, которое вернул код игрока.
 * Неизвестный тип — не ошибка: просто ничего не рисуем.
 */
export function chartFromSpec(spec = {}) {
  switch (spec.type) {
    case 'gauge': return gauge(spec);
    case 'bar':
    case 'bars': return barChart(spec);
    case 'spark':
    case 'line': return sparkline(spec);
    case 'fill': return fillBar(spec);
    case 'balance': return balanceBar(spec);
    default: return '';
  }
}
