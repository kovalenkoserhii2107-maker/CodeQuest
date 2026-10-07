import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { CityEngine,initialWorld } from '../js/city/engine.js';
import { createCityAPI } from '../js/city/api.js';
import { validateDashboard } from '../js/city/dashboard-model.js';
import { WIDGET_SOURCES,BOARD_TEMPLATES,boardFromTemplate,widgetFromSource,generateDashboard,validateBoard } from '../js/city/dashboard-builder-model.js';
import { GUIDE_RECIPES,DASHBOARD_GUIDE_CODE } from '../js/city/api-guide.js';
import { API_METHODS } from '../js/city/api-reference.js';
for(const path of ['navigation','region-map','dashboard-builder-model','dashboard-builder','dashboard-charts','api-guide','ui','api-reference','dashboard-model','dashboard-view','dashboard-controller']){
 const check=spawnSync(process.execPath,['--check','js/city/'+path+'.js'],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
}
const rich=()=>new CityEngine({...initialWorld(),balance:20000,inventory:{scrap:20,metal:10,parts:4,wire:6,circuit:0}});
const moduleFor=code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const template of BOARD_TEMPLATES){
 const board=boardFromTemplate(template.id),source=generateDashboard(board),entry=await moduleFor(source);
 for(const world of [new CityEngine(),rich()]){
  const before=world.snapshot(),memory={kept:1},api=createCityAPI(world,memory,{readOnly:true});
  const result=validateDashboard(entry.render(api,{inputs:{}}));
  assert.equal(result.title,board.title);assert.equal(result.widgets.length,board.widgets.length);
  assert.deepEqual(world.snapshot(),before);assert.deepEqual(memory,{kept:1});
  if(template.id==='markets')assert.equal(result.controls[0].id,'product');
 }
}
const all=boardFromTemplate('empty');all.widgets=WIDGET_SOURCES.map((s,i)=>widgetFromSource(s.id,i+1));all.title='My "title" <script> literal';
const allEntry=await moduleFor(generateDashboard(all)),world=rich(),api=createCityAPI(world,{}, {readOnly:true});
for(const style of ['line','area','bar']){
 for(const w of all.widgets)w.style=style;
 const entry=await moduleFor(generateDashboard(all)),out=validateDashboard(entry.render(api,{inputs:{product:'parts'}}));
 assert.equal(out.widgets.find(w=>w.type==='chart').style,style);
 assert.equal(out.widgets.find(w=>w.type==='progress').max,1);
}
assert.equal(validateDashboard(allEntry.render(api,{inputs:{}})).title,all.title);
assert.throws(()=>validateBoard({...all,widgets:[]}));
assert.throws(()=>validateBoard({...all,widgets:[...all.widgets,...all.widgets]}));
assert.throws(()=>validateBoard({...all,widgets:[{...all.widgets[0],source:'unknown'}]}));
assert.throws(()=>validateDashboard({widgets:[{id:'busy',type:'progress',value:-1,max:1}]}));
assert.throws(()=>validateDashboard({widgets:[{id:'busy',type:'progress',value:2,max:1}]}));
assert.throws(()=>validateDashboard({widgets:[{id:'busy',type:'progress',value:0,max:0}]}));
assert.equal(validateDashboard({widgets:[{id:'old',type:'chart',points:[1,2]}]}).widgets[0].style,'line');
console.log('✓ every builder template/source runs as real readonly JS; styles, progress, literal titles, limits and old charts validate');

for(const recipe of GUIDE_RECIPES){
 for(const method of recipe.methods)assert.ok(API_METHODS.some(m=>m.path===method),method);
 const entry=await moduleFor(recipe.code),host=rich(),before=host.snapshot(),ops=[],local=new CityEngine(before);
 entry.main(createCityAPI(local,{}, {onCommand:op=>ops.push(op)}));host.apply(ops);
 if(recipe.id==='batch')assert.equal(host.snapshot().lines[0].job.product,'metal');
 if(recipe.id==='sale')assert.equal(host.snapshot().inventory.metal,0);
 if(recipe.id==='delivery')assert.equal(host.snapshot().shipments[0].routeId,'barge');
 if(recipe.id==='orders')assert.equal(host.getOrders()[0].status,'pending');
}
const guideEntry=await moduleFor(DASHBOARD_GUIDE_CODE),guideWorld=rich(),before=guideWorld.snapshot();
assert.equal(validateDashboard(guideEntry.render(createCityAPI(guideWorld,{}, {readOnly:true}),{inputs:{}})).widgets.length,3);
assert.deepEqual(guideWorld.snapshot(),before);
console.log('✓ guide examples execute production, sale, region unlock/delivery and orders; render stays readonly');
