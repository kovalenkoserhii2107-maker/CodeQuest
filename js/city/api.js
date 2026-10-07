import { PRODUCTS, COMMANDS } from './catalog.js';
import { validateMemory } from './engine.js';

export function createCityAPI(engine, memory, { onCommand = () => {}, onRead = () => {}, onPrint = () => {}, readOnly = false, files = {} } = {}) {
  const read = (name, operation) => { onRead(name); return operation(); };
  const product = value => { if (!Object.hasOwn(PRODUCTS, value)) throw new Error('Неизвестный товар: ' + value); return value; };
  let count = 0;
  const command = (method, args) => {
    if(readOnly)throw new Error('Дашборд читает мир. Изменяйте экономику через main(cq), не render().');
    if (count >= 100) throw new Error('Допускается до 100 команд за шаг.');
    if (!COMMANDS.includes(method)) throw new Error('Неизвестная команда.');
    const value = engine[method](...args);
    count++;
    onCommand({ method, args }); return value;
  };
  const state = name => read(name, () => engine.snapshot());
  return {
    memory: validateMemory(memory),
    print: (...values) => onPrint(...values),
    analytics:Object.freeze({getHistory:(limit=120)=>read('analytics.getHistory',()=>engine.getHistory(limit))}),
    project:Object.freeze({listFiles:()=>read('project.listFiles',()=>Object.keys(files)),readFile:path=>read('project.readFile',()=>{if(!Object.hasOwn(files,path))throw new Error('Файл не найден.');return files[path];})}),
    world: Object.freeze({
      getState: () => state('world.getState'),
      getRegions:()=>read('world.getRegions',()=>engine.getRegions()),getEvents:()=>read('world.getEvents',()=>engine.getEvents()),explore:id=>command('openRegion',[id]),
      getTime: () => read('world.getTime', () => engine.snapshot().tick)
    }),
    warehouse: Object.freeze({
      getStock: id => read('warehouse.getStock', () => engine.snapshot().inventory[product(id)]),
      getFreeSpace: () => read('warehouse.getFreeSpace', () => engine.getFreeSpace()),
      upgrade: () => command('upgrade', ['warehouse'])
    }),
    market: Object.freeze({
      getSuppliers: () => read('market.getSuppliers', () => engine.getSuppliers()),
      getBuyers: id => read('market.getBuyers', () => {
        if (id !== undefined) product(id);
        return engine.getBuyers(id);
      }),
      quote: (...args) => read('market.quote', () => engine.getQuote(...args)),
      buy: (...args) => command('buy', args),
      sell: (...args) => command('sell', args)
    }),
    factory: Object.freeze({
      getRecipes: () => read('factory.getRecipes', () => engine.getRecipes()),
      getLines: () => read('factory.getLines', () => engine.snapshot().lines),
      start: (...args) => command('produce', args),
      upgrade: (id = 'line-1') => command('upgrade', ['machine', id]),
      purchaseLine: () => command('purchaseLine', [])
    }),
    contracts: Object.freeze({
      list: () => read('contracts.list', () => engine.getContracts()),
      accept: id => command('acceptContract', [id]),
      deliver: id => command('deliverContract', [id])
    }),
    logistics: Object.freeze({
      getRoutes: () => read('logistics.getRoutes', () => engine.getRoutes()),
      getShipments: () => read('logistics.getShipments', () => engine.snapshot().shipments),
      dispatch: (...args) => command('dispatch', args)
    }),
    research: Object.freeze({
      list: () => read('research.list', () => engine.getResearch()),
      unlock: id => command('unlock', [id])
    }),
    // Compatibility aliases keep existing projects working.
    getState: () => state('world.getState'),
    buy: (...args) => command('buy', args), produce: (...args) => command('produce', args),
    sell: (...args) => command('sell', args), upgrade: (...args) => command('upgrade', args)
  };
}
