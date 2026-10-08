import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const types = { '.svg': 'image/svg+xml', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
  if (!path.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.end(await readFile(path)); }
  catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir(resolve(root, 'tests/artifacts'), { recursive: true });
async function setCode(body, { raw = false, name = 'index.js' } = {}) {
  await page.locator('.city-section-nav [data-jump="workspace"]').click();
  await page.waitForSelector('#city-campaign .monaco-editor');
  const code = raw ? body : '/** @param {CityAPI} cq */\nexport function main(cq) {\n' + body + '\n}';
  await page.evaluate(async ({ code, name }) => {
    const { editor } = await import('/vendor/editor.js');
    const model = editor.getModels().find(m => m.uri.path.endsWith('/' + name));
    assertModel(model); model.setValue(code);
    function assertModel(model) { if (!model) throw new Error('No model for ' + name); }
  }, { code, name });
}
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('codequest.city.v1')));
async function step(button = '[data-run]') {
  await page.locator('.city-section-nav [data-jump="workspace"]').click();
  await page.locator(button).click();
  await page.waitForFunction(() => !document.querySelector('[data-run]').disabled);
}
async function completed(id) {
  assert.ok((await save()).tutorial.completed.includes(id), id);
}
try {
  await page.goto(url);
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('[data-workspace]');
  assert.ok((await page.locator('[data-task]').textContent()).includes('Познакомьтесь с мастерской'));
  assert.equal(await page.locator('[data-lesson]').count(), 17);
  assert.ok((await page.locator('.city-orientation').textContent()).includes('Как устроен мир'));
  await page.screenshot({ path: resolve(root, 'tests/artifacts/city-first-task-desktop.png'), fullPage: true });

  await setCode('const s = cq.world.getState(); cq.print("Баланс:", s.balance); cq.print("Склад:", s.inventory);');
  await step('[data-preview]');
  assert.deepEqual((await save()).tutorial.completed, []);
  await step(); await completed('inspect');
  assert.ok((await page.locator('[data-task]').textContent()).includes('Найдите поставщика'));
  await setCode('const supplier = cq.market.getSuppliers()[0]; cq.print(supplier); cq.market.buy("scrap", 10);');
  await step(); await completed('supply');
  await setCode('cq.print(cq.factory.getRecipes()); cq.factory.start("metal", 5);');
  await step(); await completed('batch');
  await page.locator('[data-wait]').click();
  await setCode('cq.print(cq.warehouse.getStock("metal")); cq.print(cq.world.getTime());');
  await step(); await completed('time');
  await setCode('const buyer = cq.market.getBuyers("metal").filter(b => !b.locked && !b.remote && b.demand >= 5).sort((a,b) => b.price-a.price)[0]; cq.market.sell("metal", 5, buyer.id);');
  await step(); await completed('trade');
  await setCode('cq.memory.runs = (cq.memory.runs ?? 0) + 1; cq.print(cq.memory.runs);');
  await page.locator('[data-auto]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('codequest.city.v1')).tutorial.completed.includes('memory'));
  await page.locator('[data-auto]').click();
  await page.waitForFunction(() => !document.querySelector('[data-run]').disabled);
  await completed('memory');
  assert.equal((await save()).tutorial.completed.length, 6);
  console.log('✓ browser: first six tasks completed through real worker; preview never completes tasks');

  await page.locator('.city-section-nav [data-jump="api"]').click();
  await page.locator('[data-group="warehouse"]').click();
  assert.equal(await page.locator('.city-api-method').count(), 4);
  await page.locator('[data-api-search]').fill('свободное');
  assert.equal(await page.locator('.city-api-method').count(), 1);
  await page.locator('.city-api-method').click();
  assert.ok((await page.locator('[data-api-detail]').textContent()).includes('резерва'));
  await page.locator('[data-api-close]').click();
  await page.locator('[data-api-search]').fill('');
  await page.locator('[data-group="factory"]').click();
  assert.equal(await page.locator('.city-api-method').count(), 6);
  // Check editor type definitions against the actual worker language service.
  const diagnostics = await page.evaluate(async () => {
    const m = await import('/vendor/editor.js');
    const model = m.editor.getModels().find(model => model.uri.path.endsWith('/index.js'));
    const factory = await m.typescript.getJavaScriptWorker();
    const client = await factory(model.uri);
    return (await client.getSemanticDiagnostics(model.uri.toString())).map(d => ({ code: d.code, message: d.messageText }));
  });
  assert.deepEqual(diagnostics, []);

  await setCode('const c = cq.contracts.list().find(c => c.id === "metal-order");\nif (c.status === "available") cq.contracts.accept(c.id);\nif (cq.warehouse.getStock("metal") >= 5) { cq.contracts.deliver(c.id); }\nelse if (cq.factory.getLines()[0].job === null) {\n const missing = 10 - cq.warehouse.getStock("scrap"); if (missing > 0) cq.market.buy("scrap", missing);\n cq.factory.start("metal", 5);\n}');
  await step(); await step(); await step();
  await completed('contract');
  assert.equal((await save()).world.metrics.fulfilled, 1);
  assert.ok((await page.locator('[data-contracts]').textContent()).includes('Обновляется'));
  await setCode('cq.print(cq.research.list()); cq.research.unlock("wire");');
  await step(); await completed('research');
  await setCode('cq.market.buy("scrap", 2); cq.factory.start("metal", 1);');
  await step(); await page.locator('[data-wait]').click();
  await setCode('cq.factory.start("wire", 1);');
  await step();
  const beforeDelivery = (await save()).world.balance;
  await setCode('const q = cq.market.quote("wire", 1, "electronics", "courier"); cq.print(q); if (q.canTrade) cq.logistics.dispatch("wire", 1, "electronics", "courier");');
  await step(); await completed('delivery');
  assert.ok((await save()).world.balance > beforeDelivery);
  assert.equal((await save()).world.metrics.delivered, 1);
  assert.ok((await page.locator('[data-expansion]').textContent()).includes('Кабельная линия'));
  console.log('✓ browser: contracts, research, wire production and delivery affect the real world');

  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  await page.evaluate(async () => {
    const { initialWorld } = await import('/js/city/engine.js');
    const save = JSON.parse(localStorage.getItem('codequest.city.v1'));
    save.world = initialWorld(); save.world.balance = 5000; save.world.inventory.scrap = 40;
    localStorage.setItem('codequest.city.v1', JSON.stringify(save));
  });
  await page.locator('[data-campaign="city"]').click();
  await setCode('const id = cq.factory.purchaseLine(); cq.factory.start("metal", 5, "line-1"); cq.factory.start("metal", 5, id);');
  await step(); await completed('parallel');
  assert.equal((await save()).world.lines.filter(l => l.job !== null).length, 2);
  assert.ok((await page.locator('[data-world]').textContent()).includes('line-2'));

  page.once('dialog', dialog => dialog.accept('strategy.js'));
  await page.locator('[data-add]').click();
  await setCode('export function bestBuyer(buyers) { return buyers.filter(b => !b.locked && !b.remote && b.demand > 0).sort((a,b) => b.price-a.price)[0]; }', { name: 'strategy.js', raw: true });
  await page.locator('[data-files] button', { hasText: 'index.js' }).click();
  await setCode('import { bestBuyer } from "./strategy.js";\n/** @param {CityAPI} cq */\nexport function main(cq) { cq.print(bestBuyer(cq.market.getBuyers("metal"))); }', { raw: true });
  await step(); await completed('modules');
  assert.equal((await save()).tutorial.completed.length, 11);
  const final = await save();
  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('[data-workspace]');
  assert.deepEqual(await save(), final);
  assert.ok((await page.locator('[data-board]').textContent()).includes('11 / 17'));
  await page.screenshot({ path: resolve(root, 'tests/artifacts/city-expanded-world-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.city-section-nav [data-jump="api"]').click();
  await page.locator('[data-group="logistics"]').click();
  await page.locator('.city-api-method', { hasText: 'cq.logistics.dispatch' }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: resolve(root, 'tests/artifacts/city-expanded-world-mobile.png'), fullPage: true });
  await page.locator('[data-api-close]').click();
  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  await page.locator('#campaign-theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('[data-workspace]');
  await page.screenshot({ path: resolve(root, 'tests/artifacts/city-expanded-world-mobile-light.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('✓ browser: parallel lines, modules, persisted lesson completion, searchable API, editor types, mobile width and light theme');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
