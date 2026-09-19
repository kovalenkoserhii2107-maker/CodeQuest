/**
 * Мостик — приборная панель корабля. Каждый прибор считается кодом игрока:
 * пока задача не решена, прибор не откалиброван; после решения его показания
 * вычисляет та самая функция, которую игрок написал в редакторе.
 */
import { WIDGETS } from '../data/dashboard.js';
import { questById } from '../data/quests.js';
import { isSolved, solutionOf } from '../state.js';
import { evaluateWidgets } from '../runner.js';
import { escapeHtml } from './html.js';

/** Карточка прибора: заголовок, тело и подпись с вызовом функции. */
function widgetCard(widget, quest, { state: cardState, body }) {
  const badge = {
    live: '<span class="badge badge--ok">считает ваш код</span>',
    pending: '<span class="badge badge--info">считаем…</span>',
    error: '<span class="badge badge--danger">ошибка в коде</span>',
    locked: '<span class="badge badge--idle">не откалиброван</span>',
  }[cardState];

  return `
    <article class="widget is-${cardState}" data-widget="${widget.id}">
      <header class="widget__head">
        <div>
          <h3 class="widget__title">${escapeHtml(widget.title)}</h3>
          <p class="widget__unit">${escapeHtml(widget.unit)}</p>
        </div>
        ${badge}
      </header>
      <div class="widget__body">${body}</div>
      <footer class="widget__foot">
        <code class="mono widget__call">${escapeHtml(widget.call)}</code>
        <button class="btn btn--ghost btn--sm" type="button" data-quest="${widget.questId}">
          ${cardState === 'locked' ? 'Решить задачу' : 'К задаче'}
        </button>
      </footer>
      <p class="widget__source">Задача: ${escapeHtml(quest?.title ?? widget.questId)}</p>
    </article>
  `;
}

function lockedBody(quest) {
  return `<p class="widget__empty">Прибор ждёт вашу функцию <b>${escapeHtml(quest?.fn ?? '')}</b> из задачи «${escapeHtml(quest?.title ?? '')}».</p>`;
}

/**
 * Отрисовать Мостик и пересчитать показания.
 * @param {{onOpenQuest: Function}} handlers
 */
export async function renderBridge({ onOpenQuest }) {
  const grid = document.getElementById('bridge-grid');
  const counter = document.getElementById('bridge-counter');
  if (!grid) return;

  const cards = WIDGETS.map(widget => {
    const quest = questById(widget.questId);
    const source = isSolved(widget.questId) ? solutionOf(widget.questId) : null;
    return { widget, quest, source };
  });

  const ready = cards.filter(card => card.source);
  counter.textContent = `${ready.length} из ${WIDGETS.length} приборов работает`;

  // Сначала рисуем каркас: закрытые приборы сразу, остальные — как «считаем…»
  grid.innerHTML = cards
    .map(({ widget, quest, source }) =>
      source
        ? widgetCard(widget, quest, { state: 'pending', body: '<p class="widget__empty">Считаем на вашем коде…</p>' })
        : widgetCard(widget, quest, { state: 'locked', body: lockedBody(quest) }),
    )
    .join('');

  bindButtons(grid, onOpenQuest);

  if (ready.length === 0) return;

  const results = await evaluateWidgets(
    ready.map(({ widget, quest, source }) => ({
      id: widget.id,
      fn: quest.fn,
      expr: widget.expr,
      source,
    })),
  );

  const byId = new Map(results.map(result => [result.id, result]));

  for (const { widget, quest } of ready) {
    const card = grid.querySelector(`[data-widget="${widget.id}"]`);
    if (!card) continue;

    const result = byId.get(widget.id);
    const failed = !result || result.error;
    const body = failed
      ? `<p class="widget__error">${escapeHtml(result?.error ?? 'Прибор не получил ответа')}</p>
         <p class="widget__note">Код проходит тесты, но на данных корабля споткнулся — хороший повод доработать решение.</p>`
      : safeRender(widget, result.value);

    card.outerHTML = widgetCard(widget, quest, { state: failed ? 'error' : 'live', body });
  }

  bindButtons(grid, onOpenQuest);
}

/** Отрисовка значения не должна ронять весь Мостик. */
function safeRender(widget, value) {
  try {
    return widget.render(value);
  } catch (error) {
    return `<p class="widget__error">Не удалось показать значение: ${escapeHtml(error.message)}</p>`;
  }
}

function bindButtons(grid, onOpenQuest) {
  for (const button of grid.querySelectorAll('[data-quest]')) {
    button.addEventListener('click', () => onOpenQuest(button.dataset.quest));
  }
}
