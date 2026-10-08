import type {Category,Game} from '../data/library';
import {groupGenericArcadeGames} from './arcadeCores';
import {isVisibleRemoteMedia} from './remoteMedia';
import {parseRating,parseYear} from './gamelist';

type RemoteSystem={id:string;name:string;category?:string};
export type RemoteGame={mediaId?:number;name:string;path:string;zapScript?:string;hasCover?:boolean;isMissing?:boolean|number;missing?:boolean|number;tags?:{type:string;tag:string}[];system:RemoteSystem};
type SearchResult={results?:RemoteGame[];pagination?:{hasNextPage?:boolean;nextCursor?:string}};
type RpcResponse<T>={id?:string|number;result?:T;error?:{message?:string}}; type RemoteMetadata={tags?:{type:string;tag:string}[];title?:{tags?:{type:string;tag:string}[];properties?:Record<string,{text?:string}>};properties?:Record<string,{text?:string}>};
export type MiSTerSystem={id:string;name:string;category?:string;mediaCount?:number};
export type LibraryMaintenanceProgress={stage:'indexing'|'metadata'|'reading';message:string;current?:number;total?:number};

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
const pause=(milliseconds:number)=>new Promise<void>(resolve=>setTimeout(resolve,milliseconds));
const maintenancePollIntervalMs=1000;

async function retryDuringReconnect<T>(operation:()=>Promise<T>,onRetry?:()=>void,maxAttempts=5,retryDelayMs=800):Promise<T>{
 let failure:unknown;
 for(let attempt=0;attempt<maxAttempts;attempt+=1){
  try{return await operation();}catch(error){
   failure=error;
   if(attempt===maxAttempts-1)break;
   onRetry?.();
   await pause(retryDelayMs);
  }
 }
 throw failure;
}

