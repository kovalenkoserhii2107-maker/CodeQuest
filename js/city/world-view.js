import { PRODUCTS } from './catalog.js';
import { escapeHtml } from '../ui/html.js';
const number = value => value.toLocaleString('ru-RU');
const money = value => number(value) + ' ₽';
const statuses = { available: 'Доступен', active: 'Принят', cooldown: 'Обновляется' };

/** Rendering depends on the world, not on button/worker state. */
export class CityWorldView {
  constructor(root) {
    this.root = root;
    for (const input of root.querySelectorAll('[data-market-product], [data-market-region]'))
      input.addEventListener('change', () => { if (this.engine) this.render(this.engine, true); });
  }
  render(engine, force = false) {
    if (!force && this.engine === engine && this.tick === engine.getTime()) return;
    this.engine = engine; this.tick = engine.getTime();
    const el = selector => this.root.querySelector(selector);
    const w = engine.snapshot(), used = Object.values(w.inventory).reduce((a, b) => a + b, 0);
    el('[data-metrics]').innerHTML = [
      ['Баланс', money(w.balance)], ['Шаг мира', number(w.tick)],
      ['Склад / свободно', used + '/' + w.capacity + ' · ' + engine.getFreeSpace()],
      ['Доходы − все расходы', money(w.metrics.revenue - w.metrics.spent)]
    ].map(([label, value]) => '<div><span>' + label + '</span><strong>' + value + '</strong></div>').join('');
    el('[data-world]').innerHTML =
      '<dl class="city-stock">' + Object.entries(w.inventory).map(([key, value]) =>
        '<dt>' + PRODUCTS[key] + ' <code>' + key + '</code></dt><dd>' + number(value) + '</dd>').join('') + '</dl>' +
      '<h3>Производственные линии</h3><div class="city-line-list">' + w.lines.map(line =>
        '<p><strong>' + line.id + ' · уровень ' + line.level + '</strong><br>' +
        (line.job ? PRODUCTS[line.job.product] + ': ' + line.job.quantity + ' ед.; осталось шагов: ' + line.job.remaining : 'Свободна · партия до ' + line.level * 8 + ' ед.') + '</p>').join('') + '</div>' +
      '<h3>Поставщики</h3>' + engine.getSuppliers().map(s => '<p><code>' + s.id + '</code> · ' + PRODUCTS[s.product] + ' ' + money(s.price) + ' · в наличии ' + s.stock + '<br><small>' + s.region + (s.locked ? ' · сначала откройте регион' : ' · доступен') + '</small></p>').join('') +
      '<div class="city-table-scroll"><table><caption>Покупатели</caption><thead><tr><th>Покупатель / ID</th><th>Товар</th><th>Цена</th><th>Спрос</th></tr></thead><tbody>' +
      w.buyers.filter(b => (!el('[data-market-product]').value || b.product === el('[data-market-product]').value) && (!el('[data-market-region]').value || b.region === el('[data-market-region]').value)).map(b => '<tr><td>' + escapeHtml(b.name) + '<br><code>' + escapeHtml(b.id) + '</code>' + (b.remote ? '<br><small>Доставка</small>' : '')+'<br><small>'+b.region+(!w.regions.includes(b.region)?' · закрыт':'')+'</small>' +
        '</td><td>' + PRODUCTS[b.product] + '</td><td>' + money(b.price) + '</td><td>' + b.demand + '</td></tr>').join('') + '</tbody></table></div>';
    if (!el('[data-world] tbody').children.length) el('[data-world] tbody').innerHTML = '<tr><td colspan="4">Нет покупателей для выбранных фильтров.</td></tr>';
    el('[data-contracts]').innerHTML = engine.getContracts().map(order => '<article class="city-contract"><h3>' + escapeHtml(order.name) +
      '</h3><p><code>' + order.id + '</code> · ' + order.quantity + ' ' + PRODUCTS[order.product] + '</p><p>Награда: ' + money(order.reward) +
      ' · срок: ' + order.duration + ' шагов</p><p class="city-muted">' + (order.locked ? 'Нужна технология wire' : statuses[order.status]) +
      (order.status === 'active' ? ' · deadline=' + order.deadline + ' · осталось ' + (order.deadline - w.tick) :
        order.status === 'cooldown' ? ' · обновится через ' + (order.refreshAt - w.tick) : '') + '</p></article>').join('');
    el('[data-expansion]').innerHTML = '<h3>Маршруты</h3>' + engine.getRoutes().map(route =>
      '<p><code>' + route.id + '</code>: ' + route.duration + ' шаг. · ' + money(route.fee) + ' · до ' + route.capacity +
      ' ед. · ' + (route.locked ? 'регион закрыт' : route.busy ? 'занят' : 'свободен') + '<br><small>Регионы: ' + route.regions.join(', ') + '</small></p>').join('') +
      '<h3>Грузы в пути</h3>' + (w.shipments.length ? w.shipments.map(s => '<p>№' + s.id + ' · ' + s.quantity + ' ' + PRODUCTS[s.product] +
        ' → <code>' + s.buyerId + '</code><br>Осталось ' + s.remaining + ' шаг. · ожидается ' + money(s.quantity * s.unitPrice) + '</p>').join('') : '<p class="city-muted">Нет грузов.</p>') +
      '<h3>Технологии</h3>' + engine.getResearch().map(t => '<p><strong>' + escapeHtml(t.name) + '</strong> <code>' + t.id + '</code><br>' +
        (t.unlocked ? 'Открыта' : money(t.cost)) + ' · ' + escapeHtml(t.description) + '</p>').join('') +
      '<h3>Доступные рецепты</h3>' + engine.getRecipes().map(r => '<p><code>' + r.product + '</code> = ' + r.amount + ' ' + PRODUCTS[r.input] +
        ' + ' + money(r.energy) + ' · ' + r.duration + ' шаг.</p>').join('');
    el('[data-regions]').innerHTML=engine.getRegions().map(r=>'<article class="city-region"><h3>'+escapeHtml(r.name)+'</h3><p><code>'+r.id+'</code> · '+(r.unlocked?'Открыт':money(r.cost))+'</p><p class="city-muted">'+escapeHtml(r.description)+'</p></article>').join('')+'<h3>События рынков</h3>'+engine.getEvents().map(e=>'<p><code>'+e.region+'</code>: '+escapeHtml(e.name)+' · смена через '+e.changesIn+' шаг.</p>').join('')+'<p class="city-muted">Доступ: cq.world.explore(id). Выбирайте поставщика и совместимый маршрут; circuits открывает схемы.</p>';
    el('[data-alerts]').innerHTML = engine.getAlerts().map(alert => '<p class="city-alert" data-level="' + alert.level + '">' + escapeHtml(alert.text) + '</p>').join('');
    const orderStatus = { pending: 'Ожидает', filled: 'Исполнена', cancelled: 'Отменена', expired: 'Срок истёк' };
    el('[data-orders]').innerHTML = '<p class="city-muted">До 8 активных продаж. Товары и деньги не резервируются. Мир проверяет цену и ресурсы каждый шаг; удалённая продажа создаёт доставку.</p>' +
      (engine.getOrders().length ? engine.getOrders().slice().reverse().map(o => '<article class="city-order"><div><strong>№' + o.id + ' · ' + PRODUCTS[o.product] + ' × ' + o.quantity + '</strong><span class="city-badge" data-status="' + o.status + '">' + orderStatus[o.status] + '</span></div><p><code>' + escapeHtml(o.buyerId) + '</code> · порог ' + money(o.minPrice) + ' · ' + (o.status === 'pending' ? 'срок через ' + (o.expiresAt-w.tick) + ' шаг.' : 'закрыта на шаге ' + o.closedAt) + '</p>' + (o.reasons?.length ? '<p class="city-muted">' + o.reasons.map(escapeHtml).join(' ') + '</p>' : '') + '</article>').join('') : '<div class="city-empty"><strong>Отложенных продаж пока нет</strong><p>Поставьте порог цены через cq.market.placeOrder(). Продажа дождётся товара и подходящего рынка.</p></div>') +
      '<details><summary>Пример отложенной продажи</summary><pre>if (!cq.market.getOrders().some(o =&gt; o.status === "pending")) {\n  cq.market.placeOrder({ product: "metal", quantity: 5,\n    buyerId: "foundry", minPrice: 19, expiresIn: 24 });\n}</pre></details>';
    el('[data-costs]').innerHTML = '<h3>Оценка затрат на единицу</h3><p class="city-muted">Минимальная стоимость доступной цепочки: сырьё + энергия. Не включает оборудование, разрешения и доставку; запасы поставщиков могут закончиться.</p><dl class="city-stock">' +
      Object.entries(engine.getUnitCosts()).map(([id, value]) => '<dt>' + PRODUCTS[id] + '</dt><dd>' + (value === null ? 'Нет открытой цепочки' : money(value)) + '</dd>').join('') + '</dl>';
    el('[data-snapshot]').textContent = JSON.stringify(w, null, 2);
  }

}
