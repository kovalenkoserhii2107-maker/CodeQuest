import { findImports, resolveSpecifier } from '../act2/loader.js';
export const validProjectPath=(path,folder=false)=>typeof path==='string'&&path.length<=160&&path.split('/').length<=6&&(folder?/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/:/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.js$/).test(path);
export function validateFiles(files){
 if(!files||Array.isArray(files)||typeof files['index.js']!=='string'||Object.keys(files).length>20)throw new Error('Проект должен содержать index.js и не более 20 файлов.');
 let total=0;for(const [name,code]of Object.entries(files)){if(!validProjectPath(name)||typeof code!=='string')throw new Error('Используйте пути вида strategies/trade.js без .. и специальных символов.');total+=code.length;}
 if(total>200000)throw new Error('Размер проекта превышает 200 КБ.');return {...files};
}
export function normalizeWorkspace(value,files){
 const active=Object.hasOwn(files,value?.active)?value.active:'index.js';
 return {active,tabs:[...new Set([...(Array.isArray(value?.tabs)?value.tabs.filter(p=>typeof p==='string'&&Object.hasOwn(files,p)):['index.js']),active])],folders:Array.isArray(value?.folders)?[...new Set(value.folders.filter(p=>validProjectPath(p,true)))].slice(0,20):[]};
}
function relative(from,to){const a=from.split('/').slice(0,-1),b=to.split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}const path='../'.repeat(a.length)+b.join('/');return path.startsWith('../')?path:'./'+path;}
export class ProjectFiles{
 #files;#workspace;
 constructor(files,workspace){this.#files=validateFiles(files);this.#workspace=normalizeWorkspace(workspace,files);}
 files(){return {...this.#files};}workspace(){return JSON.parse(JSON.stringify(this.#workspace));}active(){return this.#workspace.active;}
 folders(){const all=new Set();for(const path of [...this.#workspace.folders,...Object.keys(this.#files).map(p=>p.split('/').slice(0,-1).join('/')).filter(Boolean)]){const parts=path.split('/');while(parts.length){all.add(parts.join('/'));parts.pop();}}return [...all].sort();}
 open(path){if(!Object.hasOwn(this.#files,path))throw new Error('Файл не найден.');this.#workspace.active=path;if(!this.#workspace.tabs.includes(path))this.#workspace.tabs.push(path);}
 close(path){this.#workspace.tabs=this.#workspace.tabs.filter(p=>p!==path);if(this.active()===path)this.open(this.#workspace.tabs.at(-1)||'index.js');}
 write(path,code){if(!Object.hasOwn(this.#files,path))throw new Error('Файл не найден.');this.#files=validateFiles({...this.#files,[path]:code});}
 create(path,code='// Ваш JavaScript-модуль.\n'){if(Object.hasOwn(this.#files,path)||this.folders().includes(path))throw new Error('Путь уже существует.');this.#files=validateFiles({...this.#files,[path]:code});this.open(path);}
 createFolder(path){if(!validProjectPath(path,true)||this.folders().includes(path)||this.#workspace.folders.length>=20)throw new Error('Некорректный или занятый путь папки.');this.#workspace.folders.push(path);}
 rename(from,to,folder=false){
  if(from==='index.js')throw new Error('Точка входа index.js должна оставаться в корне.');
  if(from===to)return;
  if(!validProjectPath(to,folder)||Object.hasOwn(this.#files,to)||this.folders().includes(to))throw new Error('Некорректный или занятый путь.');
  if(folder?!this.folders().includes(from):!Object.hasOwn(this.#files,from))throw new Error('Путь не найден.');
  if(folder&&to.startsWith(from+'/'))throw new Error('Нельзя переместить папку внутрь самой себя.');
  const move=p=>p===from||(folder&&p.startsWith(from+'/'))?to+p.slice(from.length):p;
  const files={};for(const [path,source]of Object.entries(this.#files)){const next=move(path);let code=source;for(const item of findImports(source).reverse()){const target=resolveSpecifier(path,item.specifier);if(target===null)continue;if(next!==path||move(target)!==target)code=code.slice(0,item.start)+relative(next,move(target))+code.slice(item.end);}files[next]=code;}
  if(new Set(Object.keys(this.#files).map(move)).size!==Object.keys(this.#files).length)throw new Error('Конфликт путей.');
  this.#files=validateFiles(files);this.#workspace.active=move(this.active());this.#workspace.tabs=this.#workspace.tabs.map(move);this.#workspace.folders=this.#workspace.folders.map(move);
 }
 remove(path,folder=false){if(path==='index.js')throw new Error('Нельзя удалить точку входа.');const match=p=>p===path||(folder&&p.startsWith(path+'/'));this.#files=Object.fromEntries(Object.entries(this.#files).filter(([p])=>!match(p)));this.#workspace.folders=this.#workspace.folders.filter(p=>!match(p));this.#workspace.tabs=this.#workspace.tabs.filter(p=>!match(p));if(match(this.active()))this.open(this.#workspace.tabs.at(-1)||'index.js');}
}
