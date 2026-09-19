/**
 * Рынок руды: покупатели со своими ценами и лимитами закупки.
 *
 * Кому и сколько продать, решает функция игрока из задания «Торговля рудой».
 * Рынок только называет условия.
 */
export class Market {
  constructor() {
    this.buyers = [
      { id: 'buyer-forge', buyer: 'Литейный «Гефест»', price: 900, limit: 40, note: 'Платит больше всех, но берёт мало' },
      { id: 'buyer-yard', buyer: 'Верфь «Орион»', price: 720, limit: 90, note: 'Средняя цена, приличный объём' },
      { id: 'buyer-depot', buyer: 'Склады Совета', price: 540, limit: 500, note: 'Берёт сколько угодно по низкой цене' },
    ];
  }

  getOffers() {
    return this.buyers.map(offer => ({ ...offer }));
  }

  /** Сколько руды рынок готов принять всего — для подсказок в интерфейсе. */
  totalDemand() {
    return this.buyers.reduce((sum, offer) => sum + offer.limit, 0);
  }
}
