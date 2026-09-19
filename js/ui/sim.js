/**
 * Мост между кодом игрока и симулятором корпорации.
 *
 * Разделы интерфейса не считают ничего сами: они просят выполнить функцию,
 * которую игрок написал в задании, и показывают её результат. Выполнение
 * идёт в воркере с таймаутом — сломанный код не вешает страницу.
 */
import { questById } from '../data/quests.js';
import { isSolved, solutionOf } from '../state.js';
import { evaluateWidgets } from '../runner.js';

/**
 * Выполнить выражение на коде игрока из указанного задания.
 * @param {string} questId задание, чьё решение используем
 * @param {string} expr тело функции; внутри доступно объявление задания
 * @returns {Promise<{value: unknown, error: string|null}>}
 */
export async function runPlayerCode(questId, expr) {
  const quest = questById(questId);
  if (!quest) return { value: null, error: `Неизвестное задание ${questId}` };
  if (!isSolved(questId)) return { value: null, error: `Сначала решите задание «${quest.title}»` };

  const source = solutionOf(questId);
  if (!source) return { value: null, error: 'Код решения не найден — откройте задание и запустите тесты' };

  const [result] = await evaluateWidgets([{ id: questId, fn: quest.fn, expr, source }]);
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
