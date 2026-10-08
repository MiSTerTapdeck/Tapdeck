import type { Category, Game } from '../data/library';
import {primaryGenre} from './genre.ts';
export type SortOrder='title'|'year'|'oldest'|'rating'|'added';
export function systemsForCategory(games:Game[],category:Category):string[] {
  if(category!=='Consoles'&&category!=='Computers')return [];
  return [...new Set(games.filter(g=>g.category===category).map(g=>g.system))];
}
export function genresForCategory(games:Game[],category:Category):string[] {
  return [...new Set(games.filter(g=>category==='All'||g.category===category).map(g=>primaryGenre(g.genre)).filter(genre=>genre!=='Not listed'))].sort((a,b)=>a.localeCompare(b));
}
function matchesSearchTerms(game:Game,terms:string[]):boolean{
  // Keep every search surface consistent. Zaparoo supplies publisher values as
  // the developer field when no developer tag is available.
  const searchable=[game.title,game.developer].join(' ').toLocaleLowerCase();
  return terms.every(term=>searchable.includes(term));
}
export function filterGames(games:Game[], query:string, category:Category, sort:SortOrder='title', savedOnly=false, saved:string[]=[], system:string|null=null, genre:string|null=null):Game[] {
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  // "Arcade" is the complete arcade collection. Named arcade systems remain
  // drill-down filters, but the Arcade picker item must not narrow to only
  // records whose individual system happens to be named Arcade.
  const result=games.filter(g=>{const systemMatches=!system||(category==='Arcade'&&system==='Arcade')||g.system===system;return (category==='All'||g.category===category)&&systemMatches&&(!genre||primaryGenre(g.genre)===genre)&&(!savedOnly||saved.includes(g.id))&&matchesSearchTerms(g,terms);});
  if(sort==='title') result.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==='year') result.sort((a,b)=>(b.year??-1)-(a.year??-1)||a.title.localeCompare(b.title));
  if(sort==='oldest') result.sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||a.title.localeCompare(b.title));
  if(sort==='rating') result.sort((a,b)=>(b.rating??-1)-(a.rating??-1)||a.title.localeCompare(b.title));
  if(sort==='added') result.sort((a,b)=>(b.libraryAddedAt??0)-(a.libraryAddedAt??0)||a.title.localeCompare(b.title));
  return result;
}
export function searchGames(games:Game[],query:string,sort:SortOrder='title'):Game[]{
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const result=games.filter(game=>matchesSearchTerms(game,terms));
  if(sort==='title')result.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==='year')result.sort((a,b)=>(b.year??-1)-(a.year??-1)||a.title.localeCompare(b.title));
  if(sort==='oldest')result.sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||a.title.localeCompare(b.title));
  if(sort==='rating')result.sort((a,b)=>(b.rating??-1)-(a.rating??-1)||a.title.localeCompare(b.title));
  if(sort==='added')result.sort((a,b)=>(b.libraryAddedAt??0)-(a.libraryAddedAt??0)||a.title.localeCompare(b.title));
  return result;
}
// Release age controls paper wear. Play history never changes a card's condition.
export function isVintage(year:number|null,now=new Date().getFullYear()) {return year!==null && now-year>=20;}
export function parseSaved(raw:string|null,validIds?:string[]):string[] {
  try {const data=JSON.parse(raw??'[]');return Array.isArray(data)?[...new Set(data.filter((id):id is string=>typeof id==='string'&&(!validIds||validIds.includes(id))))]:[];}catch{return [];}
}
