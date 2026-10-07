export const PRODUCTS = Object.freeze({ scrap: 'Лом', metal: 'Металл', parts: 'Детали', wire: 'Провод' });
export const RECIPES = Object.freeze({
  metal: Object.freeze({ input: 'scrap', amount: 2, energy: 2, duration: 2, research: null }),
  parts: Object.freeze({ input: 'metal', amount: 2, energy: 6, duration: 3, research: null }),
  wire: Object.freeze({ input: 'metal', amount: 1, energy: 3, duration: 1, research: 'wire' })
});
export const RESEARCH = Object.freeze([
  Object.freeze({ id: 'wire', name: 'Кабельная линия', cost: 400, description: 'Новый рецепт wire и поставки в электронный квартал.' }),
  Object.freeze({ id: 'efficiency', name: 'Энергосбережение', cost: 600, description: 'Затраты энергии на единицу продукции уменьшаются на 1 ₽.' })
]);
export const ROUTES = Object.freeze([
  Object.freeze({ id: 'courier', name: 'Городской фургон', duration: 1, fee: 5, capacity: 12 }),
  Object.freeze({ id: 'rail', name: 'Грузовой трамвай', duration: 3, fee: 8, capacity: 40 })
]);
export const BUYERS = Object.freeze([
  Object.freeze({ id: 'foundry', name: 'Литейный двор', product: 'metal', price: 18, limit: 12, remote: false }),
  Object.freeze({ id: 'builders', name: 'Стройартель', product: 'metal', price: 16, limit: 20, remote: false }),
  Object.freeze({ id: 'repair', name: 'Ремонтное депо', product: 'parts', price: 68, limit: 6, remote: false }),
  Object.freeze({ id: 'district', name: 'Окружная мастерская', product: 'parts', price: 88, limit: 12, remote: true }),
  Object.freeze({ id: 'electronics', name: 'Электронный квартал', product: 'wire', price: 38, limit: 20, remote: true })
]);
export const CONTRACTS = Object.freeze([
  Object.freeze({ id: 'metal-order', name: 'Ремонт мостовой', product: 'metal', quantity: 5, reward: 140, duration: 6 }),
  Object.freeze({ id: 'parts-order', name: 'Оснащение депо', product: 'parts', quantity: 4, reward: 390, duration: 10 }),
  Object.freeze({ id: 'wire-order', name: 'Уличное освещение', product: 'wire', quantity: 6, reward: 235, duration: 8 })
]);
export const COMMANDS = Object.freeze(['buy', 'produce', 'sell', 'upgrade', 'purchaseLine', 'unlock', 'acceptContract', 'deliverContract', 'dispatch']);
