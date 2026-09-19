/**
 * Воркер, в котором выполняется код игрока. Отдельный поток нужен затем,
 * чтобы зависшее решение можно было прервать, не «уронив» вкладку.
 */
import { runQuestTests } from './runner-core.js';

self.addEventListener('message', async event => {
  const { id, source, quest } = event.data;
  try {
    const report = await runQuestTests(source, quest);
    self.postMessage({ id, report });
  } catch (error) {
    self.postMessage({
      id,
      report: { ok: false, results: [], logs: [], error: `Сбой запуска: ${error.message}` },
    });
  }
});
