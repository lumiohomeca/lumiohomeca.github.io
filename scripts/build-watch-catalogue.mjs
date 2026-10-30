import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const plain = value => String(value || '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#8211;|&ndash;/g,'–').replace(/\s+/g,' ').trim();
const guideCode = read('watches/watch-guide.js').split('const key =')[0];
const sightingCode = read('watches/store-sighting.js').split('window.LumioStoreSightings')[0];
const guides = vm.runInNewContext(`${guideCode}; guides`, {}, {timeout:1000});
const sightings = vm.runInNewContext(`${sightingCode}; sightings`, {}, {timeout:1000});
const index = read('index.html');
const cards = new Map();
for (const match of index.matchAll(/<article\b[^>]*class="card[^"]*"[^>]*>([\s\S]*?)<\/article>/g)) {
  const html = match[1];
  const href = html.match(/href="watches\/([^"?#]+)\.html"/)?.[1];
  if (href) cards.set(href, html);
}
const records = new Map();
for (const [id,item] of Object.entries(guides)) {
  const metadata=plain((cards.get(id)||'').match(/<div class="meta">([\s\S]*?)<\/div>/)?.[1]);
  records.set(id,{...item,id,origin:'guide',guide:`watches/${id}.html`,note:metadata,checked:metadata.match(/\d{1,2}\s+(?:Sep|Oct)\s+2026/)?.[0]||null});
}
for (const [id,item] of Object.entries(sightings)) records.set(id,{...item,id,origin:'sighting',guide:fs.existsSync(path.join(root,`watches/${id}.html`))?`watches/${id}.html`:`watches/store-sighting.html?watch=${id}`});

// The remaining catalogue pages are authored directly in HTML.
for (const file of fs.readdirSync(path.join(root,'watches')).filter(name=>name.endsWith('.html'))) {
  const id = file.slice(0,-5);
  const html = read(`watches/${file}`);
  if (records.has(id) || /<script[^>]+src="(?:watch-guide|store-sighting)\.js/.test(html)) continue;
  const card = cards.get(id) || '';
  const heading = plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
  if (!heading) continue;
  const facts = [...html.matchAll(/<div class="fact">\s*<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>/g)].map(m=>[plain(m[1]),plain(m[2])]);
  const namedReference = id.match(/((?:96|98)[bk]\d+|h\d{8}|t\d{13}|at\d{4}-\d{2}[a-z]|tw\w{7}|srpl\d+|r\d{8}|gm-2100-1a|gmc-b2100d-1a|l3-720-4-52-9|m\d{8}-\d{4})$/i)?.[1];
  const sourceLinks = [...html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:m[1],label:plain(m[2])}));
  const source = sourceLinks.find(link=>/official|manufacturer|specification/i.test(link.label))?.url || sourceLinks.find(link=>!/amazon|instagram/i.test(link.url))?.url || '';
  const specs = html.match(/<h2[^>]*>What you are getting\.<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1]
    || html.match(/<h2[^>]*>Specifications[\s\S]*?<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1]
    || html.match(/<b>Specifications<\/b>([\s\S]*?)<\/p>/)?.[1] || '';
  const price = plain(card.match(/<strong>([\s\S]*?)<\/strong>/)?.[1]) || facts.find(([value])=>/^(CAD|C\$)/.test(value))?.[0] || plain(html.match(/<b>Price<\/b>([\s\S]*?)<\/p>/)?.[1]);
  const metadata = plain(card.match(/<div class="meta">([\s\S]*?)<\/div>/)?.[1]);
  const photo = html.match(/<img[^>]+(?:class="photo"[^>]+)?src="([^\"]*store-photos[^\"]*)"/)?.[1] || card.match(/<img[^>]+src="([^"]*store-photos[^\"]*)"/)?.[1];
  const intro = plain(html.match(/<p[^>]*class="lead"[^>]*>([\s\S]*?)<\/p>/)?.[1]) || plain(card.match(/<p>([\s\S]*?)<\/p>/)?.[1]);
  records.set(id,{id,name:heading,reference:namedReference?namedReference.toUpperCase().replace(/^L3-720-4-52-9$/,'L3.720.4.52.9'):'Reference not recorded',type:plain(card.match(/<div class="eyebrow">([\s\S]*?)<\/div>/)?.[1]) || plain(html.match(/<div class="eyebrow">([\s\S]*?)<\/div>/)?.[1]),price,facts,specs:plain(specs),lead:intro,source,image:photo,origin:'static',guide:`watches/${file}`,note:metadata || plain(html.match(/<section class="buy">([\s\S]*?)<\/section>/)?.[1]),checked:metadata.match(/\d{1,2}\s+(?:Sep|Oct)\s+2026/)?.[0] || plain(html).match(/(?:verified|checked)\s+(\d{1,2}\s+(?:Sep|Oct)\s+2026)/i)?.[1] || null});
}

const money = text => {
  const match = String(text||'').match(/(?:C\$|CAD)\s*([\d,]+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1].replaceAll(',','')) : null;
};
const oneSentence = text => plain(text).split(/(?<=[.!?])\s+/)[0] || null;
const field = (value, numeric=null) => value ? {value:plain(value),numeric} : null;
const confidencePending = item => /visual identification pending|reference not recorded|reference pending|reference and authenticity pending|exact reference in verification|reference and authenticity are not|price pending reference/i.test(`${item.reference} ${item.status} ${item.price}`);
const roundedSize = (facts,specs) => {
  const found = facts.find(([value,desc])=>/\d.*mm/.test(value) && /case|steel|titanium|diameter|proportion|dress|div/i.test(desc));
  const value = found?.[0] || specs.match(/\b\d+(?:\.\d+)?(?:\s*[×x]\s*\d+(?:\.\d+)?){0,2}\s*mm\b/i)?.[0];
  return value ? field(value, /[×x]/.test(value)?null:Number(value.match(/[\d.]+/)[0])) : null;
};
function normalize(item) {
  const facts = item.facts || [];
  const specs = plain(item.specs || '');
  const details = plain(item.details || '');
  const factual = `${specs}; ${details}; ${facts.map(pair=>pair.join(' ')).join('; ')}`;
  const pending = confidencePending(item);
  const type = `${item.type || ''} ${specs} ${facts.map(pair=>pair.join(' ')).join(' ')}`;
  const movement = /eco.drive/i.test(type)?'Solar quartz / Eco-Drive':/solar|light.powered/i.test(type)?'Solar quartz':/quartz/i.test(type)?'Quartz':/automatic|self.winding/i.test(type)?'Automatic mechanical':/manual|hand.wound|hand.wind/i.test(type)?'Hand-wound mechanical':null;
  const reserveFact = facts.find(([value,desc])=>/reserve/i.test(desc)&&/\d/.test(value));
  const reserveMatch = specs.match(/(\d+(?:\.\d+)?)\s*[- ](?:hour|h)\s*(?:power\s*)?reserve/i);
  const reserve = /mechanical/.test(movement||'') ? field(reserveFact?.[0] || (reserveMatch?`${reserveMatch[1]} hours`:null),Number((reserveFact?.[0].match(/[\d.]+/)?.[0] || reserveMatch?.[1]))||null) : null;
  const waterFact = facts.find(([,desc])=>/water resistance/i.test(desc));
  const waterMatch = specs.match(/(\d+(?:\.\d+)?)\s*(m|bar|ATM)\s*(?:water resistance|water rating|resistance)/i);
  let waterText = waterFact?.[0] || (waterMatch?`${waterMatch[1]} ${waterMatch[2]}`:null);
  let waterNumeric = waterText?Number(waterText.match(/[\d.]+/)?.[0]):null;
  if(waterText&&/bar|atm/i.test(waterText))waterNumeric*=10;
  const material = /resin case|resin and stainless.steel case/i.test(factual)?'Resin case · steel bezel':/super\s*titanium\s*case/i.test(factual)?'Super Titanium':/titanium\s*case/i.test(factual)?'Titanium':/rose.gold.tone\s*(?:316L\s*)?(?:stainless.)?steel\s*case|rose.gold.tone\s*case/i.test(factual)?'Rose-gold-tone steel':/gold.tone\s*(?:316L\s*)?(?:stainless.)?steel\s*case|gold.tone\s*case/i.test(factual)?'Gold-tone steel':/316L/i.test(factual)?'316L stainless steel':/stainless.steel|steel case/i.test(factual)?'Stainless steel':null;
  const crystal = /hardlex/i.test(specs)?'Hardlex':/sapphire/i.test(`${specs} ${details}`)?'Sapphire':/mineral/i.test(`${specs} ${details}`)?'Mineral crystal':null;
  const thickness = specs.match(/(\d+(?:\.\d+)?)\s*mm\s*thick/i);
  const weight = `${specs} ${facts.map(x=>x[0]).join('; ')}`.match(/\b(\d+(?:\.\d+)?)\s*g\b/i);
  const calibreFact = facts.find(([value,desc])=>/calib(?:re|er)|movement|automatic|quartz/i.test(desc)&&!/^quartz$|^automatic$|^gmt$|^manual$|\b(?:k?Hz|jewels)\b/i.test(value));
  const calibre = calibreFact?.[0] || specs.match(/(?:calibre|caliber)\s+([\w.-]+)/i)?.[1] || (/Powermatic 80/i.test(specs)?'Powermatic 80':null);
  const functions = [];
  if(/chronograph|chrono\b/i.test(`${item.type} ${specs} ${details}`))functions.push('Chronograph');
  if(/\bGMT\b|dual.time|second.time.zone/i.test(`${item.type} ${specs} ${details}`))functions.push('Second time zone / GMT');
  if(/big date|twin.disc/i.test(factual))functions.push('Big date');
  else if(/day.date|day and date|day\/date/i.test(factual))functions.push('Day and date');
  else if(/\bdate\b/i.test(factual))functions.push('Date');
  if(/moon.phase/i.test(factual))functions.push('Moon phase');
  if(/perpetual.calendar/i.test(`${item.type} ${specs}`))functions.push('Perpetual calendar');
  if(/open.heart/i.test(`${item.type} ${specs} ${details}`))functions.push('Open-heart display');
  const strapText=`${specs} ${details} ${item.lead||''}`;
  const strap = /rubber|silicone/i.test(strapText)?'Rubber / silicone':/leather/i.test(strapText)?'Leather':/super titanium bracelet/i.test(strapText)?'Super Titanium bracelet':/titanium bracelet/i.test(strapText)?'Titanium bracelet':/resin band|resin strap/i.test(strapText)?'Resin band':/steel bracelet|stainless.steel bracelet/i.test(strapText)?'Steel bracelet':null;
  const dated = `${item.status || ''} ${item.note || ''}`.match(/\d{1,2}\s+(?:Sep(?:tember)?|Oct(?:ober)?)\s+2026/i)?.[0] || item.checked || null;
  let image = item.image || item.visual || null;
  const isPhoto = image?.includes('store-photos') && !image?.includes('retouched') && !image?.includes('/oct-21/');
  image = isPhoto ? image.replace(/^\.\.\//,'') : null;
  const priceValue = pending ? null : money(item.price);
  return {
    id:item.id,name:plain(item.name),reference:plain(item.reference),type:plain(item.type).replace(/\s*·\s*(?:CAD|C\$).*$/,''),guide:item.guide,source:item.source||null,image,
    photoLabel:image?'Original Lumio photograph':'Model photograph not available',
    status:pending?'Identification pending':/legacy|discontinued|current official Canadian price unavailable/i.test(`${item.type} ${item.note} ${item.price}`)?'Archive reference':item.origin==='sighting'?'Visual catalogue match':'Catalogue reference',
    pending,checked:dated,price:{amount:priceValue,currency:'CAD',context:plain(item.price),note:plain(item.note)},
    fields:pending?{}:{size:roundedSize(facts,specs),thickness:thickness?field(`${thickness[1]} mm`,Number(thickness[1])):null,weight:weight?field(`${weight[1]} g`,Number(weight[1])):null,material:field(material),crystal:field(crystal),movement:field(movement),calibre:field(calibre),reserve,water:field(waterText,waterNumeric),functions:field(functions.join(' · ')),strap:field(strap),use:field(oneSentence(item.fits)),frequency:field(facts.find(([value])=>/\bkHz\b|\bHz\b/.test(value))?.[0])},
    lead:plain(item.lead),sourceStatus:plain(item.status),availability:/out of stock/i.test(`${item.price} ${item.note}`)?'Out of stock when recorded':/legacy|discontinued/i.test(`${item.type} ${item.note}`)?'Current availability not verified':'Check current availability with seller'
  };
}
let normalized = [...records.values()].map(normalize);

// A known mismatched retouch must never stand in for an exact PRX photograph.
const prx = normalized.find(item=>item.id==='tissot-prx-40-t1374101109100-store');
if(prx){prx.image=null;prx.photoLabel='Official reference; photographed model under review';prx.status='Reference image under review';}
const oldGentleman=normalized.find(item=>item.id==='tissot-gentleman-t1658071109100');
if(oldGentleman){oldGentleman.image=null;oldGentleman.photoLabel='Model photograph not verified';}

// Prefer a clear source photo when the same exact reference appears twice.
const exact = new Map();
for(const item of normalized){
  const key = item.pending || /not recorded|pending/i.test(item.reference) ? item.id : item.reference.toUpperCase().replace(/[^A-Z0-9]/g,'');
  const prior=exact.get(key);
  if(!prior){exact.set(key,item);continue;}
  const preferred = item.image&&!prior.image?item:prior;
  const secondary=preferred===item?prior:item;
  for(const [name,value] of Object.entries(secondary.fields))if(!preferred.fields[name]&&value)preferred.fields[name]=value;
  preferred.aliases=[...(preferred.aliases||[]),secondary.id];
  exact.set(key,preferred);
}
normalized=[...exact.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.reference.localeCompare(b.reference));
const overridesPath=path.join(root,'assets/watch-compare-overrides.json');
if(fs.existsSync(overridesPath)){
  for(const [id,override]of Object.entries(JSON.parse(fs.readFileSync(overridesPath,'utf8')))){
    const item=normalized.find(item=>item.id===id || item.aliases?.includes(id));
    if(!item)throw new Error(`Override record missing: ${id}`);
    item.fields={...item.fields,...override.fields};
    if(override.price)item.price={...item.price,...override.price};
    item.checked=override.checked;item.source=override.source;item.status='Official specifications checked';
  }
}
const payload={version:1,generatedFrom:'Existing Lumio catalogue; individual price dates shown',watches:normalized};
fs.writeFileSync(path.join(root,'assets/watch-catalogue.json'),JSON.stringify(payload,null,2)+'\n');
console.log(`Built ${normalized.length} catalogue records, ${normalized.filter(x=>x.pending).length} identification-pending records; ${normalized.filter(x=>x.image).length} original photographs.`);
if(process.argv.includes('--inspect'))console.log(JSON.stringify(normalized.map(({id,name,reference,price,fields})=>({id,name,reference,price:price.amount,fields})),null,2));
