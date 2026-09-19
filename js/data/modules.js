/**
 * Модули корабля. Каждый модуль прокачивается за решённые задачи:
 * уровень модуля = количество решённых задач его ветки (максимум maxLevel).
 */
export const MODULES = [
  {
    id: 'base',
    name: 'Космопорт',
    icon: '⌂',
    maxLevel: 2,
    theme: 'Объекты, создание и мутация',
    bonus: level => `Репутация +${level * 50}`,
  },
  {
    id: 'reactor',
    name: 'Реактор',
    icon: '⚛',
    maxLevel: 2,
    theme: 'Переменные, числа, условия',
    bonus: level => `Энерговыход +${level * 25} МВт`,
  },
  {
    id: 'cargo',
    name: 'Грузовой трюм',
    icon: '▦',
    maxLevel: 3,
    theme: 'Массивы: map, filter, reduce',
    bonus: level => `Вместимость +${level * 120} т`,
  },
  {
    id: 'comms',
    name: 'Антенна связи',
    icon: '((•))',
    maxLevel: 2,
    theme: 'Строки и объекты',
    bonus: level => `Дальность связи +${level * 4} а.е.`,
  },
  {
    id: 'navigation',
    name: 'Навигационный блок',
    icon: '✦',
    maxLevel: 3,
    theme: 'Сортировка, поиск, функции высшего порядка',
    bonus: level => `Точность прыжка +${level * 15} %`,
  },
  {
    id: 'shields',
    name: 'Щиты',
    icon: '◇',
    maxLevel: 2,
    theme: 'Вложенные массивы и циклы',
    bonus: level => `Поглощение урона +${level * 20} %`,
  },
  {
    id: 'lab',
    name: 'Лаборатория',
    icon: '⚗',
    maxLevel: 2,
    theme: 'Классы и асинхронность',
    bonus: level => `Скорость анализа +${level * 30} %`,
  },
];

/** Быстрый доступ к модулю по id. */
export const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));