export async function readMiSTerSystems(url:string):Promise<MiSTerSystem[]>{
 const result=await rpc<MiSTerSystem[]|{systems?:MiSTerSystem[]}>(url,'systems',{all:true});
 const systems=Array.isArray(result)?result:result.systems??[];
 return systems.filter(system=>!!system.id&&!!system.name).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function checkMiSTer(url:string){
 const version=await rpc<{version?:string;platform?:string}>(url,'version',undefined,4000);
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
function regionForSystem(system:string,systemId:string|undefined,region?:string){return region?.trim()||((systemId?.toLowerCase()==='cd32'||system.toLowerCase()==='amiga cd32')?'Europe':undefined);}
export function yearFromTag(value?:string){const match=value?.match(/(?:18|19|20)\d{2}/);return match?Number(match[0]):null;}
export function displayGenre(value?:string){const raw=(value??'').trim();if(!raw)return 'Not listed';const special:Record<string,string>={'shootem-up-verticalshootem-up':"Shoot'em Up / Vertical/Shoot'em Up",'shootem-up-horizontalshootem-up':"Shoot'em Up / Horizontal/Shoot'em Up"};return special[raw.toLowerCase()]??raw.split('/').map(part=>part.split('-').map(word=>word?word[0].toUpperCase()+word.slice(1):word).join(' ')).join('/');}
export async function readMiSTerLibrary(url:string,onProgress?:(found:number)=>void,systemIds?:string[]):Promise<Game[]>{
 const found:RemoteGame[]=[];let cursor:string|undefined;
 do{const page=await retryDuringReconnect(()=>rpc<SearchResult>(url,'media.search',{query:'',maxResults:1000,...(systemIds?.length?{systems:systemIds}:{}),...(cursor?{cursor}:{})}));found.push(...(page.results??[]));onProgress?.(found.length);cursor=page.pagination?.hasNextPage?page.pagination.nextCursor:undefined;}while(cursor);
 const unique=new Map<string,{game:RemoteGame;record:Game}>();
 found.forEach(game=>{if(!isVisibleRemoteMedia(game))return;const tags=game.tags??[];const tag=(...types:string[])=>tags.find(item=>types.includes(item.type.toLowerCase().replace(/[\s_-]/g,'')))?.tag;const category=categoryFor(game.system?.category);const system=game.system?.name||'MiSTer';const record:Game={id:game.mediaId!==undefined?`mister-media-${game.mediaId}`:idFor(game.path),title:game.name,system,category,year:parseYear(tag('year','releasedate','date')),developer:tag('developer','publisher','manufacturer')??'Not listed',genre:displayGenre(tag('genre')),players:tag('players')??'Not listed',rating:parseRating(tag('rating')),region:regionForSystem(system,game.system?.id,tag('region')),description:'',remotePath:game.zapScript??'',remoteFilePath:game.path,remoteSystemId:game.system?.id,remoteMediaId:game.mediaId,remoteHasArtwork:game.hasCover};const key=`${game.system?.id??record.system}::${game.name.trim().toLocaleLowerCase()}`;const current=unique.get(key);const better=!current||(!current.game.hasCover&&!!game.hasCover)||(!current.game.path.includes('/media/usb')&&game.path.includes('/media/usb'));if(better)unique.set(key,{game,record});});
 const recordIds=new Set<string>();
 return groupGenericArcadeGames([...unique.values()].map(item=>item.record).filter(record=>!recordIds.has(record.id)&&!!recordIds.add(record.id))).sort((a,b)=>a.title.localeCompare(b.title));
}
export function metadataFromRemote(media:RemoteMetadata|undefined):Partial<Game>{
 const title=media?.title;
 // Zaparoo keeps some imported fields (notably CD32 rating and region) on the
 // media record, while title-wide fields such as developer live on the title.
 // Prefer the media value when both exist: it describes this exact file.
 const tags=[...(media?.tags??[]),...(title?.tags??[])];
 const tag=(...types:string[])=>tags.find(item=>types.includes(item.type.toLowerCase().replace(/[\s_-]/g,'')))?.tag;const description=title?.properties?.['property:description']?.text??media?.properties?.['property:description']?.text;const genre=tag('genre');
 return {year:parseYear(tag('year','releasedate','date')),developer:tag('developer','publisher','manufacturer')??undefined,genre:genre?displayGenre(genre):undefined,players:tag('players')??undefined,rating:parseRating(tag('rating')),region:tag('region')??undefined,description};
}
export async function readMiSTerMetadata(url:string,mediaId:number):Promise<Partial<Game>>{const result=await rpc<{media?:RemoteMetadata}>(url,'media.meta',{mediaId});return metadataFromRemote(result.media);}
export async function hydrateMiSTerMetadata(url:string,games:Game[],onProgress:(progress:LibraryMaintenanceProgress)=>void):Promise<Game[]>{
 const targets=games.filter(game=>typeof game.remoteMediaId==='number') as Array<Game&{remoteMediaId:number}>;
 if(!targets.length)return games;
 const metadataById=new Map<number,Partial<Game>>();
 for(let offset=0;offset<targets.length;offset+=100){
  const batch=targets.slice(offset,offset+100);
  onProgress({stage:'reading',message:'Saving full game details in Tapdeck…',current:offset,total:targets.length});
  const result=await retryDuringReconnect(
   ()=>rpc<{items?:Array<{media?:RemoteMetadata;error?:unknown}>}>(url,'media.meta',{items:batch.map(game=>({mediaId:game.remoteMediaId}))},15000),
   ()=>onProgress({stage:'reading',message:'Waiting for Zaparoo to reconnect while reading game details…',current:offset,total:targets.length}),5,800,
  );
  for(let index=0;index<batch.length;index++){
   const media=result.items?.[index]?.media;
   if(media)metadataById.set(batch[index].remoteMediaId,metadataFromRemote(media));
  }
 }
 onProgress({stage:'reading',message:'Saving full game details in Tapdeck…',current:targets.length,total:targets.length});
 return games.map(game=>{const metadata=typeof game.remoteMediaId==='number'?metadataById.get(game.remoteMediaId):undefined;const merged=metadata?{...game,...Object.fromEntries(Object.entries(metadata).filter(([,value])=>value!==undefined))}:game;return {...merged,region:regionForSystem(merged.system,merged.remoteSystemId,merged.region)};});
}
export async function readMiSTerLibraryWithMetadata(url:string,onProgress?:(progress:LibraryMaintenanceProgress)=>void,systemIds?:string[]):Promise<Game[]>{
 const library=await readMiSTerLibrary(url,found=>onProgress?.({stage:'reading',message:'Reading your library from Zaparoo…',current:found}),systemIds);
 return hydrateMiSTerMetadata(url,library,onProgress??(()=>{}));
}
type MediaStatus={database?:{indexing?:boolean;currentStep?:number;totalSteps?:number;currentStepDisplay?:string}};
type ScraperStatus={scraping?:boolean;done?:boolean;state?:'idle'|'running'|'paused'|'completed'|'cancelled'|'failed';error?:string;processed?:number;total?:number;currentStepDisplay?:string;currentSystem?:string};

async function waitForIndexing(url:string,onProgress:(progress:LibraryMaintenanceProgress)=>void){
 await pause(350);
 let sawIndexing=false;
 for(let attempt=0;attempt<720;attempt+=1){
  const status=await retryDuringReconnect(()=>rpc<MediaStatus>(url,'media',undefined,4000),()=>onProgress({stage:'indexing',message:'Waiting for Zaparoo to reconnect…'}),20,1000);
  const database=status.database;
  if(database?.indexing){
   sawIndexing=true;
   onProgress({stage:'indexing',message:database.currentStepDisplay??'Updating the MiSTer media database…',current:database.currentStep,total:database.totalSteps});
  // media.generate returns before Zaparoo necessarily exposes its indexing
  // state. Give the worker a few seconds to start before treating an idle
  // status as a completed scan; otherwise a Full Refresh can read yesterday's
  // catalogue and miss newly added games.
  }else if(sawIndexing||attempt>=6)return;
  else onProgress({stage:'indexing',message:'Waiting for Zaparoo to begin updating its media database…'});
  await pause(maintenancePollIntervalMs);
 }
 throw new Error('Updating the MiSTer media database took too long.');
}

async function waitForScraper(url:string,scraperId:string,label:string,onProgress:(progress:LibraryMaintenanceProgress)=>void){
 await pause(350);let sawWork=false;
 for(let attempt=0;attempt<720;attempt+=1){
  const status=await retryDuringReconnect(()=>rpc<ScraperStatus>(url,'media.scrape.status',{scraperId},4000),()=>onProgress({stage:'metadata',message:'Waiting for Zaparoo to reconnect…'}),20,1000);
  if(status.state==='failed')throw new Error(status.error??(label+' failed.'));
  if(status.state==='cancelled')throw new Error(label+' was cancelled.');
  if(status.scraping||status.state==='running'){sawWork=true;onProgress({stage:'metadata',message:status.currentStepDisplay??(status.currentSystem?`Scraping ${status.currentSystem}…`:(label+'…')),current:status.processed,total:status.total});}
  else if(sawWork||status.done||status.state==='completed')return;
  await pause(maintenancePollIntervalMs);
 }
 throw new Error(label+' took too long.');
}

export async function refreshMiSTerLibraryAndMetadata(url:string,systemIds:string[],onProgress:(progress:LibraryMaintenanceProgress)=>void):Promise<Game[]>{
 const systems=systemIds.length?systemIds:undefined;
 onProgress({stage:'indexing',message:'Starting the MiSTer media database update…'});
 await rpc(url,'media.generate',systems?{systems}:undefined,15000);
 await waitForIndexing(url,onProgress);
 const scrapers=await rpc<{id:string}[]|{scrapers?:{id:string}[]}>(url,'scrapers');
 const availableScrapers=Array.isArray(scrapers)?scrapers:scrapers.scrapers??[];
 if(availableScrapers.some(scraper=>scraper.id==='gamelist.xml')){
  onProgress({stage:'metadata',message:'Importing local gamelist.xml metadata…'});
  await rpc(url,'media.scrape',{scraperId:'gamelist.xml',...(systems?{systems}:{})},15000);
  await waitForScraper(url,'gamelist.xml','Importing local gamelist.xml metadata',onProgress);
 }
 if(!availableScrapers.some(scraper=>scraper.id==='mister-docs'))throw new Error('MiSTer Docs metadata is not installed in Zaparoo.');
 onProgress({stage:'metadata',message:'Starting the MiSTer Docs metadata refresh…'});
 await rpc(url,'media.scrape',{scraperId:'mister-docs',...(systems?{systems}:{})},15000);
 await waitForScraper(url,'mister-docs','Refreshing MiSTer Docs metadata',onProgress);
 onProgress({stage:'reading',message:'Reading the refreshed library in Tapdeck…'});
 const library=await readMiSTerLibrary(url,found=>onProgress({stage:'reading',message:'Reading the refreshed library in Tapdeck…',current:found}));
 return hydrateMiSTerMetadata(url,library,onProgress);
}



export async function importMiSTerGamelistMetadata(url:string,systemIds:string[],onProgress:(progress:LibraryMaintenanceProgress)=>void):Promise<void>{
 const systems=systemIds.length?systemIds:undefined;
 const scrapers=await rpc<{id:string}[]|{scrapers?:{id:string}[]}>(url,'scrapers');
 const available=Array.isArray(scrapers)?scrapers:scrapers.scrapers??[];
 if(!available.some(scraper=>scraper.id==='gamelist.xml'))throw new Error('The gamelist.xml importer is not installed in Zaparoo.');
 onProgress({stage:'metadata',message:'Importing the updated gamelist.xml…'});
 await rpc(url,'media.scrape',{scraperId:'gamelist.xml',...(systems?{systems}:{})},15000);
 await waitForScraper(url,'gamelist.xml','Importing the updated gamelist.xml',onProgress);
}
