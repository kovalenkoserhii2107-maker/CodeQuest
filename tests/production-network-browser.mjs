import { NETWORK_STRATEGY } from './fixtures/network-strategy.mjs';
import { NETWORK_RECIPES } from '../js/city/network-guide.js';
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
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.evaluate(async()=>{
  const {initialSave,CITY_SAVE_KEY}=await import('/js/city/engine.js'),{LESSONS}=await import('/js/city/lessons.js'),state=initialSave();
  state.world.schema=4;delete state.world.network;state.world.balance=30000;state.memory={kept:7};
  state.files['helpers/kept.js']='export const kept=7;';state.tutorial.completed=LESSONS.slice(0,13).map(l=>l.id);
  localStorage.setItem(CITY_SAVE_KEY,JSON.stringify(state));
 });
 await page.locator('[data-campaign="city"]').click();await page.waitForSelector('#city-campaign .monaco-editor');
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 assert.equal(await page.locator('[data-notice]').isVisible(),false);
 await code('/** @param {CityAPI} cq */\nexport function main(cq){console.log(cq.network.getSites(),cq.network.getFleet());}');
 assert.equal((await save()).world.schema,5);assert.equal((await save()).memory.kept,7);assert.ok((await save()).files['helpers/kept.js']);
 const diagnostics=await page.evaluate(async()=>{
  const m=await import('/vendor/editor.js'),model=m.editor.getModels().find(m=>m.uri.path.endsWith('/index.js')),factory=await m.typescript.getJavaScriptWorker(),worker=await factory(model.uri);
  return worker.getSemanticDiagnostics(model.uri.toString());
 });
 assert.deepEqual(diagnostics,[]);
 await code(NETWORK_RECIPES.find(r=>r.id==='open').code);
 const initial=await save();await page.locator('[data-preview]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);
 assert.deepEqual((await save()).world,initial.world);assert.equal((await save()).tutorial.completed.length,13);
 await step();assert.equal((await save()).world.network.sites.length,1);assert.equal((await save()).world.balance,27600);assert.equal((await save()).tutorial.completed.at(-1),'site');
 await page.locator('.city-section-nav [data-jump="world"]').click();
 assert.equal(await page.locator('[data-network-site="port"]').getAttribute('data-built'),'true');
 assert.equal(await page.locator('[data-network-site="highlands"]').getAttribute('data-built'),'false');
 await page.locator('[data-network-site="port"] [data-network-api]').click();
 assert.equal(await page.locator('[data-api-path="cq.network.quoteProduction"]').getAttribute('open'),'');
 await page.locator('[data-guide-tab="network"]').click();assert.equal(await page.locator('[data-guide-page="network"] .city-guide-recipe').count(),4);
 await page.locator('[data-guide-page="network"] details').first().locator('summary').click();await page.locator('[data-network-guide-copy="open"]').click();
 assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('cq.network.open'));
 console.log('✓ legacy save migration, typed network API, readonly preview, construction lesson, world cards and guide clipboard');

 await code(NETWORK_RECIPES.find(r=>r.id==='produce').code);await step();
 assert.equal((await save()).tutorial.completed.at(-1),'site-production');
 assert.equal((await save()).world.network.sites[0].lines[0].job.remaining,1);assert.equal((await save()).world.inventory.metal,0);
 await page.locator('[data-wait]').click();assert.equal((await save()).world.network.sites[0].inventory.metal,5);
 await code(NETWORK_RECIPES.find(r=>r.id==='transfer').code);const beforeTransfer=await save();await step();
 const sent=(await save()).world;assert.equal(sent.network.transfers[0].remaining,2);assert.equal(sent.inventory.metal,0);assert.equal(sent.network.sites[0].inventory.metal,0);
 assert.equal(sent.balance,beforeTransfer.world.balance-11);
 await page.locator('.city-section-nav [data-jump="world"]').click();
 assert.equal(await page.locator('[data-network-route="city:port"]').getAttribute('data-active'),'true');
 assert.ok((await page.locator('[data-network-site="city"]').textContent()).includes('входящие: 5'));
 assert.equal(await page.locator('[data-network-transfer="1"]').getAttribute('data-status'),'transit');
 assert.deepEqual((await save()).world,sent);
 await page.screenshot({path:resolve(root,'tests/artifacts/network-desktop-transit.png'),fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('[data-network-route="city:port"]').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await code('export function main(cq){ console.log("before-network-failure");cq.network.buy("city","scrap",1,"yard");cq.network.transfer("scrap",1,"city","city"); }');await step();
 assert.deepEqual((await save()).world,sent);assert.ok((await page.locator('[data-output]').textContent()).includes('before-network-failure'));
 await code('export async function main(cq){cq.network.buy("port","scrap",1,"port-yard");console.log("network-cancel-pending");await new Promise(()=>{});}');
 await page.locator('[data-run]').click();await page.waitForFunction(()=>document.querySelector('[data-output]').textContent.includes('network-cancel-pending'));await page.locator('[data-cancel]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);
 assert.deepEqual((await save()).world,sent);
 await page.locator('[data-wait]').click();await page.locator('[data-wait]').click();
 assert.equal((await save()).world.inventory.metal,5);assert.equal((await save()).world.network.moved,5);
 await code(NETWORK_RECIPES.find(r=>r.id==='transfer').code);await step();assert.equal((await save()).tutorial.completed.at(-1),'internal-transfer');
 console.log('✓ local production, delayed transfer and storage reservation, animated route, reduced motion, rollback and cancellation');

 page.once('dialog',dialog=>dialog.accept('strategies/network.js'));await page.locator('[data-add]').click();
 await code('export function planSite(site){return {product:site.id==="port"?"metal":"parts",quantity:1};}','strategies/network.js');
 await code('import { planSite } from "./strategies/network.js";export function main(cq){cq.world.explore("highlands");cq.network.open("highlands");cq.network.buy("port","scrap",2,"port-yard");cq.network.buy("highlands","metal",2,"northern-metal");console.log(cq.network.getFleet());for(const site of cq.network.getSites().filter(s=>s.id!=="city")){const p=planSite(site);const q=cq.network.quoteProduction(site.id,p.product,p.quantity);if(q.canStart)cq.network.start(site.id,p.product,p.quantity);}}');await step();
 assert.equal((await save()).tutorial.completed.length,17);assert.equal((await save()).tutorial.completed.at(-1),'network-dispatcher');assert.equal((await save()).world.network.sites.length,2);
 await code('export function main(cq){cq.research.unlock("wire");cq.research.unlock("circuits");cq.network.upgradeFleet();}');await step();
 await code(NETWORK_STRATEGY);const operatingStart=(await save()).world;
 for(let i=0;i<24;i++)await step();
 const operatingEnd=(await save()).world;
 assert.equal(operatingEnd.tick,operatingStart.tick+24);assert.ok(operatingEnd.balance>operatingStart.balance);assert.ok(operatingEnd.balance>=100);
 assert.ok(operatingEnd.network.moved>5);assert.ok(operatingEnd.metrics.produced>=60);assert.ok(operatingEnd.metrics.sold>=10);
 assert.equal(operatingEnd.network.fleetLevel,2);
 console.log('✓ modules coordinate two sites to complete lesson 17; 24 productive three-site steps with reserves and operating profit');

 await page.locator('[data-dashboard-builder]').click();await page.locator('[data-board-template="network"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-builder-preview] h3')?.textContent==='Сеть предприятия');
 assert.equal(await page.locator('[data-builder-preview] progress').count(),1);assert.equal(await page.locator('[data-builder-preview] .city-chart svg').count(),1);
 assert.equal(await page.locator('[data-builder-preview] [data-dashboard-input="site"] option').count(),3);
 assert.deepEqual((await save()).world,operatingEnd);
 await page.locator('[data-builder-path]').fill('dashboards/company.js');await page.locator('[data-builder-export]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]').textContent.includes('render()'));
 assert.equal(await page.locator('[data-dashboard-output] h3').textContent(),'Сеть предприятия');
 assert.equal(await page.locator('[data-dashboard-output] progress').getAttribute('max'),'3');
 await page.locator('[data-dashboard-output] [data-dashboard-input="site"]').selectOption('port');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codequest.city.v1')).dashboards.inputs['dashboards/company.js']?.site==='port');
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]').textContent.includes('render()'));
 const generated=(await save()).files['dashboards/company.js'],readonlyBefore=(await save()).world;
 await page.locator('[data-dashboard-live]').uncheck();
 await code('export function render(cq){console.log("network-render-log");cq.network.upgradeFleet();return {widgets:[]};}','dashboards/company.js');await refresh();
 assert.ok((await page.locator('[data-dashboard-status]').textContent()).includes('Ошибка дашборда'));
 assert.ok((await page.locator('[data-output]').textContent()).includes('network-render-log'));
 assert.deepEqual((await save()).world,readonlyBefore);
 await code(generated,'dashboards/company.js');await refresh();
 await page.screenshot({path:resolve(root,'tests/artifacts/network-dashboard-desktop.png'),fullPage:true});
 console.log('✓ network dashboard builder, real chart, site selector, aggregate progress and readonly command guard');

 await page.locator('.city-section-nav [data-jump="world"]').click();await page.locator('[data-location="highlands"]').click();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:resolve(root,'tests/artifacts/network-mobile.png'),fullPage:true});
 await page.locator('#city-campaign a[href="#/campaigns"]').click();await page.locator('#campaign-theme').click();await page.locator('[data-campaign="city"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 assert.equal((await save()).dashboards.inputs['dashboards/company.js'].site,'port');assert.deepEqual((await save()).world,readonlyBefore);
 await page.locator('.city-section-nav [data-jump="world"]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:resolve(root,'tests/artifacts/network-mobile-light.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('✓ site, fleet, transfer, helper and dashboard persistence; mobile width, light theme and no uncaught errors');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
