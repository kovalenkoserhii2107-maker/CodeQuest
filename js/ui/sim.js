/**
 * Мост между кодом игрока и симулятором корпорации.
 *
 * Разделы интерфейса не считают ничего сами: они просят выполнить функцию,
 * которую игрок написал в задании, и показывают её результат. Выполнение
 * идёт в воркере с таймаутом — сломанный код не вешает страницу.
 */
import { questById } from '../data/quests.js';
import { appSource, activeSourceOf, activeStageOf } from '../state.js';
import { evaluateWidgets } from '../runner.js';

/**
 * Выполнить выражение на рабочем коде игрока.
 *
 * Первый аргумент — задание, чья функция нужна разделу. Но в область
 * видимости попадает всё приложение: активные версии всех написанных
 * функций. Поэтому функция может вызвать соседнюю, а доработанная версия
 * подхватывается сама — раздел берёт последний пройденный этап, а не тот
 * этап, на который когда-то сослались.
 *
 * @param {string} questId задание, чья функция нужна
 * @param {string} expr тело функции; внутри доступны все функции игрока
 * @returns {Promise<{value: unknown, error: string|null}>}
 */
export async function runPlayerCode(questId, expr) {
  const quest = questById(questId);
  if (!quest) return { value: null, error: `Неизвестное задание ${questId}` };

  const stage = activeStageOf(quest.fn);
  if (!stage) return { value: null, error: `Сначала решите задание «${quest.title}»` };

  if (!activeSourceOf(quest.fn)) {
    return { value: null, error: 'Код решения не найден — откройте задание и запустите тесты' };
  }

  const [result] = await evaluateWidgets([{ id: questId, fn: quest.fn, expr, source: appSource() }]);
  return result ?? { value: null, error: 'Код не ответил' };
}

/** Единый блок с ошибкой: показываем её, а не молчим. */
export function errorPanel(error) {
  return `
    <div class="report__error">
      <p>${error}</p>
      <p class="widget__note">Раздел работает на вашем коде: поправьте решение — и данные появятся.</p>
    </div>`;
}
