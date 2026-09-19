/**
 * Воркер, в котором выполняется код игрока. Отдельный поток нужен затем,
 * чтобы зависшее решение можно было прервать, не «уронив» вкладку.
 *
 * Понимает два вида сообщений:
 *   { kind: 'tests' }   — прогнать решение против тестов задачи;
 *   { kind: 'widgets' } — посчитать показания приборов Мостика.
 */
import { runQuestTests, runPlayerCode } from './runner-core.js';

self.addEventListener('message', async event => {
  const { id, kind = 'tests' } = event.data;
  try {
    if (kind === 'widgets') {
      const { jobs } = event.data;
      const results = [];
      for (const job of jobs) {
        const outcome = await runPlayerCode(job.source, job.fn, job.expr);
        results.push({ id: job.id, ...outcome });
      }
      self.postMessage({ id, results });
      return;
    }

    const { source, quest } = event.data;
    const report = await runQuestTests(source, quest);
    self.postMessage({ id, report });
  } catch (error) {
    self.postMessage({
      id,
      report: { ok: false, results: [], logs: [], error: `Сбой запуска: ${error.message}` },
      results: [],
    });
  }
});
