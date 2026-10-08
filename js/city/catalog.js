export const PRODUCTS = Object.freeze({ scrap: 'Лом', metal: 'Металл', parts: 'Детали', wire: 'Провод', circuit: 'Схемы' });
export const RECIPES = Object.freeze({
  metal: Object.freeze({ input: 'scrap', amount: 2, energy: 2, duration: 2, research: null }),
  parts: Object.freeze({ input: 'metal', amount: 2, energy: 6, duration: 3, research: null }),
  circuit: Object.freeze({ input: 'wire', amount: 3, energy: 8, duration: 4, research: 'circuits' }),
  wire: Object.freeze({ input: 'metal', amount: 1, energy: 3, duration: 1, research: 'wire' })
});
export const RESEARCH = Object.freeze([
  Object.freeze({ id: 'wire', name: 'Кабельная линия', cost: 400, description: 'Новый рецепт wire и поставки в электронный квартал.' }),
  Object.freeze({ id: 'efficiency', name: 'Энергосбережение', cost: 600, description: 'Затраты энергии на единицу продукции уменьшаются на 1 $.' }),
  Object.freeze({ id: 'throughput', name: 'Поточная организация', cost: 900, description: 'Новые партии производятся на 1 шаг быстрее, минимум 1 шаг.' }),
  Object.freeze({ id: 'logistics', name: 'Диспетчерская', cost: 750, description: 'Новые доставки идут на 1 шаг быстрее, минимум 1 шаг.' }),
  Object.freeze({ id: 'circuits', name: 'Электронная сборка', cost: 800, description: 'Схемы: 3 провода + 8 $, 4 шага.' })
]);
export const ROUTES = Object.freeze([
  Object.freeze({ id: 'courier', regions: ['city'], name: 'Городской фургон', duration: 1, fee: 5, capacity: 12 }),
  Object.freeze({ id: 'rail', regions: ['city','highlands'], name: 'Грузовой трамвай', duration: 3, fee: 8, capacity: 40 }),
  Object.freeze({ id: 'barge', regions: ['port'], name: 'Портовая баржа', duration: 5, fee: 20, capacity: 60 })
]);
export const BUYERS = Object.freeze([
  Object.freeze({ id: 'foundry', name: 'Литейный двор', product: 'metal', price: 18, limit: 12, remote: false, region: 'city' }),
  Object.freeze({ id: 'builders', name: 'Стройартель', product: 'metal', price: 16, limit: 20, remote: false, region: 'city' }),
  Object.freeze({ id: 'repair', name: 'Ремонтное депо', product: 'parts', price: 68, limit: 6, remote: false, region: 'city' }),
  Object.freeze({ id: 'district', name: 'Окружная мастерская', product: 'parts', price: 88, limit: 12, remote: true, region: 'city' }),
  Object.freeze({ id: 'electronics', name: 'Электронный квартал', product: 'wire', price: 38, limit: 20, remote: true, region: 'city' }),
  Object.freeze({id:'harbor-metal',name:'Портовая стройка',product:'metal',price:28,limit:30,remote:true,region:'port'}),
  Object.freeze({id:'harbor-parts',name:'Судоремонтная артель',product:'parts',price:94,limit:20,remote:true,region:'port'}),
  Object.freeze({id:'northern-wire',name:'Северная сеть',product:'wire',price:48,limit:30,remote:true,region:'highlands'}),
  Object.freeze({id:'northern-circuit',name:'Северная автоматика',product:'circuit',price:190,limit:12,remote:true,region:'highlands'})
]);
export const CONTRACTS = Object.freeze([
  Object.freeze({ id: 'metal-order', name: 'Ремонт мостовой', product: 'metal', quantity: 5, reward: 140, duration: 6 }),
  Object.freeze({ id: 'parts-order', name: 'Оснащение депо', product: 'parts', quantity: 4, reward: 390, duration: 10 }),
  Object.freeze({ id: 'wire-order', name: 'Уличное освещение', product: 'wire', quantity: 6, reward: 235, duration: 8 })
]);
export const COMMANDS = Object.freeze(['buy', 'produce', 'sell', 'upgrade', 'purchaseLine', 'unlock', 'acceptContract', 'deliverContract', 'dispatch', 'openRegion', 'placeOrder', 'cancelOrder', 'discard', 'networkOpen', 'networkBuy', 'networkStart', 'networkSell', 'networkTransfer', 'networkPurchaseLine', 'networkUpgradeLine', 'networkUpgradeWarehouse', 'networkUpgradeFleet', 'networkDiscard']);
