import type { Category, Game } from '../data/library';
import {primaryGenre} from './genre.ts';
export type SortOrder='collection'|'title'|'year';
export function systemsForCategory(games:Game[],category:Category):string[] {
  if(category!=='Consoles'&&category!=='Computers')return [];
  return [...new Set(games.filter(g=>g.category===category).map(g=>g.system))];
}
export function genresForCategory(games:Game[],category:Category):string[] {
  return [...new Set(games.filter(g=>category==='All'||g.category===category).map(g=>primaryGenre(g.genre)).filter(genre=>genre!=='Not listed'))].sort((a,b)=>a.localeCompare(b));
}
export function filterGames(games:Game[], query:string, category:Category, sort:SortOrder='collection', savedOnly=false, saved:string[]=[], system:string|null=null, genre:string|null=null):Game[] {
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const result=games.filter(g=>(category==='All'||g.category===category)&&(!system||g.system===system)&&(!genre||primaryGenre(g.genre)===genre)&&(!savedOnly||saved.includes(g.id))&&terms.every(t=>[g.title,g.system,g.genre,g.developer,String(g.year??'')].join(' ').toLocaleLowerCase().includes(t)));
  if(sort==='title') result.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==='year') result.sort((a,b)=>(b.year??-1)-(a.year??-1)||a.title.localeCompare(b.title));
  return result;
}
export function searchGamesByTitle(games:Game[],query:string,sort:SortOrder='collection'):Game[]{
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const result=games.filter(game=>{const title=game.title.toLocaleLowerCase();return terms.every(term=>title.includes(term));});
  if(sort==='title')result.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==='year')result.sort((a,b)=>(b.year??-1)-(a.year??-1)||a.title.localeCompare(b.title));
  return result;
}
// Release age controls paper wear. Play history never changes a card's condition.
export function isVintage(year:number|null,now=new Date().getFullYear()) {return year!==null && now-year>=20;}
export function parseSaved(raw:string|null,validIds?:string[]):string[] {
  try {const data=JSON.parse(raw??'[]');return Array.isArray(data)?[...new Set(data.filter((id):id is string=>typeof id==='string'&&(!validIds||validIds.includes(id))))]:[];}catch{return [];}
}
