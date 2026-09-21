import * as FileSystem from 'expo-file-system/legacy';
import type {ImageSourcePropType} from 'react-native';
import type {Game} from '../data/library';
import {parseArtworkDirectory,artworkCacheFilename,libretroArtworkIdentity,libretroArtworkUrl,libretroSnapArtworkIdentity,libretroSystemsFor,matchLibretroFilename,type LibretroArtworkKind} from './libretroNaming';
export {libretroArtworkIdentity,libretroSnapArtworkIdentity,libretroSystemsFor} from './libretroNaming';
const indexes=new Map<string,string[]>(); const indexPending=new Map<string,Promise<string[]>>(); const ROOT='https://thumbnails.libretro.com';
const webArtworkCache=new Map<string,string>();
// Share cache reads and downloads between list rows, cards, and Discover so the
// same game never starts duplicate filesystem checks, indexing, or downloads.
const artworkPending=new Map<string,Promise<ImageSourcePropType|undefined>>();
const downloadLimit=3;let activeDownloads=0;const downloadQueue:Array<{job:()=>Promise<any>;resolve:(value:any)=>void;reject:(error:unknown)=>void}>=[];
function pumpDownloads(){while(activeDownloads<downloadLimit&&downloadQueue.length){const next=downloadQueue.shift()!;activeDownloads+=1;next.job().then(next.resolve,next.reject).finally(()=>{activeDownloads-=1;pumpDownloads();});}}
function queueDownload<T>(job:()=>Promise<T>):Promise<T>{return new Promise<T>((resolve,reject)=>{downloadQueue.push({job,resolve,reject});pumpDownloads();});}
const artworkListeners=new Set<(id:string)=>void>();
export function subscribeToArtwork(listener:(id:string)=>void){artworkListeners.add(listener);return()=>{artworkListeners.delete(listener);};}
function announceArtwork(id:string){for(const listener of artworkListeners)listener(id);}
async function index(dir:string,kind:LibretroArtworkKind){const k=`${dir}:${kind}`;if(indexes.has(k))return indexes.get(k)!;const pending=indexPending.get(k);if(pending)return pending;const request=(async()=>{const response=await fetch(`${ROOT}/${encodeURIComponent(dir)}/${kind}/`);if(!response.ok)throw new Error(`Libretro index ${response.status}`);const html=await response.text();const names=parseArtworkDirectory(html);if(!names.length)throw new Error("Empty artwork directory: "+dir+"/"+kind);indexes.set(k,names);return names;})();indexPending.set(k,request);try{return await request;}finally{indexPending.delete(k);}}
function localUri(id:string){return FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-libretro/${artworkCacheFilename(id)}`:undefined;}
async function cachedLocalSource(id:string):Promise<ImageSourcePropType|undefined>{
 const remembered=webArtworkCache.get(id);if(remembered)return {uri:remembered};
 const target=localUri(id);if(!target)return undefined;
 try{if((await FileSystem.getInfoAsync(target)).exists){webArtworkCache.set(id,target);return {uri:target};}}catch{}
 return undefined;
}
async function read(game:Game,kind:LibretroArtworkKind,id:string){
 const existing=artworkPending.get(id);if(existing)return existing;
 const request=(async()=>{const cached=await cachedLocalSource(id);if(cached)return cached;
 const config=libretroSystemsFor(game);if(!config)return;const target=localUri(id);for(const dir of config.directories){try{const filename=matchLibretroFilename(game,await index(dir,kind));if(!filename)continue;const url=libretroArtworkUrl(dir,kind,filename);if(!target){webArtworkCache.set(id,url);announceArtwork(id);return {uri:url};}await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory+'tapdeck-libretro/',{intermediates:true}).catch(()=>{});const result=await queueDownload(()=>FileSystem.downloadAsync(url,target));if(result.status===200){
    webArtworkCache.set(id,target);announceArtwork(id);
    return {uri:target};
   }else{throw new Error("Download HTTP "+result.status);}}catch(error){console.warn("[Artwork] "+game.title+" | "+dir+"/"+kind,String(error));}}})();
 artworkPending.set(id,request);try{return await request;}finally{artworkPending.delete(id);}
}
async function validCachedSource(id:string){return cachedLocalSource(id);}
export const readCachedLibretroThumbnail=(game:Game)=>validCachedSource(libretroArtworkIdentity(game));
export const readLibretroThumbnail=(game:Game)=>read(game,'Named_Boxarts',libretroArtworkIdentity(game));
export const readCachedLibretroSnap=(game:Game)=>validCachedSource(libretroSnapArtworkIdentity(game));
export const readLibretroSnap=(game:Game)=>read(game,'Named_Snaps',libretroSnapArtworkIdentity(game));
export async function warmLibretroThumbnails(records:Game[],progress?:(done:number,total:number)=>void){let done=0;for(const game of records){const box=await readCachedLibretroThumbnail(game);const snap=await readCachedLibretroSnap(game);if(!box&&!snap){const downloadedBox=await readLibretroThumbnail(game).catch(()=>undefined);if(!downloadedBox)await readLibretroSnap(game).catch(()=>undefined);}progress?.(++done,records.length);}}
export type BatchArtworkResult={checked:number;available:number;unmatched:number};
export async function batchDownloadLibretro(records:Game[],systems:string[],progress?:(done:number,total:number)=>void):Promise<BatchArtworkResult>{
 const items=records.filter(game=>systems.includes(game.system));
 let cursor=0;let done=0;let available=0;let unmatched=0;
 const worker=async()=>{while(true){const game=items[cursor++];if(!game)return;
   const [box,snap]=await Promise.all([readLibretroThumbnail(game).catch(()=>undefined),readLibretroSnap(game).catch(()=>undefined)]);
   if(box||snap)available+=1;else unmatched+=1;
   done+=1;progress?.(done,items.length);
 }};
 await Promise.all(Array.from({length:8},worker));
 return {checked:items.length,available,unmatched};
}
export async function getLibretroArtworkStats():Promise<{count:number;bytes:number}>{
 if(!FileSystem.documentDirectory)return {count:0,bytes:0};
 const root=`${FileSystem.documentDirectory}tapdeck-libretro/`;
 try{const entries=await FileSystem.readDirectoryAsync(root);let bytes=0;for(const name of entries){const info=await FileSystem.getInfoAsync(`${root}${name}`);bytes+=Number((info as {size?:number}).size??0);}return {count:entries.length,bytes};}catch{return {count:0,bytes:0};}
}
