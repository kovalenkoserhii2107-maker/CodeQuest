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
async function refresh(){await page.locator('.city-section-nav [data-jump="workspace"]').click();await page.locator('[data-dashboard-refresh]').click();await page.waitForFunction(()=>/render\(\)|Ошибка дашборда/.test(document.querySelector('[data-dashboard-status]').textContent));}
await mkdir(resolve(root,'tests/artifacts'),{recursive:true});
async function drag(selector,dx,dy){
 const handle=page.locator(selector);await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:6});await page.mouse.up();
}
const layout=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('codequest.city.layout.v1')));
const size=selector=>page.locator(selector).evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}));
try {
 await page.goto('http://127.0.0.1:'+server.address().port);
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.locator('[data-campaign="city"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 await code('export function main(cq){console.log("layout-kept");}');
 const original=await save(),modelId=await page.evaluate(async()=>{const {editor}=await import('/vendor/editor.js');return editor.getModels().find(m=>m.uri.path.endsWith('/index.js')).id;});
 assert.equal(original.world.balance,1000);assert.ok((await page.locator('[data-metrics]').textContent()).includes('$'));assert.ok(!(await page.locator('[data-metrics]').textContent()).includes('₽'));
 const filesBefore=await size('.city-files-panel'),editorBefore=await size('.city-ide-editor'),dashboardBefore=await size('.city-dashboard-shell'),consoleBefore=await size('[data-console]');
 await drag('[data-panel-resize="filesWidth"]',60,0);assert.ok((await size('.city-files-panel')).width>filesBefore.width+40);
 await drag('[data-panel-resize="outputShare"]',-90,0);assert.ok((await size('.city-dashboard-shell')).width>dashboardBefore.width+30);
 for(const key of ['files','editor','dashboard','console'])await drag('[data-panel-resize="'+key+'Height"]',0,60);
 assert.ok((await size('.city-files-panel')).height>filesBefore.height+40);assert.ok((await size('.city-ide-editor')).height>editorBefore.height+40);
 assert.ok((await size('.city-dashboard-shell')).height>dashboardBefore.height+40);assert.ok((await size('[data-console]')).height>consoleBefore.height+40);
 await page.locator('[data-panel-resize="consoleHeight"]').focus();const keyboardBefore=(await layout()).consoleHeight;
 await page.locator('[data-panel-resize="consoleHeight"]').press('ArrowDown');assert.equal((await layout()).consoleHeight,keyboardBefore+20);
 const beforeCancel=await layout(),handle=page.locator('[data-panel-resize="filesWidth"]');await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+80);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y+80);await page.keyboard.press('Escape');await page.mouse.up();
 assert.deepEqual(await layout(),beforeCancel);
 await page.locator('[data-layout-swap]').click();assert.equal((await layout()).outputOrder,'console-first');
 assert.ok((await size('[data-console]')).y<(await size('.city-dashboard-shell')).y);
 assert.deepEqual((await save()).world,original.world);assert.deepEqual((await save()).files,original.files);
 assert.equal(await page.evaluate(async()=>{const {editor}=await import('/vendor/editor.js');return editor.getModels().find(m=>m.uri.path.endsWith('/index.js')).id;}),modelId);
 assert.ok((await page.locator('[data-editor]').textContent()).includes('layout-kept'));
 const prefs=await layout();await page.reload();await page.locator('[data-campaign="city"]').click();await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 assert.deepEqual(await layout(),prefs);assert.equal(await page.locator('[data-ide]').getAttribute('data-output-order'),'console-first');
 assert.ok(Math.abs((await size('.city-files-panel')).width-prefs.filesWidth)<2);assert.ok(Math.abs((await size('.city-ide-editor')).height-prefs.editorHeight)<2);
 await page.locator('.city-section-nav [data-jump="world"]').click();await page.locator('.city-section-nav [data-jump="workspace"]').click();
 assert.equal(await page.locator('[data-panel-resize]').count(),6);
 await page.locator('[data-console-float]').click();assert.equal(await page.locator('[data-console]').evaluate(el=>el.classList.contains('is-floating')),true);
 await page.locator('[data-console-float]').click();assert.ok((await size('[data-console]')).y<(await size('.city-dashboard-shell')).y);
 await page.screenshot({path:resolve(root,'tests/artifacts/adjustable-workspace-desktop.png'),fullPage:true});
 console.log('✓ pointer and keyboard resizing, cancelled drag, independent heights, pane order, floating return, persistence and retained editor model/world');

 const order=await page.locator('[data-dashboard]').evaluate(el=>({result:el.querySelector('[data-dashboard-output]').getBoundingClientRect().top,settings:el.querySelector('.city-dashboard-settings').getBoundingClientRect().top}));
 assert.ok(order.result<order.settings);
 await page.locator('[data-dashboard-builder]').click();await page.waitForFunction(()=>document.querySelector('[data-builder-status]')?.textContent.includes('экономика не изменена'));
 const previewOrder=await page.locator('.city-builder-grid').evaluate(el=>[...el.children].map(x=>x.className));assert.equal(previewOrder[0],'city-builder-preview');
 await page.locator('[data-builder-filter="chart"]').click();
 assert.ok(await page.locator('[data-widget-source]:visible').count()>0);assert.equal(await page.locator('[data-widget-source="balance"]').isVisible(),false);
 await page.locator('[data-builder-search]').fill('Баланс');assert.equal(await page.locator('[data-widget-source]:visible').count(),1);
 await page.locator('[data-widget-source="trend"]').click();
 const last=page.locator('[data-builder-widget]').last();await last.locator('summary').click();await last.locator('[data-builder-widget-title]').fill('Мой график');await last.locator('summary').click();
 assert.equal(await last.locator('[data-builder-widget-title]').isVisible(),false);await last.locator('summary').click();assert.equal(await last.locator('[data-builder-widget-title]').inputValue(),'Мой график');
 await page.locator('.city-builder').evaluate(el=>el.scrollTop=el.scrollHeight);
 const closeBox=await page.locator('[data-builder-close]').boundingBox(),dialogBox=await page.locator('.city-builder').boundingBox();assert.ok(closeBox.y>=dialogBox.y&&closeBox.y+closeBox.height<dialogBox.y+dialogBox.height);
 await page.locator('[data-builder-close]').click();assert.equal(await page.locator('.city-builder').evaluate(el=>el.open),false);
 assert.deepEqual((await save()).world,original.world);
 await page.locator('[data-dashboard-builder]').click();await page.locator('[data-builder-close-bottom]').click();assert.equal(await page.locator('.city-builder').evaluate(el=>el.open),false);
 console.log('✓ dashboard result before settings; builder preview first, searchable tool types, collapsible widget settings and close available at bottom');

 await page.locator('.city-section-nav [data-jump="api"]').click();
 const cards=page.locator('[data-api-list] .city-api-method');assert.ok(await cards.count()>50);
 // Navigation scrolls smoothly. Read both cards in the same frame: separate
 // boundingBox round trips can observe different scroll positions.
 const rows=await page.locator('[data-api-list]').evaluate(async list=>{
  const cards=list.querySelectorAll('.city-api-method'),rows=[];
  // Exercise geometry while scrolling too, rather than suppressing animation.
  window.scrollBy({top:160,behavior:'smooth'});
  for(let frame=0;frame<8;frame++){
   await new Promise(resolve=>requestAnimationFrame(resolve));
   const first=cards[0].getBoundingClientRect(),second=cards[1].getBoundingClientRect();
   rows.push({first:{x:first.x,y:first.y,width:first.width},second:{x:second.x,y:second.y,width:second.width}});
  }
  return rows;
 });
 for(const {first,second} of rows){assert.ok(Math.abs(first.y-second.y)<2,JSON.stringify({first,second}));assert.ok(second.x>first.x+first.width,JSON.stringify({first,second}));}
 await cards.nth(0).click();const api=page.locator('[data-api-dialog]'),apiBox=await api.boundingBox();
 assert.ok(Math.abs(apiBox.width-1600*.7)<3);assert.ok(Math.abs(apiBox.x+apiBox.width/2-800)<3);
 assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-api-close')),true);
 assert.equal(await api.evaluate(el=>el.open),true);await page.locator('[data-api-main]').click();assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('main(cq)'));
 await api.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('[data-api-dialog]').contains(document.activeElement)));
 await api.press('Escape');assert.equal(await api.evaluate(el=>el.open),false);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.apiPath),'cq.network.getCatalog');
 await page.locator('[data-api-search]').fill('cq.network.transfer');assert.ok((await size('[data-api-path="cq.network.transfer"]')).width<500);await page.locator('[data-api-path="cq.network.transfer"]').click();assert.ok((await page.locator('[data-api-detail]').textContent()).includes('quantity'));
 await page.mouse.click(4,4);assert.equal(await api.evaluate(el=>el.open),false);
 await page.screenshot({path:resolve(root,'tests/artifacts/compact-api-desktop.png'),fullPage:true});
 assert.deepEqual((await save()).world,original.world);
 console.log('✓ compact multi-column API cards, centered 70% dialog, focus/keyboard/backdrop dismissal, real examples and unchanged world');

 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-api-path="cq.network.transfer"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:resolve(root,'tests/artifacts/api-dialog-mobile-dark.png'),fullPage:true});await page.locator('[data-api-close]').click();
 await page.locator('.city-section-nav [data-jump="workspace"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(await layout(),prefs);
 await page.locator('.city-ide-modes [data-mode="code"]').click();assert.equal(await page.locator('[data-console]').isVisible(),true);assert.equal(await page.locator('[data-dashboard]').isVisible(),false);
 await page.locator('.city-ide-modes [data-mode="dashboard"]').click();assert.equal(await page.locator('[data-console]').isVisible(),true);assert.equal(await page.locator('[data-dashboard]').isVisible(),true);assert.equal(await page.locator('[data-editor]').isVisible(),false);
 await page.locator('.city-ide-modes [data-mode="split"]').click();
 await page.locator('[data-dashboard-builder]').click();assert.ok(await page.locator('.city-builder').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:resolve(root,'tests/artifacts/builder-workflow-mobile-dark.png'),fullPage:true});await page.locator('.city-builder').press('Escape');
 await page.locator('#city-campaign a[href="#/campaigns"]').click();await page.locator('#campaign-theme').click();await page.locator('[data-campaign="city"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 assert.deepEqual(await layout(),prefs);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.setViewportSize({width:1600,height:1100});await page.locator('[data-layout-reset]').click();assert.equal((await layout()).filesWidth,180);assert.equal((await layout()).outputOrder,'dashboard-first');assert.deepEqual((await save()).world,original.world);assert.deepEqual((await save()).files,original.files);
 await page.screenshot({path:resolve(root,'tests/artifacts/adjustable-workspace-light.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('✓ mobile modes without overflow, both themes, stored desktop dimensions after mobile, safe layout reset and no uncaught errors');
} finally {await browser.close();await new Promise(r=>server.close(r));}
