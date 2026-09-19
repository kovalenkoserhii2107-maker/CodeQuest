import { state, spendCredits, addCrewMember } from './state.js';

export class PlayerState {
  // Конструктор больше не принимает initialCredits, так как мы берем кредиты из state.js
  constructor() {}

  get credits() {
    return state.credits || 0;
  }

  get crew() {
    return state.crew || [];
  }

  spendCredits(amount) {
    return spendCredits(amount);
  }

  addCrewMember(crewMember) {
    addCrewMember(crewMember);
  }
}
