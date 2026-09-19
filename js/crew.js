export class CrewMember {
  constructor(id, name, initials, role, hireCost, salary, stats) {
    this.id = id;
    this.name = name;
    this.initials = initials;
    this.role = role;
    this.hireCost = hireCost;
    this.salary = salary;
    this.stats = stats; // e.g. { flights: 10, rating: 4.5 }
  }
}

export class LaborExchange {
  constructor() {
    // Начальные кандидаты на бирже труда (перенесены из статического HTML)
    this.candidates = [
      new CrewMember('c1', 'Анна Кравец', 'АК', 'Капитан', 15000, 2000, { flights: 214, rating: 4.9 }),
      new CrewMember('c2', 'Марк Дерун', 'МД', 'Навигатор', 12000, 1500, { flights: 168, rating: 4.7 }),
      new CrewMember('c3', 'Лия Рид', 'ЛР', 'Инженер реактора', 14000, 1800, { flights: 97, rating: 4.8 }),
      new CrewMember('c4', 'Игорь Тимко', 'ИТ', 'Связист', 9000, 1200, { flights: 143, rating: 4.6 }),
      new CrewMember('c5', 'Ольга Верес', 'ОВ', 'Врач станции', 11000, 1400, { flights: 320, rating: 5.0 })
    ];
  }

  getCandidates() {
    return this.candidates;
  }

  hire(crewId) {
    const index = this.candidates.findIndex(c => c.id === crewId);
    if (index !== -1) {
      return this.candidates.splice(index, 1)[0];
    }
    return null;
  }
}
