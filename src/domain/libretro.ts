import * as FileSystem from 'expo-file-system/legacy';
import type {ImageSourcePropType} from 'react-native';
import type {Game} from '../data/library';
import {parseArtworkDirectoryInChunks,artworkCacheFilename,legacyLibretroArtworkIdentity,libretroArtworkIdentity,libretroArtworkUrl,libretroSnapArtworkIdentity,libretroTitleArtworkIdentity,libretroSystemsFor,matchLibretroFilenameInChunks,type LibretroArtworkKind} from './libretroNaming';
export {libretroArtworkIdentity,libretroSnapArtworkIdentity,libretroTitleArtworkIdentity,libretroSystemsFor} from './libretroNaming';
const indexes=new Map<string,string[]>(); const indexPending=new Map<string,Promise<string[]>>(); const ROOT='https://thumbnails.libretro.com';
const INDEX_TIMEOUT_MS=12000;const DOWNLOAD_TIMEOUT_MS=25000;
const webArtworkCache=new Map<string,string>();
// Share cache reads and downloads between list rows, cards, and Discover so the
// same game never starts duplicate filesystem checks, indexing, or downloads.
const artworkPending=new Map<string,Promise<ImageSourcePropType|undefined>>();
const downloadLimit=3;let activeDownloads=0;const downloadQueue:Array<{job:()=>Promise<any>;resolve:(value:any)=>void;reject:(error:unknown)=>void}>=[];
const activeDownloadTasks=new Set<FileSystem.DownloadResumable>();
function pumpDownloads(){while(activeDownloads<downloadLimit&&downloadQueue.length){const next=downloadQueue.shift()!;activeDownloads+=1;next.job().then(next.resolve,next.reject).finally(()=>{activeDownloads-=1;pumpDownloads();});}}
function queueDownload<T>(job:()=>Promise<T>):Promise<T>{return new Promise<T>((resolve,reject)=>{downloadQueue.push({job,resolve,reject});pumpDownloads();});}
// Matching parses directories and compares filenames; pace it to keep taps responsive.
const artworkWorkLimit=2;let activeArtworkWork=0;const artworkWorkQueue:Array<{job:()=>Promise<any>;resolve:(value:any)=>void;reject:(error:unknown)=>void}>=[];
function pumpArtworkWork(){while(activeArtworkWork<artworkWorkLimit&&artworkWorkQueue.length){const next=artworkWorkQueue.shift()!;activeArtworkWork+=1;next.job().then(next.resolve,next.reject).finally(()=>{activeArtworkWork-=1;pumpArtworkWork();});}}
function queueArtworkWork<T>(job:()=>Promise<T>,urgent=false):Promise<T>{return new Promise<T>((resolve,reject)=>{artworkWorkQueue[urgent?'unshift':'push']({job,resolve,reject});pumpArtworkWork();});}
const artworkListeners=new Set<(id:string)=>void>();
export function subscribeToArtwork(listener:(id:string)=>void){artworkListeners.add(listener);return()=>{artworkListeners.delete(listener);};}
function announceArtwork(id:string){for(const listener of artworkListeners)listener(id);}
// These collections dominate first-look artwork time. Their filename indexes are
// shipped with Tapdeck, so matching starts immediately even on a fresh install.
// Artwork files themselves remain on-demand downloads in the device cache.
function bundledIndex(dir:string,kind:LibretroArtworkKind):string[]|undefined{
 const key=`${dir}:${kind}`;
 switch(key){
  case 'MAME:Named_Boxarts':return require('../data/artwork-indexes/mame-boxarts').default as string[];
  case 'MAME:Named_Snaps':return require('../data/artwork-indexes/mame-snaps').default as string[];
  case 'FBNeo - Arcade Games:Named_Boxarts':return require('../data/artwork-indexes/fbneo-boxarts').default as string[];
  case 'FBNeo - Arcade Games:Named_Snaps':return require('../data/artwork-indexes/fbneo-snaps').default as string[];
  case 'Commodore - 64:Named_Boxarts':return require('../data/artwork-indexes/c64-boxarts').default as string[];
  case 'Commodore - 64:Named_Snaps':return require('../data/artwork-indexes/c64-snaps').default as string[];
  case 'Sinclair - ZX Spectrum:Named_Boxarts':return require('../data/artwork-indexes/spectrum-boxarts').default as string[];
  case 'Sinclair - ZX Spectrum:Named_Snaps':return require('../data/artwork-indexes/spectrum-snaps').default as string[];
 }
}
async function index(dir:string,kind:LibretroArtworkKind){const k=`${dir}:${kind}`;if(indexes.has(k))return indexes.get(k)!;const bundled=bundledIndex(dir,kind);if(bundled?.length){indexes.set(k,bundled);return bundled;}const pending=indexPending.get(k);if(pending)return pending;const request=(async()=>{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),INDEX_TIMEOUT_MS);try{const response=await fetch(`${ROOT}/${encodeURIComponent(dir)}/${kind}/`,{signal:controller.signal});if(!response.ok)throw new Error(`Libretro index ${response.status}`);const html=await response.text();const names=await parseArtworkDirectoryInChunks(html);if(!names.length)throw new Error("Empty artwork directory: "+dir+"/"+kind);indexes.set(k,names);return names;}finally{clearTimeout(timeout);}})();indexPending.set(k,request);try{return await request;}finally{indexPending.delete(k);}}
async function downloadArtwork(url:string,target:string,shouldCancel?:()=>boolean){
 if(shouldCancel?.())return;
 const task=FileSystem.createDownloadResumable(url,target);activeDownloadTasks.add(task);
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([task.downloadAsync(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{void task.cancelAsync().catch(()=>{});reject(new Error('Libretro artwork download timed out'));},DOWNLOAD_TIMEOUT_MS);})]);}
 finally{if(timeout)clearTimeout(timeout);activeDownloadTasks.delete(task);}
}
// Cancelling a batch stops transfers already under way as well as queued work.
export async function cancelActiveLibretroArtworkDownloads(){await Promise.all([...activeDownloadTasks].map(task=>task.cancelAsync().catch(()=>{})));}
function localUri(id:string){return FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-libretro/${artworkCacheFilename(id)}`:undefined;}
async function cachedLocalSource(id:string):Promise<ImageSourcePropType|undefined>{
 const remembered=webArtworkCache.get(id);if(remembered)return {uri:remembered};
 const target=localUri(id);if(!target)return undefined;
 try{if((await FileSystem.getInfoAsync(target)).exists){webArtworkCache.set(id,target);return {uri:target};}}catch{}
 return undefined;
}
async function read(game:Game,kind:LibretroArtworkKind,id:string,shouldCancel?:()=>boolean,urgent=false){
 if(shouldCancel?.())return;
 const existing=artworkPending.get(id);if(existing)return existing;
 const request=(async()=>{const cached=await cachedLocalSource(id);if(cached)return cached;
 if(shouldCancel?.())return;const config=libretroSystemsFor(game);if(!config)return;return queueArtworkWork(async()=>{if(shouldCancel?.())return;const target=localUri(id);for(const dir of config.directories){try{if(shouldCancel?.())return;const filename=await matchLibretroFilenameInChunks(game,await index(dir,kind));if(!filename)continue;const url=libretroArtworkUrl(dir,kind,filename);if(!target){webArtworkCache.set(id,url);announceArtwork(id);return {uri:url};}await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory+'tapdeck-libretro/',{intermediates:true}).catch(()=>{});const result=await queueDownload(()=>downloadArtwork(url,target,shouldCancel));if(result?.status===200){
    webArtworkCache.set(id,target);announceArtwork(id);
    return {uri:target};
    }else{throw new Error(result?"Download HTTP "+result.status:'Artwork download cancelled');}}catch(error){if(shouldCancel?.())return;console.warn("[Artwork] "+game.title+" | "+dir+"/"+kind,String(error));}}},urgent);})();
 artworkPending.set(id,request);try{return await request;}finally{artworkPending.delete(id);}
}
async function validCachedSource(...ids:string[]){for(const id of ids){const source=await cachedLocalSource(id);if(source)return source;}}
function legacySnapIdentity(game:Game){return `${legacyLibretroArtworkIdentity(game)}::snap-v2`;}
// Cache filenames are deterministic. Supplying this URI on the first render
// lets React Native begin decoding a downloaded image before the async cache
// check finishes, avoiding a genre-art flash in recycled card cells.
export function optimisticLibretroArtworkSource(game:Game,preferSnap=false):ImageSourcePropType|undefined{
 const id=preferSnap?libretroSnapArtworkIdentity(game):libretroArtworkIdentity(game);
 const target=localUri(id);return target?{uri:target}:undefined;
}
export const readCachedLibretroThumbnail=(game:Game)=>validCachedSource(libretroArtworkIdentity(game),legacyLibretroArtworkIdentity(game));
export const readLibretroThumbnail=(game:Game,urgent=false,shouldCancel?:()=>boolean)=>read(game,'Named_Boxarts',libretroArtworkIdentity(game),shouldCancel,urgent);
export const readCachedLibretroSnap=(game:Game)=>validCachedSource(libretroSnapArtworkIdentity(game),legacySnapIdentity(game));
export async function hasCachedLibretroArtwork(game:Game):Promise<boolean>{
 const [boxart,snap]=await Promise.all([readCachedLibretroThumbnail(game),readCachedLibretroSnap(game)]);
 return !!(boxart||snap||game.image);
}
export const readLibretroSnap=(game:Game,urgent=false,shouldCancel?:()=>boolean)=>read(game,'Named_Snaps',libretroSnapArtworkIdentity(game),shouldCancel,urgent);
export const readCachedLibretroTitle=(game:Game)=>validCachedSource(libretroTitleArtworkIdentity(game));
export const readLibretroTitle=(game:Game)=>read(game,'Named_Titles',libretroTitleArtworkIdentity(game));
// The library list owns visible-artwork scheduling. This keeps downloads tied to
// items the user can currently see instead of relying on recycled cell effects.
export async function ensureVisibleLibretroArtwork(game:Game,shouldCancel?:()=>boolean,urgent=false):Promise<ImageSourcePropType|undefined>{
 const [cachedBox,cachedSnap]=await Promise.all([readCachedLibretroThumbnail(game),readCachedLibretroSnap(game)]);
 if(cachedBox||cachedSnap)return cachedBox??cachedSnap;
 // Visible lists call this in screen order. Keep it on the normal FIFO queue so
 // the artwork nearest the top of the screen takes the next available slot.
 // `urgent` is reserved for an explicit card open, which should still jump ahead.
 return (await readLibretroThumbnail(game,urgent,shouldCancel))??readLibretroSnap(game,urgent,shouldCancel);
}
export async function warmLibretroThumbnails(records:Game[],progress?:(done:number,total:number)=>void){let done=0;for(const game of records){const box=await readCachedLibretroThumbnail(game);const snap=await readCachedLibretroSnap(game);if(!box&&!snap){const downloadedBox=await readLibretroThumbnail(game).catch(()=>undefined);if(!downloadedBox)await readLibretroSnap(game).catch(()=>undefined);}progress?.(++done,records.length);}}
export type BatchArtworkResult={checked:number;available:number;unmatched:number};
export type BatchArtworkControl={isCancelled:()=>boolean};
export type SystemArtworkCacheStatus={total:number;boxarts:number;snaps:number;complete:number};
export async function getLibretroArtworkSystemStatus(records:Game[]):Promise<Record<string,SystemArtworkCacheStatus>>{
 const entries=new Set<string>();const root=FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-libretro/`:undefined;
 if(root)try{(await FileSystem.readDirectoryAsync(root)).forEach(entry=>entries.add(entry));}catch{}
 const has=(id:string)=>entries.has(artworkCacheFilename(id));const result:Record<string,SystemArtworkCacheStatus>={};
 for(const game of records){const status=result[game.system]??{total:0,boxarts:0,snaps:0,complete:0};status.total+=1;const box=has(libretroArtworkIdentity(game))||has(legacyLibretroArtworkIdentity(game));const snap=has(libretroSnapArtworkIdentity(game))||has(legacySnapIdentity(game));if(box)status.boxarts+=1;if(snap)status.snaps+=1;if(box&&snap)status.complete+=1;result[game.system]=status;}
 return result;
}
export async function batchDownloadLibretro(records:Game[],systems:string[],progress?:(done:number,total:number)=>void,control?:BatchArtworkControl):Promise<BatchArtworkResult&{cancelled:boolean;skipped:number}>{
 const items=records.filter(game=>systems.includes(game.system));
 let cursor=0;let done=0;let available=0;let unmatched=0;let skipped=0;
 const worker=async()=>{while(!control?.isCancelled()){const game=items[cursor++];if(!game)return;
   const [cachedBox,cachedSnap]=await Promise.all([readCachedLibretroThumbnail(game),readCachedLibretroSnap(game)]);if(cachedBox&&cachedSnap){skipped+=1;available+=1;done+=1;progress?.(done,items.length);continue;}
   if(control?.isCancelled())return;const [box,snap]=await Promise.all([cachedBox??read(game,'Named_Boxarts',libretroArtworkIdentity(game),control?.isCancelled).catch(()=>undefined),cachedSnap??read(game,'Named_Snaps',libretroSnapArtworkIdentity(game),control?.isCancelled).catch(()=>undefined)]);
   if(control?.isCancelled())return;
   if(box||snap)available+=1;else unmatched+=1;
   done+=1;progress?.(done,items.length);
 }};
 await Promise.all(Array.from({length:8},worker));
 return {checked:done,available,unmatched,cancelled:!!control?.isCancelled(),skipped};
}
export async function getLibretroArtworkStats():Promise<{count:number;bytes:number}>{
 if(!FileSystem.documentDirectory)return {count:0,bytes:0};
 const root=`${FileSystem.documentDirectory}tapdeck-libretro/`;
 try{const entries=await FileSystem.readDirectoryAsync(root);let bytes=0;for(const name of entries){const info=await FileSystem.getInfoAsync(`${root}${name}`);bytes+=Number((info as {size?:number}).size??0);}return {count:entries.length,bytes};}catch{return {count:0,bytes:0};}
}
export async function clearLibretroArtworkCache():Promise<void>{
 webArtworkCache.clear();
 artworkPending.clear();
 if(!FileSystem.documentDirectory)return;
 await FileSystem.deleteAsync(`${FileSystem.documentDirectory}tapdeck-libretro/`,{idempotent:true});
}
export async function clearLibretroArtworkForGames(records:Game[]):Promise<void>{
 const ids=new Set<string>();
 for(const game of records){
  ids.add(libretroArtworkIdentity(game));ids.add(legacyLibretroArtworkIdentity(game));
  ids.add(libretroSnapArtworkIdentity(game));ids.add(legacySnapIdentity(game));
  ids.add(libretroTitleArtworkIdentity(game));
 }
 for(const id of ids){
  webArtworkCache.delete(id);artworkPending.delete(id);
  const target=localUri(id);if(target)await FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});
 }
}
