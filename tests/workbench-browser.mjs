import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile,mkdir } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { chromium } from '@playwright/test';
const root=resolve(import.meta.dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{const raw=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+decodeURIComponent(raw==='/'?'/index.html':raw));if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));// Playwright's serviceWorkers:'block' injects code that throws in opaque sandboxed frames.
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('codequest.city.v1')));
async function code(text,path='index.js'){await page.locator('[data-path="'+path+'"]').click();await page.waitForSelector('#city-campaign .monaco-editor');await page.evaluate(async({text,path})=>{const {editor}=await import('/vendor/editor.js');const model=editor.getModels().find(m=>m.uri.path.endsWith('/'+path));if(!model)throw new Error(path);model.setValue(text);},{text,path});}
async function step(){await page.locator('[data-run]').click();await page.waitForFunction(()=>!document.querySelector('[data-run]').disabled);}
async function refresh(){await page.locator('[data-dashboard-refresh]').click();await page.waitForFunction(()=>/render\(\)|Ошибка дашборда/.test(document.querySelector('[data-dashboard-status]').textContent));}
await mkdir(resolve(root,'tests/artifacts'),{recursive:true});
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[data-campaign="city"]').click();await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]')?.textContent.includes('render()'));
 assert.equal(await page.locator('[data-widget="balance"]').count(),1);
 await code('export function main(cq){ const s=cq.world.getState();cq.print(s.balance);cq.print(s.inventory);cq.buy("scrap",10); }');await step();await page.waitForFunction(()=>document.querySelector('[data-widget="balance"]').textContent.includes('960'));
 page.once('dialog',d=>d.accept('strategies/helpers'));await page.locator('[data-folder]').click();assert.equal(await page.locator('[data-path="strategies"]').count(),1);
 page.once('dialog',d=>d.accept('strategies/helpers/trade.js'));await page.locator('[data-add]').click();await code('export const quantity=2;','strategies/helpers/trade.js');
 await code('import { quantity } from "./strategies/helpers/trade.js";export function main(cq){cq.buy("scrap",quantity);}');await step();
 await page.locator('[data-path="strategies"]').click();page.once('dialog',d=>d.accept('automation'));await page.locator('[data-rename]').click();assert.ok((await save()).files['index.js'].includes('./automation/helpers/trade.js'));
 await code('export const quantity=2;','automation/helpers/trade.js');await page.getByRole('button',{name:'Закрыть вкладку automation/helpers/trade.js',exact:true}).click();assert.equal((await save()).workspace.active,'index.js');
 console.log('✓ workbench: nested folders, tabs, rename and real module imports');

 page.once('dialog',d=>d.accept('dashboards/finance.js'));await page.locator('[data-dashboard-new]').click();
 const source='export function render(cq,view){const s=cq.world.getState(),product=view.inputs.product||"metal";return {title:"Моя панель",columns:2,controls:[{id:"product",type:"select",label:"Товар",value:product,options:["metal","wire"].map(value=>({value,label:value}))}],widgets:[{id:"cash",type:"stat",title:"Мои деньги",value:s.balance,unit:"₽"},{id:"note",type:"text",title:"Заметка",text:"<script>parent.pwned=true;</script>"},{id:"buyers",type:"table",title:"Покупатели",width:2,columns:["ID","Цена"],rows:cq.market.getBuyers(product).filter(b=>!b.locked).map(b=>[b.id,b.price])},{id:"trend",type:"chart",title:"График",points:cq.analytics.getHistory().map(p=>p.balance)}]};}';
 await code(source,'dashboards/finance.js');const before=(await save()).world,memory=(await save()).memory;await refresh();assert.equal(await page.locator('[data-widget="note"] script').count(),0);assert.equal(await page.locator('[data-widget="trend"] svg').count(),1);
 await page.locator('[data-dashboard-input="product"]').selectOption('wire');await page.waitForFunction(()=>document.querySelector('[data-widget="buyers"]').textContent.includes('electronics'));
 await page.getByLabel('Колонки дашборда',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Переместить вправо: Мои деньги',exact:true}).click();await page.getByLabel('Ширина: Мои деньги',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Скрыть: Заметка',exact:true}).click();assert.equal(await page.locator('[data-widget="note"]').count(),0);
 assert.deepEqual((await save()).world,before);assert.deepEqual((await save()).memory,memory);const prefs=(await save()).dashboards;
 await page.locator('#city-campaign a[href="#/campaigns"]').click();await page.locator('[data-campaign="city"]').click();await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]').textContent.includes('render()'));
 assert.equal((await save()).workspace.active,'dashboards/finance.js');assert.equal(await page.locator('[data-dashboard-input="product"]').inputValue(),'wire');assert.deepEqual((await save()).dashboards,prefs);assert.equal(await page.locator('[data-widget="note"]').count(),0);
 await code('export function render(cq){cq.buy("scrap",1);return {widgets:[]};}','dashboards/finance.js');await refresh();assert.ok((await page.locator('[data-dashboard-status]').textContent()).includes('Дашборд читает мир'));assert.deepEqual((await save()).world,before);
 await code(source,'dashboards/finance.js');await refresh();
 console.log('✓ workbench: custom widgets, inputs, chart, order, sizing, hiding, persistence and readonly rendering');

 page.once('dialog',d=>d.accept('dashboards/design.js'));await page.locator('[data-dashboard-example="html"]').click();await code('export function render(){return {title:"Мой дизайн",html:"<h1>Мой дизайн</h1><script>parent.pwned=true;</script>",css:"body{background:#102026;color:#64e8b0;font:24px system-ui;padding:20px}",height:650};}','dashboards/design.js');await refresh();
 assert.equal(await page.locator('.city-custom-dashboard').getAttribute('sandbox'),'');await page.frameLocator('.city-custom-dashboard').locator('h1').waitFor();assert.equal(await page.frameLocator('.city-custom-dashboard').locator('h1').textContent(),'Мой дизайн');assert.equal(await page.evaluate(()=>window.pwned),undefined);
 await page.screenshot({path:resolve(root,'tests/artifacts/workbench-desktop.png'),fullPage:true});
 await code('export function main(cq){cq.world.explore("port");cq.market.buy("scrap",2,"port-yard");}');await step();assert.equal((await save()).world.balance,346);assert.ok((await save()).world.regions.includes('port'));assert.ok((await page.locator('[data-expansion]').textContent()).includes('barge'));
 await page.locator('[data-path="index.js"]').click();assert.equal(await page.locator('[data-remove]').isDisabled(),true);
 await page.locator('[data-path="automation"]').click();page.once('dialog',d=>d.accept());await page.locator('[data-remove]').click();assert.equal((await save()).files['automation/helpers/trade.js'],undefined);
 page.once('dialog',d=>d.accept('../escape.js'));await page.locator('[data-add]').click();assert.ok((await page.locator('[data-notice]').textContent()).includes('Используйте пути'));
 await page.locator('.city-ide-modes [data-mode="dashboard"]').click();assert.equal(await page.locator('[data-editor]').isVisible(),false);await page.locator('.city-ide-modes [data-mode="split"]').click();assert.equal(await page.locator('[data-editor]').isVisible(),true);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(root,'tests/artifacts/workbench-mobile.png'),fullPage:true});
 await page.locator('#city-campaign a[href="#/campaigns"]').click();await page.locator('#campaign-theme').click();await page.locator('[data-campaign="city"]').click();await page.waitForSelector('[data-explorer]');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log('✓ workbench: sandbox HTML/CSS, regions, protected files, layouts, mobile width and light theme');
}finally{await browser.close();await new Promise(r=>server.close(r));}
