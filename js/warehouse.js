import { state, addInventoryItem } from './state.js';

export class Warehouse {
  constructor(capacity = 1000) {
    this.capacity = capacity;
  }

  get items() {
    return state.inventory || [];
  }

  getUsedSpace() {
    return this.items.reduce((sum, item) => sum + (item.weight || 0), 0);
  }

  addItem(item) {
    if (this.getUsedSpace() + item.weight <= this.capacity) {
      addInventoryItem(item);
      return true;
    }
    return false;
  }
}
