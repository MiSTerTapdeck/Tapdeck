import type {Game} from '../data/library';
import {discoverGenreKey,primaryGenre} from './genre.ts';

export type Recommendation={game:Game;score:number;reason:string};

export type DiscoverPlatform='All'|'Handheld'|'8 bit'|'16 bit'|'32/64 bit'|'Arcade';
const DISCOVER_PER_PLATFORM_LIMIT=20;

function shuffle<T>(items:T[]):T[]{
 const shuffled=[...items];
 for(let index=shuffled.length-1;index>0;index--){const other=Math.floor(Math.random()*(index+1));[shuffled[index],shuffled[other]]=[shuffled[other],shuffled[index]];}
 return shuffled;
}

// The featured card should feel connected to the game that started a Discover session.
// Keep the ranked order, but prefer a game released in the same decade when one exists.
export function featuredRecommendation(items:Recommendation[],seedYear:number|null|undefined):Recommendation|undefined{
 const decade=typeof seedYear==='number'?Math.floor(seedYear/10):null;
 return decade===null?items[0]:items.find(item=>typeof item.game.year==='number'&&Math.floor(item.game.year/10)===decade)??items[0];
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
export function recommendGames(games:Game[],seedIds:string[],playedIds:string[]=[]):Recommendation[]{
 const seeds=games.filter(game=>seedIds.includes(game.id));
 if(!seeds.length)return [];
 const played=new Set(playedIds);
 const candidates=games.filter(game=>!seedIds.includes(game.id)&&(game.rating===undefined||game.rating>=60)).map(game=>{
  const matches=seeds.filter(seed=>discoverGenreKey(seed.genre)===discoverGenreKey(game.genre)&&primaryGenre(game.genre)!=='Not listed');
  const playedMatch=matches.find(seed=>played.has(seed.id));
  const score=matches.length+(playedMatch?3:0);
  return {game,score,reason:playedMatch?`because you played ${playedMatch.title}`:matches[0]?`same ${primaryGenre(matches[0].genre).toLocaleLowerCase()} feel`:'a good next pick'};
 }).filter(item=>item.score>0);
 const seenArcade=new Set<string>();
 const deduped=candidates.filter(item=>{if(item.game.category!=='Arcade')return true;const key=item.game.title.toLocaleLowerCase().replace(/\([^)]*\)|[^a-z0-9]+/gi,'');if(seenArcade.has(key))return false;seenArcade.add(key);return true;});
 const groups=new Map<string,Recommendation[]>();
 // Shuffle before grouping. Stable score sorting below preserves stronger matches,
 // while equally suitable games vary every time Discover is started.
 for(const item of shuffle(deduped)){const key=item.game.system.toLocaleLowerCase();const group=groups.get(key)??[];group.push(item);groups.set(key,group);}
 for(const group of groups.values())group.sort((a,b)=>b.score-a.score||a.game.title.localeCompare(b.game.title));
 const output:Recommendation[]=[];let remaining=true;while(remaining){remaining=false;for(const group of groups.values()){const item=group.shift();if(item){output.push(item);remaining=true;}}}
 const perPlatform=new Map<DiscoverPlatform,number>();
 return output.filter(item=>{const platform=discoverPlatform(item.game);const count=perPlatform.get(platform)??0;if(count>=DISCOVER_PER_PLATFORM_LIMIT)return false;perPlatform.set(platform,count+1);return true;});
}
