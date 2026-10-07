export const WIDGET_SOURCES = [
 {id:'balance',name:'Баланс',type:'stat',expression:'s.balance',unit:'₽',method:'cq.world.getState',hint:'Один показатель. Берём balance из снимка мира.'},
 {id:'profit',name:'Доходы − расходы',type:'stat',expression:'s.metrics.revenue - s.metrics.spent',unit:'₽',method:'cq.world.getState',hint:'Суммарная выручка минус все расходы; это не маржа одной сделки.'},
 {id:'space',name:'Свободное место',type:'stat',expression:'cq.warehouse.getFreeSpace()',method:'cq.warehouse.getFreeSpace',hint:'Учитывает готовый склад и резерв партий.'},
 {id:'trend',name:'Баланс по шагам',type:'chart',expression:'history.map(p => p.balance)',labels:'history.map(p => String(p.tick))',unit:'₽',style:'area',width:2,method:'cq.analytics.getHistory',hint:'История до 60 шагов. Появится после первого игрового шага.'},
 {id:'prices',name:'Сравнение цен',type:'chart',expression:'cq.market.getBuyers(product).filter(b => !b.locked).map(b => b.price)',labels:'cq.market.getBuyers(product).filter(b => !b.locked).map(b => b.id)',unit:'₽',style:'bar',width:2,method:'cq.market.getBuyers',hint:'Сравнивайте покупателей открытых районов; фильтр товара появится над графиками.'},
 {id:'stock',name:'Запасы склада',type:'table',columns:['Товар','Количество'],expression:'Object.entries(s.inventory)',width:2,method:'cq.world.getState',hint:'Object.entries превращает объект inventory в строки таблицы.'},
 {id:'production',name:'Загрузка линий',type:'progress',expression:'s.lines.filter(line => line.job !== null).length',max:'s.lines.length',unit:'линий',method:'cq.factory.getLines',hint:'Занятые линии / все линии. Изменяется при запуске и завершении партий.'},
 {id:'deliveries',name:'Грузы в пути',type:'table',columns:['Груз','Товар','Количество','Осталось'],expression:'cq.logistics.getShipments().map(s => [s.id, s.product, s.quantity, s.remaining])',width:2,method:'cq.logistics.getShipments',hint:'Список текущих доставок. Пустая таблица означает, что грузов нет.'},
 {id:'orders',name:'Отложенные продажи',type:'table',columns:['№','Товар','Цена от','Статус'],expression:'cq.market.getOrders().map(o => [o.id, o.product, o.minPrice, o.status])',width:2,method:'cq.market.getOrders',hint:'История продаж по порогу цены. Для изменения заявки нужен main.'},
 {id:'note',name:'Моя заметка',type:'text',method:'cq.world.getState',hint:'Объясните себе смысл показателей или добавьте инструкцию.'}
];
export const BOARD_TEMPLATES=[
 {id:'overview',name:'Мастерская',description:'Баланс, история, склад и загрузка производства.',sources:['balance','profit','space','trend','stock','production']},
 {id:'markets',name:'Рынки',description:'Сравнение цен с фильтром товара и история заявок.',sources:['balance','prices','stock','orders']},
 {id:'logistics',name:'Диспетчерская',description:'Загрузка линий, грузы и динамика баланса.',sources:['production','deliveries','trend']},
 {id:'empty',name:'Чистый лист',description:'Начните с показателя и добавьте нужные инструменты.',sources:['balance']}
];
export function widgetFromSource(source,index){
 const item=WIDGET_SOURCES.find(s=>s.id===source);if(!item)throw new Error('Неизвестный источник.');
 return {id:'widget-'+index,source,title:item.name,width:item.width||1,style:item.style||'line',text:'Ваша заметка'};
}
export function boardFromTemplate(id='overview'){
 const template=BOARD_TEMPLATES.find(t=>t.id===id);if(!template)throw new Error('Неизвестный шаблон.');
 return {title:template.name,columns:2,product:'metal',widgets:template.sources.map((s,i)=>widgetFromSource(s,i+1))};
}
export function validateBoard(value){
 if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.length>120||![1,2,3,4].includes(value.columns)||!['metal','parts','wire','circuit'].includes(value.product)||!Array.isArray(value.widgets)||!value.widgets.length||value.widgets.length>12)throw new Error('Задайте название, 1–4 колонки и от 1 до 12 виджетов.');
 const ids=new Set();
 for(const w of value.widgets){
  if(!w||typeof w.id!=='string'||!/^widget-[1-9]\d*$/.test(w.id)||ids.has(w.id)||!WIDGET_SOURCES.some(s=>s.id===w.source)||typeof w.title!=='string'||!w.title.trim()||w.title.length>120||![1,2,3,4].includes(w.width)||!['line','area','bar'].includes(w.style)||typeof w.text!=='string'||w.text.length>10000)throw new Error('Проверьте заголовок, источник и ширину виджета.');ids.add(w.id);
 }
 return JSON.parse(JSON.stringify(value));
}
export function generateDashboard(value){
 const board=validateBoard(value),q=JSON.stringify;
 const widgets=board.widgets.map(w=>{
  const source=WIDGET_SOURCES.find(s=>s.id===w.source);
  const fields=['id: '+q(w.id),'type: '+q(source.type),'title: '+q(w.title),'width: '+w.width];
  if(source.unit)fields.push('unit: '+q(source.unit));
  if(source.type==='stat'||source.type==='progress')fields.push('value: '+source.expression);
  if(source.type==='progress')fields.push('max: '+source.max);
  if(source.type==='chart')fields.push('style: '+q(w.style),'points: '+source.expression,'labels: '+source.labels);
  if(source.type==='table')fields.push('columns: '+q(source.columns),'rows: '+source.expression);
  if(source.type==='text')fields.push('text: '+q(w.text));
  return '      // '+source.hint+'\n      { '+fields.join(', ')+' }';
 });
 const controls=board.widgets.some(w=>w.source==='prices')?
  '    controls: [{ id: "product", type: "select", label: "Товар", value: product,\n      options: ["metal","parts","wire","circuit"].map(value => ({value, label: value})) }],\n':'';
 return '/** @param {CityAPI} cq */\nexport function render(cq, view) {\n  // Только чтение. Мир изменяйте в main(cq), файл index.js.\n  const s = cq.world.getState();\n  const history = cq.analytics.getHistory(60);\n  const product = view.inputs.product || '+q(board.product)+';\n  return {\n    title: '+q(board.title)+',\n    columns: '+board.columns+',\n'+controls+'    widgets: [\n'+widgets.join(',\n')+'\n    ]\n  };\n}\n';
}
