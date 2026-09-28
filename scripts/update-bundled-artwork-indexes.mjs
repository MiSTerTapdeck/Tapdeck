import { mkdir, writeFile } from 'node:fs/promises';
const root='https://thumbnails.libretro.com';
const entries=[
 ['mame-boxarts','MAME','Named_Boxarts'],['mame-snaps','MAME','Named_Snaps'],
 ['fbneo-boxarts','FBNeo - Arcade Games','Named_Boxarts'],['fbneo-snaps','FBNeo - Arcade Games','Named_Snaps'],
 ['c64-boxarts','Commodore - 64','Named_Boxarts'],['c64-snaps','Commodore - 64','Named_Snaps'],
 ['spectrum-boxarts','Sinclair - ZX Spectrum','Named_Boxarts'],['spectrum-snaps','Sinclair - ZX Spectrum','Named_Snaps'],
];
await mkdir('src/data/artwork-indexes',{recursive:true});
for(const [id,dir,kind] of entries){
 const url=`${root}/${encodeURIComponent(dir)}/${kind}/`;
 const response=await fetch(url);
 if(!response.ok)throw new Error(`${response.status} ${url}`);
 const html=await response.text();
 const names=[]; for(const match of html.matchAll(/href=(["'])(.*?)\1/gi)){let name=match[2].replace(/&amp;/g,'&');try{name=decodeURIComponent(name)}catch{}if(/\.(png|jpe?g|webp)$/i.test(name)&&!name.includes('/'))names.push(name)}
 names.sort((a,b)=>a.localeCompare(b));
 await writeFile(`src/data/artwork-indexes/${id}.ts`,`// Generated from ${url}; update only when refreshing bundled Libretro indexes.\nconst names=${JSON.stringify(names)} as string[];\nexport default names;\n`);
 console.log(`${id}: ${names.length.toLocaleString()} names, ${html.length.toLocaleString()} source bytes`);
}
