export class Warehouse {
  constructor(capacity = 1000) {
    this._capacity = capacity;
    this._inventory = [];
  }

  get capacity() {
    return this._capacity;
  }

  getUsedSpace() {
    return this._inventory.reduce((total, item) => total + (item.weight || 0), 0);
  }

  addItem(item) {
    const itemWeight = item.weight || 0;
    if (this.getUsedSpace() + itemWeight <= this._capacity) {
      this._inventory.push(item);
      return true;
    }
    return false;
  }

  removeItem(itemId) {
    const index = this._inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      return this._inventory.splice(index, 1)[0];
    }
    return null;
  }
}
