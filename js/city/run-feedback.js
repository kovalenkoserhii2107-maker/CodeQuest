import { PRODUCTS } from './catalog.js';

/** Compact factual result alongside run controls; does not mutate the simulation. */
export class RunFeedback {
  constructor(root) { this.root = root; }
  show(state, title, detail) {
    this.root.dataset.state = state;
    this.root.replaceChildren();
    const heading = document.createElement('strong'), text = document.createElement('span');
    heading.textContent = title; text.textContent = detail;
    this.root.append(heading, text);
  }
  pending(preview) { this.show('busy', preview ? 'Проверяем без сохранения…' : 'Выполняем index.js…', 'Можно отменить запуск. При ошибке весь шаг будет отменён.'); }
  success(before, after, commands, duration, preview) {
    const delta = after.balance - before.balance;
    const changed = Object.keys(PRODUCTS).filter(id => after.inventory[id] !== before.inventory[id]).map(id => {
      const n = after.inventory[id] - before.inventory[id];
      return PRODUCTS[id] + ' ' + (n > 0 ? '+' : '') + n;
    });
    this.show(preview ? 'preview' : 'success', preview ? 'Проба завершена · мир не изменён' : 'Шаг ' + after.tick + ' выполнен',
      (preview ? 'Прогноз: ' : '') + 'баланс ' + (delta > 0 ? '+' : '') + delta.toLocaleString('ru-RU') + ' ₽ · ' +
      (changed.join(', ') || 'склад без изменений') + ' · команд: ' + commands +
      (duration ? ' · ' + Math.round(duration) + ' мс' : ''));
  }
  error(message) { this.show('error', 'Шаг отменён · мир и память сохранены', message); }
}
