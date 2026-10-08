import { PRODUCTS } from './catalog.js';
import { escapeHtml } from '../ui/html.js';
const money=n=>n.toLocaleString('ru-RU')+' $';
export class NetworkView {
  #root; #engine; #tick=-1; #openAPI;
  constructor(root,openAPI){
    this.#root=root;this.#openAPI=openAPI;
    root.addEventListener('click',event=>{
      const help=event.target.closest('[data-network-api]');
      if(help)this.#openAPI(help.dataset.networkApi);
      const copy=event.target.closest('[data-network-copy]');
      if(copy)this.#copy(copy);
    });
  }
  async #copy(button){
    const pre=button.closest('details').querySelector('pre'),status=button.closest('details').querySelector('[data-network-copy-status]');
    try{await navigator.clipboard.writeText(pre.textContent);status.textContent='Скопировано. Допишите стратегию в index.js.';}
    catch{const range=document.createRange();range.selectNodeContents(pre);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Код выделен. Скопируйте вручную.';}
  }
  render(engine){
    if(this.#engine===engine&&this.#tick===engine.getTime())return;
    this.#engine=engine;this.#tick=engine.getTime();
    const open=new Set([...this.#root.querySelectorAll('details[open]')].map(node=>node.dataset.networkDetail));
    const sites=engine.getSites(),catalog=engine.getSiteCatalog(),fleet=engine.getFleet(),world=engine.snapshot(),regions=engine.getRegions();
    const total=sites.reduce((s,site)=>s+site.inventoryTotal,0),capacity=sites.reduce((s,site)=>s+site.capacity,0),lines=sites.reduce((s,site)=>s+site.lines.length,0),busy=sites.reduce((s,site)=>s+site.busyLines,0);
    this.#root.innerHTML='<header class="city-network-heading"><div><p class="campaign-eyebrow">От мастерской к производственной сети</p><h2>Сеть предприятия</h2><p>Независимые склады, местные рынки и линии. Общие деньги и исследования.</p></div><button type="button" data-network-api="cq.network.getSites">API сети</button></header><div class="city-network-summary"><div><small>Готовые запасы</small><strong>'+total+' / '+capacity+'</strong></div><div><small>Занятые линии</small><strong>'+busy+' / '+lines+'</strong></div><div><small>Машины в пути</small><strong>'+fleet.active+' / '+fleet.slots+'</strong></div><div><small>Перемещено внутри сети</small><strong>'+world.network.moved+' ед.</strong></div></div><p class="city-muted">Место под партии и входящие грузы уже занято. Товар в пути ещё не доступен на складе. До 3 площадок, 12 линий и 1800 мест.</p><div class="city-network-sites">'+catalog.map(def=>{
      const site=sites.find(site=>site.id===def.id),region=regions.find(region=>region.id===def.region);
      const code=site?'for (const site of cq.network.getSites()) {\n  console.log(site.id, site.inventory, site.freeSpace);\n}':'const site = cq.network.getCatalog().find(s => s.id === "'+def.id+'");\n// Сначала откройте регион через cq.world.explore(site.region).\n// Оставьте резерв на сырьё, энергию и перевозки.\nif (site.canOpen) cq.network.open(site.id);';
      return '<article class="city-network-site" data-network-site="'+def.id+'" data-built="'+Boolean(site)+'"><img src="assets/locations/'+def.id+'.svg" alt="" width="330" height="150"><div class="city-network-site-body"><p class="campaign-eyebrow">'+def.region+' / '+(site?'работает':def.locked?'регион закрыт':'можно построить')+'</p><h3>'+escapeHtml(def.name)+'</h3><p>'+escapeHtml(def.specialty)+'</p>'+
       (site?'<div class="city-network-space"><span>Свободно <strong>'+site.freeSpace+'</strong> / '+site.capacity+'</span><progress value="'+(site.capacity-site.freeSpace)+'" max="'+site.capacity+'" aria-label="Занято места: '+def.name+'"></progress><small>Готово: '+site.inventoryTotal+' · партии: '+site.reserved+' · входящие: '+site.inbound+'</small></div><dl class="city-stock">'+Object.entries(site.inventory).map(([id,n])=>'<dt>'+PRODUCTS[id]+'</dt><dd>'+n+'</dd>').join('')+'</dl><div class="city-network-lines">'+site.lines.map(line=>'<p><code>'+line.id+'</code> · уровень '+line.level+'<br><small>'+(line.job?PRODUCTS[line.job.product]+' × '+line.job.quantity+' · ещё '+line.job.remaining+' шаг.':'Свободна · партия до '+line.level*8)+'</small></p>').join('')+'</div><button type="button" data-network-api="cq.network.quoteProduction">Проверить местную партию</button>':
        '<p class="city-network-cost">Строительство: <strong>'+money(def.cost)+'</strong>'+(!region.unlocked?'<br>Доступ к региону: '+money(region.cost):'')+'</p><p class="city-muted">Новый склад на 100 мест и одна линия. Строительство выполняется вашим кодом.</p><button type="button" data-network-api="'+(def.locked?'cq.world.explore':'cq.network.open')+'">'+(def.locked?'Как открыть регион':'Как построить площадку')+'</button>')+
        '<details data-network-detail="'+def.id+'"><summary>'+(site?'Прочитать состояние в коде':'Пример открытия через код')+'</summary><pre>'+escapeHtml(code)+'</pre><button type="button" data-network-copy>Копировать</button><p data-network-copy-status class="city-muted" role="status"></p></details></div></article>';
    }).join('')+'</div><section class="city-network-fleet"><div><h3>Внутренний транспорт · уровень '+fleet.level+'</h3><p>Одна машина: '+fleet.capacity+' ед. · свободных машин: '+fleet.freeSlots+'. '+(fleet.upgradeCost?'Следующий уровень: '+money(fleet.upgradeCost):'Максимальный уровень.')+'</p><p class="city-muted">Город ↔ порт: 3 шага; город ↔ север: 4; порт ↔ север: 5. Исследование logistics сокращает новую перевозку на шаг. Цена: 2 $ × длительность + количество. Дата прибытия фиксируется при отправке.</p></div><div><button type="button" data-network-api="cq.network.quoteTransfer">Проверка перевозки</button><button type="button" data-network-api="cq.network.upgradeFleet">Улучшение транспорта</button></div></section><div class="city-table-scroll"><table><caption>Собственные товары в пути и история перевозок</caption><thead><tr><th>Груз</th><th>Откуда → куда</th><th>Товар</th><th>Статус / срок</th><th>Стоимость</th></tr></thead><tbody>'+
     (world.network.transfers.length?world.network.transfers.slice().reverse().map(t=>'<tr data-network-transfer="'+t.id+'" data-status="'+t.status+'"><td>№'+t.id+'</td><td><code>'+t.from+' → '+t.to+'</code></td><td>'+PRODUCTS[t.product]+' × '+t.quantity+'</td><td>'+(t.status==='transit'?'<span class="city-network-moving">В пути</span> · '+t.remaining+' шаг.<br><small>Прибытие: шаг '+t.arrivesAt+'</small>':'Доставлено · шаг '+t.arrivesAt)+'</td><td>'+money(t.fee)+'</td></tr>').join(''):'<tr><td colspan="5">Перевозок ещё нет. Постройте филиал и рассчитайте первую поставку через quoteTransfer.</td></tr>')+'</tbody></table></div><p class="city-muted">Перевозка между своими складами не является продажей. Деньги поступают только от покупателя; городской контракт использует центральный склад.</p>';
    for(const detail of this.#root.querySelectorAll('[data-network-detail]'))detail.open=open.has(detail.dataset.networkDetail);
  }
}
