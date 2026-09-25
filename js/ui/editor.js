/** Desktop learning editor. Monaco is loaded locally; no remote CDN. */
import { JS_API } from '../data/js-api.js';
import { suggest, inferType } from '../editor/complete.js';
import { escapeHtml } from './html.js';
import { liveFunctions } from '../state.js';
let runtime;
let serial = 0;
function markdown(item) {
  return { value: `**${item.signature}**\n\n${item.summary}\n\n${item.details}\n\n**Возвращает:** ${item.returns}${item.mutates ? '\n\n⚠ Изменяет исходные данные. Если нужна исходная версия, сделайте копию.' : ''}\n\n\`\`\`javascript\n${item.example}\n\`\`\``, isTrusted: false };
}
function loadRuntime() {
  if (runtime) return runtime;
  globalThis.MonacoEnvironment = { getWorker(_id, label) {
    return new Worker(new URL(label === 'javascript' || label === 'typescript' ? '../../vendor/ts.worker.js' : '../../vendor/editor.worker.js', import.meta.url), { type: 'module' });
  } };
  runtime = import('../../vendor/editor.js').then(m => {
    m.typescript.javascriptDefaults.setCompilerOptions({ allowJs: true, checkJs: true, target: m.typescript.ScriptTarget.ESNext, noEmit: true });
    m.typescript.javascriptDefaults.setDiagnosticsOptions({ noSyntaxValidation: false, noSemanticValidation: false });
    m.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['.'],
      provideCompletionItems(model, pos) {
        const result = suggest(model.getValue(), model.getOffsetAt(pos), { minPrefix: 0 });
        const start = model.getPositionAt(result.from);
        return { suggestions: result.items.filter(item => item.owner !== 'ваш код').map(item => ({
          label: { label: item.name, description: `${item.owner} · справочник` },
          kind: m.languages.CompletionItemKind.Method,
          insertText: item.insert.endsWith('(') ? `${item.insert}$0)` : item.insert,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: new m.Range(start.lineNumber,start.column,pos.lineNumber,pos.column),
          detail: item.signature, documentation: markdown(item), sortText: '0'+item.name,
        })) };
      },
    });
    m.languages.registerHoverProvider('javascript', { provideHover(model,pos) {
      const word = model.getWordAtPosition(pos);
      if (!word) return null;
      const line = model.getLineContent(pos.lineNumber).slice(0,word.startColumn-1);
      const receiver = line.match(/([\w$]+)\.$/)?.[1];
      const type = receiver ? inferType(model.getValue(),receiver) : null;
      const item = JS_API.find(i => i.name === word.word && (!type || i.owner === type));
      return item ? { range: new m.Range(pos.lineNumber,word.startColumn,pos.lineNumber,word.endColumn), contents:[markdown(item)] } : null;
    } });
    return m;
  }).catch(error => { runtime = null; throw error; });
  return runtime;
}

