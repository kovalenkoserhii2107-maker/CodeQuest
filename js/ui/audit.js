/**
 * Раздел «Ревизия»: сверка топлива по журналу операций.
 *
 * Баланс сводит функция игрока. Игра показывает журнал и то, что сошлось
 * или разошлось, — именно на этом разделе видно, чинится ли ошибка.
 */
import { fuelLog, resources } from '../state.js';
import { runPlayerCode, errorPanel } from './sim.js';
import { escapeHtml, showValue } from './html.js';
import { barChart } from './charts.js';

const KIND_LABELS = { fill: 'заправка', burn: 'расход' };

export async function renderAudit() {
  const balanceHost = document.getElementById('audit-balance');
  const logHost = document.getElementById('audit-log');
  if (!balanceHost || !logHost) return;

  const entries = fuelLog();
  const inTank = resources().fuel;

  const { value, error } = await runPlayerCode(
    'ledger',
    `return fuelBalance(${JSON.stringify(entries)});`,
  );

  if (error) {
    balanceHost.innerHTML = errorPanel(escapeHtml(error));
    logHost.innerHTML = '';
    return;
  }

  const left = Number(value?.left) || 0;
  const matches = left === inTank;

  balanceHost.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Сверка</h3>
      <span class="panel__hint">fuelBalance из вашего кода</span>
    </div>

    <div class="widget__row"><span>Залито всего</span><b class="mono">${escapeHtml(showValue(value?.in))} т</b></div>
    <div class="widget__row"><span>Израсходовано</span><b class="mono">${escapeHtml(showValue(value?.out))} т</b></div>
    <div class="widget__row"><span>Остаток по журналу</span><b class="mono">${left} т</b></div>
    <div class="widget__row">
      <span>Фактически в баке</span>
      <b class="mono ${matches ? 'is-ok' : 'is-danger'}">${inTank} т</b>
    </div>

    ${
      entries.length
        ? barChart({
          items: [
            { label: 'Залито', value: Number(value?.in) || 0 },
            { label: 'Израсходовано', value: Number(value?.out) || 0 },
          ],
          unit: 'т',
        })
        : ''
    }

    <p class="widget__note">
      ${
        entries.length === 0
          ? 'Журнал пуст: заправьтесь и сходите в рейс, тогда будет что сверять.'
          : matches
            ? 'Баланс сходится: остаток по журналу совпадает с баком.'
            : `Расхождение ${Math.abs(left - inTank)} т. Ваша функция считает не то, что произошло на самом деле.`
      }
    </p>`;

  logHost.innerHTML = `
    <div class="panel__head">
      <h3 class="panel__title">Журнал операций</h3>
      <span class="panel__hint">${entries.length} записей</span>
    </div>
    ${
      entries.length === 0
        ? '<p class="empty-state">Записей пока нет.</p>'
        : `<div class="table-wrap">
             <table class="table">
               <thead><tr><th>Операция</th><th>Вид</th><th>Тонн</th><th>Когда</th></tr></thead>
               <tbody>
                 ${entries
                   .slice()
                   .reverse()
                   .map(entry => `
                     <tr>
                       <td><span class="table__ship-name">${escapeHtml(showValue(entry.note))}</span></td>
                       <td class="mono">${escapeHtml(KIND_LABELS[entry.kind] ?? entry.kind)}</td>
                       <td class="table__num ${entry.kind === 'burn' ? 'is-danger' : 'is-ok'}">
                         ${entry.kind === 'burn' ? '−' : '+'}${escapeHtml(showValue(entry.amount))}
                       </td>
                       <td class="mono">${entry.at ? escapeHtml(new Date(entry.at).toLocaleString('ru')) : 'Начальный остаток'}</td>
                     </tr>`)
                   .join('')}
               </tbody>
             </table>
           </div>
           <p class="widget__note">Журнал ведёт игра. Ваше дело — правильно свести по нему баланс.</p>`
    }`;
}
