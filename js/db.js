/**
 * Бортовая база данных корпорации.
 *
 * Обычное хранилище коллекций с записями: insert, get, find, update, remove.
 * Именно сюда код игрока складывает всё, что создаёт, и отсюда же панели
 * дашборда берут данные. Хранится вместе с прогрессом, переживает перезагрузку.
 *
 * Данные — простые объекты: в базе нет ни функций, ни классов, чтобы записи
 * можно было сохранить в localStorage и передать в воркер.
 */

/** Коллекции, которые база знает изначально. Свои можно создавать на ходу. */
export const KNOWN_COLLECTIONS = [
  { name: 'commanders', title: 'Командиры' },
  { name: 'shipyards', title: 'Верфи' },
  { name: 'warehouses', title: 'Склады' },
  { name: 'crew', title: 'Экипаж' },
  { name: 'ships', title: 'Корабли' },
  { name: 'reports', title: 'Отчёты' },
  { name: 'plans', title: 'Полётные планы' },
  { name: 'expeditions', title: 'Экспедиции' },
  { name: 'deals', title: 'Сделки' },
  { name: 'logs', title: 'Журнал' },
];

const MAX_RECORDS = 200;
const NAME_PATTERN = /^[a-zA-Z_][\w-]{0,30}$/;

/** Копия без функций: в базе хранятся только данные. */
function plain(value, seen = new WeakSet()) {
  if (typeof value === 'function') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[циклическая ссылка]';
  seen.add(value);

  if (Array.isArray(value)) return value.map(item => plain(item, seen));

  const copy = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'function') continue;
    copy[key] = plain(item, seen);
  }
  return copy;
}

export class Database {
  /**
   * @param {object} store хранилище коллекций: { name: { seq, records: [] } }
   * @param {Function} [onChange] вызывается после каждой записи
   */
  constructor(store = {}, onChange = null) {
    this.store = store;
    this.onChange = onChange;
  }

  /** Коллекция по имени; создаётся при первом обращении. */
  collection(name) {
    if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
      throw new Error(`Плохое имя коллекции: ${JSON.stringify(name)}. Латиница, цифры и _`);
    }
    if (!this.store[name]) this.store[name] = { seq: 0, records: [] };
    return this.store[name];
  }

  /** Список коллекций с количеством записей. */
  collections() {
    const known = KNOWN_COLLECTIONS.map(item => item.name);
    const names = [...new Set([...known, ...Object.keys(this.store)])];
    return names.map(name => ({
      name,
      title: KNOWN_COLLECTIONS.find(item => item.name === name)?.title ?? name,
      count: this.store[name]?.records.length ?? 0,
      custom: !known.includes(name),
    }));
  }

  /** Добавить запись. Возвращает её вместе с присвоенным id. */
  insert(name, record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('В базу можно положить только объект-запись');
    }

    const target = this.collection(name);
    if (target.records.length >= MAX_RECORDS) {
      throw new Error(`В коллекции ${name} уже ${MAX_RECORDS} записей — удалите лишние`);
    }

    target.seq += 1;
    const saved = { id: target.seq, ...plain(record), savedAt: new Date().toISOString() };
    target.records.push(saved);
    this.onChange?.();
    return saved;
  }

  /** Все записи коллекции. */
  all(name) {
    return this.collection(name).records.map(record => ({ ...record }));
  }

  /** Запись по id. */
  get(name, id) {
    return this.all(name).find(record => record.id === id) ?? null;
  }

  /** Последняя добавленная запись — самый частый случай. */
  last(name) {
    const records = this.collection(name).records;
    return records.length ? { ...records[records.length - 1] } : null;
  }

  /** Первая запись, подошедшая под условие. */
  find(name, predicate) {
    if (typeof predicate !== 'function') throw new Error('find ждёт функцию-условие');
    return this.all(name).find(record => predicate(record)) ?? null;
  }

  /** Все записи, подошедшие под условие. */
  filter(name, predicate) {
    if (typeof predicate !== 'function') throw new Error('filter ждёт функцию-условие');
    return this.all(name).filter(record => predicate(record));
  }

  /** Изменить запись: поля из patch заменяют старые. */
  update(name, id, patch) {
    const target = this.collection(name);
    const record = target.records.find(item => item.id === id);
    if (!record) return null;

    Object.assign(record, plain(patch ?? {}), { id: record.id });
    this.onChange?.();
    return { ...record };
  }

  /** Удалить запись. */
  remove(name, id) {
    const target = this.collection(name);
    const index = target.records.findIndex(item => item.id === id);
    if (index === -1) return false;

    target.records.splice(index, 1);
    this.onChange?.();
    return true;
  }

  count(name) {
    return this.collection(name).records.length;
  }

  /** Снимок для передачи в воркер: там код игрока работает с копией. */
  snapshot() {
    const copy = {};
    for (const [name, collection] of Object.entries(this.store)) {
      copy[name] = { seq: collection.seq, records: collection.records.map(record => ({ ...record })) };
    }
    return copy;
  }
}
