import type {Game} from '../data/library';
import {arcadeManufacturerByMraName} from '../data/arcadeCoreMap';

const groups=['Capcom','Irem','Jaleco','Namco','Sega','Taito'] as const;
function groupForSystem(value?:string){
 const system=(value??'').toLocaleLowerCase();
 if(system.includes('neogeo'))return 'Neo Geo MVS';
 if(/capcom|cps|\bzn\d/.test(system))return 'Capcom';
 if(/irem|\bm(?:72|90|92|107)\b/.test(system))return 'Irem';
 if(/jaleco|megasys/.test(system))return 'Jaleco';
 if(/namco|system(?:1|11|12|22)/.test(system))return 'Namco';
 if(/sega|stv/.test(system))return 'Sega';
 return groups.find(group=>system.includes(group.toLocaleLowerCase()));
}
function groupForMra(path?:string){
 const name=path?.split(/[\\/]/).pop()?.replace(/\.mra$/i,'').trim().toLocaleLowerCase();
 return name?arcadeManufacturerByMraName[name]:undefined;
}

export function groupGenericArcadeGames(games:Game[]):Game[]{
 return games.map(game=>{
  if(game.category!=='Arcade')return game;
  const group=groupForSystem(game.remoteSystemId)??groupForMra(game.remoteFilePath);
  return {...game,system:group??'Arcade'};
 });
}
