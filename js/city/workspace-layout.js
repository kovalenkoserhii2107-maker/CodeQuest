export const WORKSPACE_LAYOUT_KEY = 'codequest.city.layout.v1';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
export function normalizeWorkspaceLayout(value) {
  return {
    filesWidth: number(value?.filesWidth, 180, 120, 420),
    outputShare: number(value?.outputShare, 46, 25, 75),
    filesHeight: number(value?.filesHeight, 560, 180, 1400),
    editorHeight: number(value?.editorHeight, 760, 420, 1600),
    dashboardHeight: number(value?.dashboardHeight, 480, 200, 1400),
    consoleHeight: number(value?.consoleHeight, 280, 160, 1200),
    outputOrder: value?.outputOrder === 'console-first' ? 'console-first' : 'dashboard-first'
  };
}
/** Changes geometry only: editor models, files, filters and world are never recreated. */
export class WorkspaceLayout {
  #root; #ide; #state; #storage; #observer; #drag; #cleanups = [];
  constructor(root, storage) {
    this.#root = root; this.#ide = root.querySelector('[data-ide]'); this.#storage = storage;
    try { this.#state = normalizeWorkspaceLayout(JSON.parse(storage?.getItem(WORKSPACE_LAYOUT_KEY) || 'null')); }
    catch { this.#state = normalizeWorkspaceLayout(); }
    const panelHandles = [['files', '.city-files-panel'], ['editor', '.city-ide-editor'], ['dashboard', '.city-dashboard-shell'], ['console', '[data-console]']];
    for (const [name, selector] of panelHandles) {
      const panel = root.querySelector(selector), handle = this.#handle(name + 'Height', 'horizontal', 'Высота: ' + ({files:'файлы', editor:'код', dashboard:'дашборд', console:'консоль'}[name]));
      panel.append(handle);
    }
    const files = this.#handle('filesWidth', 'vertical', 'Ширина списка файлов');
    const output = this.#handle('outputShare', 'vertical', 'Ширина дашборда и консоли');
    files.dataset.columnResize = 'files'; output.dataset.columnResize = 'output';
    this.#ide.querySelector('.city-files-panel').after(files);
    this.#ide.querySelector('.city-ide-editor').after(output);
    root.querySelector('[data-layout-swap]').onclick = () => {
      this.#state.outputOrder = this.#state.outputOrder === 'dashboard-first' ? 'console-first' : 'dashboard-first';
      this.#paint(); this.#save();
    };
    root.querySelector('[data-layout-reset]').onclick = () => { this.#state = normalizeWorkspaceLayout(); this.#paint(); this.#save(); };
    this.#observer = new ResizeObserver(() => this.#paint());
    this.#observer.observe(this.#ide);
    const escape = event => { if (event.key === 'Escape' && this.#drag) { event.preventDefault(); this.#finish(false); } };
    window.addEventListener('keydown', escape); this.#cleanups.push(() => window.removeEventListener('keydown', escape));
    this.#paint();
  }
  #save() {
    const status = this.#root.querySelector('[data-layout-status]');
    try { if (!this.#storage) throw Error(); this.#storage.setItem(WORKSPACE_LAYOUT_KEY, JSON.stringify(this.#state)); status.textContent = 'Размеры и порядок панелей сохранены'; }
    catch { status.textContent = 'Размеры изменены; сохранение в браузере недоступно'; }
  }
  #paint() {
    const width = this.#ide.clientWidth, state = this.#state;
    if (width > 0) {
      const files = Math.min(state.filesWidth, Math.max(120, width - 544));
      const available = Math.max(520, width - files - 24);
      const output = clamp(available * state.outputShare / 100, 260, available - 260);
      this.#ide.style.setProperty('--files-width', files + 'px');
      this.#ide.style.setProperty('--output-width', output + 'px');
    }
    for (const name of ['files', 'editor', 'dashboard', 'console']) this.#ide.style.setProperty('--' + name + '-height', state[name + 'Height'] + 'px');
    this.#ide.dataset.outputOrder = state.outputOrder;
    this.#root.querySelector('[data-layout-swap]').textContent = state.outputOrder === 'dashboard-first' ? 'Консоль наверх ↑' : 'Дашборд наверх ↑';
    for (const handle of this.#root.querySelectorAll('[data-panel-resize]')) {
      const key = handle.dataset.panelResize, value = Math.round(state[key]);
      handle.setAttribute('aria-valuenow', String(value));
      handle.setAttribute('aria-valuetext', value + (key === 'outputShare' ? '% рабочей области' : ' пикселей'));
    }
  }
  #change(key, amount) {
    const next = {...this.#state, [key]: this.#state[key] + amount};
    this.#state = normalizeWorkspaceLayout(next); this.#paint();
  }
  #handle(key, orientation, label) {
    const handle = document.createElement('div');
    handle.className = 'city-panel-resizer'; handle.dataset.panelResize = key;
    handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', orientation); handle.setAttribute('aria-label', label);
    const ranges = {filesWidth:[120,420], outputShare:[25,75], filesHeight:[180,1400], editorHeight:[420,1600], dashboardHeight:[200,1400], consoleHeight:[160,1200]};
    handle.setAttribute('aria-valuemin', String(ranges[key][0])); handle.setAttribute('aria-valuemax', String(ranges[key][1]));
    handle.tabIndex = 0; handle.title = label + ' · потяните или используйте стрелки';
    handle.onkeydown = event => {
      const minus = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp', plus = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';
      if (![minus,plus,'Home','End'].includes(event.key)) return;
      event.preventDefault(); const step = key === 'outputShare' ? 2 : 20;
      if (event.key === 'Home' || event.key === 'End') this.#state[key] = ranges[key][event.key === 'Home' ? 0 : 1];
      else this.#change(key, event.key === plus ? step : -step);
      this.#paint(); this.#save();
    };
    handle.onpointerdown = event => {
      if (event.button !== 0 || this.#drag) return;
      event.preventDefault(); handle.focus({preventScroll:true});
      this.#drag = {handle, id:event.pointerId, key, orientation, x:event.clientX, y:event.clientY, initial:{...this.#state}};
      handle.setPointerCapture(event.pointerId); document.body.classList.add('city-is-resizing');
    };
    handle.onpointermove = event => {
      const drag = this.#drag; if (!drag || drag.handle !== handle || drag.id !== event.pointerId) return;
      let delta = orientation === 'vertical' ? event.clientX - drag.x : event.clientY - drag.y;
      if (key === 'outputShare') delta = -delta * 100 / Math.max(520, this.#ide.clientWidth - this.#state.filesWidth - 24);
      this.#state = normalizeWorkspaceLayout({...drag.initial, [key]:drag.initial[key] + delta}); this.#paint();
    };
    handle.onpointerup = event => { if (this.#drag?.handle === handle && this.#drag.id === event.pointerId) this.#finish(true); };
    handle.onpointercancel = event => { if (this.#drag?.handle === handle && this.#drag.id === event.pointerId) this.#finish(false); };
    handle.onlostpointercapture = () => { if (this.#drag) this.#finish(false); };
    return handle;
  }
  #finish(save) {
    const drag = this.#drag; if (!drag) return; this.#drag = null;
    if (!save) this.#state = drag.initial;
    if (drag.handle.hasPointerCapture(drag.id)) drag.handle.releasePointerCapture(drag.id);
    document.body.classList.remove('city-is-resizing'); this.#paint(); if (save) this.#save();
  }
  dispose() { this.#finish(false); this.#observer.disconnect(); this.#cleanups.forEach(cleanup => cleanup()); }
}
