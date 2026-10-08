import type {Game} from '../data/library';
import {discoverGenreKey,primaryGenre} from './genre.ts';

export type Recommendation={game:Game;score:number;reason:string};

export type DiscoverPlatform='All'|'Handheld'|'8 bit'|'16 bit'|'32/64 bit'|'Arcade';
const DISCOVER_PER_PLATFORM_LIMIT=20;

function ratingBand(game:Game){return Number.isFinite(game.rating)?Math.min(9,Math.floor(game.rating!/10)):-1;}
function byRatingBand(a:Recommendation,b:Recommendation){return ratingBand(b.game)-ratingBand(a.game);}

// Prefer distinct systems, then fill spare slots in recommendation order.
// Every featured game must have confirmed artwork, including repeated systems.
export function discoverShowcase(items:Recommendation[],artworkReadyIds:ReadonlySet<string>){
 const systems=new Set<string>();
 const featured:Recommendation[]=[];
 for(const item of items){
  const system=item.game.system.trim().toLocaleLowerCase();
  if(!artworkReadyIds.has(item.game.id)||systems.has(system))continue;
  systems.add(system);featured.push(item);
  if(featured.length===5)break;
 }
 const ids=new Set(featured.map(item=>item.game.id));
 for(const item of items){
  if(featured.length===5)break;
  if(!artworkReadyIds.has(item.game.id)||ids.has(item.game.id))continue;
  featured.push(item);ids.add(item.game.id);
 }
 return {lead:featured[0],rowGames:featured.slice(1),more:items.filter(item=>!ids.has(item.game.id))};
}

function shuffle<T>(items:T[]):T[]{
 const shuffled=[...items];
 for(let index=shuffled.length-1;index>0;index--){const other=Math.floor(Math.random()*(index+1));[shuffled[index],shuffled[other]]=[shuffled[other],shuffled[index]];}
 return shuffled;
}

export function discoverPlatform(game:Game):DiscoverPlatform{
 if(game.category==='Arcade')return 'Arcade';
 const name=game.system.toLowerCase();
 // CD32 uses a later 68EC020 processor, so keep it with the 32/64-bit consoles
 // before the wider Amiga family rule below.
 if(/amiga ?cd32/.test(name))return '32/64 bit';
 if(/game boy|gameboy|game gear|lynx|wonderswan|neo geo pocket|pokemon mini|supervision|game ?mate|virtual boy/.test(name))return 'Handheld';
 if(/atari ?2600|atari ?5200|atari ?7800|atari ?800|(^|[^a-z])nes($|[^a-z])|master system|coleco|odyssey|intellivision|game ?(&|and) ?watch|channel ?f|vectrex|c64|commodore ?64|vic ?20|msx|zx ?spectrum|sinclair ?spectrum|pico-?8|trs-?80|coco ?2|creativision/.test(name))return '8 bit';
 if(/amiga|macintosh plus|sinclair ?ql|snes|super nintendo|super famicom|mega drive|genesis|sega cd|super cd|mega cd|pc engine cd|supergrafx|neogeo|neo geo|32x|turbografx|x68000|tutor/.test(name))return '16 bit';
 return '32/64 bit';
}

// Recommendations deliberately follow a player's genre tastes across every system.
// This keeps Discover about finding another kind of game they enjoy, not another platform.
export function recommendGames(games:Game[],seedIds:string[],playedIds:string[]=[],cachedRatings:ReadonlyMap<string,number>=new Map()):Recommendation[]{
 const seeds=games.filter(game=>seedIds.includes(game.id));
 if(!seeds.length)return [];
 const played=new Set(playedIds);
 const eligible=games.map(game=>{
  const cached=cachedRatings.get(game.id);
  return (!Number.isFinite(game.rating)||game.rating!<=0)&&Number.isFinite(cached)&&cached!>0?{...game,rating:cached,ratingSource:'igdb'}:game;
 }).filter(game=>!seedIds.includes(game.id)&&(game.rating===undefined||game.rating>=60));
 const dedupeArcade=(items:Recommendation[])=>{
  const seenArcade=new Set<string>();
  return items.filter(item=>{if(item.game.category!=='Arcade')return true;const key=item.game.title.toLocaleLowerCase().replace(/\([^)]*\)|[^a-z0-9]+/gi,'');if(seenArcade.has(key))return false;seenArcade.add(key);return true;});
 };
 const exact=dedupeArcade(eligible.map(game=>{
  const matches=seeds.filter(seed=>discoverGenreKey(seed.genre)===discoverGenreKey(game.genre)&&primaryGenre(game.genre)!=='Not listed');
  const playedMatch=matches.find(seed=>played.has(seed.id));
  const score=matches.length+(playedMatch?3:0);
  return {game,score,reason:playedMatch?`because you played ${playedMatch.title}`:matches[0]?`same ${primaryGenre(matches[0].genre).toLocaleLowerCase()} feel`:'a good next pick'};
 }).filter(item=>item.score>0));
 // A thin specialist pool should still produce a useful Discover page. Keep
 // exact matches first, then top it up from the same broad genre only below 10.
 const exactCountByGenre=new Map<string,number>();
 for(const item of exact){const key=discoverGenreKey(item.game.genre);exactCountByGenre.set(key,(exactCountByGenre.get(key)??0)+1);}
 const thinKeys=new Set([...new Set(seeds.map(seed=>discoverGenreKey(seed.genre)))].filter(key=>(exactCountByGenre.get(key)??0)<10));
 const exactIds=new Set(exact.map(item=>item.game.id));
 const broader=eligible.filter(game=>!exactIds.has(game.id)).map(game=>{
  const match=seeds.find(seed=>thinKeys.has(discoverGenreKey(seed.genre))&&primaryGenre(seed.genre)===primaryGenre(game.genre)&&discoverGenreKey(seed.genre)!==discoverGenreKey(game.genre));
  return match?{game,score:1,reason:`more ${primaryGenre(match.genre).toLocaleLowerCase()} games`}:undefined;
 }).filter((item):item is Recommendation=>!!item);
 const deduped=dedupeArcade([...exact,...broader]);
 const groups=new Map<string,Recommendation[]>();
 // Shuffle once per session. Stable band sorting keeps that random order
 // inside each rating band, with no alphabetical tie-breaker.
 for(const item of shuffle(deduped)){const key=item.game.system.toLocaleLowerCase();const group=groups.get(key)??[];group.push(item);groups.set(key,group);}
 for(const group of groups.values())group.sort(byRatingBand);
 const output:Recommendation[]=[];let remaining=true;while(remaining){remaining=false;for(const group of groups.values()){const item=group.shift();if(item){output.push(item);remaining=true;}}}
 const perPlatform=new Map<DiscoverPlatform,number>();
 return output.sort(byRatingBand).filter(item=>{const platform=discoverPlatform(item.game);const count=perPlatform.get(platform)??0;if(count>=DISCOVER_PER_PLATFORM_LIMIT)return false;perPlatform.set(platform,count+1);return true;});
}
