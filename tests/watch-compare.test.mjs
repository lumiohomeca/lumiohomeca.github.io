import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DEFAULT_PAIR, money, resolvePair, comparisonRows, summaries} from '../assets/watch-compare-core.mjs';

const root=path.resolve(import.meta.dirname,'..');
const {watches}=JSON.parse(fs.readFileSync(path.join(root,'assets/watch-catalogue.json'),'utf8'));
const byId=id=>watches.find(watch=>watch.id===id);
const defaults=DEFAULT_PAIR.map(byId);
const rows=(...pair)=>comparisonRows(...pair).flatMap(group=>group.rows);

test('catalogue identities remain distinct and every local destination exists',()=>{
  assert.ok(watches.length>=80,'The comparison should cover the existing catalogue.');
  assert.equal(new Set(watches.map(watch=>watch.id)).size,watches.length);
  const identities=watches.filter(watch=>!watch.pending).map(watch=>watch.reference.replace(/[^a-z0-9]/gi,'').toUpperCase());
  assert.equal(new Set(identities).size,identities.length,'Exact references should be deduplicated.');
  for(const watch of watches){
    assert.ok(fs.existsSync(path.join(root,watch.guide.split('?')[0])),`${watch.id}: guide missing`);
    if(watch.image)assert.ok(fs.existsSync(path.join(root,watch.image)),`${watch.id}: image missing`);
    if(watch.source)assert.equal(new URL(watch.source).protocol,'https:');
    assert.equal(watch.price.currency,'CAD');
    assert.ok(watch.price.amount===null || Number.isFinite(watch.price.amount)&&watch.price.amount>0);
  }
});

test('unidentified photographs do not acquire speculative prices or specifications',()=>{
  const pending=watches.filter(watch=>watch.pending);
  assert.ok(pending.length>1);
  assert.equal(new Set(pending.map(watch=>watch.id)).size,pending.length);
  for(const watch of pending){
    assert.equal(watch.price.amount,null,watch.id);
    assert.deepEqual(watch.fields,{},watch.id);
    assert.equal(watch.status,'Identification pending',watch.id);
  }
});

test('sale prices use the first recorded amount rather than concatenating former prices',()=>{
  assert.equal(byId('bulova-lunar-pilot-96k115-store').price.amount,956);
  assert.match(byId('bulova-lunar-pilot-96k115-store').price.context,/1,195/);
  assert.equal(byId('bulova-lunar-pilot-96b251-store').price.amount,796);
  assert.equal(byId('bulova-marine-star-98b301').price.amount,618.75);
});

