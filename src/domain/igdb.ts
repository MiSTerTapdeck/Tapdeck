import type {Game} from '../data/library';

type IgdbPlatform={name?:unknown};
type IgdbGame={name?:unknown;rating?:unknown;total_rating?:unknown;aggregated_rating?:unknown;first_release_date?:unknown;platforms?:IgdbPlatform[]};
type OAuthResponse={access_token?:unknown;expires_in?:unknown};

const clientId=process.env.EXPO_PUBLIC_IGDB_CLIENT_ID?.trim()??'';
const clientSecret=process.env.EXPO_PUBLIC_IGDB_CLIENT_SECRET?.trim()??'';
let token:string|undefined;
let tokenExpiresAt=0;
const ratingCache=new Map<string,number|undefined>();

export function isIgdbEnabled(){return Boolean(clientId&&clientSecret);}
function normaliseTitle(value:string){return value.toLocaleLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]+/g,'');}
function numericRating(value:unknown){return typeof value==='number'&&Number.isFinite(value)?value:undefined;}

const platformAliases:Record<string,string[]>={
 'nes':['nintendo entertainment system'],'snes':['super nintendo entertainment system'],'super nintendo':['super nintendo entertainment system'],'super famicom':['super nintendo entertainment system'],'mega drive':['sega genesis'],'genesis':['sega genesis'],'sega cd':['sega cd'],'mega cd':['sega cd'],'32x':['sega 32x'],'pc engine':['turbografx-16'],'turbografx-16':['turbografx-16'],'pc engine cd':['turbografx-cd'],'turbografx-cd':['turbografx-cd'],'neo geo':['neo geo'],'neo geo mvs':['neo geo'],'neo geo cd':['neo geo cd'],'atari 2600':['atari 2600'],'atari 5200':['atari 5200'],'atari 7800':['atari 7800'],'atari lynx':['atari lynx'],'game boy':['game boy'],'game boy color':['game boy color'],'game boy advance':['game boy advance'],'game gear':['game gear'],'master system':['sega master system'],'saturn':['sega saturn'],'playstation':['playstation'],'nintendo 64':['nintendo 64'],'virtual boy':['virtual boy'],'jaguar':['atari jaguar'],'3do':['3do interactive multiplayer'],'wonderswan':['wonderswan'],'wonderswan color':['wonderswan color'],'c64':['commodore c64/128/max'],'commodore 64':['commodore c64/128/max'],'zx spectrum':['zx spectrum'],'amiga':['amiga'],'amiga cd32':['amiga cd32'],'msx':['msx'],'x68000':['sharp x68000'],'arcade':['arcade'],'mame':['arcade']
};
type RatingGame=Pick<Game,'title'|'year'|'system'>&{category?:Game['category']};
function platformMatches(result:IgdbGame,game:RatingGame){const aliases=game.category==='Arcade'?['arcade']:(platformAliases[game.system.trim().toLocaleLowerCase()]??[game.system.trim().toLocaleLowerCase()]);return (result.platforms??[]).some(platform=>typeof platform.name==='string'&&aliases.includes(platform.name.toLocaleLowerCase()));}
export function chooseIgdbRating(results:IgdbGame[],game:RatingGame):number|undefined{
 const title=normaliseTitle(game.title);
 const exact=results.filter(item=>typeof item.name==='string'&&normaliseTitle(item.name as string)===title&&platformMatches(item,game));
 if(!exact.length)return undefined;
 const ranked=exact.sort((left,right)=>{
  if(!game.year)return 0;
  const leftYear=typeof left.first_release_date==='number'?new Date(left.first_release_date*1000).getUTCFullYear():Infinity;
  const rightYear=typeof right.first_release_date==='number'?new Date(right.first_release_date*1000).getUTCFullYear():Infinity;
  return Math.abs(leftYear-game.year)-Math.abs(rightYear-game.year);
 });
 const chosen=ranked.find(item=>numericRating(item.total_rating)??numericRating(item.rating)??numericRating(item.aggregated_rating));
 return chosen?numericRating(chosen.total_rating)??numericRating(chosen.rating)??numericRating(chosen.aggregated_rating):undefined;
}

async function accessToken():Promise<string|undefined>{
 if(!isIgdbEnabled())return undefined;
 if(token&&Date.now()<tokenExpiresAt)return token;
 const body=`client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
 const response=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!response.ok)return undefined;
 const payload=await response.json() as OAuthResponse;
 if(typeof payload.access_token!=='string')return undefined;
 token=payload.access_token;
 tokenExpiresAt=Date.now()+Math.max(60,(typeof payload.expires_in==='number'?payload.expires_in:3600)-60)*1000;
 return token;
}

// Trial-only direct integration. A production build should call a server that owns these credentials.
export async function readIgdbRating(game:Pick<Game,'title'|'year'|'system'>):Promise<number|undefined>{
 if(!isIgdbEnabled())return undefined;
 const cacheKey=`${normaliseTitle(game.title)}:${game.system}:${game.year??''}`;
 if(ratingCache.has(cacheKey))return ratingCache.get(cacheKey);
 const bearer=await accessToken();if(!bearer)return undefined;
 const title=game.title.replace(/[\\"]/g,'\\$&');
 const query=`search "${title}"; fields name,rating,total_rating,aggregated_rating,first_release_date,platforms.name; limit 10;`;
 const response=await fetch('https://api.igdb.com/v4/games',{method:'POST',headers:{'Client-ID':clientId,Authorization:`Bearer ${bearer}`,'Content-Type':'text/plain'},body:query});
 if(!response.ok)return undefined;
 const payload=await response.json();
 const rating=Array.isArray(payload)?chooseIgdbRating(payload as IgdbGame[],game):undefined;
 ratingCache.set(cacheKey,rating);
 return rating;
}