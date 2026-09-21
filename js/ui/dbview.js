/**
 * Разделы «База данных» и «Панели».
 *
 * База показывает коллекции и записи, которые игрок положил своими вызовами.
 * Панели — функции игрока: они запускаются заново при каждой отрисовке и
 * возвращают описание того, что показать.
 */
import { db, panels, removePanel, appSource } from '../state.js';
import { QUESTS } from '../data/quests.js';
import { runConsole } from '../runner.js';
import { escapeHtml, showValue } from './html.js';
import { chartFromSpec, barChart } from './charts.js';

let openCollection = null;

/** Код игрока: панели пишутся поверх уже решённых заданий. */
function playerSource() {
  return appSource();
}

/* --- База данных ---------------------------------------------------------- */

function recordsTable(name) {
  const records = db.all(name);
  if (records.length === 0) {
    return `<p class="empty-state">Коллекция пуста. Добавьте запись из консоли: <code class="mono">db.insert("${escapeHtml(name)}", { … })</code></p>`;
  }

  // Колонки собираем по всем записям: у разных записей могут быть разные поля
  const columns = [...new Set(records.flatMap(record => Object.keys(record)))].filter(key => key !== 'savedAt');

  // Последняя запись подсвечивается: видно, что именно добавил ваш вызов
  const lastId = records[records.length - 1]?.id;

  return `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
        <tbody>
          ${records
            .map(
              record => `<tr class="${record.id === lastId ? 'is-fresh' : ''}">${columns
                .map(column => `<td class="${column === 'id' ? 'table__num' : ''}">${escapeHtml(showValue(record[column]))}</td>`)
                .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

export function renderDatabase() {
  const list = document.getElementById('db-collections');
  const content = document.getElementById('db-content');
  if (!list || !content) return;

  const collections = db.collections();
  const filled = collections.filter(item => item.count > 0);
  if (!openCollection || !collections.some(item => item.name === openCollection)) {
    openCollection = filled[0]?.name ?? collections[0]?.name ?? null;
  }

  list.innerHTML = collections
    .map(
      item => `
        <button class="db-collection${item.name === openCollection ? ' is-active' : ''}" type="button" data-collection="${escapeHtml(item.name)}">
          <span class="db-collection__name mono">${escapeHtml(item.name)}</span>
          <span class="db-collection__count mono">${item.count}</span>
        </button>`,
    )
    .join('');

  content.innerHTML = openCollection
    ? `
      <div class="panel__head">
        <h3 class="panel__title mono">${escapeHtml(openCollection)}</h3>
        <span class="panel__hint">${db.count(openCollection)} записей</span>
      </div>
      ${
        filled.length
          ? barChart({ items: filled.map(item => ({ label: item.name, value: item.count })), unit: 'зап' })
          : ''
      }
      ${recordsTable(openCollection)}`
    : '<p class="empty-state">База пуста.</p>';

  for (const button of list.querySelectorAll('[data-collection]')) {
    button.addEventListener('click', () => {
      openCollection = button.dataset.collection;
      renderDatabase();
    });
  }
}

/* --- Панели игрока -------------------------------------------------------- */

/** Запустить функцию панели на настоящей базе и получить описание. */
async function runPanel(panel) {
  const result = await runConsole(playerSource(), `(${panel.source})(db)`, {
    dbStore: db.snapshot(),
    data: {},
    panels: [],
  });
  return result.error ? { error: result.error } : { spec: result.value };
}

/** Разметка одной панели по описанию, которое вернула функция игрока. */
function panelCard(panel, outcome) {
  if (outcome.error) {
    return `
      <article class="widget is-error" data-panel="${escapeHtml(panel.name)}">
        <header class="widget__head">
          <div>
            <h3 class="widget__title">${escapeHtml(panel.title)}</h3>
            <p class="widget__unit mono">${escapeHtml(panel.name)}</p>
          </div>
          <span class="badge badge--danger">ошибка</span>
        </header>
        <div class="widget__body"><p class="widget__error">${escapeHtml(outcome.error)}</p></div>
      </article>`;
  }

  const spec = outcome.spec ?? {};

  // График рисуется по полю type: gauge, bar, spark, fill, balance.
  // Незнакомый тип — не ошибка: панель просто останется текстовой.
  const chart = spec && typeof spec === 'object' ? chartFromSpec(spec) : '';

  const rows = Array.isArray(spec.rows)
    ? spec.rows
        .map(row => `<div class="widget__row"><span>${escapeHtml(showValue(row[0]))}</span><b class="mono">${escapeHtml(showValue(row[1]))}</b></div>`)
        .join('')
    : '';
  const list = Array.isArray(spec.list)
    ? `<ul class="widget__list">${spec.list.map(item => `<li>${escapeHtml(showValue(item))}</li>`).join('')}</ul>`
    : '';

  return `
    <article class="widget is-live" data-panel="${escapeHtml(panel.name)}">
      <header class="widget__head">
        <div>
          <h3 class="widget__title">${escapeHtml(showValue(spec.title ?? panel.title))}</h3>
          <p class="widget__unit mono">${escapeHtml(panel.name)}</p>
        </div>
        <span class="badge badge--ok">ваша панель</span>
      </header>
      <div class="widget__body">
        ${spec.value !== undefined && !chart ? `<p class="widget__value mono">${escapeHtml(showValue(spec.value))} ${spec.unit ? `<small>${escapeHtml(showValue(spec.unit))}</small>` : ''}</p>` : ''}
        ${chart}
        ${rows}
        ${list}
        ${spec.note ? `<p class="widget__note">${escapeHtml(showValue(spec.note))}</p>` : ''}
      </div>
    </article>`;
}

/** Отрисовать все панели игрока в указанный контейнер. */
export async function renderPanelCards(hostId, { withRemove = false } = {}) {
  const host = document.getElementById(hostId);
  if (!host) return;

  const list = panels();
  if (list.length === 0) {
    host.innerHTML = `<p class="empty-state">Панелей пока нет. Напишите функцию и зарегистрируйте её: <code class="mono">dashboard.add("ship", shipPanel)</code></p>`;
    return;
  }

  host.innerHTML = '<p class="empty-state">Запускаем ваши панели…</p>';
  const outcomes = await Promise.all(list.map(panel => runPanel(panel)));

  host.innerHTML = list
    .map((panel, index) => {
      const card = panelCard(panel, outcomes[index]);
      if (!withRemove) return card;
      return card.replace(
        '</article>',
        `<footer class="widget__foot">
           <code class="mono widget__call">dashboard.add("${escapeHtml(panel.name)}", …)</code>
           <button class="btn btn--danger btn--sm" type="button" data-remove="${escapeHtml(panel.name)}">Снять</button>
         </footer></article>`,
      );
    })
    .join('');

  if (withRemove) {
    for (const button of host.querySelectorAll('[data-remove]')) {
      button.addEventListener('click', () => removePanel(button.dataset.remove));
    }
  }
}

export function renderPanels() {
  return renderPanelCards('panels-grid', { withRemove: true });
}
