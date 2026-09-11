import type {Game} from '../data/library';

export type Recommendation={game:Game;score:number;reason:string};

// Recommendations deliberately follow a player's genre tastes across every system.
// This keeps Discover about finding another kind of game they enjoy, not another platform.
export function recommendGames(games:Game[],seedIds:string[],playedIds:string[]=[]):Recommendation[]{
 const seeds=games.filter(game=>seedIds.includes(game.id));
 if(!seeds.length)return [];
 const played=new Set(playedIds);
 return games.filter(game=>!seedIds.includes(game.id)).map(game=>{
  const matches=seeds.filter(seed=>seed.genre===game.genre&&game.genre!=='Not listed');
  const playedMatch=matches.find(seed=>played.has(seed.id));
  const score=matches.length+(playedMatch?3:0);
  return {game,score,reason:playedMatch?`because you played ${playedMatch.title}`:matches[0]?`same ${matches[0].genre.toLocaleLowerCase()} feel`:'a good next pick'};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.game.title.localeCompare(b.game.title));
}
