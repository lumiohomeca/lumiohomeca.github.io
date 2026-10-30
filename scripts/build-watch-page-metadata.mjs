import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(import.meta.dirname,'..');
const siteRoot='https://lumiohomeca.github.io/';
const text=value=>String(value??'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+))/g)].map(match=>[match[1].toLowerCase(),match[2]??match[3]??match[4]]));

export function loadWatchRecords(root=projectRoot){
  const load=(filename,delimiter,variable)=>{
    const source=fs.readFileSync(path.join(root,'watches',filename),'utf8');
    const end=source.indexOf(delimiter);
    if(end<0)throw new Error(`Cannot locate trusted record boundary in ${filename}`);
    return vm.runInNewContext(`${source.slice(0,end)};${variable}`,{}, {timeout:1000});
  };
  return {...load('watch-guide.js','const key =','guides'),...load('store-sighting.js','window.LumioStoreSightings','sightings')};
}

export function updateWatchPageHead(html,filename,records={}){
  const headMatch=/<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  if(!headMatch)throw new Error(`Head missing from ${filename}`);
  const originalHead=headMatch[1];
  if([...originalHead.matchAll(/<meta\b[^>]*>/gi)].some(match=>attributes(match[0])['http-equiv']?.toLowerCase()==='refresh'))return {html,changed:false,skipped:true,addedFields:0};
  const item=records[filename.replace(/\.html$/i,'')];
  const generic=filename==='store-sighting.html';
  const heading=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const lead=text(html.match(/<p\b[^>]*class=["'][^"']*\blead\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]||html.match(/<body\b[^>]*>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]);
  const sightingTitle=item&&html.includes('src="store-sighting.js')?`${item.name} ${item.reference} · Store sighting`:null;
  const fallbackTitle=generic?'Store sightings | Lumio Watches':`${sightingTitle||(item?`${item.name} ${item.reference}`:heading||'Watch guide')} | Lumio Watches`;
  const fallbackDescription=generic?'Original Lumio store sightings: photographed watches, identification notes and source information. Select a reference to open its guide.':item?`${item.name} ${item.reference}: ${item.lead}`:lead||`${heading||'Watch reference'}: independent Lumio watch guide with reference information and buying context.`;
  let head=originalHead,addedFields=0;
  const additions=[];
  const newline=html.includes('\r\n')?'\r\n':'\n';
  const titleMatch=/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const title=text(titleMatch?.[1])||text(fallbackTitle);
  if(!text(titleMatch?.[1])){
    const markup=`<title>${escape(title)}</title>`;
    if(titleMatch)head=head.replace(titleMatch[0],markup);else additions.push(markup);
    addedFields++;
  }
  const ensureMeta=(key,value,property=false)=>{
    const attribute=property?'property':'name';
    const match=[...head.matchAll(/<meta\b[^>]*>/gi)].find(match=>attributes(match[0])[attribute]?.toLowerCase()===key);
    const existing=text(match&&attributes(match[0]).content);
    if(existing)return existing;
    const markup=`<meta ${attribute}="${key}" content="${escape(value)}">`;
    if(match)head=head.replace(match[0],markup);else additions.push(markup);
    addedFields++;
    return value;
  };
  const description=ensureMeta('description',text(fallbackDescription));
  const canonicalMatch=[...head.matchAll(/<link\b[^>]*>/gi)].find(match=>attributes(match[0]).rel?.toLowerCase()==='canonical');
  let canonical=canonicalMatch&&attributes(canonicalMatch[0]).href;
  if(!text(canonical)){
    canonical=new URL(`watches/${filename}`,siteRoot).href;
    const markup=`<link rel="canonical" href="${escape(canonical)}">`;
    if(canonicalMatch)head=head.replace(canonicalMatch[0],markup);else additions.push(markup);
    addedFields++;
  }
  ensureMeta('og:type',generic?'website':'article',true);
  ensureMeta('og:title',title,true);
  ensureMeta('og:description',description,true);
  ensureMeta('og:url',canonical,true);
  const hasAnalytics=[...head.matchAll(/<script\b[^>]*>/gi)].some(match=>/(?:^|\/)analytics\.js(?:[?#]|$)/i.test(attributes(match[0]).src||''));
  // Existing collection is already configured in analytics.js; include it once.
  if(!hasAnalytics){additions.push('<script src="../analytics.js" defer></script>');addedFields++;}
  if(additions.length)head+=`${head.endsWith('\n')?'':newline}${additions.join(newline)}${newline}`;
  const start=headMatch.index+headMatch[0].indexOf('>')+1;
  const updated=html.slice(0,start)+head+html.slice(start+originalHead.length);
  return {html:updated,changed:updated!==html,skipped:false,addedFields};
}

export function buildWatchPageMetadata(root=projectRoot){
  const records=loadWatchRecords(root);
  const summary={pages:0,updated:0,redirectsSkipped:0,addedFields:0};
  for(const filename of fs.readdirSync(path.join(root,'watches')).filter(filename=>filename.endsWith('.html'))){
    summary.pages++;
    const fullPath=path.join(root,'watches',filename);
    const result=updateWatchPageHead(fs.readFileSync(fullPath,'utf8'),filename,records);
    if(result.skipped)summary.redirectsSkipped++;
    if(result.changed){fs.writeFileSync(fullPath,result.html);summary.updated++;summary.addedFields+=result.addedFields;}
  }
  return summary;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildWatchPageMetadata()));
