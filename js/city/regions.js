export const REGIONS=[
 {id:'city',name:'Промышленный город',cost:0,description:'Домашние рынки и городской транспорт.'},
 {id:'port',name:'Свободный порт',cost:600,description:'Дешёвый лом, крупные сделки и перевозки баржей.'},
 {id:'highlands',name:'Северные высоты',cost:1000,description:'Поставки металла и высокий спрос на провод и схемы.'}
];
export const SUPPLIERS=[
 {id:'yard',region:'city',product:'scrap',price:4,limit:120,refill:4},
 {id:'port-yard',region:'port',product:'scrap',price:3,limit:80,refill:2},
 {id:'northern-metal',region:'highlands',product:'metal',price:12,limit:40,refill:1}
];
export function regionEvents(tick){
 const n=tick%24;
 return [{id:'port-demand',region:'port',name:n>=8&&n<16?'Портовая стройка':'Обычная торговля',active:n>=8&&n<16,priceBonus:n>=8&&n<16?5:0,changesIn:n<8?8-n:n<16?16-n:32-n},
 {id:'northern-demand',region:'highlands',name:n>=16?'Сезон ремонта':'Обычная торговля',active:n>=16,priceBonus:n>=16?8:0,changesIn:n<16?16-n:24-n}];
}
