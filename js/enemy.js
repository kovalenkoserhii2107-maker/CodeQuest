/**
 * Патрульная сводка: кто встречается в поясе.
 *
 * Игра только называет противника и его характеристики. Исход боя считает
 * функция игрока из задания «Боевой вылет» — здесь нет ни урона, ни раундов.
 */
export class ThreatLog {
  constructor() {
    this.threats = [
      {
        id: 'threat-drone',
        name: 'Дрон-разведчик',
        attack: 18,
        shield: 5,
        hull: 60,
        bounty: 12000,
        note: 'Слабый, но юркий: хорош для первого боя',
      },
      {
        id: 'threat-raider',
        name: 'Рейдер «Ястреб»',
        attack: 45,
        shield: 20,
        hull: 140,
        bounty: 38000,
        note: 'Пробивает лёгкую броню, сам держит удар',
      },
      {
        id: 'threat-cruiser',
        name: 'Крейсер «Гарпия»',
        attack: 80,
        shield: 45,
        hull: 260,
        bounty: 95000,
        note: 'Без тяжёлого орудия к нему лучше не подходить',
      },
    ];
  }

  getThreats() {
    return this.threats.map(threat => ({ ...threat }));
  }

  getThreat(threatId) {
    const threat = this.threats.find(item => item.id === threatId);
    return threat ? { ...threat } : null;
  }

  /** Мишени полигона: та же броня, но без ответного огня. */
  getTargets() {
    return this.threats.map(threat => ({
      name: threat.name,
      shield: threat.shield,
      hull: threat.hull,
    }));
  }
}