export function createEditor(container, { value='', onInput, onRun, filename='solution.js', functionName='', toolsContainer=null, siblings=null }={}) {
  let editor, model, m, disposed = false, wrap = false;
  // Соседние файлы проекта: без них редактор считает «./sort.js» ненайденным
  // модулем и рисует ошибку на верном коде
  const siblingModels = new Map();
  let folder = '';
  const cleanups=[];
  const track = disposable => cleanups.push(() => disposable.dispose());
  container.innerHTML=`
    <div class="workspace-toolbar">
      <span class="mono">${escapeHtml(filename)}</span>
      <button type="button" class="btn btn--ghost btn--sm" data-tool="format" disabled>Форматировать</button>
      <button type="button" class="btn btn--ghost btn--sm" data-tool="find" disabled>Найти</button>
      <button type="button" class="btn btn--ghost btn--sm" data-tool="wrap" disabled>Перенос строк</button>
      <button type="button" class="btn btn--ghost btn--sm" data-tool="focus">Развернуть</button>
    </div>
    <div class="monaco-host"><textarea class="editor-loading" aria-label="Код решения" spellcheck="false"></textarea></div>
    <div class="workspace-status" aria-live="polite">Подключаем редактор…</div>
    <details class="workspace-problems"><summary>Диагностика JavaScript <span data-count></span></summary><div data-problems></div></details>
    <details class="workspace-reference"><summary>Справочник JavaScript · объяснения и примеры</summary>
      <label>Найти метод <input type="search" placeholder="Например: reduce, find, Math.ceil" aria-label="Поиск в справочнике"></label>
      <div data-reference></div>
    </details>
    <p class="editor__legend"><span>Ctrl/Cmd + Space — подсказки</span><span>Ctrl/Cmd + Enter — тесты</span><span>Shift + Alt + F — форматирование</span><span>F1 — команды редактора</span></p>`;
  const host=container.querySelector('.monaco-host');
  const fallback=host.querySelector('textarea'); fallback.value=value;
  fallback.addEventListener('input',()=>onInput?.(fallback.value));
  const status=container.querySelector('.workspace-status');
  const reference=container.querySelector('[data-reference]');
  function referenceList(query='') {
    const normalized=query.toLowerCase().trim();
    const entries=JS_API.filter(item => !normalized || `${item.owner}.${item.name} ${item.summary}`.toLowerCase().includes(normalized));
    reference.innerHTML=entries.slice(0,30).map(item=>`<article class="reference-entry"><h4 class="mono">${escapeHtml(item.signature)}</h4><p>${escapeHtml(item.summary)}</p><p>${escapeHtml(item.details)}</p><p>Возвращает: ${escapeHtml(item.returns)}</p>${item.mutates?'<p class="is-danger">Изменяет исходные данные.</p>':''}<pre>${escapeHtml(item.example)}</pre></article>`).join('') || '<p>Ничего не найдено.</p>';
  }
  referenceList();
  container.querySelector('input[type=search]').addEventListener('input',event=>referenceList(event.target.value));
  const wrapper=container.closest('.task-workspace') ?? container;
  const count=container.querySelector('[data-count]');
  const problems=container.querySelector('[data-problems]');
  if (toolsContainer) {
    for (const node of container.querySelectorAll('.workspace-problems, .workspace-reference, .editor__legend')) toolsContainer.append(node);
  }
  container.querySelector('[data-tool=focus]').addEventListener('click',event=>{
    wrapper.classList.toggle('is-expanded');
    event.currentTarget.textContent=wrapper.classList.contains('is-expanded')?'Свернуть':'Развернуть';
    editor?.layout();
  });
  const escape=event=>{if(event.key==='Escape'&&wrapper.classList.contains('is-expanded')){wrapper.classList.remove('is-expanded');container.querySelector('[data-tool=focus]').textContent='Развернуть';editor?.layout();}};
  window.addEventListener('keydown',escape);cleanups.push(()=>window.removeEventListener('keydown',escape));
  loadRuntime().then(monaco=>{
    if(disposed) return;
    m=monaco;
    const dependencies=liveFunctions().filter(item=>item.fn!==functionName).map(item=>{
      const parameters=item.stage.solution.match(/function\s+\w+\s*\(([^)]*)\)/)?.[1] ?? '...args';
      return `/** ${item.stage.title}. ${item.stage.signature} */\ndeclare function ${item.fn}(${parameters.split(',').filter(Boolean).map(p=>`${p.trim()}: any`).join(',')}): any;`;
    }).join('\n');
    // Проект на чистом JavaScript: жалобы на «неявный any» здесь только шум,
    // и они мешают отличить их от настоящих ошибок
    m.typescript.javascriptDefaults.setDiagnosticsOptions({
      diagnosticCodesToIgnore:[7005,7006,7008,7016,7031,7034,7043,7044],
    });
    track(m.typescript.javascriptDefaults.addExtraLib(dependencies,`file:///dependencies-${++serial}.d.ts`));
    folder=`file:///quests/${serial}`;
    model=m.editor.createModel(fallback.value,'javascript',m.Uri.parse(`${folder}/${filename}`));
    if(siblings) syncSiblings(siblings);
    host.replaceChildren();
    editor=m.editor.create(host,{
      model, automaticLayout:true, fontFamily:getComputedStyle(document.documentElement).getPropertyValue('--font-mono'),
      fontSize:15, lineHeight:24, minimap:{enabled:false}, scrollBeyondLastLine:false,
      tabSize:2, insertSpaces:true, folding:true, bracketPairColorization:{enabled:true},
      padding:{top:16,bottom:16}, quickSuggestions:true, parameterHints:{enabled:true},
      suggest:{showWords:false}, suggestFontSize:14, suggestLineHeight:24,
      scrollbar:{alwaysConsumeMouseWheel:false},
      ariaLabel:'Код решения', fixedOverflowWidgets:true,
    });
    function theme(){
      const css=getComputedStyle(document.documentElement);
      const color=name=>css.getPropertyValue(name).trim();
      const light=document.documentElement.dataset.theme==='light';
      // Подсветка берётся из тех же токенов, что и остальной код на странице:
      // Monaco ждёт hex без решётки, поэтому её снимаем
      const tok=name=>color(name).replace('#','');
      const rules=[
        {token:'keyword',foreground:tok('--tok-keyword'),fontStyle:'bold'},
        {token:'keyword.json',foreground:tok('--tok-keyword')},
        {token:'comment',foreground:tok('--tok-comment'),fontStyle:'italic'},
        {token:'string',foreground:tok('--tok-string')},
        {token:'string.escape',foreground:tok('--tok-string')},
        {token:'number',foreground:tok('--tok-number')},
        {token:'regexp',foreground:tok('--tok-string')},
        {token:'type',foreground:tok('--tok-call')},
        {token:'delimiter',foreground:tok('--tok-literal')},
        {token:'identifier',foreground:tok('--tok-word')},
      ];
      m.editor.defineTheme('codequest',{base:light?'vs':'vs-dark',inherit:true,rules,colors:{
        'editor.background':color('--code-bg'),'editor.foreground':color('--code-text'),
        'editorLineNumber.foreground':color('--color-dim'),'editorCursor.foreground':color('--color-accent'),
        'editorWidget.background':color('--color-panel'),'editorWidget.border':color('--color-line'),
        'editor.lineHighlightBorder':color('--color-line-soft'),
        'editorIndentGuide.background':color('--color-line-soft'),
      }});m.editor.setTheme('codequest');
    }
    theme();const observer=new MutationObserver(theme);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});cleanups.push(()=>observer.disconnect());
    const updateStatus=()=>{const p=editor.getPosition();status.textContent=`JavaScript · строка ${p?.lineNumber??1}, столбец ${p?.column??1} · черновик сохраняется автоматически`;};
    track(editor.onDidChangeCursorPosition(updateStatus));
    track(model.onDidChangeContent(()=>{onInput?.(model.getValue());updateStatus();}));
    track(m.editor.onDidChangeMarkers(uris=>{
      if(!uris.some(uri=>uri.toString()===model.uri.toString()))return;
      const markers=m.editor.getModelMarkers({resource:model.uri});
      count.textContent=markers.length?`· ${markers.length}`:'· ошибок нет';
      const target=problems;
      target.innerHTML=markers.map((item,i)=>`<button type="button" class="problem-link" data-marker="${i}">Строка ${item.startLineNumber}: ${escapeHtml(item.message)}</button>`).join('')||'<p>Синтаксических ошибок не найдено. Поведение проверяют тесты задания.</p>';
      target.querySelectorAll('[data-marker]').forEach(button=>button.addEventListener('click',()=>{const item=markers[Number(button.dataset.marker)];editor.setPosition({lineNumber:item.startLineNumber,column:item.startColumn});editor.revealLineInCenter(item.startLineNumber);editor.focus();}));
    }));
    editor.addCommand(m.KeyMod.CtrlCmd|m.KeyCode.Enter,()=>onRun?.());
    for(const button of container.querySelectorAll('[data-tool]'))button.disabled=false;
    container.querySelector('[data-tool=format]').addEventListener('click',()=>editor.getAction('editor.action.formatDocument')?.run());
    container.querySelector('[data-tool=find]').addEventListener('click',()=>editor.getAction('actions.find')?.run());
    container.querySelector('[data-tool=wrap]').addEventListener('click',event=>{wrap=!wrap;editor.updateOptions({wordWrap:wrap?'on':'off'});event.currentTarget.setAttribute('aria-pressed',String(wrap));});
    updateStatus();
  }).catch(()=>{if(!disposed)status.textContent='Расширенный редактор не загрузился. Черновик доступен; обновите страницу для повторной загрузки.';});
  /**
   * Держать модели соседних файлов в том же каталоге, что и открытый.
   * Тогда относительные импорты разрешаются, а подсказки видят чужие экспорты.
   */
  function syncSiblings(files){
    if(!m||!folder) return;
    const wanted=new Map(Object.entries(files||{}).filter(([path])=>path!==filename));

    for(const [path,existing] of siblingModels){
      if(wanted.has(path)) continue;
      existing.dispose();
      siblingModels.delete(path);
    }

    for(const [path,text] of wanted){
      const existing=siblingModels.get(path);
      if(existing){ if(existing.getValue()!==text) existing.setValue(text); continue; }
      siblingModels.set(path,m.editor.createModel(text,'javascript',m.Uri.parse(`${folder}/${path}`)));
    }
  }

  return {
    syncSiblings,
    getValue:()=>model?.getValue()??fallback.value,
    setValue:next=>{if(editor){editor.pushUndoStop();editor.executeEdits('restore',[{range:model.getFullModelRange(),text:next}]);editor.pushUndoStop();}else{fallback.value=next;onInput?.(next);}},
    focus:()=>editor?editor.focus():fallback.focus(),
    collapse:()=>{
      wrapper.classList.remove('is-expanded');
      container.querySelector('[data-tool=focus]').textContent='Развернуть';
      editor?.layout();
    },
    dispose:()=>{disposed=true;for(const cleanup of cleanups)cleanup();editor?.dispose();model?.dispose();for(const extra of siblingModels.values())extra.dispose();siblingModels.clear();},
  };
}
