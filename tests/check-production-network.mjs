import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { CityEngine,initialWorld,initialSave,readCitySave,validateWorld } from '../js/city/engine.js';
import { createCityAPI } from '../js/city/api.js';
for(const name of ['network','network-reference','network-guide','network-view','engine','api','catalog','ui','dashboard-builder-model','lessons']){const p=spawnSync(process.execPath,['--check','js/city/'+name+'.js'],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
const rich=()=>new CityEngine({...initialWorld(),balance:500000,inventory:{scrap:40,metal:30,parts:0,wire:0,circuit:0}});
const e=rich(),api=createCityAPI(e,{});
const unchanged=e.snapshot();
assert.equal(api.network.getSites().length,1);assert.equal(api.network.getCatalog()[1].canOpen,false);
assert.deepEqual(e.snapshot(),unchanged);
assert.throws(()=>api.network.open('port'),/регион/);assert.throws(()=>api.network.open('city'));
api.world.explore('port');api.world.explore('highlands');
const money=e.snapshot().balance;api.network.open('port');assert.equal(e.snapshot().balance,money-1800);
assert.throws(()=>api.network.open('port'),/уже/);
assert.throws(()=>api.network.buy('port','metal',1,'northern-metal'),/местный/);
api.network.buy('port','scrap',20,'port-yard');
assert.equal(api.network.getSite('port').inventory.scrap,20);assert.equal(e.snapshot().inventory.scrap,40);
assert.equal(e.getSuppliers().find(s=>s.id==='port-yard').stock,60);
const quote=api.network.quoteProduction('port','metal',5);
assert.equal(quote.canStart,true);assert.equal(quote.duration,2);
api.network.start('port','metal',5);assert.equal(api.network.getSite('port').freeSpace,85);
assert.throws(()=>api.network.start('port','metal',1),/занята/);
e.advance();assert.equal(api.network.getSite('port').inventory.metal,0);e.advance();
assert.equal(api.network.getSite('port').inventory.metal,5);assert.equal(e.snapshot().inventory.metal,30);
const parts=api.network.quoteProduction('port','parts',2);
assert.equal(parts.energyCost,8);assert.equal(parts.duration,3);assert.equal(e.getProductionQuote('parts',2).energyCost,12);
api.network.start('port','parts',2);for(let i=0;i<3;i++)e.advance();
assert.equal(api.network.getSite('port').inventory.parts,2);
assert.equal(e.snapshot().metrics.produced,7);
const trade=api.network.quoteTrade('port','parts',2,'harbor-parts');
assert.equal(trade.canTrade,true);assert.equal(api.network.quoteTrade('port','parts',1,'repair').canTrade,false);
assert.equal(api.network.quoteTrade('city','parts',1,'district').canTrade,false);
console.log('✓ independent sites, regional procurement, local trade, specialization, jobs and shared financial metrics');

const free=e.getFreeSpace(),balance=e.snapshot().balance,q=api.network.quoteTransfer('parts',2,'port','city');
assert.equal(q.duration,3);assert.equal(q.fee,8);assert.equal(q.canDispatch,true);
const transfer=api.network.transfer('parts',2,'port','city');
assert.equal(e.snapshot().balance,balance-8);assert.equal(api.network.getSite('port').inventory.parts,0);
assert.equal(e.getFreeSpace(),free-2);assert.equal(e.snapshot().inventory.parts,0);
assert.equal(api.network.getFleet().freeSlots,0);
assert.equal(api.network.quoteTransfer('metal',1,'city','port').canDispatch,false);
assert.throws(()=>api.network.transfer('metal',1,'city','port'),/машины/);
e.advance();e.advance();assert.equal(e.snapshot().inventory.parts,0);e.advance();
assert.equal(e.snapshot().inventory.parts,2);assert.equal(e.getFreeSpace(),free-2);
assert.equal(api.network.getTransfers().find(t=>t.id===transfer.id).status,'delivered');
assert.equal(e.snapshot().network.moved,2);assert.equal(api.network.getFleet().freeSlots,1);
api.network.buy('city','scrap',e.getFreeSpace(),'yard');
assert.equal(api.network.quoteTransfer('metal',1,'port','city').canDispatch,false);
api.factory.start('metal',1);assert.equal(e.getFreeSpace(),1);
api.network.transfer('metal',1,'port','city');assert.equal(e.getFreeSpace(),0);
assert.throws(()=>api.market.buy('scrap',1),/места/);assert.throws(()=>api.warehouse.discard('wire',1));
validateWorld(e.snapshot());
console.log('✓ transfers conserve goods, charge once, reserve arrival space and constrain legacy procurement');

api.network.open('highlands');api.network.buy('port','scrap',25,'port-yard');
assert.equal(api.network.quoteTransfer('scrap',25,'port','highlands').canDispatch,false);
api.network.upgradeFleet();assert.equal(api.network.getFleet().capacity,40);
api.network.transfer('scrap',25,'port','highlands');
assert.equal(api.network.getSite('highlands').inbound,25);
assert.equal(api.network.getFleet().active,2);
assert.throws(()=>api.network.transfer('metal',1,'city','highlands'),/машины/);
api.network.upgradeFleet();api.network.transfer('metal',5,'city','highlands');
assert.equal(api.network.getSite('highlands').freeSpace,70);
const arrival=api.network.getTransfers().filter(t=>t.status==='transit').map(t=>t.arrivesAt);
api.research.unlock('logistics');assert.deepEqual(api.network.getTransfers().filter(t=>t.status==='transit').map(t=>t.arrivesAt),arrival);
for(let i=0;i<5;i++)e.advance();
assert.equal(api.network.getSite('highlands').inventory.scrap,25);
assert.equal(api.network.getSite('highlands').inventory.metal,5);
api.network.buy('highlands','metal',10,'northern-metal');api.research.unlock('wire');api.research.unlock('circuits');
api.network.start('highlands','wire',6);e.advance();
assert.equal(api.network.quoteProduction('highlands','circuit',2).duration,3);
api.research.unlock('throughput');api.research.unlock('efficiency');
assert.equal(api.network.quoteProduction('highlands','circuit',2).duration,2);
assert.equal(api.network.quoteProduction('port','parts',1).energyCost,3);
assert.equal(api.network.getHistory('highlands').at(-1).inventoryTotal,api.network.getSite('highlands').inventoryTotal);
assert.throws(()=>api.network.getHistory('ghost'));assert.throws(()=>api.network.getHistory('port',0));
console.log('✓ fleet capacity and concurrency, fixed arrival times, specialization/research stacking and site history');

const beforeReadonly=e.snapshot(),readonly=createCityAPI(e,{kept:1},{readOnly:true});
for(const command of [()=>readonly.network.open('port'),()=>readonly.network.buy('city','scrap',1,'yard'),()=>readonly.network.transfer('metal',1,'city','port'),()=>readonly.network.upgradeFleet(),()=>readonly.network.start('city','metal',1)])assert.throws(command,/Дашборд/);
readonly.network.getSites();readonly.network.getTransfers();readonly.network.quoteProduction('port','parts',1);
assert.deepEqual(e.snapshot(),beforeReadonly);
const beforeRollback=e.snapshot();
assert.throws(()=>e.apply([{method:'networkBuy',args:['port','scrap',1,'port-yard']},{method:'networkOpen',args:['port']}]),/уже/);
assert.deepEqual(e.snapshot(),beforeRollback);
console.log('✓ readonly guards and atomic rollback cover network commands');

for(const site of api.network.getSites()){
 while(api.network.getSite(site.id).lines.length<4)api.network.purchaseLine(site.id);
 while(api.network.getSite(site.id).warehouseLevel<6)api.network.upgradeWarehouse(site.id);
 assert.throws(()=>api.network.purchaseLine(site.id),/четырёх/);assert.throws(()=>api.network.upgradeWarehouse(site.id),/максимальный/);
}
api.network.upgradeLine('city','line-1');assert.equal(e.snapshot().machineLevel,2);
while(api.network.getFleet().level<4)api.network.upgradeFleet();
assert.throws(()=>api.network.upgradeFleet(),/максимальный/);
assert.equal(api.network.getSites().reduce((sum,s)=>sum+s.lines.length,0),12);
assert.equal(api.network.getSites().reduce((sum,s)=>sum+s.capacity,0),1800);
validateWorld(e.snapshot());
console.log('✓ twelve production lines, 1800 storage units, equipment limits and original city aliases');

const old=initialSave();old.world.schema=4;delete old.world.network;old.memory={strategy:7};old.files['helper.js']='export const x=1;';
const restored=readCitySave({getItem:()=>JSON.stringify(old)});
assert.equal(restored.warning,'');assert.equal(restored.save.world.schema,5);assert.equal(restored.save.world.balance,1000);assert.deepEqual(restored.save.memory,{strategy:7});assert.equal(restored.save.files['helper.js'],old.files['helper.js']);
for(const mutate of [w=>delete w.network,w=>w.network.sites[0].inventory.scrap=-1,w=>w.network.transfers[0].to='ghost',w=>w.network.fleetLevel=0,w=>w.network.transfers[0].fee=0]){
 const invalid=e.snapshot();mutate(invalid);assert.throws(()=>validateWorld(invalid));
}
const loop=rich();loop.openRegion('port');loop.networkOpen('port');loop.networkBuy('port','scrap',2,'port-yard');
for(let i=0;i<70;i++){loop.networkTransfer('scrap',1,i%2?'city':'port',i%2?'port':'city');for(let j=0;j<3;j++)loop.advance();}
assert.equal(loop.getTransfers().length,48);assert.equal(loop.snapshot().network.moved,70);
assert.equal(loop.getSite('port').inventory.scrap+loop.getSite('city').inventory.scrap,42);
assert.equal(loop.snapshot().history.length,120);validateWorld(loop.snapshot());
console.log('✓ schema-4 saves keep files/memory/money; corrupt network state fails; bounded histories preserve goods');
