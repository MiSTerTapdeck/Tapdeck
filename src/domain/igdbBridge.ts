import type {Game} from '../data/library';

type BridgeHealth={status?:string;configured?:boolean};
type BridgeRating={status?:string;rating?:number;match?:string;message?:string};
type BridgeRatingCache={ratings?:Record<string,number>};

function bridgeUrl(misterUrl:string){
 const source=new URL(misterUrl);
 source.port='8184';
 source.pathname='';
 source.search='';
 source.hash='';
 return source.toString().replace(/\/$/,'');
}
async function request<T>(misterUrl:string,path:string,init?:RequestInit):Promise<T>{
 const response=await fetch(`${bridgeUrl(misterUrl)}${path}`,init);
 const payload=await response.json().catch(()=>undefined) as T|undefined;
 if(!response.ok)throw new Error((payload as {message?:string}|undefined)?.message??`IGDB helper returned HTTP ${response.status}.`);
 return payload as T;
}
export async function readIgdbBridgeStatus(misterUrl:string){
 return request<BridgeHealth>(misterUrl,'/health');
}
export async function configureIgdbBridge(misterUrl:string,clientId:string,clientSecret:string){
 return request<{configured?:boolean}>(misterUrl,'/configure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId,clientSecret})});
}
export async function readIgdbRatingCache(misterUrl:string){
 return request<BridgeRatingCache>(misterUrl,'/ratings');
}
export async function saveIgdbRating(misterUrl:string,game:Game){
 if(!game.remoteFilePath)throw new Error('This game has no MiSTer file path.');
 return request<BridgeRating>(misterUrl,'/rating',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:game.title,system:game.system,year:game.year??undefined,path:game.remoteFilePath})});
}
