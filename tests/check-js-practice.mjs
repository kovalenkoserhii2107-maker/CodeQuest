import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PRACTICES,runPractice } from '../js/city/practice.js';
import { formatConsoleValues,scriptLocation } from '../js/city/console-format.js';
import { CityEngine } from '../js/city/engine.js';
import { createCityAPI } from '../js/city/api.js';
import { buildProject } from '../js/act2/loader.js';

for(const path of ['js/city/console-format.js','js/city/console-view.js','js/city/practice.js','js/city/practice-ui.js','js/city/runtime.js','js/city/worker.js','js/city/ui.js','js/city/dashboard-controller.js','js/city/dashboard-builder.js','js/city/dashboard-view.js','js/ui/editor.js','tests/js-practice-browser.mjs'])execFileSync(process.execPath,['--check',path]);
const circular={value:1};circular.self=circular;
assert.equal(formatConsoleValues(['values',undefined,null,42n,NaN,Infinity]),'values undefined null 42n NaN Infinity');
assert.equal(formatConsoleValues([new Error('example')]),'Error: example');
assert.ok(formatConsoleValues([circular]).includes('Повторная ссылка'));
assert.ok(formatConsoleValues([{x:5n}]).includes('5n'));
assert.equal(formatConsoleValues(['x'.repeat(4000)]).length,2000);
assert.deepEqual(scriptLocation('Error\n at main (city/strategies/supply.js:12:8)'),{path:'strategies/supply.js',line:12,column:8});
assert.equal(scriptLocation('blob:http://localhost/abc:1:2'),null);
console.log('✓ console snapshots: undefined, BigInt, errors, circular objects, finite/nonfinite numbers and source positions');

const solutions={
  budget:`export function planPurchase({balance,price,stock,freeSpace,reserve=0}) {
    if (![balance,price,stock,freeSpace,reserve].every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0)||price===0)return 0;
    return Math.max(0,Math.floor(Math.min((balance-reserve)/price,stock,freeSpace)));
  }`,
  lines:`export function chooseLine(lines) {
    return [...lines].filter(line=>line.job===null).sort((a,b)=>b.level-a.level||(a.id<b.id?-1:a.id>b.id?1:0))[0]?.id??null;
  }`,
  report:`export function summarize({inventory={},lines=[],balance=0}) {
    const busyLines=lines.filter(line=>line.job).length;
    return {inventoryTotal:Object.values(inventory).reduce((sum,count)=>sum+count,0),busyLines,freeLines:lines.length-busyLines,lowBalance:balance<100};
  }`
};
const build=files=>buildProject(new Map(Object.entries(files)),Object.keys(files)[0],source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const practice of PRACTICES){
 const starter=await import(build({[practice.path]:practice.starter}).url);
 assert.equal((await runPractice(practice.id,starter)).passed,false);
 const solution=await import(build({[practice.path]:solutions[practice.id]}).url);
 const result=await runPractice(practice.id,solution);
 assert.equal(result.passed,true,JSON.stringify(result));assert.equal(result.results.length,practice.cases.length);
 await assert.rejects(runPractice(practice.id,{}),/экспортировать/);
}
const mutation=await runPractice('lines',{chooseLine(lines){lines.reverse();return [...lines].filter(line=>line.job===null).sort((a,b)=>b.level-a.level||(a.id<b.id?-1:1))[0]?.id??null;}});
assert.equal(mutation.passed,false);assert.ok(mutation.results.some(test=>test.detail.includes('Изменены входные данные')));
assert.equal((await runPractice('budget',{async planPurchase(){throw new Error('test failure');}})).results.every(test=>!test.passed),true);
console.log('✓ realistic contracts accept working functions, reject TODOs, mutation, missing exports and exceptions');

// Checked helper modules actually work with the production API and a readonly dashboard.
const modules={
 'index.js':'import { planPurchase } from "./practice/budget.js"; export function main(cq){const s=cq.market.getSuppliers()[0];const n=planPurchase({balance:cq.world.getState().balance,price:s.price,stock:s.stock,freeSpace:cq.warehouse.getFreeSpace(),reserve:100});if(n>0)cq.market.buy("scrap",n,s.id);}',
 'practice/budget.js':solutions.budget
};
const engine=new CityEngine(),operations=[];
(await import(build(modules).url)).main(createCityAPI(engine,{}, {onCommand:op=>operations.push(op)}));
assert.equal(operations.length,1);assert.ok(engine.snapshot().inventory.scrap>0);assert.ok(engine.snapshot().balance>=100);
const before=engine.snapshot(),render=await import(build({'dashboards/report.js':PRACTICES.find(item=>item.id==='report').use,'practice/report.js':solutions.report}).url);
const dashboard=render.render(createCityAPI(engine,{}, {readOnly:true}));
assert.equal(dashboard.widgets[0].value,before.inventory.scrap);assert.equal(dashboard.widgets[1].max,1);
assert.deepEqual(engine.snapshot(),before);
console.log('✓ tested modules integrate with real budget, supplier, storage and readonly dashboard calculations');
