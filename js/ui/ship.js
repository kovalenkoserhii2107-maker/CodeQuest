/**
 * Схема корабля. Уровень каждого модуля берётся из состояния игрока:
 * чем выше уровень, тем ярче светится модуль и тем больше у него деталей.
 */
import { MODULES } from '../data/modules.js';
import { QUESTS } from '../data/quests.js';
import { moduleLevel, isSolved, shipPower } from '../state.js';

/** Разметка корабля. Каждая группа помечена data-module — по нему ставится уровень. */
function shipSvg() {
  return `
    <svg class="ship" viewBox="70 55 500 300" role="img" aria-label="Схема корабля с модулями">
      <defs>
        <linearGradient id="hull-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22304f"></stop>
          <stop offset="100%" stop-color="#0c1322"></stop>
        </linearGradient>
        <radialGradient id="module-glow" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#4de3ff" stop-opacity="0.45"></stop>
          <stop offset="100%" stop-color="#4de3ff" stop-opacity="0"></stop>
        </radialGradient>
      </defs>

      <!-- Щиты: дуга вокруг корпуса -->
      <g class="ship-module" data-module="shields">
        <path class="ship-shield" d="M120 200a200 130 0 0 1 400 0a200 130 0 0 1-400 0"></path>
        <path class="ship-shield ship-shield--inner" d="M160 200a160 100 0 0 1 320 0a160 100 0 0 1-320 0"></path>
      </g>

      <!-- Корпус -->
      <path class="ship-hull" d="M180 170h250l70 30-70 30H180z"></path>
      <path class="ship-hull ship-hull--top" d="M230 150h170l30 20H210z"></path>

      <!-- Навигационный блок: нос -->
      <g class="ship-module" data-module="navigation">
        <circle class="ship-glow" cx="500" cy="200" r="46"></circle>
        <path class="ship-part" d="M430 170l70 30-70 30z"></path>
        <circle class="ship-accent" cx="470" cy="200" r="6"></circle>
      </g>

      <!-- Реактор: кормовые двигатели -->
      <g class="ship-module" data-module="reactor">
        <circle class="ship-glow" cx="176" cy="200" r="52"></circle>
        <rect class="ship-part" x="150" y="172" width="34" height="56" rx="8"></rect>
        <path class="ship-flame" d="M150 186l-46 14l46 14z"></path>
      </g>

      <!-- Грузовой трюм: брюхо -->
      <g class="ship-module" data-module="cargo">
        <circle class="ship-glow" cx="300" cy="248" r="50"></circle>
        <rect class="ship-part" x="252" y="230" width="96" height="36" rx="6"></rect>
        <path class="ship-line" d="M276 230v36M300 230v36M324 230v36"></path>
      </g>

      <!-- Антенна связи -->
      <g class="ship-module" data-module="comms">
        <circle class="ship-glow" cx="360" cy="120" r="44"></circle>
        <path class="ship-line" d="M360 150v-28"></path>
        <path class="ship-part" d="M336 122a24 24 0 0 1 48 0z"></path>
        <circle class="ship-accent" cx="360" cy="104" r="4"></circle>
      </g>

      <!-- Лаборатория: боковой модуль -->
      <g class="ship-module" data-module="lab">
        <circle class="ship-glow" cx="410" cy="268" r="44"></circle>
        <rect class="ship-part" x="384" y="244" width="52" height="44" rx="14"></rect>
        <circle class="ship-accent" cx="410" cy="266" r="8"></circle>
      </g>
    </svg>
  `;
}

/** Отрисовать корабль и список модулей. */
export function renderShip({ onOpenQuest }) {
  const stage = document.getElementById('ship-stage');
  stage.innerHTML = shipSvg();

  for (const module of MODULES) {
    const level = moduleLevel(module.id);
    const group = stage.querySelector(`[data-module="${module.id}"]`);
    if (group) {
      group.classList.add(`is-level-${level}`);
      if (level === module.maxLevel) group.classList.add('is-maxed');
    }
  }

  const list = document.getElementById('module-list');
  list.replaceChildren();

  for (const module of MODULES) {
    const level = moduleLevel(module.id);
    const quests = QUESTS.filter(quest => quest.module === module.id);

    const item = document.createElement('li');
    item.className = `module-item${level === module.maxLevel ? ' is-maxed' : ''}`;
    item.innerHTML = `
      <div class="module-item__head">
        <span class="module-item__icon" aria-hidden="true">${module.icon}</span>
        <span>
          <span class="module-item__name">${module.name}</span>
          <span class="module-item__theme">${module.theme}</span>
        </span>
        <span class="module-item__level mono">${level} / ${module.maxLevel}</span>
      </div>
      <div class="progress"><div class="progress__bar" style="width: ${(level / module.maxLevel) * 100}%"></div></div>
      <p class="module-item__bonus mono">${level > 0 ? module.bonus(level) : 'Модуль не активирован'}</p>
    `;

    const questList = document.createElement('ul');
    questList.className = 'module-item__quests';
    for (const quest of quests) {
      const done = isSolved(quest.id);
      const questItem = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `module-quest${done ? ' is-done' : ''}`;
      button.textContent = `${done ? '✓' : '○'} ${quest.title}`;
      button.addEventListener('click', () => onOpenQuest(quest.id));
      questItem.append(button);
      questList.append(questItem);
    }
    item.append(questList);
    list.append(item);
  }

  const power = document.getElementById('ship-power');
  if (power) power.textContent = String(shipPower());
}
