import type {Game} from '../data/library';
import {arcadeCpsByMraName,arcadeManufacturerByMraName} from '../data/arcadeCoreMap.ts';

const groups=['Capcom','Irem','Jaleco','Namco','Sega','Taito'] as const;
export function arcadeLaunchVariantLabel(path:string){
 const normal=path.replace(/\\/g,'/').toLocaleLowerCase();
 if(normal.includes('/_arcade/_meatcores/'))return 'MeatCores';
 if(normal.includes('/_arcade/_alternatives/'))return 'Alternative';
 return 'Default';
}
export function isArcadeAlternativePath(path:string){return /\/_arcade\/(?:_meatcores\/)?_alternatives\//i.test(path.replace(/\\/g,'/'));}
function groupForSystem(value?:string){
 const system=(value??'').toLocaleLowerCase();
 if(system.includes('neogeo'))return 'Neo Geo MVS';
 if(system.includes('cps1'))return 'CPS 1';
 if(system.includes('cps2'))return 'CPS 2';
 if(system.includes('cps3'))return 'CPS 3';
 if(/capcom|\bzn\d/.test(system))return 'Capcom';
 if(/irem|\bm(?:72|90|92|107)\b/.test(system))return 'Irem';
 if(/jaleco|megasys/.test(system))return 'Jaleco';
 if(/namco|\bsystem\s*(?:1|11|12|22)\b/.test(system))return 'Namco';
 if(/sega|\bst[- ]?v\b|\bsystem\s*(?:e|8|16[abc]?|18|24|32)\b|\b[xyz] board\b|\bmodel\s*[123]\b/.test(system))return 'Sega';
 return groups.find(group=>system.includes(group.toLocaleLowerCase()));
}
function groupForMra(path?:string){
 const name=path?.split(/[\\/]/).pop()?.replace(/\.mra$/i,'').trim().toLocaleLowerCase();
 return name?arcadeCpsByMraName[name]??arcadeManufacturerByMraName[name]:undefined;
}

export function groupGenericArcadeGames(games:Game[]):Game[]{
 const grouped=games.map(game=>{
  if(game.category!=='Arcade')return game;
  // The MRA filename identifies the actual arcade board more precisely than a
  // broad system label supplied by the remote catalogue.
  const group=groupForMra(game.remoteFilePath)??groupForSystem(game.remoteSystemId);
  return {...game,system:group??'Arcade'};
 });
 const arcade=new Map<string,Game>();
 const retained:Game[]=[];
 for(const game of grouped){
  if(game.category!=='Arcade'){retained.push(game);continue;}
  const titleKey=game.title.toLocaleLowerCase().replace(/\([^)]*\)|[^a-z0-9]+/g,'');
  const path=game.remoteFilePath?.replace(/\\/g,'/').toLocaleLowerCase();
  const key=path?`path:${path}`:`title:${titleKey}`;
  const genericKey=`title:${titleKey}`;
  // Zaparoo may expose one MRA as generic Arcade and as its detected hardware.
  // Replace only a pathless legacy generic record; different MRA files with
  // the same game title are distinct games and must remain visible.
  if(path){
   const generic=arcade.get(genericKey);
   if(generic&&generic.remoteSystemId?.toLocaleLowerCase()==='arcade'&&!generic.remoteFilePath)arcade.delete(genericKey);
  }else if([...arcade.values()].some(item=>item.remoteFilePath&&item.title.toLocaleLowerCase().replace(/\([^)]*\)|[^a-z0-9]+/g,'')===titleKey))continue;
  const current=arcade.get(key);
  const preferCurrent=current?.remoteSystemId?.toLocaleLowerCase()!=='arcade';
  const preferNext=game.remoteSystemId?.toLocaleLowerCase()!=='arcade';
  if(!current||(!preferCurrent&&preferNext))arcade.set(key,game);
 }
 return [...retained,...arcade.values()];
}
