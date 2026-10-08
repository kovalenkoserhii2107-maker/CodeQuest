import { formatConsoleValues } from './console-format.js';
const purchase = (name,input,expected) => ({name,args:[input],expected});
const line = (name,input,expected) => ({name,args:[input],expected});
const report = (name,input,expected) => ({name,args:[input],expected});
export const PRACTICES = [
  {
    id:'budget',path:'practice/budget.js',exportName:'planPurchase',title:'1. Планировщик закупки',
    after:'После заданий 2–5',concepts:'Чистая функция, условия, Math.floor, граничные случаи',
    objective:'Рассчитайте количество сырья без команды покупки. Оно ограничено бюджетом после резерва, запасом поставщика и свободным местом.',
    contract:'planPurchase({ balance, price, stock, freeSpace, reserve }) → целое число ≥ 0. reserve по умолчанию 0. Неверные, отрицательные и нечисловые значения → 0; price должен быть > 0. Остаток бюджета меньше нуля → 0. Исходный объект не изменять.',
    starter:'export function planPurchase({ balance, price, stock, freeSpace, reserve = 0 }) {\n  // Проверьте входные данные, затем ограничьте количество.\n  // Нулевая закупка — допустимый план, но не команда API.\n  return 0; // TODO\n}\n',
    use:'import { planPurchase } from "./practice/budget.js";\nexport function main(cq) {\n  const world = cq.world.getState();\n  const supplier = cq.market.getSuppliers()[0];\n  const amount = planPurchase({ balance: world.balance, price: supplier.price, stock: supplier.stock, freeSpace: cq.warehouse.getFreeSpace(), reserve: 100 });\n  console.log("План закупки:", amount);\n  if (amount > 0) cq.market.buy("scrap", amount, supplier.id);\n}',
    cases:[
      purchase('Бюджет после резерва',{balance:100,price:7,stock:30,freeSpace:50,reserve:30},10),
      purchase('Ограничение поставщика',{balance:100,price:5,stock:3,freeSpace:20},3),
      purchase('Ограничение склада и округление',{balance:100,price:5,stock:20,freeSpace:2.8},2),
      purchase('Резерв больше баланса',{balance:20,price:5,stock:20,freeSpace:20,reserve:30},0),
      purchase('Пустой склад поставщика',{balance:100,price:5,stock:0,freeSpace:20},0),
      purchase('Нулевая цена',{balance:100,price:0,stock:20,freeSpace:20},0),
      purchase('Строка вместо цены',{balance:100,price:'5',stock:20,freeSpace:20},0),
      purchase('Отрицательный запас',{balance:100,price:5,stock:-2,freeSpace:20},0),
      purchase('Не конечное число',{balance:Infinity,price:5,stock:20,freeSpace:20},0)
    ]
  },
  {
    id:'lines',path:'practice/lines.js',exportName:'chooseLine',title:'2. Диспетчер производственных линий',
    after:'После задания 10',concepts:'Массивы, filter, sort, детерминированный выбор, копирование',
    objective:'Выберите свободную линию с наибольшим level: у неё больше допустимая партия. При равенстве выберите меньший id в лексикографическом порядке.',
    contract:'chooseLine(lines) → id или null, если свободных линий нет. Свободная линия имеет job === null. Вход — массив объектов { id, level, job }; не изменять массив и объекты.',
    starter:'export function chooseLine(lines) {\n  // Отберите свободные линии и сравните их мощность.\n  // Помните: sort() меняет исходный массив.\n  return null; // TODO\n}\n',
    use:'import { chooseLine } from "./practice/lines.js";\nexport function main(cq) {\n  const id = chooseLine(cq.factory.getLines());\n  console.log("Выбранная линия:", id);\n  // Здесь дополнительно проверьте сырьё, деньги и размер партии.\n}',
    cases:[
      line('Пустой цех',[],null),
      line('Все заняты',[{id:'line-1',level:2,job:{remaining:1}}],null),
      line('Единственная свободная',[{id:'line-1',level:1,job:null}],'line-1'),
      line('Мощность свободной линии',[{id:'line-1',level:1,job:null},{id:'line-2',level:3,job:null}],'line-2'),
      line('Занятая мощная линия',[{id:'line-1',level:6,job:{remaining:1}},{id:'line-2',level:1,job:null}],'line-2'),
      line('Равенство мощности',[{id:'line-3',level:2,job:null},{id:'line-1',level:2,job:null},{id:'line-2',level:1,job:null}],'line-1')
    ]
  },
  {
    id:'report',path:'practice/report.js',exportName:'summarize',title:'3. Данные для собственного дашборда',
    after:'После заданий 11–13',concepts:'Декомпозиция, reduce, значения по умолчанию, контракт данных',
    objective:'Преобразуйте снимок мира в небольшой отчёт. Этот модуль можно импортировать в main и в render — проверка не зависит от текущего состояния игры.',
    contract:'summarize(state) → { inventoryTotal, busyLines, freeLines, lowBalance }. inventoryTotal — сумма значений inventory; busyLines — число линий с job, freeLines — без job; lowBalance = balance < 100. Отсутствующие inventory и lines считаются пустыми; отсутствующий balance равен 0. Объект state и вложенные данные не изменять.',
    starter:'export function summarize(state) {\n  // Отделите расчёты от отображения: эта функция не использует DOM и cq.\n  return { inventoryTotal: 0, busyLines: 0, freeLines: 0, lowBalance: false }; // TODO\n}\n',
    use:'import { summarize } from "../practice/report.js";\nexport function render(cq) {\n  const report = summarize(cq.world.getState());\n  console.log("Отчёт:", report);\n  return { title: "Мой цех", columns: 2, widgets: [\n    { id: "stock", type: "stat", title: "Всего на складе", value: report.inventoryTotal, unit: "ед." },\n    { id: "load", type: "progress", title: "Загрузка", value: report.busyLines, max: Math.max(1, report.busyLines + report.freeLines) },\n    { id: "cash", type: "text", title: "Контроль бюджета", text: report.lowBalance ? "Нужен резерв" : "Резерв есть" }\n  ] };\n}',
    cases:[
      report('Пустые данные',{}, {inventoryTotal:0,busyLines:0,freeLines:0,lowBalance:true}),
      report('Начальная мастерская',{balance:1000,inventory:{scrap:0,metal:0},lines:[{id:'line-1',job:null}]},{inventoryTotal:0,busyLines:0,freeLines:1,lowBalance:false}),
      report('Запасы и производство',{balance:99,inventory:{scrap:10,metal:3,wire:2},lines:[{id:'line-1',job:{remaining:2}},{id:'line-2',job:null}]},{inventoryTotal:15,busyLines:1,freeLines:1,lowBalance:true}),
      report('Граница резерва',{balance:100,inventory:{parts:4},lines:[]},{inventoryTotal:4,busyLines:0,freeLines:0,lowBalance:false}),
      report('Все линии заняты',{balance:0,lines:[{job:{remaining:1}},{job:{remaining:3}}]},{inventoryTotal:0,busyLines:2,freeLines:0,lowBalance:true})
    ]
  }
];
function equal(a,b) {
  if(Object.is(a,b))return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
}
/** Tests execute in the same disposable worker as user modules, without world commands. */
export async function runPractice(id,entry) {
  const practice=PRACTICES.find(item=>item.id===id);
  if(!practice)throw new Error('Практика не найдена.');
  if(typeof entry[practice.exportName]!=='function')throw new Error(practice.path+' должен экспортировать '+practice.exportName+'().');
  const results=[];
  for(const test of practice.cases){
    const args=structuredClone(test.args),before=structuredClone(args);
    try{
      const actual=await entry[practice.exportName](...args),unchanged=equal(args,before),passed=equal(actual,test.expected)&&unchanged;
      results.push({name:test.name,passed,detail:passed?'Верно':(!unchanged?'Изменены входные данные. ':'')+'Ожидалось '+formatConsoleValues([test.expected])+', получено '+formatConsoleValues([actual])});
    }catch(error){results.push({name:test.name,passed:false,detail:error?.message||String(error)});}
  }
  return {id,passed:results.every(test=>test.passed),results};
}
