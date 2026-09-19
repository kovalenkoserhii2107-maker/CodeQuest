/**
 * Карта секторов: узлы, маршруты между ними и список задач выбранного сектора.
 */
import { SECTORS, ROUTES, questsOfSector } from '../data/quests.js';
import { MODULE_BY_ID } from '../data/modules.js';
import { isSectorUnlocked, isSolved, currentSector } from '../state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let selectedId = null;

const el = id => document.getElementById(id);

function sectorById(id) {
  return SECTORS.find(sector => sector.id === id) ?? null;
}

function createSvg(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

/** Отрисовать маршруты между секторами. */
function drawRoutes() {
  const group = el('starmap-routes');
  group.replaceChildren();

  for (const [fromId, toId] of ROUTES) {
    const from = sectorById(fromId);
    const to = sectorById(toId);
    if (!from || !to) continue;

    const open = isSectorUnlocked(from) && isSectorUnlocked(to);
    group.append(
      createSvg('line', {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        class: open ? 'starmap__route starmap__route--open' : 'starmap__route',
      }),
    );
  }
}

/** Отрисовать узлы секторов. */
function drawNodes(onSelect) {
  const group = el('starmap-nodes');
  group.replaceChildren();

  const here = currentSector();

  for (const sector of SECTORS) {
    const unlocked = isSectorUnlocked(sector);
    const quests = questsOfSector(sector.id);
    const solved = quests.filter(quest => isSolved(quest.id)).length;
    const done = solved === quests.length;

    const node = createSvg('g', {
      class: [
        'starmap__node',
        unlocked ? 'is-unlocked' : 'is-locked',
        done ? 'is-done' : '',
        sector.id === selectedId ? 'is-selected' : '',
      ].filter(Boolean).join(' '),
      tabindex: '0',
      role: 'button',
      'aria-label': `${sector.name}: решено ${solved} из ${quests.length}`,
    });

    if (sector.id === here.id) {
      node.append(createSvg('circle', { cx: sector.x, cy: sector.y, r: 54, fill: 'url(#node-glow)' }));
    }

    node.append(createSvg('circle', { cx: sector.x, cy: sector.y, r: 26, class: 'starmap__disc' }));
    node.append(createSvg('circle', { cx: sector.x, cy: sector.y, r: 34, class: 'starmap__ring' }));

    const icon = createSvg('text', {
      x: sector.x,
      y: sector.y + 6,
      class: 'starmap__icon',
      'text-anchor': 'middle',
    });
    icon.textContent = unlocked ? MODULE_BY_ID[sector.module].icon : '🔒';
    node.append(icon);

    const name = createSvg('text', {
      x: sector.x,
      y: sector.y + 58,
      class: 'starmap__label',
      'text-anchor': 'middle',
    });
    name.textContent = sector.name;
    node.append(name);

    const progress = createSvg('text', {
      x: sector.x,
      y: sector.y + 78,
      class: 'starmap__progress',
      'text-anchor': 'middle',
    });
    progress.textContent = unlocked ? `${solved} / ${quests.length}` : 'закрыт';
    node.append(progress);

    const select = () => {
      selectedId = sector.id;
      onSelect();
    };
    node.addEventListener('click', select);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });

    group.append(node);
  }
}

/** Панель справа: описание сектора и список его задач. */
function drawPanel(onOpenQuest) {
  const sector = sectorById(selectedId) ?? currentSector();
  selectedId = sector.id;

  const unlocked = isSectorUnlocked(sector);
  const quests = questsOfSector(sector.id);
  const solved = quests.filter(quest => isSolved(quest.id)).length;

  el('sector-name').textContent = sector.name;
  el('sector-state').textContent = unlocked ? `решено ${solved} из ${quests.length}` : 'сектор закрыт';
  el('sector-brief').textContent = unlocked
    ? sector.brief
    : `${sector.brief} Чтобы открыть маршрут, решите задачи предыдущего сектора.`;

  const list = el('quest-list');
  list.replaceChildren();

  for (const quest of quests) {
    const done = isSolved(quest.id);
    const item = document.createElement('li');
    item.className = `quest-item${done ? ' is-done' : ''}${unlocked ? '' : ' is-locked'}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quest-item__button';
    button.disabled = !unlocked;
    button.innerHTML = `
      <span class="quest-item__top">
        <span class="quest-item__title">${quest.title}</span>
        <span class="badge ${done ? 'badge--ok' : 'badge--info'}">${done ? 'решено' : 'открыта'}</span>
      </span>
      <span class="quest-item__meta">
        <span>${quest.topic}</span>
        <span class="mono">${'★'.repeat(quest.difficulty)}${'☆'.repeat(5 - quest.difficulty)}</span>
      </span>
      <span class="quest-item__reward mono">+${quest.reward.credits} ¢ · +${quest.reward.xp} XP · ${MODULE_BY_ID[quest.module].name}</span>
    `;
    button.addEventListener('click', () => onOpenQuest(quest.id));

    item.append(button);
    list.append(item);
  }

  if (!quests.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'В этом секторе пока нет задач.';
    list.append(empty);
  }
}

/** Выбрать сектор извне (например, после решения задачи). */
export function selectSector(sectorId) {
  selectedId = sectorId;
}

/** Полная перерисовка карты. */
export function renderMap({ onOpenQuest }) {
  if (!selectedId) selectedId = currentSector().id;
  const rerender = () => renderMap({ onOpenQuest });

  drawRoutes();
  drawNodes(rerender);
  drawPanel(onOpenQuest);
}
