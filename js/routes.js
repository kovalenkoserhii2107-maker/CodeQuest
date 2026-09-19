/**
 * Маршрутная книга космопорта.
 *
 * Направления фиксированы: расход топлива и время в пути считает не игра,
 * а функция игрока из задания «Полётный план» — здесь только исходные данные.
 */
export class RouteBook {
  constructor() {
    this.routes = [
      { id: 'route-ceres', name: 'Церера', distance: 240, richness: 3, note: 'Ближний пояс, руда среднего качества' },
      { id: 'route-vesta', name: 'Веста', distance: 420, richness: 5, note: 'Дальше, но жила богаче' },
      { id: 'route-pallas', name: 'Паллада', distance: 680, richness: 8, note: 'Долгий рейс за тяжёлой рудой' },
    ];
  }

  getRoutes() {
    return this.routes.map(route => ({ ...route }));
  }

  getRoute(routeId) {
    const route = this.routes.find(item => item.id === routeId);
    return route ? { ...route } : null;
  }
}
