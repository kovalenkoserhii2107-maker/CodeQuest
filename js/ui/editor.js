/**
 * Редактор кода: подсветка синтаксиса, номера строк, парные скобки,
 * умные отступы и автодополнение с окном описания.
 *
 * Собран на обычном textarea со слоем подсветки под ним — так сохраняются
 * системная каретка, выделение, буфер обмена и отмена (Ctrl+Z), а весь
 * «умный» ввод сводится к чистым функциям из js/editor/.
 */
import {
  handleEnter,
  handleChar,
  handleBackspace,
  handleTab,
  toggleComment,
  dedentClosingBrace,
} from '../editor/edit-ops.js';
import { highlight } from '../editor/highlight.js';
import { suggest } from '../editor/complete.js';
import {
  boxNearCaret, clampBox, defaultSize, forgetBox, loadBox, moveBox, resizeBox, saveBox,
} from '../editor/hint-box.js';
import { escapeHtml } from './html.js';

const MAX_ITEMS = 9;

/** Минимальная правка текста: сохраняет историю отмены браузера. */
function applyEdit(textarea, result) {
  const oldValue = textarea.value;
  const newValue = result.value;

  if (newValue !== oldValue) {
    let start = 0;
    while (start < oldValue.length && start < newValue.length && oldValue[start] === newValue[start]) start += 1;

    let endOld = oldValue.length;
    let endNew = newValue.length;
    while (endOld > start && endNew > start && oldValue[endOld - 1] === newValue[endNew - 1]) {
      endOld -= 1;
      endNew -= 1;
    }

    textarea.setSelectionRange(start, endOld);
    const inserted = newValue.slice(start, endNew);
    let ok = false;
    try {
      ok = document.execCommand('insertText', false, inserted);
    } catch {
      ok = false;
    }
    if (!ok) {
      textarea.value = newValue;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  const start = result.start ?? result.cursor;
  const end = result.end ?? result.cursor;
  textarea.setSelectionRange(start, end);
}

/** Координаты каретки внутри поля — по ним позиционируется подсказка. */
function caretPosition(textarea, mirror, index) {
  const styles = getComputedStyle(textarea);
  for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'border', 'boxSizing', 'whiteSpace', 'wordWrap', 'tabSize']) {
    mirror.style[property] = styles[property];
  }
  mirror.style.width = `${textarea.clientWidth}px`;

  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.append(marker);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;
  mirror.textContent = '';
  return { top, left, lineHeight: parseFloat(styles.lineHeight) || 20 };
}

/** Карточка описания справа от списка подсказок. */
function docHtml(item) {
  if (!item) return '';
  return `
    <p class="hintdoc__signature mono">${escapeHtml(item.signature)}</p>
    <p class="hintdoc__kind">${escapeHtml(item.kind)}${item.owner && item.owner !== 'global' ? ` · ${escapeHtml(item.owner)}` : ''}</p>
    <p class="hintdoc__summary">${escapeHtml(item.summary)}</p>
    <p class="hintdoc__details">${escapeHtml(item.details)}</p>
    ${item.mutates ? '<p class="hintdoc__warn">⚠ Меняет исходные данные — при необходимости работайте с копией.</p>' : ''}
    <p class="hintdoc__returns"><span>Возвращает:</span> ${escapeHtml(item.returns)}</p>
    <pre class="hintdoc__example mono">${escapeHtml(item.example)}</pre>
  `;
}

/**
 * Создаёт редактор внутри контейнера.
 * @param {HTMLElement} container куда вставить
 * @param {{value: string, onInput: Function, onRun: Function}} options
 */
