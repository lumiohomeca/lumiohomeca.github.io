import {resolvePair,money,comparisonRows,summaries,matchesCatalogueWatch} from './watch-compare-core.mjs?v=20261030-buttons';
const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeSource=source=>{try{return new URL(source).protocol==='https:'?source:null;}catch{return null;}};
let catalogue=[],pair=[];
const label=watch=>`${watch.name} · ${watch.reference}`;
function fillPickers(changedIndex){
  if(pair.length!==2)return;
  const query=$('#watch-search').value.trim().toLocaleLowerCase('en-CA');
  const matches=catalogue.filter(watch=>matchesCatalogueWatch(watch,query));
  ['a','b'].forEach((side,index)=>{
    // Keep the active native menu intact while the visitor commits a selection.
    if(index===changedIndex)return;
    const select=$(`#watch-${side}`),current=pair[index],other=pair[1-index];
    const available=matches.filter(watch=>watch.id!==other.id);
    if(!available.some(watch=>watch.id===current.id))available.unshift(current);
    select.replaceChildren();
    for(const [groupName,items] of [['Catalogue references',available.filter(watch=>!watch.pending)],['Identification in progress',available.filter(watch=>watch.pending)]]){
      if(!items.length)continue;
      const group=document.createElement('optgroup');group.label=groupName;
      items.forEach(watch=>{const option=document.createElement('option');option.value=watch.id;option.textContent=label(watch);group.appendChild(option);});
      select.appendChild(group);
    }
    select.value=current.id;select.disabled=false;
  });
  $('#catalogue-count').textContent=query?`${matches.length} matching record${matches.length===1?'':'s'}. Choose a result in Watch A or Watch B; your current selections stay available.`:`${catalogue.length} catalogue records · including ${catalogue.filter(watch=>watch.pending).length} clearly marked identification-pending records.`;
}
function renderCards(){
  $('#compare-watches').innerHTML=pair.map(watch=>{
    const source=safeSource(watch.source);
    return `<article class="compare-card"><div class="compare-photo${watch.image?'':' compare-photo-placeholder'}"><img src="${escape(watch.image||'assets/lumio-mark.svg')}" alt="${watch.image?escape(label(watch)+' photographed by Lumio'):'Lumio mark; no verified model photograph'}"><span class="compare-photo-label">${escape(watch.photoLabel)}</span></div><p class="compare-track">${escape(watch.status)}</p><h2 class="compare-name">${escape(watch.name)}</h2><p class="compare-ref">${escape(watch.reference)}</p><p class="compare-price">${escape(money(watch.price.amount))}</p><p class="compare-price-note">${escape(Number.isFinite(watch.price.amount)?watch.price.context:'No verified Canadian price in the catalogue.')}<br>${watch.checked?`Checked ${escape(watch.checked)}`:'Check date not recorded'} · CAD${watch.price.note?`<span class="compare-price-basis">${escape(watch.price.note)}</span>`:''}</p><div class="compare-actions"><a href="${escape(watch.guide)}">Open full guide →</a>${source?`<a href="${escape(source)}" target="_blank" rel="noopener">Reference / specifications ↗</a>`:''}</div></article>`;
  }).join('');
}
function renderTable(){
  const groups=comparisonRows(...pair),onlyDifferences=$('#differences').checked;
  $('#comparison-head').innerHTML=`<tr><th scope="col">The detail</th>${pair.map((watch,i)=>`<th scope="col"><span class="muted">WATCH ${i?'B':'A'}</span><br>${escape(watch.name)}<small>${escape(watch.reference)}</small></th>`).join('')}</tr>`;
  const cell=value=>`<td><span class="${value.kind==='missing'?'missing':value.kind==='not-applicable'?'muted':''}">${escape(value.text)}</span></td>`;
  $('#comparison-body').innerHTML=groups.map(group=>{
    const visible=group.rows.filter(row=>!onlyDifferences||!row.same);
    if(!visible.length)return'';
    return `<tr class="compare-section"><th colspan="3" scope="colgroup">${escape(group.title)}</th></tr>`+visible.map(row=>`<tr data-field="${escape(row.key)}" class="${row.same?'is-same':'is-different'}"><th scope="row">${escape(row.label)}${row.hint?`<small>${escape(row.hint)}</small>`:''}</th>${cell(row.left)}${cell(row.right)}</tr>`).join('');
  }).join('');
  const differences=groups.flatMap(group=>group.rows).filter(row=>!row.same).length;
  $('#compare-status').textContent=onlyDifferences?`${differences} differing fields shown. Shared values and shared gaps are hidden.`:`Comparing ${pair[0].name} and ${pair[1].name}.`;
}
function render(changedIndex){
  fillPickers(changedIndex);renderCards();renderTable();
  $('#comparison-summary').innerHTML=summaries(...pair).map(summary=>`<article><div class="eyebrow">${escape(summary.label)}</div><h2>${escape(summary.title)}</h2><p>${escape(summary.detail)}</p></article>`).join('');
  const url=new URL(location.href);url.searchParams.set('a',pair[0].id);url.searchParams.set('b',pair[1].id);history.replaceState(null,'',url);
  $('#comparison-link').value=url.href;$('#share-fallback').hidden=true;
  $('#compare-toolbar').hidden=false;$('#compare-table-wrap').hidden=false;
}
$('#compare-form').addEventListener('submit',event=>event.preventDefault());
$('#watch-search').addEventListener('input',()=>fillPickers());
['a','b'].forEach((side,index)=>$(`#watch-${side}`).addEventListener('change',event=>{const selected=catalogue.find(watch=>watch.id===event.target.value);if(!selected||selected.id===pair[1-index].id)return;pair[index]=selected;render(index);}));
$('#differences').addEventListener('change',renderTable);
$('#swap').addEventListener('click',()=>{pair.reverse();render();$('#compare-status').textContent=`Watches swapped. Watch A: ${label(pair[0])}. Watch B: ${label(pair[1])}.`;});
$('#share').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#comparison-link').value);$('#compare-status').textContent='Comparison link copied.';}
  catch{$('#share-fallback').hidden=false;$('#comparison-link').focus();$('#comparison-link').select();$('#compare-status').textContent='Select and copy the comparison address below.';}
});
window.addEventListener('popstate',()=>{if(catalogue.length<2)return;const params=new URLSearchParams(location.search);pair=resolvePair(catalogue,params.get('a'),params.get('b'));render();});
try{
  const response=await fetch(new URL('watch-catalogue.json?v=20261029',import.meta.url));
  if(!response.ok)throw new Error('Catalogue response unavailable');
  const data=await response.json();catalogue=data.watches;
  if(!Array.isArray(catalogue)||catalogue.length<2)throw new Error('Catalogue has fewer than two records');
  const params=new URLSearchParams(location.search);pair=resolvePair(catalogue,params.get('a'),params.get('b'));render();
}catch{
  $('#compare-error').hidden=false;$('#compare-error').innerHTML='The comparison catalogue could not load. Please reload this page or <a href="index.html#index">open the watch index</a>.';
  $('#catalogue-count').textContent='Catalogue temporarily unavailable.';
}
