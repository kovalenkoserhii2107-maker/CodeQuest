export class Shipyard {
  constructor() {
    this.catalog = [
      { id: 'mod-reactor-1', name: 'Реактор "Искра-М"', type: 'reactor', price: 25000, weight: 150 },
      { id: 'mod-drill-1', name: 'Бур "Крот"', type: 'drill', price: 18000, weight: 80 },
      { id: 'mod-engine-1', name: 'Плазменный маршевый', type: 'engine', price: 35000, weight: 200 },
      { id: 'mod-shield-1', name: 'Генератор поля', type: 'shield', price: 22000, weight: 100 }
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
