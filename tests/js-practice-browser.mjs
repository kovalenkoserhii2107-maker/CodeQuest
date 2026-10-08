import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile,mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { chromium } from '@playwright/test';
const root=resolve(import.meta.dirname,'..'),types={'.svg':'image/svg+xml','.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{const raw=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+decodeURIComponent(raw==='/'?'/index.html':raw));if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));// Playwright's serviceWorkers:'block' injects code that throws in opaque sandboxed frames.
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('codequest.city.v1')));
async function code(text,path='index.js'){await page.locator('.city-section-nav [data-jump="workspace"]').click();await page.locator('[data-path="'+path+'"]').click();await page.waitForSelector('#city-campaign .monaco-editor');await page.evaluate(async({text,path})=>{const {editor}=await import('/vendor/editor.js');const model=editor.getModels().find(m=>m.uri.path.endsWith('/'+path));if(!model)throw new Error(path);model.setValue(text);},{text,path});}
async function step(){await page.locator('.city-section-nav [data-jump="workspace"]').click();await page.locator('[data-run]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);}
async function refresh(){await page.locator('[data-dashboard-refresh]').click();await page.waitForFunction(()=>/render\(\)|Ошибка дашборда/.test(document.querySelector('[data-dashboard-status]').textContent));}
await mkdir(resolve(root,'tests/artifacts'),{recursive:true});
try {
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('[data-campaign="city"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 await code('export function main(cq) {\n  console.log("editor");\n}\n');
 const editorState=await page.evaluate(async()=>{const m=await import('/vendor/editor.js');const e=m.editor.getEditors().find(e=>e.getModel()?.uri.path.endsWith('/index.js')),model=e.getModel();e.pushUndoStop();e.executeEdits('test',[{range:new m.Range(4,1,4,1),text:'// editable\n'}]);e.pushUndoStop();e.setPosition({lineNumber:2,column:4});return {id:model.id,value:model.getValue()};});
 await page.locator('[data-path="dashboards/overview.js"]').click();
 await page.locator('[data-path="index.js"]').click();
 const retained=await page.evaluate(async()=>{const m=await import('/vendor/editor.js');const e=m.editor.getEditors().find(e=>e.getModel()?.uri.path.endsWith('/index.js'));return {id:e.getModel().id,undo:e.getModel().canUndo(),position:e.getPosition()};});
 assert.equal(retained.id,editorState.id);assert.equal(retained.undo,true);assert.deepEqual(retained.position,{lineNumber:2,column:4});
 await page.keyboard.press('Control+z');
 assert.ok(!(await save()).files['index.js'].includes('editable'));
 console.log('✓ file switching preserves model, cursor and a functional undo stack');

 await code('export function main(cq) {\n  console.log("before-failure", undefined, 5n);\n  console.warn("reserve-warning");\n  cq.market.buy("scrap", 1);\n  cq.memory.changed = true;\n  console.error(new Error("diagnostic"));\n  throw new Error("deliberate-failure");\n}');
 await page.locator('[data-console-clear]').click();const beforeFailure=await save();await step();
 const output=await page.locator('[data-output]').textContent();
 assert.ok(output.includes('before-failure undefined 5n'));assert.ok(output.includes('Error: diagnostic'));assert.ok(output.includes('deliberate-failure'));
 assert.deepEqual((await save()).world,beforeFailure.world);assert.deepEqual((await save()).memory,beforeFailure.memory);
 assert.equal(await page.locator('.city-console-row').filter({hasText:'before-failure'}).count(),1);
 await page.locator('[data-console-filter]').selectOption('warn');assert.ok((await page.locator('[data-output]').textContent()).includes('reserve-warning'));assert.ok(!(await page.locator('[data-output]').textContent()).includes('before-failure'));
 await page.locator('[data-console-filter]').selectOption('error');await page.locator('.city-console-location').click();
 assert.equal(await page.evaluate(async()=>{const m=await import('/vendor/editor.js');return m.editor.getEditors().find(e=>e.getModel()?.uri.path.endsWith('/index.js')).getPosition().lineNumber;}),7);
 await page.locator('[data-console-filter]').selectOption('all');
 await code('export async function main(cq) { console.log("streaming-before-cancel"); await new Promise(() => {}); }');
 await page.locator('[data-run]').click();
 await page.waitForFunction(()=>document.querySelector('[data-output]').textContent.includes('streaming-before-cancel'));
 assert.equal(await page.locator('[data-run]').isDisabled(),true);await page.locator('[data-cancel]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);
 assert.ok((await page.locator('[data-output]').textContent()).includes('Запуск отменён'));
 assert.deepEqual((await save()).world,beforeFailure.world);
 await code('export function main(cq){ console.info("preview-output"); cq.memory.preview=true; cq.market.buy("scrap",1); }');
 await page.locator('[data-preview]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);
 assert.ok((await page.locator('[data-output]').textContent()).includes('Проба index.js'));assert.deepEqual((await save()).world,beforeFailure.world);assert.deepEqual((await save()).memory,beforeFailure.memory);
 console.log('✓ streaming console, error levels and source links; atomic failure, cancellation and preview retain diagnostics');

 await page.locator('[data-console-float]').click();await page.locator('.city-section-nav [data-jump="world"]').click();
 assert.equal(await page.locator('[data-console]').isVisible(),true);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:resolve(root,'tests/artifacts/console-window-mobile.png'),fullPage:true});
 await page.locator('[data-console-float]').click();assert.equal(await page.locator('[data-console]').isVisible(),false);
 await page.setViewportSize({width:1600,height:1100});await page.locator('.city-section-nav [data-jump="workspace"]').click();

 await page.locator('[data-dashboard-live]').uncheck();
 const dashboardCode='export function render(cq, view) { console.log("render-output", cq.world.getTime()); return {title:"Console dashboard",columns:2,controls:[{id:"note",type:"text",label:"Заметка",value:""}],widgets:[{id:"chart",type:"chart",title:"History",style:"area",points:[0,10,4],labels:["a","b","c"]},{id:"load",type:"progress",title:"Load",value:0,max:1}]}; }';
 await code(dashboardCode,'dashboards/overview.js');const dashboardBefore=(await save()).world;await refresh();
 assert.ok((await page.locator('[data-output]').textContent()).includes('render-output'));
 assert.deepEqual((await save()).world,dashboardBefore);
 const input=page.locator('[data-dashboard-output] [data-dashboard-input="note"]');await input.fill('unfinished draft');await input.evaluate(el=>el.setSelectionRange(4,8));
 await page.evaluate(()=>document.querySelector('[data-wait]').click());
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]').textContent.includes('Снимок шага 1'));
 assert.equal(await input.inputValue(),'unfinished draft');assert.equal(await input.evaluate(el=>document.activeElement===el),true);assert.deepEqual(await input.evaluate(el=>[el.selectionStart,el.selectionEnd]),[4,8]);
 await input.press('Tab');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codequest.city.v1')).dashboards.inputs['dashboards/overview.js']?.note==='unfinished draft');
 const readOnlyBefore=(await save()).world;
 await code('export function render(cq) { console.log("before-render-error"); cq.market.buy("scrap",1); return {widgets:[]}; }','dashboards/overview.js');await refresh();
 assert.ok((await page.locator('[data-output]').textContent()).includes('before-render-error'));assert.ok((await page.locator('[data-dashboard-status]').textContent()).includes('последний успешный'));
 assert.deepEqual((await save()).world,readOnlyBefore);assert.equal(await page.locator('[data-dashboard-output] .city-chart svg').count(),1);
 await code(dashboardCode,'dashboards/overview.js');await refresh();
 console.log('✓ dashboard logs and readonly failure; chart/progress, snapshot tick, uncommitted filter text, focus and selection');

 const solutions={
  budget:'export function planPurchase({balance,price,stock,freeSpace,reserve=0}) { console.log("budget-test"); if (![balance,price,stock,freeSpace,reserve].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0)||price===0)return 0; return Math.max(0,Math.floor(Math.min((balance-reserve)/price,stock,freeSpace))); }',
  lines:'export function chooseLine(lines) { return [...lines].filter(l=>l.job===null).sort((a,b)=>b.level-a.level||(a.id<b.id?-1:a.id>b.id?1:0))[0]?.id??null; }',
  report:'export function summarize({inventory={},lines=[],balance=0}) { const busyLines=lines.filter(l=>l.job).length; return {inventoryTotal:Object.values(inventory).reduce((s,n)=>s+n,0),busyLines,freeLines:lines.length-busyLines,lowBalance:balance<100}; }'
 };
 const practiceBefore=(await save()).world;
 for(const [id,solution]of Object.entries(solutions)){
  await page.locator('.city-section-nav [data-jump="task"]').click();await page.locator('[data-practice-open="'+id+'"]').click();
  const path='practice/'+(id==='lines'?'lines':id)+'.js';
  assert.equal((await save()).workspace.active,path);
  await page.locator('.city-section-nav [data-jump="task"]').click();await page.locator('[data-practice-test="'+id+'"]').click();
  await page.waitForFunction(id=>document.querySelector('[data-practice-result="'+id+'"]').dataset.state==='error',id);
  await code(solution,path);await page.locator('.city-section-nav [data-jump="task"]').click();await page.locator('[data-practice-test="'+id+'"]').click();
  await page.waitForFunction(id=>document.querySelector('[data-practice-result="'+id+'"]').dataset.state==='success',id);
  assert.ok((await page.locator('[data-practice-result="'+id+'"]').textContent()).includes(id==='budget'?'9 / 9':id==='lines'?'6 / 6':'5 / 5'));
  assert.deepEqual((await save()).world,practiceBefore);
  const existing=(await save()).files[path];await page.locator('[data-practice-open="'+id+'"]').click();assert.equal((await save()).files[path],existing);
 }
 await code('import { summarize } from "../practice/report.js"; export function render(cq){ const s=summarize(cq.world.getState()); console.log("report-dashboard",s);return {title:"Tested report",widgets:[{id:"stock",type:"stat",title:"Stock",value:s.inventoryTotal},{id:"load",type:"progress",title:"Load",value:s.busyLines,max:Math.max(1,s.busyLines+s.freeLines)}]}; }','dashboards/overview.js');await refresh();
 assert.equal(await page.locator('[data-dashboard-output] h3').textContent(),'Tested report');assert.deepEqual((await save()).world,practiceBefore);
 console.log('✓ all three practices fail TODOs, accept working functions in real Workers, preserve files and world, and integrate with dashboards');

 await code('export function main(cq) {\n const world=cq.world.getState();\n for(const buyer of cq.market.getBuyers("metal").filter(b=>!b.remote&&world.regions.includes(b.region))){const n=Math.min(cq.warehouse.getStock("metal"),buyer.demand);if(n>0)cq.market.sell("metal",n,buyer.id);}\n const line=cq.factory.getLines().find(l=>!l.job);if(!line){console.log("Waiting for production");return;}\n const supplier=cq.market.getSuppliers()[0],reserve=100;\n const needed=Math.max(0,16-cq.warehouse.getStock("scrap")),budget=Math.floor(Math.max(0,cq.world.getState().balance-reserve)/supplier.price);\n const buy=Math.min(needed,budget,supplier.stock,cq.warehouse.getFreeSpace());if(buy>0)cq.market.buy("scrap",buy,supplier.id);\n const amount=Math.min(8,Math.floor(cq.warehouse.getStock("scrap")/2),Math.floor(Math.max(0,cq.world.getState().balance-reserve)/2));\n if(amount>0)cq.factory.start("metal",amount,line.id);\n console.log("Production plan",amount);\n}');
 const economyStart=(await save()).world;
 for(let i=0;i<20;i++)await step();
 const economy=(await save()).world;
 assert.equal(economy.tick,economyStart.tick+20);assert.ok(economy.metrics.produced>=40);assert.ok(economy.metrics.sold>=40);assert.ok(economy.balance>economyStart.balance);assert.ok(economy.balance>=100);
 assert.ok(!(await page.locator('[data-run-status]').textContent()).includes('Ошибка'));
 await page.screenshot({path:resolve(root,'tests/artifacts/js-practice-desktop.png'),fullPage:true});
 await page.locator('.city-section-nav [data-jump="task"]').click();await page.screenshot({path:resolve(root,'tests/artifacts/js-practice-tasks.png'),fullPage:true});
 await code('export function main(){ for(let i=0;i<1000;i++)console.log("bulk",i); }');
 await page.locator('[data-console-clear]').click();
 for(let i=0;i<6;i++){await page.locator('[data-preview]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);}
 assert.equal(await page.locator('.city-console-row').count(),500);
 assert.equal(await page.locator('.city-console-row').filter({hasText:'bulk 100'}).count(),0);
 assert.ok((await page.locator('[data-output]').textContent()).includes('bulk 99'));
 assert.deepEqual((await save()).world,economy);
 console.log('✓ bounded console under repeated high-volume output; 100 logs per run, 500 retained records, probes preserve the world');

 await page.locator('#city-campaign a[href="#/campaigns"]').click();await page.locator('#campaign-theme').click();await page.locator('[data-campaign="city"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 assert.ok((await save()).files['practice/report.js']);assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.setViewportSize({width:390,height:844});await page.locator('.city-section-nav [data-jump="task"]').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(root,'tests/artifacts/js-practice-mobile-light.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('✓ 20 productive steps with reserve and profit, persistence, campaign lifecycle, light theme and mobile practice');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
