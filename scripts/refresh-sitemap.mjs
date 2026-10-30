import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const origin='https://lumiohomeca.github.io';
const updated=process.argv.find(arg=>arg.startsWith('--modified-date='))?.split('=')[1];
if(!/^\d{4}-\d{2}-\d{2}$/.test(updated||''))throw new Error('Supply the actual watch-page update date with --modified-date=YYYY-MM-DD.');
const source=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const entries=new Map([...source.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g)].map(match=>[match[1],match[2]||null]));
const {watches}=JSON.parse(fs.readFileSync(path.join(root,'assets/watch-catalogue.json'),'utf8'));
let added=0;
for(const watch of watches){
  if(watch.pending||watch.guide.includes('?'))continue;
  const file=path.join(root,watch.guide);
  if(!fs.existsSync(file))throw new Error(`Missing catalogue destination: ${watch.guide}`);
  const html=fs.readFileSync(file,'utf8');
  if(/http-equiv=["']refresh|location\.replace\(/i.test(html))continue;
  const url=`${origin}/${watch.guide}`;
  if(!entries.has(url)){entries.set(url,updated);added++;}
}
for(const [url]of entries){
  const pathname=new URL(url).pathname;
  const relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  if(!fs.existsSync(path.join(root,relative)))throw new Error(`Sitemap destination missing: ${relative}`);
  if(relative.startsWith('watches/'))entries.set(url,updated);
}
const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...entries].map(([url,date])=>`  <url><loc>${escape(url)}</loc>${date?`<lastmod>${date}</lastmod>`:''}</url>`).join('\n')+'\n</urlset>\n';
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
console.log(`Sitemap: ${entries.size} unique existing destinations; ${added} confirmed catalogue pages added.`);
