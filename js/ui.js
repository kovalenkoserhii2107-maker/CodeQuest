import { PlayerState } from './player.js';
import { Warehouse } from './warehouse.js';
import { Shipyard } from './shipyard.js';
import { LaborExchange } from './crew.js';
import { subscribe, isSolved, refundCredits } from './state.js'; // Подписка на глобальное состояние

// Инициализация классов-оберток
const player = new PlayerState();
const warehouse = new Warehouse(1000);
const shipyard = new Shipyard();
const laborExchange = new LaborExchange();

// Вспомогательная функция для всплывающих уведомлений
function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.append(node);
  setTimeout(() => node.remove(), 4000);
}

// Обновление верхнего UI
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

// Рендер каталога Верфи
export function renderShipyard() {
  const container = document.getElementById('shipyard-catalog');
  if (!container) return;

  if (!isSolved('connect-shipyard')) {
    container.innerHTML = `
      <article class="metric" style="border: 1px dashed var(--warning); opacity: 0.8">
        <p class="metric__label" style="color: var(--warning)">ВЕРФЬ НЕДОСТУПНА</p>
        <p style="font-size: 0.9rem; margin-top: 8px;">Выполните задачу «Подключение Верфи» в тренажере.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = '';
  const catalog = shipyard.getCatalog();
  
  catalog.forEach(module => {
    const article = document.createElement('article');
    article.className = 'metric';
    article.innerHTML = `
      <p class="metric__label">${module.type.toUpperCase()}</p>
      <p class="metric__value" style="font-size: 1.2rem; margin-bottom: 8px;">${module.name}</p>
      <p class="metric__delta metric__delta--up">Вес: ${module.weight} т</p>
      <button class="btn btn--sm btn--primary" style="margin-top: 12px; width: 100%">Купить за ${module.price.toLocaleString()} ¢</button>
    `;

    const buyBtn = article.querySelector('button');
    buyBtn.addEventListener('click', () => {
      // Пытаемся купить
      if (warehouse.getUsedSpace() + module.weight > warehouse.capacity) {
        toast("Недостаточно места на складе!");
        return;
      }
      
      if (!player.spendCredits(module.price)) {
        toast('Недостаточно кредитов! Решайте задачи в тренажёре.');
        return;
      }

      const item = shipyard.getModule(module.id);
      if (!warehouse.addItem(item)) {
        // Склад отказал уже после списания — возвращаем кредиты
        refundCredits(module.price);
        toast('Склад не принял модуль, кредиты возвращены');
        return;
      }

      toast(`Куплен: ${module.name}`);
    });

    container.appendChild(article);
  });
}

// Рендер экипажа
export function renderCrew() {
  const hiredContainer = document.getElementById('hired-crew');
  const exchangeContainer = document.getElementById('exchange-candidates');
  if (!hiredContainer || !exchangeContainer) return;

  if (!isSolved('create-base')) {
    hiredContainer.innerHTML = '<p class="panel__empty" style="color: var(--warning)">Доступ запрещен. Сначала решите задачу «Регистрация корпорации».</p>';
    exchangeContainer.innerHTML = '<p class="panel__empty" style="color: var(--warning)">Биржа недоступна.</p>';
    return;
  }

  // Отрисовка нанятого экипажа
  hiredContainer.innerHTML = '';
  if (player.crew.length === 0) {
    hiredContainer.innerHTML = '<p class="panel__empty" style="color: var(--text-2); padding: 10px;">Нет нанятого экипажа.</p>';
  } else {
    player.crew.forEach(c => {
      hiredContainer.innerHTML += `
        <article class="crew-card" style="margin-bottom: 12px; display: block">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
            <span class="crew-card__avatar" aria-hidden="true">${c.initials}</span>
            <div>
              <h3 class="crew-card__name">${c.name}</h3>
              <p class="crew-card__role">${c.role}</p>
            </div>
          </div>
          <p class="crew-card__stats" style="margin-top: 8px;"><span>Зарплата: ${c.salary} ¢</span></p>
        </article>
      `;
    });
  }

  // Отрисовка биржи. Мы отфильтровываем кандидатов, которые уже наняты!
  exchangeContainer.innerHTML = '';
  const hiredIds = player.crew.map(c => c.id);
  const candidates = laborExchange.getCandidates().filter(c => !hiredIds.includes(c.id));

  if (candidates.length === 0) {
    exchangeContainer.innerHTML = '<p class="panel__empty" style="color: var(--text-2); padding: 10px;">Кандидатов пока нет.</p>';
  } else {
    candidates.forEach(c => {
      const article = document.createElement('article');
      article.className = 'crew-card';
      article.style.marginBottom = '12px';
      article.style.display = 'block';
      article.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
            <span class="crew-card__avatar" aria-hidden="true">${c.initials}</span>
            <div>
              <h3 class="crew-card__name">${c.name}</h3>
              <p class="crew-card__role">${c.role}</p>
            </div>
        </div>
        <p class="crew-card__stats"><span>Рейсов ${c.stats.flights}</span><span>Рейтинг ${c.stats.rating}</span></p>
        <button class="btn btn--sm btn--ghost" style="margin-top: 12px; width: 100%">Нанять за ${c.hireCost.toLocaleString()} ¢</button>
      `;

      const hireBtn = article.querySelector('button');
      hireBtn.addEventListener('click', () => {
        // Быстрый повторный клик не должен нанимать одного и того же дважды
        if (player.crew.some(hired => hired.id === c.id)) return;
        hireBtn.disabled = true;

        if (!player.spendCredits(c.hireCost)) {
          hireBtn.disabled = false;
          toast('Недостаточно кредитов! Решайте задачи в тренажёре.');
          return;
        }

        const hiredCrew = laborExchange.hire(c.id);
        if (!hiredCrew) {
          refundCredits(c.hireCost);
          hireBtn.disabled = false;
          toast('Кандидат уже занят, кредиты возвращены');
          return;
        }

        player.addCrewMember(hiredCrew);
        toast(`Нанят: ${c.name}`);
      });
      exchangeContainer.appendChild(article);
    });
  }
}

// Запуск при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  // Первичный рендер
  updateDashboard();
  renderShipyard();
  renderCrew();

  // Подписка на глобальное состояние: когда меняются кредиты или инвентарь/экипаж,
  // мы автоматически перерисовываем нужные части интерфейса.
  subscribe(() => {
    updateDashboard();
    renderShipyard();  // без этого верфь оставалась закрытой до перезагрузки
    renderCrew();
  });
});
