/**
 * Точка входа: маршрутизация, шапка и постепенное открытие разделов.
 *
 * Разделы корпорации спрятаны, пока их не включило соответствующее задание:
 * пункт меню появляется вместе с механикой, а не заранее.
 */
import { QUESTS, questById } from './data/quests.js';
import {
  state, subscribe, playerLevel, levelProgress, solvedCount, totalCount,
  resetProgress, isViewUnlocked, currentQuest, isQuestAvailable,
} from './state.js';
import { renderPath } from './ui/path.js';
import { renderConsole } from './ui/console.js';
import { renderDatabase, renderPanels } from './ui/dbview.js';
import { disposeTask, renderTask } from './ui/task.js';
import { renderLog } from './ui/log.js';
import { renderPlant } from './ui/plant.js';
import { renderView, corporationName, toast } from './ui.js';
import { isFallbackMode } from './runner.js';
import { refreshNotificationDot } from './shell.js';

const VIEW_TITLES = {
  path: 'Путь корпорации',
  task: 'Задание',
  console: 'Консоль корпорации',
  command: 'Командный центр',
  shipyard: 'Верфь',
  warehouse: 'Склад',
  crew: 'Экипаж',
  ship: 'Корабль',
  flight: 'Предстартовая диагностика',
  routes: 'Маршруты',
  expedition: 'Экспедиция',
  market: 'Рынок руды',
  arsenal: 'Арсенал',
  range: 'Полигон',
  battle: 'Боевой вылет',
  audit: 'Ревизия топлива',
  plant: 'Комбинат «Передел»',
  database: 'Бортовая база данных',
  panels: 'Ваши панели',
  log: 'Журнал',
};

const el = id => document.getElementById(id);

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  let [name, param] = raw.split('/');
  if (name === 'myapp') name = 'path';
  return { name: VIEW_TITLES[name] ? name : 'path', param: param ?? null };
}

const navigate = path => {
  location.hash = path;
};

const openQuest = questId => navigate(`#/task/${questId}`);

/* --- Шапка и меню -------------------------------------------------------- */

function renderHud() {
  el('hud-level').textContent = String(playerLevel());
  el('hud-xp-bar').style.width = `${Math.round(levelProgress() * 100)}%`;
  el('hud-credits').textContent = `${state.credits.toLocaleString()} ¢`;
  el('hud-solved').textContent = `${solvedCount()} / ${totalCount()}`;
  el('corp-name').textContent = corporationName();

  const next = currentQuest();
  el('corp-progress').textContent = next
    ? `Задание ${next.order} из ${totalCount()}: ${next.title}`
    : 'Цепочка пройдена';

  refreshNotificationDot();
}

/** Пункты меню появляются по мере открытия разделов. */
function renderNav() {
  let anyUnlocked = false;

  for (const item of document.querySelectorAll('[data-view-item]')) {
    const unlocked = isViewUnlocked(item.dataset.viewItem);
    item.hidden = !unlocked;
    if (unlocked) anyUnlocked = true;
  }

  el('nav-corp').hidden = !anyUnlocked;
}

function showView(name) {
  for (const view of document.querySelectorAll('.view')) {
    view.hidden = view.id !== `view-${name}`;
  }
  for (const link of document.querySelectorAll('[data-route]')) {
    link.classList.toggle('nav__link--active', link.dataset.route === name);
  }
  el('view-title').textContent = VIEW_TITLES[name];
  el('crumb-view').textContent = VIEW_TITLES[name];
}

/* --- Маршрутизация ------------------------------------------------------- */

function render() {
  disposeTask();
  const { name, param } = parseRoute();
  renderNav();
  renderHud();

  // Закрытый раздел не открыть по прямой ссылке
  if (!isViewUnlocked(name)) {
    const quest = QUESTS.find(item => item.unlocks?.view === name);
    const message = {
      console: 'Консоль откроется после первых пройденных тестов',
      plant: 'Комбинат откроется, когда цепочка корпорации будет закрыта целиком',
    }[name] ?? `Раздел откроется, когда задание «${quest?.title ?? ''}» будет закрыто практикой`;

    toast(message);
    navigate('#/path');
    return;
  }

  showView(name);

  if (name === 'path') {
    renderPath({ onOpenQuest: openQuest });
    return;
  }


  if (name === 'plant') {
    renderPlant();
    return;
  }

  if (name === 'console') {
    renderConsole();
    return;
  }

  if (name === 'database') {
    renderDatabase();
    return;
  }

  if (name === 'panels') {
    renderPanels();
    return;
  }

  if (name === 'log') {
    renderLog();
    return;
  }

  if (name === 'task') {
    const quest = param ? questById(param) : currentQuest();
    if (!quest) {
      el('task-root').innerHTML = '<p class="empty-state">Все задания решены.</p>';
      return;
    }

    if (!isQuestAvailable(quest.id)) {
      el('task-root').innerHTML =
        '<p class="empty-state">Это задание ещё закрыто. Решите текущее на «Пути корпорации».</p>';
      return;
    }

    el('view-title').textContent = quest.title;
    el('crumb-view').textContent = `Задание ${quest.order} из ${totalCount()}`;
    renderTask(quest, {
      onOpenQuest: openQuest,
      onSolved: outcome => {
        toast(`+${outcome.credits} ¢ · +${outcome.xp} XP`);
        toast(`Осталась практика: вызовите ${outcome.quest.fn} в консоли`);
        renderNav();
      },
    });
    return;
  }

  renderView(name);
}

/* --- Запуск -------------------------------------------------------------- */

window.addEventListener('hashchange', render);
subscribe(() => {
  renderNav();
  renderHud();
});

el('reset-progress').addEventListener('click', () => {
  if (window.confirm('Начать заново? Прогресс, склад и экипаж будут очищены.')) {
    resetProgress();
    navigate('#/path');
    render();
  }
});

if (!location.hash) navigate('#/path');
render();

if (isFallbackMode() || location.protocol === 'file:') {
  el('fallback-banner').hidden = false;
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* офлайн-режим просто не включится */
    });
  });
}
