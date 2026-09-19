/**
 * Геометрия окна подсказок: размеры, перетаскивание и удержание внутри
 * редактора. Чистые функции — без DOM, поэтому проверяются обычными тестами.
 *
 * Прямоугольник: { left, top, width, height }, координаты — относительно
 * редактора. Границы bounds: { width, height }.
 */

export const MIN_WIDTH = 260;
export const MIN_HEIGHT = 150;
export const MARGIN = 8;

/** Размер по умолчанию: удобный на большом экране, ужатый на маленьком. */
export function defaultSize(bounds) {
  return {
    width: Math.max(MIN_WIDTH, Math.min(520, bounds.width - MARGIN * 2)),
    height: Math.max(MIN_HEIGHT, Math.min(260, bounds.height - MARGIN * 2)),
  };
}

/** Не даём окну вылезти за пределы редактора. */
export function clampBox(box, bounds) {
  const width = Math.min(Math.max(box.width, MIN_WIDTH), Math.max(MIN_WIDTH, bounds.width - MARGIN * 2));
  const height = Math.min(Math.max(box.height, MIN_HEIGHT), Math.max(MIN_HEIGHT, bounds.height - MARGIN * 2));

  return {
    width,
    height,
    left: Math.max(0, Math.min(box.left, bounds.width - width - MARGIN)),
    top: Math.max(0, Math.min(box.top, bounds.height - height - MARGIN)),
  };
}

/**
 * Положение рядом с кареткой: под строкой, а если снизу не помещается —
 * над ней. По горизонтали прижимается к правому краю редактора.
 */
export function boxNearCaret(caret, size, bounds) {
  const belowTop = caret.top + caret.lineHeight + 6;
  const fitsBelow = belowTop + size.height + MARGIN <= bounds.height;
  const top = fitsBelow ? belowTop : caret.top - size.height - 6;

  return clampBox({ ...size, left: caret.left, top }, bounds);
}

/** Перетаскивание на смещение мыши. */
export function moveBox(box, dx, dy, bounds) {
  return clampBox({ ...box, left: box.left + dx, top: box.top + dy }, bounds);
}

/**
 * Изменение размера за любую сторону или угол.
 *
 * edge — набор букв сторон: 'n', 's', 'e', 'w' и их сочетания ('se', 'nw').
 * Тянем за левую или верхнюю сторону — вместе с размером двигается и угол,
 * противоположная сторона остаётся на месте.
 */
export function resizeBoxEdge(box, edge, dx, dy, bounds) {
  let { left, top, width, height } = box;

  if (edge.includes('e')) {
    width = Math.min(width + dx, bounds.width - left - MARGIN);
  }
  if (edge.includes('s')) {
    height = Math.min(height + dy, bounds.height - top - MARGIN);
  }
  if (edge.includes('w')) {
    const right = left + width;
    left = Math.max(0, Math.min(left + dx, right - MIN_WIDTH));
    width = right - left;
  }
  if (edge.includes('n')) {
    const bottom = top + height;
    top = Math.max(0, Math.min(top + dy, bottom - MIN_HEIGHT));
    height = bottom - top;
  }

  // Меньше минимума не ужимаем, но и противоположную сторону не тянем
  if (width < MIN_WIDTH) {
    if (edge.includes('w')) left = Math.max(0, left - (MIN_WIDTH - width));
    width = MIN_WIDTH;
  }
  if (height < MIN_HEIGHT) {
    if (edge.includes('n')) top = Math.max(0, top - (MIN_HEIGHT - height));
    height = MIN_HEIGHT;
  }

  return clampBox({ left, top, width, height }, bounds);
}

/** Изменение размера за правый нижний угол — частый случай. */
export function resizeBox(box, dx, dy, bounds) {
  return resizeBoxEdge(box, 'se', dx, dy, bounds);
}

const STORAGE_KEY = 'codequest.hint.box';

/** Сохранённое положение и размер окна. */
export function loadBox() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.width === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveBox(box) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(box));
  } catch {
    /* приватный режим — окно просто не запомнит место */
  }
}

export function forgetBox() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ничего страшного */
  }
}
