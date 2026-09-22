import type {Game} from '../data/library';
import {arcadeCoreByMraName,arcadeCoreByRomSet} from '../data/arcadeCoreMap';

const minimumGamesForCorePicker=4;
function coreFor(path?:string){
 const name=path?.split(/[\\/]/).pop()?.replace(/\.(?:mra|zip)$/i,'').trim().toLocaleLowerCase();
 return name?arcadeCoreByMraName[name]??arcadeCoreByRomSet[name]:undefined;
}

export function groupGenericArcadeGames(games:Game[]):Game[]{
 const candidates=new Map<string,string>();
 const counts=new Map<string,number>();
 for(const game of games){
  if(game.category!=='Arcade'||game.remoteSystemId?.toLocaleLowerCase()!=='arcade')continue;
  const core=coreFor(game.remoteFilePath);
  if(!core)continue;
  candidates.set(game.id,core);
  counts.set(core,(counts.get(core)??0)+1);
 }
 return games.map(game=>{
  const core=candidates.get(game.id);
  if(!core)return game;
  return {...game,system:(counts.get(core)??0)>=minimumGamesForCorePicker&&/^[A-Z]/.test(core)?core:'Arcade'};
 });
}
