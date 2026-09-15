import type {Category,Game} from '../data/library';
import type {ImageSourcePropType} from 'react-native';
import {loadCachedArtwork,saveCachedArtwork} from './misterCache';

type RemoteSystem={id:string;name:string;category?:string};
type RemoteGame={mediaId?:number;name:string;path:string;zapScript:string;hasCover?:boolean;tags?:{type:string;tag:string}[];system:RemoteSystem};
type SearchResult={results?:RemoteGame[];pagination?:{hasNextPage?:boolean;nextCursor?:string}};
type RpcResponse<T>={id?:string|number;result?:T;error?:{message?:string}};

export function normaliseMiSTerUrl(value:string){
 const raw=value.trim().replace(/\/+$/,'');
 if(!raw)throw new Error('Enter your MiSTer address.');
 const candidate=/^https?:\/\//i.test(raw)?raw:`http://${raw}`;
 const parsed=new URL(candidate);
 if(!parsed.hostname)throw new Error('Enter a valid MiSTer address.');
 return `${parsed.protocol}//${parsed.host}${parsed.port?'':':7497'}`;
}
function socketUrl(base:string){return base.replace(/^http:/i,'ws:').replace(/^https:/i,'wss:')+'/api/v0.1';}
function rpc<T>(base:string,method:string,params?:unknown,timeoutMs=9000):Promise<T>{
 return new Promise((resolve,reject)=>{
  let settled=false;let socket:WebSocket;
  const requestId=`tapdeck-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const finish=(error?:Error,value?:T)=>{if(settled)return;settled=true;clearTimeout(timeout);try{socket.close();}catch{}if(error)reject(error);else resolve(value as T);};
  const timeout=setTimeout(()=>finish(new Error('Zaparoo did not respond. Check that its service is running on your MiSTer.')),timeoutMs);
  try{socket=new WebSocket(socketUrl(base));}catch{clearTimeout(timeout);reject(new Error('Could not reach Zaparoo on your MiSTer.'));return;}
  socket.onopen=()=>socket.send(JSON.stringify({jsonrpc:'2.0',id:requestId,method,...(params===undefined?{}:{params})}));
  socket.onmessage=event=>{try{const response=JSON.parse(String(event.data)) as RpcResponse<T>;if(response.id!==requestId)return;if(response.error)finish(new Error(response.error.message??'Zaparoo could not complete that request.'));else finish(undefined,response.result);}catch{finish(new Error('Zaparoo returned an unreadable response.'));}};
  socket.onerror=(event:Event)=>{const message=(event as Event&{message?:string}).message;finish(new Error(message?`Could not reach Zaparoo: ${message}`:'Could not reach Zaparoo on your MiSTer.'));};
  socket.onclose=(event:CloseEvent)=>{if(!settled)finish(new Error(`Zaparoo closed the connection (${event.code}).`));};
 });
}
export async function checkMiSTer(url:string){
 const version=await rpc<{version?:string;platform?:string}>(url,'version');
 if(!version?.version)throw new Error('Zaparoo did not identify itself.');
 return version;
}
function categoryFor(category?:string):Exclude<Category,'All'>{
 const value=(category??'').toLowerCase();
 if(value.includes('arcade'))return 'Arcade';
 if(value.includes('computer'))return 'Computers';
 return 'Consoles';
}
function idFor(path:string){return `mister-${path.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;}
export async function readMiSTerLibrary(url:string,onProgress?:(found:number)=>void):Promise<Game[]>{
 const found:RemoteGame[]=[];let cursor:string|undefined;
 do{const page=await rpc<SearchResult>(url,'media.search',{query:'',maxResults:1000,...(cursor?{cursor}:{})});found.push(...(page.results??[]));onProgress?.(found.length);cursor=page.pagination?.hasNextPage?page.pagination.nextCursor:undefined;}while(cursor);
 const unique=new Map<string,{game:RemoteGame;record:Game}>();
 found.forEach(game=>{if(!game.path||!game.name||!game.zapScript)return;const tags=game.tags??[];const tag=(...types:string[])=>tags.find(item=>types.includes(item.type.toLowerCase()))?.tag;const record:Game={id:game.mediaId!==undefined?`mister-media-${game.mediaId}`:idFor(game.path),title:game.name,system:game.system?.name||'MiSTer',category:categoryFor(game.system?.category),year:Number(tag('year','releasedate'))||null,developer:tag('developer','publisher','manufacturer')??'Not listed',genre:tag('genre','gamegenre')??'Not listed',players:tag('players')??'Not listed',description:`Found on your MiSTer in ${game.system?.name||'your collection'}.`,remotePath:game.zapScript,remoteMediaId:game.mediaId,remoteHasArtwork:game.hasCover};const key=`${game.system?.id??record.system}::${game.name.trim().toLocaleLowerCase()}`;const current=unique.get(key);const better=!current||(!current.game.hasCover&&!!game.hasCover)||(!current.game.path.includes('/media/usb')&&game.path.includes('/media/usb'));if(better)unique.set(key,{game,record});});
 const recordIds=new Set<string>();
 return [...unique.values()].map(item=>item.record).filter(record=>!recordIds.has(record.id)&&!!recordIds.add(record.id)).sort((a,b)=>a.title.localeCompare(b.title));
}
export async function launchMiSTerGame(url:string,zapScript:string){await rpc<null>(url,'run',{text:zapScript});}
const artworkCache=new Map<string,ImageSourcePropType|undefined>();
const pendingArtwork=new Map<string,Promise<ImageSourcePropType|undefined>>();
const artworkQueue:(()=>void)[]=[];
let activeArtworkRequests=0;
function queueArtwork<T>(work:()=>Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{const run=()=>{activeArtworkRequests+=1;void work().then(resolve,reject).finally(()=>{activeArtworkRequests-=1;artworkQueue.shift()?.();});};if(activeArtworkRequests<2)run();else artworkQueue.push(run);});}
export function readMiSTerArtwork(url:string,mediaId:number,imageTypes=['image','thumbnail','boxart','boxart3d','screenshot'],maxSize=768):Promise<ImageSourcePropType|undefined>{
 const key=`${url}|${mediaId}|${imageTypes.join(',')}|${maxSize}`;
 if(artworkCache.has(key))return Promise.resolve(artworkCache.get(key));
 const pending=pendingArtwork.get(key);if(pending)return pending;
 const request=queueArtwork(async()=>{const cached=await loadCachedArtwork(key);if(cached){const image={uri:cached};artworkCache.set(key,image);return image;}const result=await rpc<{data?:string;contentType?:string}>(url,'media.image',{mediaId,imageTypes,maxSize},20000);const image=result.data?{uri:`data:${result.contentType??'image/webp'};base64,${result.data}`} :undefined;if(image)void saveCachedArtwork(key,image.uri).catch(()=>{});artworkCache.set(key,image);return image;});

 pendingArtwork.set(key,request);void request.then(()=>pendingArtwork.delete(key),()=>pendingArtwork.delete(key));
 return request;
}
export async function readMiSTerMetadata(url:string,mediaId:number):Promise<Partial<Game>>{
 const result=await rpc<{media?:{title?:{tags?:{type:string;tag:string}[];properties?:Record<string,{text?:string}>};properties?:Record<string,{text?:string}>}}>(url,'media.meta',{mediaId});
 const title=result.media?.title;const tags=title?.tags??[];const tag=(...types:string[])=>tags.find(item=>types.includes(item.type.toLowerCase()))?.tag;const description=title?.properties?.['property:description']?.text??result.media?.properties?.['property:description']?.text;
 return {year:Number(tag('year','releasedate'))||null,developer:tag('developer','publisher','manufacturer')??undefined,genre:tag('genre','gamegenre')??undefined,players:tag('players')??undefined,description};
}

export function clearMiSTerArtworkMemoryCache(){artworkCache.clear();}
