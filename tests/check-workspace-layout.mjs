import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { normalizeWorkspaceLayout } from '../js/city/workspace-layout.js';
import { initialSave, readCitySave } from '../js/city/engine.js';
import { DASHBOARD_EXAMPLES, LEGACY_DASHBOARD_EXAMPLES } from '../js/city/dashboard-examples.js';
for (const file of ['js/city/workspace-layout.js','js/city/api-reference.js','js/city/dashboard-builder.js','js/city/dashboard-view.js','js/city/ui.js','tests/workspace-layout-browser.mjs']) {
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
}
const defaults=normalizeWorkspaceLayout();
for(const value of [null,undefined,42,'bad',[],{filesWidth:NaN,outputShare:Infinity,consoleHeight:'900',outputOrder:'other'}]) assert.deepEqual(normalizeWorkspaceLayout(value),defaults);
assert.equal(normalizeWorkspaceLayout({filesWidth:9999}).filesWidth,420);
assert.equal(normalizeWorkspaceLayout({editorHeight:-1}).editorHeight,420);
assert.equal(normalizeWorkspaceLayout({outputShare:0}).outputShare,25);
assert.equal(normalizeWorkspaceLayout({consoleHeight:410,outputOrder:'console-first'}).consoleHeight,410);
const source=initialSave();source.world.balance=12345;source.world.metrics.revenue=1200;source.memory={kept:9};
source.files={...LEGACY_DASHBOARD_EXAMPLES,'index.js':source.files['index.js'],'dashboards/custom.js':'export function render(){return {title:"Custom ₽",widgets:[]};}'};
source.files['dashboards/markets.js']+='// My exact edit\n';
const result=readCitySave({getItem:()=>JSON.stringify(source)});
assert.equal(result.warning,'');assert.deepEqual(result.save.world,source.world);assert.deepEqual(result.save.memory,source.memory);
assert.equal(result.save.files['dashboards/overview.js'],DASHBOARD_EXAMPLES['dashboards/overview.js']);
assert.equal(result.save.files['dashboards/custom.js'],source.files['dashboards/custom.js']);
assert.equal(result.save.files['dashboards/markets.js'],source.files['dashboards/markets.js']);
assert.ok(initialSave().files['dashboards/overview.js'].includes('unit:"$"'));
console.log('✓ layout limits and malformed preferences; USD upgrades untouched defaults without changing economy, custom code or memory');
