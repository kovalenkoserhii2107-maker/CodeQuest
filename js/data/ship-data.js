/**
 * «Боевые» данные корабля. На них работает Мостик: виджеты считаются не
 * заранее заготовленными формулами, а функциями, которые написал игрок.
 */
export const SHIP = {
  name: 'Квест',
  fuel: { current: 318, capacity: 400 },
  reactor: { temperature: 742, pressure: 8 },

  cargo: [
    { name: 'Руда «Церера-7»', mass: 180 },
    { name: 'Питьевая вода', mass: 45 },
    { name: 'Иридиевые ячейки', mass: 12 },
    { name: 'Титановый прокат', mass: 260 },
    { name: 'Медицинский блок', mass: 30 },
  ],
  containerCapacity: 200,
  heavyLimit: 100,

  signal: '#SOS_ГЕЛИОС-9_ЖДЁМ_БУКСИР#_',
  telemetry: 'fuel=79;shield=54;crew=12;temp=742',

  routes: [
    { to: 'Церера', hours: 40, reward: 820 },
    { to: 'Титан', hours: 12, reward: 310 },
    { to: 'Марс', hours: 26, reward: 640 },
    { to: 'Фобос', hours: 12, reward: 290 },
  ],
  lookupRoute: 'Марс',

  shieldGrid: [
    [88, 74, 91],
    [63, 41, 70],
    [95, 86, 58],
  ],
  reinforceAmount: 12,

  probeSamples: [14, 19, 23],
};
