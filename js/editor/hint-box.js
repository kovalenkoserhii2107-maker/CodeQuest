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

/** Изменение размера за правый нижний угол. */
export function resizeBox(box, dx, dy, bounds) {
  const maxWidth = bounds.width - box.left - MARGIN;
  const maxHeight = bounds.height - box.top - MARGIN;

  return {
    ...box,
    width: Math.max(MIN_WIDTH, Math.min(box.width + dx, Math.max(MIN_WIDTH, maxWidth))),
    height: Math.max(MIN_HEIGHT, Math.min(box.height + dy, Math.max(MIN_HEIGHT, maxHeight))),
  };
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
