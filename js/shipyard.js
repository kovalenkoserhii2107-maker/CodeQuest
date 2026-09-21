export class Shipyard {
  constructor() {
    this.catalog = [
      { id: 'mod-reactor-1', name: 'Реактор «Искра-М»', type: 'reactor', price: 25000, weight: 150, energy: 120 },
      { id: 'mod-engine-1', name: 'Маршевый «Вектор»', type: 'engine', price: 30000, weight: 200, energy: -60 },
      { id: 'mod-drill-1', name: 'Бур «Крот»', type: 'drill', price: 18000, weight: 80, energy: -40 },
      { id: 'mod-shield-1', name: 'Генератор поля', type: 'shield', price: 22000, weight: 100, energy: -30, shield: 25 },
      { id: 'mod-laser-1', name: 'Лазер «Игла»', type: 'weapon', price: 26000, weight: 90, energy: -50, attack: 40 },
      { id: 'mod-railgun-1', name: 'Рельсотрон «Молот»', type: 'weapon', price: 45000, weight: 220, energy: -90, attack: 95 },
      { id: 'mod-shield-2', name: 'Тяжёлый щит «Бастион»', type: 'shield', price: 38000, weight: 180, energy: -60, shield: 60 },
      // Тяжёлый реактор нужен, чтобы корабль с полным набором потребителей
      // вообще можно было вывести в плюс: двух обычных для этого не хватает,
      // а третий уже не помещается на склад
      { id: 'mod-reactor-2', name: 'Реактор «Искра-Т»', type: 'reactor', price: 70000, weight: 260, energy: 300 }
    ];
  }

  getCatalog() {
    return this.catalog;
  }

  getModule(moduleId) {
    const module = this.catalog.find(m => m.id === moduleId);
    if (module) {
        // Возвращаем копию с уникальным ID для склада, так как можно купить несколько одинаковых
        return { ...module, uniqueId: `${module.id}-${Date.now()}` };
    }
    return null;
  }
}
