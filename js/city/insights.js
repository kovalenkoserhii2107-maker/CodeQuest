import { PRODUCTS, RECIPES } from './catalog.js';

export function productionQuote(world, product, quantity, lineId, freeSpace) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw new Error('Размер партии: положительное целое до 1 000 000.');
  const recipe = Object.hasOwn(RECIPES, product) ? RECIPES[product] : null;
  if (!recipe) throw new Error('Неизвестный рецепт.');
  const line = world.lines.find(item => item.id === lineId);
  if (!line) throw new Error('Линия не найдена: ' + lineId);
  const inputQuantity = quantity * recipe.amount;
  const energyCost = quantity * Math.max(0, recipe.energy - (world.research.includes('efficiency') ? 1 : 0));
  const duration = Math.max(1, recipe.duration - (world.research.includes('throughput') ? 1 : 0));
  const reasons = [];
  if (recipe.research && !world.research.includes(recipe.research)) reasons.push('Сначала исследуйте ' + recipe.research + '.');
  if (line.job) reasons.push('Линия занята ещё ' + line.job.remaining + ' шаг.');
  if (quantity > 8 * line.level) reasons.push('Мощность линии: до ' + 8 * line.level + ' ед.');
  if (world.inventory[recipe.input] < inputQuantity) reasons.push('Нужно ' + inputQuantity + ' ' + recipe.input + '; есть ' + world.inventory[recipe.input] + '.');
  if (world.balance < energyCost) reasons.push('На энергию нужно ' + energyCost + ' $.');
  if (quantity > freeSpace + inputQuantity) reasons.push('Не хватает места под готовую партию.');
  return { product, quantity, lineId, input: recipe.input, inputQuantity, energyCost, duration, canStart: !reasons.length, reasons };
}

export function unitCosts(world) {
  const memo = new Map();
  function cost(product) {
    if (memo.has(product)) return memo.get(product);
    const suppliers = world.suppliers.filter(item => item.product === product && world.regions.includes(item.region));
    const direct = suppliers.length ? Math.min(...suppliers.map(item => item.price)) : Infinity;
    const recipe = RECIPES[product];
    const made = recipe && (!recipe.research || world.research.includes(recipe.research))
      ? cost(recipe.input) * recipe.amount + Math.max(0, recipe.energy - (world.research.includes('efficiency') ? 1 : 0))
      : Infinity;
    const result = Math.min(direct, made);
    memo.set(product, result);
    return result;
  }
  return Object.fromEntries(Object.keys(PRODUCTS).map(product => {
    const value = cost(product);
    return [product, Number.isFinite(value) ? value : null];
  }));
}

export function worldAlerts(world, freeSpace) {
  const alerts = [];
  if (world.balance < 40) alerts.push({ level: 'warn', text: 'Мало оборотных денег. Проверьте готовые товары и заказы перед закупкой.' });
  if (freeSpace < 10) alerts.push({ level: 'warn', text: 'Свободно ' + freeSpace + ' мест. Продайте или спишите излишки через cq.warehouse.discard().' });
  for (const contract of world.contracts) {
    if (contract.status === 'active' && contract.deadline - world.tick <= 2)
      alerts.push({ level: 'warn', text: contract.id + ': осталось ' + (contract.deadline - world.tick) + ' шаг.' });
  }
  if (world.lines.every(line => !line.job) && Object.values(world.inventory).some(value => value > 0))
    alerts.push({ level: 'info', text: 'Все линии свободны. Сравните рецепты и рынки для следующей партии.' });
  return alerts;
}