export function createEditor(container, { value = '', onInput, onRun } = {}) {
  container.innerHTML = `
    <div class="editor">
      <div class="editor__gutter" aria-hidden="true"></div>
      <div class="editor__area">
        <pre class="editor__highlight" aria-hidden="true"><code></code></pre>
        <textarea id="code" class="editor__input mono" spellcheck="false" autocomplete="off"
                  autocapitalize="off" autocorrect="off" wrap="off"
                  aria-label="Код решения"></textarea>
        <div class="editor__mirror" aria-hidden="true"></div>
      </div>
      <div class="hint" hidden>
        <div class="hint__bar">
          <span class="hint__title">Справочник</span>
          <span class="hint__drag-hint">перетащите за заголовок</span>
          <button class="hint__action" type="button" data-action="reset" title="Вернуть окно к курсору" aria-label="Вернуть окно к курсору">⤣</button>
          <button class="hint__action" type="button" data-action="close" title="Закрыть подсказки" aria-label="Закрыть подсказки">×</button>
        </div>
        <div class="hint__body">
          <ul class="hint__list" role="listbox" aria-label="Подсказки"></ul>
          <div class="hintdoc"></div>
        </div>
        <span class="hint__grip" title="Потяните, чтобы изменить размер"></span>
      </div>
    </div>
    <p class="editor__legend">
      <span><b>Ctrl + Space</b> — подсказки</span>
      <span><b>Ctrl + Enter</b> — запустить тесты</span>
      <span><b>Ctrl + /</b> — комментарий</span>
      <span><b>Tab</b> — отступ</span>
    </p>
  `;

  const textarea = container.querySelector('.editor__input');
  const highlightLayer = container.querySelector('.editor__highlight code');
  const gutter = container.querySelector('.editor__gutter');
  const mirror = container.querySelector('.editor__mirror');
  const hint = container.querySelector('.hint');
  const hintBar = container.querySelector('.hint__bar');
  const hintGrip = container.querySelector('.hint__grip');
  const list = container.querySelector('.hint__list');
  const doc = container.querySelector('.hintdoc');
  const editorEl = container.querySelector('.editor');

  textarea.value = value;

  let items = [];
  let active = 0;
  let replaceFrom = 0;
  // Положение и размер окна подсказок: null — окно следует за кареткой
  let box = loadBox();
  // Пока тащим окно или жмём его кнопки, поле ввода теряет фокус — но окно
  // закрывать нельзя, иначе перетащить его невозможно
  let holdingHint = false;

  /* --- отрисовка ------------------------------------------------------- */

  function renderGutter() {
    const lines = textarea.value.split('\n').length;
    gutter.innerHTML = Array.from({ length: lines }, (_, index) => `<span>${index + 1}</span>`).join('');
    gutter.scrollTop = textarea.scrollTop;
  }

  function render() {
    highlightLayer.innerHTML = highlight(textarea.value);
    renderGutter();
    syncScroll();
  }

  function syncScroll() {
    const layer = highlightLayer.parentElement;
    layer.scrollTop = textarea.scrollTop;
    layer.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  }

  /* --- подсказки -------------------------------------------------------- */

  function hideHint() {
    hint.hidden = true;
    items = [];
  }

  function bounds() {
    return { width: editorEl.clientWidth, height: editorEl.clientHeight };
  }

  function applyBox(next) {
    hint.style.left = `${next.left}px`;
    hint.style.top = `${next.top}px`;
    hint.style.width = `${next.width}px`;
    hint.style.height = `${next.height}px`;
  }

  /** Окно либо стоит там, куда его поставили, либо идёт за кареткой. */
  function placeHint() {
    const area = bounds();
    const size = box ? { width: box.width, height: box.height } : defaultSize(area);

    if (box?.pinned) {
      const placed = clampBox({ ...size, left: box.left, top: box.top }, area);
      applyBox(placed);
      hint.classList.add('is-pinned');
      return;
    }

    const caret = caretPosition(textarea, mirror, textarea.selectionStart);
    const placed = boxNearCaret(
      { top: caret.top, left: caret.left + gutter.offsetWidth, lineHeight: caret.lineHeight },
      size,
      area,
    );
    applyBox(placed);
    hint.classList.remove('is-pinned');
  }

  /** Общая механика «зажали — тянем»: и для переноса, и для размера. */
  function startPointerAction(event, onMove) {
    event.preventDefault();          // не отбираем фокус у поля ввода
    event.stopPropagation();
    holdingHint = true;

    const startX = event.clientX;
    const startY = event.clientY;
    const startBox = {
      left: hint.offsetLeft,
      top: hint.offsetTop,
      width: hint.offsetWidth,
      height: hint.offsetHeight,
    };

    const move = moveEvent => {
      const next = onMove(startBox, moveEvent.clientX - startX, moveEvent.clientY - startY, bounds());
      applyBox(next);
      box = { ...next, pinned: true };
    };

    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      if (box) saveBox(box);
      hint.classList.add('is-pinned');
      holdingHint = false;
      textarea.focus();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }

  hintBar.addEventListener('pointerdown', event => {
    if (event.target.closest('.hint__action')) return;
    startPointerAction(event, (start, dx, dy, area) => moveBox(start, dx, dy, area));
  });

  hintGrip.addEventListener('pointerdown', event => {
    startPointerAction(event, (start, dx, dy, area) => resizeBox(start, dx, dy, area));
  });

  hintBar.addEventListener('pointerdown', event => {
    if (event.target.closest('.hint__action')) holdingHint = true;
  });

  hintBar.addEventListener('click', event => {
    const action = event.target.closest('.hint__action')?.dataset.action;
    if (!action) return;
    event.preventDefault();
    holdingHint = false;

    if (action === 'close') {
      hideHint();
      return;
    }

    // Возврат к каретке: размер сохраняем, привязку к месту снимаем
    box = box ? { ...box, pinned: false } : null;
    if (box) saveBox(box);
    else forgetBox();
    placeHint();
    textarea.focus();
  });

  function renderHint() {
    list.innerHTML = items
      .map(
        (item, index) => `
          <li class="hint__item${index === active ? ' is-active' : ''}" role="option"
              aria-selected="${index === active}" data-index="${index}">
            <span class="hint__name mono">${escapeHtml(item.name)}</span>
            <span class="hint__owner">${escapeHtml(item.owner === 'global' ? item.kind : item.owner)}</span>
          </li>`,
      )
      .join('');
    doc.innerHTML = docHtml(items[active]);

    hint.hidden = false;
    placeHint();
  }

  function showHint({ force = false } = {}) {
    const cursor = textarea.selectionStart;
    if (cursor !== textarea.selectionEnd) return hideHint();

    const result = suggest(textarea.value, cursor, { minPrefix: force ? 0 : 1 });
    if (result.items.length === 0) return hideHint();

    items = result.items.slice(0, MAX_ITEMS);
    replaceFrom = result.from;
    active = 0;
    renderHint();
  }

  function acceptHint() {
    const item = items[active];
    if (!item) return;

    const cursor = textarea.selectionStart;
    const before = textarea.value.slice(0, replaceFrom);
    const after = textarea.value.slice(cursor);
    const insert = item.insert;

    // Метод вставляется со скобками, курсор — внутри них
    const needsClosing = insert.endsWith('(');
    const text = needsClosing ? `${insert})` : insert;
    const caret = replaceFrom + insert.length;

    applyEdit(textarea, { value: before + text + after, start: caret, end: caret });
    hideHint();
    render();
    onInput?.(textarea.value);
  }

  list.addEventListener('mousedown', event => {
    const target = event.target.closest('.hint__item');
    if (!target) return;
    event.preventDefault();
    active = Number(target.dataset.index);
    acceptHint();
  });

  /* --- ввод ------------------------------------------------------------- */

  textarea.addEventListener('input', () => {
    render();
    onInput?.(textarea.value);
    showHint();
  });

  textarea.addEventListener('scroll', syncScroll);
  textarea.addEventListener('blur', event => {
    if (holdingHint || hint.contains(event.relatedTarget)) return;
    setTimeout(() => {
      if (!holdingHint) hideHint();
    }, 120);
  });
  textarea.addEventListener('click', hideHint);

  textarea.addEventListener('keydown', event => {
    const { value: text, selectionStart: start, selectionEnd: end } = textarea;
    const hintOpen = !hint.hidden && items.length > 0;

    // Навигация по подсказкам
    if (hintOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        active = (active + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        renderHint();
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        acceptHint();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        hideHint();
        return;
      }
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      hideHint();
      onRun?.();
      return;
    }

    if (event.code === 'Space' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      showHint({ force: true });
      return;
    }

    if (event.key === '/' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      applyEdit(textarea, toggleComment(text, start, end));
      render();
      onInput?.(textarea.value);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      applyEdit(textarea, handleTab(text, start, end, event.shiftKey));
      render();
      onInput?.(textarea.value);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      applyEdit(textarea, handleEnter(text, start, end));
      render();
      onInput?.(textarea.value);
      return;
    }

    if (event.key === 'Backspace') {
      const result = handleBackspace(text, start, end);
      if (result) {
        event.preventDefault();
        applyEdit(textarea, result);
        render();
        onInput?.(textarea.value);
        hideHint();
      }
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const dedent = dedentClosingBrace(text, start, event.key);
      if (dedent && start === end) {
        event.preventDefault();
        applyEdit(textarea, dedent);
        render();
        onInput?.(textarea.value);
        return;
      }

      const result = handleChar(text, start, end, event.key);
      if (result) {
        event.preventDefault();
        applyEdit(textarea, result);
        render();
        onInput?.(textarea.value);
        if (event.key === '.') showHint();
      }
    }
  });

  // Точка открывает список методов сразу после ввода
  textarea.addEventListener('keyup', event => {
    if (event.key === '.') showHint({ force: true });
  });

  render();

  return {
    getValue: () => textarea.value,
    setValue: next => {
      textarea.value = next;
      render();
      hideHint();
    },
    focus: () => textarea.focus(),
    element: textarea,
  };
}
