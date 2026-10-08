import { PRODUCTS, RECIPES } from './catalog.js';
const copy = value => JSON.parse(JSON.stringify(value));
export const SITE_CATALOG = Object.freeze([
  Object.freeze({ id:'city', name:'Центральная мастерская', region:'city', cost:0, specialty:'Базовое производство и городские контракты', discountProduct:null, energyDiscount:0, timeDiscount:0 }),
  Object.freeze({ id:'port', name:'Портовой сборочный цех', region:'port', cost:1800, specialty:'Детали: энергия на 2 ₽ дешевле за единицу', discountProduct:'parts', energyDiscount:2, timeDiscount:0 }),
  Object.freeze({ id:'highlands', name:'Северная электроника', region:'highlands', cost:2600, specialty:'Схемы: производство на 1 шаг быстрее', discountProduct:'circuit', energyDiscount:0, timeDiscount:1 })
]);
const distances = { 'city:port':3, 'city:highlands':4, 'highlands:port':5 };
const emptyInventory = () => Object.fromEntries(Object.keys(PRODUCTS).map(id => [id,0]));
export const initialNetwork = () => ({ sites:[], transfers:[], nextTransfer:1, fleetLevel:1, moved:0, fees:0 });
const fail = message => { throw new Error(message); };
const whole = (value,min=0,max=1000000) => Number.isSafeInteger(value) && value>=min && value<=max;
function quantity(value) { if(!whole(value,1))fail('Количество: положительное целое до 1 000 000.'); }
function product(id) { if(!Object.hasOwn(PRODUCTS,id))fail('Неизвестный товар: '+id); }
function distance(from,to) { return distances[[from,to].sort().join(':')]; }
function pendingTo(world,id) { return world.network.transfers.filter(t=>t.status==='transit'&&t.to===id).reduce((sum,t)=>sum+t.quantity,0); }

