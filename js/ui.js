import { PlayerState } from './player.js';
import { Warehouse } from './warehouse.js';

// Инициализация глобальных сущностей
const player = new PlayerState(100000);
const warehouse = new Warehouse(1000);

// Демонстрация: добавим немного груза для наглядности
warehouse.addItem({ id: 'he3', name: 'Гелий-3', weight: 400 });

// Обновление UI
export function updateDashboard() {
  const budgetEl = document.getElementById('player-budget');
  if (budgetEl) {
    budgetEl.textContent = `${player.credits.toLocaleString()} ¢`;
  }

  const capacityEl = document.getElementById('warehouse-capacity');
  if (capacityEl) {
    capacityEl.textContent = `Занято: ${warehouse.getUsedSpace()} / ${warehouse.capacity} т`;
  }
}

// Запуск при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
});
