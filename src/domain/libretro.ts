import * as FileSystem from 'expo-file-system/legacy';
import type {ImageSourcePropType} from 'react-native';
import type {Game} from '../data/library';
import {loadCachedArtwork,saveCachedArtwork} from './misterCache';
import {libretroArtworkIdentity,libretroArtworkUrl,libretroSnapArtworkIdentity,libretroSystemsFor,matchLibretroFilename,type LibretroArtworkKind} from './libretroNaming';
export {libretroArtworkIdentity,libretroSnapArtworkIdentity,libretroSystemsFor} from './libretroNaming';
const indexes=new Map<string,string[]>(); const ROOT='https://thumbnails.libretro.com';
const artworkListeners=new Set<()=>void>();
export function subscribeToArtwork(listener:()=>void){artworkListeners.add(listener);return()=>{artworkListeners.delete(listener);};}
function announceArtwork(){for(const listener of artworkListeners)listener();}
async function index(dir:string,kind:LibretroArtworkKind){const k=`${dir}:${kind}`;if(indexes.has(k))return indexes.get(k)!;const response=await fetch(`${ROOT}/${encodeURIComponent(dir)}/${kind}/`);if(!response.ok)throw new Error(`Libretro index ${response.status}`);const html=await response.text();const names=[...html.matchAll(/href="([^"]+\.(?:png|jpg|jpeg|webp))"/gi)].map(m=>decodeURIComponent(m[1])).filter(n=>!n.includes('/'));indexes.set(k,names);return names;}
function localUri(id:string){return FileSystem.documentDirectory?`${FileSystem.documentDirectory}tapdeck-libretro/${id.replace(/[^a-z0-9._-]+/gi,'_')}.png`:undefined;}
async function read(game:Game,kind:LibretroArtworkKind,id:string){const cached=await loadCachedArtwork(id).catch(()=>undefined);if(cached&&(await FileSystem.getInfoAsync(cached)).exists)return {uri:cached};const config=libretroSystemsFor(game);const target=localUri(id);if(!config||!target)return;for(const dir of config.directories){try{const filename=matchLibretroFilename(game,await index(dir,kind));if(!filename)continue;await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory+'tapdeck-libretro/',{intermediates:true}).catch(()=>{});const result=await FileSystem.downloadAsync(libretroArtworkUrl(dir,kind,filename),target);if(result.status===200){await saveCachedArtwork(id,target);announceArtwork();return {uri:target};}}catch{}}}
export const readCachedLibretroThumbnail=(game:Game)=>loadCachedArtwork(libretroArtworkIdentity(game)).then(uri=>uri?{uri}:undefined).catch(()=>undefined);
export const readLibretroThumbnail=(game:Game)=>read(game,'Named_Boxarts',libretroArtworkIdentity(game));
export const readCachedLibretroSnap=(game:Game)=>loadCachedArtwork(libretroSnapArtworkIdentity(game)).then(uri=>uri?{uri}:undefined).catch(()=>undefined);
export const readLibretroSnap=(game:Game)=>read(game,'Named_Snaps',libretroSnapArtworkIdentity(game));
export async function warmLibretroThumbnails(records:Game[],progress?:(done:number,total:number)=>void){let done=0;for(const game of records){const box=await readCachedLibretroThumbnail(game);const snap=await readCachedLibretroSnap(game);if(!box&&!snap){const downloadedBox=await readLibretroThumbnail(game).catch(()=>undefined);if(!downloadedBox)await readLibretroSnap(game).catch(()=>undefined);}progress?.(++done,records.length);}}
