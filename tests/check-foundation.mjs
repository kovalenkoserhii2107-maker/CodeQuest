import assert from 'node:assert/strict';
import { state, db, resetProgress, completeQuest, revisionsOf, transaction, addResource, spendResource, fuelLog, resources, appSource } from '../js/state.js';
import { QUESTS, questById } from '../js/data/quests.js';
import { runSolution } from '../js/runner.js';
import { runConsoleInput, runPlayerCode } from '../js/runner-core.js';
import { lineDiff } from '../js/editor/diff.js';

resetProgress();
// Real complete progression: every new function is tested against the active application.
for (const quest of QUESTS) {
  const report = await runSolution(quest.solution, quest);
  assert.equal(report.ok, true, `${quest.id}: ${report.error ?? JSON.stringify(report.results.filter(r => !r.pass))}`);
  completeQuest(quest.id, { source: quest.solution });
}
console.log('✓ все 17 этапов проходят вместе с активными функциями');
const commander = questById('commander');
const credits = state.credits;
completeQuest(commander.id, { source: commander.solution + '\n// revised' });
assert.equal(state.credits, credits);
assert.equal(revisionsOf(commander.id).length, 2);
assert.equal(revisionsOf(commander.id)[0].source, commander.solution);
console.log('✓ история сохраняет версии без повторных наград');

resetProgress();
completeQuest('commander', { source: 'const helper = 3; function createCommander() { return helper; }' });
completeQuest('shipyard', { source: 'const helper = 5; function createShipyard() { return helper + createCommander(); }' });
const output = await runPlayerCode(appSource(), 'createShipyard', 'return createShipyard();');
assert.equal(output.error, null);
assert.equal(output.value, 8);
console.log('✓ локальные имена изолированы, функции могут вызывать друг друга');

resetProgress();
const yard = questById('shipyard');
const coupled = commander.solution.replace('return {', 'if (createShipyard("probe", []).name !== "probe") throw new Error("dependency broken"); return {');
completeQuest('shipyard', { source: yard.solution });
completeQuest('commander', { source: coupled });
assert.equal((await runSolution(yard.solution, yard)).ok, true);
const regression = await runSolution(yard.solution.replace('    name,', '    name: name === "probe" ? "changed" : name,'), yard);
assert.equal(regression.ok, false);
assert.ok(regression.results.some(r => r.integration && !r.pass));
console.log('✓ изменение зависимости блокируется тестами вызывающей функции');

resetProgress();
for(let i=0;i<60;i++) { addResource('fuel', 10); spendResource('fuel', 3); }
assert.equal(fuelLog().reduce((n,e)=>n+(e.kind==='fill'?e.amount:-e.amount),0),resources().fuel);
assert.ok(state.fuelLog.length<=40);
console.log('✓ свёрнутый журнал сохраняет полный баланс');
const before=structuredClone(state);
const store=db.store;
assert.throws(()=>transaction(()=>{db.insert('reports',{value:1});spendResource('fuel',1);throw new Error('cancel');}),/cancel/);
assert.deepEqual(state,before);
assert.equal(db.store,store);
assert.equal(db.store,state.db);
console.log('✓ ошибка откатывает базу и ресурсы атомарно');
const failed=await runConsoleInput('', 'db.insert("reports", {value:1}); throw new Error("stop");', {db:{}});
assert.ok(failed.error);
assert.deepEqual(failed.ops,[]);
assert.ok(lineDiff('first\nsecond','second\nfirst').length);
assert.deepEqual(lineDiff('same','same'),[]);
console.log('✓ команды с ошибкой не записывают базу; сравнение замечает перестановки');
resetProgress();

globalThis.localStorage = {getItem: () => JSON.stringify({resources:{fuel:80,ore:0},fuelLog:[{kind:'burn',amount:20}],fitted:[]})};
const migrated = await import('../js/state.js?legacy-fuel');
assert.equal(migrated.fuelLog().reduce((n,e)=>n+(e.kind==='fill'?e.amount:-e.amount),0),80);
delete globalThis.localStorage;
console.log('✓ старое сохранение получает корректный входящий остаток');
