/**
 * Приёмка лома: партии, из которых комбинат делает металл.
 *
 * Класс отдаёт партии детерминированно — от номера смены, — иначе прогон
 * нельзя было бы повторить и сравнить два решения между собой.
 */

/** Виды лома и как они называются на приёмке. */
export const KINDS = {
  steel: 'сталь',
  copper: 'медь',
  plastic: 'пластик',
  slag: 'шлак',
};

/** Цены на отгрузке, ¢ за тонну. По ним считается выручка смены. */
export const PRICES = { steel: 320, copper: 900 };

/** Угар печи: доля массы, которая уходит в шлак при плавке. */
export const BURN_LOSS = 0.08;

/** Учебная партия: на ней считают примеры и проверки первых глав. */
export const SAMPLE_BATCH = [
  { id: 'A-1', kind: 'steel', mass: 40 },
  { id: 'A-2', kind: 'copper', mass: 12 },
  { id: 'A-3', kind: 'plastic', mass: 8 },
  { id: 'A-4', kind: 'steel', mass: 30 },
  { id: 'A-5', kind: 'slag', mass: 10 },
];

export class ScrapYard {
  constructor(seed = 1) {
    this.seed = seed;
  }

  /**
   * Простой линейный генератор: одна и та же смена даёт одну и ту же партию.
   * Берутся старшие биты — у младших period короткий, и вид лома вырождался
   * бы в один и тот же.
   */
  #next(state) {
    return (state * 1103515245 + 12345) % 2147483648;
  }

  /** Число 0…limit-1 из состояния генератора. */
  #pick(state, limit) {
    return Math.floor(state / 65536) % limit;
  }

  /**
   * Партия на смену. Состав меняется, общая масса держится около 100 т.
   * @param {number} shift номер смены, начиная с единицы
   */
  getBatch(shift = 1) {
    const kinds = Object.keys(KINDS);
    const batch = [];
    let state = this.#next(this.seed + shift * 7919);

    for (let index = 0; index < 5; index += 1) {
      state = this.#next(state);
      const kind = kinds[this.#pick(state, kinds.length)];
      state = this.#next(state);
      const mass = 8 + this.#pick(state, 33);

      batch.push({ id: `${shift}-${index + 1}`, kind, mass });
    }

    return batch;
  }
}
