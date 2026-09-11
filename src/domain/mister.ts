import type {Category,Game} from '../data/library';

export interface MiSTerConnection {url:string;}
type RemoteSystem={id:string;name:string;category?:string};
type RemoteGame={name:string;path:string;system:{id:string;name:string;category?:string}};

export function normaliseMiSTerUrl(value:string){
 const raw=value.trim().replace(/\/+$/,'');
 if(!raw) throw new Error('Enter your MiSTer address.');
 const candidate=/^https?:\/\//i.test(raw)?raw:`http://${raw}`;
 const parsed=new URL(candidate);
 if(!parsed.hostname)throw new Error('Enter a valid MiSTer address.');
 return `${parsed.protocol}//${parsed.host}${parsed.port?'':':8182'}`;
}
export function normaliseArtworkUrl(value:string){
 const raw=value.trim().replace(/\/+$/,'');
 if(!raw)return '';
 const candidate=/^https?:\/\//i.test(raw)?raw:`http://${raw}`;
 const parsed=new URL(candidate);
 if(!parsed.hostname)throw new Error('Enter a valid artwork bridge address.');
 return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/,'')}`;
}
async function request<T>(base:string,path:string,init?:RequestInit):Promise<T>{
 const response=await fetch(`${base}/api${path}`,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(init?.headers??{})}});
 if(!response.ok)throw new Error(response.status===404?'MiSTer Remote was not found.':'MiSTer did not respond.');
 return response.json() as Promise<T>;
}
export async function checkMiSTer(url:string){
 const systems=await request<RemoteSystem[]>(url,'/systems');
 return systems.filter(system=>system.id&&system.name);
}
function categoryFor(category?:string):Exclude<Category,'All'>{
 const value=(category??'').toLowerCase();
 if(value.includes('arcade'))return 'Arcade';
 if(value.includes('computer'))return 'Computers';
 return 'Consoles';
}
function idFor(path:string){return `mister-${path.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;}
export async function readMiSTerLibrary(url:string):Promise<Game[]>{
 const response=await request<RemoteGame[]|{games?:RemoteGame[];data?:RemoteGame[]}>(url,'/games/search',{method:'POST',body:JSON.stringify({query:'',system:'all'})});
 const remoteGames=Array.isArray(response)?response:response.games??response.data??[];
 const unique=new Map<string,Game>();
 remoteGames.forEach(game=>{if(game.path&&game.name)unique.set(game.path,{id:idFor(game.path),title:game.name,system:game.system?.name||'MiSTer',category:categoryFor(game.system?.category),year:null,developer:'From your MiSTer',genre:'Not listed',players:'Not listed',description:`Found on your MiSTer in ${game.system?.name||'your collection'}.`,remotePath:game.path});});
 return [...unique.values()].sort((a,b)=>a.title.localeCompare(b.title));
}
export async function launchMiSTerGame(url:string,path:string){await request(url,'/games/launch',{method:'POST',body:JSON.stringify({path})});}
