import { formatConsoleValues } from './console-format.js';
import { PRACTICES } from './practice.js';
import { CityRuntime } from './runtime.js';
import { escapeHtml } from '../ui/html.js';
export class PracticeView {
  #root; #options; #runtime=new CityRuntime(); #generation=0; #disposed=false;
  constructor(root,options) {
    this.#root=root;this.#options=options;
    root.innerHTML='<h2>Практика программиста</h2><p class="city-practice-intro">После знакомства с миром учитесь строить собственную систему. Напишите функцию, проверьте её на разных данных, импортируйте в стратегию или дашборд. Тесты доступны в любой момент, не тратят деньги и не двигают время.</p><div class="city-practice-grid">'+PRACTICES.map(item=>'<article class="city-practice-card" data-practice="'+item.id+'"><p class="campaign-eyebrow">'+item.after+'</p><h3>'+item.title+'</h3><p>'+item.objective+'</p><p class="city-muted">'+item.concepts+'</p><details><summary>Что должна делать функция</summary><p>'+escapeHtml(item.contract)+'</p><code>'+item.path+'</code></details><details><summary>Сценарии проверки ('+item.cases.length+')</summary><ul>'+item.cases.map(test=>'<li>'+test.name+'<pre>Вход: '+escapeHtml(formatConsoleValues(test.args))+'\nОжидается: '+escapeHtml(formatConsoleValues([test.expected]))+'</pre></li>').join('')+'</ul><p>Все проверки также сравнивают входные данные до и после вызова.</p></details><div class="city-practice-actions"><button type="button" data-practice-open="'+item.id+'">Создать / открыть код</button><button type="button" data-practice-test="'+item.id+'">Запустить тесты</button></div><p class="city-practice-results" data-practice-result="'+item.id+'" role="status">Проверки ещё не запускались.</p><details><summary>Пример интеграции — после тестов</summary><p>Перенесите пример в index.js'+(item.id==='report'?' или новый dashboards/report.js':'')+' и доработайте под свою стратегию.</p><pre>'+escapeHtml(item.use)+'</pre></details></article>').join('')+'</div><div class="city-practice-projects"><h3>Самостоятельные проекты — выберите свой</h3><ol><li><strong>Устойчивый диспетчер.</strong> Соедините закупки, выбор линий и продажи. В каждом шаге проверяйте резерв, сырьё, свободное место и занятость. Проверьте 20 автоматических шагов без ошибки, затем объясните простои по логам. Начните с пробного запуска.</li><li><strong>Сравнение стратегий.</strong> Записывайте в cq.memory баланс и расходы до шага, сравнивайте планы производства через cq.factory.quote и cq.analytics.getUnitCosts. Покажите выручку, расходы и загрузку на дашборде. Оценочная маржа не заменяет фактический денежный результат.</li><li><strong>Отладка и тесты.</strong> Намеренно вызовите ошибку после закупки. Убедитесь, что шаг отменился, а console.log остался. Разделите расчёт и команды, добавьте собственные assert в функцию main. Проверьте нехватку денег, занятый станок и пустой склад.</li><li><strong>Контракты и логистика.</strong> Планируйте партии назад от deadline и длительности маршрута. Создайте дашборд для активных контрактов, грузов в пути и остатков; добавьте фильтр товара. Выберите между немедленной продажей, отложенной заявкой и доставкой.</li></ol><p class="city-muted">У этих проектов нет единственного решения и автоматической отметки «профессия освоена». Оценивайте свою реализацию по сценариям, логам и результату в мире. Асинхронный render и main разрешены; мир продвигается игровыми шагами, а бесконечный цикл прерывается через 3 секунды.</p></div>';
    root.querySelectorAll('[data-practice-open]').forEach(button=>button.onclick=()=>{const item=PRACTICES.find(item=>item.id===button.dataset.practiceOpen);try{if(options.isLocked())throw new Error('Остановите автоматизацию и дождитесь шага.');options.onPrepare(item.path,item.starter);}catch(error){this.#status(item.id,error.message,'error');}});
    root.querySelectorAll('[data-practice-test]').forEach(button=>button.onclick=()=>this.#test(button.dataset.practiceTest));
  }
  #status(id,text,state=''){const target=this.#root.querySelector('[data-practice-result="'+id+'"]');target.textContent=text;target.dataset.state=state;}
  async #test(id){
    const item=PRACTICES.find(item=>item.id===id);
    if(this.#options.isLocked()){this.#status(id,'Остановите автоматизацию и дождитесь шага.','error');return;}
    if(this.#options.getFiles()[item.path]===undefined){this.#status(id,'Сначала создайте файл кнопкой «Создать / открыть код».','error');return;}
    const generation=++this.#generation;this.#runtime.cancel();const snapshot=this.#options.getWorld();
    this.#root.querySelectorAll('[data-practice-test]').forEach(button=>button.disabled=true);
    this.#status(id,'Выполняем проверки…');
    try{
      const result=await this.#runtime.run(this.#options.getFiles(),snapshot,this.#options.getMemory(),{mode:'practice',entry:item.path,practice:id,onLog:entry=>this.#options.onLog(entry,{source:'Тесты '+item.path,tick:snapshot.tick})});
      if(this.#disposed||generation!==this.#generation)return;
      const tests=result.practice.results,count=tests.filter(test=>test.passed).length;
      this.#status(id,count+' / '+tests.length+' проверок пройдено\n'+tests.map(test=>(test.passed?'✓ ':'✕ ')+test.name+': '+test.detail).join('\n'),result.practice.passed?'success':'error');
    }catch(error){if(!this.#disposed&&generation===this.#generation){this.#status(id,error.message,'error');this.#options.onLog({level:'error',text:error.message,stack:error.scriptStack},{source:'Тесты '+item.path,tick:snapshot.tick});}}
    finally{if(!this.#disposed&&generation===this.#generation)this.#root.querySelectorAll('[data-practice-test]').forEach(button=>button.disabled=false);}
  }
  dispose(){this.#disposed=true;this.#generation++;this.#runtime.cancel();}
}
