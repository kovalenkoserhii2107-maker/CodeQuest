/**
 * Путь корпорации: цепочка заданий по порядку.
 *
 * Решённые задания открыты для повторного просмотра, текущее выделено,
 * будущие закрыты — сюжет раскрывается по одному шагу.
 */
import { QUESTS } from '../data/quests.js';
import { isSolved, isPracticed, isQuestClosed, currentQuest, questChain } from '../state.js';
import { escapeHtml } from './html.js';

export function renderPath({ onOpenQuest }) {
  const host = document.getElementById('quest-chain');
  if (!host) return;

  const chain = questChain();
  const current = currentQuest();

  host.innerHTML = `
    <ol class="chain">
      ${chain
        .map(quest => {
          const done = isQuestClosed(quest.id);
          const active = current?.id === quest.id;
          const testsOnly = isSolved(quest.id) && !isPracticed(quest.id);
          const state = done ? 'done' : active ? 'active' : 'locked';

          const title = done || active ? escapeHtml(quest.title) : 'Задание закрыто';
          const story = done || active
            ? escapeHtml(quest.story)
            : 'Откроется после предыдущего шага.';
          const meta = done || active
            ? `${escapeHtml(quest.topic)} · ${'★'.repeat(quest.difficulty)}${'☆'.repeat(5 - quest.difficulty)}`
            : '';

          return `
            <li class="chain__item is-${state}">
              <span class="chain__marker mono">${done ? '✓' : quest.order}</span>
              <div class="chain__body">
                <div class="chain__head">
                  <h3 class="chain__title">${title}</h3>
                  <span class="badge ${done ? 'badge--ok' : testsOnly ? 'badge--warn' : active ? 'badge--info' : 'badge--idle'}">
                    ${done ? 'закрыто' : testsOnly ? 'нужна практика' : active ? 'текущее' : 'закрыто'}
                  </span>
                </div>
                <p class="chain__story">${story}</p>
                ${meta ? `<p class="chain__meta mono">${meta}</p>` : ''}
                ${
                  done || active
                    ? `<div class="chain__foot">
                         <span class="chain__unlock">
                           ${testsOnly
                             ? `Практика: <code class="mono">${escapeHtml(quest.practice.example)}</code>`
                             : `Открывает: ${escapeHtml(quest.unlocks.label)}`}
                         </span>
                         ${testsOnly
                           ? '<a class="btn btn--primary btn--sm" href="#/console">В консоль</a>'
                           : `<button class="btn ${active ? 'btn--primary' : 'btn--ghost'} btn--sm" type="button" data-quest="${quest.id}">
                                ${done ? 'Открыть заново' : 'Взяться за задание'}
                              </button>`}
                       </div>`
                    : ''
                }
              </div>
            </li>`;
        })
        .join('')}
    </ol>
    ${
      chain.every(quest => isSolved(quest.id))
        ? '<p class="empty-state">Цепочка пройдена целиком. Следующие задания появятся с новыми механиками.</p>'
        : ''
    }
  `;

  for (const button of host.querySelectorAll('[data-quest]')) {
    button.addEventListener('click', () => onOpenQuest(button.dataset.quest));
  }
}

/** Сколько заданий решено — для подписи в боковой панели. */
export function chainProgress() {
  const done = QUESTS.filter(quest => isQuestClosed(quest.id)).length;
  return { done, total: QUESTS.length };
}
