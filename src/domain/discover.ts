import type {Game} from '../data/library';

export type Recommendation={game:Game;score:number;reason:string};

export type DiscoverPlatform='All'|'Handheld'|'8 bit'|'16 bit'|'32/64 bit'|'Arcade';
export function discoverPlatform(game:Game):DiscoverPlatform{
 if(game.category==='Arcade')return 'Arcade';
 const name=game.system.toLowerCase();
 if(/game boy|gameboy|game gear|lynx|wonderswan|neo geo pocket|pokemon mini|supervision|game ?mate|virtual boy/.test(name))return 'Handheld';
 if(/atari 2600|atari 5200|atari 7800|nes|master system|coleco|odyssey|intellivision|game & watch|channel f|vectrex|pc engine|tgfx|msx/.test(name))return '8 bit';
 if(/snes|super nintendo|super famicom|mega drive|genesis|super cd|mega cd|pc engine cd|neogeo|neo geo|32x|turbografx/.test(name))return '16 bit';
 return '32/64 bit';
}

// Recommendations deliberately follow a player's genre tastes across every system.
// This keeps Discover about finding another kind of game they enjoy, not another platform.
export function recommendGames(games:Game[],seedIds:string[],playedIds:string[]=[]):Recommendation[]{
 const seeds=games.filter(game=>seedIds.includes(game.id));
 if(!seeds.length)return [];
 const played=new Set(playedIds);
 return games.filter(game=>!seedIds.includes(game.id)).map(game=>{
  const matches=seeds.filter(seed=>seed.genre.trim().toLocaleLowerCase()===game.genre.trim().toLocaleLowerCase()&&game.genre!=='Not listed');
  const playedMatch=matches.find(seed=>played.has(seed.id));
  const score=matches.length+(playedMatch?3:0);
  return {game,score,reason:playedMatch?`because you played ${playedMatch.title}`:matches[0]?`same ${matches[0].genre.toLocaleLowerCase()} feel`:'a good next pick'};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.game.title.localeCompare(b.game.title));
}
