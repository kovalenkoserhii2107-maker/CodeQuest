/**
 * Общая логика шапки для всех страниц: переключатель темы, панель уведомлений
 * и меню пилота. Работает и на страницах корпорации, и в тренажёре — модуль
 * оживляет только те элементы, которые нашёл на странице.
 */
import { state, playerLevel, solvedCount, totalCount } from './state.js';
import { escapeHtml } from './ui/html.js';

const THEME_KEY = 'codequest.theme';
const SEEN_KEY = 'codequest.notifications.seen';

const ICONS = {
  dark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>',
  light: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>',
};

const read = key => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* приватный режим — настройка не сохранится, и это не повод падать */
  }
};

/* --- Тема ---------------------------------------------------------------- */

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme, button) {
  document.documentElement.dataset.theme = theme;
  write(THEME_KEY, theme);
  if (!button) return;
  // На тёмной теме показываем солнце («включить светлую»), на светлой — месяц.
  button.innerHTML = theme === 'light' ? ICONS.light : ICONS.dark;
  button.setAttribute('aria-label', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
  button.setAttribute('aria-pressed', String(theme === 'light'));
}

function setupTheme() {
  const button = document.getElementById('theme-toggle');
  applyTheme(currentTheme(), button);
  button?.addEventListener('click', () => applyTheme(currentTheme() === 'light' ? 'dark' : 'light', button));
}

/* --- Всплывающие панели --------------------------------------------------- */

const popovers = [];

function registerPopover(button, panel, onOpen) {
  if (!button || !panel) return;

  const close = () => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    popovers.forEach(item => item.close());
    onOpen?.();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };

  button.addEventListener('click', event => {
    event.stopPropagation();
    if (panel.hidden) open();
    else close();
  });

  panel.addEventListener('click', event => event.stopPropagation());
  popovers.push({ close });
}

/* --- Уведомления ---------------------------------------------------------- */

function notificationItems() {
  return state.log.map(entry => ({
    time: new Date(entry.time),
    text: entry.text,
    kind: entry.kind,
  }));
}

function renderNotifications() {
  const body = document.getElementById('notifications-body');
  if (!body) return;

  const items = notificationItems();
  if (items.length === 0) {
    body.innerHTML =
      '<p class="popover__empty">Пока пусто. Решите задачу в тренажёре — события появятся здесь.</p>';
    return;
  }

  body.innerHTML = items
    .slice(0, 8)
    .map(
      item => `
        <div class="popover__item popover__item--${escapeHtml(item.kind)}">
          <p class="popover__item-text">${escapeHtml(item.text)}</p>
          <p class="popover__item-time mono">${item.time.toLocaleString('ru-RU')}</p>
        </div>
      `,
    )
    .join('');
}

/** Точка на колокольчике горит, пока есть события новее последнего просмотра. */
function refreshNotificationDot() {
  const dot = document.getElementById('notifications-dot');
  if (!dot) return;
  const seen = read(SEEN_KEY) ?? '';
  const newest = state.log[0]?.time ?? '';
  dot.hidden = !newest || newest <= seen;
}

function markNotificationsSeen() {
  const newest = state.log[0]?.time;
  if (newest) write(SEEN_KEY, newest);
  refreshNotificationDot();
}

/* --- Меню пилота ---------------------------------------------------------- */

function renderAccount() {
  const body = document.getElementById('account-body');
  if (!body) return;

  body.innerHTML = `
    <div class="popover__stats">
      <div><span>Уровень</span><b class="mono">${playerLevel()}</b></div>
      <div><span>Кредиты</span><b class="mono">${state.credits} ¢</b></div>
      <div><span>Задачи</span><b class="mono">${solvedCount()} / ${totalCount()}</b></div>
      <div><span>Опыт</span><b class="mono">${state.xp} XP</b></div>
    </div>
    <nav class="popover__links">
      <a href="index.html#/bridge">Мостик корабля</a>
      <a href="index.html#/map">Карта секторов</a>
      <a href="index.html">Центр управления</a>
      <a href="missions.html">Реестр миссий</a>
    </nav>
  `;
}

/* --- Запуск --------------------------------------------------------------- */

export function setupShell() {
  setupTheme();

  registerPopover(
    document.getElementById('notifications-button'),
    document.getElementById('notifications-popover'),
    () => {
      renderNotifications();
      markNotificationsSeen();
    },
  );

  registerPopover(
    document.getElementById('account-button'),
    document.getElementById('account-popover'),
    renderAccount,
  );

  refreshNotificationDot();

  document.addEventListener('click', () => popovers.forEach(item => item.close()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') popovers.forEach(item => item.close());
  });
}

/** Обновить бейдж уведомлений после изменения прогресса. */
export { refreshNotificationDot };

setupShell();
