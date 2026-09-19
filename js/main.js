/**
 * Точка входа тренажёра: маршрутизация по хэшу, шапка с показателями,
 * подключение экранов и регистрация service worker.
 */
import { questById } from './data/quests.js';
import {
  state,
  subscribe,
  shipPower,
  playerLevel,
  levelProgress,
  solvedCount,
  totalCount,
  resetProgress,
  isSolved,
} from './state.js';
import { renderMap, selectSector } from './ui/map.js';
import { renderBridge } from './ui/bridge.js';
import { renderShip } from './ui/ship.js';
import { renderTask } from './ui/task.js';
import { renderLog } from './ui/log.js';
import { isFallbackMode } from './runner.js';
import { refreshNotificationDot } from './shell.js';

const VIEW_TITLES = {
  map: 'Карта секторов',
  bridge: 'Мостик',
  ship: 'Корабль «Квест»',
  task: 'Задача',
  log: 'Бортовой журнал',
  dashboard: 'Центр управления',
};

const el = id => document.getElementById(id);

/* --- Маршрутизация ------------------------------------------------------ */

/** Разбор адреса вида #/task/total-mass. */
function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, param] = raw.split('/');
  return { name: VIEW_TITLES[name] ? name : 'map', param: param ?? null };
}

function navigate(path) {
  location.hash = path;
}

function openQuest(questId) {
  navigate(`#/task/${questId}`);
}

/* --- Шапка -------------------------------------------------------------- */

function renderHud() {
  el('hud-level').textContent = String(playerLevel());
  el('hud-xp-bar').style.width = `${Math.round(levelProgress() * 100)}%`;
  el('hud-credits').textContent = `${state.credits} ¢`;
  el('hud-solved').textContent = `${solvedCount()} / ${totalCount()}`;
  el('ship-power').textContent = String(shipPower());
  refreshNotificationDot();
}

/** Всплывающее сообщение о награде. */
function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.append(node);
  setTimeout(() => node.remove(), 4000);
}

/* --- Экраны ------------------------------------------------------------- */

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

function render() {
  const { name, param } = parseRoute();
  showView(name);
  renderHud();

  // Разблокировка меню Центра управления
  const dashboardNav = el('nav-dashboard-item');
  if (dashboardNav) {
    dashboardNav.hidden = !isSolved('create-base');
  }

  if (name === 'map') {
    renderMap({ onOpenQuest: openQuest });
    return;
  }

  if (name === 'bridge') {
    renderBridge({ onOpenQuest: openQuest });
    return;
  }

  if (name === 'ship') {
    renderShip({ onOpenQuest: openQuest });
    return;
  }

  if (name === 'log') {
    renderLog();
    return;
  }

  if (name === 'task') {
    const quest = param ? questById(param) : null;
    if (!quest) {
      el('task-root').innerHTML =
        '<p class="empty-state">Задача не выбрана. Откройте карту секторов и выберите задачу.</p>';
      return;
    }
    el('view-title').textContent = quest.title;
    el('crumb-view').textContent = `Задача · ${quest.title}`;
    selectSector(quest.sector);
    renderTask(quest, {
      onOpenQuest: openQuest,
      onSolved: outcome => {
        toast(`+${outcome.credits} ¢ · +${outcome.xp} XP`);
        outcome.unlockedSectors.forEach(sector => toast(`Открыт сектор «${sector.name}»`));
      },
    });
  }
}

/* --- Запуск ------------------------------------------------------------- */

window.addEventListener('hashchange', render);
subscribe(renderHud);

el('reset-progress').addEventListener('click', () => {
  if (window.confirm('Сбросить весь прогресс и начать заново?')) {
    resetProgress();
    navigate('#/map');
    render();
  }
});

if (!location.hash) navigate('#/map');
render();

// Предупреждение о запуске без сервера: без него нет ни воркера, ни офлайна.
if (isFallbackMode() || location.protocol === 'file:') {
  el('fallback-banner').hidden = false;
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* офлайн-режим просто не включится — игра работает и без него */
    });
  });
}
