import { renderChart, renderProgress } from './dashboard-charts.js';
import { escapeHtml } from '../ui/html.js';
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
export class DashboardView{
 #root;#prefs;#save;#path;#dashboard;#editing=false;#editable;
 constructor(root,prefs,onChange,editable=true){this.#editable=editable;this.#root=root;this.#prefs=prefs;this.#save=onChange;}
 #change(patch){this.#prefs.change(this.#path,patch);this.#save({refresh:false});this.render(this.#path,this.#dashboard);}
 render(path,dashboard){
 const active=document.activeElement, inputId=this.#root.contains(active)&&this.#path===path?active.dataset.dashboardInput:undefined;
 const draft=inputId?{value:active.value,start:active.selectionStart,end:active.selectionEnd}:null;
 const panel=this.#root.closest('.city-dashboard-panel'),scrollTop=panel?.scrollTop;
 const restore=()=>{
   if(panel)panel.scrollTop=scrollTop;
   const input=inputId?[...this.#root.querySelectorAll('[data-dashboard-input]')].find(node=>node.dataset.dashboardInput===inputId):null;
   if(input&&draft){input.value=draft.value;input.focus({preventScroll:true});if(typeof draft.start==='number'&&['text','search','url','tel','password'].includes(input.type))input.setSelectionRange(draft.start,draft.end);}
 };
 this.#path=path;this.#dashboard=dashboard;this.#root.replaceChildren();const layout=this.#prefs.layout(path),inputs=this.#prefs.inputs(path),columns=layout.columns||dashboard.columns;
 this.#root.dataset.editing=String(this.#editing);
 const heading=node('div',undefined,'city-dashboard-heading');heading.append(node('h3',dashboard.title));const edit=node('button',this.#editing?'Готово':'Настроить раскладку');edit.type='button';edit.setAttribute('aria-pressed',String(this.#editing));edit.onclick=()=>{this.#editing=!this.#editing;this.render(this.#path,this.#dashboard);};heading.append(edit);const label=node('label','Колонки '),select=node('select');select.setAttribute('aria-label','Колонки дашборда');for(let i=1;i<=4;i++){const option=new Option(String(i),String(i));option.selected=i===columns;select.add(option);}select.onchange=()=>this.#change({columns:Number(select.value)});edit.hidden=!this.#editable||dashboard.html!==undefined;label.hidden=!this.#editable||dashboard.html!==undefined;label.className='city-dashboard-columns';label.append(select);heading.append(label);this.#root.append(heading);
 const controls=node('div',undefined,'city-dashboard-controls');for(const c of dashboard.controls){const label=node('label',c.label+' '),input=node(c.type==='select'?'select':'input');if(c.type==='select')c.options.forEach(o=>input.add(new Option(o.label,o.value)));else input.type=c.type;input.value=String(inputs[c.id]??c.value);input.dataset.dashboardInput=c.id;input.setAttribute('aria-label',c.label);input.onchange=()=>{this.#prefs.input(path,c.id,c.type==='number'&&Number.isFinite(input.valueAsNumber)?input.valueAsNumber:input.value);this.#save({refresh:true});};label.append(input);controls.append(label);}this.#root.append(controls);
 if(dashboard.html!==undefined){const frame=node('iframe',undefined,'city-custom-dashboard');frame.setAttribute('sandbox','');frame.title=dashboard.title;frame.style.height=dashboard.height+'px';frame.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:;"><style>'+dashboard.css.replace(/<\/style/gi,'<\\/style')+'</style></head><body>'+dashboard.html+'</body></html>';this.#root.append(frame);restore();return;}
 const order=[...layout.order,...dashboard.widgets.map(w=>w.id)].filter((id,i,ids)=>ids.indexOf(id)===i&&dashboard.widgets.some(w=>w.id===id));
 const grid=node('div',undefined,'city-dashboard-grid');grid.style.setProperty('--dashboard-columns',columns);
 for(const id of order){const w=dashboard.widgets.find(w=>w.id===id);if(layout.hidden.includes(id))continue;const card=node('article',undefined,'city-dashboard-widget');card.dataset.widget=id;card.style.setProperty('--widget-width',Math.min(columns,layout.widths[id]||w.width));const bar=node('div',undefined,'city-widget-heading');bar.append(node('h4',w.title));const tools=node('div',undefined,'city-widget-tools');
 for(const [symbol,delta]of [['←',-1],['→',1]]){const b=node('button',symbol);b.type='button';b.setAttribute('aria-label',(delta<0?'Переместить влево: ':'Переместить вправо: ')+w.title);b.onclick=()=>{const i=order.indexOf(id),j=i+delta;if(j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];this.#change({order});};tools.append(b);}
 const width=node('select');width.setAttribute('aria-label','Ширина: '+w.title);for(let i=1;i<=4;i++){const option=new Option(String(i),String(i));option.selected=i===(layout.widths[id]||w.width);width.add(option);}width.onchange=()=>this.#change({widths:{...layout.widths,[id]:Number(width.value)}});
 const hide=node('button','×');hide.type='button';hide.setAttribute('aria-label','Скрыть: '+w.title);hide.onclick=()=>this.#change({hidden:[...layout.hidden,id]});tools.append(width,hide);bar.append(tools);card.append(bar);
 if(w.type==='stat'){const p=node('p',w.value+(w.unit?' '+w.unit:''),'city-widget-stat');p.dataset.tone=w.tone;card.append(p);}
 if(w.type==='text')card.append(node('p',w.text,'city-widget-text'));
 if(w.type==='table'){const scroll=node('div',undefined,'city-table-scroll');scroll.innerHTML='<table><thead><tr>'+w.columns.map(v=>'<th>'+escapeHtml(v)+'</th>').join('')+'</tr></thead><tbody>'+w.rows.map(row=>'<tr>'+row.map(v=>'<td>'+escapeHtml(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';card.append(scroll);}
 if(w.type==='chart')card.append(renderChart(w));
 if(w.type==='progress')card.append(renderProgress(w));
 grid.append(card);
 }this.#root.append(grid);
 if(layout.hidden.length){const b=node('button','Показать скрытые виджеты ('+layout.hidden.length+')');b.type='button';b.onclick=()=>this.#change({hidden:[]});this.#root.append(b);}
 restore();
 }
}
