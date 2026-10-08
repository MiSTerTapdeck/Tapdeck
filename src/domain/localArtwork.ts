import type {Game} from '../data/library';

export type LocalArtworkKind='boxart'|'snaps';
export type LocalArtworkEntry={id:string;folder:string;name:string;kind:LocalArtworkKind};
const normaliseFolder=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
const nameKey=(value:string)=>value.trim().toLowerCase();
const pathKey=(value:string)=>value.replace(/\\/g,'/').replace(/\/$/,'').toLowerCase();

// Build once per manifest, then use constant-time filename lookups while scrolling.
export function createLocalArtworkLookup(entries:LocalArtworkEntry[]){
 const exact=new Map<string,LocalArtworkEntry>();
 const systems=new Map<string,LocalArtworkEntry>();
 for(const entry of entries){
  const suffix=`|${entry.kind}|${nameKey(entry.name)}`;
  const key=pathKey(entry.folder)+suffix;
  if(!exact.has(key))exact.set(key,entry);
  const folder=normaliseFolder(entry.folder.replace(/\\/g,'/').split('/').pop()??'');
  if(!systems.has(folder+suffix))systems.set(folder+suffix,entry);
 }
 return (game:Game,kind:LocalArtworkKind):LocalArtworkEntry|undefined=>{
  const path=(game.remoteFilePath??'').replace(/\\/g,'/');
  const gameRoot=path.match(/^(\/media\/(?:fat|usb\d+)\/games\/[^/]+)\//i)?.[1];
  const filename=path.split('/').pop()?.replace(/\.[^.]+$/,'');
  const names=[...new Set([filename,game.title].filter((name):name is string=>!!name).map(nameKey))];
  const folders=[gameRoot?.split('/').pop(),game.remoteSystemId,game.system].filter((name):name is string=>!!name).map(normaliseFolder);
  if(folders.some(name=>['jaguar','jaguarcd','atarijaguar','atarijaguarcd'].includes(name)))folders.push('jaguar','jaguarcd');
  if(game.category==='Arcade')folders.push('arcade');
  if(folders.some(name=>['dos','pcdos','ao486'].includes(name)))folders.push('ao486');
  if(gameRoot)for(const name of names){const match=exact.get(pathKey(gameRoot)+`|${kind}|${name}`);if(match)return match;}
  for(const folder of new Set(folders))for(const name of names){const match=systems.get(folder+`|${kind}|${name}`);if(match)return match;}
 };
}

export function parseLocalArtworkManifest(value:unknown):LocalArtworkEntry[]{
 const entries=(value as {artwork?:unknown}|null)?.artwork;
 if(!Array.isArray(entries))return [];
 return entries.filter((entry):entry is LocalArtworkEntry=>!!entry&&typeof entry==='object'&&/^[a-f0-9]{64}$/.test(entry.id)&&typeof entry.folder==='string'&&typeof entry.name==='string'&&['boxart','snaps'].includes(entry.kind));
}

export function localArtworkBaseUrl(misterUrl:string){
 const url=new URL(misterUrl.includes('://')?misterUrl:`http://${misterUrl}`);
 return `http://${url.hostname}:8184`;
}
