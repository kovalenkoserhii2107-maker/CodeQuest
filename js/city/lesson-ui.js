import { LESSONS } from './lessons.js';
import { escapeHtml } from '../ui/html.js';

export class LessonView {
  #board; #task; #lessons; #selected; #key = ''; #openAPI;
  constructor(board, task, lessons, openAPI = () => {}) {
    this.#openAPI = openAPI; this.#board = board; this.#task = task; this.#lessons = lessons;
    this.#selected = lessons.current()?.id || LESSONS[0].id;
  }
  next(completed) {
    if (this.#selected === completed.id) this.#selected = this.#lessons.current()?.id || completed.id;
    this.render();
  }
  render() {
    const progress = this.#lessons.snapshot(), current = this.#lessons.current();
    const key = this.#selected + '/' + progress.completed.join(',');
    if (key === this.#key) return;
    this.#key = key;
    this.#board.innerHTML = '<h2>Задания мастерской</h2><p class="city-muted">Первые шаги: ' +
      LESSONS.slice(0, 6).filter(task => this.#lessons.isDone(task.id)).length +
      ' / 6 · Всего: ' + progress.completed.length + ' / ' + LESSONS.length +
      '</p><ol class="city-lesson-list">' + LESSONS.map(lesson =>
        '<li><button type="button" data-lesson="' + lesson.id + '" aria-pressed="' + (lesson.id === this.#selected) + '"' +
          (lesson.id === current?.id ? ' aria-current="step"' : '') + '><span>' +
          (this.#lessons.isDone(lesson.id) ? '✓ ' : '') + escapeHtml(lesson.title) + '</span><small>' +
          escapeHtml(lesson.stage) + (lesson.id === current?.id ? ' · текущее' : '') + '</small></button></li>').join('') +
      '</ol><p class="city-muted">Проверяется текущее задание после успешного шага. Все механики мира доступны независимо от заданий.</p>';
    this.#board.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => {
      this.#selected = button.dataset.lesson; this.render();
      this.#task.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    const lesson = LESSONS.find(item => item.id === this.#selected);
    const status = this.#lessons.isDone(lesson.id) ? 'Выполнено' : current?.id === lesson.id ? 'Текущее задание' : 'Обзор будущего задания';
    this.#task.innerHTML = '<p class="campaign-eyebrow">' + status + ' / ' + lesson.stage + '</p><h2>' + escapeHtml(lesson.title) +
      '</h2><p class="city-task-objective">' + escapeHtml(lesson.objective) + '</p><p class="city-muted">JavaScript: ' + escapeHtml(lesson.concepts) +
      '</p><div class="city-task-api">' + lesson.api.map(name => '<button type="button" data-method="' + name + '" aria-label="Справка: ' + name + '"><code>' + escapeHtml(name) + '</code></button>').join(' ') +
      '</div><details><summary>Заготовка кода</summary><pre data-scaffold>' + escapeHtml(lesson.scaffold) +
      '</pre><button type="button" data-copy>Скопировать заготовку</button><p class="city-muted" data-copy-status role="status">Вставьте заготовку в редактор и допишите. Ваш код автоматически не заменяется.</p></details>' +
      lesson.hints.map((hint, i) => '<details><summary>Подсказка ' + (i + 1) + '</summary><pre>' + escapeHtml(hint) + '</pre></details>').join('') +
      '<p class="city-task-check"><strong>Как засчитывается:</strong> ' + escapeHtml(lesson.expectation) + '</p>';
    this.#task.querySelectorAll('[data-method]').forEach(button=>button.onclick=()=>this.#openAPI(button.dataset.method));
    this.#task.querySelector('[data-copy]').addEventListener('click', async () => {
      const status = this.#task.querySelector('[data-copy-status]');
      try { await navigator.clipboard.writeText(lesson.scaffold); status.textContent = 'Скопировано. Вставьте в редактор выбранного файла.'; }
      catch {
        const range = document.createRange(); range.selectNodeContents(this.#task.querySelector('[data-scaffold]'));
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        status.textContent = 'Код выделен. Скопируйте его вручную.';
      }
    });
  }
}
