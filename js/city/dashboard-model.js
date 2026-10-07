const copy=v=>JSON.parse(JSON.stringify(v)),text=(v,max=200)=>String(v??'').slice(0,max);
const validId=id=>typeof id==='string'&&/^(?!__proto__$|constructor$|prototype$)[a-zA-Z0-9_-]{1,60}$/.test(id);
export function validateDashboard(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('render(cq, view) должен вернуть объект дашборда.');
 let json;try{json=JSON.stringify(value);}catch{throw new Error('Используйте JSON-данные.');}if(json.length>150000)throw new Error('Дашборд превышает 150 КБ.');
 const out={title:text(value.title||'Мой дашборд'),columns:Math.min(4,Math.max(1,Number(value.columns)||2)),controls:[]};
 if(!Number.isInteger(out.columns))throw new Error('columns должен быть целым.');
 if(value.controls!==undefined&&(!Array.isArray(value.controls)||value.controls.length>12))throw new Error('До 12 фильтров.');
 const ids=new Set();for(const c of value.controls||[]){if(!validId(c.id)||ids.has(c.id)||!['select','text','number'].includes(c.type))throw new Error('Некорректный фильтр.');ids.add(c.id);const item={id:c.id,type:c.type,label:text(c.label||c.id),value:text(c.value??'',300)};if(c.type==='select'){if(!Array.isArray(c.options)||!c.options.length||c.options.length>30)throw new Error('select требует 1–30 вариантов.');item.options=c.options.map(o=>({value:text(o.value,100),label:text(o.label,100)}));}out.controls.push(item);}
 if(typeof value.html==='string'){return {...out,html:value.html,css:text(value.css,40000),height:Math.min(1200,Math.max(200,Math.floor(Number(value.height)||430))),widgets:[]};}
 if(!Array.isArray(value.widgets)||value.widgets.length>30)throw new Error('Верните html или до 30 widgets.');
 const widgets=new Set();out.widgets=value.widgets.map(w=>{
  if(!w||!validId(w.id)||widgets.has(w.id)||!['stat','text','table','chart'].includes(w.type))throw new Error('Виджетам нужны уникальный id и тип stat/text/table/chart.');widgets.add(w.id);
  const item={id:w.id,type:w.type,title:text(w.title||w.id),width:Math.min(4,Math.max(1,Math.floor(Number(w.width)||1)))};
  if(w.type==='stat'){item.value=text(w.value,300);item.unit=text(w.unit,40);item.tone=['ok','warn','danger'].includes(w.tone)?w.tone:'default';}
  if(w.type==='text')item.text=text(w.text,10000);
  if(w.type==='table'){if(!Array.isArray(w.columns)||w.columns.length>12||!Array.isArray(w.rows)||w.rows.length>200)throw new Error('Таблица: 12 колонок, 200 строк.');item.columns=w.columns.map(v=>text(v,120));item.rows=w.rows.map(row=>{if(!Array.isArray(row)||row.length>12)throw new Error('Строка — массив.');return row.map(v=>text(v,500));});}
  if(w.type==='chart'){if(!Array.isArray(w.points)||w.points.length>120||w.points.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new Error('График: до 120 конечных чисел.');item.points=[...w.points];item.labels=Array.isArray(w.labels)?w.labels.slice(0,120).map(v=>text(v,80)):[];}
  return item;
 });return out;
}
export function normalizeDashboardPrefs(value){
 const out={entry:typeof value?.entry==='string'?value.entry.slice(0,160):'',layouts:{},inputs:{}};
 for(const [path,v]of Object.entries(value?.layouts||{}).slice(0,20)){if(!v||typeof v!=='object')continue;out.layouts[path]={columns:[1,2,3,4].includes(v.columns)?v.columns:null,order:Array.isArray(v.order)?[...new Set(v.order.filter(validId))].slice(0,30):[],widths:Object.fromEntries(Object.entries(v.widths||{}).filter(([id,n])=>validId(id)&&[1,2,3,4].includes(n)).slice(0,30)),hidden:Array.isArray(v.hidden)?v.hidden.filter(validId).slice(0,30):[]};}
 for(const [path,v]of Object.entries(value?.inputs||{}).slice(0,20)){if(v&&typeof v==='object'&&!Array.isArray(v))out.inputs[path]=Object.fromEntries(Object.entries(v).filter(([id,n])=>validId(id)&&['string','number','boolean'].includes(typeof n)).slice(0,12).map(([id,n])=>[id,typeof n==='string'?n.slice(0,300):n]));}return out;
}
export class DashboardPreferences{
 #value;constructor(value){this.#value=normalizeDashboardPrefs(value);}snapshot(){return copy(this.#value);}entry(){return this.#value.entry;}select(path){this.#value.entry=path;}
 inputs(path){return copy(this.#value.inputs[path]||{});}input(path,id,value){if(!validId(id)||!['string','number','boolean'].includes(typeof value))throw new Error('Некорректный фильтр.');this.#value.inputs[path]||={};this.#value.inputs[path][id]=value;}
 layout(path){return copy(this.#value.layouts[path]||{columns:null,order:[],widths:{},hidden:[]});}
 change(path,patch){this.#value.layouts[path]={...this.layout(path),...patch};this.#value=normalizeDashboardPrefs(this.#value);}
 reset(path){delete this.#value.layouts[path];delete this.#value.inputs[path];}
 renamePaths(from,to,folder=false){const move=p=>p===from||(folder&&p.startsWith(from+'/'))?to+p.slice(from.length):p;this.#value.entry=move(this.entry());for(const key of ['layouts','inputs'])this.#value[key]=Object.fromEntries(Object.entries(this.#value[key]).map(([p,v])=>[move(p),v]));}
}
