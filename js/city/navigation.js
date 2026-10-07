const SECTIONS=[['workspace','Код и дашборды'],['world','Мир и экономика'],['task','Задания'],['api','Путеводитель API']];
/** Keeps the editor mounted while sections change, preserving its model and undo. */
export class CityNavigation {
 #root; #pages=new Map(); #tabs;
 constructor(root){
  this.#root=root;const nav=root.querySelector('.city-section-nav');nav.setAttribute('role','tablist');
  nav.innerHTML=SECTIONS.map(([id,label])=>'<button type="button" role="tab" id="city-tab-'+id+'" aria-controls="city-page-'+id+'" data-jump="'+id+'">'+label+'</button>').join('');
  this.#tabs=[...nav.querySelectorAll('[role="tab"]')];
  const grid=root.querySelector('.city-grid'),primary=root.querySelector('.city-primary'),side=root.querySelector('.city-side');
  const workspace=root.querySelector('[data-workspace]'),task=root.querySelector('[data-task]'),board=root.querySelector('[data-board]'),api=root.querySelector('[data-api]');
  const state=root.querySelector('[data-snapshot]').closest('section'),settings=root.querySelector('[data-reset]').closest('section');
  for(const [id]of SECTIONS){const page=document.createElement('section');page.id='city-page-'+id;page.dataset.page=id;page.className='city-page';page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby','city-tab-'+id);this.#pages.set(id,page);grid.before(page);}
  this.#pages.get('workspace').append(workspace,settings);
  const study=document.createElement('div');study.className='city-study-grid';study.append(board,task);this.#pages.get('task').append(study);
  const map=document.createElement('section');map.className='city-panel city-map-panel';map.dataset.regionMap='';this.#pages.get('world').append(map,side);
  this.#pages.get('api').append(api,state);grid.remove();
  this.#tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{
   let next;if(event.key==='ArrowRight')next=(index+1)%this.#tabs.length;
   if(event.key==='ArrowLeft')next=(index+this.#tabs.length-1)%this.#tabs.length;
   if(event.key==='Home')next=0;if(event.key==='End')next=this.#tabs.length-1;
   if(next===undefined)return;event.preventDefault();this.open(this.#tabs[next].dataset.jump);this.#tabs[next].focus();
  }));this.open('workspace');
 }
 open(id){id=id==='orders'?'world':id;if(!this.#pages.has(id))return;for(const [key,page]of this.#pages)page.hidden=key!==id;
  this.#tabs.forEach(tab=>{const selected=tab.dataset.jump===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
 }
}