test('official default comparison retains source, price date and distinct dimensions',()=>{
  const [gentleman,seastar]=defaults;
  assert.ok(gentleman&&seastar);
  assert.equal(gentleman.reference,'T127.407.11.051.00');
  assert.equal(seastar.reference,'T120.410.11.041.00');
  assert.equal(gentleman.price.amount,1195);
  assert.equal(seastar.price.amount,625);
  for(const watch of defaults){
    assert.equal(watch.checked,'29 Oct 2026');
    assert.match(watch.source,/^https:\/\/www\.tissotwatches\.com\/en-ca\//);
    assert.equal(watch.fields.size.numeric,40);
    assert.equal(watch.fields.lugToLug,undefined,'Nominal case length is not lug-to-lug.');
    assert.equal(watch.fields.accuracy,undefined,'No undocumented accuracy should be inferred.');
  }
  assert.equal(gentleman.fields.thickness.numeric,11.5);
  assert.equal(seastar.fields.thickness.numeric,9.97);
  assert.equal(gentleman.fields.water.numeric,100);
  assert.equal(seastar.fields.water.numeric,300);
  assert.equal(summaries(...defaults)[0].title,'C$570 difference');
});

test('missing prices remain missing in money formatting and the budget summary',()=>{
  assert.equal(money(null),'Not verified');
  assert.equal(money(NaN),'Not verified');
  assert.equal(money(618.75),'C$618.75');
  const pending=watches.find(watch=>watch.pending);
  assert.equal(summaries(defaults[0],pending)[0].title,'Price comparison incomplete');
  const price=rows(defaults[0],pending).find(row=>row.key==='price');
  assert.equal(price.right.kind,'missing');
  assert.equal(price.right.text,'Not verified');
});

test('pair resolution accepts aliases, rejects identical selections and recovers invalid links',()=>{
  assert.deepEqual(resolvePair(watches,'missing-a','missing-b').map(watch=>watch.id),DEFAULT_PAIR);
  const [first,second]=resolvePair(watches,DEFAULT_PAIR[0],DEFAULT_PAIR[0]);
  assert.notEqual(first.id,second.id);
  const [bulova,other]=resolvePair(watches,'bulova-lunar-pilot-96b251','bulova-lunar-pilot-96b251-store');
  assert.equal(bulova.id,'bulova-lunar-pilot-96b251-store');
  assert.notEqual(bulova.id,other.id);
  assert.equal(watches.filter(watch=>watch.reference==='96B251').length,1);
});

test('rectangular case dimensions are preserved without a misleading round diameter',()=>{
  const mido=byId('mido-multifort-tv-big-date-m0495261109100-store');
  assert.equal(mido.fields.size.value,'39.2 × 40 mm');
  assert.equal(mido.fields.size.numeric,null);
  const size=rows(mido,defaults[0]).find(row=>row.key==='size');
  assert.equal(size.left.text,'39.2 × 40 mm');
});

test('mechanical reserve, battery duration, frequency and accuracy are separate concepts',()=>{
  const comparison=rows(...defaults);
  const reserve=comparison.find(row=>row.key==='reserve');
  const battery=comparison.find(row=>row.key==='battery');
  assert.equal(reserve.left.text,'Up to 80 hours');
  assert.equal(reserve.right.kind,'not-applicable');
  assert.equal(battery.left.kind,'not-applicable');
  assert.equal(battery.right.kind,'missing');
  const bulova=byId('bulova-lunar-pilot-96b251-store');
  assert.equal(bulova.fields.frequency.value,'262 kHz');
  assert.equal(rows(bulova,defaults[0]).find(row=>row.key==='accuracy').left.kind,'missing');
  for(const watch of watches){
    assert.doesNotMatch(watch.fields.calibre?.value||'',/\b(?:k?Hz)\b/i,`${watch.id}: a frequency is not a calibre.`);
  }
});

test('differences mode can hide shared missing data without treating it as verified',()=>{
  const accuracy=rows(...defaults).find(row=>row.key==='accuracy');
  assert.equal(accuracy.same,true);
  assert.equal(accuracy.left.kind,'missing');
  assert.equal(accuracy.right.kind,'missing');
  assert.ok(rows(...defaults).filter(row=>!row.same).some(row=>row.key==='price'));
  assert.ok(!rows(...defaults).filter(row=>!row.same).some(row=>row.key==='accuracy'));
});

test('known mismatched images are withheld while the exact reference stays selectable',()=>{
  const prx=byId('tissot-prx-40-t1374101109100-store');
  const gentleman=byId('tissot-gentleman-t1658071109100');
  assert.equal(prx.image,null);
  assert.equal(gentleman.image,null);
  assert.match(prx.photoLabel,/under review/i);
  assert.equal(prx.reference,'T137.410.11.091.00');
  assert.equal(gentleman.reference,'T165.807.11.091.00');
  assert.ok(watches.filter(watch=>watch.image).every(watch=>!watch.image.includes('retouched')));
});

test('automatics with optional manual winding retain their automatic classification',()=>{
  for(const id of ['seiko-5-sports-srpl83','seiko-presage-srpe45','seiko-presage-srpl71','seiko-presage-spb524','seiko-presage-spb405','seiko-presage-spb537']){
    assert.equal(byId(id).fields.movement.value,'Automatic mechanical',id);
  }
  assert.equal(byId('seiko-5-sports-srpl83').fields.calibre.value,'4R36');
  assert.equal(byId('grand-seiko-evolution-9-slgw003').fields.movement.value,'Hand-wound mechanical');
});

test('generic solar movements do not receive a different manufacturer’s trademark',()=>{
  assert.equal(byId('gshock-gmc-b2100d-1a').fields.movement.value,'Solar quartz');
  assert.equal(byId('citizen-zenshin-chrono-ca4610-85m-store').fields.movement.value,'Solar quartz / Eco-Drive');
});

test('three-part case dimensions retain all values instead of using width × thickness as the case face',()=>{
  assert.equal(byId('gshock-gm-2100-1a').fields.size.value,'49.3 × 44.4 × 11.8 mm');
  assert.equal(byId('gshock-gmc-b2100d-1a').fields.size.value,'51.3 × 46.3 × 12.4 mm');
  assert.equal(byId('gshock-gm-2100-1a').fields.size.numeric,null);
  assert.equal(byId('gshock-gmc-b2100d-1a').fields.size.numeric,null);
});

test('case and bracelet materials do not come from unrelated trim or generic bracelet wording',()=>{
  assert.equal(byId('gshock-gm-2100-1a').fields.material.value,'Resin case · steel bezel');
  assert.equal(byId('gshock-gm-2100-1a').fields.strap.value,'Resin band');
  assert.equal(byId('citizen-zenshin-chrono-ca4610-85m-store').fields.strap.value,'Super Titanium bracelet');
  assert.equal(byId('seiko-presage-srp855').fields.material,null,'Rose-gold-tone markers do not establish case material.');
});

test('jewel counts are not movement names and multiword calibre names remain intact',()=>{
  assert.equal(byId('caravelle-sea-hunter-44b130').fields.calibre,null);
  assert.equal(byId('cartier-santos-chronograph-wssa0017').fields.calibre.value,'1904 CH MC');
});
