export const DEFAULT_PAIR=['tissot-store-black-powermatic','tissot-seastar-1000-blue-t1204101104100-store'];
export const money=value=>Number.isFinite(value)?`C$${new Intl.NumberFormat('en-CA',{maximumFractionDigits:2}).format(value)}`:'Not verified';
const searchKey=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en-CA').replace(/[^a-z0-9]/g,'');
export function matchesCatalogueWatch(watch,query){
  const haystack=searchKey(`${watch.name} ${watch.reference} ${watch.type}`);
  const terms=String(query??'').trim().split(/\s+/).map(searchKey).filter(Boolean);
  return terms.every(term=>haystack.includes(term));
}
export function resolvePair(watches,a,b){
  const find=id=>watches.find(item=>item.id===id||item.aliases?.includes(id));
  const first=find(a)||find(DEFAULT_PAIR[0])||watches[0];
  const candidates=[find(b),find(DEFAULT_PAIR[1]),...watches];
  return [first,candidates.find(item=>item&&item.id!==first?.id)];
}
const missing=()=>({text:'Not verified',kind:'missing'});
const text=value=>value?{text:String(value),kind:'value'}:missing();
const field=(watch,key)=>watch.fields[key]?text(watch.fields[key].value):missing();
const reserve=watch=>watch.pending?missing():/quartz|solar/i.test(watch.fields.movement?.value||'')?{text:'Not applicable · quartz power source',kind:'not-applicable'}:field(watch,'reserve');
const battery=watch=>watch.pending?missing():/mechanical/i.test(watch.fields.movement?.value||'')?{text:'Not applicable · mechanical movement',kind:'not-applicable'}:field(watch,'battery');
export const SECTIONS=[
  {title:'Price & reference',rows:[
    {key:'price',label:'Recorded price',hint:'Canadian dollars; compare the source and date.',get:w=>Number.isFinite(w.price.amount)?text(money(w.price.amount)):missing()},
    {key:'priceContext',label:'Price basis',get:w=>Number.isFinite(w.price.amount)?text(w.price.context):missing()},
    {key:'priceNote',label:'Price source / note',get:w=>Number.isFinite(w.price.amount)?text(w.price.note):missing()},
    {key:'checked',label:'Record checked',get:w=>text(w.checked)},
    {key:'status',label:'Identification',get:w=>text(w.status)},
    {key:'availability',label:'Availability',get:w=>text(w.availability)}
  ]},
  {title:'Fit & materials',rows:[
    {key:'size',label:'Case size',hint:'Diameter, or length × width (× thickness) as documented.'},
    {key:'thickness',label:'Thickness'},
    {key:'lugToLug',label:'Lug-to-lug',hint:'Overall wrist span; not the nominal case length.'},
    {key:'weight',label:'Listed weight',hint:'Bracelet sizing can change wearing weight.'},
    {key:'lugWidth',label:'Strap / lug width'},
    {key:'material',label:'Case material'},
    {key:'crystal',label:'Crystal'},
    {key:'strap',label:'Bracelet / strap'},
    {key:'clasp',label:'Clasp'}
  ]},
  {title:'Movement & capability',rows:[
    {key:'movement',label:'Power source'},
    {key:'calibre',label:'Calibre / movement family'},
    {key:'reserve',label:'Mechanical reserve',hint:'Running time after a full wind.',get:reserve},
    {key:'battery',label:'Battery / solar autonomy',hint:'Only a documented duration is shown.',get:battery},
    {key:'accuracy',label:'Stated accuracy',hint:'Frequency alone does not establish accuracy.'},
    {key:'frequency',label:'Movement frequency'},
    {key:'water',label:'Water-resistance rating',hint:'A laboratory rating; follow the maker’s usage instructions.'},
    {key:'functions',label:'Functions & features'}
  ]},
  {title:'Wearing context',rows:[{key:'use',label:'Lumio wearing context',hint:'Editorial guidance, rather than a specification.'}]}
];
export function comparisonRows(a,b){
  return SECTIONS.map(section=>({...section,rows:section.rows.map(row=>{
    const left=row.get?row.get(a):field(a,row.key),right=row.get?row.get(b):field(b,row.key);
    return{...row,left,right,same:left.text===right.text&&left.kind===right.kind};
  })}));
}
export function summaries(a,b){
  const priceKnown=Number.isFinite(a.price.amount)&&Number.isFinite(b.price.amount);
  const priceDifference=priceKnown?Math.abs(a.price.amount-b.price.amount):null;
  const sizeA=a.fields.size,sizeB=b.fields.size;
  const sameSize=sizeA&&sizeB&&sizeA.value===sizeB.value;
  const dimensions=sameSize?`Both list ${sizeA.value}. Thickness, weight and lug-to-lug still affect fit.`:sizeA&&sizeB?`${sizeA.value} alongside ${sizeB.value}. Shape and wrist span matter as much as width.`:'There is not enough documented size data to make a fit comparison.';
  const hasMovements=a.fields.movement&&b.fields.movement;
  return[
    {label:'Budget',title:priceKnown?(priceDifference?`${money(priceDifference)} difference`:'Same recorded price'):'Price comparison incomplete',detail:priceKnown?`These are recorded Canadian prices, checked ${a.checked||'on an unrecorded date'} and ${b.checked||'on an unrecorded date'}. Final seller prices can change.`:'At least one watch has no verified Canadian price. No saving or price ranking is calculated.'},
    {label:'On the wrist',title:sameSize?'Same stated case size':'Compare the proportions',detail:dimensions},
    {label:'Ownership',title:!hasMovements?'Movement comparison incomplete':a.fields.movement.value===b.fields.movement.value?'A shared power source':'Different ownership routines',detail:hasMovements?`${a.fields.movement.value} alongside ${b.fields.movement.value}. Read the reserve, autonomy, features and use context below; neither approach is an automatic winner.`:'Movement or reference details still need verification before comparing ownership routines.'}
  ];
}
