import type {Game} from '../data/library';

type IgdbPlatform={name?:unknown};
type IgdbGame={name?:unknown;rating?:unknown;total_rating?:unknown;aggregated_rating?:unknown;first_release_date?:unknown;platforms?:IgdbPlatform[]};
type RatingGame=Pick<Game,'title'|'year'|'system'>&{category?:Game['category']};

function normaliseTitle(value:string){return value.toLocaleLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]+/g,'');}
function numericRating(value:unknown){return typeof value==='number'&&Number.isFinite(value)?value:undefined;}

const platformAliases:Record<string,string[]>={
 'nes':['nintendo entertainment system'],'snes':['super nintendo entertainment system'],'super nintendo':['super nintendo entertainment system'],'super famicom':['super nintendo entertainment system'],'mega drive':['sega genesis'],'genesis':['sega genesis'],'sega cd':['sega cd'],'mega cd':['sega cd'],'32x':['sega 32x'],'pc engine':['turbografx-16'],'turbografx-16':['turbografx-16'],'pc engine cd':['turbografx-cd'],'turbografx-cd':['turbografx-cd'],'neo geo':['neo geo'],'neo geo mvs':['neo geo'],'neo geo cd':['neo geo cd'],'atari 2600':['atari 2600'],'atari 5200':['atari 5200'],'atari 7800':['atari 7800'],'atari lynx':['atari lynx'],'game boy':['game boy'],'game boy color':['game boy color'],'game boy advance':['game boy advance'],'game gear':['game gear'],'master system':['sega master system'],'saturn':['sega saturn'],'playstation':['playstation'],'nintendo 64':['nintendo 64'],'virtual boy':['virtual boy'],'jaguar':['atari jaguar'],'3do':['3do interactive multiplayer'],'wonderswan':['wonderswan'],'wonderswan color':['wonderswan'],'c64':['commodore c64/128/max'],'commodore 64':['commodore c64/128/max'],'zx spectrum':['zx spectrum'],'amiga':['amiga'],'amiga cd32':['amiga cd32'],'msx':['msx'],'x68000':['sharp x68000'],'arcade':['arcade'],'mame':['arcade']
};
function platformMatches(result:IgdbGame,game:RatingGame){const aliases=game.category==='Arcade'?['arcade']:(platformAliases[game.system.trim().toLocaleLowerCase()]??[game.system.trim().toLocaleLowerCase()]);return (result.platforms??[]).some(platform=>typeof platform.name==='string'&&aliases.includes(platform.name.toLocaleLowerCase()));}

// Pure matching logic retained for regression tests. It makes no network calls and
// has no credentials; live ratings come only from the MiSTer-side IGDB bridge.
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
