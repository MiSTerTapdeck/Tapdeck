import fs from 'node:fs/promises';
import path from 'node:path';
const coverOut = new URL('../assets/artwork/', import.meta.url);
const sceneOut = new URL('../assets/scenes/', import.meta.url);
await Promise.all([fs.mkdir(coverOut, {recursive:true}),fs.mkdir(sceneOut, {recursive:true})]);
const requests = [
 ['super-metroid','SNES','nintendo-consoles','Super Metroid (Japan, USA) (En,Ja)'],
 ['sonic-2','Genesis','sega','Sonic The Hedgehog 2 (World)'],
 ['bubble-bobble','Arcade','arcade','bublbobl'],
 ['gunstar-heroes','Genesis','sega','Gunstar Heroes (USA)'],
 ['metroid','NES','nintendo-consoles','Metroid (USA)'],
 ['super-turrican','SNES','nintendo-consoles','Super Turrican (USA)'],
 ['turrican-collection','SNES','nintendo-consoles','Super Turrican Collection (USA) (Strictly Limited Games)'],
];
const cache = new Map();
async function get(url) { const r=await fetch(url); if(!r.ok) throw new Error(`${r.status}: ${url}`); return r; }
function rows(text) {return text.split(/\r?\n/).filter(l=>l && !l.startsWith('#')).map(l=>l.split('\t'));}
const provenance=[];
for (const [id,system,group,key] of requests) {
 const base=`https://raw.githubusercontent.com/chipster6502/artworkdb-${group}/media-box2d/docs/${system}/Artwork/`;
 if(!cache.has(system)) cache.set(system, await Promise.all(['gameinfo.tsv','synopsis_en.tsv'].map(async n=>rows(await (await get(base+n)).text()))));
 const [info,synopsis]=cache.get(system);
 const row=info.find(r=>r[0]===key);
 if(!row) throw new Error(`Missing metadata: ${key}`);
 const source=base+encodeURIComponent(key)+'.jpg';
 const sceneSource=`https://raw.githubusercontent.com/chipster6502/artworkdb-${group}/media-mixrbv2/docs/${system}/Artwork/${encodeURIComponent(key)}.jpg`;
 let hasArt=true,hasScene=true;
 try {await fs.writeFile(new URL(id+'.jpg',coverOut),Buffer.from(await (await get(source)).arrayBuffer()));} catch(e) {hasArt=false; console.log(`No cover for ${id}: ${e.message}`);}
 try {await fs.writeFile(new URL(id+'.jpg',sceneOut),Buffer.from(await (await get(sceneSource)).arrayBuffer()));} catch(e) {hasScene=false; console.log(`No scene for ${id}: ${e.message}`);}
 provenance.push({id,system,key,name:row[1],year:row[2],genre:row[3],developer:row[4],players:row[5],synopsis:synopsis.find(r=>r[0]===key)?.[1]||'',source,sceneSource,hasArt,hasScene});
 console.log(`${id}: ${hasArt?'cover':'no cover'} · ${hasScene?'scene':'no scene'} · metadata`);
}
await fs.writeFile(new URL('../src/data/pack-samples.json',import.meta.url),JSON.stringify(provenance,null,2));
