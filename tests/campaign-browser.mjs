import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const types = { '.svg': 'image/svg+xml', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!path.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.end(await readFile(path)); }
  catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir(resolve(root, 'tests/artifacts'), { recursive: true });
async function setCode(code, name = 'index.js') {
  await page.waitForSelector('#city-campaign .monaco-editor');
  await page.evaluate(async ({ code, name }) => {
    const { editor } = await import('/vendor/editor.js');
    const model = editor.getModels().find(model => model.uri.path.endsWith('/' + name));
    if (!model) throw new Error('No editor model for ' + name);
    model.setValue(code);
  }, { code, name });
}
const citySave = () => page.evaluate(() => JSON.parse(localStorage.getItem('codequest.city.v1')));
const runStep = async () => {
  await page.locator('[data-run]').click();
  await page.waitForFunction(() => !document.querySelector('[data-run]').disabled);
};
try {
  await page.goto(url + '/#/task/commander');
  assert.equal(await page.locator('#campaign-menu').isVisible(), true);
  assert.equal(await page.locator('#space-campaign').isVisible(), false);
  assert.equal(await page.locator('#city-campaign').isVisible(), false);
  await page.screenshot({ path: resolve(root, 'tests/artifacts/menu-desktop.png'), fullPage: true });
  await page.locator('#campaign-theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.locator('[data-campaign="space"]').click();
  await page.waitForSelector('#task-root .monaco-editor');
  assert.equal(await page.locator('#space-campaign').isVisible(), true);
  // Save real existing-campaign progress, then ensure city actions never rewrite it.
  const cosmic = await page.evaluate(async () => {
    const state = await import('/js/state.js');
    const { questById } = await import('/js/data/quests.js');
    state.completeQuest('commander', { source: questById('commander').solution });
    return localStorage.getItem('codequest.progress.v2');
  });
  assert.ok(cosmic);
  await page.locator('#space-campaign a[href="#/campaigns"]').click();
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('[data-run]');
  await setCode('export function main(cq) { cq.print("<script>unsafe</script>"); cq.buy("scrap", 10); cq.memory.runs = (cq.memory.runs || 0) + 1; }');
  await page.locator('[data-preview]').click();
  await page.waitForFunction(() => !document.querySelector('[data-preview]').disabled);
  assert.equal((await citySave()).world.balance, 1000);
  assert.deepEqual((await citySave()).memory, {});
  await runStep();
  assert.equal((await citySave()).world.balance, 960);
  assert.equal((await citySave()).world.inventory.scrap, 10);
  assert.equal((await citySave()).memory.runs, 1);
  assert.equal(await page.locator('[data-output] script').count(), 0);
  assert.ok((await page.locator('[data-output]').textContent()).includes('<script>unsafe</script>'));
  await setCode('export function main(cq) { cq.produce("metal", 5); }');
  await runStep();
  assert.equal((await citySave()).world.job.remaining, 1);
  await page.locator('[data-wait]').click();
  assert.equal((await citySave()).world.inventory.metal, 5);
  await setCode('export function main(cq) { const buyer = cq.getState().buyers.filter(b => b.product === "metal" && !b.remote && b.region === "city").sort((a,b) => b.price-a.price)[0]; cq.sell("metal", 5, buyer.id); }');
  await runStep();
  assert.ok((await citySave()).world.balance > 1000);
  const before = (await citySave()).world;
  await setCode('export function main(cq) { cq.buy("scrap", 1); throw new Error("cancel step"); }');
  await runStep();
  assert.deepEqual((await citySave()).world, before);
  assert.ok((await page.locator('[data-output]').textContent()).includes('cancel step'));
  await setCode('export function main(cq) { while (true) {} }');
  await runStep();
  assert.deepEqual((await citySave()).world, before);
  assert.ok((await page.locator('[data-output]').textContent()).includes('3 секунды'));

  page.once('dialog', dialog => dialog.accept('strategy.js'));
  await page.locator('[data-add]').click();
  await setCode('export const amount = 1;', 'strategy.js');
  await page.locator('[data-files] button', { hasText: 'index.js' }).click();
  await setCode('import { amount } from "./strategy.js"; export function main(cq) { cq.buy("scrap", amount); cq.memory.runs++; }');
  await runStep();
  assert.equal((await citySave()).world.inventory.scrap, 1);
  assert.equal((await citySave()).memory.runs, 2);
  await setCode('import { amount } from "./missing.js"; export function main(cq) { cq.buy("scrap", amount); }');
  const missingBefore = (await citySave()).world;
  await runStep();
  assert.deepEqual((await citySave()).world, missingBefore);
  assert.ok((await page.locator('[data-output]').textContent()).includes('такого файла'));
  await setCode('export function main(cq) { cq.memory.runs++; cq.print(cq.memory.runs); }');
  await page.locator('[data-auto]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('codequest.city.v1')).memory.runs >= 4);
  await page.locator('[data-auto]').click();
  await page.waitForFunction(() => !document.querySelector('[data-run]').disabled);
  await page.screenshot({ path: resolve(root, 'tests/artifacts/city-desktop.png'), fullPage: true });
  const saved = await citySave();
  assert.equal(await page.evaluate(() => localStorage.getItem('codequest.progress.v2')), cosmic);
  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('[data-run]');
  assert.equal(await page.locator('[data-auto]').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(await citySave(), saved);
  // Leaving during execution cancels the worker; no late result can mutate the save.
  await setCode('export async function main(cq) { cq.buy("scrap", 1); await new Promise(resolve => setTimeout(resolve, 800)); }');
  const leaveBefore = (await citySave()).world;
  await page.locator('[data-run]').click();
  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  await page.waitForTimeout(1000);
  assert.deepEqual((await citySave()).world, leaveBefore);
  await page.locator('[data-campaign="space"]').click();
  await page.waitForSelector('#space-campaign:not([hidden])');
  assert.equal(await page.evaluate(() => localStorage.getItem('codequest.progress.v2')), cosmic);
  await page.reload();
  assert.equal(await page.locator('#campaign-menu').isVisible(), true);
  assert.equal(await page.locator('#space-campaign').isVisible(), false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(root, 'tests/artifacts/menu-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('#city-campaign .monaco-editor');
  await page.screenshot({ path: resolve(root, 'tests/artifacts/city-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(errors, []);
  console.log('✓ Chromium: launch menu, old campaign, editor, preview, economy, rollback, timeout, modules, automation, cancellation, persistence, mobile layout');

  // Corrupt and unavailable storage must not break entry to the new campaign.
  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  await page.evaluate(() => localStorage.setItem('codequest.city.v1', '{broken'));
  await page.locator('[data-campaign="city"]').click();
  await page.waitForSelector('[data-run]');
  assert.ok((await page.locator('[data-notice]').textContent()).includes('повреждено'));
  await page.locator('#city-campaign a[href="#/campaigns"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('codequest.city.v1')), '{broken');

  const denied = await browser.newContext({ serviceWorkers: 'block' });
  await denied.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('denied'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('denied'); } });
  });
  const deniedPage = await denied.newPage();
  await deniedPage.goto(url);
  await deniedPage.locator('[data-campaign="city"]').click();
  await deniedPage.waitForSelector('[data-run]');
  assert.ok((await deniedPage.locator('[data-notice]').textContent()).includes('недоступно'));
  await denied.close();
  console.log('✓ corrupted and unavailable browser storage remain usable');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
