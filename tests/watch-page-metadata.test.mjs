import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadWatchRecords,updateWatchPageHead} from '../scripts/build-watch-page-metadata.mjs';

const root=path.resolve(import.meta.dirname,'..');
const records=loadWatchRecords(root);
const read=name=>fs.readFileSync(path.join(root,'watches',name),'utf8');
const body=html=>html.slice(html.search(/<body\b/i));
const fixture='<!doctype html><html><head><meta charset="utf-8"></head><body><main id="guide"></main><script src="store-sighting.js"></script></body></html>';

test('metadata builds from the exact reference without changing visible markup or render scripts',()=>{
  const result=updateWatchPageHead(fixture,'tissot-store-black-powermatic.html',records);
  assert.equal(body(result.html),body(fixture));
  assert.match(result.html,/<title>Tissot Gentleman T127\.407\.11\.051\.00 · Store sighting \| Lumio Watches<\/title>/);
  assert.match(result.html,/<meta name="description" content="Tissot Gentleman T127\.407\.11\.051\.00:/);
  assert.match(result.html,/<link rel="canonical" href="https:\/\/lumiohomeca\.github\.io\/watches\/tissot-store-black-powermatic\.html">/);
  assert.match(result.html,/<meta property="og:url" content="https:\/\/lumiohomeca\.github\.io\/watches\/tissot-store-black-powermatic\.html">/);
  assert.equal(updateWatchPageHead(result.html,'tissot-store-black-powermatic.html',records).html,result.html);
});

test('existing nonempty editorial metadata remains intact',()=>{
  const original=fixture.replace('<meta charset="utf-8">','<title>Custom title &amp; reference</title><meta name="description" content="Keep this description."><link rel="canonical" href="https://example.com/kept"><meta property="og:title" content="Custom social title">');
  const result=updateWatchPageHead(original,'tissot-store-black-powermatic.html',records).html;
  for(const preserved of ['<title>Custom title &amp; reference</title>','<meta name="description" content="Keep this description.">','<link rel="canonical" href="https://example.com/kept">','<meta property="og:title" content="Custom social title">'])assert.ok(result.includes(preserved));
  assert.match(result,/<meta property="og:description" content="Keep this description\.">/);
  assert.equal(body(result),body(original));
});

test('unconfirmed sightings stay unconfirmed and generic query guides have neutral metadata',()=>{
  const pending=updateWatchPageHead(fixture,'rolex-signed-white-24-hour-reference.html',records).html;
  assert.match(pending,/<title>Rolex-signed white 24-hour watch Visual identification pending/);
  const generic=updateWatchPageHead(fixture,'store-sighting.html',records).html;
  assert.match(generic,/<title>Store sightings \| Lumio Watches<\/title>/);
  assert.doesNotMatch(generic,/T127\.407|Rolex-signed/);
});

test('metadata escapes source text and can use an authored heading and lead',()=>{
  const source='<html><head></head><body><h1>Sample &amp; Steel</h1><p class="lead">A &quot;quiet&quot; watch &amp; its history.</p><button>Existing action</button></body></html>';
  const result=updateWatchPageHead(source,'sample.html').html;
  assert.match(result,/<title>Sample &amp; Steel \| Lumio Watches<\/title>/);
  assert.match(result,/<meta name="description" content="A &quot;quiet&quot; watch &amp; its history\.">/);
  assert.equal(body(result),body(source));
});

test('redirects remain untouched and regular pages load the same measurement once',()=>{
  const redirect=read('citizen-blue-tool-store.html');
  assert.equal(updateWatchPageHead(redirect,'citizen-blue-tool-store.html',records).html,redirect);
  const withTag=fixture.replace('</head>','<script src="../analytics.js" defer></script></head>');
  const result=updateWatchPageHead(withTag,'tissot-store-black-powermatic.html',records).html;
  assert.equal((result.match(/src="\.\.\/analytics\.js"/g)||[]).length,1);
});

test('every published watch page has initial reference metadata and measurement, except the redirect',()=>{
  const titles=[];
  for(const filename of fs.readdirSync(path.join(root,'watches')).filter(filename=>filename.endsWith('.html'))){
    const html=read(filename);
    if(/http-equiv="refresh"/i.test(html))continue;
    const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
    assert.ok(head,filename);
    assert.match(head,/<title>[^<]+<\/title>/,filename);
    assert.match(head,/<meta name="description" content="[^"]+">/,filename);
    assert.match(head,/<link rel="canonical" href="https:\/\/lumiohomeca\.github\.io\/watches\//,filename);
    for(const property of ['og:type','og:title','og:description','og:url'])assert.ok(head.includes(`property="${property}"`),`${filename}: ${property}`);
    assert.equal((head.match(/src="\.\.\/analytics\.js"/g)||[]).length,1,filename);
    assert.ok(head.includes('<script src="../analytics.js" defer></script>'),filename);
    assert.equal(updateWatchPageHead(html,filename,records).html,html,`${filename}: rebuild should be stable`);
    titles.push(head.match(/<title>([^<]+)<\/title>/)?.[1]);
  }
  assert.equal(new Set(titles).size,titles.length,'Every dedicated guide should have its own title.');
});

test('guide rendering reuses static metadata and analytics while preserving its detailed schema',()=>{
  const runtime=read('watch-guide.js').split("document.querySelector('#guide').innerHTML")[0];
  const filename='hamilton-jazzmaster-viewmatic-h32515555.html';
  const item=records[filename.replace('.html','')];
  assert.ok(item,'The regression exercises a real trusted guide record.');
  const expectedDescription=`${item.name} ${item.reference}: independent Lumio guide with Canadian reference price, specifications, context and buying considerations.`;
  const canonical=`https://lumiohomeca.github.io/watches/${filename}`;
  for(const initiallyPresent of [true,false]){
    const elements=[];
    const makeElement=tagName=>({tagName,setAttribute(name,value){this[name]=value;}});
    if(initiallyPresent){
      for(const [tagName,key,value] of [['meta','name','description'],['link','rel','canonical'],...['og:type','og:title','og:description','og:url'].map(value=>['meta','property',value]),['script','src','../analytics.js']]){
        elements.push(Object.assign(makeElement(tagName),{[key]:value,content:'Existing static content'}));
      }
    }
    const document={
      title:'Static guide title',
      createElement:makeElement,
      head:{appendChild(element){elements.push(element);return element;}},
      querySelector(selector){
        const match=selector.match(/^(\w+)\[(\w+)="([^"]+)"\]$/);
        assert.ok(match,`Unexpected metadata selector: ${selector}`);
        return elements.find(element=>element.tagName===match[1]&&element[match[2]]===match[3])||null;
      }
    };
    vm.runInNewContext(runtime,{document,location:{pathname:`/watches/${filename}`,href:`${canonical}?source=test`},URL});
    const find=(tagName,key,value)=>elements.filter(element=>element.tagName===tagName&&element[key]===value);
    assert.equal(find('script','src','../analytics.js').length,1,`Analytics is included once; existing=${initiallyPresent}`);
    assert.equal(find('meta','name','description').length,1);
    assert.equal(find('meta','name','description')[0].content,expectedDescription);
    assert.equal(find('link','rel','canonical').length,1);
    assert.equal(find('link','rel','canonical')[0].href,canonical);
    for(const [property,content] of [['og:type','article'],['og:title',document.title],['og:description',expectedDescription],['og:url',canonical]]){
      assert.equal(find('meta','property',property).length,1,property);
      assert.equal(find('meta','property',property)[0].content,content,property);
    }
    const schemas=find('script','type','application/ld+json');
    assert.equal(schemas.length,1);
    const graph=JSON.parse(schemas[0].textContent)['@graph'];
    assert.deepEqual(graph.map(node=>node['@type']),['Product','Article','BreadcrumbList']);
    assert.equal(graph[0].description,item.lead);
    assert.equal(graph[1].description,expectedDescription);
    assert.equal(graph[1].isBasedOn,item.source);
  }
});
