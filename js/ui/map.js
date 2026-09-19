/**
 * Карта корпорации: маршрут из станций, по которому идёт сюжет.
 *
 * Одна станция — одно задание. Пройденные горят, текущая пульсирует,
 * будущие затемнены: по карте сразу видно, где вы сейчас и что впереди.
 */
import { isSolved, isPracticed, isQuestClosed, currentQuest, questChain } from '../state.js';
import { escapeHtml } from './html.js';

const WIDTH = 1000;
const HEIGHT = 300;

/**
 * Положение станций: маршрут идёт слева направо и волнами по вертикали,
 * чтобы линия читалась как путь, а не как шкала.
 */
function stationPoints(count) {
  if (count === 1) return [{ x: WIDTH / 2, y: HEIGHT / 2 }];

  const left = 80;
  const step = (WIDTH - left * 2) / (count - 1);

  return Array.from({ length: count }, (_, index) => ({
    x: left + step * index,
    y: HEIGHT / 2 + Math.sin(index * 0.95) * 72,
  }));
}

/** Плавная линия через точки: сегменты сводим квадратичными кривыми. */
function routePath(points) {
  if (points.length < 2) return '';

  let path = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const point = points[i];
    const midX = (previous.x + point.x) / 2;
    path += ` Q${midX.toFixed(1)} ${previous.y.toFixed(1)} ${midX.toFixed(1)} ${((previous.y + point.y) / 2).toFixed(1)}`;
    path += ` Q${midX.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }
  return path;
}

/** Звёзды фона: детерминированные, чтобы карта не мерцала при перерисовке. */
function starField(count = 60) {
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return Array.from({ length: count }, () => {
    const x = (random() * WIDTH).toFixed(1);
    const y = (random() * HEIGHT).toFixed(1);
    const r = (0.6 + random() * 1.4).toFixed(2);
    return `<circle class="map__star" cx="${x}" cy="${y}" r="${r}" opacity="${(0.25 + random() * 0.5).toFixed(2)}"/>`;
  }).join('');
}

/** Разметка карты. Возвращает строку — вставляет её раздел «Путь». */
export function mapMarkup() {
  const chain = questChain();
  const current = currentQuest();
  const points = stationPoints(chain.length);

  // Пройденный отрезок маршрута рисуем поверх общего — он светится
  const doneCount = chain.filter(quest => isQuestClosed(quest.id)).length;
  const donePoints = points.slice(0, Math.max(doneCount, 1));

  const stations = chain
    .map((quest, index) => {
      const point = points[index];
      const done = isQuestClosed(quest.id);
      const active = current?.id === quest.id;
      const testsOnly = isSolved(quest.id) && !isPracticed(quest.id);
      const state = done ? 'done' : active ? 'active' : 'locked';
      const label = done || active ? quest.unlocks?.label ?? quest.title : '???';

      return `
        <g class="map__station is-${state}" data-quest="${escapeHtml(quest.id)}"
           tabindex="${done || active ? '0' : '-1'}" role="button"
           aria-label="${escapeHtml(done || active ? quest.title : 'Станция закрыта')}"
           transform="translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})">
          ${active ? '<circle class="map__pulse" r="26"/>' : ''}
          <circle class="map__halo" r="20"/>
          <circle class="map__dot" r="12"/>
          <text class="map__index" y="4" text-anchor="middle">${done ? '✓' : quest.order}</text>
          <text class="map__label" y="38" text-anchor="middle">${escapeHtml(label)}</text>
          ${testsOnly ? '<text class="map__flag" y="-28" text-anchor="middle">практика</text>' : ''}
        </g>`;
    })
    .join('');

  return `
    <div class="map">
      <div class="map__scroll">
      <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="map__svg" role="img" aria-label="Карта корпорации">
        <defs>
          <linearGradient id="map-route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="var(--color-accent)"/>
            <stop offset="100%" stop-color="var(--color-violet)"/>
          </linearGradient>
        </defs>
        ${starField()}
        <path class="map__route" d="${routePath(points)}" fill="none"/>
        ${donePoints.length > 1 ? `<path class="map__route map__route--done" d="${routePath(donePoints)}" fill="none"/>` : ''}
        ${stations}
      </svg>
      </div>
      <p class="map__legend mono">
        <span class="map__key is-done"></span> пройдено
        <span class="map__key is-active"></span> текущая станция
        <span class="map__key is-locked"></span> впереди
      </p>
    </div>`;
}

/** Повесить обработчики на станции: клик открывает задание. */
export function bindMap(host, onOpenQuest) {
  for (const station of host.querySelectorAll('.map__station:not(.is-locked)')) {
    const open = () => onOpenQuest(station.dataset.quest);
    station.addEventListener('click', open);
    station.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  }
}
