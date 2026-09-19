export class PlayerState {
  constructor(initialCredits = 100000) {
    this._credits = initialCredits;
    this._crew = [];
  }

  get credits() {
    return this._credits;
  }

  addCredits(amount) {
    if (amount > 0) {
      this._credits += amount;
    }
  }

  spendCredits(amount) {
    if (amount > 0 && this._credits >= amount) {
      this._credits -= amount;
      return true;
    }
    return false;
  }

  get crew() {
    return this._crew;
  }

  addCrewMember(crewMember) {
    this._crew.push(crewMember);
  }
}
