import { scriptLocation } from './console-format.js';
/** A bounded, live console shared by main, probes, practice and render. */
export class CityConsole {
  #root; #anchor; #output; #records = []; #filter = 'all'; #follow = true; #open;
  constructor(root, onOpen) {
    this.#root = root; this.#open = onOpen;
    this.#anchor = document.createComment('console position'); root.before(this.#anchor);
    root.className = 'city-console';
    root.setAttribute('aria-label', 'Консоль JavaScript');
    root.innerHTML = '<header class="city-console-toolbar"><h3>Консоль JavaScript</h3><label>Уровень <select data-console-filter><option value="all">Все</option><option value="log">log / info</option><option value="warn">Предупреждения</option><option value="error">Ошибки</option><option value="system">События мира</option></select></label><label><input type="checkbox" data-console-follow checked> Следить за выводом</label><button type="button" data-console-clear>Очистить</button><button type="button" data-console-float aria-pressed="false">Отдельное окно</button></header><p class="city-muted">console.log / info / warn / error и cq.print · источник и шаг указаны у каждой записи. Логи сохраняются при ошибке, пробе и отмене.</p><div class="city-console-output" data-output role="log" aria-label="Вывод JavaScript" aria-live="polite" aria-relevant="additions text" tabindex="0"></div><p class="city-console-count" data-console-count role="status"></p>';
    this.#output = root.querySelector('[data-output]');
    root.querySelector('[data-console-clear]').onclick = () => this.clear();
    root.querySelector('[data-console-filter]').onchange = event => { this.#filter = event.target.value; this.#render(); };
    root.querySelector('[data-console-follow]').onchange = event => { this.#follow = event.target.checked; if (this.#follow) this.#scroll(); };
    root.querySelector('[data-console-float]').onclick = () => {
      const floating = !root.classList.contains('is-floating');
      root.classList.toggle('is-floating', floating);
      // The window remains visible when the workspace tab is hidden.
      if (floating) this.#anchor.parentElement.closest('.city-campaign').append(root);
      else this.#anchor.after(root);
      const button = root.querySelector('[data-console-float]');
      button.setAttribute('aria-pressed', String(floating));
      button.textContent = floating ? 'Вернуть в панель' : 'Отдельное окно';
    };
    this.#render();
  }
  write(entry, context = {}) {
    const level = ['log', 'info', 'warn', 'error', 'system'].includes(entry.level) ? entry.level : 'log';
    const record = { level, text: String(entry.text).slice(0, 4000), source: context.source || 'Мир', tick: context.tick, location: scriptLocation(entry.stack) };
    this.#records.push(record);
    if (this.#records.length > 500) { this.#records.shift(); this.#render(); }
    else { if (this.#visible(record)) this.#output.append(this.#row(record)); this.#count(); this.#scroll(); }
  }
  #visible(record) { return this.#filter === 'all' || (this.#filter === 'log' ? record.level === 'log' || record.level === 'info' : record.level === this.#filter); }
  #row(record) {
    const row = document.createElement('div'); row.className = 'city-console-row'; row.dataset.level = record.level;
    const meta = document.createElement('span'); meta.className = 'city-console-meta';
    meta.textContent = record.source + (record.tick === undefined ? '' : ' · шаг ' + record.tick) + ' · ' + record.level;
    const text = document.createElement('pre'); text.textContent = record.text; row.append(meta, text);
    if (record.location) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'city-console-location';
      const { path, line, column } = record.location; button.textContent = path + ':' + line + ':' + column;
      button.onclick = () => this.#open(path, line, column); row.append(button);
    }
    return row;
  }
  #count() { this.#root.querySelector('[data-console-count]').textContent = 'Показано ' + this.#records.filter(record => this.#visible(record)).length + ' / ' + this.#records.length + ' записей · последние 500 · до 100 сообщений на запуск'; }
  #scroll() { if (this.#follow) this.#output.scrollTop = this.#output.scrollHeight; }
  #render() { this.#output.replaceChildren(...this.#records.filter(record => this.#visible(record)).map(record => this.#row(record))); this.#count(); this.#scroll(); }
  clear() { this.#records = []; this.#render(); }
  dispose() { this.#root.remove(); this.#anchor.remove(); this.#records = []; }
}
