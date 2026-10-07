const NS='http://www.w3.org/2000/svg';
const svgNode=(tag,attributes)=>{const node=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;};
const short=value=>Math.abs(value)>=1000000?(value/1000000).toFixed(1)+'м':Math.abs(value)>=1000?(value/1000).toFixed(1)+'к':String(Math.round(value*100)/100);
export function renderChart(widget){
 const figure=document.createElement('figure');figure.className='city-chart';
 if(!widget.points.length){const text=document.createElement('p');text.className='city-chart-empty';text.textContent='Данных пока нет. Выполните шаг или выберите другой товар.';figure.append(text);return figure;}
 const points=widget.points,min=Math.min(0,...points),max=Math.max(0,...points),range=max-min||1,left=56,right=590,top=18,bottom=170;
 const x=i=>left+i*(right-left)/Math.max(1,points.length-1),y=value=>bottom-(value-min)*(bottom-top)/range;
 const svg=svgNode('svg',{viewBox:'0 0 620 210',role:'img','aria-label':widget.title+': '+points.map((v,i)=>(widget.labels[i]||String(i+1))+' '+v).join(', ')});
 for(let i=0;i<4;i++){const value=min+range*i/3,yy=y(value);svg.append(svgNode('line',{x1:left,y1:yy,x2:right,y2:yy,stroke:'currentColor',opacity:'.12'}));const label=svgNode('text',{x:left-8,y:yy+4,'text-anchor':'end',class:'city-chart-axis'});label.textContent=short(value);svg.append(label);}
 if(widget.style==='bar'){
  const size=(right-left)/points.length;
  points.forEach((value,i)=>{const yy=y(value),zero=y(0);const bar=svgNode('rect',{x:left+i*size+size*.15,y:Math.min(zero,yy),width:Math.max(1,size*.7),height:Math.max(1,Math.abs(zero-yy)),rx:3,fill:'currentColor',opacity:.8});const title=svgNode('title',{});title.textContent=(widget.labels[i]||String(i+1))+': '+value+' '+(widget.unit||'');bar.append(title);svg.append(bar);
   if(points.length<=8){const label=svgNode('text',{x:left+(i+.5)*size,y:193,'text-anchor':'middle',class:'city-chart-axis'});label.textContent=(widget.labels[i]||String(i+1)).slice(0,12);svg.append(label);}
  });
 }else{
  const coordinates=points.map((v,i)=>x(i)+','+y(v)).join(' ');
  if(widget.style==='area')svg.append(svgNode('polygon',{points:left+','+y(0)+' '+coordinates+' '+x(points.length-1)+','+y(0),fill:'currentColor',opacity:'.1'}));
  svg.append(svgNode('polyline',{points:coordinates,fill:'none',stroke:'currentColor','stroke-width':2.5,'stroke-linejoin':'round'}));
  points.forEach((value,i)=>{const marker=svgNode('circle',{cx:x(i),cy:y(value),r:points.length>40?2:3,fill:'currentColor'});const title=svgNode('title',{});title.textContent=(widget.labels[i]||String(i+1))+': '+value+' '+(widget.unit||'');marker.append(title);svg.append(marker);});
  for(const i of [...new Set([0,points.length-1])]){const label=svgNode('text',{x:x(i),y:193,'text-anchor':i?'end':'start',class:'city-chart-axis'});label.textContent=widget.labels[i]||String(i+1);svg.append(label);}
 }
 const caption=document.createElement('figcaption');caption.textContent='min '+short(Math.min(...points))+' · max '+short(Math.max(...points))+(widget.unit?' '+widget.unit:'')+' · значений: '+points.length;figure.append(svg,caption);return figure;
}
export function renderProgress(widget){
 const wrap=document.createElement('div'),bar=document.createElement('progress'),text=document.createElement('p');
 wrap.className='city-progress-widget';bar.max=widget.max;bar.value=widget.value;bar.setAttribute('aria-label',widget.title);
 text.textContent=widget.value+' / '+widget.max+(widget.unit?' '+widget.unit:'');wrap.append(bar,text);return wrap;
}
