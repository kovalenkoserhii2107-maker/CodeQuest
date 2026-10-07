import { WIDGET_SOURCES, BOARD_TEMPLATES, widgetFromSource, boardFromTemplate, generateDashboard } from './dashboard-builder-model.js';
import { CityRuntime } from './runtime.js';
import { DashboardView } from './dashboard-view.js';
import { DashboardPreferences } from './dashboard-model.js';
import { validProjectPath } from './project.js';
import { escapeHtml } from '../ui/html.js';
export class DashboardBuilder{
 #dialog;#options;#board=boardFromTemplate();#runtime=new CityRuntime();#prefs=new DashboardPreferences();#view;#generation=0;#timer;#disposed=false;#nextId=7;
 constructor(root,options){
  this.#options=options;const dialog=document.createElement('dialog');dialog.className='city-builder';dialog.setAttribute('aria-labelledby','city-builder-title');
  dialog.innerHTML='<header class="city-builder-heading"><div><p class="campaign-eyebrow">Ваш интерфейс / ваш JavaScript</p><h2 id="city-builder-title">Соберите дашборд</h2><p>Выберите данные и форму отображения. Конструктор создаст понятный render(cq, view).</p></div><button type="button" data-builder-close aria-label="Закрыть конструктор">×</button></header><div class="city-builder-grid"><section class="city-builder-tools"><h3>1. Основа</h3><div class="city-builder-templates">'+BOARD_TEMPLATES.map(t=>'<button type="button" data-board-template="'+t.id+'" title="'+t.description+'">'+t.name+'</button>').join('')+'</div><label>Название<input data-builder-title maxlength="120"></label><label>Колонки<select data-builder-columns><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label><label>Товар для сравнения<select data-builder-product><option value="metal">Металл</option><option value="parts">Детали</option><option value="wire">Провод</option><option value="circuit">Схемы</option></select></label><h3>2. Инструменты</h3><p class="city-muted">Добавьте показатель, график, таблицу или индикатор. До 12 виджетов.</p><div class="city-builder-catalog">'+WIDGET_SOURCES.map(s=>'<button type="button" data-widget-source="'+s.id+'"><span class="city-tool-icon" aria-hidden="true">'+({stat:'123',chart:'↗',table:'▦',progress:'◒',text:'T'}[s.type])+'</span><span><strong>'+s.name+'</strong><small>'+s.hint+'</small></span></button>').join('')+'</div><h3>3. Настройка виджетов</h3><div data-builder-items></div><details class="city-builder-help"><summary>Как из инструментов сделать нужный экран</summary><ol><li><b>Один вопрос — один виджет.</b> Для денег добавьте «Баланс», для свободного места — «Свободное место».</li><li><b>Изменения во времени — линия или область.</b> Добавьте «Баланс по шагам»; сначала выполните игровой шаг, чтобы появилась история.</li><li><b>Сравнение — столбцы.</b> «Сравнение цен» покажет покупателей. Фильтр товара создаётся автоматически.</li><li><b>Подробности — таблица.</b> Склад, заявки и грузы показывают отдельные строки. Индикатор показывает загрузку линий.</li><li>Выберите ширину и порядок. Создайте JS-файл, затем откройте код и добавьте собственные расчёты.</li></ol><p>Например: «Баланс» + «Баланс по шагам» + «Запасы склада» — финансовый экран. «Сравнение цен» + «Отложенные продажи» — экран торговли.</p><p>Предпросмотр только читает снимок. Нажатие «Создать» не запускает main и не меняет экономику.</p></details></section><section class="city-builder-preview"><h3>Живой предпросмотр</h3><p data-builder-status role="status" class="city-muted"></p><div data-builder-preview></div><details><summary>Посмотреть получившийся JavaScript</summary><pre data-builder-code></pre><button type="button" data-builder-copy>Копировать код</button></details></section></div><footer class="city-builder-footer"><label>Новый файл<input data-builder-path value="dashboards/my-board.js" aria-label="Путь нового дашборда"></label><button type="button" data-builder-export>Создать JS-файл</button><p data-builder-export-status role="status">Существующие файлы не заменяются. Код можно доработать в редакторе.</p></footer>';
  this.#dialog=dialog;root.append(dialog);
  this.#view=new DashboardView(dialog.querySelector('[data-builder-preview]'),this.#prefs,()=>this.#preview(),false);
  dialog.querySelector('[data-builder-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{clearTimeout(this.#timer);this.#generation++;this.#runtime.cancel();dialog.querySelector('[data-builder-preview]').replaceChildren();});
  dialog.querySelectorAll('[data-board-template]').forEach(button=>button.onclick=()=>{this.#board=boardFromTemplate(button.dataset.boardTemplate);this.#nextId=this.#board.widgets.length+1;this.#prefs=new DashboardPreferences();this.#view=new DashboardView(dialog.querySelector('[data-builder-preview]'),this.#prefs,()=>this.#preview(),false);this.#form();});
  dialog.querySelector('[data-builder-title]').oninput=event=>{this.#board.title=event.target.value;this.#schedule();};
  dialog.querySelector('[data-builder-columns]').onchange=event=>{this.#board.columns=Number(event.target.value);this.#schedule();};
  dialog.querySelector('[data-builder-product]').onchange=event=>{this.#board.product=event.target.value;this.#prefs.input('dashboards/preview.js','product',event.target.value);this.#schedule();};
  dialog.querySelectorAll('[data-widget-source]').forEach(button=>button.onclick=()=>{if(this.#board.widgets.length>=12){this.#status('Можно добавить до 12 виджетов.');return;}this.#board.widgets.push(widgetFromSource(button.dataset.widgetSource,this.#nextId++));this.#items();this.#schedule();});
  dialog.querySelector('[data-builder-export]').onclick=()=>this.#export();
  dialog.querySelector('[data-builder-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(generateDashboard(this.#board));this.#status('Код скопирован.');}catch{const range=document.createRange();range.selectNodeContents(dialog.querySelector('[data-builder-code]'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);this.#status('Код выделен — скопируйте вручную.');}};
 }
 open(){if(this.#disposed)return;this.#dialog.showModal();this.#form();}
 #status(text){this.#dialog.querySelector('[data-builder-status]').textContent=text;}
 #form(){this.#dialog.querySelector('[data-builder-title]').value=this.#board.title;this.#dialog.querySelector('[data-builder-columns]').value=String(this.#board.columns);this.#dialog.querySelector('[data-builder-product]').value=this.#board.product;this.#items();this.#preview();}
 #items(){
  const root=this.#dialog.querySelector('[data-builder-items]');root.innerHTML=this.#board.widgets.map((w,i)=>{const source=WIDGET_SOURCES.find(s=>s.id===w.source);return '<article class="city-builder-item" data-builder-widget="'+w.id+'"><div><span>'+source.name+'</span><button type="button" data-builder-up aria-label="Поднять: '+escapeHtml(w.title)+'" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-builder-down aria-label="Опустить: '+escapeHtml(w.title)+'" '+(i===this.#board.widgets.length-1?'disabled':'')+'>↓</button><button type="button" data-builder-remove aria-label="Удалить: '+escapeHtml(w.title)+'">×</button></div><label>Заголовок<input data-builder-widget-title maxlength="120" value="'+escapeHtml(w.title)+'"></label><label>Ширина<select data-builder-width>'+[1,2,3,4].map(n=>'<option '+(n===w.width?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+(source.type==='chart'?'<label>Вид графика<select data-builder-style>'+[['line','Линия'],['area','Область'],['bar','Столбцы']].map(([id,label])=>'<option value="'+id+'" '+(id===w.style?'selected':'')+'>'+label+'</option>').join('')+'</select></label>':'')+(source.type==='text'?'<label>Текст<textarea data-builder-text>'+escapeHtml(w.text)+'</textarea></label>':'')+'<p class="city-muted">'+source.hint+' <code>'+source.method+'</code></p></article>';}).join('');
  root.querySelectorAll('[data-builder-widget]').forEach(card=>{
   const w=this.#board.widgets.find(item=>item.id===card.dataset.builderWidget);
   card.querySelector('[data-builder-widget-title]').oninput=event=>{w.title=event.target.value;this.#schedule();};
   card.querySelector('[data-builder-width]').onchange=event=>{w.width=Number(event.target.value);this.#schedule();};
   if(card.querySelector('[data-builder-style]'))card.querySelector('[data-builder-style]').onchange=event=>{w.style=event.target.value;this.#schedule();};
   if(card.querySelector('[data-builder-text]'))card.querySelector('[data-builder-text]').oninput=event=>{w.text=event.target.value;this.#schedule();};
   card.querySelector('[data-builder-remove]').onclick=()=>{this.#board.widgets=this.#board.widgets.filter(item=>item!==w);this.#items();this.#schedule();};
   for(const [attr,delta]of [['up',-1],['down',1]])card.querySelector('[data-builder-'+attr+']').onclick=()=>{const i=this.#board.widgets.indexOf(w),j=i+delta;if(j<0||j>=this.#board.widgets.length)return;[this.#board.widgets[i],this.#board.widgets[j]]=[this.#board.widgets[j],this.#board.widgets[i]];this.#items();this.#schedule();};
  });
 }
 #schedule(){clearTimeout(this.#timer);this.#timer=setTimeout(()=>this.#preview(),200);}
 async #preview(){
  clearTimeout(this.#timer);if(this.#disposed||!this.#dialog.open)return;const generation=++this.#generation;this.#runtime.cancel();
  this.#status('Обновляем предпросмотр…');
  try{const code=generateDashboard(this.#board);this.#dialog.querySelector('[data-builder-code]').textContent=code;
   const result=await this.#runtime.run({'index.js':'export function main() {}','dashboards/preview.js':code},this.#options.getWorld(),this.#options.getMemory(),{mode:'dashboard',entry:'dashboards/preview.js',inputs:this.#prefs.inputs('dashboards/preview.js')});
   if(this.#disposed||generation!==this.#generation)return;this.#view.render('dashboards/preview.js',result.dashboard);this.#status('Снимок мира · '+this.#board.widgets.length+' виджетов · экономика не изменена');
  }catch(error){if(!this.#disposed&&generation===this.#generation)this.#status(error.message);}
 }
 #export(){
  try{const path=this.#dialog.querySelector('[data-builder-path]').value.trim();if(!validProjectPath(path)||!path.startsWith('dashboards/'))throw new Error('Используйте путь dashboards/name.js.');
   this.#options.onCreate(path,generateDashboard(this.#board));this.#dialog.close();
  }catch(error){this.#dialog.querySelector('[data-builder-export-status]').textContent=error.message;}
 }
 dispose(){this.#disposed=true;clearTimeout(this.#timer);this.#generation++;this.#runtime.cancel();if(this.#dialog.open)this.#dialog.close();this.#dialog.remove();}
}
