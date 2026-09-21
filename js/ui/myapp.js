/**
 * Раздел «Моё приложение».
 *
 * Это не копия интерфейса, а его оглавление: какие возможности корпорации
 * уже работают на коде игрока, какая функция за каждую отвечает и что
 * добавит текущее задание. Отсюда же можно перейти к самому коду.
 */
import { stageChain } from '../data/quests.js';
import {
  isSolved, isQuestClosed, currentQuest, activeStageOf, solutionOf, questChain,
} from '../state.js';
import { escapeHtml } from './html.js';
import { fillBar } from './charts.js';

/**
 * Возможности корпорации.
 *
 * Каждая привязана к функции игрока и к разделу, где виден результат.
 * Список идёт по цепочке заданий: сверху то, что появилось раньше.
 */
function features() {
  const seen = new Set();
  const out = [];

  for (const quest of questChain()) {
    if (seen.has(quest.fn)) continue;
    seen.add(quest.fn);

    const stages = stageChain(quest.fn);
    const active = activeStageOf(quest.fn);
    const done = stages.filter(stage => isSolved(stage.id)).length;

    out.push({
      fn: quest.fn,
      title: quest.unlocks?.label ?? quest.title,
      summary: quest.signature ?? '',
      view: quest.unlocks?.view ?? null,
      stages,
      done,
      active,
      openQuest: active?.id ?? quest.id,
      // Возможность работает, когда её функция прошла хотя бы один этап
      works: Boolean(active),
    });
  }

  return out;
}

/** Что даст текущее задание — чтобы связь «задача → приложение» была видна. */
function nextStepHtml() {
  const quest = currentQuest();
  if (!quest) {
    return `
      <div class="panel__head"><h3 class="panel__title">Приложение собрано</h3></div>
      <p class="widget__note">Все возможности из цепочки написаны. Дальше — ваши собственные панели и команды в консоли.</p>`;
  }

  const stages = stageChain(quest.fn);
  const index = stages.findIndex(item => item.id === quest.id);
  const isUpgrade = Boolean(quest.extends);

  return `
    <div class="panel__head">
      <h3 class="panel__title">Сейчас в работе: ${escapeHtml(quest.title)}</h3>
      <span class="panel__hint">${isUpgrade ? `доработка ${escapeHtml(quest.fn)}` : 'новая возможность'}</span>
    </div>
    <p class="widget__note">
      ${
        isUpgrade
          ? `Этап ${index + 1} из ${stages.length}. ${escapeHtml(quest.changes?.todo ?? '')}`
          : escapeHtml(quest.brief.split('\n')[0])
      }
    </p>
    ${
      isUpgrade && quest.changes?.works
        ? `<p class="widget__note">Уже работает: ${escapeHtml(quest.changes.works)}</p>`
        : ''
    }
    <div class="task__actions">
      <a class="btn btn--primary btn--sm" href="#/task/${escapeHtml(quest.id)}">Открыть задание</a>
      ${
        isSolved(quest.id) && !isQuestClosed(quest.id)
          ? '<a class="btn btn--ghost btn--sm" href="#/console">Ввести в строй</a>'
          : ''
      }
    </div>`;
}

export function renderMyApp() {
  const featuresHost = document.getElementById('myapp-features');
  const nextHost = document.getElementById('myapp-next');
  const progress = document.getElementById('myapp-progress');
  if (!featuresHost || !nextHost) return;

  const list = features();
  const working = list.filter(item => item.works).length;

  if (progress) progress.textContent = `${working} из ${list.length} возможностей работают`;

  nextHost.innerHTML = `
    ${fillBar({ value: working, max: list.length, label: 'Написано вами', unit: 'шт', tone: 'progress' })}
    ${nextStepHtml()}`;

  featuresHost.innerHTML = list
    .map(item => {
      const upgraded = item.stages.length > 1;
      const lines = (solutionOf(item.active?.id ?? '') ?? '').split('\n').filter(Boolean).length;

      return `
        <article class="widget${item.works ? ' is-live' : ' is-locked'}">
          <header class="widget__head">
            <div>
              <h3 class="widget__title">${escapeHtml(item.title)}</h3>
              <p class="widget__unit mono">${escapeHtml(item.fn)}</p>
            </div>
            <span class="badge ${item.works ? 'badge--ok' : 'badge--idle'}">
              ${item.works ? 'работает' : 'ещё не написано'}
            </span>
          </header>

          <div class="widget__body">
            <p class="widget__note">${escapeHtml(item.summary)}</p>
            ${
              upgraded
                ? fillBar({
                  value: item.done,
                  max: item.stages.length,
                  label: 'Этапов доработки',
                  unit: 'шт',
                  tone: 'progress',
                })
                : ''
            }
            ${
              item.works
                ? `<div class="widget__row"><span>Ваш код</span><b class="mono">${lines} строк</b></div>`
                : '<p class="widget__note">Появится, когда вы напишете эту функцию.</p>'
            }
          </div>

          <footer class="widget__foot">
            <a class="btn btn--ghost btn--sm" href="#/task/${escapeHtml(item.openQuest)}">Мой код</a>
            ${
              item.works && item.view
                ? `<a class="btn btn--ghost btn--sm" href="#/${escapeHtml(item.view)}">Где работает</a>`
                : ''
            }
          </footer>
        </article>`;
    })
    .join('');
}
