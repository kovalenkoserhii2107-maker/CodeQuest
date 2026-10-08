import { PRODUCTS, ROUTES } from './catalog.js';

const clone = value => JSON.parse(JSON.stringify(value));
const statuses = ['pending', 'filled', 'cancelled', 'expired'];
export function validateOrders(world) {
  if (!Array.isArray(world.orders) || world.orders.length > 48 ||
      !Number.isSafeInteger(world.nextOrder) || world.nextOrder < 1) {
    throw new Error('Некорректные отложенные продажи.');
  }
  const ids = new Set();
  for (const order of world.orders) {
    const buyer = world.buyers.find(item => item.id === order.buyerId);
    if (!order || !Number.isSafeInteger(order.id) || order.id < 1 || order.id >= world.nextOrder ||
        ids.has(order.id) || !Object.hasOwn(PRODUCTS, order.product) || !buyer ||
        buyer.product !== order.product || !statuses.includes(order.status) ||
        !Number.isSafeInteger(order.quantity) || order.quantity < 1 || order.quantity > 1000000 ||
        !Number.isSafeInteger(order.minPrice) || order.minPrice < 1 || order.minPrice > 1000 ||
        !Number.isSafeInteger(order.createdAt) || order.createdAt < 0 || order.createdAt > world.tick ||
        !Number.isSafeInteger(order.expiresAt) || order.expiresAt <= order.createdAt ||
        order.expiresAt > order.createdAt + 120 ||
        (order.status === 'pending' && order.expiresAt <= world.tick) ||
        !world.regions.includes(buyer.region)) {
      throw new Error('Некорректная отложенная продажа.');
    }
    const route = order.routeId === null ? null : ROUTES.find(item => item.id === order.routeId);
    if ((order.routeId !== null && !route) || (buyer.remote && !route) ||
        (route && !route.regions.includes(buyer.region))) throw new Error('Некорректный маршрут продажи.');
    if (order.status === 'pending' && order.closedAt !== null) throw new Error('Некорректное закрытие продажи.');
    if (order.status === 'filled' && (!Number.isSafeInteger(order.unitPrice) ||
        order.unitPrice < order.minPrice || order.unitPrice > 1000)) throw new Error('Некорректная цена продажи.');
    if (order.status !== 'pending' && (!Number.isSafeInteger(order.closedAt) ||
        order.closedAt < order.createdAt || order.closedAt > world.tick)) throw new Error('Некорректное закрытие продажи.');
    ids.add(order.id);
  }
  if (world.orders.filter(item => item.status === 'pending').length > 8) throw new Error('Не более восьми активных продаж.');
}

/** Requests do not reserve stock or cash. FIFO attempts run after prices and production. */
export class SaleOrders {
  constructor(world, quote, sell, dispatch) {
    this.world = world;
    this.quote = quote;
    this.sell = sell;
    this.dispatch = dispatch;
  }
  list() {
    return clone(this.world.orders).map(order => {
      if (order.status !== 'pending') return order;
      const quote = this.quote(order.product, order.quantity, order.buyerId, order.routeId);
      return { ...order, currentPrice: quote.unitPrice,
        reasons: [...(quote.unitPrice < order.minPrice ? ['Цена ниже порога: ' + order.minPrice + ' $.'] : []), ...quote.reasons] };
    });
  }
  place(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Передайте объект параметров продажи.');
    const { product, quantity, buyerId, minPrice, routeId = null, expiresIn = 24 } = options;
    if (!Number.isSafeInteger(minPrice) || minPrice < 1 || minPrice > 1000 ||
        !Number.isSafeInteger(expiresIn) || expiresIn < 2 || expiresIn > 120) throw new Error('minPrice: 1–1000; expiresIn: 2–120 целых шагов.');
    const quote = this.quote(product, quantity, buyerId, routeId);
    const buyer = this.world.buyers.find(item => item.id === buyerId);
    if (!this.world.regions.includes(buyer.region)) throw new Error('Сначала откройте регион: ' + buyer.region);
    if (buyer.remote && routeId === null) throw new Error('Укажите маршрут для удалённого покупателя.');
    if (quote.reasons.some(reason => reason.startsWith('Маршрут не обслуживает'))) throw new Error('Маршрут не обслуживает регион покупателя.');
    if (this.world.orders.filter(item => item.status === 'pending').length >= 8) throw new Error('Не более восьми активных продаж.');
    const order = { id: this.world.nextOrder++, product, quantity, buyerId, minPrice, routeId,
      createdAt: this.world.tick, expiresAt: this.world.tick + expiresIn, status: 'pending', closedAt: null };
    this.world.orders.push(order);
    this.prune();
    return clone(order);
  }
  cancel(id) {
    const order = this.world.orders.find(item => item.id === id);
    if (!order || order.status !== 'pending') throw new Error('Активная продажа не найдена.');
    order.status = 'cancelled'; order.closedAt = this.world.tick;
    return clone(order);
  }
  advance() {
    for (const order of this.world.orders) {
      if (order.status !== 'pending') continue;
      if (this.world.tick >= order.expiresAt) {
        order.status = 'expired'; order.closedAt = this.world.tick; continue;
      }
      const quote = this.quote(order.product, order.quantity, order.buyerId, order.routeId);
      if (quote.unitPrice < order.minPrice || !quote.canTrade) continue;
      if (order.routeId === null) this.sell(order.product, order.quantity, order.buyerId);
      else this.dispatch(order.product, order.quantity, order.buyerId, order.routeId);
      order.status = 'filled'; order.closedAt = this.world.tick; order.unitPrice = quote.unitPrice;
    }
    this.prune();
  }
  prune() {
    while (this.world.orders.length > 48) {
      const index = this.world.orders.findIndex(item => item.status !== 'pending');
      this.world.orders.splice(index, 1);
    }
  }
}