/** Satellite warehouses are independent; the city site references the original warehouse. */
export class ProductionNetwork {
  #world;
  constructor(world) { this.#world=world; }
  #site(id) {
    if(id==='city')return {id,region:'city',inventory:this.#world.inventory,lines:this.#world.lines,capacity:this.#world.capacity,warehouseLevel:this.#world.warehouseLevel};
    const site=this.#world.network.sites.find(site=>site.id===id);
    if(!site)fail('Площадка не построена: '+id+'. Прочитайте cq.network.getCatalog().');
    return site;
  }
  #pay(amount) {
    if(this.#world.balance<amount)fail('Недостаточно денег: нужно '+amount+' ₽.');
    this.#world.balance-=amount;this.#world.metrics.spent+=amount;
  }
  freeSpace(id) {
    const site=this.#site(id);
    return site.capacity-Object.values(site.inventory).reduce((sum,n)=>sum+n,0)
      -site.lines.reduce((sum,line)=>sum+(line.job?.quantity||0),0)-pendingTo(this.#world,id);
  }
  catalog() {
    return SITE_CATALOG.map(def=>({...def,built:def.id==='city'||this.#world.network.sites.some(site=>site.id===def.id),
      locked:!this.#world.regions.includes(def.region),canOpen:def.id!=='city'&&!this.#world.network.sites.some(site=>site.id===def.id)&&this.#world.regions.includes(def.region)&&this.#world.balance>=def.cost}));
  }
  site(id) {
    const site=this.#site(id),definition=SITE_CATALOG.find(item=>item.id===id),inventoryTotal=Object.values(site.inventory).reduce((sum,n)=>sum+n,0);
    return copy({...site,name:definition.name,specialty:definition.specialty,inventoryTotal,inbound:pendingTo(this.#world,id),
      reserved:site.lines.reduce((sum,line)=>sum+(line.job?.quantity||0),0),
      freeSpace:this.freeSpace(id),busyLines:site.lines.filter(line=>line.job).length,
      purchaseLineCost:site.lines.length<4?1200*site.lines.length:null,
      warehouseUpgradeCost:site.warehouseLevel<6?500*site.warehouseLevel:null});
  }
  sites() { return ['city',...this.#world.network.sites.map(site=>site.id)].map(id=>this.site(id)); }
  fleet() {
    const level=this.#world.network.fleetLevel,active=this.#world.network.transfers.filter(t=>t.status==='transit').length;
    return {level,capacity:20*level,slots:level,active,freeSlots:level-active,upgradeCost:level<4?900*level:null};
  }
  transfers() { return copy(this.#world.network.transfers); }
  history(id,limit=60) {
    this.#site(id);
    if(!whole(limit,1,120))fail('История: limit от 1 до 120.');
    return this.#world.history.filter(point=>point.sites?.some(site=>site.id===id)).slice(-limit).map(point=>copy({tick:point.tick,...point.sites.find(site=>site.id===id)}));
  }
  open(id) {
    const definition=SITE_CATALOG.find(site=>site.id===id);
    if(!definition||id==='city')fail('Новая площадка: port или highlands.');
    if(this.#world.network.sites.some(site=>site.id===id))fail('Площадка уже построена.');
    if(!this.#world.regions.includes(definition.region))fail('Сначала откройте регион: '+definition.region+'.');
    this.#pay(definition.cost);
    this.#world.network.sites.push({id,region:definition.region,warehouseLevel:1,capacity:100,inventory:emptyInventory(),lines:[{id:'line-1',level:1,job:null}]});
    return this.site(id);
  }
  buy(id,item,amount,supplierId) {
    product(item);quantity(amount);const site=this.#site(id),supplier=this.#world.suppliers.find(s=>s.id===supplierId);
    if(!supplier||supplier.region!==site.region||supplier.product!==item)fail('Нужен местный поставщик этого товара. Проверьте supplier.region и site.region.');
    if(amount>supplier.stock)fail('У поставщика недостаточно товара.');
    if(amount>this.freeSpace(id))fail('На площадке недостаточно свободного места с учётом резервов.');
    this.#pay(amount*supplier.price);supplier.stock-=amount;site.inventory[item]+=amount;this.#world.metrics.bought+=amount;
    this.#world.supplier.stock=this.#world.suppliers[0].stock;
    return amount;
  }
  quoteProduction(id,item,amount,lineId='line-1') {
    quantity(amount);const site=this.#site(id),recipe=Object.hasOwn(RECIPES,item)?RECIPES[item]:null;
    if(!recipe)fail('Неизвестный рецепт.');
    const line=site.lines.find(line=>line.id===lineId);
    if(!line)fail('Линия не найдена на площадке '+id+': '+lineId+'.');
    const definition=SITE_CATALOG.find(site=>site.id===id),special=definition.discountProduct===item;
    const energyCost=amount*Math.max(0,recipe.energy-(this.#world.research.includes('efficiency')?1:0)-(special?definition.energyDiscount:0));
    const duration=Math.max(1,recipe.duration-(this.#world.research.includes('throughput')?1:0)-(special?definition.timeDiscount:0)),inputQuantity=amount*recipe.amount,reasons=[];
    if(recipe.research&&!this.#world.research.includes(recipe.research))reasons.push('Сначала исследуйте '+recipe.research+'.');
    if(line.job)reasons.push('Линия занята ещё '+line.job.remaining+' шаг.');
    if(amount>8*line.level)reasons.push('Мощность линии: до '+8*line.level+' ед.');
    if(site.inventory[recipe.input]<inputQuantity)reasons.push('На площадке нужно '+inputQuantity+' '+recipe.input+'.');
    if(this.#world.balance<energyCost)reasons.push('На энергию нужно '+energyCost+' ₽.');
    if(amount>this.freeSpace(id)+inputQuantity)reasons.push('Не хватает места под готовую партию.');
    return {siteId:id,product:item,quantity:amount,lineId,input:recipe.input,inputQuantity,energyCost,duration,canStart:!reasons.length,reasons};
  }
  start(id,item,amount,lineId='line-1') {
    const quote=this.quoteProduction(id,item,amount,lineId);
    if(!quote.canStart)fail('Производство недоступно: '+quote.reasons.join(' '));
    const site=this.#site(id),line=site.lines.find(line=>line.id===lineId);
    this.#pay(quote.energyCost);site.inventory[quote.input]-=quote.inputQuantity;
    line.job={product:item,quantity:amount,remaining:quote.duration};
    return copy(line.job);
  }
  quoteTrade(id,item,amount,buyerId) {
    product(item);quantity(amount);const site=this.#site(id),buyer=this.#world.buyers.find(b=>b.id===buyerId),reasons=[];
    if(!buyer||buyer.product!==item)fail('Покупатель не принимает этот товар.');
    if(buyer.region!==site.region)reasons.push('Покупатель в другом регионе. Перевезите товар на площадку этого региона или используйте logistics из центральной мастерской.');
    if(id==='city'&&buyer.remote)reasons.push('Этому городскому покупателю нужна доставка через cq.logistics.dispatch.');
    if(amount>buyer.demand)reasons.push('Недостаточно спроса: '+buyer.demand+'.');
    if(amount>site.inventory[item])reasons.push('На площадке недостаточно готового товара.');
    return {siteId:id,product:item,quantity:amount,buyerId,unitPrice:buyer.price,gross:buyer.price*amount,canTrade:!reasons.length,reasons};
  }
  sell(id,item,amount,buyerId) {
    const quote=this.quoteTrade(id,item,amount,buyerId);
    if(!quote.canTrade)fail('Продажа недоступна: '+quote.reasons.join(' '));
    const site=this.#site(id),buyer=this.#world.buyers.find(b=>b.id===buyerId);
    site.inventory[item]-=amount;buyer.demand-=amount;this.#world.balance+=quote.gross;
    this.#world.metrics.sold+=amount;this.#world.metrics.revenue+=quote.gross;return quote.gross;
  }
  quoteTransfer(item,amount,from,to) {
    product(item);quantity(amount);const source=this.#site(from);this.#site(to);
    if(from===to)fail('Для перевозки нужны разные площадки.');
    const fleet=this.fleet(),duration=Math.max(1,distance(from,to)-(this.#world.research.includes('logistics')?1:0)),fee=duration*2+amount,reasons=[];
    if(amount>source.inventory[item])reasons.push('На исходном складе недостаточно товара.');
    if(amount>this.freeSpace(to))reasons.push('На складе назначения недостаточно свободного места.');
    if(amount>fleet.capacity)reasons.push('Вместимость транспорта: '+fleet.capacity+' ед.');
    if(!fleet.freeSlots)reasons.push('Все машины в пути.');
    if(this.#world.balance<fee)reasons.push('На перевозку нужно '+fee+' ₽.');
    return {product:item,quantity:amount,from,to,fee,duration,capacity:fleet.capacity,canDispatch:!reasons.length,reasons};
  }
  transfer(item,amount,from,to) {
    const quote=this.quoteTransfer(item,amount,from,to);
    if(!quote.canDispatch)fail('Перевозка недоступна: '+quote.reasons.join(' '));
    this.#pay(quote.fee);this.#world.network.fees+=quote.fee;this.#site(from).inventory[item]-=amount;
    const transfer={id:this.#world.network.nextTransfer++,product:item,quantity:amount,from,to,fee:quote.fee,duration:quote.duration,remaining:quote.duration,sentAt:this.#world.tick,arrivesAt:this.#world.tick+quote.duration,status:'transit'};
    this.#world.network.transfers.push(transfer);
    const history=this.#world.network.transfers;
    while(history.length>48){const index=history.findIndex(t=>t.status==='delivered');if(index<0)break;history.splice(index,1);}
    return copy(transfer);
  }
  purchaseLine(id) {
    const site=this.#site(id);if(site.lines.length>=4)fail('На площадке не более четырёх линий.');
    this.#pay(1200*site.lines.length);const line={id:'line-'+(site.lines.length+1),level:1,job:null};site.lines.push(line);return line.id;
  }
  upgradeLine(id,lineId='line-1') {
    const line=this.#site(id).lines.find(line=>line.id===lineId);
    if(!line)fail('Линия не найдена.');if(line.level>=6)fail('Достигнут максимальный уровень.');
    this.#pay(750*line.level);return ++line.level;
  }
  upgradeWarehouse(id) {
    const site=this.#site(id);if(site.warehouseLevel>=6)fail('Достигнут максимальный уровень.');
    this.#pay(500*site.warehouseLevel);
    if(id==='city'){this.#world.warehouseLevel++;this.#world.capacity=100*this.#world.warehouseLevel;return this.#world.warehouseLevel;}
    site.warehouseLevel++;site.capacity=100*site.warehouseLevel;return site.warehouseLevel;
  }
  upgradeFleet() {
    const network=this.#world.network;if(network.fleetLevel>=4)fail('Достигнут максимальный уровень транспорта.');
    this.#pay(900*network.fleetLevel);network.fleetLevel++;return this.fleet();
  }
  discard(id,item,amount) {
    product(item);quantity(amount);const site=this.#site(id);
    if(amount>site.inventory[item])fail('Недостаточно готового товара для списания.');
    site.inventory[item]-=amount;return amount;
  }
  advance() {
    for(const site of this.#world.network.sites)for(const line of site.lines){
      if(line.job&&--line.job.remaining===0){site.inventory[line.job.product]+=line.job.quantity;this.#world.metrics.produced+=line.job.quantity;line.job=null;}
    }
    for(const transfer of this.#world.network.transfers){
      if(transfer.status==='transit'&&--transfer.remaining===0){
        this.#site(transfer.to).inventory[transfer.product]+=transfer.quantity;
        transfer.status='delivered';this.#world.network.moved+=transfer.quantity;
      }
    }
  }
  historyPoint() { return this.sites().map(site=>({id:site.id,inventory:site.inventory,inventoryTotal:site.inventoryTotal,busyLines:site.busyLines,totalLines:site.lines.length,inbound:site.inbound,freeSpace:site.freeSpace})); }
}

/** Validate reservations together with the original city warehouse, not separately. */
export function validateNetwork(world) {
  const n=world.network;
  if(!n||!Array.isArray(n.sites)||n.sites.length>2||!Array.isArray(n.transfers)||n.transfers.length>48||!whole(n.nextTransfer,1,Number.MAX_SAFE_INTEGER)||!whole(n.fleetLevel,1,4)||!whole(n.moved,0,Number.MAX_SAFE_INTEGER)||!whole(n.fees,0,Number.MAX_SAFE_INTEGER))fail('Некорректная производственная сеть.');
  const ids=new Set(['city']);
  for(const site of n.sites){
    const def=SITE_CATALOG.find(item=>item.id===site?.id);
    if(!def||ids.has(site.id)||site.region!==def.region||!world.regions.includes(site.region)||!whole(site.warehouseLevel,1,6)||site.capacity!==100*site.warehouseLevel||!site.inventory||Object.keys(site.inventory).length!==Object.keys(PRODUCTS).length||Object.keys(PRODUCTS).some(id=>!whole(site.inventory[id]))||!Array.isArray(site.lines)||site.lines.length<1||site.lines.length>4)fail('Некорректная площадка.');
    ids.add(site.id);
    site.lines.forEach((line,index)=>{
      if(line?.id!=='line-'+(index+1)||!whole(line.level,1,6))fail('Некорректная линия площадки.');
      if(line.job!==null){
        const job=line.job,recipe=RECIPES[job?.product];
        if(!Object.hasOwn(RECIPES,job?.product)||recipe.research&&!world.research.includes(recipe.research)||!whole(job.quantity,1,8*line.level)||!whole(job.remaining,1,recipe.duration))fail('Некорректная партия площадки.');
      }
    });
  }
  let active=0;const transferIds=new Set();
  for(const t of n.transfers){
    if(!t||!whole(t.id,1,n.nextTransfer-1)||transferIds.has(t.id)||!ids.has(t.from)||!ids.has(t.to)||t.from===t.to||!Object.hasOwn(PRODUCTS,t.product)||!whole(t.quantity,1,20*n.fleetLevel)||!['transit','delivered'].includes(t.status)||!whole(t.duration,1,distance(t.from,t.to))||t.fee!==t.duration*2+t.quantity||!whole(t.sentAt,0,world.tick)||t.arrivesAt!==t.sentAt+t.duration||!whole(t.remaining,0,t.duration)||t.remaining!==Math.max(0,t.arrivesAt-world.tick)||t.status!==(t.remaining>0?'transit':'delivered'))fail('Некорректная внутренняя перевозка.');
    transferIds.add(t.id);if(t.status==='transit')active++;
  }
  if(active>n.fleetLevel)fail('Слишком много перевозок.');
  const network=new ProductionNetwork(world);
  for(const id of ids)if(network.freeSpace(id)<0)fail('Склад переполнен с учётом внутренних перевозок.');
  for(const point of world.history){
    if(point.sites===undefined)continue;
    if(!Array.isArray(point.sites)||point.sites.length<1||point.sites.length>3||new Set(point.sites.map(site=>site?.id)).size!==point.sites.length||point.sites.some(site=>!ids.has(site?.id)||!site.inventory||Object.keys(PRODUCTS).some(id=>!whole(site.inventory[id]))||!whole(site.inventoryTotal,0,1800)||site.inventoryTotal!==Object.values(site.inventory).reduce((sum,n)=>sum+n,0)||!whole(site.busyLines,0,4)||!whole(site.totalLines,1,4)||site.busyLines>site.totalLines||!whole(site.inbound,0,600)||!whole(site.freeSpace,0,600)))fail('Некорректная история площадок.');
  }
}
