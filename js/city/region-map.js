import { escapeHtml } from '../ui/html.js';
const meta={city:{tag:'Производство',caption:'Ваш комбинат',x:23,y:48},port:{tag:'Морская торговля',caption:'Порт',x:76,y:66},highlands:{tag:'Электроника',caption:'Северные высоты',x:73,y:30}};
export class RegionMap{
 #root;#engine;#selected='city';#detail;#tick=-1;#lastSelected='';
 constructor(root,onAPI){
  this.#root=root;root.innerHTML='<div class="city-map-heading"><div><p class="campaign-eyebrow">Промышленный округ / 3 района</p><h2>Карта вашего мира</h2></div><p class="city-muted">Выберите район. Открывайте доступ и управляйте поставками через JavaScript.</p></div><div class="city-map-scene"><svg class="city-map-routes" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="city-map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" opacity=".09"/></pattern></defs><rect width="1000" height="420" fill="url(#city-map-grid)"/><path data-map-route="barge" d="M250 230Q480 340 740 300"/><path data-map-route="rail" d="M250 210Q450 65 720 105"/><path data-map-route="courier" d="M200 230q-100 90 20 95q100-20 30-95"/><path data-network-route="city:port" d="M250 230Q480 325 740 300"/><path data-network-route="city:highlands" d="M250 210Q450 80 720 105"/><path data-network-route="highlands:port" d="M735 115Q925 195 750 285"/><circle class="city-map-signal" cx="235" cy="228" r="8"/></svg><div class="city-map-locations">'+Object.entries(meta).map(([id,m])=>'<button type="button" class="city-map-location" data-location="'+id+'" style="--location-x:'+m.x+'%;--location-y:'+m.y+'%" aria-pressed="'+(id==='city')+'"><img src="assets/locations/'+id+'.svg" alt="" width="330" height="300"><strong>'+m.caption+'</strong><span data-map-access></span></button>').join('')+'</div></div><div class="city-map-legend"><span>── Маршрут</span><span>⇢ Пунктир движется, пока груз в пути</span><span>● Ваш комбинат</span></div><div data-location-detail class="city-location-detail"></div>';
  this.#detail=root.querySelector('[data-location-detail]');
  root.querySelectorAll('[data-location]').forEach(button=>button.onclick=()=>{this.#selected=button.dataset.location;this.render(this.#engine);});
  root.addEventListener('click',event=>{const button=event.target.closest('[data-map-api]');if(button)onAPI(button.dataset.mapApi);});
 }
 render(engine){
  if(!engine)return;if(this.#engine===engine&&this.#tick===engine.getTime()&&this.#lastSelected===this.#selected)return;this.#tick=engine.getTime();this.#lastSelected=this.#selected;this.#engine=engine;const regions=engine.getRegions(),state=engine.snapshot(),selected=regions.find(r=>r.id===this.#selected);
  for(const button of this.#root.querySelectorAll('[data-location]')){
   const region=regions.find(r=>r.id===button.dataset.location),site=engine.getSites().find(s=>s.id===region.id);button.dataset.locked=String(!region.unlocked);button.setAttribute('aria-pressed',String(region.id===this.#selected));
   button.querySelector('[data-map-access]').textContent=region.unlocked?(site?'Площадка · '+site.lines.length+' линий':'Открыт · можно построить цех'):region.cost.toLocaleString('ru-RU')+' ₽ · закрыт';
  }
  for(const route of this.#root.querySelectorAll('[data-map-route]')){
   const id=route.dataset.mapRoute,info=engine.getRoutes().find(r=>r.id===id);
   route.dataset.active=String(state.shipments.some(s=>s.routeId===id));route.dataset.locked=String(info.locked);
  }
  for(const route of this.#root.querySelectorAll('[data-network-route]'))route.dataset.active=String(state.network.transfers.some(t=>t.status==='transit'&&[t.from,t.to].sort().join(':')===route.dataset.networkRoute));
  const suppliers=engine.getSuppliers().filter(s=>s.region===selected.id),buyers=engine.getBuyers().filter(b=>b.region===selected.id),event=engine.getEvents().find(e=>e.region===selected.id);
  this.#detail.innerHTML='<div><p class="campaign-eyebrow">'+meta[selected.id].tag+'</p><h3>'+escapeHtml(selected.name)+'</h3><p>'+escapeHtml(selected.description)+'</p><p class="city-muted">'+(event?'Событие: '+escapeHtml(event.name)+' · смена через '+event.changesIn+' шаг.':'')+'</p></div><div><h4>Что здесь доступно</h4><p>'+suppliers.map(s=>'<code>'+s.id+'</code>: '+s.price+' ₽ за '+s.product).join(' · ')+'</p><p>'+buyers.length+' покупателей · '+(selected.unlocked?'доступ разрешён':'разрешение стоит '+selected.cost+' ₽')+'</p><p>Доступ открывается кодом; выбор района ничего не покупает.</p><button type="button" data-map-api="'+(selected.unlocked?'cq.market.getBuyers':'cq.world.explore')+'">'+(selected.unlocked?'Как работать с рынком':'Как открыть район')+'</button><button type="button" data-map-api="cq.logistics.dispatch">Как отправить груз</button><button type="button" data-map-api="cq.network.getCatalog">Производственные площадки</button></div>';
 }
}
