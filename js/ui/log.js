/** Бортовой журнал: лента событий из состояния игрока. */
import { state } from '../state.js';

const KIND_CLASS = {
  success: '',
  unlock: 'timeline__item--warn',
  info: 'timeline__item--danger',
};

export function renderLog() {
  const list = document.getElementById('log-list');
  list.replaceChildren();

  if (!state.log.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'Журнал пуст. Решите первую задачу — и здесь появится запись.';
    list.append(empty);
    return;
  }

  for (const entry of state.log) {
    const item = document.createElement('li');
    item.className = `timeline__item ${KIND_CLASS[entry.kind] ?? ''}`.trim();

    const time = document.createElement('p');
    time.className = 'timeline__time';
    time.textContent = new Date(entry.time).toLocaleString('ru-RU');

    const text = document.createElement('p');
    text.className = 'timeline__text';
    text.textContent = entry.text;

    item.append(time, text);
    list.append(item);
  }
}
